import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCopy, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = getCopy(locale).site;
  return {
    title: { default: c.title, template: `%s · Traceframe` },
    description: c.description,
    alternates: {
      languages: {
        "zh-CN": localePath("zh-CN"),
        "zh-TW": localePath("zh-TW"),
        "ja-JP": localePath("ja-JP"),
      },
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const c = getCopy(locale).site;
  return (
    <html lang={locale}>
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <a className="brand" href={localePath(locale)} aria-label={c.home}>
                <span className="brand-mark" aria-hidden="true"><i /></span>
                <span>TRACEFRAME<small>{c.tagline}</small></span>
              </a>
              <nav className="nav" aria-label={c.nav}>
                <a href={localePath(locale, "/presence")}>{c.discover}</a>
                <a href={localePath(locale, "/library")}>{c.library}</a>
                <a href={localePath(locale, "/trips")}>{c.trips}</a>
                <a href={localePath(locale, "/data-policy")}>{c.policy}</a>
              </nav>
              <a className="nav-cta" href={localePath(locale, "/trips/new")}>{c.plan} <span aria-hidden="true">↗</span></a>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="footer-inner">
              <div>
                <a className="footer-brand" href={localePath(locale)}>TRACEFRAME</a>
                <p>{c.footer}</p>
              </div>
              <p className="data-credit">
                {locale === "ja-JP" ? "地図データ：" : locale === "zh-TW" ? "地圖資料來自 " : "地图数据来自 "}
                <a href="https://anitabi.cn" rel="noopener noreferrer" target="_blank">Anitabi</a>
                {locale === "ja-JP" ? " contributors（CC BY-NC-SA）、作品データ：" : " 贡献者，CC BY-NC-SA · "}
                <a href="https://bgm.tv" rel="noopener noreferrer" target="_blank">Bangumi</a>
              </p>
              <p className="data-credit">
                <a href={localePath(locale, "/privacy")}>{c.privacy}</a> · <a href={localePath(locale, "/data-policy")}>{c.license}</a>
              </p>
              <LanguageSwitcher locale={locale} label={c.language} />
              <p className="footer-code">TF / 2026</p>
            </div>
          </footer>
          <AnalyticsConsent locale={locale} />
        </div>
      </body>
    </html>
  );
}
