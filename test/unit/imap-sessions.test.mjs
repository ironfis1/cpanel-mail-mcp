import assert from "node:assert/strict";
import { test } from "node:test";
import { RequestSessions } from "../../src/imap/session.js";
import { egressIp, imapCheck } from "../../src/staging-imap.js";
import worker from "../../src/index.js";
import { account, FAKE_PASSWORD, fakeServer } from "../helpers/fake-imap.mjs";

const env = { IMAP_PASS_TEST: FAKE_PASSWORD };
const A = account("a@one.test", "one.test");
const B = account("b@two.test", "two.test");
const C = account("c@two.test", "two.test");

test("REQ-4-10: sessions open lazily: nothing connects until an account is used", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  assert.equal(srv.connections.length, 0);
  await sessions.closeAll();
  assert.equal(srv.connections.length, 0);
});

test("REQ-4-10: one session per account per request, on TLS, reused by later calls", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  await sessions.run(A, (client) => client.list());
  await sessions.run(A, (client) => client.select("INBOX"));
  assert.equal(srv.connections.length, 1);
  assert.deepEqual(srv.connections[0].address, { hostname: "one.test", port: 993 });
  assert.equal(srv.connections[0].socketOptions.secureTransport, "on");
  assert.equal(srv.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 1);
  await sessions.closeAll();
});

test("REQ-4-10: closeAll logs out and closes every session, and a closed request cannot reconnect", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  await sessions.run(A, (client) => client.list());
  await sessions.run(B, (client) => client.list());
  await sessions.closeAll();
  assert.equal(srv.commands.filter((c) => c === "LOGOUT").length, 2);
  assert.ok(srv.sockets.every((socket) => socket.closed));
  await assert.rejects(sessions.run(A, (client) => client.list()));
  assert.equal(srv.connections.length, 2);
});

test("REQ-4-10: closeAll waits for work still running and closes the session it opened", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  const running = sessions.run(A, (client) => client.list());
  await sessions.closeAll();
  await running;
  assert.equal(srv.sockets.length, 1);
  assert.equal(srv.sockets[0].closed, true);
  assert.ok(srv.commands.includes("LOGOUT"));
});

test("REQ-4-10: separate requests get separate sessions, so nothing is pooled", async () => {
  const srv = fakeServer();
  for (let i = 0; i < 2; i++) {
    const sessions = new RequestSessions({ connect: srv.connect, env });
    await sessions.run(A, (client) => client.list());
    await sessions.closeAll();
  }
  assert.equal(srv.connections.length, 2);
});

function tracked() {
  const events = [];
  const gates = new Map();
  const work = (id) => async () => {
    events.push(`start ${id}`);
    await new Promise((resolve) => gates.set(id, resolve));
    events.push(`end ${id}`);
    return id;
  };
  const waitFor = async (id) => {
    while (!gates.has(id)) await new Promise((resolve) => setImmediate(resolve));
  };
  return { events, gates, work, waitFor };
}

test("REQ-4-11: accounts on different hosts run in parallel", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  const { events, gates, work, waitFor } = tracked();
  const all = Promise.all([sessions.run(A, work("a")), sessions.run(B, work("b"))]);
  await waitFor("a");
  await waitFor("b");
  assert.ok(events.includes("start a") && events.includes("start b"), "both started before either ended");
  gates.get("a")();
  gates.get("b")();
  assert.deepEqual(await all, ["a", "b"]);
});

test("REQ-4-11: the two accounts on one host run one after the other", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  const { events, gates, work, waitFor } = tracked();
  const all = Promise.all([sessions.run(B, work("b")), sessions.run(C, work("c"))]);
  await waitFor("b");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["start b"]);
  assert.equal(srv.connections.length, 1, "the second account has not even connected");
  gates.get("b")();
  await waitFor("c");
  gates.get("c")();
  await all;
  assert.deepEqual(events, ["start b", "end b", "start c", "end c"]);
});

test("REQ-4-11: a failure on a host does not block that host's next account", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  const failed = sessions.run(B, async () => {
    throw new Error("boom");
  });
  const next = sessions.run(C, (client) => client.select("INBOX"));
  await assert.rejects(failed, /boom/);
  assert.equal((await next).exists, 2);
});

