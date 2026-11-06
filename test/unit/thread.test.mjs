import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeMessageId } from "../../src/message-id.js";
import { normalizeSubject } from "../../src/mime/headers.js";
import { ACCOUNT_A, ACCOUNT_B, REGISTRY, callTool, fakeMailboxes, mail, report } from "../helpers/fake-mailbox.mjs";

const SENDER = "Jane <jane@acme.test>";
const october = (day) => `Mon, ${String(day).padStart(2, "0")} Oct 2026 12:00:00 +0000`;
const idFor = (folder, uid, messageId = null, account = ACCOUNT_A) =>
  encodeMessageId({ account, folder, uidValidity: "1730000000", uid, messageId });
const thread = (fake, id) => callTool(fake, "thread", { message_id: id }, { registry: [REGISTRY[0], REGISTRY[1]] });
const subjects = (result) => result.messages.map((m) => m.subject);

const root = mail({ from: "me@one.test", to: SENDER, subject: "Intro", date: october(1), messageId: "<root@x.test>", body: "Root text" });
const reply = mail({ from: SENDER, subject: "Re: Intro", date: october(2), messageId: "<reply@x.test>", inReplyTo: "<root@x.test>", references: "<root@x.test>", body: "Reply text" });
const later = mail({ from: "me@one.test", to: SENDER, subject: "Re: Intro", date: october(3), messageId: "<later@x.test>", inReplyTo: "<reply@x.test>", references: "<root@x.test> <reply@x.test>", body: "Later text" });
const unrelated = mail({ from: SENDER, subject: "Something else", date: october(4), messageId: "<other@x.test>", body: "Other text" });

const spread = () =>
  fakeMailboxes({
    [ACCOUNT_A]: { INBOX: [reply, unrelated], "INBOX.Sent": [root], "INBOX.Archive": [later] },
    [ACCOUNT_B]: { INBOX: [mail({ from: SENDER, subject: "Re: Intro", date: october(2), messageId: "<wrong-account@x.test>", references: "<root@x.test>" })] },
  });

test("REQ-6-27: thread returns the message and its thread, with bodies as text", async () => {
  const result = await thread(spread(), idFor("INBOX", 1, "<reply@x.test>"));
  assert.equal(result.isError, false);
  assert.deepEqual(result.messages.map((m) => m.body), ["Root text", "Reply text", "Later text"]);
  assert.deepEqual(result.accounts_reached, [ACCOUNT_A]);
  assert.equal(result.message_id, idFor("INBOX", 1, "<reply@x.test>"));
});

test("REQ-6-2: every thread message names its account and has the usual message fields", async () => {
  const result = await thread(spread(), idFor("INBOX", 1, "<reply@x.test>"));
  for (const message of result.messages) {
    assert.equal(message.account, ACCOUNT_A);
    assert.deepEqual(Object.keys(message).sort(), ["account", "body", "date", "flags", "from", "id", "subject", "to"]);
  }
});

test("REQ-6-28: reconstruction spans Inbox, Sent and Archive of the same account, and no other account", async () => {
  const fake = spread();
  const result = await thread(fake, idFor("INBOX", 1, "<reply@x.test>"));
  assert.deepEqual(result.messages.map((m) => m.subject), ["Intro", "Re: Intro", "Re: Intro"]);
  for (const path of ["INBOX", "INBOX.Sent", "INBOX.Archive"]) assert.ok(fake.commands.includes(`SELECT "${path}"`), path);
  assert.ok(!fake.commands.includes('SELECT "INBOX.Trash"'));
  assert.equal(fake.connections.length, 1, "only the ID's account");
  const ids = result.messages.map((m) => m.id);
  assert.ok(!ids.includes(idFor("INBOX", 1, "<wrong-account@x.test>", ACCOUNT_B)));
});

