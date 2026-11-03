import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findAccount, loadRegistry } from "../../src/accounts.js";
import { buildDraftMessage } from "../../src/mime/build.js";
import { bodyText, decodePart, parseMessage } from "../../src/mime/parse.js";
import { composeDraftBody, signatureHtml, splitStoredDraft, stripTrailingSignature } from "../../src/signatures.js";
import { repoFile, wranglerConfig } from "../helpers/wrangler-config.mjs";

const { env } = wranglerConfig();
const production = loadRegistry(env.production.vars.MAILBOXES);
const staging = loadRegistry(env.staging.vars.MAILBOXES);
const REASINGER = findAccount(production, "scott@reasinger.net");
const SIGNATURE = "Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger";
const QUOTE = { text: "> quoted original", html: "<blockquote>quoted original</blockquote>\n" };

const count = (text, needle) => text.split(needle).length - 1;
const plainFromHtml = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

function buildSigned(account, input) {
  const { text, html } = composeDraftBody(account, input);
  return parseMessage(
    buildDraftMessage({ from: account.id, to: ["jane@acme.example"], subject: "s", date: new Date(0), messageId: "<m@x>", text, html }),
  );
}

test("REQ-10-1: every account's draft gets its configured signature from a signature-free body", () => {
  for (const account of [...production, ...staging]) {
    const { text, html } = composeDraftBody(account, { body: "Hello there." });
    assert.equal(text, `Hello there.\n\n${account.signature}`);
    assert.ok(plainFromHtml(html).endsWith(account.signature), account.id);
  }
});

test("REQ-10-1: an edit that supplies a new body is signed the same way", () => {
  const first = composeDraftBody(REASINGER, { body: "First." });
  const edited = composeDraftBody(REASINGER, { body: "Second." });
  assert.equal(count(first.text, SIGNATURE), 1);
  assert.equal(edited.text, `Second.\n\n${SIGNATURE}`);
});

test("REQ-10-2: the signature is added here, in the message the server builds, with none from the caller", () => {
  const message = buildSigned(REASINGER, { body: "Hello." });
  assert.equal(bodyText(message), `Hello.\r\n\r\n${SIGNATURE}`);
});

test("REQ-10-3: signature texts in config are exactly the spec's", () => {
  const expected = {
    "scott@reasinger.net": SIGNATURE,
    "scott@yourcigardenindy.com": "Scott Reasinger | scott@yourcigardenindy.com | 317-460-0736 | yourcigardenindy.com",
    "founders@yourcigardenindy.com": "Founders | founders@yourcigardenindy.com | yourcigardenindy.com",
  };
  assert.deepEqual(Object.fromEntries(production.map((a) => [a.id, a.signature])), expected);
});

test("REQ-10-4: config is the source of truth: the account entry decides the text, not any input", () => {
  const changed = { ...REASINGER, signature: "Changed | in | config" };
  assert.equal(composeDraftBody(changed, { body: "Hi", signature: "ignored" }).text, "Hi\n\nChanged | in | config");
});

test("REQ-10-4: an account with no configured signature cannot be signed", () => {
  const [unset] = loadRegistry([{ ...env.staging.vars.MAILBOXES[0], signature: "" }]);
  assert.throws(() => composeDraftBody(unset, { body: "Hi" }), { code: "signature_unset" });
});

test("REQ-10-6: a trailing copy is stripped, whitespace-normalized, then one is appended", () => {
  const variants = [
    `Hi\n\n${SIGNATURE}`,
    `Hi\n\n${SIGNATURE}\n\n  \n`,
    `Hi\r\n\r\n${SIGNATURE}\r\n`,
    `Hi\n\nScott   Reasinger |\nscott@reasinger.net |  317-460-0736\t| https://linkedin.com/in/scottreasinger`,
    `Hi ${SIGNATURE}`,
  ];
  for (const body of variants) assert.equal(composeDraftBody(REASINGER, { body }).text, `Hi\n\n${SIGNATURE}`, JSON.stringify(body));
});

