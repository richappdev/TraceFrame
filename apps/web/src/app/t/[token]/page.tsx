import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyticsEvent, AnalyticsLink } from "@/components/AnalyticsEvent";
import { openAppStore } from "@/lib/db";
import { hydrateTrip } from "@/lib/trips";
import { getCopy, localePath, localizedTitle, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const c = getCopy(locale);
  const store = openAppStore();
  const trip = await store.getTripByShareToken(token);
  await store.close();
  if (!trip) notFound();

  const view = await hydrateTrip(trip);

  return (
    <section>
      <AnalyticsEvent
        name="trip_view"
        parameters={{
          trip_id: view.id,
          view_type: "shared",
          duration_days: view.days.length,
          subject_count: view.subjectIds.length,
          ...(view.sourceTemplate ? { template_id: view.sourceTemplate } : {}),
        }}
      />
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{view.title}</h1>
        <p>
          {c.shared.readonly} · {view.days.length} {c.common.days} · {view.subjectIds.length} {c.common.works} · {c.shared.mapNote}
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href={localePath(locale, "/trips/new")}>
            {c.shared.makeOwn}
          </Link>
          <Link className="btn" href={localePath(locale, "/presence")}>
            {c.shared.index}
          </Link>
        </div>
      </div>

      {view.days.map((day) => (
        <div key={day.day} className="trip-day">
          <h3>
            Day {day.day} · {localizeCity(day.city, locale) || c.common.unmappedCity}
          </h3>
          <ul className="lib-list">
            {day.titles.map((t) => (
              <li key={t.subjectId} className="lib-item">
                <div>
                  <strong>{localizedTitle(t, locale)}</strong>
                  <div className="meta">
                    {localizeCity(t.city, locale) || "—"} · {t.pointsLength} {c.common.points}
                  </div>
                </div>
                <div className="lib-actions">
                  <AnalyticsLink
                    href={t.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    eventName="anitabi_map_click"
                    eventParameters={{
                      trip_id: view.id,
                      subject_id: String(t.subjectId),
                      source: "shared_trip",
                      ...(view.sourceTemplate ? { template_id: view.sourceTemplate } : {}),
                    }}
                  >
                    {c.common.map}
                  </AnalyticsLink>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
