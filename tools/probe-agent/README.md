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

### 5. Smarter ID Seeding (Bangumi ranked)
* **The Pain Point**: Blind random IDs in `1–500000` waste Anitabi quota on titles with no pilgrimage maps.
* **The Solution**: Prefetch ranked anime subject IDs from Bangumi, then probe Anitabi only for:
  1. Hardcoded known seeds
  2. Bangumi ranked anime (`GET https://api.bgm.tv/v0/subjects?type=2&sort=rank`)
  3. Neighborhood expansion (`±N` around each seed/ranked ID)
* Bangumi calls use a fixed identifying UA (`antiable/probe-agent`). Anitabi calls keep polymorphic browser UAs.

---

## Usage

### Setup
```bash
cd tools/probe-agent
py -3 -m pip install aiohttp
```
Optional: fill `PROXY_POOL` in `probe_agent.py`. With an empty/only-`None` pool, the agent uses local egress at a slower pace.

### Common commands
```bash
# Default: Bangumi ranked (4×50) + seeds + ±3 neighborhood → Anitabi /lite
py -3 probe_agent.py

# Fetch ranked list only (no Anitabi traffic)
py -3 probe_agent.py --seeds-only --dump-seeds bangumi_ranked_ids.txt

# More ranked pages / wider neighborhood
py -3 probe_agent.py --pages 8 --neighborhood 5 --output valid_anitabi_ids.csv

# Local seeds only (skip Bangumi API)
py -3 probe_agent.py --no-bangumi

# Also include legacy 400000–400099 exploration band
py -3 probe_agent.py --exploration
```

Verified hits are written to `valid_anitabi_ids.csv` (or `--output`).

### CLI options

| Flag | Default | Description |
|---|---|---|
| `--pages` | `4` | Bangumi ranked pages to fetch (`page_size` each; default ≈ 200 anime) |
| `--page-size` | `50` | Bangumi page size (API max 50) |
| `--sort` | `rank` | Bangumi browse sort: `rank` or `date` |
| `--neighborhood` | `3` | Expand each seed/ranked ID by `±N` before probing |
| `--no-bangumi` | off | Skip Bangumi; use hardcoded seeds (+ neighborhood) only |
| `--exploration` | off | Also include IDs `400000–400099` |
| `--dump-seeds` | — | Write Bangumi ranked IDs to a text file (one ID per line) |
| `--seeds-only` | off | Build the candidate ID list and exit (no Anitabi requests) |
| `--output` | `valid_anitabi_ids.csv` | CSV path for Anitabi hits |

### Seed pipeline
1. Hardcoded pilgrimage seeds in `SEED_SUBJECT_IDS`
2. Bangumi ranked anime: `GET https://api.bgm.tv/v0/subjects?type=2&sort=rank`
3. Neighborhood expansion around the merged set
4. Anitabi lite probe: `GET https://api.anitabi.cn/bangumi/{id}/lite` (keep only `pointsLength > 0`)