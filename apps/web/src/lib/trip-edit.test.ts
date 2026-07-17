import { describe, expect, it } from "vitest";
import {
  moveTitle,
  relabelDayCities,
  swapDays,
  type EditableDay,
} from "./trip-edit";

function day(
  dayNum: number,
  city: string,
  titles: Array<{ subjectId: number; city?: string }>,
): EditableDay {
  return {
    day: dayNum,
    city,
    subjectIds: titles.map((t) => t.subjectId),
    titles: titles.map((t) => ({
      subjectId: t.subjectId,
      city: t.city ?? city,
      title: `#${t.subjectId}`,
    })),
  };
}

describe("relabelDayCities", () => {
  it("renumbers days and rebuilds city labels", () => {
    const out = relabelDayCities([
      day(9, "旧", [
        { subjectId: 1, city: "东京" },
        { subjectId: 2, city: "横滨" },
      ]),
    ]);
    expect(out[0]?.day).toBe(1);
    expect(out[0]?.city).toBe("东京 / 横滨");
    expect(out[0]?.subjectIds).toEqual([1, 2]);
  });
});

describe("swapDays", () => {
  it("swaps two days and relabels", () => {
    const days = [
      day(1, "东京", [{ subjectId: 1, city: "东京" }]),
      day(2, "京都", [{ subjectId: 2, city: "京都" }]),
    ];
    const out = swapDays(days, 0, 1);
    expect(out.map((d) => d.city)).toEqual(["京都", "东京"]);
    expect(out.map((d) => d.day)).toEqual([1, 2]);
  });

  it("no-ops on out-of-range indexes", () => {
    const days = [day(1, "东京", [{ subjectId: 1 }])];
    expect(swapDays(days, 0, 2)).toBe(days);
  });
});

describe("moveTitle", () => {
  it("reorders within a day", () => {
    const days = [
      day(1, "东京", [
        { subjectId: 1, city: "东京" },
        { subjectId: 2, city: "东京" },
      ]),
    ];
    const out = moveTitle(days, 0, 1, 0, 0);
    expect(out[0]?.subjectIds).toEqual([2, 1]);
  });

  it("moves title across days and drops empty days", () => {
    const days = [
      day(1, "东京", [{ subjectId: 1, city: "东京" }]),
      day(2, "京都", [{ subjectId: 2, city: "京都" }]),
    ];
    const out = moveTitle(days, 0, 0, 1, 1);
    expect(out).toHaveLength(1);
    expect(out[0]?.subjectIds).toEqual([2, 1]);
    expect(out[0]?.city).toContain("京都");
  });
});
