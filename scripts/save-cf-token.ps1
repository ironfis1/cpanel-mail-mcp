# Saves a Cloudflare API token for one account on this computer, once.
# The token is typed at a hidden prompt and stored encrypted with Windows DPAPI at
# %USERPROFILE%\.cloudflare\<account id>.token. Only this Windows user on this computer
# can decrypt it. scripts/wrangler.mjs picks the file that matches wrangler.toml's account_id.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\save-cf-token.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\save-cf-token.ps1 -AccountId <id>
#
# With no -AccountId it uses the account_id in this repo's wrangler.toml.

param([string]$AccountId)

$ErrorActionPreference = 'Stop'

if (-not $AccountId) {
  $toml = Join-Path $PSScriptRoot '..\wrangler.toml'
  $match = Select-String -Path $toml -Pattern '^\s*account_id\s*=\s*"([0-9a-f]{32})"' | Select-Object -First 1
  if (-not $match) { throw "No account_id in $toml. Pass -AccountId." }
  $AccountId = $match.Matches[0].Groups[1].Value
}
if ($AccountId -notmatch '^[0-9a-f]{32}$') { throw "Account ID must be 32 hex characters." }

$dir = Join-Path $env:USERPROFILE '.cloudflare'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir "$AccountId.token"

Write-Host "Cloudflare account $AccountId"
$secure = Read-Host 'API token (hidden)' -AsSecureString
if ($secure.Length -eq 0) { throw 'No token entered; nothing saved.' }

ConvertFrom-SecureString -SecureString $secure | Set-Content -Path $file -Encoding ascii
Write-Host "Saved encrypted token to $file"
Write-Host 'Check it with: npm run wrangler -- whoami'
