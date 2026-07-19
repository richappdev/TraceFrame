# AniTabi 有界 Presence 驗證工具

此工具只用 Anitabi 輕量 `/lite` 端點，驗證一組有上限的 Bangumi subject ID。它是保留給受控更新的歷史研究工具，不是爬蟲或大量列舉工具。

## 強制操作規則

1. 只使用 canonical seeds 與有上限的 Bangumi 排名候選集。
2. 逐筆發送請求，間隔隨機 1.5–3 秒，並使用固定且可識別的 `User-Agent`。
3. 第一次遇到 HTTP 403、HTTP 429、Cloudflare 頁面或 HTML challenge 時，立即停止整個 run。
4. 禁止輪替 proxy、切換出口、偽裝瀏覽器身分，或被阻擋後自動續跑。
5. 快取結果；任何命中在寫入 `valid-ids.csv` 前，都必須再與 Bangumi 對帳。
6. 若需要大量資料，優先取得書面合作或 bulk-data 機制。

## API 與判定規則

```text
GET https://api.anitabi.cn/bangumi/{subjectID}/lite
```

- `200` JSON 且 `pointsLength > 0`：候選作品有 Anitabi presence。
- `404`：候選不存在。
- `403`、`429` 或 HTML challenge：停止整個 run；不可當成 ID 判定。

## 使用方式

```bash
cd tools/probe-agent
py -3 -m pip install aiohttp

# canonical seeds + 最多 200 筆 Bangumi 排名動畫，總候選上限 250。
py -3 probe_agent.py

# 只驗證 14 筆 canonical reconciled seeds。
py -3 probe_agent.py --no-bangumi

# 只建立候選清單，不呼叫 Anitabi。
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt

# 使用更小的硬上限。
py -3 probe_agent.py --max-candidates 50 --output valid_anitabi_ids.csv
```

遇到 anti-abuse response 時，程序會寫出已完成的部分結果並以狀態碼 `2` 結束。中斷的 run 必須人工檢查，不可自動合併。

## CLI 參數

| 參數 | 預設 | 說明 |
|---|---:|---|
| `--pages` | `4` | 取得 Bangumi 排名頁數，每頁最多 50 筆 |
| `--page-size` | `50` | Bangumi 每頁筆數 |
| `--sort` | `rank` | Bangumi 排序：`rank` 或 `date` |
| `--no-bangumi` | 關閉 | 只驗證 canonical local seeds |
| `--max-candidates` | `250` | 候選硬上限；最大允許值為 500 |
| `--dump-seeds` | — | 輸出 Bangumi 排名 ID 供人工檢查 |
| `--seeds-only` | 關閉 | 只建立候選，不呼叫 Anitabi |
| `--output` | `valid_anitabi_ids.csv` | 已驗證命中的 CSV 輸出 |

成功完成後，依 [`../../valid-id-list.md`](../../valid-id-list.md) 的 reconciliation 流程處理。全專案以 [`../../docs/data-rights-matrix.md`](../../docs/data-rights-matrix.md) 的資料政策為準。
