import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Source_Sans_3, Syne } from "next/font/google";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SiteAccessWatcher } from "@/components/SiteAccessWatcher";
import { SiteBlockedPage } from "@/components/SiteBlockedPage";
import { getCopy, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { isSiteAccessBlocked } from "@/lib/site-access";
import "./globals.css";

const fontDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
  weight: ["600", "700", "800"],
});

const fontBody = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
  weight: ["400", "600", "700"],
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
  weight: ["500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const blocked = await isSiteAccessBlocked();
  const c = getCopy(locale);
  if (blocked) {
    return {
      metadataBase: new URL(SITE_URL),
      title: c.siteBlocked.title,
      description: c.siteBlocked.body,
      robots: { index: false, follow: false },
    };
  }
  const page = buildPageMetadata({
    locale,
    path: "/",
    title: c.site.title,
    description: c.site.description,
    absoluteTitle: true,
  });
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "AniPins",
    ...page,
    // Keep template for child routes; home uses the absolute site title from buildPageMetadata.
    title: { default: c.site.title, template: `%s · AniPins` },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const c = getCopy(locale).site;
  const blocked = await isSiteAccessBlocked();
  const fontClass = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`;

  if (blocked) {
    return (
      <html lang={locale} className={fontClass}>
        <body>
          <div className="shell shell-blocked">
            <SiteBlockedPage locale={locale} />
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={locale} className={fontClass}>
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <a className="brand" href={localePath(locale)} aria-label={c.home}>
                <span className="brand-mark" aria-hidden="true"><i /></span>
                <span>ANIPINS<small>{c.tagline}</small></span>
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
                <a className="footer-brand" href={localePath(locale)}>ANIPINS</a>
                <p>{c.footer}</p>
                <p className="footer-contact">
                  {c.contact}{" "}
                  <a href="mailto:app.developer.rich@gmail.com">app.developer.rich@gmail.com</a>
                </p>
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
              <p className="footer-code">AP / 2026</p>
            </div>
          </footer>
          <AnalyticsConsent locale={locale} />
          <SiteAccessWatcher />
        </div>
      </body>
    </html>
  );
}
