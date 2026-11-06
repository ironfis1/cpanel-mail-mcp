// Staging only, behind STAGING_TOKEN, so the integration suite can run the client against the real
// hosts. Removed with STAGING_TOKEN in C6. Writes a synthetic message and removes it again, so it
// refuses any mailbox that is not a dedicated test mailbox.
import { loadRegistry } from "./accounts.js";
import { translateFilter } from "./filter.js";
import { LOGICAL_NAMES } from "./folders.js";
import { quote } from "./imap/client.js";
import { RequestSessions } from "./imap/session.js";
import { readBody, readMetadata, readSnippets } from "./tools/messages.js";

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

const filterMessage = (from, subject) =>
  ["From: " + from, "To: mcptest@example.invalid", "Subject: " + subject, "Date: Mon, 02 Nov 2026 12:00:00 +0000", "", "filter check", ""].join("\r\n");

// Appends synthetic senders, runs real searches through the translator, and removes them again.
async function filterCheck(client, drafts) {
  const mark = crypto.randomUUID();
  const daemon = await client.append(drafts, filterMessage('"MAILER-DAEMON" <bounces@example.invalid>', `daemon ${mark}`), ["\\Draft"]);
  const postmaster = await client.append(drafts, filterMessage("postmaster@example.invalid", `=?UTF-8?B?${btoa("caf\u00c3\u00a9")}?= ${mark}`), ["\\Draft", "\\Seen"]);
  const uids = [daemon.uid, postmaster.uid];
  try {
    await client.select(drafts);
    const matched = async (filter) => {
      const found = await client.uidSearch(translateFilter(filter));
      return { daemon: found.includes(daemon.uid), postmaster: found.includes(postmaster.uid) };
    };
    return {
      fromDaemon: await matched("from:mailer-daemon newer_than:3d"),
      fromPostmaster: await matched("from:postmaster newer_than:3d"),
      olderThan: await matched("from:mailer-daemon older_than:3d"),
      subjectAnd: await matched(`subject:daemon subject:${mark}`),
      nonAscii: await matched(`subject:caf\u00e9 subject:${mark}`),
      unread: await matched(`is:unread subject:${mark}`),
      read: await matched(`is:read subject:${mark}`),
      bareWord: await matched(`${mark} filter`),
    };
  } finally {
    await client.uidStore(uids.join(","), "+", ["\\Deleted"]);
    await client.uidExpunge(uids.join(","));
  }
}

const datedMessage = (date, mark) =>
  ["From: mcptest@example.invalid", "To: mcptest@example.invalid", `Subject: sort ${mark}`, `Date: ${date}`, "", "sort check", ""].join("\r\n");

