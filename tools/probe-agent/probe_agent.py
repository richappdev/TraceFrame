#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AniTabi API Advanced Probe Agent
Description: High-performance, stealthy, and distributed API detector for AniTabi platform.
Seeds candidate Bangumi subject IDs from Bangumi ranked anime + local seeds + neighborhood.
Author: AI Collaborative Agent
Year: 2026
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import random
import time
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Set

import aiohttp

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# === Safety / rate config (align with valid-id-list.md: < 100 req/min) ===
CONCURRENCY_LIMIT = 3
PROBE_DELAY_MIN = 0.4
PROBE_DELAY_MAX = 1.2
IP_ROTATION_INTERVAL = 180

BANGUMI_API = "https://api.bgm.tv"
BANGUMI_UA = "antiable/probe-agent"
SUBJECT_TYPE_ANIME = 2
BANGUMI_PAGE_SIZE = 50  # API max

PROXY_POOL = [
    None,  # local egress by default
    # "http://user:pass@tokyo-proxy.example.com:8080",
]

# Browser-like UAs for Anitabi (header polymorphism against WAF)
ANITABI_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
]

# Known pilgrimage titles (stable seeds)
SEED_SUBJECT_IDS = [
    428735, 115908, 364450, 244243, 265, 374410, 411364,
    237176, 347432, 258611, 322234, 5424, 240562, 383344, 126461,
]


def expand_neighborhood(ids: Iterable[int], radius: int) -> List[int]:
    """Expand each ID by ±radius (inclusive) for local Bangumi ID scanning."""
    if radius <= 0:
        return sorted(set(int(i) for i in ids if int(i) > 0))
    out: Set[int] = set()
    for sid in ids:
        sid = int(sid)
        for offset in range(-radius, radius + 1):
            candidate = sid + offset
            if candidate > 0:
                out.add(candidate)
    return sorted(out)


async def fetch_bangumi_ranked_ids(
    session: aiohttp.ClientSession,
    pages: int = 4,
    page_size: int = BANGUMI_PAGE_SIZE,
    sort: str = "rank",
) -> List[int]:
    """
    Pull ranked anime subject IDs from Bangumi browse API.
    GET /v0/subjects?type=2&sort=rank&limit=&offset=
    """
    page_size = max(1, min(page_size, BANGUMI_PAGE_SIZE))
    headers = {
        "User-Agent": BANGUMI_UA,
        "Accept": "application/json",
    }
    ids: List[int] = []
    seen: Set[int] = set()

    for page in range(pages):
        offset = page * page_size
        params = {
            "type": SUBJECT_TYPE_ANIME,
            "sort": sort,
            "limit": page_size,
            "offset": offset,
        }
        url = f"{BANGUMI_API}/v0/subjects"
        try:
            async with session.get(url, headers=headers, params=params, timeout=20) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logging.warning(
                        "Bangumi ranked fetch failed page=%s status=%s body=%s",
                        page,
                        resp.status,
                        body[:200],
                    )
                    break
                payload = await resp.json()
        except Exception as exc:
            logging.warning("Bangumi ranked fetch error page=%s: %s", page, exc)
            break

        data = payload.get("data") or []
        if not data:
            logging.info("Bangumi ranked: empty page at offset=%s, stopping", offset)
            break

        for item in data:
            sid = item.get("id")
            if sid is None:
                continue
            sid = int(sid)
            if sid not in seen:
                seen.add(sid)
                ids.append(sid)

        total = payload.get("total")
        logging.info(
            "Bangumi ranked page %s/%s: +%s ids (have %s%s)",
            page + 1,
            pages,
            len(data),
            len(ids),
            f", total={total}" if total is not None else "",
        )
        # Be polite between Bangumi pages
        await asyncio.sleep(random.uniform(0.3, 0.8))

    logging.info("Bangumi ranked seed total: %s anime IDs", len(ids))
    return ids


def build_probe_id_list(
    bangumi_ids: Sequence[int],
    seed_ids: Sequence[int],
    neighborhood: int,
    include_exploration: bool,
    exploration_start: int = 400000,
    exploration_count: int = 100,
) -> List[int]:
    """Merge Bangumi ranked + seeds, then expand neighborhood (+ optional random band)."""
    base = list(dict.fromkeys([*seed_ids, *bangumi_ids]))  # preserve order, unique
    ids = expand_neighborhood(base, neighborhood)
    if include_exploration:
        band = list(range(exploration_start, exploration_start + exploration_count))
        ids = sorted(set(ids).union(band))
    logging.info(
        "Probe ID list built: seeds=%s bangumi=%s neighborhood=%s exploration=%s -> %s ids",
        len(seed_ids),
        len(bangumi_ids),
        neighborhood,
        include_exploration,
        len(ids),
    )
    return ids


