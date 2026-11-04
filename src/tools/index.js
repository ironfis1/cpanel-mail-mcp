// The tools. Names, parameters, folder addressing and filter grammar follow the Spark connector, and
// the input schemas match those recorded in docs/proposed-resolutions.md. Every result says which
// accounts were reached, and one account's failure never fails the others.
import { findAccount } from "../accounts.js";
import { ServerError } from "../errors.js";
import { translateFilter, translateSearch } from "../filter.js";
import { LOGICAL_NAMES, parseFolderAddress } from "../folders.js";
import { accountForId, decodeMessageId } from "../message-id.js";
import { describe, readMessages, readMetadata } from "./messages.js";
import { readThread } from "./thread.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const SEARCH_CAP = 20;
const STEPS = ["secret", "tcp_tls", "greeting", "login", "capability", "list", "select_inbox"];

const hostOf = (registry, id) => registry.find((entry) => entry.id === id).host;

// The accounts fields every response carries, from RequestSessions.runEach results. An account
// reached but unable to answer (a missing folder, an unknown ID) is listed in errors.
function report(registry, results) {
  return {
    accounts_reached: results.filter((r) => r.reached).map((r) => r.id),
    accounts_not_reached: results
      .filter((r) => !r.reached)
      .map((r) => ({ account: r.id, host: hostOf(registry, r.id), code: r.code, error: r.error })),
    errors: results.filter((r) => r.reached && !r.ok).map((r) => ({ account: r.id, code: r.code, message: r.error })),
  };
}

const allFailed = (results) => results.length > 0 && results.every((r) => !r.ok);

function listFolder(account, logical, criteria, { page, pageSize, reverse }) {
  return async (client) => {
    const path = client.folders.path(logical);
    const { uidValidity } = await client.select(path);
    const uids = await client.uidSort(criteria, { reverse });
    const start = (page - 1) * pageSize;
    return {
      messages: await readMessages(client, account, path, uidValidity, uids.slice(start, start + pageSize)),
      has_more: uids.length > start + pageSize,
    };
  };
}

async function emails({ registry, sessions, now }, args) {
  const { account: id, logical } = parseFolderAddress(args.folder, registry);
  const account = findAccount(registry, id);
  const criteria = translateFilter(args.filter, { now });
  const options = {
    page: args.page ?? 1,
    pageSize: args.page_size ?? DEFAULT_PAGE_SIZE,
    reverse: (args.order ?? "desc") === "desc",
  };
  const [result] = await sessions.runEach([account], listFolder(account, logical, criteria, options));
  const found = result.value ?? { messages: [], has_more: false };
  return { body: { ...found, ...report(registry, [result]) }, isError: !result.ok };
}

// The accounts and folder a search covers. `in` is an account, or <account>:<Folder>.
function searchScope(registry, scope) {
  if (scope === undefined) return registry.map((account) => ({ account, logical: null }));
  if (String(scope).includes(":")) {
    const { account, logical } = parseFolderAddress(scope, registry);
    return [{ account: findAccount(registry, account), logical }];
  }
  return [{ account: findAccount(registry, scope), logical: null }];
}

// The newest matches in each scoped folder, with the date needed to merge them across accounts.
function searchCandidates(logical, criteria) {
  return async (client) => {
    const paths = logical ? [client.folders.path(logical)] : client.folders.searchable();
    const candidates = [];
    for (const path of paths) {
      const { uidValidity } = await client.select(path);
      const uids = (await client.uidSort(criteria)).slice(0, SEARCH_CAP);
      for (const { uid, time } of await readMetadata(client, uids)) candidates.push({ path, uidValidity, uid, time });
    }
    return candidates;
  };
}

function readWinners(account, winners) {
  return async (client) => {
    const paths = [...new Set(winners.map((winner) => winner.path))];
    const messages = [];
    for (const path of paths) {
      const inFolder = winners.filter((winner) => winner.path === path);
      await client.select(path);
      const read = await readMessages(client, account, path, inFolder[0].uidValidity, inFolder.map((winner) => winner.uid));
      read.forEach((message) => messages.push({ time: Date.parse(message.date ?? "") || 0, message }));
    }
    return messages;
  };
}

