# Source pack: cpanel-mail-mcp rule extraction
Five sources. Design and spike results are given in full. The three skill files are given as excerpts limited to the parts that touch mail operations; the rest of those skills is outreach writing guidance and is out of scope.

==================================================================
SOURCE FILE: 01-design-v0.2.md (excerpt; original line numbers shown)
==================================================================
--- lines 1-216 ---
L1: # cpanel-mail-mcp: Design
L2: 
L3: Status: DRAFT v0.2 (2026-11-01). v0.2 folds in spike results (docs/spike-results.md).
L4: Owner: Scott Reasinger
L5: Repo: ironfis1/cpanel-mail-mcp
L6: 
L7: ## 1. Problem
L8: 
L9: Three scheduled or frequently run skills (email-crap-filter, get-in-the-room, gatekeeper-panel by dependency) reach the business mailboxes only through the Spark desktop connector (`mcp__remote-devices__Spark__*`). That connector runs through sarhomepc. If the PC is asleep, off, updating, or Spark is closed, business-inbox triage, the bounce sweep, and outreach drafting stop. email-crap-filter degrades to Gmail-only and flags it; get-in-the-room falls back to pasted text.
L10: 
L11: The mailboxes themselves live on cPanel servers that are always on. The dependency on the PC is an artifact of the access path, not of the mail.
L12: 
L13: ## 2. Goal
L14: 
L15: A remote MCP server, hosted in the cloud, that gives Claude the same mailbox operations those skills use today, directly against the cPanel IMAP servers, so no scheduled or interactive email task requires sarhomepc.
L16: 
L17: Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature.
L18: 
L19: ## 3. Non-goals (v1)
L20: 
L21: - Sending mail. No skill sends autonomously. Scott sends from Spark. No SMTP in v1.
L22: - Replacing Spark as Scott's mail client. Spark stays the human interface; this server is the automation path.
L23: - Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them.
L24: - Gmail. sreasinger@gmail.com stays on the Gmail connector.
L25: - Permanent delete of messages. Draft delete is the only delete in scope.
L26: - Multi-user. One principal: Scott.
L27: 
L28: ## 4. Context
L29: 
L30: ### 4.1 Mailboxes
L31: 
L32: | Mailbox | Host | Used by |
L33: |---|---|---|
L34: | scott@reasinger.net | cPanel A (server128.web-hosting.com) | crap-filter Part B and C, get-in-the-room |
L35: | scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |
L36: | founders@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |
L37: 
L38: Two hosts, three logins. cPanel A IMAP host is `server128.web-hosting.com:993` (cPanel suggests `reasinger.net`, which is the web host record; use the server name). cPanel B host still to confirm from that cPanel's address bar. cPanel A folders use the `INBOX.` prefix with `.` delimiter and advertise SPECIAL-USE (spike run 3). A test mailbox, mcptest@reasinger.net, exists on cPanel A for integration tests.
L39: 
L40: ### 4.2 Current Spark calls by skill
L41: 
L42: | Skill | Calls |
L43: |---|---|
L44: | email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |
L45: | get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |
L46: | gatekeeper-panel | None directly. Assumes the draft body carries no signature and the sent mail carries the account signature. |
L47: 
L48: The full call shapes in those three SKILL.md files are source material for the rule extraction step.
L49: 
L50: ## 5. Design principles
L51: 
L52: 1. **Drop-in compatibility.** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector. Migrating a skill is a tool-prefix swap plus removing the "Spark unreachable" branch, not a rewrite.
L53: 2. **Least privilege.** Read, flag, move, and write to Drafts. Nothing that sends, and nothing that permanently deletes received mail.
L54: 3. **Fail loudly, per host.** A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached.
L55: 4. **Spark sees everything.** All writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks.
L56: 5. **No secrets in code or logs.** Credentials live only in platform secrets. Message bodies are never logged.
L57: 
L58: ## 6. Architecture
L59: 
L60: ```
L61: Claude (claude.ai / scheduled tasks)
L62:    | MCP over HTTPS (streamable HTTP), OAuth bearer
L63:    v
L64: cpanel-mail-mcp (Cloudflare Worker, CF account: scott@reasinger.net)
L65:    |-- OAuth provider (workers-oauth-provider), single allowed principal
L66:    |-- Tool layer (Spark-compatible schema)
L67:    |-- Filter translator (Gmail-style -> IMAP SEARCH)
L68:    |-- ID codec (stable message IDs)
L69:    |-- Account registry (3 accounts, 2 hosts, folder maps)
L70:    |-- IMAP client (minimal, on cloudflare:sockets, TLS 993)
L71:    v
L72: cPanel A IMAP          cPanel B IMAP
L73: ```
L74: 
L75: ### 6.1 Hosting
L76: 
L77: Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.
L78: 
L79: Spike result (D2): imapflow times out on the Workers runtime (`ETIMEOUT` after 30 s) even though raw TLS to cPanel succeeds in about 300 ms. The server therefore uses a minimal IMAP client written on `cloudflare:sockets` (prototype: `spike/src/imap.js`). It implements only the commands this design needs. Login is AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping. Every read has an explicit timeout; no step may hang. Fly.io/VPS is no longer the fallback.
L80: 
L81: ### 6.2 Auth
L82: 
L83: - MCP clients authenticate with OAuth 2.1 via `workers-oauth-provider`, which claude.ai custom connectors support.
L84: - The upstream identity check allows exactly one principal (Scott). Any other identity is refused at authorize time.
L85: - No authless mode, no shared-secret URL.
L86: - Token lifetimes and the upstream identity provider are an open decision (D3).
L87: 
L88: ### 6.3 Account registry
L89: 
L90: Static config, one entry per mailbox:
L91: 
L92: ```
L93: id: scott@reasinger.net
L94: host: <cPanel A IMAP host>
L95: port: 993
L96: secret_ref: IMAP_PASS_REASINGER_SCOTT
L97: signature: <exact per-account signature text, appended by the server, see D1>
L98: folders: discovered at first connect, cached, overridable
L99: ```
L100: 
L101: Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag. SPECIAL-USE always wins over name: cPanel A has both `INBOX.spam` (flagged `\Junk`) and `INBOX.Junk` (unflagged); Junk resolves to `INBOX.spam`. The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account.
L102: 
L103: ### 6.4 Connection model
L104: 
L105: One IMAP session per account per request, opened lazily, closed at request end. No persistent connections. Measured cost (spike run 3): about 750 ms to connect and log in, about 45 ms per command after that, so per-request connect is acceptable and no pooling is needed. Parallel across accounts, sequential within an account.
L106: 
L107: cPHulk risk: repeated failed logins from a cloud IP can block that IP on the cPanel host. Mitigation: on any auth failure, the account is disabled for the remainder of the request and the error says to check the secret; no retries on auth errors. Egress IP whitelisting on both hosts if the hosting option gives a stable egress IP (Workers does not by default; see R2).
L108: 
L109: ## 7. Tool surface (v1)
L110: 
L111: Names and parameters follow the Spark connector. Exact schemas are set in the spec.
L112: 
L113: | Tool | Purpose |
L114: |---|---|
L115: | `accounts` | List configured accounts and per-account reachability. |
L116: | `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |
L117: | `folders` | List folders per account with logical-name mapping. |
L118: | `emails` | List messages in `<account>:<Folder>` with `filter`, `page_size`, paging cursor. Returns ID, from, to, subject, date, snippet, flags. |
L119: | `search` | Free-text query within one or all accounts, plus optional `filter`. |
L120: | `thread` | Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text. |
L121: | `action` | `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to Archive), `move` (to named folder). No `send`, no permanent delete. |
L122: | `draft` | Create new, `reply_to`, `reply_all`, `forward`, `edit`, `delete` (draft only). Appends to the account's Drafts folder. |
L123: 
L124: ### 7.1 Message IDs
L125: 
L126: Spark IDs are opaque to skills, so the server defines its own opaque ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID. Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive). IDs are stable across calls and across sessions.
L127: 
L128: ### 7.2 Filter grammar
L129: 
L130: Supported tokens, translated to IMAP SEARCH:
L131: 
L132: | Token | IMAP |
L133: |---|---|
L134: | `from:x` | `FROM x` |
L135: | `to:x` | `TO x` |
L136: | `subject:x` | `SUBJECT x` |
L137: | `newer_than:Nd` | `SINCE <today-N>` |
L138: | `older_than:Nd` | `BEFORE <today-N>` |
L139: | `is:unread` / `is:read` | `UNSEEN` / `SEEN` |
L140: | `is:pinned` | `FLAGGED` |
L141: | bare words | `TEXT` |
L142: 
L143: Unknown tokens are an error, never silently dropped. Date math uses America/Indianapolis.
L144: 
L145: ### 7.3 Drafts and threading
L146: 
L147: - New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag.
L148: - Reply / reply all: set `In-Reply-To` and `References` from the original, `Re:` subject, recipients from the original per reply mode, quoted original below the body.
L149: - Forward: `Fwd:` subject, original included (inline quote vs attachment is D4).
L150: - Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID.
L151: - Delete: draft-only. Refuse if the target lacks `\Draft` or is not in the Drafts folder.
L152: - Body input is markdown; the server renders multipart text and HTML.
L153: - Signature (D1): the server appends the account's configured signature to every draft it creates or edits. Spark does not add a signature to a draft it did not compose (spike run 3, verified with a default signature assigned to the account). Skills keep sending signature-free bodies.
L154: - Header decoding: subjects and address display names arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server decodes all returned header text, and builds `Re:` / `Fwd:` subjects from the decoded subject, re-encoding on write when non-ASCII.
L155: - Spark behavior on send (observed): Spark re-composes the draft, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original. The server's draft Message-ID is therefore not the sent Message-ID; anything that must find the sent copy searches Sent by recipient, subject and date, not by the draft's Message-ID.
L156: 
L157: ## 8. Open decisions
L158: 
L159: | ID | Decision | Options | Leaning |
L160: |---|---|---|---|
L161: | D1 | Signature handling | (a) server appends, (b) skills include, (c) Spark adds at send | DECIDED (spike run 3): (a). Spark does not sign drafts it did not create. Server appends the per-account signature; skills send signature-free bodies, unchanged. |
L162: | D2 | Hosting and IMAP client | Workers vs Fly/VPS | DECIDED (spike run 2): Workers, with a minimal native-socket IMAP client. imapflow times out on the Workers runtime; raw `cloudflare:sockets` TLS to cPanel works. |
L163: | D3 | OAuth upstream identity | GitHub (ironfis1), Google, Cloudflare Access | GitHub, single allowed login. Open. |
L164: | D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior). Open. |
L165: | D5 | Archive folder | Use existing Archive if present, else create | cPanel A: `INBOX.Archive` with `\Archive` exists (spike run 3). cPanel B: verify in integration tests. Never auto-create; a missing Archive is an error. |
L166: | D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |
L167: 
L168: ## 9. Risks
L169: 
L170: | ID | Risk | Mitigation |
L171: |---|---|---|
L172: | R1 | imapflow does not run on Workers | REALIZED (spike run 2). Replaced with native-socket client. Residual risk: our IMAP parser meets server responses the prototype did not see (large literals, unusual FETCH shapes). Mitigation: parser tests against recorded real responses from mcptest. |
L173: | R2 | cPHulk blocks cloud egress IPs | No retry on auth failure. Workers egress IPs are not stable, so whitelisting is not available; a block means a cPanel unblock by hand. |
L174: | R3 | Spark does not show IMAP-appended drafts promptly, or treats them differently | Spike run 3: drafts appear, thread and send correctly from desktop. Laptop not yet checked. |
L175: | R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |
L176: | R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |
L177: | R6 | cPanel connection limits per account | One session per account per request; sequential within account |
L178: | R7 | Signature text exists in two places (Spark settings and server config) and drifts | Open question for the ambiguity log: which is the source of truth and how changes propagate |
L179: | R8 | New sender reputation: first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass | Not a server issue (Spark sends). Live accounts have history. Note only. |
L180: 
L181: ## 10. Spike plan (feasibility gate)
L182: 
L183: Status: COMPLETE (2026-11-01). Results in docs/spike-results.md. Criteria 1 and 2 passed on cPanel A; cPanel B and archive move are deferred to integration tests. Criteria 3, 4, 5 (pin) passed.
L184: 
L185: Original pass criteria:
L186: 
L187: 1. imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts.
L188: 2. Folder names and SPECIAL-USE flags recorded for all three accounts.
L189: 3. A draft appended over IMAP appears in Spark (desktop and laptop) within one sync cycle, threads correctly as a reply, and sends correctly.
L190: 4. D1 check: does Spark append the account signature when sending that draft?
L191: 5. `\Flagged` displays as pinned in Spark. Archive move shows as archived.
L192: 
L193: Outcome recorded in `docs/spike-results.md` and folded into the design before rule extraction.
L194: 
L195: ## 11. Build process
L196: 
L197: 1. This design doc (v0.1), reviewed by Scott. DONE.
L198: 2. Spike; update design with results (v0.2). DONE.
L199: 3. extract-rules-and-flag-ambiguity over design v0.2 plus the email-crap-filter, get-in-the-room and gatekeeper-panel SKILL.md files. Outputs `docs/rule-base.md`, `docs/ambiguity-log.md`.
L200: 4. Scott resolves the ambiguity log.
L201: 5. write-spec-from-resolutions. Output `docs/spec.md`, every requirement cited to a rule or resolution.
L202: 6. Build to spec. One test per requirement ID; integration tests against a dedicated test mailbox on cPanel A, never against live inboxes.
L203: 7. Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector.
L204: 
L205: ## 12. Acceptance and cutover
L206: 
L207: - Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server. Results must match (same messages found, same bounces, same pins applied) with differences explained.
L208: - Get-in-the-room: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient.
L209: - Cutover: skills switch tool prefix; Spark path becomes fallback per D6.
L210: - Power-off test: the success test in section 2.
L211: 
L212: ## 13. Operations
L213: 
L214: - Logging: tool name, account, host, outcome, latency, error class. Never bodies, never credentials, never full addresses of correspondents beyond domain.
L215: - Alerting: scheduled skills call `availability` first and push-notify on any host failure.
L216: - Secrets rotation: mailbox password change means one secret update; documented in README.

