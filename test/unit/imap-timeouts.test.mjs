// Silent-server fake with mocked timers, so each step is proved against its exact REQ-4-8 value.
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { ImapClient, TIMEOUTS } from "../../src/imap/client.js";
import { RequestSessions } from "../../src/imap/session.js";
import { account, FAKE_PASSWORD, fakeServer, settle } from "../helpers/fake-imap.mjs";

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

// Asserts the promise is still pending at ms - 1 and rejects as a timeout at ms.
async function timesOutAt(promise, ms) {
  let outcome = "pending";
  promise.then(
    () => (outcome = "resolved"),
    (error) => (outcome = error),
  );
  await settle();
  assert.equal(outcome, "pending", "settled before any time passed");
  mock.timers.tick(ms - 1);
  await settle();
  assert.equal(outcome, "pending", `settled before ${ms} ms`);
  mock.timers.tick(1);
  await settle();
  assert.equal(outcome.code, "timeout", `no timeout at ${ms} ms: ${outcome}`);
  return outcome;
}

async function loggedIn(options) {
  const srv = fakeServer(options);
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  await client.opened();
  await client.greeting();
  await client.login("u", FAKE_PASSWORD);
  await client.capability();
  return { srv, client };
}

test("REQ-4-8: the timeout values are exactly those in the spec", () => {
  assert.deepEqual({ ...TIMEOUTS }, { connect: 10000, greeting: 5000, login: 10000, command: 15000, append: 30000 });
});

test("REQ-4-7 REQ-4-8 REQ-14-7 REQ-14-8: silent TCP and TLS open times out at 10 s", async () => {
  const srv = fakeServer({ silent: "connect" });
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  await timesOutAt(client.opened(), 10000);
});

test("REQ-4-7 REQ-4-8 REQ-14-7 REQ-14-8: silent greeting times out at 5 s", async () => {
  const srv = fakeServer({ silent: "greeting" });
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  await timesOutAt(client.greeting(), 5000);
});

test("REQ-4-7 REQ-4-8 REQ-14-7 REQ-14-8: silent login times out at 10 s", async () => {
  const srv = fakeServer({ silent: /^AUTHENTICATE/ });
  const client = new ImapClient(srv.connect({ hostname: "h", port: 993 }));
  await client.greeting();
  const error = await timesOutAt(client.login("u", FAKE_PASSWORD), 10000);
  assert.ok(!error.message.includes(FAKE_PASSWORD));
});

const COMMANDS = [
  ["CAPABILITY", /^CAPABILITY/, (c) => c.capability()],
  ["LIST", /^LIST/, (c) => c.list()],
  ["SELECT", /^SELECT/, (c) => c.select("INBOX")],
  ["UID SEARCH", /^UID SEARCH/, (c) => c.uidSearch("ALL")],
  ["UID FETCH headers", /^UID FETCH/, (c) => c.uidFetchHeaders(7)],
  ["UID FETCH BODYSTRUCTURE", /^UID FETCH/, (c) => c.uidFetchBodyStructure(7)],
  ["UID FETCH partial", /^UID FETCH/, (c) => c.uidFetchPartial(7, "1", 0, 10)],
  ["UID STORE", /^UID STORE/, (c) => c.uidStore(7, "+", ["\\Seen"])],
  ["UID MOVE", /^UID MOVE/, (c) => c.move(7, "INBOX.Trash")],
  ["UID EXPUNGE", /^UID EXPUNGE/, (c) => c.uidExpunge(7)],
  ["LOGOUT", /^LOGOUT/, (c) => c.logout()],
];

for (const [name, silent, run] of COMMANDS) {
  test(`REQ-4-7 REQ-4-8 REQ-14-7 REQ-14-8: silent ${name} times out at 15 s`, async () => {
    // Login and CAPABILITY must answer so the command under test is the silent one.
    let armed = false;
    const { client } = await loggedIn({
      respond: (tag, cmd) => (armed && silent.test(cmd) ? "" : undefined),
    });
    armed = true;
    await timesOutAt(run(client), 15000);
  });
}

