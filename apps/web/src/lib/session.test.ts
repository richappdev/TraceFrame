import { afterEach, describe, expect, it } from "vitest";
import {
  decodeSessionCookie,
  decryptToken,
  encodeSessionCookie,
  encryptToken,
} from "./session";

const PREV_SECRET = process.env.SESSION_SECRET;

afterEach(() => {
  if (PREV_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = PREV_SECRET;
});

describe("session crypto", () => {
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
});
