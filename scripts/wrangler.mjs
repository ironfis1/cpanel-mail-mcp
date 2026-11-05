// Runs wrangler with the API token for the account pinned in wrangler.toml, so the
// global `wrangler login` (and whichever account it belongs to) is never used.
//
//   npm run wrangler -- <wrangler args>      e.g. npm run wrangler -- whoami
//
// Token source, first match wins:
//   1. %USERPROFILE%\.cloudflare\<account_id>.token, saved by scripts/save-cf-token.ps1
//      (DPAPI-encrypted, Windows only).
//   2. CLOUDFLARE_API_TOKEN already in the environment (CI).
// The token is passed to the wrangler child process only. It is never printed.

import { spawn, spawnSync } from "node:child_process";
// (wrangler runs via its own bin script under this node, so no shell parses the arguments)
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`scripts/wrangler.mjs: ${message}`);
  process.exit(1);
}

const { account_id: accountId } = parse(readFileSync(join(ROOT, "wrangler.toml"), "utf8"));
if (!/^[0-9a-f]{32}$/.test(accountId ?? "")) fail("wrangler.toml has no valid top-level account_id.");

if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== accountId) {
  fail(
    `CLOUDFLARE_ACCOUNT_ID in the environment (${process.env.CLOUDFLARE_ACCOUNT_ID}) ` +
      `is not this repo's account (${accountId}). Unset it or fix it.`,
  );
}

function readSavedToken() {
  const file = join(homedir(), ".cloudflare", `${accountId}.token`);
  if (!existsSync(file)) return null;
  if (process.platform !== "win32") fail(`${file} exists but can only be decrypted on Windows.`);
  const script =
    "$s = (Get-Content -Raw -LiteralPath $env:CF_TOKEN_FILE).Trim() | ConvertTo-SecureString; " +
    "[Console]::Out.Write([Net.NetworkCredential]::new('', $s).Password)";
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    env: { ...process.env, CF_TOKEN_FILE: file },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.status !== 0 || !result.stdout) {
    fail(`could not decrypt ${file}. It was saved by another Windows user or computer; run scripts/save-cf-token.ps1 again.`);
  }
  return result.stdout.trim();
}

const token = readSavedToken() ?? process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  fail(
    `no token for account ${accountId}. Run once on this computer:\n` +
      "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\save-cf-token.ps1",
  );
}

const wranglerBin = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(wranglerBin)) fail("wrangler is not installed. Run npm ci.");

const child = spawn(process.execPath, [wranglerBin, ...process.argv.slice(2)], {
  cwd: ROOT,
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
  stdio: "inherit",
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
