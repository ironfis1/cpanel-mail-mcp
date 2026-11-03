// MIME parsing for snippets and thread bodies. The rows for REQ-6-19, REQ-6-20 and REQ-6-32 belong
// to C4, which wires these functions into the tools; these tests cover the parsing underneath.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  bodyText,
  decodePart,
  deliveryStatusSummary,
  headerAddresses,
  headerText,
  htmlToText,
  makeSnippet,
  messageSnippet,
  parseMessage,
  threadBody,
} from "../../src/mime/parse.js";
import { repoFile } from "../helpers/wrangler-config.mjs";

// The BODY[] literal of a recorded full fetch, as bytes.
function recordedMessage(host) {
  const file = new Uint8Array(readFileSync(repoFile(`test/fixtures/imap/${host}/11-fetch-full.imap`)));
  const head = new TextDecoder("latin1").decode(file.subarray(0, 100));
  const match = /\{(\d+)\}\r\n/.exec(head);
  const start = match.index + match[0].length;
  return file.subarray(start, start + Number(match[1]));
}

const REPORT = [
  "From: Mail Delivery System <mailer-daemon@example.invalid>",
  "Subject: Undelivered Mail",
  'Content-Type: multipart/report; report-type=delivery-status; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=us-ascii",
  "",
  "This is the mail system. Delivery failed.",
  "--b1",
  "Content-Type: message/delivery-status",
  "",
  "Reporting-MTA: dns; mx.example.invalid",
  "",
  "Final-Recipient: rfc822; jane@acme.example",
  "Action: failed",
  "Status: 5.1.1",
  "Diagnostic-Code: smtp; 550 5.1.1 user",
  " unknown",
  "--b1",
  "Content-Type: message/rfc822",
  "",
  "From: scott@example.invalid",
  "To: jane@acme.example",
  "Subject: =?UTF-8?Q?Touch_caf=C3=A9?=",
  "Date: Mon, 02 Nov 2026 12:00:00 +0000",
  "X-Other: hidden header",
  "",
  "SECRET ORIGINAL BODY",
  "--b1--",
  "",
].join("\r\n");

for (const host of ["server128", "server223"]) {
  test(`REQ-11-1 REQ-6-19: parses the real multipart message recorded from ${host}`, () => {
    const message = parseMessage(recordedMessage(host));
    assert.equal(headerText(message, "Subject"), "Fixture é subject");
    assert.deepEqual(headerAddresses(message, "To"), [{ name: "Fixture, Recipient", address: "fixture@example.invalid" }]);
    assert.equal(message.type, "multipart/mixed");
    assert.equal(bodyText(message).trim(), "Fixture body é ü 日本語");
    assert.equal(makeSnippet(bodyText(message)), "Fixture body é ü 日本語");
  });

  test(`REQ-6-32: the recorded ${host} message's thread body has text, embedded headers and no embedded body`, () => {
    const body = threadBody(parseMessage(recordedMessage(host)));
    assert.match(body, /^Fixture body é ü 日本語/);
    assert.match(body, /From: inner@example\.invalid/);
    assert.match(body, /Subject: Inner message/);
    assert.doesNotMatch(body, /<p>Fixture/);
    assert.ok(body.length < 1000, "the large attachment is not in the thread body");
  });

  test(`REQ-6-19: a recorded ${host} message cut off mid-part still gives its text`, () => {
    const whole = recordedMessage(host);
    const cut = Buffer.from(whole).indexOf("Fixture body") + "Fixture body".length;
    assert.equal(bodyText(parseMessage(whole.subarray(0, cut))), "Fixture body");
  });
}

test("REQ-6-19: decodes base64 and quoted-printable parts in their charset", () => {
  assert.equal(decodePart("Y2Fmw6k=", { encoding: "BASE64", charset: "utf-8" }), "café");
  assert.equal(decodePart("caf=E9=\r\n au lait", { encoding: "quoted-printable", charset: "iso-8859-1" }), "café au lait");
  assert.equal(decodePart(new Uint8Array([0x93, 0x68, 0x94]), { encoding: "8bit", charset: "windows-1252" }), "“h”");
  assert.equal(decodePart("plain", { charset: "no-such-charset" }), "plain");
});

test("REQ-6-19: a part cut off by a partial fetch decodes what arrived", () => {
  assert.equal(decodePart("Y2Fmw6kgYXUgbGFpdA", { encoding: "base64" }), "café au lait");
  assert.equal(decodePart("Y2Fm\r\nw6kg\r\nY", { encoding: "base64" }), "café ");
  assert.equal(decodePart("abc=C", { encoding: "quoted-printable" }), "abc");
  assert.equal(decodePart("abc=", { encoding: "quoted-printable" }), "abc");
});

