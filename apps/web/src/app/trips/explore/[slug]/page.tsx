import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyticsEvent, AnalyticsLink } from "@/components/AnalyticsEvent";
import {
  curatedCopy,
  curatedTripSubjectIds,
  getCuratedTrip,
} from "@/lib/curated-trips";
import { getCopy, localePath, localizedTitle, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export const dynamic = "force-dynamic";

export default async function CuratedTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = getCuratedTrip(slug);
  if (!trip) notFound();

  const locale = await getLocale();
  const copy = curatedCopy(locale);
  const common = getCopy(locale).common;
  const subjectIds = curatedTripSubjectIds(trip);
  const presence = openPresenceStore();
  const titles = new Map(
    subjectIds.flatMap((id) => {
      const row = presence.get(id);
      return row ? [[id, presenceToPublic(row)] as const] : [];
    }),
  );
  presence.close();
  const points = [...titles.values()].reduce((sum, title) => sum + title.pointsLength, 0);
  const newTripPath = `${localePath(locale, "/trips/new")}?template=${encodeURIComponent(trip.slug)}`;

  return (
    <section>
      <AnalyticsEvent
        name="curated_trip_view"
        parameters={{
          trip_id: trip.slug,
          duration_days: trip.days.length,
          subject_count: subjectIds.length,
        }}
      />
      <div className={`curated-detail-hero theme-${trip.theme}`}>
        <div>
          <p className="eyebrow">{trip.eyebrow}</p>
          <h1>{trip.title[locale]}</h1>
          <p className="curated-detail-tagline">{trip.tagline[locale]}</p>
          <p>{trip.description[locale]}</p>
          <div className="cta-row">
            <AnalyticsLink
              className="btn btn-primary"
              href={newTripPath}
              eventName="trip_copy_started"
              eventParameters={{ trip_id: trip.slug, source: "curated_detail" }}
            >
              {copy.use}
            </AnalyticsLink>
            <Link className="btn" href={localePath(locale, "/trips/explore")}>{copy.viewAll}</Link>
          </div>
        </div>
        <div className="curated-ticket" aria-label={`${subjectIds.length} ${copy.works}`}>
          <span>ANIPINS / CURATED</span>
          <strong>{trip.days.length}</strong>
          <small>DAYS</small>
          <div><b>{subjectIds.length}</b> {copy.works} · <b>{points}</b> {copy.points}</div>
        </div>
      </div>

      <div className="curated-days">
        {trip.days.map((day, index) => (
          <article className="curated-day" key={`${trip.slug}-${index}`}>
            <div className="curated-day-number"><span>DAY</span>{String(index + 1).padStart(2, "0")}</div>
            <div className="curated-day-body">
              <p className="eyebrow">{localizeCity(day.city, locale)}</p>
              <h2>{day.title[locale]}</h2>
              <p>{day.description[locale]}</p>
              <ul className="lib-list">
                {day.subjectIds.map((id) => {
                  const title = titles.get(id);
                  if (!title) return null;
                  return (
                    <li className="lib-item" key={id}>
                      <div>
                        <strong>{localizedTitle(title, locale)}</strong>
                        <div className="meta">{localizeCity(title.city, locale)} · {title.pointsLength} {common.points}</div>
                      </div>
                      <AnalyticsLink
                        href={title.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        eventName="anitabi_map_click"
                        eventParameters={{ trip_id: trip.slug, subject_id: String(id), source: "curated_trip" }}
                      >
                        {common.map} ↗
                      </AnalyticsLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        ))}
      </div>
      <aside className="curated-note">{copy.note}</aside>
    </section>
  );
}
