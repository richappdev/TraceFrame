import { describe, expect, it } from "vitest";
import {
  curatedTrips,
  curatedTripsForSubject,
  curatedTripSubjectIds,
  getCuratedTrip,
} from "./curated-trips";

const verifiedIds = new Set([
  431767, 207195, 115908, 428735, 328609, 240038, 1424,
  240562, 22759, 110467, 333158, 364450, 269235, 378862,
]);

describe("curated trips", () => {
  it("defines unique, addressable slugs", () => {
    expect(curatedTrips).toHaveLength(4);
    expect(new Set(curatedTrips.map((trip) => trip.slug)).size).toBe(curatedTrips.length);
    for (const trip of curatedTrips) expect(getCuratedTrip(trip.slug)).toBe(trip);
  });

  it("uses only verified Presence subjects and one to three days", () => {
    for (const trip of curatedTrips) {
      expect(trip.days.length).toBeGreaterThanOrEqual(1);
      expect(trip.days.length).toBeLessThanOrEqual(3);
      expect(trip.coverUrl).toMatch(/^https:\/\/lain\.bgm\.tv\/pic\/cover\//);
      for (const id of curatedTripSubjectIds(trip)) expect(verifiedIds.has(id)).toBe(true);
    }
  });

  it("finds contextual trips for Presence titles", () => {
    expect(curatedTripsForSubject(1424).map((trip) => trip.slug)).toEqual([
      "kyoto-uji-classics",
    ]);
    expect(curatedTripsForSubject(240038)).toEqual([]);
  });
});
