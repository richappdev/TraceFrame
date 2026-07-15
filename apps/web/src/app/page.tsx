export default function HomePage() {
  return (
    <section className="hero">
      <h1>Antiable Trip</h1>
      <p>
        从 Bangumi 收藏出发，查看哪些作品在 Anitabi 有巡礼地图，再规划 1–3
        天的城市行程。
      </p>
      <div className="cta-row">
        <a className="btn btn-primary" href="/presence">
          浏览 Presence
        </a>
        <a className="btn" href="/library">
          我的 Library
        </a>
      </div>
    </section>
  );
}
