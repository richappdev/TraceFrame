import { describe, expect, it } from "vitest";
import {
  normalizeTitle,
  titlesConflict,
  buildPresenceRecord,
  serializeValidIdsCsv,
  recordToCsvRow,
} from "@antiable/presence";

describe("normalizeTitle / titlesConflict", () => {
  it("strips punctuation and case", () => {
    expect(normalizeTitle("吹响吧！上低音号")).toBe(normalizeTitle("吹响吧上低音号"));
  });

  it("detects Eva vs K-On mismatch", () => {
    expect(
      titlesConflict(
        { cn: "轻音少女", title: "けいおん！" },
        { name: "新世紀エヴァンゲリオン", nameCn: "新世纪福音战士" },
      ),
    ).toBe(true);
  });

  it("accepts matching Euphonium names", () => {
    expect(
      titlesConflict(
        { cn: "吹响吧！上低音号", title: "響け！ユーフォニアム" },
        { name: "響け！ユーフォニアム", nameCn: "吹响吧！上低音号" },
      ),
    ).toBe(false);
  });
});

describe("buildPresenceRecord + csv", () => {
  it("prefers Bangumi CN title and Anitabi city/points", () => {
    const record = buildPresenceRecord({
      subjectId: 265,
      bangumi: {
        id: 265,
        type: 2,
        name: "新世紀エヴァンゲリオン",
        name_cn: "新世纪福音战士",
      },
      lite: {
        title: "新世紀エヴァンゲリオン",
        city: "神奈川县",
        pointsLength: 7,
        imagesLength: 7,
      },
      sourceRun: "test",
      verifiedAt: "2026-07-18",
    });
    expect(record.titleCn).toBe("新世纪福音战士");
    expect(record.city).toBe("神奈川县");
    expect(record.pointsLength).toBe(7);

    const csv = serializeValidIdsCsv([recordToCsvRow(record)]);
    expect(csv).toContain("265");
    expect(csv).toContain("新世纪福音战士");
    expect(csv).not.toContain("轻音少女");
  });
});
