# cpanel-mail-mcp: Rule Inventory (pass 2)

Source: source-pack.md (01-design-v0.2.md, 02-spike-results.md, skill-email-crap-filter.md, skill-get-in-the-room.md, skill-gatekeeper-panel.md). Line references are the original line numbers shown as "L<n>:" in the pack.

---

## A. Goal, scope and non-goals

Rule ID: GOAL-NO-PC
Statement: The server must be a cloud-hosted remote MCP server that gives Claude the mailbox operations the three skills use today, directly against the cPanel IMAP servers, so that no scheduled or interactive email task requires the PC sarhomepc.
Source: 01-design-v0.2.md L15: "A remote MCP server, hosted in the cloud, that gives Claude the same mailbox operations those skills use today, directly against the cPanel IMAP servers, so no scheduled or interactive email task requires sarhomepc."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: GOAL-SUCCESS-TEST
Statement: The success test is passed only when, with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature.
Source: 01-design-v0.2.md L17: "Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: NG-NO-SEND
Statement: v1 of the server must not send mail and must include no SMTP capability; Scott sends from Spark.
Source: 01-design-v0.2.md L21: "Sending mail. No skill sends autonomously. Scott sends from Spark. No SMTP in v1."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: NG-NOT-A-CLIENT
Statement: The server is the automation path only; it does not replace Spark as Scott's mail client, which remains the human interface.
Source: 01-design-v0.2.md L22: "Replacing Spark as Scott's mail client. Spark stays the human interface; this server is the automation path."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: NG-NO-SPARK-ONLY-FEATURES
Statement: The server must not implement Spark-only features (comments, team sharing, templates, contacts, calendar events, meetings, availability) in v1.
Source: 01-design-v0.2.md L23: "Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them."
Type: structural gate
Confidence: low
Ambiguity note: The non-goals list "availability" as an excluded Spark-only feature, but the v1 tool surface (01-design-v0.2.md L116) includes an `availability` tool: "Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills." Reading 1: the excluded item is Spark's calendar/scheduling availability feature, and the server's `availability` is an unrelated health check that reuses the name. Reading 2: the two lines contradict and one of them must change. The source does not say which.

Rule ID: NG-NO-GMAIL
Statement: The server must not serve sreasinger@gmail.com; that mailbox stays on the Gmail connector.
Source: 01-design-v0.2.md L24: "Gmail. sreasinger@gmail.com stays on the Gmail connector."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: NG-NO-PERMANENT-DELETE
Statement: The server must not permanently delete messages; deleting a draft is the only delete operation in scope.
Source: 01-design-v0.2.md L25: "Permanent delete of messages. Draft delete is the only delete in scope."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: NG-SINGLE-USER
Statement: The server serves exactly one principal, Scott; multi-user support is out of scope.
Source: 01-design-v0.2.md L26: "Multi-user. One principal: Scott."
Type: structural gate
Confidence: high
Ambiguity note: none.

---

## B. Accounts and hosts

Rule ID: ACCT-THREE-MAILBOXES
Statement: The server must serve exactly three mailboxes: scott@reasinger.net on cPanel A (server128.web-hosting.com), and scott@yourcigardenindy.com and founders@yourcigardenindy.com on cPanel B (yourcigardenindy.com).
Source: 01-design-v0.2.md L34-L36: "| scott@reasinger.net | cPanel A (server128.web-hosting.com) | crap-filter Part B and C, get-in-the-room |" / "| scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |" / "| founders@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |"; L38: "Two hosts, three logins."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-CPANEL-A-HOST
Statement: The IMAP host for cPanel A must be server128.web-hosting.com on port 993, not reasinger.net, because reasinger.net is the web host record and the certificate is issued for the server name.
Source: 01-design-v0.2.md L38: "cPanel A IMAP host is `server128.web-hosting.com:993` (cPanel suggests `reasinger.net`, which is the web host record; use the server name)."; 02-spike-results.md L25: "Use `server128.web-hosting.com` as IMAP host. cPanel's suggested `reasinger.net` is the web host record and the certificate is for the server name."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-CPANEL-B-HOST-UNCONFIRMED
Statement: The cPanel B IMAP host must be confirmed from that cPanel's address bar before it is configured; it is not yet known.
Source: 01-design-v0.2.md L38: "cPanel B host still to confirm from that cPanel's address bar."
Type: tracking-only check
Confidence: medium
Ambiguity note: The table at L35-L36 lists cPanel B as "yourcigardenindy.com", which by the same reasoning as cPanel A (L38) may be only the web host record. Reading 1: yourcigardenindy.com is a placeholder and the real IMAP server name is unknown. Reading 2: yourcigardenindy.com is usable as the IMAP host. The source says only that the host is "still to confirm", so I treat the value as unconfirmed.

Rule ID: ACCT-CPANEL-A-FOLDER-LAYOUT
Statement: On cPanel A, folders use the `INBOX.` prefix with `.` as delimiter, and all folders advertise SPECIAL-USE.
Source: 01-design-v0.2.md L38: "cPanel A folders use the `INBOX.` prefix with `.` delimiter and advertise SPECIAL-USE (spike run 3)."; 02-spike-results.md L46: "Folder map, cPanel A (delimiter `.`, all advertise SPECIAL-USE):"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-CPANEL-A-FOLDER-MAP
Statement: The recorded cPanel A folder map is Inbox = INBOX; Sent = INBOX.Sent (\Sent); Drafts = INBOX.Drafts (\Drafts); Archive = INBOX.Archive (\Archive); Trash = INBOX.Trash (\Trash); Junk = INBOX.spam (\Junk); and INBOX.Junk, which has no special-use flag and maps to no logical name.
Source: 02-spike-results.md L50-L56: "| Inbox | INBOX | |" / "| Sent | INBOX.Sent | \\Sent |" / "| Drafts | INBOX.Drafts | \\Drafts |" / "| Archive | INBOX.Archive | \\Archive |" / "| Trash | INBOX.Trash | \\Trash |" / "| Junk | INBOX.spam | \\Junk |" / "| (none) | INBOX.Junk | none. A second junk folder without the flag. Discovery must prefer SPECIAL-USE over name match. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-CPANEL-B-FOLDERS-PENDING
Statement: Folder names and SPECIAL-USE flags for the two cPanel B accounts have not been recorded and must still be captured.
Source: 02-spike-results.md L69: "| 2 | Folder names and SPECIAL-USE | cPanel A done (above). cPanel B pending. |"; 01-design-v0.2.md L188: "Folder names and SPECIAL-USE flags recorded for all three accounts."
Type: tracking-only check
Confidence: medium
Ambiguity note: The source does not say whether this blocks build or only acceptance. 01-design-v0.2.md L183 says cPanel B items are "deferred to integration tests", but see TEST-CPANEL-B-CONFLICT for why that route is itself unclear.

Rule ID: ACCT-TEST-MAILBOX
Statement: The test mailbox for integration tests is mcptest@reasinger.net on cPanel A.
Source: 01-design-v0.2.md L38: "A test mailbox, mcptest@reasinger.net, exists on cPanel A for integration tests."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-REGISTRY-STATIC
Statement: The account registry must be static config with one entry per mailbox, each holding id, host, port 993, a secret_ref naming the platform secret for the password, the exact per-account signature text, and folders (discovered at first connect, cached, overridable).
Source: 01-design-v0.2.md L90-L98: "Static config, one entry per mailbox:" / "id: scott@reasinger.net" / "host: <cPanel A IMAP host>" / "port: 993" / "secret_ref: IMAP_PASS_REASINGER_SCOTT" / "signature: <exact per-account signature text, appended by the server, see D1>" / "folders: discovered at first connect, cached, overridable"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-PURPOSE-MAP
Statement: Drafts must be created in the account that matches their purpose: job-search outreach, cover notes, recruiters, networking and follow-ups use scott@reasinger.net; Your Cigar Den Indy work for Scott personally uses scott@yourcigardenindy.com; founder-member outreach and replies use founders@yourcigardenindy.com; sreasinger@gmail.com is never used for outreach.
Source: skill-get-in-the-room.md L352-L355: "| Job search: outreach, cover notes, recruiters, networking, follow-ups | `scott@reasinger.net` |" / "| Your Cigar Den Indy, Scott personally | `scott@yourcigardenindy.com` |" / "| Your Cigar Den Indy founder-member outreach and replies | `founders@yourcigardenindy.com` |" / "| Never for outreach | `sreasinger@gmail.com` |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ACCT-USAGE-SCOPE
Statement: The design records that scott@reasinger.net is used by crap-filter Parts B and C and by get-in-the-room, while the two yourcigardenindy.com accounts are used by crap-filter Part B only.
Source: 01-design-v0.2.md L34-L36: "crap-filter Part B and C, get-in-the-room" / "crap-filter Part B" / "crap-filter Part B"
Type: definition
Confidence: medium
Ambiguity note: skill-get-in-the-room.md L353-L354 assigns get-in-the-room drafts to scott@yourcigardenindy.com and founders@yourcigardenindy.com as well. Reading 1: the design table is incomplete and the server must support get-in-the-room draft operations on all three accounts. Reading 2: the design intends draft operations on the cPanel B accounts to be out of scope for v1. I recorded the design table as written; the tool surface does not restrict drafts by account.

---

## C. Hosting and runtime

