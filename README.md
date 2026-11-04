# cpanel-mail-mcp

Cloudflare Worker remote MCP server for IMAP access to three cPanel business mailboxes. Build spec: `docs/spec.md` (tag `spec-v1.1`). Build process: `docs/build-plan.md`.

Status: scaffolding, the IMAP client (`src/imap/`, chunk C1), accounts, folders, filters and message IDs (chunk C2), headers, MIME and signatures (chunk C3), and the MCP endpoint with the read tools (chunk C4). The write tools arrive in C5 and OAuth in C6. This README is a stub until C6.

The three business mailboxes are read directly over IMAP, not through Gmail. The cPanel forwarders to Gmail were retired on 2026-10-26.

## Hosting

Cloudflare Workers Paid plan on the dedicated scott@reasinger.net account (workers.dev subdomain `reasinger-ops`). See `docs/prerequisites.md`.

| Environment | Worker | Mailboxes | Deployed |
|---|---|---|---|
| `staging` | `cpanel-mail-mcp-staging` | mcptest@reasinger.net, mcptest@yourcigardenindy.com | by CI, or by hand as below |
| `production` | `cpanel-mail-mcp` | the three live accounts | only from a tag (job added in C6) |

## Run tests

Needs Node 24.

```
npm ci
npm test                      # unit tests
node scripts/trace.mjs        # REQ coverage per chunk
node scripts/trace.mjs --chunk C0 --strict
node scripts/trace.mjs --chunk C1 --strict
node scripts/trace.mjs --chunk C2 --strict
node scripts/trace.mjs --chunk C3 --strict
node scripts/trace.mjs --chunk C4 --strict
npm run check                 # wrangler deploy --env staging --dry-run
```

The integration suite calls the deployed staging Worker over HTTPS. It skips with a message when `STAGING_TOKEN` is not in the environment.

```
npm run test:integration
```

`/imap-check` on the staging Worker runs the IMAP client against both test mailboxes. It appends synthetic messages to Drafts, then moves and removes them.

The read tool tests need real mail: send 3 or 4 ordinary emails from Gmail to each mcptest mailbox first. They also send the `x-staging-break-host` header, which gives the named account a host that cannot resolve, to prove the other account still answers. Staging only; it goes when `STAGING_TOKEN` goes in C6.

## MCP endpoint

`POST /mcp` speaks MCP over streamable HTTP, one JSON-RPC message per request and one JSON response, with no session and no event stream. Until C6 it sits behind the `STAGING_TOKEN` bearer on staging only.

The tools are `accounts`, `availability`, `folders`, `emails`, `search` and `thread`. Every response carries `accounts_reached` and `accounts_not_reached`. An account that was reached but could not answer, for example because of a missing Archive, is listed in `errors`. A result is a tool error (`isError`) only when no account could answer; `availability` reports failed checks as its normal answer. `emails` and `search` need the host to advertise IMAP SORT, which both hosts do.

## Account registry and filters

The registry is `MAILBOXES` in `wrangler.toml`, one list per environment. To override a discovered folder, set its logical name in that entry's `folders`, for example `folders = { Archive = "INBOX.Old" }`.

`newer_than:Nd` uses date-granular IMAP SINCE, with dates in America/Indianapolis. A result can be up to one day older than N days. This is accepted because it never drops mail.

## Record IMAP fixtures

`scripts/record-fixtures.mjs` captures real server responses from both test mailboxes into `test/fixtures/imap/` for the parser tests (REQ-14-6). It appends one synthetic message, fetches only that message and removes it. It records server bytes only, and writes nothing if a response holds a password or a live address.

In PowerShell, from the repo root. Each prompt hides what you type:

```
$env:IMAP_PASS_MCPTEST_REASINGER = [Net.NetworkCredential]::new('', (Read-Host -AsSecureString 'mcptest@reasinger.net password')).Password
$env:IMAP_PASS_MCPTEST_YCD = [Net.NetworkCredential]::new('', (Read-Host -AsSecureString 'mcptest@yourcigardenindy.com password')).Password
node scripts/record-fixtures.mjs
Remove-Item Env:IMAP_PASS_MCPTEST_REASINGER, Env:IMAP_PASS_MCPTEST_YCD
npm test
```

## Clear a cPHulk block

Too many failed logins can make cPanel's cPHulk block the server's address. Workers has no fixed egress IP to whitelist, so a block is cleared by hand in the cPanel or WHM of the affected host. The server disables an account for the rest of the request after an authentication failure and never retries, so fix the secret before trying again.

## Deploy staging

There is no default environment, so a bare `wrangler deploy` fails. First check that `npx wrangler whoami` shows the scott@reasinger.net account.

```
npx wrangler deploy --env staging
```

## Set secrets

Enter values only at the `wrangler secret put` prompt. Never put them in a file in this repo, on a command line or in a log.

Staging Worker:

```
npx wrangler secret put STAGING_TOKEN --env staging
npx wrangler secret put IMAP_PASS_MCPTEST_REASINGER --env staging
npx wrangler secret put IMAP_PASS_MCPTEST_YCD --env staging
```

GitHub repo secrets (Settings, Secrets and variables, Actions):

| Secret | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Staging deploy. Workers Scripts: Edit, on the scott@reasinger.net account only. |
| `CLOUDFLARE_ACCOUNT_ID` | Selects that account. |
| `STAGING_TOKEN` | Same value as the staging Worker secret, so CI can call the Worker. |

CI skips the deploy and integration suite with a notice until the Cloudflare secrets exist, and skips the integration suite until `STAGING_TOKEN` exists.

`STAGING_TOKEN` is temporary and staging only; C6 removes it. Production never accepts it.
