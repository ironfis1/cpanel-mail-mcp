# cpanel-mail-mcp: Ambiguity log (merged from Pass 1 and Pass 2)

Inputs: pass1/rules.md (Pass 1), pass2/rules.md (Pass 2), sources/source-pack.md. Rules are matched by meaning and source citation, not by ID. Pass 1 IDs: DES, SPK, ECF, GIR, GKP, X. Pass 2 IDs: GOAL, NG, ACCT, HOST, IMAP, AUTH, SEC, CONN, FAIL, LOG, COMPAT, TOOL, FOLD, ID, FILTER, DRAFT, SIG, HDR, SEND, ECF-*, GITR, BUILD, TEST, ACCEPT, CUTOVER, SPIKE.

Kind values: "conflict" means the passes read the point differently (statement, substance or rule type). "both flagged" means both passes found the rule(s) and agree, and at least one pass flagged this point as medium or low confidence; those rules sit in rule-base.md as PROVISIONAL. "found by only one pass" means the rule exists in one pass only; it is not in the rule base.

Quote check: every quoted fragment in both passes' Source fields was checked against the cited file and line range in the source pack. All quotes were found; no item carries a "quote not found in source" note.

Ordering: entries 1 to 31 change what Scott sees (signatures, sending, threading, drafts and what a skill gets back); 32 to 43 are failure handling, actions and folders; 44 to 80 are search details, parameter shapes, infrastructure, testing and housekeeping; 81 to 110 are rule-type label disagreements where the substance agrees (housekeeping).

| # | Topic | Kind |
|---|---|---|
| 1 | Who appends the signature: Spark or the server | both flagged |
| 2 | Whether the server signs edited drafts, not only new ones | both flagged |
| 3 | Guard against a doubled signature | found by only one pass |
| 4 | Signature text for the two yourcigardenindy.com accounts | both flagged |
| 5 | Signature source of truth (R7): Spark settings vs server config | both flagged |
| 6 | Meaning of "draft body carries no signature" (gatekeeper assumption) | conflict |
| 7 | Signature rendering exactness through markdown to text and HTML | both flagged |
| 8 | Signature placement relative to the quoted original | both flagged |
| 9 | Meaning of "Never sreasinger@gmail.com" in the signature line | both flagged |
| 10 | Gatekeeper signature check says phone but does not test it | both flagged |
| 11 | Conditional send on Scott's explicit request | conflict |
| 12 | Flags on draft APPEND: \Draft vs \Draft \Seen | both flagged |
| 13 | Reply and reply-all recipient rules and Re: prefix | both flagged |
| 14 | Forward format (D4): inline quote vs .eml attachment | both flagged |
| 15 | Forward recipients and threading headers | both flagged |
| 16 | Touches 9 and 10: new drafts or replies; subject override on replies | both flagged |
| 17 | Thread reconstruction scope and subject fallback | both flagged |
| 18 | Draft ID handed to Scott: server opaque ID vs "Spark draft ID" | both flagged |
| 19 | Edit changes the draft ID | both flagged |
| 20 | Edit inputs: which fields, full replacement or patch | both flagged |
| 21 | How the sent copy of a draft is found for send confirmation | both flagged |
| 22 | Sent checks name only scott@reasinger.net:Sent | both flagged |
| 23 | Multi-word free-text search semantics (bare words to TEXT) | both flagged |
| 24 | Bounce check call pattern differs between the two skills | both flagged |
| 25 | Snippet derivation and length | both flagged |
| 26 | Thread body text: delivery-status and embedded original parts | both flagged |
| 27 | emails paging: page_size limits, sort order, paging past 100 | both flagged |
| 28 | Account identification on each returned message | both flagged |
| 29 | Source of "already replied" for business-account items | both flagged |
| 30 | Bounce notices in the yourcigardenindy.com inboxes | both flagged |
| 31 | How get-in-the-room detects replies | both flagged |
| 32 | D6: keep Spark as a 30-day fallback vs remove the branch | both flagged |
| 33 | Skill unreachable branch: trigger and wording on the server path | both flagged |
| 34 | Partial reachability: one host down | both flagged |
| 35 | availability preflight in scheduled skills | both flagged |
| 36 | availability: per host vs per account login | both flagged |
| 37 | availability: name collision with excluded Spark feature | both flagged |
| 38 | accounts reachability: live check vs cached status | both flagged |
| 39 | action batching: multi-ID, per-ID results, mixed accounts | both flagged |
| 40 | Trash as a move target | both flagged |
| 41 | D5: Archive folder auto-create | both flagged |
| 42 | Archive move not yet exercised; Spark display; cPanel B Archive | both flagged |
| 43 | ID lookup fallback: scope, missing UID, duplicate Message-ID | both flagged |
| 44 | Filter token combination, quoting, negation, OR | found by only one pass |
| 45 | newer_than date granularity vs rolling window | found by only one pass |
| 46 | from: matching semantics (case, display name vs address) | both flagged |
| 47 | search folder scope | both flagged |
| 48 | search `in` parameter shape and default | both flagged |
| 49 | emails reach for a Sent message with no date filter | found by only one pass |
| 50 | Action granularity: per message vs per thread | found by only one pass |
| 51 | Which Part A rules carry into Part B | found by only one pass |
| 52 | Draft delete: expunge vs Trash; ID-only call | both flagged |
| 53 | New-draft parameters: `to` format, cc and bcc | both flagged |
| 54 | Reply: `account` parameter vs account encoded in the ID | both flagged |
| 55 | reply_all parameter shape | both flagged |
| 56 | Edit failure ordering (append succeeds, delete fails) | both flagged |
| 57 | Draft operations on the cPanel B accounts in v1 | found by only one pass |
| 58 | Scope of drop-in compatibility | both flagged |
| 59 | Timeout values and scope | both flagged |
| 60 | Concurrent sessions to cPanel B (two accounts, one host) | both flagged |
| 61 | Trash and Junk as addressable logical names | both flagged |
| 62 | Folder cache: location, lifetime, override | both flagged |
| 63 | Folder name-match fallback rules | both flagged |
| 64 | cPanel B IMAP host | both flagged |
| 65 | cPanel B verification route given "never against live inboxes" | both flagged |
| 66 | Spike gate status: COMPLETE vs partly met; blank results table | both flagged |
| 67 | Laptop display check for IMAP-appended drafts | both flagged |
| 68 | IMAP command set: MOVE and other unexercised commands | both flagged |
| 69 | Protocol tolerance cases: requirement or record | both flagged |
| 70 | Parallel run: interference between Spark and server runs | both flagged |
| 71 | Thread comparison sample size and threshold | both flagged |
| 72 | D3: upstream identity provider and token lifetimes | both flagged |
| 73 | Hosting: implied fallback and spike account identity | both flagged |
| 74 | Egress IP whitelisting: never, or possible later | both flagged |
| 75 | Logging: subjects, filter and query strings, error text | both flagged |
| 76 | Tool loading and skill wording after cutover | both flagged |
| 77 | Secret names for the two cPanel B accounts | both flagged |
| 78 | Worker bundle size limit | found by only one pass |
| 79 | Compiled list of filter strings the skills pass | found by only one pass |
| 80 | Skill-internal behavior rules recorded by Pass 2 only | found by only one pass |
| 81 | Type label: goal statement (DES-01 / GOAL-NO-PC) | conflict |
| 82 | Type label: D3 open decision (DES-25 / AUTH-UPSTREAM-IDP-OPEN) | conflict |
| 83 | Type label: opaque stable ID (DES-44 / ID-OPAQUE-STABLE) | conflict |
| 84 | Type label: filter token table (DES-46 / FILTER-TOKENS) | conflict |
| 85 | Type label: new-draft APPEND (DES-49, X-10 / DRAFT-NEW-APPEND) | conflict |
| 86 | Type label: edit mechanism (DES-52 / DRAFT-EDIT) | conflict |
| 87 | Type label: subject build and re-encode (DES-56 / HDR-REENCODE-ON-WRITE) | conflict |
| 88 | Type label: find sent copy (DES-57 / SEND-FIND-SENT-COPY) | conflict |
| 89 | Type label: draft visibility in Spark (DES-61 / DRAFT-SPARK-VISIBILITY) | conflict |
| 90 | Type label: signature source of truth (DES-64 / SIG-SOURCE-OF-TRUTH) | conflict |
| 91 | Type label: logging (DES-74 / LOG-FIELDS, LOG-EXCLUSIONS) | conflict |
| 92 | Type label: secrets rotation (DES-76 / SEC-SECRET-ROTATION) | conflict |
| 93 | Type label: protocol tolerance tests (SPK-01 / IMAP-PROTOCOL-TOLERANCE) | conflict |
| 94 | Type label: pin and archive display (SPK-08 / TEST-ARCHIVE-PIN-SPARK) | conflict |
| 95 | Type label: bounce report fields (ECF-07 / ECF-C-REPORT-FIELDS) | conflict |
| 96 | Type label: Part B skip pinned and bounces (ECF-10 / ECF-B-SKIP-PINNED-BOUNCES) | conflict |
| 97 | Type label: Sent check for repliers (ECF-11 / ECF-B-SENT-CHECK) | conflict |
| 98 | Type label: pin classes (ECF-12 / ECF-B-PIN) | conflict |
| 99 | Type label: archive Noise, no action otherwise (ECF-13 / ECF-B-ARCHIVE-NOISE, ECF-B-OTHER-NO-ACTION) | conflict |
| 100 | Type label: action batching (ECF-15 / TOOL-ACTION-BATCH, ECF-B-BATCH-CONTINUE) | conflict |
| 101 | Type label: already replied in report (ECF-18 / ECF-REPORT-ALREADY-REPLIED) | conflict |
| 102 | Type label: bounces lead the report (ECF-19 / ECF-REPORT-BOUNCES-FIRST) | conflict |
| 103 | Type label and bundling: error handling (ECF-21 / ECF-GMAIL-DOWN, FAIL-SKILL-UNREACHABLE-BRANCH) | conflict |
| 104 | Type label: lookback config (ECF-22 / ECF-LOOKBACK-CONFIG) | conflict |
| 105 | Type label: edit ID change (GIR-11, X-08 / DRAFT-EDIT-ID-CHANGE) | conflict |
| 106 | Type label: bounce query mismatch (GIR-15 / BOUNCE-QUERY-MISMATCH) | conflict |
| 107 | Type label: touch email operations (GIR-19 / GITR-TOUCH-EMAIL-OPS) | conflict |
| 108 | Type label: YCD signatures (X-12 / SIG-OTHER-ACCOUNTS-UNDEFINED) | conflict |
| 109 | Type label: gatekeeper signature check (GKP-03 / SIG-GATE-CONTENT) | conflict |
| 110 | Type label: power-off test in acceptance (DES-73 / ACCEPT-POWER-OFF) | conflict |

---

## Ambiguity #1
Topic: Who appends the account signature to outgoing outreach: Spark at send time, or the server when it writes the draft.
Kind: both flagged
Reading A (Pass 1): X-02 (structural gate, low) records both readings: the skills say Spark appends the signature (skill-get-in-the-room.md L7: "Spark appends the signature, so draft bodies carry none."; L116: "the scott@reasinger.net account signature in Spark appends it automatically"; skill-gatekeeper-panel.md L7, L48), while the spike and design say Spark does not and the server appends (02-spike-results.md L71: "Spark does NOT add the account signature to a draft it did not create."; 01-design-v0.2.md L153). DES-55 (structural gate, medium) states D1: the server appends to every draft it creates or edits, and notes it contradicts the skill files. GIR-01 and GKP-01 (definition, low) record the skills' stated belief and flag it as contradicted by the spike. SPK-07 (definition, high) records the spike finding (02-spike-results.md L71). X-02 also notes the spike tested only a new draft on mcptest, not reply or forward drafts specifically.
Reading B (Pass 2): SIG-WHO-APPENDS-CONFLICT (structural gate, low) states the same split: skills say Spark appends (skill-get-in-the-room.md L7, L116, L357; skill-gatekeeper-panel.md L7, L48) vs 02-spike-results.md L71; notes D1 is decided for the server-appends reading but the skill text still states the Spark reading. SIG-SERVER-APPENDS (structural gate, high) states D1 as decided (01-design-v0.2.md L153, L161; 02-spike-results.md L78) with no flag.
Rules affected: Pass 1: X-02, DES-55, GIR-01, GKP-01, SPK-07. Pass 2: SIG-WHO-APPENDS-CONFLICT, SIG-SERVER-APPENDS.
Why this matters: It decides whether mail Scott sends from server-created drafts goes out signed once, twice, or not at all, and whether the two skill files need rewording.
Resolution:

## Ambiguity #2
Topic: Whether the server appends the signature on edit as well as on create.
Kind: both flagged
Reading A (Pass 1): DES-55 reads "creates or edits" (01-design-v0.2.md L153: "the server appends the account's configured signature to every draft it creates or edits.") and flags that the spike's D1 statement omits edits. SPK-09 (structural gate, medium) states the spike wording, "every draft body it creates" (02-spike-results.md L78: "The server appends the per-account signature to every draft body it creates."), and notes the narrower reading would leave edited drafts unsigned; Pass 1 reads the two together as creates or edits.
Reading B (Pass 2): SIG-SERVER-APPENDS states "creates or edits" (01-design-v0.2.md L153; 02-spike-results.md L78) with no flag. DRAFT-EDIT-SIGNATURE (other, medium; Pass 2 only) states "On edit, the server appends the account signature to the new version" (01-design-v0.2.md L153).
Rules affected: Pass 1: DES-55, SPK-09. Pass 2: SIG-SERVER-APPENDS, DRAFT-EDIT-SIGNATURE (found by only one pass).
Why this matters: If edits are not signed, any draft get-in-the-room revises would reach the recipient with no signature.
Resolution:

## Ambiguity #3
Topic: Whether the server must avoid a doubled signature (body already ends with the signature, or an edit resubmits a body that already carries the server-appended signature).
Kind: found by only one pass
Reading A (Pass 1): GIR-03 (structural gate, medium; Pass 1 only): the skill must never type a signature or sign-off into the draft body because it would print twice (skill-get-in-the-room.md L116: "**Never type a signature or sign-off into the Spark draft body** (it would print twice)."); flags whether the server should also detect and skip a duplicate or append unconditionally. DES-55 and X-03 notes raise the same duplicate risk on edit round-trips.
Reading B (Pass 2): No standalone rule. DRAFT-EDIT-SIGNATURE (Pass 2 only) note: if edit input is the existing body with the server signature, a second one is appended; readings: edit input is always signature-free and the server re-appends, or the server strips its own previous signature first (01-design-v0.2.md L153).
Rules affected: Pass 1: GIR-03 (found by only one pass), DES-55, X-03. Pass 2: DRAFT-EDIT-SIGNATURE (found by only one pass).
Why this matters: Without a defined guard, a resubmitted body produces a draft Scott sends with two signature blocks.
Resolution:

