# cpanel-mail-mcp: Design

Status: DRAFT v0.2 (2026-11-01). v0.2 folds in spike results (docs/spike-results.md).
Owner: Scott Reasinger
Repo: ironfis1/cpanel-mail-mcp

## 1. Problem

Three scheduled or frequently run skills (email-crap-filter, get-in-the-room, gatekeeper-panel by dependency) reach the business mailboxes only through the Spark desktop connector (`mcp__remote-devices__Spark__*`). That connector runs through sarhomepc. If the PC is asleep, off, updating, or Spark is closed, business-inbox triage, the bounce sweep, and outreach drafting stop. email-crap-filter degrades to Gmail-only and flags it; get-in-the-room falls back to pasted text.

The mailboxes themselves live on cPanel servers that are always on. The dependency on the PC is an artifact of the access path, not of the mail.

## 2. Goal

A remote MCP server, hosted in the cloud, that gives Claude the same mailbox operations those skills use today, directly against the cPanel IMAP servers, so no scheduled or interactive email task requires sarhomepc.

Success test: with sarhomepc powered off, the 6am email-crap-filter run completes Parts A, B and C, and a get-in-the-room reply draft appears in Spark on the laptop with correct threading and signature.

## 3. Non-goals (v1)

- Sending mail. No skill sends autonomously. Scott sends from Spark. No SMTP in v1.
- Replacing Spark as Scott's mail client. Spark stays the human interface; this server is the automation path.
- Spark-only features: comments, team sharing, templates, contacts, calendar events, meetings, availability. No skill calls them.
- Gmail. sreasinger@gmail.com stays on the Gmail connector.
- Permanent delete of messages. Draft delete is the only delete in scope.
- Multi-user. One principal: Scott.

## 3a. Alternatives considered (2026-11-01)

| Option | Verdict | Reason |
|---|---|---|
| Fastmail (official remote MCP at api.fastmail.com/mcp, read/write/send scopes) | Rejected | Claude connects one Fastmail login, so all three addresses would collapse into one mailbox; the separate accounts Scott uses in Spark become folders and filters, and email-crap-filter's per-account triage needs rework. Requires MX migration for both domains. Cost is a wash with Workers, and Spark stays either way. |
| Google Workspace | Rejected | Claude's Gmail connector reportedly connects one Google account at a time, already used by sreasinger@gmail.com. |
| Keep cPanel mail, build this server | Chosen | cPanel mail is free with the site hosting that stays regardless. Spike proved the path on the live host. Account structure and Spark setup unchanged. |

## 4. Context

### 4.1 Mailboxes

| Mailbox | Host | Used by |
|---|---|---|
| scott@reasinger.net | cPanel A (server128.web-hosting.com) | crap-filter Part B and C, get-in-the-room |
| scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |
| founders@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |

Two hosts, three logins. cPanel A IMAP host is `server128.web-hosting.com:993` (cPanel suggests `reasinger.net`, which is the web host record; use the server name). cPanel B host still to confirm from that cPanel's address bar. cPanel A folders use the `INBOX.` prefix with `.` delimiter and advertise SPECIAL-USE (spike run 3). A test mailbox, mcptest@reasinger.net, exists on cPanel A for integration tests.

### 4.2 Current Spark calls by skill

| Skill | Calls |
|---|---|
| email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |
| get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |
| gatekeeper-panel | None directly. Assumes the draft body carries no signature and the sent mail carries the account signature. |

The full call shapes in those three SKILL.md files are source material for the rule extraction step.

## 5. Design principles

1. **Drop-in compatibility.** Tool names, parameters, folder addressing (`<account>:Inbox`) and filter grammar mirror the Spark connector. Migrating a skill is a tool-prefix swap plus removing the "Spark unreachable" branch, not a rewrite.
2. **Least privilege.** Read, flag, move, and write to Drafts. Nothing that sends, and nothing that permanently deletes received mail.
3. **Fail loudly, per host.** A failure on one cPanel never silently hides results from the other. Every response states which accounts were reached.
4. **Spark sees everything.** All writes are plain IMAP state (flags, folder moves, Drafts appends) so Spark on any device reflects them without sync tricks.
5. **No secrets in code or logs.** Credentials live only in platform secrets. Message bodies are never logged.

## 6. Architecture

```
Claude (claude.ai / scheduled tasks)
   | MCP over HTTPS (streamable HTTP), OAuth bearer
   v
cpanel-mail-mcp (Cloudflare Worker, CF account: scott@reasinger.net)
   |-- OAuth provider (workers-oauth-provider), single allowed principal
   |-- Tool layer (Spark-compatible schema)
   |-- Filter translator (Gmail-style -> IMAP SEARCH)
   |-- ID codec (stable message IDs)
   |-- Account registry (3 accounts, 2 hosts, folder maps)
   |-- IMAP client (minimal, on cloudflare:sockets, TLS 993)
   v
cPanel A IMAP          cPanel B IMAP
```

### 6.1 Hosting

Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.

Spike result (D2): imapflow times out on the Workers runtime (`ETIMEOUT` after 30 s) even though raw TLS to cPanel succeeds in about 300 ms. The server therefore uses a minimal IMAP client written on `cloudflare:sockets` (prototype: `spike/src/imap.js`). It implements only the commands this design needs. Login is AUTHENTICATE PLAIN with SASL-IR, so password characters need no escaping. Every read has an explicit timeout; no step may hang. Fly.io/VPS is no longer the fallback.

### 6.2 Auth

- MCP clients authenticate with OAuth 2.1 via `workers-oauth-provider`, which claude.ai custom connectors support.
- The upstream identity check allows exactly one principal (Scott). Any other identity is refused at authorize time.
- No authless mode, no shared-secret URL.
- Token lifetimes and the upstream identity provider are an open decision (D3).

### 6.3 Account registry

Static config, one entry per mailbox:

```
id: scott@reasinger.net
host: <cPanel A IMAP host>
port: 993
secret_ref: IMAP_PASS_REASINGER_SCOTT
signature: <exact per-account signature text, appended by the server, see D1>
folders: discovered at first connect, cached, overridable
```

Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`, `\Junk`) where the server advertises them, falling back to name matching only when no folder carries the flag. SPECIAL-USE always wins over name: cPanel A has both `INBOX.spam` (flagged `\Junk`) and `INBOX.Junk` (unflagged); Junk resolves to `INBOX.spam`. The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account.

### 6.4 Connection model

One IMAP session per account per request, opened lazily, closed at request end. No persistent connections. Measured cost (spike run 3): about 750 ms to connect and log in, about 45 ms per command after that, so per-request connect is acceptable and no pooling is needed. Parallel across accounts, sequential within an account.

cPHulk risk: repeated failed logins from a cloud IP can block that IP on the cPanel host. Mitigation: on any auth failure, the account is disabled for the remainder of the request and the error says to check the secret; no retries on auth errors. Egress IP whitelisting on both hosts if the hosting option gives a stable egress IP (Workers does not by default; see R2).

## 7. Tool surface (v1)

Names and parameters follow the Spark connector. Exact schemas are set in the spec.

| Tool | Purpose |
|---|---|
| `accounts` | List configured accounts and per-account reachability. |
| `availability` | Health check per host: TCP, TLS, login, SELECT INBOX. Used as a preflight by scheduled skills. |
| `folders` | List folders per account with logical-name mapping. |
| `emails` | List messages in `<account>:<Folder>` with `filter`, `page_size`, paging cursor. Returns ID, from, to, subject, date, snippet, flags. |
| `search` | Free-text query within one or all accounts, plus optional `filter`. |
| `thread` | Return a message and its thread (by References / In-Reply-To / subject fallback) with bodies as text. |
| `action` | `pin` / `unpin` (`\Flagged`), `read` / `unread` (`\Seen`), `archive` (move to Archive), `move` (to named folder). No `send`, no permanent delete. |
| `draft` | Create new, `reply_to`, `reply_all`, `forward`, `edit`, `delete` (draft only). Appends to the account's Drafts folder. |

### 7.1 Message IDs

Spark IDs are opaque to skills, so the server defines its own opaque ID that encodes account, folder, UIDVALIDITY, UID and RFC Message-ID. Lookups use UID when UIDVALIDITY matches and fall back to a Message-ID header search when the message has moved (for example after archive). IDs are stable across calls and across sessions.

### 7.2 Filter grammar

Supported tokens, translated to IMAP SEARCH:

| Token | IMAP |
|---|---|
| `from:x` | `FROM x` |
| `to:x` | `TO x` |
| `subject:x` | `SUBJECT x` |
| `newer_than:Nd` | `SINCE <today-N>` |
| `older_than:Nd` | `BEFORE <today-N>` |
| `is:unread` / `is:read` | `UNSEEN` / `SEEN` |
| `is:pinned` | `FLAGGED` |
| bare words | `TEXT` |

Unknown tokens are an error, never silently dropped. Date math uses America/Indianapolis.

### 7.3 Drafts and threading

- New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag.
- Reply / reply all: set `In-Reply-To` and `References` from the original, `Re:` subject, recipients from the original per reply mode, quoted original below the body.
- Forward: `Fwd:` subject, original included (inline quote vs attachment is D4).
- Edit: replace by appending the new version and deleting the old draft UID (IMAP has no in-place edit). Returns the new ID.
- Delete: draft-only. Refuse if the target lacks `\Draft` or is not in the Drafts folder.
- Body input is markdown; the server renders multipart text and HTML.
- Signature (D1): the server appends the account's configured signature to every draft it creates or edits. Spark does not add a signature to a draft it did not compose (spike run 3, verified with a default signature assigned to the account). Skills keep sending signature-free bodies.
- Header decoding: subjects and address display names arrive RFC 2047 encoded (`=?UTF-8?B?...?=`). The server decodes all returned header text, and builds `Re:` / `Fwd:` subjects from the decoded subject, re-encoding on write when non-ASCII.
- Spark behavior on send (observed): Spark re-composes the draft, assigns its own `@Spark` Message-ID, keeps `In-Reply-To` and `References`, and sets `\Answered` on the original. The server's draft Message-ID is therefore not the sent Message-ID; anything that must find the sent copy searches Sent by recipient, subject and date, not by the draft's Message-ID.

## 8. Open decisions

| ID | Decision | Options | Leaning |
|---|---|---|---|
| D1 | Signature handling | (a) server appends, (b) skills include, (c) Spark adds at send | DECIDED (spike run 3): (a). Spark does not sign drafts it did not create. Server appends the per-account signature; skills send signature-free bodies, unchanged. |
| D2 | Hosting and IMAP client | Workers vs Fly/VPS | DECIDED (spike run 2): Workers, with a minimal native-socket IMAP client. imapflow times out on the Workers runtime; raw `cloudflare:sockets` TLS to cPanel works. |
| D3 | OAuth upstream identity | GitHub (ironfis1), Google, Cloudflare Access | GitHub, single allowed login. Open. |
| D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior). Open. |
| D5 | Archive folder | Use existing Archive if present, else create | cPanel A: `INBOX.Archive` with `\Archive` exists (spike run 3). cPanel B: verify in integration tests. Never auto-create; a missing Archive is an error. |
| D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |

## 9. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | imapflow does not run on Workers | REALIZED (spike run 2). Replaced with native-socket client. Residual risk: our IMAP parser meets server responses the prototype did not see (large literals, unusual FETCH shapes). Mitigation: parser tests against recorded real responses from mcptest. |
| R2 | cPHulk blocks cloud egress IPs | No retry on auth failure. Workers egress IPs are not stable, so whitelisting is not available; a block means a cPanel unblock by hand. |
| R3 | Spark does not show IMAP-appended drafts promptly, or treats them differently | Spike run 3: drafts appear, thread and send correctly from desktop. Laptop not yet checked. |
| R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |
| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |
| R6 | cPanel connection limits per account | One session per account per request; sequential within account |
| R7 | Signature text exists in two places (Spark settings and server config) and drifts | Open question for the ambiguity log: which is the source of truth and how changes propagate |
| R8 | New sender reputation: first send from mcptest landed in Gmail spam despite SPF, DKIM and DMARC pass | Not a server issue (Spark sends). Live accounts have history. Note only. |

## 10. Spike plan (feasibility gate)

Status: COMPLETE (2026-11-01). Results in docs/spike-results.md. Criteria 1 and 2 passed on cPanel A; cPanel B and archive move are deferred to integration tests. Criteria 3, 4, 5 (pin) passed.

Original pass criteria:

1. imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts.
2. Folder names and SPECIAL-USE flags recorded for all three accounts.
3. A draft appended over IMAP appears in Spark (desktop and laptop) within one sync cycle, threads correctly as a reply, and sends correctly.
4. D1 check: does Spark append the account signature when sending that draft?
5. `\Flagged` displays as pinned in Spark. Archive move shows as archived.

Outcome recorded in `docs/spike-results.md` and folded into the design before rule extraction.

## 11. Build process

1. This design doc (v0.1), reviewed by Scott. DONE.
2. Spike; update design with results (v0.2). DONE.
3. extract-rules-and-flag-ambiguity over design v0.2 plus the email-crap-filter, get-in-the-room and gatekeeper-panel SKILL.md files. Outputs `docs/rule-base.md`, `docs/ambiguity-log.md`.
4. Scott resolves the ambiguity log.
5. write-spec-from-resolutions. Output `docs/spec.md`, every requirement cited to a rule or resolution.
6. Build to spec. One test per requirement ID; integration tests against a dedicated test mailbox on cPanel A, never against live inboxes.
7. Deploy to the dedicated Cloudflare account. Add as a claude.ai custom connector.

## 12. Acceptance and cutover

- Parallel run: 7 days of email-crap-filter at 6am and noon against both Spark and this server. Results must match (same messages found, same bounces, same pins applied) with differences explained.
- Get-in-the-room: at least three real reply drafts and one forward created through the server, sent by Scott from Spark, verified threaded and signed correctly at the recipient.
- Cutover: skills switch tool prefix; Spark path becomes fallback per D6.
- Power-off test: the success test in section 2.

## 13. Operations

- Logging: tool name, account, host, outcome, latency, error class. Never bodies, never credentials, never full addresses of correspondents beyond domain.
- Alerting: scheduled skills call `availability` first and push-notify on any host failure.
- Secrets rotation: mailbox password change means one secret update; documented in README.
