import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  decodeHeader,
  encodeSubject,
  formatAddress,
  forwardSubject,
  parseAddressList,
  replySubject,
  threadingHeaders,
} from "../../src/mime/headers.js";
import { parseMessage, headerText } from "../../src/mime/parse.js";
import { repoFile } from "../helpers/wrangler-config.mjs";

const recordedSubject = (host) => {
  const text = readFileSync(repoFile(`test/fixtures/imap/${host}/08-fetch-headers.imap`), "latin1");
  return /^Subject: (.*?)\r?$/m.exec(text)[1];
};

for (const host of ["server128", "server223"]) {
  test(`REQ-11-1: decodes the real encoded subject recorded from ${host}`, () => {
    const raw = recordedSubject(host);
    assert.match(raw, /^=\?UTF-8\?B\?/);
    assert.equal(decodeHeader(raw), "Fixture é subject");
  });
}

test("REQ-11-1: decodes base64 and Q encoded words in any case", () => {
  assert.equal(decodeHeader("=?utf-8?b?Y2Fmw6k=?="), "café");
  assert.equal(decodeHeader("=?UTF-8?Q?caf=C3=A9_au_lait?="), "café au lait");
  assert.equal(decodeHeader("=?iso-8859-1?q?caf=E9?="), "café");
  assert.equal(decodeHeader("=?windows-1252?Q?=93hi=94?="), "“hi”");
});

test("REQ-11-1: drops white space between adjacent encoded words only", () => {
  assert.equal(decodeHeader("=?UTF-8?Q?a?= =?UTF-8?Q?b?="), "ab");
  assert.equal(decodeHeader("=?UTF-8?Q?a?=\r\n =?UTF-8?Q?b?="), "ab");
  assert.equal(decodeHeader("Hi =?UTF-8?Q?a?= there =?UTF-8?Q?b?="), "Hi a there b");
});

test("REQ-11-1: a multibyte character split across two encoded words decodes whole", () => {
  assert.equal(decodeHeader("=?UTF-8?Q?caf=C3?= =?UTF-8?Q?=A9?="), "café");
});

test("REQ-11-1: an undecodable encoded word stays literal instead of failing the call", () => {
  assert.equal(decodeHeader("=?no-such-charset?Q?abc?= tail"), "=?no-such-charset?Q?abc?= tail");
  assert.equal(decodeHeader("=?UTF-8?B?a?="), "=?UTF-8?B?a?=");
  assert.equal(decodeHeader(undefined), "");
});

test("REQ-11-1: an encoded line break cannot survive decoding", () => {
  const encoded = `=?UTF-8?B?${btoa("Hi\r\nBcc: evil@example.invalid")}?=`;
  assert.equal(decodeHeader(encoded), "Hi Bcc: evil@example.invalid");
});

test("REQ-11-1: address display names decode, and an encoded comma does not split the entry", () => {
  const raw = `=?UTF-8?B?${btoa("Müller, Jo".replace("ü", "\xc3\xbc"))}?= <jo@example.invalid>, "Plain, Name" <p@example.invalid>, bare@example.invalid`;
  assert.deepEqual(parseAddressList(raw), [
    { name: "Müller, Jo", address: "jo@example.invalid" },
    { name: "Plain, Name", address: "p@example.invalid" },
    { name: "", address: "bare@example.invalid" },
  ]);
});

test("REQ-11-1: address lists handle comments, groups and folding", () => {
  assert.deepEqual(parseAddressList("a@example.invalid (Comment Name)"), [{ name: "Comment Name", address: "a@example.invalid" }]);
  assert.deepEqual(parseAddressList("undisclosed-recipients:;"), []);
  assert.deepEqual(parseAddressList("team: a@example.invalid, b@example.invalid;"), [
    { name: "", address: "a@example.invalid" },
    { name: "", address: "b@example.invalid" },
  ]);
  assert.deepEqual(parseAddressList('"Q \\" N" <q@example.invalid>,\r\n r@example.invalid').map((a) => a.address), [
    "q@example.invalid",
    "r@example.invalid",
  ]);
});

test("REQ-11-2: Re: is built from the decoded subject and added only when absent", () => {
  assert.equal(replySubject(decodeHeader("=?UTF-8?Q?caf=C3=A9?=")), "Re: café");
  assert.equal(replySubject(decodeHeader("=?UTF-8?Q?Re=3A_caf=C3=A9?=")), "Re: café");
  assert.equal(replySubject("RE: loud"), "RE: loud");
  assert.equal(replySubject("re: quiet"), "re: quiet");
  assert.equal(replySubject("Regarding this"), "Re: Regarding this");
});

test("REQ-11-2: Fwd: is built from the decoded subject", () => {
  assert.equal(forwardSubject(decodeHeader("=?UTF-8?Q?caf=C3=A9?=")), "Fwd: café");
});

