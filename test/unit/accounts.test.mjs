import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { DRAFT_PURPOSES, findAccount, loadRegistry } from "../../src/accounts.js";
import { repoFile, wranglerConfig } from "../helpers/wrangler-config.mjs";

const { env } = wranglerConfig();
const production = loadRegistry(env.production.vars.MAILBOXES);
const staging = loadRegistry(env.staging.vars.MAILBOXES);
const entry = (overrides = {}) => ({
  id: "a@example.test",
  host: "h.example.test",
  port: 993,
  secret_ref: "IMAP_PASS_A",
  signature: "A",
  folders: {},
  ...overrides,
});
const srcFiles = () =>
  readdirSync(repoFile("src"), { recursive: true })
    .filter((f) => f.endsWith(".js"))
    .map((f) => [f, readFileSync(repoFile(`src/${f}`), "utf8")]);

test("REQ-2-1: three mailboxes on two hosts with three logins", () => {
  assert.deepEqual(
    production.map(({ id, host }) => [id, host]),
    [
      ["scott@reasinger.net", "server128.web-hosting.com"],
      ["scott@yourcigardenindy.com", "server223.web-hosting.com"],
      ["founders@yourcigardenindy.com", "server223.web-hosting.com"],
    ],
  );
  assert.equal(new Set(production.map((a) => a.secret_ref)).size, 3);
});

test("REQ-2-2: cPanel A is server128 on port 993, not the reasinger.net web host", () => {
  const account = findAccount(production, "scott@reasinger.net");
  assert.equal(account.host, "server128.web-hosting.com");
  assert.equal(account.port, 993);
  for (const { host } of [...production, ...staging]) assert.ok(!/reasinger\.net|yourcigardenindy\.com/.test(host), host);
});

test("REQ-2-3: cPanel B is the confirmed server name recorded in the prerequisites", () => {
  const recorded = /cPanel B IMAP host \| REQ-2-3 \| Done and verified[^|]*\| (\S+):993/.exec(
    readFileSync(repoFile("docs/prerequisites.md"), "utf8"),
  );
  assert.equal(recorded[1], "server223.web-hosting.com");
  assert.equal(findAccount(production, "scott@yourcigardenindy.com").host, recorded[1]);
  assert.equal(findAccount(production, "founders@yourcigardenindy.com").host, recorded[1]);
  assert.equal(findAccount(staging, "mcptest@yourcigardenindy.com").host, recorded[1]);
});

test("REQ-2-5: the cPanel A test mailbox is configured for integration tests", () => {
  assert.equal(findAccount(staging, "mcptest@reasinger.net").host, "server128.web-hosting.com");
});

test("REQ-2-7: every live account has a signature and no restriction, so C5 can offer drafts on all three", () => {
  for (const account of production) {
    assert.ok(account.signature, account.id);
    assert.deepEqual(Object.keys(account).sort(), ["folders", "host", "id", "port", "secret_ref", "signature"]);
  }
});

test("REQ-2-8: each entry has exactly the registry fields", () => {
  for (const account of [...production, ...staging]) {
    assert.deepEqual(Object.keys(account).sort(), ["folders", "host", "id", "port", "secret_ref", "signature"]);
    assert.equal(account.port, 993);
  }
  for (const field of ["id", "host", "port", "secret_ref", "signature", "folders"]) {
    const missing = entry();
    delete missing[field];
    assert.throws(() => loadRegistry([missing]), new RegExp(`missing field ${field}`));
  }
  assert.throws(() => loadRegistry([entry({ port: 143 })]), /port must be 993/);
  assert.throws(() => loadRegistry([entry(), entry()]), /duplicate account/);
  assert.throws(() => loadRegistry([]), /empty/);
});

test("REQ-2-8: an empty signature in config loads as unset", () => {
  assert.equal(loadRegistry([entry({ signature: "" })])[0].signature, null);
  assert.equal(findAccount(staging, "mcptest@reasinger.net").signature, null);
});

test("REQ-2-10: folder overrides are static config and must use logical names", () => {
  assert.deepEqual(loadRegistry([entry({ folders: { Archive: "INBOX.Old" } })])[0].folders, { Archive: "INBOX.Old" });
  assert.throws(() => loadRegistry([entry({ folders: { Spam: "INBOX.spam" } })]), /unknown logical name Spam/);
});

test("REQ-2-11: the purpose map sends each purpose to its account and never to Gmail", () => {
  assert.deepEqual(DRAFT_PURPOSES, {
    "job search": "scott@reasinger.net",
    "your cigar den indy, scott personally": "scott@yourcigardenindy.com",
    "founder-member outreach and replies": "founders@yourcigardenindy.com",
  });
  for (const id of Object.values(DRAFT_PURPOSES)) assert.ok(findAccount(production, id));
});

test("REQ-2-12: Gmail cannot be a configured account", () => {
  assert.throws(() => loadRegistry([entry({ id: "sreasinger@gmail.com" })]), /Gmail is not a configured account/);
  assert.throws(() => loadRegistry([entry({ id: "x@GoogleMail.com" })]), /Gmail is not a configured account/);
  for (const { id } of [...production, ...staging]) assert.doesNotMatch(id, /gmail/i);
});

test("REQ-2-13: the platform secret names are exactly those in the spec", () => {
  assert.deepEqual(Object.fromEntries(production.map((a) => [a.id, a.secret_ref])), {
    "scott@reasinger.net": "IMAP_PASS_REASINGER_SCOTT",
    "scott@yourcigardenindy.com": "IMAP_PASS_YCD_SCOTT",
    "founders@yourcigardenindy.com": "IMAP_PASS_YCD_FOUNDERS",
  });
});

test("REQ-2-14: credentials cannot enter the registry and src never logs", () => {
  assert.throws(() => loadRegistry([entry({ password: "x" })]), /unknown field password/);
  assert.throws(() => loadRegistry([entry({ secret_ref: "not a name!" })]), /must name a platform secret/);
  for (const [file, text] of srcFiles()) assert.doesNotMatch(text, /\bconsole\./, file);
  assert.doesNotMatch(readFileSync(repoFile("wrangler.toml"), "utf8"), /^\s*(password|pass|IMAP_PASS\w*)\s*=/im);
});

test("REQ-2-19: the registry, translator, codec and IMAP client exist; OAuth and tools arrive later", () => {
  const files = srcFiles().map(([file]) => file.replace(/\\/g, "/"));
  for (const file of ["accounts.js", "filter.js", "message-id.js", "imap/client.js", "imap/cloudflare.js"]) {
    assert.ok(files.includes(file), file);
  }
  assert.equal(production.length, 3);
  assert.equal(new Set(production.map((a) => a.host)).size, 2);
});

test("REQ-2-19: findAccount refuses an unknown account", () => {
  assert.throws(() => findAccount(production, "nobody@example.test"), (e) => e.code === "config");
});