Rule ID: HOST-DEDICATED-CF-ACCOUNT
Statement: The server must be hosted on Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, protected by hardware-key 2FA, and isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.
Source: 01-design-v0.2.md L77: "Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: HOST-NO-FALLBACK-PLATFORM
Statement: Fly.io or a VPS is not a fallback hosting option; Workers is the decided platform.
Source: 01-design-v0.2.md L79: "Fly.io/VPS is no longer the fallback."; L162: "DECIDED (spike run 2): Workers, with a minimal native-socket IMAP client."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: HOST-TRANSPORT
Statement: Claude must reach the server over MCP via HTTPS using streamable HTTP with an OAuth bearer token.
Source: 01-design-v0.2.md L62: "| MCP over HTTPS (streamable HTTP), OAuth bearer"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: HOST-COMPONENTS
Statement: The Worker must contain an OAuth provider (workers-oauth-provider) with a single allowed principal, a Spark-compatible tool layer, a Gmail-style-to-IMAP-SEARCH filter translator, a stable-message-ID codec, an account registry (3 accounts, 2 hosts, folder maps), and a minimal IMAP client on cloudflare:sockets over TLS port 993.
Source: 01-design-v0.2.md L64-L70: "cpanel-mail-mcp (Cloudflare Worker, CF account: scott@reasinger.net)" / "|-- OAuth provider (workers-oauth-provider), single allowed principal" / "|-- Tool layer (Spark-compatible schema)" / "|-- Filter translator (Gmail-style -> IMAP SEARCH)" / "|-- ID codec (stable message IDs)" / "|-- Account registry (3 accounts, 2 hosts, folder maps)" / "|-- IMAP client (minimal, on cloudflare:sockets, TLS 993)"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: IMAP-NATIVE-CLIENT
Statement: The server must use a minimal IMAP client written on `cloudflare:sockets`, not imapflow, because imapflow times out on the Workers runtime; the client implements only the commands the design needs.
Source: 01-design-v0.2.md L79: "Spike result (D2): imapflow times out on the Workers runtime (`ETIMEOUT` after 30 s) even though raw TLS to cPanel succeeds in about 300 ms. The server therefore uses a minimal IMAP client written on `cloudflare:sockets` (prototype: `spike/src/imap.js`). It implements only the commands this design needs."; 02-spike-results.md L28: "Decision D2: stay on Workers; replace imapflow with a minimal IMAP client on the native socket (`spike/src/imap.js`)."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: IMAP-AUTH-PLAIN-SASLIR
Statement: IMAP login must use AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping.
Source: 01-design-v0.2.md L79: "Login is AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping."; 02-spike-results.md L38: "| Login, AUTHENTICATE PLAIN with SASL-IR | PASS | 278 |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: IMAP-EXPLICIT-TIMEOUTS
Statement: Every network read or step must have an explicit timeout so that no step can hang the request.
Source: 01-design-v0.2.md L79: "Every read has an explicit timeout; no step may hang."; 02-spike-results.md L26: "First attempt with no timeouts hung the request indefinitely. Every network step now has an explicit timeout."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: IMAP-REQUIRED-COMMANDS
Statement: The IMAP client must support, at minimum, login, LIST, SELECT, SEARCH, FETCH, APPEND and STORE of flags; whether MOVE is also a required feasibility operation is unclear.
Source: 01-design-v0.2.md L187: "imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts."; 02-spike-results.md L82: "login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE against both hosts"
Type: definition
Confidence: low
Ambiguity note: The design's criterion 1 lists MOVE; the spike results' restatement of the same criterion omits MOVE, and spike run 3 (L34-L44) never ran MOVE. Reading 1: MOVE is required and simply untested (design L183 defers "archive move" to integration tests). Reading 2: the spike criterion was narrowed and MOVE is not a feasibility requirement. Either way the `archive` and `move` actions (design L121) need some move operation in the build.

Rule ID: IMAP-PROTOCOL-TOLERANCE
Statement: The IMAP client must work with LITERAL+ both on and off, with literal mailbox names, must handle auth failure, and must time out on a silent server; these cases were unit tested against a scripted Dovecot fake.
Source: 02-spike-results.md L28: "Unit tested against a scripted Dovecot fake (LITERAL+ on and off, literal mailbox names, auth failure, silent-server timeout)."
Type: other
Confidence: medium
Ambiguity note: The line reports what the prototype was tested against rather than stating a requirement for the production client. I read it as setting the minimum protocol cases the client must handle. The other reading is that it is only a record of spike coverage.

Rule ID: HOST-BUNDLE-LIMIT
Statement: The Worker bundle must stay under the Workers size limit (3 MB free / 10 MB paid).
Source: 02-spike-results.md L9: "| imapflow 1.7.8 bundles for Workers (`nodejs_compat`, wrangler 4.156.0) | PASS. 1.79 MB raw, 454 KB gzip. Under the 3 MB free / 10 MB paid limit. |"; L28: "Bundle drops from 454 KB to 4.6 KB gzip."
Type: tracking-only check
Confidence: medium
Ambiguity note: The limit is mentioned only as context for the imapflow bundle check, not stated as a requirement. Which plan (free or paid) applies is not stated.

Rule ID: HOST-DELIVERY-SEQUENCE
Statement: The server must be deployed to the dedicated Cloudflare account and then added as a claude.ai custom connector.
Source: 01-design-v0.2.md L203: "Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector."
Type: sequencing
Confidence: high
Ambiguity note: none.

---

## D. Authentication and security

Rule ID: AUTH-OAUTH21
Statement: MCP clients must authenticate with OAuth 2.1 via `workers-oauth-provider`.
Source: 01-design-v0.2.md L83: "MCP clients authenticate with OAuth 2.1 via `workers-oauth-provider`, which claude.ai custom connectors support."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: AUTH-SINGLE-PRINCIPAL
Statement: The upstream identity check must allow exactly one principal (Scott) and refuse any other identity at authorize time.
Source: 01-design-v0.2.md L84: "The upstream identity check allows exactly one principal (Scott). Any other identity is refused at authorize time."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: AUTH-NO-AUTHLESS
Statement: The server must not offer an authless mode or a shared-secret URL.
Source: 01-design-v0.2.md L85: "No authless mode, no shared-secret URL."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: AUTH-UPSTREAM-IDP-OPEN
Statement: The upstream identity provider and the token lifetimes are an open decision (D3); the leaning is GitHub (login ironfis1) with a single allowed login.
Source: 01-design-v0.2.md L86: "Token lifetimes and the upstream identity provider are an open decision (D3)."; L163: "| D3 | OAuth upstream identity | GitHub (ironfis1), Google, Cloudflare Access | GitHub, single allowed login. Open. |"
Type: tracking-only check
Confidence: medium
Ambiguity note: The decision is open. The options are GitHub (ironfis1), Google or Cloudflare Access. The leaning is GitHub, but nothing is decided, and no token lifetime is proposed.

Rule ID: SEC-LEAST-PRIVILEGE
Statement: The server may read, flag, move and write to Drafts only; it must expose nothing that sends and nothing that permanently deletes received mail.
Source: 01-design-v0.2.md L53: "**Least privilege.** Read, flag, move, and write to Drafts. Nothing that sends, and nothing that permanently deletes received mail."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SEC-SECRETS-PLATFORM-ONLY
Statement: Mailbox credentials must live only in platform secrets and never appear in code or logs.
Source: 01-design-v0.2.md L56: "**No secrets in code or logs.** Credentials live only in platform secrets. Message bodies are never logged."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SEC-UNIQUE-PASSWORDS
Statement: Each mailbox must have a unique password, as part of mitigating credential compromise across both businesses.
Source: 01-design-v0.2.md L175: "| R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |"
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SEC-SECRET-ROTATION
Statement: Changing a mailbox password must require only one secret update, and this procedure must be documented in the README.
Source: 01-design-v0.2.md L216: "Secrets rotation: mailbox password change means one secret update; documented in README."
Type: other
Confidence: high
Ambiguity note: none.

---

## E. Connection model and failure handling

Rule ID: CONN-PER-REQUEST
Statement: The server must open one IMAP session per account per request, lazily, and close it at request end; no persistent connections and no pooling.
Source: 01-design-v0.2.md L105: "One IMAP session per account per request, opened lazily, closed at request end. No persistent connections. Measured cost (spike run 3): about 750 ms to connect and log in, about 45 ms per command after that, so per-request connect is acceptable and no pooling is needed."; 02-spike-results.md L62: "Connection setup plus login is about 750 ms per account, so per-request connect is acceptable; no pooling needed."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: CONN-PARALLELISM
Statement: Operations must run in parallel across accounts and sequentially within an account, which also keeps each account to one session at a time to respect cPanel connection limits.
Source: 01-design-v0.2.md L105: "Parallel across accounts, sequential within an account."; L177: "| R6 | cPanel connection limits per account | One session per account per request; sequential within account |"
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: CONN-AUTH-FAIL-NO-RETRY
Statement: On any IMAP authentication failure, the server must not retry, must disable that account for the rest of the request, and must return an error telling the caller to check the secret (to avoid cPHulk blocking the cloud IP).
Source: 01-design-v0.2.md L107: "cPHulk risk: repeated failed logins from a cloud IP can block that IP on the cPanel host. Mitigation: on any auth failure, the account is disabled for the remainder of the request and the error says to check the secret; no retries on auth errors."; L173: "No retry on auth failure."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: CONN-NO-IP-WHITELIST
Statement: Egress IP whitelisting on the cPanel hosts is not available because Workers egress IPs are not stable; a cPHulk block must be cleared by a manual cPanel unblock.
Source: 01-design-v0.2.md L107: "Egress IP whitelisting on both hosts if the hosting option gives a stable egress IP (Workers does not by default; see R2)."; L173: "Workers egress IPs are not stable, so whitelisting is not available; a block means a cPanel unblock by hand."
Type: other
Confidence: high
Ambiguity note: none.

Rule ID: FAIL-PER-HOST-LOUD
Statement: A failure on one cPanel host must never silently hide results from the other, and every response must state which accounts were reached.
Source: 01-design-v0.2.md L54: "**Fail loudly, per host.** A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: FAIL-SKILL-UNREACHABLE-BRANCH
Statement: When business-mailbox access is unavailable, email-crap-filter must run Part A only, report Parts C and B as not run, put "Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)" as the report's first line, never treat the run as clean, and notify on a scheduled run.
Source: skill-email-crap-filter.md L19-L23: "Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action) run through Scott's linked computer; load them with ToolSearch. If they are absent or the computer is unreachable, run Part A only and put \"Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)\" as the first line of the report. Never treat that as a clean run."; L257: "Spark unreachable: run Part A, report Parts C and B as not run (notify)."
Type: structural gate
Confidence: low
Ambiguity note: The skill defines failure as "Spark unreachable" (whole connector absent, computer asleep). On the new server a failure can be partial and per host (01-design-v0.2.md L54), for example cPanel B down while cPanel A answers, and the design says migrating removes the "Spark unreachable" branch (L52). Reading 1: the branch is removed and replaced by per-account failure reporting from the server, with Part C still run if cPanel A is up. Reading 2: the branch stays as the fallback for when the server itself is unreachable (D6 keeps Spark as a fallback for 30 days, L166), with new wording. The source sets neither the new trigger condition nor the new report wording.