test("REQ-4-12 REQ-12-3 REQ-14-7: auth failure disables the account for the request, names the secret, never retries", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env: { IMAP_PASS_TEST: "wrong-secret-value" } });
  for (let call = 0; call < 3; call++) {
    await assert.rejects(sessions.run(A, (client) => client.list()), (error) => {
      assert.equal(error.code, "auth");
      assert.match(error.message, /check the IMAP_PASS_TEST secret/);
      assert.ok(!error.message.includes("wrong-secret-value"));
      return true;
    });
  }
  assert.equal(srv.connections.length, 1, "no second connection");
  assert.equal(srv.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 1, "no retry");
  assert.equal(srv.sockets[0].closed, true);
});

test("REQ-4-12 REQ-12-3: an auth failure on one account leaves the others working", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({
    connect: srv.connect,
    env: { BAD: "wrong-secret-value", GOOD: FAKE_PASSWORD },
  });
  const bad = account("b@two.test", "two.test", "BAD");
  const good = account("c@two.test", "two.test", "GOOD");
  const [first, second] = await sessions.runEach([bad, good], (client) => client.select("INBOX"));
  assert.equal(first.ok, false);
  assert.equal(first.code, "auth");
  assert.match(first.error, /check the BAD secret/);
  assert.equal(second.ok, true);
  await sessions.closeAll();
});

test("REQ-4-12 REQ-12-3: a missing secret is reported as check the secret, without connecting", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env: {} });
  await assert.rejects(sessions.run(A, (client) => client.list()), /check the IMAP_PASS_TEST secret/);
  assert.equal(srv.connections.length, 0);
});

const refusing = (reply) => fakeServer({ respond: (tag, cmd) => (cmd.startsWith("AUTHENTICATE") ? `${tag} ${reply}\r\n` : undefined) });

test("REQ-19-2: a refusal with another response code fails the account, names the code and is not retried", async () => {
  for (const code of ["UNAVAILABLE", "LIMIT"]) {
    const srv = refusing(`NO [${code}] secret-looking server text`);
    const sessions = new RequestSessions({ connect: srv.connect, env });
    for (let call = 0; call < 3; call++) {
      await assert.rejects(sessions.run(A, (client) => client.list()), (error) => {
        assert.equal(error.code, "connection");
        assert.equal(error.responseCode, code);
        assert.match(error.message, new RegExp(code));
        assert.doesNotMatch(error.message, /secret/);
        return true;
      });
    }
    assert.equal(srv.connections.length, 1, "no second connection");
    assert.equal(srv.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 1, "no retry");
    assert.equal(srv.sockets[0].closed, true);
  }
});

test("REQ-19-2 REQ-4-12: AUTHENTICATIONFAILED and a refusal with no response code are auth failures", async () => {
  for (const reply of ["NO [AUTHENTICATIONFAILED] Authentication failed.", "NO Authentication failed.", "NO [authenticationfailed] lower case"]) {
    const srv = refusing(reply);
    const sessions = new RequestSessions({ connect: srv.connect, env });
    await assert.rejects(sessions.run(A, (client) => client.list()), (error) => {
      assert.equal(error.code, "auth", reply);
      assert.match(error.message, /check the IMAP_PASS_TEST secret/);
      return true;
    });
    assert.equal(srv.connections.length, 1);
  }
});

test("REQ-19-2: an account refused with another code leaves the others working", async () => {
  const srv = fakeServer({
    respond: (tag, cmd) => {
      if (!cmd.startsWith("AUTHENTICATE")) return undefined;
      const user = atob(cmd.slice(19)).split("\0")[1];
      return user === "b@two.test" ? `${tag} NO [UNAVAILABLE] busy\r\n` : undefined;
    },
  });
  const sessions = new RequestSessions({ connect: srv.connect, env });
  const [first, second] = await sessions.runEach([B, C], (client) => client.select("INBOX"));
  assert.deepEqual([first.ok, first.reached, first.code], [false, false, "connection"]);
  assert.deepEqual([second.ok, second.reached], [true, true]);
  await sessions.closeAll();
});

