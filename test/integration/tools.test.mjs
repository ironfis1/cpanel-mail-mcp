// Calls every read tool over MCP on the deployed staging Worker, on both test mailboxes. Needs real
// mail in each Inbox: Scott sends 3 or 4 ordinary emails from Gmail to each mcptest mailbox first.
import assert from "node:assert/strict";
import { test } from "node:test";
import { callMcp, callStaging, skip, testMailboxes } from "./harness.mjs";

const mailboxes = testMailboxes();
const ids = mailboxes.map((m) => m.id);
const NEEDS_MAIL = "no mail to read: send 3 or 4 emails from Gmail to each mcptest mailbox, then re-run";

const inbox = async (id, args = {}) => {
  const result = await callMcp("emails", { folder: `${id}:Inbox`, ...args });
  assert.equal(result.isError, false, JSON.stringify(result.accounts_not_reached ?? result.errors));
  return result;
};

test("REQ-14-2: the MCP endpoint refuses a call without the bearer token", { skip }, async () => {
  const response = await callStaging("/mcp", { authenticated: false });
  assert.equal(response.status, 401);
});

test("REQ-1-3 REQ-1-9: tools/list on staging names exactly the read tools", { skip }, async () => {
  const tools = await callMcp.list();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["accounts", "availability", "emails", "folders", "search", "thread"]);
});

test("REQ-6-4: accounts on staging lists both test mailboxes from config", { skip }, async () => {
  const result = await callMcp("accounts");
  assert.deepEqual(result.accounts.map((a) => a.id).sort(), [...ids].sort());
});

test("REQ-6-7 REQ-6-6: availability reaches both test mailboxes through SELECT INBOX, grouped by host", { skip }, async () => {
  const result = await callMcp("availability");
  assert.equal(result.hosts.length, 2);
  for (const entry of result.hosts.flatMap((group) => group.accounts)) {
    assert.equal(entry.reached, true, `${entry.account}: ${entry.code}: ${entry.error}`);
    assert.deepEqual(entry.checks, { tcp_tls: "ok", login: "ok", select_inbox: "ok" });
  }
  assert.deepEqual([...result.accounts_reached].sort(), [...ids].sort());
});

test("REQ-6-9: folders maps every logical name on both test mailboxes", { skip }, async () => {
  const result = await callMcp("folders");
  assert.equal(result.accounts.length, 2);
  for (const account of result.accounts) {
    assert.deepEqual(account.mapping, {
      Inbox: "INBOX",
      Sent: "INBOX.Sent",
      Drafts: "INBOX.Drafts",
      Archive: "INBOX.Archive",
      Trash: "INBOX.Trash",
      Junk: "INBOX.spam",
    });
  }
});

