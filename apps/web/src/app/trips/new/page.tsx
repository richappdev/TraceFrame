import Link from "next/link";
import { TrackedTripForm } from "@/components/AnalyticsEvent";
import { getSession } from "@/lib/auth";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { curatedTripSubjectIds, getCuratedTrip } from "@/lib/curated-trips";
import { openAppStore } from "@/lib/db";
import { openPresenceStore } from "@/lib/presence";
import { getCopy, localePath, localizedTitle, localizeCity } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; template?: string }>;
}) {
  const session = await getSession();
  const locale = await getLocale();
  const c = getCopy(locale);
  const { configured } = getBangumiOAuthConfig();
  const params = await searchParams;
  const template = params.template ? getCuratedTrip(params.template) : undefined;
  const templateIds = new Set(template ? curatedTripSubjectIds(template) : []);
  const templatePath = template
    ? `${localePath(locale, "/trips/new")}?template=${encodeURIComponent(template.slug)}`
    : localePath(locale, "/trips/new");

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>{c.newTrip.title}</h1>
        <p>{c.newTrip.loginIntro}</p>
        <div className="cta-row">
          {configured ? (
            <a className="btn btn-primary" href={`/api/auth/bangumi?locale=${locale}&next=${encodeURIComponent(templatePath)}`}>
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

  const app = openAppStore();
  const presence = openPresenceStore();
  const library = await app.listLibrary(session.user.id);
  const mapped = library
    .map((item) => {
      const p = presence.get(item.subjectId);
      if (!p || p.pointsLength <= 0) return null;
      return {
        subjectId: item.subjectId,
        title: localizedTitle(p, locale),
        city: localizeCity(p.city || "—", locale),
        pointsLength: p.pointsLength,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // Fallback: if library empty/unmapped, offer public presence seed titles.
  const fallback =
    mapped.length === 0
      ? presence.list({ limit: 50 }).map((p) => ({
          subjectId: p.subjectId,
          title: localizedTitle(p, locale),
          city: localizeCity(p.city || "—", locale),
          pointsLength: p.pointsLength,
        }))
      : [];
  const basePicks = mapped.length > 0 ? mapped : fallback;
  const templatePicks = template
    ? curatedTripSubjectIds(template).flatMap((subjectId) => {
        const p = presence.get(subjectId);
        return p && p.pointsLength > 0
          ? [{
              subjectId,
              title: localizedTitle(p, locale),
              city: localizeCity(p.city || "", locale),
              pointsLength: p.pointsLength,
            }]
          : [];
      })
    : [];
  const picksById = new Map(basePicks.map((pick) => [pick.subjectId, pick]));
  for (const pick of templatePicks) picksById.set(pick.subjectId, pick);
  const picks = [...picksById.values()];
  const usingFallback = mapped.length === 0 && fallback.length > 0;

  await app.close();
  presence.close();

  const errorMsg = params.error && params.error in c.newTrip.errors
    ? c.newTrip.errors[params.error as keyof typeof c.newTrip.errors]
    : null;

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{c.newTrip.title}</h1>
        <p>{c.newTrip.intro}</p>
      </div>

      {errorMsg ? <p className="empty">{errorMsg}</p> : null}

      {picks.length === 0 ? (
        <p className="empty">
          {c.newTrip.noPicks} <Link href={localePath(locale, "/library")}>Library</Link>
        </p>
      ) : (
        <TrackedTripForm templateId={template?.slug}>
          {template ? <input type="hidden" name="template" value={template.slug} /> : null}
          {usingFallback ? (
            <p className="empty">
              {c.newTrip.fallback}
            </p>
          ) : null}

          <label className="field">
            {c.newTrip.tripTitle}
            <input type="text" name="title" defaultValue={template?.title[locale] ?? c.editor.defaultTitle} placeholder={c.newTrip.placeholder} maxLength={80} />
          </label>

          <label className="field">
            {c.newTrip.dayCount}
            <select name="dayCount" defaultValue={String(template?.days.length ?? 2)}>
              <option value="1">1 {c.common.days}</option>
              <option value="2">2 {c.common.days}</option>
              <option value="3">3 {c.common.days}</option>
            </select>
          </label>

          <div>
            <h2 className="section-title">{c.newTrip.choose}</h2>
            <ul className="pick-list">
              {picks.map((item) => (
                <li key={item.subjectId}>
                  <label>
                    <input type="checkbox" name="subjectId" value={item.subjectId} defaultChecked={templateIds.has(item.subjectId)} />
                    <span>
                      <strong>{item.title}</strong>
                      <div className="meta">
                        {item.city} · {item.pointsLength} {c.common.points}
                      </div>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="cta-row">
            <button className="btn btn-primary" type="submit">
              {c.newTrip.generate}
            </button>
            <Link className="btn" href={localePath(locale, "/library")}>
              {c.newTrip.back}
            </Link>
          </div>
        </TrackedTripForm>
      )}
    </section>
  );
}
