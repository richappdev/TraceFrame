import { CuratedTripCard } from "@/components/CuratedTripCard";
import { curatedCopy, curatedTrips, curatedTripSubjectIds } from "@/lib/curated-trips";
import { getLocale } from "@/lib/i18n-server";
import { openPresenceStore } from "@/lib/presence";

export const dynamic = "force-dynamic";

export default async function ExploreTripsPage() {
  const locale = await getLocale();
  const copy = curatedCopy(locale);
  const presence = openPresenceStore();
  const pointCounts = new Map(
    curatedTrips.map((trip) => [
      trip.slug,
      curatedTripSubjectIds(trip).reduce((sum, id) => sum + (presence.get(id)?.pointsLength ?? 0), 0),
    ]),
  );
  presence.close();

  return (
    <section>
      <div className="curated-hero">
        <p className="eyebrow">CURATED ANIME TRIPS / 01—04</p>
        <h1>{copy.galleryTitle}</h1>
        <p>{copy.galleryIntro}</p>
      </div>
      <div className="curated-grid">
        {curatedTrips.map((trip) => (
          <CuratedTripCard
            key={trip.slug}
            trip={trip}
            locale={locale}
            points={pointCounts.get(trip.slug) ?? 0}
            openLabel={copy.open}
          />
        ))}
      </div>
    </section>
  );
}
