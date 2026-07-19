import { afterEach, describe, expect, it } from "vitest";
import { validateProductionConfiguration } from "./runtime-readiness";

const ORIGINAL = {
  NODE_ENV: process.env.NODE_ENV,
  APP_STORE: process.env.APP_STORE,
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

function configureProduction() {
  process.env.NODE_ENV = "production";
  process.env.APP_STORE = "firestore";
  process.env.SESSION_SECRET = "unit-test-session-secret-32chars!!";
  process.env.BANGUMI_CLIENT_ID = "client";
  process.env.BANGUMI_CLIENT_SECRET = "secret";
  process.env.BANGUMI_REDIRECT_URI =
    "https://antiable-anipin.web.app/api/auth/callback";
}

describe("production readiness configuration", () => {
  it("accepts a complete production configuration", () => {
    configureProduction();
    expect(() => validateProductionConfiguration()).not.toThrow();
  });

  it("rejects ephemeral storage and weak secrets", () => {
    configureProduction();
    process.env.APP_STORE = "sqlite";
    expect(() => validateProductionConfiguration()).toThrow(/APP_STORE=firestore/);
    process.env.APP_STORE = "firestore";
    process.env.SESSION_SECRET = "short";
    expect(() => validateProductionConfiguration()).toThrow(/at least 32 characters/);
  });

  it("requires a canonical HTTPS OAuth callback", () => {
    configureProduction();
    process.env.BANGUMI_REDIRECT_URI = "http://localhost:3000/wrong";
    expect(() => validateProductionConfiguration()).toThrow(/HTTPS/);
  });
});
