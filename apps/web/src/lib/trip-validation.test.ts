import { describe, expect, it } from "vitest";
import {
  MAX_TRIP_REQUEST_BYTES,
  TripInputError,
  assertReasonableRequestSize,
  normalizeSubjectIds,
  normalizeTripDays,
  normalizeTripTitle,
} from "./trip-validation";

describe("trip input validation", () => {
  it("normalizes titles and subject IDs", () => {
    expect(normalizeTripTitle("  东京两日  ")).toBe("东京两日");
    expect(normalizeSubjectIds([1, "2", 2, -1, 1.5])).toEqual([1, 2]);
  });

  it("rejects oversized and duplicate itinerary data", () => {
    expect(() => normalizeTripTitle("x".repeat(81))).toThrow(TripInputError);
    expect(() =>
      normalizeTripDays([
        { city: "东京", subjectIds: [1] },
        { city: "京都", subjectIds: [1] },
      ]),
    ).toThrowError("duplicate_subject");
  });

  it("rejects requests above the declared payload limit", () => {
    const request = new Request("https://example.test/api/trips", {
      headers: { "content-length": String(MAX_TRIP_REQUEST_BYTES + 1) },
    });
    expect(() => assertReasonableRequestSize(request)).toThrowError("payload_too_large");
  });
});
