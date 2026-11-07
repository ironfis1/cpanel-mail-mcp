# Spec questions raised during the build

Claude Code adds entries here instead of deciding unclear requirements. Scott resolves each one. A resolution that changes behavior bumps the spec version.

## Q1 (C2)
REQ: REQ-2-8, REQ-9-4, REQ-10-3
Question: REQ-10-3 gives signatures for the three live accounts only, but REQ-2-8 requires a signature on every registry entry and REQ-9-4 refuses drafts on an account whose signature is unset. The two mcptest mailboxes have no stated signature, and C5's integration tests create drafts on them.
Options: (a) State a test signature for each mcptest mailbox. (b) Let integration tests create drafts on mcptest with no signature, as an exception to REQ-9-4 in staging only. (c) Test drafts on a fake only, and exercise real drafts another way.
Blocking: no for C2, which sets both mcptest signatures to unset. Blocks C5's draft integration tests until answered.
Resolution: Scott chose (a). mcptest@reasinger.net = "mcptest | mcptest@reasinger.net | reasinger.net"; mcptest@yourcigardenindy.com = "mcptest | mcptest@yourcigardenindy.com | yourcigardenindy.com". These are staging test config only; the REQ-10-3 live signatures and REQ-9-4 are unchanged.

## Q2 (C2)
REQ: REQ-5-1, REQ-5-2, REQ-5-4
Question: REQ-5-4 covers several folders matching by name, but nothing covers several folders carrying the same SPECIAL-USE flag.
Options: (a) Error asking for a config override, matching REQ-5-4. (b) Take the first one LIST returns. (c) Prefer the one whose name also matches.
Blocking: no. Neither real host has this case. Until answered the resolver takes (a), the only option that cannot pick the wrong folder.
Resolution: Scott chose (a). Several folders with the same SPECIAL-USE flag are an error asking for a config override, as the resolver already does.

