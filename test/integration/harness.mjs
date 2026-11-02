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

export function callStaging(path = "/", { authenticated = true } = {}) {
  const url = new URL(path, STAGING_URL);
  if (url.origin !== STAGING_URL) throw new Error(`refusing to call anything but staging: ${url.origin}`);
  const headers = authenticated ? { authorization: `Bearer ${process.env.STAGING_TOKEN}` } : {};
  return fetch(url, { headers });
}
