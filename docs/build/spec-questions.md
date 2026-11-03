# Spec questions raised during the build

Claude Code adds entries here instead of deciding unclear requirements. Scott resolves each one. A resolution that changes behavior bumps the spec version.

## Q1 (C2)
REQ: REQ-2-8, REQ-9-4, REQ-10-3
Question: REQ-10-3 gives signatures for the three live accounts only, but REQ-2-8 requires a signature on every registry entry and REQ-9-4 refuses drafts on an account whose signature is unset. The two mcptest mailboxes have no stated signature, and C5's integration tests create drafts on them.
Options: (a) State a test signature for each mcptest mailbox. (b) Let integration tests create drafts on mcptest with no signature, as an exception to REQ-9-4 in staging only. (c) Test drafts on a fake only, and exercise real drafts another way.
Blocking: no for C2, which sets both mcptest signatures to unset. Blocks C5's draft integration tests until answered.
Resolution:

## Q2 (C2)
REQ: REQ-5-1, REQ-5-2, REQ-5-4
Question: REQ-5-4 covers several folders matching by name, but nothing covers several folders carrying the same SPECIAL-USE flag.
Options: (a) Error asking for a config override, matching REQ-5-4. (b) Take the first one LIST returns. (c) Prefer the one whose name also matches.
Blocking: no. Neither real host has this case. Until answered the resolver takes (a), the only option that cannot pick the wrong folder.
Resolution:
