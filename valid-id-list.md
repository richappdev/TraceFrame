# Anitabi valid ID list

Living register of Bangumi subject IDs that returned **HTTP 200** from Anitabi’s lite (or detail) API.

Machine-readable source of truth: [`valid-ids.csv`](./valid-ids.csv)

## Validity rule

| Response | Meaning |
|---|---|
| `200` + JSON from `GET https://api.anitabi.cn/bangumi/{id}/lite` | **Valid** — append / update row |
| `404` | Not on Anitabi — do **not** add |
| `403` + Cloudflare HTML | Client blocked — **not** an ID verdict; do not change the list |

“Valid” means present on **Anitabi**, not merely present on Bangumi.

## Probe run rules

| # | Rule |
|---|---|
| 1 | **&lt; 100 requests / minute**, with **random gaps** between requests |
| 2 | Regression / collect window as requested (e.g. 3 min or 10 min) |
| 3 | Use smarter IDs (Bangumi ranked + seeds + neighborhood), not pure random |
| 4 | Log security signals (`403`/`429`, Cloudflare HTML, latency, `CF-RAY`) |
| 5 | **Change egress IP at least every 3 minutes** (new proxy exit, VPN hop, or fresh cloud runner). Do not keep hammering one blocked IP. |
| 6 | On Cloudflare challenge / sustained `403`, **stop that egress**, rotate IP, then continue |
| 7 | Save each run under `probe-testing/<yyyyMMdd-HHmmss>/` and merge valids into `valid-ids.csv` |

## After every probe run

1. Probe results live under `probe-testing/<yyyyMMdd-HHmmss>/`.
2. Open that run’s `anitabi-valid-ids.csv`.
3. For each valid `id`:
   - **New id** → append a row to `valid-ids.csv` (set `firstSeenAt` = `lastVerifiedAt` = probe time, `sourceRun` = folder name).
   - **Existing id** → update `lastVerifiedAt`, `pointsLength` / names if fresher, and set `sourceRun` to the latest run.
4. Keep `id` unique (one row per Bangumi subject id).
5. Do not invent rows from 403/blocked runs.
6. **Reconcile before shipping:** `npm run presence:reconcile` re-probes Anitabi `/lite`, cross-checks Bangumi `/v0/subjects/{id}` (anime only), rewrites titles/city/points from live APIs, and recovers mistitled IDs via Bangumi search. Then `npm run presence:import:replace` (reconcile already replaces the local DB).

### Suggested merge (PowerShell)

```powershell
$run = 'probe-testing\20260715-112622'   # change per run
$master = Import-Csv .\valid-ids.csv
$found = Import-Csv .\$run\anitabi-valid-ids.csv | Where-Object { $_.id }
$byId = @{}
foreach ($r in $master) { $byId[$r.id] = $r }
foreach ($r in $found) {
  if (-not $r.id) { continue }
  if ($byId.ContainsKey($r.id)) {
    $row = $byId[$r.id]
    $row.lastVerifiedAt = $r.probedAt
    $row.sourceRun = Split-Path $run -Leaf
    if ($r.cn) { $row.cn = $r.cn }
    if ($r.title) { $row.title = $r.title }
    if ($r.city) { $row.city = $r.city }
    if ($r.pointsLength) { $row.pointsLength = $r.pointsLength }
    $row.httpStatus = $r.httpStatus
  } else {
    $byId[$r.id] = [pscustomobject]@{
      id = $r.id; cn = $r.cn; title = $r.title; city = $r.city
      pointsLength = $r.pointsLength
      firstSeenAt = $r.probedAt; lastVerifiedAt = $r.probedAt
      sourceRun = (Split-Path $run -Leaf); httpStatus = $r.httpStatus; notes = ''
    }
  }
}
$byId.Values | Sort-Object { [int]$_.id } | Export-Csv .\valid-ids.csv -NoTypeInformation -Encoding UTF8
```

## Current inventory

See [`valid-ids.csv`](./valid-ids.csv). Snapshot (**15** IDs, updated 2026-07-15):

| id | cn | title | city | points | images | node |
|---|---|---|---|---|---|---|
| 428735 | BanG Dream! It's MyGO!!!!! | BanG Dream! It's MyGO!!!!! | 東京都丰岛区 | 190 | 190 | Node_A_Tokyo |
| 115908 | 吹响吧！上低音号 | 響け！ユーフォニアム | 宇治市 | 388 | 388 | Node_A_Tokyo |
| 364450 | 孤独摇滚！ | ぼっち・ざ・ろっく！ | 世田谷区 | 220 | 220 | Node_A_Tokyo |
| 244243 | 摇曳露营△ | ゆるキャン△ | 山梨县 | 496 | 496 | Node_B_Osaka |
| 265 | 轻音少女 | けいおん！ | 丰乡町 | 290 | 290 | Node_B_Osaka |
| 374410 | 莉可丽丝 | Lycoris Recoil | 墨田区 | 145 | 145 | Node_B_Osaka |
| 126461 | 增产少女/白箱 | SHIROBAKO | 武藏野市 | 110 | 105 | Node_B_Osaka |
| 411364 | GIRLS BAND CRY | ガールズバンドクライ | 川崎市 | 152 | 152 | Node_C_Seoul |
| 237176 | 青春猪头少年不会梦到兔女郎学姐 | 青春ブタ野郎はバニーガール先輩の夢を見ない | 藤泽市 | 114 | 109 | Node_C_Seoul |
| 347432 | 恋上换装娃娃 | その着せ替え人形は恋をする | 埼玉县 | 65 | 63 | Node_C_Seoul |
| 383344 | 别当哥哥了！ | お兄ちゃんはおしまい！ | 笹塚/東京都 | 57 | 54 | Node_C_Seoul |
| 258611 | 天气之子 | 天気の子 | 東京都 | 84 | 81 | Node_D_Singapore |
| 322234 | 恋语轻策 | ささやくように恋を唄う | 冈山县 | 32 | 32 | Node_D_Singapore |
| 5424 | 花开伊吕波 | 花咲くいろは | 金泽市 | 48 | 46 | Node_D_Singapore |
| 240562 | 来自多彩世界的明天 | 色づく世界の明日から | 长崎市 | 112 | 112 | Node_D_Singapore |

## Probe runs merged so far

| Run folder / source | Valid found | Merged into list? |
|---|---|---|
| `probe-testing/20260715-112622` (Run A/B) | 0 (404s / CF 403s) | N/A |
| `manual-update-20260715` (multi-node report) | **15** | Yes — replaced inventory |

## Related

- Probe artifacts: `probe-testing/`
- API docs: https://navi.anitabi.cn/docs/api/
- Notion note: [API ID probe — mindset & results](https://app.notion.com/p/39ea4181b6288188904dcdb299557ace)
