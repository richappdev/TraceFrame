import { describe, expect, it } from "vitest";
import { hasAnalyticsConfig } from "./analytics";

describe("hasAnalyticsConfig", () => {
  it("requires the four fields used by Firebase Analytics", () => {
    expect(hasAnalyticsConfig({
      apiKey: "key",
      appId: "app",
      measurementId: "G-TEST",
      projectId: "project",
    })).toBe(true);
  });

  it("keeps analytics disabled for incomplete deployments", () => {
    expect(hasAnalyticsConfig({ projectId: "project" })).toBe(false);
  });
});
