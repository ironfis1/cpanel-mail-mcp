// A small model of Dovecot behind fakeServer: real folders per login, with SEARCH, SORT and FETCH
// evaluated against the messages given. Tool tests run through the real IMAP client and the real
// MCP handler against this. Messages are described by mail() or given as raw text.
import { parseMessage } from "../../src/mime/parse.js";
import { decodeHeader } from "../../src/mime/headers.js";
import { handleMcp } from "../../src/mcp.js";
import { FAKE_PASSWORD, fakeServer } from "./fake-imap.mjs";

const DOVECOT_LIST = [
  ["INBOX", "\\HasChildren"],
  ["INBOX.Archive", "\\HasNoChildren \\Archive"],
  ["INBOX.Junk", "\\HasNoChildren"],
  ["INBOX.spam", "\\HasNoChildren \\Junk"],
  ["INBOX.Sent", "\\HasNoChildren \\Sent"],
  ["INBOX.Trash", "\\HasNoChildren \\Trash"],
  ["INBOX.Drafts", "\\HasNoChildren \\Drafts"],
];

const toBinary = (text) => String.fromCharCode(...new TextEncoder().encode(text));

// Builds a raw message. Extra headers and a whole MIME body can be passed in.
export function mail({ from = "Sender <sender@example.test>", to = "me@one.test", cc, subject = "Hello", date = "Mon, 02 Nov 2026 12:00:00 +0000", messageId, references, inReplyTo, headers = [], body = "Plain body text." }) {
  const lines = [
    from !== null && `From: ${from}`,
    `To: ${to}`,
    cc && `Cc: ${cc}`,
    `Subject: ${subject}`,
    date && `Date: ${date}`,
    messageId && `Message-ID: ${messageId}`,
    references && `References: ${references}`,
    inReplyTo && `In-Reply-To: ${inReplyTo}`,
    ...headers,
  ].filter(Boolean);
  const hasType = headers.some((header) => /^content-type:/i.test(header));
  if (!hasType) lines.push("Content-Type: text/plain; charset=utf-8");
  return toBinary(`${lines.join("\r\n")}\r\n\r\n${body}`);
}

const nstring = (text) => (text === undefined || text === null ? "NIL" : `"${String(text).replace(/(["\\])/g, "\\$1")}"`);

function paramsOf(node) {
  const entries = Object.entries(node.params);
  return entries.length ? `(${entries.map(([key, value]) => `${nstring(key)} ${nstring(value)}`).join(" ")})` : "NIL";
}

function structureOf(node) {
  const disposition = node.headers["content-disposition"] ? `(${nstring(node.disposition)} NIL)` : "NIL";
  const [type, subtype] = node.type.split("/");
  if (node.parts.length) return `(${node.parts.map(structureOf).join("")} ${nstring(subtype)} ${paramsOf(node)} ${disposition} NIL NIL)`;
  const head = `${nstring(type)} ${nstring(subtype)} ${paramsOf(node)} NIL NIL ${nstring(node.encoding)} ${node.body.length}`;
  if (type === "text") return `(${head} 1 NIL ${disposition} NIL NIL)`;
  if (node.type === "message/rfc822" && node.message) {
    const envelope = "(NIL NIL NIL NIL NIL NIL NIL NIL NIL NIL)";
    return `(${head} ${envelope} ${structureOf(node.message)} 1 NIL ${disposition} NIL NIL)`;
  }
  return `(${head} NIL ${disposition} NIL NIL)`;
}

const headerBlock = (node, names) =>
  Object.entries(node.headers)
    .filter(([name]) => !names || names.includes(name))
    .map(([name, value]) => `${name}: ${value}\r\n`)
    .join("") + "\r\n";

function sectionBytes(node, section) {
  const parts = section.split(".");
  let current = node;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "HEADER") return headerBlock(current.message ?? current);
    const index = Number(parts[i]);
    if (current.parts.length) current = current.parts[index - 1];
    else if (index !== 1) return "";
    if (!current) return "";
  }
  return current.body;
}

function tokenize(criteria) {
  const out = [];
  for (const match of criteria.matchAll(/"((?:[^"\\]|\\.)*)"|(\S+)/g)) {
    out.push(match[1] !== undefined ? { quoted: match[1].replace(/\\(.)/g, "$1") } : { atom: match[2].toUpperCase() });
  }
  return out;
}

