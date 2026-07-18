import type { PresenceCsvRow, PresenceRecord } from "./types";

/** Collapse whitespace / case / common punctuation for title compare. */
export function normalizeTitle(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[・·．.！!？?：:／/\-—–_\s　]+/g, "")
    .replace(/[（）()【】\[\]「」『』<>《》]/g, "");
}

export interface TitlePair {
  name?: string;
  nameCn?: string;
  cn?: string;
  title?: string;
}

/** True when claimed CSV title clearly disagrees with Bangumi names. */
export function titlesConflict(claimed: TitlePair, bangumi: TitlePair): boolean {
  const claimedNorm = [claimed.cn, claimed.title, claimed.nameCn, claimed.name]
    .filter((s): s is string => Boolean(s?.trim()))
    .map((s) => normalizeTitle(s));
  if (claimedNorm.length === 0) return false;

  const bgmNorm = [bangumi.nameCn, bangumi.name, bangumi.cn, bangumi.title]
    .filter((s): s is string => Boolean(s?.trim()))
    .map((s) => normalizeTitle(s));
  if (bgmNorm.length === 0) return true;

  return !claimedNorm.some((c) => bgmNorm.some((b) => b.includes(c) || c.includes(b)));
}

export type ReconcileDropReason =
  | "anitabi_missing"
  | "anitabi_empty"
  | "anitabi_blocked"
  | "bangumi_missing"
  | "bangumi_not_anime"
  | "title_mismatch_unresolved";

export interface ReconcileKeep {
  kind: "keep";
  subjectId: number;
  record: PresenceRecord;
  titleMatchedCsv: boolean;
  replacedFromId?: number;
}

export interface ReconcileDrop {
  kind: "drop";
  subjectId: number;
  reason: ReconcileDropReason;
  detail?: string;
  claimedCn?: string;
  claimedTitle?: string;
}

export type ReconcileDecision = ReconcileKeep | ReconcileDrop;

export interface LiteLike {
  title?: string;
  cn?: string;
  city?: string;
  pointsLength: number;
  imagesLength?: number;
  cover?: string;
  color?: string;
}

export interface BangumiLike {
  id: number;
  type: number;
  name: string;
  name_cn: string;
  images?: { common?: string };
}

export function buildPresenceRecord(args: {
  subjectId: number;
  bangumi: BangumiLike;
  lite: LiteLike;
  sourceRun: string;
  verifiedAt: string;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
}): PresenceRecord {
  const { bangumi, lite } = args;
  return {
    subjectId: args.subjectId,
    title: (lite.title || bangumi.name || "").trim(),
    titleCn: (bangumi.name_cn || lite.cn || bangumi.name || "").trim(),
    city: (lite.city || "").trim(),
    lat: args.lat ?? null,
    lng: args.lng ?? null,
    pointsLength: lite.pointsLength,
    imagesLength: lite.imagesLength ?? 0,
    coverUrl: lite.cover?.trim() || bangumi.images?.common || null,
    color: lite.color?.trim() || null,
    verifiedAt: args.verifiedAt,
    sourceRun: args.sourceRun,
    httpStatus: 200,
    notes: args.notes ?? null,
  };
}

export function recordToCsvRow(
  record: PresenceRecord,
  extras?: { probeNode?: string; firstSeenAt?: string },
): PresenceCsvRow {
  return {
    id: String(record.subjectId),
    cn: record.titleCn,
    title: record.title,
    city: record.city,
    pointsLength: String(record.pointsLength),
    imagesLength: String(record.imagesLength),
    probeNode: extras?.probeNode ?? "",
    firstSeenAt: extras?.firstSeenAt ?? record.verifiedAt,
    lastVerifiedAt: record.verifiedAt,
    sourceRun: record.sourceRun ?? "",
    httpStatus: record.httpStatus != null ? String(record.httpStatus) : "200",
    notes: record.notes ?? "",
    coverUrl: record.coverUrl ?? "",
    color: record.color ?? "",
    lat: record.lat != null ? String(record.lat) : "",
    lng: record.lng != null ? String(record.lng) : "",
  };
}

export const CSV_HEADER = [
  "id",
  "cn",
  "title",
  "city",
  "pointsLength",
  "imagesLength",
  "probeNode",
  "firstSeenAt",
  "lastVerifiedAt",
  "sourceRun",
  "httpStatus",
  "notes",
] as const;

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serialize Presence rows to valid-ids.csv text (UTF-8). */
export function serializeValidIdsCsv(
  rows: PresenceCsvRow[],
  header: readonly string[] = CSV_HEADER,
): string {
  const lines = [header.join(",")];
  for (const row of rows) {
    const rec = row as unknown as Record<string, string>;
    const cols = header.map((key) => escapeCsv(String(rec[key] ?? "")));
    lines.push(cols.join(","));
  }
  return `${lines.join("\n")}\n`;
}
