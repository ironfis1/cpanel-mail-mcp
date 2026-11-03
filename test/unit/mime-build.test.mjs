import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDraftMessage, encodeQuotedPrintable } from "../../src/mime/build.js";
import { threadingHeaders } from "../../src/mime/headers.js";
import { renderMarkdown } from "../../src/mime/markdown.js";
import { bodyText, decodePart, headerAddresses, headerText, parseMessage } from "../../src/mime/parse.js";

const DRAFT = {
  from: "scott@reasinger.net",
  to: ["jane@acme.example"],
  subject: "Hello",
  date: new Date("2026-11-03T14:05:09Z"),
  messageId: "<draft-1@reasinger.net>",
  text: "Body text",
  html: "<p>Body text</p>\n",
};

const headerBlock = (raw) => raw.slice(0, raw.indexOf("\r\n\r\n"));

test("REQ-18-8: bodies parse as CommonMark", () => {
  assert.equal(renderMarkdown("Hi **there**, see [the site](https://example.invalid/a)."), '<p>Hi <strong>there</strong>, see <a href="https://example.invalid/a">the site</a>.</p>\n');
  assert.equal(renderMarkdown("- one\n- two\n"), "<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n");
  assert.equal(renderMarkdown("# Title"), "<h1>Title</h1>\n");
  assert.equal(renderMarkdown("line one\nline two\n\nnext"), "<p>line one\nline two</p>\n<p>next</p>\n");
  assert.equal(renderMarkdown("a < b & c"), "<p>a &lt; b &amp; c</p>\n");
});

test("REQ-18-8: CommonMark rules, not another dialect's: no tables, no bare-URL links", () => {
  assert.doesNotMatch(renderMarkdown("| a |\n|---|\n| b |"), /<table>/);
  assert.equal(renderMarkdown("https://example.invalid"), "<p>https://example.invalid</p>\n");
  assert.equal(renderMarkdown("<https://example.invalid>"), '<p><a href="https://example.invalid">https://example.invalid</a></p>\n');
});

test("REQ-11-3 REQ-14-15: the built message carries the re-encoded subject in pure ASCII", () => {
  const raw = buildDraftMessage({ ...DRAFT, subject: "Re: Fixture é subject" });
  assert.match(raw, /^[\x00-\x7f]*$/);
  assert.match(raw, /\r\nSubject: =\?UTF-8\?B\?/);
  assert.equal(headerText(parseMessage(raw), "Subject"), "Re: Fixture é subject");
});

test("REQ-11-4: the built message sets In-Reply-To and folded References", () => {
  const threading = threadingHeaders({ messageId: "<c@x>", references: "<a@x> <b@x>" });
  const raw = buildDraftMessage({ ...DRAFT, ...threading });
  assert.match(headerBlock(raw), /\r\nIn-Reply-To: <c@x>\r\nReferences: <a@x>\r\n <b@x>\r\n <c@x>\r\n/);
  const message = parseMessage(raw);
  assert.equal(message.headers["in-reply-to"], "<c@x>");
  assert.equal(message.headers.references, "<a@x> <b@x> <c@x>");
});

test("REQ-11-4: a new draft has no threading headers", () => {
  const head = headerBlock(buildDraftMessage(DRAFT));
  assert.doesNotMatch(head, /In-Reply-To|References/);
});

test("REQ-18-8: the message is multipart/alternative with both parts, in UTF-8, round-tripping", () => {
  const text = "Café = 日本語\n\ntrailing space \nnext\n";
  const html = "<p>Café = 日本語</p>\n";
  const message = parseMessage(buildDraftMessage({ ...DRAFT, text, html }));
  assert.equal(message.type, "multipart/alternative");
  assert.deepEqual(message.parts.map((p) => p.type), ["text/plain", "text/html"]);
  assert.equal(bodyText(message), text.replace(/\n/g, "\r\n"));
  const htmlPart = message.parts[1];
  assert.equal(decodePart(htmlPart.body, { encoding: htmlPart.encoding, charset: htmlPart.params.charset }), html.replace(/\n/g, "\r\n"));
});

test("REQ-18-8: the headers an RFC 5322 draft needs are all there, with every recipient list", () => {
  const raw = buildDraftMessage({ ...DRAFT, cc: ["c@example.invalid", "d@example.invalid"], bcc: ["b@example.invalid"] });
  const message = parseMessage(raw);
  assert.equal(message.headers.from, "scott@reasinger.net");
  assert.equal(message.headers.date, "Tue, 03 Nov 2026 14:05:09 +0000");
  assert.equal(message.headers["message-id"], "<draft-1@reasinger.net>");
  assert.equal(message.headers["mime-version"], "1.0");
  assert.deepEqual(headerAddresses(message, "To").map((a) => a.address), ["jane@acme.example"]);
  assert.deepEqual(headerAddresses(message, "Cc").map((a) => a.address), ["c@example.invalid", "d@example.invalid"]);
  assert.deepEqual(headerAddresses(message, "Bcc").map((a) => a.address), ["b@example.invalid"]);
});

test("REQ-18-8: every line is CRLF-ended and at most 78 characters, even for a long body", () => {
  const raw = buildDraftMessage({ ...DRAFT, text: "long é ".repeat(200), html: "<p>x</p>" });
  assert.doesNotMatch(raw, /[^\r]\n|\r[^\n]/);
  for (const line of raw.split("\r\n")) assert.ok(line.length <= 78, line);
  assert.equal(bodyText(parseMessage(raw)), "long é ".repeat(200));
});

test("REQ-18-8: body text resembling the boundary or a header cannot break the structure", () => {
  const text = '--=_cpanel-mail-mcp--\nSubject: fake\n\n--=_cpanel-mail-mcp';
  const message = parseMessage(buildDraftMessage({ ...DRAFT, text }));
  assert.equal(message.parts.length, 2);
  assert.equal(bodyText(message), text.replace(/\n/g, "\r\n"));
  assert.equal(headerText(message, "Subject"), "Hello");
});

test("REQ-18-8: quoted-printable matches RFC 2045 on hand-checked lines", () => {
  assert.equal(encodeQuotedPrintable("a=b"), "a=3Db");
  assert.equal(encodeQuotedPrintable("é"), "=C3=A9");
  assert.equal(encodeQuotedPrintable("end "), "end=20");
  assert.equal(encodeQuotedPrintable("tab\t"), "tab=09");
  assert.equal(encodeQuotedPrintable("mid dle"), "mid dle");
  assert.equal(encodeQuotedPrintable("a\nb\r\nc"), "a\r\nb\r\nc");
  assert.equal(encodeQuotedPrintable("x".repeat(76)), "x".repeat(76));
  assert.equal(encodeQuotedPrintable("x".repeat(77)), `${"x".repeat(75)}=\r\nxx`);
});

test("REQ-18-8: a bad Message-ID or address is refused, so nothing malformed is appended", () => {
  assert.throws(() => buildDraftMessage({ ...DRAFT, messageId: "no-brackets" }), { code: "draft" });
  assert.throws(() => buildDraftMessage({ ...DRAFT, inReplyTo: "<a@x>\r\nBcc: y" }), { code: "draft" });
  assert.throws(() => buildDraftMessage({ ...DRAFT, to: ["x\r\nBcc: y@example.invalid"] }), { code: "draft" });
  assert.throws(() => buildDraftMessage({ ...DRAFT, subject: "x\r\nBcc: y" }), { code: "draft" });
});
