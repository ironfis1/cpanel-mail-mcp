// Account registry. The entries are static config: env.MAILBOXES per environment in wrangler.toml.
// Passwords never appear here; secret_ref names the platform secret that holds one.
import { ServerError } from "./errors.js";
import { LOGICAL_NAMES } from "./folders.js";

const FIELDS = ["id", "host", "port", "secret_ref", "signature", "folders"];
const GMAIL = /@(gmail|googlemail)\.com$/i;
const SECRET_NAME = /^[A-Z][A-Z0-9_]*$/;

// Which account drafts for each purpose belong in. sreasinger@gmail.com is never used for outreach
// and cannot be registered.
export const DRAFT_PURPOSES = Object.freeze({
  "job search": "scott@reasinger.net",
  "your cigar den indy, scott personally": "scott@yourcigardenindy.com",
  "founder-member outreach and replies": "founders@yourcigardenindy.com",
});

const invalid = (index, problem) => new ServerError("config", `account registry entry ${index}: ${problem}`);

function checkEntry(entry, index) {
  const keys = Object.keys(entry);
  for (const field of FIELDS) if (!keys.includes(field)) throw invalid(index, `missing field ${field}`);
  for (const key of keys) if (!FIELDS.includes(key)) throw invalid(index, `unknown field ${key}`);
  if (typeof entry.id !== "string" || !entry.id.includes("@")) throw invalid(index, "id must be an address");
  if (GMAIL.test(entry.id)) throw invalid(index, "Gmail is not a configured account");
  if (entry.port !== 993) throw invalid(index, "port must be 993");
  if (!SECRET_NAME.test(entry.secret_ref)) throw invalid(index, "secret_ref must name a platform secret");
  if (typeof entry.signature !== "string") throw invalid(index, "signature must be a string");
  for (const name of Object.keys(entry.folders)) {
    if (!LOGICAL_NAMES.includes(name)) throw invalid(index, `folders has unknown logical name ${name}`);
  }
}

// An empty signature in config means unset.
export function loadRegistry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new ServerError("config", "account registry is empty");
  const ids = new Set();
  return Object.freeze(
    entries.map((entry, index) => {
      checkEntry(entry, index);
      if (ids.has(entry.id)) throw invalid(index, `duplicate account ${entry.id}`);
      ids.add(entry.id);
      return Object.freeze({ ...entry, signature: entry.signature || null, folders: Object.freeze({ ...entry.folders }) });
    }),
  );
}

export function findAccount(registry, id) {
  const account = registry.find((entry) => entry.id === id);
  if (!account) throw new ServerError("config", `unknown account: ${id}`);
  return account;
}
