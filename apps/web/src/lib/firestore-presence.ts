import { getApps, initializeApp } from "firebase-admin/app";
import {
  FieldPath,
  getFirestore,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import type { PresenceRecord } from "@antiable/presence";
import type {
  PresenceNegativeCache,
  PresenceQueueItem,
  PresenceQueueStatus,
  PresenceVerifyBackend,
} from "./presence-verify-types";

const PRESENCE = "antiable_presence";
const QUEUE = "antiable_presence_queue";
const NEGATIVE = "antiable_presence_negative";
const META = "antiable_presence_meta";
const HALT_DOC = "drain";

function presenceFromData(data: DocumentData): PresenceRecord {
  return {
    subjectId: Number(data.subjectId),
    title: String(data.title ?? ""),
    titleCn: String(data.titleCn ?? ""),
    city: String(data.city ?? ""),
    lat: data.lat == null ? null : Number(data.lat),
    lng: data.lng == null ? null : Number(data.lng),
    pointsLength: Number(data.pointsLength ?? 0),
    imagesLength: Number(data.imagesLength ?? 0),
    coverUrl: data.coverUrl == null ? null : String(data.coverUrl),
    color: data.color == null ? null : String(data.color),
    verifiedAt: String(data.verifiedAt ?? ""),
    sourceRun: data.sourceRun == null ? null : String(data.sourceRun),
    httpStatus: data.httpStatus == null ? null : Number(data.httpStatus),
    notes: data.notes == null ? null : String(data.notes),
  };
}

function queueFromData(data: DocumentData): PresenceQueueItem {
  return {
    subjectId: Number(data.subjectId),
    status: data.status as PresenceQueueStatus,
    enqueuedAt: String(data.enqueuedAt),
    attempts: Number(data.attempts ?? 0),
    updatedAt: String(data.updatedAt),
  };
}

function negativeFromData(data: DocumentData): PresenceNegativeCache {
  return {
    subjectId: Number(data.subjectId),
    reason: String(data.reason ?? ""),
    checkedAt: String(data.checkedAt),
    expiresAt: String(data.expiresAt),
  };
}

async function getManyByIds<T>(
  db: Firestore,
  collection: string,
  subjectIds: number[],
  map: (data: DocumentData) => T,
): Promise<Map<number, T>> {
  const out = new Map<number, T>();
  const unique = [...new Set(subjectIds)];
  const chunkSize = 30;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const refs = chunk.map((id) => db.collection(collection).doc(String(id)));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const value = map(snap.data()!);
      out.set(Number(snap.id), value);
    }
  }
  return out;
}

export class FirestorePresenceVerifyBackend implements PresenceVerifyBackend {
  private readonly db: Firestore;

  constructor() {
    const app = getApps()[0] ?? initializeApp();
    this.db = getFirestore(app);
  }

  async listPresenceRecords(): Promise<PresenceRecord[]> {
    const snap = await this.db.collection(PRESENCE).get();
    return snap.docs.map((doc) => presenceFromData(doc.data()));
  }

  async getPresence(subjectId: number): Promise<PresenceRecord | null> {
    const snap = await this.db.collection(PRESENCE).doc(String(subjectId)).get();
    return snap.exists ? presenceFromData(snap.data()!) : null;
  }

  async upsertPresence(record: PresenceRecord): Promise<void> {
    await this.db.collection(PRESENCE).doc(String(record.subjectId)).set(record, { merge: true });
  }

  async getQueueItem(subjectId: number): Promise<PresenceQueueItem | null> {
    const snap = await this.db.collection(QUEUE).doc(String(subjectId)).get();
    return snap.exists ? queueFromData(snap.data()!) : null;
  }

  async getQueueStatuses(subjectIds: number[]): Promise<Map<number, PresenceQueueStatus>> {
    const rows = await getManyByIds(this.db, QUEUE, subjectIds, queueFromData);
    const out = new Map<number, PresenceQueueStatus>();
    for (const [id, item] of rows) {
      if (item.status === "pending" || item.status === "processing") {
        out.set(id, item.status);
      }
    }
    return out;
  }

