# Spike results

Design ref: docs/design.md section 10.

## Run 1: local build and runtime check (2026-11-01)

| Check | Result |
|---|---|
| imapflow 1.7.8 bundles for Workers (`nodejs_compat`, wrangler 4.156.0) | PASS. 1.79 MB raw, 454 KB gzip. Under the 3 MB free / 10 MB paid limit. |
| imapflow loads and reaches socket open inside workerd | PASS. Failed only at the network layer (build sandbox blocks outbound IMAP), not with a missing-module or not-implemented error. |
| TLS handshake and IMAP protocol against a real host | NOT RUN. Requires deploy to Cloudflare. |

Conclusion so far: no evidence against Workers. The real gate is Run 2.

## Run 2: deployed, imapflow (2026-11-01)

Deployed to Cloudflare account scott@reasinger.net, subdomain reasinger-ops. Test mailbox mcptest@reasinger.net on server128.web-hosting.com:993.

| Check | Result |
|---|---|
| Raw TLS via `cloudflare:sockets`, read IMAP greeting | PASS in 262 to 336 ms. Dovecot greeting with IMAP4rev1, SASL-IR, LITERAL+, AUTH=PLAIN. |
| imapflow connect+login on Workers (`nodejs_compat`) | FAIL. `ETIMEOUT` "Socket timeout" after 30.6 s. Network is fine (row above), so the failure is imapflow's node:tls path on the Workers runtime. |

Notes:
- Use `server128.web-hosting.com` as IMAP host. cPanel's suggested `reasinger.net` is the web host record and the certificate is for the server name.
- First attempt with no timeouts hung the request indefinitely. Every network step now has an explicit timeout.

Decision D2: stay on Workers; replace imapflow with a minimal IMAP client on the native socket (`spike/src/imap.js`). Login uses AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping. Unit tested against a scripted Dovecot fake (LITERAL+ on and off, literal mailbox names, auth failure, silent-server timeout). Bundle drops from 454 KB to 4.6 KB gzip.

## Run 3: deployed, native IMAP client (pending)

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
