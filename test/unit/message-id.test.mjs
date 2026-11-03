import assert from "node:assert/strict";
import { test } from "node:test";
import { FolderMap } from "../../src/folders.js";
import { decodeMessageId, draftReference, encodeMessageId, lookupMessage } from "../../src/message-id.js";

const MESSAGE = {
  account: "scott@reasinger.net",
  folder: "INBOX.Sent",
  uidValidity: "1793547456",
  uid: 42,
  messageId: "<orig-1@example.com>",
};

const FOLDERS = new FolderMap([
  { path: "INBOX", delimiter: ".", flags: [] },
  { path: "INBOX.Sent", delimiter: ".", flags: ["\\Sent"] },
  { path: "INBOX.Drafts", delimiter: ".", flags: ["\\Drafts"] },
  { path: "INBOX.Archive", delimiter: ".", flags: ["\\Archive"] },
]);

// A fake session. mailboxes: path -> { uidValidity, uids, byMessageId: { id: [uids] } }.
function session(mailboxes, folders = FOLDERS) {
  const log = [];
  let current = null;
  return {
    folders,
    log,
    async select(path) {
      log.push(`SELECT ${path}`);
      const mailbox = mailboxes[path];
      if (!mailbox) throw Object.assign(new Error("no such mailbox"), { code: "command" });
      current = mailbox;
      return { exists: 0, uidValidity: mailbox.uidValidity };
    },
    async uidSearch(criteria) {
      log.push(`SEARCH ${criteria}`);
      const uid = /^UID (\d+)$/.exec(criteria);
      if (uid) return current.uids?.includes(Number(uid[1])) ? [Number(uid[1])] : [];
      const header = /^HEADER Message-ID "(.*)"$/.exec(criteria);
      assert.ok(header, criteria);
      return current.byMessageId?.[header[1]] ?? [];
    },
  };
}
const selects = (client) => client.log.filter((l) => l.startsWith("SELECT")).map((l) => l.slice(7));
const ID = MESSAGE.messageId;

test("REQ-8-1: an ID encodes account, folder, UIDVALIDITY, UID and Message-ID, and round-trips", () => {
  assert.deepEqual(decodeMessageId(encodeMessageId(MESSAGE)), MESSAGE);
});

test("REQ-8-1: the ID is opaque: none of its fields are readable in it", () => {
  const id = encodeMessageId(MESSAGE);
  assert.match(id, /^cmm1_[A-Za-z0-9_-]+$/);
  for (const value of ["scott", "INBOX", "1793547456", "orig-1"]) assert.ok(!id.includes(value), value);
});

test("REQ-8-1: awkward values round-trip: non-ASCII folders, quotes, and no Message-ID", () => {
  const cases = [
    { ...MESSAGE, folder: 'INBOX.Caf&AOk-."quoted"' },
    { ...MESSAGE, folder: "INBOX.日本語" },
    { ...MESSAGE, messageId: null },
    { ...MESSAGE, uid: 4294967295 },
  ];
  for (const message of cases) assert.deepEqual(decodeMessageId(encodeMessageId(message)), message);
  const { messageId, ...withoutHeader } = MESSAGE;
  assert.equal(decodeMessageId(encodeMessageId(withoutHeader)).messageId, null, messageId);
});

test("REQ-8-2: the same message always gets the same ID", () => {
  const shuffled = { messageId: ID, uid: 42, uidValidity: 1793547456, folder: "INBOX.Sent", account: "scott@reasinger.net" };
  assert.equal(encodeMessageId(MESSAGE), encodeMessageId({ ...MESSAGE }));
  assert.equal(encodeMessageId(MESSAGE), encodeMessageId(shuffled), "field order and number or string UIDVALIDITY do not matter");
  assert.equal(encodeMessageId(MESSAGE), "cmm1_WyJzY290dEByZWFzaW5nZXIubmV0IiwiSU5CT1guU2VudCIsIjE3OTM1NDc0NTYiLDQyLCI8b3JpZy0xQGV4YW1wbGUuY29tPiJd", "pinned, so a change that breaks stored IDs fails here");
});

