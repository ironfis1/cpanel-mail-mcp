// Calls the deployed staging Worker over HTTPS. The origin is fixed so the suite cannot be pointed
// at production. The token comes from the environment and is never printed.
import { wranglerConfig } from "../helpers/wrangler-config.mjs";

export const STAGING_URL = "https://cpanel-mail-mcp-staging.reasinger-ops.workers.dev";

// node:test skip option: false to run, or the message shown for each skipped test.
export const skip = process.env.STAGING_TOKEN
  ? false
  : "STAGING_TOKEN is not set; set it to the staging Worker's token to run the integration suite";

// The suite registers its per-mailbox tests once per entry, so both hosts get the same suite.
export function testMailboxes() {
  return wranglerConfig().env.staging.vars.MAILBOXES;
}

// One JSON-RPC call to the staging MCP endpoint. breakAccount gives that account a bad host.
async function rpc(method, params, { breakAccount } = {}) {
  const headers = { authorization: `Bearer ${process.env.STAGING_TOKEN}`, "content-type": "application/json" };
  if (breakAccount) headers["x-staging-break-host"] = breakAccount;
  const response = await fetch(new URL("/mcp", STAGING_URL), {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (response.status !== 200) throw new Error(`MCP call failed with status ${response.status}`);
  const { result, error } = await response.json();
  if (error) throw new Error(`MCP error: ${error.message}`);
  return result;
}

// Calls a tool and returns its fields plus isError.
export async function callMcp(name, args = {}, options = {}) {
  const result = await rpc("tools/call", { name, arguments: args }, options);
  return { ...result.structuredContent, isError: result.isError };
}
callMcp.list = async () => (await rpc("tools/list", {})).tools;

export function callStaging(path = "/", { authenticated = true } = {}) {
  const url = new URL(path, STAGING_URL);
  if (url.origin !== STAGING_URL) throw new Error(`refusing to call anything but staging: ${url.origin}`);
  const headers = authenticated ? { authorization: `Bearer ${process.env.STAGING_TOKEN}` } : {};
  return fetch(url, { headers });
}
