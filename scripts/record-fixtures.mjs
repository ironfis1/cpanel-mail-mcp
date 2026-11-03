#!/usr/bin/env node
// Records real server responses from both mcptest mailboxes into test/fixtures/imap/<host>/ for the
// parser tests (REQ-14-6). Scott runs it locally; see the README for the exact commands.
//
// Passwords come from environment variables named after the staging secrets and are never written.
// Only server bytes are recorded, never what the client sent. The script fetches nothing except a
// synthetic message it appends and then removes, so no mail content reaches the fixtures. Before
// writing, every recording is checked for the credentials and the live addresses; on a hit nothing
// is written.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { Duplex } from "node:stream";
import { once } from "node:events";
import { join } from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { ImapClient } from "../src/imap/client.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const LARGE_BYTES = 262_144;
export const FIXTURE_MESSAGE_ID = "<fixture-1@cpanel-mail-mcp.invalid>";

// Exercises shapes the prototype did not see: nested multipart, message/rfc822, an escaped quoted
// parameter, an RFC 2231 parameter, 8-bit text and a large part.
export function fixtureMessage() {
  const line = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0";
  const large = Array.from({ length: Math.ceil(LARGE_BYTES / (line.length + 2)) }, () => line).join("\r\n");
  return [
    "From: Fixture Sender <fixture@example.invalid>",
    'To: "Fixture, Recipient" <fixture@example.invalid>',
    "Subject: =?UTF-8?B?Rml4dHVyZSDDqSBzdWJqZWN0?=",
    "Date: Mon, 02 Nov 2026 12:00:00 +0000",
    `Message-ID: ${FIXTURE_MESSAGE_ID}`,
    "References: <root@example.invalid>",
    "\t<fold@example.invalid>",
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="outer"',
    "",
    "--outer",
    'Content-Type: multipart/alternative; boundary="inner"',
    "",
    "--inner",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    "Fixture body é ü 日本語",
    "--inner",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "<p>Fixture =C3=A9</p>",
    "--inner--",
    "--outer",
    "Content-Type: message/rfc822",
    "",
    "From: inner@example.invalid",
    "Subject: Inner message",
    "",
    "inner body",
    "--outer",
    'Content-Type: application/octet-stream; name="a \\"quoted\\" name.bin"',
    "Content-Transfer-Encoding: base64",
    "Content-Disposition: attachment; filename*=UTF-8''caf%C3%A9.bin",
    "",
    large,
    "--outer--",
    "",
  ].join("\r\n");
}

// Tees the server's bytes into whichever step is current.
function recordingSocket(socket) {
  const recorder = { current: [], steps: [] };
  const readable = socket.readable.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        recorder.current.push(chunk);
        controller.enqueue(chunk);
      },
    }),
  );
  recorder.socket = { opened: socket.opened, readable, writable: socket.writable, close: () => socket.close() };
  return recorder;
}

// The call sequence. The replay test runs this same function, so client tags line up.
export async function runSequence(client, user, password, step = (_name, work) => work()) {
  const out = {};
  out.greeting = await step("greeting", () => client.greeting());
  await step("login", () => client.login(user, password));
  out.capabilities = await step("capability", () => client.capability());
  out.folders = await step("list", () => client.list());
  const path = (flag) => out.folders.find((f) => f.specialUse === flag).path;
  const drafts = path("\\Drafts");
  const trash = path("\\Trash");

  out.selected = await step("select-drafts", () => client.select(drafts));
  out.appended = await step("append", () => client.append(drafts, fixtureMessage(), ["\\Draft", "\\Seen"]));
  const criteria = `HEADER Message-ID "${FIXTURE_MESSAGE_ID}"`;
  await step("reselect-drafts", () => client.select(drafts));
  out.found = await step("search", () => client.uidSearch(criteria));
  const uid = out.appended.uid;
  out.headers = await step("fetch-headers", () => client.uidFetchHeaders(uid));
  out.metadata = await step("fetch-metadata", () => client.uidFetch(uid, "UID FLAGS INTERNALDATE RFC822.SIZE"));
  out.structure = await step("fetch-bodystructure", () => client.uidFetchBodyStructure(uid));
  out.full = await step("fetch-full", () => client.uidFetch(uid, "UID BODY.PEEK[]"));
  out.partial = await step("fetch-partial", () => client.uidFetchPartial(uid, "3", 0, 1024));
  await step("store-flag", () => client.uidStore(uid, "+", ["\\Flagged"]));
  out.moved = await step("move", () => client.move(uid, trash));
  await step("select-trash", () => client.select(trash));
  const inTrash = await step("search-trash", () => client.uidSearch(criteria));
  await step("store-deleted", () => client.uidStore(inTrash.join(","), "+", ["\\Deleted"]));
  await step("expunge", () => client.uidExpunge(inTrash.join(",")));
  out.afterExpunge = await step("search-removed", () => client.uidSearch(criteria));
  await step("logout", () => client.logout());
  return out;
}

