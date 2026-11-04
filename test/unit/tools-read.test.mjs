import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRegistry } from "../../src/accounts.js";
import { ServerError } from "../../src/errors.js";
import { accountForId, decodeMessageId, encodeMessageId } from "../../src/message-id.js";
import { ACCOUNT_A, ACCOUNT_B, ACCOUNT_C, REGISTRY, callTool, fakeMailboxes, mail, report } from "../helpers/fake-mailbox.mjs";

const dated = (day, extra = {}) =>
  mail({ date: `Mon, ${String(day).padStart(2, "0")} Oct 2026 12:00:00 +0000`, subject: `Day ${day}`, ...extra });
const inbox = (...messages) => ({ [ACCOUNT_A]: { INBOX: messages } });
const emails = (fake, args) => callTool(fake, "emails", { folder: `${ACCOUNT_A}:Inbox`, ...args });
const threeAccounts = (a, b, c) => ({
  [ACCOUNT_A]: { INBOX: a },
  [ACCOUNT_B]: { INBOX: b },
  [ACCOUNT_C]: { INBOX: c },
});

// accounts

test("REQ-6-4: accounts lists the configured accounts from static config and logs in to nothing", async () => {
  const fake = fakeMailboxes({});
  const result = await callTool(fake, "accounts");
  assert.deepEqual(result.accounts, REGISTRY.map(({ id, host }) => ({ id, host })));
  assert.equal(fake.connections.length, 0);
  assert.equal(result.isError, false);
});

test("REQ-6-4 REQ-6-1: accounts states it reached nothing, because it contacted nothing", async () => {
  const result = await callTool(fakeMailboxes({}), "accounts");
  assert.deepEqual(result.accounts_reached, []);
  assert.deepEqual(result.accounts_not_reached, []);
});

test("REQ-2-14: accounts returns no password, secret name or signature", async () => {
  const { text } = await callTool(fakeMailboxes({}), "accounts", {}, { env: { IMAP_PASS_TEST: "super-secret-value" } });
  assert.ok(!text.includes("super-secret-value"));
  assert.ok(!text.includes("IMAP_PASS_TEST"));
});

test("REQ-1-10: the registry refuses Gmail, and folder addresses, search and IDs refuse sreasinger@gmail.com", async () => {
  assert.throws(() => loadRegistry([{ ...REGISTRY[0], id: "sreasinger@gmail.com" }]), /Gmail is not a configured account/);
  const fake = fakeMailboxes({});
  const gmail = "sreasinger@gmail.com";
  const id = encodeMessageId({ account: gmail, folder: "INBOX", uidValidity: 1, uid: 1, messageId: null });
  for (const [tool, args] of [
    ["emails", { folder: `${gmail}:Inbox` }],
    ["search", { query: "x", in: gmail }],
    ["search", { query: "x", in: `${gmail}:Inbox` }],
    ["thread", { message_id: id }],
  ]) {
    const result = await callTool(fake, tool, args);
    assert.equal(result.isError, true, tool);
  }
  assert.equal(fake.connections.length, 0);
});

// availability

test("REQ-6-5 REQ-6-6 REQ-6-7: availability checks every account through SELECT INBOX, grouped by host", async () => {
  const fake = fakeMailboxes(threeAccounts([], [], []));
  const result = await callTool(fake, "availability");
  assert.deepEqual(result.hosts.map((group) => group.host), ["one.test", "two.test"]);
  assert.deepEqual(result.hosts[1].accounts.map((a) => a.account), [ACCOUNT_B, ACCOUNT_C]);
  for (const entry of result.hosts.flatMap((group) => group.accounts)) {
    assert.equal(entry.reached, true);
    assert.deepEqual(entry.checks, { tcp_tls: "ok", login: "ok", select_inbox: "ok" });
    assert.equal(entry.failed_step, null);
  }
  assert.equal(fake.commands.filter((c) => c === 'SELECT "INBOX"').length, 3);
  assert.equal(fake.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 3);
  assert.deepEqual(result.accounts_reached.sort(), [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C].sort());
});

