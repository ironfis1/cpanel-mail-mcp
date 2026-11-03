# cpanel-mail-mcp: Build plan

Builds to spec v1.4 (git tag `spec-v1.5`). The plan adds no requirements.

## Roles

- **Claude Code (builder):** runs on Scott's machine from a local clone. Takes one chunk prompt at a time, builds on a branch, opens a PR, stops.
- **Scott (approver):** pastes the chunk, does the chunk's manual actions, merges or sends back.
- **Claude in claude.ai (independent verifier):** did not write the code. On "verify Cn, PR #n" it reads the diff, re-runs unit tests in its own sandbox, reads CI, checks each in-scope REQ against its test, and looks for behavior the spec does not state. Returns PASS or FAIL with findings.

## The gate, every chunk

1. Scott pastes `docs/build/Cn.md` (the part between the `---` lines) into Claude Code.
2. Claude Code builds on `chunk/Cn`, fills its rows in `docs/build/traceability.md`, opens PR `Cn: <title>`, stops.
3. Spec questions go to `docs/build/spec-questions.md`. Claude Code never decides them. Scott resolves; behavior changes bump the spec version.
4. Scott: "verify Cn, PR #n". Claude returns the verdict.
5. Scott does the chunk's manual actions, then merges or returns findings to Claude Code.
6. Next chunk starts only after the previous one is merged.

## Chunks

| Chunk | Scope | REQs | Scott actions |
|---|---|---|---|
| C0 | Scaffolding, CI, traceability check | 7 | Cloudflare API token and two GitHub secrets; staging secrets |
| C1 | IMAP client on cloudflare:sockets; spike retired | 19 | Run fixture recorder once; confirm spike Worker deleted |
| C2 | Accounts, folder resolution, filter grammar, message IDs | 49 | None |
| C3 | Header decoding, MIME, CommonMark, quoting, signatures | 19 | None |
| C4 | MCP server and read tools on staging | 45 | Seed the two test mailboxes with a few emails |
| C5 | Write tools: action and draft | 48 | Spark check on desktop and laptop |
| C6 | OAuth, logging, README, production deploy | 29 | GitHub OAuth app; live mailbox secrets; add connector and sign in |
| ACC | Acceptance: thread comparison, 7-day shadow-mode parallel run, real drafts, power-off test | 12 | Run in claude.ai with Claude and Scott |
| SKILL | Skill updates for email-crap-filter, get-in-the-room, gatekeeper-panel | 45 | Approve the proposed skill updates |
| C7 | Source document corrections, release tag | 8 | Confirm acceptance passed |

Total: 281 requirements, each owned by exactly one chunk (`docs/build/traceability.md`).

ACC and SKILL are not Claude Code chunks. The skills are Scott's claude.ai skills, so their updates are proposed in claude.ai for Scott to approve, and acceptance needs the claude.ai connector and Spark side by side. For those two, Claude is the author, so independent verification is a fresh reviewer agent that has not seen the work, plus Scott.

Order: C0, C1, C2, C3, C4, C5, C6, then SKILL (shadow-mode switch only), ACC, SKILL (full cutover), C7.
