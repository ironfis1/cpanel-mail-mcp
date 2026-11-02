# cpanel-mail-mcp

Cloudflare Worker remote MCP server for IMAP access to three cPanel business mailboxes. Build spec: `docs/spec.md` (tag `spec-v1.1`). Build process: `docs/build-plan.md`.

Status: scaffolding only (chunk C0). No product behavior yet. This README is a stub until C6.

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
npm run check                 # wrangler deploy --env staging --dry-run
```

The integration suite calls the deployed staging Worker over HTTPS. It skips with a message when `STAGING_TOKEN` is not in the environment.

```
npm run test:integration
```

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
