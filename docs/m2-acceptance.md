# M2 release gate — shareable trip

M2 is complete only when every required item is checked on a Firebase App Hosting preview. “Implemented” is not “released.” Record the preview URL, tester, date, and evidence links at the bottom.

## 1. Configuration and durable storage

- [ ] `BANGUMI_CLIENT_ID`, `BANGUMI_CLIENT_SECRET`, `BANGUMI_REDIRECT_URI`, and a 32+ character `SESSION_SECRET` are configured as App Hosting secrets.
- [ ] Hosted runtime reports `APP_STORE=firestore`; production startup refuses local SQLite.
- [ ] Firestore exists in the deployment project and the App Hosting service account can read/write it.
- [ ] A saved trip and public share link still work after a redeploy or instance restart.
- [ ] Firestore export/restore ownership and schedule are recorded in `docs/firestore-operations.md`.

## 2. OAuth and session security

- [ ] Bangumi callback exactly matches the hosted `/api/auth/callback` URL.
- [ ] OAuth rejects missing, modified, expired, and replayed `state` values.
- [ ] Session cookie is `httpOnly`, `Secure` in production, `SameSite=Lax`, signed with HMAC, and expires after 30 days.
- [ ] Missing or weak production `SESSION_SECRET` prevents startup.
- [ ] Logout clears the session; expired Bangumi tokens produce a re-login path rather than exposing credentials.
- [ ] Cross-site POST/PATCH/DELETE requests are rejected.

## 3. M1 library and Presence

- [ ] Login returns to Library and collection sync covers wish/doing/done.
- [ ] Mapped and unmapped states, filters, empty states, and upstream errors are understandable.
- [ ] Presence uses the reconciled `valid-ids.csv` inventory and shows its verification date.
- [ ] Every mapped title links to `anitabi.cn/map?bangumiId=` and displays attribution.
- [ ] No automated job rotates egress or continues enumeration after Cloudflare 403/challenge.

## 4. Trip integrity and authorization

- [ ] Create accepts 1–3 days, no more than 50 unique valid subject IDs, and an 80-character title.
- [ ] Empty, duplicate, malformed, oversized (>64 KiB), and unmapped inputs return safe 4xx errors.
- [ ] Owner can list, rename, reorder, and read their trips.
- [ ] A different logged-in user cannot read or PATCH an owner trip.
- [ ] Anonymous access to `/api/trips/:id` is forbidden without the correct share token.
- [ ] Public `/t/:token` is read-only and works in a clean logged-out browser.

## 5. Share-token lifecycle

- [ ] New tokens use 192 bits of randomness.
- [ ] Rotating a token immediately invalidates the old URL.
- [ ] Revoking sharing immediately invalidates the public URL.
- [ ] Regenerating sharing after revocation creates a different URL.
- [ ] Share view contains only trip metadata and Anitabi deep links—no POI screenshot payload.

## 6. Privacy, licensing, and deletion

- [ ] `/privacy` explains stored data and successfully deletes the user, library, and owned trips.
- [ ] Deletion clears the session and makes old share links unavailable.
- [ ] `/data-policy` is linked globally and matches `docs/data-rights-matrix.md`.
- [ ] No paid planning, affiliate links, commercial export, POI detail, screenshots, or offline packs are enabled before the rights gate is approved.
- [ ] Attribution is visible wherever Anitabi-derived metadata appears.

## 7. Quality and operations

- [ ] `npm run test`, `npm run typecheck`, and `npm run build` pass.
- [ ] Mobile widths, keyboard navigation, focus visibility, and labels are manually checked.
- [ ] `/api/health` succeeds and identifies the release as `implemented-awaiting-acceptance` until this checklist passes.
- [ ] Error logs do not contain OAuth tokens, session cookies, or personal collection payloads.
- [ ] Rollback procedure and Firestore recovery procedure have been dry-run or reviewed.

## Evidence

| Field | Value |
|---|---|
| Preview URL | Pending |
| Commit | Pending |
| Tester / date | Pending |
| Persistence evidence | Pending |
| Logged-out share URL | Pending |
| Deletion evidence | Pending |
| Result | **OPEN** |

E4 remains blocked until Result is changed to **PASS**.
