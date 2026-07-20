import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSiteAccessBlocked,
  parseSiteAccessBlocked,
  resetSiteAccessCache,
  setSiteAccessFetcherForTests,
  SITE_ACCESS_CACHE_TTL_MS,
} from "./site-access";

describe("parseSiteAccessBlocked", () => {
  it("treats boolean and common string/number forms as blocked", () => {
    expect(parseSiteAccessBlocked(true)).toBe(true);
    expect(parseSiteAccessBlocked("true")).toBe(true);
    expect(parseSiteAccessBlocked("TRUE")).toBe(true);
    expect(parseSiteAccessBlocked("1")).toBe(true);
    expect(parseSiteAccessBlocked(1)).toBe(true);
  });

  it("fail-opens on falsey or unknown values", () => {
    expect(parseSiteAccessBlocked(false)).toBe(false);
    expect(parseSiteAccessBlocked("false")).toBe(false);
    expect(parseSiteAccessBlocked("0")).toBe(false);
    expect(parseSiteAccessBlocked(0)).toBe(false);
    expect(parseSiteAccessBlocked(null)).toBe(false);
    expect(parseSiteAccessBlocked(undefined)).toBe(false);
    expect(parseSiteAccessBlocked({})).toBe(false);
  });
});

describe("isSiteAccessBlocked", () => {
  afterEach(() => {
    setSiteAccessFetcherForTests(null);
    resetSiteAccessCache();
    vi.useRealTimers();
  });

  it("returns the fetcher value and caches it within the TTL", async () => {
    const fetch = vi.fn().mockResolvedValue(true);
    setSiteAccessFetcherForTests(fetch);

    expect(await isSiteAccessBlocked()).toBe(true);
    expect(await isSiteAccessBlocked()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refetches after the cache TTL expires", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    setSiteAccessFetcherForTests(fetch);

    expect(await isSiteAccessBlocked()).toBe(true);
    vi.advanceTimersByTime(SITE_ACCESS_CACHE_TTL_MS + 1);
    expect(await isSiteAccessBlocked()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fail-opens when the fetcher throws", async () => {
    setSiteAccessFetcherForTests(async () => {
      throw new Error("remote config unavailable");
    });
    expect(await isSiteAccessBlocked()).toBe(false);
  });

  it("normalizes string results from the fetcher", async () => {
    setSiteAccessFetcherForTests(async () => "true");
    expect(await isSiteAccessBlocked()).toBe(true);
  });
});