test("REQ-6-8 REQ-12-1: as a preflight, availability names the unreached accounts and answers for the rest", async () => {
  const fake = fakeMailboxes(threeAccounts([], [], []), { badHosts: ["two.test"] });
  const result = await callTool(fake, "availability");
  assert.equal(result.isError, false, "a failed check is the answer, not a tool error");
  assert.deepEqual(result.accounts_reached, [ACCOUNT_A]);
  assert.deepEqual(result.accounts_not_reached.map((a) => [a.account, a.host]), [
    [ACCOUNT_B, "two.test"],
    [ACCOUNT_C, "two.test"],
  ]);
  const [bad] = result.hosts[1].accounts;
  assert.equal(bad.reached, false);
  assert.deepEqual(bad.checks, { tcp_tls: "failed", login: "not_run", select_inbox: "not_run" });
  assert.equal(bad.failed_step, "tcp_tls");
});

test("REQ-6-7 REQ-19-2: availability says which step failed for a bad login and for a failed SELECT", async () => {
  const fake = fakeMailboxes(threeAccounts([], [], []), {
    refuse: { [ACCOUNT_A]: "NO [AUTHENTICATIONFAILED] nope", [ACCOUNT_B]: "NO [UNAVAILABLE] busy" },
    refuseSelect: ["INBOX"],
  });
  const result = await callTool(fake, "availability");
  const byAccount = Object.fromEntries(result.hosts.flatMap((group) => group.accounts).map((a) => [a.account, a]));
  assert.deepEqual(byAccount[ACCOUNT_A].checks, { tcp_tls: "ok", login: "failed", select_inbox: "not_run" });
  assert.equal(byAccount[ACCOUNT_A].code, "auth");
  assert.match(byAccount[ACCOUNT_A].error, /check the IMAP_PASS_TEST secret/);
  assert.equal(byAccount[ACCOUNT_B].code, "connection");
  assert.match(byAccount[ACCOUNT_B].error, /UNAVAILABLE/);
  assert.doesNotMatch(byAccount[ACCOUNT_B].error, /secret/);
  assert.deepEqual(byAccount[ACCOUNT_C].checks, { tcp_tls: "ok", login: "ok", select_inbox: "failed" });
});

test("REQ-6-5: emails makes no availability check of its own: it never touches another account", async () => {
  const fake = fakeMailboxes(threeAccounts([dated(1)], [], []));
  await emails(fake, {});
  assert.equal(fake.connections.length, 1);
});

// folders

test("REQ-6-9: folders lists each account's folders with the logical-name mapping", async () => {
  const result = await callTool(fakeMailboxes(threeAccounts([], [], [])), "folders");
  assert.deepEqual(result.accounts.map((a) => a.account).sort(), [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C].sort());
  const [first] = result.accounts;
  assert.deepEqual(first.mapping, {
    Inbox: "INBOX",
    Sent: "INBOX.Sent",
    Drafts: "INBOX.Drafts",
    Archive: "INBOX.Archive",
    Trash: "INBOX.Trash",
    Junk: "INBOX.spam",
  });
  assert.equal(first.folders.find((f) => f.path === "INBOX.spam").logical_name, "Junk");
  assert.equal(first.folders.find((f) => f.path === "INBOX.Junk").logical_name, null);
});

test("REQ-12-11: folders reports a missing Archive and an ambiguous name as errors on that name", async () => {
  const list = [
    ["INBOX", ""],
    ["INBOX.Sent", ""],
    ["Other.Sent", ""],
  ];
  const fake = fakeMailboxes({ [ACCOUNT_A]: { list } });
  const result = await callTool(fake, "folders", {}, { registry: [REGISTRY[0]] });
  const [account] = result.accounts;
  assert.equal(account.mapping.Archive, null);
  assert.match(account.mapping_errors.Archive, /no folder found for Archive; it is not created/);
  assert.match(account.mapping_errors.Sent, /several folders match Sent by name/);
  assert.equal(account.mapping.Inbox, "INBOX");
});

// emails

