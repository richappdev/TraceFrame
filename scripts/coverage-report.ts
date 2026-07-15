#!/usr/bin/env tsx
/**
 * M0 coverage pack: Bangumi top-N overlap × cities from presence store.
 * Set SKIP_NETWORK=1 to report seed/city stats only (no Bangumi fetch).
 */
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BangumiClient, defaultBangumiUserAgent } from "@antiable/bangumi";
import {
  PresenceStore,
  buildCoverageReport,
  coverageReportToMarkdown,
} from "@antiable/presence";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.PRESENCE_DB ?? path.join(root, "data", "presence.sqlite");
const outDir = process.env.REPORT_DIR ?? path.join(root, "reports");
const topN = Number(process.env.TOP_N ?? 200);

async function main() {
  const store = new PresenceStore(dbPath);
  if (store.count() === 0) {
    console.error("Presence store empty. Run: npm run presence:import");
    process.exitCode = 1;
    store.close();
    return;
  }

  let bangumiTopIds: number[] = [];
  if (process.env.SKIP_NETWORK === "1") {
    console.warn("SKIP_NETWORK=1 — Bangumi overlap section will be empty.");
  } else {
    const bangumi = new BangumiClient({
      userAgent: defaultBangumiUserAgent(),
    });
    const pages = Math.ceil(topN / 50);
    bangumiTopIds = await bangumi.fetchRankedIds({ pages, pageSize: 50 });
  }

  const report = buildCoverageReport(store, { bangumiTopIds, topN });
  mkdirSync(outDir, { recursive: true });
  const stamp = report.generatedAt.slice(0, 10);
  const jsonPath = path.join(outDir, `coverage-${stamp}.json`);
  const mdPath = path.join(outDir, `coverage-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, coverageReportToMarkdown(report), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        jsonPath,
        mdPath,
        mappedSeedCount: report.mappedSeedCount,
        mappedInTopN: report.mappedInTopN,
        mappedPctOfTopN: report.mappedPctOfTopN,
        topCities: report.topCities.slice(0, 5).map((c) => c.city),
      },
      null,
      2,
    ),
  );
  store.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
