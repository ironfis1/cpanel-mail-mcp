// Gmail-style filter string to IMAP SEARCH criteria. Tokens are split on whitespace and combined
// with AND, which is how IMAP reads a run of search keys. Every value goes through quote().
//
// newer_than is date-granular: SINCE matches from the start of that date on the server, so a result
// can be up to one day older than N days. That over-inclusion is accepted because it never drops
// mail (REQ-7-7).
import { imapDate, quote } from "./imap/client.js";
import { ServerError } from "./errors.js";

const TIME_ZONE = "America/Indianapolis";
const VALUE_KEYS = { from: "FROM", to: "TO", subject: "SUBJECT" };
const IS_KEYS = { "is:unread": "UNSEEN", "is:read": "SEEN", "is:pinned": "FLAGGED" };
const DAYS = /^(\d+)d$/;

const rejected = (token, why) => new ServerError("filter", `unsupported filter token "${token}": ${why}`);

// The Indianapolis calendar date, minus `days`, as a UTC Date so calendar math ignores DST.
function indianapolisDate(now, days) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type) => Number(parts.find((p) => p.type === type).value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day") - days));
}

function dateKey(key, token, value, now) {
  const match = DAYS.exec(value);
  if (!match) throw rejected(token, "the value must be a number of days, like 3d");
  const date = indianapolisDate(now, Number(match[1]));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1000) throw rejected(token, "the date is out of range");
  return `${key} ${imapDate(date)}`;
}

function translateToken(token, now) {
  if (/[\0-\x1f\x7f]/.test(token)) throw rejected(token, "control characters are not allowed");
  if (token.includes('"')) throw rejected(token, "quoting is not supported");
  if (token === "OR" || token === "NOT" || /[{}()|]/.test(token[0])) {
    throw rejected(token, "OR, negation and grouping are not supported");
  }
  if (token.startsWith("-")) throw rejected(token, "negation is not supported");
  if (IS_KEYS[token]) return IS_KEYS[token];

  const colon = token.indexOf(":");
  if (colon < 0) return `TEXT ${quote(token)}`;

  const key = token.slice(0, colon);
  const value = token.slice(colon + 1);
  if (key === "newer_than") return dateKey("SINCE", token, value, now);
  if (key === "older_than") return dateKey("BEFORE", token, value, now);
  if (!Object.hasOwn(VALUE_KEYS, key)) throw rejected(token, "it is not in the filter grammar");
  if (!value) throw rejected(token, "it has no value");
  return `${VALUE_KEYS[key]} ${quote(value)}`;
}

// Returns criteria for ImapClient.uidSearch(). An empty filter matches everything.
export function translateFilter(filter, { now = new Date() } = {}) {
  const tokens = String(filter ?? "").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "ALL";
  const criteria = tokens.map((token) => translateToken(token, now)).join(" ");
  // Without a charset, non-ASCII search text is invalid IMAP.
  return /[^\x00-\x7f]/.test(criteria) ? `CHARSET UTF-8 ${criteria}` : criteria;
}
