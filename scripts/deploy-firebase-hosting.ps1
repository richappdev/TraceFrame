#!/usr/bin/env pwsh
# Deploy the Next.js container to Cloud Run, then publish the Firebase Hosting rewrite.

[CmdletBinding()]
param(
  [string]$Project = "antiable-anipin",
  [string]$Region = "asia-east1",
  [string]$Service = "anipin-web",
  [string]$ServiceAccount = "anipin-web@antiable-anipin.iam.gserviceaccount.com"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud is required. Install the Google Cloud CLI and run 'gcloud auth login' first."
}

Write-Host "Deploying Cloud Run service $Service in $Region ..."
gcloud run deploy $Service `
  --project $Project `
  --region $Region `
  --source . `
  --service-account $ServiceAccount `
  --allow-unauthenticated `
  --port 8080 `
  --cpu 1 `
  --memory 1Gi `
  --min 0 `
  --max 4 `
  --concurrency 40 `
  --set-env-vars "NODE_ENV=production,APP_STORE=firestore,DATA_DIR=/tmp/antiable,HOSTNAME=0.0.0.0" `
  --set-secrets "BANGUMI_CLIENT_ID=BANGUMI_CLIENT_ID:latest,BANGUMI_CLIENT_SECRET=BANGUMI_CLIENT_SECRET:latest,BANGUMI_REDIRECT_URI=BANGUMI_REDIRECT_URI:latest,SESSION_SECRET=SESSION_SECRET:latest,PRESENCE_DRAIN_SECRET=PRESENCE_DRAIN_SECRET:latest"

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deployment failed; Firebase Hosting was not changed."
}

Write-Host "Publishing Firebase Hosting site antiable-anipin ..."
npx -y firebase-tools@latest deploy --only hosting --project $Project

if ($LASTEXITCODE -ne 0) {
  throw "Firebase Hosting deployment failed. Cloud Run remains available for retry."
}

Write-Host "Deployment complete: https://antiable-anipin.web.app"
