# cpanel-mail-mcp: Rule base (merged from Pass 1 and Pass 2)

Inputs: pass1/rules.md (Pass 1), pass2/rules.md (Pass 2), sources/source-pack.md. Rules were matched by meaning and source citation. An entry is here only when both passes found the rule with matching readings and matching type. "high" means both passes rated it high with no flag. "PROVISIONAL" means both passes agree but at least one flagged it; the open point is in ambiguity-log.md. Rules where the passes disagree, or that only one pass found, are not here; they are in ambiguity-log.md.

Quote check: all quotes cited below were verified against the cited file and lines in the source pack; none failed.

Counts: 95 entries, 44 high, 51 PROVISIONAL.

---

## Accounts and hosts

Rule ID: RB-AH-1
Statement: The server serves three mailboxes on two hosts, three logins: scott@reasinger.net on cPanel A (server128.web-hosting.com); scott@yourcigardenindy.com and founders@yourcigardenindy.com on cPanel B (yourcigardenindy.com).
Source: (Pass 1 DES-09, 01-design-v0.2.md L34-L36, L38: "| scott@reasinger.net | cPanel A (server128.web-hosting.com) | ..." / "Two hosts, three logins."; Pass 2 ACCT-THREE-MAILBOXES, 01-design-v0.2.md L34-L36, L38: "| scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |" / "Two hosts, three logins.")
Type: definition
Confidence: high

Rule ID: RB-AH-2
Statement: The cPanel A IMAP host is server128.web-hosting.com on port 993, not reasinger.net, because reasinger.net is the web host record and the TLS certificate is for the server name.
Source: (Pass 1 DES-10, 01-design-v0.2.md L38: "cPanel A IMAP host is `server128.web-hosting.com:993` (cPanel suggests `reasinger.net`, which is the web host record; use the server name)." and 02-spike-results.md L25; Pass 2 ACCT-CPANEL-A-HOST, 02-spike-results.md L25: "Use `server128.web-hosting.com` as IMAP host. cPanel's suggested `reasinger.net` is the web host record and the certificate is for the server name.")
Type: definition
Confidence: high

Rule ID: RB-AH-3
Statement: The cPanel B IMAP host is not yet confirmed and must be confirmed from that cPanel's address bar before configuration.
Source: (Pass 1 DES-10a, 01-design-v0.2.md L38: "cPanel B host still to confirm from that cPanel's address bar."; Pass 2 ACCT-CPANEL-B-HOST-UNCONFIRMED, 01-design-v0.2.md L38: "cPanel B host still to confirm from that cPanel's address bar.")
Type: tracking-only check
Confidence: PROVISIONAL, see Ambiguity #64

Rule ID: RB-AH-4
Statement: A test mailbox, mcptest@reasinger.net on cPanel A, exists for integration tests.
Source: (Pass 1 DES-10c, 01-design-v0.2.md L38: "A test mailbox, mcptest@reasinger.net, exists on cPanel A for integration tests."; Pass 2 ACCT-TEST-MAILBOX, same line and quote)
Type: definition
Confidence: high

Rule ID: RB-AH-5
Statement: The account registry is static config, one entry per mailbox: id (the address), host, port 993, secret_ref (name of the platform secret holding the password), signature (exact per-account text appended by the server), and folders (discovered at first connect, cached, overridable).
Source: (Pass 1 DES-26, 01-design-v0.2.md L90-L98: "Static config, one entry per mailbox:" / "secret_ref: IMAP_PASS_REASINGER_SCOTT" / "folders: discovered at first connect, cached, overridable"; Pass 2 ACCT-REGISTRY-STATIC and FOLD-CACHE-OVERRIDE, 01-design-v0.2.md L90-L98: "signature: <exact per-account signature text, appended by the server, see D1>" / "folders: discovered at first connect, cached, overridable")
Type: definition
Confidence: PROVISIONAL, see Ambiguity #62, #77

Rule ID: RB-AH-6
Statement: Drafts are created in the account matching their purpose: job search (outreach, cover notes, recruiters, networking, follow-ups) in scott@reasinger.net; Your Cigar Den Indy, Scott personally, in scott@yourcigardenindy.com; founder-member outreach and replies in founders@yourcigardenindy.com; sreasinger@gmail.com is never used for outreach.
Source: (Pass 1 GIR-06, skill-get-in-the-room.md L350-L355: "| Job search: outreach, cover notes, recruiters, networking, follow-ups | `scott@reasinger.net` |" / "| Never for outreach | `sreasinger@gmail.com` |"; Pass 2 ACCT-PURPOSE-MAP, skill-get-in-the-room.md L352-L355: "| Your Cigar Den Indy founder-member outreach and replies | `founders@yourcigardenindy.com` |")
Type: definition
Confidence: high

Rule ID: RB-AH-7
Statement: sreasinger@gmail.com is out of scope; it stays on the Gmail connector and the server does not serve it.
Source: (Pass 1 DES-06, 01-design-v0.2.md L24: "Gmail. sreasinger@gmail.com stays on the Gmail connector."; Pass 2 NG-NO-GMAIL, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AH-8
Statement: cPanel B protocol operations, folder names and SPECIAL-USE flags are not yet recorded and must still be captured.
Source: (Pass 1 SPK-05, 02-spike-results.md L68-L69: "| 1 | Protocol ops on Workers | PASS on cPanel A. cPanel B pending (list-only run). |" / "| 2 | Folder names and SPECIAL-USE | cPanel A done (above). cPanel B pending. |"; Pass 2 ACCT-CPANEL-B-FOLDERS-PENDING, 02-spike-results.md L69: "| 2 | Folder names and SPECIAL-USE | cPanel A done (above). cPanel B pending. |" and 01-design-v0.2.md L188)
Type: tracking-only check
Confidence: PROVISIONAL, see Ambiguity #65

Rule ID: RB-AH-9
Statement: Since 2026-10-26 the three business mailboxes are read directly, not through Gmail; the cPanel forwarders to Gmail are retired.
Source: (Pass 1 ECF-02, skill-email-crap-filter.md L14-L15: "Since 2026-10-26 these are read directly in Spark Pro; the cPanel forwarders to Gmail are retired, so Gmail no longer sees any of this mail."; Pass 2 ECF-NO-GMAIL-FORWARDERS, skill-email-crap-filter.md L13-L15, same quote)
Type: definition
Confidence: high

## Auth and security

Rule ID: RB-AS-1
Statement: MCP clients authenticate with OAuth 2.1 via workers-oauth-provider.
Source: (Pass 1 DES-22, 01-design-v0.2.md L83: "MCP clients authenticate with OAuth 2.1 via `workers-oauth-provider`, which claude.ai custom connectors support."; Pass 2 AUTH-OAUTH21, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-2
Statement: The upstream identity check allows exactly one principal (Scott); any other identity is refused at authorize time.
Source: (Pass 1 DES-23, 01-design-v0.2.md L84: "The upstream identity check allows exactly one principal (Scott). Any other identity is refused at authorize time."; Pass 2 AUTH-SINGLE-PRINCIPAL, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-3
Statement: No authless mode and no shared-secret URL.
Source: (Pass 1 DES-24, 01-design-v0.2.md L85: "No authless mode, no shared-secret URL."; Pass 2 AUTH-NO-AUTHLESS, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-4
Statement: The server serves exactly one principal, Scott; multi-user is out of scope.
Source: (Pass 1 DES-08, 01-design-v0.2.md L26: "Multi-user. One principal: Scott."; Pass 2 NG-SINGLE-USER, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-5
Statement: Least privilege: the server may read, flag, move and write to Drafts only; nothing that sends and nothing that permanently deletes received mail.
Source: (Pass 1 DES-12, 01-design-v0.2.md L53: "**Least privilege.** Read, flag, move, and write to Drafts. Nothing that sends, and nothing that permanently deletes received mail."; Pass 2 SEC-LEAST-PRIVILEGE, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-6
Statement: Credentials live only in platform secrets, never in code or logs; message bodies are never logged.
Source: (Pass 1 DES-15, 01-design-v0.2.md L56: "**No secrets in code or logs.** Credentials live only in platform secrets. Message bodies are never logged."; Pass 2 SEC-SECRETS-PLATFORM-ONLY, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-7
Statement: Each mailbox has a unique password; with the dedicated Cloudflare account with hardware 2FA, single-principal OAuth and no send capability, this is the R4 credential-compromise mitigation.
Source: (Pass 1 DES-63, 01-design-v0.2.md L175: "| R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |"; Pass 2 SEC-UNIQUE-PASSWORDS, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-AS-8
Statement: Claude clients reach the server over MCP via HTTPS using streamable HTTP with an OAuth bearer token.
Source: (Pass 1 DES-16, 01-design-v0.2.md L62: "| MCP over HTTPS (streamable HTTP), OAuth bearer"; Pass 2 HOST-TRANSPORT, same line and quote)
Type: definition
Confidence: high

## Connection and IMAP client

Rule ID: RB-CI-1
Statement: The server uses a minimal IMAP client written on cloudflare:sockets, not imapflow (which times out on Workers), implementing only the commands the design needs.
Source: (Pass 1 DES-19, 01-design-v0.2.md L79: "imapflow times out on the Workers runtime (`ETIMEOUT` after 30 s) ... The server therefore uses a minimal IMAP client written on `cloudflare:sockets` (prototype: `spike/src/imap.js`). It implements only the commands this design needs."; Pass 2 IMAP-NATIVE-CLIENT, 01-design-v0.2.md L79 (same quote) and 02-spike-results.md L28: "Decision D2: stay on Workers; replace imapflow with a minimal IMAP client on the native socket (`spike/src/imap.js`).")
Type: structural gate
Confidence: high

Rule ID: RB-CI-2
Statement: IMAP login uses AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping.
Source: (Pass 1 DES-20, 01-design-v0.2.md L79: "Login is AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping." and 02-spike-results.md L28; Pass 2 IMAP-AUTH-PLAIN-SASLIR, 01-design-v0.2.md L79 (same quote) and 02-spike-results.md L38: "| Login, AUTHENTICATE PLAIN with SASL-IR | PASS | 278 |")
Type: definition
Confidence: high

Rule ID: RB-CI-3
Statement: Every IMAP network read or step has an explicit timeout; no step may hang the request.
Source: (Pass 1 DES-21, 01-design-v0.2.md L79: "Every read has an explicit timeout; no step may hang." and 02-spike-results.md L26: "First attempt with no timeouts hung the request indefinitely. Every network step now has an explicit timeout."; Pass 2 IMAP-EXPLICIT-TIMEOUTS, same two lines and quotes)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #59

Rule ID: RB-CI-4
Statement: One IMAP session per account per request, opened lazily and closed at request end; no persistent connections and no pooling.
Source: (Pass 1 DES-31, 01-design-v0.2.md L105: "One IMAP session per account per request, opened lazily, closed at request end. No persistent connections. ... so per-request connect is acceptable and no pooling is needed."; Pass 2 CONN-PER-REQUEST, 01-design-v0.2.md L105 (same) and 02-spike-results.md L62: "Connection setup plus login is about 750 ms per account, so per-request connect is acceptable; no pooling needed.")
Type: structural gate
Confidence: high

Rule ID: RB-CI-5
Statement: Operations run in parallel across accounts and sequentially within an account (one session per account per request, respecting cPanel per-account connection limits).
Source: (Pass 1 DES-32, 01-design-v0.2.md L105: "Parallel across accounts, sequential within an account." and L177: "One session per account per request; sequential within account"; Pass 2 CONN-PARALLELISM, 01-design-v0.2.md L105 and L177: "| R6 | cPanel connection limits per account | One session per account per request; sequential within account |")
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #60

Rule ID: RB-CI-6
Statement: On any IMAP authentication failure the account is disabled for the rest of the request, the error tells the caller to check the secret, and there is no retry on auth errors (cPHulk risk).
Source: (Pass 1 DES-33, 01-design-v0.2.md L107: "Mitigation: on any auth failure, the account is disabled for the remainder of the request and the error says to check the secret; no retries on auth errors." and L173: "No retry on auth failure."; Pass 2 CONN-AUTH-FAIL-NO-RETRY, same two lines)
Type: structural gate
Confidence: high

Rule ID: RB-CI-7
Statement: Egress IP whitelisting on the cPanel hosts is not available on Workers (no stable egress IP), so a cPHulk block requires a manual cPanel unblock.
Source: (Pass 1 DES-34, 01-design-v0.2.md L107: "Egress IP whitelisting on both hosts if the hosting option gives a stable egress IP (Workers does not by default; see R2)." and L173: "Workers egress IPs are not stable, so whitelisting is not available; a block means a cPanel unblock by hand."; Pass 2 CONN-NO-IP-WHITELIST, same two lines and quotes)
Type: other
Confidence: PROVISIONAL, see Ambiguity #74

Rule ID: RB-CI-8
Statement: The IMAP client supports at minimum login (AUTHENTICATE PLAIN with SASL-IR), LIST, SELECT, SEARCH, FETCH, APPEND and STORE of flags, as exercised in spike run 3; commands needed for archive, move, draft delete and body fetch were not exercised.
Source: (Pass 1 SPK-03, 02-spike-results.md L36-L44: "| LIST | PASS |" / "| UID SEARCH SINCE 7d | PASS |" / "| UID STORE +FLAGS \\Flagged | PASS |"; Pass 2 IMAP-REQUIRED-COMMANDS, 01-design-v0.2.md L187: "imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts." and 02-spike-results.md L82: "login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE against both hosts")
Type: definition
Confidence: PROVISIONAL, see Ambiguity #68

## Folders

Rule ID: RB-FO-1
Statement: cPanel A folders use the INBOX. prefix with "." as delimiter and advertise SPECIAL-USE.
Source: (Pass 1 DES-10b, 01-design-v0.2.md L38: "cPanel A folders use the `INBOX.` prefix with `.` delimiter and advertise SPECIAL-USE (spike run 3)."; Pass 2 ACCT-CPANEL-A-FOLDER-LAYOUT, same line and 02-spike-results.md L46: "Folder map, cPanel A (delimiter `.`, all advertise SPECIAL-USE):")
Type: definition
Confidence: high

Rule ID: RB-FO-2
Statement: The cPanel A folder map is Inbox = INBOX; Sent = INBOX.Sent (\Sent); Drafts = INBOX.Drafts (\Drafts); Archive = INBOX.Archive (\Archive); Trash = INBOX.Trash (\Trash); Junk = INBOX.spam (\Junk); INBOX.Junk carries no flag and no logical name.
Source: (Pass 1 DES-30, 02-spike-results.md L48-L56: "| Sent | INBOX.Sent | \\Sent |" / "| Junk | INBOX.spam | \\Junk |" / "| (none) | INBOX.Junk | none. ..."; Pass 2 ACCT-CPANEL-A-FOLDER-MAP, 02-spike-results.md L50-L56: "| Archive | INBOX.Archive | \\Archive |" / "| (none) | INBOX.Junk | none. A second junk folder without the flag. Discovery must prefer SPECIAL-USE over name match. |")
Type: definition
Confidence: high

Rule ID: RB-FO-3
Statement: Folder discovery uses IMAP LIST and SPECIAL-USE flags (\Sent, \Drafts, \Archive, \Trash, \Junk) where advertised, falling back to name matching only when no folder carries the flag.
Source: (Pass 1 DES-27, 01-design-v0.2.md L101: "Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag."; Pass 2 FOLD-DISCOVERY, same line and 02-spike-results.md L60: "Folder resolution order: SPECIAL-USE first, name match only as fallback.")
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #63

Rule ID: RB-FO-4
Statement: SPECIAL-USE always wins over a name match; on cPanel A, Junk resolves to INBOX.spam (flagged \Junk), not the unflagged INBOX.Junk.
Source: (Pass 1 DES-28, 01-design-v0.2.md L101: "SPECIAL-USE always wins over name: cPanel A has both `INBOX.spam` (flagged `\Junk`) and `INBOX.Junk` (unflagged); Junk resolves to `INBOX.spam`."; Pass 2 FOLD-SPECIAL-USE-WINS, same line and 02-spike-results.md L56: "Discovery must prefer SPECIAL-USE over name match.")
Type: structural gate
Confidence: high

Rule ID: RB-FO-5
Statement: The logical names Inbox, Sent, Drafts and Archive map to real folder names per account, and skills address folders as <account>:<LogicalName>.
Source: (Pass 1 DES-29, 01-design-v0.2.md L101: "The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account."; Pass 2 FOLD-LOGICAL-NAMES, same line and skill-email-crap-filter.md L33: "`Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`,")
Type: definition
Confidence: PROVISIONAL, see Ambiguity #61

Rule ID: RB-FO-6
Statement: D5: use the existing Archive folder; never auto-create one; a missing Archive is an error. cPanel A has INBOX.Archive with \Archive; cPanel B must be verified.
Source: (Pass 1 DES-58, 01-design-v0.2.md L165: "| D5 | Archive folder | Use existing Archive if present, else create | cPanel A: `INBOX.Archive` with `\Archive` exists (spike run 3). cPanel B: verify in integration tests. Never auto-create; a missing Archive is an error. |"; Pass 2 FOLD-ARCHIVE-NO-AUTOCREATE, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #41

## Tools and parameters

Rule ID: RB-TP-1
Statement: The server covers the calls the skills make today: email-crap-filter uses emails (folder, filter, page_size), search (query, in, filter), thread, action pin, action archive; get-in-the-room uses draft new, reply_to, reply_all, forward, edit, delete, emails on Inbox and Sent with filters, and search; gatekeeper-panel calls none directly.
Source: (Pass 1 DES-10d, 01-design-v0.2.md L44-L46: "| email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |"; Pass 2 COMPAT-CURRENT-CALLS, 01-design-v0.2.md L44-L46: "| get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |")
Type: definition
Confidence: high

Rule ID: RB-TP-2
Statement: Drop-in compatibility: tool names, parameters, folder addressing (<account>:Inbox) and filter grammar mirror the Spark connector, so migrating a skill is a tool-prefix swap plus removing the "Spark unreachable" branch, not a rewrite.
Source: (Pass 1 DES-11, 01-design-v0.2.md L52: "**Drop-in compatibility.** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector. Migrating a skill is a tool-prefix swap plus removing the \"Spark unreachable\" branch, not a rewrite."; Pass 2 COMPAT-DROP-IN, same line and L111: "Names and parameters follow the Spark connector. Exact schemas are set in the spec.")
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #58, #32

Rule ID: RB-TP-3
Statement: All server writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks.
Source: (Pass 1 DES-14, 01-design-v0.2.md L55: "**Spark sees everything.** All writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks."; Pass 2 COMPAT-SPARK-SEES-ALL, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-TP-4
Statement: The accounts tool lists configured accounts and per-account reachability.
Source: (Pass 1 DES-36, 01-design-v0.2.md L115: "| `accounts` | List configured accounts and per-account reachability. |"; Pass 2 TOOL-ACCOUNTS, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #38

Rule ID: RB-TP-5
Statement: The availability tool is a per-host health check covering TCP, TLS, login and SELECT INBOX, used as a preflight by scheduled skills.
Source: (Pass 1 DES-37, 01-design-v0.2.md L116: "| `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |"; Pass 2 TOOL-AVAILABILITY, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #36, #37

Rule ID: RB-TP-6
Statement: The folders tool lists folders per account with the logical-name mapping.
Source: (Pass 1 DES-38, 01-design-v0.2.md L117: "| `folders` | List folders per account with logical-name mapping. |"; Pass 2 TOOL-FOLDERS, same line and quote)
Type: definition
Confidence: high

Rule ID: RB-TP-7
Statement: The emails tool lists messages in <account>:<Folder>, accepts filter, page_size and a paging cursor, and returns per message: ID, from, to, subject, date, snippet, flags.
Source: (Pass 1 DES-39, 01-design-v0.2.md L118: "| `emails` | List messages in `<account>:<Folder>` with `filter`, `page_size`, paging cursor. Returns ID, from, to, subject, date, snippet, flags. |"; Pass 2 TOOL-EMAILS, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #27, #25

Rule ID: RB-TP-8
Statement: The search tool runs a free-text query within one account or all accounts, plus an optional filter.
Source: (Pass 1 DES-40, 01-design-v0.2.md L119: "| `search` | Free-text query within one or all accounts, plus optional `filter`. |"; Pass 2 TOOL-SEARCH, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #47, #48, #23

Rule ID: RB-TP-9
Statement: The thread tool returns a message and its thread, reconstructed by References / In-Reply-To with a subject fallback, with bodies as text.
Source: (Pass 1 DES-41, 01-design-v0.2.md L120: "| `thread` | Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text. |"; Pass 2 TOOL-THREAD, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #17, #26

Rule ID: RB-TP-10
Statement: The draft tool supports create new, reply_to, reply_all, forward, edit and delete (draft only), and writes by appending to the account's Drafts folder.
Source: (Pass 1 DES-43, 01-design-v0.2.md L122: "| `draft` | Create new, `reply_to`, `reply_all`, `forward`, `edit`, `delete` (draft only). Appends to the account's Drafts folder. |"; Pass 2 TOOL-DRAFT, same line and quote)
Type: definition
Confidence: high

Rule ID: RB-TP-11
Statement: The server decodes all returned header text (subjects and address display names arrive RFC 2047 encoded) before returning it and before building Re: subjects.
Source: (Pass 1 DES-56 and SPK-04, 01-design-v0.2.md L154: "Header decoding: subjects and address display names arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server decodes all returned header text" and 02-spike-results.md L59: "The server must decode headers before returning them and before building `Re:` subjects."; Pass 2 HDR-DECODE, same two lines and quotes)
Type: structural gate
Confidence: high

Rule ID: RB-TP-12
Statement: The skills currently call mcp__remote-devices__Spark__* tools (emails, search, thread, action, draft) loaded with ToolSearch; at cutover they switch to this server's tool prefix.
Source: (Pass 1 ECF-24 and GIR-17, skill-email-crap-filter.md L19: "Spark tools (mcp__remote-devices__Spark__emails, __search, __thread, __action)", skill-get-in-the-room.md L348: "The Spark tools run through Scott's linked computer (mcp__remote-devices__Spark__*); load them with ToolSearch." and 01-design-v0.2.md L209: "Cutover: skills switch tool prefix"; Pass 2 COMPAT-SKILL-TOOL-NAMES, same three lines)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #76

Rule ID: RB-TP-13
Statement: The combined triage report tags each item with its account ([reasinger.net], [YCDI], [founders], [gmail]), so server results must identify each message's account.
Source: (Pass 1 ECF-17, skill-email-crap-filter.md L224-L225: "One combined report across all accounts. Tag each item with its account (`[reasinger.net]`, `[YCDI]`, `[founders]`, `[gmail]`)."; Pass 2 ECF-REPORT-ACCOUNT-TAGS, same lines and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #28

Rule ID: RB-TP-14
Statement: Part B fetch: for each of the three business accounts, call emails with folder <account>:Inbox, filter "newer_than:7d", page_size 100.
Source: (Pass 1 ECF-09, skill-email-crap-filter.md L59-L60: "For each account call `Spark__emails` with `folder: \"<account>:Inbox\"`, `filter: \"newer_than:7d\"`, `page_size: 100`."; Pass 2 ECF-B-FETCH, same lines and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #27

## Filters and search

Rule ID: RB-FS-1
Statement: Unknown filter tokens are an error and are never silently dropped.
Source: (Pass 1 DES-47, 01-design-v0.2.md L143: "Unknown tokens are an error, never silently dropped."; Pass 2 FILTER-UNKNOWN-ERROR, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-FS-2
Statement: Filter date math uses the America/Indianapolis time zone.
Source: (Pass 1 DES-48, 01-design-v0.2.md L143: "Date math uses America/Indianapolis."; Pass 2 FILTER-TIMEZONE, same line and quote)
Type: calculation
Confidence: high

Rule ID: RB-FS-3
Statement: The bounce sweep's multi-word free-text search ("delivery failed undeliverable address not found") is expected to return real delivery-failure notices among a broader result set, while the design maps bare words to IMAP TEXT; how the words are combined is not set.
Source: (Pass 1 X-09, skill-email-crap-filter.md L36-L38: "`query: \"delivery failed undeliverable address not found\"` ... Keep only real delivery-failure notices (ignore normal mail the search also returns)." and 01-design-v0.2.md L141: "| bare words | `TEXT` |"; Pass 2 FILTER-BARE-WORDS-SEARCH, same lines and quotes)
Type: calculation
Confidence: PROVISIONAL, see Ambiguity #23

## Message IDs

Rule ID: RB-MI-1
Statement: ID lookup uses the UID when the encoded UIDVALIDITY matches, and falls back to a Message-ID header search when the message has moved (for example after archive).
Source: (Pass 1 DES-45, 01-design-v0.2.md L126: "Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive)."; Pass 2 ID-LOOKUP-FALLBACK, same line and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #43

Rule ID: RB-MI-2
Statement: get-in-the-room gives Scott a draft ID per recipient and never calls an email "ready" unless the draft exists.
Source: (Pass 1 GIR-05, skill-get-in-the-room.md L217: "Give Scott the Spark draft ID per recipient; never call an email \"ready\" unless the draft exists."; Pass 2 ID-SPARK-ID-HANDOFF, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #18

## Drafts, replies, forwards

Rule ID: RB-DR-1
Statement: A reply or reply-all draft sets In-Reply-To and References from the original, uses a Re: subject, takes recipients from the original per reply mode, and places the quoted original below the body.
Source: (Pass 1 DES-50, 01-design-v0.2.md L148: "Reply / reply all: set `In-Reply-To` and `References` from the original, `Re:` subject, recipients from the original per reply mode, quoted original below the body."; Pass 2 DRAFT-REPLY, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #13, #8

Rule ID: RB-DR-2
Statement: A forward draft uses a Fwd: subject and includes the original; inline quote vs .eml attachment is open decision D4, leaning inline quote.
Source: (Pass 1 DES-51, 01-design-v0.2.md L149: "Forward: `Fwd:` subject, original included (inline quote vs attachment is D4)." and L164; Pass 2 DRAFT-FORWARD, same lines and L164: "| D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior). Open. |")
Type: definition
Confidence: PROVISIONAL, see Ambiguity #14, #15

Rule ID: RB-DR-3
Statement: Draft delete is draft-only: refuse any target that lacks \Draft or is not in the Drafts folder.
Source: (Pass 1 DES-53, 01-design-v0.2.md L151: "Delete: draft-only. Refuse if the target lacks `\Draft` or is not in the Drafts folder."; Pass 2 DRAFT-DELETE-GUARD, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-DR-4
Statement: Draft body input is markdown; the server renders a multipart message with text and HTML parts.
Source: (Pass 1 DES-54, 01-design-v0.2.md L152: "Body input is markdown; the server renders multipart text and HTML."; Pass 2 DRAFT-BODY-RENDER, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #7

Rule ID: RB-DR-5
Statement: A new note is created with draft taking account, to, subject and body, where the body is markdown with no signature and no sign-off.
Source: (Pass 1 GIR-07, skill-get-in-the-room.md L357: "**New note:** `Spark__draft` with `account`, `to`, `subject`, `body` (markdown, no signature, no sign-off). Every account appends its own signature."; Pass 2 DRAFT-NEW-PARAMS, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #53, #4

Rule ID: RB-DR-6
Statement: A reply draft uses reply_to: <message ID> with account; a reply to everyone uses reply_all; the ID is found with search (query) or emails (filter, folder scott@reasinger.net:Inbox).
Source: (Pass 1 GIR-08 and GIR-09, skill-get-in-the-room.md L358: "**Reply on a thread:** `Spark__draft` with `reply_to: <Spark message ID>` and `account`." / "A reply to everyone on the thread uses `reply_all`."; Pass 2 DRAFT-REPLY-PARAMS, same line and quotes)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #54, #55

Rule ID: RB-DR-7
Statement: The touch-7 forward is a draft with forward: <ID of Scott's sent touch 1>, account scott@reasinger.net, body "Not sure if you saw this."; the original is found with emails on scott@reasinger.net:Sent with filter "to:<address>".
Source: (Pass 1 GIR-10, skill-get-in-the-room.md L359: "**Forward of the original (touch 7):** `Spark__draft` with `forward: <ID of Scott's sent touch 1>`, `account: scott@reasinger.net`, body \"Not sure if you saw this.\"" and L257; Pass 2 DRAFT-FORWARD-TOUCH7, same lines and quotes)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #15

Rule ID: RB-DR-8
Statement: get-in-the-room deletes a draft with delete: <draft ID> alone, and the delete is permanent.
Source: (Pass 1 GIR-12, skill-get-in-the-room.md L360: "**Delete:** `delete: <draft ID>` alone (permanent)."; Pass 2 DRAFT-DELETE-PERMANENT, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #52

Rule ID: RB-DR-9
Statement: No permanent delete of messages; draft delete is the only delete in scope.
Source: (Pass 1 DES-07, 01-design-v0.2.md L25: "Permanent delete of messages. Draft delete is the only delete in scope."; Pass 2 NG-NO-PERMANENT-DELETE, same line and quote)
Type: structural gate
Confidence: high

## Signatures

Rule ID: RB-SG-1
Statement: D1 (decided): the server appends the account's configured signature to every draft it creates or edits; skills keep sending signature-free bodies.
Source: (Pass 1 DES-55, 01-design-v0.2.md L153: "Signature (D1): the server appends the account's configured signature to every draft it creates or edits. ... Skills keep sending signature-free bodies." and L161; Pass 2 SIG-SERVER-APPENDS, 01-design-v0.2.md L153, L161: "DECIDED (spike run 3): (a). Spark does not sign drafts it did not create." and 02-spike-results.md L78)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #1, #2, #3, #8

Rule ID: RB-SG-2
Statement: The skills state that Spark appends the account signature, while the spike and design state Spark does not sign drafts it did not create and the server must append; the source records both.
Source: (Pass 1 X-02, skill-get-in-the-room.md L7: "Spark appends the signature, so draft bodies carry none." and 02-spike-results.md L71: "Spark does NOT add the account signature to a draft it did not create."; Pass 2 SIG-WHO-APPENDS-CONFLICT, skill-gatekeeper-panel.md L48: "the Spark draft body itself carries no signature because Spark appends it (v3.4, 2026-10-26)." and 02-spike-results.md L71)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #1

Rule ID: RB-SG-3
Statement: The scott@reasinger.net signature text is exactly: Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger
Source: (Pass 1 GIR-02, skill-get-in-the-room.md L116: "the scott@reasinger.net account signature in Spark appends it automatically: `Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger`."; Pass 2 SIG-EXACT-TEXT, skill-get-in-the-room.md L116 and skill-gatekeeper-panel.md L48: "(`Scott Reasinger | scott@reasinger.net | 317-460-0736 | https://linkedin.com/in/scottreasinger` for scott@reasinger.net)")
Type: definition
Confidence: PROVISIONAL, see Ambiguity #9, #5

Rule ID: RB-SG-4
Statement: For email, cover and InMail drafts the gatekeeper check file ends with the account signature exactly as it will render, while the draft body carries none; so the signature the server appends must render as that line.
Source: (Pass 1 GKP-02, skill-gatekeeper-panel.md L48: "For email, cover and InMail drafts the file ends with the Spark account signature exactly as it will render"; Pass 2 SIG-RENDER-MATCH-GATE, same line and skill-get-in-the-room.md L116: "The draft file you run through the counter, check.py, and the panel DOES end with that signature line, so the checks see what the reader sees.")
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #7

## Sending policy

Rule ID: RB-SP-1
Statement: The server does not send mail in v1 and has no SMTP; Scott sends from Spark.
Source: (Pass 1 DES-03, 01-design-v0.2.md L21: "Sending mail. No skill sends autonomously. Scott sends from Spark. No SMTP in v1."; Pass 2 NG-NO-SEND, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-SP-2
Statement: The server is the automation path only; Spark remains Scott's mail client and human interface.
Source: (Pass 1 DES-04, 01-design-v0.2.md L22: "Replacing Spark as Scott's mail client. Spark stays the human interface; this server is the automation path."; Pass 2 NG-NOT-A-CLIENT, same line and quote)
Type: definition
Confidence: high

Rule ID: RB-SP-3
Statement: Outreach email delivery is a draft in the business mail system, never a Gmail draft.
Source: (Pass 1 GIR-04, skill-get-in-the-room.md L217: "Email delivery = a Spark draft (see EMAIL DELIVERY - SPARK), never a Gmail draft."; Pass 2 SEND-NEVER-GMAIL-DRAFT, same line and L348: "Gmail is no longer used for outreach drafts or for reading reasinger.net mail (forwarders retired 2026-10-26).")
Type: structural gate
Confidence: high

Rule ID: RB-SP-4
Statement: When Scott sends a server-created draft from Spark, Spark re-composes it (new @Spark Message-ID, multipart text and HTML), keeps In-Reply-To and References, and decodes the RFC 2047 subject; the draft appeared in Spark and threaded correctly at the recipient.
Source: (Pass 1 SPK-06, 02-spike-results.md L70: "PASS. Draft appeared in Spark, sent from Spark, arrived with In-Reply-To and References intact; Gmail threaded send 2 onto send 1. Spark re-composes on send (new `@Spark` Message-ID, multipart text+HTML) and decodes the RFC 2047 subject correctly."; Pass 2 SEND-SPARK-RECOMPOSE, 02-spike-results.md L70 (same) and 01-design-v0.2.md L155: "Spark re-composes the draft, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original.")
Type: definition
Confidence: high

Rule ID: RB-SP-5
Statement: After Scott says a message was sent, get-in-the-room confirms it in scott@reasinger.net:Sent before logging.
Source: (Pass 1 GIR-14, skill-get-in-the-room.md L362: "**Send confirmation (send-then-log):** after Scott says sent, confirm it in `scott@reasinger.net:Sent` before logging."; Pass 2 SEND-CONFIRM-IN-SENT, same line and quote, plus L218)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #21, #22

Rule ID: RB-SP-6
Statement: New-sender deliverability (first mcptest send landed in Gmail spam despite SPF, DKIM and DMARC passing) is not a server issue because Spark sends; note only.
Source: (Pass 1 DES-65, 01-design-v0.2.md L179: "| R8 | New sender reputation: first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass | Not a server issue (Spark sends). Live accounts have history. Note only. |"; Pass 2 SEND-DELIVERABILITY-NOTE, same line and 02-spike-results.md L74: "Cause is a new sender with a one-line body, not the build.")
Type: tracking-only check
Confidence: high

## Flags and actions (pin, archive)

Rule ID: RB-FA-1
Statement: The action tool supports pin / unpin (\Flagged), read / unread (\Seen), archive (move to Archive) and move (to a named folder); no send and no permanent delete.
Source: (Pass 1 DES-42, 01-design-v0.2.md L121: "| `action` | `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to Archive), `move` (to named folder). No `send`, no permanent delete. |"; Pass 2 TOOL-ACTION, same line and quote)
Type: definition
Confidence: PROVISIONAL, see Ambiguity #40

Rule ID: RB-FA-2
Statement: In Part B the triage never deletes, moves to trash, unsubscribes, sends or unpins.
Source: (Pass 1 ECF-14, skill-email-crap-filter.md L79: "Never delete, move to trash, unsubscribe, or send. Never unpin."; Pass 2 ECF-B-FORBIDDEN-ACTIONS, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #40

## Bounce sweep

Rule ID: RB-BS-1
Statement: Bounce sweep step 1: call emails on scott@reasinger.net:Inbox with filter "from:mailer-daemon newer_than:3d", then again with "from:postmaster newer_than:3d".
Source: (Pass 1 ECF-04, skill-email-crap-filter.md L33-L35: "`Spark__emails` with `folder: \"scott@reasinger.net:Inbox\"`, `filter: \"from:mailer-daemon newer_than:3d\"`, then again with `filter: \"from:postmaster newer_than:3d\"`."; Pass 2 ECF-C-EMAILS-CALLS, same lines and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #46, #44, #24

Rule ID: RB-BS-2
Statement: Bounce sweep step 2: call search with query "delivery failed undeliverable address not found", in "scott@reasinger.net", filter "newer_than:3d", keeping only real delivery-failure notices.
Source: (Pass 1 ECF-05, skill-email-crap-filter.md L36-L38: "`Spark__search` with `query: \"delivery failed undeliverable address not found\"`, `in: \"scott@reasinger.net\"`, `filter: \"newer_than:3d\"`. Keep only real delivery-failure notices (ignore normal mail the search also returns)."; Pass 2 ECF-C-SEARCH-CALL, same lines and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #23, #24

Rule ID: RB-BS-3
Statement: Bounce notices are not archived by the triage run; Scott or the send block clears them after logging.
Source: (Pass 1 ECF-08, skill-email-crap-filter.md L45: "Do not archive bounces; Scott or the send block clears them after logging."; Pass 2 ECF-C-NO-ARCHIVE-BOUNCES, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-BS-4
Statement: email-crap-filter runs its passes in fixed order: Part C (bounce sweep, scott@reasinger.net) first, then Part B (business inboxes), then Part A (Gmail).
Source: (Pass 1 ECF-01, skill-email-crap-filter.md L8-L17: "Three passes, always in this order:" / "**Part C, Bounce sweep (Spark, scott@reasinger.net).** First, because a bounce kills an outreach touch silently."; Pass 2 ECF-PART-ORDER, same lines and quotes)
Type: sequencing
Confidence: high

## Failure and unreachability

Rule ID: RB-FU-1
Statement: Fail loudly, per host: a failure on one cPanel host never silently hides results from the other, and every response states which accounts were reached.
Source: (Pass 1 DES-13, 01-design-v0.2.md L54: "**Fail loudly, per host.** A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached."; Pass 2 FAIL-PER-HOST-LOUD, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-FU-2
Statement: When business-mailbox access is unavailable, email-crap-filter runs Part A only, reports Parts C and B as not run, puts "Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)" as the first report line, and never treats the run as clean.
Source: (Pass 1 ECF-03, skill-email-crap-filter.md L19-L23: "If they are absent or the computer is unreachable, run Part A only and put \"Business inboxes and bounces NOT checked: Spark unreachable (computer asleep or Spark closed)\" as the first line of the report. Never treat that as a clean run."; Pass 2 FAIL-SKILL-UNREACHABLE-BRANCH, same lines and L257: "Spark unreachable: run Part A, report Parts C and B as not run (notify).")
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #33, #34

Rule ID: RB-FU-3
Statement: When mail access is unavailable, get-in-the-room says so, writes the note into the build file, gives Scott the text to paste, and never falls back to a Gmail draft.
Source: (Pass 1 GIR-16, skill-get-in-the-room.md L364: "**Spark unreachable** (computer asleep, app closed): say so, write the note into the build file, and give Scott the text to paste. Never fall back to a Gmail draft."; Pass 2 FAIL-GITR-UNREACHABLE, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #33

Rule ID: RB-FU-4
Statement: Scheduled skills call availability first and push-notify on any host failure.
Source: (Pass 1 DES-75, 01-design-v0.2.md L215: "Alerting: scheduled skills call `availability` first and push-notify on any host failure."; Pass 2 FAIL-ALERT-PREFLIGHT, same line and L116: "Used as a preflight by scheduled skills.")
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #35

Rule ID: RB-FU-5
Statement: On scheduled runs, push-notify if and only if the run produced at least one bounce, Career, Review Now (including founder lead), Finance-Legal or Needs Human Decision item, or any part failed or mail access was unreachable; otherwise stay silent.
Source: (Pass 1 ECF-20, skill-email-crap-filter.md L246-L251: "send a push notification if and only if the run produced at least one bounce, Career, Review Now (including a founder lead), Finance-Legal, or Needs Human Decision item, or if any part failed or Spark was unreachable."; Pass 2 ECF-SCHEDULED-NOTIFY, same lines and "If the run found only Noise and Low Priority, stay silent.")
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #34

Rule ID: RB-FU-6
Statement: D6 leaning: after cutover the Spark path is kept as a fallback for 30 days.
Source: (Pass 1 DES-59, 01-design-v0.2.md L166: "| D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |"; Pass 2 CUTOVER-SPARK-FALLBACK, same line and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #32

## Logging and operations

No entry. Both passes found the logging and secrets-rotation rules, but their type labels differ, so they are in the ambiguity log (#75, #91, #92). The "message bodies are never logged" rule is RB-AS-6.

## Testing and acceptance

Rule ID: RB-TA-1
Statement: Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature.
Source: (Pass 1 DES-02, 01-design-v0.2.md L17: "Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature."; Pass 2 GOAL-SUCCESS-TEST, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-TA-2
Statement: IMAP parser tests run against recorded real responses from the mcptest mailbox, to cover response shapes the prototype did not see (large literals, unusual FETCH shapes).
Source: (Pass 1 DES-60, 01-design-v0.2.md L172: "Residual risk: our IMAP parser meets server responses the prototype did not see (large literals, unusual FETCH shapes). Mitigation: parser tests against recorded real responses from mcptest."; Pass 2 TEST-PARSER-RECORDED, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-TA-3
Statement: Acceptance compares the server's thread output to Spark's thread view on sampled threads.
Source: (Pass 1 DES-62, 01-design-v0.2.md L176: "| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |"; Pass 2 ACCEPT-THREAD-COMPARE, same line and quote)
Type: tracking-only check
Confidence: PROVISIONAL, see Ambiguity #71

Rule ID: RB-TA-4
Statement: The build has one test per requirement ID.
Source: (Pass 1 DES-69, 01-design-v0.2.md L202: "Build to spec. One test per requirement ID;"; Pass 2 TEST-ONE-PER-REQ, same line: "Build to spec. One test per requirement ID")
Type: structural gate
Confidence: high

Rule ID: RB-TA-5
Statement: Integration tests run against a dedicated test mailbox on cPanel A, never against live inboxes.
Source: (Pass 1 DES-70, 01-design-v0.2.md L202: "integration tests against a dedicated test mailbox on cPanel A, never against live inboxes."; Pass 2 TEST-NEVER-LIVE, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #65

Rule ID: RB-TA-6
Statement: Acceptance parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server; results must match (same messages found, same bounces, same pins applied) with differences explained.
Source: (Pass 1 DES-71, 01-design-v0.2.md L207: "Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server. Results must match (same messages found, same bounces, same pins applied) with differences explained."; Pass 2 ACCEPT-PARALLEL-RUN, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #70

Rule ID: RB-TA-7
Statement: Get-in-the-room acceptance: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient.
Source: (Pass 1 DES-72, 01-design-v0.2.md L208: "Get-in-the-room: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient."; Pass 2 ACCEPT-GITR-DRAFTS, same line and quote)
Type: structural gate
Confidence: high

Rule ID: RB-TA-8
Statement: The spike results file ends with a blank pass-criteria results table (checks 1 to 5, no results), separate from the filled status table above it.
Source: (Pass 1 SPK-10, 02-spike-results.md L80-L94: "Pass criteria from design section 10:" / "| Check | Result |" / "| 1 | |"; Pass 2 SPIKE-RESULTS-TABLE-BLANK, same lines and quotes)
Type: tracking-only check
Confidence: PROVISIONAL, see Ambiguity #66

Rule ID: RB-TA-9
Statement: Cutover: skills switch tool prefix to this server, and the Spark path becomes the fallback per D6.
Source: (Pass 1 DES-73, 01-design-v0.2.md L209: "Cutover: skills switch tool prefix; Spark path becomes fallback per D6."; Pass 2 CUTOVER-PREFIX-SWAP, same line and quote)
Type: sequencing
Confidence: PROVISIONAL, see Ambiguity #32

## Other

Rule ID: RB-OT-1
Statement: The Worker comprises an OAuth provider (workers-oauth-provider, single allowed principal), a Spark-compatible tool layer, a Gmail-style to IMAP SEARCH filter translator, a stable-ID codec, an account registry (3 accounts, 2 hosts, folder maps) and a minimal IMAP client on cloudflare:sockets over TLS 993.
Source: (Pass 1 DES-17, 01-design-v0.2.md L64-L70: "|-- OAuth provider (workers-oauth-provider), single allowed principal" / "|-- IMAP client (minimal, on cloudflare:sockets, TLS 993)"; Pass 2 HOST-COMPONENTS, same lines: "|-- Tool layer (Spark-compatible schema)" / "|-- Account registry (3 accounts, 2 hosts, folder maps)")
Type: definition
Confidence: high

Rule ID: RB-OT-2
Statement: Hosting is Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net with hardware-key 2FA, isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.
Source: (Pass 1 DES-18, 01-design-v0.2.md L77: "Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts."; Pass 2 HOST-DEDICATED-CF-ACCOUNT, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #73

Rule ID: RB-OT-3
Statement: Build sequence: design reviewed (done); spike and design v0.2 (done); rule extraction producing docs/rule-base.md and docs/ambiguity-log.md; Scott resolves the ambiguity log; write-spec-from-resolutions producing docs/spec.md with every requirement cited; build to spec; deploy to the dedicated Cloudflare account and add as a claude.ai custom connector.
Source: (Pass 1 DES-68, 01-design-v0.2.md L197-L203: "4. Scott resolves the ambiguity log." / "7. Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector."; Pass 2 BUILD-SEQUENCE and HOST-DELIVERY-SEQUENCE, 01-design-v0.2.md L197-L203: "5. write-spec-from-resolutions. Output `docs/spec.md`, every requirement cited to a rule or resolution." and L203: "Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector.")
Type: sequencing
Confidence: high

Rule ID: RB-OT-4
Statement: The server does not implement Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability.
Source: (Pass 1 DES-05, 01-design-v0.2.md L23: "Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them."; Pass 2 NG-NO-SPARK-ONLY-FEATURES, same line and quote)
Type: structural gate
Confidence: PROVISIONAL, see Ambiguity #37

Rule ID: RB-OT-5
Statement: Any reply turns the contact warm and is answered the same day, so replies must be found in the business inbox and a reply drafted that day.
Source: (Pass 1 GIR-18, skill-get-in-the-room.md L262: "**Any reply turns the contact warm:** answer the same day, deliver what the close offered, then the choice close."; Pass 2 GITR-REPLY-SAME-DAY, same line and quote)
Type: other
Confidence: PROVISIONAL, see Ambiguity #31