test("REQ-11-3 REQ-14-15: a non-ASCII subject is re-encoded on write and decodes back unchanged", () => {
  const subject = "Re: Fixture é subject 日本語";
  const encoded = encodeSubject(subject);
  assert.match(encoded, /^[\x20-\x7e\r\n]+$/);
  assert.match(encoded, /^=\?UTF-8\?B\?/);
  assert.equal(decodeHeader(encoded), subject);
});

test("REQ-11-3 REQ-14-15: a long non-ASCII subject folds, keeps encoded words legal and round-trips", () => {
  const subject = "日本語の件名 ".repeat(20).trim() + " 🚀";
  const encoded = encodeSubject(subject);
  const lines = encoded.split("\r\n");
  assert.ok(lines.length > 1);
  lines.forEach((line, i) => {
    assert.ok(line.trim().length <= 75, line);
    assert.ok((i === 0 ? "Subject: ".length : 0) + line.length <= 76, line);
    if (i > 0) assert.equal(line[0], " ");
  });
  assert.equal(decodeHeader(encoded), subject);
});

test("REQ-11-3: an ASCII subject stays readable, and folds when long", () => {
  assert.equal(encodeSubject("Plain subject"), "Plain subject");
  const long = "word ".repeat(40).trim();
  const encoded = encodeSubject(long);
  assert.ok(encoded.split("\r\n").every((line) => line.length <= 76));
  assert.equal(decodeHeader(encoded), long);
});

test("REQ-11-3: an ASCII subject that looks like an encoded word round-trips literally", () => {
  const subject = "About =?UTF-8?Q?x?= syntax";
  assert.equal(decodeHeader(encodeSubject(subject)), subject);
});

test("REQ-11-3: a line break in a subject on write is an error, so it cannot inject a header", () => {
  assert.throws(() => encodeSubject("Hi\r\nBcc: evil@example.invalid"), { code: "draft" });
});

test("REQ-11-3: address formatting encodes non-ASCII names, quotes specials and refuses bad input", () => {
  assert.equal(formatAddress("a@example.invalid"), "a@example.invalid");
  assert.equal(formatAddress({ name: "Jo Bloggs", address: "a@example.invalid" }), "Jo Bloggs <a@example.invalid>");
  assert.equal(formatAddress({ name: "Bloggs, Jo", address: "a@example.invalid" }), '"Bloggs, Jo" <a@example.invalid>');
  const encoded = formatAddress({ name: "Müller", address: "a@example.invalid" });
  assert.match(encoded, /^=\?UTF-8\?B\?[^ ]+\?= <a@example\.invalid>$/);
  assert.deepEqual(parseAddressList(encoded), [{ name: "Müller", address: "a@example.invalid" }]);
  assert.deepEqual(parseAddressList(formatAddress('Jo "J" B <a@example.invalid>')), [{ name: "Jo J B", address: "a@example.invalid" }]);
  for (const bad of ["not an address", "a@example.invalid, b@example.invalid", { address: "a b@example.invalid" }, { address: "é@example.invalid" }]) {
    assert.throws(() => formatAddress(bad), { code: "draft" });
  }
  assert.throws(() => formatAddress({ name: "x\r\nBcc: y", address: "a@example.invalid" }), { code: "draft" });
});

test("REQ-11-4: a draft's In-Reply-To is the original's Message-ID and References extends its chain", () => {
  assert.deepEqual(
    threadingHeaders({ messageId: "<c@x>", references: "<a@x>\r\n\t<b@x>", inReplyTo: "<b@x>" }),
    { inReplyTo: "<c@x>", references: ["<a@x>", "<b@x>", "<c@x>"] },
  );
});

test("REQ-11-4: with no References the chain starts from the original's In-Reply-To", () => {
  assert.deepEqual(threadingHeaders({ messageId: "<c@x>", inReplyTo: "<b@x>" }), { inReplyTo: "<c@x>", references: ["<b@x>", "<c@x>"] });
  assert.deepEqual(threadingHeaders({ messageId: "<c@x>" }), { inReplyTo: "<c@x>", references: ["<c@x>"] });
});

test("REQ-11-4: threading reads the recorded fixture's folded References", () => {
  const raw = readFileSync(repoFile("test/fixtures/imap/server128/08-fetch-headers.imap"), "latin1");
  const block = raw.slice(raw.indexOf("\n") + 1);
  const message = parseMessage(block);
  assert.equal(headerText(message, "Subject"), "Fixture é subject");
  assert.deepEqual(threadingHeaders({ messageId: message.headers["message-id"], references: message.headers.references }).references, [
    "<root@example.invalid>",
    "<fold@example.invalid>",
    "<fixture-1@cpanel-mail-mcp.invalid>",
  ]);
});

test("REQ-11-4: an original with no Message-ID gives no In-Reply-To", () => {
  assert.deepEqual(threadingHeaders({}), { inReplyTo: null, references: [] });
});
