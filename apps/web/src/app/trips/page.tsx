import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { openAppStore } from "@/lib/db";
import { parseSubjectIds, parseTripDays } from "@/lib/trips";
import { formatDateTime, getCopy, localePath, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = getCopy(locale).trips;
  return buildPageMetadata({
    locale,
    path: "/trips",
    title: c.title,
    description: c.loginIntro,
  });
}

export default async function TripsPage() {
  const session = await getSession();
  const locale = await getLocale();
  const c = getCopy(locale);
  const { configured } = getBangumiOAuthConfig();

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>{c.trips.title}</h1>
        <p>{c.trips.loginIntro}</p>
        <div className="cta-row">
          {configured ? (
            <a className="btn btn-primary" href={`/api/auth/bangumi?locale=${locale}`}>
              {c.common.login}
            </a>
          ) : (
            <span className="btn">{c.common.oauthMissing}</span>
          )}
          <Link className="btn" href={localePath(locale, "/presence")}>
            {c.common.browsePresence}
          </Link>
        </div>
      </section>
    );
  }

  const store = openAppStore();
  const trips = await store.listTrips(session.user.id);
  await store.close();

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{c.trips.title}</h1>
        <p>{trips.length} · {c.trips.intro}</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href={localePath(locale, "/trips/new")}>
            {c.trips.new}
          </Link>
          <Link className="btn" href={localePath(locale, "/library")}>
            Library
          </Link>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="empty">
          {c.trips.empty} <Link href={localePath(locale, "/trips/new")}>{c.trips.emptyAction}</Link>
        </p>
      ) : (
        <ul className="lib-list">
          {trips.map((trip) => {
            const days = parseTripDays(trip.daysJson);
            const subjectIds = parseSubjectIds(trip.subjectIdsJson);
            const cities = [...new Set(days.map((d) => d.city).filter(Boolean))];
            return (
              <li key={trip.id} className="lib-item">
                <div>
                  <strong>
                    <Link href={localePath(locale, `/trips/${trip.id}`)}>{trip.title}</Link>
                  </strong>
                  <div className="meta">
                    {days.length} {c.common.days} · {subjectIds.length} {c.common.works}
                    {cities.length ? ` · ${cities.slice(0, 3).map((city) => localizeCity(city, locale)).join(" / ")}` : ""}
                    {" · "}
                    {formatDateTime(trip.updatedAt, locale)}
                  </div>
                </div>
                <div className="lib-actions">
                  <Link href={localePath(locale, `/trips/${trip.id}`)}>{c.common.edit}</Link>
                  {trip.shareToken ? (
                    <Link href={localePath(locale, `/t/${trip.shareToken}`)}>{c.common.sharePage}</Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