test("REQ-6-28: a message outside the three folders is still returned with the thread", async () => {
  const draft = mail({ from: "me@one.test", to: SENDER, subject: "Re: Intro", date: october(5), messageId: "<draft@x.test>", references: "<root@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [reply], "INBOX.Drafts": [draft], "INBOX.Sent": [root] } });
  const result = await thread(fake, idFor("INBOX.Drafts", 1, "<draft@x.test>"));
  assert.equal(result.messages.length, 3);
});

test("REQ-6-29: a message joins through References, however deep the requested message sits", async () => {
  // Asking from each end of the chain finds the same three messages.
  for (const start of [idFor("INBOX.Sent", 1, "<root@x.test>"), idFor("INBOX.Archive", 1, "<later@x.test>")]) {
    assert.deepEqual(subjects(await thread(spread(), start)), ["Intro", "Re: Intro", "Re: Intro"]);
  }
});

test("REQ-6-29: a message with only In-Reply-To joins, and the link carries on through it", async () => {
  const middle = mail({ from: SENDER, subject: "Re: Intro", date: october(2), messageId: "<mid@x.test>", inReplyTo: "<root@x.test>" });
  const tail = mail({ from: "me@one.test", to: SENDER, subject: "Re: Intro", date: october(3), messageId: "<tail@x.test>", inReplyTo: "<mid@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [middle], "INBOX.Sent": [root, tail] } });
  const result = await thread(fake, idFor("INBOX.Sent", 1, "<root@x.test>"));
  assert.deepEqual(result.messages.map((m) => m.date.slice(8, 10)), ["01", "02", "03"]);
});

test("REQ-6-29: a substring of a Message-ID does not link", async () => {
  const near = mail({ from: SENDER, subject: "Different", date: october(2), messageId: "<near@x.test>", references: "<xroot@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [near], "INBOX.Sent": [root] } });
  assert.deepEqual(subjects(await thread(fake, idFor("INBOX.Sent", 1, "<root@x.test>"))), ["Intro"]);
});

test("REQ-6-30: a message with no header link joins on the same normalized subject and a shared participant", async () => {
  const noLinks = mail({ from: SENDER, subject: "RE: fwd: FW: Intro", date: october(9), messageId: "<nolink@x.test>", body: "No headers" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [noLinks], "INBOX.Sent": [root] } });
  const result = await thread(fake, idFor("INBOX.Sent", 1, "<root@x.test>"));
  assert.deepEqual(result.messages.map((m) => m.body), ["Root text", "No headers"]);
});

test("REQ-6-30: subject normalization strips Re:, Fwd: and Fw: repeatedly, in any case", () => {
  assert.equal(normalizeSubject("Re: FWD: fw: re:  Hello"), "Hello");
  assert.equal(normalizeSubject("Hello: re: there"), "Hello: re: there");
  assert.equal(normalizeSubject("Re:"), "");
});

test("REQ-6-30: a message with a header link never joins on subject alone", async () => {
  const elsewhere = mail({ from: SENDER, subject: "Re: Intro", date: october(2), messageId: "<elsewhere@x.test>", references: "<some-other-thread@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [elsewhere], "INBOX.Sent": [root] } });
  assert.deepEqual(subjects(await thread(fake, idFor("INBOX.Sent", 1, "<root@x.test>"))), ["Intro"]);
});

test("REQ-6-30: no shared participant keeps a same-subject message out, and the account's own address does not count", async () => {
  const stranger = mail({ from: "other@else.test", to: "me@one.test, a@one.test", subject: "Intro", date: october(2), messageId: "<stranger@x.test>" });
  const mine = mail({ from: "a@one.test", to: SENDER, subject: "Intro", date: october(1), messageId: "<mine@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [stranger], "INBOX.Sent": [mine] } });
  assert.deepEqual(subjects(await thread(fake, idFor("INBOX.Sent", 1, "<mine@x.test>"))), ["Intro"]);
});

test("REQ-6-30: the fallback stops at 60 days", async () => {
  const dayMs = 86_400_000;
  const at = (days) => new Date(Date.parse("2026-01-01T12:00:00Z") + days * dayMs).toUTCString();
  const first = mail({ from: SENDER, subject: "Hello", date: at(0), messageId: "<first@x.test>" });
  const inside = mail({ from: SENDER, subject: "Hello", date: at(60), messageId: "<inside@x.test>", body: "day 60" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [first, inside] } });
  assert.equal((await thread(fake, idFor("INBOX", 1, "<first@x.test>"))).messages.length, 2);
  const outside = mail({ from: SENDER, subject: "Hello", date: at(61), messageId: "<outside@x.test>" });
  const far = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [first, outside] } });
  assert.equal((await thread(far, idFor("INBOX", 1, "<first@x.test>"))).messages.length, 1);
});

test("REQ-6-30: an empty subject never joins by subject", async () => {
  const blankA = mail({ from: SENDER, subject: "", date: october(1), messageId: "<blank-a@x.test>" });
  const blankB = mail({ from: SENDER, subject: "Re:", date: october(2), messageId: "<blank-b@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [blankA, blankB] } });
  assert.equal((await thread(fake, idFor("INBOX", 1, "<blank-a@x.test>"))).messages.length, 1);
});

test("REQ-6-31 REQ-18-9: thread messages are ordered by date, oldest first, whatever folder they sit in", async () => {
  const result = await thread(spread(), idFor("INBOX.Archive", 1, "<later@x.test>"));
  const dates = result.messages.map((m) => m.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(result.messages[0].body, "Root text");
});

const bounceHeaders = ['Content-Type: multipart/report; report-type=delivery-status; boundary="rpt"'];
const bounceBody = report([
  "Content-Type: text/plain; charset=utf-8\r\n\r\nThe mail system could not deliver.",
  "Content-Type: message/delivery-status\r\n\r\nFinal-Recipient: rfc822; gone@example.test\r\nDiagnostic-Code: smtp; 550 no such user",
  "Content-Type: message/rfc822\r\n\r\nFrom: me@one.test\r\nTo: gone@example.test\r\nSubject: Original subject\r\nDate: Sun, 01 Nov 2026 12:00:00 +0000\r\nX-Other: hidden\r\n\r\nORIGINAL BODY",
]);

test("REQ-6-32: bodies include delivery-status text and the embedded original's four headers, not its body", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [mail({ from: "MAILER-DAEMON@one.test", subject: "Undelivered", messageId: "<bounce@x.test>", headers: bounceHeaders, body: bounceBody })] } });
  const [message] = (await thread(fake, idFor("INBOX", 1, "<bounce@x.test>"))).messages;
  assert.match(message.body, /The mail system could not deliver\./);
  assert.match(message.body, /Final-Recipient: rfc822; gone@example\.test/);
  assert.match(message.body, /Diagnostic-Code: smtp; 550 no such user/);
  assert.match(message.body, /From: me@one\.test/);
  assert.match(message.body, /To: gone@example\.test/);
  assert.match(message.body, /Subject: Original subject/);
  assert.match(message.body, /Date: Sun, 01 Nov 2026/);
  assert.doesNotMatch(message.body, /ORIGINAL BODY/);
  assert.doesNotMatch(message.body, /X-Other/);
});

test("REQ-6-27: attachments are neither downloaded nor included in a thread body", async () => {
  const body = report(
    [
      "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nCaf=C3=A9 text",
      'Content-Type: application/pdf\r\nContent-Disposition: attachment; filename="a.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nQUJD',
      'Content-Type: text/plain\r\nContent-Disposition: attachment; filename="notes.txt"\r\n\r\nATTACHED NOTES',
    ],
    "mix",
  );
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [mail({ messageId: "<att@x.test>", headers: ['Content-Type: multipart/mixed; boundary="mix"'], body })] } });
  const [message] = (await thread(fake, idFor("INBOX", 1, "<att@x.test>"))).messages;
  assert.equal(message.body, "Café text");
  assert.ok(!fake.commands.some((c) => /BODY\.PEEK\[(2|3)\]/.test(c)));
});

test("REQ-6-27: a multipart/alternative body gives its text once", async () => {
  const body = report(["Content-Type: text/plain\r\n\r\nPlain version", "Content-Type: text/html\r\n\r\n<p>HTML version</p>"], "alt");
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [mail({ messageId: "<alt@x.test>", headers: ['Content-Type: multipart/alternative; boundary="alt"'], body })] } });
  assert.equal((await thread(fake, idFor("INBOX", 1, "<alt@x.test>"))).messages[0].body, "Plain version");
});

