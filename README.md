# Antiable Trip

Online product name: **TraceFrame**.

Bangumi library → Anitabi presence → city-day pilgrimage planner.

Engineering plan: [Notion — Implementation plan](https://app.notion.com/p/Implementation-plan-Antiable-Trip-2026-07-15-39ea4181b62881689bd8c6d1cec238fe)

## Monorepo

| Path | Role |
|---|---|
| `apps/web` | Next.js (App Router) — health, presence browse, Bangumi OAuth, library join |
| `packages/bangumi` | Bangumi HTTP client (UA + ranked + subject cache) |
| `packages/anitabi` | Anitabi `/lite` client + rate limiter + map deep-link helpers |
| `packages/presence` | SQLite presence index + CSV import + coverage report |
| `tools/probe-agent` | Historical bounded verifier; sequential, fixed-UA, stop-on-block only |
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
Firebase Analytics is optional and consent-gated; configuration and event reporting are documented
in [`docs/analytics.md`](docs/analytics.md).

| URL | Purpose |
|---|---|
| `/` | Landing |
| `/presence` | Guest-friendly mapped titles (city filter via `?city=`) |
| `/library` | Collection × presence join (after OAuth) |
| `/trips` | Owner trip list |
| `/trips/explore` | Public curated anime-trip gallery |
| `/trips/explore/:slug` | Curated title/city itinerary with copy-to-planner action |
| `/trips/new` | Build 1–3 day city trip from mapped titles |
| `/trips/:id` | Trip editor (reorder + save) + share link |
| `/t/:token` | Read-only shared trip |
| `/api/health` | Deploy smoke |
| `/api/presence` | Paginated presence JSON |
| `/api/trips` | Create / list trips |
| `/privacy` | Stored-data explanation and account deletion |
| `/data-policy` | License and commercial-use guardrails |

Public page routes are locale-prefixed: `/zh-CN`, `/zh-TW`, or `/ja-JP`
(for example, `/ja-JP/presence`). Legacy unprefixed page URLs redirect to the
saved/browser locale. API and OAuth callback routes remain unprefixed.

Generated/raw reports: `reports/` (ignored because smoke artifacts may contain personal data or live tokens) · tracked sanitized evidence: [`docs/evidence/`](docs/evidence/) · DB: `data/presence.sqlite`

Set `SKIP_NETWORK=1` on smoke/coverage for offline CI. If Anitabi returns Cloudflare 403 or a challenge, stop the refresh; smoke may fall back to the curated presence seed. Do not rotate egress to continue enumeration.

The historical verifier is deliberately bounded: canonical seeds plus ranked candidates, maximum 500, sequential 1.5–3 second gaps, a fixed identifying User-Agent, and immediate whole-run termination on 403, 429, or an HTML challenge.

## License / data policy (MVP)

Persist presence **metadata** only. Do not redistribute Anitabi detail POI/screenshot payloads. Deep-link `anitabi.cn/map?bangumiId=` and credit Anitabi (BY-NC-SA) + Bangumi. Paid planning, affiliate links, and commercial exports remain disabled until the rights gate in [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md) is approved.

## Phase status

- **E0–E3 implementation** — code complete; this is not a release claim.
- **Presence inventory** — 14 reconciled IDs as of 2026-07-18; the older 15-ID coverage report is superseded.
- **M2 release gate** — **OPEN**; see [`docs/m2-acceptance.md`](docs/m2-acceptance.md). Operator smoke checklist: [`docs/hosted-smoke.md`](docs/hosted-smoke.md).
- **Firebase** — project `antiable-traceframe` (display: Traceframe); Firebase Hosting fronts Cloud Run in `asia-east1`
- **Canonical app/OAuth host** — `https://antiable-traceframe.web.app`; alternate App Hosting links redirect OAuth start to this host.
- **Production data** — Firestore required; local SQLite is development-only.
- **Automated preflight** — 46 unit tests plus lint, workspace typecheck, and production build pass as of 2026-07-19; hosted manual acceptance remains open.
- **E4+** — blocked until M2 passes and rights/data gates are approved.

Planning records: [`docs/product-validation.md`](docs/product-validation.md) · [`docs/firestore-operations.md`](docs/firestore-operations.md) · [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md)

## Deploy (Firebase Hosting + Cloud Run)

The canonical production and OAuth URL is `https://antiable-traceframe.web.app`. The
`firebaseapp.com` alias and the old App Hosting backend are operational/rollback surfaces,
not alternate OAuth origins. Cloud Run and
Firestore require the **Blaze** plan on project `antiable-traceframe`:

https://console.firebase.google.com/project/antiable-traceframe/usage/details

Create a Cloud Firestore database in the Firebase project before the first rollout. Production
uses Firestore for durable users, libraries, and trips; local development continues to use SQLite.

```powershell
# Build locally (optional preflight), then deploy Cloud Run followed by Hosting.
docker build -t traceframe-web:local .
pwsh scripts/deploy-firebase-hosting.ps1
```

Set the Bangumi **回调地址** and the `BANGUMI_REDIRECT_URI` Secret Manager value to:

`https://antiable-traceframe.web.app/api/auth/callback`

See [`docs/firebase-hosting-migration.md`](docs/firebase-hosting-migration.md) for one-time
IAM/secret setup, release verification, and App Hosting rollback details.
