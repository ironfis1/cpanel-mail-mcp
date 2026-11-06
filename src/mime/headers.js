// Header text: RFC 2047 decode and encode, address lists, Re:/Fwd: subjects, threading headers.
// Pure functions. Raw header values go in, unfolded or not.
import { ServerError } from "../errors.js";

const ENCODED_WORD = /=\?([^?\s]+)\?([bBqQ])\?([^?\s]*)\?=/g;
const ENC = new TextEncoder();
// 39 bytes is 52 base64 characters, a 64-character encoded word (limit 75). With "Subject: " in
// front the line stays under 76.
const WORD_BYTES = 39;
const LINE = 76;

const toBytes = (binary) => Uint8Array.from(binary, (ch) => ch.charCodeAt(0));

function decodeWordBytes(encoding, text) {
  if (encoding.toLowerCase() === "b") {
    const clean = text.replace(/=+$/, "");
    if (clean.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(clean)) return null;
    return toBytes(atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, "=")));
  }
  const binary = text
    .replace(/_/g, " ")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return /[^\x00-\xff]/.test(binary) ? null : toBytes(binary);
}

function newDecoder(charset) {
  try {
    return new TextDecoder(charset.split("*")[0]);
  } catch {
    return null;
  }
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

// Splits a value into literal text and decodable encoded words. A word that cannot be decoded (an
// unknown charset, bad base64) stays literal, as RFC 2047 section 6.3 allows.
function tokens(value) {
  const out = [];
  let last = 0;
  for (const match of value.matchAll(ENCODED_WORD)) {
    const decoder = newDecoder(match[1]);
    const bytes = decoder && decodeWordBytes(match[2], match[3]);
    if (!bytes) continue;
    if (match.index > last) out.push({ text: value.slice(last, match.index) });
    out.push({ charset: match[1].split("*")[0].toLowerCase(), bytes });
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push({ text: value.slice(last) });
  return out;
}

const isGap = (part) => part?.text !== undefined && /^[ \t]+$/.test(part.text);

// RFC 2047: white space between adjacent encoded words is dropped. Bytes of adjacent words in one
// charset decode together, because some senders split a multibyte character across two words.
// Line breaks never survive, so a decoded value is safe to reuse in a header.
export function decodeHeader(value) {
  if (value === null || value === undefined) return "";
  const parts = tokens(String(value).replace(/\r?\n(?=[ \t])/g, ""));
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.text !== undefined) {
      if (!(isGap(part) && parts[i - 1]?.bytes && parts[i + 1]?.bytes)) out += part.text;
      continue;
    }
    const chunks = [part.bytes];
    while (true) {
      const step = isGap(parts[i + 1]) ? 2 : 1;
      if (parts[i + step]?.charset !== part.charset) break;
      chunks.push(parts[i + step].bytes);
      i += step;
    }
    out += new TextDecoder(part.charset).decode(concat(chunks));
  }
  return out.replace(/[\r\n\0]+/g, " ");
}

const needsEncoding = (text) => /[^\x20-\x7e]/.test(text) || text.includes("=?");

function encodedWords(text) {
  const words = [];
  let chunk = [];
  let size = 0;
  const flush = () => {
    words.push(`=?UTF-8?B?${btoa(String.fromCharCode(...concat(chunk)))}?=`);
    chunk = [];
    size = 0;
  };
  // By code point, so no word ends inside a character.
  for (const ch of text) {
    const bytes = ENC.encode(ch);
    if (size + bytes.length > WORD_BYTES) flush();
    chunk.push(bytes);
    size += bytes.length;
  }
  if (size) flush();
  return words;
}

function foldAscii(value, used) {
  const lines = [];
  let line = "";
  let room = LINE - used;
  for (const word of value.split(/(?<=\S)(?= )/)) {
    if (line && line.length + word.length > room) {
      lines.push(line);
      line = "";
      room = LINE;
    }
    line += word;
  }
  lines.push(line);
  return lines.join("\r\n");
}

function refuseLineBreak(text, what) {
  if (/[\r\n\0]/.test(text)) throw new ServerError("draft", `${what} contains a line break`);
}

