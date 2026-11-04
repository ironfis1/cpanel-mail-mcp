import assert from "node:assert/strict";
import { test } from "node:test";
import { handleMcp, PROTOCOL_VERSIONS } from "../../src/mcp.js";
import worker from "../../src/index.js";
import { REGISTRY, fakeMailboxes, callTool } from "../helpers/fake-mailbox.mjs";

const TOKEN = "unit-test-token";
const staging = { ENVIRONMENT: "staging", STAGING_TOKEN: TOKEN, MAILBOXES: REGISTRY };

const post = (body, headers = {}) =>
  new Request("https://worker.test/mcp", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { authorization: `Bearer ${TOKEN}`, ...headers },
  });
const rpc = (method, params, id = 1) => ({ jsonrpc: "2.0", id, method, params });
const handle = (request) => handleMcp(request, { env: staging, loadConnect: async () => fakeMailboxes({}).connect });
const tools = async () => (await (await worker.fetch(post(rpc("tools/list")), staging)).json()).result.tools;
const schemaOf = async (name) => (await tools()).find((tool) => tool.name === name).inputSchema;

test("REQ-1-3: initialize answers on the staging endpoint with the tools capability and the client's version", async () => {
  const response = await worker.fetch(post(rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {} })), staging);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const { result, id } = await response.json();
  assert.equal(id, 1);
  assert.equal(result.protocolVersion, "2025-06-18");
  assert.deepEqual(result.capabilities, { tools: {} });
  assert.equal(result.serverInfo.name, "cpanel-mail-mcp");
});

test("REQ-1-3: an unknown client version gets the newest version the server speaks", async () => {
  const response = await handle(post(rpc("initialize", { protocolVersion: "1999-01-01" })));
  assert.equal((await response.json()).result.protocolVersion, PROTOCOL_VERSIONS[0]);
});

test("REQ-1-3 REQ-1-5: the read tools the skills call are listed under Spark's names", async () => {
  const names = (await tools()).map((tool) => tool.name);
  for (const name of ["emails", "search", "thread"]) assert.ok(names.includes(name), name);
});

test("REQ-1-9: no Spark-only tool exists: exactly the six read tools are listed", async () => {
  const names = (await tools()).map((tool) => tool.name).sort();
  assert.deepEqual(names, ["accounts", "availability", "emails", "folders", "search", "thread"]);
  for (const excluded of ["comments", "team", "templates", "contacts", "calendar", "meetings", "events"]) {
    assert.ok(!names.some((name) => name.includes(excluded)), excluded);
  }
});

test("REQ-18-3 REQ-1-4: the emails input schema matches Spark's recorded shape", async () => {
  const schema = await schemaOf("emails");
  assert.deepEqual(Object.keys(schema.properties).sort(), ["filter", "folder", "order", "page", "page_size"]);
  assert.equal(schema.properties.page.type, "integer");
  assert.equal(schema.properties.page.minimum, 1);
  assert.equal(schema.properties.page_size.maximum, 100);
});

test("REQ-18-3 REQ-1-4: the search input schema matches Spark's recorded shape", async () => {
  const schema = await schemaOf("search");
  assert.deepEqual(Object.keys(schema.properties).sort(), ["filter", "in", "query"]);
  assert.deepEqual(schema.required ?? [], []);
});

test("REQ-18-3 REQ-1-4: the thread input schema matches Spark's recorded shape", async () => {
  const schema = await schemaOf("thread");
  assert.deepEqual(Object.keys(schema.properties), ["message_id"]);
  assert.deepEqual(schema.required, ["message_id"]);
});

test("REQ-1-5: a tool's parameters are enforced, so an unknown one is an error and not ignored", async () => {
  const fake = fakeMailboxes({});
  const result = await callTool(fake, "emails", { folder: "a@one.test:Inbox", cursor: "x" });
  assert.equal(result.isError, true);
  assert.equal(result.errors[0].code, "invalid_input");
  assert.match(result.errors[0].message, /cursor/);
  assert.equal(fake.connections.length, 0);
});

test("REQ-1-3: a tool result carries its fields as JSON text and as structured content", async () => {
  const result = await callTool(fakeMailboxes({}), "accounts");
  const { isError, text, ...structured } = result;
  assert.equal(isError, false);
  assert.deepEqual(JSON.parse(text), structured);
});

test("REQ-1-3: an unknown tool or method is a JSON-RPC error", async () => {
  const unknownTool = await (await handle(post(rpc("tools/call", { name: "send", arguments: {} })))).json();
  assert.equal(unknownTool.error.code, -32602);
  const unknownMethod = await (await handle(post(rpc("resources/list")))).json();
  assert.equal(unknownMethod.error.code, -32601);
});

test("REQ-1-3: ping answers, a notification gets 202, and GET is refused because there is no stream", async () => {
  assert.deepEqual((await (await handle(post(rpc("ping")))).json()).result, {});
  const notification = await handle(post({ jsonrpc: "2.0", method: "notifications/initialized" }));
  assert.equal(notification.status, 202);
  assert.equal(await notification.text(), "");
  const get = await handle(new Request("https://worker.test/mcp"));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
});

test("REQ-1-3: bad JSON, a batch and an unsupported protocol version header are refused", async () => {
  assert.equal((await handle(post("{not json"))).status, 400);
  assert.equal((await handle(post([rpc("ping")]))).status, 400);
  assert.equal((await handle(post(rpc("ping"), { "mcp-protocol-version": "1999-01-01" }))).status, 400);
  assert.equal((await handle(post(rpc("ping"), { "mcp-protocol-version": "2025-06-18" }))).status, 200);
});

test("REQ-14-2: the MCP endpoint is closed without the bearer token and in production", async () => {
  const anonymous = new Request("https://worker.test/mcp", { method: "POST", body: JSON.stringify(rpc("tools/list")) });
  assert.equal((await worker.fetch(anonymous, staging)).status, 401);
  const production = { ...staging, ENVIRONMENT: "production" };
  assert.equal((await worker.fetch(post(rpc("tools/list")), production)).status, 401);
});

test("REQ-12-2: the staging break-host header changes one account's host, for the forced-failure run only", async () => {
  const hosts = async (env, header) => {
    const response = await worker.fetch(post(rpc("tools/call", { name: "accounts", arguments: {} }), header), env);
    return (await response.json()).result.structuredContent.accounts.map(({ host }) => host);
  };
  const broken = { "x-staging-break-host": REGISTRY[0].id };
  assert.deepEqual(await hosts(staging, {}), REGISTRY.map(({ host }) => host));
  assert.deepEqual(await hosts(staging, broken), ["unreachable.invalid", ...REGISTRY.slice(1).map(({ host }) => host)]);
  const production = await worker.fetch(post(rpc("tools/list"), broken), { ...staging, ENVIRONMENT: "production" });
  assert.equal(production.status, 401);
});

test("REQ-2-19: the Worker now has the Spark-compatible tool layer, and it refuses an ID for an unserved account", async () => {
  const fake = fakeMailboxes({});
  const { encodeMessageId } = await import("../../src/message-id.js");
  const id = encodeMessageId({ account: "stranger@elsewhere.test", folder: "INBOX", uidValidity: 1, uid: 1, messageId: null });
  const result = await callTool(fake, "thread", { message_id: id });
  assert.equal(result.isError, true);
  assert.equal(result.errors[0].code, "id_invalid");
  assert.equal(fake.connections.length, 0);
});
