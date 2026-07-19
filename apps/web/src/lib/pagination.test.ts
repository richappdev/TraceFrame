import { describe, expect, it } from "vitest";
import { parsePaginationInteger } from "./pagination";

describe("parsePaginationInteger", () => {
  const options = { defaultValue: 50, min: 1, max: 100 };

  it("uses the default when the parameter is absent", () => {
    expect(parsePaginationInteger(null, options)).toBe(50);
  });

  it("accepts integers and caps values above the maximum", () => {
    expect(parsePaginationInteger("25", options)).toBe(25);
    expect(parsePaginationInteger("500", options)).toBe(100);
  });

  it("rejects malformed, fractional, and out-of-range values", () => {
    expect(parsePaginationInteger("abc", options)).toBeNull();
    expect(parsePaginationInteger("2.5", options)).toBeNull();
    expect(parsePaginationInteger("0", options)).toBeNull();
  });
});
