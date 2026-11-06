# Known issues

Problems seen but not fixed. Each entry says what was seen, what was ruled out, and what to do if it recurs.

## Transient IMAP auth failure right after a staging deploy

- **Seen:** 2026-11-05, CI run 42138398544.
- **What happened:** the first `/imap-check` right after `wrangler deploy` returned IMAP auth failure on both test mailboxes. A call seconds later in the same run passed, and the rerun passed.
- **Status:** not reproduced.
- **If it recurs:** add a readiness poll to `.github/workflows/ci.yml` after the staging deploy step: poll `/imap-check` until both mailboxes are ok, for at most about 30 seconds, then run the integration suite.
- **Do not** add auth retries in server code. The server disables an account for the rest of the request after an auth failure and never retries, to avoid cPHulk blocks (see README, "Clear a cPHulk block").

## Network reset between the CI runner and staging

- **Seen:** 2026-11-05, the push-to-main CI run after PR #8.
- **What happened:** one integration test (`REQ-12-2`, bad host on mcptest@yourcigardenindy.com) failed after 18 ms with `fetch failed`, cause `ECONNRESET`, before any HTTP response. The other 49 tests passed, including the same test on the other mailbox. The rerun passed.
- **Status:** network-level, not reproduced.
- **If it recurs:** add the single read-only retry to `test/integration/harness.mjs` described in CLAUDE.md, Build discipline. Read calls only; writes are never retried.
