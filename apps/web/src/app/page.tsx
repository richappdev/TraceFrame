import Link from "next/link";
import { CuratedTripCard } from "@/components/CuratedTripCard";
import { curatedCopy, curatedTrips, curatedTripSubjectIds } from "@/lib/curated-trips";
import { getCopy, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { openPresenceStore } from "@/lib/presence";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const locale = await getLocale();
  const c = getCopy(locale);
  const curated = curatedCopy(locale);
  const featuredTrips = curatedTrips.slice(0, 3);
  const presence = await openPresenceStore();
  const featuredPoints = new Map(featuredTrips.map((trip) => [
    trip.slug,
    curatedTripSubjectIds(trip).reduce((sum, id) => sum + (presence.get(id)?.pointsLength ?? 0), 0),
  ]));
  presence.close();
  // Marketing route-board thumbs from Anitabi point screenshots (CC BY-NC-SA; demo only).
  // 160209 = 你的名字; 269235 = 天气之子 (no 三轩茶屋 point — nearest Tokyo stand-in).
  const exampleStops = locale === "ja-JP"
    ? [
      { title: "新宿・四谷", meta: "君の名は。 · 四ツ谷駅", image: "https://image.anitabi.cn/points/160209/3ik9kjlm.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
      { title: "須賀神社", meta: "徒歩18分 · 男坂", image: "https://image.anitabi.cn/points/160209/3ik9kj0a.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
      { title: "渋谷・代々木", meta: "天気の子 · 周辺スポット", image: "https://image.anitabi.cn/user/0/bangumi/269235/points/bm87q2n-1772299208216.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=269235" },
    ]
    : locale === "zh-TW"
      ? [
        { title: "新宿 · 四谷", meta: "你的名字。 · 四谷站", image: "https://image.anitabi.cn/points/160209/3ik9kjlm.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
        { title: "須賀神社", meta: "步行 18 分鐘 · 男坂", image: "https://image.anitabi.cn/points/160209/3ik9kj0a.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
        { title: "澀谷 · 代代木", meta: "天氣之子 · 鄰近取景", image: "https://image.anitabi.cn/user/0/bangumi/269235/points/bm87q2n-1772299208216.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=269235" },
      ]
      : [
        { title: "新宿 · 四谷", meta: "你的名字。 · 四谷站", image: "https://image.anitabi.cn/points/160209/3ik9kjlm.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
        { title: "须贺神社", meta: "步行 18 分钟 · 男坂", image: "https://image.anitabi.cn/points/160209/3ik9kj0a.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=160209" },
        { title: "涩谷 · 代代木", meta: "天气之子 · 邻近取景", image: "https://image.anitabi.cn/user/0/bangumi/269235/points/bm87q2n-1772299208216.jpg?plan=h360", map: "https://anitabi.cn/map?bangumiId=269235" },
      ];
  const authErrors: Record<string, string> = locale === "ja-JP" ? {
    exchange_failed: "Bangumiでログインを完了できませんでした。もう一度お試しください。", profile_failed: "Bangumiのアカウント情報を取得できませんでした。", storage_failed: "アカウント情報を保存できませんでした。", session_failed: "ログインセッションを作成できませんでした。", bad_state: "ログイン確認の有効期限が切れています。", missing_code: "Bangumiから認証コードが返されませんでした。", not_configured: "Bangumiログインが設定されていません。", error: "Bangumiログインがキャンセルされました。",
  } : locale === "zh-TW" ? {
    exchange_failed: "Bangumi 暫時無法完成登入，請再試一次。", profile_failed: "已授權登入，但暫時無法讀取 Bangumi 帳戶資料。", storage_failed: "已授權登入，但目前無法儲存帳戶資料。", session_failed: "無法建立登入工作階段。", bad_state: "登入驗證已過期或無效，請重新登入。", missing_code: "Bangumi 沒有回傳授權碼。", not_configured: "Bangumi 登入尚未完成設定。", error: "Bangumi 已取消或拒絕這次登入。",
  } : {
    exchange_failed: "Bangumi 暂时无法完成登录，请再试一次。", profile_failed: "已授权登录，但暂时无法读取 Bangumi 账号资料。", storage_failed: "已授权登录，但目前无法保存账号资料。", session_failed: "无法建立登录会话。", bad_state: "登录验证已过期或无效，请重新登录。", missing_code: "Bangumi 没有返回授权码。", not_configured: "Bangumi 登录尚未完成设置。", error: "Bangumi 已取消或拒绝这次登录。",
  };
  const authError = auth ? authErrors[auth] : undefined;

  return (
    <div className="landing">
      {authError ? (
        <aside className="auth-error" role="alert">
          <span>{authError}</span>
          <Link href={`/api/auth/bangumi?locale=${locale}`}>{c.common.login}</Link>
        </aside>
      ) : null}
      <section className="home-hero">
        <div className="hero-wash" aria-hidden="true" />
        <div className="pin-frame" aria-hidden="true">
          <span className="pf-corner pf-tl" />
          <span className="pf-corner pf-tr" />
          <span className="pf-corner pf-bl" />
          <span className="pf-corner pf-br" />
          <span className="pf-meta pf-meta-tl">MAP</span>
          <span className="pf-meta pf-meta-tr">PINS</span>
          <span className="pf-meta pf-meta-bl">CITY</span>
          <span className="pf-meta pf-meta-br">1–3D</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow"><span>{c.home.eyebrow}</span></p>
          <p className="hero-brand">ANIPINS</p>
          <h1>
            {c.home.title1}
            <span>{c.home.title2}</span>
          </h1>
          <p className="hero-lede">
            {c.home.lede}
          </p>
          <div className="cta-row hero-actions">
            <Link className="btn btn-primary" href={localePath(locale, "/trips/new")}>
              {c.home.start} <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-quiet" href={localePath(locale, "/presence")}>
              {c.home.browse}
            </Link>
          </div>
        </div>

        <div className="route-board" aria-label={c.home.example}>
          <div className="board-topline">
            <span>DESTINATION · TOKYO</span>
            <span>ROUTE / 024</span>
          </div>
          <div className="board-heading">
            <div>
              <span className="board-kicker">ITINERARY · 2 DAYS</span>
              <h2>{c.home.exampleTitle}</h2>
            </div>
            <span className="board-stamp">DRAFT</span>
          </div>
          <ol className="route-list">
            {exampleStops.map((stop, index) => (
              <li key={stop.image}>
                <span className="route-time">{index < 2 ? "DAY 1" : "DAY 2"}</span>
                <span className="route-dot" />
                <div className="route-stop">
                  <a className="route-thumb-link" href={stop.map} rel="noopener noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="route-thumb" src={stop.image} alt={stop.title} width={104} height={104} loading="lazy" decoding="async" />
                  </a>
                  <div>
                    <strong>{stop.title}</strong>
                    <small>{stop.meta}</small>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="board-credit">
            {locale === "ja-JP"
              ? "写真：Anitabi 貢献者（CC BY-NC-SA）"
              : locale === "zh-TW"
                ? "照片：Anitabi 貢獻者（CC BY-NC-SA）"
                : "照片：Anitabi 贡献者（CC BY-NC-SA）"}
          </p>
          <div className="board-footer">
            <span>COLLECT MOMENTS</span>
            <span>2 {c.common.works} · 20 {c.common.points}</span>
          </div>
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">FROM WATCHLIST TO WAYPOINTS</p>
            <h2 id="how-title">{c.home.stepTitle}</h2>
          </div>
          <p>{c.home.stepIntro}</p>
        </div>
        <ol className="step-list">
          {c.home.steps.map((step, index) => (
            <li className="step-row" key={index}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step[0]}</h3>
                <p>{step[1]}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="curated-feature" aria-labelledby="curated-title">
        <div className="curated-feature-head">
          <div>
            <p className="eyebrow">READY-MADE ROUTES / EDITOR&apos;S PICKS</p>
            <h2 id="curated-title">{curated.featured}</h2>
          </div>
          <Link className="text-link" href={localePath(locale, "/trips/explore")}>{curated.viewAll} ↗</Link>
        </div>
        <div className="curated-mini-grid">
          {featuredTrips.map((trip) => (
            <CuratedTripCard
              key={trip.slug}
              trip={trip}
              locale={locale}
              points={featuredPoints.get(trip.slug) ?? 0}
              openLabel={curated.open}
              source="homepage"
            />
          ))}
        </div>
      </section>

      <section className="explore-banner">
        <div>
          <p className="eyebrow">NOT SURE WHERE TO GO?</p>
          <h2>{c.home.explore}</h2>
        </div>
        <Link className="text-link" href={localePath(locale, "/trips/explore")}>{curated.viewAll} <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
