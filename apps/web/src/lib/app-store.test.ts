import { describe, expect, it } from "vitest";
import { AppStore } from "./app-store";

describe("AppStore trips", () => {
  it("creates, lists, and updates trips in memory", () => {
    const store = new AppStore(":memory:");
    const now = "2026-07-17T00:00:00.000Z";
    store.createTrip({
      id: "trip-1",
      ownerId: "bgm:1",
      title: "东京两日",
      sourceTemplate: "tokyo-anime-highlights",
      shareToken: "sharetok",
      daysJson: JSON.stringify([{ day: 1, city: "东京", subjectIds: [1, 2] }]),
      subjectIdsJson: JSON.stringify([1, 2]),
      createdAt: now,
      updatedAt: now,
    });

    expect(store.listTrips("bgm:1")).toHaveLength(1);
    expect(store.getTripByShareToken("sharetok")?.title).toBe("东京两日");
    expect(store.getTrip("trip-1")?.sourceTemplate).toBe("tokyo-anime-highlights");

    const ok = store.updateTrip("trip-1", {
      title: "京都一日",
      daysJson: JSON.stringify([{ day: 1, city: "京都", subjectIds: [3] }]),
      subjectIdsJson: JSON.stringify([3]),
      updatedAt: "2026-07-17T01:00:00.000Z",
    });
    expect(ok).toBe(true);
    expect(store.getTrip("trip-1")?.title).toBe("京都一日");
    store.deleteUserData("bgm:1");
    expect(store.listTrips("bgm:1")).toHaveLength(0);
    store.close();
  });
});
