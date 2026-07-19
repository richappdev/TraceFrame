import { afterEach, describe, expect, it } from "vitest";
import {
  COOKIE_NAME,
  decodeSessionCookie,
  decryptToken,
  encodeSessionCookie,
  encryptToken,
  getSessionSecret,
} from "./session";

const PREV_SECRET = process.env.SESSION_SECRET;
const PREV_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  if (PREV_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = PREV_SECRET;
  if (PREV_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = PREV_NODE_ENV;
});

describe("session crypto", () => {
  it("uses the Firebase Hosting __session cookie name", () => {
    expect(COOKIE_NAME).toBe("__session");
  });

  it("round-trips token encryption", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const enc = encryptToken("access-token-value");
    expect(enc).not.toContain("access-token-value");
    expect(decryptToken(enc)).toBe("access-token-value");
  });

  it("round-trips session cookie encode/decode", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const raw = encodeSessionCookie({
      user: { id: "bgm:1", bangumiUserId: 1, username: "demo" },
      accessTokenEnc: "enc",
    });
    expect(decodeSessionCookie(raw)?.user.username).toBe("demo");
  });

  it("rejects tampered cookies", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const raw = encodeSessionCookie({
      user: { id: "bgm:1", bangumiUserId: 1 },
      accessTokenEnc: "enc",
    });
    expect(decodeSessionCookie(raw + "x")).toBeNull();
    expect(decodeSessionCookie(undefined)).toBeNull();
  });

  it("rejects a missing or weak production secret", () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    expect(() => getSessionSecret()).toThrow(/at least 32 characters/);
    process.env.SESSION_SECRET = "too-short";
    expect(() => getSessionSecret()).toThrow(/at least 32 characters/);
  });

  it("rejects expired sessions", () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
    const raw = encodeSessionCookie({
      user: { id: "bgm:1", bangumiUserId: 1 },
      accessTokenEnc: "enc",
      issuedAt: Date.now() - 2_000,
      expiresAt: Date.now() - 1_000,
    });
    expect(decodeSessionCookie(raw)).toBeNull();
  });
});
