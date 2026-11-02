# Worked examples against spec v1.0

Purpose: run two real cases through the spec end to end to catch rules that are fine alone but combine badly. Each step cites the REQ it follows.

## Example 1: get-in-the-room touch 7 forward

Setup: touch 1 to jane@acme.example was drafted by the server on scott@reasinger.net, signed by the server, and sent by Scott from Spark 8 days ago. No reply.

| Step | What happens | REQ |
|---|---|---|
| 1 | Skill calls `emails` on `scott@reasinger.net:Sent`, filter `to:jane@acme.example`. Returns the Sent copy of touch 1 (Spark's re-composed message, which carries the server signature). | REQ-9-21, REQ-18-1, REQ-9-29 |
| 2 | Skill calls `draft` with `forward: <touch 1 ID>`, `account: scott@reasinger.net`, `to: ["jane@acme.example"]`, body "Not sure if you saw this." | REQ-9-21, REQ-18-11, REQ-9-19 |
| 3 | `account` matches the account encoded in the ID, so no mismatch error. | REQ-6-3 |
| 4 | Server builds subject `Fwd: <decoded touch 1 subject>`. | REQ-9-18, REQ-11-2 |
| 5 | Body: "Not sure if you saw this.", then the scott@reasinger.net signature, then touch 1 quoted inline in Spark's format (which itself ends with the touch 1 signature). | REQ-10-8, REQ-10-3, REQ-18-8 |
| 6 | Strip rule finds no trailing signature in the skill's body, appends once. | REQ-10-6 |
| 7 | In-Reply-To and References set from touch 1's Spark Message-ID, so it threads with touch 1. | REQ-9-20 |
| 8 | APPEND to Drafts with `\Draft \Seen`. Response echoes the text body with signature; skill hands Scott server ID plus account, recipient, subject. | REQ-9-1, REQ-9-5, REQ-8-7 |
| 9 | Scott sends from Spark. Skill confirms with `emails` on `scott@reasinger.net:Sent`, filter `to:jane@acme.example newer_than:2d`, matches recipient plus normalized subject. Touch 1 is outside the 2-day window, so only touch 7 matches. | REQ-9-30 |

Result: consistent. No defect. Observation: the recipient sees the signature twice (under the bump and at the end of the quoted touch 1). That is normal for a forward and matches what Spark does by hand.

## Example 2: 6am email-crap-filter with the yourcigardenindy.com host down

Setup: cPanel B unreachable (TCP timeout). cPanel A healthy.

| Step | What happens | REQ |
|---|---|---|
| 1 | Skill calls `availability`. scott@reasinger.net passes; scott@ and founders@yourcigardenindy.com fail on TCP, grouped under cPanel B. Each failure is per account, not a whole-call failure. | REQ-6-7, REQ-12-2 |
| 2 | Skill continues with reachable accounts only, so no further login attempts hit cPanel B this run. | REQ-12-6 |
| 3 | Part A (Gmail) runs normally. | REQ-12-5 scope |
| 4 | Part C bounce sweep on scott@reasinger.net runs. cPanel B outage does not suppress it. | REQ-12-8 |
| 5 | Part B runs scott@reasinger.net only. | REQ-12-7 |
| 6 | Report first line uses the Resolution #33 format listing unreached accounts and host: "Business inboxes and bounces NOT checked: mail server unreachable (scott@yourcigardenindy.com, founders@yourcigardenindy.com on <cPanel B host>)". | REQ-18-10, REQ-12-5 |
| 7 | Push notification fires because a part failed. | REQ-12-9 |

Result: DEFECT D-1 at step 6. The Resolution #33 wording says bounces were NOT checked, but in a partial outage bounces and scott@reasinger.net WERE checked. Reusing the all-down wording (Gap G9, option a) makes the report claim less was checked than actually was, which reads like a total failure at 6am.

Proposed fix for D-1 (replaces REQ-18-10): on partial reachability the first line reads
"PARTIAL RUN: <accounts> on <host> NOT checked (mail server unreachable). Bounces and <reached accounts> checked."
The Resolution #33 wording stays for the all-down case only.

Status: D-1 awaiting Scott.
