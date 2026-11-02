import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../../src/index.js";

const TOKEN = "unit-test-token";
const MAILBOXES = [{ id: "mcptest@example.test", host: "imap.example.test", port: 993, secret_ref: "IMAP_PASS_TEST" }];
const stagingEnv = { ENVIRONMENT: "staging", STAGING_TOKEN: TOKEN, MAILBOXES };

const call = (env, authorization) =>
  worker.fetch(new Request("https://worker.test/", { headers: authorization ? { authorization } : {} }), env);

test("REQ-14-2: staging accepts the correct bearer token and reports no secret", async () => {
  const response = await call(stagingEnv, `Bearer ${TOKEN}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    environment: "staging",
    mailboxes: [{ id: "mcptest@example.test", host: "imap.example.test" }],
  });
});

test("REQ-14-2: staging refuses a missing, wrong or malformed token", async () => {
  for (const header of [undefined, "Bearer wrong", TOKEN, `Basic ${TOKEN}`, "Bearer "]) {
    assert.equal((await call(stagingEnv, header)).status, 401, String(header));
  }
});

test("REQ-14-2: staging with no STAGING_TOKEN secret refuses everything", async () => {
  const env = { ENVIRONMENT: "staging", MAILBOXES };
  for (const header of [undefined, "Bearer ", "Bearer undefined"]) {
    assert.equal((await call(env, header)).status, 401, String(header));
  }
});

test("REQ-14-2: production never accepts STAGING_TOKEN, even when the secret is set", async () => {
  const env = { ENVIRONMENT: "production", STAGING_TOKEN: TOKEN, MAILBOXES };
  const response = await call(env, `Bearer ${TOKEN}`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("REQ-14-2: a Worker with no ENVIRONMENT var never accepts STAGING_TOKEN", async () => {
  assert.equal((await call({ STAGING_TOKEN: TOKEN, MAILBOXES }, `Bearer ${TOKEN}`)).status, 401);
});
