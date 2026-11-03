// Builds a draft as an RFC 5322 multipart/alternative message. Pure: Message-ID and date come from
// the caller, so an edit can keep its Message-ID (REQ-9-24).
import { ServerError } from "../errors.js";
import { encodeSubject, formatAddress, formatAddressList } from "./headers.js";

// Quoted-printable output always writes "=" as "=3D", so "=_" cannot occur in a part body and a
// fixed boundary can never collide with content (RFC 2045 section 6.7).
const BOUNDARY = "=_cpanel-mail-mcp";
const QP_LINE = 76;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MESSAGE_ID = /^<[^<>\s]+>$/;

const pad = (n) => String(n).padStart(2, "0");

function formatDate(d) {
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return `${DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${time} +0000`;
}

function quotedPrintableLine(line) {
  const bytes = new TextEncoder().encode(line);
  const lines = [];
  let out = "";
  bytes.forEach((byte, i) => {
    const last = i === bytes.length - 1;
    const literal = (byte >= 33 && byte <= 126 && byte !== 61) || ((byte === 32 || byte === 9) && !last);
    const token = literal ? String.fromCharCode(byte) : `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    // Room for the token and, unless the line ends here, a trailing soft-break "=".
    if (out.length + token.length > QP_LINE - (last ? 0 : 1)) {
      lines.push(`${out}=`);
      out = "";
    }
    out += token;
  });
  lines.push(out);
  return lines.join("\r\n");
}

export const encodeQuotedPrintable = (text) => text.split(/\r\n|\r|\n/).map(quotedPrintableLine).join("\r\n");

const part = (type, content) =>
  [
    `--${BOUNDARY}`,
    `Content-Type: ${type}; charset=UTF-8`,
    "Content-Transfer-Encoding: quoted-printable",
    "",
    encodeQuotedPrintable(content),
  ].join("\r\n");

function checkMessageId(id) {
  if (!MESSAGE_ID.test(id ?? "")) throw new ServerError("draft", `invalid Message-ID: ${id}`);
  return id;
}

// from: the account address. to, cc, bcc: arrays of addresses. references: an array of Message-IDs.
export function buildDraftMessage({ from, to = [], cc = [], bcc = [], subject, date, messageId, inReplyTo, references = [], text, html }) {
  const headers = [`From: ${formatAddress(from)}`];
  if (to.length) headers.push(`To: ${formatAddressList(to)}`);
  if (cc.length) headers.push(`Cc: ${formatAddressList(cc)}`);
  if (bcc.length) headers.push(`Bcc: ${formatAddressList(bcc)}`);
  headers.push(`Subject: ${encodeSubject(subject)}`, `Date: ${formatDate(date)}`, `Message-ID: ${checkMessageId(messageId)}`);
  if (inReplyTo) headers.push(`In-Reply-To: ${checkMessageId(inReplyTo)}`);
  if (references.length) headers.push(`References: ${references.map(checkMessageId).join("\r\n ")}`);
  headers.push("MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${BOUNDARY}"`);
  return `${headers.join("\r\n")}\r\n\r\n${part("text/plain", text)}\r\n${part("text/html", html)}\r\n--${BOUNDARY}--\r\n`;
}
