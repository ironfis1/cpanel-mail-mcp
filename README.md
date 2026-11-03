# cpanel-mail-mcp

Cloudflare Worker remote MCP server for IMAP access to three cPanel business mailboxes. Build spec: `docs/spec.md` (tag `spec-v1.1`). Build process: `docs/build-plan.md`.

Status: scaffolding and the IMAP client (`src/imap/`, chunk C1). No MCP tools yet. This README is a stub until C6.

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
npm run check                 # wrangler deploy --env staging --dry-run
```

The integration suite calls the deployed staging Worker over HTTPS. It skips with a message when `STAGING_TOKEN` is not in the environment.

```
npm run test:integration
```

`/imap-check` on the staging Worker runs the IMAP client against both test mailboxes. It appends a synthetic message to Drafts, then moves and removes it.

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
