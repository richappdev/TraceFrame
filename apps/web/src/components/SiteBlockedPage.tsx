import { getCopy, type Locale } from "@/lib/i18n";

export function SiteBlockedPage({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  return (
    <div className="site-blocked">
      <p className="site-blocked-brand">ANIPINS</p>
      <h1>{c.siteBlocked.title}</h1>
      <p>{c.siteBlocked.body}</p>
    </div>
  );
}