for (const { id, host } of mailboxes) {
  test(`REQ-6-10 REQ-6-13 REQ-6-16: emails lists ${id} on ${host} newest first with every field`, { skip }, async () => {
    const { messages, has_more, accounts_reached } = await inbox(id);
    assert.ok(messages.length > 0, NEEDS_MAIL);
    assert.equal(typeof has_more, "boolean");
    assert.deepEqual(accounts_reached, [id]);
    for (const message of messages) {
      assert.equal(message.account, id);
      assert.ok(message.id.startsWith("cmm1_"));
      assert.ok(message.from);
      assert.ok(Array.isArray(message.to));
      assert.equal(typeof message.subject, "string");
      assert.equal(typeof message.snippet, "string");
      assert.ok(Array.isArray(message.flags));
    }
    const dates = messages.map((m) => m.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  test(`REQ-6-11 REQ-6-14: emails pages ${id} with has_more until no pages remain`, { skip }, async () => {
    const all = (await inbox(id, { page_size: 100 })).messages;
    assert.ok(all.length > 0, NEEDS_MAIL);
    const first = await inbox(id, { page: 1, page_size: 1 });
    assert.deepEqual(first.messages.map((m) => m.id), [all[0].id]);
    assert.equal(first.has_more, all.length > 1);
    const beyond = await inbox(id, { page: all.length + 1, page_size: 1 });
    assert.deepEqual(beyond.messages, []);
    assert.equal(beyond.has_more, false);
  });

  test(`REQ-6-19: emails on ${id} takes a snippet from real mail without marking it read`, { skip }, async () => {
    const before = (await inbox(id)).messages;
    assert.ok(before.length > 0, NEEDS_MAIL);
    assert.ok(before.some((m) => m.snippet.length > 0), "at least one message has text");
    assert.ok(before.every((m) => Array.from(m.snippet).length <= 200));
    const after = (await inbox(id)).messages;
    assert.deepEqual(after.map((m) => m.flags), before.map((m) => m.flags));
  });

  test(`REQ-6-21 REQ-6-22: search finds a real message in ${id} by a word of its subject`, { skip }, async () => {
    const [message] = (await inbox(id)).messages;
    assert.ok(message, NEEDS_MAIL);
    const word = message.subject.split(/\s+/).find((w) => /^[\x21-\x7e]{3,}$/.test(w)) ?? message.subject;
    const scoped = await callMcp("search", { query: word, in: id });
    assert.deepEqual(scoped.accounts_reached, [id]);
    assert.ok(scoped.messages.some((m) => m.id === message.id), `search for "${word}" found the message`);
    assert.ok(scoped.messages.every((m) => m.account === id));
    const folder = await callMcp("search", { query: word, in: `${id}:Inbox` });
    assert.ok(folder.messages.some((m) => m.id === message.id));
  });

  test(`REQ-6-27 REQ-6-31: thread on ${id} returns a real message with its body as text, oldest first`, { skip }, async () => {
    const [message] = (await inbox(id)).messages;
    assert.ok(message, NEEDS_MAIL);
    const result = await callMcp("thread", { message_id: message.id });
    assert.equal(result.isError, false, JSON.stringify(result.errors));
    const self = result.messages.find((m) => m.id === message.id);
    assert.ok(self, "the requested message is in its thread");
    assert.equal(typeof self.body, "string");
    assert.ok(self.body.length > 0);
    const dates = result.messages.map((m) => m.date);
    assert.deepEqual(dates, [...dates].sort());
  });

  test(`REQ-12-11: emails on ${id} refuses an unknown filter token by name`, { skip }, async () => {
    const result = await callMcp("emails", { folder: `${id}:Inbox`, filter: "label:important" });
    assert.equal(result.isError, true);
    assert.match(result.errors[0].message, /label:important/);
  });
}

test("REQ-6-23 REQ-18-5: search with no scope reaches both test mailboxes, at most 20 results, newest first", { skip }, async () => {
  const result = await callMcp("search", { filter: "newer_than:3650d" });
  assert.deepEqual([...result.accounts_reached].sort(), [...ids].sort());
  assert.ok(result.messages.length <= 20);
  const dates = result.messages.map((m) => m.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

// Forced failure: the staging Worker gives one account a host that cannot resolve.
for (const { id: broken, host } of mailboxes) {
  const healthy = ids.find((id) => id !== broken);
  const options = { breakAccount: broken };

  test(`REQ-12-1 REQ-12-2: with ${broken} on a bad host, search still returns ${healthy} and names the failure`, { skip }, async () => {
    const result = await callMcp("search", { filter: "newer_than:3650d" }, options);
    assert.equal(result.isError, false);
    assert.deepEqual(result.accounts_reached, [healthy]);
    assert.deepEqual(result.accounts_not_reached.map((a) => a.account), [broken]);
    assert.ok(result.messages.length > 0, NEEDS_MAIL);
    assert.ok(result.messages.every((m) => m.account === healthy));
  });

  test(`REQ-6-1 REQ-12-2: with ${broken} on a bad host, availability and folders still answer for ${healthy}`, { skip }, async () => {
    const health = await callMcp("availability", {}, options);
    assert.deepEqual(health.accounts_reached, [healthy]);
    assert.deepEqual(health.accounts_not_reached.map((a) => a.account), [broken]);
    const entry = health.hosts.flatMap((group) => group.accounts).find((a) => a.account === broken);
    assert.equal(entry.failed_step, "tcp_tls");
    const folders = await callMcp("folders", {}, options);
    assert.deepEqual(folders.accounts.map((a) => a.account), [healthy]);
    assert.deepEqual(folders.accounts_not_reached.map((a) => a.account), [broken]);
  });

  test(`REQ-12-2: with ${broken} on a bad host, emails on it is a loud failure naming the account (was ${host})`, { skip }, async () => {
    const result = await callMcp("emails", { folder: `${broken}:Inbox` }, options);
    assert.equal(result.isError, true);
    assert.deepEqual(result.accounts_not_reached.map((a) => a.account), [broken]);
    assert.equal(result.has_more, false);
  });
}