test("REQ-12-11: a not-found ID is an explicit error from thread", async () => {
  const fake = spread();
  const result = await thread(fake, idFor("INBOX", 99, "<gone@x.test>"));
  assert.equal(result.isError, true);
  assert.equal(result.errors[0].code, "id_not_found");
  assert.deepEqual(result.accounts_reached, [ACCOUNT_A]);
  assert.deepEqual(result.messages, []);
});

test("REQ-12-11: an ambiguous ID is an explicit error from thread", async () => {
  const copy = mail({ messageId: "<twin@x.test>" });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [copy, copy] } });
  const result = await thread(fake, idFor("INBOX", 99, "<twin@x.test>"));
  assert.equal(result.errors[0].code, "id_ambiguous");
});

test("REQ-12-11: a missing Archive is an explicit error from thread", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: { list: [["INBOX", ""], ["INBOX.Sent", "\\Sent"]], INBOX: [mail({ messageId: "<a@x.test>" })] } });
  const result = await thread(fake, idFor("INBOX", 1, "<a@x.test>"));
  assert.equal(result.isError, true);
  assert.equal(result.errors[0].code, "folder");
  assert.match(result.errors[0].message, /Archive/);
});

test("REQ-12-11 REQ-2-19: a malformed ID is refused, and a hand-built ID for an unserved account never reaches IMAP", async () => {
  const fake = spread();
  assert.equal((await thread(fake, "not-an-id")).errors[0].code, "id_invalid");
  const foreign = idFor("INBOX", 1, null, "sreasinger@gmail.com");
  assert.equal((await thread(fake, foreign)).errors[0].code, "id_invalid");
  assert.equal(fake.connections.length, 0);
});

test("REQ-12-2: thread on an unreachable account fails with that account named", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: {} }, { badHosts: ["one.test"] });
  const result = await thread(fake, idFor("INBOX", 1, "<a@x.test>"));
  assert.equal(result.isError, true);
  assert.deepEqual(result.accounts_not_reached.map((a) => a.account), [ACCOUNT_A]);
});