class AniTabiProbeAgent:
    def __init__(self, ids_to_probe: Sequence[int], output_csv: Path):
        self.ids = list(ids_to_probe)
        self.valid_results = []
        self.start_time = time.time()
        self.output_csv = output_csv

    def get_current_proxy(self) -> Optional[str]:
        elapsed = time.time() - self.start_time
        proxy_index = int(elapsed // IP_ROTATION_INTERVAL) % len(PROXY_POOL)
        return PROXY_POOL[proxy_index]

    async def probe_id(self, session: aiohttp.ClientSession, subject_id: int, semaphore: asyncio.Semaphore):
        async with semaphore:
            await asyncio.sleep(random.uniform(PROBE_DELAY_MIN, PROBE_DELAY_MAX))

            url = f"https://api.anitabi.cn/bangumi/{subject_id}/lite"
            proxy = self.get_current_proxy()
            headers = {
                "User-Agent": random.choice(ANITABI_USER_AGENTS),
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.anitabi.cn/map",
            }

            try:
                async with session.get(url, headers=headers, proxy=proxy, timeout=6) as response:
                    if response.status == 200:
                        data = await response.json()
                        points_len = data.get("pointsLength", 0)
                        if points_len > 0:
                            result = {
                                "ID": subject_id,
                                "cn_name": data.get("cn", "未知"),
                                "origin_name": data.get("title", "未知"),
                                "city": data.get("city", "未知"),
                                "points": points_len,
                                "images": data.get("imagesLength", 0),
                            }
                            logging.info(
                                "🟢 [valid] %s - %s (points: %s)",
                                subject_id,
                                result["cn_name"],
                                points_len,
                            )
                            return result
                    elif response.status == 429:
                        logging.warning("⚠️ rate limited (429) — slow down or rotate proxy")
                    elif response.status == 403:
                        logging.warning("⚠️ blocked (403) on id=%s — rotate egress", subject_id)
            except Exception:
                pass
            return None

    async def run(self):
        logging.info("AniTabi probe starting. targets=%s", len(self.ids))
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
        async with aiohttp.ClientSession() as session:
            tasks = [self.probe_id(session, sid, semaphore) for sid in self.ids]
            results = await asyncio.gather(*tasks)
            self.valid_results = [r for r in results if r is not None]
        self.save_to_csv()

    def save_to_csv(self):
        fields = ["ID", "cn_name", "origin_name", "city", "points", "images"]
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
        with self.output_csv.open(mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for row in self.valid_results:
                writer.writerow(row)
        logging.info(
            "Done. wrote %s valid IDs -> %s",
            len(self.valid_results),
            self.output_csv,
        )


async def collect_seed_ids(args: argparse.Namespace) -> List[int]:
    bangumi_ids: List[int] = []
    if not args.no_bangumi:
        async with aiohttp.ClientSession() as session:
            bangumi_ids = await fetch_bangumi_ranked_ids(
                session,
                pages=args.pages,
                page_size=args.page_size,
                sort=args.sort,
            )
            if args.dump_seeds:
                dump_path = Path(args.dump_seeds)
                dump_path.write_text(
                    "\n".join(str(i) for i in bangumi_ids) + ("\n" if bangumi_ids else ""),
                    encoding="utf-8",
                )
                logging.info("Wrote Bangumi ranked IDs -> %s", dump_path)

    return build_probe_id_list(
        bangumi_ids=bangumi_ids,
        seed_ids=SEED_SUBJECT_IDS,
        neighborhood=args.neighborhood,
        include_exploration=args.exploration,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Probe Anitabi /lite using Bangumi ranked anime IDs + seeds + neighborhood."
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=4,
        help="Bangumi ranked pages to fetch (page_size each, default 4 → up to 200 anime)",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=BANGUMI_PAGE_SIZE,
        help=f"Bangumi page size (max {BANGUMI_PAGE_SIZE})",
    )
    parser.add_argument(
        "--sort",
        choices=("rank", "date"),
        default="rank",
        help="Bangumi browse sort (default: rank)",
    )
    parser.add_argument(
        "--neighborhood",
        type=int,
        default=3,
        help="Expand each seed/ranked ID by ±N for local probing (default: 3)",
    )
    parser.add_argument(
        "--no-bangumi",
        action="store_true",
        help="Skip Bangumi API; use SEED_SUBJECT_IDS (+ neighborhood) only",
    )
    parser.add_argument(
        "--exploration",
        action="store_true",
        help="Also include the legacy 400000–400099 exploration band",
    )
    parser.add_argument(
        "--dump-seeds",
        type=str,
        default="",
        help="Optional path to write Bangumi ranked IDs (one per line)",
    )
    parser.add_argument(
        "--seeds-only",
        action="store_true",
        help="Fetch/build ID list and exit without probing Anitabi",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="valid_anitabi_ids.csv",
        help="CSV path for Anitabi hits (default: valid_anitabi_ids.csv)",
    )
    return parser.parse_args()


async def amain() -> None:
    args = parse_args()
    ids = await collect_seed_ids(args)
    if args.seeds_only:
        logging.info("seeds-only: %s candidate IDs ready (no Anitabi probe)", len(ids))
        print(f"candidates={len(ids)}")
        return
    agent = AniTabiProbeAgent(ids, Path(args.output))
    await agent.run()


if __name__ == "__main__":
    asyncio.run(amain())
