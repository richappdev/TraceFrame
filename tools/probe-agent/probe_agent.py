#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bounded Anitabi /lite presence verifier.

The verifier uses a fixed identifying client, probes sequentially, and stops the
entire run on the first anti-abuse response. It must not be used for broad
enumeration or with rotating egress.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import random
from pathlib import Path
from typing import List, Sequence, Set

import aiohttp

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# === Safety / rate config (align with valid-id-list.md) ===
PROBE_DELAY_MIN = 1.5
PROBE_DELAY_MAX = 3.0
DEFAULT_MAX_CANDIDATES = 250

BANGUMI_API = "https://api.bgm.tv"
BANGUMI_UA = "antiable/probe-agent"
ANITABI_UA = "antiable/probe-agent"
SUBJECT_TYPE_ANIME = 2
BANGUMI_PAGE_SIZE = 50  # API max

# Canonical reconciled registry from valid-ids.csv (2026-07-18).
SEED_SUBJECT_IDS = [
    1424, 22759, 110467, 115908, 207195, 240038, 240562,
    269235, 328609, 333158, 364450, 378862, 428735, 431767,
]


class ProbeHalted(RuntimeError):
    """The upstream requested that the entire verification run stop."""


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
    max_candidates: int,
) -> List[int]:
    """Merge canonical seeds and ranked candidates, preserving order and a hard cap."""
    ids = [
        sid
        for sid in dict.fromkeys([*seed_ids, *bangumi_ids])
        if isinstance(sid, int) and sid > 0
    ][:max_candidates]
    logging.info(
        "Bounded candidate list built: seeds=%s bangumi=%s cap=%s -> %s ids",
        len(seed_ids),
        len(bangumi_ids),
        max_candidates,
        len(ids),
    )
    return ids


class AniTabiProbeAgent:
    def __init__(self, ids_to_probe: Sequence[int], output_csv: Path):
        self.ids = list(ids_to_probe)
        self.valid_results = []
        self.output_csv = output_csv

    async def probe_id(self, session: aiohttp.ClientSession, subject_id: int):
        await asyncio.sleep(random.uniform(PROBE_DELAY_MIN, PROBE_DELAY_MAX))
        url = f"https://api.anitabi.cn/bangumi/{subject_id}/lite"
        headers = {
            "User-Agent": ANITABI_UA,
            "Accept": "application/json",
        }

        try:
            async with session.get(url, headers=headers, timeout=10) as response:
                content_type = response.headers.get("Content-Type", "").lower()
                if response.status in (403, 429):
                    body = (await response.text())[:200]
                    raise ProbeHalted(
                        f"upstream anti-abuse response status={response.status} "
                        f"id={subject_id} body={body!r}"
                    )
                if response.status != 200:
                    return None
                if "json" not in content_type:
                    body = (await response.text())[:200]
                    if "<html" in body.lower() or "cloudflare" in body.lower() or "challenge" in body.lower():
                        raise ProbeHalted(
                            f"upstream challenge response id={subject_id} body={body!r}"
                        )
                    logging.warning(
                        "Unexpected non-JSON response id=%s content-type=%s",
                        subject_id,
                        content_type,
                    )
                    return None

                data = await response.json()
                points_len = data.get("pointsLength", 0)
                if points_len <= 0:
                    return None
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
        except ProbeHalted:
            raise
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            logging.warning("Probe request failed id=%s: %s", subject_id, exc)
            return None

    async def run(self):
        logging.info("AniTabi probe starting. targets=%s", len(self.ids))
        try:
            async with aiohttp.ClientSession() as session:
                for sid in self.ids:
                    result = await self.probe_id(session, sid)
                    if result is not None:
                        self.valid_results.append(result)
        except ProbeHalted:
            self.save_to_csv()
            raise
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
        max_candidates=args.max_candidates,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify a bounded Anitabi /lite candidate set and stop on anti-abuse responses."
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
        "--no-bangumi",
        action="store_true",
        help="Skip Bangumi API; verify only the canonical SEED_SUBJECT_IDS",
    )
    parser.add_argument(
        "--max-candidates",
        type=lambda value: max(1, min(int(value), 500)),
        default=DEFAULT_MAX_CANDIDATES,
        help=f"Hard cap for the candidate set (default {DEFAULT_MAX_CANDIDATES}, max 500)",
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
    try:
        await agent.run()
    except ProbeHalted as exc:
        logging.error("Entire probe run stopped: %s", exc)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    asyncio.run(amain())
