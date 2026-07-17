import Link from "next/link";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export const dynamic = "force-dynamic";

export default async function PresencePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
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
        <h1>Presence 索引</h1>
        <p>
          公开浏览已验证的 Anitabi 覆盖条目（共 {total} 部
          {city ? ` · 当前城市 ${filteredTotal} 部` : ""}）。点击地图深链跳转 Anitabi，本站不镜像
          POI 截图。
        </p>
      </div>

      <h2 className="section-title">城市</h2>
      <ul className="city-chips">
        <li className={!city ? "active" : undefined}>
          <Link href="/presence">全部 · {total}</Link>
        </li>
        {cities.map((c) => {
          const active = city === c.city;
          const href = `/presence?city=${encodeURIComponent(c.city)}`;
          return (
            <li key={c.city} className={active ? "active" : undefined}>
              <Link href={href}>
                {c.city} · {c.titleCount}
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">{city ? `${city} 的作品` : "作品"}</h2>
      {items.length === 0 ? (
        <p className="empty">
          {city
            ? `「${city}」暂无已验证条目。试试其他城市，或查看全部索引。`
            : "暂无 Presence 数据。请先运行 presence:import。"}
        </p>
      ) : (
        <ul className="lib-list">
          {items.map((item) => (
            <li key={item.subjectId} className="lib-item">
              <div>
                <strong>{item.titleCn || item.title || `#${item.subjectId}`}</strong>
                <div className="meta">
                  {item.city || "—"} · {item.pointsLength} points
                </div>
              </div>
              <div className="lib-actions">
                <span className="badge mapped">已映射</span>
                <a href={item.mapUrl} target="_blank" rel="noopener noreferrer">
                  Anitabi 地图
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="faq">
        <summary>收藏里有作品但这里没有？</summary>
        <p>
          Presence 只收录已验证
          <code>pointsLength &gt; 0</code>{" "}
          的条目。未映射不代表 Anitabi 一定没有，可能尚未探测或被风控挡住。登录后可在 Library
          对照收藏；详细 POI 请走 Anitabi 深链。
        </p>
      </details>

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/library">去 Library（登录后对照收藏）</Link>
        {" · "}
        <Link href="/trips/new">从已映射作品规划行程</Link>
      </p>
    </section>
  );
}
