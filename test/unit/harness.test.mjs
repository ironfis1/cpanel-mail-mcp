import assert from "node:assert/strict";
import { test } from "node:test";
import { callStaging, STAGING_URL, testMailboxes } from "../integration/harness.mjs";
import { wranglerConfig } from "../helpers/wrangler-config.mjs";

const PRODUCTION_URL = "https://cpanel-mail-mcp.reasinger-ops.workers.dev";

test("REQ-14-2: the harness targets the staging Worker over HTTPS, not production", () => {
  const { env } = wranglerConfig();
  const url = new URL(STAGING_URL);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, `${env.staging.name}.reasinger-ops.workers.dev`);
  assert.notEqual(url.origin, PRODUCTION_URL);
});

test("REQ-14-2: the harness refuses to call any origin but staging", (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  assert.throws(() => callStaging(`${PRODUCTION_URL}/`), /refusing to call anything but staging/);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("REQ-14-2: a harness call goes to staging and carries the bearer token", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  const saved = process.env.STAGING_TOKEN;
  process.env.STAGING_TOKEN = "unit-test-token";
  t.after(() => {
    if (saved === undefined) delete process.env.STAGING_TOKEN;
    else process.env.STAGING_TOKEN = saved;
  });
  await callStaging("/");
  const [url, init] = globalThis.fetch.mock.calls[0].arguments;
  assert.equal(url.origin, STAGING_URL);
  assert.equal(init.headers.authorization, "Bearer unit-test-token");
});

test("REQ-14-3 REQ-14-4: the integration suite runs on both test mailboxes", () => {
  assert.deepEqual(testMailboxes().map((m) => m.id), ["mcptest@reasinger.net", "mcptest@yourcigardenindy.com"]);
});
