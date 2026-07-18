#!/usr/bin/env tsx
/**
 * Reconcile Presence seed CSV against live Anitabi /lite + Bangumi subjects.
 *
 * - Keep only anime (Bangumi type=2) with Anitabi pointsLength > 0
 * - Titles/city/points come from Bangumi + Anitabi (not stale CSV labels)
 * - When CSV title disagrees with Bangumi for that id, search Bangumi for the
 *   claimed title and adopt the first Anitabi-mapped anime hit
 *
 * Usage:
 *   npm run presence:reconcile
 *   npm run presence:reconcile -- --dry-run
 *   SKIP_NETWORK=1 npm run presence:reconcile   # no-op guard for CI
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnitabiClient, parseGeoCentroid } from "@antiable/anitabi";
import { BangumiClient, SUBJECT_TYPE_ANIME, defaultBangumiUserAgent } from "@antiable/bangumi";
import {
  PresenceStore,
  buildPresenceRecord,
  parseCsv,
  recordToCsvRow,
  serializeValidIdsCsv,
  titlesConflict,
  type PresenceCsvRow,
  type PresenceRecord,
  type ReconcileDecision,
} from "@antiable/presence";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = process.env.VALID_IDS_CSV ?? path.join(root, "valid-ids.csv");
const webSeedPath = path.join(root, "apps", "web", "seed", "valid-ids.csv");
const dbPath = process.env.PRESENCE_DB ?? path.join(root, "data", "presence.sqlite");
const reportDir = path.join(root, "reports");
const dryRun = process.argv.includes("--dry-run");

function loadCsvRows(filePath: string): PresenceCsvRow[] {
  const text = readFileSync(filePath, "utf8");
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0]!.map((h) => h.trim());
  return table.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]!] = cols[i] ?? "";
    return obj as unknown as PresenceCsvRow;
  });
}

async function main() {
  if (process.env.SKIP_NETWORK === "1") {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "SKIP_NETWORK=1" }, null, 2));
    return;
  }

  const rows = loadCsvRows(csvPath);
  if (rows.length === 0) {
    console.error(`No rows in ${csvPath}`);
    process.exitCode = 1;
    return;
  }

  const bangumi = new BangumiClient({ userAgent: defaultBangumiUserAgent() });
  const anitabi = new AnitabiClient({
    maxRequestsPerMinute: 30,
    concurrency: 1,
    jitterMs: { min: 500, max: 1400 },
  });

  const sourceRun = `reconcile-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const decisions: ReconcileDecision[] = [];
  const keptById = new Map<number, PresenceRecord>();
  const seenResolved = new Set<number>();

  async function tryAdoptId(
    subjectId: number,
    opts: {
      claimed?: PresenceCsvRow;
      replacedFromId?: number;
      probeNode?: string;
      firstSeenAt?: string;
      notes?: string;
    },
  ): Promise<ReconcileDecision> {
    const probe = await anitabi.probeLite(subjectId);
    if (probe.httpStatus === 403 || probe.httpStatus === 429) {
      return {
        kind: "drop",
        subjectId,
        reason: "anitabi_blocked",
        detail: probe.error,
        claimedCn: opts.claimed?.cn,
        claimedTitle: opts.claimed?.title,
      };
    }
    if (!probe.ok || probe.httpStatus === 404) {
      return {
        kind: "drop",
        subjectId,
        reason: "anitabi_missing",
        detail: probe.error ?? `http ${probe.httpStatus}`,
        claimedCn: opts.claimed?.cn,
        claimedTitle: opts.claimed?.title,
      };
    }
    const lite = probe.summary!;
    if ((lite.pointsLength ?? 0) <= 0) {
      return {
        kind: "drop",
        subjectId,
        reason: "anitabi_empty",
        claimedCn: opts.claimed?.cn,
        claimedTitle: opts.claimed?.title,
      };
    }

    let subject;
    try {
      subject = await bangumi.getSubject(subjectId, { forceRefresh: true });
    } catch (err) {
      return {
        kind: "drop",
        subjectId,
        reason: "bangumi_missing",
        detail: err instanceof Error ? err.message : String(err),
        claimedCn: opts.claimed?.cn,
        claimedTitle: opts.claimed?.title,
      };
    }

    if (subject.type !== SUBJECT_TYPE_ANIME) {
      return {
        kind: "drop",
        subjectId,
        reason: "bangumi_not_anime",
        detail: `bangumi type=${subject.type} name=${subject.name_cn || subject.name}`,
        claimedCn: opts.claimed?.cn,
        claimedTitle: opts.claimed?.title,
      };
    }

    const matched =
      !opts.claimed ||
      !titlesConflict(
        { cn: opts.claimed.cn, title: opts.claimed.title },
        { name: subject.name, nameCn: subject.name_cn },
      );

    const geo = parseGeoCentroid(lite.geo);
    const noteParts = [
      opts.notes,
      opts.replacedFromId != null ? `recovered from id ${opts.replacedFromId}` : null,
      !matched ? "csv title differed; kept bangumi+anitabi truth" : null,
    ].filter(Boolean);

    const record = buildPresenceRecord({
      subjectId,
      bangumi: subject,
      lite,
      sourceRun,
      verifiedAt,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      notes: noteParts.length ? noteParts.join("; ") : null,
    });

    return {
      kind: "keep",
      subjectId,
      record,
      titleMatchedCsv: matched,
      replacedFromId: opts.replacedFromId,
    };
  }

  for (const row of rows) {
    const subjectId = Number(row.id);
    if (!Number.isFinite(subjectId) || subjectId <= 0) continue;

    let decision = await tryAdoptId(subjectId, {
      claimed: row,
      probeNode: row.probeNode,
      firstSeenAt: row.firstSeenAt,
    });

    // CSV title/id mismatch (or missing/wrong id): search Bangumi for claimed name
    const needsRecovery =
      decision.kind === "drop" ||
      (decision.kind === "keep" && !decision.titleMatchedCsv);

    if (needsRecovery) {
      const keywords = [...new Set(
        [row.cn, row.title]
          .flatMap((s) => (s || "").split(/[\/／|]/))
          .map((s) => s.trim())
          .filter(Boolean),
      )];
      let recovered: ReconcileDecision | null = null;
      for (const keyword of keywords) {
        try {
          const hits = await bangumi.searchSubjects(keyword, { limit: 8 });
          for (const hit of hits) {
            if (hit.id === subjectId) continue;
            if (seenResolved.has(hit.id) || keptById.has(hit.id)) continue;
            const attempt = await tryAdoptId(hit.id, {
              claimed: { ...row, cn: keyword, title: row.title },
              replacedFromId: subjectId,
              probeNode: row.probeNode,
              firstSeenAt: row.firstSeenAt,
              notes: `search recovered for "${keyword}"`,
            });
            // Only accept recoveries that match the claimed title
            if (attempt.kind === "keep" && attempt.titleMatchedCsv) {
              recovered = attempt;
              break;
            }
          }
        } catch (err) {
          if (decision.kind === "drop") {
            decision = {
              ...decision,
              detail: `${decision.detail ?? ""}; search failed: ${
                err instanceof Error ? err.message : String(err)
              }`.trim(),
            };
          }
        }
        if (recovered) break;
      }

      if (recovered?.kind === "keep") {
        // Drop the original wrong id if we recovered a different one
        if (decision.kind === "keep" && decision.subjectId !== recovered.subjectId) {
          decisions.push({
            kind: "drop",
            subjectId: decision.subjectId,
            reason: "title_mismatch_unresolved",
            detail: `replaced by ${recovered.subjectId}`,
            claimedCn: row.cn,
            claimedTitle: row.title,
          });
        } else if (decision.kind === "drop") {
          decisions.push(decision);
        }
        decision = recovered;
      } else if (decision.kind === "keep" && !decision.titleMatchedCsv) {
        // Keep Bangumi truth for this id, but record mismatch
        decision = {
          ...decision,
          record: {
            ...decision.record,
            notes: [decision.record.notes, "csv title mismatched bangumi; kept live ids"]
              .filter(Boolean)
              .join("; "),
          },
        };
      }
    }

    decisions.push(decision);
    if (decision.kind === "keep") {
      keptById.set(decision.subjectId, decision.record);
      seenResolved.add(decision.subjectId);
    }

    console.log(
      decision.kind === "keep"
        ? `KEEP  ${decision.subjectId}  ${decision.record.titleCn || decision.record.title}  (${decision.record.pointsLength} pts)${
            decision.replacedFromId ? `  ← recovered from ${decision.replacedFromId}` : ""
          }${decision.titleMatchedCsv ? "" : "  [title≠csv]"}`
        : `DROP  ${decision.subjectId}  ${decision.reason}  ${decision.detail ?? ""}`.trim(),
    );
  }

  const kept = [...keptById.values()].sort((a, b) => b.pointsLength - a.pointsLength);
  const dropped = decisions.filter((d) => d.kind === "drop");
  const recovered = decisions.filter((d) => d.kind === "keep" && d.replacedFromId != null);

  const csvRows = kept.map((rec) => {
    const origin = rows.find((r) => Number(r.id) === rec.subjectId);
    return recordToCsvRow(rec, {
      probeNode: origin?.probeNode ?? "reconcile",
      firstSeenAt: origin?.firstSeenAt || verifiedAt,
    });
  });
  const csvText = serializeValidIdsCsv(csvRows);

  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `presence-reconcile-${verifiedAt}.json`);
  const report = {
    ok: true,
    dryRun,
    sourceRun,
    csvPath,
    inputRows: rows.length,
    kept: kept.length,
    dropped: dropped.length,
    recovered: recovered.length,
    decisions,
    keptSample: kept.slice(0, 8).map((r) => ({
      id: r.subjectId,
      cn: r.titleCn,
      title: r.title,
      city: r.city,
      points: r.pointsLength,
    })),
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (!dryRun) {
    writeFileSync(csvPath, csvText, "utf8");
    writeFileSync(webSeedPath, csvText, "utf8");
    // Keep root mirror used by docs tooling if distinct
    const rootMirror = path.join(root, "valid-ids.csv");
    if (path.resolve(csvPath) !== path.resolve(rootMirror)) {
      copyFileSync(csvPath, rootMirror);
    }

    const store = new PresenceStore(dbPath);
    const n = store.replaceAll(kept);
    const cities = store.cityStats(8);
    store.close();
    console.log(
      JSON.stringify(
        {
          ...report,
          imported: n,
          dbPath,
          topCities: cities.map((c) => ({ city: c.city, titles: c.titleCount })),
          reportPath,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  }

  if (kept.length === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