const dayOf = (text) => new Date(`${text.replace(/-/g, " ")} UTC`).getTime();
const contains = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

function evaluate(tokens, message) {
  const next = () => {
    const { atom } = tokens.shift();
    const header = (name) => contains(`${message.node.headers[name] ?? ""} ${decodeHeader(message.node.headers[name])}`, tokens.shift().quoted);
    switch (atom) {
      case "ALL":
        return true;
      case "UID":
        return Number(tokens.shift().atom) === message.uid;
      case "TEXT":
        return contains(message.raw, tokens.shift().quoted);
      case "FROM":
        return header("from");
      case "TO":
        return header("to");
      case "SUBJECT":
        return header("subject");
      case "HEADER": {
        const name = tokens.shift().quoted ?? tokens[-1];
        return header(name);
      }
      case "SINCE":
        return message.time >= dayOf(tokens.shift().atom);
      case "BEFORE":
        return message.time < dayOf(tokens.shift().atom);
      case "SEEN":
        return message.flags.includes("\\Seen");
      case "UNSEEN":
        return !message.flags.includes("\\Seen");
      case "FLAGGED":
        return message.flags.includes("\\Flagged");
      case "OR": {
        const left = next();
        const right = next();
        return left || right;
      }
      default:
        throw new Error(`fake search: unknown key ${atom}`);
    }
  };
  let all = true;
  while (tokens.length) if (!next()) all = false;
  return all;
}

// HEADER's field name is an atom in the client's criteria; lower it so it looks up a header.
function searchTokens(criteria) {
  const tokens = tokenize(criteria.replace(/^CHARSET UTF-8 /, ""));
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].atom === "HEADER") tokens[i + 1] = { quoted: tokens[i + 1].atom.toLowerCase() };
  }
  return tokens;
}

const matches = (folder, criteria) => folder.filter((message) => evaluate(searchTokens(criteria), message));

function fetchMessage(message, seq, items) {
  const parts = [];
  if (/\bUID\b/.test(items)) parts.push(`UID ${message.uid}`);
  if (/\bFLAGS\b/.test(items)) parts.push(`FLAGS (${message.flags.join(" ")})`);
  if (/\bINTERNALDATE\b/.test(items)) parts.push(`INTERNALDATE "02-Nov-2026 12:00:00 +0000"`);
  if (/\bBODYSTRUCTURE\b/.test(items)) parts.push(`BODYSTRUCTURE ${structureOf(message.node)}`);
  for (const match of items.matchAll(/BODY\.PEEK\[([^\]]*)\](?:<(\d+)\.(\d+)>)?/g)) {
    const [, section, offset, length] = match;
    const fields = /^HEADER\.FIELDS \((.*)\)$/.exec(section);
    const bytes = fields
      ? headerBlock(message.node, fields[1].toLowerCase().split(" "))
      : sectionBytes(message.node, section);
    const data = offset === undefined ? bytes : bytes.slice(Number(offset), Number(offset) + Number(length));
    parts.push(`BODY[${section}]${offset === undefined ? "" : `<${offset}>`} {${data.length}}\r\n${data}`);
  }
  return `* ${seq} FETCH (${parts.join(" ")})\r\n`;
}

function expandUids(set) {
  return set.split(",").map(Number);
}

