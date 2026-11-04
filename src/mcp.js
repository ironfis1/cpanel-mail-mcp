// MCP over streamable HTTP. Stateless: each POST is one JSON-RPC message answered with one JSON
// response, so there is no session ID and no server-sent stream. Authentication happens before this.
import { loadRegistry } from "./accounts.js";
import { RequestSessions } from "./imap/session.js";
import { checkInput, TOOLS } from "./tools/index.js";

// Newest first. 2025-06-18 removed JSON-RPC batching, so neither version needs it.
export const PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18"]);
const SERVER_INFO = Object.freeze({ name: "cpanel-mail-mcp", version: "0.4.0" });

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const jsonResponse = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const rpcError = (id, code, message, status = 200) =>
  jsonResponse({ jsonrpc: "2.0", id, error: { code, message } }, status);
const rpcResult = (id, result) => jsonResponse({ jsonrpc: "2.0", id, result });

function toolResult({ body, isError }) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    structuredContent: body,
    isError,
  };
}

// Errors the server words itself are safe to return. Anything else is reported without its text.
function refusal(error, tool) {
  const known = error.name === "ServerError" || error.name === "ImapError";
  return {
    body: {
      ...tool.refused,
      errors: [{ code: known ? error.code : "internal", message: known ? error.message : "internal server error" }],
      accounts_reached: [],
      accounts_not_reached: [],
    },
    isError: true,
  };
}

async function callTool(tool, args, { env, loadConnect, registry, now }) {
  let sessions = null;
  try {
    checkInput(tool.inputSchema, args);
    const accounts = loadRegistry(registry ?? env.MAILBOXES);
    if (tool.imap) sessions = new RequestSessions({ connect: await loadConnect(), env });
    return await tool.run({ registry: accounts, sessions, now }, args);
  } catch (error) {
    return refusal(error, tool);
  } finally {
    await sessions?.closeAll();
  }
}

async function dispatch(message, context) {
  const { id, method, params } = message;
  if (method === "initialize") {
    const asked = params?.protocolVersion;
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") {
    return rpcResult(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
  }
  if (method === "tools/call") {
    const tool = TOOLS.find(({ name }) => name === params?.name);
    if (!tool) return rpcError(id, INVALID_PARAMS, `unknown tool: ${String(params?.name)}`);
    return rpcResult(id, toolResult(await callTool(tool, params.arguments ?? {}, context)));
  }
  return rpcError(id, METHOD_NOT_FOUND, `method not found: ${String(method)}`);
}

// context: env; loadConnect, an async function returning cloudflare:sockets connect, called only by
// tools that use IMAP; registry, optional entries replacing env.MAILBOXES; now, optional clock.
export async function handleMcp(request, context) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "this server has no event stream; POST JSON-RPC here" }, 405, { allow: "POST" });
  }
  const version = request.headers.get("mcp-protocol-version");
  if (version !== null && !PROTOCOL_VERSIONS.includes(version)) {
    return rpcError(null, INVALID_REQUEST, `unsupported MCP protocol version: ${version}`, 400);
  }
  let message;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, PARSE_ERROR, "request body is not JSON", 400);
  }
  if (message === null || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0") {
    return rpcError(null, INVALID_REQUEST, "expected one JSON-RPC 2.0 message", 400);
  }
  // A notification or a client's response gets no reply.
  if (message.method === undefined || message.id === undefined) return new Response(null, { status: 202 });
  return dispatch(message, context);
}