function reportMessage(mark) {
  const boundary = "cpanel-mail-mcp-report";
  return [
    "From: MAILER-DAEMON@example.invalid",
    "To: mcptest@example.invalid",
    `Subject: report ${mark}`,
    "Date: Mon, 02 Nov 2026 12:00:00 +0000",
    "MIME-Version: 1.0",
    `Content-Type: multipart/report; report-type=delivery-status; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "The mail system could not deliver your message.",
    `--${boundary}`,
    "Content-Type: message/delivery-status",
    "",
    "Reporting-MTA: dns; example.invalid",
    "",
    "Final-Recipient: rfc822; gone@example.invalid",
    "Action: failed",
    "Diagnostic-Code: smtp; 550 no such user",
    `--${boundary}`,
    "Content-Type: message/rfc822",
    "",
    "From: mcptest@example.invalid",
    "To: gone@example.invalid",
    "Subject: embedded original",
    "Date: Sun, 01 Nov 2026 12:00:00 +0000",
    "",
    "EMBEDDED BODY",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

// Appends messages whose UIDs run against their dates and a delivery report, reads them the way the
// tools do, and removes them again.
async function readCheck(client, drafts) {
  const mark = crypto.randomUUID();
  const newer = await client.append(drafts, datedMessage("Tue, 03 Nov 2026 12:00:00 +0000", mark), ["\\Draft", "\\Seen"]);
  const older = await client.append(drafts, datedMessage("Sun, 01 Nov 2026 12:00:00 +0000", mark), ["\\Draft", "\\Seen"]);
  const report = await client.append(drafts, reportMessage(mark), ["\\Draft", "\\Seen"]);
  const uids = [newer.uid, older.uid, report.uid];
  try {
    await client.select(drafts);
    const descending = await client.uidSort(`SUBJECT ${quote(`sort ${mark}`)}`);
    const ascending = await client.uidSort(`SUBJECT ${quote(`sort ${mark}`)}`, { reverse: false });
    const [meta] = await readMetadata(client, [report.uid]);
    const snippets = await readSnippets(client, [meta]);
    return {
      sortedNewestFirst: descending.join() === [newer.uid, older.uid].join(),
      sortedOldestFirst: ascending.join() === [older.uid, newer.uid].join(),
      snippet: snippets[report.uid],
      body: await readBody(client, meta),
    };
  } finally {
    await client.uidStore(uids.join(","), "+", ["\\Deleted"]);
    await client.uidExpunge(uids.join(","));
  }
}

async function check(client) {
  const capabilities = [...client.capabilities].sort();
  const folders = await client.list();
  const logical = Object.fromEntries(LOGICAL_NAMES.map((name) => [name, client.folders.path(name)]));
  const drafts = logical.Drafts;
  const trash = logical.Trash;

  const inbox = await client.select(logical.Inbox);
  const filters = await filterCheck(client, drafts);
  const reads = await readCheck(client, drafts);
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
    logical,
    filters,
    reads,
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

// Staging diagnostic for design risk R2 (docs/design.md): the cPanel hosts may refuse logins from
// some Cloudflare egress IPs. Opens a socket the same way the IMAP client does and asks an IP echo
// service which address it came from. Returns the address, or null on any failure or after 5 s.
// The egress address can differ between connections, so this is evidence, not proof.
const IP = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7})$/i;

export async function egressIp(connect, { timeoutMs = 5000 } = {}) {
  let socket;
  let timer;
  try {
    socket = connect({ hostname: "api.ipify.org", port: 443 }, { secureTransport: "on", allowHalfOpen: false });
    const work = (async () => {
      const writer = socket.writable.getWriter();
      await writer.write(
        new TextEncoder().encode("GET / HTTP/1.1\r\nHost: api.ipify.org\r\nUser-Agent: cpanel-mail-mcp-staging\r\nConnection: close\r\n\r\n"),
      );
      writer.releaseLock();
      const reader = socket.readable.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (text.length < 8192) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      const body = text.split("\r\n\r\n").slice(1).join("\r\n\r\n");
      return body.split(/\s+/).find((line) => IP.test(line)) ?? null;
    })();
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    return await Promise.race([work.catch(() => null), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    try {
      await socket?.close();
    } catch {
      // Nothing to do; the address is already read or given up on.
    }
  }
}

// Same entries as RequestSessions.runEach, plus R2 evidence: the egress address seen just before
// the account's session opened, and for a failed account the address seen just after and the
// server's own refusal text. The extra fields exist only on this staging endpoint.
export async function imapCheck(env, connect, { egress = () => egressIp(connect) } = {}) {
  for (const { id } of env.MAILBOXES) {
    if (!id.startsWith("mcptest@")) throw new Error("imap-check runs on test mailboxes only");
  }
  const accounts = loadRegistry(env.MAILBOXES);
  const before = await Promise.all(accounts.map(() => egress()));
  const sessions = new RequestSessions({ connect, env });
  try {
    const results = await sessions.runEach(accounts, check);
    const errors = new Map();
    await Promise.all(
      accounts.map((account) =>
        sessions.run(account, () => null).catch((error) => errors.set(account.id, error)),
      ),
    );
    return await Promise.all(
      results.map(async (result, i) => {
        if (result.ok) return { ...result, egress_ip: before[i] };
        const error = errors.get(result.id);
        return {
          ...result,
          egress_ip: before[i],
          egress_ip_after: await egress(),
          server_text: error?.serverText ?? null,
          response_status: error?.status ?? null,
        };
      }),
    );
  } finally {
    await sessions.closeAll();
  }
}
