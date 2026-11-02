# cpanel-mail-mcp: Build plan

Builds to spec v1.1 (tag `spec-v1.1`). The plan is execution only: it adds no requirements. Anything the build finds that the spec does not cover goes back as a spec change with a version bump, not a quiet decision in code.

## How the work runs

- Code lives in `src/`, tests in `test/`. The spike folder stays as a reference until Phase 1 ends, then is removed.
- Every test names the REQ IDs it covers. A trace script (`scripts/trace.mjs`) lists every REQ in spec.md and the tests that cover it, and CI fails on any uncovered REQ once its phase is closed (REQ-14-1).
- Claude writes code and pushes to GitHub. GitHub Actions runs the tests and deploys. Claude reads CI results directly. This is needed because the build sandbox cannot reach Cloudflare or IMAP; GitHub's runners can.
- Two Workers in the scott@reasinger.net Cloudflare account:
  - `cpanel-mail-mcp-staging`: test mailboxes only (mcptest@reasinger.net, mcptest@yourcigardenindy.com). Integration tests run against it on every push (REQ-14-2).
  - `cpanel-mail-mcp`: the three live accounts. Deployed only from a tagged release.
- Mailbox passwords are only ever typed by Scott into `wrangler secret put` on the right Worker. They never go into GitHub, chat, or the repo.

## Phase 0: Scaffolding and CI

Work: repo layout, Worker project, unit test runner, trace script, GitHub Actions workflow (unit tests on push; deploy staging and run integration tests on push to main).

Scott, one time:
1. Create a Cloudflare API token scoped to Workers edit on the scott@reasinger.net account.
2. Add GitHub repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. After the first staging deploy, set the staging Worker's test mailbox secrets with `wrangler secret put` (same as the spike).

Exit gate: CI green on an empty test suite; trace script reports all 276 REQs uncovered.

## Phase 1: IMAP client (spec sections 4, 14)

Work: promote `spike/src/imap.js` into `src/imap/`. Add the commands the spec needs beyond the spike: CAPABILITY parsing, UID FETCH of bodies and BODYSTRUCTURE, UID MOVE, UID COPY plus STORE plus UID EXPUNGE (UIDPLUS), and per-step timeouts. Record real responses from both mcptest mailboxes as parser fixtures.

Exit gate: protocol tolerance tests (REQ-14-7, REQ-14-8), fixture parser tests (REQ-14-6), capability capture on both hosts (REQ-14-5). Spike Worker deleted, which also removes the copies of the test mailbox passwords it holds.

## Phase 2: Core logic (spec sections 2, 5, 7, 8, 10, 11, 18)

Pure functions, unit tested without a network:
- account registry and secret binding (section 2)
- folder resolution, SPECIAL-USE first (section 5)
- filter translator for the REQ-18-1 token table (section 7, REQ-14-14)
- message ID codec and lookup fallback order (section 8)
- header decode and re-encode (section 11, REQ-14-15)
- MIME parsing for snippets and thread bodies; MIME building for drafts with CommonMark, quoting and threading headers (sections 9, 18)
- signatures: exact texts, strip-then-append, placement above quotes, config tests (section 10, REQ-14-9 to REQ-14-11)

Exit gate: every REQ in these sections covered by a passing unit test.

## Phase 3: Tools (spec sections 6, 9, 12, 18)

Work: the MCP server over streamable HTTP and the eight tools (`accounts`, `availability`, `folders`, `emails`, `search`, `thread`, `action`, `draft`), with Spark-matching schemas (REQ-18-3) and per-account failure handling (section 12). No auth yet; staging only, behind a temporary bearer token like the spike.

Exit gate: integration suite green on staging against both test mailboxes, including draft create, reply, reply-all, forward, edit, delete, pin and archive (REQ-14-12, REQ-14-13, REQ-14-16).

Scott: one Spark check on the desktop and the laptop. The archived test message shows as archived, and the server drafts show up (REQ-14-16, REQ-15-5).

## Phase 4: Auth, logging, production deploy (spec sections 3, 13, 18)

Work: GitHub OAuth through workers-oauth-provider, single allowed login ironfis1, token lifetimes per REQ-18-12 and Resolution #72. Logging with the REQ-18-2 field list and the exclusion tests (REQ-14-17). README with secret names, revocation and the signature-change procedure (REQ-10-5).

Scott:
1. Create a GitHub OAuth app (Claude gives the exact callback URL) and put its ID and secret into the Worker.
2. Set the three live mailbox passwords on the production Worker with `wrangler secret put`.
3. Add the production URL as a custom connector in claude.ai and sign in with GitHub.

Exit gate: Claude calls `availability` through the connector and all three live accounts report reachable. Live mailboxes get read-only checks only at this point; nothing is pinned, archived or drafted on them yet.

## Phase 5: Acceptance (spec section 15.2)

Work, in order:
1. Thread comparison: 20 threads across the three accounts, at least 5 with Scott's replies (REQ-15-7).
2. Skill changes for shadow mode, proposed as skill updates for Scott to approve: email-crap-filter gets a report-only switch for the server path (REQ-15-9).
3. Seven-day parallel run in shadow mode: Spark acts on days 1 to 5, the server acts on days 6 and 7, with the sets compared each run (REQ-15-8 to REQ-15-12).
4. get-in-the-room: at least three real reply drafts and one forward through the server, sent by Scott from Spark, checked at the recipient (REQ-15-13).
5. Power-off test: sarhomepc off, 6am run completes Parts A, B and C, and a reply draft appears in Spark on the laptop (REQ-15-4).

Exit gate: all of the above pass, or every difference is explained in docs/acceptance.md.

## Phase 6: Cutover (spec sections 15.3, 16)

Work: skill updates for email-crap-filter, get-in-the-room and gatekeeper-panel per section 16, proposed as complete updated skills for Scott to approve. Source document corrections per section 16.7. Tag the release.

Exit gate: scheduled 6am and noon runs use the server, and the Spark branch is gone from the skills. Spark stays installed for manual use.

## What Scott does, all phases

| Phase | Action |
|---|---|
| 0 | Cloudflare API token plus two GitHub secrets; staging test mailbox secrets |
| 3 | Spark display check on desktop and laptop |
| 4 | GitHub OAuth app; live mailbox secrets; add connector and sign in |
| 5 | Send the acceptance drafts; leave the PC off for the power-off test; review parallel-run diffs |
| 6 | Approve the three skill updates |
