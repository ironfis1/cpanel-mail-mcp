# cpanel-mail-mcp: Design

Status: DRAFT v0.1 (2026-11-01)
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

## 4. Context

### 4.1 Mailboxes

| Mailbox | Host | Used by |
|---|---|---|
| scott@reasinger.net | cPanel A (reasinger.net) | crap-filter Part B and C, get-in-the-room |
| scott@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |
| founders@yourcigardenindy.com | cPanel B (yourcigardenindy.com) | crap-filter Part B |

Two hosts, three logins. Hosts may differ in folder naming (`INBOX.Sent` vs `Sent`).

### 4.2 Current Spark calls by skill

| Skill | Calls |
|---|---|
| email-crap-filter | `emails` (folder, filter, page_size), `search` (query, in, filter), `thread`, `action pin`, `action archive` |
| get-in-the-room | `draft` new, `draft reply_to`, `draft reply_all`, `draft forward`, `draft edit`, `draft delete`; `emails` on Inbox and Sent with filters; `search` |
| gatekeeper-panel | None directly. Assumes the draft body carries no signature because Spark appends one. |

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
   |-- IMAP client (imapflow over TLS 993)
   v
cPanel A IMAP          cPanel B IMAP
```

### 6.1 Hosting

Primary: Cloudflare Workers in a new, dedicated Cloudflare account owned by scott@reasinger.net, with hardware-key 2FA. Isolated from the sreasinger@gmail.com and scott@yourcigardenindy.com Cloudflare accounts.

Feasibility gate (spike, before spec freeze): `imapflow` must connect, log in, SELECT, SEARCH, FETCH and APPEND on the Workers runtime against both hosts. If it does not run cleanly within a timeboxed hour, the same code deploys as a Node service on Fly.io or a small VPS. The rest of this design is unchanged by that choice except 6.4.

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
signature: <per-account signature, see D1>
folders: discovered at first connect, cached, overridable
```

Folder discovery uses IMAP LIST and SPECIAL-USE flags (`\Sent`, `\Drafts`, `\Archive`, `\Trash`) where the server advertises them, falling back to name matching. The logical names `Inbox`, `Sent`, `Drafts`, `Archive` map to real names per account.

### 6.4 Connection model

One IMAP session per account per request, opened lazily, closed at request end. No persistent connections (Workers cannot hold them; this also keeps behavior identical on Fly). Parallel across accounts, sequential within an account.

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

## 8. Open decisions

| ID | Decision | Options | Leaning |
|---|---|---|---|
| D1 | Signature handling | (a) Server appends the per-account signature to every draft body; skills keep sending signature-free bodies. (b) Skills include the signature in the body. (c) Rely on Spark adding it at send. | (a), pending spike check of (c): whether Spark appends a signature when sending a draft it did not create. If Spark does append, (a) prints it twice. |
| D2 | Hosting | Workers vs Fly/VPS | Workers if the spike passes |
| D3 | OAuth upstream identity | GitHub (ironfis1), Google, Cloudflare Access | GitHub, single allowed login |
| D4 | Forward format | Inline quote vs .eml attachment | Inline quote (matches touch-7 behavior) |
| D5 | Archive folder | Use existing Archive if present on both hosts, else create | Verify in spike |
| D6 | Scheduled-task fallback | Keep Spark path as fallback after cutover, or remove | Keep Spark as fallback for 30 days |

## 9. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | imapflow does not run on Workers | Timeboxed spike; Fly/VPS fallback with same code |
| R2 | cPHulk blocks cloud egress IPs | No retry on auth failure; stable egress (Fly static IP) if blocks occur |
| R3 | Spark does not show IMAP-appended drafts promptly, or treats them differently | Spike verifies Drafts sync and send from Spark on desktop and laptop |
| R4 | Credential compromise exposes both businesses' mail | Dedicated CF account with hardware 2FA, unique mailbox passwords, single-principal OAuth, no send capability |
| R5 | Thread reconstruction differs from Spark's view | Acceptance compares thread output to Spark on sampled threads |
| R6 | cPanel connection limits per account | One session per account per request; sequential within account |

## 10. Spike plan (feasibility gate)

Timebox: one working session. Pass criteria:

1. imapflow on Workers: login, LIST, SELECT, SEARCH, FETCH, APPEND, STORE flags, MOVE against both hosts.
2. Folder names and SPECIAL-USE flags recorded for all three accounts.
3. A draft appended over IMAP appears in Spark (desktop and laptop) within one sync cycle, threads correctly as a reply, and sends correctly.
4. D1 check: does Spark append the account signature when sending that draft?
5. `\Flagged` displays as pinned in Spark. Archive move shows as archived.

Outcome recorded in `docs/spike-results.md` and folded into the design before rule extraction.

## 11. Build process

1. This design doc (v0.1), reviewed by Scott.
2. Spike; update design with results (v0.2).
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
