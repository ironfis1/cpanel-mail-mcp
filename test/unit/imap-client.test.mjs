// Run: npm test. Scripted fake Dovecot; ported from the spike's tests and extended.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { ImapClient, imapDate, quote } from "../../src/imap/client.js";
import { FAKE_PASSWORD, fakeServer, utf8 } from "../helpers/fake-imap.mjs";
import { repoFile } from "../helpers/wrangler-config.mjs";

async function open(options, { login = true } = {}) {
  const srv = fakeServer(options);
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  await client.opened();
  await client.greeting();
  if (login) {
    await client.login("mcptest@example.test", FAKE_PASSWORD);
    await client.capability();
  }
  return { srv, client };
}

test("REQ-4-1: the client runs on cloudflare:sockets and imapflow is not a dependency", () => {
  assert.match(readFileSync(repoFile("src/imap/cloudflare.js"), "utf8"), /from "cloudflare:sockets"/);
  assert.match(readFileSync(repoFile("src/index.js"), "utf8"), /imap\/cloudflare\.js/);
  const pkg = JSON.parse(readFileSync(repoFile("package.json"), "utf8"));
  assert.ok(!("imapflow" in { ...pkg.dependencies, ...pkg.devDependencies }));
  for (const file of readdirSync(repoFile("src"), { recursive: true }).filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(readFileSync(repoFile(`src/${file}`), "utf8"), /from "imapflow"/, file);
  }
});

test("REQ-4-2: login is AUTHENTICATE PLAIN with an initial response, so the password needs no escaping", async () => {
  const { srv } = await open();
  const [command] = srv.commands;
  assert.match(command, /^AUTHENTICATE PLAIN [A-Za-z0-9+/=]+$/);
  assert.ok(!command.includes(FAKE_PASSWORD));
  const raw = Uint8Array.from(atob(command.slice(19)), (c) => c.charCodeAt(0));
  assert.equal(new TextDecoder().decode(raw), `\0mcptest@example.test\0${FAKE_PASSWORD}`);
});

for (const literalPlus of [true, false]) {
  test(`REQ-4-3 REQ-4-6 REQ-14-7: full command sequence with LITERAL+ ${literalPlus ? "on" : "off"}`, async () => {
    const { srv, client } = await open({ literalPlus });
    assert.equal(client.capabilities.has("LITERAL+"), literalPlus);

    const folders = await client.list();
    assert.equal(folders.find((f) => f.specialUse === "\\Drafts").path, "INBOX.Drafts");
    assert.equal(folders.find((f) => f.specialUse === "\\Sent").path, "INBOX.Sent");

    assert.deepEqual(await client.select("INBOX"), { exists: 2, uidValidity: "1730000000" });
    assert.deepEqual(await client.uidSearch(`SINCE ${imapDate(new Date(Date.UTC(2026, 10, 2)))}`), [5, 7]);
    assert.ok(srv.commands.includes("UID SEARCH SINCE 2-Nov-2026"));

    const message = await client.uidFetchHeaders(7);
    assert.equal(message.headers["message-id"], "<orig-1@example.com>");
    assert.equal(message.headers.references, "<root@example.com> <fold@example.com>");
    assert.deepEqual(message.flags, ["\\Seen"]);

    const text = "Subject: Re: é\r\n\r\nbody\r\n";
    const appended = await client.append("INBOX.Drafts", text, ["\\Draft", "\\Seen"]);
    assert.deepEqual(appended, { uidValidity: "1730000000", uid: 9 });
    const sent = srv.commands.find((c) => c.startsWith("APPEND"));
    const size = utf8(text).length;
    assert.equal(sent, `APPEND "INBOX.Drafts" (\\Draft \\Seen) {${size}${literalPlus ? "+" : ""}}`);
    assert.equal(srv.literals[0].length, size);

    await client.uidStore(7, "+", ["\\Flagged"]);
    assert.ok(srv.commands.includes("UID STORE 7 +FLAGS.SILENT (\\Flagged)"));
    await client.logout();
  });
}

