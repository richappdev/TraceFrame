import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { openAppStore } from "@/lib/db";
import { openPresenceStore } from "@/lib/presence";

export const dynamic = "force-dynamic";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { configured } = getBangumiOAuthConfig();
  const params = await searchParams;

  if (!session?.user) {
    return (
      <section className="hero">
        <h1>规划行程</h1>
        <p>登录后可从已映射收藏生成 1–3 天城市级巡礼草稿，并分享只读链接。</p>
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

  const app = openAppStore();
  const presence = openPresenceStore();
  const library = app.listLibrary(session.user.id);
  const mapped = library
    .map((item) => {
      const p = presence.get(item.subjectId);
      if (!p || p.pointsLength <= 0) return null;
      return {
        subjectId: item.subjectId,
        title: p.titleCn || p.title || `#${item.subjectId}`,
        city: p.city || "—",
        pointsLength: p.pointsLength,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // Fallback: if library empty/unmapped, offer public presence seed titles.
  const fallback =
    mapped.length === 0
      ? presence.list({ limit: 50 }).map((p) => ({
          subjectId: p.subjectId,
          title: p.titleCn || p.title || `#${p.subjectId}`,
          city: p.city || "—",
          pointsLength: p.pointsLength,
        }))
      : [];
  const picks = mapped.length > 0 ? mapped : fallback;
  const usingFallback = mapped.length === 0 && fallback.length > 0;

  app.close();
  presence.close();

  const errorMsg =
    params.error === "empty"
      ? "请至少选择一部已映射作品。"
      : params.error === "unmapped"
        ? "所选作品在 Presence 中均无覆盖。"
        : params.error === "failed"
          ? "创建失败，请稍后重试。"
          : null;

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>规划行程</h1>
        <p>
          选择已映射作品，按城市自动分到 1–3 天。行程只保存元数据与 Anitabi 深链，不镜像 POI
          截图。
        </p>
      </div>

      {errorMsg ? <p className="empty">{errorMsg}</p> : null}

      {picks.length === 0 ? (
        <p className="empty">
          暂无可用作品。请先{" "}
          <Link href="/library">同步 Library</Link>，或等待 Presence 索引导入。
        </p>
      ) : (
        <form className="trip-form" action="/api/trips" method="post">
          {usingFallback ? (
            <p className="empty">
              收藏中尚无已映射作品，已改用公开 Presence 索引供试填。建议先同步 Library。
            </p>
          ) : null}

          <label className="field">
            行程标题
            <input type="text" name="title" placeholder="例如：东京两日巡礼" maxLength={80} />
          </label>

          <label className="field">
            天数
            <select name="dayCount" defaultValue="2">
              <option value="1">1 天</option>
              <option value="2">2 天</option>
              <option value="3">3 天</option>
            </select>
          </label>

          <div>
            <h2 className="section-title">选择作品</h2>
            <ul className="pick-list">
              {picks.map((item) => (
                <li key={item.subjectId}>
                  <label>
                    <input type="checkbox" name="subjectId" value={item.subjectId} />
                    <span>
                      <strong>{item.title}</strong>
                      <div className="meta">
                        {item.city} · {item.pointsLength} points
                      </div>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="cta-row">
            <button className="btn btn-primary" type="submit">
              生成行程
            </button>
            <Link className="btn" href="/library">
              返回 Library
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
