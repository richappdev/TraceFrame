import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeCode } from "./bangumi-oauth";

const ENV_KEYS = ["BANGUMI_CLIENT_ID", "BANGUMI_CLIENT_SECRET", "BANGUMI_REDIRECT_URI"] as const;
const previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.BANGUMI_CLIENT_ID = "client-id";
  process.env.BANGUMI_CLIENT_SECRET = "client-secret";
  process.env.BANGUMI_REDIRECT_URI = "https://app.example/api/auth/callback";
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    const value = previousEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function tokenResponse() {
  return new Response(
    JSON.stringify({
      access_token: "access-token",
      expires_in: 3600,
      token_type: "Bearer",
      user_id: 42,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("exchangeCode", () => {
  it("retries one transient server error and preserves the redirect URI", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("null", { status: 500 }))
      .mockResolvedValueOnce(tokenResponse());

    await expect(exchangeCode("one-time-code")).resolves.toMatchObject({
      access_token: "access-token",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const [, init] of fetchMock.mock.calls) {
      const body = init?.body as URLSearchParams;
      expect(body.get("code")).toBe("one-time-code");
      expect(body.get("redirect_uri")).toBe("https://app.example/api/auth/callback");
    }
  });

  it("does not retry a rejected or already-used authorization code", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("invalid_grant", { status: 400 }));

    await expect(exchangeCode("bad-code")).rejects.toThrow("400 invalid_grant");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a successful response that does not contain a token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("null", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await expect(exchangeCode("code")).rejects.toThrow("invalid response");
  });
});
