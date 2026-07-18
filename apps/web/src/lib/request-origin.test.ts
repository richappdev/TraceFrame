import { afterEach, describe, expect, it } from "vitest";
import { absoluteUrl, getRequestOrigin } from "./request-origin";

const PREV_REDIRECT = process.env.BANGUMI_REDIRECT_URI;

afterEach(() => {
  if (PREV_REDIRECT === undefined) delete process.env.BANGUMI_REDIRECT_URI;
  else process.env.BANGUMI_REDIRECT_URI = PREV_REDIRECT;
});

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe("getRequestOrigin", () => {
  it("prefers x-forwarded-host / x-forwarded-proto over bind address in request.url", () => {
    const origin = getRequestOrigin(
      req("http://0.0.0.0:8080/api/auth/callback?code=x", {
        host: "0.0.0.0:8080",
        "x-forwarded-host": "traceframe--antlable-traceframe.asia-east1.hosted.app",
        "x-forwarded-proto": "https",
      }),
    );
    expect(origin).toBe("https://traceframe--antlable-traceframe.asia-east1.hosted.app");
  });

  it("uses Host when not a bind address", () => {
    expect(
      getRequestOrigin(
        req("http://127.0.0.1:3000/api/auth/callback", {
          host: "localhost:3000",
        }),
      ),
    ).toBe("http://localhost:3000");
  });

  it("falls back to BANGUMI_REDIRECT_URI origin when host is 0.0.0.0", () => {
    process.env.BANGUMI_REDIRECT_URI =
      "https://example.hosted.app/api/auth/callback";
    expect(
      getRequestOrigin(
        req("http://0.0.0.0:8080/api/auth/callback", {
          host: "0.0.0.0:8080",
        }),
      ),
    ).toBe("https://example.hosted.app");
  });

  it("rewrites bind hostname to localhost as last resort", () => {
    delete process.env.BANGUMI_REDIRECT_URI;
    expect(
      getRequestOrigin(
        req("http://0.0.0.0:8080/api/auth/callback", {
          host: "0.0.0.0:8080",
        }),
      ),
    ).toBe("http://localhost:8080");
  });
});

describe("absoluteUrl", () => {
  it("builds redirect targets on the public origin", () => {
    const url = absoluteUrl(
      req("http://0.0.0.0:8080/api/auth/callback", {
        "x-forwarded-host": "app.example.com",
        "x-forwarded-proto": "https",
      }),
      "/?auth=bad_state",
    );
    expect(url.toString()).toBe("https://app.example.com/?auth=bad_state");
  });
});
