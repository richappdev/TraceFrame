import { getApps, initializeApp } from "firebase-admin/app";
import { getRemoteConfig } from "firebase-admin/remote-config";
import {
  SITE_ACCESS_BLOCKED_KEY,
  SITE_ACCESS_CACHE_TTL_MS,
} from "./site-access-constants";

export { SITE_ACCESS_BLOCKED_KEY, SITE_ACCESS_CACHE_TTL_MS } from "./site-access-constants";

type CacheEntry = { value: boolean; expiresAt: number };

let cache: CacheEntry | null = null;
let fetchImpl: (() => Promise<unknown>) | null = null;

export function resetSiteAccessCache(): void {
  cache = null;
}

/** Test hook: override the Remote Config fetch, or pass null to restore default. */
export function setSiteAccessFetcherForTests(fn: (() => Promise<unknown>) | null): void {
  fetchImpl = fn;
  resetSiteAccessCache();
}

export function parseSiteAccessBlocked(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

async function fetchSiteAccessBlockedFromRemoteConfig(): Promise<boolean> {
  const app = getApps()[0] ?? initializeApp();
  const template = await getRemoteConfig(app).getServerTemplate({
    defaultConfig: { [SITE_ACCESS_BLOCKED_KEY]: false },
  });
  return template.evaluate().getBoolean(SITE_ACCESS_BLOCKED_KEY);
}

/**
 * True when Firebase Remote Config `site_access_blocked` is enabled.
 * Fail-open: missing credentials, network errors, or parse issues → false.
 * Result is cached in-process for {@link SITE_ACCESS_CACHE_TTL_MS}.
 */
export async function isSiteAccessBlocked(): Promise<boolean> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  let value = false;
  try {
    value = parseSiteAccessBlocked(await (fetchImpl ?? fetchSiteAccessBlockedFromRemoteConfig)());
  } catch {
    value = false;
  }

  cache = { value, expiresAt: now + SITE_ACCESS_CACHE_TTL_MS };
  return value;
}
