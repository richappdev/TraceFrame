import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { hydrateTrip } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const store = openAppStore();
  const trip = store.getTrip(id);
  store.close();

  if (!trip) notFound();
  if (!session?.user || session.user.id !== trip.ownerId) {
    if (trip.shareToken) {
      return (
        <section className="hero">
          <h1>需要访问权限</h1>
          <p>此行程仅所有者可编辑。若你有分享链接，请打开只读分享页。</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href={`/t/${trip.shareToken}`}>
              打开分享页
            </Link>
            <Link className="btn" href="/api/auth/bangumi">
              登录
            </Link>
          </div>
        </section>
      );
    }
    notFound();
  }

  const view = hydrateTrip(trip);
  const sharePath = view.shareToken ? `/t/${view.shareToken}` : null;

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{view.title}</h1>
        <p>
          {view.days.length} 天 · {view.subjectIds.length} 部作品 · 城市级草稿（M2）
        </p>
        <div className="cta-row">
          <Link className="btn" href="/trips/new">
            再规划一份
          </Link>
          <Link className="btn" href="/library">
            Library
          </Link>
        </div>
      </div>

      {sharePath ? (
        <div className="share-box">
          只读分享：{" "}
          <Link href={sharePath}>{sharePath}</Link>
        </div>
      ) : null}

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
