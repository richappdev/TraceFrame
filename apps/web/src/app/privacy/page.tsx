import { getSession } from "@/lib/auth";
import { getCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function PrivacyPage() {
  const session = await getSession();
  const c = getCopy(await getLocale()).privacy;
  return (
    <section className="hero">
      <h1>{c.title}</h1>
      <p>{c.p1}</p>
      <p>{c.p2}</p>
      <p>{c.p3}</p>
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
