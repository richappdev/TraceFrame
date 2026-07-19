# Antiable Trip

Bangumi library → Anitabi presence → city-day pilgrimage planner.

Engineering plan: [Notion — Implementation plan](https://app.notion.com/p/Implementation-plan-Antiable-Trip-2026-07-15-39ea4181b62881689bd8c6d1cec238fe)

## Monorepo

| Path | Role |
|---|---|
| `apps/web` | Next.js (App Router) — health, presence browse, Bangumi OAuth, library join |
| `packages/bangumi` | Bangumi HTTP client (UA + ranked + subject cache) |
| `packages/anitabi` | Anitabi `/lite` client + rate limiter + map deep-link helpers |
| `packages/presence` | SQLite presence index + CSV import + coverage report |
| `tools/probe-agent` | Historical probe tooling / seeding patterns |
| `valid-ids.csv` | Seed Bangumi IDs with verified Anitabi coverage |

## Quick start

```bash
# Ensure system Node is on PATH (not Cursor's helper-only node)
npm install
npm run presence:import
npm run presence:reconcile   # refresh seed vs live Anitabi + Bangumi
npm run presence:coverage
npm run smoke:clients
npm run test
npm run dev
```

Copy `apps/web/.env.example` → `apps/web/.env.local` and fill Bangumi OAuth credentials for login.

| URL | Purpose |
|---|---|
| `/` | Landing |
| `/presence` | Guest-friendly mapped titles (city filter via `?city=`) |
| `/library` | Collection × presence join (after OAuth) |
| `/trips` | Owner trip list |
| `/trips/new` | Build 1–3 day city trip from mapped titles |
| `/trips/:id` | Trip editor (reorder + save) + share link |
| `/t/:token` | Read-only shared trip |
| `/api/health` | Deploy smoke |
| `/api/presence` | Paginated presence JSON |
| `/api/trips` | Create / list trips |
| `/privacy` | Stored-data explanation and account deletion |
| `/data-policy` | License and commercial-use guardrails |

Reports: `reports/coverage-YYYY-MM-DD.{json,md}` · DB: `data/presence.sqlite`

Set `SKIP_NETWORK=1` on smoke/coverage for offline CI. If Anitabi returns Cloudflare 403 or a challenge, stop the refresh; smoke may fall back to the curated presence seed. Do not rotate egress to continue enumeration.

## License / data policy (MVP)

Persist presence **metadata** only. Do not redistribute Anitabi detail POI/screenshot payloads. Deep-link `anitabi.cn/map?bangumiId=` and credit Anitabi (BY-NC-SA) + Bangumi. Paid planning, affiliate links, and commercial exports remain disabled until the rights gate in [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md) is approved.

## Phase status

- **E0–E3 implementation** — code complete; this is not a release claim.
- **Presence inventory** — 14 reconciled IDs as of 2026-07-18; the older 15-ID coverage report is superseded.
- **M2 release gate** — **OPEN**; see [`docs/m2-acceptance.md`](docs/m2-acceptance.md).
- **Firebase** — project `antiable-traceframe` (display: Traceframe); App Hosting config ready
- **Production data** — Firestore required; local SQLite is development-only.
- **E4+** — blocked until M2 passes and rights/data gates are approved.

Planning records: [`docs/product-validation.md`](docs/product-validation.md) · [`docs/firestore-operations.md`](docs/firestore-operations.md) · [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md)

## Deploy (Firebase App Hosting)

App Hosting requires the **Blaze** plan on project `antiable-traceframe`:

https://console.firebase.google.com/project/antiable-traceframe/usage/details

Create a Cloud Firestore database in the Firebase project before the first rollout. Production
uses Firestore for durable users, libraries, and trips; local development continues to use SQLite.

```bash
# 1. Create backend (once, after Blaze)
npx -y firebase-tools@latest apphosting:backends:create \
  --project antiable-traceframe \
  --backend traceframe \
  --primary-region asia-east1 \
  --root-dir apps/web \
  --app 1:39985878012:web:22397139bcd156af86d879

# 2. Push secrets from apps/web/.env.local
pwsh scripts/set-apphosting-secrets.ps1

# 3. Deploy
npx -y firebase-tools@latest deploy --only apphosting --project antiable-traceframe
```

After the first deploy, set Bangumi **回调地址** and `BANGUMI_REDIRECT_URI` to:

`https://<your-hosted-url>/api/auth/callback`

then re-run the secrets script and redeploy.
