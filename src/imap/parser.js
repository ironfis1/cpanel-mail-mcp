// Parsers for IMAP server responses. A response is { text, literals }: the line with each literal
// replaced by a \0LITn\0 marker, plus the literal bytes. NUL cannot occur in an IMAP line.
import { ImapError } from "./errors.js";

const dec = new TextDecoder();
const enc = new TextEncoder();
const LITERAL_MARKER = /^\0LIT(\d+)\0/;

const malformed = (text) => new ImapError("protocol", `malformed server response at: ${text.slice(0, 40)}`);

// Reads one value at text[pos]. Returns [value, nextPos]. Lists are arrays, NIL is null, a literal
// is a Uint8Array, and atoms stay strings. An atom keeps its [...] and <...> parts whole, so
// BODY[HEADER.FIELDS (FROM TO)]<0> is a single atom.
function readValue(text, literals, pos) {
  const ch = text[pos];
  if (ch === "(") return readList(text, literals, pos + 1);
  if (ch === '"') return readQuoted(text, pos + 1);
  if (ch === "\0") {
    const match = LITERAL_MARKER.exec(text.slice(pos));
    if (!match || !literals[match[1]]) throw malformed(text);
    return [literals[match[1]], pos + match[0].length];
  }
  let end = pos;
  let depth = 0;
  while (end < text.length) {
    const c = text[end];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (depth <= 0 && (c === " " || c === ")" || c === "(")) break;
    end++;
  }
  if (end === pos) throw malformed(text);
  const atom = text.slice(pos, end);
  return [atom.toUpperCase() === "NIL" ? null : atom, end];
}

function readQuoted(text, start) {
  let out = "";
  for (let pos = start; pos < text.length; pos++) {
    if (text[pos] === '"') return [out, pos + 1];
    if (text[pos] === "\\") pos++;
    out += text[pos];
  }
  throw malformed(text);
}

function readList(text, literals, start) {
  const items = [];
  let pos = start;
  for (;;) {
    while (text[pos] === " ") pos++;
    if (pos >= text.length) throw malformed(text);
    if (text[pos] === ")") return [items, pos + 1];
    const [value, next] = readValue(text, literals, pos);
    items.push(value);
    pos = next;
  }
}

function readValues(text, literals, start) {
  const items = [];
  let pos = start;
  while (pos < text.length) {
    if (text[pos] === " ") {
      pos++;
      continue;
    }
    const [value, next] = readValue(text, literals, pos);
    items.push(value);
    pos = next;
  }
  return items;
}

const asString = (value) => (value instanceof Uint8Array ? dec.decode(value) : value);
const asBytes = (value) => (typeof value === "string" ? enc.encode(value) : value);
const asNumber = (value) => (value === null || value === undefined ? null : Number(asString(value)));

export function parseListResponse({ text, literals }) {
  const prefix = "* LIST ";
  const [flags, delimiter, name] = readValues(text, literals, prefix.length);
  if (!Array.isArray(flags) || name === undefined || name === null) throw malformed(text);
  const specialUse = flags.find((f) => /^\\(Drafts|Sent|Archive|Trash|Junk|All|Flagged)$/i.test(f)) ?? null;
  return { path: asString(name), delimiter: asString(delimiter), flags, specialUse };
}

function parseParams(list) {
  const params = {};
  if (!Array.isArray(list)) return params;
  for (let i = 0; i + 1 < list.length; i += 2) {
    params[String(asString(list[i])).toLowerCase()] = asString(list[i + 1]);
  }
  return params;
}

function parseDisposition(value) {
  if (!Array.isArray(value)) return null;
  return { type: String(asString(value[0])).toLowerCase(), params: parseParams(value[1]) };
}

// RFC 3501 BODYSTRUCTURE. `part` is the section number a partial fetch asks for.
export function parseBodyStructure(node, part = "") {
  if (!Array.isArray(node)) throw new ImapError("protocol", "malformed BODYSTRUCTURE");
  const child = (i) => (part ? `${part}.${i}` : String(i));

  if (Array.isArray(node[0])) {
    let count = 0;
    while (Array.isArray(node[count])) count++;
    return {
      part: part || null,
      type: "multipart",
      subtype: String(asString(node[count])).toLowerCase(),
      params: parseParams(node[count + 1]),
      disposition: parseDisposition(node[count + 2]),
      parts: node.slice(0, count).map((n, i) => parseBodyStructure(n, child(i + 1))),
    };
  }

  const type = String(asString(node[0])).toLowerCase();
  const subtype = String(asString(node[1])).toLowerCase();
  const out = {
    part: part || "1",
    type,
    subtype,
    params: parseParams(node[2]),
    id: asString(node[3]),
    description: asString(node[4]),
    encoding: String(asString(node[5])).toLowerCase(),
    size: asNumber(node[6]),
  };
  let extension = 7;
  if (type === "text") {
    out.lines = asNumber(node[7]);
    extension = 8;
  } else if (type === "message" && subtype === "rfc822") {
    // RFC 3501 numbering: a nested multipart's children are n.1, n.2; a nested single part is n.1.
    out.message = parseBodyStructure(node[8], Array.isArray(node[8]?.[0]) ? out.part : `${out.part}.1`);
    out.lines = asNumber(node[9]);
    extension = 10;
  }
  out.disposition = parseDisposition(node[extension + 1]);
  return out;
}

// One FETCH line. Section contents are bytes, keyed by section: BODY[1]<0> becomes sections["1"].
export function parseFetchResponse({ text, literals }) {
  const head = /^\* (\d+) FETCH /i.exec(text);
  if (!head) throw malformed(text);
  const [items] = readValues(text, literals, head[0].length);
  if (!Array.isArray(items)) throw malformed(text);

  const out = { seq: Number(head[1]), uid: null, flags: null, sections: {}, origins: {} };
  for (let i = 0; i + 1 < items.length; i += 2) {
    const name = String(items[i]);
    const value = items[i + 1];
    const upper = name.toUpperCase();
    const section = /^BODY\[(.*)\](?:<(\d+)>)?$/is.exec(name);
    if (section) {
      out.sections[section[1]] = asBytes(value);
      if (section[2] !== undefined) out.origins[section[1]] = Number(section[2]);
    } else if (upper === "UID") out.uid = Number(value);
    else if (upper === "FLAGS") out.flags = value;
    else if (upper === "BODYSTRUCTURE") out.bodyStructure = parseBodyStructure(value);
    else if (upper === "RFC822.SIZE") out.size = Number(value);
    else if (upper === "INTERNALDATE") out.internalDate = asString(value);
  }
  return out;
}

// Header block to a lower-cased map. Values stay undecoded.
export function parseHeaders(raw) {
  const text = typeof raw === "string" ? raw : dec.decode(raw);
  const headers = {};
  for (const line of text.replace(/\r\n[ \t]+/g, " ").split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  return headers;
}

// [COPYUID validity source dest] from a status text, as { uidValidity, uid }.
export function parseCopyUid(text) {
  const match = /\[COPYUID (\d+) \S+ (\d+)\]/i.exec(text);
  return match ? { uidValidity: match[1], uid: Number(match[2]) } : { uidValidity: null, uid: null };
}