test("REQ-8-3: lookup uses the UID when UIDVALIDITY matches and the UID exists", async () => {
  const client = session({ "INBOX.Sent": { uidValidity: MESSAGE.uidValidity, uids: [42] } });
  assert.deepEqual(await lookupMessage(client, MESSAGE), { folder: "INBOX.Sent", uid: 42, uidValidity: MESSAGE.uidValidity });
  assert.deepEqual(client.log, ["SELECT INBOX.Sent", "SEARCH UID 42"], "no Message-ID search");
});

test("REQ-8-4: the fallback runs when UIDVALIDITY differs", async () => {
  const client = session({ "INBOX.Sent": { uidValidity: "999", uids: [42], byMessageId: { [ID]: [7] } } });
  assert.deepEqual(await lookupMessage(client, MESSAGE), { folder: "INBOX.Sent", uid: 7, uidValidity: "999" });
  assert.ok(!client.log.includes("SEARCH UID 42"), "a UID from another UIDVALIDITY is meaningless");
});

test("REQ-8-4: the fallback runs when the UID is gone, for example after archive", async () => {
  const client = session({
    "INBOX.Sent": { uidValidity: MESSAGE.uidValidity, uids: [] },
    "INBOX.Archive": { uidValidity: "5", byMessageId: { [ID]: [9] } },
  });
  assert.deepEqual(await lookupMessage(client, MESSAGE), { folder: "INBOX.Archive", uid: 9, uidValidity: "5" });
});

test("REQ-8-5: the fallback order is the encoded folder, then Archive, Inbox, Sent, Drafts", async () => {
  const encodedFolder = { ...MESSAGE, folder: "INBOX.Custom" };
  const client = session({
    "INBOX.Custom": { uidValidity: MESSAGE.uidValidity },
    "INBOX.Archive": { uidValidity: "1" },
    INBOX: { uidValidity: "2" },
    "INBOX.Sent": { uidValidity: "3" },
    "INBOX.Drafts": { uidValidity: "4" },
  });
  await assert.rejects(lookupMessage(client, encodedFolder), (e) => e.code === "id_not_found");
  assert.deepEqual(selects(client), ["INBOX.Custom", "INBOX.Archive", "INBOX", "INBOX.Sent", "INBOX.Drafts"]);
});

test("REQ-8-5: the search stops at the first folder with a match, even if a later one also has it", async () => {
  const client = session({
    "INBOX.Sent": { uidValidity: MESSAGE.uidValidity, uids: [] },
    "INBOX.Archive": { uidValidity: "1", byMessageId: { [ID]: [3] } },
    INBOX: { uidValidity: "2", byMessageId: { [ID]: [4] } },
  });
  assert.equal((await lookupMessage(client, MESSAGE)).folder, "INBOX.Archive");
  assert.deepEqual(selects(client), ["INBOX.Sent", "INBOX.Archive"]);
});

test("REQ-8-5: an encoded folder that is also a fallback folder is searched only once", async () => {
  const client = session({
    "INBOX.Sent": { uidValidity: "9" },
    "INBOX.Archive": { uidValidity: "1" },
    INBOX: { uidValidity: "2" },
    "INBOX.Drafts": { uidValidity: "4" },
  });
  await assert.rejects(lookupMessage(client, MESSAGE), (e) => e.code === "id_not_found");
  assert.deepEqual(selects(client), ["INBOX.Sent", "INBOX.Archive", "INBOX", "INBOX.Drafts"]);
});

test("REQ-8-5: an encoded folder that no longer exists does not stop the fallback", async () => {
  const client = session({ "INBOX.Archive": { uidValidity: "1", byMessageId: { [ID]: [3] } } });
  assert.equal((await lookupMessage(client, MESSAGE)).folder, "INBOX.Archive");
});

test("REQ-8-5: a connection failure during lookup is not mistaken for a missing folder", async () => {
  const client = session({});
  client.select = async () => {
    throw Object.assign(new Error("timed out"), { code: "timeout" });
  };
  await assert.rejects(lookupMessage(client, MESSAGE), (e) => e.code === "timeout");
  await assert.rejects(lookupMessage(client, { ...MESSAGE, messageId: null }), (e) => e.code === "timeout", "not reported as not found");
});