==================================================================
SOURCE FILE: 02-spike-results.md (excerpt; original line numbers shown)
==================================================================
--- lines 1-94 ---
L1: # Spike results
L2: 
L3: Design ref: docs/design.md section 10.
L4: 
L5: ## Run 1: local build and runtime check (2026-11-01)
L6: 
L7: | Check | Result |
L8: |---|---|
L9: | imapflow 1.7.8 bundles for Workers (`nodejs_compat`, wrangler 4.156.0) | PASS. 1.79 MB raw, 454 KB gzip. Under the 3 MB free / 10 MB paid limit. |
L10: | imapflow loads and reaches socket open inside workerd | PASS. Failed only at the network layer (build sandbox blocks outbound IMAP), not with a missing-module or not-implemented error. |
L11: | TLS handshake and IMAP protocol against a real host | NOT RUN. Requires deploy to Cloudflare. |
L12: 
L13: Conclusion so far: no evidence against Workers. The real gate is Run 2.
L14: 
L15: ## Run 2: deployed, imapflow (2026-11-01)
L16: 
L17: Deployed to Cloudflare account scott@reasinger.net, subdomain reasinger-ops. Test mailbox mcptest@reasinger.net on server128.web-hosting.com:993.
L18: 
L19: | Check | Result |
L20: |---|---|
L21: | Raw TLS via `cloudflare:sockets`, read IMAP greeting | PASS in 262 to 336 ms. Dovecot greeting with IMAP4rev1, SASL-IR, LITERAL+, AUTH=PLAIN. |
L22: | imapflow connect+login on Workers (`nodejs_compat`) | FAIL. `ETIMEOUT` "Socket timeout" after 30.6 s. Network is fine (row above), so the failure is imapflow's node:tls path on the Workers runtime. |
L23: 
L24: Notes:
L25: - Use `server128.web-hosting.com` as IMAP host. cPanel's suggested `reasinger.net` is the web host record and the certificate is for the server name.
L26: - First attempt with no timeouts hung the request indefinitely. Every network step now has an explicit timeout.
L27: 
L28: Decision D2: stay on Workers; replace imapflow with a minimal IMAP client on the native socket (`spike/src/imap.js`). Login uses AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping. Unit tested against a scripted Dovecot fake (LITERAL+ on and off, literal mailbox names, auth failure, silent-server timeout). Bundle drops from 454 KB to 4.6 KB gzip.
L29: 
L30: ## Run 3: deployed, native IMAP client (2026-11-01)
L31: 
L32: mcptest@reasinger.net on server128.web-hosting.com:993. Total 1,285 ms end to end.
L33: 
L34: | Step | Result | ms |
L35: |---|---|---|
L36: | Raw TLS probe | PASS | 331 |
L37: | Greeting (LITERAL+ advertised) | PASS | 143 |
L38: | Login, AUTHENTICATE PLAIN with SASL-IR | PASS | 278 |
L39: | LIST | PASS | 47 |
L40: | SELECT INBOX | PASS (1 message, UIDVALIDITY 1793547456) | 44 |
L41: | UID SEARCH SINCE 7d | PASS | 45 |
L42: | UID FETCH headers | PASS | 45 |
L43: | UID STORE +FLAGS \\Flagged | PASS | 46 |
L44: | APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+ | PASS (APPENDUID 1793547457 1) | 256 |
L45: 
L46: Folder map, cPanel A (delimiter `.`, all advertise SPECIAL-USE):
L47: 
L48: | Logical | Path | Special-use |
L49: |---|---|---|
L50: | Inbox | INBOX | |
L51: | Sent | INBOX.Sent | \\Sent |
L52: | Drafts | INBOX.Drafts | \\Drafts |
L53: | Archive | INBOX.Archive | \\Archive |
L54: | Trash | INBOX.Trash | \\Trash |
L55: | Junk | INBOX.spam | \\Junk |
L56: | (none) | INBOX.Junk | none. A second junk folder without the flag. Discovery must prefer SPECIAL-USE over name match. |
L57: 
L58: Findings for the spec:
L59: - F1. Subjects arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server must decode headers before returning them and before building `Re:` subjects. The spike draft subject is still encoded; valid for mail clients, wrong for skill output.
L60: - F2. Two junk folders on one host (`INBOX.spam` flagged, `INBOX.Junk` not). Folder resolution order: SPECIAL-USE first, name match only as fallback.
L61: - F3. D5 resolved for cPanel A: `INBOX.Archive` exists with `\\Archive`. Still to confirm on cPanel B.
L62: - F4. Server-side latency is small (about 45 ms per command after login). Connection setup plus login is about 750 ms per account, so per-request connect is acceptable; no pooling needed.
L63: 
L64: Pass criteria status:
L65: 
L66: | # | Criterion | Status |
L67: |---|---|---|
L68: | 1 | Protocol ops on Workers | PASS on cPanel A. cPanel B pending (list-only run). |
L69: | 2 | Folder names and SPECIAL-USE | cPanel A done (above). cPanel B pending. |
L70: | 3 | Draft visible and threaded in Spark | PASS. Draft appeared in Spark, sent from Spark, arrived with In-Reply-To and References intact; Gmail threaded send 2 onto send 1. Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly. |
L71: | 4 | D1 signature on send | ANSWERED: Spark does NOT add the account signature to a draft it did not create. Send 2 went out with a default signature assigned to mcptest in Spark (Settings > Composer > Signatures, screenshot 2026-11-01 21:20); body arrived with no signature. |
L72: | 5 | Flagged shows as pinned; archive shows as archived | Flag PASS (shows pinned in Spark; Spark also set \\Answered on reply). Archive move not yet exercised. |
L73: 
L74: Deliverability note: send 1 landed in Gmail spam despite SPF, DKIM and DMARC all passing for reasinger.net (sent by Spark via server128 SMTP). Cause is a new sender with a one-line body, not the build. Send 2 landed in Inbox marked Important.
L75: 
L76: Consequence: signature text now lives in two places (Spark settings and server config). A change in Spark does not reach server-created drafts. Carry into the ambiguity log as a source-of-truth question.
L77: 
L78: Decision D1: option (a). The server appends the per-account signature to every draft body it creates. Skills keep sending signature-free bodies, which matches get-in-the-room and gatekeeper-panel today.
L79: 
L80: Pass criteria from design section 10:
L81: 
L82: 1. login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE against both hosts
L83: 2. Folder names and SPECIAL-USE flags for all three accounts
L84: 3. IMAP-appended draft visible in Spark (desktop and laptop), threaded as a reply, sends correctly
L85: 4. D1: does Spark append the account signature when sending that draft
L86: 5. `\Flagged` shows as pinned in Spark; archive move shows as archived
L87: 
L88: | Check | Result |
L89: |---|---|
L90: | 1 | |
L91: | 2 | |
L92: | 3 | |
L93: | 4 | |
L94: | 5 | |

