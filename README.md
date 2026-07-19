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

Reports: `reports/coverage-YYYY-MM-DD.{json,md}` · DB: `data/presence.sqlite`

Set `SKIP_NETWORK=1` on smoke/coverage for offline CI. If Anitabi returns Cloudflare 403, smoke falls back to the presence seed.

## License / data policy (MVP)

Persist presence **metadata** only. Do not redistribute Anitabi detail POI/screenshot payloads commercially. Deep-link `anitabi.cn/map?bangumiId=` and credit Anitabi (BY-NC-SA) + Bangumi.

## Phase status

- **E0 Foundations** — done (scaffold, clients, presence import, M0 coverage report)
- **E1 Auth & library** — done in code (OAuth + library sync/join); set Bangumi credentials in `.env.local`
- **E2 Discovery UX** — city chips filter `/presence`, attribution footer, unmapped FAQ
- **E3 Day planner MVP** — trip CRUD, owner list, reorder editor, share token (`/t/:token`)
- **M2 gate** — see `docs/m2-acceptance.md` (manual + preview deploy)
- **Firebase** — project `antiable-traceframe` (display: Traceframe); App Hosting config ready
- E4+ — POI detail / export (see Notion)

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