export function forbiddenStrings(user, password, liveAddresses) {
  const plain = Buffer.from(`\0${user}\0${password}`).toString("base64");
  return [password, plain, ...liveAddresses, "sreasinger@gmail.com"];
}

export async function recordMailbox(connect, mailbox, password) {
  const raw = connect({ hostname: mailbox.host, port: mailbox.port }, { secureTransport: "on", allowHalfOpen: false });
  const recorder = recordingSocket(raw);
  const client = new ImapClient(recorder.socket);
  try {
    await client.opened();
    await runSequence(client, mailbox.id, password, async (name, work) => {
      const value = await work();
      recorder.steps.push({ name, bytes: Buffer.concat(recorder.current.map((c) => Buffer.from(c))) });
      recorder.current = [];
      return value;
    });
    return recorder.steps;
  } finally {
    await client.close();
  }
}

export async function record({ connect, env, outDir, mailboxes, liveAddresses }) {
  for (const { id } of mailboxes) {
    if (!id.startsWith("mcptest@")) throw new Error(`refusing to record ${id}: not a test mailbox`);
  }
  const missing = mailboxes.map((m) => m.secret_ref).filter((name) => !env[name]);
  if (missing.length) throw new Error(`set these environment variables first: ${missing.join(", ")}`);

  const recordings = [];
  for (const mailbox of mailboxes) {
    const password = env[mailbox.secret_ref];
    const steps = await recordMailbox(connect, mailbox, password);
    const forbidden = forbiddenStrings(mailbox.id, password, liveAddresses);
    for (const { name, bytes } of steps) {
      const text = bytes.toString("latin1");
      const utf8 = bytes.toString("utf8");
      forbidden.forEach((value, index) => {
        if (text.includes(value) || utf8.includes(value)) {
          throw new Error(`step ${name} on ${mailbox.host} holds forbidden string #${index}; nothing written`);
        }
      });
    }
    recordings.push({ mailbox, steps });
  }

  for (const { mailbox, steps } of recordings) {
    const dir = join(outDir, mailbox.host.split(".")[0]);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    steps.forEach(({ name, bytes }, index) => {
      writeFileSync(join(dir, `${String(index).padStart(2, "0")}-${name}.imap`), bytes);
    });
    console.log(`${mailbox.host}: ${steps.length} responses recorded in ${dir}`);
  }
}

function nodeConnect({ hostname, port }) {
  const socket = tls.connect({ host: hostname, port, servername: hostname });
  socket.setTimeout(60_000, () => socket.destroy(new Error("socket idle for 60 s")));
  const { readable, writable } = Duplex.toWeb(socket);
  return {
    opened: once(socket, "secureConnect"),
    readable,
    writable,
    close: async () => socket.destroy(),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { env } = parse(readFileSync(join(ROOT, "wrangler.toml"), "utf8"));
  record({
    connect: nodeConnect,
    env: process.env,
    outDir: join(ROOT, "test/fixtures/imap"),
    mailboxes: env.staging.vars.MAILBOXES,
    liveAddresses: env.production.vars.MAILBOXES.map((m) => m.id),
  }).catch((error) => {
    console.error(`record-fixtures failed: ${error.message}`);
    process.exitCode = 1;
  });
}
