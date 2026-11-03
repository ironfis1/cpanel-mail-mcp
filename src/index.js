// Skeleton: no product behavior. Staging answers the integration harness behind the temporary
// STAGING_TOKEN bearer (removed in C6). Every other request gets 401.
import { imapCheck } from "./staging-imap.js";

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
    if (new URL(request.url).pathname === "/imap-check") {
      const { connect } = await import("./imap/cloudflare.js");
      return json(await imapCheck(env, connect));
    }
    return json({
      environment: env.ENVIRONMENT,
      mailboxes: env.MAILBOXES.map(({ id, host }) => ({ id, host })),
    });
  },
};