test("REQ-4-3: a refused APPEND with LITERAL+ off fails instead of sending the message", async () => {
  const { srv, client } = await open({
    literalPlus: false,
    respond: (tag, cmd) => (cmd.startsWith("APPEND") ? `${tag} NO [OVERQUOTA] Quota exceeded\r\n` : undefined),
  });
  await assert.rejects(client.append("INBOX.Drafts", "x\r\n"), (e) => e.code === "command" && e.status === "NO");
  assert.equal(srv.literals.length, 0);
  assert.deepEqual(await client.select("INBOX"), { exists: 2, uidValidity: "1730000000" });
});

test("REQ-4-3: a NO on SELECT is a command error and the session stays usable", async () => {
  const { client } = await open();
  await assert.rejects(client.select("Missing"), (e) => e.code === "command" && e.status === "NO");
  assert.equal(client.broken, false);
  assert.deepEqual(await client.select("INBOX"), { exists: 2, uidValidity: "1730000000" });
});

test("REQ-4-3: arguments cannot smuggle a second command", async () => {
  const { srv, client } = await open();
  const before = srv.commands.length;
  await assert.rejects(client.select('INBOX"\r\nA9 LOGOUT'), (e) => e.code === "invalid");
  await assert.rejects(client.uidSearch("ALL\r\nA9 LOGOUT"), (e) => e.code === "invalid");
  await assert.rejects(client.uidFetch("1 (x)", "UID"), (e) => e.code === "invalid");
  await assert.rejects(client.uidStore(1, "+", ["\\Seen)\r\nA9 LOGOUT"]), (e) => e.code === "invalid");
  await assert.rejects(client.move("1\r\n", "INBOX.Trash"), (e) => e.code === "invalid");
  assert.equal(srv.commands.length, before);
  assert.equal(quote('a"b\\c'), '"a\\"b\\\\c"');
});

test("REQ-4-4: CAPABILITY replaces the greeting's list with the post-login one", async () => {
  const { srv, client } = await open({ caps: "MOVE UIDPLUS" }, { login: false });
  assert.equal(client.capabilities.has("MOVE"), false);
  await client.login("mcptest@example.test", FAKE_PASSWORD);
  const capabilities = await client.capability();
  assert.ok(capabilities.includes("MOVE") && capabilities.includes("UIDPLUS") && capabilities.includes("SPECIAL-USE"));
  assert.ok(srv.commands.includes("CAPABILITY"));
});

test("REQ-4-4: FETCH BODYSTRUCTURE returns a part tree with section numbers", async () => {
  const { client } = await open();
  const tree = await client.uidFetchBodyStructure(7);
  assert.equal(tree.subtype, "mixed");
  assert.deepEqual(tree.parts.map((p) => p.part), ["1", "2", "3"]);
  assert.deepEqual(tree.parts[0].parts.map((p) => [p.part, p.subtype]), [["1.1", "plain"], ["1.2", "html"]]);
  assert.equal(tree.parts[1].message.subtype, "plain");
  assert.equal(tree.parts[1].message.part, "2.1");
  const attachment = tree.parts[2];
  assert.equal(attachment.encoding, "base64");
  assert.equal(attachment.size, 2048);
  assert.equal(attachment.params.name, 'a "b".bin', "escaped quoted string");
  assert.deepEqual(attachment.disposition, { type: "attachment", params: { filename: "odd.bin" } }, "literal parameter");
});

test("REQ-4-4: a partial fetch uses BODY.PEEK with an origin and returns only those bytes", async () => {
  const { srv, client } = await open();
  const bytes = await client.uidFetchPartial(7, "1.2", 1024, 512);
  assert.ok(srv.commands.includes("UID FETCH 7 (UID BODY.PEEK[1.2]<1024.512>)"));
  assert.equal(bytes.length, 512);
  await assert.rejects(client.uidFetchPartial(7, "1", -1, 5), (e) => e.code === "invalid");
});

test("REQ-4-5: move uses UID MOVE when the host advertises MOVE", async () => {
  const { srv, client } = await open({ caps: "MOVE UIDPLUS" });
  assert.deepEqual(await client.move(7, "INBOX.Archive"), { uidValidity: "1730000001", uid: 42 });
  assert.ok(srv.commands.includes('UID MOVE 7 "INBOX.Archive"'));
  assert.ok(!srv.commands.some((c) => c.startsWith("UID COPY")));
});