test("REQ-4-9: a command error keeps the session open for the rest of the request", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env });
  await assert.rejects(sessions.run(A, (client) => client.select("Missing")), (e) => e.code === "command");
  assert.equal((await sessions.run(A, (client) => client.select("INBOX"))).exists, 2);
  assert.equal(srv.connections.length, 1);
});

test("REQ-14-2: imap-check refuses to touch a mailbox that is not a test mailbox", async () => {
  const srv = fakeServer();
  const accounts = [account("scott@example.test", "one.test")];
  await assert.rejects(imapCheck({ ...env, MAILBOXES: accounts }, srv.connect), /test mailboxes only/);
  assert.equal(srv.connections.length, 0);
});

test("REQ-14-2: imap-check is closed to a missing token and in production", async () => {
  const MAILBOXES = [account("mcptest@example.test", "one.test")];
  const call = (workerEnv, headers = {}) =>
    worker.fetch(new Request("https://worker.test/imap-check", { headers }), workerEnv);
  assert.equal((await call({ ENVIRONMENT: "staging", STAGING_TOKEN: "t", MAILBOXES })).status, 401);
  const production = { ENVIRONMENT: "production", STAGING_TOKEN: "t", MAILBOXES };
  assert.equal((await call(production, { authorization: "Bearer t" })).status, 401);
});

const testMailbox = (id, host) => ({ ...account(id, host), signature: "", folders: {} });

test("REQ-14-2 REQ-4-12: imap-check reports a refused login with the server's text and the egress address, without a second login", async () => {
  const srv = fakeServer();
  const MAILBOXES = [testMailbox("mcptest@one.test", "one.test")];
  const seen = ["203.0.113.7", "203.0.113.8"];
  const egress = async () => seen.shift();
  const [result] = await imapCheck({ IMAP_PASS_TEST: "wrong-secret-value", MAILBOXES }, srv.connect, { egress });
  assert.equal(result.ok, false);
  assert.equal(result.code, "auth");
  assert.equal(result.egress_ip, "203.0.113.7");
  assert.equal(result.egress_ip_after, "203.0.113.8");
  assert.equal(result.server_text, "NO [AUTHENTICATIONFAILED] Authentication failed.");
  assert.equal(result.response_status, "NO");
  assert.ok(!JSON.stringify(result).includes("wrong-secret-value"));
  assert.equal(srv.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 1, "no second login");
});

test("REQ-14-2: imap-check records the egress address for an account that logs in, with one login", async () => {
  const srv = fakeServer();
  const MAILBOXES = [testMailbox("mcptest@one.test", "one.test")];
  const [result] = await imapCheck({ ...env, MAILBOXES }, srv.connect, { egress: async () => "198.51.100.4" });
  assert.equal(result.egress_ip, "198.51.100.4");
  assert.notEqual(result.code, "auth");
  assert.equal(srv.commands.filter((c) => c.startsWith("AUTHENTICATE")).length, 1, "one login for the whole check");
});

const httpConnect = (reply) => (address, options) => {
  const calls = (httpConnect.calls ??= []);
  calls.push({ address, options });
  return {
    readable: new ReadableStream({
      start(controller) {
        if (reply !== null) controller.enqueue(new TextEncoder().encode(reply));
        if (reply !== null) controller.close();
      },
    }),
    writable: new WritableStream(),
    close: async () => {},
  };
};

test("REQ-14-2: egressIp reads the address from the echo service over TLS, and gives null for anything else", async () => {
  httpConnect.calls = [];
  const ok = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 12\r\n\r\n104.28.1.200";
  assert.equal(await egressIp(httpConnect(ok)), "104.28.1.200");
  assert.deepEqual(httpConnect.calls[0], {
    address: { hostname: "api.ipify.org", port: 443 },
    options: { secureTransport: "on", allowHalfOpen: false },
  });
  assert.equal(await egressIp(httpConnect("HTTP/1.1 200 OK\r\n\r\n2a06:98c0:3600::103")), "2a06:98c0:3600::103");
  assert.equal(await egressIp(httpConnect("HTTP/1.1 503 Busy\r\n\r\n<html>busy</html>")), null);
  assert.equal(await egressIp(() => { throw new Error("refused"); }), null);
  assert.equal(await egressIp(httpConnect(null), { timeoutMs: 20 }), null, "a silent service times out");
});
