#!/usr/bin/env pwsh
# Loads apps/web/.env.local into App Hosting secrets (requires Blaze + Firebase login).
# Usage: pwsh scripts/set-apphosting-secrets.ps1

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\apps\web\.env.local"
if (-not (Test-Path $envFile)) {
  throw "Missing apps/web/.env.local"
}

$project = "antiable-traceframe"
$map = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^([^=]+)=(.*)$') {
    $map[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$keys = @(
  "BANGUMI_CLIENT_ID",
  "BANGUMI_CLIENT_SECRET",
  "SESSION_SECRET",
  "BANGUMI_REDIRECT_URI"
)

foreach ($k in $keys) {
  if (-not $map.ContainsKey($k) -or -not $map[$k]) {
    Write-Warning "Skip $k (empty in .env.local)"
    continue
  }
  Write-Host "Setting secret $k ..."
  $map[$k] | npx -y firebase-tools@latest apphosting:secrets:set $k --project $project --data-file -
  npx -y firebase-tools@latest apphosting:secrets:grantaccess $k --project $project --backend traceframe
}

Write-Host "Done. Redeploy App Hosting after secrets change."
