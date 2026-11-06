// Folder resolution and the filter translator on the deployed staging Worker, on both test mailboxes.
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { test } from "node:test";
import { callStaging, skip, testMailboxes } from "./harness.mjs";

let checked;
const resultFor = async (id) => {
  checked ??= callStaging("/imap-check").then(async (response) => {
    assert.equal(response.status, 200);
    return response.json();
  });
  const result = (await checked).find((r) => r.id === id);
  assert.ok(result, `no result for ${id}`);
  assert.equal(
    result.ok,
    true,
    `${id}: ${result.code}: ${result.error} [server: ${result.server_text}; egress before ${result.egress_ip}, after ${result.egress_ip_after}]`,
  );
  return result.value;
};

const EXPECTED = {
  Inbox: "INBOX",
  Sent: "INBOX.Sent",
  Drafts: "INBOX.Drafts",
  Archive: "INBOX.Archive",
  Trash: "INBOX.Trash",
  Junk: "INBOX.spam",
};

for (const { id, host } of testMailboxes()) {
  test(`REQ-2-4 REQ-5-1 REQ-14-4: folders and SPECIAL-USE flags resolve and are recorded on ${host}`, { skip }, async (t) => {
    const { logical, folders } = await resultFor(id);
    const line = `${host} folders: ${folders.map((f) => `${f.path}${f.specialUse ? ` (${f.specialUse})` : ""}`).join(", ")}`;
    t.diagnostic(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
    assert.deepEqual(logical, EXPECTED);
  });

  test(`REQ-5-10 REQ-14-4: Archive exists with \\Archive on ${host}`, { skip }, async () => {
    const { folders } = await resultFor(id);
    assert.equal(folders.find((f) => f.path === "INBOX.Archive")?.specialUse, "\\Archive");
  });

  test(`REQ-14-13 REQ-7-8: from: finds a MAILER-DAEMON display name and a postmaster@ address on ${host}`, { skip }, async () => {
    const { filters } = await resultFor(id);
    assert.deepEqual(filters.fromDaemon, { daemon: true, postmaster: false }, "case-insensitive, display name included");
    assert.deepEqual(filters.fromPostmaster, { daemon: false, postmaster: true });
  });

  test(`REQ-7-1 REQ-7-2 REQ-18-1: translated filters behave on ${host}`, { skip }, async () => {
    const { filters } = await resultFor(id);
    assert.deepEqual(filters.olderThan, { daemon: false, postmaster: false }, "older_than excludes new mail");
    assert.deepEqual(filters.subjectAnd, { daemon: true, postmaster: false }, "tokens combine with AND");
    assert.deepEqual(filters.nonAscii, { daemon: false, postmaster: true }, "non-ASCII search text");
    assert.deepEqual(filters.unread, { daemon: true, postmaster: false });
    assert.deepEqual(filters.read, { daemon: false, postmaster: true });
    assert.deepEqual(filters.bareWord, { daemon: true, postmaster: true }, "bare words are TEXT");
  });
}
