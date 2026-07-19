import type { PresenceRecord } from "@antiable/presence";

export type PresenceQueueStatus = "pending" | "processing" | "done";

export interface PresenceQueueItem {
  subjectId: number;
  status: PresenceQueueStatus;
  enqueuedAt: string;
  attempts: number;
  updatedAt: string;
}

export interface PresenceNegativeCache {
  subjectId: number;
  reason: string;
  checkedAt: string;
  expiresAt: string;
}

export interface PresenceVerifyBackend {
  listPresenceRecords(): Promise<PresenceRecord[]>;
  getPresence(subjectId: number): Promise<PresenceRecord | null>;
  upsertPresence(record: PresenceRecord): Promise<void>;

  getQueueItem(subjectId: number): Promise<PresenceQueueItem | null>;
  getQueueStatuses(subjectIds: number[]): Promise<Map<number, PresenceQueueStatus>>;
  /** Create/merge pending queue docs; skip done unless force. Returns newly pending count. */
  enqueuePending(subjectIds: number[]): Promise<number>;
  claimPending(limit: number): Promise<PresenceQueueItem[]>;
  completeQueue(subjectId: number): Promise<void>;
  /** Return claimed item to pending (e.g. after WAF halt). */
  releaseToPending(subjectId: number): Promise<void>;

  getNegative(subjectId: number): Promise<PresenceNegativeCache | null>;
  /** Active (non-expired) negatives for the given IDs. */
  getActiveNegatives(subjectIds: number[]): Promise<Map<number, PresenceNegativeCache>>;
  setNegative(subjectId: number, reason: string, expiresAt: string): Promise<void>;

  getHaltUntil(): Promise<string | null>;
  setHaltUntil(iso: string | null): Promise<void>;

  close(): void;
}

export const PRESENCE_ENQUEUE_CAP = 50;
export const PRESENCE_DRAIN_BATCH = 5;
export const PRESENCE_NEGATIVE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const PRESENCE_HALT_MS = 60 * 60 * 1000;
export const PRESENCE_SOURCE_RUN = "runtime-verify";
