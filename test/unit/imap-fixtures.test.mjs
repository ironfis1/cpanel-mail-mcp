// Parser tests against responses recorded from the real hosts by scripts/record-fixtures.mjs.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixtureMessage, FIXTURE_MESSAGE_ID, LARGE_BYTES, record, runSequence } from "../../scripts/record-fixtures.mjs";
import { ImapClient } from "../../src/imap/client.js";
import { FAKE_PASSWORD, fakeServer, replayConnect } from "../helpers/fake-imap.mjs";
import { repoFile } from "../helpers/wrangler-config.mjs";

const loadRecordings = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".imap"))
    .sort()
    .map((name) => new Uint8Array(readFileSync(join(dir, name))));

async function replay(dir) {
  const client = new ImapClient(replayConnect(loadRecordings(dir))());
  return runSequence(client, "mcptest@replay.invalid", "unused");
}

const NOT_RECORDED = "no recorded fixtures yet: Scott runs scripts/record-fixtures.mjs (see README)";

for (const host of ["server128", "server223"]) {
  const dir = new URL(`../fixtures/imap/${host}/`, import.meta.url);
  const skip = existsSync(dir) ? false : NOT_RECORDED;

  test(`REQ-14-6: recorded ${host} session replays through the client`, { skip }, async () => {
    const out = await replay(dir);
    assert.match(out.greeting, /^\* OK/);
    assert.ok(out.capabilities.includes("IMAP4REV1"));
    assert.ok(out.folders.some((f) => f.path === "INBOX"));
    assert.deepEqual(out.found, [out.appended.uid]);
    assert.deepEqual(out.afterExpunge, []);
  });

  test(`REQ-14-6: recorded ${host} large literal keeps the exact message bytes`, { skip }, async () => {
    const { full } = await replay(dir);
    const expected = new TextEncoder().encode(fixtureMessage());
    assert.ok(expected.length > LARGE_BYTES);
    assert.equal(full[0].sections[""].length, expected.length);
    assert.deepEqual(Buffer.from(full[0].sections[""]).equals(Buffer.from(expected)), true);
  });

  test(`REQ-14-6: recorded ${host} unusual FETCH shapes parse`, { skip }, async () => {
    const { headers, metadata, structure, partial } = await replay(dir);
    assert.equal(headers.headers["message-id"], FIXTURE_MESSAGE_ID);
    assert.equal(headers.headers.references, "<root@example.invalid> <fold@example.invalid>");
    assert.ok(metadata[0].size > LARGE_BYTES);
    assert.ok(metadata[0].internalDate);

    assert.equal(structure.subtype, "mixed");
    const [alternative, attached, binary] = structure.parts;
    assert.deepEqual(alternative.parts.map((p) => [p.part, p.subtype]), [["1.1", "plain"], ["1.2", "html"]]);
    assert.equal(attached.subtype, "rfc822");
    assert.equal(attached.message.subtype, "plain");
    assert.equal(binary.part, "3");
    assert.equal(binary.params.name, 'a "quoted" name.bin');
    assert.equal(binary.encoding, "base64");
    assert.equal(partial.length, 1024);
  });

  test(`REQ-14-6: recorded ${host} fixtures hold no credentials or live mailbox data`, { skip }, () => {
    const live = ["scott@reasinger.net", "scott@yourcigardenindy.com", "founders@yourcigardenindy.com", "sreasinger@gmail.com"];
    for (const name of readdirSync(dir)) {
      const text = readFileSync(new URL(name, dir), "latin1");
      for (const address of live) assert.ok(!text.includes(address), `${name} names ${address}`);
      assert.doesNotMatch(text, /AUTHENTICATE PLAIN/, name);
    }
  });
}

// The recorder itself, exercised without a network or a real password.
function withTemp(fn) {
  const dir = mkdtempSync(join(tmpdir(), "imap-fixtures-"));
  return Promise.resolve(fn(dir)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

const MAILBOX = { id: "mcptest@example.test", host: "fake1.example.test", port: 993, secret_ref: "PASS" };
const quiet = async (fn) => {
  const original = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = original;
  }
};
const server = () =>
  fakeServer({
    respond: (tag, cmd) => (/^UID SEARCH HEADER/.test(cmd) ? `* SEARCH 9\r\n${tag} OK Search completed\r\n` : undefined),
  });

test("REQ-14-6: the recorder writes server bytes only, never the password or client commands", () =>
  withTemp(async (outDir) => {
    const srv = server();
    await quiet(() =>
      record({ connect: srv.connect, env: { PASS: FAKE_PASSWORD }, outDir, mailboxes: [MAILBOX], liveAddresses: [] }),
    );
    const dir = join(outDir, "fake1");
    const files = readdirSync(dir);
    assert.ok(files.length > 10);
    assert.ok(files[0].endsWith("greeting.imap"));
    const encoded = Buffer.from(`\0${MAILBOX.id}\0${FAKE_PASSWORD}`).toString("base64");
    for (const name of files) {
      const text = readFileSync(join(dir, name), "latin1");
      assert.ok(!text.includes(FAKE_PASSWORD) && !text.includes(encoded), name);
      assert.doesNotMatch(text, /AUTHENTICATE/, name);
    }
    assert.ok(srv.commands.includes("LOGOUT"));
  }));

for (const literalPlus of [true, false]) {
  test(`REQ-14-6: a recording replays through the same call sequence with LITERAL+ ${literalPlus ? "on" : "off"}`, () =>
    withTemp(async (outDir) => {
      const srv = fakeServer({
        literalPlus,
        respond: (tag, cmd) => (/^UID SEARCH HEADER/.test(cmd) ? `* SEARCH 9\r\n${tag} OK Search completed\r\n` : undefined),
      });
      await quiet(() =>
        record({ connect: srv.connect, env: { PASS: FAKE_PASSWORD }, outDir, mailboxes: [MAILBOX], liveAddresses: [] }),
      );
      const out = await replay(join(outDir, "fake1"));
      assert.match(out.greeting, /^\* OK/);
      assert.equal(out.appended.uid, 9);
      assert.ok(out.capabilities.includes("MOVE"));
    }));
}

test("REQ-14-6: the recorder refuses anything but a test mailbox, without connecting", () =>
  withTemp(async (outDir) => {
    const srv = server();
    const mailboxes = [{ ...MAILBOX, id: "scott@example.test" }];
    await assert.rejects(
      record({ connect: srv.connect, env: { PASS: "x" }, outDir, mailboxes, liveAddresses: [] }),
      /not a test mailbox/,
    );
    assert.equal(srv.connections.length, 0);
  }));

test("REQ-14-6: the recorder names a missing variable without connecting", () =>
  withTemp(async (outDir) => {
    const srv = server();
    await assert.rejects(
      record({ connect: srv.connect, env: {}, outDir, mailboxes: [MAILBOX], liveAddresses: [] }),
      /set these environment variables first: PASS/,
    );
    assert.equal(srv.connections.length, 0);
  }));

test("REQ-14-6: the recorder writes nothing if a response holds a live address", () =>
  withTemp(async (outDir) => {
    const srv = server();
    await assert.rejects(
      record({
        connect: srv.connect,
        env: { PASS: FAKE_PASSWORD },
        outDir,
        mailboxes: [MAILBOX],
        liveAddresses: ["Dovecot ready"],
      }),
      /forbidden string/,
    );
    assert.deepEqual(readdirSync(outDir), []);
  }));

test("REQ-14-6: fixture files are kept byte-exact by git", () => {
  assert.match(readFileSync(repoFile(".gitattributes"), "utf8"), /^test\/fixtures\/imap\/\*\* -text$/m);
});
