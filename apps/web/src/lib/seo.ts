import type { Metadata } from "next";
import { getCopy, localePath, locales, type Locale } from "./i18n";
import { SITE_NAME, SITE_URL } from "./site";

const DEFAULT_OG_PATH = "/opengraph-image";

function ogLocale(locale: Locale): string {
  return locale.replace("-", "_");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, SITE_URL).toString();
}

/** hreflang map + canonical for a locale-prefixed public path. */
export function localeAlternates(locale: Locale, path = "/"): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = { "x-default": localePath("zh-CN", path) };
  for (const loc of locales) {
    languages[loc] = localePath(loc, path);
  }
  return {
    canonical: localePath(locale, path),
    languages,
  };
}

type PageMetaInput = {
  locale: Locale;
  path?: string;
  /** Short title for the `%s · AniPins` template, or pass absoluteTitle for a full document title. */
  title: string;
  description: string;
  absoluteTitle?: boolean;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  path = "/",
  title,
  description,
  absoluteTitle = false,
  image,
  imageAlt,
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(localePath(locale, path));
  const ogImage = image || absoluteUrl(DEFAULT_OG_PATH);
  const displayTitle = absoluteTitle ? title : `${title} · AniPins`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: localeAlternates(locale, path),
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: locales.filter((l) => l !== locale).map(ogLocale),
      url,
      title: displayTitle,
      description,
      images: [{ url: ogImage, alt: imageAlt || title }],
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description,
      images: [ogImage],
    },
  };
}

export function websiteJsonLd(locale: Locale) {
  const c = getCopy(locale).site;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: absoluteUrl(localePath(locale)),
        name: SITE_NAME,
        description: c.description,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        email: "app.developer.rich@gmail.com",
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        description: c.description,
        url: absoluteUrl(localePath(locale)),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };
}
