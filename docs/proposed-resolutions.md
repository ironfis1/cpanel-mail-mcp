# cpanel-mail-mcp: Proposed resolutions for the ambiguity log

Status: PROPOSAL for Scott's review (2026-11-01). Covers all 110 items in docs/ambiguity-log.md. Nothing here is applied until Scott approves; approved lines get copied into each item's Resolution field.

Inputs: ambiguity-log.md, design.md v0.2, spike-results.md, extraction/source-pack.md, plus the settled facts D1 (server signs), D2 (Workers, native-socket client, no Fly/VPS), no send and no SMTP in v1, never test against live inboxes (mcptest@reasinger.net is the test mailbox), and observed Spark send behavior.

New evidence used: the live Spark connector tool schemas (`Spark__draft`, `emails`, `search`, `action`, `thread`) were read as schema only, with no call made against any mailbox. They settle several "what shape does Spark use" questions, so drop-in compatibility is now concrete rather than guessed. Key facts from those schemas:

- `draft`: `to`, `cc`, `bcc` are arrays. `reply_to`, `reply_all`, `forward`, `edit`, `delete` each take a message ID as their own key. `reply_to` and `reply_all` are mutually exclusive. `reply_to` addresses the sender, or the Reply-To address when present. `reply_all` puts the other To recipients in To and the original Cc in Cc, minus your own address; `to`/`cc` override. `delete` must be the only parameter and is permanent (no Trash). The response echoes the composed body including signature. `mode: "signatures"` lists each account's signature.
- `emails`: `folder`, `filter`, `page` (1-based page number, not a cursor), `page_size` (default 50), `order`.
- `search`: `query` is hybrid keyword plus semantic, up to 20 results with full bodies, sorted by relevance. Without `query` it lists across all folders, excluding Trash, Spam and Blocked. `in` takes an account or `<account>:<Folder>`; omitted means all.
- `action`: `action_name` plus `message_ids` (array).
- `thread`: `message_id`; returns every message with full plain-text bodies.

Principles applied: drop-in compatibility with the Spark shapes the skills already call; least privilege; fail loudly and per host; nothing silently dropped; simplest rule a test can check; where a skill and the decided design disagree, the design wins and the skill text is updated at cutover.

## 1. Summary