test("REQ-6-10: emails lists a logical folder and accepts folder, filter, page_size, page and order together", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: { "INBOX.Sent": [dated(1, { subject: "keep" }), dated(2, { subject: "keep" }), dated(3)] } });
  const result = await callTool(fake, "emails", {
    folder: `${ACCOUNT_A}:Sent`,
    filter: "subject:keep",
    page_size: 1,
    page: 1,
    order: "asc",
  });
  assert.deepEqual(result.messages.map((m) => m.date), ["2026-10-01T12:00:00.000Z"]);
  assert.equal(result.has_more, true);
  assert.ok(fake.commands.includes('SELECT "INBOX.Sent"'));
});

test("REQ-6-11: page is a 1-based number and each page continues the last", async () => {
  const fake = fakeMailboxes(inbox(dated(1), dated(2), dated(3)));
  const pageOf = async (page) => (await emails(fake, { page, page_size: 2 })).messages.map((m) => m.subject);
  assert.deepEqual(await pageOf(1), ["Day 3", "Day 2"]);
  assert.deepEqual(await pageOf(2), ["Day 1"]);
  assert.deepEqual(await pageOf(3), []);
  assert.deepEqual(await pageOf(undefined), ["Day 3", "Day 2"], "page defaults to 1");
  const zero = await emails(fake, { page: 0 });
  assert.equal(zero.errors[0].code, "invalid_input");
});

test("REQ-6-12: page_size defaults to 50, 100 is honored in one page, and above 100 is an error", async () => {
  const many = Array.from({ length: 120 }, (_, i) => dated(1, { subject: `Message ${i}` }));
  const fake = fakeMailboxes(inbox(...many));
  assert.equal((await emails(fake, {})).messages.length, 50);
  assert.equal((await emails(fake, { page_size: 100 })).messages.length, 100);
  const over = await emails(fake, { page_size: 101 });
  assert.equal(over.isError, true);
  assert.equal(over.errors[0].code, "invalid_input");
});

test("REQ-6-13: order defaults to descending by date, not by arrival, and asc reverses it", async () => {
  // UIDs arrive out of date order, as they do in Archive after a move.
  const fake = fakeMailboxes(inbox(dated(5), dated(1), dated(9)));
  const subjects = async (args) => (await emails(fake, args)).messages.map((m) => m.subject);
  assert.deepEqual(await subjects({}), ["Day 9", "Day 5", "Day 1"]);
  assert.deepEqual(await subjects({ order: "asc" }), ["Day 1", "Day 5", "Day 9"]);
  const bad = await emails(fake, { order: "sideways" });
  assert.equal(bad.errors[0].code, "invalid_input");
});

test("REQ-6-14 REQ-18-4: every emails response carries a more-pages flag", async () => {
  const fake = fakeMailboxes(inbox(dated(1), dated(2)));
  assert.equal((await emails(fake, { page_size: 1 })).has_more, true);
  assert.equal((await emails(fake, { page_size: 2 })).has_more, false);
  assert.equal((await emails(fake, { page: 2, page_size: 1 })).has_more, false);
  assert.equal((await emails(fake, { filter: "nope:x" })).has_more, false, "also on a refused call");
  const down = fakeMailboxes(inbox(dated(1)), { badHosts: ["one.test"] });
  assert.equal((await emails(down, {})).has_more, false, "also when the account failed");
});

test("REQ-6-15: without a date token emails has no lookback and sends no date key", async () => {
  const old = mail({ date: "Mon, 01 Jan 2001 12:00:00 +0000", subject: "Old" });
  const fake = fakeMailboxes(inbox(old));
  assert.deepEqual((await emails(fake, {})).messages.map((m) => m.subject), ["Old"]);
  assert.ok(fake.commands.some((c) => c === "UID SORT (REVERSE DATE) UTF-8 ALL"));
  assert.ok(!fake.commands.some((c) => /SINCE|BEFORE/.test(c)));
});

