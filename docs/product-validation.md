# Product validation plan

## Beachhead and pilot

- Beachhead: Chinese-speaking independent travelers planning an anime-focused Japan trip.
- Supported interface locales: Simplified Chinese (`zh-CN`, default), Traditional Chinese for Taiwan (`zh-TW`), and Japanese (`ja-JP`). Locale-prefixed public URLs are canonical; unprefixed page URLs redirect using the Firebase-safe `__session` locale preference (`locale:<Locale>`), then `Accept-Language` / `X-Orig-Accept-Language`, else the default.
- Pilot geography: greater Kyoto/Uji. This tests whether coarse work-level Presence can produce a useful plan before POI-level routing is built.

## M0 evidence status

- Canonical inventory: `valid-ids.csv`, **31 reconciled IDs** as of 2026-07-20 (`sourceRun=reconcile-20260720`).
- Reconciliation evidence: generated local artifact `reports/presence-reconcile-2026-07-20.json`; sanitized tracked summary: [`docs/evidence/m0-coverage-2026-07-20.md`](evidence/m0-coverage-2026-07-20.md).
- The 2026-07-15 top-200 report used a superseded 15-ID seed and must not be treated as current validation.
- Historical 2026-07-19 ranked overlap: **5 of Bangumi top 200 mapped (2.5%)**. It has not been recomputed for the 31-ID registry and must not be presented as the current overlap. Real collection-match distribution is still required.

## Beta hypotheses and thresholds

| Hypothesis | Event / denominator | Pilot threshold |
|---|---|---|
| Collections have useful coverage | Users with at least one mapped title / successful syncs | ≥40% of 30 users |
| Users can reach value | Trips saved / users with mapped titles | ≥35% |
| Trips are worth sharing | Unique trips shared / saved trips | ≥25% |
| Planning has repeat value | Users returning before stated trip date / trip creators | ≥20% within 14 days |
| Coarse city planning is sufficient for M2 | Pilot users rating plan useful without POI ordering | ≥60% of 10 interviews |

If collection coverage misses the threshold, do not hide the problem with ranked-title fallback metrics. Revisit the data partnership or reposition toward curated city guides.

## Ownership and decision dates

| Decision | Owner | Due / gate |
|---|---|---|
| M2 technical acceptance | Engineering owner | Before preview is called released |
| Anitabi/Bangumi rights review | Product owner + qualified reviewer | Before public monetized launch |
| Kyoto/Uji pilot recruitment | Product owner | Immediately after M2 PASS |
| Firestore backup and restore | Operations owner | Before production |
| English localization | Product owner | Only after pilot thresholds pass |
