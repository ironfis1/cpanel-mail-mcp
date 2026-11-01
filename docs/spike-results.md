# Spike results

Design ref: docs/design.md section 10.

## Run 1: local build and runtime check (2026-11-01)

| Check | Result |
|---|---|
| imapflow 1.7.8 bundles for Workers (`nodejs_compat`, wrangler 4.156.0) | PASS. 1.79 MB raw, 454 KB gzip. Under the 3 MB free / 10 MB paid limit. |
| imapflow loads and reaches socket open inside workerd | PASS. Failed only at the network layer (build sandbox blocks outbound IMAP), not with a missing-module or not-implemented error. |
| TLS handshake and IMAP protocol against a real host | NOT RUN. Requires deploy to Cloudflare. |

Conclusion so far: no evidence against Workers. The real gate is Run 2.

## Run 2: deployed against cPanel (pending)

Pass criteria from design section 10:

1. login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE against both hosts
2. Folder names and SPECIAL-USE flags for all three accounts
3. IMAP-appended draft visible in Spark (desktop and laptop), threaded as a reply, sends correctly
4. D1: does Spark append the account signature when sending that draft
5. `\Flagged` shows as pinned in Spark; archive move shows as archived

| Check | Result |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
