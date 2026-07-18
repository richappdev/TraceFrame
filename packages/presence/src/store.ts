import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { CityCoverageStat, PresenceRecord } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS presence (
  subject_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  title_cn TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  points_length INTEGER NOT NULL DEFAULT 0,
  images_length INTEGER NOT NULL DEFAULT 0,
  cover_url TEXT,
  color TEXT,
  verified_at TEXT NOT NULL,
  source_run TEXT,
  http_status INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_presence_city ON presence(city);
CREATE INDEX IF NOT EXISTS idx_presence_points ON presence(points_length DESC);
`;

function rowToRecord(row: Record<string, unknown>): PresenceRecord {
  return {
    subjectId: Number(row.subject_id),
    title: String(row.title ?? ""),
    titleCn: String(row.title_cn ?? ""),
    city: String(row.city ?? ""),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    pointsLength: Number(row.points_length ?? 0),
    imagesLength: Number(row.images_length ?? 0),
    coverUrl: row.cover_url == null ? null : String(row.cover_url),
    color: row.color == null ? null : String(row.color),
    verifiedAt: String(row.verified_at ?? ""),
    sourceRun: row.source_run == null ? null : String(row.source_run),
    httpStatus: row.http_status == null ? null : Number(row.http_status),
    notes: row.notes == null ? null : String(row.notes),
  };
}

/** SQLite presence index (node:sqlite). Metadata only ??no POI/image blobs. */
export class PresenceStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
  }

  upsert(record: PresenceRecord): void {
    this.db
      .prepare(
        `INSERT INTO presence (
          subject_id, title, title_cn, city, lat, lng,
          points_length, images_length, cover_url, color,
          verified_at, source_run, http_status, notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(subject_id) DO UPDATE SET
          title = excluded.title,
          title_cn = excluded.title_cn,
          city = excluded.city,
          lat = excluded.lat,
          lng = excluded.lng,
          points_length = excluded.points_length,
          images_length = excluded.images_length,
          cover_url = excluded.cover_url,
          color = excluded.color,
          verified_at = excluded.verified_at,
          source_run = excluded.source_run,
          http_status = excluded.http_status,
          notes = excluded.notes`,
      )
      .run(
        record.subjectId,
        record.title,
        record.titleCn,
        record.city,
        record.lat,
        record.lng,
        record.pointsLength,
        record.imagesLength,
        record.coverUrl,
        record.color,
        record.verifiedAt,
        record.sourceRun,
        record.httpStatus,
        record.notes,
      );
  }

  upsertMany(records: PresenceRecord[]): number {
    this.db.exec("BEGIN");
    try {
      for (const row of records) this.upsert(row);
      this.db.exec("COMMIT");
      return records.length;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** Wipe and reload — used after Presence reconcile so stale wrong IDs disappear. */
  replaceAll(records: PresenceRecord[]): number {
    this.db.exec("BEGIN");
    try {
      this.db.exec("DELETE FROM presence");
      for (const row of records) this.upsert(row);
      this.db.exec("COMMIT");
      return records.length;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  deleteSubject(subjectId: number): void {
    this.db.prepare(`DELETE FROM presence WHERE subject_id = ?`).run(subjectId);
  }

  get(subjectId: number): PresenceRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM presence WHERE subject_id = ?`)
      .get(subjectId) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
  }

  list(opts?: { limit?: number; offset?: number; city?: string }): PresenceRecord[] {
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;
    if (opts?.city) {
      const rows = this.db
        .prepare(
          `SELECT * FROM presence WHERE city = ? ORDER BY points_length DESC LIMIT ? OFFSET ?`,
        )
        .all(opts.city, limit, offset) as Record<string, unknown>[];
      return rows.map(rowToRecord);
    }
    const rows = this.db
      .prepare(`SELECT * FROM presence ORDER BY points_length DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as Record<string, unknown>[];
    return rows.map(rowToRecord);
  }

  count(opts?: { city?: string }): number {
    if (opts?.city) {
      const row = this.db
        .prepare(`SELECT COUNT(*) AS c FROM presence WHERE city = ?`)
        .get(opts.city) as { c: number };
      return Number(row.c);
    }
    const row = this.db.prepare(`SELECT COUNT(*) AS c FROM presence`).get() as {
      c: number;
    };
    return Number(row.c);
  }

  allSubjectIds(): Set<number> {
    const rows = this.db
      .prepare(`SELECT subject_id FROM presence WHERE points_length > 0`)
      .all() as Array<{ subject_id: number }>;
    return new Set(rows.map((r) => Number(r.subject_id)));
  }

  cityStats(limit = 20): CityCoverageStat[] {
    const rows = this.db
      .prepare(
        `SELECT city,
                COUNT(*) AS title_count,
                SUM(points_length) AS total_points,
                GROUP_CONCAT(subject_id) AS ids
         FROM presence
         WHERE city IS NOT NULL AND city != '' AND points_length > 0
         GROUP BY city
         ORDER BY title_count DESC, total_points DESC
         LIMIT ?`,
      )
      .all(limit) as Array<{
      city: string;
      title_count: number;
      total_points: number;
      ids: string;
    }>;

    return rows.map((r) => ({
      city: r.city,
      titleCount: Number(r.title_count),
      totalPoints: Number(r.total_points ?? 0),
      subjectIds: String(r.ids ?? "")
        .split(",")
        .filter(Boolean)
        .map((id) => Number(id)),
    }));
  }

  close(): void {
    this.db.close();
  }
}
