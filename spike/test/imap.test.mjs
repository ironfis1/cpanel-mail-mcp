// Run: node --test spike/test/imap.test.mjs
// Scripted fake Dovecot server. Exercises the exact command sequence the spike runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Imap, imapDate, q } from "../src/imap.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

function fakeServer({ literalPlus = true } = {}) {
  let ctrl;
  const readable = new ReadableStream({ start(c) { ctrl = c; } });
  const send = (s) => ctrl.enqueue(enc.encode(s));
  const seen = [];
  let pending = ""; // bytes still owed to an announced literal
  let owed = 0;
  let appendTag = null;
  const header =
    "From: Recruiter <r@example.com>\r\nSubject: Quick question\r\n" +
    "Message-ID: <orig-1@example.com>\r\nReferences: <root@example.com>\r\n\r\n";

  const onLine = (line) => {
    seen.push(line);
    const [tag, ...rest] = line.split(" ");
    const cmd = rest.join(" ");
    let m;
    if (/^AUTHENTICATE PLAIN /.test(cmd)) {
      const b64 = cmd.slice(19);
      const [, user, pass] = atob(b64).split("\u0000");
      if (user === "mcptest@reasinger.net" && pass === 'p"a\\ss') send(`${tag} OK Logged in\r\n`);
      else send(`${tag} NO [AUTHENTICATIONFAILED] Authentication failed.\r\n`);
    } else if (cmd === 'LIST "" "*"') {
      send('* LIST (\\HasNoChildren) "." INBOX\r\n');
      send('* LIST (\\HasNoChildren \\Drafts) "." "INBOX.Drafts"\r\n');
      send('* LIST (\\HasNoChildren \\Sent) "." "INBOX.Sent"\r\n');
      send(`* LIST (\\HasNoChildren) "." {14}\r\nINBOX.Odd Name\r\n`);
      send(`${tag} OK List completed\r\n`);
    } else if (cmd === 'SELECT "INBOX"') {
      send("* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\r\n* 2 EXISTS\r\n* 0 RECENT\r\n");
      send("* OK [UIDVALIDITY 1730000000] UIDs valid\r\n* OK [UIDNEXT 8] Predicted next UID\r\n");
      send(`${tag} OK [READ-WRITE] Select completed\r\n`);
    } else if (/^UID SEARCH SINCE \d+-[A-Z][a-z]{2}-\d{4}$/.test(cmd)) {
      send(`* SEARCH 5 7\r\n${tag} OK Search completed\r\n`);
    } else if (/^UID FETCH 7 /.test(cmd)) {
      send(`* 2 FETCH (UID 7 FLAGS (\\Seen) BODY[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID REFERENCES)] {${header.length}}\r\n${header})\r\n`);
      send(`${tag} OK Fetch completed\r\n`);
    } else if ((m = cmd.match(/^APPEND "INBOX\.Drafts" \(\\Draft \\Seen\) \{(\d+)(\+?)\}$/))) {
      owed = Number(m[1]);
      appendTag = tag;
      if (!m[2]) send("+ OK\r\n");
    } else if (cmd === "UID STORE 7 +FLAGS.SILENT (\\Flagged)") {
      send(`${tag} OK Store completed\r\n`);
    } else if (cmd === "LOGOUT") {
      send(`* BYE Logging out\r\n${tag} OK Logout completed\r\n`);
    } else {
      send(`${tag} BAD Unexpected: ${cmd}\r\n`);
    }
  };

  const writable = new WritableStream({
    write(chunk) {
      pending += dec.decode(chunk);
      for (;;) {
        if (owed > 0) {
          if (pending.length < owed + 2) return;
          seen.push(`<literal ${owed} bytes>`);
          pending = pending.slice(owed + 2); // literal plus trailing CRLF
          owed = 0;
          send(`${appendTag} OK [APPENDUID 1730000000 9] Append completed\r\n`);
          continue;
        }
        const i = pending.indexOf("\r\n");
        if (i < 0) return;
        const line = pending.slice(0, i);
        pending = pending.slice(i + 2);
        onLine(line);
      }
    },
  });
  const caps = literalPlus ? "IMAP4rev1 SASL-IR LITERAL+ AUTH=PLAIN" : "IMAP4rev1 SASL-IR AUTH=PLAIN";
  send(`* OK [CAPABILITY ${caps}] Dovecot ready.\r\n`);
  return { readable, writable, seen };
}

for (const literalPlus of [true, false]) {
  test(`full spike sequence (LITERAL+ ${literalPlus ? "on" : "off"})`, async () => {
    const srv = fakeServer({ literalPlus });
    const c = new Imap(srv, { timeoutMs: 2000 });
    await c.greeting();
    await c.login("mcptest@reasinger.net", 'p"a\\ss');

    const folders = await c.list();
    assert.equal(folders.find((f) => f.specialUse === "\\Drafts").path, "INBOX.Drafts");
    assert.equal(folders.find((f) => f.specialUse === "\\Sent").path, "INBOX.Sent");
    assert.ok(folders.some((f) => f.path === "INBOX.Odd Name"), "literal mailbox name parsed");

    const sel = await c.select("INBOX");
    assert.deepEqual(sel, { exists: 2, uidValidity: "1730000000" });

    const uids = await c.uidSearch(`SINCE ${imapDate(new Date(Date.now() - 7 * 864e5))}`);
    assert.deepEqual(uids, [5, 7]);

    const msg = await c.uidFetchHeaders(7);
    assert.equal(msg.headers["message-id"], "<orig-1@example.com>");
    assert.equal(msg.headers.subject, "Quick question");
    assert.deepEqual(msg.flags, ["\\Seen"]);

    const ap = await c.append("INBOX.Drafts", "Subject: Re: Quick question\r\n\r\nbody\r\n", ["\\Draft", "\\Seen"]);
    assert.deepEqual(ap, { uidValidity: "1730000000", uid: 9 });

    await c.uidStore(7, "+", ["\\Flagged"]);
    await c.logout();
    assert.ok(!srv.seen.some((l) => l.includes("BAD")));
  });
}

test("bad password surfaces a NO, not a hang", async () => {
  const srv = fakeServer();
  const c = new Imap(srv, { timeoutMs: 2000 });
  await c.greeting();
  await assert.rejects(c.login("mcptest@reasinger.net", "wrong"), /AUTHENTICATE failed: NO/);
});

test("silent server times out instead of hanging", async () => {
  const readable = new ReadableStream({ start() {} });
  const writable = new WritableStream({ write() {} });
  const c = new Imap({ readable, writable }, { timeoutMs: 300 });
  await assert.rejects(c.greeting(), /read timeout/);
});

test("quoting", () => {
  assert.equal(q('a"b\\c'), '"a\\"b\\\\c"');
});