## Ambiguity #4
Topic: Signature text for scott@yourcigardenindy.com and founders@yourcigardenindy.com, and how the gatekeeper check treats it.
Kind: both flagged
Reading A (Pass 1): X-12 (definition, low): the skill says every account appends its own signature (skill-get-in-the-room.md L357: "Every account appends its own signature."; 01-design-v0.2.md L97), but no source gives the two texts, and the gatekeeper check requires "reasinger.net" and a LinkedIn URL in every email signature (skill-gatekeeper-panel.md L205). Readings: each YCD account has a Spark signature to copy into server config (text unknown), or YCD accounts have no signature and the server appends nothing. GIR-07 and GKP-03 notes raise the same gap.
Reading B (Pass 2): SIG-OTHER-ACCOUNTS-UNDEFINED (tracking-only, medium): each account needs its own configured signature but only the scott@reasinger.net text is given (01-design-v0.2.md L97; skill-get-in-the-room.md L357); it must be supplied or those accounts get no signature. SIG-GATE-CONTENT note: the reasinger.net requirement may fail a yourcigardenindy.com signature; unclear whether the panel runs on those drafts.
Rules affected: Pass 1: X-12, GIR-07, GKP-03. Pass 2: SIG-OTHER-ACCOUNTS-UNDEFINED, DRAFT-NEW-PARAMS, SIG-GATE-CONTENT. (Type disagreement on the X-12 pair is #108.)
Why this matters: Without the texts, founder and YCD drafts go out unsigned or block on the gatekeeper check.
Resolution:

## Ambiguity #5
Topic: Which copy of the signature text is the source of truth (Spark settings, server config, or skill files) and how changes propagate (R7).
Kind: both flagged
Reading A (Pass 1): DES-64 (other, low): explicitly unresolved (01-design-v0.2.md L178: "Open question for the ambiguity log: which is the source of truth and how changes propagate"; 02-spike-results.md L76). Readings: server config is the truth; Spark settings are the truth and server config is synced by hand; or the skill files are the truth. GIR-02 note ties the quoted text to this.
Reading B (Pass 2): SIG-SOURCE-OF-TRUTH (tracking-only, low): same question and the same three readings (01-design-v0.2.md L178; 02-spike-results.md L76).
Rules affected: Pass 1: DES-64, GIR-02. Pass 2: SIG-SOURCE-OF-TRUTH, SIG-EXACT-TEXT. (Type disagreement is #90.)
Why this matters: A signature change made in one place will silently not reach mail created through the other path.
Resolution:

## Ambiguity #6
Topic: What "the draft body carries no signature" means in the gatekeeper-panel assumption, given the server now signs the stored draft.
Kind: conflict
Reading A (Pass 1): DES-10e (structural gate, medium): "The gatekeeper-panel skill assumes the draft body carries no signature and the sent mail carries the account signature; the server must make both true." (01-design-v0.2.md L46: "Assumes the draft body carries no signature and the sent mail carries the account signature."). X-03 (definition, low) records the conflict with D1 (01-design-v0.2.md L46; skill-gatekeeper-panel.md L48; 01-design-v0.2.md L153). Readings: the skill's input body only, or the stored draft must be unsigned (contradicting D1).
Reading B (Pass 2): SIG-GATEKEEPER-ASSUMPTION (definition, low): records the assumption only, as a definition, not as a server obligation (01-design-v0.2.md L46). Same two readings; adds that "sent mail carries the signature" holds only if the server appends, since Spark will not.
Rules affected: Pass 1: DES-10e, X-03. Pass 2: SIG-GATEKEEPER-ASSUMPTION.
Why this matters: If the stored draft must be unsigned, D1 cannot stand and sent mail loses its signature; if it is a server gate, it becomes a tested requirement.
Resolution:

## Ambiguity #7
Topic: How the markdown body and signature render to text and HTML, and whether that matches "exactly as it will render" in the gatekeeper check file.
Kind: both flagged
Reading A (Pass 1): DES-54 (definition, medium): body input is markdown rendered to multipart text and HTML (01-design-v0.2.md L152); markdown dialect and plain-text rules are unspecified. GKP-02 (structural gate, medium): the server-appended signature must render exactly as the check-file line (skill-gatekeeper-panel.md L48); the `|` separators and URL may render as a table or link; unclear whether exactness applies to the text part, HTML part, or both.
Reading B (Pass 2): DRAFT-BODY-RENDER (definition, high; no flag). SIG-RENDER-MATCH-GATE (structural gate, medium): server signature must render as the check-file line (skill-gatekeeper-panel.md L48; skill-get-in-the-room.md L116); matches only if server config holds the identical string; unclear whether an HTML link counts as "exactly as it will render".
Rules affected: Pass 1: DES-54, GKP-02. Pass 2: DRAFT-BODY-RENDER, SIG-RENDER-MATCH-GATE.
Why this matters: The recipient could see a signature that differs from what the gatekeeper panel approved.
Resolution:

## Ambiguity #8
Topic: Where the appended signature goes in a reply or forward relative to the quoted original.
Kind: both flagged
Reading A (Pass 1): DES-50 note (4): placement relative to the quoted original is not stated; DES-55 note: placement in replies and forwards not stated (01-design-v0.2.md L148: "quoted original below the body."; L153).
Reading B (Pass 2): not raised (DRAFT-REPLY and SIG-SERVER-APPENDS record the rules without this point).
Rules affected: Pass 1: DES-50, DES-55. Pass 2: DRAFT-REPLY, SIG-SERVER-APPENDS.
Why this matters: It changes whether recipients see the signature under Scott's text or below the quoted thread.
Resolution:

## Ambiguity #9
Topic: Whether "Never sreasinger@gmail.com" on the signature line is about the signature text or about the sending account.
Kind: both flagged
Reading A (Pass 1): GIR-02 (definition, medium) states only the signature text (skill-get-in-the-room.md L116) and flags that the trailing "Never sreasinger@gmail.com" could refer to the signature or the sending account.
Reading B (Pass 2): SIG-EXACT-TEXT (definition, high) states the signature text "and sreasinger@gmail.com is never used in it" (skill-get-in-the-room.md L116: "... Never sreasinger@gmail.com."; skill-gatekeeper-panel.md L48), reading the clause as about the signature, with no flag.
Rules affected: Pass 1: GIR-02. Pass 2: SIG-EXACT-TEXT.
Why this matters: It decides whether the clause becomes a signature-content check or an account-selection rule.
Resolution:

## Ambiguity #10
Topic: The gatekeeper signature check message requires LinkedIn, reasinger.net and phone, but the code tests only the first two.
Kind: both flagged
Reading A (Pass 1): GKP-03 (structural gate, medium): signature must carry the LinkedIn URL, reasinger.net and phone (skill-gatekeeper-panel.md L204-L206); notes "the message text says 'phone' but the code does not test for the phone number".
Reading B (Pass 2): SIG-GATE-CONTENT (tracking-only, medium): check fails unless the signature contains "reasinger.net" and "linkedin.com/in/" (and carries the phone) (skill-gatekeeper-panel.md L204-L206); notes the phone is stated as required but not checked.
Rules affected: Pass 1: GKP-03. Pass 2: SIG-GATE-CONTENT. (Type disagreement is #109; YCD aspect is #4.)
Why this matters: A server-configured signature missing the phone would pass the panel unnoticed.
Resolution:

## Ambiguity #11
Topic: Whether Claude may send a specific message when Scott explicitly asks, given the server has no send capability.
Kind: conflict
Reading A (Pass 1): GIR-13 (structural gate, low): "Scott sends; Claude never uses `action send` unless Scott asks for that specific message to be sent in this session." (skill-get-in-the-room.md L361). X-04 (structural gate, low) records the conflict with the design (01-design-v0.2.md L21: "No SMTP in v1."; L121: "No `send`, no permanent delete."; L53: "Nothing that sends"); readings: server has no send and the skill must tell Scott to send from Spark, or the conditional send survives via Spark fallback or a future server send. GIR-17 note: skill L7 says Spark replaces Gmail for "sends".
Reading B (Pass 2): SEND-GITR-SEND-EXCEPTION (structural gate, low): "Claude never sends mail itself; the skill's exception ... is not available on the server." (skill-get-in-the-room.md L361 vs 01-design-v0.2.md L121, L21); also raises sending via the retained D6 Spark fallback as an unaddressed third option. GITR-SPARK-ALL-ACCOUNTS (definition, high) states the mail system serves "drafts, sends, sent-checks and bounces" (skill-get-in-the-room.md L7).
Rules affected: Pass 1: GIR-13, X-04, GIR-17. Pass 2: SEND-GITR-SEND-EXCEPTION, GITR-SPARK-ALL-ACCOUNTS.
Why this matters: It decides whether an in-session "send this one" request results in a send, a Spark fallback send, or an instruction to Scott.
Resolution:

## Ambiguity #12
Topic: Which flags a new draft is APPENDed with: \Draft only (design) or \Draft \Seen (as verified in the spike).
Kind: both flagged
Reading A (Pass 1): DES-49 (sequencing, low): design says `\Draft` (01-design-v0.2.md L147: "New: build RFC 5322 message, APPEND to Drafts with `\Draft` flag."); spike used `\Draft \Seen` (02-spike-results.md L44). X-10 (definition, low) records both readings; without \Seen a draft may show as unread; untested.
Reading B (Pass 2): DRAFT-NEW-APPEND (definition, medium): same two readings (01-design-v0.2.md L147; 02-spike-results.md L44: "APPEND to INBOX.Drafts, \\Draft \\Seen, LITERAL+").
Rules affected: Pass 1: DES-49, X-10. Pass 2: DRAFT-NEW-APPEND. (Type disagreement is #85.)
Why this matters: It may change whether new drafts show as unread in Spark on Scott's devices.
Resolution:

## Ambiguity #13
Topic: Reply and reply-all recipient rules and Re: subject handling.
Kind: both flagged
Reading A (Pass 1): DES-50 (definition, medium) (01-design-v0.2.md L148). Unstated: recipients when replying to a message Scott sent (original in Sent); whether reply-all removes the account's own address; whether Re: is added when the subject already starts with Re:.
Reading B (Pass 2): DRAFT-REPLY (definition, medium) (01-design-v0.2.md L148). Unstated: Reply-To header handling; removal of Scott's own address from reply-all; whether Cc is kept; whether an existing Re: is reused rather than doubled.
Rules affected: Pass 1: DES-50. Pass 2: DRAFT-REPLY.
Why this matters: It decides who receives Scott's replies and what subject line they see.
Resolution:

## Ambiguity #14
Topic: Forward format, open decision D4: inline quote or .eml attachment.
Kind: both flagged
Reading A (Pass 1): DES-51 (definition, low): D4 open; leaning inline quote (01-design-v0.2.md L149, L164: "Inline quote (matches touch-7 behavior). Open.").
Reading B (Pass 2): DRAFT-FORWARD (definition, medium): same, leaning inline quote (01-design-v0.2.md L149, L164).
Rules affected: Pass 1: DES-51. Pass 2: DRAFT-FORWARD.
Why this matters: It decides how the touch-7 forward looks to the recipient.
Resolution:

## Ambiguity #15
Topic: Recipients and threading headers on a forward draft (touch 7 gives no `to`).
Kind: both flagged
Reading A (Pass 1): GIR-10 (definition, medium): touch-7 forward call (skill-get-in-the-room.md L359, L257) gives no `to`; readings: caller supplies `to`; server defaults to the original's To; or no recipient and Scott fills it in. Also Sent-message IDs must be valid forward targets. DES-51 note: forward recipient handling unstated.
Reading B (Pass 2): DRAFT-FORWARD-TOUCH7 (definition, high; no flag) (skill-get-in-the-room.md L359, L257). DRAFT-FORWARD note: unstated whether a forward sets In-Reply-To and References or carries over the original's recipients.
Rules affected: Pass 1: GIR-10, DES-51. Pass 2: DRAFT-FORWARD-TOUCH7, DRAFT-FORWARD.
Why this matters: A touch-7 forward could be created with no recipient or outside the original thread.
Resolution:

## Ambiguity #16
Topic: Whether touches 9 and 10 are new drafts or replies on the touch-1 thread, and whether reply drafts accept a subject override.
Kind: both flagged
Reading A (Pass 1): GIR-19 (other, low): touches 9 and 10 have subjects "quick question" and "curious?" (skill-get-in-the-room.md L259-L260); readings: new drafts keeping the subject, or `reply_to` on the original, where the Re: rule would override the subject unless reply drafts accept `subject`.
Reading B (Pass 2): GITR-TOUCH-EMAIL-OPS (definition, medium): touch 1 new draft, touch 7 forward, touches 9 and 10 new emails (skill-get-in-the-room.md L251, L257, L259, L260); notes the distinct subjects suggest new drafts but threading is not specified.
Rules affected: Pass 1: GIR-19. Pass 2: GITR-TOUCH-EMAIL-OPS. (Type disagreement is #107.)
Why this matters: It decides whether late touches thread with the original and what subject the recipient sees.
Resolution:

## Ambiguity #17
Topic: Which folders thread reconstruction spans, and the subject-fallback matching rules.
Kind: both flagged
Reading A (Pass 1): DES-41 (definition, medium) (01-design-v0.2.md L120): unclear whether threads span Inbox, Sent and Archive as Spark's view does, or only the starting folder; subject-fallback rules (prefix stripping, date window) not given; R5 acknowledges differences.
Reading B (Pass 2): TOOL-THREAD (definition, high) reads the order as References, then In-Reply-To, then subject fallback. TOOL-THREAD-SCOPE (other, low; Pass 2 only): folder scope not defined; R5 comparison to Spark's view suggests cross-folder; subject-fallback rules not defined (01-design-v0.2.md L120, L176).
Rules affected: Pass 1: DES-41. Pass 2: TOOL-THREAD, TOOL-THREAD-SCOPE.
Why this matters: It decides whether a skill's thread view includes Scott's own sent replies.
Resolution:

## Ambiguity #18
Topic: What draft ID get-in-the-room hands Scott when the server issues its own opaque IDs that Spark does not show.
Kind: both flagged
Reading A (Pass 1): GIR-05 (structural gate, medium): skill gives Scott the draft ID per recipient and never calls an email ready unless the draft exists (skill-get-in-the-room.md L217); unclear what Scott does with a server ID. X-05 (definition, low; Pass 1 contradiction record): skills refer to "Spark" IDs (L217, L358) vs 01-design-v0.2.md L126; readings: IDs are opaque so any ID works, or Scott uses the ID somewhere Spark-specific; during the D6 fallback a server ID passed to Spark would fail.
Reading B (Pass 2): ID-SPARK-ID-HANDOFF (structural gate, low): same rule (skill-get-in-the-room.md L217, L358); readings: Scott gets the server ID, meaningful only for later edit or delete, or the hand-off needs something visible in Spark (subject, recipient); a successful APPEND with APPENDUID is the evidence the draft exists.
Rules affected: Pass 1: GIR-05, X-05. Pass 2: ID-SPARK-ID-HANDOFF.
Why this matters: It decides what Scott is given to find each draft and whether IDs survive a switch to the Spark fallback.
Resolution:

## Ambiguity #19
Topic: Edit returns a new draft ID while the skill treats the draft ID as fixed.
Kind: both flagged
Reading A (Pass 1): X-08 (definition, low) and GIR-11 (definition, medium): edit appends and deletes and returns a new ID (01-design-v0.2.md L150) vs the skill handing Scott one ID per recipient and later editing or deleting "<draft ID>" (skill-get-in-the-room.md L217, L360). Readings: the skill replaces its stored ID after each edit, or the server keeps the old ID resolvable (for example via Message-ID fallback if the Message-ID is kept). GIR-05 and DES-52 notes raise the same point.
Reading B (Pass 2): DRAFT-EDIT-ID-CHANGE (other, low): same two readings (skill-get-in-the-room.md L360; 01-design-v0.2.md L150); notes the design does not say whether an edit keeps the Message-ID. DRAFT-DELETE-PERMANENT note: a delete with a pre-edit ID targets a UID that no longer exists.
Rules affected: Pass 1: X-08, GIR-11, GIR-05, DES-52. Pass 2: DRAFT-EDIT-ID-CHANGE, DRAFT-DELETE-PERMANENT, DRAFT-EDIT. (Type disagreement is #105.)
Why this matters: A later edit or delete using the ID Scott was given may fail or hit nothing.
Resolution:

## Ambiguity #20
Topic: What an edit accepts: which fields, and whether it is a full replacement or a patch.
Kind: both flagged
Reading A (Pass 1): DES-52 note: inputs not stated anywhere; skill gives only `edit: <draft ID>` (skill-get-in-the-room.md L360). GIR-11 note: fields that may change, and whether unspecified fields are kept or cleared, not stated.
Reading B (Pass 2): DRAFT-EDIT-ID-CHANGE note: not stated whether the edit input is a full body replacement or a patch.
Rules affected: Pass 1: DES-52, GIR-11. Pass 2: DRAFT-EDIT, DRAFT-EDIT-ID-CHANGE.
Why this matters: An edit could silently clear the recipient or subject of a draft Scott is about to send.
Resolution:

## Ambiguity #21
Topic: How the sent copy of a server-created draft is found and matched for send confirmation.
Kind: both flagged
Reading A (Pass 1): DES-57 (sequencing, medium): find the sent copy by recipient, subject and date (01-design-v0.2.md L155); unclear whether the server offers a dedicated lookup or the skill composes `emails` on Sent with `to:` and `subject:`; the grammar has no single-day date token. GIR-14 (sequencing, medium): confirm in scott@reasinger.net:Sent before logging (skill-get-in-the-room.md L362, L218); skill does not say how it matches; the Touches "actual Date" needs the Sent copy's date.
Reading B (Pass 2): SEND-FIND-SENT-COPY (structural gate, high) (01-design-v0.2.md L155). SEND-CONFIRM-IN-SENT (sequencing, low): readings: the skill matches by `emails` on Sent with `to:<address>` plus subject and date, or the server offers a draft-to-sent helper; no tool exists for it (skill-get-in-the-room.md L362, L218).
Rules affected: Pass 1: DES-57, GIR-14. Pass 2: SEND-FIND-SENT-COPY, SEND-CONFIRM-IN-SENT. (Type disagreement on DES-57 is #88.)
Why this matters: Send-then-log may fail to confirm sends Scott made, leaving Touches rows stuck at Drafted.
Resolution:

## Ambiguity #22
Topic: Sent-folder checks name only scott@reasinger.net:Sent, though replies and drafts also occur on the yourcigardenindy.com accounts.
Kind: both flagged
Reading A (Pass 1): ECF-11 (other, medium): replier check uses scott@reasinger.net:Sent (skill-email-crap-filter.md L71-L72); call shape not given; only that Sent folder is named, even for YCD accounts.
Reading B (Pass 2): ECF-B-SENT-CHECK (definition, medium): same (skill-email-crap-filter.md L71-L72); unclear whether YCD Sent folders should be checked. SEND-CONFIRM-IN-SENT note: send confirmation names only scott@reasinger.net:Sent though drafts can come from the YCD accounts.
Rules affected: Pass 1: ECF-11, GIR-14. Pass 2: ECF-B-SENT-CHECK, SEND-CONFIRM-IN-SENT. (Type disagreement on ECF-11 is #97.)
Why this matters: Replies to YCD outreach may be misclassified and YCD sends may never be confirmed.
Resolution:

## Ambiguity #23
Topic: How a multi-word free-text `search` query is matched (bare words to IMAP TEXT).
Kind: both flagged
Reading A (Pass 1): X-09 (calculation, low): skill expects a broad result (skill-email-crap-filter.md L36-L38: "Keep only real delivery-failure notices (ignore normal mail the search also returns).") vs design (01-design-v0.2.md L141: "| bare words | `TEXT` |"; L119). Readings: each word an ANDed TEXT term (narrow, misses bounces); words ORed; one TEXT phrase. Also unclear whether the bare-word rule governs `query` at all or only bare words inside `filter`. ECF-05 and DES-40 notes raise the same point; GIR-15 note applies it to the shorter query.
Reading B (Pass 2): FILTER-BARE-WORDS-SEARCH (calculation, low): same three readings (skill-email-crap-filter.md L36-L38; 01-design-v0.2.md L141); notes the result drives the parallel-run "same bounces" check. TOOL-SEARCH note points here. BOUNCE-QUERY-MISMATCH note: under AND the two skills' queries return different results.
Rules affected: Pass 1: X-09, ECF-05, DES-40, GIR-15. Pass 2: FILTER-BARE-WORDS-SEARCH, ECF-C-SEARCH-CALL, TOOL-SEARCH, BOUNCE-QUERY-MISMATCH.
Why this matters: Under an AND reading the bounce sweep can miss most bounces, so dead outreach addresses go unreported.
Resolution:

## Ambiguity #24
Topic: The two skills use different bounce-check call patterns against the same server.
Kind: both flagged
Reading A (Pass 1): GIR-15 (sequencing, low): get-in-the-room uses `from:mailer-daemon newer_than:3d` plus search "delivery failed undeliverable" with no `newer_than` (skill-get-in-the-room.md L363), unlike email-crap-filter (no `from:postmaster`, shorter query, no date filter). Readings: two independent patterns the server serves, or one is stale and the parallel-run "same bounces" depends on which.
Reading B (Pass 2): BOUNCE-QUERY-MISMATCH (other, medium): same difference (skill-email-crap-filter.md L36; skill-get-in-the-room.md L363). Readings: two separate checks, or one canonical check with get-in-the-room abbreviating.
Rules affected: Pass 1: GIR-15, ECF-04, ECF-05. Pass 2: BOUNCE-QUERY-MISMATCH, ECF-C-EMAILS-CALLS, ECF-C-SEARCH-CALL. (Type disagreement is #106.)
Why this matters: The two skills can report different bounces for the same mailbox.
Resolution:

## Ambiguity #25
Topic: How the `emails` snippet is derived and how long it is.
Kind: both flagged
Reading A (Pass 1): DES-39 note: snippet length and derivation not given; IMAP has no native snippet, so part of the body must be fetched (01-design-v0.2.md L118). ECF-07 (other, medium): bounce reporting reads the snippet first (skill-email-crap-filter.md L40-L41), so the snippet must carry enough of the bounce text.
Reading B (Pass 2): ECF-C-REPORT-FIELDS (definition, medium): snippet length and composition unspecified (skill-email-crap-filter.md L40-L41). ECF-SNIPPET-FIRST (Pass 2 only; see #51) depends on a usable snippet.
Rules affected: Pass 1: DES-39, ECF-07. Pass 2: TOOL-EMAILS, ECF-C-REPORT-FIELDS, ECF-SNIPPET-FIRST.
Why this matters: A thin snippet forces extra thread calls and may hide the failed address or error code in bounce reports.
Resolution:

## Ambiguity #26
Topic: Whether `thread` "bodies as text" include message/delivery-status parts and the embedded original in bounce notices.
Kind: both flagged
Reading A (Pass 1): ECF-07 note: bounce notices are often multipart/report with the original as message/rfc822; "bodies as text" (01-design-v0.2.md L120) does not say whether those parts are included.
Reading B (Pass 2): ECF-C-REPORT-FIELDS note: `thread` must return the DSN part where the failed address and code sit; not stated whether "bodies as text" covers delivery-status parts or attached original headers.
Rules affected: Pass 1: ECF-07, DES-41. Pass 2: ECF-C-REPORT-FIELDS, TOOL-THREAD.
Why this matters: Without these parts the skill cannot report the failed address, code, or original subject for a bounce.
Resolution:

## Ambiguity #27
Topic: `emails` paging: maximum and default page_size, sort order, and whether Part B must page past 100.
Kind: both flagged
Reading A (Pass 1): DES-39 note: sort order, max and default page_size not given; unclear whether 100 must be one page. ECF-09 (sequencing, medium): Part B uses `page_size: 100` with no cursor (skill-email-crap-filter.md L59-L60); more than 100 messages in 7 days are silently untriaged; config L265 "paginate at 50 per call" reads as Gmail-specific.
Reading B (Pass 2): TOOL-EMAILS-PAGE-SIZE-100 (definition, medium; Pass 2 only as a separate rule): readings: 100 honored in one page, or server caps lower and the skill pages; a lower cap silently truncates unless the skill changes (skill-email-crap-filter.md L59-L60). TOOL-EMAILS and ECF-B-FETCH carry no flag.
Rules affected: Pass 1: DES-39, ECF-09. Pass 2: TOOL-EMAILS, ECF-B-FETCH, TOOL-EMAILS-PAGE-SIZE-100 (found by only one pass).
Why this matters: A cap below 100 or an unstated sort order can drop business mail from triage without any error.
Resolution:

## Ambiguity #28
Topic: Whether each returned message identifies its account (needed for report tags, especially on cross-account `search`).
Kind: both flagged
Reading A (Pass 1): ECF-17 (definition, medium): report tags each item with its account (skill-email-crap-filter.md L224-L225); design `emails` return fields (L118) omit account; a folder-scoped call implies it, but cross-account `search` needs it per result.
Reading B (Pass 2): ECF-REPORT-ACCOUNT-TAGS (definition, high; no flag): server results must identify the source account.
Rules affected: Pass 1: ECF-17. Pass 2: ECF-REPORT-ACCOUNT-TAGS.
Why this matters: Without an account field, all-account search results cannot be tagged correctly in Scott's report.
Resolution:

## Ambiguity #29
Topic: Where "whether Scott already replied" comes from for business-account Review Now items.
Kind: both flagged
Reading A (Pass 1): ECF-18 (other, medium) (skill-email-crap-filter.md L233-L234): source not stated: `\Answered` flag (Spark sets it on reply), a Sent check, or the thread view; Gmail's SENT label does not apply.
Reading B (Pass 2): ECF-REPORT-ALREADY-REPLIED (definition, medium): could come from `\Answered` (01-design-v0.2.md L155) returned in flags, or a Sent check; source names neither for Part B.
Rules affected: Pass 1: ECF-18. Pass 2: ECF-REPORT-ALREADY-REPLIED. (Type disagreement is #101.)
Why this matters: It changes whether the report tells Scott correctly which leads he has already answered.
Resolution:

## Ambiguity #30
Topic: Bounce notices arriving in the yourcigardenindy.com inboxes are skipped by Part B and not read by Part C.
Kind: both flagged
Reading A (Pass 1): ECF-10 (structural gate, high): Part B skips pinned messages, so `emails` must expose `\Flagged` (skill-email-crap-filter.md L60-L61). Point not raised.
Reading B (Pass 2): ECF-B-SKIP-PINNED-BOUNCES (other, medium): Part C reads only scott@reasinger.net, so a bounce in a YCD inbox is checked by nobody. Readings: skip bounces in all accounts as written, or skip only in scott@reasinger.net.
Rules affected: Pass 1: ECF-10. Pass 2: ECF-B-SKIP-PINNED-BOUNCES. (Type disagreement is #96.)
Why this matters: Founder-outreach bounces could go unreported.
Resolution:

## Ambiguity #31
Topic: How get-in-the-room detects replies so it can answer the same day.
Kind: both flagged
Reading A (Pass 1): GIR-18 (other, medium): any reply turns the contact warm (skill-get-in-the-room.md L262); exact call not given; inferred from L358 and design L45.
Reading B (Pass 2): GITR-REPLY-SAME-DAY (other, medium): same (skill-get-in-the-room.md L262); detection not stated (email-crap-filter Part B, or a get-in-the-room `emails` or `search` call).
Rules affected: Pass 1: GIR-18. Pass 2: GITR-REPLY-SAME-DAY.
Why this matters: It decides which call path must work for same-day reply handling.
Resolution:

## Ambiguity #32
Topic: D6: whether Spark stays as a 30-day fallback after cutover or the "Spark unreachable" branch is removed, and how a skill chooses at run time.
Kind: both flagged
Reading A (Pass 1): DES-59 (sequencing, low): keep Spark as fallback 30 days (01-design-v0.2.md L166) conflicts with L52 ("Migrating a skill is a tool-prefix swap plus removing the \"Spark unreachable\" branch"). X-06 (sequencing, low; Pass 1 contradiction record): readings: remove the branch; replace with "if server unreachable, try Spark" for 30 days; or keep the branch retargeted; D6 is a leaning. DES-73 (sequencing, medium) cutover ties to D6. DES-11 note raises the same conflict.
Reading B (Pass 2): CUTOVER-SPARK-FALLBACK (sequencing, low): D6 is a leaning, conflicts with L52; readings: skills keep a Spark branch 30 days, or "fallback" means only a manual revert of the prefix; unstated how a skill chooses or whether pins and archives could double-apply. CUTOVER-PREFIX-SWAP (sequencing, high; no flag).
Rules affected: Pass 1: DES-59, X-06, DES-73, DES-11. Pass 2: CUTOVER-SPARK-FALLBACK, CUTOVER-PREFIX-SWAP, COMPAT-DROP-IN.
Why this matters: It decides whether a server outage falls back to Spark (and the PC) or just reports failure.
Resolution:

## Ambiguity #33
Topic: What the skills' unreachable branch becomes on the server path: trigger condition and report wording.
Kind: both flagged
Reading A (Pass 1): ECF-03 (structural gate, low): run Part A only with the "Spark unreachable" first line (skill-email-crap-filter.md L19-L23); readings: branch removed, retargeted to "server unreachable", or becomes a Spark fallback. ECF-19 (other, low): Bounces slot says so instead (L228-L229). ECF-21 (structural gate, low): L255-L257. GIR-16 (structural gate, low): say so, write note to build file, give paste text, never Gmail draft (skill-get-in-the-room.md L364).
Reading B (Pass 2): FAIL-SKILL-UNREACHABLE-BRANCH (structural gate, low): readings: branch removed and replaced by per-account server failure reporting (Part C still runs if cPanel A is up), or kept as fallback for when the server itself is unreachable, with new wording; neither trigger nor wording is set. FAIL-GITR-UNREACHABLE (structural gate, low): fires when the server or needed host is unreachable, or only on the retained Spark fallback; "never fall back to a Gmail draft" holds either way. ECF-REPORT-BOUNCES-FIRST note: wording needs restating.
Rules affected: Pass 1: ECF-03, ECF-19, ECF-21, GIR-16. Pass 2: FAIL-SKILL-UNREACHABLE-BRANCH, FAIL-GITR-UNREACHABLE, ECF-REPORT-BOUNCES-FIRST, ECF-GMAIL-DOWN.
Why this matters: It decides what Scott reads at the top of the report and what get-in-the-room gives him when mail access fails.
Resolution:

## Ambiguity #34
Topic: Partial reachability: how one cPanel host being down maps onto skill parts and notifications.
Kind: both flagged
Reading A (Pass 1): X-07 (structural gate, low; Pass 1 contradiction record): server reports per host (01-design-v0.2.md L54) vs skills' all-or-nothing branch (skill-email-crap-filter.md L21-L22, L257). Readings: run Part C and the reasinger.net slice of Part B and report YCD accounts not checked (skill change), or treat any host failure as unreachable and skip both parts. ECF-20 (structural gate, medium): unclear whether one unreachable account counts as "any part failed". ECF-03 and ECF-21 notes raise the same.
Reading B (Pass 2): FAIL-SKILL-UNREACHABLE-BRANCH note: failure can be partial per host, for example cPanel B down while cPanel A answers. ECF-SCHEDULED-NOTIFY (structural gate, high; no flag).
Rules affected: Pass 1: X-07, ECF-20, ECF-03, ECF-21. Pass 2: FAIL-SKILL-UNREACHABLE-BRANCH, ECF-SCHEDULED-NOTIFY, FAIL-PER-HOST-LOUD.
Why this matters: It decides whether a cPanel B outage also suppresses the reasinger.net bounce sweep and whether Scott is notified.
Resolution:

## Ambiguity #35
Topic: The `availability` preflight that scheduled skills must call first.
Kind: both flagged
Reading A (Pass 1): DES-75 (sequencing, medium): scheduled skills call `availability` first and push-notify on host failure (01-design-v0.2.md L215); this is a skill requirement; email-crap-filter has no preflight step; unclear whether the skill must change or per-response status suffices.
Reading B (Pass 2): FAIL-ALERT-PREFLIGHT (sequencing, medium) (01-design-v0.2.md L215, L116): readings: add the call before Part C, or a part's own failure counts as the alert and the preflight is optional; recorded as required.
Rules affected: Pass 1: DES-75, ECF-20. Pass 2: FAIL-ALERT-PREFLIGHT.
Why this matters: It decides whether Scott gets a push alert before a scheduled run starts on a dead host.
Resolution:

## Ambiguity #36
Topic: `availability` is defined per host, but login and SELECT INBOX are per account (cPanel B has two logins).
Kind: both flagged
Reading A (Pass 1): DES-37 (definition, medium) (01-design-v0.2.md L116): unclear whether the check logs into one or both cPanel B accounts.
Reading B (Pass 2): TOOL-AVAILABILITY (definition, medium) (01-design-v0.2.md L116): readings: one login per host, or every account logged in and selected.
Rules affected: Pass 1: DES-37. Pass 2: TOOL-AVAILABILITY.
Why this matters: A per-host check can report healthy while one cPanel B account's password is broken.
Resolution:

## Ambiguity #37
Topic: `availability` is listed as an excluded Spark-only feature and also as a v1 server tool.
Kind: both flagged
Reading A (Pass 1): DES-05 (structural gate, low) and X-01 (definition, low): L23 excludes "availability" while L116 defines an `availability` health-check tool (01-design-v0.2.md L23 vs L116). Readings: L23 means Spark's calendar availability and the server tool reuses the name, or the tool is out of scope; reusing the name with different semantics strains drop-in compatibility.
Reading B (Pass 2): NG-NO-SPARK-ONLY-FEATURES (structural gate, low): same two readings (01-design-v0.2.md L23, L116).
Rules affected: Pass 1: DES-05, X-01, DES-37. Pass 2: NG-NO-SPARK-ONLY-FEATURES, TOOL-AVAILABILITY.
Why this matters: It decides whether the health-check tool exists and what name skills call.
Resolution:

## Ambiguity #38
Topic: Whether `accounts` reachability is a live check on each call or a cached status.
Kind: both flagged
Reading A (Pass 1): DES-36 (definition, medium) (01-design-v0.2.md L115): a live check costs about 750 ms per account and adds login attempts relevant to cPHulk.
Reading B (Pass 2): TOOL-ACCOUNTS (definition, high; no flag).
Rules affected: Pass 1: DES-36. Pass 2: TOOL-ACCOUNTS.
Why this matters: Live checks add logins that raise cPHulk block risk; cached status can be stale.
Resolution:

## Ambiguity #39
Topic: `action` batching: multiple IDs in one call, per-ID failure results, and whether one call may mix accounts and hosts.
Kind: both flagged
Reading A (Pass 1): ECF-15 (structural gate, medium) (skill-email-crap-filter.md L80-L81): `action` must accept a list of IDs and report per-ID failure without aborting; unclear whether one call may mix accounts and whether Spark returns per-ID results; reading: per-ID results, mixed accounts allowed.
Reading B (Pass 2): TOOL-ACTION-BATCH (definition, medium): design `action` row (L121) does not mention multiple IDs or partial-failure results; unclear whether one call may mix accounts; read as multi-ID with per-ID results. ECF-B-BATCH-CONTINUE (sequencing, high; no flag).
Rules affected: Pass 1: ECF-15. Pass 2: TOOL-ACTION-BATCH, ECF-B-BATCH-CONTINUE, TOOL-ACTION. (Type disagreement is #100.)
Why this matters: All-or-nothing batches could leave Scott's leads unpinned when one ID fails.
Resolution:

## Ambiguity #40
Topic: Whether the server should refuse Trash (or Junk) as a `move` target.
Kind: both flagged
Reading A (Pass 1): DES-42 (definition, medium): `move` to a named folder permits Trash, which email-crap-filter forbids and least privilege does not cover (01-design-v0.2.md L121). ECF-14 (structural gate, medium): skill must never delete, move to trash, unsubscribe, send or unpin (skill-email-crap-filter.md L79); unclear whether the server enforces any of these.
Reading B (Pass 2): TOOL-ACTION-MOVE-TARGETS (other, medium; Pass 2 only): readings: Trash allowed since not permanent delete and the skill polices itself, or refused under least privilege (01-design-v0.2.md L121, L53; skill-email-crap-filter.md L79). TOOL-ACTION and ECF-B-FORBIDDEN-ACTIONS carry no flag.
Rules affected: Pass 1: DES-42, ECF-14. Pass 2: TOOL-ACTION, ECF-B-FORBIDDEN-ACTIONS, TOOL-ACTION-MOVE-TARGETS (found by only one pass).
Why this matters: It decides whether a skill error can move business mail into Trash.
Resolution:

## Ambiguity #41
Topic: D5 Archive folder: never auto-create (leaning) vs "use existing, else create" (options text); whether D5 is decided.
Kind: both flagged
Reading A (Pass 1): DES-58 (structural gate, low) (01-design-v0.2.md L165): options column says create if absent, leaning says never auto-create and a missing Archive is an error; D5 lacks a DECIDED marker.
Reading B (Pass 2): FOLD-ARCHIVE-NO-AUTOCREATE (structural gate, medium) (01-design-v0.2.md L165): same split, takes the leaning; cPanel B Archive unverified (02-spike-results.md L61).
Rules affected: Pass 1: DES-58. Pass 2: FOLD-ARCHIVE-NO-AUTOCREATE.
Why this matters: If cPanel B has no Archive folder, Noise archiving on YCD inboxes either errors or creates a new folder Scott will see.
Resolution:

## Ambiguity #42
Topic: Archive move has not been exercised; whether Spark shows it as archived; cPanel B Archive unverified.
Kind: both flagged
Reading A (Pass 1): SPK-08 (tracking-only, high): `\Flagged` shows pinned; archive move not yet exercised (02-spike-results.md L72). ECF-13 (structural gate, high): Noise archived via `action archive` (skill-email-crap-filter.md L77-L78), no flag.
Reading B (Pass 2): TEST-ARCHIVE-PIN-SPARK (structural gate, medium): archive half untested and deferred to integration tests, which meets the cPanel B testing conflict (01-design-v0.2.md L191; 02-spike-results.md L72). ECF-B-ARCHIVE-NOISE (definition, medium): archive untested; cPanel B Archive unverified; if missing it errors; display as archived untested.
Rules affected: Pass 1: SPK-08, ECF-13. Pass 2: TEST-ARCHIVE-PIN-SPARK, ECF-B-ARCHIVE-NOISE. (Type disagreements are #94 and #99.)
Why this matters: Archived Noise may not appear archived in Spark, or archiving may fail on YCD inboxes.
Resolution:

## Ambiguity #43
Topic: ID lookup fallback: UID missing while UIDVALIDITY matches, search scope, and duplicate or missing Message-ID.
Kind: both flagged
Reading A (Pass 1): DES-45 (sequencing, medium) (01-design-v0.2.md L126): fallback should also cover a missing UID with matching UIDVALIDITY (the archive case); search scope not stated; behavior on multiple or absent Message-ID not stated. ECF-16 (other, medium; Pass 1 only): archived messages must remain findable; inferred by combining sources.
Reading B (Pass 2): ID-LOOKUP-FALLBACK (sequencing, medium) (01-design-v0.2.md L126): scope not stated (same folder, Archive, or all folders); behavior on several matches or none not stated.
Rules affected: Pass 1: DES-45, ECF-16 (found by only one pass). Pass 2: ID-LOOKUP-FALLBACK.
Why this matters: A thread or reply call on an archived message could fail or return the wrong message.
Resolution:

## Ambiguity #44
Topic: How several filter tokens combine (AND), and whether quoting, negation and OR are supported.
Kind: found by only one pass
Reading A (Pass 1): No standalone rule. DES-46 note: combination not stated (AND is the Gmail convention and the skills need it); quoted values, negation and OR not addressed. ECF-04 note: two tokens must combine as AND.
Reading B (Pass 2): FILTER-COMBINED-TOKENS (calculation, medium; Pass 2 only): a filter may combine tokens (skill-email-crap-filter.md L34-L35: "`filter: \"from:mailer-daemon newer_than:3d\"`") and they must AND; design does not state the rule; no OR or negation, so "-is:pinned" would be an unknown-token error.
Rules affected: Pass 1: DES-46, ECF-04. Pass 2: FILTER-COMBINED-TOKENS (found by only one pass).
Why this matters: An undefined combination rule could make the bounce filters return the wrong set.
Resolution:

## Ambiguity #45
Topic: `newer_than:Nd` maps to date-granular IMAP SINCE, which differs from a rolling window.
Kind: found by only one pass
Reading A (Pass 1): No standalone rule. DES-46 note: SINCE and BEFORE are date-granular, so `newer_than:3d` covers today-3 from midnight, not a rolling 72 hours; only a `d` unit is given.
Reading B (Pass 2): FILTER-NEWER-THAN-SEMANTICS (calculation, medium; Pass 2 only): `newer_than:Nd` is SINCE the date N days before today in America/Indianapolis (01-design-v0.2.md L137, L143); may return up to almost a day more than Spark; unclear whether to trim by exact time; the parallel run "same messages found" may surface it.
Rules affected: Pass 1: DES-46. Pass 2: FILTER-NEWER-THAN-SEMANTICS (found by only one pass).
Why this matters: Results may differ from Spark and fail the parallel-run comparison.
Resolution:

## Ambiguity #46
Topic: `from:` matching semantics: case, and whether it matches display name, address, or both.
Kind: both flagged
Reading A (Pass 1): ECF-04 (sequencing, medium): bounce senders appear as "MAILER-DAEMON" or "mailer-daemon@googlemail.com"; relies on `from:` as case-insensitive substring on the From header; Spark may have matched differently.
Reading B (Pass 2): FILTER-FROM-MATCH (calculation, medium; Pass 2 only): must match cPanel, Google, Microsoft and Mimecast bounce senders (skill-email-crap-filter.md L30-L31; 01-design-v0.2.md L134); case handling and display-name coverage not stated; assumes IMAP-standard behavior. ECF-C-EMAILS-CALLS carries no flag.
Rules affected: Pass 1: ECF-04. Pass 2: ECF-C-EMAILS-CALLS, FILTER-FROM-MATCH (found by only one pass).
Why this matters: A narrower match would miss bounces from some providers.
Resolution:

## Ambiguity #47
Topic: Which folders `search` covers within an account.
Kind: both flagged
Reading A (Pass 1): DES-40 note: Inbox only, all folders, or all but Trash and Junk not stated (01-design-v0.2.md L119). ECF-06 (definition, medium; Pass 1 only): which folders of the `in` account are searched not stated.
Reading B (Pass 2): not raised (TOOL-SEARCH note covers `in` and word matching only).
Rules affected: Pass 1: DES-40, ECF-06 (found by only one pass). Pass 2: TOOL-SEARCH.
Why this matters: It decides whether reply lookups and bounce searches find archived or sent mail.
Resolution:

## Ambiguity #48
Topic: Shape and default of the `search` `in` parameter.
Kind: both flagged
Reading A (Pass 1): ECF-06 (definition, medium; Pass 1 only): `search` must accept `in` naming one account (skill-email-crap-filter.md L37; 01-design-v0.2.md L44); unclear whether `in` also accepts `<account>:<Folder>`.
Reading B (Pass 2): TOOL-SEARCH (definition, medium): skill passes `in: "scott@reasinger.net"` (skill-email-crap-filter.md L37); not stated whether omitting `in` means all accounts.
Rules affected: Pass 1: DES-40, ECF-06 (found by only one pass). Pass 2: TOOL-SEARCH.
Why this matters: It fixes the call shape both skills depend on.
Resolution:

## Ambiguity #49
Topic: Whether `emails` on Sent with only `to:<address>` reaches a message 7 to 10 days old (touch 7), given default lookback and paging.
Kind: found by only one pass
Reading A (Pass 1): GIR-20 (other, medium; Pass 1 only): touch 7 follows touch 1 by 7 to 10 days (skill-get-in-the-room.md L257, L359; 01-design-v0.2.md L126); the skill re-finds the original each time, so default lookback and paging must reach it with no date filter.
Reading B (Pass 2): not found.
Rules affected: Pass 1: GIR-20.
Why this matters: A default lookback shorter than 10 days would make the touch-7 forward impossible to create.
Resolution:

## Ambiguity #50
Topic: Whether pin and archive act per message or per thread, given Spark may have acted on whole conversations.
Kind: found by only one pass
Reading A (Pass 1): not found.
Reading B (Pass 2): ECF-B-UNIT-OF-WORK (definition, medium; Pass 2 only): Part B acts on message IDs; the thread-as-unit rule is Gmail-only (skill-email-crap-filter.md L75-L76, L88-L89, L85-L86); Spark's granularity is not described, so the parallel run "same pins applied" may differ.
Rules affected: Pass 2: ECF-B-UNIT-OF-WORK.
Why this matters: Per-message pins could leave other messages of the same conversation untriaged in Spark.
Resolution:

## Ambiguity #51
Topic: Which Part A (Gmail) rules carry into Part B (business inboxes).
Kind: found by only one pass
Reading A (Pass 1): ECF-23 (other, medium; Pass 1 only): read and unread are both in scope for Part B (skill-email-crap-filter.md L266); the include_read comment uses Gmail terms and may be Gmail-only.
Reading B (Pass 2): ECF-B-SAFETY-NO-ARCHIVE (structural gate, medium; Pass 2 only): a message with a safety term is never archived (skill-email-crap-filter.md L132, L139); those lines sit in the Gmail-scoped section but Part B adopts "Same taxonomy and rules as Part A". ECF-SNIPPET-FIRST (other, medium; Pass 2 only): classify from subject, sender and snippet; open bodies only when thin (skill-email-crap-filter.md L184-L186); Part A scoped but probably applies to Part B.
Rules affected: Pass 1: ECF-23. Pass 2: ECF-B-SAFETY-NO-ARCHIVE, ECF-SNIPPET-FIRST.
Why this matters: It decides whether a safety-term message on a business account could be archived and how often bodies are fetched.
Resolution:

## Ambiguity #52
Topic: Draft delete: permanent expunge or move to Trash; a call carrying only the ID.
Kind: both flagged
Reading A (Pass 1): GIR-12 (definition, medium) (skill-get-in-the-room.md L360): "alone" means no `account`, so the server derives the account from the ID; "permanent" implies expunge, consistent with DES-07.
Reading B (Pass 2): DRAFT-DELETE-PERMANENT (definition, medium) (skill-get-in-the-room.md L360): design is silent on expunge vs Trash; skill expects permanent; reading taken but not confirmed.
Rules affected: Pass 1: GIR-12. Pass 2: DRAFT-DELETE-PERMANENT.
Why this matters: It decides whether deleted drafts pile up in Trash in Spark.
Resolution:

## Ambiguity #53
Topic: New-draft parameters: `to` as single address or list; whether cc and bcc exist.
Kind: both flagged
Reading A (Pass 1): GIR-07 (definition, medium) (skill-get-in-the-room.md L357): cc and bcc support not stated; `to` format not stated.
Reading B (Pass 2): DRAFT-NEW-PARAMS (definition, high; no flag).
Rules affected: Pass 1: GIR-07. Pass 2: DRAFT-NEW-PARAMS.
Why this matters: It fixes whether multi-recipient or copied outreach can be drafted.
Resolution:

## Ambiguity #54
Topic: Reply call passes `account` and an ID that already encodes the account; behavior when they differ.
Kind: both flagged
Reading A (Pass 1): GIR-08 (definition, medium) (skill-get-in-the-room.md L358): `account` redundant; error vs ID wins not stated; whether reply accepts `body` implied but not stated.
Reading B (Pass 2): DRAFT-REPLY-PARAMS (definition, medium) (skill-get-in-the-room.md L358; 01-design-v0.2.md L126): not stated whether the server rejects or trusts one.
Rules affected: Pass 1: GIR-08, GIR-12. Pass 2: DRAFT-REPLY-PARAMS.
Why this matters: A mismatch could create a reply draft in the wrong mailbox.
Resolution:

## Ambiguity #55
Topic: `reply_all` parameter shape.
Kind: both flagged
Reading A (Pass 1): GIR-09 (definition, medium) (skill-get-in-the-room.md L358): `reply_all: <message ID>` as its own key, or boolean `reply_all: true` beside `reply_to`.
Reading B (Pass 2): not raised (DRAFT-REPLY-PARAMS records "a reply to everyone uses `reply_all`").
Rules affected: Pass 1: GIR-09. Pass 2: DRAFT-REPLY-PARAMS.
Why this matters: It fixes the exact call shape the skill sends.
Resolution:

## Ambiguity #56
Topic: Edit failure ordering: what happens if the append succeeds and the delete of the old draft fails.
Kind: both flagged
Reading A (Pass 1): DES-52 note: order of append and delete on failure not stated (01-design-v0.2.md L150).
Reading B (Pass 2): not raised (DRAFT-EDIT, no flag).
Rules affected: Pass 1: DES-52. Pass 2: DRAFT-EDIT.
Why this matters: A half-failed edit could leave two drafts in Spark for the same recipient.
Resolution:

## Ambiguity #57
Topic: Whether draft operations on scott@yourcigardenindy.com and founders@yourcigardenindy.com are in v1 scope.
Kind: found by only one pass
Reading A (Pass 1): not found as a rule. GIR-06 (account per purpose) assumes drafts on all three accounts.
Reading B (Pass 2): ACCT-USAGE-SCOPE (definition, medium; Pass 2 only): design table lists the YCD accounts as crap-filter Part B only (01-design-v0.2.md L34-L36), while get-in-the-room assigns drafts to them (skill-get-in-the-room.md L353-L354); readings: table incomplete and drafts are supported on all three, or YCD draft operations are out of v1. GITR-SPARK-ALL-ACCOUNTS (definition, high; Pass 2 only): the mail system serves every account for get-in-the-room, chosen per purpose (skill-get-in-the-room.md L7, L348).
Rules affected: Pass 1: GIR-06. Pass 2: ACCT-USAGE-SCOPE, GITR-SPARK-ALL-ACCOUNTS.
Why this matters: It decides whether founder and YCD outreach drafts work through the server at cutover.
Resolution:

## Ambiguity #58
Topic: What drop-in compatibility covers: the subset of calls the skills make, Spark's full schema, or Spark behavior too.
Kind: both flagged
Reading A (Pass 1): DES-11 (structural gate, medium): Spark schemas and filter grammar are never documented (01-design-v0.2.md L52, L111); "mirror" means the skill subset or Spark's full schema; also conflicts with D6. DES-35 (definition, high; Pass 1 only as a separate rule): names and parameters follow Spark; exact schemas set in the spec (01-design-v0.2.md L111).
Reading B (Pass 2): COMPAT-DROP-IN (structural gate, medium) (01-design-v0.2.md L52, L111): several skill behaviors cannot carry over by prefix swap (signature, send, send confirmation, edit ID); readings: call shapes only, or mimic Spark behavior wherever a skill depends on it.
Rules affected: Pass 1: DES-11, DES-35 (found by only one pass). Pass 2: COMPAT-DROP-IN.
Why this matters: It decides how much skill text must change at cutover beyond the prefix.
Resolution:

## Ambiguity #59
Topic: Timeout values and whether "every read" or "every network step" carries a timeout.
Kind: both flagged
Reading A (Pass 1): DES-21 (structural gate, medium): no values given; design says every read (01-design-v0.2.md L79), spike says every network step (02-spike-results.md L26); broader reading taken.
Reading B (Pass 2): IMAP-EXPLICIT-TIMEOUTS (structural gate, high; no flag).
Rules affected: Pass 1: DES-21. Pass 2: IMAP-EXPLICIT-TIMEOUTS.
Why this matters: Values set how long a scheduled run waits before reporting a host down.
Resolution:

## Ambiguity #60
Topic: "Parallel across accounts" means two concurrent sessions to cPanel B.
Kind: both flagged
Reading A (Pass 1): DES-32 (sequencing, medium) (01-design-v0.2.md L105, L177): two accounts share cPanel B; unclear whether that is intended given R6 limits and cPHulk.
Reading B (Pass 2): CONN-PARALLELISM (sequencing, high; no flag).
Rules affected: Pass 1: DES-32. Pass 2: CONN-PARALLELISM.
Why this matters: Concurrent logins to one host may trip connection limits or cPHulk.
Resolution:

## Ambiguity #61
Topic: Whether Trash and Junk are addressable logical names in `<account>:<Folder>`.
Kind: both flagged
Reading A (Pass 1): DES-29 (definition, medium): L101 names four logical names, but discovery covers \Trash and \Junk and the spike map lists them (02-spike-results.md L48-L55).
Reading B (Pass 2): FOLD-LOGICAL-NAMES (definition, high; no flag).
Rules affected: Pass 1: DES-29. Pass 2: FOLD-LOGICAL-NAMES. (Related: #40.)
Why this matters: It decides whether skills can read or target Junk and Trash by name.
Resolution:

## Ambiguity #62
Topic: Folder cache: where it lives, how long, invalidation, and who overrides.
Kind: both flagged
Reading A (Pass 1): DES-26 (definition, medium) (01-design-v0.2.md L98): "cached" has no scope (isolate, request, or persisted KV or Durable Object); "first connect" may be per request; "overridable" does not say by whom.
Reading B (Pass 2): FOLD-CACHE-OVERRIDE (definition, medium) (01-design-v0.2.md L98): cache location and invalidation not stated; override replaces or adds not stated. ACCT-REGISTRY-STATIC (definition, high; no flag).
Rules affected: Pass 1: DES-26. Pass 2: ACCT-REGISTRY-STATIC, FOLD-CACHE-OVERRIDE.
Why this matters: A stale cache could route actions to a renamed or removed folder.
Resolution:

## Ambiguity #63
Topic: Name-matching rules for the folder discovery fallback.
Kind: both flagged
Reading A (Pass 1): DES-27 (sequencing, medium) (01-design-v0.2.md L101): which names, case sensitivity and prefix handling not specified.
Reading B (Pass 2): FOLD-DISCOVERY (sequencing, high; no flag).
Rules affected: Pass 1: DES-27. Pass 2: FOLD-DISCOVERY.
Why this matters: cPanel B folders without SPECIAL-USE could map to the wrong folder.
Resolution:

## Ambiguity #64
Topic: The cPanel B IMAP host name.
Kind: both flagged
Reading A (Pass 1): DES-10a (tracking-only, medium): table shows "(yourcigardenindy.com)" (01-design-v0.2.md L35-L36) while L38 says still to confirm; may be the web host record by analogy with cPanel A.
Reading B (Pass 2): ACCT-CPANEL-B-HOST-UNCONFIRMED (tracking-only, medium): same two readings (placeholder vs usable), treated as unconfirmed.
Rules affected: Pass 1: DES-10a. Pass 2: ACCT-CPANEL-B-HOST-UNCONFIRMED.
Why this matters: A wrong host fails TLS and leaves both YCD inboxes unreached.
Resolution:

## Ambiguity #65
Topic: How cPanel B is verified when integration tests run only against a cPanel A test mailbox and never against live inboxes.
Kind: both flagged
Reading A (Pass 1): DES-70 (structural gate, low) (01-design-v0.2.md L202 vs L183, L165): readings: create a cPanel B test mailbox (not stated); verify read-only against live inboxes (violates the rule); or verify only in the parallel run. SPK-05 (tracking-only, medium): cPanel B pending; "list-only run" unclear (02-spike-results.md L68-L69).
Reading B (Pass 2): TEST-CPANEL-B-CONFLICT (structural gate, low; Pass 2 only as a separate rule): same three readings. ACCT-CPANEL-B-FOLDERS-PENDING (tracking-only, medium): unclear whether it blocks build or acceptance (02-spike-results.md L69; 01-design-v0.2.md L188). TEST-NEVER-LIVE (structural gate, high; no flag).
Rules affected: Pass 1: DES-70, SPK-05, DES-58. Pass 2: TEST-NEVER-LIVE, TEST-CPANEL-B-CONFLICT, ACCT-CPANEL-B-FOLDERS-PENDING, FOLD-ARCHIVE-NO-AUTOCREATE.
Why this matters: cPanel B protocol, folders and Archive may reach production untested.
Resolution:

## Ambiguity #66
Topic: Spike gate status: marked COMPLETE while criteria are partly met, criterion 1 still names imapflow and MOVE, and the closing results table is blank.
Kind: both flagged
Reading A (Pass 1): X-11 (structural gate, low; Pass 1 contradiction record): COMPLETE (01-design-v0.2.md L183) vs laptop not checked (L174), desktop and laptop required (L189), MOVE on both hosts (L187), archive not exercised (02-spike-results.md L72), blank table (L88-L94); readings: gate passed with checks moved to integration and acceptance, or gate not passed. DES-66 (structural gate, low) and DES-67 (tracking-only, low) record the criteria and status. SPK-10 (tracking-only, low): blank table is leftover template, or an unfinished sign-off.
Reading B (Pass 2): SPIKE-RESULTS-TABLE-BLANK (tracking-only, low): same two readings for the blank table (02-spike-results.md L80-L94); design COMPLETE supports the template reading.
Rules affected: Pass 1: X-11, DES-66, DES-67, SPK-10. Pass 2: SPIKE-RESULTS-TABLE-BLANK.
Why this matters: It decides whether build may start before the open spike checks are closed.
Resolution:

## Ambiguity #67
Topic: Laptop display of IMAP-appended drafts in Spark is not yet checked.
Kind: both flagged
Reading A (Pass 1): DES-61 (tracking-only, low): laptop not yet checked (01-design-v0.2.md L174); conflicts with criterion 3 "passed".
Reading B (Pass 2): DRAFT-SPARK-VISIBILITY (structural gate, low) (01-design-v0.2.md L189, L174; 02-spike-results.md L70): readings: fully passed with laptop as residual risk, or only partly passed and the laptop check is still a gate, which the success test also needs.
Rules affected: Pass 1: DES-61, X-11. Pass 2: DRAFT-SPARK-VISIBILITY. (Type disagreement is #89.)
Why this matters: The success test requires the draft on the laptop, which has never been observed.
Resolution:

## Ambiguity #68
Topic: Which IMAP commands the client must implement beyond those exercised: MOVE, delete and expunge, body fetch.
Kind: both flagged
Reading A (Pass 1): SPK-03 (definition, medium) (02-spike-results.md L36-L44): archive move, draft delete and body fetch are required by the tools but not exercised; MOVE vs COPY plus delete depends on server capability, unrecorded. DES-66 note: criterion 1 includes MOVE (01-design-v0.2.md L187); spike restatement omits it (02-spike-results.md L82).
Reading B (Pass 2): IMAP-REQUIRED-COMMANDS (definition, low) (01-design-v0.2.md L187; 02-spike-results.md L82): MOVE required but untested, or criterion narrowed; archive and move need some move operation either way.
Rules affected: Pass 1: SPK-03, DES-66. Pass 2: IMAP-REQUIRED-COMMANDS.
Why this matters: Archive and draft delete depend on commands nobody has run against cPanel.
Resolution:

## Ambiguity #69
Topic: Whether the spike's protocol tolerance cases (LITERAL+ on and off, literal mailbox names, auth failure, silent-server timeout) are a production requirement, and cPanel B capabilities.
Kind: both flagged
Reading A (Pass 1): SPK-01 (structural gate, medium) (02-spike-results.md L28): describes prototype testing; read as a carried-forward test requirement, alternative is history only. SPK-02 (definition, medium; Pass 1 only): observed Dovecot capabilities on cPanel A only (02-spike-results.md L21, L44); cPanel B unrecorded; unclear whether the client must work without LITERAL+.
Reading B (Pass 2): IMAP-PROTOCOL-TOLERANCE (other, medium) (02-spike-results.md L28): read as minimum cases the client must handle; alternative is a record of spike coverage.
Rules affected: Pass 1: SPK-01, SPK-02 (found by only one pass). Pass 2: IMAP-PROTOCOL-TOLERANCE. (Type disagreement is #93.)
Why this matters: It decides whether these cases are required tests in the build.
Resolution:

## Ambiguity #70
Topic: Parallel run against both Spark and the server on the same live inboxes: interference and pass criteria.
Kind: both flagged
Reading A (Pass 1): DES-71 (structural gate, medium) (01-design-v0.2.md L207): the second run sees the first run's pins, so "same pins" cannot be compared naively; unclear whether one path runs read-only; unclear whether explained differences pass.
Reading B (Pass 2): ACCEPT-PARALLEL-RUN (structural gate, medium) (01-design-v0.2.md L207): same points, including archives leaving the Inbox.
Rules affected: Pass 1: DES-71. Pass 2: ACCEPT-PARALLEL-RUN.
Why this matters: Without a defined method the acceptance run cannot pass or fail cleanly, and live mail gets double-acted on.
Resolution:

## Ambiguity #71
Topic: Sample size and pass threshold for comparing thread output to Spark.
Kind: both flagged
Reading A (Pass 1): DES-62 (tracking-only, medium) (01-design-v0.2.md L176): not stated.
Reading B (Pass 2): ACCEPT-THREAD-COMPARE (tracking-only, medium) (01-design-v0.2.md L176): not stated.
Rules affected: Pass 1: DES-62. Pass 2: ACCEPT-THREAD-COMPARE.
Why this matters: It sets how thread differences are judged at acceptance.
Resolution:

## Ambiguity #72
Topic: D3: upstream OAuth identity provider and token lifetimes.
Kind: both flagged
Reading A (Pass 1): DES-25 (other, low) (01-design-v0.2.md L86, L163): GitHub (ironfis1) leaning, Google, or Cloudflare Access; no token lifetime given; cannot be built without resolution.
Reading B (Pass 2): AUTH-UPSTREAM-IDP-OPEN (tracking-only, medium) (01-design-v0.2.md L86, L163): same options, leaning GitHub, no lifetime proposed.
Rules affected: Pass 1: DES-25. Pass 2: AUTH-UPSTREAM-IDP-OPEN. (Type disagreement is #82.)
Why this matters: It decides how Scott signs in to the connector and how often scheduled tasks need re-auth.
Resolution:

## Ambiguity #73
Topic: Hosting: "Primary" implies a fallback; whether the spike's Cloudflare account is the new dedicated account.
Kind: both flagged
Reading A (Pass 1): DES-18 (structural gate, medium) (01-design-v0.2.md L77): "Primary" vs L79 "Fly.io/VPS is no longer the fallback" and D2 decided; unclear whether the spike account (02-spike-results.md L17, "subdomain reasinger-ops") is the new dedicated account.
Reading B (Pass 2): HOST-DEDICATED-CF-ACCOUNT (structural gate, high; no flag). HOST-NO-FALLBACK-PLATFORM (definition, high; Pass 2 only): Fly.io or VPS is not a fallback; Workers is decided (01-design-v0.2.md L79, L162).
Rules affected: Pass 1: DES-18. Pass 2: HOST-DEDICATED-CF-ACCOUNT, HOST-NO-FALLBACK-PLATFORM (found by only one pass).
Why this matters: It decides where production deploys and whether the isolation requirement is already met.
Resolution:

## Ambiguity #74
Topic: Egress IP whitelisting: never available, or possible if a stable-egress option is adopted.
Kind: both flagged
Reading A (Pass 1): DES-34 (other, medium): L107 says Workers lacks stable egress "by default"; L173 says whitelisting "is not available".
Reading B (Pass 2): CONN-NO-IP-WHITELIST (other, high; no flag): not available; manual unblock.
Rules affected: Pass 1: DES-34. Pass 2: CONN-NO-IP-WHITELIST.
Why this matters: It decides whether a cPHulk block can be prevented or must always be cleared by hand.
Resolution:

## Ambiguity #75
Topic: Logging of subjects, filter and query strings (which can hold full addresses) and error messages.
Kind: both flagged
Reading A (Pass 1): DES-74 (tracking-only, medium) (01-design-v0.2.md L214): subjects not mentioned; filter and query strings and error text not addressed; "account" field read as exempt from the address rule.
Reading B (Pass 2): LOG-FIELDS (definition, high) and LOG-EXCLUSIONS (structural gate, high); no flag.
Rules affected: Pass 1: DES-74. Pass 2: LOG-FIELDS, LOG-EXCLUSIONS. (Type disagreement is #91.)
Why this matters: Logging a `to:<address>` filter would put a correspondent's full address in logs.
Resolution:

## Ambiguity #76
Topic: Whether ToolSearch loading still applies to the remote connector, and stale "Spark" wording in skill descriptions after cutover.
Kind: both flagged
Reading A (Pass 1): ECF-24 (definition, medium) (skill-email-crap-filter.md L3, L19; 01-design-v0.2.md L209): whether the ToolSearch step still applies is not stated. GIR-17 (definition, medium) (skill-get-in-the-room.md L348, L7): "sends" in L7; read as Scott sends.
Reading B (Pass 2): COMPAT-SKILL-TOOL-NAMES (definition, high; no flag) (skill-email-crap-filter.md L19-L20; skill-get-in-the-room.md L348; 01-design-v0.2.md L209).
Rules affected: Pass 1: ECF-24, GIR-17. Pass 2: COMPAT-SKILL-TOOL-NAMES.
Why this matters: It decides the exact skill edits at cutover.
Resolution:

## Ambiguity #77
Topic: Platform secret names for the two cPanel B accounts.
Kind: both flagged
Reading A (Pass 1): DES-26 note: secret names for the other two accounts are not given (01-design-v0.2.md L96 shows only IMAP_PASS_REASINGER_SCOTT).
Reading B (Pass 2): not raised (ACCT-REGISTRY-STATIC, no flag).
Rules affected: Pass 1: DES-26. Pass 2: ACCT-REGISTRY-STATIC.
Why this matters: Config and README cannot be written for the YCD accounts until named.
Resolution:

## Ambiguity #78
Topic: Worker bundle size limit.
Kind: found by only one pass
Reading A (Pass 1): not found.
Reading B (Pass 2): HOST-BUNDLE-LIMIT (tracking-only, medium; Pass 2 only): stay under 3 MB free / 10 MB paid (02-spike-results.md L9, L28); mentioned only as context; plan not stated.
Rules affected: Pass 2: HOST-BUNDLE-LIMIT.
Why this matters: Low; the native client bundle is 4.6 KB gzip, but the plan choice is unstated.
Resolution:

## Ambiguity #79
Topic: Compiled list of filter strings the translator must handle.
Kind: found by only one pass
Reading A (Pass 1): not found as one rule; the same filters appear separately in ECF-04, ECF-05, ECF-09 and GIR-10.
Reading B (Pass 2): FILTER-SKILL-USES (definition, high; Pass 2 only): "from:mailer-daemon newer_than:3d", "from:postmaster newer_than:3d", "newer_than:3d", "newer_than:7d", "to:<address>" (skill-email-crap-filter.md L34-L35, L37, L60; skill-get-in-the-room.md L359).
Rules affected: Pass 2: FILTER-SKILL-USES. Pass 1 related: ECF-04, ECF-05, ECF-09, GIR-10.
Why this matters: Housekeeping; it gives the spec one test list for the filter translator.
Resolution:

## Ambiguity #80
Topic: Skill-internal behavior rules with no server behavior, recorded only by Pass 2.
Kind: found by only one pass
Reading A (Pass 1): not found.
Reading B (Pass 2): ECF-C-CODE-MEANING (definition, high): bounce code meanings and report wording (skill-email-crap-filter.md L42-L44; skill-get-in-the-room.md L363). ECF-C-NOTIFY (structural gate, high): any bounce triggers the scheduled notification (skill-email-crap-filter.md L46). ECF-B-NO-LABELS (definition, high): IMAP accounts have no AI/ labels; pin and archive stand in (skill-email-crap-filter.md L74).
Rules affected: Pass 2: ECF-C-CODE-MEANING, ECF-C-NOTIFY, ECF-B-NO-LABELS.
Why this matters: Housekeeping; decides whether skill-only rules belong in the server spec.
Resolution:

## Ambiguity #81
Topic: Type label for the goal statement.
Kind: conflict
Reading A (Pass 1): DES-01, structural gate, high: server is a cloud remote MCP server giving the skills' mailbox operations against cPanel IMAP so no task requires sarhomepc (01-design-v0.2.md L15).
Reading B (Pass 2): GOAL-NO-PC, definition, high: same statement (01-design-v0.2.md L15).
Rules affected: Pass 1: DES-01. Pass 2: GOAL-NO-PC.
Why this matters: Housekeeping; decides whether the goal is a tested gate.
Resolution:

## Ambiguity #82
Topic: Type label for the D3 open decision.
Kind: conflict
Reading A (Pass 1): DES-25, other, low (01-design-v0.2.md L86, L163).
Reading B (Pass 2): AUTH-UPSTREAM-IDP-OPEN, tracking-only check, medium (01-design-v0.2.md L86, L163).
Rules affected: Pass 1: DES-25. Pass 2: AUTH-UPSTREAM-IDP-OPEN. (Substance is #72.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #83
Topic: Type label for the opaque stable message ID.
Kind: conflict
Reading A (Pass 1): DES-44, calculation, high: opaque ID encodes account, folder, UIDVALIDITY, UID, Message-ID; stable across calls and sessions (01-design-v0.2.md L126).
Reading B (Pass 2): ID-OPAQUE-STABLE, definition, high: same (01-design-v0.2.md L126).
Rules affected: Pass 1: DES-44. Pass 2: ID-OPAQUE-STABLE.
Why this matters: Housekeeping.
Resolution:

## Ambiguity #84
Topic: Type label for the filter token table.
Kind: conflict
Reading A (Pass 1): DES-46, calculation, medium: the eight token translations (01-design-v0.2.md L130-L141).
Reading B (Pass 2): FILTER-TOKENS, definition, high: same (01-design-v0.2.md L130-L141).
Rules affected: Pass 1: DES-46. Pass 2: FILTER-TOKENS. (Flags are #44, #45.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #85
Topic: Type label for the new-draft APPEND rule.
Kind: conflict
Reading A (Pass 1): DES-49, sequencing, low; X-10, definition, low (01-design-v0.2.md L147; 02-spike-results.md L44).
Reading B (Pass 2): DRAFT-NEW-APPEND, definition, medium (01-design-v0.2.md L147).
Rules affected: Pass 1: DES-49, X-10. Pass 2: DRAFT-NEW-APPEND. (Substance is #12.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #86
Topic: Type label for the edit mechanism.
Kind: conflict
Reading A (Pass 1): DES-52, sequencing, medium: edit appends new version, deletes old draft UID, returns new ID (01-design-v0.2.md L150).
Reading B (Pass 2): DRAFT-EDIT, definition, high: same (01-design-v0.2.md L150).
Rules affected: Pass 1: DES-52. Pass 2: DRAFT-EDIT. (Flags are #19, #20, #56.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #87
Topic: Type label for building Re:/Fwd: from the decoded subject and re-encoding on write.
Kind: conflict
Reading A (Pass 1): DES-56, structural gate, high (one rule covering decode and re-encode) (01-design-v0.2.md L154).
Reading B (Pass 2): HDR-REENCODE-ON-WRITE, definition, high (01-design-v0.2.md L154; 02-spike-results.md L59). The decode half matches HDR-DECODE and is in the rule base.
Rules affected: Pass 1: DES-56. Pass 2: HDR-REENCODE-ON-WRITE.
Why this matters: Housekeeping; decides whether re-encoding is a tested gate.
Resolution:

## Ambiguity #88
Topic: Type label for "find the sent copy by recipient, subject and date".
Kind: conflict
Reading A (Pass 1): DES-57, sequencing, medium (01-design-v0.2.md L155).
Reading B (Pass 2): SEND-FIND-SENT-COPY, structural gate, high (01-design-v0.2.md L155).
Rules affected: Pass 1: DES-57. Pass 2: SEND-FIND-SENT-COPY. (Substance is #21.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #89
Topic: Type label for draft visibility in Spark (laptop).
Kind: conflict
Reading A (Pass 1): DES-61, tracking-only check, low (01-design-v0.2.md L174).
Reading B (Pass 2): DRAFT-SPARK-VISIBILITY, structural gate, low (01-design-v0.2.md L189, L174).
Rules affected: Pass 1: DES-61. Pass 2: DRAFT-SPARK-VISIBILITY. (Substance is #67.)
Why this matters: Housekeeping; decides whether the laptop check gates build.
Resolution:

## Ambiguity #90
Topic: Type label for the signature source-of-truth item.
Kind: conflict
Reading A (Pass 1): DES-64, other, low (01-design-v0.2.md L178).
Reading B (Pass 2): SIG-SOURCE-OF-TRUTH, tracking-only check, low (01-design-v0.2.md L178).
Rules affected: Pass 1: DES-64. Pass 2: SIG-SOURCE-OF-TRUTH. (Substance is #5.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #91
Topic: Type label for logging.
Kind: conflict
Reading A (Pass 1): DES-74, tracking-only check, medium: one rule for fields and exclusions (01-design-v0.2.md L214).
Reading B (Pass 2): LOG-FIELDS, definition, high; LOG-EXCLUSIONS, structural gate, high (01-design-v0.2.md L214, L56).
Rules affected: Pass 1: DES-74. Pass 2: LOG-FIELDS, LOG-EXCLUSIONS. (Substance is #75.)
Why this matters: Housekeeping; decides whether log exclusions are a tested gate.
Resolution:

## Ambiguity #92
Topic: Type label for secrets rotation.
Kind: conflict
Reading A (Pass 1): DES-76, structural gate, high: one secret update per password change, documented in README (01-design-v0.2.md L216).
Reading B (Pass 2): SEC-SECRET-ROTATION, other, high: same (01-design-v0.2.md L216).
Rules affected: Pass 1: DES-76. Pass 2: SEC-SECRET-ROTATION.
Why this matters: Housekeeping.
Resolution:

## Ambiguity #93
Topic: Type label for protocol tolerance tests.
Kind: conflict
Reading A (Pass 1): SPK-01, structural gate, medium (02-spike-results.md L28).
Reading B (Pass 2): IMAP-PROTOCOL-TOLERANCE, other, medium (02-spike-results.md L28).
Rules affected: Pass 1: SPK-01. Pass 2: IMAP-PROTOCOL-TOLERANCE. (Substance is #69.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #94
Topic: Type label for pin and archive display in Spark.
Kind: conflict
Reading A (Pass 1): SPK-08, tracking-only check, high (02-spike-results.md L72).
Reading B (Pass 2): TEST-ARCHIVE-PIN-SPARK, structural gate, medium (01-design-v0.2.md L191; 02-spike-results.md L72).
Rules affected: Pass 1: SPK-08. Pass 2: TEST-ARCHIVE-PIN-SPARK. (Substance is #42.)
Why this matters: Housekeeping; decides whether archive display gates acceptance.
Resolution:

## Ambiguity #95
Topic: Type label for bounce report fields.
Kind: conflict
Reading A (Pass 1): ECF-07, other, medium (skill-email-crap-filter.md L40-L41).
Reading B (Pass 2): ECF-C-REPORT-FIELDS, definition, medium (skill-email-crap-filter.md L40-L41).
Rules affected: Pass 1: ECF-07. Pass 2: ECF-C-REPORT-FIELDS. (Substance is #25, #26.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #96
Topic: Type label for Part B skipping pinned messages and bounces.
Kind: conflict
Reading A (Pass 1): ECF-10, structural gate, high: skip pinned, so `emails` must expose `\Flagged` (skill-email-crap-filter.md L60-L61).
Reading B (Pass 2): ECF-B-SKIP-PINNED-BOUNCES, other, medium: skip pinned and bounce notices (skill-email-crap-filter.md L60-L61).
Rules affected: Pass 1: ECF-10. Pass 2: ECF-B-SKIP-PINNED-BOUNCES. (Substance is #30.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #97
Topic: Type label for the Sent check on repliers.
Kind: conflict
Reading A (Pass 1): ECF-11, other, medium (skill-email-crap-filter.md L71-L72).
Reading B (Pass 2): ECF-B-SENT-CHECK, definition, medium (skill-email-crap-filter.md L71-L72).
Rules affected: Pass 1: ECF-11. Pass 2: ECF-B-SENT-CHECK. (Substance is #22.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #98
Topic: Type label for pinning Review Now, Founder lead and Career messages.
Kind: conflict
Reading A (Pass 1): ECF-12, structural gate, high (skill-email-crap-filter.md L74-L76).
Reading B (Pass 2): ECF-B-PIN, definition, high (skill-email-crap-filter.md L75-L76).
Rules affected: Pass 1: ECF-12. Pass 2: ECF-B-PIN.
Why this matters: Housekeeping.
Resolution:

## Ambiguity #99
Topic: Type label for archiving Noise and taking no action on other classes.
Kind: conflict
Reading A (Pass 1): ECF-13, structural gate, high: one rule covering both (skill-email-crap-filter.md L77-L78).
Reading B (Pass 2): ECF-B-ARCHIVE-NOISE, definition, medium (L77); ECF-B-OTHER-NO-ACTION, definition, high (L78).
Rules affected: Pass 1: ECF-13. Pass 2: ECF-B-ARCHIVE-NOISE, ECF-B-OTHER-NO-ACTION. (Archive substance is #42.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #100
Topic: Type label for action batching.
Kind: conflict
Reading A (Pass 1): ECF-15, structural gate, medium (skill-email-crap-filter.md L80-L81).
Reading B (Pass 2): TOOL-ACTION-BATCH, definition, medium; ECF-B-BATCH-CONTINUE, sequencing, high (skill-email-crap-filter.md L80-L81).
Rules affected: Pass 1: ECF-15. Pass 2: TOOL-ACTION-BATCH, ECF-B-BATCH-CONTINUE. (Substance is #39.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #101
Topic: Type label for "already replied" in the report.
Kind: conflict
Reading A (Pass 1): ECF-18, other, medium (skill-email-crap-filter.md L233-L234).
Reading B (Pass 2): ECF-REPORT-ALREADY-REPLIED, definition, medium (skill-email-crap-filter.md L233-L234).
Rules affected: Pass 1: ECF-18. Pass 2: ECF-REPORT-ALREADY-REPLIED. (Substance is #29.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #102
Topic: Type label for the Bounces slot of the report.
Kind: conflict
Reading A (Pass 1): ECF-19, other, low (skill-email-crap-filter.md L228-L229).
Reading B (Pass 2): ECF-REPORT-BOUNCES-FIRST, sequencing, medium (skill-email-crap-filter.md L228-L229).
Rules affected: Pass 1: ECF-19. Pass 2: ECF-REPORT-BOUNCES-FIRST. (Substance is #33.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #103
Topic: Type label and bundling for email-crap-filter error handling (Gmail down; Spark unreachable).
Kind: conflict
Reading A (Pass 1): ECF-21, structural gate, low: one rule covering both halves (skill-email-crap-filter.md L255-L257).
Reading B (Pass 2): ECF-GMAIL-DOWN, sequencing, high: Gmail half (L255-L256); the Spark half sits in FAIL-SKILL-UNREACHABLE-BRANCH, structural gate, low (L257).
Rules affected: Pass 1: ECF-21. Pass 2: ECF-GMAIL-DOWN, FAIL-SKILL-UNREACHABLE-BRANCH. (Spark-half substance is #33.)
Why this matters: Housekeeping; the Gmail-down half is otherwise unambiguous.
Resolution:

## Ambiguity #104
Topic: Type label for the lookback configuration.
Kind: conflict
Reading A (Pass 1): ECF-22, calculation, high: 7 days all parts, Part C 3 days (skill-email-crap-filter.md L264).
Reading B (Pass 2): ECF-LOOKBACK-CONFIG, definition, high: same, overridable by user (L261, L264).
Rules affected: Pass 1: ECF-22. Pass 2: ECF-LOOKBACK-CONFIG.
Why this matters: Housekeeping.
Resolution:

## Ambiguity #105
Topic: Type label for the edit ID change.
Kind: conflict
Reading A (Pass 1): GIR-11, definition, medium; X-08, definition, low (skill-get-in-the-room.md L360; 01-design-v0.2.md L150).
Reading B (Pass 2): DRAFT-EDIT-ID-CHANGE, other, low (skill-get-in-the-room.md L360; 01-design-v0.2.md L150).
Rules affected: Pass 1: GIR-11, X-08. Pass 2: DRAFT-EDIT-ID-CHANGE. (Substance is #19.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #106
Topic: Type label for the bounce query mismatch.
Kind: conflict
Reading A (Pass 1): GIR-15, sequencing, low (skill-get-in-the-room.md L363).
Reading B (Pass 2): BOUNCE-QUERY-MISMATCH, other, medium (skill-email-crap-filter.md L36; skill-get-in-the-room.md L363).
Rules affected: Pass 1: GIR-15. Pass 2: BOUNCE-QUERY-MISMATCH. (Substance is #24.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #107
Topic: Type label for touch email operations.
Kind: conflict
Reading A (Pass 1): GIR-19, other, low (skill-get-in-the-room.md L259-L260).
Reading B (Pass 2): GITR-TOUCH-EMAIL-OPS, definition, medium (skill-get-in-the-room.md L251, L257, L259, L260).
Rules affected: Pass 1: GIR-19. Pass 2: GITR-TOUCH-EMAIL-OPS. (Substance is #16.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #108
Topic: Type label for the YCD signature gap.
Kind: conflict
Reading A (Pass 1): X-12, definition, low (skill-get-in-the-room.md L357; 01-design-v0.2.md L97; skill-gatekeeper-panel.md L205).
Reading B (Pass 2): SIG-OTHER-ACCOUNTS-UNDEFINED, tracking-only check, medium (01-design-v0.2.md L97; skill-get-in-the-room.md L357).
Rules affected: Pass 1: X-12. Pass 2: SIG-OTHER-ACCOUNTS-UNDEFINED. (Substance is #4.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #109
Topic: Type label for the gatekeeper signature content check.
Kind: conflict
Reading A (Pass 1): GKP-03, structural gate, medium (skill-gatekeeper-panel.md L204-L206).
Reading B (Pass 2): SIG-GATE-CONTENT, tracking-only check, medium (skill-gatekeeper-panel.md L204-L206).
Rules affected: Pass 1: GKP-03. Pass 2: SIG-GATE-CONTENT. (Substance is #10, #4.)
Why this matters: Housekeeping.
Resolution:

## Ambiguity #110
Topic: Type label for the power-off test as part of acceptance.
Kind: conflict
Reading A (Pass 1): DES-73, sequencing, medium: cutover plus "The power-off success test is part of acceptance" (01-design-v0.2.md L209-L210). The cutover half matches CUTOVER-PREFIX-SWAP and is in the rule base.
Reading B (Pass 2): ACCEPT-POWER-OFF, structural gate, high (01-design-v0.2.md L210).
Rules affected: Pass 1: DES-73. Pass 2: ACCEPT-POWER-OFF.
Why this matters: Housekeeping; the success test itself is agreed (rule base, Testing and acceptance).
Resolution:
