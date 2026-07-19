# Firebase Hosting migration

The production entry point is Firebase Hosting at:

- `https://antiable-traceframe.web.app`
- `https://antiable-traceframe.firebaseapp.com` (equivalent alias)

Firebase Hosting rewrites all requests to the `traceframe-web` Cloud Run service in
`asia-east1`. The existing `traceframe` App Hosting backend and `apps/web/apphosting.yaml`
remain available temporarily for rollback.

## One-time setup

Authenticate both CLIs and select the project:

```powershell
gcloud auth login
gcloud config set project antiable-traceframe
npx -y firebase-tools@latest login
```

Confirm that the default Hosting site exists. If the list does not include
`antiable-traceframe`, create it:

```powershell
npx -y firebase-tools@latest hosting:sites:list --project antiable-traceframe
npx -y firebase-tools@latest hosting:sites:create antiable-traceframe --project antiable-traceframe
```

Create a dedicated Cloud Run runtime identity and grant only the required runtime roles:

```powershell
gcloud iam service-accounts create traceframe-web --project antiable-traceframe --display-name "Traceframe web runtime"
gcloud projects add-iam-policy-binding antiable-traceframe --member "serviceAccount:traceframe-web@antiable-traceframe.iam.gserviceaccount.com" --role "roles/datastore.user"

$secrets = @("BANGUMI_CLIENT_ID", "BANGUMI_CLIENT_SECRET", "BANGUMI_REDIRECT_URI", "SESSION_SECRET")
foreach ($secret in $secrets) {
  gcloud secrets add-iam-policy-binding $secret --project antiable-traceframe --member "serviceAccount:traceframe-web@antiable-traceframe.iam.gserviceaccount.com" --role "roles/secretmanager.secretAccessor"
}
```

The deploying user also needs permission to build from source, deploy Cloud Run, act as
the runtime service account, and deploy Firebase Hosting.

## OAuth cutover

Register this callback in the Bangumi application:

```text
https://antiable-traceframe.web.app/api/auth/callback
```

Set `BANGUMI_REDIRECT_URI` to that exact value in `apps/web/.env.local`, then add a new
version to the existing Secret Manager secret without printing the value:

```powershell
$redirect = "https://antiable-traceframe.web.app/api/auth/callback"
$redirect | gcloud secrets versions add BANGUMI_REDIRECT_URI --project antiable-traceframe --data-file=-
```

## Build and deploy

Build locally when Docker is available:

```powershell
docker build -t traceframe-web:local .
```

Deploy Cloud Run first, followed by the Hosting rewrite:

```powershell
pwsh scripts/deploy-firebase-hosting.ps1
```

`firebase.json` uses `pinTag: true`, so a Hosting release is tied to the selected Cloud
Run revision and Hosting rollbacks can restore the corresponding revision.

## Release verification

Verify through `https://antiable-traceframe.web.app`, not the direct Cloud Run URL:

1. `/api/health` reports Firestore production storage.
2. Bangumi login, callback, logout, and library synchronization work.
3. Trips can be created, edited, and opened through public share URLs.
4. Data remains after a Cloud Run restart or new revision.
5. Session, CSRF, static asset, and security-header checks pass.

Keep App Hosting running until these checks pass. Retire the `traceframe` App Hosting
backend only after the Hosting release is stable and rollback is no longer required.
