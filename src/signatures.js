// The server signs every draft it creates or edits, from the account's config. The caller's body
// carries no signature; the composed draft does. Pure functions.
import { ServerError } from "./errors.js";
import { renderMarkdown } from "./mime/markdown.js";

const URL_IN_SIGNATURE = /https?:\/\/[^\s|]+/g;

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The signature as a regex source, with any run of whitespace matching any other.
function signatureSource(signature) {
  return signature
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"))
    .join("\\s+");
}

function requireSignature(account) {
  if (!account.signature) throw new ServerError("signature_unset", `no signature is configured for ${account.id}`);
  return account.signature;
}

const lf = (text) => text.replace(/\r\n?/g, "\n");

// Removes one trailing copy of the signature, whitespace-normalized, and any white space after the
// remaining text.
export function stripTrailingSignature(body, signature) {
  const trailing = new RegExp(`(^|\\s)${signatureSource(signature)}\\s*$`);
  return lf(body).replace(trailing, "").trimEnd();
}

// HTML for the signature: escaped in its own block, each URL a link whose visible text is the URL.
export function signatureHtml(signature) {
  let html = "";
  let last = 0;
  for (const match of signature.matchAll(URL_IN_SIGNATURE)) {
    const url = escapeHtml(match[0]);
    html += `${escapeHtml(signature.slice(last, match.index))}<a href="${url}">${url}</a>`;
    last = match.index + match[0].length;
  }
  return `<div>${html}${escapeHtml(signature.slice(last))}</div>\n`;
}

// body: CommonMark with no signature (a trailing copy is stripped anyway). quote: { text, html } of
// the already formatted quoted original, for a reply or forward. Returns the two parts' content.
export function composeDraftBody(account, { body, quote = null }) {
  const signature = requireSignature(account);
  const stripped = stripTrailingSignature(body, signature);
  const text = [stripped, signature, quote?.text].filter(Boolean).join("\n\n");
  const html = `${stripped ? renderMarkdown(stripped) : ""}${signatureHtml(signature)}${quote?.html ?? ""}`;
  return { body: stripped, text, html };
}

// For an edit with no new body: splits a stored draft's text part at its signature. The signature
// is the first line matching it, since a quoted original below may end with its own copy.
// `signed` is false when no line matches, and then all the text is in `body`.
export function splitStoredDraft(text, signature) {
  const normalized = lf(text);
  const line = new RegExp(`^[ \\t]*${signatureSource(signature)}[ \\t]*$`, "m").exec(normalized);
  if (!line) return { body: normalized.trimEnd(), quoted: "", signed: false };
  return {
    body: normalized.slice(0, line.index).trimEnd(),
    quoted: normalized.slice(line.index + line[0].length).trim(),
    signed: true,
  };
}
