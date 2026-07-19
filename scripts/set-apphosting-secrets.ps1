#!/usr/bin/env pwsh
# RETIRED: App Hosting on antiable-traceframe was shut down.
# Manage production secrets with Secret Manager on antiable-anipin and
# scripts/deploy-firebase-hosting.ps1 (--set-secrets).

Write-Error @"
set-apphosting-secrets.ps1 is retired.
Use Secret Manager on project antiable-anipin, then:
  powershell -File scripts/deploy-firebase-hosting.ps1
"@
exit 1