// mailboxes: { "a@one.test": { "INBOX": [raw or { raw, flags, uid }], ... , list: [[path, flags]] } }
// options:   refuse { user: "NO [UNAVAILABLE] busy" }, badHosts [hostname], caps, overrides per server.
export function fakeMailboxes(mailboxes, options = {}) {
  const stores = {};
  for (const [user, { list = DOVECOT_LIST, uidValidity = "1730000000", ...folders }] of Object.entries(mailboxes)) {
    const store = { list, uidValidity, folders: {} };
    for (const [path] of list) store.folders[path] = [];
    for (const [path, messages] of Object.entries(folders)) {
      store.folders[path] = messages.map((entry, index) => {
        const given = typeof entry === "string" ? { raw: entry } : entry;
        const node = parseMessage(Uint8Array.from(given.raw, (ch) => ch.charCodeAt(0)));
        const time = Date.parse(node.headers.date ?? "") || 0;
        return { uid: given.uid ?? index + 1, flags: given.flags ?? [], raw: given.raw, node, time };
      });
    }
    stores[user] = store;
  }

  const respond = (tag, cmd, srv, conn) => {
    let m;
    if (cmd.startsWith("AUTHENTICATE PLAIN ")) {
      const raw = Uint8Array.from(atob(cmd.slice(19)), (c) => c.charCodeAt(0));
      conn.user = new TextDecoder().decode(raw).split("\0")[1];
      const refusal = options.refuse?.[conn.user];
      return refusal ? `${tag} ${refusal}\r\n` : undefined;
    }
    const store = stores[conn.user];
    if (!store) return undefined;
    if (cmd === 'LIST "" "*"') {
      return store.list.map(([path, flags]) => `* LIST (${flags}) "." ${path}\r\n`).join("") + `${tag} OK List completed\r\n`;
    }
    if ((m = /^SELECT "(.*)"$/.exec(cmd))) {
      if (options.refuseSelect?.includes(m[1]) || !store.folders[m[1]]) return `${tag} NO [NONEXISTENT] Mailbox doesn't exist\r\n`;
      conn.folder = store.folders[m[1]];
      return `* ${conn.folder.length} EXISTS\r\n* OK [UIDVALIDITY ${store.uidValidity}] UIDs valid\r\n${tag} OK [READ-WRITE] Select completed\r\n`;
    }
    if ((m = /^UID SORT \((REVERSE )?DATE\) UTF-8 (.*)$/.exec(cmd))) {
      const sorted = matches(conn.folder, m[2]).sort((a, b) => a.time - b.time || a.uid - b.uid);
      if (m[1]) sorted.reverse();
      return `* SORT ${sorted.map(({ uid }) => uid).join(" ")}\r\n${tag} OK Sort completed\r\n`;
    }
    if ((m = /^UID SEARCH (.*)$/.exec(cmd))) {
      return `* SEARCH ${matches(conn.folder, m[1]).map(({ uid }) => uid).join(" ")}\r\n${tag} OK Search completed\r\n`;
    }
    if ((m = /^UID FETCH (\S+) \((.*)\)$/.exec(cmd))) {
      const wanted = expandUids(m[1]);
      const lines = conn.folder
        .map((message, index) => (wanted.includes(message.uid) ? fetchMessage(message, index + 1, m[2]) : ""))
        .join("");
      return `${lines}${tag} OK Fetch completed\r\n`;
    }
    return undefined;
  };

  const servers = fakeServer({ caps: options.caps ?? "MOVE UIDPLUS SORT", respond, silent: options.silent });
  const connect = (address, socketOptions) => {
    if (options.badHosts?.includes(address.hostname)) throw new Error("connection refused");
    return servers.connect(address, socketOptions);
  };
  return { connect, commands: servers.commands, connections: servers.connections, sockets: servers.sockets };
}

export const ACCOUNT_A = "a@one.test";
export const ACCOUNT_B = "b@two.test";
export const ACCOUNT_C = "c@two.test";

const entry = (id, host) => ({ id, host, port: 993, secret_ref: "IMAP_PASS_TEST", signature: "", folders: {} });
export const REGISTRY = [entry(ACCOUNT_A, "one.test"), entry(ACCOUNT_B, "two.test"), entry(ACCOUNT_C, "two.test")];

// Sends one tools/call through the MCP handler. Returns the tool result plus its parsed text.
export async function callTool(fake, name, args = {}, { registry = REGISTRY, now = new Date("2026-11-03T15:00:00Z"), env = {} } = {}) {
  const request = new Request("https://worker.test/mcp", {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  const response = await handleMcp(request, {
    env: { IMAP_PASS_TEST: FAKE_PASSWORD, MAILBOXES: registry, ...env },
    loadConnect: async () => fake.connect,
    now,
  });
  const { result, error } = await response.json();
  if (error) throw new Error(`JSON-RPC error: ${error.message}`);
  return { ...result.structuredContent, isError: result.isError, text: result.content[0].text };
}

export const report = (parts, boundary = "rpt") =>
  `--${boundary}\r\n${parts.join(`\r\n--${boundary}\r\n`)}\r\n--${boundary}--\r\n`;