Rule ID: FAIL-GITR-UNREACHABLE
Statement: When mail access is unavailable, get-in-the-room must say so, write the note into the build file, give Scott the text to paste, and never fall back to a Gmail draft.
Source: skill-get-in-the-room.md L364: "**Spark unreachable** (computer asleep, app closed): say so, write the note into the build file, and give Scott the text to paste. Never fall back to a Gmail draft."
Type: structural gate
Confidence: low
Ambiguity note: The trigger "computer asleep, app closed" belongs to the Spark path, which the new server is designed to remove (01-design-v0.2.md L15, L52). Reading 1: the rule now fires when the server or the needed cPanel host is unreachable. Reading 2: it fires only on the retained Spark fallback during the 30-day D6 window. The "never fall back to a Gmail draft" part holds under both readings.

Rule ID: FAIL-ALERT-PREFLIGHT
Statement: Scheduled skills must call `availability` first and push-notify on any host failure.
Source: 01-design-v0.2.md L215: "Alerting: scheduled skills call `availability` first and push-notify on any host failure."; L116: "Used as a preflight by scheduled skills."
Type: sequencing
Confidence: medium
Ambiguity note: skill-email-crap-filter.md L246-L249 already notifies "if any part failed or Spark was unreachable", but its order (Part C first, L10) has no preflight step. Reading 1: the `availability` call is added before Part C. Reading 2: a part's own failure counts as the alert, and the preflight is optional. The design states it as an operations rule, so I recorded it as required.

---

## F. Logging

Rule ID: LOG-FIELDS
Statement: Each operation must log the tool name, account, host, outcome, latency and error class.
Source: 01-design-v0.2.md L214: "Logging: tool name, account, host, outcome, latency, error class."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: LOG-EXCLUSIONS
Statement: Logs must never contain message bodies, credentials, or correspondents' full addresses; correspondent addresses may appear only as their domain.
Source: 01-design-v0.2.md L214: "Never bodies, never credentials, never full addresses of correspondents beyond domain."; L56: "Message bodies are never logged."
Type: structural gate
Confidence: high
Ambiguity note: none.

---

## G. Compatibility with Spark

Rule ID: COMPAT-DROP-IN
Statement: Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar must mirror the Spark connector, so that migrating a skill means swapping the tool prefix and removing the "Spark unreachable" branch, not rewriting it.
Source: 01-design-v0.2.md L52: "**Drop-in compatibility.** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector. Migrating a skill is a tool-prefix swap plus removing the \"Spark unreachable\" branch, not a rewrite."; L111: "Names and parameters follow the Spark connector. Exact schemas are set in the spec."
Type: structural gate
Confidence: medium
Ambiguity note: Several skill behaviors cannot be carried by a prefix swap alone (signature responsibility, send, send-confirmation lookup, edit returning a new ID). See the low-confidence rules in sections J and K. Reading 1: "drop-in" covers call shapes only, and behavioral differences are accepted. Reading 2: the server should mimic Spark behavior wherever a skill depends on it. Exact schemas are deferred to the spec (L111).

Rule ID: COMPAT-SPARK-SEES-ALL
Statement: All server writes must be plain IMAP state (flags, folder moves, Drafts appends) so that Spark on any device reflects them without sync tricks.
Source: 01-design-v0.2.md L55: "**Spark sees everything.** All writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: COMPAT-CURRENT-CALLS
Statement: The server must cover the Spark calls the skills make today: for email-crap-filter, `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive`; for get-in-the-room, `draft` new, `reply_to`, `reply_all`, `forward`, `edit`, `delete`, `emails` on Inbox and Sent with filters, and `search`; gatekeeper-panel makes no direct calls.
Source: 01-design-v0.2.md L44-L46: "| email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |" / "| get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |" / "| gatekeeper-panel | None directly. Assumes the draft body carries no signature and the sent mail carries the account signature. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: COMPAT-SKILL-TOOL-NAMES
Statement: The skills currently call the tools by the names mcp__remote-devices__Spark__emails, __search, __thread, __action and __draft, loaded through ToolSearch; after cutover they switch to this server's tool prefix.
Source: skill-email-crap-filter.md L19-L20: "Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action) run through Scott's linked computer; load them with ToolSearch."; skill-get-in-the-room.md L348: "The Spark tools run through Scott's linked computer (mcp__remote-devices__Spark__*); load them with ToolSearch."; 01-design-v0.2.md L209: "Cutover: skills switch tool prefix; Spark path becomes fallback per D6."
Type: definition
Confidence: high
Ambiguity note: none.

---

## H. Tool surface

Rule ID: TOOL-ACCOUNTS
Statement: The `accounts` tool must list the configured accounts and each account's reachability.
Source: 01-design-v0.2.md L115: "| `accounts` | List configured accounts and per-account reachability. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: TOOL-AVAILABILITY
Statement: The `availability` tool must run a health check per host covering TCP, TLS, login and SELECT INBOX.
Source: 01-design-v0.2.md L116: "| `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |"
Type: definition
Confidence: medium
Ambiguity note: The check is defined "per host", but login and SELECT INBOX are per account (cPanel B has two logins). Reading 1: one login per host is enough. Reading 2: every account is logged in and selected. Also see NG-NO-SPARK-ONLY-FEATURES for the name clash with the excluded Spark "availability" feature.

Rule ID: TOOL-FOLDERS
Statement: The `folders` tool must list folders per account together with their logical-name mapping.
Source: 01-design-v0.2.md L117: "| `folders` | List folders per account with logical-name mapping. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: TOOL-EMAILS
Statement: The `emails` tool must list messages in `<account>:<Folder>`, accept `filter`, `page_size` and a paging cursor, and return for each message its ID, from, to, subject, date, snippet and flags.
Source: 01-design-v0.2.md L118: "| `emails` | List messages in `<account>:<Folder>` with `filter`, `page_size`, paging cursor. Returns ID, from, to, subject, date, snippet, flags. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: TOOL-EMAILS-PAGE-SIZE-100
Statement: The `emails` tool must accept `page_size: 100`, because email-crap-filter Part B requests 100 messages per account.
Source: skill-email-crap-filter.md L59-L60: "For each account call `Spark__emails` with `folder: \"<account>:Inbox\"`, `filter: \"newer_than:7d\"`, `page_size: 100`."
Type: definition
Confidence: medium
Ambiguity note: No maximum page_size is stated for the server. Reading 1: 100 must be honored in one page. Reading 2: the server may cap lower and the skill pages through with the cursor. The skill does not show paging for Part B, so a lower cap would silently truncate unless the skill is changed.

Rule ID: TOOL-SEARCH
Statement: The `search` tool must take a free-text query within one account or all accounts, plus an optional `filter`.
Source: 01-design-v0.2.md L119: "| `search` | Free-text query within one or all accounts, plus optional `filter`. |"
Type: definition
Confidence: medium
Ambiguity note: The skill passes the account as `in: "scott@reasinger.net"` (skill-email-crap-filter.md L37). It is not stated whether omitting `in` means all accounts, or how a multi-word free-text query is matched; see FILTER-BARE-WORDS-SEARCH.

Rule ID: TOOL-THREAD
Statement: The `thread` tool must return a message and its thread, reconstructed by References, then In-Reply-To, then subject fallback, with bodies as text.
Source: 01-design-v0.2.md L120: "| `thread` | Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: TOOL-THREAD-SCOPE
Statement: Thread reconstruction may need to span folders (for example Inbox and Sent), but the source does not define which folders a thread covers.
Source: 01-design-v0.2.md L120: "Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text."; L176: "| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |"
Type: other
Confidence: low
Ambiguity note: The source does not say whether a thread is built within the message's folder, across Inbox+Sent, or across all folders of the account. Acceptance compares output to Spark's view (R5), which shows replies and sent mail together, and that suggests cross-folder. But nothing states it, and the subject-fallback matching rules are not defined either.

Rule ID: TOOL-ACTION
Statement: The `action` tool must support `pin` / `unpin` (set/clear `\Flagged`), `read` / `unread` (set/clear `\Seen`), `archive` (move to the Archive folder) and `move` (to a named folder), and must not support `send` or permanent delete.
Source: 01-design-v0.2.md L121: "| `action` | `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to Archive), `move` (to named folder). No `send`, no permanent delete. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: TOOL-ACTION-MOVE-TARGETS
Statement: The `move` action moves a message to a named folder; whether Trash or Junk are allowed targets is not restricted by the design.
Source: 01-design-v0.2.md L121: "`move` (to named folder). No `send`, no permanent delete."; skill-email-crap-filter.md L79: "Never delete, move to trash, unsubscribe, or send. Never unpin."
Type: other
Confidence: medium
Ambiguity note: Reading 1: moving to Trash is allowed by the server because it is not a permanent delete, and the skill polices itself. Reading 2: under least privilege (01-design-v0.2.md L53) the server should refuse Trash as a target. The source does not say.

Rule ID: TOOL-ACTION-BATCH
Statement: The `action` tool must accept a batch of message IDs in one call (one call for all pins, one for all archives), and must report per-ID failures so the caller can log each failed ID and continue.
Source: skill-email-crap-filter.md L80-L81: "Batch IDs per action (one call for all pins, one for all archives). Log any failed ID and continue."
Type: definition
Confidence: medium
Ambiguity note: The skill requires batching and per-ID failure logging. The design's `action` row (01-design-v0.2.md L121) does not mention multiple IDs or partial-failure results. The batch may also span accounts, since Part B runs over three accounts; it is unclear whether one call may mix accounts or must be per account. I read the skill as forcing multi-ID support with per-ID results.

Rule ID: TOOL-DRAFT
Statement: The `draft` tool must support create new, `reply_to`, `reply_all`, `forward`, `edit` and `delete` (draft only), and must write to the account's Drafts folder.
Source: 01-design-v0.2.md L122: "| `draft` | Create new, `reply_to`, `reply_all`, `forward`, `edit`, `delete` (draft only). Appends to the account's Drafts folder. |"
Type: definition
Confidence: high
Ambiguity note: none.

---

## I. Folder discovery and message IDs

