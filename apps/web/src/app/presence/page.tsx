import Link from "next/link";
import { AnalyticsLink } from "@/components/AnalyticsEvent";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";
import { getCopy, localePath, localizedTitle, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function PresencePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const c = getCopy(locale);
  const city = params.city?.trim() || undefined;

  const store = openPresenceStore();
  const items = store.list({ limit: 100, city }).map(presenceToPublic);
  const cities = store.cityStats(30);
  const total = store.count();
  const filteredTotal = city ? store.count({ city }) : total;
  store.close();

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{c.presence.title}</h1>
        <p>
          {c.presence.intro} ({total} {c.common.works}{city ? ` · ${filteredTotal} ${c.common.works}` : ""})
        </p>
      </div>

      <h2 className="section-title">{c.presence.cities}</h2>
      <ul className="city-chips">
        <li className={!city ? "active" : undefined}>
          <Link href={localePath(locale, "/presence")}>{c.common.all} · {total}</Link>
        </li>
        {cities.map((c) => {
          const active = city === c.city;
          const href = `${localePath(locale, "/presence")}?city=${encodeURIComponent(c.city)}`;
          return (
            <li key={c.city} className={active ? "active" : undefined}>
              <Link href={href}>
                {localizeCity(c.city, locale)} · {c.titleCount}
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">{city ? `${localizeCity(city, locale)} · ${c.presence.works}` : c.presence.works}</h2>
      {items.length === 0 ? (
        <p className="empty">
          {city ? c.presence.noCity : c.presence.noData}
        </p>
      ) : (
        <ul className="lib-list">
          {items.map((item) => (
            <li key={item.subjectId} className="lib-item">
              <div>
                <strong>{localizedTitle(item, locale)}</strong>
                <div className="meta">
                  {localizeCity(item.city, locale) || "—"} · {item.pointsLength} {c.common.points}
                </div>
              </div>
              <div className="lib-actions">
                <span className="badge mapped">{c.common.mapped}</span>
                <AnalyticsLink
                  href={item.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  eventName="anitabi_map_click"
                  eventParameters={{ subject_id: String(item.subjectId), source: "presence" }}
                >
                  {c.common.map}
                </AnalyticsLink>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="faq">
        <summary>{c.presence.faq}</summary>
        <p>{c.presence.faqBody}</p>
      </details>

      <p style={{ marginTop: "1.5rem" }}>
        <Link href={localePath(locale, "/library")}>{c.presence.goLibrary}</Link>
        {" · "}
        <Link href={localePath(locale, "/trips/new")}>{c.presence.plan}</Link>
      </p>
    </section>
  );
}
