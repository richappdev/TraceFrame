import { getSession } from "@/lib/auth";

export default async function PrivacyPage() {
  const session = await getSession();
  return (
    <section className="hero">
      <h1>隐私与账户数据</h1>
      <p>Traceframe 保存 Bangumi 用户标识、加密 OAuth token、收藏条目和你创建的行程。浏览器只接收 httpOnly 会话 cookie；服务不会把 OAuth token 写入 localStorage。</p>
      <p>公开分享页只显示行程元数据和 Anitabi 深链。更换或撤销分享链接后，旧链接立即失效。</p>
      <p>你可以删除账户、同步收藏和全部行程。删除不可恢复，并会同时退出登录。</p>
      {session?.user ? (
        <form action="/api/me/data" method="post">
          <label className="field">
            <span>输入 DELETE 以确认永久删除</span>
            <input name="confirm" required pattern="DELETE" autoComplete="off" />
          </label>
          <button className="btn" type="submit">永久删除我的全部数据</button>
        </form>
      ) : <p className="empty">登录后可在此删除账户数据。</p>}
    </section>
  );
}
