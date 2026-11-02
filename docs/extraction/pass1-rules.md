# cpanel-mail-mcp: Rule extraction, pass 1

Source pack: `sources/source-pack.md`. Five sources: `01-design-v0.2.md`, `02-spike-results.md`, `skill-email-crap-filter.md`, `skill-get-in-the-room.md`, `skill-gatekeeper-panel.md`. Line numbers are the original `L<n>` numbers shown in the pack.

Rule ID prefixes: `DES` design doc, `SPK` spike results, `ECF` email-crap-filter, `GIR` get-in-the-room, `GKP` gatekeeper-panel, `X` cross-source contradiction (both readings recorded, not resolved).

---

## A. Design doc: goal, scope, non-goals

Rule ID: DES-01
Statement: The server must be a remote MCP server hosted in the cloud that exposes the same mailbox operations the email-crap-filter, get-in-the-room and gatekeeper-panel skills use today, operating directly against the cPanel IMAP servers, so that no scheduled or interactive email task requires the sarhomepc computer.
Source: 01-design-v0.2.md L15: "A remote MCP server, hosted in the cloud, that gives Claude the same mailbox operations those skills use today, directly against the cPanel IMAP servers, so no scheduled or interactive email task requires sarhomepc."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-02
Statement: The project success test is: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature.
Source: 01-design-v0.2.md L17: "Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-03
Statement: The server must not send mail in v1 and must contain no SMTP capability; Scott sends from Spark.
Source: 01-design-v0.2.md L21: "Sending mail. No skill sends autonomously. Scott sends from Spark. No SMTP in v1."
Type: structural gate
Confidence: high
Ambiguity note: none. (See X-04 for the conflict with get-in-the-room's conditional send.)

Rule ID: DES-04
Statement: The server is an automation path only and does not replace Spark as Scott's mail client; Spark remains the human interface.
Source: 01-design-v0.2.md L22: "Replacing Spark as Scott's mail client. Spark stays the human interface; this server is the automation path."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-05
Statement: The server must not implement Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability.
Source: 01-design-v0.2.md L23: "Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them."
Type: structural gate
Confidence: low
Ambiguity note: L23 lists "availability" as an excluded Spark-only feature, but L116 defines an `availability` tool in the v1 tool surface ("Health check per host: TCP, TLS, login, SELECT INBOX"). Reading 1: L23 excludes Spark's calendar availability (free/busy) feature only, and the server's `availability` tool is a different, health-check tool that reuses the name. Reading 2: `availability` is out of scope and L116 contradicts it. Also unclear whether reusing a Spark tool name for different semantics breaks the drop-in principle (DES-11).

Rule ID: DES-06
Statement: Gmail (sreasinger@gmail.com) is out of scope; it stays on the Gmail connector and the server must not serve it.
Source: 01-design-v0.2.md L24: "Gmail. sreasinger@gmail.com stays on the Gmail connector."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-07
Statement: The server must not permanently delete messages; deleting a draft is the only delete operation in scope.
Source: 01-design-v0.2.md L25: "Permanent delete of messages. Draft delete is the only delete in scope."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-08
Statement: The server supports exactly one principal (Scott); it is not multi-user.
Source: 01-design-v0.2.md L26: "Multi-user. One principal: Scott."
Type: structural gate
Confidence: high
Ambiguity note: none.

## B. Design doc: mailboxes and hosts

Rule ID: DES-09
Statement: The server must serve three mailboxes on two hosts: scott@reasinger.net on cPanel A (server128.web-hosting.com), and scott@yourcigardenindy.com and founders@yourcigardenindy.com on cPanel B (yourcigardenindy.com). Two hosts, three logins.
Source: 01-design-v0.2.md L34-L36 and L38: "| scott@reasinger.net | cPanel A (server128.web-hosting.com) | ..." / "| scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | ..." / "| founders@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | ..." / "Two hosts, three logins."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-10
Statement: The cPanel A IMAP host must be configured as `server128.web-hosting.com` port 993, not `reasinger.net` (which is the web host record; the TLS certificate is for the server name).
Source: 01-design-v0.2.md L38: "cPanel A IMAP host is `server128.web-hosting.com:993` (cPanel suggests `reasinger.net`, which is the web host record; use the server name)." Also 02-spike-results.md L25: "Use `server128.web-hosting.com` as IMAP host. cPanel's suggested `reasinger.net` is the web host record and the certificate is for the server name."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-10a
Statement: The cPanel B IMAP host name is not yet confirmed and must be confirmed from that cPanel's address bar before configuration.
Source: 01-design-v0.2.md L38: "cPanel B host still to confirm from that cPanel's address bar."
Type: tracking-only check
Confidence: medium
Ambiguity note: The table at L35-L36 lists cPanel B as "(yourcigardenindy.com)", while L38 says the host is still to be confirmed. By analogy with cPanel A, `yourcigardenindy.com` may be the web host record rather than the IMAP server name. Unclear whether the table value is a placeholder or the intended host.

Rule ID: DES-10b
Statement: cPanel A folders use the `INBOX.` prefix with `.` as the hierarchy delimiter and advertise SPECIAL-USE; the server must handle this naming.
Source: 01-design-v0.2.md L38: "cPanel A folders use the `INBOX.` prefix with `.` delimiter and advertise SPECIAL-USE (spike run 3)."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-10c
Statement: A test mailbox, mcptest@reasinger.net on cPanel A, exists for integration tests.
Source: 01-design-v0.2.md L38: "A test mailbox, mcptest@reasinger.net, exists on cPanel A for integration tests."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-10d
Statement: The server must support the call set the skills use today: email-crap-filter uses `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive`; get-in-the-room uses `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`, `emails` on Inbox and Sent with filters, and `search`; gatekeeper-panel calls none directly.
Source: 01-design-v0.2.md L44-L46: "| email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |" / "| get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |" / "| gatekeeper-panel | None directly. ..."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-10e
Statement: The gatekeeper-panel skill assumes the draft body carries no signature and the sent mail carries the account signature; the server must make both true.
Source: 01-design-v0.2.md L46: "Assumes the draft body carries no signature and the sent mail carries the account signature."
Type: structural gate
Confidence: medium
Ambiguity note: "Draft body carries no signature" is ambiguous: the body the skill passes in (input), or the draft as stored in Drafts (output). Under D1 (DES-50) the server appends the signature to the stored draft, so the stored draft does carry a signature. Reading 1: the assumption refers to skill input only. Reading 2: the stored draft must have no signature, which would contradict D1.

## C. Design doc: principles

Rule ID: DES-11
Statement: Drop-in compatibility: tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar must mirror the Spark connector, so that migrating a skill is a tool-prefix swap plus removing the "Spark unreachable" branch, not a rewrite.
Source: 01-design-v0.2.md L52: "**Drop-in compatibility.** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector. Migrating a skill is a tool-prefix swap plus removing the \"Spark unreachable\" branch, not a rewrite."
Type: structural gate
Confidence: medium
Ambiguity note: The source never documents the Spark connector's actual parameter schemas or filter grammar; L111 says "Exact schemas are set in the spec." So "mirror" can mean (a) match the subset the skills actually call, as quoted in the skills, or (b) match Spark's full schema for those tools. Also conflicts with D6 on keeping a fallback (see X-06).

Rule ID: DES-12
Statement: Least privilege: the server may only read, flag, move, and write to Drafts; nothing that sends and nothing that permanently deletes received mail.
Source: 01-design-v0.2.md L53: "**Least privilege.** Read, flag, move, and write to Drafts. Nothing that sends, and nothing that permanently deletes received mail."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-13
Statement: Fail loudly, per host: a failure on one cPanel host must never silently hide results from the other, and every response must state which accounts were reached.
Source: 01-design-v0.2.md L54: "**Fail loudly, per host.** A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached."
Type: structural gate
Confidence: high
Ambiguity note: none. (See X-07 for the skill-side gap.)

Rule ID: DES-14
Statement: All writes must be plain IMAP state (flags, folder moves, Drafts appends) so that Spark on any device reflects them without sync tricks.
Source: 01-design-v0.2.md L55: "**Spark sees everything.** All writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-15
Statement: No secrets in code or logs: credentials must live only in platform secrets, and message bodies must never be logged.
Source: 01-design-v0.2.md L56: "**No secrets in code or logs.** Credentials live only in platform secrets. Message bodies are never logged."
Type: structural gate
Confidence: high
Ambiguity note: none.

## D. Design doc: architecture, hosting, auth

Rule ID: DES-16
Statement: Claude clients connect to the server over MCP on HTTPS using streamable HTTP transport with an OAuth bearer token.
Source: 01-design-v0.2.md L62: "| MCP over HTTPS (streamable HTTP), OAuth bearer"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-17
Statement: The server is composed of an OAuth provider (workers-oauth-provider, single allowed principal), a Spark-compatible tool layer, a Gmail-style-to-IMAP-SEARCH filter translator, an ID codec for stable message IDs, an account registry (3 accounts, 2 hosts, folder maps), and a minimal IMAP client on cloudflare:sockets over TLS port 993.
Source: 01-design-v0.2.md L64-L70: "cpanel-mail-mcp (Cloudflare Worker, CF account: scott@reasinger.net)" / "|-- OAuth provider (workers-oauth-provider), single allowed principal" / "|-- Tool layer (Spark-compatible schema)" / "|-- Filter translator (Gmail-style -> IMAP SEARCH)" / "|-- ID codec (stable message IDs)" / "|-- Account registry (3 accounts, 2 hosts, folder maps)" / "|-- IMAP client (minimal, on cloudflare:sockets, TLS 993)"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-18
Statement: The server must be hosted on Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net with hardware-key 2FA, isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.
Source: 01-design-v0.2.md L77: "Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts."
Type: structural gate
Confidence: medium
Ambiguity note: L77 calls Workers "Primary", implying a secondary option, but L79 says "Fly.io/VPS is no longer the fallback" and D2 (L162) is DECIDED as Workers. Reading 1: Workers is the only hosting target. Reading 2: some unnamed fallback still exists. Also, spike run 2 (02-spike-results.md L17) deployed to "Cloudflare account scott@reasinger.net, subdomain reasinger-ops"; unclear whether that spike account is the "new, dedicated" production account or a separate one.

Rule ID: DES-19
Statement: The server must not use imapflow; it must use a minimal IMAP client written on `cloudflare:sockets` that implements only the IMAP commands the design needs.
Source: 01-design-v0.2.md L79: "imapflow times out on the Workers runtime (`ETIMEOUT` after 30 s) ... The server therefore uses a minimal IMAP client written on `cloudflare:sockets` (prototype: `spike/src/imap.js`). It implements only the commands this design needs." Also L162 (D2 DECIDED).
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-20
Statement: IMAP login must use AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping.
Source: 01-design-v0.2.md L79: "Login is AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping." Also 02-spike-results.md L28.
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-21
Statement: Every IMAP read (every network step) must have an explicit timeout; no step may hang.
Source: 01-design-v0.2.md L79: "Every read has an explicit timeout; no step may hang." Also 02-spike-results.md L26: "First attempt with no timeouts hung the request indefinitely. Every network step now has an explicit timeout."
Type: structural gate
Confidence: medium
Ambiguity note: Timeout values are not specified anywhere. The design says "every read"; the spike says "every network step" (which includes connect, TLS, writes). Read the broader spike wording as the requirement, but the narrower reading is possible.

Rule ID: DES-22
Statement: MCP clients must authenticate with OAuth 2.1 via `workers-oauth-provider`.
Source: 01-design-v0.2.md L83: "MCP clients authenticate with OAuth 2.1 via `workers-oauth-provider`, which claude.ai custom connectors support."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-23
Statement: The upstream identity check must allow exactly one principal (Scott); any other identity must be refused at authorize time.
Source: 01-design-v0.2.md L84: "The upstream identity check allows exactly one principal (Scott). Any other identity is refused at authorize time."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-24
Statement: The server must have no authless mode and no shared-secret URL.
Source: 01-design-v0.2.md L85: "No authless mode, no shared-secret URL."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-25
Statement: Token lifetimes and the upstream identity provider are an open decision (D3); the leaning is GitHub (login ironfis1), single allowed login, with Google and Cloudflare Access as alternatives.
Source: 01-design-v0.2.md L86: "Token lifetimes and the upstream identity provider are an open decision (D3)." L163: "| D3 | OAuth upstream identity | GitHub (ironfis1), Google, Cloudflare Access | GitHub, single allowed login. Open. |"
Type: other
Confidence: low
Ambiguity note: Undecided. Readings: GitHub (leaning), Google, or Cloudflare Access as upstream IdP. No token lifetime value is given in any source. Cannot be built to without a resolution.

## E. Design doc: account registry, folders, connections

Rule ID: DES-26
Statement: The account registry is static config with one entry per mailbox containing: id (the address), host, port 993, secret_ref (name of the platform secret holding the password, for example IMAP_PASS_REASINGER_SCOTT), signature (exact per-account signature text appended by the server), and folders (discovered at first connect, cached, overridable).
Source: 01-design-v0.2.md L90-L98: "Static config, one entry per mailbox:" / "id: scott@reasinger.net" / "host: <cPanel A IMAP host>" / "port: 993" / "secret_ref: IMAP_PASS_REASINGER_SCOTT" / "signature: <exact per-account signature text, appended by the server, see D1>" / "folders: discovered at first connect, cached, overridable"
Type: definition
Confidence: medium
Ambiguity note: "Cached" has no scope or lifetime: per Worker isolate, per request, or persisted (KV/Durable Object). Since connections are per request (DES-31), "first connect" may mean first connect per request. "Overridable" does not say by whom (config only, or a tool parameter). Secret names for the other two accounts are not given.

Rule ID: DES-27
Statement: Folder discovery must use IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag.
Source: 01-design-v0.2.md L101: "Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag."
Type: sequencing
Confidence: medium
Ambiguity note: The name-matching rules for the fallback (which names, case sensitivity, prefix handling) are not specified.

Rule ID: DES-28
Statement: SPECIAL-USE always wins over name match. On cPanel A, Junk resolves to `INBOX.spam` (flagged `\Junk`), not `INBOX.Junk` (unflagged).
Source: 01-design-v0.2.md L101: "SPECIAL-USE always wins over name: cPanel A has both `INBOX.spam` (flagged `\Junk`) and `INBOX.Junk` (unflagged); Junk resolves to `INBOX.spam`." Also 02-spike-results.md L56, L60 (F2).
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-29
Statement: The logical folder names `Inbox`, `Sent`, `Drafts`, `Archive` must map to real folder names per account.
Source: 01-design-v0.2.md L101: "The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account."
Type: definition
Confidence: medium
Ambiguity note: L101 lists four logical names, but discovery also covers `\Trash` and `\Junk`, and the spike folder map (02-spike-results.md L48-L55) lists Trash and Junk as logical names too. Unclear whether `Trash` and `Junk` are addressable logical names in `<account>:<Folder>` (the skill forbids trash moves, so exposing Trash as a target is a question).

Rule ID: DES-30
Statement: On cPanel A the folder map is: Inbox = INBOX; Sent = INBOX.Sent (\Sent); Drafts = INBOX.Drafts (\Drafts); Archive = INBOX.Archive (\Archive); Trash = INBOX.Trash (\Trash); Junk = INBOX.spam (\Junk); INBOX.Junk has no logical name.
Source: 02-spike-results.md L48-L56: "| Inbox | INBOX | |" / "| Sent | INBOX.Sent | \\Sent |" / "| Drafts | INBOX.Drafts | \\Drafts |" / "| Archive | INBOX.Archive | \\Archive |" / "| Trash | INBOX.Trash | \\Trash |" / "| Junk | INBOX.spam | \\Junk |" / "| (none) | INBOX.Junk | none. ..."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-31
Statement: The server opens one IMAP session per account per request, lazily, and closes it at request end; no persistent connections and no pooling.
Source: 01-design-v0.2.md L105: "One IMAP session per account per request, opened lazily, closed at request end. No persistent connections. ... so per-request connect is acceptable and no pooling is needed." Also 02-spike-results.md L62 (F4).
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-32
Statement: Operations run in parallel across accounts and sequentially within an account.
Source: 01-design-v0.2.md L105: "Parallel across accounts, sequential within an account." Also L177 (R6): "One session per account per request; sequential within account".
Type: sequencing
Confidence: medium
Ambiguity note: "Parallel across accounts" could be read as across hosts. Two accounts (scott@ and founders@yourcigardenindy.com) share cPanel B, so parallel-across-accounts still means two concurrent sessions to one host. Unclear whether that is intended given R6 connection limits and cPHulk.

Rule ID: DES-33
Statement: On any IMAP authentication failure the account must be disabled for the remainder of the request, the error must tell the caller to check the secret, and the server must never retry on an auth error.
Source: 01-design-v0.2.md L107: "Mitigation: on any auth failure, the account is disabled for the remainder of the request and the error says to check the secret; no retries on auth errors." Also L173 (R2): "No retry on auth failure."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-34
Statement: Egress IP whitelisting on both cPanel hosts is to be used only if the hosting option gives a stable egress IP; Workers does not, so a cPHulk block requires a manual cPanel unblock.
Source: 01-design-v0.2.md L107: "Egress IP whitelisting on both hosts if the hosting option gives a stable egress IP (Workers does not by default; see R2)." L173: "Workers egress IPs are not stable, so whitelisting is not available; a block means a cPanel unblock by hand."
Type: other
Confidence: medium
Ambiguity note: L107 says Workers lacks stable egress "by default", implying a non-default option might exist; L173 says flatly "whitelisting is not available". Reading 1: no whitelisting, ever. Reading 2: whitelisting is a possible later step if a stable-egress option is adopted.

## F. Design doc: tool surface

Rule ID: DES-35
Statement: Tool names and parameters follow the Spark connector; exact schemas are set in the spec.
Source: 01-design-v0.2.md L111: "Names and parameters follow the Spark connector. Exact schemas are set in the spec."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-36
Statement: The `accounts` tool lists configured accounts and per-account reachability.
Source: 01-design-v0.2.md L115: "| `accounts` | List configured accounts and per-account reachability. |"
Type: definition
Confidence: medium
Ambiguity note: Unclear whether "reachability" means a live check on each call (connect and log in to every account) or a cached/last-known status. A live check costs about 750 ms per account (DES-31) and adds login attempts relevant to cPHulk.

Rule ID: DES-37
Statement: The `availability` tool is a per-host health check covering TCP, TLS, login and SELECT INBOX, used as a preflight by scheduled skills.
Source: 01-design-v0.2.md L116: "| `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |"
Type: definition
Confidence: medium
Ambiguity note: "Per host" but login and SELECT INBOX are per account. cPanel B has two accounts; unclear whether the check logs into one or both. See also DES-05 / X-01 on the name collision with Spark's availability.

Rule ID: DES-38
Statement: The `folders` tool lists folders per account with the logical-name mapping.
Source: 01-design-v0.2.md L117: "| `folders` | List folders per account with logical-name mapping. |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: DES-39
Statement: The `emails` tool lists messages in `<account>:<Folder>`, accepting `filter`, `page_size`, and a paging cursor, and returns for each message: ID, from, to, subject, date, snippet, flags.
Source: 01-design-v0.2.md L118: "| `emails` | List messages in `<account>:<Folder>` with `filter`, `page_size`, paging cursor. Returns ID, from, to, subject, date, snippet, flags. |"
Type: definition
Confidence: medium
Ambiguity note: Sort order, maximum page_size, default page_size, and snippet length/derivation (IMAP has no native snippet; requires fetching part of the body) are not given. email-crap-filter uses page_size 100 (ECF-09); unclear whether 100 must be supported as a single page.

Rule ID: DES-40
Statement: The `search` tool runs a free-text query within one account or all accounts, plus an optional `filter`.
Source: 01-design-v0.2.md L119: "| `search` | Free-text query within one or all accounts, plus optional `filter`. |"
Type: definition
Confidence: medium
Ambiguity note: Which folders are searched (Inbox only, all folders, or all but Trash/Junk) is not stated. How a multi-word query is combined (AND of words, OR of words, or phrase) is not stated; see X-09.

Rule ID: DES-41
Statement: The `thread` tool returns a message and its thread, reconstructed by References / In-Reply-To with a subject fallback, with bodies as text.
Source: 01-design-v0.2.md L120: "| `thread` | Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text. |"
Type: definition
Confidence: medium
Ambiguity note: Unclear whether thread reconstruction spans folders (Inbox plus Sent plus Archive) as Spark's thread view does, or only the folder of the starting message. Subject-fallback matching rules (prefix stripping, date window) are not given. R5 (L176) acknowledges thread output may differ from Spark.

Rule ID: DES-42
Statement: The `action` tool supports `pin` / `unpin` (set/clear `\Flagged`), `read` / `unread` (set/clear `\Seen`), `archive` (move to Archive), and `move` (to a named folder). It has no `send` and no permanent delete.
Source: 01-design-v0.2.md L121: "| `action` | `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to Archive), `move` (to named folder). No `send`, no permanent delete. |"
Type: definition
Confidence: medium
Ambiguity note: `move` to a named folder would permit moving to Trash, which the email-crap-filter forbids (ECF-14) and which the least-privilege principle does not explicitly cover (moving to Trash is not permanent delete). Unclear whether the server should block Trash as a move target.

Rule ID: DES-43
Statement: The `draft` tool supports create new, `reply_to`, `reply_all`, `forward`, `edit`, and `delete` (draft only), and writes by appending to the account's Drafts folder.
Source: 01-design-v0.2.md L122: "| `draft` | Create new, `reply_to`, `reply_all`, `forward`, `edit`, `delete` (draft only). Appends to the account's Drafts folder. |"
Type: definition
Confidence: high
Ambiguity note: none.

## G. Design doc: message IDs and filter grammar

Rule ID: DES-44
Statement: The server defines its own opaque message ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID; IDs must be stable across calls and across sessions.
Source: 01-design-v0.2.md L126: "Spark IDs are opaque to skills, so the server defines its own opaque ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID. ... IDs are stable across calls and across sessions."
Type: calculation
Confidence: high
Ambiguity note: none.

Rule ID: DES-45
Statement: ID lookup uses UID when the encoded UIDVALIDITY matches the folder's current UIDVALIDITY, and falls back to a Message-ID header search when the message has moved (for example after archive).
Source: 01-design-v0.2.md L126: "Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive)."
Type: sequencing
Confidence: medium
Ambiguity note: (1) "When UIDVALIDITY matches" does not cover the case where UIDVALIDITY matches but the UID no longer exists in the folder (message moved, UIDVALIDITY unchanged), which is exactly the archive case; reading: fall back on either mismatch or missing UID. (2) The fallback's search scope (which folders) is not stated. (3) Behavior when Message-ID matches more than one message, or the message has no Message-ID, is not stated.

Rule ID: DES-46
Statement: The filter grammar supports exactly these tokens and IMAP SEARCH translations: `from:x` to `FROM x`; `to:x` to `TO x`; `subject:x` to `SUBJECT x`; `newer_than:Nd` to `SINCE <today-N>`; `older_than:Nd` to `BEFORE <today-N>`; `is:unread` / `is:read` to `UNSEEN` / `SEEN`; `is:pinned` to `FLAGGED`; bare words to `TEXT`.
Source: 01-design-v0.2.md L130-L141: "Supported tokens, translated to IMAP SEARCH:" / "| `from:x` | `FROM x` |" / "| `to:x` | `TO x` |" / "| `subject:x` | `SUBJECT x` |" / "| `newer_than:Nd` | `SINCE <today-N>` |" / "| `older_than:Nd` | `BEFORE <today-N>` |" / "| `is:unread` / `is:read` | `UNSEEN` / `SEEN` |" / "| `is:pinned` | `FLAGGED` |" / "| bare words | `TEXT` |"
Type: calculation
Confidence: medium
Ambiguity note: How multiple tokens combine is not stated (implicit AND is the Gmail convention; skills use `from:mailer-daemon newer_than:3d`, which needs AND). Quoted values, negation (`-from:`), and `OR` are not addressed. Only a `d` (day) unit is given for newer_than/older_than. IMAP SINCE/BEFORE are date-granular, so `newer_than:3d` covers today-3 from midnight, which is not identical to a rolling 72 hours.

Rule ID: DES-47
Statement: Unknown filter tokens must return an error and must never be silently dropped.
Source: 01-design-v0.2.md L143: "Unknown tokens are an error, never silently dropped."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-48
Statement: Filter date math must use the America/Indianapolis time zone.
Source: 01-design-v0.2.md L143: "Date math uses America/Indianapolis."
Type: calculation
Confidence: high
Ambiguity note: none.

## H. Design doc: drafts, threading, signature, headers

Rule ID: DES-49
Statement: A new draft is built as an RFC 5322 message and APPENDed to the account's Drafts folder with the `\Draft` flag.
Source: 01-design-v0.2.md L147: "New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag."
Type: sequencing
Confidence: low
Ambiguity note: The design says the `\Draft` flag; the spike's successful APPEND (02-spike-results.md L44) used "\\Draft \\Seen". Reading 1: `\Draft` only. Reading 2: `\Draft \Seen`, as tested and verified in Spark. Unverified whether Spark treats an unseen draft differently. See X-10.

Rule ID: DES-50
Statement: A reply or reply-all draft must set `In-Reply-To` and `References` from the original, use a `Re:` subject, take recipients from the original according to the reply mode, and place the quoted original below the body.
Source: 01-design-v0.2.md L148: "Reply / reply all: set `In-Reply-To` and `References` from the original, `Re:` subject, recipients from the original per reply mode, quoted original below the body."
Type: definition
Confidence: medium
Ambiguity note: (1) Recipient rules for replying to a message Scott sent (the original is in Sent, so "from" is Scott) are not stated. (2) Whether reply-all removes the account's own address is not stated. (3) Whether `Re:` is added when the subject already starts with `Re:` is not stated. (4) Where the appended signature goes relative to the quoted original is not stated (see DES-53).

Rule ID: DES-51
Statement: A forward draft must use a `Fwd:` subject and include the original; whether the original is an inline quote or a .eml attachment is open decision D4, leaning inline quote to match touch-7 behavior.
Source: 01-design-v0.2.md L149: "Forward: `Fwd:` subject, original included (inline quote vs attachment is D4)." L164: "| D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior). Open. |"
Type: definition
Confidence: low
Ambiguity note: D4 is open. Readings: inline quote (leaning) or .eml attachment. Recipient handling for forwards is also unstated; see GIR-10.

Rule ID: DES-52
Statement: Editing a draft is implemented by appending the new version and deleting the old draft UID (IMAP has no in-place edit); edit returns the new ID.
Source: 01-design-v0.2.md L150: "Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID."
Type: sequencing
Confidence: medium
Ambiguity note: Which inputs an edit accepts (full replacement body only, or any of to/subject/body) is not stated anywhere; get-in-the-room L360 only gives `edit: <draft ID>`. The edit changes the draft's ID, but get-in-the-room hands Scott the draft ID per recipient (GIR-05); see X-08. Order of append and delete on failure (append succeeds, delete fails) is not stated.

Rule ID: DES-53
Statement: Draft delete is draft-only: the server must refuse to delete a target that lacks the `\Draft` flag or is not in the Drafts folder.
Source: 01-design-v0.2.md L151: "Delete: draft-only. Refuse if the target lacks `\Draft` or is not in the Drafts folder."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-54
Statement: Draft body input is markdown; the server renders a multipart message with text and HTML parts.
Source: 01-design-v0.2.md L152: "Body input is markdown; the server renders multipart text and HTML."
Type: definition
Confidence: medium
Ambiguity note: The markdown dialect and the plain-text rendering rules are not specified. gatekeeper-panel requires the signature to appear "exactly as it will render" (GKP-02), which depends on these rules.

Rule ID: DES-55
Statement: Signature (D1, decided): the server appends the account's configured signature to every draft it creates or edits; skills keep sending signature-free bodies.
Source: 01-design-v0.2.md L153: "Signature (D1): the server appends the account's configured signature to every draft it creates or edits. Spark does not add a signature to a draft it did not compose (spike run 3, verified with a default signature assigned to the account). Skills keep sending signature-free bodies." L161: "| D1 | ... | DECIDED (spike run 3): (a). ... Server appends the per-account signature; skills send signature-free bodies, unchanged. |"
Type: structural gate
Confidence: medium
Ambiguity note: The spike's statement of D1 (02-spike-results.md L78) says "every draft body it creates", omitting edits; the design says "creates or edits". Read as creates or edits. Placement relative to quoted content in replies/forwards is not stated. Whether the server should detect and avoid a duplicate when a body already contains the signature is not stated (see GIR-03). Contradicts the skill files' stated mechanism; see X-02.

Rule ID: DES-56
Statement: The server must decode all returned header text (subjects and address display names arriving RFC 2047 encoded, for example `=?UTF-8?B?...?=`), build `Re:` / `Fwd:` subjects from the decoded subject, and re-encode on write when non-ASCII.
Source: 01-design-v0.2.md L154: "Header decoding: subjects and address display names arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server decodes all returned header text, and builds `Re:` / `Fwd:` subjects from the decoded subject, re-encoding on write when non-ASCII." Also 02-spike-results.md L59 (F1).
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-57
Statement: Because Spark re-composes a draft at send time and assigns its own `@Spark` Message-ID (keeping In-Reply-To and References and setting `\Answered` on the original), anything that must find the sent copy must search Sent by recipient, subject and date, not by the draft's Message-ID.
Source: 01-design-v0.2.md L155: "Spark behavior on send (observed): Spark re-composes the draft, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original. The server's draft Message-ID is therefore not the sent Message-ID; anything that must find the sent copy searches Sent by recipient, subject and date, not by the draft's Message-ID." Also 02-spike-results.md L70.
Type: sequencing
Confidence: medium
Ambiguity note: Unclear whether the server provides a dedicated "find sent copy of draft X" operation or whether the skill composes `emails` on `:Sent` with `to:` and `subject:` filters itself. The filter grammar has no single-day date token, only newer_than/older_than.

## I. Design doc: open decisions D5, D6

Rule ID: DES-58
Statement: Archive folder (D5): use the existing Archive folder; never auto-create one; a missing Archive folder is an error. cPanel A has `INBOX.Archive` with `\Archive`; cPanel B must be verified in integration tests.
Source: 01-design-v0.2.md L165: "| D5 | Archive folder | Use existing Archive if present, else create | cPanel A: `INBOX.Archive` with `\Archive` exists (spike run 3). cPanel B: verify in integration tests. Never auto-create; a missing Archive is an error. |" Also 02-spike-results.md L61 (F3).
Type: structural gate
Confidence: low
Ambiguity note: The D5 "Options" column reads "Use existing Archive if present, else create", while the leaning column says "Never auto-create; a missing Archive is an error." Reading 1: never create (leaning, more specific). Reading 2: create if absent (options text). Also unclear whether D5 is decided (no "DECIDED" marker, unlike D1/D2).

Rule ID: DES-59
Statement: After cutover the Spark path is kept as a fallback for 30 days (D6 leaning).
Source: 01-design-v0.2.md L166: "| D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |"
Type: sequencing
Confidence: low
Ambiguity note: Conflicts with L52, which defines migration as "removing the \"Spark unreachable\" branch". See X-06.

## J. Design doc: risks, testing, build, acceptance, operations

Rule ID: DES-60
Statement: The IMAP parser must be tested against recorded real server responses from the mcptest mailbox, to cover response shapes the prototype did not see (large literals, unusual FETCH shapes).
Source: 01-design-v0.2.md L172: "Residual risk: our IMAP parser meets server responses the prototype did not see (large literals, unusual FETCH shapes). Mitigation: parser tests against recorded real responses from mcptest."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-61
Statement: Laptop display of IMAP-appended drafts in Spark has not yet been checked and must still be verified.
Source: 01-design-v0.2.md L174: "Spike run 3: drafts appear, thread and send correctly from desktop. Laptop not yet checked."
Type: tracking-only check
Confidence: low
Ambiguity note: Conflicts with L183, which says criterion 3 "passed", while criterion 3 (L189) requires "Spark (desktop and laptop)". See X-11.

Rule ID: DES-62
Statement: Acceptance must compare the server's thread output to Spark's thread view on sampled threads.
Source: 01-design-v0.2.md L176: "| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |"
Type: tracking-only check
Confidence: medium
Ambiguity note: Sample size and the pass threshold for "differs" are not stated.

Rule ID: DES-63
Statement: Credential compromise risk is mitigated by the dedicated Cloudflare account with hardware 2FA, unique mailbox passwords, single-principal OAuth, and no send capability.
Source: 01-design-v0.2.md L175: "| R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |"
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-64
Statement: The signature text exists in two places (Spark settings and server config) and can drift; which is the source of truth and how changes propagate is an open question for the ambiguity log.
Source: 01-design-v0.2.md L178: "| R7 | Signature text exists in two places (Spark settings and server config) and drifts | Open question for the ambiguity log: which is the source of truth and how changes propagate |" Also 02-spike-results.md L76: "A change in Spark does not reach server-created drafts. Carry into the ambiguity log as a source-of-truth question."
Type: other
Confidence: low
Ambiguity note: Explicitly unresolved. Readings: server config is the source of truth (Spark setting is irrelevant to server drafts); Spark setting is the source of truth and server config must be kept in sync manually; or skill files (which quote the text) are the source of truth.

Rule ID: DES-65
Statement: Deliverability of mail from a new sender (first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass) is not a server issue, because Spark sends; note only.
Source: 01-design-v0.2.md L179: "| R8 | New sender reputation: first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass | Not a server issue (Spark sends). Live accounts have history. Note only. |"
Type: tracking-only check
Confidence: high
Ambiguity note: none.

Rule ID: DES-66
Statement: The feasibility pass criteria are: (1) protocol operations (login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE) against both hosts; (2) folder names and SPECIAL-USE flags recorded for all three accounts; (3) an IMAP-appended draft appears in Spark on desktop and laptop within one sync cycle, threads correctly as a reply, and sends correctly; (4) D1 signature check; (5) `\Flagged` displays as pinned and archive move shows as archived.
Source: 01-design-v0.2.md L187-L191: "1. imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts." / "2. Folder names and SPECIAL-USE flags recorded for all three accounts." / "3. A draft appended over IMAP appears in Spark (desktop and laptop) within one sync cycle, threads correctly as a reply, and sends correctly." / "4. D1 check: does Spark append the account signature when sending that draft?" / "5. `\Flagged` displays as pinned in Spark. Archive move shows as archived."
Type: structural gate
Confidence: low
Ambiguity note: Criterion 1 names imapflow, which was abandoned (D2); and criterion 1 includes MOVE, while the spike's restated list (02-spike-results.md L82) omits MOVE and spike run 3 (L36-L44) never exercised MOVE. Reading 1: MOVE must still be verified before the gate is passed. Reading 2: the gate was redefined without MOVE. See X-11 for status conflicts.

Rule ID: DES-67
Statement: Spike status: criteria 1 and 2 passed on cPanel A; cPanel B and the archive move are deferred to integration tests; criteria 3, 4 and 5 (pin) passed.
Source: 01-design-v0.2.md L183: "Status: COMPLETE (2026-11-01). Results in docs/spike-results.md. Criteria 1 and 2 passed on cPanel A; cPanel B and archive move are deferred to integration tests. Criteria 3, 4, 5 (pin) passed."
Type: tracking-only check
Confidence: low
Ambiguity note: "COMPLETE" while criteria 1, 2 and 5 are only partly met and criterion 3's laptop check is not done (L174). See X-11.

Rule ID: DES-68
Statement: Build sequencing: design reviewed (done); spike and design v0.2 (done); rule extraction producing `docs/rule-base.md` and `docs/ambiguity-log.md`; Scott resolves the ambiguity log; write-spec-from-resolutions producing `docs/spec.md` with every requirement cited; build to spec; deploy to the dedicated Cloudflare account and add as a claude.ai custom connector.
Source: 01-design-v0.2.md L197-L203: "1. This design doc (v0.1), reviewed by Scott. DONE." / "2. Spike; update design with results (v0.2). DONE." / "3. extract-rules-and-flag-ambiguity ... Outputs `docs/rule-base.md`, `docs/ambiguity-log.md`." / "4. Scott resolves the ambiguity log." / "5. write-spec-from-resolutions. Output `docs/spec.md`, every requirement cited to a rule or resolution." / "6. Build to spec. ..." / "7. Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector."
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: DES-69
Statement: The build must have one test per requirement ID.
Source: 01-design-v0.2.md L202: "Build to spec. One test per requirement ID;"
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-70
Statement: Integration tests must run against a dedicated test mailbox on cPanel A, never against live inboxes.
Source: 01-design-v0.2.md L202: "integration tests against a dedicated test mailbox on cPanel A, never against live inboxes."
Type: structural gate
Confidence: low
Ambiguity note: Integration tests are confined to cPanel A, yet cPanel B verification (criteria 1 and 2 for cPanel B, Archive on cPanel B per D5, L165) is explicitly "deferred to integration tests" (L183). cPanel B has no named test mailbox; its only mailboxes are live. Reading 1: create a test mailbox on cPanel B (not stated anywhere). Reading 2: cPanel B is verified read-only against live inboxes, violating "never against live inboxes". Reading 3: cPanel B verification happens only in the parallel run.

Rule ID: DES-71
Statement: Acceptance parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server; results must match (same messages found, same bounces, same pins applied) with differences explained.
Source: 01-design-v0.2.md L207: "Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server. Results must match (same messages found, same bounces, same pins applied) with differences explained."
Type: structural gate
Confidence: medium
Ambiguity note: Running pins and archives against both paths on the same live mailboxes means the second run sees the first run's pins (B1 skips pinned messages), so "same pins applied" cannot be compared naively. Unclear whether one path runs read-only during the parallel run. Also unclear whether "differences explained" allows a pass with differences.

Rule ID: DES-72
Statement: Get-in-the-room acceptance: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient.
Source: 01-design-v0.2.md L208: "Get-in-the-room: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: DES-73
Statement: Cutover: skills switch tool prefix; the Spark path becomes the fallback per D6. The power-off success test (DES-02) is part of acceptance.
Source: 01-design-v0.2.md L209-L210: "Cutover: skills switch tool prefix; Spark path becomes fallback per D6." / "Power-off test: the success test in section 2."
Type: sequencing
Confidence: medium
Ambiguity note: Ties to D6, which is a leaning rather than decided. See X-06.

Rule ID: DES-74
Statement: Logging records tool name, account, host, outcome, latency, and error class, and must never record message bodies, credentials, or correspondent addresses beyond their domain.
Source: 01-design-v0.2.md L214: "Logging: tool name, account, host, outcome, latency, error class. Never bodies, never credentials, never full addresses of correspondents beyond domain."
Type: tracking-only check
Confidence: medium
Ambiguity note: Subjects are not mentioned either way; filter/query strings (which can contain full addresses such as `to:<address>`) and error messages are not addressed. Unclear whether "account" (one of Scott's own three addresses) is exempt from the address rule; reading: yes, since it is listed as a field.

Rule ID: DES-75
Statement: Scheduled skills must call `availability` first and push-notify on any host failure.
Source: 01-design-v0.2.md L215: "Alerting: scheduled skills call `availability` first and push-notify on any host failure."
Type: sequencing
Confidence: medium
Ambiguity note: This is a requirement on the calling skills, not on the server. The current email-crap-filter (ECF-20) notifies only on content or "any part failed or Spark was unreachable" and has no availability preflight step. Unclear whether the skill must be changed or the server's per-response account status satisfies it.

Rule ID: DES-76
Statement: A mailbox password change must require only one secret update, documented in the README.
Source: 01-design-v0.2.md L216: "Secrets rotation: mailbox password change means one secret update; documented in README."
Type: structural gate
Confidence: high
Ambiguity note: none.

## K. Spike results

Rule ID: SPK-01
Statement: The IMAP client must be unit tested against a scripted Dovecot fake covering LITERAL+ on and off, literal mailbox names, auth failure, and silent-server timeout.
Source: 02-spike-results.md L28: "Unit tested against a scripted Dovecot fake (LITERAL+ on and off, literal mailbox names, auth failure, silent-server timeout)."
Type: structural gate
Confidence: medium
Ambiguity note: This describes how the prototype was tested, not explicitly a requirement for the production build. Reading as a carried-forward test requirement; alternative reading is historical record only.

Rule ID: SPK-02
Statement: The IMAP client must handle a Dovecot server advertising IMAP4rev1, SASL-IR, LITERAL+ and AUTH=PLAIN, and may use LITERAL+ for APPEND.
Source: 02-spike-results.md L21: "Dovecot greeting with IMAP4rev1, SASL-IR, LITERAL+, AUTH=PLAIN." L44: "APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+ | PASS (APPENDUID 1793547457 1)"
Type: definition
Confidence: medium
Ambiguity note: Observed on cPanel A only. cPanel B capabilities are unrecorded; unclear whether the client must also work without LITERAL+ in production (the unit tests cover "LITERAL+ on and off").

Rule ID: SPK-03
Statement: The IMAP command set exercised and required is: TLS connect, greeting, AUTHENTICATE PLAIN with SASL-IR, LIST, SELECT, UID SEARCH, UID FETCH (headers), UID STORE +FLAGS, APPEND.
Source: 02-spike-results.md L36-L44: "| Raw TLS probe | PASS |" / "| Greeting (LITERAL+ advertised) | PASS |" / "| Login, AUTHENTICATE PLAIN with SASL-IR | PASS |" / "| LIST | PASS |" / "| SELECT INBOX | PASS ... |" / "| UID SEARCH SINCE 7d | PASS |" / "| UID FETCH headers | PASS |" / "| UID STORE +FLAGS \\Flagged | PASS |" / "| APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+ | PASS ... |"
Type: definition
Confidence: medium
Ambiguity note: Archive (move), draft delete (STORE \Deleted plus EXPUNGE or UID EXPUNGE), and body fetch for `thread` are required by the tool surface but were not exercised. Whether the server uses IMAP MOVE or COPY plus delete depends on server capability, not recorded.

Rule ID: SPK-04
Statement: The server must decode RFC 2047 encoded subjects before returning them and before building `Re:` subjects; an encoded subject is valid for mail clients but wrong for skill output.
Source: 02-spike-results.md L59: "F1. Subjects arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server must decode headers before returning them and before building `Re:` subjects. The spike draft subject is still encoded; valid for mail clients, wrong for skill output."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: SPK-05
Statement: cPanel B protocol operations and its folder names and SPECIAL-USE flags are still pending verification (run was list-only).
Source: 02-spike-results.md L68-L69: "| 1 | Protocol ops on Workers | PASS on cPanel A. cPanel B pending (list-only run). |" / "| 2 | Folder names and SPECIAL-USE | cPanel A done (above). cPanel B pending. |"
Type: tracking-only check
Confidence: medium
Ambiguity note: "list-only run" is unclear: either a LIST command was run against cPanel B (but results are not recorded), or the cPanel B row only lists the item as to-do. Either way no cPanel B folder map exists.

Rule ID: SPK-06
Statement: An IMAP-appended draft appeared in Spark, sent from Spark, and arrived with In-Reply-To and References intact and threaded in Gmail; Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly.
Source: 02-spike-results.md L70: "PASS. Draft appeared in Spark, sent from Spark, arrived with In-Reply-To and References intact; Gmail threaded send 2 onto send 1. Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: SPK-07
Statement: Spark does NOT add the account signature to a draft it did not create, even with a default signature assigned to the account.
Source: 02-spike-results.md L71: "ANSWERED: Spark does NOT add the account signature to a draft it did not create. Send 2 went out with a default signature assigned to mcptest in Spark (Settings > Composer > Signatures, screenshot 2026-11-01 21:20); body arrived with no signature."
Type: definition
Confidence: high
Ambiguity note: none. (Contradicts the skill files; see X-02.)

Rule ID: SPK-08
Statement: `\Flagged` shows as pinned in Spark, and Spark sets `\Answered` on the original when a reply is sent; the archive move has not yet been exercised and still must be verified to show as archived.
Source: 02-spike-results.md L72: "| 5 | Flagged shows as pinned; archive shows as archived | Flag PASS (shows pinned in Spark; Spark also set \\Answered on reply). Archive move not yet exercised. |"
Type: tracking-only check
Confidence: high
Ambiguity note: none.

Rule ID: SPK-09
Statement: D1 option (a): the server appends the per-account signature to every draft body it creates; skills keep sending signature-free bodies.
Source: 02-spike-results.md L78: "Decision D1: option (a). The server appends the per-account signature to every draft body it creates. Skills keep sending signature-free bodies, which matches get-in-the-room and gatekeeper-panel today."
Type: structural gate
Confidence: medium
Ambiguity note: "Creates" here vs "creates or edits" in the design (01-design-v0.2.md L153). Read together as creates or edits; the narrower reading would leave edited drafts unsigned.

Rule ID: SPK-10
Statement: The spike results file ends with a restated list of pass criteria and an empty results table (checks 1 to 5 with no results).
Source: 02-spike-results.md L80-L94: "Pass criteria from design section 10:" / "1. login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE against both hosts" ... "| Check | Result |" / "| 1 | |" / "| 2 | |" / "| 3 | |" / "| 4 | |" / "| 5 | |"
Type: tracking-only check
Confidence: low
Ambiguity note: The blank table contradicts the filled status table at L66-L72. Reading 1: leftover template, superseded by L66-L72. Reading 2: a formal sign-off table that has not been completed, so the gate is not formally closed. Also this restated criterion 1 omits MOVE and "STORE flags" becomes "STORE" (see DES-66).

## L. email-crap-filter skill

Rule ID: ECF-01
Statement: The triage runs three passes in fixed order: Part C (bounce sweep on scott@reasinger.net) first, then Part B (the three business inboxes), then Part A (Gmail personal, not this server).
Source: skill-email-crap-filter.md L8-L17: "Three passes, always in this order:" / "**Part C, Bounce sweep (Spark, scott@reasinger.net).** First, because a bounce kills an outreach touch silently." / "**Part B, Business inboxes (Spark).** scott@reasinger.net (job search), scott@yourcigardenindy.com and founders@yourcigardenindy.com ..." / "**Part A, Gmail personal (Gmail connector).**"
Type: sequencing
Confidence: high
Ambiguity note: none.

Rule ID: ECF-02
Statement: Since 2026-10-26 the business inboxes are read directly (cPanel forwarders to Gmail retired), so Gmail does not see this mail and the business inboxes are reachable only through the mail server path.
Source: skill-email-crap-filter.md L14-L15: "Since 2026-10-26 these are read directly in Spark Pro; the cPanel forwarders to Gmail are retired, so Gmail no longer sees any of this mail."
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: ECF-03
Statement: If the mail tools are absent or unreachable, run Part A only, and put "Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)" as the first line of the report; never treat that as a clean run.
Source: skill-email-crap-filter.md L19-L23: "Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action) run through Scott's linked computer; load them with ToolSearch. If they are absent or the computer is unreachable, run Part A only and put \"Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)\" as the first line of the report. Never treat that as a clean run."
Type: structural gate
Confidence: low
Ambiguity note: Written for the Spark connector. The design (L52) says migration removes the "Spark unreachable" branch, while D6 (L166) keeps Spark as fallback for 30 days, and the server can be partially reachable (one host down, DES-13), which this all-or-nothing branch does not handle. Readings: (a) branch is removed; (b) branch is kept and retargeted to "server unreachable"; (c) branch becomes a fallback to Spark tools. See X-06 and X-07.

Rule ID: ECF-04
Statement: Bounce sweep step 1: call `emails` with `folder: "scott@reasinger.net:Inbox"` and `filter: "from:mailer-daemon newer_than:3d"`, then again with `filter: "from:postmaster newer_than:3d"`.
Source: skill-email-crap-filter.md L33-L35: "`Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`, `filter: \"from:mailer-daemon newer_than:3d\"`, then again with `filter: \"from:postmaster newer_than:3d\"`."
Type: sequencing
Confidence: medium
Ambiguity note: Bounce senders appear as "MAILER-DAEMON" or "mailer-daemon@googlemail.com"; the skill relies on `from:` being a case-insensitive substring match on the From header (IMAP FROM is substring, generally case-insensitive). If Spark's `from:` matched only display name or exact address, behavior would differ. Two filter tokens must combine as AND.

Rule ID: ECF-05
Statement: Bounce sweep step 2: call `search` with `query: "delivery failed undeliverable address not found"`, `in: "scott@reasinger.net"`, `filter: "newer_than:3d"`; the skill then keeps only real delivery-failure notices, so the search is expected to return a superset including normal mail.
Source: skill-email-crap-filter.md L36-L38: "`Spark__search` with `query: \"delivery failed undeliverable address not found\"`, `in: \"scott@reasinger.net\"`, `filter: \"newer_than:3d\"`. Keep only real delivery-failure notices (ignore normal mail the search also returns)."
Type: sequencing
Confidence: low
Ambiguity note: The skill expects the query to cast a wide net ("ignore normal mail the search also returns"), which implies OR-of-words or relevance semantics. The design maps bare words to IMAP `TEXT` (L141); if each of six words becomes an ANDed `TEXT` term, few or no bounces match, and the result set would be narrower than Spark's. Readings: (a) each word ORed; (b) each word ANDed; (c) the whole query as one phrase. Also unclear whether `search` `query` uses the filter grammar's bare-word rule at all. See X-09.

Rule ID: ECF-06
Statement: The `search` tool must accept an `in` parameter naming a single account.
Source: skill-email-crap-filter.md L37: "`in: \"scott@reasinger.net\"`". Also 01-design-v0.2.md L44: "`search` (query, in, filter)".
Type: definition
Confidence: medium
Ambiguity note: Whether `in` accepts only an account, or also `<account>:<Folder>`, is not stated. Which folders of that account are searched is not stated.

Rule ID: ECF-07
Statement: For each bounce, the skill reads the snippet, or calls `thread` if the snippet is thin, to report the failed address, error code, date, and original subject; so `emails` snippets and `thread` bodies must carry enough of the bounce text to extract those.
Source: skill-email-crap-filter.md L40-L41: "For each bounce, read the snippet (or `Spark__thread` if thin) and report: the failed address, the error code, the date, and the original subject if shown."
Type: other
Confidence: medium
Ambiguity note: Bounce notices are often multipart/report with the original as a message/rfc822 part. "Bodies as text" (DES-41) does not say whether delivery-status and embedded original parts are included in the text.

Rule ID: ECF-08
Statement: Bounces must not be archived by the triage run.
Source: skill-email-crap-filter.md L45: "Do not archive bounces; Scott or the send block clears them after logging."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-09
Statement: Part B fetch: for each of the three business accounts call `emails` with `folder: "<account>:Inbox"`, `filter: "newer_than:7d"`, `page_size: 100`.
Source: skill-email-crap-filter.md L59-L60: "For each account call `Spark__emails` with `folder: \"<account>:Inbox\"`, `filter: \"newer_than:7d\"`, `page_size: 100`."
Type: sequencing
Confidence: medium
Ambiguity note: The skill makes no use of the paging cursor; if an inbox has more than 100 messages in 7 days, the rest are silently not triaged. The configuration block (L265) says "max_threads: 100 # paginate at 50 per call", which reads as Gmail-specific but sits in a block labeled "all parts" for lookback. Unclear whether Part B must paginate past 100 or cap at 100.

Rule ID: ECF-10
Statement: Part B must skip messages already pinned, so `emails` results must expose the pinned (`\Flagged`) state per message.
Source: skill-email-crap-filter.md L60-L61: "Skip messages already pinned (flag shows pinned) and bounce notices (Part C owns those)."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-11
Statement: To decide whether a sender is replying to someone Scott emailed, the skill may check `scott@reasinger.net:Sent` for that sender; so `emails` must support the Sent folder with a recipient filter.
Source: skill-email-crap-filter.md L71-L72: "A reply from someone Scott emailed (check `scott@reasinger.net:Sent` for the sender if unsure) is always `Review Now`, never Career-only."
Type: other
Confidence: medium
Ambiguity note: The call shape is not given (`emails` with `to:<sender>` on Sent, or `search`). Only the scott@reasinger.net Sent folder is named, even for the yourcigardenindy.com accounts.

Rule ID: ECF-12
Statement: `Review Now`, `Review Now (Founder lead)` and `Career` messages on the business accounts are pinned via `action` `pin` on their message IDs; pinned means triaged and needs Scott.
Source: skill-email-crap-filter.md L74-L76: "### B3. Act (IMAP accounts have no AI/ labels; Spark actions stand in)" / "`Review Now`, `Review Now (Founder lead)`, `Career`: `Spark__action` `pin` on the message IDs. Pinned = triaged and needs Scott."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-13
Statement: `Noise` messages with no safety term on the business accounts are archived via `action` `archive`; everything else gets no action.
Source: skill-email-crap-filter.md L77-L78: "`Noise` with no safety term: `Spark__action` `archive`." / "Everything else: no action, report only."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: ECF-14
Statement: The triage must never delete, move to trash, unsubscribe, send, or unpin.
Source: skill-email-crap-filter.md L79: "Never delete, move to trash, unsubscribe, or send. Never unpin."
Type: structural gate
Confidence: medium
Ambiguity note: This constrains the skill. The server still offers `unpin` and `move` (DES-42), so a move to Trash is possible through the server. Unclear whether the server should enforce any of these (for example block Trash as a `move` target) or leave it to the skill.

Rule ID: ECF-15
Statement: Actions must be batched per action type (one call for all pins, one for all archives); a failed ID must be logged and the run must continue, so `action` must accept a list of IDs and report failure per ID without aborting the batch.
Source: skill-email-crap-filter.md L80-L81: "Batch IDs per action (one call for all pins, one for all archives). Log any failed ID and continue."
Type: structural gate
Confidence: medium
Ambiguity note: Batches can span three accounts on two hosts in one call. Unclear whether one `action` call may mix accounts, and whether a per-ID result list (versus all-or-nothing) is what Spark returns. Reading: per-ID results, mixed accounts allowed, consistent with DES-13.

Rule ID: ECF-16
Statement: Archiving business-account messages must preserve message IDs or allow lookup after the move, since the parallel run compares results and later calls may reference archived messages.
Source: skill-email-crap-filter.md L77: "`Noise` with no safety term: `Spark__action` `archive`." Combined with 01-design-v0.2.md L126: "fall back to a Message-ID header search when the message has moved (for example after archive)."
Type: other
Confidence: medium
Ambiguity note: Inferred by combining two sources; neither skill line states a need to look up archived messages. Possibly not a requirement from the skill side.

Rule ID: ECF-17
Statement: Every reported item must be tagged with its account (`[reasinger.net]`, `[YCDI]`, `[founders]`, `[gmail]`), so server results must identify the account each message belongs to.
Source: skill-email-crap-filter.md L224-L225: "One combined report across all accounts. Tag each item with its account (`[reasinger.net]`, `[YCDI]`, `[founders]`, `[gmail]`)."
Type: definition
Confidence: medium
Ambiguity note: The design's `emails` return fields (L118) do not list account. The folder parameter already scopes a call to one account, so the account is known from the call; but `search` across all accounts would need it per result.

Rule ID: ECF-18
Statement: The report must state whether Scott already replied to a Review Now item.
Source: skill-email-crap-filter.md L233-L234: "**Review Now**: every Review Now item, sender + subject + the action asked for, and whether Scott already replied."
Type: other
Confidence: medium
Ambiguity note: For business accounts the source of "already replied" is not stated: the `\Answered` flag (in `flags`, which Spark sets on reply per SPK-08), a Sent folder check, or the `thread` view. The Gmail part uses the SENT label (L177-L178), which does not apply.

Rule ID: ECF-19
Statement: If the mail path was unreachable, the Bounces section of the report must say so instead of listing bounces.
Source: skill-email-crap-filter.md L228-L229: "**Bounces** (Part C): failed address, error, date, original subject, the fix. If Spark was unreachable, say so here instead."
Type: other
Confidence: low
Ambiguity note: Same transition question as ECF-03: whether this branch survives migration, and how a partially reachable server (cPanel A up, cPanel B down) is reported. Part C uses only cPanel A.

Rule ID: ECF-20
Statement: On scheduled runs, push-notify if and only if the run produced at least one bounce, Career, Review Now (including founder lead), Finance-Legal, or Needs Human Decision item, or if any part failed or the mail path was unreachable; otherwise stay silent.
Source: skill-email-crap-filter.md L246-L251: "send a push notification if and only if the run produced at least one bounce, Career, Review Now (including a founder lead), Finance-Legal, or Needs Human Decision item, or if any part failed or Spark was unreachable. ... If the run found only Noise and Low Priority, stay silent."
Type: structural gate
Confidence: medium
Ambiguity note: Server-relevant because a partial host failure reported by the server (DES-13) must count as "any part failed". Unclear whether one unreachable account within Part B counts as Part B failing.

Rule ID: ECF-21
Statement: Error handling: if Gmail is unavailable, run Parts C and B anyway and report Part A as not run; if the mail path is unreachable, run Part A and report Parts C and B as not run, with notification on scheduled runs.
Source: skill-email-crap-filter.md L255-L257: "Gmail MCP unavailable or auth fails: run Parts C and B anyway, report Part A as not run (on a scheduled run, notify)." / "Spark unreachable: run Part A, report Parts C and B as not run (notify)."
Type: structural gate
Confidence: low
Ambiguity note: Same transition and partial-reachability issue as ECF-03 and X-07. The server can report one host down; this rule only knows all-or-nothing.

Rule ID: ECF-22
Statement: Default lookback is 7 days for all parts; Part C uses 3 days.
Source: skill-email-crap-filter.md L264: "lookback_window: 7d       # all parts; Part C uses 3d"
Type: calculation
Confidence: high
Ambiguity note: none.

Rule ID: ECF-23
Statement: Read and unread messages are both in scope for triage (include_read: true), so Part B fetch must not filter to unread.
Source: skill-email-crap-filter.md L266: "include_read: true        # unlabeled read threads are still triaged" and L59-L60 (filter is only "newer_than:7d").
Type: other
Confidence: medium
Ambiguity note: The include_read comment talks about "unlabeled read threads", which is Gmail terminology. Applied to Part B by the "all parts" config framing; could be Gmail-only.

Rule ID: ECF-24
Statement: The skill description names the business inboxes as reached "via Spark"; after migration the skill's tool references (mcp__remote-devices__Spark__emails, __search, __thread, __action) change to this server's tool prefix.
Source: skill-email-crap-filter.md L3: "plus the business inboxes scott@reasinger.net, scott@yourcigardenindy.com and founders@yourcigardenindy.com via Spark" and L19: "Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action)". 01-design-v0.2.md L209: "Cutover: skills switch tool prefix".
Type: definition
Confidence: medium
Ambiguity note: Whether the ToolSearch loading step (L20) still applies to a remote custom connector is not stated.

## M. get-in-the-room skill

Rule ID: GIR-01
Statement: Get-in-the-room believes Spark appends the account signature, so draft bodies carry no signature.
Source: skill-get-in-the-room.md L7: "Spark Pro replaces Gmail for drafts, sends, sent-checks, and bounces; account per purpose; Spark appends the signature, so draft bodies carry none."
Type: definition
Confidence: low
Ambiguity note: Contradicted by spike run 3 (02-spike-results.md L71): Spark does NOT sign drafts it did not create. Reading 1 (design D1): the server appends; skill input stays signature-free; the skill's stated reason is wrong but behavior is unchanged. Reading 2 (skill as written): no one appends, and the sent mail goes unsigned. See X-02.

Rule ID: GIR-02
Statement: The scott@reasinger.net signature text is exactly `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`.
Source: skill-get-in-the-room.md L116: "the scott@reasinger.net account signature in Spark appends it automatically: `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`."
Type: definition
Confidence: medium
Ambiguity note: Quoted as the signature configured in Spark. Under D1 the server must hold the same text (R7 source-of-truth question, DES-64). Whether "Never sreasinger@gmail.com" (same line) is about the signature or the sending account is unclear.

Rule ID: GIR-03
Statement: The skill must never type a signature or sign-off into the draft body, because it would print twice.
Source: skill-get-in-the-room.md L116: "**Never type a signature or sign-off into the Spark draft body** (it would print twice)."
Type: structural gate
Confidence: medium
Ambiguity note: Constrains the skill's input. Unclear whether the server should also guard against a duplicate (detect the signature already at the end of the body and not append again) or append unconditionally.

Rule ID: GIR-04
Statement: Email delivery must be a draft in the business account (never a Gmail draft).
Source: skill-get-in-the-room.md L217: "Email delivery = a Spark draft (see EMAIL DELIVERY - SPARK), never a Gmail draft."
Type: structural gate
Confidence: high
Ambiguity note: none.

Rule ID: GIR-05
Statement: The skill gives Scott the draft ID per recipient and must never call an email "ready" unless the draft exists, so the `draft` tool must return the created draft's ID only after the draft has actually been written.
Source: skill-get-in-the-room.md L217: "Give Scott the Spark draft ID per recipient; never call an email \"ready\" unless the draft exists."
Type: structural gate
Confidence: medium
Ambiguity note: The skill says "Spark draft ID"; the server's ID is its own opaque ID (DES-44), not an ID Scott can see in Spark. Unclear what Scott does with the ID (reference only, or later `edit`/`delete`). The edit operation changes the ID (DES-52); see X-08.

Rule ID: GIR-06
Statement: Drafts are created in the account matching purpose: job search (outreach, cover notes, recruiters, networking, follow-ups) in scott@reasinger.net; Your Cigar Den Indy, Scott personally, in scott@yourcigardenindy.com; founder-member outreach and replies in founders@yourcigardenindy.com; sreasinger@gmail.com never for outreach.
Source: skill-get-in-the-room.md L350-L355: "| Job search: outreach, cover notes, recruiters, networking, follow-ups | `scott@reasinger.net` |" / "| Your Cigar Den Indy, Scott personally | `scott@yourcigardenindy.com` |" / "| Your Cigar Den Indy founder-member outreach and replies | `founders@yourcigardenindy.com` |" / "| Never for outreach | `sreasinger@gmail.com` |"
Type: definition
Confidence: high
Ambiguity note: none.

Rule ID: GIR-07
Statement: A new note is created with `draft` taking `account`, `to`, `subject`, and `body` (markdown, no signature, no sign-off); every account appends its own signature.
Source: skill-get-in-the-room.md L357: "**New note:** `Spark__draft` with `account`, `to`, `subject`, `body` (markdown, no signature, no sign-off). Every account appends its own signature."
Type: definition
Confidence: medium
Ambiguity note: "Every account appends its own signature" requires a configured signature for all three accounts, but only the scott@reasinger.net text is given (GIR-02). The yourcigardenindy.com signatures are not in any source. Whether `cc`/`bcc` are supported is not stated. `to` format (single address or list) is not stated.

Rule ID: GIR-08
Statement: A reply on a thread uses `draft` with `reply_to: <message ID>` and `account`; the ID is found with `search` (query) or `emails` (filter, `folder: "scott@reasinger.net:Inbox"`).
Source: skill-get-in-the-room.md L358: "**Reply on a thread:** `Spark__draft` with `reply_to: <Spark message ID>` and `account`. Find the ID with `Spark__search` (query) or `Spark__emails` (filter, `folder: \"scott@reasinger.net:Inbox\"`)."
Type: definition
Confidence: medium
Ambiguity note: Since the message ID encodes the account (DES-44), `account` is redundant; behavior when `account` and the ID's account differ is not stated (error vs. ID wins). Whether a reply draft accepts `body` is implied but not stated.

Rule ID: GIR-09
Statement: A reply to everyone on a thread uses `reply_all`.
Source: skill-get-in-the-room.md L358: "A reply to everyone on the thread uses `reply_all`."
Type: definition
Confidence: medium
Ambiguity note: Parameter shape unclear: `reply_all: <message ID>` as its own key (parallel to `reply_to`), or a boolean `reply_all: true` alongside `reply_to`. Design L122 lists `reply_all` as a mode.

Rule ID: GIR-10
Statement: The touch-7 forward is created with `draft` taking `forward: <ID of Scott's sent touch 1>`, `account: scott@reasinger.net`, and body "Not sure if you saw this."; the original is found with `emails` on `folder: "scott@reasinger.net:Sent"` and `filter: "to:<address>"`.
Source: skill-get-in-the-room.md L359: "**Forward of the original (touch 7):** `Spark__draft` with `forward: <ID of Scott's sent touch 1>`, `account: scott@reasinger.net`, body \"Not sure if you saw this.\" Find the original with `Spark__emails` `folder: \"scott@reasinger.net:Sent\"`, `filter: \"to:<address>\"`." Also skill-get-in-the-room.md L257: "| 7 | 7-10 | Email | Forward the original. Body: \"Not sure if you saw this.\" |"
Type: definition
Confidence: medium
Ambiguity note: No `to` is given for the forward. Reading 1: the caller supplies `to` (omitted in the skill text). Reading 2: the server defaults the forward's recipient to the original's To (the same recipient), which is what touch 7 needs. Reading 3: the forward has no recipient and Scott fills it in. Also, the IDs of Sent messages must be valid `forward` targets.

Rule ID: GIR-11
Statement: An existing draft is edited with `draft` taking `edit: <draft ID>`.
Source: skill-get-in-the-room.md L360: "**Edit a draft:** `Spark__draft` with `edit: <draft ID>`."
Type: definition
Confidence: medium
Ambiguity note: The fields that may be changed in an edit and whether unspecified fields are kept or cleared are not stated. The returned ID differs from the input under the design (DES-52).

Rule ID: GIR-12
Statement: A draft is deleted with `draft` taking `delete: <draft ID>` alone, and the delete is permanent.
Source: skill-get-in-the-room.md L360: "**Delete:** `delete: <draft ID>` alone (permanent)."
Type: definition
Confidence: medium
Ambiguity note: "Alone" means no `account` parameter, so the server must derive the account from the ID (possible under DES-44). "Permanent" implies expunge rather than move to Trash; the design allows permanent delete only for drafts (DES-07), consistent.

Rule ID: GIR-13
Statement: Scott sends; Claude never uses `action send` unless Scott asks for that specific message to be sent in this session.
Source: skill-get-in-the-room.md L361: "**Sending:** Scott sends. Claude never uses `Spark__action send` unless Scott asks for that specific message to be sent in this session."
Type: structural gate
Confidence: low
Ambiguity note: The skill permits a send on explicit request; the server has no send at all (DES-03, DES-42). See X-04.

Rule ID: GIR-14
Statement: After Scott says a message was sent, the skill must confirm it in `scott@reasinger.net:Sent` before logging.
Source: skill-get-in-the-room.md L362: "**Send confirmation (send-then-log):** after Scott says sent, confirm it in `scott@reasinger.net:Sent` before logging." Also L218: "Scott confirms the send ... then flip each Touches row from Drafted to Sent with the actual Date".
Type: sequencing
Confidence: medium
Ambiguity note: Per DES-57 the sent copy has a Spark-assigned Message-ID, so confirmation must match by recipient, subject and date, not the draft ID. The skill does not say how it matches. Also, the skill's "actual Date" for the Touches row presumably comes from the Sent copy's date, so `emails` on Sent must return the date.

Rule ID: GIR-15
Statement: Bounce check in get-in-the-room: `emails` with `folder: "scott@reasinger.net:Inbox"`, `filter: "from:mailer-daemon newer_than:3d"`, plus `search` with query "delivery failed undeliverable" in `scott@reasinger.net`.
Source: skill-get-in-the-room.md L363: "**Bounces:** `Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`, `filter: \"from:mailer-daemon newer_than:3d\"`, plus `Spark__search` query \"delivery failed undeliverable\" in `scott@reasinger.net`."
Type: sequencing
Confidence: low
Ambiguity note: Differs from email-crap-filter's bounce sweep (ECF-04, ECF-05): no `from:postmaster` call, shorter query, and no `filter: newer_than:3d` on the search. The same server must serve both. The query word-combination question (X-09) applies. Readings: these are two independent call patterns the server must both support (no conflict for the server), or one is stale and the parallel-run comparison "same bounces" (DES-71) depends on which is used.

Rule ID: GIR-16
Statement: If the mail path is unreachable, say so, write the note into the build file, and give Scott the text to paste; never fall back to a Gmail draft.
Source: skill-get-in-the-room.md L364: "**Spark unreachable** (computer asleep, app closed): say so, write the note into the build file, and give Scott the text to paste. Never fall back to a Gmail draft."
Type: structural gate
Confidence: low
Ambiguity note: Same transition question as ECF-03 / X-06: the design says this branch is removed at migration (L52), but D6 keeps Spark as fallback (L166). With the server, does the skill fall back to Spark, to paste text, or neither?

Rule ID: GIR-17
Statement: Spark Pro is described as the mail system for every account, reached via `mcp__remote-devices__Spark__*` tools loaded with ToolSearch; after cutover those references switch to this server's tool prefix.
Source: skill-get-in-the-room.md L348: "Spark Pro is the mail system for every account; Gmail is no longer used for outreach drafts or for reading reasinger.net mail (forwarders retired 2026-10-26). The Spark tools run through Scott's linked computer (mcp__remote-devices__Spark__*); load them with ToolSearch." Also 01-design-v0.2.md L209.
Type: definition
Confidence: medium
Ambiguity note: "Spark Pro replaces Gmail for drafts, sends, sent-checks, and bounces" (L7) includes "sends", which the server does not do; reading is that Scott sends from Spark and the skill only drafts, consistent with L361.

Rule ID: GIR-18
Statement: Replies from contacts must be detectable (any reply turns the contact warm and is answered the same day), so the skill relies on reading the business Inbox with filters to find replies and their IDs for `reply_to`.
Source: skill-get-in-the-room.md L262: "**Any reply turns the contact warm:** answer the same day, deliver what the close offered, then the choice close." Also 01-design-v0.2.md L45: "`emails` on Inbox and Sent with filters; `search`".
Type: other
Confidence: medium
Ambiguity note: The skill excerpt does not give the exact call used to detect replies; inferred from L358 and the design call table.

Rule ID: GIR-19
Statement: Touches 9 and 10 are emails with subjects "quick question" and "curious?"; the skill does not say whether they are new drafts or replies on the touch-1 thread.
Source: skill-get-in-the-room.md L259-L260: "| 9 | 14 | Email | Subject \"quick question.\" 3 sentences max ..." / "| 10 | 17-21 | Email + phone | Subject \"curious?\" with 2 sentences ..."
Type: other
Confidence: low
Ambiguity note: Reading 1: new drafts (`draft` with to/subject/body), so the custom subject is kept. Reading 2: `reply_to` on the original thread, in which case the design's `Re:` subject rule (DES-50) would override the specified subject unless reply drafts accept a subject override. Matters for whether reply drafts accept a `subject` parameter.

Rule ID: GIR-20
Statement: Touch 7's forward follows the touch-1 send by 7 to 10 days, so the server's ID for a Sent message (or a Sent search by recipient) must still resolve days later and across sessions.
Source: skill-get-in-the-room.md L257: "| 7 | 7-10 | Email | Forward the original. Body: \"Not sure if you saw this.\" |" and L359 (find with `emails` on Sent, `to:<address>`). Also 01-design-v0.2.md L126: "IDs are stable across calls and across sessions."
Type: other
Confidence: medium
Ambiguity note: The skill re-finds the original each time via `emails` on Sent, so stable stored IDs may not be needed; but the `emails` default lookback and paging must reach a message 7 to 10 days old (the skill passes only `to:<address>`, no date filter).

## N. gatekeeper-panel skill

Rule ID: GKP-01
Statement: Gatekeeper-panel believes Spark appends the scott@reasinger.net signature; the check file ends with that signature and the draft body does not.
Source: skill-gatekeeper-panel.md L7: "Drafts ship from Spark, which appends the scott@reasinger.net signature; the check file ends with that signature, the draft body does not."
Type: definition
Confidence: low
Ambiguity note: Contradicted by spike run 3 (02-spike-results.md L71). Under D1 the server appends instead. Reading 1: behavior unchanged, mechanism moves to the server. Reading 2: as written, no one appends. See X-02.

Rule ID: GKP-02
Statement: For email, cover and InMail drafts, the check file ends with the account signature exactly as it will render (for scott@reasinger.net: `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`), while the draft body itself carries no signature; so the server-appended signature must render exactly as that text.
Source: skill-gatekeeper-panel.md L48: "For email, cover and InMail drafts the file ends with the Spark account signature exactly as it will render (`Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger` for scott@reasinger.net); the Spark draft body itself carries no signature because Spark appends it (v3.4, 2026-10-26)."
Type: structural gate
Confidence: medium
Ambiguity note: "Exactly as it will render" in the HTML part depends on markdown rendering (DES-54): the `|` separators and the URL could be rendered as a table or auto-linked. Unclear whether exactness applies to the text part, the HTML part, or both.

Rule ID: GKP-03
Statement: The signature for email, cover and InMail drafts must carry the LinkedIn URL, reasinger.net and the phone number.
Source: skill-gatekeeper-panel.md L204-L206: "if a.type in (\"email\", \"cover\", \"inmail\"):" / "if \"reasinger.net\" not in sig.lower() or \"linkedin.com/in/\" not in sig.lower():" / "fails.append(\"signature must carry LinkedIn + reasinger.net + phone; end the check file with the Spark signature: Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger\")"
Type: structural gate
Confidence: medium
Ambiguity note: The check runs on the skill's check file, not on the server's draft. It requires "reasinger.net" in every signature, which would fail for a yourcigardenindy.com account signature unless that signature also contains reasinger.net; unclear whether the panel is only ever run for scott@reasinger.net drafts. The message text says "phone" but the code does not test for the phone number.

## O. Cross-source contradictions (both readings kept)

Rule ID: X-01
Statement: The tool name `availability` is both excluded (as a Spark-only feature) and included (as a health-check tool) in the design.
Source: 01-design-v0.2.md L23: "Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them." vs L116: "| `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |"
Type: definition
Confidence: low
Ambiguity note: Reading 1: two different things share a name; the server's `availability` is a health check, not Spark's scheduling availability. Reading 2: the tool is out of scope. If Reading 1, the server's `availability` has different semantics from Spark's same-named tool, which strains drop-in compatibility (DES-11).

Rule ID: X-02
Statement: Who appends the signature: the skills say Spark appends the account signature at send; the spike and design say Spark does not, and the server appends it to every draft it creates or edits.
Source: skill-get-in-the-room.md L7: "Spark appends the signature, so draft bodies carry none." skill-get-in-the-room.md L116: "the scott@reasinger.net account signature in Spark appends it automatically". skill-gatekeeper-panel.md L7: "Drafts ship from Spark, which appends the scott@reasinger.net signature". skill-gatekeeper-panel.md L48: "the Spark draft body itself carries no signature because Spark appends it". vs 02-spike-results.md L71: "Spark does NOT add the account signature to a draft it did not create." and 01-design-v0.2.md L153: "the server appends the account's configured signature to every draft it creates or edits."
Type: structural gate
Confidence: low
Ambiguity note: Reading 1 (design D1, decided): server appends; skill input stays signature-free; skill text about the mechanism is stale but harmless. Reading 2 (skills as written): Spark appends; server must not append, or the signature would print twice if Spark ever did sign. Note that a draft Scott edits by hand in Spark may also be affected. The spike tested only "a draft it did not create" on mcptest; whether Spark signs on reply/forward drafts specifically was not separately tested.

Rule ID: X-03
Statement: The stored draft carries a signature under D1, while the skills and design L46 say the "draft body" carries none.
Source: 01-design-v0.2.md L46: "Assumes the draft body carries no signature and the sent mail carries the account signature." skill-gatekeeper-panel.md L48: "the Spark draft body itself carries no signature" vs 01-design-v0.2.md L153: "the server appends the account's configured signature to every draft it creates or edits."
Type: definition
Confidence: low
Ambiguity note: Reading 1: "draft body" means the body the skill passes in; the stored draft is signed. Reading 2: the draft as it sits in Drafts must be unsigned, which contradicts D1. Matters if any caller reads drafts back (for example after `edit`) and re-submits the body, which would double the signature.

Rule ID: X-04
Statement: Sending: the skill allows `action send` when Scott asks for that specific message to be sent; the design forbids any send capability.
Source: skill-get-in-the-room.md L361: "Claude never uses `Spark__action send` unless Scott asks for that specific message to be sent in this session." vs 01-design-v0.2.md L21: "No SMTP in v1." and L121: "No `send`, no permanent delete." and L53: "Nothing that sends".
Type: structural gate
Confidence: low
Ambiguity note: Reading 1: server has no send; on an explicit send request the skill must tell Scott to send from Spark (skill rule needs updating). Reading 2: the skill's conditional send survives and must be served (by Spark fallback or a future server send), contradicting the design. Drop-in compatibility (DES-11) is broken either way for this one call.

Rule ID: X-05
Statement: Spark-specific "Spark message ID" vs server opaque ID: skills refer to and hand Scott "Spark" IDs; the server issues its own IDs that Spark does not know.
Source: skill-get-in-the-room.md L217: "Give Scott the Spark draft ID per recipient" and L358: "`reply_to: <Spark message ID>`" vs 01-design-v0.2.md L126: "Spark IDs are opaque to skills, so the server defines its own opaque ID".
Type: definition
Confidence: low
Ambiguity note: Reading 1: IDs are opaque to skills, so any ID works and "Spark ID" is just a label. Reading 2: Scott uses the given ID somewhere Spark-specific (for example to find the draft in Spark), in which case a server ID is useless to him. During the D6 fallback period, a server ID passed to Spark (or the reverse) would fail.

Rule ID: X-06
Statement: Unreachable/fallback branch at migration: the design says migration removes the "Spark unreachable" branch; D6 says keep Spark as a fallback for 30 days; the skills currently fall back to Gmail-only triage or pasted text.
Source: 01-design-v0.2.md L52: "Migrating a skill is a tool-prefix swap plus removing the \"Spark unreachable\" branch, not a rewrite." vs L166: "Keep Spark as fallback for 30 days" and L209: "Spark path becomes fallback per D6." skill-email-crap-filter.md L21-L23 and L257; skill-get-in-the-room.md L364.
Type: sequencing
Confidence: low
Ambiguity note: Reading 1: remove the branch; server failures are reported by the server's per-account status. Reading 2: replace the branch with "if server unreachable, try Spark" for 30 days. Reading 3: keep the branch retargeted ("server unreachable: run Part A only" / paste text). D6 is a leaning, not decided.

Rule ID: X-07
Statement: Partial reachability: the server reports per-host failures and never hides one host's results because of the other, but the skills only know an all-or-nothing "unreachable" case.
Source: 01-design-v0.2.md L54: "A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached." vs skill-email-crap-filter.md L21-L22: "If they are absent or the computer is unreachable, run Part A only" and L257: "Spark unreachable: run Part A, report Parts C and B as not run (notify)."
Type: structural gate
Confidence: low
Ambiguity note: Reading 1: if cPanel B is down, the skill still runs Part C and the reasinger.net slice of Part B and reports the two YCD accounts as not checked (requires skill change). Reading 2: any host failure is treated as "unreachable" and Parts C and B are skipped entirely, discarding the reachable host's results, which violates the spirit of L54.

Rule ID: X-08
Statement: Draft ID after edit: the design's edit returns a new ID (append plus delete), while get-in-the-room hands Scott one draft ID per recipient and later edits or deletes "<draft ID>".
Source: 01-design-v0.2.md L150: "Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID." vs skill-get-in-the-room.md L217: "Give Scott the Spark draft ID per recipient" and L360: "`edit: <draft ID>` ... `delete: <draft ID>`".
Type: definition
Confidence: low
Ambiguity note: Reading 1: the skill must replace its stored draft ID with the returned one after each edit, and Scott's earlier ID becomes stale. Reading 2: the server keeps the old ID resolvable (for example by Message-ID fallback, if the new version keeps the same Message-ID) so the ID handed to Scott stays valid. The design does not say whether the edited draft keeps the original Message-ID.

Rule ID: X-09
Statement: Free-text search semantics: the skills expect a multi-word `search` query to return a broad set that includes normal mail; the design maps bare words to IMAP `TEXT`.
Source: skill-email-crap-filter.md L36-L38: "`query: \"delivery failed undeliverable address not found\"` ... Keep only real delivery-failure notices (ignore normal mail the search also returns)." vs 01-design-v0.2.md L141: "| bare words | `TEXT` |" and L119: "Free-text query within one or all accounts".
Type: calculation
Confidence: low
Ambiguity note: Reading 1: each bare word becomes a separate `TEXT` criterion ANDed (IMAP default), giving a narrow result that likely misses bounces that lack one of the six words. Reading 2: words are ORed, matching the skill's expectation of a broad net. Reading 3: the query is one `TEXT` phrase. Also unclear whether the bare-word rule from the filter grammar governs the `query` parameter at all, or only bare words inside `filter`.

Rule ID: X-10
Statement: Draft flags on APPEND: the design says APPEND with `\Draft`; the spike's verified APPEND used `\Draft \Seen`.
Source: 01-design-v0.2.md L147: "New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag." vs 02-spike-results.md L44: "| APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+ | PASS (APPENDUID 1793547457 1) |"
Type: definition
Confidence: low
Ambiguity note: Reading 1: `\Draft` only, per design. Reading 2: `\Draft \Seen`, the combination actually verified to display and send correctly in Spark. Without `\Seen`, a draft may show as unread in some clients; untested.

Rule ID: X-11
Statement: Spike gate status: the design marks the spike COMPLETE with criteria 3, 4 and 5 (pin) passed, but criterion 3 requires desktop and laptop and the laptop was not checked, criterion 5's archive half was not exercised, criterion 1 requires both hosts and MOVE, and the spike's closing results table is blank.
Source: 01-design-v0.2.md L183: "Status: COMPLETE (2026-11-01). ... Criteria 1 and 2 passed on cPanel A; cPanel B and archive move are deferred to integration tests. Criteria 3, 4, 5 (pin) passed." vs L174: "Laptop not yet checked." and L189: "appears in Spark (desktop and laptop) within one sync cycle" and L187: "MOVE against both hosts". 02-spike-results.md L72: "Archive move not yet exercised." and L88-L94 (blank table).
Type: structural gate
Confidence: low
Ambiguity note: Reading 1: the feasibility gate is passed and remaining checks (laptop, cPanel B, MOVE/archive) move to integration tests and acceptance. Reading 2: the gate is not passed and those checks block proceeding to build. The "within one sync cycle" timing in criterion 3 is never reported as measured.

Rule ID: X-12
Statement: Signatures for the two yourcigardenindy.com accounts: the skill says every account appends its own signature, but no source gives those signature texts, and the gatekeeper check requires reasinger.net in every email signature.
Source: skill-get-in-the-room.md L357: "Every account appends its own signature." 01-design-v0.2.md L97: "signature: <exact per-account signature text, appended by the server, see D1>". skill-gatekeeper-panel.md L205: "if \"reasinger.net\" not in sig.lower() or \"linkedin.com/in/\" not in sig.lower():"
Type: definition
Confidence: low
Ambiguity note: Reading 1: each YCD account has its own Spark signature that must be copied into server config (texts unknown). Reading 2: YCD accounts have no signature and the server appends nothing for them. The gatekeeper rule would fail any YCD signature without reasinger.net and a LinkedIn URL, which suggests either the panel only runs on reasinger.net drafts or YCD signatures would include them.
