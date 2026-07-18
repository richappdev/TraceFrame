import { afterEach, describe, expect, it } from "vitest";
import { createOAuthState, parseOAuthState, verifyOAuthState } from "./oauth-state";

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
});
