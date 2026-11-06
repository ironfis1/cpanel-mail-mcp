// The MCP endpoint is /mcp. Until OAuth arrives in C6, everything sits behind the temporary
// STAGING_TOKEN bearer on staging, and every other request gets 401.
import { handleMcp } from "./mcp.js";
import { imapCheck } from "./staging-imap.js";

const loadConnect = async () => (await import("./imap/cloudflare.js")).connect;

// Staging only, removed with STAGING_TOKEN in C6: the integration suite names one account in this
// header to give it a host that cannot resolve, which proves the other account still answers.
function stagingRegistry(request, env) {
  const broken = request.headers.get("x-staging-break-host");
  if (env.ENVIRONMENT !== "staging" || !broken) return env.MAILBOXES;
  return env.MAILBOXES.map((entry) => (entry.id === broken ? { ...entry, host: "unreachable.invalid" } : entry));
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Compares digests so the check takes the same time wherever the values differ.
async function tokenMatches(presented, expected) {
  const [a, b] = await Promise.all([sha256(presented), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function stagingAuthorized(request, env) {
  if (env.ENVIRONMENT !== "staging" || !env.STAGING_TOKEN) return false;
  const match = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  return match !== null && (await tokenMatches(match[1], env.STAGING_TOKEN));
}

export default {
  async fetch(request, env) {
    if (!(await stagingAuthorized(request, env))) return json({ error: "unauthorized" }, 401);
    const { pathname } = new URL(request.url);
    if (pathname === "/mcp") return handleMcp(request, { env, loadConnect, registry: stagingRegistry(request, env) });
    if (pathname === "/imap-check") return json(await imapCheck(env, await loadConnect()));
    return json({
      environment: env.ENVIRONMENT,
      mailboxes: env.MAILBOXES.map(({ id, host }) => ({ id, host })),
    });
  },
};
