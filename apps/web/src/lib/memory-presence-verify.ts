import type { PresenceRecord } from "@antiable/presence";
import type {
  PresenceNegativeCache,
  PresenceQueueItem,
  PresenceQueueStatus,
  PresenceVerifyBackend,
} from "./presence-verify-types";

/** In-process backend for local/dev and unit tests. */
export class MemoryPresenceVerifyBackend implements PresenceVerifyBackend {
  private readonly presence = new Map<number, PresenceRecord>();
  private readonly queue = new Map<number, PresenceQueueItem>();
  private readonly negatives = new Map<number, PresenceNegativeCache>();
  private haltUntil: string | null = null;

  async listPresenceRecords(): Promise<PresenceRecord[]> {
    return [...this.presence.values()];
  }

  async getPresence(subjectId: number): Promise<PresenceRecord | null> {
    return this.presence.get(subjectId) ?? null;
  }

  async upsertPresence(record: PresenceRecord): Promise<void> {
    this.presence.set(record.subjectId, record);
  }

  async getQueueItem(subjectId: number): Promise<PresenceQueueItem | null> {
    return this.queue.get(subjectId) ?? null;
  }

  async getQueueStatuses(subjectIds: number[]): Promise<Map<number, PresenceQueueStatus>> {
    const out = new Map<number, PresenceQueueStatus>();
    for (const id of subjectIds) {
      const item = this.queue.get(id);
      if (item && (item.status === "pending" || item.status === "processing")) {
        out.set(id, item.status);
      }
    }
    return out;
  }

  async enqueuePending(subjectIds: number[]): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    for (const subjectId of subjectIds) {
      const existing = this.queue.get(subjectId);
      if (existing?.status === "pending" || existing?.status === "processing") continue;
      this.queue.set(subjectId, {
        subjectId,
        status: "pending",
        enqueuedAt: existing?.enqueuedAt ?? now,
        attempts: existing?.attempts ?? 0,
        updatedAt: now,
      });
      count += 1;
    }
    return count;
  }

  async claimPending(limit: number): Promise<PresenceQueueItem[]> {
    const now = new Date().toISOString();
    const claimed: PresenceQueueItem[] = [];
    for (const item of this.queue.values()) {
      if (claimed.length >= limit) break;
      if (item.status !== "pending") continue;
      const next: PresenceQueueItem = {
        ...item,
        status: "processing",
        attempts: item.attempts + 1,
        updatedAt: now,
      };
      this.queue.set(item.subjectId, next);
      claimed.push(next);
    }
    return claimed;
  }

  async completeQueue(subjectId: number): Promise<void> {
    const existing = this.queue.get(subjectId);
    const now = new Date().toISOString();
    this.queue.set(subjectId, {
      subjectId,
      status: "done",
      enqueuedAt: existing?.enqueuedAt ?? now,
      attempts: existing?.attempts ?? 0,
      updatedAt: now,
    });
  }

  async releaseToPending(subjectId: number): Promise<void> {
    const existing = this.queue.get(subjectId);
    if (!existing) return;
    const now = new Date().toISOString();
    this.queue.set(subjectId, {
      ...existing,
      status: "pending",
      updatedAt: now,
    });
  }

  async getNegative(subjectId: number): Promise<PresenceNegativeCache | null> {
    const row = this.negatives.get(subjectId);
    if (!row) return null;
    if (Date.parse(row.expiresAt) <= Date.now()) {
      this.negatives.delete(subjectId);
      return null;
    }
    return row;
  }

  async getActiveNegatives(subjectIds: number[]): Promise<Map<number, PresenceNegativeCache>> {
    const out = new Map<number, PresenceNegativeCache>();
    for (const id of subjectIds) {
      const row = await this.getNegative(id);
      if (row) out.set(id, row);
    }
    return out;
  }

  async setNegative(subjectId: number, reason: string, expiresAt: string): Promise<void> {
    this.negatives.set(subjectId, {
      subjectId,
      reason,
      checkedAt: new Date().toISOString(),
      expiresAt,
    });
  }

  async getHaltUntil(): Promise<string | null> {
    if (this.haltUntil && Date.parse(this.haltUntil) <= Date.now()) {
      this.haltUntil = null;
    }
    return this.haltUntil;
  }

  async setHaltUntil(iso: string | null): Promise<void> {
    this.haltUntil = iso;
  }

  close(): void {
    // no-op
  }

  /** Test helper */
  clear(): void {
    this.presence.clear();
    this.queue.clear();
    this.negatives.clear();
    this.haltUntil = null;
  }
}
