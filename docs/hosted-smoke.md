# Hosted smoke (canonical Firebase Hosting)

Use this for a fast live check of `https://antiable-traceframe.web.app`.  
It is **not** a substitute for [`m2-acceptance.md`](m2-acceptance.md). Passing smoke does not flip M2 to PASS.

## A. Immediate reachability (unauthenticated)

Open in order:

```text
https://antiable-traceframe.web.app/api/health
https://antiable-traceframe.web.app/
https://antiable-traceframe.web.app/zh-TW
https://antiable-traceframe.web.app/zh-CN
https://antiable-traceframe.web.app/ja-JP
https://antiable-traceframe.web.app/zh-TW/presence
https://antiable-traceframe.web.app/zh-TW/trips/explore
```

### `/api/health`

Expect HTTP **200** JSON with:

- `ok: true`
- `appStore: "firestore"` (not sqlite)
- `dependencies.appStore: "ready"`
- `releaseStatus: "implemented-awaiting-acceptance"` until M2 evidence is recorded as PASS
- no secrets, tokens, or personal data

If runtime storage/config is not ready, expect **503** with `error: "runtime_not_ready"` — never a false-positive 200.

### Locale and `/`

- Product default is `zh-CN`; `/` redirects using saved preference, then `Accept-Language` / Firebase `X-Orig-Accept-Language`, else default.
- Locale-prefixed page routes are canonical; API and OAuth callback are unprefixed.
- Refreshing a locale route must not produce a Firebase Hosting 404.
- Language switcher links stay on locale-prefixed paths.

### Presence (M2 checklist coverage)

- Work list loads
- City filter works; empty state is clear
- Mapped titles link to `anitabi.cn/map?bangumiId=`
- Anitabi attribution visible
- Inventory verification date visible

### Explore (deployment smoke — not an M2 gate item)

Confirm the current Hosting revision includes curated trips:

- `/trips/explore` lists curated routes
- A known slug opens (for example `/zh-TW/trips/explore/kyoto-uji-classics`)
- Invalid slug returns a formal **404**, not a 5xx
- Copy-to-planner prompts login when logged out; after login it creates an owner trip

Explore pass/fail does not decide M2 by itself.

## B. Minimal live QA core (still required for M2)

Public share URLs use `/t/:token` (no locale prefix).

1. Browse home, Presence, Explore logged out.
2. Switch `zh-CN` / `zh-TW` / `ja-JP`.
3. Bangumi login.
4. Land on Library (not an error page or bare home).
5. Sync wish / doing / done.
6. Create a 1-day trip.
7. Save, reorder, rename.
8. Create a public share URL (`/t/...`).
9. Open the share URL in a clean logged-out browser.
10. Rotate token — old URL fails immediately.
11. Revoke sharing — old and new URLs fail.
12. After Cloud Run redeploy/restart, trip still exists.
13. Second account cannot read/PATCH the owner trip.
14. Delete account — library, trips, and share links are gone.

Then finish the remaining unchecked items in [`m2-acceptance.md`](m2-acceptance.md) (cookie attributes, CSRF, input limits, privacy/data-policy, a11y, rollback review) and fill the Evidence table.

## C. Result wording

- **Local preflight green** ≠ hosted acceptance complete.
- DNS failure in one environment ≠ site offline; verify from a network that resolves `web.app`.
- M2 stays **OPEN** until [`m2-acceptance.md`](m2-acceptance.md) Result is **PASS**.
