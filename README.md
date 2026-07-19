# Antiable Trip

Online product name: **AniPins**.

Bangumi library → Anitabi presence → city-day pilgrimage planner.

Engineering plan: [Notion — Implementation plan](https://app.notion.com/p/39ea4181b62881689bd8c6d1cec238fe) · Runtime verify: [Notion — Presence verify](https://app.notion.com/p/3a2a4181b62881b9ac74fe4a91bbf7af)

## Monorepo

| Path | Role |
|---|---|
| `apps/web` | Next.js (App Router) — health, presence browse, Bangumi OAuth, library join, async Presence verify |
| `packages/bangumi` | Bangumi HTTP client (UA + ranked + subject cache) |
| `packages/anitabi` | Anitabi `/lite` client + rate limiter + map deep-link helpers |
| `packages/presence` | SQLite presence index + CSV import + coverage report |
| `tools/probe-agent` | Historical bounded verifier; sequential, fixed-UA, stop-on-block only |
| `valid-ids.csv` | Seed Bangumi IDs with verified Anitabi coverage (offline reconcile baseline) |

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
Optional local drain: set `PRESENCE_DRAIN_SECRET` and `POST /api/internal/presence-drain`.
Firebase Analytics is optional and consent-gated; configuration and event reporting are documented
in [`docs/analytics.md`](docs/analytics.md).

| URL | Purpose |
|---|---|
| `/` | Landing |
| `/presence` | Guest-friendly mapped titles (city filter via `?city=`) |
| `/library` | Collection × presence join (after OAuth); unmatched IDs may show 核對中 |
| `/trips` | Owner trip list |
| `/trips/explore` | Public curated anime-trip gallery |
| `/trips/explore/:slug` | Curated title/city itinerary with copy-to-planner action |
| `/trips/new` | Build 1–3 day city trip from mapped titles |
| `/trips/:id` | Trip editor (reorder + save) + share link |
| `/t/:token` | Read-only shared trip |
| `/api/health` | Deploy smoke |
| `/api/presence` | Paginated presence JSON |
| `/api/me/library/sync` | Refresh Bangumi collections + enqueue unmatched for verify |
| `/api/internal/presence-drain` | Scheduler drain (Bearer `PRESENCE_DRAIN_SECRET`) |
| `/api/trips` | Create / list trips |
| `/privacy` | Stored-data explanation and account deletion |
| `/data-policy` | License and commercial-use guardrails |

Public page routes are locale-prefixed: `/zh-CN`, `/zh-TW`, or `/ja-JP`
(for example, `/ja-JP/presence`). Legacy unprefixed page URLs redirect to the
saved/browser locale. API and OAuth callback routes remain unprefixed.

Generated/raw reports: `reports/` (ignored because smoke artifacts may contain personal data or live tokens) · tracked sanitized evidence: [`docs/evidence/`](docs/evidence/) · local DB: `data/presence.sqlite`

Set `SKIP_NETWORK=1` on smoke/coverage for offline CI. If Anitabi returns Cloudflare 403 or a challenge, stop the refresh; smoke may fall back to the curated presence seed. Do not rotate egress to continue enumeration.

The historical verifier is deliberately bounded: canonical seeds plus ranked candidates, maximum 500, sequential 1.5–3 second gaps, a fixed identifying User-Agent, and immediate whole-run termination on 403, 429, or an HTML challenge.

### Runtime Presence verify (production)

Library sync does **not** call Anitabi inline. Unmatched Bangumi IDs are enqueued; Cloud Scheduler drains `POST /api/internal/presence-drain` every few minutes. Hits upsert Firestore `antiable_presence*` (shared, durable). `valid-ids.csv` stays the offline curated baseline — runtime verify does not rewrite the seed. See [`docs/firestore-operations.md`](docs/firestore-operations.md).

**Important:** Scheduler must target the **Cloud Run URL**, not Firebase Hosting (Hosting strips `Authorization`).

## License / data policy (MVP)

Persist presence **metadata** only. Do not redistribute Anitabi detail POI/screenshot payloads. Deep-link `anitabi.cn/map?bangumiId=` and credit Anitabi (BY-NC-SA) + Bangumi. Paid planning, affiliate links, and commercial exports remain disabled until the rights gate in [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md) is approved.

## Phase status

- **E0–E3 implementation** — code complete; this is not a release claim.
- **Presence inventory** — 14 reconciled CSV seeds as of 2026-07-18; runtime verify can add Firestore hits on top.
- **Runtime verify** — live (enqueue on sync + Cloud Scheduler `presence-drain`); Notion: [Presence verify](https://app.notion.com/p/3a2a4181b62881b9ac74fe4a91bbf7af).
- **M2 release gate** — **OPEN**; see [`docs/m2-acceptance.md`](docs/m2-acceptance.md). Operator smoke checklist: [`docs/hosted-smoke.md`](docs/hosted-smoke.md).
- **Firebase** — project `antiable-anipin` (product display name: AniPin / AniPins); Firebase Hosting fronts Cloud Run in `asia-east1`
- **Canonical app/OAuth host** — `https://antiable-anipin.web.app`
- **Production data** — Firestore for users, libraries, trips, and runtime Presence; local SQLite is development / rebuildable seed only.
- **Automated preflight** — unit tests plus lint, workspace typecheck, and production build; hosted manual acceptance remains open.
- **E4+** — blocked until M2 passes and rights/data gates are approved.

Planning records: [`docs/product-validation.md`](docs/product-validation.md) · [`docs/firestore-operations.md`](docs/firestore-operations.md) · [`docs/data-rights-matrix.md`](docs/data-rights-matrix.md)

## Deploy (Firebase Hosting + Cloud Run)

The canonical production and OAuth URL is `https://antiable-anipin.web.app`. The
`firebaseapp.com` alias is not an OAuth origin. Cloud Run and
Firestore require the **Blaze** plan on project `antiable-anipin`:

https://console.firebase.google.com/project/antiable-anipin/usage/details

Create a Cloud Firestore database in the Firebase project before the first rollout. Production
uses Firestore for durable users, libraries, trips, and runtime Presence overlays; local development continues to use SQLite for the app store and seed Presence.

```powershell
# Build locally (optional preflight), then deploy Cloud Run followed by Hosting.
docker build -t anipin-web:local .
pwsh scripts/deploy-firebase-hosting.ps1
```

Set the Bangumi **回调地址** and the `BANGUMI_REDIRECT_URI` Secret Manager value to:

`https://antiable-anipin.web.app/api/auth/callback`

Also create `PRESENCE_DRAIN_SECRET` in Secret Manager (mounted by the deploy script) and keep Cloud Scheduler job `presence-drain` pointed at the Cloud Run drain URL.

See [`docs/firebase-hosting-migration.md`](docs/firebase-hosting-migration.md) for one-time
IAM/secret setup and release verification. Legacy project `antiable-traceframe` App Hosting
and Cloud Run have been retired; the GCP project is retained only for audit/export.
