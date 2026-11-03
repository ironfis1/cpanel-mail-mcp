# cpanel-mail-mcp: Build specification

Status: v1.2 LOCKED (2026-11-03). Changes require a new resolution and a version bump. v1.1 applied worked-example defect D-1 (REQ-18-10). v1.2 adds section 19 from build question Q2. Written from docs/rule-base.md (95 entries) and docs/ambiguity-log.md (110 resolved entries), plus the 12 spec-writing gaps Scott resolved (section 17).

## 0. How to read this spec

- Every requirement has an ID of the form REQ-<section>-<n>. Tests reference these IDs.
- Every requirement ends with one or more citation tags. `[RB-XX-n]` cites a rule-base entry. `[Resolution #n]` cites the Resolution field of ambiguity-log entry n.
- Where a Resolution overrides or refines a rule-base entry, the Resolution wins and the tag reads, for example, `[RB-FU-6, overridden by Resolution #32]` or `[RB-SG-1, refined by Resolution #2]`.
- "The server" means the cpanel-mail-mcp Cloudflare Worker. "The skills" means email-crap-filter, get-in-the-room and gatekeeper-panel.
- Section 17 lists gaps found while writing this spec, each now resolved by Scott. Section 18 turns those resolutions into requirements tagged `[Gap Gn]`. A tag `[Build question Qn]` cites a question raised during the build and resolved by Scott in docs/build/spec-questions.md. A tag `[Worked example D-n]` cites a defect found and fixed in docs/worked-examples.md.

## 1. Scope and non-goals

### 1.1 Purpose

