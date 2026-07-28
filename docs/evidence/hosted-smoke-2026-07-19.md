# Hosted smoke evidence — 2026-07-19

> **Historical pre-rename, pre-fix evidence.** Preserve the host and results below as observed. This run was a partial pass with a locale-negotiation failure; the code fix was implemented afterward, but no tracked post-fix hosted recheck is recorded here.

Canonical host probed: `https://antiable-traceframe.web.app`  
Commit at probe time (repo HEAD): `661e8e3`  
Tester: automated HTTP probe from a network that resolves `web.app`  
Scope: section A of [`docs/hosted-smoke.md`](../hosted-smoke.md) only (unauthenticated). Auth/share/deletion steps not run.

## Results

| Check | Result | Notes |
|---|---|---|
| `/api/health` | PASS | HTTP 200; `appStore=firestore`; `dependencies.appStore=ready`; `releaseStatus=implemented-awaiting-acceptance`; `phase=M2`; no secrets in body |
| `firebaseapp.com` `/api/health` | PASS | Alias also healthy (not an OAuth origin) |
| `/` redirect | PASS (default) | 307 → `/zh-CN` without Accept-Language |
| `/` + `Accept-Language: ja` | PASS | 307 → `/ja-JP` |
| `/` + `Accept-Language: zh-TW` (and zh-Hant / zh-HK) | FAIL (pre-fix) | 307 → `/zh-CN`. Firebase exposes `X-Orig-Accept-Language` with the client value, but middleware only read `Accept-Language`, which the CDN rewrites. Separately, `traceframe_locale` never reaches Cloud Run because Hosting strips all cookies except `__session`. |
| `/zh-TW`, `/zh-CN`, `/ja-JP` | PASS | HTTP 200; locale HTML/lang correct; no Hosting 404 |
| `/zh-TW/presence` | PASS | HTTP 200; multiple `anitabi.cn/map?bangumiId=` links present |
| `/zh-TW/trips/explore` | PASS | HTTP 200; curated slugs present (`kyoto-uji-classics`, `greater-tokyo-music-trail`, `tokyo-anime-highlights`, yamanashi route) |
| Explore detail slug | PASS | `/zh-TW/trips/explore/kyoto-uji-classics` → 200 |
| Invalid explore slug | PASS | `/zh-TW/trips/explore/not-a-real-slug-xyz` → formal 404 |

## Follow-up implemented in repo

Middleware now:

1. Reads `X-Orig-Accept-Language` before `Accept-Language`.
2. Stores anonymous locale preference as `__session=locale:<Locale>` when no auth/OAuth payload is present (Firebase-safe).

Redeploy Cloud Run + Firebase Hosting, then re-check `/` with `Accept-Language: zh-TW` and cookie persistence after visiting `/zh-TW`.

## Gate status

M2 remains **OPEN**. This smoke is not release evidence for OAuth, share rotation/revocation, owner isolation, deletion, or persistence across rollout.
