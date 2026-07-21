/** Canonical production origin for absolute URLs (sitemap, canonical, OG). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://antiable-anipin.web.app";

export const SITE_NAME = "AniPins";
