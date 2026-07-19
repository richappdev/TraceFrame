import Link from "next/link";
import { AnalyticsImpression } from "@/components/AnalyticsEvent";
import type { CuratedTrip } from "@/lib/curated-trips";
import { curatedTripSubjectIds } from "@/lib/curated-trips";
import { localePath, type Locale } from "@/lib/i18n";

export function CuratedTripCard({
  trip,
  locale,
  points,
  openLabel,
  source = "explore_gallery",
}: {
  trip: CuratedTrip;
  locale: Locale;
  points: number;
  openLabel: string;
  source?: string;
}) {
  const subjectCount = curatedTripSubjectIds(trip).length;
  return (
    <AnalyticsImpression
      name="curated_trip_impression"
      parameters={{ trip_id: trip.slug, source }}
      className={`curated-card theme-${trip.theme}`}
    >
      <Link href={localePath(locale, `/trips/explore/${trip.slug}`)}>
        <span
          className="curated-card-cover"
          role="img"
          aria-label={trip.featuredWorks[locale]}
          style={{ backgroundImage: `url(${trip.coverUrl})` }}
        />
        <span className="curated-card-code">{trip.eyebrow}</span>
        <span className="curated-card-mark" aria-hidden="true">{String(trip.days.length).padStart(2, "0")}</span>
        <h3>{trip.title[locale]}</h3>
        <p>{trip.tagline[locale]}</p>
        <span className="curated-card-works">{trip.featuredWorks[locale]}</span>
        <span className="curated-card-meta">
          {trip.days.length}D · {subjectCount} TITLES · {points} POI
        </span>
        <span className="curated-card-link">{openLabel} <span aria-hidden="true">↗</span></span>
      </Link>
    </AnalyticsImpression>
  );
}