test("REQ-6-16 REQ-6-2: each message has ID, account, from, to, subject, date, snippet and flags, and no more", async () => {
  const fake = fakeMailboxes(inbox(mail({
    from: '"=?UTF-8?B?Sm9zw6k=?=" <jose@example.test>',
    to: "Me <me@one.test>, other@example.test",
    subject: "=?UTF-8?B?Y2Fmw6k=?=",
    date: "Mon, 02 Nov 2026 07:00:00 -0500",
    messageId: "<m1@example.test>",
  })));
  const [message] = (await emails(fake, {})).messages;
  assert.deepEqual(Object.keys(message).sort(), ["account", "date", "flags", "from", "id", "snippet", "subject", "to"]);
  assert.equal(message.account, ACCOUNT_A);
  assert.deepEqual(message.from, { name: "José", address: "jose@example.test" });
  assert.deepEqual(message.to, [{ name: "Me", address: "me@one.test" }, { name: "", address: "other@example.test" }]);
  assert.equal(message.subject, "café");
  assert.equal(message.date, "2026-11-02T12:00:00.000Z");
  assert.equal(message.snippet, "Plain body text.");
  const decoded = decodeMessageId(message.id);
  assert.deepEqual(
    [decoded.account, decoded.folder, decoded.uidValidity, decoded.uid, decoded.messageId],
    [ACCOUNT_A, "INBOX", "1730000000", 1, "<m1@example.test>"],
  );
});

test("REQ-6-16: a bare MAILER-DAEMON sender with no address still shows who sent it", async () => {
  const fake = fakeMailboxes(inbox(mail({ from: "MAILER-DAEMON" })));
  const [message] = (await emails(fake, {})).messages;
  assert.deepEqual(message.from, { name: "MAILER-DAEMON", address: null });
});

test("REQ-6-16: a message with no usable Date header takes its date from INTERNALDATE", async () => {
  const fake = fakeMailboxes(inbox(mail({ date: "not a date" }), mail({ date: null })));
  for (const message of (await emails(fake, {})).messages) assert.equal(message.date, "2026-11-02T12:00:00.000Z");
});

test("REQ-6-17: flags include \\Flagged, so callers can skip pinned messages", async () => {
  const fake = fakeMailboxes(inbox({ raw: dated(1), flags: ["\\Flagged", "\\Seen"] }));
  assert.ok((await emails(fake, {})).messages[0].flags.includes("\\Flagged"));
});

test("REQ-6-18: flags include \\Answered, the already-replied signal", async () => {
  const fake = fakeMailboxes(inbox({ raw: dated(1), flags: ["\\Answered"] }));
  assert.ok((await emails(fake, {})).messages[0].flags.includes("\\Answered"));
});

const MIXED = ['Content-Type: multipart/mixed; boundary="mix"'];
const altBody = (html, plain) =>
  report(
    [
      plain === undefined
        ? `Content-Type: text/html; charset=utf-8\r\n\r\n${html}`
        : `Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${plain}`,
      'Content-Type: application/pdf; name="big.pdf"\r\nContent-Disposition: attachment; filename="big.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nQUJD',
    ],
    "mix",
  );

test("REQ-6-19: the snippet is 200 decoded characters of text/plain, whitespace collapsed, from a partial BODY.PEEK fetch", async () => {
  const long = `Caf=C3=A9   line\r\n\r\nnext ${"word ".repeat(100)}`;
  const fake = fakeMailboxes(inbox(mail({ headers: MIXED, body: altBody("", long) })));
  const [message] = (await emails(fake, {})).messages;
  assert.ok(message.snippet.startsWith("Café line next word"));
  assert.equal(Array.from(message.snippet).length, 200);
  const partial = fake.commands.filter((c) => /BODY\.PEEK\[1\]<0\.\d+>/.test(c));
  assert.equal(partial.length, 1, "the text comes from one partial fetch");
  assert.ok(!fake.commands.some((c) => /BODY\[\]|BODY\.PEEK\[\]|BODY\.PEEK\[2\]/.test(c)), "no whole message and no attachment");
});

test("REQ-6-19: with no text part the snippet is the HTML with its tags stripped", async () => {
  const html = "<html><head><style>p { color: red }</style></head><body><p>Hello <b>there</b> &amp; welcome</p></body></html>";
  const fake = fakeMailboxes(inbox(mail({ headers: MIXED, body: altBody(html) })));
  assert.equal((await emails(fake, {})).messages[0].snippet, "Hello there & welcome");
});