test("REQ-8-5 REQ-5-9: a missing Archive during the fallback is an error, not a skipped folder", async () => {
  const noArchive = new FolderMap([{ path: "INBOX.Sent", delimiter: ".", flags: ["\\Sent"] }]);
  const client = session({ "INBOX.Sent": { uidValidity: "9" } }, noArchive);
  await assert.rejects(lookupMessage(client, MESSAGE), (e) => e.code === "folder");
});

test("REQ-8-6: no match is a not-found error", async () => {
  const client = session({
    "INBOX.Sent": { uidValidity: "9" },
    "INBOX.Archive": { uidValidity: "1" },
    INBOX: { uidValidity: "2" },
    "INBOX.Drafts": { uidValidity: "4" },
  });
  await assert.rejects(lookupMessage(client, MESSAGE), (e) => e.code === "id_not_found");
});

test("REQ-8-6: an ID with no Message-ID cannot fall back, so a gone UID is not found", async () => {
  const client = session({ "INBOX.Sent": { uidValidity: MESSAGE.uidValidity, uids: [] } });
  await assert.rejects(lookupMessage(client, { ...MESSAGE, messageId: null }), (e) => e.code === "id_not_found");
  assert.deepEqual(selects(client), ["INBOX.Sent"]);
});

test("REQ-8-6: several matches in one folder are an ambiguity error, never a guess", async () => {
  const client = session({
    "INBOX.Sent": { uidValidity: "9" },
    "INBOX.Archive": { uidValidity: "1", byMessageId: { [ID]: [3, 4] } },
    INBOX: { uidValidity: "2", byMessageId: { [ID]: [5] } },
  });
  await assert.rejects(lookupMessage(client, MESSAGE), (e) => e.code === "id_ambiguous");
  assert.deepEqual(selects(client), ["INBOX.Sent", "INBOX.Archive"], "does not look past the ambiguous folder");
});

test("REQ-8-6: a Message-ID is quoted in the search, so it cannot alter the command", async () => {
  const hostile = '<a"b\\c@example.com>';
  const client = session({ "INBOX.Sent": { uidValidity: "9" } });
  client.uidSearch = async (criteria) => {
    client.log.push(criteria);
    return [1];
  };
  await lookupMessage(client, { ...MESSAGE, messageId: hostile });
  assert.equal(client.log.at(-1), 'HEADER Message-ID "<a\\"b\\\\c@example.com>"');
  await assert.rejects(lookupMessage(client, { ...MESSAGE, messageId: "<a>\r\nA9 LOGOUT" }), (e) => e.code === "invalid");
});

test("REQ-8-7: the draft reference is the server ID plus account, recipient and subject", () => {
  const id = encodeMessageId(MESSAGE);
  assert.deepEqual(draftReference({ id, account: MESSAGE.account, to: "jane@acme.example", subject: "Hello", extra: "dropped" }), {
    id,
    account: MESSAGE.account,
    to: "jane@acme.example",
    subject: "Hello",
  });
});

test("REQ-8-8: the ID is the server's own format, and foreign or damaged IDs are refused", () => {
  const good = encodeMessageId(MESSAGE);
  const notJson = `cmm1_${Buffer.from("not json").toString("base64url")}`;
  const shape = (value) => `cmm1_${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
  const bad = [
    "AAMkAGI2TG93AAA=",
    "19283746",
    "",
    undefined,
    null,
    42,
    "cmm1_",
    "cmm1_!!!",
    notJson,
    good.slice(5),
    shape({ account: "a" }),
    shape(["a", "b", "1", 2]),
    shape(["", "b", "1", 2, null]),
    shape(["a", "b", "x", 2, null]),
    shape(["a", "b", "1", 0, null]),
    shape(["a", "b", "1", 1.5, null]),
    shape(["a", "b", "1", 2, ""]),
  ];
  for (const id of bad) assert.throws(() => decodeMessageId(id), (e) => e.code === "id_invalid", String(id));
});