async function search({ registry, sessions, now }, args) {
  const scope = searchScope(registry, args.in);
  const criteria = translateSearch(args.query, args.filter, { now });
  const accounts = scope.map(({ account }) => account);
  // Null unless `in` names a folder, and then there is one account.
  const first = await sessions.runEach(accounts, searchCandidates(scope[0].logical, criteria));

  const winners = first
    .filter((result) => result.ok)
    .flatMap((result) => result.value.map((candidate) => ({ ...candidate, id: result.id })))
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    .slice(0, SEARCH_CAP);

  const second = await Promise.all(
    first.map(async (result) => {
      const mine = winners.filter((winner) => winner.id === result.id);
      if (!result.ok || mine.length === 0) return { ...result, value: [] };
      const account = findAccount(registry, result.id);
      const [read] = await sessions.runEach([account], readWinners(account, mine));
      return read;
    }),
  );

  const messages = second
    .flatMap((result) => result.value ?? [])
    .sort((a, b) => b.time - a.time)
    .map(({ message }) => message);
  return { body: { messages, ...report(registry, second) }, isError: allFailed(second) };
}

async function thread({ registry, sessions }, args) {
  const decoded = decodeMessageId(args.message_id);
  const account = accountForId(registry, decoded);
  const [result] = await sessions.runEach([account], (client) => readThread(client, account, decoded));
  const found = result.value ?? { message_id: args.message_id, messages: [] };
  return { body: { ...found, ...report(registry, [result]) }, isError: !result.ok };
}

function accounts({ registry }) {
  // From static config only, so no account has been contacted.
  return {
    body: {
      accounts: registry.map(({ id, host }) => ({ id, host })),
      accounts_reached: [],
      accounts_not_reached: [],
    },
    isError: false,
  };
}

function checksFor(result) {
  const failedAt = result.ok ? STEPS.length : STEPS.indexOf(result.step);
  const state = (step) => {
    const at = STEPS.indexOf(step);
    return at < failedAt ? "ok" : at === failedAt ? "failed" : "not_run";
  };
  return { tcp_tls: state("tcp_tls"), login: state("login"), select_inbox: state("select_inbox") };
}

async function availability({ registry, sessions }) {
  const results = await sessions.runEach(registry, async (client) => {
    try {
      await client.select("INBOX");
    } catch (error) {
      error.step = "select_inbox";
      throw error;
    }
  });
  const hosts = [...new Set(registry.map(({ host }) => host))].map((host) => ({
    host,
    accounts: results
      .filter((result) => hostOf(registry, result.id) === host)
      .map((result) => ({
        account: result.id,
        reached: result.ok,
        checks: checksFor(result),
        failed_step: result.ok ? null : result.step,
        code: result.ok ? null : result.code,
        error: result.ok ? null : result.error,
      })),
  }));
  // Reached means every check passed. A failed check is this tool's answer, not a tool error.
  return {
    body: {
      hosts,
      accounts_reached: results.filter((r) => r.ok).map((r) => r.id),
      accounts_not_reached: results
        .filter((r) => !r.ok)
        .map((r) => ({ account: r.id, host: hostOf(registry, r.id), code: r.code, error: r.error })),
    },
    isError: false,
  };
}

function mappingFor(client) {
  const mapping = {};
  const mappingErrors = {};
  for (const logical of LOGICAL_NAMES) {
    try {
      mapping[logical] = client.folders.path(logical);
    } catch (error) {
      if (error.code !== "folder") throw error;
      mapping[logical] = null;
      mappingErrors[logical] = error.message;
    }
  }
  return { mapping, mappingErrors };
}

async function folders({ registry, sessions }) {
  const results = await sessions.runEach(registry, async (client) => {
    const { mapping, mappingErrors } = mappingFor(client);
    const logicalOf = new Map(Object.entries(mapping).map(([logical, path]) => [path, logical]));
    return {
      folders: client.folders.list.map(({ path, delimiter, flags }) => ({
        path,
        delimiter,
        flags,
        logical_name: logicalOf.get(path) ?? null,
      })),
      mapping,
      mapping_errors: mappingErrors,
    };
  });
  return {
    body: {
      accounts: results.filter((r) => r.ok).map((r) => ({ account: r.id, ...r.value })),
      ...report(registry, results),
    },
    isError: allFailed(results),
  };
}

