import type { MetadataRoute } from "next";
import { curatedTrips } from "@/lib/curated-trips";
import { localePath, locales } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/seo";

const PUBLIC_PATHS = [
  "/",
  "/presence",
  "/trips/explore",
  "/privacy",
  "/data-policy",
  "/library",
  "/trips",
  "/trips/new",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of PUBLIC_PATHS) {
      const isHome = path === "/";
      entries.push({
        url: absoluteUrl(localePath(locale, path)),
        lastModified: now,
        changeFrequency: isHome ? "weekly" : "weekly",
        priority: isHome ? 1 : path === "/trips/explore" || path === "/presence" ? 0.8 : 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [loc, absoluteUrl(localePath(loc, path))]),
          ),
        },
      });
    }

    for (const trip of curatedTrips) {
      const path = `/trips/explore/${trip.slug}`;
      entries.push({
        url: absoluteUrl(localePath(locale, path)),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [loc, absoluteUrl(localePath(loc, path))]),
          ),
        },
      });
    }
  }

  return entries;
}
