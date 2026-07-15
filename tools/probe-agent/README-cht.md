# AniTabi API Probe Agent Reference

本文件定義了針對動漫巡禮地圖平台 `anitabi.cn` 進行大規模、高安全性、防封鎖逆向探測的技術邏輯與策略，供 AI Agent 進行架構理解與代碼調用。

## 🎯 探測目標
在不破壞目標網站可用性、不觸發安全 WAF（如騰訊 EdgeOne 或 Cloudflare）防護的前提下，批次偵測並過濾出「真正含有聖地巡禮地標」的有效動畫 ID（基於 Bangumi Subject ID）。

---

## 🧠 核心探測思維 (Core Mindset)

### 1. 輕量化探測 (Lite Detection)
* **痛點**：詳細數據端點（`/points/detail`）含有大量高解析度比對圖片連結，高頻請求會耗盡伺服器頻寬，且容易被防火牆標記。
* **解法**：使用設計極度輕量化的 `lite` 概要端點：
  `GET https://api.anitabi.cn/bangumi/{subjectID}/lite`
* **過濾邏輯**：
  伺服器可能針對未初始化或空地圖的作品回傳 `200 OK`。Agent 必須解析 JSON Payload，確認其中的 `pointsLength` 是否大於 `0`。

### 2. 微秒級隨機離散 (Micro-Randomization)
* **痛點**：定時、定頻的請求（例如精準的每 0.5 秒一次）會輕易被 WAF 的統計特徵阻斷。
* **解法**：使用高斯分佈或均勻分佈（`random.uniform`）將每個請求的時間間隔完全打碎。

### 3. 動態 IP 輪替 (Proxy Rotation)
* **痛點**：WAF 會在滑動窗口（Sliding Window）內計算單一 IP 的請求上限（例如單一 IP 每分鐘 500 次）。
* **解法**：每 3 分鐘強制切換出口代理伺服器。這在防禦計數器逼近臨界點前「金蟬脫殼」，在伺服器端模擬多個異地用戶同時存取的行為。

### 4. HTTP 標頭多態性 (Header Polymorphism)
* **解法**：每一次請求都隨機抽換不同的 `User-Agent` 與 `Accept-Encoding` 組合，隱蔽自動化腳本特徵。

### 5. 智慧種子 ID（Bangumi 排名）
* **痛點**：在 `1–500000` 盲掃會浪費 Anitabi 配額在沒有巡禮地圖的作品上。
* **解法**：先從 Bangumi 拉取動畫排名條目，再只對下列 ID 探測 Anitabi：
  1. 內建已知種子
  2. Bangumi 動畫排名（`GET https://api.bgm.tv/v0/subjects?type=2&sort=rank`）
  3. 鄰域擴展（每個種子／排名 ID 的 `±N`）
* Bangumi 請求使用固定識別 UA（`antiable/probe-agent`）；Anitabi 仍使用多態瀏覽器 UA。

---

## 使用方式 (Usage)

### 環境準備
```bash
cd tools/probe-agent
py -3 -m pip install aiohttp
```
可選：在 `probe_agent.py` 填入 `PROXY_POOL`。若池為空／僅 `None`，則使用本機出口並以降頻模式執行。

### 常用指令
```bash
# 預設：Bangumi 排名（4×50）+ 種子 + ±3 鄰域 → Anitabi /lite
py -3 probe_agent.py

# 只拉排名 ID（不打 Anitabi）
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt

# 更多排名頁／更寬鄰域
py -3 probe_agent.py --pages 8 --neighborhood 5 --output valid_anitabi_ids.csv

# 僅本地種子（不打 Bangumi）
py -3 probe_agent.py --no-bangumi

# 額外包含舊版探索區間 400000–400099
py -3 probe_agent.py --exploration
```

有效結果寫入 `valid_anitabi_ids.csv`（或 `--output`）。

### CLI 參數

| 參數 | 預設 | 說明 |
|---|---|---|
| `--pages` | `4` | 拉取 Bangumi 排名頁數（每頁 `page_size`；預設約 200 部動畫） |
| `--page-size` | `50` | Bangumi 每頁筆數（API 上限 50） |
| `--sort` | `rank` | Bangumi 排序：`rank` 或 `date` |
| `--neighborhood` | `3` | 每個種子／排名 ID 擴展 `±N` 後再探測 |
| `--no-bangumi` | 關閉 | 跳過 Bangumi；只用內建種子（+ 鄰域） |
| `--exploration` | 關閉 | 額外加入 `400000–400099` |
| `--dump-seeds` | — | 將 Bangumi 排名 ID 寫入文字檔（一行一個） |
| `--seeds-only` | 關閉 | 只建立候選 ID 列表後結束（不請求 Anitabi） |
| `--output` | `valid_anitabi_ids.csv` | Anitabi 命中結果 CSV 路徑 |

### 種子流程
1. `SEED_SUBJECT_IDS` 內建巡禮種子
2. Bangumi 動畫排名：`GET https://api.bgm.tv/v0/subjects?type=2&sort=rank`
3. 對合併集合做鄰域擴展
4. Anitabi lite 探測：`GET https://api.anitabi.cn/bangumi/{id}/lite`（僅保留 `pointsLength > 0`）