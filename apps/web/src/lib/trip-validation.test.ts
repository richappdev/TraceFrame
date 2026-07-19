import { describe, expect, it } from "vitest";
import {
  MAX_TRIP_REQUEST_BYTES,
  TripInputError,
  assertReasonableRequestSize,
  normalizeSubjectIds,
  normalizeTripDays,
  normalizeTripTitle,
  readBoundedRequestText,
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

  it("rejects an oversized body without relying on Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_TRIP_REQUEST_BYTES));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const request = new Request("https://example.test/api/trips", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readBoundedRequestText(request)).rejects.toMatchObject({
      code: "payload_too_large",
      status: 413,
    });
  });

  it("reads a bounded request body", async () => {
    const request = new Request("https://example.test/api/trips", {
      method: "POST",
      body: JSON.stringify({ title: "京都" }),
    });
    await expect(readBoundedRequestText(request)).resolves.toBe('{"title":"京都"}');
  });
});
