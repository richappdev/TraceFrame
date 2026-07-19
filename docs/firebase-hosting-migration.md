# Firebase Hosting migration

The canonical production and OAuth entry point is Firebase Hosting at:

- `https://antiable-anipin.web.app`
- `https://antiable-anipin.firebaseapp.com` (hosting alias; not an OAuth origin)

Firebase Hosting rewrites all requests to the `anipin-web` Cloud Run service in
`asia-east1`. Legacy project `antiable-traceframe` App Hosting and Cloud Run have been
retired (Hosting site / Firestore / secrets retained for audit only).

OAuth is single-origin: `BANGUMI_REDIRECT_URI` is the canonical `web.app` callback. Starting OAuth on an alternate alias or the rollback App Hosting host redirects to the canonical `/api/auth/bangumi` endpoint before the state cookie is created.

## One-time setup

Authenticate both CLIs and select the project:

```powershell
gcloud auth login
gcloud config set project antiable-anipin
npx -y firebase-tools@latest login
```

Confirm that the default Hosting site exists. If the list does not include
`antiable-anipin`, create it:

```powershell
npx -y firebase-tools@latest hosting:sites:list --project antiable-anipin
npx -y firebase-tools@latest hosting:sites:create antiable-anipin --project antiable-anipin
```

Create a dedicated Cloud Run runtime identity and grant only the required runtime roles:

```powershell
gcloud iam service-accounts create anipin-web --project antiable-anipin --display-name "AniPin web runtime"
gcloud projects add-iam-policy-binding antiable-anipin --member "serviceAccount:anipin-web@antiable-anipin.iam.gserviceaccount.com" --role "roles/datastore.user"

$secrets = @("BANGUMI_CLIENT_ID", "BANGUMI_CLIENT_SECRET", "BANGUMI_REDIRECT_URI", "SESSION_SECRET")
foreach ($secret in $secrets) {
  gcloud secrets add-iam-policy-binding $secret --project antiable-anipin --member "serviceAccount:anipin-web@antiable-anipin.iam.gserviceaccount.com" --role "roles/secretmanager.secretAccessor"
}
```

The deploying user also needs permission to build from source, deploy Cloud Run, act as
the runtime service account, and deploy Firebase Hosting.

## Cookies (required)

Firebase Hosting strips every incoming cookie except `__session` before the
request reaches Cloud Run. The app therefore stores both the short-lived OAuth
CSRF state and the logged-in session in `__session` (never `antiable_session` /
`antiable_oauth_state`). Auth responses that set this cookie use
`Cache-Control: private`.

Anonymous locale preference also uses `__session` as `locale:<Locale>` when no
auth/OAuth payload is present. Do not use a separate locale cookie — Hosting
will strip it. Middleware prefers Firebase's `X-Orig-Accept-Language` when the
CDN rewrites `Accept-Language`.

## OAuth cutover

Register this callback in the Bangumi application:

```text
https://antiable-anipin.web.app/api/auth/callback
```

Set `BANGUMI_REDIRECT_URI` to that exact value in `apps/web/.env.local`, then add a new
version to the existing Secret Manager secret without printing the value:

```powershell
$redirect = "https://antiable-anipin.web.app/api/auth/callback"
$redirect | gcloud secrets versions add BANGUMI_REDIRECT_URI --project antiable-anipin --data-file=-
```

## Build and deploy

Build locally when Docker is available:

```powershell
docker build -t anipin-web:local .
```

Deploy Cloud Run first, followed by the Hosting rewrite:

```powershell
pwsh scripts/deploy-firebase-hosting.ps1
```

`firebase.json` uses `pinTag: true`, so a Hosting release is tied to the selected Cloud
Run revision and Hosting rollbacks can restore the corresponding revision.

Public Firebase Analytics identifiers are set as `ENV` in the Dockerfile so
`NEXT_PUBLIC_FIREBASE_*` are baked into the Next.js client bundle at image build.

## Release verification

Verify through `https://antiable-anipin.web.app`, not the direct Cloud Run URL.

Quick unauthenticated smoke: [`docs/hosted-smoke.md`](hosted-smoke.md).  
Full M2 gate: [`docs/m2-acceptance.md`](m2-acceptance.md).

1. `/api/health` returns 200, reports Firestore production storage, and confirms the Firestore dependency is ready; invalid configuration or an unreadable store returns 503.
2. `/` locale negotiation respects `zh-TW` / `zh-CN` / `ja-JP` (including after visiting a locale-prefixed path).
3. Bangumi login, callback, logout, and library synchronization work.
4. Trips can be created, edited, and opened through public share URLs (`/t/:token`).
5. Data remains after a Cloud Run restart or new revision.
6. Session, CSRF, static asset, and security-header checks pass.

Keep monitoring `https://antiable-anipin.web.app` after each release. Legacy
`antiable-traceframe` runtime surfaces are retired and should return errors if probed.