Rule ID: FOLD-DISCOVERY
Statement: Folder discovery must use IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, and fall back to name matching only when no folder carries the flag.
Source: 01-design-v0.2.md L101: "Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag."; 02-spike-results.md L60: "Folder resolution order: SPECIAL-USE first, name match only as fallback."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: FOLD-SPECIAL-USE-WINS
Statement: A SPECIAL-USE flag always beats a name match; on cPanel A, Junk resolves to `INBOX.spam` (flagged `\Junk`), not to the unflagged `INBOX.Junk`.
Source: 01-design-v0.2.md L101: "SPECIAL-USE always wins over name: cPanel A has both `INBOX.spam` (flagged `\Junk`) and `INBOX.Junk` (unflagged); Junk resolves to `INBOX.spam`."; 02-spike-results.md L56: "Discovery must prefer SPECIAL-USE over name match."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: FOLD-LOGICAL-NAMES
Statement: The logical names `Inbox`, `Sent`, `Drafts` and `Archive` must map to real folder names per account, and skills address folders as `<account>:<LogicalName>` (for example `scott@reasinger.net:Inbox`, `scott@reasinger.net:Sent`).
Source: 01-design-v0.2.md L101: "The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account."; skill-email-crap-filter.md L33: "`Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`,"; skill-email-crap-filter.md L71-L72: "check `scott@reasinger.net:Sent` for the sender if unsure"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: FOLD-CACHE-OVERRIDE
Statement: Discovered folders must be cached after first connect and be overridable in config.
Source: 01-design-v0.2.md L98: "folders: discovered at first connect, cached, overridable"
Type: definition
Confidence: medium
Ambiguity note: It is not stated where the cache lives (Workers has no persistent connection state; L105), how it is invalidated, or whether an override replaces discovery or only adds to it.

Rule ID: FOLD-ARCHIVE-NO-AUTOCREATE
Statement: The server must use the existing Archive folder and must never auto-create one; a missing Archive folder is an error.
Source: 01-design-v0.2.md L165: "| D5 | Archive folder | Use existing Archive if present, else create | cPanel A: `INBOX.Archive` with `\Archive` exists (spike run 3). cPanel B: verify in integration tests. Never auto-create; a missing Archive is an error. |"
Type: structural gate
Confidence: medium
Ambiguity note: The D5 "Options" column reads "Use existing Archive if present, else create", while the leaning column says "Never auto-create; a missing Archive is an error." I take the leaning column as the decision (it is the more specific, later statement), but the row contains both readings. Whether cPanel B has an Archive folder is unverified (02-spike-results.md L61: "Still to confirm on cPanel B.").

Rule ID: ID-OPAQUE-STABLE
Statement: The server must define its own opaque message ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID, and IDs must be stable across calls and sessions.
Source: 01-design-v0.2.md L126: "Spark IDs are opaque to skills, so the server defines its own opaque ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID. Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive). IDs are stable across calls and across sessions."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ID-LOOKUP-FALLBACK
Statement: Lookups by ID must use the UID when the folder's UIDVALIDITY matches, and fall back to a Message-ID header search when the message has moved (for example after archive).
Source: 01-design-v0.2.md L126: "Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive)."
Type: sequencing
Confidence: medium
Ambiguity note: The scope of the fallback search is not stated (same folder only, the Archive folder, or all folders of the account), nor what to do if several messages share a Message-ID or none is found.

Rule ID: ID-SPARK-ID-HANDOFF
Statement: get-in-the-room must give Scott a draft ID per recipient and must not call an email "ready" unless the draft exists.
Source: skill-get-in-the-room.md L217: "Email delivery = a Spark draft (see EMAIL DELIVERY - SPARK), never a Gmail draft. Give Scott the Spark draft ID per recipient; never call an email \"ready\" unless the draft exists."; skill-get-in-the-room.md L358: "**Reply on a thread:** `Spark__draft` with `reply_to: <Spark message ID>` and `account`."
Type: structural gate
Confidence: low
Ambiguity note: The skill relies on Spark message and draft IDs. The server issues its own opaque IDs (01-design-v0.2.md L126), which Spark does not show to Scott. Reading 1: Scott gets the server's draft ID, which is meaningful only for later server calls (edit/delete), and he finds the draft in Spark by recipient and subject. Reading 2: the hand-off needs something Scott can see in Spark (subject, recipient) in place of the ID. "Never call an email ready unless the draft exists" survives either way; the server's successful APPEND (with APPENDUID) is the evidence.

---

## J. Filter grammar

Rule ID: FILTER-TOKENS
Statement: The filter translator must support exactly these tokens mapped to IMAP SEARCH: `from:x` to `FROM x`; `to:x` to `TO x`; `subject:x` to `SUBJECT x`; `newer_than:Nd` to `SINCE <today-N>`; `older_than:Nd` to `BEFORE <today-N>`; `is:unread` / `is:read` to `UNSEEN` / `SEEN`; `is:pinned` to `FLAGGED`; bare words to `TEXT`.
Source: 01-design-v0.2.md L130-L141: "Supported tokens, translated to IMAP SEARCH:" / "| `from:x` | `FROM x` |" / "| `to:x` | `TO x` |" / "| `subject:x` | `SUBJECT x` |" / "| `newer_than:Nd` | `SINCE <today-N>` |" / "| `older_than:Nd` | `BEFORE <today-N>` |" / "| `is:unread` / `is:read` | `UNSEEN` / `SEEN` |" / "| `is:pinned` | `FLAGGED` |" / "| bare words | `TEXT` |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: FILTER-UNKNOWN-ERROR
Statement: An unknown filter token must produce an error and never be silently dropped.
Source: 01-design-v0.2.md L143: "Unknown tokens are an error, never silently dropped."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: FILTER-TIMEZONE
Statement: Filter date math must use the America/Indianapolis time zone.
Source: 01-design-v0.2.md L143: "Date math uses America/Indianapolis."
Type: calculation
Confidence: high
Ambiguity note: none.

Rule ID: FILTER-NEWER-THAN-SEMANTICS
Statement: `newer_than:Nd` is computed as IMAP `SINCE` the date N days before today (America/Indianapolis).
Source: 01-design-v0.2.md L137: "| `newer_than:Nd` | `SINCE <today-N>` |"; L143: "Date math uses America/Indianapolis."
Type: calculation
Confidence: medium
Ambiguity note: IMAP SINCE works at whole-date granularity and inclusively, so `newer_than:3d` returns messages from the start of the calendar day three days ago, which can be up to almost four days back. The skills' 3d bounce window (skill-email-crap-filter.md L34) and 7d windows may therefore return slightly more mail than under Spark/Gmail's rolling-window semantics. It is unclear whether this widening is acceptable or whether results should be trimmed by exact time. The parallel run (01-design-v0.2.md L207) requires "same messages found", which may surface the difference.

Rule ID: FILTER-COMBINED-TOKENS
Statement: A filter may combine several tokens in one string (for example "from:mailer-daemon newer_than:3d"), and they must be combined as an AND in IMAP SEARCH.
Source: skill-email-crap-filter.md L34-L35: "`filter: \"from:mailer-daemon newer_than:3d\"`, then again with `filter: \"from:postmaster newer_than:3d\"`."
Type: calculation
Confidence: medium
Ambiguity note: The design grammar (01-design-v0.2.md L130-L141) lists tokens but does not state the combination rule. AND is implied by Gmail-style syntax and by IMAP SEARCH default, but it is not stated. No OR or negation operator is listed, so a filter like "-is:pinned" would be an unknown-token error.

Rule ID: FILTER-SKILL-USES
Statement: The filter translator must handle these skill filters: "from:mailer-daemon newer_than:3d", "from:postmaster newer_than:3d", "newer_than:3d", "newer_than:7d" and "to:<address>".
Source: skill-email-crap-filter.md L34-L35: "`filter: \"from:mailer-daemon newer_than:3d\"`, then again with `filter: \"from:postmaster newer_than:3d\"`."; skill-email-crap-filter.md L37: "`filter: \"newer_than:3d\"`"; skill-email-crap-filter.md L60: "`filter: \"newer_than:7d\"`"; skill-get-in-the-room.md L359: "`filter: \"to:<address>\"`"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: FILTER-BARE-WORDS-SEARCH
Statement: The bounce sweep's free-text search for "delivery failed undeliverable address not found" must return real delivery-failure notices from scott@reasinger.net within the last 3 days.
Source: skill-email-crap-filter.md L36-L38: "`Spark__search` with `query: \"delivery failed undeliverable address not found\"`, `in: \"scott@reasinger.net\"`, `filter: \"newer_than:3d\"`. Keep only real delivery-failure notices (ignore normal mail the search also returns)."; 01-design-v0.2.md L141: "| bare words | `TEXT` |"
Type: calculation
Confidence: low
Ambiguity note: The skill expects a loose, ranked-style search ("ignore normal mail the search also returns"), which suggests Spark matches any of the words. If the server translates each bare word to an ANDed IMAP `TEXT` term, a notice must contain all six words ("delivery", "failed", "undeliverable", "address", "not", "found") and most bounces would be missed. Reading 1: query words are ORed (any match). Reading 2: words are ANDed, following IMAP SEARCH default, and the skill query must change. Reading 3: the whole query is one TEXT phrase. The source does not decide this, and the result drives the parallel-run "same bounces" check (01-design-v0.2.md L207).

Rule ID: FILTER-FROM-MATCH
Statement: `from:mailer-daemon` and `from:postmaster` must match bounce senders from cPanel Mailer-Daemon, Google mailer-daemon, and Microsoft and Mimecast postmaster@ addresses.
Source: skill-email-crap-filter.md L30-L31: "Bounce senders vary (cPanel Mailer-Daemon, Google mailer-daemon, Microsoft and Mimecast postmaster@, \"Undeliverable:\" subjects), so run both calls:"; 01-design-v0.2.md L134: "| `from:x` | `FROM x` |"
Type: calculation
Confidence: medium
Ambiguity note: IMAP FROM is a case-insensitive substring match on the From header, which would catch "Mailer-Daemon" and "MAILER-DAEMON". But the design does not state case handling, or whether the match covers display name and address together. I assume the IMAP-standard behavior.

---

## K. Drafts, threading, signature and send

Rule ID: DRAFT-NEW-APPEND
Statement: A new draft must be built as an RFC 5322 message and APPENDed to the account's Drafts folder with the `\Draft` flag.
Source: 01-design-v0.2.md L147: "New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag."
Type: definition
Confidence: medium
Ambiguity note: The spike appended with both flags (02-spike-results.md L44: "APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+"), and that draft displayed and sent correctly in Spark. The design names only `\Draft`. Reading 1: `\Draft` alone is required. Reading 2: `\Draft \Seen`, as proven in the spike, is the intended flag set (an unseen draft may show as unread in Spark).

