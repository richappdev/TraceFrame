import { describe, expect, it, beforeEach, vi } from "vitest";
import { PresenceStore } from "@antiable/presence";
import { MemoryPresenceVerifyBackend } from "./memory-presence-verify";
import {
  drainPresenceQueue,
  enqueueUnmatchedForVerify,
  libraryMapState,
  resetMemoryPresenceVerifyBackend,
} from "./presence-verify";
import type { AnitabiClient } from "@antiable/anitabi";
import type { BangumiClient } from "@antiable/bangumi";

describe("libraryMapState", () => {
  it("prefers mapped over checking", () => {
    expect(
      libraryMapState({
        presence: { pointsLength: 3 } as never,
        queueStatus: "pending",
      }),
    ).toBe("mapped");
  });

  it("marks pending queue as checking", () => {
    expect(libraryMapState({ presence: null, queueStatus: "pending" })).toBe("checking");
    expect(libraryMapState({ presence: null, queueStatus: "processing" })).toBe("checking");
  });

  it("falls back to unmapped", () => {
    expect(libraryMapState({ presence: null, queueStatus: undefined })).toBe("unmapped");
    expect(
      libraryMapState({ presence: { pointsLength: 0 } as never, queueStatus: undefined }),
    ).toBe("unmapped");
  });
});

describe("enqueueUnmatchedForVerify", () => {
  beforeEach(() => {
    resetMemoryPresenceVerifyBackend();
  });

  it("skips presence hits and active negatives, respects cap", async () => {
    const presence = new PresenceStore(":memory:");
    presence.upsert({
      subjectId: 1,
      title: "mapped",
      titleCn: "mapped",
      city: "东京",
      lat: null,
      lng: null,
      pointsLength: 5,
      imagesLength: 0,
      coverUrl: null,
      color: null,
      verifiedAt: "2026-07-19",
      sourceRun: "seed",
      httpStatus: 200,
      notes: null,
    });

    const verify = new MemoryPresenceVerifyBackend();
    await verify.setNegative(2, "miss", "2099-01-01T00:00:00.000Z");

    const result = await enqueueUnmatchedForVerify({
      subjectIds: [1, 2, 3, 4, 5],
      presence,
      verify,
      cap: 2,
    });

    // candidates after presence filter: 2,3,4,5; negatives remove 2 → [3,4,5]; cap 2 → [3,4]
    expect(result.considered).toBe(4);
    expect(result.enqueued).toBe(2);
    expect(result.skipped).toBe(2);
    expect(await verify.getQueueStatuses([3, 4, 5])).toEqual(
      new Map([
        [3, "pending"],
        [4, "pending"],
      ]),
    );
    presence.close();
  });
});

describe("drainPresenceQueue", () => {
  beforeEach(() => {
    resetMemoryPresenceVerifyBackend();
  });

  it("upserts on lite hit and writes negative on 404", async () => {
    const verify = new MemoryPresenceVerifyBackend();
    await verify.enqueuePending([10, 11]);
    const presence = new PresenceStore(":memory:");

    const anitabi = {
      probeLite: vi.fn(async (subjectId: number) => {
        if (subjectId === 10) {
          return {
            subjectId,
            ok: true,
            httpStatus: 200,
            summary: {
              title: "Hit",
              cn: "命中",
              city: "京都",
              pointsLength: 4,
              imagesLength: 1,
            },
          };
        }
        return { subjectId, ok: false, httpStatus: 404, error: "not_found" };
      }),
    } as unknown as AnitabiClient;

    const bangumi = {
      getSubject: vi.fn(async (id: number) => ({
        id,
        type: 2,
        name: "Hit JP",
        name_cn: "命中",
        images: { common: "https://example.com/c.jpg" },
      })),
    } as unknown as BangumiClient;

    const result = await drainPresenceQueue({
      verify,
      presence,
      anitabi,
      bangumi,
      limit: 5,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(result.halted).toBe(false);
    expect(result.mapped).toBe(1);
    expect(result.negative).toBe(1);
    expect(presence.get(10)?.city).toBe("京都");
    expect(await verify.getPresence(10)).not.toBeNull();
    expect(await verify.getNegative(11)).not.toBeNull();
    presence.close();
  });

  it("halts on 403 without marking missing", async () => {
    const verify = new MemoryPresenceVerifyBackend();
    await verify.enqueuePending([20, 21]);

    const anitabi = {
      probeLite: vi.fn(async (subjectId: number) => ({
        subjectId,
        ok: false,
        httpStatus: 403,
        error: "blocked_or_limited",
      })),
    } as unknown as AnitabiClient;

    const result = await drainPresenceQueue({
      verify,
      anitabi,
      bangumi: { getSubject: vi.fn() } as unknown as BangumiClient,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(result.halted).toBe(true);
    expect(result.haltUntil).toBeTruthy();
    expect(result.mapped).toBe(0);
    expect(result.negative).toBe(0);
    expect(await verify.getNegative(20)).toBeNull();
    expect((await verify.getQueueItem(20))?.status).toBe("pending");
    expect((await verify.getQueueItem(21))?.status).toBe("pending");
  });
});
