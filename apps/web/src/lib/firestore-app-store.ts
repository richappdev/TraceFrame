import { getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import type { AppStoreBackend, TripPatch } from "./app-store-backend";
import type { LibraryItemRow, TripRow, UserRow } from "./app-store";

const USERS = "antiable_users";
const TRIPS = "antiable_trips";
const LIBRARY = "library_items";
const BATCH_LIMIT = 450;

function userFromData(data: DocumentData): UserRow {
  return {
    id: String(data.id),
    bangumiUserId: Number(data.bangumiUserId),
    username: String(data.username ?? ""),
    nickname: String(data.nickname ?? ""),
    avatar: data.avatar == null ? null : String(data.avatar),
    accessTokenEnc: String(data.accessTokenEnc),
    refreshTokenEnc: data.refreshTokenEnc == null ? null : String(data.refreshTokenEnc),
    tokenExpiresAt: data.tokenExpiresAt == null ? null : Number(data.tokenExpiresAt),
    updatedAt: String(data.updatedAt),
  };
}

function libraryFromData(data: DocumentData): LibraryItemRow {
  return {
    userId: String(data.userId),
    subjectId: Number(data.subjectId),
    collectionType: String(data.collectionType),
    score: data.score == null ? null : Number(data.score),
    updatedAt: String(data.updatedAt),
  };
}

function tripFromData(data: DocumentData): TripRow {
  return {
    id: String(data.id),
    ownerId: String(data.ownerId),
    title: String(data.title ?? ""),
    shareToken: data.shareToken == null ? null : String(data.shareToken),
    daysJson: String(data.daysJson ?? "[]"),
    subjectIdsJson: String(data.subjectIdsJson ?? "[]"),
    createdAt: String(data.createdAt),
    updatedAt: String(data.updatedAt),
  };
}

type BatchOperation =
  | { kind: "set"; ref: DocumentReference; data: DocumentData }
  | { kind: "delete"; ref: DocumentReference };

export class FirestoreAppStore implements AppStoreBackend {
  private readonly db: Firestore;

  constructor() {
    const app = getApps()[0] ?? initializeApp();
    this.db = getFirestore(app);
  }

  async upsertUser(user: UserRow): Promise<void> {
    await this.db.collection(USERS).doc(user.id).set(user, { merge: true });
  }

  async getUser(id: string): Promise<UserRow | null> {
    const snap = await this.db.collection(USERS).doc(id).get();
    return snap.exists ? userFromData(snap.data()!) : null;
  }

  async replaceLibrary(userId: string, items: LibraryItemRow[]): Promise<void> {
    const collection = this.db.collection(USERS).doc(userId).collection(LIBRARY);
    const existing = await collection.listDocuments();
    const desired = new Set(items.map((item) => String(item.subjectId)));
    const operations: BatchOperation[] = items.map((item) => ({
      kind: "set",
      ref: collection.doc(String(item.subjectId)),
      data: item,
    }));
    for (const ref of existing) {
      if (!desired.has(ref.id)) operations.push({ kind: "delete", ref });
    }

    for (let start = 0; start < operations.length; start += BATCH_LIMIT) {
      const batch = this.db.batch();
      for (const operation of operations.slice(start, start + BATCH_LIMIT)) {
        if (operation.kind === "set") batch.set(operation.ref, operation.data);
        else batch.delete(operation.ref);
      }
      await batch.commit();
    }
  }

  async listLibrary(userId: string): Promise<LibraryItemRow[]> {
    const snap = await this.db
      .collection(USERS)
      .doc(userId)
      .collection(LIBRARY)
      .orderBy("updatedAt", "desc")
      .get();
    return snap.docs.map((doc) => libraryFromData(doc.data()));
  }

  async createTrip(trip: TripRow): Promise<void> {
    await this.db.collection(TRIPS).doc(trip.id).create(trip);
  }

  async getTrip(id: string): Promise<TripRow | null> {
    const snap = await this.db.collection(TRIPS).doc(id).get();
    return snap.exists ? tripFromData(snap.data()!) : null;
  }

  async getTripByShareToken(token: string): Promise<TripRow | null> {
    const snap = await this.db
      .collection(TRIPS)
      .where("shareToken", "==", token)
      .limit(1)
      .get();
    return snap.empty ? null : tripFromData(snap.docs[0]!.data());
  }

  async listTrips(ownerId: string): Promise<TripRow[]> {
    const snap = await this.db.collection(TRIPS).where("ownerId", "==", ownerId).get();
    return snap.docs
      .map((doc) => tripFromData(doc.data()))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async updateTrip(id: string, patch: TripPatch): Promise<boolean> {
    const ref = this.db.collection(TRIPS).doc(id);
    const current = await ref.get();
    if (!current.exists) return false;
    const update: DocumentData = { updatedAt: patch.updatedAt };
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.daysJson !== undefined) update.daysJson = patch.daysJson;
    if (patch.subjectIdsJson !== undefined) update.subjectIdsJson = patch.subjectIdsJson;
    if (patch.shareToken !== undefined) update.shareToken = patch.shareToken;
    await ref.update(update);
    return true;
  }

  async deleteUserData(userId: string): Promise<void> {
    const userRef = this.db.collection(USERS).doc(userId);
    await this.db.recursiveDelete(userRef);

    for (;;) {
      const owned = await this.db
        .collection(TRIPS)
        .where("ownerId", "==", userId)
        .limit(BATCH_LIMIT)
        .get();
      if (owned.empty) break;
      const batch = this.db.batch();
      for (const doc of owned.docs) batch.delete(doc.ref);
      await batch.commit();
      if (owned.size < BATCH_LIMIT) break;
    }
  }

  close(): void {
    // The Admin SDK manages and reuses its connection pool for the process.
  }
}