const NO_INPUT = { type: "object", properties: {}, additionalProperties: false };
const MESSAGE_FIELDS = "id, account, from, to, subject, date, snippet and flags";

export const TOOLS = [
  {
    name: "accounts",
    description: "List the configured accounts from static config. Performs no IMAP login, so it says nothing about reachability.",
    inputSchema: NO_INPUT,
    imap: false,
    run: accounts,
  },
  {
    name: "availability",
    description: "Health check, the only live reachability check: TCP and TLS, login and SELECT INBOX for each account, grouped by host. Use as a preflight.",
    inputSchema: NO_INPUT,
    imap: true,
    run: availability,
  },
  {
    name: "folders",
    description: "List each account's folders with the mapping from logical names (Inbox, Sent, Drafts, Archive, Trash, Junk) to real folders.",
    inputSchema: NO_INPUT,
    imap: true,
    run: folders,
  },
  {
    name: "emails",
    description: `List messages in one folder, newest first by default, with no default lookback. Each message has ${MESSAGE_FIELDS}. has_more says whether more pages exist.`,
    inputSchema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "<account>:<Folder>, for example scott@reasinger.net:Inbox" },
        filter: {
          type: "string",
          description: "Tokens, ANDed: from:x to:x subject:x newer_than:Nd older_than:Nd is:unread is:read is:pinned, and bare words. Anything else is an error.",
        },
        page: { type: "integer", minimum: 1, description: "1-based page number. Default 1." },
        page_size: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, description: "Default 50, maximum 100." },
        order: { type: "string", enum: ["desc", "asc"], description: "By date. Default desc." },
      },
      required: ["folder"],
      additionalProperties: false,
    },
    imap: true,
    refused: { messages: [], has_more: false },
    run: emails,
  },
  {
    name: "search",
    description: `Search all folders except Trash and Junk, in one account or all accounts. Returns at most 20 messages in total, newest first, with no paging. Each message has ${MESSAGE_FIELDS}.`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text. Words are ORed. Without a query, the filter alone selects messages." },
        in: { type: "string", description: "An account address, or <account>:<Folder>. Omitted means all accounts." },
        filter: { type: "string", description: "Filter tokens as in emails, ANDed with each other and with the query." },
      },
      additionalProperties: false,
    },
    imap: true,
    refused: { messages: [] },
    run: search,
  },
  {
    name: "thread",
    description: "Return a message and its thread from the account's Inbox, Sent and Archive, oldest first, with bodies as text.",
    inputSchema: {
      type: "object",
      properties: { message_id: { type: "string", description: "A message ID from emails or search." } },
      required: ["message_id"],
      additionalProperties: false,
    },
    imap: true,
    refused: { messages: [] },
    run: thread,
  },
];

// Checks arguments against the small part of JSON Schema the tools use, before any IMAP call.
export function checkInput(schema, args) {
  const refuse = (message) => new ServerError("invalid_input", message);
  if (args === null || typeof args !== "object" || Array.isArray(args)) throw refuse("arguments must be an object");
  for (const key of Object.keys(args)) {
    if (!Object.hasOwn(schema.properties, key)) throw refuse(`unknown parameter: ${key}`);
  }
  for (const key of schema.required ?? []) {
    if (args[key] === undefined) throw refuse(`missing parameter: ${key}`);
  }
  for (const [key, value] of Object.entries(args)) {
    const rule = schema.properties[key];
    if (rule.type === "string" && typeof value !== "string") throw refuse(`${key} must be a string`);
    if (rule.type === "integer" && !Number.isSafeInteger(value)) throw refuse(`${key} must be an integer`);
    if (rule.enum && !rule.enum.includes(value)) throw refuse(`${key} must be one of: ${rule.enum.join(", ")}`);
    if (rule.minimum !== undefined && value < rule.minimum) throw refuse(`${key} must be at least ${rule.minimum}`);
    if (rule.maximum !== undefined && value > rule.maximum) throw refuse(`${key} must be at most ${rule.maximum}`);
  }
}