==================================================================
SOURCE FILE: skill-email-crap-filter.md (excerpt; original line numbers shown)
==================================================================
--- lines 1-269 ---
L1: ---
L2: name: "email-crap-filter"
L3: description: "Inbox triage across all of Scott's mail: Gmail personal (sreasinger@gmail.com, incl. Comcast-forwarded) via the Gmail connector, plus the business inboxes scott@reasinger.net, scott@yourcigardenindy.com and founders@yourcigardenindy.com via Spark, plus a bounce sweep. Use whenever the user asks to process, sort, label, classify, or triage email, or says \"check my email\", \"what's important in my inbox\", \"label my mail\", \"clean up my inbox\", \"what emails need attention\", \"run the email filter\", \"any bounces\", \"go through my mail\" or \"what should I look at today.\" Always use this skill for any email triage, classification, labeling, or bounce check."
L4: ---
L5: 
L6: # Email Crap Filter / Value Finder (v2: 2026-10-26, Spark)
L7: 
L8: Three passes, always in this order:
L9: 
L10: - **Part C, Bounce sweep (Spark, scott@reasinger.net).** First, because a bounce
L11:   kills an outreach touch silently.
L12: - **Part B, Business inboxes (Spark).** scott@reasinger.net (job search),
L13:   scott@yourcigardenindy.com and founders@yourcigardenindy.com (Your Cigar Den
L14:   Indy). Since 2026-10-26 these are read directly in Spark Pro; the cPanel
L15:   forwarders to Gmail are retired, so Gmail no longer sees any of this mail.
L16: - **Part A, Gmail personal (Gmail connector).** sreasinger@gmail.com with AI/
L17:   labels, unchanged from v1.
L18: 
L19: Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action)
L20: run through Scott's linked computer; load them with ToolSearch. If they are
L21: absent or the computer is unreachable, run Part A only and put "Business
L22: inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark
L23: closed)" as the first line of the report. Never treat that as a clean run.
L24: 
L25: This file is self-contained. There is no references/ folder; everything the
L26: run needs (MCP call patterns, classification rules) is below.
L27: 
L28: ## Part C: Bounce sweep (Spark)
L29: 
L30: Bounce senders vary (cPanel Mailer-Daemon, Google mailer-daemon, Microsoft and
L31: Mimecast postmaster@, "Undeliverable:" subjects), so run both calls:
L32: 
L33: 1. `Spark__emails` with `folder: "scott@reasinger.net:Inbox"`,
L34:    `filter: "from:mailer-daemon newer_than:3d"`, then again with
L35:    `filter: "from:postmaster newer_than:3d"`.
L36: 2. `Spark__search` with `query: "delivery failed undeliverable address not found"`,
L37:    `in: "scott@reasinger.net"`, `filter: "newer_than:3d"`. Keep only real
L38:    delivery-failure notices (ignore normal mail the search also returns).
L39: 
L40: For each bounce, read the snippet (or `Spark__thread` if thin) and report: the
L41: failed address, the error code, the date, and the original subject if shown.
L42: 550 5.1.1, 550 5.4.1 "Recipient address rejected", "Invalid Recipient", and
L43: 554 5.4.14 hop-count loops all mean the mailbox does not exist: say "switch to
L44: fallback address or LinkedIn". 4xx codes are temporary: say "retrying, watch".
L45: Do not archive bounces; Scott or the send block clears them after logging.
L46: On a scheduled run, any bounce triggers the notification.
L47: 
L48: ## Part B: Business inboxes (Spark)
L49: 
L50: Accounts and what they are for:
L51: 
L52: | Account | Purpose | Highest-value mail |
L53: |---|---|---|
L54: | `scott@reasinger.net` | Executive job search | Recruiters, hiring execs, replies to outreach, networking contacts, legal/billing sent to this address |
L55: | `scott@yourcigardenindy.com` | Your Cigar Den Indy, Scott personally | Landlord, architect, vendors, investors, city/permits |
L56: | `founders@yourcigardenindy.com` | Founder-member interest and replies | Any person expressing founder interest, form submissions ("Founder interest: ..."), member questions |
L57: 
L58: ### B1. Fetch
L59: For each account call `Spark__emails` with `folder: "<account>:Inbox"`,
L60: `filter: "newer_than:7d"`, `page_size: 100`. Skip messages already pinned
L61: (flag shows pinned) and bounce notices (Part C owns those).
L62: 
L63: ### B2. Classify
L64: Same taxonomy and rules as Part A (safety terms first, then sender overrides,
L65: then best fit), with these additions:
L66: - On the two yourcigardenindy.com accounts, any real person or a founder-interest
L67:   form submission is `Review Now (Founder lead)`. A submission named "Test
L68:   Founder" or from Scott's own addresses is a test: `Low Priority`.
L69: - Hosting/system notices (cPanel, DMARC reports, SMTP TLS reports, Google
L70:   account notices) are `Low Priority` unless a safety term fires.
L71: - A reply from someone Scott emailed (check `scott@reasinger.net:Sent` for the
L72:   sender if unsure) is always `Review Now`, never Career-only.
L73: 
L74: ### B3. Act (IMAP accounts have no AI/ labels; Spark actions stand in)
L75: - `Review Now`, `Review Now (Founder lead)`, `Career`: `Spark__action`
L76:   `pin` on the message IDs. Pinned = triaged and needs Scott.
L77: - `Noise` with no safety term: `Spark__action` `archive`.
L78: - Everything else: no action, report only.
L79: - Never delete, move to trash, unsubscribe, or send. Never unpin.
L80: Batch IDs per action (one call for all pins, one for all archives). Log any
L81: failed ID and continue.
L82: 
L83: ## Part A: Gmail personal (Gmail connector)
L84: 
L85: The steps below (Label Taxonomy through Step 4) apply to sreasinger@gmail.com
L86: only.
L87: 
L88: The unit of work is the **thread**, not the message. Gmail labels and archives
L89: apply to whole threads, so classify and label once per thread.
L90: 
L91: Comcast-forwarded mail (sent to sreasinger@comcast.net) lands in the same
L92: Gmail inbox and is handled identically. No separate fetch is needed.
L93: 
L94: ## Label Taxonomy and IDs
L95: 
L96: Use the IDs directly in every label/unlabel/search call. The Gmail MCP accepts
L97: label IDs, not display names.
L98: 
L99: | Label | Gmail ID | When to Apply |
L100: |---|---|---|
L101: | `AI/Review Now` | `Label_14` | A real person writing to Scott, or anything that needs a decision or response soon |
L102: | `AI/Career` | `Label_15` | Recruiters, job leads, job-board matches, interview scheduling, networking, LinkedIn, alumni outreach |
L103: | `AI/Finance-Legal` | `Label_16` | Bills, invoices, payment confirmations, HR, benefits, legal, leases, severance, insurance, tax, unemployment/DWD |
L104: | `AI/Low Priority` | `Label_17` | Real but not urgent: newsletters Scott reads, transactional notifications (shipping, review posted, receipts under $50) |
L105: | `AI/Noise` | `Label_18` | Marketing, promos, mass blasts, deal alerts, course/subscription upsells, most newsletters |
L106: | `AI/Unsubscribe Candidate` | `Label_19` | Recurring bulk sender Scott has never replied to or opened, worth removing |
L107: | `AI/Needs Human Decision` | `Label_20` | Ambiguous: could be important, could be junk; do not auto-anything |
L108: 
L109: ### Sender overrides
L110: 
L111: These senders always get the listed label without classification, unless a
L112: safety term is present (safety always wins).
L113: 
L114: | Sender | Label |
L115: |---|---|
L116: | any address `@mail.beehiiv.com` (all Beehiiv newsletters, including shortlysts and godsmoney) | `AI/Noise` |
L117: | `renewalneighborhoodministry@renewal-community-church-in.clrsmail.com` | `AI/Low Priority` |
L118: | `customerservice@exct.stansberryresearch.com` | `AI/Low Priority` |
L119: 
L120: ### Safety terms
L121: 
L122: Match case-insensitively against subject + snippet as **whole words** (so `HR`
L123: matches "HR" or "HR department" but not "three" or "Christmas"). `HR` must
L124: match in uppercase only.
L125: 
L126: | Term group | Forced label |
L127: |---|---|
L128: | `interview`, `recruiter` | `AI/Career` |
L129: | `invoice`, `payment`, `legal`, `HR`, `lease` | `AI/Finance-Legal` |
L130: | `account security`, `password`, `verification`, `confirm your`, `action required`, `appointment` | `AI/Needs Human Decision` (or `AI/Review Now` if clearly from a known real person) |
L131: 
L132: Any thread with a safety term is **never archived**, whatever else it looks like.
L133: 
L134: ## Automation Rules
L135: 
L136: - Auto-label every thread. No confirmation step.
L137: - Auto-archive `AI/Noise` immediately after labeling it. Standing rule, every
L138:   run, including the first.
L139: - Never archive if a safety term is present. When in doubt, label only.
L140: - All other labels are label-only. Do not archive, move, or delete them; Scott
L141:   reviews them in Spark.
L142: - Never remove an existing label (including the Bitdefender labels).
L143: 
L144: ## Workflow
L145: 
L146: ### Step 1: Verify labels
L147: 
L148: Call `Gmail:list_labels`. Confirm each ID in the table above maps to the
L149: expected name. If a label is missing, create it with `Gmail:create_label`
L150: (`displayName: "AI/Review Now"`, etc.) and use the new ID for this run. If an
L151: ID maps to a different name, stop and report it; do not label with a wrong ID.
L152: 
L153: ### Step 2: Fetch unlabeled inbox threads
L154: 
L155: Call `Gmail:search_threads` with:
L156: 
L157: ```
L158: query: in:inbox newer_than:7d -label:Label_14 -label:Label_15 -label:Label_16 -label:Label_17 -label:Label_18 -label:Label_19 -label:Label_20
L159: pageSize: 50
L160: view: THREAD_VIEW_MINIMAL
L161: ```
L162: 
L163: Do not use `has:nouserlabels`: the Bitdefender labels are user labels and would
L164: exclude everything.
L165: 
L166: Read and unread threads are both in scope. The filter is "no AI/ label yet,"
L167: not "unread." A read thread with no AI/ label still needs a label.
L168: 
L169: The page size cap is 50. If `nextPageToken` is returned, call again with
L170: `pageToken` until you have 100 threads or no more pages.
L171: 
L172: For each thread collect: thread `id`, sender, subject, snippet, date, existing
L173: `labelIds`, and the sender of the **latest** message. Search previews show only
L174: the oldest ~5 messages; if a thread has more than 5 messages, call
L175: `Gmail:get_thread` with `messageFormat: MINIMAL` to see the latest one.
L176: 
L177: Note when the latest message in a thread is from Scott (`SENT` label, from
L178: sreasinger@gmail.com). That means he already replied; still label it, but say
L179: so in the report. (scott@reasinger.net mail no longer arrives in Gmail; Part B
L180: covers it.)
L181: 
L182: ### Step 3: Classify each thread
L183: 
L184: Classify inline using subject, sender, and snippet only. Do not open full
L185: bodies unless the snippet is too thin to decide, and never quote body text in
L186: the report.
L187: 
L188: Order of precedence:
L189: 
L190: 1. Safety term present: use the forced label from the safety table.
L191: 2. Sender override match: use that label.
L192: 3. Otherwise, pick the single best label using these rules:
L193:    - A named individual (not a no-reply or marketing address) writing to Scott
L194:      personally: `AI/Review Now`, unless it is clearly recruiting, then
L195:      `AI/Career`.
L196:    - Job-board matches (Indeed, LinkedIn Jobs, ZipRecruiter, etc.) and
L197:      recruiter outreach: `AI/Career`.
L198:    - Money, contracts, leases, HR, benefits, tax, government: `AI/Finance-Legal`.
L199:    - Transactional notices Scott might glance at, and newsletters with real
L200:      editorial content: `AI/Low Priority`.
L201:    - Promotions, upsells, sales, "limited time," free trials: `AI/Noise`.
L202:    - A bulk sender that appears repeatedly and that Scott has never replied to:
L203:      `AI/Unsubscribe Candidate`.
L204:    - Genuinely can't tell: `AI/Needs Human Decision`.
L205: 
L206: Record one label plus a one-sentence reason per thread.
L207: 
L208: If classification fails for any thread, label it `AI/Needs Human Decision`.
L209: 
L210: ### Step 4: Apply labels and archive Noise
L211: 
L212: For each thread:
L213: 
L214: 1. `Gmail:label_thread` with `threadId` and `labelIds: ["<ID>"]`.
L215: 2. If the label is `Label_18` and no safety term is present, then call
L216:    `Gmail:unlabel_thread` with `labelIds: ["INBOX"]`. These must be two
L217:    sequential calls; label first, then archive.
L218: 
L219: Independent threads can be labeled in parallel. Log any error and continue;
L220: partial runs are fine. Never silently drop a thread.
L221: 
L222: ### Step 5: Report
L223: 
L224: One combined report across all accounts. Tag each item with its account
L225: (`[reasinger.net]`, `[YCDI]`, `[founders]`, `[gmail]`). Lead with what needs
L226: Scott, in this order:
L227: 
L228: 0. **Bounces** (Part C): failed address, error, date, original subject, the
L229:    fix. If Spark was unreachable, say so here instead.
L230: 1. **Career**: every Career item, with sender, subject, and any comp
L231:    range or company visible in the snippet. Job opportunities and recruiter
L232:    outreach are the top priority.
L233: 2. **Review Now**: every Review Now item, sender + subject + the action
L234:    asked for, and whether Scott already replied. Founder leads first within
L235:    this group for the YCDI accounts.
L236: 3. **Finance-Legal**: every thread, sender + subject.
L237: 4. **Needs Human Decision**: every thread, sender + subject + why it was
L238:    ambiguous.
L239: 5. **Withheld from archive**: any Noise-looking thread kept in the inbox
L240:    because of a safety term, with the term that triggered it.
L241: 6. **Unsubscribe Candidates**: grouped by sender.
L242: 7. Counts for Low Priority and archived Noise (no individual Noise listing).
L243: 
L244: ### Step 6: Scheduled runs only
L245: 
L246: When running from a schedule (no one watching), send a push notification
L247: if and only if the run produced at least one bounce, Career, Review Now
L248: (including a founder lead), Finance-Legal, or Needs Human Decision item, or if
L249: any part failed or Spark was unreachable.
L250: Put the single most important item in the first sentence. If the run found
L251: only Noise and Low Priority, stay silent.
L252: 
L253: ## Error Handling
L254: 
L255: - Gmail MCP unavailable or auth fails: run Parts C and B anyway, report Part A
L256:   as not run (on a scheduled run, notify).
L257: - Spark unreachable: run Part A, report Parts C and B as not run (notify).
L258: - A label ID doesn't match its expected name: stop and report.
L259: - A single label/unlabel call fails: log it, continue, list it in the report.
L260: 
L261: ## Configuration (defaults, overrideable by user)
L262: 
L263: ```
L264: lookback_window: 7d       # all parts; Part C uses 3d
L265: max_threads: 100          # paginate at 50 per call
L266: include_read: true        # unlabeled read threads are still triaged
L267: include_already_labeled: false
L268: auto_archive_noise: true
L269: ```

