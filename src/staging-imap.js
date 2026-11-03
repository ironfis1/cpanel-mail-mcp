// Staging only, behind STAGING_TOKEN, so the integration suite can run the client against the real
// hosts. Removed with STAGING_TOKEN in C6. Writes a synthetic message and removes it again, so it
// refuses any mailbox that is not a dedicated test mailbox.
import { quote } from "./imap/client.js";
import { RequestSessions } from "./imap/session.js";

const LARGE_BYTES = 200_000;

function testMessage(messageId) {
  const boundary = "cpanel-mail-mcp-check";
  const body = Array.from({ length: Math.ceil(LARGE_BYTES / 78) }, () => "A".repeat(76)).join("\r\n");
  return [
    "From: mcptest@example.invalid",
    "To: mcptest@example.invalid",
    "Subject: =?UTF-8?B?Y2hlY2sgw6k=?=",
    "Date: Mon, 02 Nov 2026 12:00:00 +0000",
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "integration check",
    `--${boundary}`,
    'Content-Type: application/octet-stream; name="check.bin"',
    "Content-Transfer-Encoding: base64",
    'Content-Disposition: attachment; filename="check.bin"',
    "",
    body,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function check(client) {
  const capabilities = [...client.capabilities].sort();
  const folders = await client.list();
  const path = (flag) => folders.find((f) => f.specialUse === flag)?.path;
  const drafts = path("\\Drafts");
  const trash = path("\\Trash");

  const inbox = await client.select("INBOX");
  const selected = await client.select(drafts);

  const messageId = `<check-${crypto.randomUUID()}@cpanel-mail-mcp.invalid>`;
  const appended = await client.append(drafts, testMessage(messageId), ["\\Draft", "\\Seen"]);
  await client.select(drafts);
  const found = await client.uidSearch(`HEADER Message-ID ${quote(messageId)}`);
  const headers = await client.uidFetchHeaders(appended.uid);
  const structure = await client.uidFetchBodyStructure(appended.uid);
  const partial = await client.uidFetchPartial(appended.uid, "2", 0, 1024);
  await client.uidStore(appended.uid, "+", ["\\Flagged"]);
  const flagged = await client.uidFetchHeaders(appended.uid);
  const moved = await client.move(appended.uid, trash);

  const left = await client.uidSearch(`HEADER Message-ID ${quote(messageId)}`);
  await client.select(trash);
  const inTrash = await client.uidSearch(`HEADER Message-ID ${quote(messageId)}`);
  await client.uidStore(inTrash.join(","), "+", ["\\Deleted"]);
  await client.uidExpunge(inTrash.join(","));
  const removed = await client.uidSearch(`HEADER Message-ID ${quote(messageId)}`);

  return {
    capabilities,
    folders: folders.map(({ path: p, specialUse }) => ({ path: p, specialUse })),
    inboxUidValidity: inbox.uidValidity,
    draftsSelected: selected.uidValidity !== null,
    appended: appended.uid !== null,
    searchFound: found.includes(appended.uid),
    subject: headers.headers.subject,
    structure: {
      subtype: structure.subtype,
      parts: structure.parts.map((p) => ({ part: p.part, type: `${p.type}/${p.subtype}`, size: p.size })),
    },
    partialBytes: partial.length,
    flagged: flagged.flags.includes("\\Flagged"),
    movedOut: left.length === 0,
    movedIn: inTrash.length === 1 && (moved.uid === null || moved.uid === inTrash[0]),
    removed: removed.length === 0,
  };
}

export async function imapCheck(env, connect) {
  for (const { id } of env.MAILBOXES) {
    if (!id.startsWith("mcptest@")) throw new Error("imap-check runs on test mailboxes only");
  }
  const sessions = new RequestSessions({ connect, env });
  try {
    return await sessions.runEach(env.MAILBOXES, check);
  } finally {
    await sessions.closeAll();
  }
}
