import { readFileSync } from "node:fs";
import type { PresenceCsvRow, PresenceRecord } from "./types";

/** Minimal CSV parser for valid-ids.csv (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore CR
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }

  return rows;
}

export function csvRowsToRecords(rows: PresenceCsvRow[]): PresenceRecord[] {
  return rows
    .map((r) => {
      const subjectId = Number(r.id);
      if (!Number.isFinite(subjectId) || subjectId <= 0) return null;
      const points = Number(r.pointsLength ?? 0);
      if (!Number.isFinite(points) || points <= 0) return null;

      const lat = r.lat != null && r.lat !== "" ? Number(r.lat) : null;
      const lng = r.lng != null && r.lng !== "" ? Number(r.lng) : null;

      return {
        subjectId,
        title: r.title?.trim() || "",
        titleCn: r.cn?.trim() || "",
        city: r.city?.trim() || "",
        lat: lat != null && Number.isFinite(lat) ? lat : null,
        lng: lng != null && Number.isFinite(lng) ? lng : null,
        pointsLength: points,
        imagesLength: Number(r.imagesLength ?? 0) || 0,
        coverUrl: r.coverUrl?.trim() || null,
        color: r.color?.trim() || null,
        verifiedAt: r.lastVerifiedAt?.trim() || r.firstSeenAt?.trim() || new Date().toISOString().slice(0, 10),
        sourceRun: r.sourceRun?.trim() || null,
        httpStatus: r.httpStatus ? Number(r.httpStatus) : null,
        notes: r.notes?.trim() || null,
      } satisfies PresenceRecord;
    })
    .filter((r): r is PresenceRecord => r != null);
}

export function loadValidIdsCsv(filePath: string): PresenceRecord[] {
  const text = readFileSync(filePath, "utf8");
  const table = parseCsv(text);
  if (table.length < 2) return [];

  const header = table[0]!.map((h) => h.trim());
  const objects: PresenceCsvRow[] = table.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i]!;
      obj[key] = cols[i] ?? "";
    }
    return obj as unknown as PresenceCsvRow;
  });

  return csvRowsToRecords(objects);
}
