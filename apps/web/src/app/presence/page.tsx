import Link from "next/link";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export const dynamic = "force-dynamic";

export default function PresencePage() {
  const store = openPresenceStore();
  const items = store.list({ limit: 100 }).map(presenceToPublic);
  const cities = store.cityStats(30);
  const total = store.count();
  store.close();

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>Presence 索引</h1>
        <p>
          公开浏览已验证的 Anitabi 覆盖条目（{total} 部）。点击地图深链跳转 Anitabi，本站不镜像 POI
          截图。
        </p>
      </div>

      <h2 className="section-title">城市</h2>
      <ul className="city-chips">
        {cities.map((c) => (
          <li key={c.city}>
            <span>
              {c.city} · {c.titleCount}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="section-title">作品</h2>
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

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/library">去 Library（登录后对照收藏）</Link>
      </p>
    </section>
  );
}