Rule ID: DRAFT-NEW-PARAMS
Statement: A new-note draft is created with `account`, `to`, `subject` and `body`, where the body is markdown and carries no signature and no sign-off.
Source: skill-get-in-the-room.md L357: "**New note:** `Spark__draft` with `account`, `to`, `subject`, `body` (markdown, no signature, no sign-off). Every account appends its own signature."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-BODY-RENDER
Statement: Draft body input is markdown, and the server must render it into a multipart message with text and HTML parts.
Source: 01-design-v0.2.md L152: "Body input is markdown; the server renders multipart text and HTML."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-REPLY
Statement: A reply or reply-all draft must set `In-Reply-To` and `References` from the original, use a `Re:` subject, take recipients from the original according to the reply mode, and place the quoted original below the body.
Source: 01-design-v0.2.md L148: "Reply / reply all: set `In-Reply-To` and `References` from the original, `Re:` subject, recipients from the original per reply mode, quoted original below the body."
Type: definition
Confidence: medium
Ambiguity note: "Recipients from the original per reply mode" does not say how Reply-To headers are treated, whether Scott's own address is removed from reply-all, or whether Cc is kept. Also unspecified: whether an existing "Re:" prefix is reused rather than doubled.

Rule ID: DRAFT-REPLY-PARAMS
Statement: A reply draft is created with `reply_to: <message ID>` and `account`; a reply to everyone on the thread uses `reply_all`; the message ID is found with `search` (query) or `emails` (filter, folder `scott@reasinger.net:Inbox`).
Source: skill-get-in-the-room.md L358: "**Reply on a thread:** `Spark__draft` with `reply_to: <Spark message ID>` and `account`. Find the ID with `Spark__search` (query) or `Spark__emails` (filter, `folder: \"scott@reasinger.net:Inbox\"`). A reply to everyone on the thread uses `reply_all`."
Type: definition
Confidence: medium
Ambiguity note: The server ID already encodes the account (01-design-v0.2.md L126), and the skill also passes `account`. It is not stated what the server does if they disagree (reject, or trust one).

Rule ID: DRAFT-FORWARD
Statement: A forward draft must use a `Fwd:` subject and include the original; whether the original is inline-quoted or attached as .eml is open (D4), leaning inline quote.
Source: 01-design-v0.2.md L149: "Forward: `Fwd:` subject, original included (inline quote vs attachment is D4)."; L164: "| D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior). Open. |"
Type: definition
Confidence: medium
Ambiguity note: D4 is open. Reading 1: inline quote, which the design says matches touch-7 behavior. Reading 2: .eml attachment. Also unstated: whether a forward sets threading headers (In-Reply-To/References) or carries over the original's recipients.

Rule ID: DRAFT-FORWARD-TOUCH7
Statement: The touch-7 forward is a draft with `forward: <ID of Scott's sent touch-1 message>` in account scott@reasinger.net, with body "Not sure if you saw this."; the original is found with `emails` on `scott@reasinger.net:Sent` with `filter: "to:<address>"`.
Source: skill-get-in-the-room.md L359: "**Forward of the original (touch 7):** `Spark__draft` with `forward: <ID of Scott's sent touch 1>`, `account: scott@reasinger.net`, body \"Not sure if you saw this.\" Find the original with `Spark__emails` `folder: \"scott@reasinger.net:Sent\"`, `filter: \"to:<address>\"`."; skill-get-in-the-room.md L257: "| 7 | 7-10 | Email | Forward the original. Body: \"Not sure if you saw this.\" |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-EDIT
Statement: Editing a draft must append the new version and delete the old draft UID (IMAP has no in-place edit), and must return the new ID.
Source: 01-design-v0.2.md L150: "Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-EDIT-ID-CHANGE
Statement: The skill edits a draft by passing `edit: <draft ID>`; under the server, the edit invalidates that ID and returns a new one.
Source: skill-get-in-the-room.md L360: "**Edit a draft:** `Spark__draft` with `edit: <draft ID>`."; 01-design-v0.2.md L150: "Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID."
Type: other
Confidence: low
Ambiguity note: The skill treats the draft ID as fixed (it hands Scott "the Spark draft ID per recipient", skill-get-in-the-room.md L217), with no step to capture a new ID after edit. Reading 1: the skill must store the returned ID and re-issue it to Scott after any edit. Reading 2: the server keeps the old ID resolvable after an edit (for example through the Message-ID fallback, if the Message-ID is preserved). The design does not say whether an edit keeps the draft's Message-ID, or whether the edit input is a full body replacement or a patch.

Rule ID: DRAFT-EDIT-SIGNATURE
Statement: On edit, the server appends the account signature to the new version.
Source: 01-design-v0.2.md L153: "the server appends the account's configured signature to every draft it creates or edits."
Type: other
Confidence: medium
Ambiguity note: If the edit input is a full body taken from the existing draft (which already carries the server-appended signature), a second signature would be appended. Reading 1: edit input is always a signature-free body, and the server re-appends. Reading 2: the server strips its own previous signature before appending. Not specified.

Rule ID: DRAFT-DELETE-GUARD
Statement: Draft delete must refuse any target that lacks the `\Draft` flag or is not in the Drafts folder.
Source: 01-design-v0.2.md L151: "Delete: draft-only. Refuse if the target lacks `\Draft` or is not in the Drafts folder."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-DELETE-PERMANENT
Statement: get-in-the-room deletes a draft with `delete: <draft ID>` alone, and the deletion is permanent.
Source: skill-get-in-the-room.md L360: "**Delete:** `delete: <draft ID>` alone (permanent)."
Type: definition
Confidence: medium
Ambiguity note: "Alone" means no other parameters (body, account). The design allows draft delete as the only delete (01-design-v0.2.md L25), but does not say whether it is permanent (STORE \Deleted + EXPUNGE) or a move to Trash. The skill expects permanent. The design is silent, so the skill reading is taken but not confirmed. Also see DRAFT-EDIT-ID-CHANGE: a delete using an ID issued before an edit would target a UID that no longer exists.

Rule ID: SIG-SERVER-APPENDS
Statement: The server must append the account's configured signature to every draft it creates or edits; skills keep sending signature-free bodies.
Source: 01-design-v0.2.md L153: "Signature (D1): the server appends the account's configured signature to every draft it creates or edits. Spark does not add a signature to a draft it did not compose (spike run 3, verified with a default signature assigned to the account). Skills keep sending signature-free bodies."; L161: "DECIDED (spike run 3): (a). Spark does not sign drafts it did not create. Server appends the per-account signature; skills send signature-free bodies, unchanged."; 02-spike-results.md L78: "Decision D1: option (a). The server appends the per-account signature to every draft body it creates."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SIG-WHO-APPENDS-CONFLICT
Statement: The signature on outgoing outreach is appended after the body by exactly one party; the skills say Spark appends it, while the design and spike say Spark does not and the server must.
Source: skill-get-in-the-room.md L7: "Spark appends the signature, so draft bodies carry none."; skill-get-in-the-room.md L116: "Signature, every time (v3.4, Spark): the scott@reasinger.net account signature in Spark appends it automatically"; skill-get-in-the-room.md L357: "Every account appends its own signature."; skill-gatekeeper-panel.md L7: "Drafts ship from Spark, which appends the scott@reasinger.net signature"; skill-gatekeeper-panel.md L48: "the Spark draft body itself carries no signature because Spark appends it (v3.4, 2026-10-26)."; versus 02-spike-results.md L71: "ANSWERED: Spark does NOT add the account signature to a draft it did not create. Send 2 went out with a default signature assigned to mcptest in Spark (Settings > Composer > Signatures, screenshot 2026-11-01 21:20); body arrived with no signature."
Type: structural gate
Confidence: low
Ambiguity note: Reading 1 (skills): Spark appends the signature at send, so neither skill nor server adds one. This is true only for drafts Spark composed. Reading 2 (design/spike): Spark does not sign IMAP-appended drafts, so the server must append it (D1 option a). Under reading 1 on the new server, sent mail would carry no signature. Under reading 2 it would carry one, but only if Scott's Spark send does not also add one. The skills' "it would print twice" warning (skill-get-in-the-room.md L116) assumed Spark signs. Design D1 is decided for reading 2, but the skill text still states reading 1 and needs a wording change.

Rule ID: SIG-EXACT-TEXT
Statement: The scott@reasinger.net signature text is exactly `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`, and sreasinger@gmail.com is never used in it.
Source: skill-get-in-the-room.md L116: "`Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`. ... Never sreasinger@gmail.com."; skill-gatekeeper-panel.md L48: "(`Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger` for scott@reasinger.net)"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: SIG-OTHER-ACCOUNTS-UNDEFINED
Statement: Each of the three accounts must have its own configured signature text in the registry, but only the scott@reasinger.net text is given.
Source: 01-design-v0.2.md L97: "signature: <exact per-account signature text, appended by the server, see D1>"; skill-get-in-the-room.md L357: "Every account appends its own signature."
Type: tracking-only check
Confidence: medium
Ambiguity note: The signature text for scott@yourcigardenindy.com and founders@yourcigardenindy.com appears nowhere in the sources. It must be supplied before those accounts can produce drafts, or those accounts get no signature.

Rule ID: SIG-RENDER-MATCH-GATE
Statement: The signature the server appends must render exactly as the signature line that ends the gatekeeper-panel check file, because the check file is meant to show what the reader sees.
Source: skill-gatekeeper-panel.md L48: "For email, cover and InMail drafts the file ends with the Spark account signature exactly as it will render"; skill-get-in-the-room.md L116: "The draft file you run through the counter, check.py, and the panel DOES end with that signature line, so the checks see what the reader sees."
Type: structural gate
Confidence: medium
Ambiguity note: The skills say the rendered signature is the Spark one. Under D1 it becomes the server's configured text. The two match only if the server config holds the identical string. It is unclear whether the HTML rendering of the markdown signature (01-design-v0.2.md L152) counts as "exactly as it will render" when, for example, the URL becomes a link.

