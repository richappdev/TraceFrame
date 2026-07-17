import { describe, expect, it } from "vitest";
import type { PresenceRecord } from "@antiable/presence";
import { buildTripDays, clampDayCount } from "./planner";

function rec(
  partial: Pick<PresenceRecord, "subjectId" | "city" | "pointsLength"> &
    Partial<PresenceRecord>,
): PresenceRecord {
  return {
    title: "",
    titleCn: "",
    lat: null,
    lng: null,
    imagesLength: 0,
    coverUrl: null,
    color: null,
    verifiedAt: "2026-07-17T00:00:00.000Z",
    sourceRun: null,
    httpStatus: 200,
    notes: null,
    ...partial,
  };
}

describe("clampDayCount", () => {
  it("defaults invalid values to 2", () => {
    expect(clampDayCount(undefined)).toBe(2);
    expect(clampDayCount("x")).toBe(2);
    expect(clampDayCount(NaN)).toBe(2);
  });

  it("clamps to 1..3", () => {
    expect(clampDayCount(0)).toBe(1);
    expect(clampDayCount(1)).toBe(1);
    expect(clampDayCount(2.4)).toBe(2);
    expect(clampDayCount(9)).toBe(3);
  });
});

describe("buildTripDays", () => {
  it("returns empty buckets when no mapped titles", () => {
    const days = buildTripDays([rec({ subjectId: 1, city: "东京", pointsLength: 0 })], 2);
    expect(days).toEqual([
      { day: 1, city: "", subjectIds: [] },
      { day: 2, city: "", subjectIds: [] },
    ]);
  });

  it("assigns one city per day when cities <= dayCount", () => {
    const days = buildTripDays(
      [
        rec({ subjectId: 1, city: "东京", pointsLength: 10 }),
        rec({ subjectId: 2, city: "京都", pointsLength: 5 }),
      ],
      3,
    );
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ day: 1, city: "东京", subjectIds: [1] });
    expect(days[1]).toMatchObject({ day: 2, city: "京都", subjectIds: [2] });
  });

  it("packs extra cities into least-loaded days", () => {
    const days = buildTripDays(
      [
        rec({ subjectId: 1, city: "A", pointsLength: 30 }),
        rec({ subjectId: 2, city: "B", pointsLength: 20 }),
        rec({ subjectId: 3, city: "C", pointsLength: 10 }),
        rec({ subjectId: 4, city: "D", pointsLength: 5 }),
      ],
      2,
    );
    expect(days).toHaveLength(2);
    const allIds = days.flatMap((d) => d.subjectIds).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4]);
    expect(days.every((d) => d.subjectIds.length >= 1)).toBe(true);
  });

  it("skips unmapped and groups same city", () => {
    const days = buildTripDays(
      [
        rec({ subjectId: 1, city: "山梨县", pointsLength: 8 }),
        rec({ subjectId: 2, city: "山梨县", pointsLength: 3 }),
        rec({ subjectId: 3, city: "大阪", pointsLength: 0 }),
      ],
      1,
    );
    expect(days).toEqual([
      { day: 1, city: "山梨县", subjectIds: [1, 2] },
    ]);
  });
});
