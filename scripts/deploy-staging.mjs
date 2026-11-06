// Deploys staging through scripts/wrangler.mjs with a label saying what was deployed and from where:
//
//   npm run deploy:staging                  --message "<git short sha> <hostname>"
//   npm run deploy:staging -- --label ci    --message "<git short sha> ci"
//
// Any other arguments are passed on to `wrangler deploy`. No shell is involved, so this works the
// same in PowerShell, cmd and bash.

import { spawn, spawnSync } from "node:child_process";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`scripts/deploy-staging.mjs: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
let label = hostname();
const labelAt = args.indexOf("--label");
if (labelAt !== -1) {
  label = args[labelAt + 1];
  if (!label || label.startsWith("--")) fail("--label needs a value.");
  args.splice(labelAt, 2);
}

const git = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" });
const sha = git.status === 0 ? git.stdout.trim() : "";
if (!sha) fail("could not read the git short SHA (git rev-parse --short HEAD).");

const message = `${sha} ${label}`;
console.log(`Deploying staging as "${message}"`);

const child = spawn(
  process.execPath,
  [join(ROOT, "scripts", "wrangler.mjs"), "deploy", "--env", "staging", "--message", message, ...args],
  { cwd: ROOT, stdio: "inherit" },
);
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
