import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { repoFile, wranglerConfig } from "../helpers/wrangler-config.mjs";

const { env } = wranglerConfig();
const staging = env.staging;
const production = env.production;
const LIVE = ["scott@reasinger.net", "scott@yourcigardenindy.com", "founders@yourcigardenindy.com"];

test("REQ-14-2: staging config holds only dedicated mcptest mailboxes, no live account", () => {
  const ids = staging.vars.MAILBOXES.map((m) => m.id);
  assert.equal(staging.name, "cpanel-mail-mcp-staging");
  assert.ok(ids.length > 0);
  for (const id of ids) {
    assert.match(id, /^mcptest@/);
    assert.ok(!LIVE.includes(id));
  }
});

test("REQ-14-2: staging and production share no mailbox or password secret", () => {
  const stagingRefs = new Set(staging.vars.MAILBOXES.flatMap((m) => [m.id, m.secret_ref]));
  for (const { id, secret_ref } of production.vars.MAILBOXES) {
    assert.ok(!stagingRefs.has(id), id);
    assert.ok(!stagingRefs.has(secret_ref), secret_ref);
  }
});

test("REQ-14-2: the integration suite never names a live mailbox", () => {
  const files = readdirSync(repoFile("test/integration"), { recursive: true }).filter((f) => f.endsWith(".mjs"));
  assert.ok(files.length > 0);
  for (const name of files) {
    const text = readFileSync(repoFile(`test/integration/${name}`), "utf8");
    for (const address of LIVE) assert.ok(!text.includes(address), `${name} names ${address}`);
  }
});

test("REQ-14-2: CI deploys staging only, never production", () => {
  const ci = readFileSync(repoFile(".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /wrangler deploy --env staging/);
  assert.doesNotMatch(ci, /--env[ =]production/);
});

test("REQ-14-2: production is the Worker cpanel-mail-mcp with the three live accounts", () => {
  assert.equal(production.name, "cpanel-mail-mcp");
  assert.deepEqual(production.vars.MAILBOXES.map((m) => m.id), LIVE);
});

test("REQ-14-2: a bare wrangler deploy has no entry point, so it cannot reach production", () => {
  assert.equal(wranglerConfig().main, undefined);
  assert.equal(staging.main, "src/index.js");
  assert.equal(production.main, "src/index.js");
});

test("REQ-14-3: the cPanel A test mailbox is mcptest@reasinger.net on server128", () => {
  const mailbox = staging.vars.MAILBOXES.find((m) => m.host === "server128.web-hosting.com");
  assert.equal(mailbox.id, "mcptest@reasinger.net");
  assert.equal(mailbox.port, 993);
});

test("REQ-14-4: the cPanel B test mailbox is mcptest@yourcigardenindy.com on server223", () => {
  const mailbox = staging.vars.MAILBOXES.find((m) => m.host === "server223.web-hosting.com");
  assert.equal(mailbox.id, "mcptest@yourcigardenindy.com");
  assert.equal(mailbox.port, 993);
});