test("REQ-4-5: without MOVE, move is UID COPY, STORE \\Deleted, then UID EXPUNGE on that UID", async () => {
  const { srv, client } = await open({ caps: "UIDPLUS" });
  assert.deepEqual(await client.move(7, "INBOX.Archive"), { uidValidity: "1730000001", uid: 42 });
  assert.deepEqual(srv.commands.slice(-3), [
    'UID COPY 7 "INBOX.Archive"',
    "UID STORE 7 +FLAGS.SILENT (\\Deleted)",
    "UID EXPUNGE 7",
  ]);
});

test("REQ-4-5: with neither MOVE nor UIDPLUS, move refuses and sends nothing", async () => {
  const { srv, client } = await open({ caps: "" });
  const before = srv.commands.length;
  await assert.rejects(client.move(7, "INBOX.Archive"), (e) => e.code === "unsupported");
  await assert.rejects(client.uidExpunge(7), (e) => e.code === "unsupported");
  assert.equal(srv.commands.length, before);
  assert.ok(!srv.commands.some((c) => /^EXPUNGE/.test(c)));
});

test("REQ-4-6 REQ-14-7: a literal mailbox name from LIST is read and can be selected", async () => {
  const { srv, client } = await open();
  const folders = await client.list();
  const odd = folders.find((f) => f.path === "INBOX.Odd Name");
  assert.ok(odd, "literal mailbox name parsed");
  assert.equal(odd.delimiter, ".");
  assert.equal(folders.find((f) => f.path === 'Quo"ted').delimiter, null);
  await client.select(odd.path);
  assert.ok(srv.commands.includes('SELECT "INBOX.Odd Name"'));
});

test("REQ-4-6: every response parses when the server's bytes arrive one at a time", async () => {
  const { client } = await open({ chunkSize: 1 });
  assert.ok((await client.list()).some((f) => f.path === "INBOX.Odd Name"));
  assert.equal((await client.uidFetchHeaders(7)).headers.subject, "=?UTF-8?B?UXVpY2s=?=");
  assert.equal((await client.uidFetchBodyStructure(7)).parts[2].disposition.params.filename, "odd.bin");
});

test("REQ-4-6: a 1 MB literal keeps its exact bytes across split network chunks", async () => {
  const payload = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)).repeat(4000);
  const { client } = await open({ large: payload, chunkSize: 1021 });
  const [message] = await client.uidFetch(7, "UID BODY.PEEK[]");
  assert.equal(message.sections[""].length, payload.length);
  assert.deepEqual([...message.sections[""].subarray(0, 256)], Array.from({ length: 256 }, (_, i) => i));
});

test("REQ-4-3: unsolicited FETCH lines without a UID are ignored", async () => {
  const { client } = await open();
  const messages = await client.uidFetch(7, "UID FLAGS");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].uid, 7);
});

test("REQ-4-12 REQ-14-7: a bad password fails with code auth and no server text or password", async () => {
  const { client } = await open({}, { login: false });
  await assert.rejects(client.login("mcptest@example.test", "wrong-secret-value"), (error) => {
    assert.equal(error.code, "auth");
    assert.ok(!error.message.includes("wrong-secret-value"));
    assert.ok(!error.message.includes("AUTHENTICATIONFAILED"));
    return true;
  });
});

test("REQ-4-3: a bad greeting is refused", async () => {
  const srv = fakeServer({ silent: "greeting" });
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  srv.send("* BYE too many connections\r\n");
  await assert.rejects(client.greeting(), (e) => e.code === "protocol");
});

test("REQ-4-3: a dropped connection is reported, not hung", async () => {
  const srv = fakeServer({ silent: /^SELECT/ });
  const socket = srv.connect({ hostname: "h", port: 993 });
  const client = new ImapClient(socket);
  await client.greeting();
  const pending = client.select("INBOX");
  await socket.close();
  await assert.rejects(pending, (e) => e.code === "connection");
  assert.equal(client.broken, true);
});
