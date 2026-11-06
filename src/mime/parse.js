// MIME parsing for snippets and plain-text thread bodies. Pure functions. Tolerates a truncated
// message, because snippets come from partial fetches.
import { decodeHTML } from "entities";
import { decodeHeader, parseAddressList } from "./headers.js";

const MAX_DEPTH = 20;
const SNIPPET_CHARS = 200;

// Bytes held as a string of char codes 0 to 255, so boundaries can be found with a regex. Not
// TextDecoder("latin1"), which is really windows-1252 and changes 0x80 to 0x9f.
function toBinary(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

const fromBinary = (binary) => Uint8Array.from(binary, (ch) => ch.charCodeAt(0) & 0xff);
const asBinary = (raw) => toBinary(typeof raw === "string" ? new TextEncoder().encode(raw) : raw);

function parseHeaderBlock(binary) {
  const text = new TextDecoder().decode(fromBinary(binary));
  const headers = {};
  for (const line of text.replace(/\r?\n(?=[ \t])/g, "").split(/\r?\n/)) {
    const match = /^([^:\s]+)[ \t]*:[ \t]*(.*)$/s.exec(line);
    if (match) headers[match[1].toLowerCase()] ??= match[2].trim();
  }
  return headers;
}

// "text/plain; charset=utf-8" to { value: "text/plain", params: { charset: "utf-8" } }.
function parseParams(header, fallback) {
  const value = /^\s*([^;\s]+)/.exec(header ?? "")?.[1] ?? fallback;
  const params = {};
  for (const match of (header ?? "").matchAll(/;\s*([^=\s;]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\s]*))/g)) {
    params[match[1].toLowerCase()] = match[2] !== undefined ? match[2].replace(/\\(.)/g, "$1") : match[3];
  }
  return { value: value.toLowerCase(), params };
}

function splitMultipart(binary, boundary) {
  const escaped = boundary.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
  const delimiter = new RegExp(`(?:^|\\r?\\n)--${escaped}(--)?[ \\t]*(?=\\r?\\n|$)`, "g");
  const parts = [];
  let start = null;
  for (const match of binary.matchAll(delimiter)) {
    if (start !== null) parts.push(binary.slice(start, match.index));
    if (match[1]) return parts;
    start = match.index + match[0].length;
  }
  if (start !== null) parts.push(binary.slice(start)); // Truncated: no closing delimiter.
  return parts;
}

function decodeTransfer(binary, encoding) {
  if (encoding === "base64") {
    const clean = binary.replace(/[^A-Za-z0-9+/]/g, "");
    const whole = clean.slice(0, clean.length - (clean.length % 4 === 1 ? 1 : 0));
    return fromBinary(atob(whole.padEnd(Math.ceil(whole.length / 4) * 4, "=")));
  }
  if (encoding === "quoted-printable") {
    return fromBinary(
      binary
        .replace(/=[ \t]*\r?\n/g, "")
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/=[0-9A-Fa-f]?$/, ""), // Cut off by a partial fetch.
    );
  }
  return fromBinary(binary);
}

function parseNode(binary, depth) {
  const startsBlank = /^\r?\n/.exec(binary);
  const split = startsBlank ? null : /\r?\n\r?\n/.exec(binary);
  const head = startsBlank ? "" : split ? binary.slice(0, split.index) : binary;
  const body = startsBlank ? binary.slice(startsBlank[0].length) : split ? binary.slice(split.index + split[0].length) : "";
  const headers = parseHeaderBlock(head);
  const { value: type, params } = parseParams(headers["content-type"], "text/plain");
  const encoding = (headers["content-transfer-encoding"] ?? "7bit").trim().toLowerCase();
  const node = {
    headers,
    type,
    params,
    encoding,
    disposition: parseParams(headers["content-disposition"], "inline").value,
    body,
    parts: [],
    message: null,
  };
  if (depth >= MAX_DEPTH) return node;
  if (type.startsWith("multipart/") && params.boundary) {
    // Each part starts with the line break that ended its delimiter line.
    node.parts = splitMultipart(body, params.boundary).map((part) => parseNode(part.replace(/^\r?\n/, ""), depth + 1));
  } else if (type === "message/rfc822") {
    node.message = parseNode(toBinary(decodeTransfer(body, encoding)), depth + 1);
  }
  return node;
}

// raw: Uint8Array or string, a whole message or the start of one.
export const parseMessage = (raw) => parseNode(asBinary(raw), 0);