  async enqueuePending(subjectIds: number[]): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    const unique = [...new Set(subjectIds)];
    const chunkSize = 400;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const refs = chunk.map((id) => this.db.collection(QUEUE).doc(String(id)));
      const snaps = await this.db.getAll(...refs);
      const batch = this.db.batch();
      let ops = 0;
      for (let j = 0; j < chunk.length; j++) {
        const subjectId = chunk[j]!;
        const snap = snaps[j]!;
        if (snap.exists) {
          const status = String(snap.data()!.status);
          if (status === "pending" || status === "processing") continue;
        }
        batch.set(
          refs[j]!,
          {
            subjectId,
            status: "pending",
            enqueuedAt: snap.exists ? (snap.data()!.enqueuedAt ?? now) : now,
            attempts: snap.exists ? Number(snap.data()!.attempts ?? 0) : 0,
            updatedAt: now,
          },
          { merge: true },
        );
        ops += 1;
        count += 1;
      }
      if (ops > 0) await batch.commit();
    }
    return count;
  }

  async claimPending(limit: number): Promise<PresenceQueueItem[]> {
    const snap = await this.db
      .collection(QUEUE)
      .where("status", "==", "pending")
      .orderBy(FieldPath.documentId())
      .limit(limit)
      .get();

    const claimed: PresenceQueueItem[] = [];
    for (const doc of snap.docs) {
      const result = await this.db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists) return null;
        const data = fresh.data()!;
        if (data.status !== "pending") return null;
        const now = new Date().toISOString();
        const next: PresenceQueueItem = {
          subjectId: Number(data.subjectId),
          status: "processing",
          enqueuedAt: String(data.enqueuedAt),
          attempts: Number(data.attempts ?? 0) + 1,
          updatedAt: now,
        };
        tx.set(doc.ref, next);
        return next;
      });
      if (result) claimed.push(result);
    }
    return claimed;
  }

  async completeQueue(subjectId: number): Promise<void> {
    const ref = this.db.collection(QUEUE).doc(String(subjectId));
    const snap = await ref.get();
    const now = new Date().toISOString();
    const existing = snap.exists ? snap.data()! : {};
    await ref.set(
      {
        subjectId,
        status: "done",
        enqueuedAt: existing.enqueuedAt ?? now,
        attempts: existing.attempts ?? 0,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  async releaseToPending(subjectId: number): Promise<void> {
    const ref = this.db.collection(QUEUE).doc(String(subjectId));
    const snap = await ref.get();
    if (!snap.exists) return;
    await ref.set(
      {
        ...snap.data(),
        status: "pending",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async getNegative(subjectId: number): Promise<PresenceNegativeCache | null> {
    const snap = await this.db.collection(NEGATIVE).doc(String(subjectId)).get();
    if (!snap.exists) return null;
    const row = negativeFromData(snap.data()!);
    if (Date.parse(row.expiresAt) <= Date.now()) return null;
    return row;
  }

  async getActiveNegatives(subjectIds: number[]): Promise<Map<number, PresenceNegativeCache>> {
    const rows = await getManyByIds(this.db, NEGATIVE, subjectIds, negativeFromData);
    const out = new Map<number, PresenceNegativeCache>();
    const now = Date.now();
    for (const [id, row] of rows) {
      if (Date.parse(row.expiresAt) > now) out.set(id, row);
    }
    return out;
  }

  async setNegative(subjectId: number, reason: string, expiresAt: string): Promise<void> {
    await this.db.collection(NEGATIVE).doc(String(subjectId)).set({
      subjectId,
      reason,
      checkedAt: new Date().toISOString(),
      expiresAt,
    });
  }

  async getHaltUntil(): Promise<string | null> {
    const snap = await this.db.collection(META).doc(HALT_DOC).get();
    if (!snap.exists) return null;
    const until = snap.data()?.haltUntil;
    if (until == null || until === "") return null;
    const iso = String(until);
    if (Date.parse(iso) <= Date.now()) return null;
    return iso;
  }

  async setHaltUntil(iso: string | null): Promise<void> {
    await this.db.collection(META).doc(HALT_DOC).set(
      { haltUntil: iso, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  }

  close(): void {
    // Admin SDK manages the connection pool.
  }
}
