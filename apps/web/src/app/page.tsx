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
  const presence = openPresenceStore();
  const featuredPoints = new Map(featuredTrips.map((trip) => [
    trip.slug,
    curatedTripSubjectIds(trip).reduce((sum, id) => sum + (presence.get(id)?.pointsLength ?? 0), 0),
  ]));
  presence.close();
  const example = locale === "ja-JP"
    ? [["新宿・四谷", "君の名は。 · 8か所"], ["須賀神社", "徒歩18分 · Anitabiマップ"], ["渋谷・三軒茶屋", "天気の子 · 12か所"]]
    : locale === "zh-TW"
      ? [["新宿 · 四谷", "你的名字。 · 8 個取景點"], ["須賀神社", "步行 18 分鐘 · Anitabi 地圖"], ["澀谷 · 三軒茶屋", "天氣之子 · 12 個取景點"]]
      : [["新宿 · 四谷", "你的名字。 · 8 个取景点"], ["须贺神社", "步行 18 分钟 · Anitabi 地图"], ["涩谷 · 三轩茶屋", "天气之子 · 12 个取景点"]];
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
        <div className="hero-copy">
          <p className="eyebrow"><span>{c.home.eyebrow}</span></p>
          <p className="hero-brand">TRACEFRAME</p>
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
            <span>ROUTE / 024</span>
            <span>35.6762° N</span>
          </div>
          <div className="board-heading">
            <div>
              <span className="board-kicker">TOKYO · 2 DAYS</span>
              <h2>{c.home.exampleTitle}</h2>
            </div>
            <span className="board-stamp">DRAFT</span>
          </div>
          <ol className="route-list">
            <li>
              <span className="route-time">DAY 1</span>
              <span className="route-dot" />
              <div><strong>{example[0]![0]}</strong><small>{example[0]![1]}</small></div>
            </li>
            <li>
              <span className="route-time">DAY 1</span>
              <span className="route-dot" />
              <div><strong>{example[1]![0]}</strong><small>{example[1]![1]}</small></div>
            </li>
            <li>
              <span className="route-time">DAY 2</span>
              <span className="route-dot" />
              <div><strong>{example[2]![0]}</strong><small>{example[2]![1]}</small></div>
            </li>
          </ol>
          <div className="board-footer">
            <span>2 {c.common.works}</span><span>20 {c.common.points}</span><span>{c.shared.readonly}</span>
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
