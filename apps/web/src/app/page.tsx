import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "连接收藏",
    body: "用 Bangumi 登录，把想看的作品变成你的巡礼候选清单。",
  },
  {
    number: "02",
    title: "确认坐标",
    body: "对照 Anitabi 已验证覆盖，按城市找到真正可以出发的作品。",
  },
  {
    number: "03",
    title: "排成旅程",
    body: "选择 1–3 天，让作品按城市成行，再微调顺序并分享给旅伴。",
  },
];

const authErrors: Record<string, string> = {
  exchange_failed: "Bangumi 暫時無法完成登入，請再試一次。",
  profile_failed: "登入已授權，但暫時無法讀取 Bangumi 帳號資料。",
  storage_failed: "登入已授權，但目前無法儲存帳號資料，請稍後再試。",
  session_failed: "無法建立登入工作階段，請稍後再試。",
  bad_state: "登入驗證已過期或無效，請重新登入。",
  missing_code: "Bangumi 沒有回傳登入授權碼，請重新登入。",
  not_configured: "Bangumi 登入尚未完成設定。",
  error: "Bangumi 已取消或拒絕這次登入。",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const authError = auth ? authErrors[auth] : undefined;

  return (
    <div className="landing">
      {authError ? (
        <aside className="auth-error" role="alert">
          <span>{authError}</span>
          <Link href="/api/auth/bangumi">重新登入 Bangumi</Link>
        </aside>
      ) : null}
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>ANIME PILGRIMAGE PLANNER</span><span>出发前的取景框</span></p>
          <h1>
            把喜欢的故事，
            <span>排进真实旅程。</span>
          </h1>
          <p className="hero-lede">
            从 Bangumi 收藏出发，筛出 Anitabi 已收录的巡礼作品，
            再把散落的坐标整理成一份清楚、可分享的城市行程。
          </p>
          <div className="cta-row hero-actions">
            <Link className="btn btn-primary" href="/trips/new">
              开始规划 <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-quiet" href="/presence">
              浏览巡礼索引
            </Link>
          </div>
          <div className="hero-proof" aria-label="产品特点">
            <span><strong>1–3</strong> 天轻行程</span>
            <span><strong>City-first</strong> 城市优先</span>
            <span><strong>Read-only</strong> 安心分享</span>
          </div>
        </div>

        <div className="route-board" aria-label="东京两日巡礼示例">
          <div className="board-topline">
            <span>ROUTE / 024</span>
            <span>35.6762° N</span>
          </div>
          <div className="board-heading">
            <div>
              <span className="board-kicker">TOKYO · 2 DAYS</span>
              <h2>东京取景散步</h2>
            </div>
            <span className="board-stamp">DRAFT</span>
          </div>
          <ol className="route-list">
            <li>
              <span className="route-time">DAY 1</span>
              <span className="route-dot" />
              <div><strong>新宿 · 四谷</strong><small>你的名字。 · 8 个取景点</small></div>
            </li>
            <li>
              <span className="route-time">DAY 1</span>
              <span className="route-dot" />
              <div><strong>须贺神社</strong><small>步行 18 分钟 · Anitabi 地图</small></div>
            </li>
            <li>
              <span className="route-time">DAY 2</span>
              <span className="route-dot" />
              <div><strong>涩谷 · 三轩茶屋</strong><small>天气之子 · 12 个取景点</small></div>
            </li>
          </ol>
          <div className="board-footer">
            <span>2 部作品</span><span>20 个坐标</span><span>可分享</span>
          </div>
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">FROM WATCHLIST TO WAYPOINTS</p>
            <h2 id="how-title">从收藏到出发，只差三步。</h2>
          </div>
          <p>不复制地图，也不替你决定旅程。Traceframe 只把作品、城市与路线线索整理到恰到好处。</p>
        </div>
        <div className="step-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="explore-banner">
        <div>
          <p className="eyebrow">NOT SURE WHERE TO GO?</p>
          <h2>先从一座城市，找到一部作品。</h2>
        </div>
        <Link className="text-link" href="/presence">打开城市索引 <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
