// Runs the IMAP client on the deployed staging Worker against both test mailboxes.
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { test } from "node:test";
import { callStaging, skip, testMailboxes } from "./harness.mjs";

let checked;
const imapCheck = () => {
  checked ??= callStaging("/imap-check").then(async (response) => {
    assert.equal(response.status, 200);
    const results = await response.json();
    // R2 evidence for every account, passing or not, so failing and passing egress addresses can be compared.
    if (process.env.GITHUB_STEP_SUMMARY) {
      const lines = results.map((r) => `- ${r.id}: ${r.ok ? "ok" : `${r.code} (${r.server_text})`}, egress ${r.egress_ip}${r.ok ? "" : ` then ${r.egress_ip_after}`}`);
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `imap-check egress:\n\n${lines.join("\n")}\n\n`);
    }
    return results;
  });
  return checked;
};
const resultFor = async (id) => {
  const result = (await imapCheck()).find((r) => r.id === id);
  assert.ok(result, `no result for ${id}`);
  assert.equal(
    result.ok,
    true,
    `${id}: ${result.code}: ${result.error} [server: ${result.server_text}; egress before ${result.egress_ip}, after ${result.egress_ip_after}]`,
  );
  return result.value;
};

for (const { id, host } of testMailboxes()) {
  test(`REQ-14-5: record the IMAP capabilities of ${host}`, { skip }, async (t) => {
    const { capabilities } = await resultFor(id);
    const line = `${host} (${id}): ${capabilities.join(" ")}`;
    t.diagnostic(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
    assert.ok(capabilities.includes("IMAP4REV1"));
    assert.ok(capabilities.includes("SASL-IR"));
    assert.ok(capabilities.includes("MOVE") || capabilities.includes("UIDPLUS"));
  });

  test(`REQ-4-1 REQ-4-2 REQ-4-3: login, LIST and SELECT work on ${host} from the Worker`, { skip }, async () => {
    const value = await resultFor(id);
    const flagged = (flag) => value.folders.find((f) => f.specialUse === flag)?.path;
    assert.equal(flagged("\\Drafts"), "INBOX.Drafts");
    assert.equal(flagged("\\Trash"), "INBOX.Trash");
    assert.ok(value.inboxUidValidity);
    assert.equal(value.draftsSelected, true);
  });

  test(`REQ-4-3 REQ-4-4: APPEND, SEARCH, FETCH and STORE round trip on ${host}`, { skip }, async () => {
    const value = await resultFor(id);
    assert.equal(value.appended, true);
    assert.equal(value.searchFound, true);
    assert.equal(value.subject, "=?UTF-8?B?Y2hlY2sgw6k=?=");
    assert.equal(value.structure.subtype, "mixed");
    assert.deepEqual(value.structure.parts.map((p) => p.type), ["text/plain", "application/octet-stream"]);
    assert.ok(value.structure.parts[1].size > 190_000);
    assert.equal(value.partialBytes, 1024);
    assert.equal(value.flagged, true);
  });

  test(`REQ-6-13: UID SORT on ${host} orders by Date header, whatever order the UIDs arrived in`, { skip }, async () => {
    const { reads } = await resultFor(id);
    assert.equal(reads.sortedNewestFirst, true);
    assert.equal(reads.sortedOldestFirst, true);
  });

  test(`REQ-6-20: a real delivery report on ${host} has a snippet led by its delivery status`, { skip }, async () => {
    const { reads } = await resultFor(id);
    assert.ok(reads.snippet.startsWith("Final-Recipient: rfc822; gone@example.invalid Diagnostic-Code: smtp; 550 no such user"), reads.snippet);
    assert.ok(reads.snippet.includes("could not deliver"));
  });

  test(`REQ-6-32: a real delivery report on ${host} gives the status and embedded headers, not the embedded body`, { skip }, async () => {
    const { reads } = await resultFor(id);
    assert.ok(reads.body.includes("Diagnostic-Code: smtp; 550 no such user"));
    assert.ok(reads.body.includes("Subject: embedded original"));
    assert.ok(!reads.body.includes("EMBEDDED BODY"));
  });

  test(`REQ-4-5: move on ${host} leaves the message only in the destination, then it is removed`, { skip }, async () => {
    const value = await resultFor(id);
    assert.equal(value.movedOut, true);
    assert.equal(value.movedIn, true);
    assert.equal(value.removed, true);
  });
}