Rule ID: SIG-GATE-CONTENT
Statement: For email, cover and InMail types, the gatekeeper check fails unless the signature contains "reasinger.net" and "linkedin.com/in/" (and carries the phone number).
Source: skill-gatekeeper-panel.md L204-L206: "if a.type in (\"email\", \"cover\", \"inmail\"):" / "if \"reasinger.net\" not in sig.lower() or \"linkedin.com/in/\" not in sig.lower():" / "fails.append(\"signature must carry LinkedIn + reasinger.net + phone; end the check file with the Spark signature: Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger\")"
Type: tracking-only check
Confidence: medium
Ambiguity note: The code tests only "reasinger.net" and "linkedin.com/in/", but the failure message also says "+ phone". So the phone is stated as required but not checked. This check also requires "reasinger.net" in the signature, which a yourcigardenindy.com account signature might not contain. It is unclear whether the panel ever runs on drafts from those accounts.

Rule ID: SIG-SOURCE-OF-TRUTH
Statement: Signature text now exists in two places (Spark settings and server config), and which one is the source of truth, and how changes propagate, is unresolved.
Source: 01-design-v0.2.md L178: "| R7 | Signature text exists in two places (Spark settings and server config) and drifts | Open question for the ambiguity log: which is the source of truth and how changes propagate |"; 02-spike-results.md L76: "Consequence: signature text now lives in two places (Spark settings and server config). A change in Spark does not reach server-created drafts. Carry into the ambiguity log as a source-of-truth question."
Type: tracking-only check
Confidence: low
Ambiguity note: Reading 1: server config is the source of truth for automated drafts, and Spark settings matter only for drafts Scott composes. Reading 2: Spark settings are the source, and the server config must be synced from them by hand. Reading 3: one canonical copy (for example in the skill files) feeds both. The source explicitly leaves this open.

Rule ID: SIG-GATEKEEPER-ASSUMPTION
Statement: gatekeeper-panel assumes the draft body carries no signature and the sent mail carries the account signature.
Source: 01-design-v0.2.md L46: "| gatekeeper-panel | None directly. Assumes the draft body carries no signature and the sent mail carries the account signature. |"
Type: definition
Confidence: low
Ambiguity note: Under D1 the server-created draft does carry the signature in its stored body (01-design-v0.2.md L153), though the skill's input body does not. Reading 1: "draft body" means the body the skill submits, so the assumption holds. Reading 2: "draft body" means the draft as stored in Drafts, which under the server now includes the signature, so the assumption breaks. The second half (sent mail carries the signature) holds only if the server appends it, because Spark will not.

Rule ID: HDR-DECODE
Statement: The server must decode all returned header text (subjects and address display names arrive RFC 2047 encoded) before returning it to the caller.
Source: 01-design-v0.2.md L154: "Header decoding: subjects and address display names arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server decodes all returned header text"; 02-spike-results.md L59: "F1. Subjects arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server must decode headers before returning them and before building `Re:` subjects."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: HDR-REENCODE-ON-WRITE
Statement: The server must build `Re:` and `Fwd:` subjects from the decoded subject, and re-encode header text on write when it is non-ASCII.
Source: 01-design-v0.2.md L154: "and builds `Re:` / `Fwd:` subjects from the decoded subject, re-encoding on write when non-ASCII."; 02-spike-results.md L59: "The spike draft subject is still encoded; valid for mail clients, wrong for skill output."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: SEND-SPARK-RECOMPOSE
Statement: When Scott sends a server-created draft from Spark, Spark re-composes it, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original; so the draft's Message-ID is not the sent Message-ID.
Source: 01-design-v0.2.md L155: "Spark behavior on send (observed): Spark re-composes the draft, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original. The server's draft Message-ID is therefore not the sent Message-ID"; 02-spike-results.md L70: "Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly."; 02-spike-results.md L72: "Spark also set \\Answered on reply."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: SEND-FIND-SENT-COPY
Statement: Anything that must find the sent copy of a server-created draft must search the Sent folder by recipient, subject and date, not by the draft's Message-ID.
Source: 01-design-v0.2.md L155: "anything that must find the sent copy searches Sent by recipient, subject and date, not by the draft's Message-ID."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SEND-CONFIRM-IN-SENT
Statement: After Scott says a message was sent, get-in-the-room must confirm it in `scott@reasinger.net:Sent` before logging.
Source: skill-get-in-the-room.md L362: "**Send confirmation (send-then-log):** after Scott says sent, confirm it in `scott@reasinger.net:Sent` before logging."; skill-get-in-the-room.md L218: "Scott confirms the send (a one-line reply like \"sent 1, 3; killed 2\" counts); then flip each Touches row from Drafted to Sent with the actual Date, or to Killed"
Type: sequencing
Confidence: low
Ambiguity note: The skill does not say how the sent copy is matched. Under Spark the draft and sent message may have shared an identity. Under the server they do not (Spark assigns a new `@Spark` Message-ID, 01-design-v0.2.md L155), so a lookup by draft ID or Message-ID will fail. Reading 1: the skill matches by `emails` on Sent with `to:<address>` plus subject and date, as the design requires. Reading 2: the server offers a helper that maps a draft ID to its sent copy. The design gives only the rule to search by recipient, subject and date; no tool for it. The rule also names only scott@reasinger.net:Sent, though drafts can come from the yourcigardenindy.com accounts (ACCT-PURPOSE-MAP).

Rule ID: SEND-GITR-SEND-EXCEPTION
Statement: Claude never sends mail itself; the skill's exception (using `Spark__action send` when Scott asks for a specific message to be sent in the session) is not available on the server.
Source: skill-get-in-the-room.md L361: "**Sending:** Scott sends. Claude never uses `Spark__action send` unless Scott asks for that specific message to be sent in this session."; versus 01-design-v0.2.md L121: "No `send`, no permanent delete."; 01-design-v0.2.md L21: "No SMTP in v1."
Type: structural gate
Confidence: low
Ambiguity note: Reading 1 (skill): Claude may send a specific message on Scott's explicit request in-session. Reading 2 (design): the server has no send capability at all, so that exception cannot run through the server and Scott must send from Spark. A third option, sending via the retained Spark fallback (D6) on request, is not addressed. The design's "No skill sends autonomously" (L21) is consistent with the skill for autonomous sends, but not for requested ones.

Rule ID: SEND-NEVER-GMAIL-DRAFT
Statement: Outreach email delivery is always a draft in the business mail system, never a Gmail draft.
Source: skill-get-in-the-room.md L217: "Email delivery = a Spark draft (see EMAIL DELIVERY - SPARK), never a Gmail draft."; skill-get-in-the-room.md L348: "Gmail is no longer used for outreach drafts or for reading reasinger.net mail (forwarders retired 2026-10-26)."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SEND-DELIVERABILITY-NOTE
Statement: First sends from a new sender may land in spam despite SPF, DKIM and DMARC passing; this is not a server issue because Spark sends, and is recorded as a note only.
Source: 01-design-v0.2.md L179: "| R8 | New sender reputation: first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass | Not a server issue (Spark sends). Live accounts have history. Note only. |"; 02-spike-results.md L74: "Cause is a new sender with a one-line body, not the build."
Type: tracking-only check
Confidence: high
Ambiguity note: none.

Rule ID: DRAFT-SPARK-VISIBILITY
Statement: A draft appended over IMAP must appear in Spark on desktop and laptop within one sync cycle, thread correctly as a reply, and send correctly; desktop is verified, laptop is not yet checked.
Source: 01-design-v0.2.md L189: "A draft appended over IMAP appears in Spark (desktop and laptop) within one sync cycle, threads correctly as a reply, and sends correctly."; 01-design-v0.2.md L174: "| R3 | Spark does not show IMAP-appended drafts promptly, or treats them differently | Spike run 3: drafts appear, thread and send correctly from desktop. Laptop not yet checked. |"; 02-spike-results.md L70: "| 3 | Draft visible and threaded in Spark | PASS."
Type: structural gate
Confidence: low
Ambiguity note: The spike marks criterion 3 "PASS" and the design says "Criteria 3, 4, 5 (pin) passed" (L183), but the criterion requires desktop and laptop, and R3 says the laptop is not yet checked. Reading 1: the criterion is fully passed and the laptop check is a residual risk. Reading 2: the criterion is only partly passed, and the laptop check is still a gate, which the success test (L17, "appears in Spark on the laptop") also needs.

---

## L. email-crap-filter mail operations

Rule ID: ECF-PART-ORDER
Statement: email-crap-filter must run its passes in the order Part C (bounce sweep, scott@reasinger.net), then Part B (business inboxes), then Part A (Gmail).
Source: skill-email-crap-filter.md L8-L17: "Three passes, always in this order:" / "**Part C, Bounce sweep (Spark, scott@reasinger.net).** First, because a bounce kills an outreach touch silently." / "**Part B, Business inboxes (Spark).**" / "**Part A, Gmail personal (Gmail connector).**"
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-NO-GMAIL-FORWARDERS
Statement: The three business mailboxes are read directly, not through Gmail, because the cPanel forwarders to Gmail were retired on 2026-10-26.
Source: skill-email-crap-filter.md L13-L15: "Since 2026-10-26 these are read directly in Spark Pro; the cPanel forwarders to Gmail are retired, so Gmail no longer sees any of this mail."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-C-EMAILS-CALLS
Statement: The bounce sweep must call `emails` on `scott@reasinger.net:Inbox` twice, with filter "from:mailer-daemon newer_than:3d" and then with "from:postmaster newer_than:3d".
Source: skill-email-crap-filter.md L33-L35: "`Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`, `filter: \"from:mailer-daemon newer_than:3d\"`, then again with `filter: \"from:postmaster newer_than:3d\"`."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-C-SEARCH-CALL
Statement: The bounce sweep must also call `search` with query "delivery failed undeliverable address not found", `in: "scott@reasinger.net"`, and filter "newer_than:3d", keeping only real delivery-failure notices.
Source: skill-email-crap-filter.md L36-L38: "`Spark__search` with `query: \"delivery failed undeliverable address not found\"`, `in: \"scott@reasinger.net\"`, `filter: \"newer_than:3d\"`. Keep only real delivery-failure notices (ignore normal mail the search also returns)."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: BOUNCE-QUERY-MISMATCH
Statement: The bounce check's search query and sender coverage differ between the two skills; email-crap-filter uses "delivery failed undeliverable address not found" plus mailer-daemon and postmaster senders, while get-in-the-room uses "delivery failed undeliverable" plus mailer-daemon only.
Source: skill-email-crap-filter.md L36: "`Spark__search` with `query: \"delivery failed undeliverable address not found\"`,"; skill-get-in-the-room.md L363: "**Bounces:** `Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`, `filter: \"from:mailer-daemon newer_than:3d\"`, plus `Spark__search` query \"delivery failed undeliverable\" in `scott@reasinger.net`."
Type: other
Confidence: medium
Ambiguity note: Reading 1: the two skills keep different checks, and the server only needs to execute both. Reading 2: one canonical bounce check is meant and get-in-the-room's is an abbreviation. Under an AND reading of bare words (FILTER-BARE-WORDS-SEARCH) the two queries return different results. The get-in-the-room search also gives no explicit `newer_than` filter.

