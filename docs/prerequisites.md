# Deploy prerequisites (spec REQ-15-3)

Status of the setup items Scott owns before the build deploys. Facts here satisfy spec requirements; they do not change the spec.

| Item | Spec ref | Status | Value |
|---|---|---|---|
| cPanel A IMAP host | REQ-2-3 | Done 2026-11-01 | server128.web-hosting.com:993 |
| cPanel B IMAP host | REQ-2-3 | Done and verified 2026-11-02 | server223.web-hosting.com:993; login and folder list verified in spike run 4 |
| Test mailbox, cPanel A | REQ-14-4 | Done 2026-11-01 | mcptest@reasinger.net |
| Test mailbox, cPanel B | REQ-14-4 | Done 2026-11-02 | mcptest@yourcigardenindy.com |
| Dedicated Cloudflare account | REQ-2-18 | Done 2026-11-01 | scott@reasinger.net, workers.dev subdomain reasinger-ops |
| 2FA on that account | REQ-18-13 | Done 2026-11-01 | Mobile authenticator. Hardware key later, not a deploy blocker. |
| Workers Paid plan on that account | Resolution #78 | Done 2026-11-02 | Upgraded by Scott |
| spec-v1.1 git tag on GitHub | none | Done 2026-11-02 | Pushed by Scott |
