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
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_library_user ON library_items(user_id);
`;

export class AppStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
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
        `INSERT INTO library_items (user_id, subject_id, collection_type, score, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      );
      for (const item of items) {
        stmt.run(
          item.userId,
          item.subjectId,
          item.collectionType,
          item.score,
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
        `SELECT user_id, subject_id, collection_type, score, updated_at
         FROM library_items WHERE user_id = ? ORDER BY updated_at DESC`,
      )
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      userId: String(r.user_id),
      subjectId: Number(r.subject_id),
      collectionType: String(r.collection_type),
      score: r.score == null ? null : Number(r.score),
      updatedAt: String(r.updated_at),
    }));
  }

  close(): void {
    this.db.close();
  }
}