Rule ID: ECF-C-REPORT-FIELDS
Statement: For each bounce the skill must read the snippet, or call `thread` if the snippet is thin, and report the failed address, error code, date and the original subject if shown.
Source: skill-email-crap-filter.md L40-L41: "For each bounce, read the snippet (or `Spark__thread` if thin) and report: the failed address, the error code, the date, and the original subject if shown."
Type: definition
Confidence: medium
Ambiguity note: This requires `thread` to return a bounce's body as text, including the DSN part where the failed address and code usually sit. `thread` is defined to return "bodies as text" (01-design-v0.2.md L120), but whether that covers message/delivery-status parts or attached original headers is not stated. Snippet length and composition are also unspecified.

Rule ID: ECF-C-CODE-MEANING
Statement: Bounce codes 550 5.1.1, 550 5.4.1 "Recipient address rejected", "Invalid Recipient" and 554 5.4.14 hop-count loops mean the mailbox does not exist and are reported "switch to fallback address or LinkedIn"; 4xx codes are temporary and reported "retrying, watch".
Source: skill-email-crap-filter.md L42-L44: "550 5.1.1, 550 5.4.1 \"Recipient address rejected\", \"Invalid Recipient\", and 554 5.4.14 hop-count loops all mean the mailbox does not exist: say \"switch to fallback address or LinkedIn\". 4xx codes are temporary: say \"retrying, watch\"."; skill-get-in-the-room.md L363: "A 550 5.4.1 means the mailbox does not exist; switch to the fallback address or LinkedIn the same day."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-C-NO-ARCHIVE-BOUNCES
Statement: Bounce notices must not be archived by the skill; Scott or the send block clears them after logging.
Source: skill-email-crap-filter.md L45: "Do not archive bounces; Scott or the send block clears them after logging."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-C-NOTIFY
Statement: On a scheduled run, any bounce triggers the push notification.
Source: skill-email-crap-filter.md L46: "On a scheduled run, any bounce triggers the notification."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-FETCH
Statement: For each of the three business accounts, Part B must call `emails` with folder `<account>:Inbox`, filter "newer_than:7d" and `page_size: 100`.
Source: skill-email-crap-filter.md L59-L60: "For each account call `Spark__emails` with `folder: \"<account>:Inbox\"`, `filter: \"newer_than:7d\"`, `page_size: 100`."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-SKIP-PINNED-BOUNCES
Statement: Part B must skip messages already pinned (flag shows pinned) and bounce notices, which Part C owns.
Source: skill-email-crap-filter.md L60-L61: "Skip messages already pinned (flag shows pinned) and bounce notices (Part C owns those)."
Type: other
Confidence: medium
Ambiguity note: This depends on `emails` returning flags, with `\Flagged` meaning pinned (01-design-v0.2.md L118, L121), which the server does. Part C reads only scott@reasinger.net, so a bounce notice in a yourcigardenindy.com inbox would be skipped by Part B and checked by nobody. Reading 1: skip bounces in all accounts as written. Reading 2: skip only in scott@reasinger.net, where Part C covers them.

Rule ID: ECF-B-SENT-CHECK
Statement: To decide whether a sender is replying to someone Scott emailed, the skill checks `scott@reasinger.net:Sent` for that sender, and such a reply is always `Review Now`.
Source: skill-email-crap-filter.md L71-L72: "A reply from someone Scott emailed (check `scott@reasinger.net:Sent` for the sender if unsure) is always `Review Now`, never Career-only."
Type: definition
Confidence: medium
Ambiguity note: The check requires `emails` on Sent with `to:<sender>` (supported by FILTER-TOKENS), but the skill does not name the call or the lookback. It also checks only scott@reasinger.net:Sent, even for replies arriving in the yourcigardenindy.com accounts. It is unclear whether those accounts' Sent folders should be checked too.

Rule ID: ECF-B-PIN
Statement: Messages classified `Review Now`, `Review Now (Founder lead)` or `Career` must be pinned with `action pin` on their message IDs; pinned means triaged and needs Scott.
Source: skill-email-crap-filter.md L75-L76: "`Review Now`, `Review Now (Founder lead)`, `Career`: `Spark__action` `pin` on the message IDs. Pinned = triaged and needs Scott."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-ARCHIVE-NOISE
Statement: Messages classified `Noise` with no safety term must be archived with `action archive`.
Source: skill-email-crap-filter.md L77: "`Noise` with no safety term: `Spark__action` `archive`."
Type: definition
Confidence: medium
Ambiguity note: Archive on the server moves the message to the Archive folder (01-design-v0.2.md L121). The spike did not exercise archive (02-spike-results.md L72: "Archive move not yet exercised."), and cPanel B's Archive folder is unverified (D5). If cPanel B has no Archive folder, archive errors there (FOLD-ARCHIVE-NO-AUTOCREATE). Whether Spark shows the moved message as "archived" is untested.

Rule ID: ECF-B-SAFETY-NO-ARCHIVE
Statement: A message containing a safety term must never be archived.
Source: skill-email-crap-filter.md L132: "Any thread with a safety term is **never archived**, whatever else it looks like."; skill-email-crap-filter.md L139: "Never archive if a safety term is present. When in doubt, label only."
Type: structural gate
Confidence: medium
Ambiguity note: The safety-term rules sit in the Part A (Gmail) section, which L85-L86 limits to sreasinger@gmail.com. But Part B (L64-L65) applies the "Same taxonomy and rules as Part A (safety terms first ...)", and B3 (L77) archives only Noise "with no safety term". I read the archive guard as applying to Part B.

Rule ID: ECF-B-OTHER-NO-ACTION
Statement: Part B messages in any class other than Review Now, Review Now (Founder lead), Career and Noise get no mail action; they are only reported.
Source: skill-email-crap-filter.md L78: "Everything else: no action, report only."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-FORBIDDEN-ACTIONS
Statement: In Part B the skill must never delete, move to trash, unsubscribe, send or unpin.
Source: skill-email-crap-filter.md L79: "Never delete, move to trash, unsubscribe, or send. Never unpin."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-BATCH-CONTINUE
Statement: Part B must batch IDs per action (one call for all pins, one for all archives), log any failed ID and continue.
Source: skill-email-crap-filter.md L80-L81: "Batch IDs per action (one call for all pins, one for all archives). Log any failed ID and continue."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-NO-LABELS
Statement: IMAP business accounts have no AI/ labels; pin and archive actions stand in for labels.
Source: skill-email-crap-filter.md L74: "### B3. Act (IMAP accounts have no AI/ labels; Spark actions stand in)"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-B-UNIT-OF-WORK
Statement: In Part B, actions apply to message IDs; the thread-as-unit rule applies to Gmail Part A only.
Source: skill-email-crap-filter.md L75-L76: "`Spark__action` `pin` on the message IDs."; skill-email-crap-filter.md L88-L89: "The unit of work is the **thread**, not the message. Gmail labels and archives apply to whole threads, so classify and label once per thread."; L85-L86: "The steps below (Label Taxonomy through Step 4) apply to sreasinger@gmail.com only."
Type: definition
Confidence: medium
Ambiguity note: Part B uses "message IDs", but Spark's own pin/archive may have acted on whole conversations, while the server's `\Flagged` and MOVE act per message. Reading 1: per-message is intended. Reading 2: the parallel run ("same pins applied", 01-design-v0.2.md L207) may differ if Spark archived or pinned whole threads. The source does not describe Spark's granularity.

Rule ID: ECF-SNIPPET-FIRST
Statement: Classification uses subject, sender and snippet only; full bodies are opened only when the snippet is too thin, and body text is never quoted in the report.
Source: skill-email-crap-filter.md L184-L186: "Classify inline using subject, sender, and snippet only. Do not open full bodies unless the snippet is too thin to decide, and never quote body text in the report."
Type: other
Confidence: medium
Ambiguity note: This line sits in Part A's Step 3, scoped to Gmail (L85-L86). Part B adopts "Same taxonomy and rules as Part A" (L64), so it probably applies to Part B and governs when `thread` is called. It is recorded because it bounds `thread` usage and depends on `emails` returning a usable snippet.

Rule ID: ECF-REPORT-ACCOUNT-TAGS
Statement: The combined report must tag each item with its account: `[reasinger.net]`, `[YCDI]`, `[founders]` or `[gmail]`, so the server's results must identify the source account of each message.
Source: skill-email-crap-filter.md L224-L225: "One combined report across all accounts. Tag each item with its account (`[reasinger.net]`, `[YCDI]`, `[founders]`, `[gmail]`)."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-REPORT-BOUNCES-FIRST
Statement: The report leads with Bounces (failed address, error, date, original subject, fix), and if mail access was unreachable it says so in that slot instead.
Source: skill-email-crap-filter.md L228-L229: "0. **Bounces** (Part C): failed address, error, date, original subject, the fix. If Spark was unreachable, say so here instead."
Type: sequencing
Confidence: medium
Ambiguity note: The "Spark was unreachable" wording needs restating for the server path, and for partial per-host failures (see FAIL-SKILL-UNREACHABLE-BRANCH).

Rule ID: ECF-REPORT-ALREADY-REPLIED
Statement: Review Now items in the report must state whether Scott already replied.
Source: skill-email-crap-filter.md L233-L234: "2. **Review Now**: every Review Now item, sender + subject + the action asked for, and whether Scott already replied."
Type: definition
Confidence: medium
Ambiguity note: For Part B, "already replied" could come from the `\Answered` flag (which Spark sets on reply, 01-design-v0.2.md L155, and which `emails` returns as part of flags) or from a Sent-folder check. The source names neither method for Part B.