test("REQ-10-6: only an exact trailing copy is stripped", () => {
  const near = "Scott Reasinger | scott@reasinger.net | 317-460-0736";
  assert.equal(stripTrailingSignature(`Hi\n\n${near}`, SIGNATURE), `Hi\n\n${near}`);
  const midway = `${SIGNATURE}\n\nMore text`;
  assert.equal(stripTrailingSignature(midway, SIGNATURE), midway);
  const glued = `x${SIGNATURE}`;
  assert.equal(stripTrailingSignature(glued, SIGNATURE), glued);
  assert.equal(stripTrailingSignature("no signature", SIGNATURE), "no signature");
});

test("REQ-10-6: another account's signature in the body is not treated as this account's", () => {
  const other = findAccount(production, "founders@yourcigardenindy.com");
  const body = `Hi\n\n${other.signature}`;
  assert.equal(stripTrailingSignature(body, SIGNATURE), body);
});

test("REQ-14-9: resubmitting a signed body yields exactly one signature", () => {
  let text = composeDraftBody(REASINGER, { body: "Hello." }).text;
  for (let i = 0; i < 3; i++) {
    text = composeDraftBody(REASINGER, { body: text }).text;
    assert.equal(count(text, SIGNATURE), 1);
    assert.equal(text, `Hello.\n\n${SIGNATURE}`);
  }
});

test("REQ-14-9: a body that is only the signature yields exactly the signature", () => {
  assert.equal(composeDraftBody(REASINGER, { body: SIGNATURE }).text, SIGNATURE);
  assert.equal(count(composeDraftBody(REASINGER, { body: SIGNATURE }).html, "linkedin.com/in/scottreasinger</a>"), 1);
});

test("REQ-10-7: an edit with no new body re-derives the body from the stored draft minus its signature", () => {
  const stored = bodyText(buildSigned(REASINGER, { body: "Keep **this** text.\n\nSecond paragraph." }));
  const { body, signed } = splitStoredDraft(stored, SIGNATURE);
  assert.equal(signed, true);
  assert.equal(body, "Keep **this** text.\n\nSecond paragraph.");
  const resigned = composeDraftBody(REASINGER, { body });
  assert.equal(count(resigned.text, SIGNATURE), 1);
  assert.match(resigned.html, /<strong>this<\/strong>/);
});

test("REQ-10-7: the quoted original survives the split, and its own signature copy is not the split point", () => {
  const quote = { text: `> Touch 1\n>\n> ${SIGNATURE}\n\n${SIGNATURE}`, html: "" };
  const { text } = composeDraftBody(REASINGER, { body: "Not sure if you saw this.", quote });
  const split = splitStoredDraft(text, SIGNATURE);
  assert.equal(split.body, "Not sure if you saw this.");
  assert.equal(split.quoted, quote.text);
  assert.equal(composeDraftBody(REASINGER, { body: split.body, quote: { text: split.quoted, html: "" } }).text, text);
});

test("REQ-10-7: a stored draft with no signature line reports that instead of guessing", () => {
  assert.deepEqual(splitStoredDraft("Edited in Spark\r\n", SIGNATURE), { body: "Edited in Spark", quoted: "", signed: false });
});

test("REQ-10-8: in a reply or forward the signature is under the new text, above the quote, in both parts", () => {
  const { text, html } = composeDraftBody(REASINGER, { body: "New text.", quote: QUOTE });
  assert.equal(text, `New text.\n\n${SIGNATURE}\n\n> quoted original`);
  assert.ok(html.indexOf("New text.") < html.indexOf("Scott Reasinger"));
  assert.ok(html.indexOf("Scott Reasinger") < html.indexOf("<blockquote>"));
});

test("REQ-10-8: a signature copy at the end of the new text does not double above the quote", () => {
  const { text } = composeDraftBody(REASINGER, { body: `New text.\n\n${SIGNATURE}`, quote: QUOTE });
  assert.equal(text, `New text.\n\n${SIGNATURE}\n\n> quoted original`);
});

