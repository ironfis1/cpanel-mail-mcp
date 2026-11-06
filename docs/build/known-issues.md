# Known issues

Problems seen but not fixed. Each entry says what was seen, what was ruled out, and what to do if it recurs.

## Transient IMAP auth failure right after a staging deploy

- **Seen:** 2026-11-05, CI run 42138398544.
- **What happened:** the first `/imap-check` right after `wrangler deploy` returned IMAP auth failure on both test mailboxes. A call seconds later in the same run passed, and the rerun passed.
- **Status:** recurred 2026-11-05 on the PR #9 run, and the readiness theory is wrong. Both `/imap-check` calls in that run (seconds apart) failed auth on both mailboxes, while every MCP tool call before, between and after them logged in to the same mailboxes with the same secrets and passed. The failing calls spent about 3 seconds talking to the servers, so the password was present and the servers said no. A readiness poll would hide this, so do not add one.
- **Suspected cause:** design risk R2 (`docs/design.md`): the cPanel hosts refusing logins from some Cloudflare egress IPs (cPHulk or the host firewall), so a request that leaves through a blocked IP fails on both hosts and the next request through another IP passes. Not confirmed.
- **Next:** a staging-only diagnostic that records, per failed login, the server's full NO response text and the Worker's egress IP (fetched from an IP echo service, staging only), plus asking Namecheap support whether either host is blocking Cloudflare IPs for mcptest. Logged as a spec question, because R2 in production would mean intermittent login failures on the live mailboxes.
- **Do not** rerun the integration suite repeatedly while this is open. Every refused login can count toward a cPHulk block.
- **Do not** add auth retries in server code. The server disables an account for the rest of the request after an auth failure and never retries, to avoid cPHulk blocks (see README, "Clear a cPHulk block").

## Network reset between the CI runner and staging

- **Seen:** 2026-11-05, the push-to-main CI run after PR #8.
- **What happened:** one integration test (`REQ-12-2`, bad host on mcptest@yourcigardenindy.com) failed after 18 ms with `fetch failed`, cause `ECONNRESET`, before any HTTP response. The other 49 tests passed, including the same test on the other mailbox. The rerun passed.
- **Status:** network-level, not reproduced.
- **If it recurs:** add the single read-only retry to `test/integration/harness.mjs` described in CLAUDE.md, Build discipline. Read calls only; writes are never retried.