## Q3 (raised by the verifier after the C2 merge)
REQ: REQ-4-12, REQ-12-3
Question: On 2026-11-03 the staging integration run for commit 2c0918e failed on both test mailboxes with "IMAP authentication failed ... check the secret", one minute after the previous run passed with the same secrets. A re-run minutes later passed with no change. The likely cause is the mail server refusing a login for a reason other than a bad password (for example a per-user connection limit while the previous run's sessions were still closing). The client treats every refused AUTHENTICATE as an auth failure (a C1 builder choice), so the account is disabled for the request and the message tells Scott to check a secret that is fine. In production the same thing could happen at 6am and send Scott after the wrong problem.
Options: (a) Keep as is: any refused login is an auth failure. (b) Treat only a refusal carrying the IMAP response code AUTHENTICATIONFAILED (or no response code) as an auth failure; a refusal carrying another code (for example UNAVAILABLE or LIMIT) is a connection-class failure: the account fails for this request, is not retried, and the message names the server's response code instead of the secret. (c) As (b), plus one retry after a short pause for the non-auth case.
Blocking: no for C3. Should be answered before C4, which builds availability and the read tools.
Resolution: Scott chose (b), 2026-11-03. Recorded as REQ-19-2 in spec v1.3, built in C4.

## Q4 (C3)
REQ: REQ-18-8, REQ-9-11, REQ-9-18, REQ-10-8
Question: REQ-18-8 and Gap G7 say quoted originals follow the format Spark produces, but no document records that format: not the attribution line, the `>` prefixing, the forwarded-header block, or the HTML quote markup. The fixtures hold no Spark-composed reply or forward either. The format cannot be built or tested without a sample.
Options: (a) Scott replies to and forwards a test message from Spark on a mcptest mailbox; the raw Sent copies become fixtures and the format is built to match them. (b) Scott pastes the raw source of a real Spark reply and forward, with personal details removed, into a fixture. (c) Scott states a format directly, accepting it may differ from Spark's.
Blocking: yes for the quote formatter only, which is not built. It blocks REQ-18-8's second sentence, and C5's reply and forward drafts until answered. Everything else in C3 is built: `composeDraftBody` takes an already formatted `quote` of `{ text, html }` and places it (REQ-10-8).
Resolution: Scott chose (a), 2026-11-03, with this route: the reply format comes from docs/build/samples/spark-reply.eml (a Spark reply captured from Gmail). Two earlier Spark forwards were filed as spam by Gmail; a third reached the inbox and is captured as docs/build/samples/spark-forward.eml. Recorded as REQ-19-3 in spec v1.4, forward source corrected in v1.5.

## Q5 (C3)
REQ: REQ-9-2, REQ-10-7, REQ-18-8
Question: Gap G7 named the plain-text rendering rules as missing, but its resolution settled only the dialect and the quote format. What does the text part contain for a markdown body?
Options: (a) The CommonMark source as written, so `**bold**` shows its asterisks. (b) Text flattened from the parsed document, so `bold` loses its markers and a link becomes its label or URL.
Blocking: no. Until answered the builder takes (a). REQ-10-7 re-derives an edit's body from the stored draft, and only (a) can do that without losing the formatting in the HTML part. Spark re-composes on send, so what recipients see in the text part under (a) should be confirmed by Scott.
Resolution: Scott chose (a), 2026-11-03: the text part holds the CommonMark source as written. Recorded in spec v1.4.

## Q6 (C3)
REQ: REQ-10-9
Question: REQ-10-9 renders "any URL" in a signature as a link. Does `yourcigardenindy.com`, with no scheme, count as a URL? It appears in the two yourcigardenindy.com signatures and would need a scheme the config does not state.
Options: (a) Only `http://` and `https://` text is a URL, so those signatures have no link. (b) A bare domain is also a URL and links to `https://` plus the domain, with the visible text unchanged.
Blocking: no. Until answered the builder takes (a), which adds nothing the config does not state. The visible signature text is identical either way.
Resolution: Scott chose (a), 2026-11-03: only http:// and https:// text in a signature is a link; a bare domain stays plain text. Spark itself links the bare domain with no scheme (docs/build/samples), which supports this. Recorded in spec v1.4.

## Q7 (C4)
REQ: REQ-6-30
Question: The subject fallback joins a message with "a shared participant within 60 days", but two things are not stated. First, does the account's own address count as a participant? Almost every message in a mailbox involves it, so if it counts, two unrelated messages from different senders with a subject like "Invoice" would join one thread. Second, what are the 60 days measured from: the requested message, or any message already in the thread?
Options: (a) The account's own address does not count, and the 60 days run from any member with that subject. (b) The account's own address does not count, and the 60 days run from the requested message only. (c) The account's own address counts, and the 60 days run from any member.
Blocking: no. Until answered the builder takes (a). Leaving the account's own address out can only keep a message out of a thread, never join an unrelated one, and the acceptance comparison with Spark (REQ-15-7) will show if it keeps too much out. Running the 60 days from any member lets a slow exchange stay whole. One test pins each half, so a different answer is a small change.
Resolution:

## Q8 (C5)
REQ: REQ-18-3, REQ-18-6, REQ-6-34
Question: REQ-18-3 says `action` must match the recorded Spark schema, but docs/proposed-resolutions.md records only `action_name` and `message_ids`. Nothing names the `move` target parameter.
Options: (a) `folder`, as `emails` uses. (b) Read Spark's live action schema (schema only, no call) and copy its name.
Blocking: yes for `move`.
Resolution: Scott chose (b), 2026-11-06. Spark's live `action` schema, read as schema only, names the parameter `folder` on its folder-move action, with an account-qualified value such as `user@example.com:Archive`. Recorded as REQ-19-6 in spec v1.6. Spark names that action `moveToFolder`; the server keeps `move` per REQ-6-34, since no skill calls it.

## Q9 (C5)
REQ: REQ-6-35, REQ-6-36, REQ-18-6
Question: REQ-6-35 allows mixed accounts, but a move target belongs to one account. Is an ID from another account a per-ID error or does the whole call fail? Is archiving a message already in Archive, or moving one to the folder it is in, a no-op success or a per-ID error?
Options: Cross-account: (a) per-ID error, (b) whole call fails. Already there: (a) no-op success, (b) per-ID error.
Blocking: no.
Resolution: Scott chose per-ID error for a cross-account ID and no-op success for an already-placed message, reported with status `already_in_folder`, 2026-11-06. Recorded as REQ-19-7 and REQ-19-8 in spec v1.6.

## Q10 (C5)
REQ: REQ-9-25, REQ-10-8
Question: Does an edit with a new body keep the quoted original? Q5 does not settle it.
Options: (a) The new body replaces only the new text; signature and quote stay. (b) The quote is dropped.
Blocking: no.
Resolution: Scott chose (a), 2026-11-06. Recorded as REQ-19-9 in spec v1.6.

## Q11 (C5)
REQ: REQ-9-17, REQ-9-18, REQ-9-25
Question: REQ-9-17 bans a subject override only when creating a reply. The spec says nothing about forwards or about editing a reply or forward draft.
Options: (a) Refuse on reply and forward creation and on edits of any threaded draft. (b) Refuse only on reply creation. (c) Refuse on reply and forward creation; edits accept it.
Blocking: no.
Resolution: Scott chose a fourth reading, 2026-11-06: refuse on reply creation and on edits of reply drafts; forwards accept a subject at creation and on edit. A changed reply subject breaks threading whether set at creation or by edit; a forward starts a new conversation. Forwards also carry In-Reply-To (spark-forward.eml), so a reply draft on edit is one with In-Reply-To and a current subject starting "Re:", which REQ-9-16 and REQ-9-17 guarantee. Recorded as REQ-19-10 in spec v1.6.

## Q12 (C5)
REQ: REQ-19-3, REQ-7-5
Question: Which time zone does the reply attribution date use? The sample's -0500 could be the original's own offset or America/Indianapolis.
Options: (a) America/Indianapolis. (b) The original's own offset.
Blocking: no.
Resolution: Scott chose (a), 2026-11-06, as an IANA zone so daylight time shows -0400; the forward Date line uses the same rule. Recorded as REQ-19-11 in spec v1.6.

## Q13 (C5)
REQ: REQ-6-38
Question: REQ-6-38 restricts only targets. Are Trash, Junk and Drafts allowed as move and archive sources?
Options: (a) No source restriction. (b) Refuse all three as sources.
Blocking: no.
Resolution: Scott chose: Trash and Junk are allowed as sources (restore and not-spam are legitimate); Drafts is refused as a source, because a draft moved out of Drafts is orphaned from the draft tools. 2026-11-06. Recorded as REQ-19-12 in spec v1.6.