test("REQ-6-19: a text part after a long HTML alternative still wins, and a whole page shares a few fetches", async () => {
  const body = report(
    [
      `Content-Type: text/html; charset=utf-8\r\n\r\n<p>${"html ".repeat(10000)}</p>`,
      "Content-Type: text/plain; charset=utf-8\r\n\r\nThe plain text.",
    ],
    "alt",
  );
  const headers = ['Content-Type: multipart/alternative; boundary="alt"'];
  const fake = fakeMailboxes(inbox(...Array.from({ length: 100 }, () => mail({ headers, body }))));
  const { messages } = await emails(fake, { page_size: 100 });
  assert.equal(messages.length, 100);
  assert.ok(messages.every((m) => m.snippet === "The plain text."));
  assert.equal(fake.commands.filter((c) => c.startsWith("UID FETCH")).length, 2, "metadata, then one partial fetch");
});

const bounce = () =>
  mail({
    from: "Mail Delivery System <MAILER-DAEMON@one.test>",
    subject: "Undelivered Mail",
    headers: ['Content-Type: multipart/report; report-type=delivery-status; boundary="rpt"'],
    body: report([
      "Content-Type: text/plain; charset=utf-8\r\n\r\nThis is the mail system. Your message could not be delivered.",
      "Content-Type: message/delivery-status\r\n\r\nReporting-MTA: dns; one.test\r\n\r\nFinal-Recipient: rfc822; gone@example.test\r\nAction: failed\r\nStatus: 5.1.1\r\nDiagnostic-Code: smtp; 550 5.1.1 no such user",
      "Content-Type: message/rfc822\r\n\r\nFrom: me@one.test\r\nTo: gone@example.test\r\nSubject: Original subject\r\nDate: Sun, 01 Nov 2026 12:00:00 +0000\r\n\r\nORIGINAL BODY MUST NOT APPEAR",
    ]),
  });

test("REQ-6-20: a multipart/report snippet starts with Final-Recipient and Diagnostic-Code", async () => {
  const fake = fakeMailboxes(inbox(bounce()));
  const [message] = (await emails(fake, {})).messages;
  assert.ok(message.snippet.startsWith("Final-Recipient: rfc822; gone@example.test Diagnostic-Code: smtp; 550 5.1.1 no such user This is the mail system."), message.snippet);
});

// search

const hit = (day, subject, extra = {}) => dated(day, { subject, body: `${subject} body`, ...extra });
const search = (fake, args, options) => callTool(fake, "search", args, options);

test("REQ-6-21: search runs a free-text query in one account plus an optional filter", async () => {
  const fake = fakeMailboxes(threeAccounts(
    [hit(1, "bounce notice", { from: "a@x.test" }), hit(2, "bounce again", { from: "b@x.test" }), hit(3, "other")],
    [hit(4, "bounce elsewhere")],
    [],
  ));
  const result = await search(fake, { query: "bounce", in: ACCOUNT_A, filter: "from:a@x.test" });
  assert.deepEqual(result.messages.map((m) => m.subject), ["bounce notice"]);
});

test("REQ-6-22: in takes an account or <account>:<Folder>, and omitted means all accounts", async () => {
  const fake = () => fakeMailboxes({
    [ACCOUNT_A]: { INBOX: [hit(1, "needle a")], "INBOX.Sent": [hit(2, "needle sent")] },
    [ACCOUNT_B]: { INBOX: [hit(3, "needle b")] },
    [ACCOUNT_C]: { INBOX: [hit(4, "needle c")] },
  });
  const subjects = async (args) => (await search(fake(), { query: "needle", ...args })).messages.map((m) => m.subject).sort();
  assert.deepEqual(await subjects({}), ["needle a", "needle b", "needle c", "needle sent"]);
  assert.deepEqual(await subjects({ in: ACCOUNT_A }), ["needle a", "needle sent"]);
  assert.deepEqual(await subjects({ in: `${ACCOUNT_A}:Sent` }), ["needle sent"]);
  const unknown = await search(fake(), { query: "needle", in: "nobody@nowhere.test" });
  assert.equal(unknown.isError, true);
});