for (const literalPlus of [true, false]) {
  test(`REQ-4-7 REQ-4-8 REQ-14-8: silent APPEND times out at 30 s with LITERAL+ ${literalPlus ? "on" : "off"}`, async () => {
    const { client } = await loggedIn({ literalPlus, silent: /^APPEND/ });
    await timesOutAt(client.append("INBOX.Drafts", "x\r\n"), 30000);
  });
}

test("REQ-4-7: a server that keeps sending but never finishes still times out at 15 s", async () => {
  const { srv, client } = await loggedIn({ silent: /^LIST/ });
  let outcome = "pending";
  client.list().catch((error) => (outcome = error));
  await settle();
  for (let elapsed = 0; elapsed < 14000; elapsed += 1000) {
    srv.send('* LIST () "." INBOX\r\n');
    mock.timers.tick(1000);
    await settle();
  }
  assert.equal(outcome, "pending");
  srv.send('* LIST () "." INBOX\r\n');
  mock.timers.tick(1000);
  await settle();
  assert.equal(outcome.code, "timeout");
});

test("REQ-4-7: closing a socket whose close never finishes is bounded", async () => {
  const srv = fakeServer();
  const socket = srv.connect({ hostname: "h", port: 993 });
  socket.close = () => new Promise(() => {});
  const client = new ImapClient(socket);
  let done = false;
  client.close().then(() => (done = true));
  await settle();
  assert.equal(done, false);
  mock.timers.tick(15000);
  await settle();
  assert.equal(done, true);
});

test("REQ-4-7: after a timeout the broken session sends nothing more", async () => {
  const { srv, client } = await loggedIn({ silent: /^LIST/ });
  await timesOutAt(client.list(), 15000);
  assert.equal(client.broken, true);
  const before = srv.commands.length;
  await assert.rejects(client.select("INBOX"), (e) => e.code === "timeout");
  assert.equal(srv.commands.length, before);
});

test("REQ-4-9 REQ-14-8: a timeout fails that account loudly and the other host still answers", async () => {
  const silent = fakeServer({ silent: "greeting" });
  const healthy = fakeServer();
  const connect = (address, options) =>
    address.hostname === "silent.test" ? silent.connect(address, options) : healthy.connect(address, options);
  const sessions = new RequestSessions({ connect, env: { IMAP_PASS_TEST: FAKE_PASSWORD } });
  const accounts = [account("a@silent.test", "silent.test"), account("b@healthy.test", "healthy.test")];

  let results;
  sessions.runEach(accounts, (client) => client.select("INBOX")).then((r) => (results = r));
  await settle();
  assert.equal(results, undefined);
  mock.timers.tick(5000);
  await settle();

  assert.equal(results[0].id, "a@silent.test");
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, "timeout");
  assert.match(results[0].error, /greeting timed out after 5000 ms/);
  assert.deepEqual(results[1], { id: "b@healthy.test", ok: true, value: { exists: 2, uidValidity: "1730000000" } });
  assert.equal(silent.sockets[0].closed, true, "the timed-out socket is closed");
});

test("REQ-4-9: an account that timed out stays failed for the request without a second connection", async () => {
  const srv = fakeServer({ silent: /^SELECT/ });
  const sessions = new RequestSessions({ connect: srv.connect, env: { IMAP_PASS_TEST: FAKE_PASSWORD } });
  const one = account("a@x.test", "x.test");

  const first = sessions.run(one, (client) => client.select("INBOX"));
  await timesOutAt(first, 15000);
  await assert.rejects(sessions.run(one, (client) => client.list()), (e) => e.code === "timeout");
  assert.equal(srv.connections.length, 1);
  assert.equal(srv.sockets[0].closed, true);
});
