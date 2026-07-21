import { NextRequest, NextResponse } from "next/server";
import {
  acceptLanguageFromHeaders,
  defaultLocale,
  detectLocale,
  isLocale,
  localeFromPathname,
  localeFromSessionCookie,
  localePreferenceValue,
  SESSION_COOKIE_NAME,
} from "./lib/i18n";

const pageRoots = ["/", "/presence", "/library", "/trips", "/privacy", "/data-policy", "/t"];

function isPagePath(pathname: string): boolean {
  return pageRoots.some((root) => root === "/" ? pathname === "/" : pathname === root || pathname.startsWith(`${root}/`));
}

function localePreferenceCookieOptions(maxAgeSec = 31536000) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge: maxAgeSec,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  const routeLocale = segments[0];
  const sessionValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const savedLocale = localeFromSessionCookie(sessionValue);

  if (isLocale(routeLocale)) {
    const publicPath = `/${segments.slice(1).join("/")}` || "/";
    if (!isPagePath(publicPath)) return NextResponse.next();
    url.pathname = publicPath;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-anipins-locale", routeLocale);
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    // Only write locale preference when `__session` is empty or already a locale
    // preference — never clobber auth or OAuth CSRF payloads.
    if (!sessionValue || savedLocale) {
      response.cookies.set(SESSION_COOKIE_NAME, localePreferenceValue(routeLocale), localePreferenceCookieOptions());
      // Locale is already encoded in the URL, so CDN can cache the rewritten HTML.
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600",
      );
    }
    return response;
  }

  if (!isPagePath(url.pathname)) return NextResponse.next();
  let refererLocale = null;
  try {
    refererLocale = localeFromPathname(new URL(request.headers.get("referer") ?? "").pathname);
  } catch { /* no usable same-origin referrer */ }
  const locale = refererLocale
    ?? savedLocale
    ?? detectLocale(acceptLanguageFromHeaders((name) => request.headers.get(name)))
    ?? defaultLocale;
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image).*)",
  ],
};
