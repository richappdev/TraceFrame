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

---

## 🛠️ 執行指南 (For Running Agent)
1. 配置你的 Python 環境，確保安裝 `aiohttp`。
2. 配置代理池（若無代理，腳本將回退至單一 IP 安全降頻模式）。
3. 執行 `probe_agent.py`，它將會把獲取的有效數據自動輸出為 `valid_anitabi_ids.csv`。