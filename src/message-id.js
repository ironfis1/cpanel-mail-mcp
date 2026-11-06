// The server's own message ID: opaque, deterministic, and meaningless to the Spark connector. It
// holds the real folder path, because search reaches folders that have no logical name.
import { ServerError } from "./errors.js";
import { quote } from "./imap/client.js";

const PREFIX = "cmm1_";
const FALLBACK_FOLDERS = ["Archive", "Inbox", "Sent", "Drafts"];

const invalidId = () => new ServerError("id_invalid", "not a message ID issued by this server");

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// messageId is the RFC Message-ID, or null when the message has none.
export function encodeMessageId({ account, folder, uidValidity, uid, messageId }) {
  const json = JSON.stringify([account, folder, String(uidValidity), uid, messageId ?? null]);
  return PREFIX + toBase64Url(new TextEncoder().encode(json));
}

export function decodeMessageId(id) {
  if (typeof id !== "string" || !id.startsWith(PREFIX)) throw invalidId();
  let fields;
  try {
    fields = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fromBase64Url(id.slice(PREFIX.length))));
  } catch {
    throw invalidId();
  }
  if (!Array.isArray(fields) || fields.length !== 5) throw invalidId();
  const [account, folder, uidValidity, uid, messageId] = fields;
  const text = (value) => typeof value === "string" && value.length > 0;
  if (!text(account) || !text(folder) || !/^\d+$/.test(uidValidity) || !Number.isSafeInteger(uid) || uid < 1) {
    throw invalidId();
  }
  if (messageId !== null && !text(messageId)) throw invalidId();
  return { account, folder, uidValidity, uid, messageId };
}

// The account for a decoded ID, checked before any IMAP call. IDs are not signed, so the account in
// one proves nothing until it is found in the registry. A supplied account must agree with it.
export function accountForId(registry, decoded, given) {
  const account = registry.find((entry) => entry.id === decoded.account);
  if (!account) throw new ServerError("id_invalid", "message ID names an account this server does not serve");
  if (given !== undefined && given !== decoded.account) {
    throw new ServerError("account_mismatch", `account ${given} does not match the message ID's account ${decoded.account}`);
  }
  return account;
}

// What Scott is handed for a draft: the server ID plus what he sees in Spark.
export function draftReference({ id, account, to, subject }) {
  return { id, account, to, subject };
}

// Selects a folder, or returns null if the host says it is not selectable.
async function selectIfPresent(client, folder) {
  try {
    return await client.select(folder);
  } catch (error) {
    if (error.code === "command") return null;
    throw error;
  }
}

// Finds a decoded ID's message on a session and leaves its folder selected. Uses the UID when
// UIDVALIDITY matches and the UID still exists; otherwise searches for the Message-ID in the encoded
// folder, then Archive, Inbox, Sent, Drafts. The first folder with a match decides: no match is
// id_not_found, several in that folder is id_ambiguous. It never guesses.
export async function lookupMessage(client, decoded) {
  const { folder, uidValidity, uid, messageId } = decoded;
  const selected = await selectIfPresent(client, folder);
  if (selected?.uidValidity === uidValidity) {
    const found = await client.uidSearch(`UID ${uid}`);
    if (found.includes(uid)) return { folder, uid, uidValidity };
  }

  const notFound = () => new ServerError("id_not_found", "message not found; it may have been deleted");
  if (messageId === null) throw notFound();

  const criteria = `HEADER Message-ID ${quote(messageId)}`;
  const tried = new Set();
  const order = [() => folder, ...FALLBACK_FOLDERS.map((logical) => () => client.folders.path(logical))];
  for (const nextFolder of order) {
    const path = nextFolder();
    if (tried.has(path)) continue;
    tried.add(path);
    const current = path === folder ? selected : await client.select(path);
    if (!current) continue;
    const matches = await client.uidSearch(criteria);
    if (matches.length > 1) {
      throw new ServerError("id_ambiguous", "several messages in one folder share this Message-ID; not guessing");
    }
    if (matches.length === 1) return { folder: path, uid: matches[0], uidValidity: current.uidValidity };
  }
  throw notFound();
}
