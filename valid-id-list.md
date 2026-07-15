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

## After every probe run

1. Probe results live under `probe-testing/<yyyyMMdd-HHmmss>/`.
2. Open that run’s `anitabi-valid-ids.csv`.
3. For each valid `id`:
   - **New id** → append a row to `valid-ids.csv` (set `firstSeenAt` = `lastVerifiedAt` = probe time, `sourceRun` = folder name).
   - **Existing id** → update `lastVerifiedAt`, `pointsLength` / names if fresher, and set `sourceRun` to the latest run.
4. Keep `id` unique (one row per Bangumi subject id).
5. Do not invent rows from 403/blocked runs.

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

See [`valid-ids.csv`](./valid-ids.csv). Snapshot:

| id | title / cn | city | points | first seen | source |
|---|---|---|---|---|---|
| 115908 | 響け！ユーフォニアム / 吹响吧！上低音号 | 宇治市 | 577 | 2026-07-15 | manual-smoke-20260715 |
| 126461 | *(lite meta pending; detail OK)* | | 53* | 2026-07-15 | manual-smoke-20260715 |

\* `pointsLength` for `126461` counted from an earlier `/points/detail` payload (~53 points), not a fresh `/lite` read.

## Probe runs merged so far

| Run folder | Valid found | Merged into list? |
|---|---|---|
| `probe-testing/20260715-112622` (Run A random + Run B smarter artifacts) | 0 (A: all 404; B: all Cloudflare 403) | N/A — nothing to add |

## Related

- Probe artifacts: `probe-testing/`
- API docs: https://navi.anitabi.cn/docs/api/
- Notion note: [API ID probe — mindset & results](https://app.notion.com/p/39ea4181b6288188904dcdb299557ace)
