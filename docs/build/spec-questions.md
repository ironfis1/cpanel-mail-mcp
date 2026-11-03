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
