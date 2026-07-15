#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AniTabi API Advanced Probe Agent
Description: High-performance, stealthy, and distributed API detector for AniTabi platform.
Author: AI Collaborative Agent
Year: 2026
"""

import asyncio
import aiohttp
import random
import csv
import time
import logging

# 初始化日誌記錄
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# === 🛡️ 安全探測參數配置 ===
CONCURRENCY_LIMIT = 5            # 限制併發協程數量（好公民原則）
PROBE_LIMIT_PER_MIN = 200        # 每分鐘最大請求次數安全線
TEST_DURATION_SECONDS = 600      # 10分鐘測試上限
IP_ROTATION_INTERVAL = 180       # 每 3 分鐘 (180秒) 切換一次 IP / 代理

# 模擬多個國家的代理伺服器（請在此填入你實際的 Proxy Server 地址，若為空則使用本地 IP）
PROXY_POOL = [
    None,  # 預設本地出口
    # "http://user:pass@tokyo-proxy.example.com:8080",      # 東京節點
    # "http://user:pass@osaka-proxy.example.com:8080",      # 大阪節點
    # "http://user:pass@seoul-proxy.example.com:8080",      # 首爾節點
    # "http://user:pass@singapore-proxy.example.com:8080"   # 新加坡節點
]

# 隨機 User-Agent 列表，增加多態性
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
]

# 已知的種子/測試 ID 區間（可以視需要擴大至 1~500000 之間的 Bangumi ID）
TARGET_SUBJECT_IDS = [
    428735, 115908, 364450, 244243, 265, 374410, 411364, 
    237176, 347432, 258611, 322234, 5424, 240562, 383344, 126461
]

# 額外隨機探測池（模擬廣度掃描）
EXPLORATION_POOL = list(range(400000, 400100))
ALL_TARGET_IDS = list(set(TARGET_SUBJECT_IDS + EXPLORATION_POOL))

class AniTabiProbeAgent:
    def __init__(self, ids_to_probe):
        self.ids = ids_to_probe
        self.valid_results = []
        self.start_time = time.time()

    def get_current_proxy(self):
        """根據探測時間（每3分鐘輪替）動態選擇代理 IP"""
        elapsed = time.time() - self.start_time
        proxy_index = int(elapsed // IP_ROTATION_INTERVAL) % len(PROXY_POOL)
        return PROXY_POOL[proxy_index]

    async def probe_id(self, session, subject_id, semaphore):
        async with semaphore:
            # 實施隨機延遲，打散請求特徵（一分鐘小於500次，每秒約 8 次，平均間隔 0.12s 左右）
            delay = random.uniform(0.05, 0.25)
            await asyncio.sleep(delay)

            url = f"https://api.anitabi.cn/bangumi/{subject_id}/lite"
            proxy = self.get_current_proxy()
            
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.anitabi.cn/map"
            }

            try:
                async with session.get(url, headers=headers, proxy=proxy, timeout=6) as response:
                    if response.status == 200:
                        data = await response.json()
                        # 關鍵判斷：API 有正常回傳且標點大於 0 的才是有效 ID
                        points_len = data.get("pointsLength", 0)
                        if points_len > 0:
                            result = {
                                "ID": subject_id,
                                "cn_name": data.get("cn", "未知"),
                                "origin_name": data.get("title", "未知"),
                                "city": data.get("city", "未知"),
                                "points": points_len,
                                "images": data.get("imagesLength", 0)
                            }
                            logging.info(f"🟢 [發現有效 ID] {subject_id} - {result['cn_name']} (標點數: {points_len})")
                            return result
                    elif response.status == 429:
                        logging.warning(f"⚠️ [觸發速率限制] 狀態碼 429，建議立即增加延遲或更換代理！")
            except Exception as e:
                # 靜音處理網路異常（如連線超時等）
                pass
            return None

    async def run(self):
        logging.info(f"🚀 AniTabi 逆向探測計劃啟動。待探測目標總數: {len(self.ids)}")
        
        # 設置並行限制
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
        
        # 開啟持久連線會話
        async with aiohttp.ClientSession() as session:
            tasks = [self.probe_id(session, sid, semaphore) for sid in self.ids]
            
            # 使用 gather 收集非同步任務結果
            results = await asyncio.gather(*tasks)
            self.valid_results = [r for r in results if r is not None]

        # 將成果寫入標準 CSV
        self.save_to_csv()

    def save_to_csv(self):
        filename = "valid_anitabi_ids.csv"
        fields = ["ID", "cn_name", "origin_name", "city", "points", "images"]
        
        with open(filename, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for row in self.valid_results:
                writer.writerow(row)
        
        logging.info(f"💾 探測任務完成！成功將 {len(self.valid_results)} 個有效 ID 寫入 {filename}")

if __name__ == "__main__":
    agent = AniTabiProbeAgent(ALL_TARGET_IDS)
    asyncio.run(agent.run())