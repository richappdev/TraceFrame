import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIGINAL = {
  NODE_ENV: process.env.NODE_ENV,
  SESSION_SECRET: process.env.SESSION_SECRET,
  BANGUMI_CLIENT_ID: process.env.BANGUMI_CLIENT_ID,
  BANGUMI_CLIENT_SECRET: process.env.BANGUMI_CLIENT_SECRET,
  BANGUMI_REDIRECT_URI: process.env.BANGUMI_REDIRECT_URI,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configure() {
  process.env.NODE_ENV = "production";
  process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
  process.env.BANGUMI_CLIENT_ID = "client";
  process.env.BANGUMI_CLIENT_SECRET = "secret";
  process.env.BANGUMI_REDIRECT_URI =
    "https://antiable-anipin.web.app/api/auth/callback";
}

function request(host: string) {
  return new Request(`https://${host}/api/auth/bangumi`, {
    headers: {
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
    },
  });
}

describe("Bangumi OAuth canonical origin", () => {
  it("redirects alternate production hosts before setting OAuth state", () => {
    configure();
    const response = GET(request("antiable-anipin.firebaseapp.com"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://antiable-anipin.web.app/api/auth/bangumi",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("uses the configured callback on the canonical host", async () => {
    configure();
    const response = GET(request("antiable-anipin.web.app"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      "redirect_uri=https%3A%2F%2Fantiable-anipin.web.app%2Fapi%2Fauth%2Fcallback",
    );
    expect(response.headers.get("set-cookie")).toContain("__session=");
  });
});