function decodeCharset(bytes, charset) {
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

// The text of one part's bytes, for a part fetched on its own from its BODYSTRUCTURE values.
export function decodePart(raw, { encoding = "7bit", charset = "utf-8" } = {}) {
  return decodeCharset(decodeTransfer(asBinary(raw), encoding.toLowerCase()), charset);
}

const nodeText = (node) => decodePart(fromBinary(node.body), { encoding: node.encoding, charset: node.params.charset });

export const headerText = (node, name) => decodeHeader(node.headers[name.toLowerCase()]);
export const headerAddresses = (node, name) => parseAddressList(node.headers[name.toLowerCase()]);

export function htmlToText(html) {
  const stripped = html
    .replace(/<(script|style|head)\b[\s\S]*?(<\/\1\s*>|$)/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\b[^>]*>|<\/(p|div|tr|li|h[1-6]|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n");
  return decodeHTML(stripped);
}

const isAttachment = (node) => node.disposition === "attachment";

function leaves(node, out = []) {
  if (node.parts.length) for (const part of node.parts) leaves(part, out);
  else if (!isAttachment(node)) out.push(node);
  return out;
}

// The message's text: its first text/plain part, else its first text/html part with tags stripped.
export function bodyText(node) {
  const all = leaves(node);
  const plain = all.find((leaf) => leaf.type === "text/plain");
  if (plain) return nodeText(plain);
  const html = all.find((leaf) => leaf.type === "text/html");
  return html ? htmlToText(nodeText(html)) : "";
}

const EMBEDDED_HEADERS = ["From", "To", "Subject", "Date"];

function threadChunks(node) {
  if (isAttachment(node)) return [];
  if (node.type === "multipart/alternative") {
    const plain = node.parts.find((part) => leaves(part).some((leaf) => leaf.type === "text/plain"));
    const chosen = plain ?? node.parts[0];
    return chosen ? threadChunks(chosen) : [];
  }
  if (node.parts.length) return node.parts.flatMap(threadChunks);
  if (node.type === "text/plain" || node.type === "message/delivery-status") return [nodeText(node).trim()];
  if (node.type === "text/html") return [htmlToText(nodeText(node)).trim()];
  if (node.type === "message/rfc822" && node.message) {
    return [
      EMBEDDED_HEADERS.filter((name) => node.message.headers[name.toLowerCase()] !== undefined)
        .map((name) => `${name}: ${headerText(node.message, name)}`)
        .join("\n"),
    ];
  }
  return [];
}

// A message as text for `thread`: its text, its delivery-status parts, and only the From, To,
// Subject and Date headers of an embedded original.
export const threadBody = (node) => threadChunks(node).filter(Boolean).join("\n\n");

const THREAD_TEXT_TYPES = ["text/plain", "text/html", "message/delivery-status"];

// The BODY sections threadBody reads from a BODYSTRUCTURE, so attachments are never fetched.
export function threadSections(structure) {
  if (structure.disposition?.type === "attachment") return [];
  if (structure.parts) return structure.parts.flatMap(threadSections);
  const type = `${structure.type}/${structure.subtype}`;
  if (type === "message/rfc822") return [`${structure.part}.HEADER`];
  return THREAD_TEXT_TYPES.includes(type) ? [structure.part] : [];
}

// The node tree threadBody takes, built from a BODYSTRUCTURE and the sections threadSections named.
export function nodeFromStructure(structure, sections) {
  const multipart = structure.type === "multipart";
  const type = `${structure.type}/${structure.subtype}`;
  const header = sections[`${structure.part}.HEADER`];
  return {
    headers: {},
    type,
    params: structure.params,
    encoding: structure.encoding ?? "7bit",
    disposition: structure.disposition?.type ?? "inline",
    body: multipart ? "" : asBinary(sections[structure.part] ?? ""),
    parts: multipart ? structure.parts.map((part) => nodeFromStructure(part, sections)) : [],
    message: type === "message/rfc822" && header ? parseMessage(header) : null,
  };
}

// The Final-Recipient and Diagnostic-Code fields of a delivery-status part's text, in order.
export function deliveryStatusSummary(text) {
  const unfolded = text.replace(/\r?\n(?=[ \t])/g, "");
  return [...unfolded.matchAll(/^(?:Final-Recipient|Diagnostic-Code)[ \t]*:.*$/gim)].map((m) => m[0].trim()).join(" ");
}

function findType(node, type) {
  if (node.type === type) return node;
  for (const part of node.parts) {
    const found = findType(part, type);
    if (found) return found;
  }
  return null;
}

// Whitespace collapsed, then the first 200 characters.
export const makeSnippet = (text) => Array.from(text.replace(/\s+/g, " ").trim()).slice(0, SNIPPET_CHARS).join("");

export function messageSnippet(node) {
  const report = findType(node, "multipart/report");
  const status = report && findType(report, "message/delivery-status");
  const lead = status ? deliveryStatusSummary(nodeText(status)) : "";
  return makeSnippet(`${lead} ${bodyText(node)}`);
}
