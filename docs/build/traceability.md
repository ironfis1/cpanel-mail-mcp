# Traceability matrix

Every requirement in docs/spec.md (tag spec-v1.1) is owned by exactly one chunk. Claude Code fills the "Verified by" column with the test file and test name (or the manual check) as it builds. A chunk gate cannot pass while any of its rows is blank.

| REQ | Chunk | Method | Verified by | Status |
|---|---|---|---|---|
| REQ-1-1 | C6 | acceptance | | open |
| REQ-1-2 | C6 | doc check | | open |
| REQ-1-3 | C4 | automated test | | open |
| REQ-1-4 | C4 | automated test | | open |
| REQ-1-5 | C4 | automated test | | open |
| REQ-1-6 | C5 | automated test | | open |
| REQ-1-7 | C5 | automated test | | open |
| REQ-1-8 | C5 | automated test | | open |
| REQ-1-9 | C4 | automated test | | open |
| REQ-1-10 | C4 | automated test | | open |
| REQ-1-11 | C5 | automated test | | open |
| REQ-1-12 | C6 | automated test | | open |
| REQ-2-1 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-1: three mailboxes on two hosts with three logins" | built |
| REQ-2-2 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-2: cPanel A is server128 on port 993, not the reasinger.net web host" | built |
| REQ-2-3 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-3: cPanel B is the confirmed server name recorded in the prerequisites" | built |
| REQ-2-4 | C2 | automated test | test/unit/folders.test.mjs: "REQ-2-4 REQ-5-1: the real cPanel B LIST resolves the same way"; test/integration/folders-filters.test.mjs: "REQ-2-4 REQ-5-1 REQ-14-4: folders and SPECIAL-USE flags resolve and are recorded on <host>". Protocol operations are covered by test/integration/imap.test.mjs | built |
| REQ-2-5 | C2 | config check | Config check: test/unit/accounts.test.mjs: "REQ-2-5: the cPanel A test mailbox is configured for integration tests"; docs/prerequisites.md records the mailbox as done | built |
| REQ-2-6 | C2 | doc check | Doc check: README status section states the mailboxes are read directly over IMAP and the Gmail forwarders were retired on 2026-10-26 | built |
| REQ-2-7 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-7: every live account has a signature and no restriction, so C5 can offer drafts on all three". C2 proves only that the registry does not block it; the draft operations arrive in C5 | partial: completes in C5 |
| REQ-2-8 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-8: each entry has exactly the registry fields", "REQ-2-8: an empty signature in config loads as unset". "REQ-2-8: each test mailbox has the signature Scott set in spec question Q1" | built |
| REQ-2-9 | C2 | automated test | test/unit/folders.test.mjs: "REQ-2-9: LIST runs at every session open, so a later request sees a changed folder" | built |
| REQ-2-10 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-10: folder overrides are static config and must use logical names"; test/unit/folders.test.mjs: the three REQ-2-10 tests | built |
| REQ-2-11 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-11: the purpose map sends each purpose to its account and never to Gmail" | built |
| REQ-2-12 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-12: Gmail cannot be a configured account" | built |
| REQ-2-13 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-13: the platform secret names are exactly those in the spec" | built |
| REQ-2-14 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-14: credentials cannot enter the registry and src never logs" | built |
| REQ-2-15 | C2 | manual (Scott) | Manual: Scott confirms each of the three live mailboxes (and each test mailbox) has its own password. The repo cannot check this because passwords are only in platform secrets. Scott confirmed 2026-11-03 | confirmed by Scott |
| REQ-2-16 | C6 | README check | | open |
| REQ-2-17 | C0 | manual (Scott) | Manual: in the Cloudflare dashboard, Scott confirms the Worker account is owned by scott@reasinger.net (subdomain reasinger-ops), has 2FA on, and is separate from the sreasinger@gmail.com and scott@yourcigardenindy.com accounts. docs/prerequisites.md records owner and 2FA as done, not the separation. | verified by Scott 2026-11-02 |
| REQ-2-18 | C0 | manual (Scott) | Manual: Scott confirms the spike account (scott@reasinger.net, reasinger-ops) is the dedicated production account. docs/prerequisites.md records it as done. wrangler.toml configures Workers only; no other platform exists in the repo. | verified by Scott 2026-11-02 |
| REQ-2-19 | C2 | automated test | test/unit/accounts.test.mjs: "REQ-2-19: the registry, translator, codec and IMAP client exist; OAuth and tools arrive later", "REQ-2-19: findAccount refuses an unknown account". The OAuth provider arrives in C6 and the tool layer in C4 and C5 | partial: completes in C4 to C6 |
| REQ-2-20 | C0 | doc check | Doc check: docs/prerequisites.md row "Workers Paid plan on that account" records the recommended plan as active (Done 2026-11-02); README "Hosting" states it. CI has no bundle size gate. | built |
| REQ-3-1 | C6 | automated test | | open |
| REQ-3-2 | C6 | automated test | | open |
| REQ-3-3 | C6 | automated test | | open |
| REQ-3-4 | C6 | automated test | | open |
| REQ-3-5 | C6 | automated test | | open |
| REQ-3-6 | C6 | automated test | | open |
| REQ-3-7 | C6 | automated test | | open |
| REQ-3-8 | C6 | automated test | | open |
| REQ-3-9 | C5 | automated test | | open |
| REQ-3-10 | C6 | automated test | | open |
| REQ-3-11 | C6 | manual (Scott) | | open |
| REQ-4-1 | C1 | automated test | test/unit/imap-client.test.mjs: "REQ-4-1: the client runs on cloudflare:sockets and imapflow is not a dependency"; test/integration/imap.test.mjs: "REQ-4-1 REQ-4-2 REQ-4-3: login, LIST and SELECT work on <host> from the Worker" | built |
| REQ-4-2 | C1 | automated test | test/unit/imap-client.test.mjs: "REQ-4-2: login is AUTHENTICATE PLAIN with an initial response, so the password needs no escaping"; test/integration/imap.test.mjs: per-host login test | built |
| REQ-4-3 | C1 | automated test | test/unit/imap-client.test.mjs: "REQ-4-3 REQ-4-6 REQ-14-7: full command sequence with LITERAL+ on" and "off", and the other REQ-4-3 tests there; test/unit/imap-parser.test.mjs: REQ-4-3 tests; test/integration/imap.test.mjs: per-host round trip | built |
| REQ-4-4 | C1 | automated test | test/unit/imap-client.test.mjs: the three REQ-4-4 tests (CAPABILITY, BODYSTRUCTURE, partial); test/unit/imap-parser.test.mjs: REQ-4-4 tests; test/integration/imap.test.mjs: per-host round trip | built |
| REQ-4-5 | C1 | automated test | test/unit/imap-client.test.mjs: the three REQ-4-5 tests (MOVE, COPY fallback, refusal); test/unit/imap-parser.test.mjs: COPYUID test; test/integration/imap.test.mjs: per-host move test. The real hosts advertise MOVE, so only the fake exercises the fallback | built |
| REQ-4-6 | C1 | automated test | test/unit/imap-client.test.mjs: "REQ-4-3 REQ-4-6 REQ-14-7: full command sequence with LITERAL+ on" and "off"; "REQ-4-6 REQ-14-7: a literal mailbox name from LIST is read and can be selected"; the two split-chunk REQ-4-6 tests | built |
| REQ-4-7 | C1 | automated test | test/unit/imap-timeouts.test.mjs: every "silent <step> times out" test, plus the keeps-sending, bounded-close and broken-session REQ-4-7 tests | built |
| REQ-4-8 | C1 | automated test | test/unit/imap-timeouts.test.mjs: "REQ-4-8: the timeout values are exactly those in the spec" and every silent-step test, each proved pending at value minus 1 ms and failed at the value | built |
| REQ-4-9 | C1 | automated test | test/unit/imap-timeouts.test.mjs: "REQ-4-9 REQ-14-8: a timeout fails that account loudly and the other host still answers", "REQ-4-9: an account that timed out stays failed for the request without a second connection"; test/unit/imap-sessions.test.mjs: REQ-4-9 test | built |
| REQ-4-10 | C1 | automated test | test/unit/imap-sessions.test.mjs: the REQ-4-10 tests (lazy, one per account, closeAll, separate requests) | built |
| REQ-4-11 | C1 | automated test | test/unit/imap-sessions.test.mjs: the REQ-4-11 tests (parallel across hosts, sequential within a host, failure does not block) | built |
| REQ-4-12 | C1 | automated test | test/unit/imap-sessions.test.mjs: "REQ-4-12 REQ-12-3 REQ-14-7: auth failure disables the account for the request, names the secret, never retries" and the other REQ-4-12 tests; test/unit/imap-client.test.mjs: "REQ-4-12 REQ-14-7: a bad password fails with code auth and no server text or password" | built |
| REQ-4-13 | C1 | README check | README check: README "Clear a cPHulk block" states there is no egress IP to whitelist and the block is cleared by hand | built |
| REQ-5-1 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-1 REQ-5-6: the real cPanel A LIST resolves to the folder map in the spec" and the other REQ-5-1 tests; test/integration/folders-filters.test.mjs: per-host folder test | built |
| REQ-5-2 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-2 REQ-5-6: on <host> flagged INBOX.spam is Junk and unflagged INBOX.Junk gets no logical name", "REQ-5-2: SPECIAL-USE wins even when another folder has the exact role name" | built |
| REQ-5-3 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-3: with no flag, <role> matches its names on the last segment, ignoring case" per role, and the other REQ-5-3 tests | built |
| REQ-5-4 | C2 | automated test | test/unit/folders.test.mjs: the three REQ-5-4 tests (several name matches, no match, several flags per spec question Q2) | built |
| REQ-5-5 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-5: cPanel A folders use the INBOX. prefix with . as delimiter and advertise SPECIAL-USE" | built |
| REQ-5-6 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-1 REQ-5-6: the real cPanel A LIST resolves to the folder map in the spec", "REQ-5-2 REQ-5-6: on server128 flagged INBOX.spam is Junk and unflagged INBOX.Junk gets no logical name" | built |
| REQ-5-7 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-7: folders are addressed as account:LogicalName", "REQ-5-7: an unknown account, name or shape is an error" | built |
| REQ-5-8 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-8: Trash and Junk are addressable logical names". Use in emails and search arrives in C4 | built |
| REQ-5-9 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-9: a missing Archive is an error, while the other folders still resolve", "REQ-5-9: the server has no way to create a folder" | built |
| REQ-5-10 | C2 | automated test | test/unit/folders.test.mjs: "REQ-5-10: Archive is INBOX.Archive with \Archive on the recorded cPanel A and cPanel B lists"; test/integration/folders-filters.test.mjs: "REQ-5-10 REQ-14-4: Archive exists with \Archive on <host>" | built |
| REQ-6-1 | C4 | automated test | | open |
| REQ-6-2 | C4 | automated test | | open |
| REQ-6-3 | C4 | automated test | | open |
| REQ-6-4 | C4 | automated test | | open |
| REQ-6-5 | C4 | automated test | | open |
| REQ-6-6 | C4 | automated test | | open |
| REQ-6-7 | C4 | automated test | | open |
| REQ-6-8 | C4 | automated test | | open |
| REQ-6-9 | C4 | automated test | | open |
| REQ-6-10 | C4 | automated test | | open |
| REQ-6-11 | C4 | automated test | | open |
| REQ-6-12 | C4 | automated test | | open |
| REQ-6-13 | C4 | automated test | | open |
| REQ-6-14 | C4 | automated test | | open |
| REQ-6-15 | C4 | automated test | | open |
| REQ-6-16 | C4 | automated test | | open |
| REQ-6-17 | C4 | automated test | | open |
| REQ-6-18 | C4 | automated test | | open |
| REQ-6-19 | C4 | automated test | | open |
| REQ-6-20 | C4 | automated test | | open |
| REQ-6-21 | C4 | automated test | | open |
| REQ-6-22 | C4 | automated test | | open |
| REQ-6-23 | C4 | automated test | | open |
| REQ-6-24 | C4 | automated test | | open |
| REQ-6-25 | C4 | automated test | | open |
| REQ-6-26 | C4 | automated test | | open |
| REQ-6-27 | C4 | automated test | | open |
| REQ-6-28 | C4 | automated test | | open |
| REQ-6-29 | C4 | automated test | | open |
| REQ-6-30 | C4 | automated test | | open |
| REQ-6-31 | C4 | automated test | | open |
| REQ-6-32 | C4 | automated test | | open |
| REQ-6-33 | C5 | automated test | | open |
| REQ-6-34 | C5 | automated test | | open |
| REQ-6-35 | C5 | automated test | | open |
| REQ-6-36 | C5 | automated test | | open |
| REQ-6-37 | C5 | automated test | | open |
| REQ-6-38 | C5 | automated test | | open |
| REQ-6-39 | C5 | automated test | | open |
| REQ-6-40 | C5 | automated test | | open |
| REQ-7-1 | C2 | automated test | test/unit/filter.test.mjs: the REQ-7-1 tests; test/integration/folders-filters.test.mjs: "REQ-7-1 REQ-7-2 REQ-18-1: translated filters behave on <host>" | built |
| REQ-7-2 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-2: multiple tokens combine with AND, as a run of IMAP keys in order"; test/integration/folders-filters.test.mjs: per-host filter test | built |
| REQ-7-3 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-3: OR, negation, grouping and quoting are errors that name the token", "REQ-7-3 REQ-7-4: unknown tokens are errors that name the token and are never dropped" | built |
| REQ-7-4 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-3 REQ-7-4: unknown tokens are errors that name the token and are never dropped", "REQ-7-4: control characters are refused and name the token" | built |
| REQ-7-5 | C2 | automated test | test/unit/filter.test.mjs: the three REQ-7-5 tests (UTC already moved on, EST and EDT midnight, DST and month ends) | built |
| REQ-7-6 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-6: the only supported date unit is d", "REQ-7-6: an out-of-range day count is an error, not a bad date", "REQ-7-5 REQ-7-6: today is the Indianapolis date when UTC has already moved on" | built |
| REQ-7-7 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-7: SINCE is a date, not a time, so mail from early on the boundary date is included"; documented in README "Account registry and filters" | built |
| REQ-7-8 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-8: from: is IMAP FROM with the value unchanged, so the server matches any part of the header"; test/integration/folders-filters.test.mjs: "REQ-14-13 REQ-7-8: from: finds a MAILER-DAEMON display name and a postmaster@ address on <host>" | built |
| REQ-7-9 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-9: bare words translate to IMAP TEXT" | built |
| REQ-7-10 | C2 | automated test | test/unit/filter.test.mjs: "REQ-14-14 REQ-7-10: every filter string the skills pass translates" | built |
| REQ-7-11 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-11: the send confirmation and reply detection filters translate" | built |
| REQ-8-1 | C2 | automated test | test/unit/message-id.test.mjs: the three REQ-8-1 tests (round trip, opaque, awkward values) | built |
| REQ-8-2 | C2 | automated test | test/unit/message-id.test.mjs: "REQ-8-2: the same message always gets the same ID", with a pinned value | built |
| REQ-8-3 | C2 | automated test | test/unit/message-id.test.mjs: "REQ-8-3: lookup uses the UID when UIDVALIDITY matches and the UID exists" | built |
| REQ-8-4 | C2 | automated test | test/unit/message-id.test.mjs: the two REQ-8-4 tests (UIDVALIDITY differs, UID gone) | built |
| REQ-8-5 | C2 | automated test | test/unit/message-id.test.mjs: the REQ-8-5 tests (order, first match, no repeat, gone folder, connection failure, missing Archive) | built |
| REQ-8-6 | C2 | automated test | test/unit/message-id.test.mjs: the REQ-8-6 tests (not found, no Message-ID, ambiguous, quoting) | built |
| REQ-8-7 | C2 | automated test | test/unit/message-id.test.mjs: "REQ-8-7: the draft reference is the server ID plus account, recipient and subject". Use in draft responses arrives in C5 | built |
| REQ-8-8 | C2 | automated test | test/unit/message-id.test.mjs: "REQ-8-8: the ID is the server's own format, and foreign or damaged IDs are refused" | built |
| REQ-8-9 | SKILL | skill review | | open |
| REQ-9-1 | C5 | automated test | | open |
| REQ-9-2 | C5 | automated test | | open |
| REQ-9-3 | C5 | automated test | | open |
| REQ-9-4 | C5 | automated test | | open |
| REQ-9-5 | C5 | automated test | | open |
| REQ-9-6 | SKILL | skill review | | open |
| REQ-9-7 | C5 | automated test | | open |
| REQ-9-8 | C5 | automated test | | open |
| REQ-9-9 | C5 | automated test | | open |
| REQ-9-10 | C5 | automated test | | open |
| REQ-9-11 | C5 | automated test | | open |
| REQ-9-12 | C5 | automated test | | open |
| REQ-9-13 | C5 | automated test | | open |
| REQ-9-14 | C5 | automated test | | open |
| REQ-9-15 | C5 | automated test | | open |
| REQ-9-16 | C5 | automated test | | open |
| REQ-9-17 | C5 | automated test | | open |
| REQ-9-18 | C5 | automated test | | open |
| REQ-9-19 | C5 | automated test | | open |
| REQ-9-20 | C5 | automated test | | open |
| REQ-9-21 | C5 | automated test | | open |
| REQ-9-22 | C5 | automated test | | open |
| REQ-9-23 | C5 | automated test | | open |
| REQ-9-24 | C5 | automated test | | open |
| REQ-9-25 | C5 | automated test | | open |
| REQ-9-26 | C5 | automated test | | open |
| REQ-9-27 | C5 | automated test | | open |
| REQ-9-28 | C5 | automated test | | open |
| REQ-9-29 | C5 | integration + manual (Scott) | | open |
| REQ-9-30 | SKILL | skill review | | open |
| REQ-9-31 | C6 | doc check | | open |
| REQ-10-1 | C3 | automated test | | open |
| REQ-10-2 | C3 | automated test | | open |
| REQ-10-3 | C3 | automated test | | open |
| REQ-10-4 | C3 | automated test | | open |
| REQ-10-5 | C6 | README check | | open |
| REQ-10-6 | C3 | automated test | | open |
| REQ-10-7 | C3 | automated test | | open |
| REQ-10-8 | C3 | automated test | | open |
| REQ-10-9 | C3 | automated test | | open |
| REQ-10-10 | C3 | automated test | | open |
| REQ-10-11 | C3 | automated test | | open |
| REQ-10-12 | SKILL | skill review | | open |
| REQ-11-1 | C3 | automated test | | open |
| REQ-11-2 | C3 | automated test | | open |
| REQ-11-3 | C3 | automated test | | open |
| REQ-11-4 | C3 | automated test | | open |
| REQ-12-1 | C4 | automated test | | open |
| REQ-12-2 | C4 | automated test | | open |
| REQ-12-3 | C1 | automated test | test/unit/imap-sessions.test.mjs: "REQ-4-12 REQ-12-3 REQ-14-7: auth failure disables the account for the request, names the secret, never retries" and the other REQ-12-3 tests | built |
| REQ-12-4 | SKILL | skill review | | open |
| REQ-12-5 | SKILL | skill review | | open |
| REQ-12-6 | SKILL | skill review | | open |
| REQ-12-7 | SKILL | skill review | | open |
| REQ-12-8 | SKILL | skill review | | open |
| REQ-12-9 | SKILL | skill review | | open |
| REQ-12-10 | SKILL | skill review | | open |
| REQ-12-11 | C4 | automated test | | open |
| REQ-13-1 | C6 | automated test | | open |
| REQ-13-2 | C6 | automated test | | open |
| REQ-13-3 | C6 | automated test | | open |
| REQ-13-4 | C6 | automated test | | open |
| REQ-13-5 | C6 | automated test | | open |
| REQ-13-6 | C6 | README check | | open |
| REQ-13-7 | C1 | README check | README check: README "Clear a cPHulk block" | built |
| REQ-14-1 | C0 | automated test | test/unit/trace.test.mjs: "REQ-14-1: trace.mjs finds exactly 276 REQs in the real spec", "REQ-14-1: every C0 row is filled and covered" and the --strict fixture tests; test/unit/smoke.test.mjs: "REQ-14-1: smoke: the node --test runner executes this test" | built |
| REQ-14-2 | C0 | automated test | test/unit/config.test.mjs: "REQ-14-2: staging config holds only dedicated mcptest mailboxes, no live account" and the other REQ-14-2 tests there; test/unit/harness.test.mjs: "REQ-14-2: the harness refuses to call any origin but staging"; test/unit/worker.test.mjs: "REQ-14-2: production never accepts STAGING_TOKEN, even when the secret is set"; test/integration/staging-worker.test.mjs once secrets exist | built |
| REQ-14-3 | C0 | automated test | test/unit/config.test.mjs: "REQ-14-3: the cPanel A test mailbox is mcptest@reasinger.net on server128"; test/integration/staging-worker.test.mjs per-mailbox test once secrets exist | built |
| REQ-14-4 | C0 | automated test | test/unit/config.test.mjs: "REQ-14-4: the cPanel B test mailbox is mcptest@yourcigardenindy.com on server223"; test/unit/harness.test.mjs: "REQ-14-3 REQ-14-4: the integration suite runs on both test mailboxes". C0 proves the mailbox and the per-mailbox harness only; test/integration/folders-filters.test.mjs: the folder, SPECIAL-USE and Archive tests per host were added in C2; MOVE tests arrive in C5 | partial: completes in C5 |
| REQ-14-5 | C1 | automated test | test/integration/imap.test.mjs: "REQ-14-5: record the IMAP capabilities of <host>" per host; output in the CI job summary and the PR description | built |
| REQ-14-6 | C1 | automated test | test/unit/imap-fixtures.test.mjs: "REQ-14-6: recorded <host> session replays through the client", "large literal keeps the exact message bytes", "unusual FETCH shapes parse", "fixtures hold no credentials or live mailbox data", for server128 and server223, against test/fixtures/imap/ recorded by Scott with scripts/record-fixtures.mjs; plus the recorder's own REQ-14-6 tests there | built |
| REQ-14-7 | C1 | automated test | test/unit/imap-client.test.mjs: LITERAL+ on and off and literal mailbox name tests; test/unit/imap-sessions.test.mjs: auth failure test; test/unit/imap-timeouts.test.mjs: silent-server tests at every step | built |
| REQ-14-8 | C1 | automated test | test/unit/imap-timeouts.test.mjs: every "REQ-14-8: silent <step> times out" test and "REQ-4-9 REQ-14-8: a timeout fails that account loudly and the other host still answers" | built |
| REQ-14-9 | C3 | automated test | | open |
| REQ-14-10 | C3 | automated test | | open |
| REQ-14-11 | C3 | automated test | | open |
| REQ-14-12 | C5 | automated test | | open |
| REQ-14-13 | C2 | automated test | test/integration/folders-filters.test.mjs: "REQ-14-13 REQ-7-8: from: finds a MAILER-DAEMON display name and a postmaster@ address on <host>"; test/unit/filter.test.mjs: "REQ-14-13: the MAILER-DAEMON and postmaster filters ask the server for a FROM match" | built |
| REQ-14-14 | C2 | automated test | test/unit/filter.test.mjs: "REQ-14-14 REQ-7-10: every filter string the skills pass translates" | built |
| REQ-14-15 | C3 | automated test | | open |
| REQ-14-16 | C5 | automated test | | open |
| REQ-14-17 | C6 | automated test | | open |
| REQ-15-1 | C6 | gate record | | open |
| REQ-15-2 | C6 | gate record | | open |
| REQ-15-3 | C6 | gate record | | open |
| REQ-15-4 | ACC | acceptance evidence | | open |
| REQ-15-5 | ACC | acceptance evidence | | open |
| REQ-15-6 | ACC | acceptance evidence | | open |
| REQ-15-7 | ACC | acceptance evidence | | open |
| REQ-15-8 | ACC | acceptance evidence | | open |
| REQ-15-9 | ACC | acceptance evidence | | open |
| REQ-15-10 | ACC | acceptance evidence | | open |
| REQ-15-11 | ACC | acceptance evidence | | open |
| REQ-15-12 | ACC | acceptance evidence | | open |
| REQ-15-13 | ACC | acceptance evidence | | open |
| REQ-15-14 | ACC | acceptance evidence | | open |
| REQ-15-15 | ACC | acceptance evidence | | open |
| REQ-16-1 | SKILL | skill review | | open |
| REQ-16-2 | SKILL | skill review | | open |
| REQ-16-3 | SKILL | skill review | | open |
| REQ-16-4 | SKILL | skill review | | open |
| REQ-16-5 | SKILL | skill review | | open |
| REQ-16-6 | SKILL | skill review | | open |
| REQ-16-7 | SKILL | skill review | | open |
| REQ-16-8 | SKILL | skill review | | open |
| REQ-16-9 | SKILL | skill review | | open |
| REQ-16-10 | SKILL | skill review | | open |
| REQ-16-11 | SKILL | skill review | | open |
| REQ-16-12 | SKILL | skill review | | open |
| REQ-16-13 | SKILL | skill review | | open |
| REQ-16-14 | SKILL | skill review | | open |
| REQ-16-15 | SKILL | skill review | | open |
| REQ-16-16 | SKILL | skill review | | open |
| REQ-16-17 | SKILL | skill review | | open |
| REQ-16-18 | SKILL | skill review | | open |
| REQ-16-19 | SKILL | skill review | | open |
| REQ-16-20 | SKILL | skill review | | open |
| REQ-16-21 | SKILL | skill review | | open |
| REQ-16-22 | SKILL | skill review | | open |
| REQ-16-23 | SKILL | skill review | | open |
| REQ-16-24 | SKILL | skill review | | open |
| REQ-16-25 | SKILL | skill review | | open |
| REQ-16-26 | SKILL | skill review | | open |
| REQ-16-27 | SKILL | skill review | | open |
| REQ-16-28 | SKILL | skill review | | open |
| REQ-16-29 | SKILL | skill review | | open |
| REQ-16-30 | SKILL | skill review | | open |
| REQ-16-31 | SKILL | skill review | | open |
| REQ-16-32 | SKILL | skill review | | open |
| REQ-16-33 | C7 | doc check | | open |
| REQ-16-34 | C7 | doc check | | open |
| REQ-16-35 | C7 | doc check | | open |
| REQ-16-36 | C7 | doc check | | open |
| REQ-16-37 | C7 | doc check | | open |
| REQ-16-38 | C7 | doc check | | open |
| REQ-16-39 | C7 | doc check | | open |
| REQ-16-40 | C7 | doc check | | open |
| REQ-18-1 | C2 | automated test | test/unit/filter.test.mjs: "REQ-7-1 REQ-18-1: each token in the table translates to its IMAP key", "REQ-18-1: the token keys are exact: other cases and empty values are errors"; test/integration/folders-filters.test.mjs: per-host filter test | built |
| REQ-18-2 | C6 | automated test | | open |
| REQ-18-3 | C4 | automated test | | open |
| REQ-18-4 | C4 | automated test | | open |
| REQ-18-5 | C4 | automated test | | open |
| REQ-18-6 | C5 | automated test | | open |
| REQ-18-7 | C5 | automated test | | open |
| REQ-18-8 | C3 | automated test | | open |
| REQ-18-9 | C4 | automated test | | open |
| REQ-18-10 | SKILL | skill review | | open |
| REQ-18-11 | SKILL | skill review | | open |
| REQ-18-12 | C6 | automated test | | open |
| REQ-18-13 | C6 | manual (Scott) | | open |