Rule ID: ECF-SCHEDULED-NOTIFY
Statement: On a scheduled run, the skill must push-notify if and only if the run produced at least one bounce, Career, Review Now (including founder lead), Finance-Legal or Needs Human Decision item, or if any part failed or mail access was unreachable; otherwise it stays silent.
Source: skill-email-crap-filter.md L246-L251: "When running from a schedule (no one watching), send a push notification if and only if the run produced at least one bounce, Career, Review Now (including a founder lead), Finance-Legal, or Needs Human Decision item, or if any part failed or Spark was unreachable. Put the single most important item in the first sentence. If the run found only Noise and Low Priority, stay silent."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-GMAIL-DOWN
Statement: If the Gmail MCP is unavailable or auth fails, the skill still runs Parts C and B against the business mailboxes and reports Part A as not run (notifying on a scheduled run).
Source: skill-email-crap-filter.md L255-L256: "Gmail MCP unavailable or auth fails: run Parts C and B anyway, report Part A as not run (on a scheduled run, notify)."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-LOOKBACK-CONFIG
Statement: The default lookback window is 7 days for all parts, except Part C, which uses 3 days; defaults are overridable by the user.
Source: skill-email-crap-filter.md L261: "## Configuration (defaults, overrideable by user)"; L264: "lookback_window: 7d       # all parts; Part C uses 3d"
Type: definition
Confidence: high
Ambiguity note: none.

---

## M. get-in-the-room mail operations

Rule ID: GITR-REPLY-SAME-DAY
Statement: Any reply turns the contact warm and must be answered the same day, which requires the reply to be found in the inbox and a reply draft created that day.
Source: skill-get-in-the-room.md L262: "**Any reply turns the contact warm:** answer the same day, deliver what the close offered, then the choice close."
Type: other
Confidence: medium
Ambiguity note: This is an outreach-timing rule. It is included only because it forces same-day inbox reads and reply drafting on the mail path. The source does not say how replies are detected (email-crap-filter Part B, or a get-in-the-room `emails`/`search` call).

Rule ID: GITR-TOUCH-EMAIL-OPS
Statement: The email touches in the cadence map to mail operations: touch 1 is a new draft, touch 7 is a forward of the original sent touch 1, and touches 9 and 10 are new emails (subjects "quick question." and "curious?").
Source: skill-get-in-the-room.md L251: "| 1 | 0 | Email | The cold skeleton note with an arm A or B close |"; L257: "| 7 | 7-10 | Email | Forward the original. Body: \"Not sure if you saw this.\" |"; L259: "| 9 | 14 | Email | Subject \"quick question.\""; L260: "| 10 | 17-21 | Email + phone | Subject \"curious?\""
Type: definition
Confidence: medium
Ambiguity note: The source does not say whether touches 9 and 10 are new drafts or replies on the touch-1 thread (via `reply_to`). Their distinct subjects suggest new drafts, but threading is not specified.

Rule ID: GITR-SPARK-ALL-ACCOUNTS
Statement: The business mail system serves every business account for get-in-the-room drafts, sends, sent-checks and bounces, chosen per purpose.
Source: skill-get-in-the-room.md L7: "Spark Pro replaces Gmail for drafts, sends, sent-checks, and bounces; account per purpose"; L348: "Spark Pro is the mail system for every account"
Type: definition
Confidence: high
Ambiguity note: none.

---

## N. Testing, acceptance, build sequence

Rule ID: BUILD-SEQUENCE
Statement: The build must follow this order: design reviewed (done); spike and design update (done); rule extraction producing docs/rule-base.md and docs/ambiguity-log.md; Scott resolves the ambiguity log; write-spec-from-resolutions producing docs/spec.md with every requirement cited to a rule or resolution; build to spec; deploy.
Source: 01-design-v0.2.md L197-L203: "1. This design doc (v0.1), reviewed by Scott. DONE." / "2. Spike; update design with results (v0.2). DONE." / "3. extract-rules-and-flag-ambiguity over design v0.2 plus the email-crap-filter, get-in-the-room and gatekeeper-panel SKILL.md files. Outputs `docs/rule-base.md`, `docs/ambiguity-log.md`." / "4. Scott resolves the ambiguity log." / "5. write-spec-from-resolutions. Output `docs/spec.md`, every requirement cited to a rule or resolution." / "6. Build to spec." / "7. Deploy to the dedicated Cloudflare account."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: TEST-ONE-PER-REQ
Statement: There must be one test per requirement ID in the spec.
Source: 01-design-v0.2.md L202: "Build to spec. One test per requirement ID"
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: TEST-NEVER-LIVE
Statement: Integration tests must run against a dedicated test mailbox on cPanel A, never against live inboxes.
Source: 01-design-v0.2.md L202: "integration tests against a dedicated test mailbox on cPanel A, never against live inboxes."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: TEST-CPANEL-B-CONFLICT
Statement: cPanel B verification (protocol ops, folder names, SPECIAL-USE, Archive folder) is deferred to integration tests, but integration tests run only against a test mailbox on cPanel A and never against live inboxes.
Source: 01-design-v0.2.md L183: "Criteria 1 and 2 passed on cPanel A; cPanel B and archive move are deferred to integration tests."; 01-design-v0.2.md L165: "cPanel B: verify in integration tests."; versus 01-design-v0.2.md L202: "integration tests against a dedicated test mailbox on cPanel A, never against live inboxes."
Type: structural gate
Confidence: low
Ambiguity note: Reading 1: a test mailbox must also be created on cPanel B so integration tests can cover it, which L202 does not mention. Reading 2: cPanel B is verified with read-only checks against live inboxes (the spike called its pending cPanel B work a "list-only run", 02-spike-results.md L68), which would be an exception to "never against live inboxes". Reading 3: cPanel B is verified only in the acceptance parallel run. The source supports none of these over the others.

Rule ID: TEST-PARSER-RECORDED
Statement: IMAP parser tests must run against recorded real responses from the mcptest mailbox, to cover response shapes the prototype did not see (large literals, unusual FETCH shapes).
Source: 01-design-v0.2.md L172: "Residual risk: our IMAP parser meets server responses the prototype did not see (large literals, unusual FETCH shapes). Mitigation: parser tests against recorded real responses from mcptest."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: TEST-ARCHIVE-PIN-SPARK
Statement: `\Flagged` must display as pinned in Spark (verified), and an archive move must display as archived in Spark (not yet exercised).
Source: 01-design-v0.2.md L191: "`\Flagged` displays as pinned in Spark. Archive move shows as archived."; 02-spike-results.md L72: "| 5 | Flagged shows as pinned; archive shows as archived | Flag PASS (shows pinned in Spark; Spark also set \\Answered on reply). Archive move not yet exercised. |"
Type: structural gate
Confidence: medium
Ambiguity note: The archive half is untested and deferred to integration tests (01-design-v0.2.md L183), which runs into the cPanel B testing conflict (TEST-CPANEL-B-CONFLICT) for the yourcigardenindy.com accounts.

Rule ID: SPIKE-RESULTS-TABLE-BLANK
Statement: The spike results file ends with a blank pass-criteria results table (checks 1 to 5 with empty results), separate from the filled status table above it.
Source: 02-spike-results.md L80-L94: "Pass criteria from design section 10:" ... "| Check | Result |" / "|---|---|" / "| 1 | |" / "| 2 | |" / "| 3 | |" / "| 4 | |" / "| 5 | |"
Type: tracking-only check
Confidence: low
Ambiguity note: Reading 1: the blank table is leftover template text, and the real status is the filled table at L64-L72. Reading 2: it is a final sign-off table still to be filled, meaning the criteria are not formally closed. The design states "Status: COMPLETE" (01-design-v0.2.md L183), which supports reading 1, but the file itself leaves the table empty.

Rule ID: ACCEPT-PARALLEL-RUN
Statement: Acceptance requires a 7-day parallel run of email-crap-filter at 6am and noon against both Spark and this server, with matching results (same messages found, same bounces, same pins applied) and any differences explained.
Source: 01-design-v0.2.md L207: "Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server. Results must match (same messages found, same bounces, same pins applied) with differences explained."
Type: structural gate
Confidence: medium
Ambiguity note: Running both paths against the same live inboxes means the first path's pins and archives change the state the second path sees (an archived message leaves the Inbox; a pinned message is skipped by B1). The source does not say how the two runs avoid interfering, for example by running one path in read-only mode. "Results must match ... with differences explained" also leaves open whether explained differences count as a pass.

Rule ID: ACCEPT-GITR-DRAFTS
Statement: Acceptance requires at least three real reply drafts and one forward created through the server, sent by Scott from Spark, and verified at the recipient as threaded and signed correctly.
Source: 01-design-v0.2.md L208: "Get-in-the-room: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ACCEPT-THREAD-COMPARE
Statement: Acceptance must compare the server's thread output to Spark's view on sampled threads.
Source: 01-design-v0.2.md L176: "| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |"
Type: tracking-only check
Confidence: medium
Ambiguity note: The sample size and the pass threshold are not stated.

Rule ID: ACCEPT-POWER-OFF
Statement: Acceptance includes the power-off test defined as the success test in section 2.
Source: 01-design-v0.2.md L210: "Power-off test: the success test in section 2."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: CUTOVER-PREFIX-SWAP
Statement: At cutover, the skills switch their tool prefix to this server, and the Spark path becomes the fallback under D6.
Source: 01-design-v0.2.md L209: "Cutover: skills switch tool prefix; Spark path becomes fallback per D6."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: CUTOVER-SPARK-FALLBACK
Statement: After cutover, the Spark path is kept as a fallback for scheduled tasks for 30 days.
Source: 01-design-v0.2.md L166: "| D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |"
Type: sequencing
Confidence: low
Ambiguity note: D6 is a leaning, not marked DECIDED (unlike D1, D2). It conflicts with design principle 1 (01-design-v0.2.md L52), which says migration includes "removing the \"Spark unreachable\" branch". Reading 1: the skills keep a Spark branch for 30 days (fallback when the server is down), so the branch is not removed at cutover. Reading 2: the branch is removed and "fallback" means only that Scott can manually revert the tool prefix. The source does not say how a skill would choose between the server and Spark at run time, or whether pins/archives via both paths could double-apply.
