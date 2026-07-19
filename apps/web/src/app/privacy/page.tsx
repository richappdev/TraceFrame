import { getSession } from "@/lib/auth";
import { getCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function PrivacyPage() {
  const session = await getSession();
  const locale = await getLocale();
  const c = getCopy(locale).privacy;
  const analyticsDisclosure = locale === "ja-JP"
    ? "同意した場合に限り、Firebase Analytics はルート閲覧、保存、共有、Anitabi マップクリックなどの匿名イベントを収集します。Bangumi のログイン情報、OAuth トークン、共有トークンは送信しません。選択内容はこのブラウザに保存されます。"
    : locale === "zh-TW"
      ? "僅在你同意後，Firebase Analytics 才會收集路線瀏覽、儲存、分享及 Anitabi 地圖點擊等匿名事件。我們不會傳送 Bangumi 登入資料、OAuth token 或分享 token；你的選擇會儲存在此瀏覽器。"
      : "仅在你同意后，Firebase Analytics 才会收集路线浏览、保存、分享及 Anitabi 地图点击等匿名事件。我们不会发送 Bangumi 登录信息、OAuth token 或分享 token；你的选择会保存在此浏览器。";
  return (
    <section className="hero">
      <h1>{c.title}</h1>
      <p>{c.p1}</p>
      <p>{c.p2}</p>
      <p>{c.p3}</p>
      <p>{analyticsDisclosure}</p>
      {session?.user ? (
        <form action="/api/me/data" method="post">
          <label className="field">
            <span>{c.confirm}</span>
            <input name="confirm" required pattern="DELETE" autoComplete="off" />
          </label>
          <button className="btn" type="submit">{c.delete}</button>
        </form>
      ) : <p className="empty">{c.login}</p>}
    </section>
  );
}