| Bucket | Meaning | Count |
|---|---|---|
| S | Scott decides | 8 items (7 decisions; #14 and #15 are one decision) |
| R | Recommended, approve in bulk | 65 |
| M | Mechanical, approve in bulk | 37 |
| Total | | 110 |

Shared decisions (one resolution covers every item in the group):

| Group | Items | Shared resolution in |
|---|---|---|
| Server signature behavior | 1, 2, 3, 6, 90 | #1 (M) and #3 (R) |
| YCD signatures and drafts | 4, 57, 108 | #4 (S) |
| Forward shape (touch 7) | 14, 15 | S-3 |
| Edit semantics | 19, 20, 56, 86, 105 | #19, #20, #56 (R) |
| Fallback and unreachable branch | 32, 33, 34, 103 | S-5, then #33, #34 (R) |
| Bounce search | 23, 24, 30, 106 | #23, #24, #30 (R) |
| Finding the sent copy | 21, 22, 88 | #21 (R) |
| availability and accounts tools | 35, 36, 37, 38 | #35 (M), #36 to #38 (R) |
| Trash and Junk | 40, 61 | #40 (R) |
| cPanel B verification and Archive | 41, 42, 64, 65, 68 | #65 (R) |
| Spike gate and laptop check | 66, 67, 89 | #66, #67 (R) |
| Snippet and bounce body parts | 25, 26, 95 | #25, #26 (R) |
| search scope and `in` | 47, 48 | #47 (R) |
| Draft parameters follow Spark schema | 13, 53, 54, 55 | #13 (R) |

---

## 2. S: needs Scott

### S-1. Item #4: Signatures for scott@yourcigardenindy.com and founders@yourcigardenindy.com (also settles #57, #108)

Question: The server signs every draft, but only the scott@reasinger.net signature text exists in the sources. What should the two Your Cigar Den Indy accounts append, and does the gatekeeper check (which requires reasinger.net and LinkedIn) apply to those drafts?

Options:
- (a) Scott supplies the exact text for each YCD account (he can copy it from Spark settings, or Claude can read it with Spark's `draft mode: "signatures"`, which is read-only). YCD drafts are supported in v1. The gatekeeper panel stays job-search only, so its reasinger.net check never sees YCD drafts.
- (b) YCD accounts append no signature in v1; YCD drafts are supported but go out unsigned until text is supplied.
- (c) YCD draft operations are out of v1 (server serves YCD for triage only, per the design table).

Recommendation: (a). It is the only option where founder and YCD outreach works at cutover and is signed, and the registry already has a per-account signature field. The server refuses a draft on an account whose signature is unset rather than sending it unsigned silently.

### S-2. Item #8: Where the signature goes in a reply or forward

Question: In a reply or forward, does the server put the signature directly under Scott's new text (above the quoted original), or at the very bottom below the quoted thread?

Options:
- (a) Under Scott's text, above the quoted original. This is the Spark, Gmail and Outlook default for replies.
- (b) At the very bottom, below the quoted original.

Recommendation: (a). Recipients expect it there, and it keeps the signature next to the text the gatekeeper panel approved.

### S-3. Items #14 and #15: Touch-7 forward format, recipients and threading (D4)

Question: How should a forward look? Three linked choices: inline quote or .eml attachment; who it goes to, since the touch-7 call passes no `to`; and whether it carries threading headers.

Options:
- (a) Inline quote. `to` is required on a forward; the skill passes the contact address it already used to find the original (`to:<address>`). The server sets In-Reply-To and References from the original so it threads with touch 1 in the recipient's client. Missing `to` is an error. Skill line L359 updated at cutover.
- (b) Inline quote. If `to` is omitted and the original is in Sent, default the recipients to the original's To and Cc. Same threading headers as (a).
- (c) Inline quote, no recipient set (what Spark does today when `to` is omitted); Scott fills in the recipient in Spark before sending. No threading headers.

Recommendation: (a). Explicit recipients are the simplest rule a test can check, the skill already knows the address, and threading the bump onto touch 1 is the point of touch 7. Attachment format is rejected: it hides the original behind a click.

### S-4. Item #16: Touches 9 and 10, new drafts or replies on the touch-1 thread

Question: Touch 9 ("quick question") and touch 10 ("curious?") have their own subjects. Are they new drafts, or replies on the touch-1 thread?

Options:
- (a) New drafts with their own subject (as the cadence table reads). No subject override on replies.
- (b) `reply_to` on touch 1 with a new `subject` parameter that overrides the Re: rule, so they thread but show the new subject.
- (c) `reply_to` on touch 1 keeping "Re: <touch-1 subject>"; the cadence subjects become first lines instead.

Recommendation: (a). It matches the skill text and Spark's own schema, needs no new parameter, and touch 7 already does the threaded bump.

### S-5. Item #32: D6, keep Spark as a 30-day fallback or remove the branch (settles #33, #34, #103 wording)

Question: After cutover, when the server is unreachable, should skills fall back to the Spark connector automatically, or just report failure?

Options:
- (a) Remove the Spark branch from the skills. Keep the Spark connector installed for 30 days as a manual revert only (swap the tool prefix back by hand if the server fails badly).
- (b) Automatic fallback for 30 days: if the server is unreachable, the skill tries Spark.
- (c) Keep Spark as the primary for get-in-the-room drafting and use the server only for scheduled triage.

Recommendation: (a). Automatic fallback re-creates the PC dependency the project removes, can double-apply pins and archives, and mixes two ID spaces (a server draft ID means nothing to Spark, see #18).

### S-6. Item #70: Parallel-run method on live inboxes

Question: The acceptance plan runs email-crap-filter against both Spark and the server for 7 days on the same live inboxes. If both paths pin and archive, the second run sees the first run's actions and live mail is acted on twice. How should the parallel run work?

Options:
- (a) Shadow mode: for days 1 to 5 Spark acts and the server path reads and classifies but only reports the IDs it would pin or archive (a skill-level dry-run flag; no server feature). Compare sets. For days 6 and 7, flip: the server acts and Spark shadows.
- (b) Alternate: Spark acts at 6am, server acts at noon, compare each against the other's prior state.
- (c) Both act on every run; compare reports only.

Recommendation: (a). Live mail is acted on exactly once per run, the comparison is a clean set diff, and both write paths are still exercised before cutover.

### S-7. Item #72: D3, OAuth identity provider and token lifetimes

Question: Which identity does the connector's OAuth check against, and how long do tokens last (this sets how often scheduled tasks need re-auth)?

Options:
- (a) GitHub, single allowed login ironfis1. Access token 1 hour; refresh token 90 days, rotated on each use; revoke by deleting the grant.
- (b) Google (a single allowed Google account). Same lifetimes.
- (c) Cloudflare Access in front of the Worker, with the OAuth provider issuing tokens behind it.

Recommendation: (a). The repo already lives under ironfis1, it keeps Google identity separate from the mail it protects, and 90-day rotating refresh means scheduled runs rarely stall on re-auth.

---

## 3. R: recommended

| # | Topic | Proposed resolution |
|---|---|---|
| 3 | Doubled-signature guard | Before signing, the server strips a trailing copy of the account's exact signature (whitespace-normalized) from the body, then appends once. Edit with no new body re-derives the body from the stored draft minus its signature. Test: resubmitting a signed body yields exactly one signature. |
| 5 | Signature source of truth (R7) | Server config is the source of truth for every automated draft; Spark settings apply only to mail Scott composes by hand. A unit test asserts the reasinger.net config string equals the gatekeeper check-file line. README: a signature change updates config, Spark settings and the two skill lines together. |
| 6 | "Draft body carries no signature" | Means the body the skill sends to the server, not the stored draft. The stored draft carries the server signature. Design L46 and gatekeeper L7 and L48 reworded at cutover. |
| 7 | Signature rendering exactness | Signature bypasses markdown. Text part: the exact configured string. HTML part: the same string HTML-escaped in its own block, with the URL as a link whose visible text is identical. The `draft` response echoes the composed text body with signature (Spark parity), so the skill can diff it against the check file. |
| 9 | "Never sreasinger@gmail.com" | Means never in outreach, as signature content or as sending account. Server side: Gmail is not a configured account, and a config test fails if any signature contains sreasinger@gmail.com. |
| 10 | Gatekeeper says phone but does not test it | Skill-side fix at cutover: check.py also requires 317-460-0736 in the signature line. No server behavior. |
| 11 | Conditional send on Scott's request | No send in v1, no Spark-fallback send. The skill exception is removed at cutover; Claude tells Scott the draft is in Spark and he sends it. |
| 12 | Draft APPEND flags | `\Draft \Seen`, as verified in the spike, so new drafts never show unread. Design L147 updated. |
| 13 | Reply and reply-all recipients, Re: (also #53, #54, #55) | Mirror Spark's schema: `reply_to` goes to Reply-To if present else From; replying to a message from Scott's own account goes to that message's To. `reply_all` puts the sender plus other To recipients in To and original Cc in Cc, minus the account's own address; `to`/`cc` override. Add `Re:` only if the decoded subject does not already start with Re: (case-insensitive). |
| 17 | Thread scope and subject fallback | Threads span Inbox, Sent and Archive of the same account. Link by References, then In-Reply-To; subject fallback only for messages with no header link: same normalized subject (repeatedly strip Re:, Fwd:, Fw:, case-insensitive) and a shared participant within 60 days. Ordered by date. |
| 18 | Draft ID handed to Scott | Hand Scott the server ID plus account, recipient and subject (what he sees in Spark). The ID is for later server edit or delete only; it is not valid in the Spark connector (one reason for S-5 option a). |
| 19 | Edit changes the draft ID (also #105) | Edit keeps the draft's Message-ID, so a pre-edit ID still resolves through the Message-ID fallback in Drafts. Edit returns the new ID and the skill stores it. Test: edit, then edit or delete with the old ID, both succeed. |
| 20 | Edit inputs | Patch semantics: fields omitted are kept; supplied `to`/`cc`/`bcc` replace that list; supplied `body` replaces the body whole and is re-signed. Threading headers are always preserved. |
| 21 | Finding the sent copy (also #22, #88) | No new tool. The skill calls `emails` on `<drafting account>:Sent` with `to:<address> newer_than:2d` and matches on recipient plus normalized subject; the Touches Date comes from the Sent copy. Skill L362 updated to name the drafting account's Sent, not always reasinger.net. |
| 22 | Sent checks name only reasinger.net | Covered by #21 for send confirmation. For the crap-filter replier check, check the Sent folder of the account that received the reply. Skill L71 updated at cutover. |
| 23 | Multi-word search semantics | Spark's `query` is semantic, which IMAP cannot do. Closest drop-in: `query` words are ORed TEXT terms, newest first, capped at 20 like Spark; `filter` tokens stay ANDed. The skill already discards non-bounce hits. The parallel run (S-6) compares bounce sets. |
| 24 | Two bounce call patterns (also #106) | One canonical bounce check: crap-filter's three calls (mailer-daemon, postmaster, search). get-in-the-room's bounce line is rewritten at cutover to point to that check. |
| 25 | Snippet derivation (also #95) | First 200 characters of the decoded text/plain part (HTML stripped if no text part), whitespace collapsed, from a partial BODY.PEEK fetch. For multipart/report, the snippet starts with the delivery-status Final-Recipient and Diagnostic-Code. |
| 26 | Thread bodies for bounces | `thread` includes the text of message/delivery-status parts and the headers (From, To, Subject, Date) of an embedded message/rfc822 original, not that original's body. |
| 27 | emails paging | Mirror Spark: `page` (1-based) and `page_size`, default 50, max 100 honored in one page, `order` default descending by date. Every response states whether more pages exist; the skill pages until none. Design "paging cursor" changed to page number. |
| 29 | "Already replied" source | The `\Answered` flag in returned flags (Spark sets it on reply from any device). The skill reports "replied" when it is set. |
| 30 | Bounces in YCD inboxes | Part C runs its bounce calls on all three Inboxes, not only reasinger.net. Part B keeps skipping bounces everywhere. Skill change at cutover. |
| 31 | How get-in-the-room detects replies | crap-filter Part B is the detector (replies pin as Review Now). When working a company, get-in-the-room also checks `emails` on the account Inbox with `from:<contact>`. No new server behavior. |
| 33 | Unreachable branch on the server path | Follows S-5. Trigger: server tools absent or every account failed. First line: "Business inboxes and bounces NOT checked: mail server unreachable (<accounts>)". get-in-the-room: say so, write the note to the build file, give paste text, never a Gmail draft. |
| 34 | Partial reachability | Run every reachable account. The report's first line names each unreached account and host; that counts as "a part failed" and triggers the notification. A cPanel B outage never suppresses the reasinger.net bounce sweep. |
| 36 | availability per host vs per account | Per account: login plus SELECT INBOX for each of the three accounts, results grouped by host. |
| 37 | availability name collision | Keep `availability` as the server health tool. Design L23 reworded to "calendar availability", the Spark feature that is excluded. |
| 38 | accounts live vs cached | `accounts` is static config only (no login). `availability` is the only live check. Fewer logins, less cPHulk exposure. |
| 39 | action batching | Mirror Spark: `action_name` plus `message_ids` array. Mixed accounts allowed, grouped per account internally. Result is per ID; a host failure fails only that host's IDs, named. |
| 40 | Trash as move target (also #61) | `move` and `archive` refuse Trash, Junk and Drafts as targets in v1 (no skill needs them). Trash and Junk stay readable by logical name in `emails` and `search`. |
| 42 | Archive move not exercised | Integration test on mcptest: archive move, then a manual check that Spark desktop shows it archived. cPanel B per #65. |
| 43 | ID lookup fallback | Fallback runs when UIDVALIDITY differs or the UID is gone. Search the Message-ID in the encoded folder, then Archive, Inbox, Sent, Drafts. No match: not-found error. More than one match in the same folder: ambiguity error. Never guess. |
| 44 | Filter combination, OR, negation | Tokens AND together. No OR, no negation, no quoting in v1; any of them, or any token outside the supported table, is an error naming the token. |
| 45 | newer_than granularity | Date-granular IMAP SINCE in America/Indianapolis, unit `d` only. Over-inclusion (up to a day) is accepted and documented; it never drops mail. Parallel-run differences from this are explained, not failures. |
| 46 | from: matching | IMAP FROM: case-insensitive substring over the whole From header, display name included. Integration test with a "MAILER-DAEMON" display name and a postmaster@ address. |
| 47 | search folder scope (also #48) | Mirror Spark: all folders of the scoped account(s) except Trash and Junk. `in` accepts an account or `<account>:<Folder>`; omitted means all accounts. |
| 48 | search `in` shape and default | Covered by #47. |
| 49 | Sent lookup reach for touch 7 | `emails` has no default lookback; without a date token it pages the whole folder newest first, so `to:<address>` reaches a 10-day-old message. |
| 50 | Action per message vs thread | Per message, as Spark's `message_ids` takes messages. The parallel run compares by message. |
| 51 | Which Part A rules carry into Part B | Part B inherits safety-term never-archive, snippet-first classification and read-and-unread in scope. Skill text clarified at cutover; no server behavior. |
| 52 | Draft delete | Mirror Spark: `delete: <id>` alone, permanent. Server: STORE `\Deleted` then UID EXPUNGE on that UID only; if the host lacks UIDPLUS, refuse rather than a plain EXPUNGE. Account comes from the ID. |
| 53 | New-draft parameters | Mirror Spark: `to`, `cc`, `bcc` are arrays of addresses. |
| 54 | Reply `account` vs ID account | `account` is optional on reply, forward, edit and delete. If given and different from the ID's account, error; never create in the wrong mailbox. |
| 55 | reply_all shape | Mirror Spark: `reply_all: <message ID>` as its own key, mutually exclusive with `reply_to`. |
| 56 | Edit failure ordering | Append the new version first, then delete the old. If the delete fails, return the new ID plus a loud warning naming the leftover old draft ID. Never delete first. |
| 57 | YCD draft operations in v1 | Yes, all three accounts; the design table is incomplete. Signature per S-1. |
| 58 | Scope of drop-in compatibility | The tools and parameters the skills call, with shapes matching Spark's schema for those. Behavior that differs (signature, send, sent lookup, edit ID) is documented and the skill text updated at cutover. |
| 59 | Timeout values | Every network step has a timeout: TCP plus TLS 10 s, greeting 5 s, login 10 s, each command 15 s, APPEND 30 s. A timeout fails that account loudly, never the whole call. Tested with the silent-server fake. |
| 60 | Concurrent sessions to cPanel B | Parallel across hosts, sequential within a host. The two YCD accounts run one after the other (about 750 ms extra). |
| 61 | Trash and Junk as logical names | Covered by #40: addressable for reading, refused as move targets. |
| 62 | Folder cache | Per request only: LIST runs at each session open (about 47 ms). No persisted cache. Overrides live in static config and replace the discovered mapping for that logical name. |
| 63 | Folder name-match fallback | Only when no folder has the SPECIAL-USE flag: case-insensitive match on the last path segment. Sent: Sent, Sent Items, Sent Messages. Drafts: Drafts. Archive: Archive. Trash: Trash, Deleted Items. Junk: Junk, Spam. Exactly one match or an error that asks for a config override. |
| 64 | cPanel B IMAP host | Action for Scott: read the server hostname from cPanel B's address bar (the server name, not yourcigardenindy.com) and confirm the TLS certificate matches it. One-line config change. |
| 65 | cPanel B verification (also #41, #42, #68) | Action for Scott: create a test mailbox on cPanel B (for example mcptest@yourcigardenindy.com). The same integration suite runs there, covering folders, SPECIAL-USE, Archive and MOVE. Live inboxes are never used. |
| 66 | Spike gate status | Gate passed for build. The open checks (cPanel B, archive move, MOVE, laptop) move to integration tests and acceptance. The blank results table in spike-results.md is a template leftover; remove it at its next edit. |
| 67 | Laptop display check (also #89) | An acceptance gate, not a build gate. The success test already requires the draft on the laptop. |
| 68 | IMAP command set | Required: CAPABILITY, MOVE when advertised, else UID COPY plus STORE `\Deleted` plus UID EXPUNGE (needs UIDPLUS); FETCH BODYSTRUCTURE and partial BODY.PEEK. Capabilities recorded for both hosts in integration tests. |
| 71 | Thread comparison sample | 20 threads across the three accounts, at least 5 containing Scott's sent replies. Pass: same message set in every thread; ordering differences allowed. |
| 73 | Hosting wording and spike account | Drop "Primary" from design 6.1. Action for Scott: confirm the spike's Cloudflare account (scott@reasinger.net, reasinger-ops) is the new dedicated account with hardware-key 2FA. If yes it is production; if not, create it. |
| 75 | Logging subjects, filters, errors | Never log subjects, filter or query strings, or raw server error text. Log filter token names only (for example "from,newer_than") and an error class code. The account ID is logged (it is Scott's own address). |
| 76 | ToolSearch and stale wording after cutover | Skills say "load the cpanel-mail tools (ToolSearch if deferred)". All "Spark" tool references are replaced at cutover, and L7 "sends" is reworded to "Scott sends from Spark". |
| 77 | Secret names for cPanel B | IMAP_PASS_YCD_SCOTT and IMAP_PASS_YCD_FOUNDERS. |
| 78 | Worker bundle and plan | Bundle size is no constraint (4.6 KB gzip). Recommend Workers Paid (USD 5 per month): the free plan's 10 ms CPU limit per request is tight for MIME parsing and markdown rendering. |
| 79 | Compiled filter list | Accept FILTER-SKILL-USES into the rule base as the filter translator's test list. |
| 80 | Skill-internal rules | Keep out of the server spec. Record them as skill-only context in the cutover checklist. |

---

## 4. M: mechanical

| # | Topic | Proposed resolution |
|---|---|---|
| 1 | Who appends the signature | Settled by D1: the server appends. Skill text saying "Spark appends" is updated at cutover. Applies to both passes' rules. |
| 2 | Sign on edit too | Creates or edits (design L153). spike-results.md L78 wording narrowed by mistake; read as creates or edits. |
| 28 | Account on each returned message | Both passes agree: every message object carries `account`. |
| 35 | availability preflight | Both passes agree it is required: scheduled skills call `availability` first, push-notify on any account failure, and continue with the reachable accounts (#34). The skill gains the step at cutover. |
| 41 | D5 Archive auto-create | Both passes take the leaning: never auto-create; a missing Archive is an error. Fix the D5 options text and mark D5 DECIDED. |
| 69 | Protocol tolerance cases | Both passes read them as requirements: LITERAL+ on and off, literal mailbox names, auth failure and silent-server timeout are required tests in the build. |
| 74 | Egress IP whitelisting | Both agree it is not available on Workers. A cPHulk block is cleared by hand. Design L107 reworded to match L173. |
| 81 | Type: goal statement | definition. The tested gate is the power-off success test (#110). |
| 82 | Type: D3 open decision | tracking-only check until S-7 is decided, then definition. |
| 83 | Type: opaque stable ID | definition. |
| 84 | Type: filter token table | definition. Date math is the calculation, covered by #45. |
| 85 | Type: new-draft APPEND | definition (flags per #12). |
| 86 | Type: edit mechanism | sequencing (order matters, #56). |
| 87 | Type: subject build and re-encode | structural gate (a test checks re-encoded non-ASCII subjects). |
| 88 | Type: find sent copy | sequencing (a skill step after the send, per #21). |
| 89 | Type: draft visibility in Spark | structural gate, scoped to acceptance (#67). |
| 90 | Type: signature source of truth | definition (resolved by #5). |
| 91 | Type: logging | Split as Pass 2: LOG-FIELDS definition, LOG-EXCLUSIONS structural gate. |
| 92 | Type: secrets rotation | definition. |
| 93 | Type: protocol tolerance tests | structural gate (#69). |
| 94 | Type: pin and archive display | structural gate, scoped to acceptance. |
| 95 | Type: bounce report fields | definition. |
| 96 | Type: Part B skip pinned and bounces | structural gate (`emails` must expose `\Flagged`). |
| 97 | Type: Sent check for repliers | definition. |
| 98 | Type: pin classes | definition. |
| 99 | Type: archive Noise, no action otherwise | Split as Pass 2: two definitions. |
| 100 | Type: action batching | Split as Pass 2: TOOL-ACTION-BATCH definition, ECF-B-BATCH-CONTINUE sequencing. |
| 101 | Type: already replied | definition. |
| 102 | Type: bounces lead the report | sequencing. |
| 103 | Type: error handling bundling | Split as Pass 2: Gmail-down half sequencing; unreachable half structural gate (substance per S-5 and #33). |
| 104 | Type: lookback config | definition. |
| 105 | Type: edit ID change | definition (per #19). |
| 106 | Type: bounce query mismatch | other (removed by the #24 skill rewrite). |
| 107 | Type: touch email operations | definition. |
| 108 | Type: YCD signatures | tracking-only check until S-1 text is supplied, then definition. |
| 109 | Type: gatekeeper signature check | structural gate (it blocks shipping). |
| 110 | Type: power-off test | structural gate. |
