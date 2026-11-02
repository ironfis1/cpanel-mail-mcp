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

## Run 3: deployed, native IMAP client (2026-11-01)

mcptest@reasinger.net on server128.web-hosting.com:993. Total 1,285 ms end to end.

| Step | Result | ms |
|---|---|---|
| Raw TLS probe | PASS | 331 |
| Greeting (LITERAL+ advertised) | PASS | 143 |
| Login, AUTHENTICATE PLAIN with SASL-IR | PASS | 278 |
| LIST | PASS | 47 |
| SELECT INBOX | PASS (1 message, UIDVALIDITY 1793547456) | 44 |
| UID SEARCH SINCE 7d | PASS | 45 |
| UID FETCH headers | PASS | 45 |
| UID STORE +FLAGS \\Flagged | PASS | 46 |
| APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+ | PASS (APPENDUID 1793547457 1) | 256 |

Folder map, cPanel A (delimiter `.`, all advertise SPECIAL-USE):

| Logical | Path | Special-use |
|---|---|---|
| Inbox | INBOX | |
| Sent | INBOX.Sent | \\Sent |
| Drafts | INBOX.Drafts | \\Drafts |
| Archive | INBOX.Archive | \\Archive |
| Trash | INBOX.Trash | \\Trash |
| Junk | INBOX.spam | \\Junk |
| (none) | INBOX.Junk | none. A second junk folder without the flag. Discovery must prefer SPECIAL-USE over name match. |

Findings for the spec:
- F1. Subjects arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server must decode headers before returning them and before building `Re:` subjects. The spike draft subject is still encoded; valid for mail clients, wrong for skill output.
- F2. Two junk folders on one host (`INBOX.spam` flagged, `INBOX.Junk` not). Folder resolution order: SPECIAL-USE first, name match only as fallback.
- F3. D5 resolved on both hosts: `INBOX.Archive` exists with `\\Archive` on cPanel A (run 3) and cPanel B (run 4).
- F4. Server-side latency is small (about 45 ms per command after login). Connection setup plus login is about 750 ms per account, so per-request connect is acceptable; no pooling needed.

Pass criteria status:

| # | Criterion | Status |
|---|---|---|
| 1 | Protocol ops on Workers | PASS on cPanel A (run 3) and cPanel B (run 4). |
| 2 | Folder names and SPECIAL-USE | Done on both hosts. cPanel B layout is identical to cPanel A (run 4). |
| 3 | Draft visible and threaded in Spark | PASS. Draft appeared in Spark, sent from Spark, arrived with In-Reply-To and References intact; Gmail threaded send 2 onto send 1. Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly. |
| 4 | D1 signature on send | ANSWERED: Spark does NOT add the account signature to a draft it did not create. Send 2 went out with a default signature assigned to mcptest in Spark (Settings > Composer > Signatures, screenshot 2026-11-01 21:20); body arrived with no signature. |
| 5 | Flagged shows as pinned; archive shows as archived | Flag PASS (shows pinned in Spark; Spark also set \\Answered on reply). Archive move not yet exercised. |

Deliverability note: send 1 landed in Gmail spam despite SPF, DKIM and DMARC all passing for reasinger.net (sent by Spark via server128 SMTP). Cause is a new sender with a one-line body, not the build. Send 2 landed in Inbox marked Important.

Consequence: signature text now lives in two places (Spark settings and server config). A change in Spark does not reach server-created drafts. Carry into the ambiguity log as a source-of-truth question.

Decision D1: option (a). The server appends the per-account signature to every draft body it creates. Skills keep sending signature-free bodies, which matches get-in-the-room and gatekeeper-panel today.

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

## Run 4: native IMAP client against cPanel B (2026-11-02)

mcptest@yourcigardenindy.com on server223.web-hosting.com:993. Workers Paid plan active on the account. Total 1,277 ms. Run without `flag=1`, so no flag was set.

| Step | Result | ms |
|---|---|---|
| Raw TLS probe | PASS (same Dovecot capabilities as cPanel A) | 253 |
| Greeting (LITERAL+) | PASS | 246 |
| Login, AUTHENTICATE PLAIN with SASL-IR | PASS | 352 |
| LIST | PASS | 59 |
| SELECT INBOX | PASS (1 message, UIDVALIDITY 1793655579) | 63 |
| UID SEARCH SINCE 7d | PASS | 62 |
| UID FETCH headers | PASS (subject RFC 2047 encoded, same as F1) | 58 |
| APPEND to INBOX.Drafts | PASS (APPENDUID 1793655584 1) | 125 |

Folder map, cPanel B: identical to cPanel A. INBOX, INBOX.Sent (\\Sent), INBOX.Drafts (\\Drafts), INBOX.Archive (\\Archive), INBOX.Trash (\\Trash), INBOX.spam (\\Junk), and the unflagged INBOX.Junk. F2 applies on both hosts.

Spike status: criteria 1 and 2 now complete on both hosts. Remaining unexercised: archive MOVE, and the laptop Spark display check. Both are covered by build integration tests (spec section 14).
