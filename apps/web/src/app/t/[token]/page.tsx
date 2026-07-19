import Link from "next/link";
import { notFound } from "next/navigation";
import { openAppStore } from "@/lib/db";
import { hydrateTrip } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = openAppStore();
  const trip = await store.getTripByShareToken(token);
  await store.close();
  if (!trip) notFound();

  const view = hydrateTrip(trip);

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{view.title}</h1>
        <p>
          只读分享 · {view.days.length} 天 · {view.subjectIds.length} 部 · 地图跳转 Anitabi
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/trips/new">
            自己也规划一份
          </Link>
          <Link className="btn" href="/presence">
            Presence 索引
          </Link>
        </div>
      </div>

      {view.days.map((day) => (
        <div key={day.day} className="trip-day">
          <h3>
            Day {day.day} · {day.city || "未标注城市"}
          </h3>
          <ul className="lib-list">
            {day.titles.map((t) => (
              <li key={t.subjectId} className="lib-item">
                <div>
                  <strong>{t.titleCn || t.title || `#${t.subjectId}`}</strong>
                  <div className="meta">
                    {t.city || "—"} · {t.pointsLength} points
                  </div>
                </div>
                <div className="lib-actions">
                  <a href={t.mapUrl} target="_blank" rel="noopener noreferrer">
                    Anitabi 地图
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
