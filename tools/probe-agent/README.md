# AniTabi API Probe Agent Reference

This document defines the technical logic, bypass WAF strategies, and dynamic IP rotation architecture designed for large-scale, high-security, and anti-blocking reverse probing of the anime pilgrimage map platform `anitabi.cn`. It serves as a structural reference for AI agents to understand the architecture and execute the code safely.

---

## 🎯 Probing Objective
The objective is to scan and filter out valid animation IDs (based on Bangumi Subject IDs) that actually contain pilgrimage landmark data. This must be accomplished without degrading the target website's usability or triggering security Web Application Firewalls (WAFs) such as Tencent EdgeOne or Cloudflare.

---

## 🧠 Core Mindset & Strategies

### 1. Lightweight Probing (Lite Detection)
* **The Pain Point**: The detailed data endpoint (`/points/detail`) contains a massive volume of high-resolution screenshot comparison images. High-frequency requests to this endpoint will drain server bandwidth and easily get flagged by WAFs.
* **The Solution**: Utilize the extremely lightweight `lite` summary endpoint:
  `GET https://api.anitabi.cn/bangumi/{subjectID}/lite`
* **Filtering Logic**:
  The server may return a `200 OK` status even for uninitialized or empty map IDs. The probing agent must parse the JSON payload and verify that the `pointsLength` field is strictly greater than `0`.

### 2. Microsecond-Level Randomization (Micro-Randomization)
* **The Pain Point**: Fixed-interval or fixed-frequency requests (e.g., exactly one request every 0.5 seconds) are easily blocked by the statistical pattern detection algorithms of modern WAFs.
* **The Solution**: Use a uniform distribution (`random.uniform`) to completely fragment the time interval between each request, introducing micro-delays that mimic human browsing behavior.

### 3. Dynamic IP Rotation (Proxy Rotation)
* **The Pain Point**: WAFs track request thresholds within sliding time windows (e.g., a limit of 500 requests per minute from a single IP address).
* **The Solution**: Force a switch of the egress proxy server every 3 minutes. This allows the script to discard the accumulated request counter before it approaches the WAF's "greylist" or "block" threshold, simulating multiple independent global users accessing the map at the same time.

### 4. HTTP Header Polymorphism
* **The Solution**: For every single request, randomly rotate the `User-Agent` and `Accept-Encoding` header configurations to eliminate automated script fingerprints and make requests appear as native browser sessions.

---

## 🛠️ Execution Guide (For Running Agents)
1. Configure your Python environment and ensure that the `aiohttp` library is installed.
2. Configure your proxy pool inside the script. *(Note: If no proxy is provided, the script will automatically fall back to a safe, low-frequency, single-IP scanning mode).*
3. From this folder, run:
   `python probe_agent.py`
   Verified IDs are written to `valid_anitabi_ids.csv` in the current working directory.