test("REQ-6-19: the snippet collapses whitespace and takes the first 200 characters", () => {
  assert.equal(makeSnippet("  a \r\n\r\n b\t c  "), "a b c");
  assert.equal(Array.from(makeSnippet("é".repeat(300))).length, 200);
  assert.equal(Array.from(makeSnippet("🚀".repeat(300))).length, 200);
});

test("REQ-6-19: text/plain wins over HTML, and HTML is stripped when there is no text part", () => {
  const both = 'Content-Type: multipart/alternative; boundary=x\r\n\r\n--x\r\nContent-Type: text/html\r\n\r\n<b>html</b>\r\n--x\r\nContent-Type: text/plain\r\n\r\nplain\r\n--x--\r\n';
  assert.equal(messageSnippet(parseMessage(both)), "plain");
  const html = "Content-Type: text/html; charset=utf-8\r\n\r\n<html><head><style>p{}</style></head><body><p>Caf&eacute;&nbsp;&amp; <b>tea</b>&#33;</p><script>x()</script><!-- c --></body></html>";
  assert.equal(messageSnippet(parseMessage(html)), "Café & tea !");
});

test("REQ-6-19: an attachment is never the message's text", () => {
  const raw = 'Content-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\nContent-Type: text/plain\r\nContent-Disposition: attachment; filename="a.txt"\r\n\r\nattached\r\n--x\r\nContent-Type: text/plain\r\n\r\nreal\r\n--x--\r\n';
  assert.equal(bodyText(parseMessage(raw)), "real");
  assert.equal(threadBody(parseMessage(raw)), "real");
});

test("REQ-6-19: htmlToText turns block ends into line breaks", () => {
  assert.equal(htmlToText("<p>one</p><div>two<br>three</div>").trim(), "one\ntwo\nthree");
  assert.equal(htmlToText("a &#x41; &#65; &bogus;"), "a A A &bogus;");
});

test("REQ-6-20: a multipart/report snippet starts with Final-Recipient and Diagnostic-Code", () => {
  assert.match(messageSnippet(parseMessage(REPORT)), /^Final-Recipient: rfc822; jane@acme\.example Diagnostic-Code: smtp; 550 5\.1\.1 user unknown This is the mail system/);
});

test("REQ-6-20: the delivery-status summary reads folded fields", () => {
  assert.equal(deliveryStatusSummary("Action: failed\r\nFinal-Recipient: rfc822; a@x\r\nDiagnostic-Code: smtp;\r\n 550\r\n"), "Final-Recipient: rfc822; a@x Diagnostic-Code: smtp; 550");
});

test("REQ-6-32: a thread body has delivery-status text and the embedded original's four headers only", () => {
  const body = threadBody(parseMessage(REPORT));
  assert.match(body, /This is the mail system/);
  assert.match(body, /Status: 5\.1\.1/);
  assert.match(body, /From: scott@example\.invalid\nTo: jane@acme\.example\nSubject: Touch café\nDate: Mon, 02 Nov 2026 12:00:00 \+0000/);
  assert.doesNotMatch(body, /SECRET ORIGINAL BODY/);
  assert.doesNotMatch(body, /X-Other/);
});

test("REQ-6-19: edge shapes parse without throwing", () => {
  assert.equal(bodyText(parseMessage("")), "");
  assert.equal(bodyText(parseMessage("Subject: only headers\r\n")), "");
  assert.equal(bodyText(parseMessage("\r\nno headers")), "no headers");
  assert.equal(bodyText(parseMessage("Subject: lf only\n\nlf body\n")), "lf body\n");
  assert.equal(bodyText(parseMessage("Content-Type: multipart/mixed\r\n\r\nno boundary param")), "");
  const open = "Content-Type: multipart/mixed; boundary=x\r\n\r\npreamble\r\n--x\r\nContent-Type: text/plain\r\n\r\nno close";
  assert.equal(bodyText(parseMessage(open)), "no close");
});

test("REQ-6-19: a part with no headers of its own is text/plain", () => {
  assert.equal(bodyText(parseMessage("Content-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\n\r\nbare\r\n--x--\r\n")), "bare");
});

test("REQ-6-19: a deeply nested message stops at a fixed depth instead of overflowing the stack", () => {
  let raw = "Content-Type: text/plain\r\n\r\ndeep";
  for (let i = 0; i < 2000; i++) raw = `Content-Type: message/rfc822\r\n\r\n${raw}`;
  assert.doesNotThrow(() => threadBody(parseMessage(raw)));
});