test("REQ-6-23 REQ-5-8: search covers all folders except Trash and Junk, and those two are reachable by name", async () => {
  const fake = () => fakeMailboxes({
    [ACCOUNT_A]: {
      list: [...["INBOX", "INBOX.Sent", "INBOX.Drafts", "INBOX.Archive", "INBOX.Custom"].map((p) => [p, ""]), ["INBOX.Trash", "\\Trash"], ["INBOX.spam", "\\Junk"], ["INBOX.Gone", "\\Noselect"]],
      INBOX: [hit(1, "needle inbox")],
      "INBOX.Sent": [hit(2, "needle sent")],
      "INBOX.Drafts": [hit(3, "needle draft")],
      "INBOX.Archive": [hit(4, "needle archive")],
      "INBOX.Custom": [hit(5, "needle custom")],
      "INBOX.Trash": [hit(6, "needle trash")],
      "INBOX.spam": [hit(7, "needle junk")],
    },
  });
  const registry = [REGISTRY[0]];
  const everywhere = await search(fake(), { query: "needle" }, { registry });
  assert.deepEqual(everywhere.messages.map((m) => m.subject).sort(), ["needle archive", "needle custom", "needle draft", "needle inbox", "needle sent"]);
  const trash = await search(fake(), { query: "needle", in: `${ACCOUNT_A}:Trash` }, { registry });
  assert.deepEqual(trash.messages.map((m) => m.subject), ["needle trash"]);
  const junk = await search(fake(), { query: "needle", in: `${ACCOUNT_A}:Junk` }, { registry });
  assert.deepEqual(junk.messages.map((m) => m.subject), ["needle junk"]);
  const emailsTrash = await callTool(fake(), "emails", { folder: `${ACCOUNT_A}:Trash` }, { registry });
  assert.deepEqual(emailsTrash.messages.map((m) => m.subject), ["needle trash"]);
});

test("REQ-6-24: query words are ORed TEXT terms, and a filter-looking word is searched as written", async () => {
  const fake = fakeMailboxes(inbox(hit(1, "delivery"), hit(2, "undeliverable"), hit(3, "neither")));
  const result = await search(fake, { query: "delivery undeliverable from:x", in: `${ACCOUNT_A}:Inbox` });
  assert.deepEqual(result.messages.map((m) => m.subject).sort(), ["delivery", "undeliverable"]);
  assert.ok(fake.commands.includes('UID SORT (REVERSE DATE) UTF-8 OR TEXT "delivery" OR TEXT "undeliverable" TEXT "from:x"'));
});

test("REQ-6-25: filter tokens stay ANDed with each other and with the query", async () => {
  const fake = fakeMailboxes(inbox(
    hit(1, "needle one", { from: "a@x.test" }),
    hit(2, "needle two", { from: "b@x.test" }),
    hit(3, "other", { from: "a@x.test" }),
  ));
  const result = await search(fake, { query: "needle", in: `${ACCOUNT_A}:Inbox`, filter: "from:a@x.test subject:needle" });
  assert.deepEqual(result.messages.map((m) => m.subject), ["needle one"]);
  assert.ok(fake.commands.includes('UID SORT (REVERSE DATE) UTF-8 FROM "a@x.test" SUBJECT "needle" TEXT "needle"'));
});

test("REQ-6-25: non-ASCII query words reach the server as UTF-8", async () => {
  const fake = fakeMailboxes(inbox(hit(1, "plain")));
  await search(fake, { query: "café", in: `${ACCOUNT_A}:Inbox` });
  assert.ok(fake.commands.some((c) => c.startsWith("UID SORT (REVERSE DATE) UTF-8 TEXT ")));
  const refused = await search(fake, { query: "bad\u0007word", in: ACCOUNT_A });
  assert.equal(refused.errors[0].code, "filter");
});

