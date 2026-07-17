import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { openAppStore } from "@/lib/db";
import { parseSubjectIds, parseTripDays } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const session = await getSession();
  const { configured } = getBangumiOAuthConfig();

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>我的行程</h1>
        <p>登录后可查看已保存的 1–3 天巡礼草稿与分享链接。</p>
        <div className="cta-row">
          {configured ? (
            <a className="btn btn-primary" href="/api/auth/bangumi">
              使用 Bangumi 登录
            </a>
          ) : (
            <span className="btn">OAuth 未配置</span>
          )}
          <Link className="btn" href="/presence">
            先浏览 Presence
          </Link>
        </div>
      </section>
    );
  }

  const store = openAppStore();
  const trips = store.listTrips(session.user.id);
  store.close();

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>我的行程</h1>
        <p>共 {trips.length} 份草稿。分享链接为只读，不含 Anitabi POI 截图。</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/trips/new">
            规划新行程
          </Link>
          <Link className="btn" href="/library">
            Library
          </Link>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="empty">
          还没有行程。从{" "}
          <Link href="/trips/new">已映射作品</Link> 生成一份 1–3 天草稿。
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
                    <Link href={`/trips/${trip.id}`}>{trip.title}</Link>
                  </strong>
                  <div className="meta">
                    {days.length} 天 · {subjectIds.length} 部
                    {cities.length ? ` · ${cities.slice(0, 3).join(" / ")}` : ""}
                    {" · "}
                    {new Date(trip.updatedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="lib-actions">
                  <Link href={`/trips/${trip.id}`}>编辑</Link>
                  {trip.shareToken ? (
                    <Link href={`/t/${trip.shareToken}`}>分享页</Link>
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
