# M2 acceptance checklist — Shareable trip

MVP ship gate from the [Implementation plan](https://app.notion.com/p/39ea4181b62881689bd8c6d1cec238fe).

## Prerequisites

- [ ] `apps/web/.env.local` has `BANGUMI_CLIENT_ID`, `BANGUMI_CLIENT_SECRET`, `BANGUMI_REDIRECT_URI`, `SESSION_SECRET`
- [ ] Bangumi app **回调地址** matches `BANGUMI_REDIRECT_URI` exactly
- [ ] `npm run presence:import` (or auto-seed) yields ≥1 mapped titles
- [ ] `npm run dev` → `GET /api/health` returns `phase: "E3"` (or later)

## M1 — Library ↔ map

- [ ] `/library` shows Bangumi login (not “OAuth 未配置”)
- [ ] Login redirects back to `/library` with session cookie
- [ ] **同步收藏** loads wish/doing/done items
- [ ] Mapped titles show **已映射** badge + city + Anitabi deep link
- [ ] Unmapped titles show **未映射**; `?mapped=1` filters correctly

## E2 — City browse

- [ ] `/presence` city chips link with `?city=`
- [ ] Filtering updates the title list; “全部” clears filter
- [ ] Each title links to `anitabi.cn/map?bangumiId=`
- [ ] Footer shows Anitabi BY-NC-SA + Bangumi credit

## M2 — Shareable trip

- [ ] `/trips/new` lists mapped library titles (or Presence fallback)
- [ ] Creating a trip with selected titles redirects to `/trips/:id`
- [ ] Owner can rename trip, reorder days/titles, and **保存修改**
- [ ] `/trips` lists saved trips with edit + share links
- [ ] `/t/:token` opens read-only share view (incognito / logged-out)
- [ ] Share view deep-links Anitabi maps; no POI screenshot payloads

## Preview deploy (week-8 exit)

- [ ] App Hosting secrets pushed (`scripts/set-apphosting-secrets.ps1`)
- [ ] Deploy succeeds; `/api/health` OK on hosted URL
- [ ] Hosted `BANGUMI_REDIRECT_URI` + Bangumi callback updated
- [ ] Full M1→M2 path works on hosted URL

## Out of scope for M2 (E4+)

- Anitabi `/points/detail` galleries
- Walk/transit POI order, GPX / Google Maps export
- PWA / i18n / affiliates
