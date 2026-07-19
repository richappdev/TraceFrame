import { describe, expect, it } from "vitest";
import { collectionToLibraryItem, collectionTypeLabel } from "./collections";

describe("collectionToLibraryItem", () => {
  it("persists Bangumi subject titles for unmatched display", () => {
    const row = collectionToLibraryItem(
      "bgm:1",
      {
        subject_id: 311,
        type: 1,
        rate: 8,
        updated_at: "2026-07-19T00:00:00.000Z",
        subject: { id: 311, name: "犬夜叉", name_cn: "犬夜叉" },
      },
      "2026-07-19T01:00:00.000Z",
    );

    expect(row).toEqual({
      userId: "bgm:1",
      subjectId: 311,
      collectionType: "wish",
      score: 8,
      title: "犬夜叉",
      titleCn: "犬夜叉",
      updatedAt: "2026-07-19T00:00:00.000Z",
    });
  });

  it("treats blank Bangumi titles as null", () => {
    const row = collectionToLibraryItem(
      "bgm:1",
      {
        subject_id: 42,
        type: 2,
        subject: { id: 42, name: "  ", name_cn: "" },
      },
      "2026-07-19T01:00:00.000Z",
    );

    expect(row.title).toBeNull();
    expect(row.titleCn).toBeNull();
    expect(row.collectionType).toBe(collectionTypeLabel(2));
    expect(row.updatedAt).toBe("2026-07-19T01:00:00.000Z");
  });
});
