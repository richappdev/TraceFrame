import type { Metadata } from "next";
import { anitabiMapUrl } from "@antiable/anitabi";
import Link from "next/link";
import { AnalyticsLink } from "@/components/AnalyticsEvent";
import { LibraryRefreshWhileChecking } from "@/components/LibraryRefreshWhileChecking";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { openPresenceStore } from "@/lib/presence";
import { libraryMapState, openPresenceVerifyBackend } from "@/lib/presence-verify";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { collectionLabel, getCopy, localePath, localizedTitle, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = getCopy(locale).library;
  return buildPageMetadata({
    locale,
    path: "/library",
    title: c.title,
    description: c.loginIntro,
  });
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ mapped?: string }>;
}) {
  const session = await getSession();
  const locale = await getLocale();
  const c = getCopy(locale);
  const { configured } = getBangumiOAuthConfig();
  const params = await searchParams;
  const mappedOnly = params.mapped === "1";

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>{c.library.title}</h1>
        <p>{c.library.loginIntro}</p>
        <div className="cta-row">
          {configured ? (
            <a className="btn btn-primary" href={`/api/auth/bangumi?locale=${locale}`}>
              {c.common.login}
            </a>
          ) : (
            <span className="btn">{c.common.oauthMissing}</span>
          )}
          <Link className="btn" href={localePath(locale, "/presence")}>
            {c.library.publicIndex}
          </Link>
        </div>
      </section>
    );
  }

  const app = openAppStore();
  const presence = await openPresenceStore();
  const verify = openPresenceVerifyBackend();
  const library = await app.listLibrary(session.user.id);
  const subjectIds = library.map((item) => item.subjectId);
  const queueStatuses = await verify.getQueueStatuses(subjectIds);

  const joined = library.map((item) => {
    const p = presence.get(item.subjectId);
    const state = libraryMapState({
      presence: p,
      queueStatus: queueStatuses.get(item.subjectId),
    });
    const mapped = state === "mapped";
    return {
      ...item,
      state,
      mapped,
      title: localizedTitle(
        {
          subjectId: item.subjectId,
          title: p?.title ?? item.title,
          titleCn: p?.titleCn ?? item.titleCn,
        },
        locale,
      ),
      city: localizeCity(p?.city ?? "—", locale),
      pointsLength: p?.pointsLength ?? 0,
      mapUrl: mapped ? anitabiMapUrl(item.subjectId) : null,
    };
  });
  await app.close();
  presence.close();

  const view = mappedOnly ? joined.filter((j) => j.mapped) : joined;
  const mappedCount = joined.filter((j) => j.mapped).length;
  const checkingCount = joined.filter((j) => j.state === "checking").length;

  return (
    <section>
      <LibraryRefreshWhileChecking enabled={checkingCount > 0} />
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{session.user.nickname || session.user.username}{c.library.possessive}</h1>
        <p>
          {joined.length} {c.common.works} · {c.common.mapped} {mappedCount}
          {checkingCount > 0 ? ` · ${c.common.checking} ${checkingCount}` : ""}
          {joined.length === 0 ? ` · ${c.library.clickSync}` : ""}
        </p>
        <div className="cta-row">
          <form action="/api/me/library/sync" method="post">
            <button className="btn btn-primary" type="submit">
              {c.library.sync}
            </button>
          </form>
          <Link className="btn" href={mappedOnly ? localePath(locale, "/library") : `${localePath(locale, "/library")}?mapped=1`}>
            {mappedOnly ? c.library.showAll : c.library.mappedOnly}
          </Link>
          <Link className="btn btn-primary" href={localePath(locale, "/trips/new")}>
            {c.library.plan}
          </Link>
          <Link className="btn" href={localePath(locale, "/trips")}>
            {c.library.myTrips}
          </Link>
          <a className="btn" href={`/api/auth/logout?locale=${locale}`}>
            {c.library.logout}
          </a>
        </div>
      </div>

      {view.length === 0 ? (
        <p className="empty">{c.library.empty}</p>
      ) : (
        <ul className="lib-list">
          {view.map((item) => (
            <li key={item.subjectId} className="lib-item">
              <div>
                <strong>{item.title}</strong>
                <div className="meta">
                  {collectionLabel(item.collectionType, locale)} · {item.city}
                  {item.mapped ? ` · ${item.pointsLength} ${c.common.points}` : ""}
                </div>
              </div>
              <div className="lib-actions">
                {item.state === "mapped" ? (
                  <span className="badge mapped">{c.common.mapped}</span>
                ) : item.state === "checking" ? (
                  <span className="badge">{c.common.checking}</span>
                ) : (
                  <span className="badge">{c.common.unmapped}</span>
                )}
                {item.mapUrl ? (
                  <AnalyticsLink
                    href={item.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    eventName="anitabi_map_click"
                    eventParameters={{ subject_id: String(item.subjectId), source: "library" }}
                  >
                    {c.common.map}
                  </AnalyticsLink>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
