import { afterEach, describe, expect, it } from "vitest";
import {
  createOAuthState,
  normalizeReturnPath,
  parseOAuthState,
  verifyOAuthState,
} from "./oauth-state";

const PREV_SECRET = process.env.SESSION_SECRET;

afterEach(() => {
  if (PREV_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = PREV_SECRET;
});

describe("oauth state", () => {
  it("round-trips a fresh state with redirect_uri", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const state = createOAuthState("https://app.example.com/api/auth/callback");
    expect(verifyOAuthState(state)).toBe(true);
    expect(parseOAuthState(state)?.r).toBe("https://app.example.com/api/auth/callback");

    const localized = createOAuthState(
      "https://app.example.com/api/auth/callback",
      undefined,
      "ja-JP",
    );
    expect(parseOAuthState(localized)?.l).toBe("ja-JP");
  });

  it("rejects tampered or expired state", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const state = createOAuthState("https://app.example.com/api/auth/callback");
    expect(verifyOAuthState(state + "x")).toBe(false);
    expect(verifyOAuthState(undefined)).toBe(false);
    expect(verifyOAuthState("a.b")).toBe(false);

    const expired = createOAuthState("https://app.example.com/api/auth/callback", -1000);
    expect(verifyOAuthState(expired)).toBe(false);
  });

  it("preserves a safe local continuation path", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const state = createOAuthState(
      "https://app.example.com/api/auth/callback",
      60_000,
      "zh-TW",
      "/zh-TW/trips/new?template=kyoto-uji-classics",
    );
    expect(parseOAuthState(state)?.p).toBe("/zh-TW/trips/new?template=kyoto-uji-classics");
  });

  it("rejects external or ambiguous continuation paths", () => {
    expect(normalizeReturnPath("https://evil.example/path")).toBeUndefined();
    expect(normalizeReturnPath("//evil.example/path")).toBeUndefined();
    expect(normalizeReturnPath("/\\evil")).toBeUndefined();
  });
});