test("REQ-6-26 REQ-18-5: search merges newest first across accounts and folders and caps at 20 in total", async () => {
  const batch = (start, label) => Array.from({ length: 15 }, (_, i) => hit(start + i, `needle ${label} ${start + i}`));
  const fake = fakeMailboxes({
    [ACCOUNT_A]: { INBOX: batch(1, "a"), "INBOX.Archive": batch(16, "archive") },
    [ACCOUNT_B]: { INBOX: batch(10, "b") },
    [ACCOUNT_C]: { INBOX: [] },
  });
  const { messages } = await search(fake, { query: "needle" });
  assert.equal(messages.length, 20);
  const dates = messages.map((m) => m.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.ok(messages.some((m) => m.account === ACCOUNT_B));
  assert.ok(messages.every((m) => m.subject.match(/\d+$/)[0] >= 11), "only the newest survive");
});

test("REQ-18-5: search takes no page, and returns the same fields as emails", async () => {
  const fake = fakeMailboxes(inbox(hit(1, "needle")));
  const paged = await search(fake, { query: "needle", page: 2 });
  assert.equal(paged.errors[0].code, "invalid_input");
  const [found] = (await search(fake, { query: "needle", in: ACCOUNT_A })).messages;
  const [listed] = (await emails(fake, {})).messages;
  assert.deepEqual(found, listed);
});

test("REQ-6-2: every search result names its account", async () => {
  const fake = fakeMailboxes(threeAccounts([hit(1, "needle")], [hit(2, "needle")], [hit(3, "needle")]));
  const { messages } = await search(fake, { query: "needle" });
  assert.deepEqual(messages.map((m) => m.account).sort(), [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C].sort());
});

// Failure handling

test("REQ-6-1 REQ-12-1 REQ-18-4: search with one host down returns the other host's results and names who was missed", async () => {
  const fake = fakeMailboxes(threeAccounts([hit(1, "needle")], [hit(2, "needle")], [hit(3, "needle")]), { badHosts: ["two.test"] });
  const result = await search(fake, { query: "needle" });
  assert.equal(result.isError, false);
  assert.deepEqual(result.messages.map((m) => m.account), [ACCOUNT_A]);
  assert.deepEqual(result.accounts_reached, [ACCOUNT_A]);
  assert.deepEqual(result.accounts_not_reached.map((a) => [a.account, a.host, a.code]), [
    [ACCOUNT_B, "two.test", "connection"],
    [ACCOUNT_C, "two.test", "connection"],
  ]);
});

test("REQ-12-2: one account's failed login fails only that account, even on a shared host", async () => {
  const fake = fakeMailboxes(threeAccounts([], [hit(2, "needle")], [hit(3, "needle")]), { refuse: { [ACCOUNT_B]: "NO [AUTHENTICATIONFAILED] nope" } });
  const result = await search(fake, { query: "needle" });
  assert.deepEqual(result.messages.map((m) => m.account), [ACCOUNT_C]);
  const [missed] = result.accounts_not_reached;
  assert.equal(missed.account, ACCOUNT_B);
  assert.equal(missed.code, "auth");
});

test("REQ-12-2 REQ-4-9: a silent host fails only its accounts when the command times out", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fake = fakeMailboxes({ [ACCOUNT_A]: { INBOX: [hit(1, "x")] } }, { silent: /^UID SORT/ });
  const pending = emails(fake, {});
  for (let i = 0; i < 200 && fake.commands.every((c) => !c.startsWith("UID SORT")); i++) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(15_000);
  for (let i = 0; i < 50; i++) await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(15_000);
  const result = await pending;
  assert.equal(result.isError, true);
  assert.equal(result.accounts_not_reached[0].code, "timeout");
});

test("REQ-6-1: every tool's response states which accounts were reached, including refusals", async () => {
  const fake = fakeMailboxes(threeAccounts([], [], []));
  const calls = [
    ["accounts", {}],
    ["availability", {}],
    ["folders", {}],
    ["emails", { folder: `${ACCOUNT_A}:Inbox` }],
    ["emails", { folder: `${ACCOUNT_A}:Nope` }],
    ["emails", { folder: `${ACCOUNT_A}:Inbox`, filter: "nope:x" }],
    ["search", { query: "x" }],
    ["thread", { message_id: "not-an-id" }],
  ];
  for (const [tool, args] of calls) {
    const result = await callTool(fake, tool, args);
    assert.ok(Array.isArray(result.accounts_reached), tool);
    assert.ok(Array.isArray(result.accounts_not_reached), tool);
  }
});