==================================================================
SOURCE FILE: skill-get-in-the-room.md (excerpt; original line numbers shown)
==================================================================
--- lines 1-7 ---
L1: ---
L2: name: "get-in-the-room"
L3: description: "Scott Reasinger executive job search - recruiting phase skill. Use whenever Scott needs outreach, a cover note, a follow-up, a voicemail or phone script, a resume tailored for a role, pipeline status updated, or recruiter/CEO/CFO contact strategy. Triggers on cover letter, outreach, follow-up, touch cadence, ghost call, text follow-up, subject line, second touch, informational interview, referral ask, pipeline update, brief update. Kill/Park/Blossom disposition is NOT this skill - that is job-review, called first."
L4: ---
L5: 
L6: # Get In The Room
L7: ## Scott Reasinger - Recruiting Phase Skill (v3.4: 2026-10-26 - SPARK DELIVERY. Spark Pro replaces Gmail for drafts, sends, sent-checks, and bounces; account per purpose; Spark appends the signature, so draft bodies carry none. See EMAIL DELIVERY - SPARK. Everything else from v3.3 stands.)
--- lines 114-117 ---
L114: 4. **The close - arm A offer or arm B Voss, see THE CLOSE.** Written fresh for this reader, tied to the proof so it offers or asks about something specific.
L115: 
L116: Signature, every time (v3.4, Spark): the scott@reasinger.net account signature in Spark appends it automatically: `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`. **Never type a signature or sign-off into the Spark draft body** (it would print twice). The draft file you run through the counter, check.py, and the panel DOES end with that signature line, so the checks see what the reader sees. Never sreasinger@gmail.com.
L117: 
--- lines 202-219 ---
L202: ## GENERATION SEQUENCE - OUTREACH (the primary sequence)
L203: 
L204: At session start load the Notion records (see `references/notion-records.md`): the company's Jobs record (Stage, Disposition, page body), its Touches (who has been touched, when, by which channel, Send Status) and its Contacts (Warmth, Ask Budget, LinkedIn Follow-up Blocked). For any company that may have come up before, run the repost check from that file. claude/live-pipeline.md and brief_query.py are retired.
L205: 
L206: 1. **Confirm job-review disposition** for a posted role (PURSUE/BLOSSOM). Informational outreach needs none.
L207: 2. **Apply first (posted roles).** Confirm with Scott the application is in before any outreach is sent. Outreach never replaces or implies skipping the application.
L208: 3. **Pick the recipients: three decision makers per company.** CEO first; CFO; third = President, COO, or the VP who owns the pain. HR is never one of the three. For posted roles also send the recruiter/HR note (Template E) the same day, including retained searches. Operating partner, not deal partner, at PE firms.
L209: 4. **Find the pain** (posting first, then public info, then inflection point) and note the source.
L210: 5. **Pick one story** from the Number Bank that answers that pain, write its "hard part" clause, and write the benefit to the reader (v3.3: what THEY get, universal goal or posting need, never diagnosis, never a number projected onto them).
L211: 6. **Set the stage and close, then the subject.** Cold: assign arm A or B (alternate within the company and batch) and write the close fresh (check recent Close Arm values in Touches so the wording is not repeated). Warm: choice close with computed days. Then lift the subject from the close (Subject lines).
L212: 7. **Draft to the cold skeleton.** Plain, direct, how Scott talks on the phone. No frameworks, no crank line, no diagnosis.
L213: 8. **Run the mechanical counter** (with the arm and company). Fix and re-run until clean.
L214: 9. **Read-aloud test.** Under 20 seconds. If it sounds like a pitch, cut.
L215: 10. **Run `python3 references/check.py --draft <file>`.**
L216: 11. **Call `gatekeeper-panel`** with `--stage`, `--posted`, `--arm`, `--company`, and `--subject`. Apply its fixes (cut, swap, simplify, never add; the benefit is never cut) until it passes or hits its cap.
L217: 12. **Deliver with the touch plan** (10-TOUCH CADENCE with dates, the number to call, the same-day call line, the voicemail line). Cold notes need no slot holds; create a reminder hold for the touch-4 call. Email delivery = a Spark draft (see EMAIL DELIVERY - SPARK), never a Gmail draft. Give Scott the Spark draft ID per recipient; never call an email "ready" unless the draft exists. At delivery, create one Touches row per recipient with Send Status = Drafted (Name, Date planned, Job, Contact, Channel, Contact Role, Medium, Outreach Type, Subject Line, Close Arm with the exact close text, Pain Source); create or update each Contact first. The three daily briefs list Drafted rows until Scott confirms or kills them, so a draft that never gets a row is a draft nobody chases. Put the next scheduled touch in Tasks (Type Follow-up, Due = the touch date, linked to Job and Contact).
L218: 13. **Send-then-log.** Scott confirms the send (a one-line reply like "sent 1, 3; killed 2" counts); then flip each Touches row from Drafted to Sent with the actual Date, or to Killed, and put the panel's `review-panel-run:` line in the row's Notes. Move the Jobs record to Stage = Pursuing on the first Sent touch. A submitted application is its own Touches row (Medium = Application, Outreach Type = Application submitted).
L219: 
--- lines 245-262 ---
L245: ## FOLLOW-UP AND PHONE - THE 10-TOUCH CADENCE (v3 wording, 2026-10-06)
L246: 
L247: About 10 touches for someone to remember a name (Pam: "It's never too much"). Run per decision maker; the three people at one company run in parallel with different content.
L248: 
L249: | # | Day | Channel | Content |
L250: |---|---|---|---|
L251: | 1 | 0 | Email | The cold skeleton note with an arm A or B close |
L252: | 2 | 0 (minutes after send) | Phone | Live: "Hi [First name], Scott Reasinger. FYI I just sent you an email." Voicemail: the voicemail line below, then hang up. |
L253: | 3 | 0 | Text (only if a mobile is known) | "Hi [First name], Scott Reasinger. FYI I just sent you an email." |
L254: | 4 | 2 | Phone | Call at 10 AM their time (Scott's own slot; nothing was promised). Voicemail below if no answer. |
L255: | 5 | 4 | Phone | Ghost call: dial, no voicemail, hang up. |
L256: | 6 | 5 | LinkedIn | Connection note (Template D) with a *different* number than the email |
L257: | 7 | 7-10 | Email | Forward the original. Body: "Not sure if you saw this." |
L258: | 8 | 8-11 | Phone | Ghost call |
L259: | 9 | 14 | Email | Subject "quick question." 3 sentences max, one new number, a new close in the same arm (not the touch-1 wording) |
L260: | 10 | 17-21 | Email + phone | Subject "curious?" with 2 sentences (new number, close in the same arm), then the voicemail line |
L261: 
L262: Close rules (objectives.md, these govern): a job's touch count is the highest number of Sent touches to any single contact on it; it never goes more than 7 days without a touch; touch 10 to a contact with no response from anyone closes the job (Jobs Stage Closed, Close Reason 10 touches); a "not now" or "check back later" closes it (Not now); a filled notice closes it (Filled). Once a hiring-side human responds, set Stage = Conversation and the counter resets; 10 more with no response closes it as Ghosted. Note the stopped contact in its Contacts row. The other decision makers keep running until the job closes. New information restarts the clock. **Any reply turns the contact warm:** answer the same day, deliver what the close offered, then the choice close. **A reply that asks Scott to stop, or a critique like Ferrari's, ends the cadence for that company** unless Scott decides otherwise.
--- lines 344-366 ---
L344: LibreOffice verification renders use Carlito for Calibri; Word and Cowork preview may reflow. Never ship a page with less than about a quarter-inch of white space below the last line in the verification render. Fix with a real line cut, then re-render.
L345: 
L346: ## EMAIL DELIVERY - SPARK (v3.4, 2026-10-26)
L347: 
L348: Spark Pro is the mail system for every account; Gmail is no longer used for outreach drafts or for reading reasinger.net mail (forwarders retired 2026-10-26). The Spark tools run through Scott's linked computer (mcp__remote-devices__Spark__*); load them with ToolSearch.
L349: 
L350: | Purpose | Spark account (`account`) |
L351: |---|---|
L352: | Job search: outreach, cover notes, recruiters, networking, follow-ups | `scott@reasinger.net` |
L353: | Your Cigar Den Indy, Scott personally | `scott@yourcigardenindy.com` |
L354: | Your Cigar Den Indy founder-member outreach and replies | `founders@yourcigardenindy.com` |
L355: | Never for outreach | `sreasinger@gmail.com` |
L356: 
L357: - **New note:** `Spark__draft` with `account`, `to`, `subject`, `body` (markdown, no signature, no sign-off). Every account appends its own signature.
L358: - **Reply on a thread:** `Spark__draft` with `reply_to: <Spark message ID>` and `account`. Find the ID with `Spark__search` (query) or `Spark__emails` (filter, `folder: "scott@reasinger.net:Inbox"`). A reply to everyone on the thread uses `reply_all`.
L359: - **Forward of the original (touch 7):** `Spark__draft` with `forward: <ID of Scott's sent touch 1>`, `account: scott@reasinger.net`, body "Not sure if you saw this." Find the original with `Spark__emails` `folder: "scott@reasinger.net:Sent"`, `filter: "to:<address>"`.
L360: - **Edit a draft:** `Spark__draft` with `edit: <draft ID>`. **Delete:** `delete: <draft ID>` alone (permanent).
L361: - **Sending:** Scott sends. Claude never uses `Spark__action send` unless Scott asks for that specific message to be sent in this session.
L362: - **Send confirmation (send-then-log):** after Scott says sent, confirm it in `scott@reasinger.net:Sent` before logging.
L363: - **Bounces:** `Spark__emails` with `folder: "scott@reasinger.net:Inbox"`, `filter: "from:mailer-daemon newer_than:3d"`, plus `Spark__search` query "delivery failed undeliverable" in `scott@reasinger.net`. A 550 5.4.1 means the mailbox does not exist; switch to the fallback address or LinkedIn the same day.
L364: - **Spark unreachable** (computer asleep, app closed): say so, write the note into the build file, and give Scott the text to paste. Never fall back to a Gmail draft.
L365: 
L366: ## NOTION RECORDS PROTOCOL

==================================================================
SOURCE FILE: skill-gatekeeper-panel.md (excerpt; original line numbers shown)
==================================================================
--- lines 1-7 ---
L1: ---
L2: name: "gatekeeper-panel"
L3: description: "Scott Reasinger executive job search - final gate before any outreach note, cover note, follow-up, voicemail script, or resume ships. Triggers on 'run the panel', 'gatekeeper review', 'review panel', or automatically as the last step of every Get In The Room sequence. Deterministic script plus isolated reader subagents test one thing: would this make the reader take a call."
L4: ---
L5: 
L6: # Gatekeeper Panel
L7: ## Scott Reasinger - Curiosity Gate (v3.4: 2026-10-26 - SPARK SIGNATURE. Drafts ship from Spark, which appends the scott@reasinger.net signature; the check file ends with that signature, the draft body does not. Everything else from v3.3 stands.)
--- lines 44-50 ---
L44: ---
L45: 
L46: ## STEP 0: DETERMINISTIC GATE (script, always first, no subagents until it passes)
L47: 
L48: Save the draft (message text plus signature; resume as the rendered PDF) and run. For email, cover and InMail drafts the file ends with the Spark account signature exactly as it will render (`Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger` for scott@reasinger.net); the Spark draft body itself carries no signature because Spark appends it (v3.4, 2026-10-26).
L49: 
L50: ```bash
--- lines 200-210 ---
L200:                 fails.append("BENEFIT (v3.2.1): no outcome clause after the number (revenue, cost, time, capacity, customers, more/less...); a bare restatement is not a benefit")
L201:             owner = re.search(r"\b(you|your)\b", ben, re.I) or (a.company and a.company.lower() in ben.lower())
L202:             if not owner:
L203:                 fails.append("BENEFIT OWNER (v3.3): the benefit must say what the READER gets (you/your/" + (a.company or "their company") + "), not what happened at Scott's past employer: " + (ben[:80] or "(none)"))
L204:     if a.type in ("email", "cover", "inmail"):
L205:         if "reasinger.net" not in sig.lower() or "linkedin.com/in/" not in sig.lower():
L206:             fails.append("signature must carry LinkedIn + reasinger.net + phone; end the check file with the Spark signature: Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger")
L207:     if "[" in t or "]" in t: fails.append("unfilled [bracket] placeholder")
L208:     TIMEFREE = lambda x: re.sub(r"\b\d{1,2}(:\d\d)?\s?(AM|PM|am|pm|a\.m\.|p\.m\.)|\b\d+\s?minutes?\b|\b317-460-0736\b", "", x)
L209:     nums = [m.group(0).strip() for m in NUM.finditer(TIMEFREE(body_nosal)) if not YEAR.fullmatch(m.group(0).strip())]
L210:     if a.type not in ("forward", "text", "voicemail") and not nums: fails.append("no number in the message")