test("REQ-10-9: the signature bypasses markdown in the text part and is the exact string", () => {
  const signature = "**Not bold** | _not em_ | a < b & c";
  const { text, html } = composeDraftBody({ ...REASINGER, signature }, { body: "**Bold** body" });
  assert.equal(text, `**Bold** body\n\n${signature}`);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.doesNotMatch(html, /<strong>Not bold|<em>not em/);
  assert.match(html, /<div>\*\*Not bold\*\* \| _not em_ \| a &lt; b &amp; c<\/div>/);
});

test("REQ-10-9: the HTML signature is its own block, with the URL a link whose visible text is identical", () => {
  assert.equal(
    signatureHtml(SIGNATURE),
    '<div>Scott Reasinger | scott@reasinger.net | 317-460-0736 | <a href="https://linkedin.com/in/scottreasinger">https://linkedin.com/in/scottreasinger</a></div>\n',
  );
  for (const account of [...production, ...staging]) {
    assert.equal(plainFromHtml(signatureHtml(account.signature)), account.signature, account.id);
  }
});

test("REQ-10-9: a URL in a signature is escaped in both the link target and its text", () => {
  const html = signatureHtml('x | https://e.invalid/?a=1&b="2"');
  assert.equal(html, '<div>x | <a href="https://e.invalid/?a=1&amp;b=&quot;2&quot;">https://e.invalid/?a=1&amp;b=&quot;2&quot;</a></div>\n');
});

test("REQ-10-9: a signature with no URL has no link", () => {
  const founders = findAccount(production, "founders@yourcigardenindy.com");
  assert.doesNotMatch(signatureHtml(founders.signature), /<a /);
});

test("REQ-10-9: through the whole message, both parts hold the signature intact", () => {
  const message = buildSigned(REASINGER, { body: "Hi" });
  assert.ok(bodyText(message).includes(SIGNATURE));
  const [, htmlPart] = message.parts;
  const html = decodePart(htmlPart.body, { encoding: htmlPart.encoding, charset: htmlPart.params.charset });
  assert.ok(plainFromHtml(html).endsWith(SIGNATURE));
});

test("REQ-10-10: the caller's body carries no signature and the stored draft carries the server's", () => {
  const input = "Plain note.";
  const composed = composeDraftBody(REASINGER, { body: input });
  assert.equal(input.includes(SIGNATURE), false);
  assert.equal(composed.body, input);
  assert.equal(count(bodyText(buildSigned(REASINGER, { body: input })), SIGNATURE), 1);
});

test("REQ-10-11: the registry refuses a signature containing sreasinger@gmail.com", () => {
  for (const signature of ["Scott | sreasinger@gmail.com", "x SREASINGER@GMAIL.COM y"]) {
    assert.throws(() => loadRegistry([{ ...env.staging.vars.MAILBOXES[0], signature }]), { code: "config", message: /sreasinger@gmail\.com/ });
  }
});

test("REQ-14-10: the scott@reasinger.net config string equals the gatekeeper check-file signature line", () => {
  // docs/extraction/source-pack.md is the recorded copy of the gatekeeper-panel skill; the live
  // skill is Scott's in claude.ai and is outside this repo.
  const pack = readFileSync(repoFile("docs/extraction/source-pack.md"), "utf8");
  const line = pack.split(/\r?\n/).find((l) => l.startsWith("L48: Save the draft (message text plus signature"));
  assert.ok(line, "gatekeeper-panel L48 is in the source pack");
  const [, checkFile] = /`(Scott Reasinger \|[^`]+)` for scott@reasinger\.net/.exec(line);
  assert.equal(REASINGER.signature, checkFile);
});

test("REQ-14-11: no configured signature contains sreasinger@gmail.com, in any environment", () => {
  for (const environment of Object.values(env)) {
    for (const { id, signature } of environment.vars.MAILBOXES) {
      assert.doesNotMatch(signature, /sreasinger@gmail\.com/i, id);
    }
  }
});
