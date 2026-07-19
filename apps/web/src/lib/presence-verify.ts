import { AnitabiClient, parseGeoCentroid } from "@antiable/anitabi";
import { BangumiClient, SUBJECT_TYPE_ANIME, defaultBangumiUserAgent } from "@antiable/bangumi";
import { buildPresenceRecord, type PresenceRecord, type PresenceStore } from "@antiable/presence";
import { FirestorePresenceVerifyBackend } from "./firestore-presence";
import { MemoryPresenceVerifyBackend } from "./memory-presence-verify";
import type { PresenceQueueStatus, PresenceVerifyBackend } from "./presence-verify-types";
import {
  PRESENCE_DRAIN_BATCH,
  PRESENCE_ENQUEUE_CAP,
  PRESENCE_HALT_MS,
  PRESENCE_NEGATIVE_TTL_MS,
  PRESENCE_SOURCE_RUN,
} from "./presence-verify-types";

let memorySingleton: MemoryPresenceVerifyBackend | null = null;
let firestoreSingleton: FirestorePresenceVerifyBackend | null = null;

export function openPresenceVerifyBackend(): PresenceVerifyBackend {
  if (process.env.APP_STORE === "firestore") {
    firestoreSingleton ??= new FirestorePresenceVerifyBackend();
    return firestoreSingleton;
  }
  memorySingleton ??= new MemoryPresenceVerifyBackend();
  return memorySingleton;
}

/** Test-only: reset memory backend between cases. */
export function resetMemoryPresenceVerifyBackend(): void {
  memorySingleton?.clear();
  memorySingleton = null;
}

export type LibraryMapState = "mapped" | "checking" | "unmapped";

export function libraryMapState(args: {
  presence: PresenceRecord | null | undefined;
  queueStatus: PresenceQueueStatus | undefined;
}): LibraryMapState {
  if (args.presence != null && args.presence.pointsLength > 0) return "mapped";
  if (args.queueStatus === "pending" || args.queueStatus === "processing") return "checking";
  return "unmapped";
}

/**
 * Enqueue Bangumi IDs that are not yet in Presence and not in an active negative cache.
 * Caps per sync to avoid stampeding Anitabi.
 */
export async function enqueueUnmatchedForVerify(args: {
  subjectIds: number[];
  presence: PresenceStore;
  verify: PresenceVerifyBackend;
  cap?: number;
}): Promise<{ considered: number; enqueued: number; skipped: number }> {
  const cap = args.cap ?? PRESENCE_ENQUEUE_CAP;
  const candidates: number[] = [];
  for (const id of args.subjectIds) {
    const local = args.presence.get(id);
    if (local != null && local.pointsLength > 0) continue;
    candidates.push(id);
  }

  const negatives = await args.verify.getActiveNegatives(candidates);
  const toEnqueue = candidates.filter((id) => !negatives.has(id)).slice(0, cap);
  const enqueued = await args.verify.enqueuePending(toEnqueue);
  return {
    considered: candidates.length,
    enqueued,
    skipped: candidates.length - toEnqueue.length,
  };
}

export interface DrainResult {
  halted: boolean;
  haltUntil: string | null;
  processed: number;
  mapped: number;
  negative: number;
  errors: number;
  subjectIds: number[];
}

export async function drainPresenceQueue(args: {
  verify: PresenceVerifyBackend;
  presence?: PresenceStore;
  limit?: number;
  anitabi?: AnitabiClient;
  bangumi?: BangumiClient;
  now?: Date;
}): Promise<DrainResult> {
  const verify = args.verify;
  const haltUntil = await verify.getHaltUntil();
  if (haltUntil) {
    return {
      halted: true,
      haltUntil,
      processed: 0,
      mapped: 0,
      negative: 0,
      errors: 0,
      subjectIds: [],
    };
  }

  const anitabi =
    args.anitabi ??
    new AnitabiClient({
      maxRequestsPerMinute: 30,
      concurrency: 1,
      jitterMs: { min: 500, max: 1400 },
    });
  const bangumi =
    args.bangumi ?? new BangumiClient({ userAgent: defaultBangumiUserAgent() });
  const now = args.now ?? new Date();
  const limit = args.limit ?? PRESENCE_DRAIN_BATCH;
  const claimed = await verify.claimPending(limit);

  let mapped = 0;
  let negative = 0;
  let errors = 0;
  const subjectIds: number[] = [];

  for (const item of claimed) {
    subjectIds.push(item.subjectId);
    const probe = await anitabi.probeLite(item.subjectId);

    if (probe.httpStatus === 403 || probe.httpStatus === 429) {
      await verify.releaseToPending(item.subjectId);
      for (const rest of claimed.slice(claimed.indexOf(item) + 1)) {
        await verify.releaseToPending(rest.subjectId);
      }
      const until = new Date(now.getTime() + PRESENCE_HALT_MS).toISOString();
      await verify.setHaltUntil(until);
      return {
        halted: true,
        haltUntil: until,
        processed: subjectIds.length - 1,
        mapped,
        negative,
        errors,
        subjectIds: subjectIds.slice(0, -1),
      };
    }

    if (!probe.ok || probe.httpStatus === 404 || !probe.summary) {
      const expiresAt = new Date(now.getTime() + PRESENCE_NEGATIVE_TTL_MS).toISOString();
      await verify.setNegative(
        item.subjectId,
        probe.error ?? `http_${probe.httpStatus}`,
        expiresAt,
      );
      await verify.completeQueue(item.subjectId);
      negative += 1;
      continue;
    }

    const lite = probe.summary;
    if ((lite.pointsLength ?? 0) <= 0) {
      const expiresAt = new Date(now.getTime() + PRESENCE_NEGATIVE_TTL_MS).toISOString();
      await verify.setNegative(item.subjectId, "anitabi_empty", expiresAt);
      await verify.completeQueue(item.subjectId);
      negative += 1;
      continue;
    }

    try {
      const subject = await bangumi.getSubject(item.subjectId);
      if (subject.type !== SUBJECT_TYPE_ANIME) {
        const expiresAt = new Date(now.getTime() + PRESENCE_NEGATIVE_TTL_MS).toISOString();
        await verify.setNegative(item.subjectId, "bangumi_not_anime", expiresAt);
        await verify.completeQueue(item.subjectId);
        negative += 1;
        continue;
      }

      const centroid = parseGeoCentroid(lite.geo);
      const record = buildPresenceRecord({
        subjectId: item.subjectId,
        bangumi: {
          id: subject.id,
          type: subject.type,
          name: subject.name,
          name_cn: subject.name_cn,
          images: subject.images,
        },
        lite: {
          title: lite.title,
          cn: lite.cn,
          city: lite.city,
          pointsLength: lite.pointsLength ?? 0,
          imagesLength: lite.imagesLength,
          cover: lite.cover,
          color: lite.color,
        },
        sourceRun: PRESENCE_SOURCE_RUN,
        verifiedAt: now.toISOString().slice(0, 10),
        lat: centroid?.lat ?? null,
        lng: centroid?.lng ?? null,
        notes: "runtime-verify",
      });

      await verify.upsertPresence(record);
      args.presence?.upsert(record);
      await verify.completeQueue(item.subjectId);
      mapped += 1;
    } catch (err) {
      console.error("[presence-drain] subject failed", item.subjectId, err);
      await verify.releaseToPending(item.subjectId);
      errors += 1;
    }
  }

  return {
    halted: false,
    haltUntil: null,
    processed: claimed.length,
    mapped,
    negative,
    errors,
    subjectIds,
  };
}
