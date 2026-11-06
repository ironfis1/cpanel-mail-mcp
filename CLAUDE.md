# cpanel-mail-mcp: working rules for Claude Code

Cloudflare Worker remote MCP server for IMAP access to Scott's three cPanel business mailboxes. Scott works on this repo from two machines (home desktop and laptop). Everything Claude Code needs lives in the repo, not on either machine.

## Before any work

1. `git pull` on the branch you are about to work on. Never start on a stale branch.
2. Read `docs/build-plan.md` (roles, the gate, chunk order) and the current chunk prompt in `docs/build/Cn.md`.
3. The spec is `docs/spec.md` at the git tag named in `docs/build-plan.md`. Open questions are in `docs/build/spec-questions.md`.

## Build discipline

- One chunk at a time, on branch `chunk/Cn`, ending in a PR titled `Cn: <title>`. Then stop.
- Build only what the chunk lists as in scope. Never add behavior the spec does not state.
- Never decide a spec question. Log it in `docs/build/spec-questions.md`, skip that item, list it in the PR.
- Never edit `docs/spec.md`, `docs/rule-base.md`, `docs/ambiguity-log.md` or `docs/design.md` from a chunk.
- Every test name starts with the REQ IDs it verifies. Keep `docs/build/traceability.md` current.

## Environment

- Node 24. Install with `npm ci`, never `npm install`.
- Scott has three Cloudflare accounts and several projects on each computer, so the global `wrangler login` is never used. Run wrangler only as `npm run wrangler -- <args>` (`scripts/wrangler.mjs`). It uses the `account_id` pinned in `wrangler.toml` (scott@reasinger.net, `4d82e6de…`) and that account's token, saved once per computer by `scripts/save-cf-token.ps1`. Never call `npx wrangler` directly for anything that talks to Cloudflare.
- Check with `npm run wrangler -- whoami` before any deploy. If it reports no saved token, ask Scott to run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\save-cf-token.ps1`; never enter or handle the token yourself.
- In PowerShell, quote the separator when wrangler args start with a flag: `npm run wrangler '--' <args>`.
- There is no default environment. Use `--env staging`. Production deploys only from a tag via CI.
- `npm run deploy:staging` labels every deploy `--message "<git short sha> <hostname>"` (`scripts/deploy-staging.mjs`). CI's label is `<sha> ci`.
- CI has its own Cloudflare API token, `cpanel-mail-mcp-ci`, scoped to Workers Scripts: Edit on the scott@reasinger.net account only. It is stored as the `CLOUDFLARE_API_TOKEN` repo secret. The device tokens (desktop, laptop) are separate and never used by CI.
- CI deploys staging on every pull request and every push to main. A staging deploy you didn't run yourself is most likely CI; check the Actions tab before treating it as unknown.
- When `STAGING_TOKEN` rotates, update three places: the Worker secret (`npm run wrangler '--' secret put STAGING_TOKEN --env staging`), the GitHub repo secret (`gh secret set STAGING_TOKEN`), and Scott's password vault.

## Secrets

- Never write a password, token or secret to a file in this repo, a command line, or a log.
- Worker secrets are set only at the `wrangler secret put` prompt. IMAP passwords for fixture recording are entered at a hidden prompt (README).
- `STAGING_TOKEN` comes from the shell environment for integration tests. Without it they skip.

## Before leaving a machine

Commit and push. Unfinished work goes on its branch as a WIP commit. Nothing stays only on one machine.