// A subject for writing. Non-ASCII becomes UTF-8 encoded words, folded onto continuation lines.
export function encodeSubject(subject) {
  refuseLineBreak(subject, "subject");
  if (needsEncoding(subject)) return encodedWords(subject).join("\r\n ");
  return foldAscii(subject, "Subject: ".length);
}

// The decoded subject goes in. Re: is added only when it is not already there.
export const replySubject = (decoded) => (/^\s*re:/i.test(decoded) ? decoded : `Re: ${decoded}`);
export const forwardSubject = (decoded) => `Fwd: ${decoded}`;

// The subject thread matching compares: Re:, Fwd: and Fw: stripped repeatedly, case-insensitive.
export function normalizeSubject(decoded) {
  let subject = decoded.trim();
  for (let next; (next = subject.replace(/^(?:re|fwd|fw):\s*/i, "")) !== subject; ) subject = next;
  return subject;
}

// Splits a raw address header on top-level commas, keeping quotes, comments and <...> whole.
function addressEntries(value) {
  const entries = [];
  let entry = { display: "", address: null, comment: "" };
  const push = () => {
    entries.push(entry);
    entry = { display: "", address: null, comment: "" };
  };
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      for (i++; i < value.length && value[i] !== '"'; i++) {
        if (value[i] === "\\") i++;
        entry.display += value[i] ?? "";
      }
    } else if (ch === "(") {
      let depth = 1;
      for (i++; i < value.length; i++) {
        if (value[i] === "\\") i++;
        else if (value[i] === "(") depth++;
        else if (value[i] === ")" && --depth === 0) break;
        entry.comment += value[i] ?? "";
      }
    } else if (ch === "<") {
      const end = value.indexOf(">", i);
      const stop = end === -1 ? value.length : end;
      entry.address = value.slice(i + 1, stop).trim();
      i = stop;
    } else if (ch === "," || ch === ";") {
      push(); // A semicolon ends an RFC 5322 group.
    } else if (ch === ":" && entry.address === null) {
      entry.display = ""; // A group name, not part of any address.
    } else {
      entry.display += ch;
    }
  }
  push();
  return entries;
}

// [{ name, address }] with display names decoded. Parsed before decoding, so a comma inside an
// encoded name cannot split an entry.
export function parseAddressList(value) {
  if (!value) return [];
  const unfolded = String(value).replace(/\r?\n(?=[ \t])/g, "");
  const out = [];
  for (const { display, address, comment } of addressEntries(unfolded)) {
    const text = display.trim();
    if (address) out.push({ name: decodeHeader(text), address });
    else if (text.includes("@")) out.push({ name: decodeHeader(comment.trim()), address: text });
  }
  return out;
}

const ADDRESS = /^[\x21-\x7e]+@[\x21-\x7e]+$/;
const ADDRESS_SPECIALS = /[<>,;:"()]/;

function onlyAddress(text) {
  refuseLineBreak(text, "address");
  const parsed = parseAddressList(text);
  if (parsed.length !== 1) throw new ServerError("draft", `invalid address: ${text}`);
  return parsed[0];
}

export function formatAddress(entry) {
  const { name, address } = typeof entry === "string" ? onlyAddress(entry) : entry;
  if (!ADDRESS.test(address ?? "") || ADDRESS_SPECIALS.test(address)) {
    throw new ServerError("draft", `invalid address: ${address}`);
  }
  if (!name) return address;
  refuseLineBreak(name, "display name");
  if (needsEncoding(name)) return `${encodedWords(name).join(" ")} <${address}>`;
  const atoms = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~ ]+$/.test(name);
  return `${atoms ? name : `"${name.replace(/(["\\])/g, "\\$1")}"`} <${address}>`;
}

export const formatAddressList = (entries) => entries.map(formatAddress).join(",\r\n ");

const messageIds = (value) => (value ? (String(value).match(/<[^<>\s]+>/g) ?? []) : []);

// In-Reply-To and References for a draft from the original's raw headers (RFC 5322 section 3.6.4):
// References is the original's References, or its In-Reply-To when it has none, then its Message-ID.
export function threadingHeaders({ messageId, references, inReplyTo }) {
  const [id] = messageIds(messageId);
  const parents = messageIds(references);
  const chain = parents.length ? parents : messageIds(inReplyTo).slice(0, 1);
  return { inReplyTo: id ?? null, references: id ? [...chain, id] : chain };
}