test("REQ-12-1 REQ-18-4: when every account fails the result is a tool error and still names them", async () => {
  const fake = fakeMailboxes(threeAccounts([], [], []), { badHosts: ["one.test", "two.test"] });
  for (const [tool, args] of [["search", { query: "x" }], ["folders", {}], ["emails", { folder: `${ACCOUNT_A}:Inbox` }]]) {
    const result = await callTool(fake, tool, args);
    assert.equal(result.isError, true, tool);
    assert.equal(result.accounts_reached.length, 0, tool);
    assert.ok(result.accounts_not_reached.length > 0, tool);
  }
});

test("REQ-12-11: a missing Archive is an explicit error from emails, on an account that was reached", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: { list: [["INBOX", ""]] } });
  const result = await callTool(fake, "emails", { folder: `${ACCOUNT_A}:Archive` });
  assert.equal(result.isError, true);
  assert.deepEqual(result.accounts_reached, [ACCOUNT_A]);
  assert.deepEqual(result.accounts_not_reached, []);
  assert.equal(result.errors[0].code, "folder");
  assert.match(result.errors[0].message, /no folder found for Archive; it is not created/);
});

test("REQ-12-11: an ambiguous folder name is an explicit error asking for an override", async () => {
  const fake = fakeMailboxes({ [ACCOUNT_A]: { list: [["INBOX", ""], ["INBOX.Sent", ""], ["Old.Sent", ""]] } });
  const result = await callTool(fake, "emails", { folder: `${ACCOUNT_A}:Sent` });
  assert.equal(result.isError, true);
  assert.match(result.errors[0].message, /several folders match Sent by name; set a config override/);
});

test("REQ-12-11: search reports an ambiguous Junk on that account instead of risking a search of it", async () => {
  const fake = fakeMailboxes({
    [ACCOUNT_A]: { list: [["INBOX", ""], ["Spam", ""], ["Junk", ""]], INBOX: [hit(1, "needle")] },
    [ACCOUNT_B]: { INBOX: [hit(2, "needle")] },
  });
  const result = await search(fake, { query: "needle" }, { registry: REGISTRY.slice(0, 2) });
  assert.deepEqual(result.messages.map((m) => m.account), [ACCOUNT_B]);
  assert.equal(result.errors[0].account, ACCOUNT_A);
  assert.match(result.errors[0].message, /several folders match Junk/);
  assert.equal(result.isError, false, "the other account still answered");
});

test("REQ-12-11: an unknown filter token is an explicit error naming it, before any connection", async () => {
  const fake = fakeMailboxes(inbox());
  for (const [tool, args] of [["emails", { folder: `${ACCOUNT_A}:Inbox`, filter: "label:x" }], ["search", { query: "y", filter: "label:x" }]]) {
    const result = await callTool(fake, tool, args);
    assert.equal(result.isError, true);
    assert.equal(result.errors[0].code, "filter");
    assert.match(result.errors[0].message, /label:x/);
  }
  assert.equal(fake.connections.length, 0);
});

test("REQ-6-3: an ID's account comes from the ID, and a supplied account that differs is an error", () => {
  const registry = loadRegistry(REGISTRY);
  const decoded = { account: ACCOUNT_A };
  assert.equal(accountForId(registry, decoded).id, ACCOUNT_A);
  assert.equal(accountForId(registry, decoded, ACCOUNT_A).id, ACCOUNT_A);
  assert.throws(() => accountForId(registry, decoded, ACCOUNT_B), (error) => error instanceof ServerError && error.code === "account_mismatch");
  assert.throws(() => accountForId(registry, { account: "x@y.test" }), (error) => error.code === "id_invalid");
});

test("REQ-12-11 REQ-6-3: account mismatch is an explicit error code, not a silent choice", () => {
  const registry = loadRegistry(REGISTRY);
  assert.throws(() => accountForId(registry, { account: ACCOUNT_A }, ACCOUNT_C), /does not match the message ID's account/);
});

test("REQ-2-8: a bad registry is reported on the call as a config error", async () => {
  const fake = fakeMailboxes(inbox());
  const result = await callTool(fake, "accounts", {}, { registry: "not a list" });
  assert.equal(result.isError, true);
  assert.equal(result.errors[0].code, "config");
});
