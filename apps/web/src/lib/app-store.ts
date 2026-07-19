import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type CollectionType = "wish" | "collect" | "do" | "on_hold" | "dropped";

export interface UserRow {
  id: string;
  bangumiUserId: number;
  username: string;
  nickname: string;
  avatar: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  tokenExpiresAt: number | null;
  updatedAt: string;
}

export interface LibraryItemRow {
  userId: string;
  subjectId: number;
  collectionType: string;
  score: number | null;
  /** Bangumi subject name (usually Japanese). */
  title: string | null;
  /** Bangumi subject name_cn when present. */
  titleCn: string | null;
  updatedAt: string;
}

export interface TripRow {
  id: string;
  ownerId: string;
  title: string;
  sourceTemplate: string | null;
  shareToken: string | null;
  daysJson: string;
  subjectIdsJson: string;
  createdAt: string;
  updatedAt: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  bangumi_user_id INTEGER NOT NULL UNIQUE,
  username TEXT NOT NULL DEFAULT '',
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_expires_at INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_items (
  user_id TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  collection_type TEXT NOT NULL,
  score INTEGER,
  title TEXT,
  title_cn TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_library_user ON library_items(user_id);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_template TEXT,
  share_token TEXT UNIQUE,
  days_json TEXT NOT NULL,
  subject_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_owner ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_share ON trips(share_token);
`;

export class AppStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
    const tripColumns = this.db.prepare("PRAGMA table_info(trips)").all() as Array<{
      name: string;
    }>;
    if (!tripColumns.some((column) => column.name === "source_template")) {
      this.db.exec("ALTER TABLE trips ADD COLUMN source_template TEXT");
    }
    const libraryColumns = this.db
      .prepare("PRAGMA table_info(library_items)")
      .all() as Array<{ name: string }>;
    if (!libraryColumns.some((column) => column.name === "title")) {
      this.db.exec("ALTER TABLE library_items ADD COLUMN title TEXT");
    }
    if (!libraryColumns.some((column) => column.name === "title_cn")) {
      this.db.exec("ALTER TABLE library_items ADD COLUMN title_cn TEXT");
    }
  }

  upsertUser(user: UserRow): void {
    this.db
      .prepare(
        `INSERT INTO users (
          id, bangumi_user_id, username, nickname, avatar,
          access_token_enc, refresh_token_enc, token_expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          nickname = excluded.nickname,
          avatar = excluded.avatar,
          access_token_enc = excluded.access_token_enc,
          refresh_token_enc = excluded.refresh_token_enc,
          token_expires_at = excluded.token_expires_at,
          updated_at = excluded.updated_at`,
      )
      .run(
        user.id,
        user.bangumiUserId,
        user.username,
        user.nickname,
        user.avatar,
        user.accessTokenEnc,
        user.refreshTokenEnc,
        user.tokenExpiresAt,
        user.updatedAt,
      );
  }

  getUser(id: string): UserRow | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      bangumiUserId: Number(row.bangumi_user_id),
      username: String(row.username ?? ""),
      nickname: String(row.nickname ?? ""),
      avatar: row.avatar == null ? null : String(row.avatar),
      accessTokenEnc: String(row.access_token_enc),
      refreshTokenEnc: row.refresh_token_enc == null ? null : String(row.refresh_token_enc),
      tokenExpiresAt: row.token_expires_at == null ? null : Number(row.token_expires_at),
      updatedAt: String(row.updated_at),
    };
  }

  replaceLibrary(userId: string, items: LibraryItemRow[]): void {
    this.db.exec("BEGIN");
    try {
      this.db.prepare(`DELETE FROM library_items WHERE user_id = ?`).run(userId);
      const stmt = this.db.prepare(
        `INSERT INTO library_items (user_id, subject_id, collection_type, score, title, title_cn, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const item of items) {
        stmt.run(
          item.userId,
          item.subjectId,
          item.collectionType,
          item.score,
          item.title,
          item.titleCn,
          item.updatedAt,
        );
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  listLibrary(userId: string): LibraryItemRow[] {
    const rows = this.db
      .prepare(
        `SELECT user_id, subject_id, collection_type, score, title, title_cn, updated_at
         FROM library_items WHERE user_id = ? ORDER BY updated_at DESC`,
      )
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      userId: String(r.user_id),
      subjectId: Number(r.subject_id),
      collectionType: String(r.collection_type),
      score: r.score == null ? null : Number(r.score),
      title: r.title == null || r.title === "" ? null : String(r.title),
      titleCn: r.title_cn == null || r.title_cn === "" ? null : String(r.title_cn),
      updatedAt: String(r.updated_at),
    }));
  }

  createTrip(trip: TripRow): void {
    this.db
      .prepare(
        `INSERT INTO trips (
          id, owner_id, title, source_template, share_token, days_json, subject_ids_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        trip.id,
        trip.ownerId,
        trip.title,
        trip.sourceTemplate,
        trip.shareToken,
        trip.daysJson,
        trip.subjectIdsJson,
        trip.createdAt,
        trip.updatedAt,
      );
  }

  getTrip(id: string): TripRow | null {
    const row = this.db.prepare(`SELECT * FROM trips WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? tripFromRow(row) : null;
  }

  getTripByShareToken(token: string): TripRow | null {
    const row = this.db
      .prepare(`SELECT * FROM trips WHERE share_token = ?`)
      .get(token) as Record<string, unknown> | undefined;
    return row ? tripFromRow(row) : null;
  }

  listTrips(ownerId: string): TripRow[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM trips WHERE owner_id = ? ORDER BY updated_at DESC`,
      )
      .all(ownerId) as Array<Record<string, unknown>>;
    return rows.map(tripFromRow);
  }

  updateTrip(
    id: string,
    patch: {
      title?: string;
      daysJson?: string;
      subjectIdsJson?: string;
      shareToken?: string | null;
      updatedAt: string;
    },
  ): boolean {
    const current = this.getTrip(id);
    if (!current) return false;
    this.db
      .prepare(
        `UPDATE trips SET
          title = ?,
          share_token = ?,
          days_json = ?,
          subject_ids_json = ?,
          updated_at = ?
         WHERE id = ?`,
      )
      .run(
        patch.title ?? current.title,
        patch.shareToken !== undefined ? patch.shareToken : current.shareToken,
        patch.daysJson ?? current.daysJson,
        patch.subjectIdsJson ?? current.subjectIdsJson,
        patch.updatedAt,
        id,
      );
    return true;
  }

  deleteUserData(userId: string): void {
    this.db.exec("BEGIN");
    try {
      this.db.prepare(`DELETE FROM library_items WHERE user_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM trips WHERE owner_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}

function tripFromRow(row: Record<string, unknown>): TripRow {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title ?? ""),
    sourceTemplate: row.source_template == null ? null : String(row.source_template),
    shareToken: row.share_token == null ? null : String(row.share_token),
    daysJson: String(row.days_json ?? "[]"),
    subjectIdsJson: String(row.subject_ids_json ?? "[]"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
