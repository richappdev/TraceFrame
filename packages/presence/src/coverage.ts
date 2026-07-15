import type { PresenceStore } from "./store";
import type { CoverageReport } from "./types";

export interface BuildCoverageOptions {
  bangumiTopIds: number[];
  topN?: number;
  cityLimit?: number;
}

/** Compare presence seed set against Bangumi ranked top-N for M0 coverage pack. */
export function buildCoverageReport(
  store: PresenceStore,
  options: BuildCoverageOptions,
): CoverageReport {
  const topN = options.topN ?? 200;
  const mappedIds = store.allSubjectIds();
  const topIds = options.bangumiTopIds.slice(0, topN);
  const topSet = new Set(topIds);

  const overlapIds = [...mappedIds].filter((id) => topSet.has(id)).sort((a, b) => a - b);
  const unmappedTopIds = topIds.filter((id) => !mappedIds.has(id));
  const mappedSeedIds = [...mappedIds].sort((a, b) => a - b);

  return {
    generatedAt: new Date().toISOString(),
    seedCount: mappedSeedIds.length,
    mappedSeedCount: mappedSeedIds.length,
    bangumiTopN: topN,
    bangumiTopFetched: options.bangumiTopIds.length,
    mappedInTopN: overlapIds.length,
    mappedPctOfTopN:
      topIds.length === 0 ? 0 : Math.round((overlapIds.length / topIds.length) * 1000) / 10,
    topCities: store.cityStats(options.cityLimit ?? 20),
    mappedSeedIds,
    unmappedTopIds,
    overlapIds,
  };
}

export function coverageReportToMarkdown(report: CoverageReport): string {
  const cityRows = report.topCities
    .map(
      (c, i) =>
        `| ${i + 1} | ${c.city} | ${c.titleCount} | ${c.totalPoints} | ${c.subjectIds.join(", ")} |`,
    )
    .join("\n");

  const overlap = report.overlapIds.join(", ") || "-";

  return [
    "# Coverage report — Antiable Trip",
    "",
    `Generated: \`${report.generatedAt}\``,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Presence seeds (pointsLength > 0) | ${report.mappedSeedCount} |`,
    `| Bangumi top-N requested | ${report.bangumiTopN} |`,
    `| Bangumi top IDs fetched | ${report.bangumiTopFetched} |`,
    `| Mapped within top-N | **${report.mappedInTopN}** (${report.mappedPctOfTopN}%) |`,
    `| Overlap IDs | ${overlap} |`,
    "",
    "## Top cities (by mapped title count)",
    "",
    "| # | City | Titles | Total points | Subject IDs |",
    "|---|---|---|---|---|",
    cityRows || "| - | - | - | - | - |",
    "",
    "## Seed subject IDs",
    "",
    "```",
    report.mappedSeedIds.join(", "),
    "```",
    "",
    "## Notes",
    "",
    "- Seed source: `valid-ids.csv` -> SQLite presence store",
    "- Overlap uses Bangumi ranked anime (`/v0/subjects?type=2&sort=rank`)",
    "- MVP stores presence metadata only; Anitabi detail POIs are fetched on demand later",
    "",
  ].join("\n");
}