- **REQ-1-1** The server is a cloud-hosted remote MCP server that gives the skills their mailbox operations directly against the cPanel IMAP servers, so that no scheduled or interactive email task requires sarhomepc. This is a definition; the tested gate is the power-off success test (REQ-15-4). [Resolution #81] [Resolution #110]
- **REQ-1-2** The server is the automation path only; Spark remains Scott's mail client and human interface. [RB-SP-2]
- **REQ-1-3** The server covers the calls the skills make today: email-crap-filter uses `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin` and `action archive`; get-in-the-room uses `draft` new, `reply_to`, `reply_all`, `forward`, `edit`, `delete`, `emails` on Inbox and Sent with filters, and `search`; gatekeeper-panel calls none directly. [RB-TP-1]
- **REQ-1-4** Drop-in compatibility covers the tools and parameters the skills call, with shapes matching Spark's schema for those tools. Behavior that differs from Spark (signature, send, sent lookup, edit ID) is documented and the skill text is updated at cutover. [RB-TP-2, refined by Resolution #58]
- **REQ-1-5** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector, so migrating a skill is a tool-prefix swap plus removing the "Spark unreachable" branch, not a rewrite. [RB-TP-2] [Resolution #32]
- **REQ-1-6** All server writes are plain IMAP state (flags, folder moves, Drafts appends), so Spark on any device reflects them without sync tricks. [RB-TP-3]

### 1.2 Non-goals (v1)

- **REQ-1-7** The server shall not send mail in v1 and shall have no SMTP; Scott sends from Spark. [RB-SP-1]
- **REQ-1-8** There is no send in v1 through any path, including no send through a Spark fallback. [Resolution #11]
- **REQ-1-9** The server shall not implement the Spark-only features comments, team sharing, templates, contacts, calendar events, meetings or calendar availability. The excluded "availability" is Spark's calendar availability, not the server's `availability` health tool (REQ-6-4). [RB-OT-4, refined by Resolution #37]
- **REQ-1-10** sreasinger@gmail.com is out of scope; it stays on the Gmail connector and the server does not serve it. [RB-AH-7]
- **REQ-1-11** The server shall not permanently delete messages; draft delete is the only delete in scope. [RB-DR-9]
- **REQ-1-12** The server serves exactly one principal, Scott; multi-user is out of scope. [RB-AS-4]

## 2. Accounts, hosts and secrets

### 2.1 Mailboxes and hosts

- **REQ-2-1** The server serves three mailboxes on two hosts with three logins: scott@reasinger.net on cPanel A (server128.web-hosting.com); scott@yourcigardenindy.com and founders@yourcigardenindy.com on cPanel B. [RB-AH-1]
- **REQ-2-2** The cPanel A IMAP host shall be configured as server128.web-hosting.com on port 993, not reasinger.net, because reasinger.net is the web host record and the TLS certificate is for the server name. [RB-AH-2]
- **REQ-2-3** The cPanel B IMAP host is unconfirmed. Before configuration, Scott reads the server hostname from cPanel B's address bar (the server name, not yourcigardenindy.com) and confirms the TLS certificate matches it; the result is a one-line config change. [RB-AH-3, refined by Resolution #64]
- **REQ-2-4** cPanel B protocol operations, folder names and SPECIAL-USE flags are not yet recorded and shall be captured by running the integration suite against a cPanel B test mailbox (REQ-14-4). [RB-AH-8, refined by Resolution #65]
- **REQ-2-5** A test mailbox, mcptest@reasinger.net on cPanel A, exists for integration tests. [RB-AH-4]
- **REQ-2-6** Since 2026-10-26 the three business mailboxes are read directly, not through Gmail; the cPanel forwarders to Gmail are retired. [RB-AH-9]
- **REQ-2-7** Draft operations (new, reply, reply-all, forward, edit, delete) are supported on all three accounts in v1, including scott@yourcigardenindy.com and founders@yourcigardenindy.com. [Resolution #57] [Resolution #4]

### 2.2 Account registry

- **REQ-2-8** The account registry is static config with one entry per mailbox containing: `id` (the address), `host`, `port` 993, `secret_ref` (name of the platform secret holding the password), `signature` (exact per-account text appended by the server) and `folders`. [RB-AH-5]
- **REQ-2-9** Folder mappings are discovered per request only: LIST runs at each session open and there is no persisted folder cache. [RB-AH-5, overridden by Resolution #62]
- **REQ-2-10** Folder overrides live in static config and replace the discovered mapping for that logical name. [RB-AH-5, refined by Resolution #62]
- **REQ-2-11** The account-to-purpose map for drafts is: job search (outreach, cover notes, recruiters, networking, follow-ups) in scott@reasinger.net; Your Cigar Den Indy, Scott personally, in scott@yourcigardenindy.com; founder-member outreach and replies in founders@yourcigardenindy.com; sreasinger@gmail.com is never used for outreach. [RB-AH-6]
- **REQ-2-12** Gmail is not a configured account in the registry. [Resolution #9]

### 2.3 Secrets

- **REQ-2-13** The platform secret names are IMAP_PASS_REASINGER_SCOTT (scott@reasinger.net), IMAP_PASS_YCD_SCOTT (scott@yourcigardenindy.com) and IMAP_PASS_YCD_FOUNDERS (founders@yourcigardenindy.com). [RB-AH-5] [Resolution #77]
- **REQ-2-14** Credentials live only in platform secrets, never in code or logs. [RB-AS-6]
- **REQ-2-15** Each mailbox has a unique password. [RB-AS-7]
- **REQ-2-16** A mailbox password change means one secret update, and this procedure is documented in the README. [Resolution #92]

### 2.4 Hosting

- **REQ-2-17** The server is hosted on Cloudflare Workers in a dedicated Cloudflare account owned by scott@reasinger.net with 2FA (see REQ-18-13), isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts. [RB-OT-2]
- **REQ-2-18** Workers is the only hosting platform (no "Primary" qualifier and no fallback platform). Scott confirms whether the spike's Cloudflare account (scott@reasinger.net, reasinger-ops) is the dedicated account with 2FA (see REQ-18-13); if yes it is production, if not a new account is created. [RB-OT-2, refined by Resolution #73]
- **REQ-2-19** The Worker comprises an OAuth provider (workers-oauth-provider, single allowed principal), a Spark-compatible tool layer, a Gmail-style to IMAP SEARCH filter translator, a stable-ID codec, an account registry (3 accounts, 2 hosts, folder maps) and a minimal IMAP client on cloudflare:sockets over TLS 993. [RB-OT-1]
- **REQ-2-20** Bundle size is not a constraint (4.6 KB gzip). The Workers Paid plan (USD 5 per month) is recommended because the free plan's 10 ms CPU limit per request is tight for MIME parsing and markdown rendering. [Resolution #78]

## 3. Auth and security

- **REQ-3-1** Claude clients reach the server over MCP via HTTPS using streamable HTTP with an OAuth bearer token. [RB-AS-8]
- **REQ-3-2** MCP clients authenticate with OAuth 2.1 via workers-oauth-provider. [RB-AS-1]
- **REQ-3-3** The upstream identity provider is GitHub OAuth (decision D3). [Resolution #72] [Resolution #82]
- **REQ-3-4** The upstream identity check allows exactly one principal, the GitHub login ironfis1; any other identity is refused at authorize time. [RB-AS-2, refined by Resolution #72]
- **REQ-3-5** Access tokens have a lifetime of 1 hour. [Resolution #72]
- **REQ-3-6** Refresh tokens have a lifetime of 90 days and are rotated on each use, so any use within 90 days keeps the grant alive without re-auth. [Resolution #72]
- **REQ-3-7** A grant is revoked by deleting it. [Resolution #72]
- **REQ-3-8** There is no authless mode and no shared-secret URL. [RB-AS-3]
- **REQ-3-9** Least privilege: the server may read, flag, move and write to Drafts only; nothing that sends and nothing that permanently deletes received mail. [RB-AS-5]
- **REQ-3-10** Message bodies are never logged. [RB-AS-6]
- **REQ-3-11** The R4 credential-compromise mitigation is the combination of: the dedicated Cloudflare account with 2FA (see REQ-18-13), unique mailbox passwords, single-principal OAuth and no send capability. [RB-AS-7]

## 4. Connection and IMAP client

### 4.1 Client

- **REQ-4-1** The server uses a minimal IMAP client written on cloudflare:sockets, not imapflow, implementing only the commands the design needs. [RB-CI-1]
- **REQ-4-2** IMAP login uses AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping. [RB-CI-2]
- **REQ-4-3** The client supports at minimum login (AUTHENTICATE PLAIN with SASL-IR), LIST, SELECT, SEARCH, FETCH, APPEND and STORE of flags. [RB-CI-8]
- **REQ-4-4** The client also supports CAPABILITY, FETCH BODYSTRUCTURE and partial BODY.PEEK fetches. [RB-CI-8, refined by Resolution #68]
- **REQ-4-5** To move a message the client uses MOVE when the host advertises it; otherwise it uses UID COPY plus STORE `\Deleted` plus UID EXPUNGE, which requires UIDPLUS. [RB-CI-8, refined by Resolution #68]
- **REQ-4-6** The client handles LITERAL+ both on and off, and literal mailbox names. [Resolution #69] [Resolution #93]

### 4.2 Timeouts

- **REQ-4-7** Every network step has an explicit timeout; no step may hang the request. [RB-CI-3, refined by Resolution #59]
- **REQ-4-8** Timeout values: TCP plus TLS 10 s; greeting 5 s; login 10 s; each command 15 s; APPEND 30 s. [RB-CI-3, refined by Resolution #59]
- **REQ-4-9** A timeout fails that account loudly, never the whole call. [Resolution #59]

### 4.3 Sessions and concurrency

- **REQ-4-10** One IMAP session per account per request, opened lazily and closed at request end; no persistent connections and no pooling. [RB-CI-4]
- **REQ-4-11** Operations run in parallel across hosts and sequentially within a host; the two cPanel B accounts run one after the other. [RB-CI-5, overridden by Resolution #60]

### 4.4 Authentication failures and cPHulk

- **REQ-4-12** On any IMAP authentication failure the account is disabled for the rest of the request, the error tells the caller to check the secret, and there is no retry on auth errors. [RB-CI-6]
- **REQ-4-13** Egress IP whitelisting is not available on Workers, so a cPHulk block is cleared by a manual cPanel unblock. [RB-CI-7, refined by Resolution #74]

## 5. Folder resolution

- **REQ-5-1** Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where advertised. [RB-FO-3]
- **REQ-5-2** SPECIAL-USE always wins over a name match. [RB-FO-4]
- **REQ-5-3** Name matching is used only when no folder carries the SPECIAL-USE flag for that role, and is a case-insensitive match on the last path segment against: Sent: "Sent", "Sent Items", "Sent Messages"; Drafts: "Drafts"; Archive: "Archive"; Trash: "Trash", "Deleted Items"; Junk: "Junk", "Spam". [RB-FO-3, refined by Resolution #63]
- **REQ-5-4** A name-match fallback succeeds only on exactly one match; zero or several matches is an error that asks for a config override. [Resolution #63]
- **REQ-5-5** cPanel A folders use the `INBOX.` prefix with `.` as delimiter and advertise SPECIAL-USE. [RB-FO-1]
- **REQ-5-6** The cPanel A folder map is: Inbox = INBOX; Sent = INBOX.Sent (`\Sent`); Drafts = INBOX.Drafts (`\Drafts`); Archive = INBOX.Archive (`\Archive`); Trash = INBOX.Trash (`\Trash`); Junk = INBOX.spam (`\Junk`). INBOX.Junk carries no flag and no logical name. [RB-FO-2] [RB-FO-4]
- **REQ-5-7** Folders are addressed as `<account>:<LogicalName>`, with logical names Inbox, Sent, Drafts and Archive mapped to real folder names per account. [RB-FO-5]
- **REQ-5-8** Trash and Junk are also addressable logical names for reading in `emails` and `search`. [RB-FO-5, refined by Resolution #61] [Resolution #40]
- **REQ-5-9** The server uses the existing Archive folder and never auto-creates one; a missing Archive is an error (decision D5, decided). [RB-FO-6, refined by Resolution #41]
- **REQ-5-10** cPanel A has INBOX.Archive with `\Archive`; the cPanel B Archive is verified by the integration suite on the cPanel B test mailbox. [RB-FO-6, refined by Resolution #65]

## 6. Tool surface

General requirements for every tool:

- **REQ-6-1** Fail loudly, per host: a failure on one cPanel host never silently hides results from the other, and every response states which accounts were reached. [RB-FU-1]
- **REQ-6-2** Every returned message object carries an `account` field identifying its mailbox, so the combined triage report can tag each item ([reasinger.net], [YCDI], [founders], [gmail]). [RB-TP-13, refined by Resolution #28]
- **REQ-6-3** Where `account` is optional (reply, forward, edit, delete), the account is taken from the message ID; if `account` is given and differs from the ID's account, the call is an error and nothing is created. [Resolution #54]

### 6.1 accounts

- **REQ-6-4** `accounts` lists the configured accounts from static config only; it performs no IMAP login. [RB-TP-4, overridden by Resolution #38]
- **REQ-6-5** `availability` is the only tool that performs a live reachability check. [RB-TP-4, overridden by Resolution #38]

### 6.2 availability

- **REQ-6-6** The server keeps a tool named `availability` as its health check. [RB-TP-5, refined by Resolution #37]
- **REQ-6-7** `availability` checks each of the three accounts: TCP, TLS, login and SELECT INBOX per account, with results grouped by host. [RB-TP-5, overridden by Resolution #36]
- **REQ-6-8** `availability` is used as a preflight by scheduled skills (REQ-12-6). [RB-TP-5] [Resolution #35]

### 6.3 folders

- **REQ-6-9** `folders` lists folders per account with the logical-name mapping. [RB-TP-6]

### 6.4 emails

- **REQ-6-10** `emails` lists messages in `<account>:<Folder>` and accepts `folder`, `filter`, `page_size`, `page` and `order`. [RB-TP-7, refined by Resolution #27]
- **REQ-6-11** Paging uses `page` (a 1-based page number), not a cursor. [RB-TP-7, overridden by Resolution #27]
- **REQ-6-12** `page_size` defaults to 50; the maximum is 100, and a `page_size` of 100 is honored in one page. [Resolution #27]
- **REQ-6-13** `order` defaults to descending by date. [Resolution #27]
- **REQ-6-14** Every `emails` response states whether more pages exist. [Resolution #27]
- **REQ-6-15** `emails` has no default lookback: without a date token it pages the whole folder newest first. [Resolution #49]
- **REQ-6-16** Per message, `emails` returns: ID, account, from, to, subject, date, snippet and flags. [RB-TP-7] [Resolution #28]
- **REQ-6-17** The returned flags include `\Flagged` (pinned), so callers can skip pinned messages. [Resolution #96]
- **REQ-6-18** The returned flags include `\Answered`, which callers use as the "already replied" signal. [Resolution #29]
- **REQ-6-19** The snippet is the first 200 characters of the decoded text/plain part (HTML stripped when there is no text part), with whitespace collapsed, taken from a partial BODY.PEEK fetch. [Resolution #25]
- **REQ-6-20** For a multipart/report message the snippet starts with the delivery-status Final-Recipient and Diagnostic-Code. [Resolution #25]

### 6.5 search

- **REQ-6-21** `search` runs a free-text `query` within one account or all accounts, plus an optional `filter`. [RB-TP-8]
- **REQ-6-22** `in` accepts an account address or `<account>:<Folder>`; when `in` is omitted, all accounts are searched. [RB-TP-8, refined by Resolution #47] [Resolution #48]
- **REQ-6-23** Within each scoped account, `search` covers all folders except Trash and Junk. [RB-TP-8, refined by Resolution #47]
- **REQ-6-24** `query` words are combined as ORed IMAP TEXT terms. [RB-TP-8, refined by Resolution #23] [RB-FS-3, refined by Resolution #23]
- **REQ-6-25** `filter` tokens in a `search` call stay ANDed with each other. [Resolution #23] [Resolution #44]
- **REQ-6-26** `search` results are ordered newest first and capped at 20. [Resolution #23]

### 6.6 thread

- **REQ-6-27** `thread` returns a message and its thread, with bodies as text. [RB-TP-9]
- **REQ-6-28** Thread reconstruction spans the Inbox, Sent and Archive folders of the same account. [RB-TP-9, refined by Resolution #17]
- **REQ-6-29** Thread membership is linked by References, then In-Reply-To. [RB-TP-9, refined by Resolution #17]
- **REQ-6-30** The subject fallback applies only to messages with no header link, and joins a message when it has the same normalized subject (repeatedly strip Re:, Fwd:, Fw:, case-insensitive) and a shared participant within 60 days. [RB-TP-9, refined by Resolution #17]
- **REQ-6-31** Thread messages are ordered by date. [Resolution #17]
- **REQ-6-32** Thread bodies include the text of message/delivery-status parts and the From, To, Subject and Date headers of an embedded message/rfc822 original, but not that original's body. [RB-TP-9, refined by Resolution #26]

### 6.7 action

- **REQ-6-33** `action` takes `action_name` plus a `message_ids` array. [RB-FA-1, refined by Resolution #39]
- **REQ-6-34** Supported `action_name` values: `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to the account's Archive) and `move` (to a named folder). There is no send and no permanent delete. [RB-FA-1]
- **REQ-6-35** One `action` call may mix accounts and hosts; the server groups IDs per account internally. [Resolution #39]
- **REQ-6-36** The `action` result is per ID; a host failure fails only that host's IDs, and names them. [Resolution #39] [Resolution #100]
- **REQ-6-37** Actions apply per message, not per thread. [Resolution #50]
- **REQ-6-38** `move` and `archive` refuse Trash, Junk and Drafts as targets in v1. [RB-FA-1, refined by Resolution #40] [RB-FA-2, refined by Resolution #40]

### 6.8 draft

- **REQ-6-39** `draft` supports create new, `reply_to`, `reply_all`, `forward`, `edit` and `delete` (draft only), and writes by appending to the account's Drafts folder. [RB-TP-10]
- **REQ-6-40** Detailed draft behavior is in section 9 and signature behavior in section 10. [RB-TP-10]

## 7. Filters and search

- **REQ-7-1** The filter translator converts Gmail-style filter tokens into IMAP SEARCH. [RB-OT-1] [Resolution #84]
- **REQ-7-2** Multiple filter tokens combine with AND. [Resolution #44]
- **REQ-7-3** There is no OR, no negation and no quoting in v1. Any of these, and any token outside the supported token table, is an error that names the token. [Resolution #44]
- **REQ-7-4** Unknown filter tokens are an error and are never silently dropped. [RB-FS-1]
- **REQ-7-5** Filter date math uses the America/Indianapolis time zone. [RB-FS-2]
- **REQ-7-6** `newer_than:Nd` translates to date-granular IMAP SINCE (the date N days before today in America/Indianapolis); the only supported unit is `d`. [Resolution #45]
- **REQ-7-7** The over-inclusion of up to one day caused by date-granular SINCE is accepted and documented; it never drops mail. [Resolution #45]
- **REQ-7-8** `from:` translates to IMAP FROM: a case-insensitive substring match over the whole From header, display name included. [Resolution #46]
- **REQ-7-9** Bare words translate to IMAP TEXT. [RB-FS-3]
- **REQ-7-10** The filter strings the skills pass, and which form the translator's test list, are: "from:mailer-daemon newer_than:3d", "from:postmaster newer_than:3d", "newer_than:3d", "newer_than:7d" and "to:<address>". [Resolution #79]
- **REQ-7-11** The filter string "to:<address> newer_than:2d" is also passed (send confirmation, REQ-9-30), as is "from:<contact>" (reply detection, REQ-16-24). [Resolution #21] [Resolution #31]

## 8. Message IDs

- **REQ-8-1** The server issues its own opaque message ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID. [Resolution #83]
- **REQ-8-2** IDs are stable across calls and across sessions. [Resolution #83]
- **REQ-8-3** ID lookup uses the UID when the encoded UIDVALIDITY matches and the UID still exists. [RB-MI-1, refined by Resolution #43]
- **REQ-8-4** The Message-ID fallback runs when UIDVALIDITY differs or the UID is gone (for example after archive). [RB-MI-1, refined by Resolution #43]
- **REQ-8-5** The fallback searches for the Message-ID in this order: the encoded folder, then Archive, Inbox, Sent, Drafts. [Resolution #43]
- **REQ-8-6** No match is a not-found error; more than one match in the same folder is an ambiguity error; the server never guesses. [Resolution #43]
- **REQ-8-7** The draft ID handed to Scott is the server ID plus account, recipient and subject (what he sees in Spark). [RB-MI-2, refined by Resolution #18]
- **REQ-8-8** The server ID is for later server edit or delete only; it is not valid in the Spark connector. [Resolution #18]
- **REQ-8-9** get-in-the-room never calls an email "ready" unless the draft exists. [RB-MI-2]

## 9. Drafts, replies, forwards, edit, delete

### 9.1 Common

- **REQ-9-1** A new draft is built as an RFC 5322 message and APPENDed to the account's Drafts folder with flags `\Draft \Seen`, so new drafts never show unread. [Resolution #12] [Resolution #85]
- **REQ-9-2** Draft body input is markdown; the server renders a multipart message with text and HTML parts. [RB-DR-4]
- **REQ-9-3** `to`, `cc` and `bcc` are arrays of addresses. [RB-DR-5, refined by Resolution #53]
- **REQ-9-4** The server refuses to create a draft on an account whose signature is unset. [Resolution #4]
- **REQ-9-5** The `draft` response echoes the composed text body including the signature. [Resolution #7]
- **REQ-9-6** Outreach delivery is a draft in the business mail system, never a Gmail draft. [RB-SP-3]

### 9.2 New

- **REQ-9-7** A new draft is created with `account`, `to`, `subject` and `body`, where `body` is markdown with no signature and no sign-off; `cc` and `bcc` are also accepted. [RB-DR-5, refined by Resolution #53]

### 9.3 Reply and reply-all

- **REQ-9-8** A reply uses `reply_to: <message ID>`; a reply to everyone uses `reply_all: <message ID>` as its own key. [RB-DR-6, refined by Resolution #55]
- **REQ-9-9** `reply_to` and `reply_all` are mutually exclusive. [Resolution #55]
- **REQ-9-10** `account` is optional on a reply (REQ-6-3). [RB-DR-6, overridden by Resolution #54]
- **REQ-9-11** A reply or reply-all draft sets In-Reply-To and References from the original and places the quoted original below the body. [RB-DR-1]
- **REQ-9-12** `reply_to` addresses the original's Reply-To if present, else its From. [RB-DR-1, refined by Resolution #13]
- **REQ-9-13** When replying to a message from Scott's own account (for example a message in Sent), the reply goes to that message's To. [RB-DR-1, refined by Resolution #13]
- **REQ-9-14** `reply_all` puts the sender plus the other To recipients in To and the original Cc in Cc, minus the account's own address. [RB-DR-1, refined by Resolution #13]
- **REQ-9-15** Supplied `to` or `cc` override the derived recipients on a reply or reply-all. [Resolution #13]
- **REQ-9-16** The reply subject adds `Re:` only if the decoded subject does not already start with Re: (case-insensitive). [RB-DR-1, refined by Resolution #13]
- **REQ-9-17** Reply drafts do not accept a subject override. [Resolution #16]

### 9.4 Forward

- **REQ-9-18** A forward draft uses a `Fwd:` subject and includes the original as an inline quote, not as an .eml attachment (decision D4). [RB-DR-2, overridden by Resolution #14]
- **REQ-9-19** `to` is required on a forward; a forward without `to` is an error. [RB-DR-2, refined by Resolution #15] [RB-DR-7, refined by Resolution #15]
- **REQ-9-20** A forward sets In-Reply-To and References from the original, so the touch-7 forward threads with touch 1. [Resolution #15]
- **REQ-9-21** Sent-folder message IDs are valid forward targets: the touch-7 forward is a draft with `forward: <ID of Scott's sent touch 1>`, account scott@reasinger.net, body "Not sure if you saw this.", with the original found by `emails` on scott@reasinger.net:Sent with filter "to:<address>". [RB-DR-7] [Resolution #49]

### 9.5 Edit

- **REQ-9-22** Edit replaces a draft by appending the new version and then deleting the old draft UID, and returns the new ID. [Resolution #86] [Resolution #56]
- **REQ-9-23** Edit never deletes first. If the delete of the old draft fails, the response returns the new ID plus a loud warning naming the leftover old draft ID. [Resolution #56]
- **REQ-9-24** Edit keeps the draft's Message-ID, so a pre-edit ID still resolves through the Message-ID fallback in Drafts. [Resolution #19]
- **REQ-9-25** Edit uses patch semantics: omitted fields are kept; supplied `to`, `cc` or `bcc` replace that list; supplied `body` replaces the body whole and is re-signed; threading headers are always preserved. [Resolution #20]

### 9.6 Delete

- **REQ-9-26** Delete is draft-only: the server refuses any target that lacks `\Draft` or is not in the Drafts folder. [RB-DR-3]
- **REQ-9-27** Delete is called as `delete: <draft ID>` alone and is permanent; the account comes from the ID. [RB-DR-8, refined by Resolution #52]
- **REQ-9-28** Delete performs STORE `\Deleted` then UID EXPUNGE on that UID only; if the host lacks UIDPLUS the server refuses rather than issuing a plain EXPUNGE. [RB-DR-8, refined by Resolution #52]

### 9.7 After send (Spark behavior and send confirmation)

- **REQ-9-29** When Scott sends a server-created draft from Spark, Spark re-composes it (new @Spark Message-ID, multipart text and HTML), keeps In-Reply-To and References, and decodes the RFC 2047 subject. [RB-SP-4]
- **REQ-9-30** No new tool exists for send confirmation. After Scott says a message was sent, the skill calls `emails` on `<drafting account>:Sent` with filter `to:<address> newer_than:2d`, matches on recipient plus normalized subject, and takes the Touches Date from the Sent copy, before logging. [RB-SP-5, overridden by Resolution #21] [Resolution #22] [Resolution #88]
- **REQ-9-31** New-sender deliverability (first mcptest send landed in Gmail spam despite SPF, DKIM and DMARC passing) is not a server issue because Spark sends; note only. [RB-SP-6]

## 10. Signatures

- **REQ-10-1** The server appends the account's configured signature to every draft it creates or edits (decision D1); skills keep sending signature-free bodies. [RB-SG-1, refined by Resolution #2]
- **REQ-10-2** The server, not Spark, appends the signature; Spark does not sign drafts it did not create. [RB-SG-2, overridden by Resolution #1]
- **REQ-10-3** Signature texts are exactly: scott@reasinger.net = "Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger"; scott@yourcigardenindy.com = "Scott Reasinger | scott@yourcigardenindy.com | 317-460-0736 | yourcigardenindy.com"; founders@yourcigardenindy.com = "Founders | founders@yourcigardenindy.com | yourcigardenindy.com". [RB-SG-3, refined by Resolution #4]
- **REQ-10-4** Server config is the source of truth for the signature on every automated draft; Spark settings apply only to mail Scott composes by hand. [RB-SG-3, refined by Resolution #5]
- **REQ-10-5** The README states that a signature change updates the server config, Spark settings and the two skill lines together. [Resolution #5]
- **REQ-10-6** Before signing, the server strips a trailing copy of the account's exact signature (whitespace-normalized) from the body, then appends the signature once. [RB-SG-1, refined by Resolution #3]
- **REQ-10-7** An edit with no new body re-derives the body from the stored draft minus its signature before re-signing. [Resolution #3]
- **REQ-10-8** In replies and forwards the signature goes directly under Scott's new text, above the quoted original. [RB-SG-1, refined by Resolution #8]
- **REQ-10-9** The signature bypasses markdown rendering. In the text part it is the exact configured string. In the HTML part it is the same string HTML-escaped in its own block, with any URL rendered as a link whose visible text is identical to the configured string. [RB-SG-4, refined by Resolution #7]
- **REQ-10-10** "The draft body carries no signature" refers to the body the skill sends to the server, not the stored draft; the stored draft carries the server signature. [RB-SG-4, refined by Resolution #6]
- **REQ-10-11** No configured signature may contain sreasinger@gmail.com. [Resolution #9]
- **REQ-10-12** gatekeeper-panel stays job-search only, so its signature check applies to scott@reasinger.net drafts only. [Resolution #4] [RB-AH-6]

## 11. Header decoding and threading

- **REQ-11-1** The server decodes all returned header text (subjects and address display names arrive RFC 2047 encoded) before returning it. [RB-TP-11]
- **REQ-11-2** The server builds `Re:` and `Fwd:` subjects from the decoded subject. [RB-TP-11] [Resolution #87]
- **REQ-11-3** On write, the server re-encodes a non-ASCII subject; this is a tested gate. [Resolution #87]
- **REQ-11-4** Threading of drafts is by In-Reply-To and References as set in REQ-9-11 and REQ-9-20; thread reconstruction is per REQ-6-28 to REQ-6-32. [RB-DR-1] [RB-TP-9] [Resolution #15] [Resolution #17]

## 12. Failure handling

- **REQ-12-1** A failure on one host never silently hides results from the other, and every response states which accounts were reached. [RB-FU-1]
- **REQ-12-2** A per-account timeout or failure fails only that account, never the whole call. [Resolution #59] [Resolution #39]
- **REQ-12-3** On auth failure: disable the account for the request, tell the caller to check the secret, never retry. [RB-CI-6]
- **REQ-12-4** There is no automatic Spark fallback (decision D6). Spark stays installed for manual use and manual revert only. [RB-FU-6, overridden by Resolution #32]
- **REQ-12-5** email-crap-filter treats mail access as unavailable when the server tools are absent or every account failed. In that case it runs Part A only, reports Parts C and B as not run, makes the first report line "Business inboxes and bounces NOT checked: mail server unreachable (<accounts>)", and never treats the run as clean. [RB-FU-2, overridden by Resolution #33]
- **REQ-12-6** Scheduled skills call `availability` first, push-notify on any account failure, and continue with the reachable accounts. [RB-FU-4, refined by Resolution #35]
- **REQ-12-7** On partial reachability the skill runs every reachable account; the report's first line names each unreached account and host; this counts as "a part failed" and triggers the notification. [RB-FU-2, refined by Resolution #34] [RB-FU-5, refined by Resolution #34]
- **REQ-12-8** A cPanel B outage never suppresses the scott@reasinger.net bounce sweep. [Resolution #34]
- **REQ-12-9** On scheduled runs, push-notify if and only if the run produced at least one bounce, Career, Review Now (including founder lead), Finance-Legal or Needs Human Decision item, or any part failed or mail access was unreachable; otherwise stay silent. [RB-FU-5]
- **REQ-12-10** When mail access is unavailable, get-in-the-room says so, writes the note into the build file, gives Scott the text to paste, and never falls back to a Gmail draft. [RB-FU-3, refined by Resolution #33]
- **REQ-12-11** Errors the server returns for a missing Archive (REQ-5-9), an ambiguous folder name match (REQ-5-4), unknown filter tokens (REQ-7-3), not-found or ambiguous IDs (REQ-8-6), account mismatch (REQ-6-3), a forward without `to` (REQ-9-19), an unset signature (REQ-9-4), a refused move target (REQ-6-38) and a refused delete (REQ-9-26, REQ-9-28) are explicit errors, never silent no-ops. [RB-FO-6] [RB-FS-1] [RB-DR-3] [Resolution #3] [Resolution #4] [Resolution #15] [Resolution #40] [Resolution #43] [Resolution #52] [Resolution #54] [Resolution #63]

## 13. Logging and operations

- **REQ-13-1** Logging fields and log exclusions are two separate rules: the logged fields are a definition and the exclusions are a tested gate. [Resolution #91]
- **REQ-13-2** Logs never contain message bodies or credentials. [RB-AS-6]
- **REQ-13-3** Logs never contain subjects, filter strings, query strings or raw server error text. [Resolution #75]
- **REQ-13-4** Logs record filter token names only (for example "from,newer_than") and an error class code. [Resolution #75]
- **REQ-13-5** Logs record the account ID (Scott's own address). [Resolution #75]
- **REQ-13-6** Secrets rotation is one secret update per mailbox password change, documented in the README. [Resolution #92]
- **REQ-13-7** A cPHulk block is cleared by hand in cPanel. [RB-CI-7] [Resolution #74]

## 14. Testing

- **REQ-14-1** The build has one test per requirement ID in this spec. [RB-TA-4]
- **REQ-14-2** Integration tests run against dedicated test mailboxes, never against live inboxes. [RB-TA-5, refined by Resolution #65]
- **REQ-14-3** The cPanel A test mailbox is mcptest@reasinger.net. [RB-AH-4] [RB-TA-5]
- **REQ-14-4** Scott creates a test mailbox on cPanel B (for example mcptest@yourcigardenindy.com); the same integration suite runs there, covering folders, SPECIAL-USE, Archive and MOVE. [RB-TA-5, refined by Resolution #65]
- **REQ-14-5** Integration tests record the IMAP capabilities of both hosts. [Resolution #68]
- **REQ-14-6** IMAP parser tests run against recorded real responses from the mcptest mailbox, covering response shapes the prototype did not see (large literals, unusual FETCH shapes). [RB-TA-2]
- **REQ-14-7** Required protocol tolerance tests: LITERAL+ on, LITERAL+ off, literal mailbox names, auth failure, and silent-server timeout. [Resolution #69] [Resolution #93]
- **REQ-14-8** The timeout behavior (REQ-4-8, REQ-4-9) is tested with the silent-server fake. [Resolution #59]
- **REQ-14-9** Test: resubmitting a signed body yields exactly one signature. [Resolution #3]
- **REQ-14-10** Unit test: the scott@reasinger.net signature config string equals the gatekeeper check-file signature line. [Resolution #5] [RB-SG-4]
- **REQ-14-11** Config test: fails if any configured signature contains sreasinger@gmail.com. [Resolution #9]
- **REQ-14-12** Test: edit a draft, then edit or delete it using the pre-edit ID; both succeed. [Resolution #19]
- **REQ-14-13** Integration test for `from:` with a "MAILER-DAEMON" display name and a postmaster@ address. [Resolution #46]
- **REQ-14-14** The filter translator test list is the set of strings in REQ-7-10. [Resolution #79]
- **REQ-14-15** Test: a re-encoded non-ASCII subject on write. [Resolution #87]
- **REQ-14-16** Integration test on mcptest: archive move, then a manual check that Spark desktop shows the message archived. [Resolution #42]
- **REQ-14-17** The log exclusions in REQ-13-2 to REQ-13-4 are tested. [Resolution #91]

## 15. Acceptance and cutover

### 15.1 Build gate

- **REQ-15-1** The spike gate is passed for build. The open checks (cPanel B, archive move, MOVE, laptop display) move to integration tests and acceptance. [Resolution #66]
- **REQ-15-2** Build sequence: rule extraction (docs/rule-base.md, docs/ambiguity-log.md); Scott resolves the ambiguity log; this spec (docs/spec.md) with every requirement cited; build to spec; deploy to the dedicated Cloudflare account and add as a claude.ai custom connector. [RB-OT-3]
- **REQ-15-3** Prerequisite actions for Scott before deploy: confirm the cPanel B host (REQ-2-3), create the cPanel B test mailbox (REQ-14-4), and confirm or create the dedicated Cloudflare account (REQ-2-18). [Resolution #64] [Resolution #65] [Resolution #73]

### 15.2 Acceptance

- **REQ-15-4** Success test (a structural gate, part of acceptance): with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature. [RB-TA-1] [Resolution #110]
- **REQ-15-5** Laptop display of IMAP-appended drafts is an acceptance gate, not a build gate. [Resolution #67] [Resolution #89]
- **REQ-15-6** Archive display in Spark (pin and archive) is a structural gate scoped to acceptance. [Resolution #94]
- **REQ-15-7** Thread comparison: the server's thread output is compared to Spark's thread view on 20 threads across the three accounts, at least 5 containing Scott's sent replies. Pass: the same message set in every thread; ordering differences are allowed. [RB-TA-3, refined by Resolution #71]
- **REQ-15-8** Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and the server; results must match (same messages found, same bounces, same pins applied) with differences explained. [RB-TA-6]
- **REQ-15-9** The parallel run uses shadow mode: days 1 to 5 Spark acts and the server path only reports what it would pin or archive; days 6 and 7 the server acts and Spark shadows. The sets are compared. [RB-TA-6, refined by Resolution #70]
- **REQ-15-10** The parallel run compares pins and archives per message. [Resolution #50]
- **REQ-15-11** The parallel run compares bounce sets. [Resolution #23]
- **REQ-15-12** Parallel-run differences caused by date-granular `newer_than` (REQ-7-7) are explained, not failures. [Resolution #45]
- **REQ-15-13** get-in-the-room acceptance: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient. [RB-TA-7]

### 15.3 Cutover

- **REQ-15-14** At cutover, skills switch tool prefix to this server. [RB-TA-9]
- **REQ-15-15** The Spark path does not become an automatic fallback after cutover; skills drop the Spark branch. [RB-TA-9, overridden by Resolution #32] [RB-FU-6, overridden by Resolution #32]

## 16. Skill changes at cutover

### 16.1 Tool loading and naming

- **REQ-16-1** The skills currently call mcp__remote-devices__Spark__* tools (emails, search, thread, action, draft) loaded with ToolSearch; at cutover they switch to this server's tool prefix. [RB-TP-12]
- **REQ-16-2** Skills say "load the cpanel-mail tools (ToolSearch if deferred)", and all "Spark" tool references are replaced. [RB-TP-12, refined by Resolution #76]
- **REQ-16-3** get-in-the-room L7 "sends" is reworded to "Scott sends from Spark". [Resolution #76]
- **REQ-16-4** The "Spark unreachable" branch is removed from the skills; the unreachable behavior is per REQ-12-5 and REQ-12-10. [Resolution #32] [Resolution #33]

### 16.2 Signature wording

- **REQ-16-5** Skill text saying "Spark appends" the signature is updated to say the server appends. [Resolution #1]
- **REQ-16-6** The design L46 and gatekeeper-panel L7 and L48 wording on "draft body carries no signature" is reworded per REQ-10-10. [Resolution #6]
- **REQ-16-7** gatekeeper-panel check.py also requires 317-460-0736 in the signature line (skill-side; no server behavior). [Resolution #10]

### 16.3 Send

- **REQ-16-8** The get-in-the-room exception allowing `action send` on Scott's request is removed; Claude tells Scott the draft is in Spark and he sends it. [Resolution #11]
- **REQ-16-9** get-in-the-room L362 send confirmation names the drafting account's Sent, not always scott@reasinger.net, per REQ-9-30. [RB-SP-5, overridden by Resolution #21]

### 16.4 email-crap-filter

- **REQ-16-10** email-crap-filter runs its passes in fixed order: Part C (bounce sweep) first, then Part B (business inboxes), then Part A (Gmail). [RB-BS-4]
- **REQ-16-11** Part C runs its bounce calls on all three Inboxes, not only scott@reasinger.net. [RB-BS-1, refined by Resolution #30] [RB-BS-2, refined by Resolution #30]
- **REQ-16-12** The canonical bounce check is three calls per Inbox: `emails` with filter "from:mailer-daemon newer_than:3d", `emails` with "from:postmaster newer_than:3d", and `search` with query "delivery failed undeliverable address not found", filter "newer_than:3d", keeping only real delivery-failure notices. [RB-BS-1] [RB-BS-2] [Resolution #24] [Resolution #30]
- **REQ-16-13** Bounce notices are not archived by the triage run; Scott or the send block clears them after logging. [RB-BS-3]
- **REQ-16-14** Part B fetch: for each of the three business accounts, call `emails` with folder `<account>:Inbox`, filter "newer_than:7d", page_size 100, and page until the response states no more pages exist. [RB-TP-14, refined by Resolution #27]
- **REQ-16-15** Part B keeps skipping bounces in all accounts. [Resolution #30]
- **REQ-16-16** Part B never deletes, moves to trash, unsubscribes, sends or unpins. [RB-FA-2]
- **REQ-16-17** The Part B replier check uses the Sent folder of the account that received the reply; skill L71 is updated. [Resolution #22]
- **REQ-16-18** Part B inherits from Part A: safety-term messages are never archived, classification is snippet-first, and read and unread messages are both in scope. Skill text is clarified; no server behavior. [Resolution #51]
- **REQ-16-19** The skill reports "replied" when `\Answered` is set on a message. [Resolution #29]
- **REQ-16-20** email-crap-filter gains the `availability` preflight step (REQ-12-6). [Resolution #35]
- **REQ-16-21** The unreachable first-line wording is per REQ-12-5 and REQ-12-7. [Resolution #33] [Resolution #34]

### 16.5 get-in-the-room

- **REQ-16-22** get-in-the-room's bounce line is rewritten to point to the canonical bounce check (REQ-16-12). [Resolution #24]
- **REQ-16-23** Touches 9 and 10 are new drafts with their own subjects. [Resolution #16]
- **REQ-16-24** Reply detection: email-crap-filter Part B is the detector (replies pin as Review Now). When working a company, get-in-the-room also checks `emails` on the account Inbox with `from:<contact>`. No new server behavior. [RB-OT-5, refined by Resolution #31]
- **REQ-16-25** Any reply turns the contact warm and is answered the same day. [RB-OT-5]
- **REQ-16-26** After an edit, the skill stores the new draft ID returned by the server. [Resolution #19]
- **REQ-16-27** get-in-the-room hands Scott the server draft ID plus account, recipient and subject per recipient (REQ-8-7). [RB-MI-2, refined by Resolution #18]

### 16.6 Skill-only context

- **REQ-16-28** Skill-only rules recorded by Pass 2 only (bounce code meanings and report wording; any bounce triggers the scheduled notification; IMAP accounts have no AI/ labels, so pin and archive stand in) stay out of the server spec and are recorded as skill-only context in the cutover checklist. [Resolution #80]
- **REQ-16-29** Part B pins Review Now, Founder lead and Career messages (skill-side definition, carried over unchanged). [Resolution #98]
- **REQ-16-30** Part B archives Noise via `action archive` and takes no action on other classes (two skill-side definitions). [Resolution #99] [Resolution #42]
- **REQ-16-31** Lookback configuration is unchanged: 7 days for all parts, 3 days for Part C, overridable by the user. [Resolution #104]
- **REQ-16-32** The following Resolutions set rule-type labels only and add no requirement beyond those cited elsewhere in this spec: #90 (signature source of truth, see REQ-10-4), #95 (bounce report fields, see REQ-6-19, REQ-6-32), #97 (Sent check, see REQ-16-17), #101 (already replied, see REQ-16-19), #102 (Bounces slot of the report, sequencing), #103 (Gmail-down half sequencing; unreachable half per REQ-12-5), #105 (edit ID change, see REQ-9-24), #106 (bounce query mismatch, removed by REQ-16-22), #107 (touch operations, see REQ-16-23), #108 (YCD signatures, see REQ-10-3), #109 (gatekeeper signature check is a structural gate that blocks shipping). [Resolution #90] [Resolution #95] [Resolution #97] [Resolution #101] [Resolution #102] [Resolution #103] [Resolution #105] [Resolution #106] [Resolution #107] [Resolution #108] [Resolution #109]

### 16.7 Source document corrections

- **REQ-16-33** Design L147 is updated to `\Draft \Seen` for new drafts. [Resolution #12]
- **REQ-16-34** Design "paging cursor" is changed to page number. [Resolution #27]
- **REQ-16-35** Design L23 is reworded to "calendar availability". [Resolution #37]
- **REQ-16-36** The D5 options text is fixed and D5 is marked DECIDED. [Resolution #41]
- **REQ-16-37** "Primary" is dropped from design section 6.1. [Resolution #73]
- **REQ-16-38** Design L107 is reworded to match L173 (no egress whitelisting on Workers). [Resolution #74]
- **REQ-16-39** The blank pass-criteria results table at the end of spike-results.md is a template leftover and is removed at its next edit. [RB-TA-8, overridden by Resolution #66]
- **REQ-16-40** spike-results.md L78 wording ("every draft body it creates") is read as "creates or edits". [Resolution #2]

## 17. Gaps found during spec-writing

## Gap G1
Topic: Full filter token table
What is missing: The inputs give translations only for `from:` (FROM, Resolution #46), `newer_than:Nd` (SINCE, Resolution #45) and bare words (TEXT, RB-FS-3). Resolution #84 accepts "the eight token translations" and Resolution #44 refers to "the supported table", but the table's content (for example `to:`, and any others) is not in either input. `to:<address>` is used by the skills (Resolution #79, Resolution #21) with no translation or matching rule stated.
Why it matters: REQ-7-3 rejects any token outside the supported table, so the table must be defined before the translator can be built or tested; `to:` matching decides whether send confirmation and touch-7 lookup find the right message.
Options: (a) Copy the design's token table into a rule-base entry or Resolution. (b) Support only the tokens the skills pass (REQ-7-10, REQ-7-11) in v1.
Resolution: Accepted 2026-11-01 (Scott, accept all): option (a). The full token table from design.md section 7.2 is adopted.## Gap G2
Topic: Positive list of logged fields
What is missing: Resolution #91 accepts a LOG-FIELDS definition but neither input states which fields are logged, beyond the account ID, filter token names and an error class code (Resolution #75). Whether correspondent addresses or domains may be logged is also not stated.
Why it matters: REQ-14-1 needs a testable definition of what each log line contains.
Options: (a) Add the field list (for example tool name, account, host, outcome, latency, error class) as a Resolution. (b) Log only the fields named in Resolution #75.
Resolution: Accepted 2026-11-01: option (a). Field list adopted from design.md section 13.## Gap G3
Topic: Exact tool schemas (parameter names, required vs optional, output shapes)
What is missing: Resolution #58 requires shapes matching Spark's schema, but the inputs do not give: the `thread` input parameter name; any parameters for `folders` and `availability`; whether `account`, `to`, `subject` are required on a new draft; the output object shapes for every tool, including how "accounts reached" (RB-FU-1), per-ID `action` results (Resolution #39), the edit warning (Resolution #56) and the "more pages" indicator (Resolution #27) are represented.
Why it matters: Drop-in compatibility and one-test-per-REQ both need concrete schemas.
Options: (a) Record the Spark schemas for the called tools as a rule-base entry or Resolution. (b) Define server schemas in a follow-up resolution.
Resolution: Accepted 2026-11-01: option (a). Spark connector schemas as recorded in docs/proposed-resolutions.md ("New evidence used") are adopted for every called tool; outputs carry explicit fields for accounts reached, per-ID action results, edit warnings and a more-pages flag.## Gap G4
Topic: `search` paging, cross-account merge, and the 20-result cap
What is missing: Resolution #23 caps `search` at 20 results newest first, but does not say whether the cap is per account or total across accounts, whether `search` supports `page`, or what `search` returns per result (whether it matches `emails` fields or includes bodies).
Why it matters: The bounce sweep and reply lookups across all accounts could silently miss results past 20.
Options: (a) Total cap of 20, no paging, same per-message fields as `emails`. (b) Cap per account. (c) Support `page` as in `emails`.
Resolution: Accepted 2026-11-01: option (a). Total cap of 20 across accounts, no paging, same per-message fields as `emails`.## Gap G5
Topic: `move` target naming
What is missing: RB-FA-1 says `move` goes to "a named folder" but neither input says whether the name is a logical name, a real folder name, or `<account>:<Folder>`, nor what happens when the target does not exist.
Why it matters: A move to a misnamed folder could fail silently or create a folder.
Options: (a) Logical names only. (b) Real folder names allowed. (c) `<account>:<Folder>` addressing as in `emails`.
Resolution: Accepted 2026-11-01: option (c). `<account>:<Folder>` addressing as in `emails`; a target that does not resolve is an error.## Gap G6
Topic: Move or archive when the host advertises neither MOVE nor UIDPLUS
What is missing: Resolution #68 requires MOVE when advertised, else UID COPY plus STORE `\Deleted` plus UID EXPUNGE (needs UIDPLUS). Resolution #52 says delete refuses without UIDPLUS, but nothing says what `archive`/`move` do when neither MOVE nor UIDPLUS is available.
Why it matters: A plain EXPUNGE could remove other messages flagged `\Deleted` in the folder.
Options: (a) Refuse the move with an error, as for delete. (b) Copy only, leaving the original in place, with a warning.
Resolution: Accepted 2026-11-01: option (a). Refuse with an error, as for delete.## Gap G7
Topic: Markdown dialect and quoted-original format
What is missing: RB-DR-4 says the body is markdown rendered to text and HTML, but no input names the markdown dialect or plain-text rendering rules. RB-DR-1 and Resolution #14 say the original is quoted below the body (reply) or inline (forward), but the quote format (attribution line, `>` prefixing, forwarded-header block) is not stated.
Why it matters: Recipients see the rendered result; tests need an expected output.
Options: (a) Specify a dialect (for example CommonMark) and a quote format by Resolution. (b) Match Spark's observed output.
Resolution: Accepted 2026-11-01: option (a) using CommonMark, with the quote format matching Spark's observed output.## Gap G8
Topic: Thread ordering direction
What is missing: Resolution #17 says threads are "ordered by date" but not ascending or descending.
Why it matters: The output order is a testable property (REQ-6-31), even though the acceptance comparison allows ordering differences (Resolution #71).
Options: (a) Oldest first. (b) Newest first.
Resolution: Accepted 2026-11-01: option (a). Oldest first.## Gap G9
Topic: Partial-reachability first-line wording
What is missing: Resolution #33 fixes the first line when every account failed; Resolution #34 says the first line names each unreached account and host when some fail, but gives no exact wording.
Why it matters: Scheduled-run reports and tests need a fixed string.
Options: (a) Reuse the Resolution #33 format with the unreached accounts and hosts listed. (b) A separate wording.
Resolution: Accepted 2026-11-01: option (a). Reuse the Resolution #33 format listing the unreached accounts and hosts.## Gap G10
Topic: Touch-7 forward call must now pass `to`
What is missing: RB-DR-7 gives the touch-7 call without `to`; Resolution #15 makes `to` required on a forward. No Resolution states that the get-in-the-room touch-7 call is changed at cutover to pass `to`, or where the address comes from.
Why it matters: As written, the skill's touch-7 call would fail on the server after cutover.
Options: (a) Add a cutover skill change: the touch-7 call passes `to: [<contact address>]`. (b) Server defaults `to` from the original (contradicts Resolution #15).
Resolution: Accepted 2026-11-01: option (a). Cutover skill change: get-in-the-room touch 7 passes `to: [<contact address>]`, the same address it uses to find the original.## Gap G11
Topic: GitHub OAuth app credentials and token storage
What is missing: Resolution #72 picks GitHub OAuth with login ironfis1 and sets token lifetimes, but no input names the secrets for the GitHub OAuth client ID and secret, or where workers-oauth-provider stores grants (needed for "revoke by deleting the grant").
Why it matters: The README and deploy steps cannot be written, and revocation cannot be tested, without these.
Options: (a) Name the secrets and storage binding in a Resolution. (b) Use workers-oauth-provider defaults and document them.
Resolution: Accepted 2026-11-01: option (b). workers-oauth-provider defaults, with secret and binding names documented in the README.## Gap G12
Topic: 2FA type on the dedicated Cloudflare account
What is missing: RB-OT-2, RB-AS-7 and Resolution #73 require hardware-key 2FA. The current docs/design.md (section 6.1 and R4) now reads "mobile authenticator enabled 2026-11-01; upgrade to a hardware key when Scott has one", which neither input reflects. This spec follows the inputs (REQ-2-17, REQ-2-18, REQ-3-11).
Why it matters: If hardware-key 2FA is a deploy prerequisite, deploy is blocked until Scott has a key; if not, the inputs need updating.
Options: (a) Hardware key required before production deploy. (b) Mobile authenticator accepted for now, hardware key later; update the rule base.
Resolution: Accepted 2026-11-01: option (b). Mobile authenticator 2FA accepted now (enabled 2026-11-01); hardware key added later as a second factor. Deploy is not blocked.

## 18. Requirements from resolved gaps

Each requirement below cites `[Gap Gn]`, the resolved entry in section 17.

- **REQ-18-1** The filter grammar supports exactly these tokens: `from:x` (IMAP FROM), `to:x` (TO), `subject:x` (SUBJECT), `newer_than:Nd` (SINCE today minus N), `older_than:Nd` (BEFORE today minus N), `is:unread` / `is:read` (UNSEEN / SEEN), `is:pinned` (FLAGGED), and bare words (TEXT). Any other token is an error. [Gap G1]
- **REQ-18-2** Each log record contains only: tool name, account, host, outcome, latency, error class. Logs never contain message bodies, credentials, or correspondent addresses; a correspondent may appear only as a domain. [Gap G2]
- **REQ-18-3** Tool input schemas for `emails`, `search`, `thread`, `action` and `draft` match the Spark connector schemas recorded in docs/proposed-resolutions.md, section "New evidence used". [Gap G3]
- **REQ-18-4** Tool outputs carry explicit fields for: accounts reached and not reached, per-ID results on `action`, any warning on `draft` edit, and a more-pages flag on `emails`. [Gap G3]
- **REQ-18-5** `search` returns at most 20 results in total across all accounts searched, has no paging, and returns the same per-message fields as `emails`. [Gap G4]
- **REQ-18-6** The `move` target uses `<account>:<Folder>` addressing as in `emails`. A target that does not resolve to an existing folder is an error and nothing moves. [Gap G5]
- **REQ-18-7** When the host advertises neither MOVE nor UIDPLUS, `archive` and `move` refuse with an error and leave the message in place. [Gap G6]
- **REQ-18-8** Draft bodies are parsed as CommonMark. Quoted originals in replies and forwards follow the format Spark produces. [Gap G7]
- **REQ-18-9** `thread` returns messages ordered oldest first. [Gap G8]
- **REQ-18-10** When some but not all accounts are unreached, the first line of the report reads exactly: "PARTIAL RUN: <unreached accounts> on <host> NOT checked (mail server unreachable). Bounces and <reached accounts> checked." The REQ-12-5 wording ("Business inboxes and bounces NOT checked: ...") is used only when every account is unreached. If scott@reasinger.net is among the unreached, "Bounces and" is omitted. [Gap G9] [Worked example D-1]
- **REQ-18-11** At cutover, get-in-the-room touch 7 passes `to: [<contact address>]` on the forward, using the address it already uses to find the original. [Gap G10]
- **REQ-18-12** OAuth grant storage and secret names use workers-oauth-provider defaults; the README documents each secret and binding name and the revocation procedure. [Gap G11]
- **REQ-18-13** Two-factor on the dedicated Cloudflare account is satisfied by a mobile authenticator app; a hardware key is added later as an additional factor and is not a deploy prerequisite. This supersedes the hardware-key wording in REQ-2-17, REQ-2-18 and REQ-3-11. [Gap G12]

## 19. Requirements from build questions

- **REQ-19-1** When more than one folder carries the same SPECIAL-USE flag, resolving that logical name is an error that asks for a config override; the server never picks one. [Build question Q2]
