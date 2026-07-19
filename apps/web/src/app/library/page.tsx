import { anitabiMapUrl } from "@antiable/anitabi";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { openPresenceStore } from "@/lib/presence";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ mapped?: string }>;
}) {
  const session = await getSession();
  const { configured } = getBangumiOAuthConfig();
  const params = await searchParams;
  const mappedOnly = params.mapped === "1";

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>Library</h1>
        <p>登录 Bangumi 后，可查看收藏中哪些作品在 Anitabi 有巡礼地图覆盖。</p>
        <div className="cta-row">
          {configured ? (
            <a className="btn btn-primary" href="/api/auth/bangumi">
              使用 Bangumi 登录
            </a>
          ) : (
            <span className="btn">OAuth 未配置（见 apps/web/.env.example）</span>
          )}
          <Link className="btn" href="/presence">
            先浏览公开 Presence 索引
          </Link>
        </div>
      </section>
    );
  }

  const app = openAppStore();
  const presence = openPresenceStore();
  const library = await app.listLibrary(session.user.id);
  const joined = library.map((item) => {
    const p = presence.get(item.subjectId);
    const mapped = p != null && p.pointsLength > 0;
    return {
      ...item,
      mapped,
      title: p?.titleCn || p?.title || `#${item.subjectId}`,
      city: p?.city ?? "—",
      pointsLength: p?.pointsLength ?? 0,
      mapUrl: mapped ? anitabiMapUrl(item.subjectId) : null,
    };
  });
  await app.close();
  presence.close();

  const view = mappedOnly ? joined.filter((j) => j.mapped) : joined;
  const mappedCount = joined.filter((j) => j.mapped).length;

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{session.user.nickname || session.user.username} 的收藏</h1>
        <p>
          共 {joined.length} 部动画 · 已映射 {mappedCount} 部
          {joined.length === 0 ? " · 点击同步从 Bangumi 拉取收藏" : ""}
        </p>
        <div className="cta-row">
          <form action="/api/me/library/sync" method="post">
            <button className="btn btn-primary" type="submit">
              同步收藏
            </button>
          </form>
          <Link className="btn" href={mappedOnly ? "/library" : "/library?mapped=1"}>
            {mappedOnly ? "显示全部" : "仅看已映射"}
          </Link>
          <Link className="btn btn-primary" href="/trips/new">
            规划行程
          </Link>
          <Link className="btn" href="/trips">
            我的行程
          </Link>
          <a className="btn" href="/api/auth/logout">
            退出
          </a>
        </div>
      </div>

      {view.length === 0 ? (
        <p className="empty">暂无条目。请先同步收藏，或关闭「仅看已映射」筛选。</p>
      ) : (
        <ul className="lib-list">
          {view.map((item) => (
            <li key={item.subjectId} className="lib-item">
              <div>
                <strong>{item.title}</strong>
                <div className="meta">
                  {item.collectionType} · {item.city}
                  {item.mapped ? ` · ${item.pointsLength} points` : ""}
                </div>
              </div>
              <div className="lib-actions">
                {item.mapped ? (
                  <span className="badge mapped">已映射</span>
                ) : (
                  <span className="badge">未映射</span>
                )}
                {item.mapUrl ? (
                  <a href={item.mapUrl} target="_blank" rel="noopener noreferrer">
                    Anitabi 地图
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
