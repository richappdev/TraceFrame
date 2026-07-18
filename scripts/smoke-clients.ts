#!/usr/bin/env tsx
/**
 * CI-safe smoke: Bangumi ranked page 1 + Anitabi /lite for one seed ID.
 * If Anitabi returns WAF 403/429, fall back to presence-store seed check.
 * Set SKIP_NETWORK=1 to skip live calls.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BangumiClient, defaultBangumiUserAgent } from "@antiable/bangumi";
import { AnitabiClient, anitabiMapUrl } from "@antiable/anitabi";
import { PresenceStore } from "@antiable/presence";

const SEED_ID = 115908; // 吹响吧！上低音号 (Presence + Bangumi aligned)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.PRESENCE_DB ?? path.join(root, "data", "presence.sqlite");

async function main() {
  if (process.env.SKIP_NETWORK === "1") {
    const store = new PresenceStore(dbPath);
    const seed = store.get(SEED_ID);
    const summary = {
      ok: seed != null && seed.pointsLength > 0,
      skipped: true,
      reason: "SKIP_NETWORK=1",
      presenceSeed: seed
        ? { subjectId: seed.subjectId, city: seed.city, pointsLength: seed.pointsLength }
        : null,
    };
    store.close();
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok) process.exitCode = 1;
    return;
  }

  const bangumi = new BangumiClient({
    userAgent: defaultBangumiUserAgent(),
  });
  const anitabi = new AnitabiClient({
    maxRequestsPerMinute: 30,
    concurrency: 1,
  });

  const ranked = await bangumi.fetchRankedSubjects({ pages: 1, pageSize: 10 });
  const probe = await anitabi.probeLite(SEED_ID);
  const lite =
    probe.ok && probe.summary && probe.summary.pointsLength > 0 ? probe.summary : null;

  let presenceFallback: { subjectId: number; city: string; pointsLength: number } | null =
    null;
  let anitabiBlocked = false;

  if (!lite && (probe.httpStatus === 403 || probe.httpStatus === 429)) {
    anitabiBlocked = true;
    const store = new PresenceStore(dbPath);
    const seed = store.get(SEED_ID);
    store.close();
    if (seed && seed.pointsLength > 0) {
      presenceFallback = {
        subjectId: seed.subjectId,
        city: seed.city,
        pointsLength: seed.pointsLength,
      };
    }
  }

  const summary = {
    ok: ranked.length > 0 && (lite != null || presenceFallback != null),
    bangumiSample: ranked.slice(0, 3).map((s) => ({ id: s.id, name: s.name_cn || s.name })),
    anitabiLite: lite
      ? {
          subjectId: SEED_ID,
          city: lite.city,
          pointsLength: lite.pointsLength,
          mapUrl: anitabiMapUrl(SEED_ID),
        }
      : null,
    anitabiBlocked,
    anitabiHttpStatus: probe.httpStatus,
    presenceFallback,
    mapUrl: anitabiMapUrl(SEED_ID),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
