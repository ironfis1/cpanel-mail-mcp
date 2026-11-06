# Known issues

Problems seen but not fixed. Each entry says what was seen, what was ruled out, and what to do if it recurs.

## Transient IMAP auth failure right after a staging deploy

- **Seen:** 2026-11-05, CI run 42138398544.
- **What happened:** the first `/imap-check` right after `wrangler deploy` returned IMAP auth failure on both test mailboxes. A call seconds later in the same run passed, and the rerun passed.
- **Status:** not reproduced.
- **If it recurs:** add a readiness poll to `.github/workflows/ci.yml` after the staging deploy step: poll `/imap-check` until both mailboxes are ok, for at most about 30 seconds, then run the integration suite.
- **Do not** add auth retries in server code. The server disables an account for the rest of the request after an auth failure and never retries, to avoid cPHulk blocks (see README, "Clear a cPHulk block").
