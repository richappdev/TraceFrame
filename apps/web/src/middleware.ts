import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, detectLocale, isLocale, localeFromPathname, LOCALE_COOKIE } from "./lib/i18n";

const pageRoots = ["/", "/presence", "/library", "/trips", "/privacy", "/data-policy", "/t"];

function isPagePath(pathname: string): boolean {
  return pageRoots.some((root) => root === "/" ? pathname === "/" : pathname === root || pathname.startsWith(`${root}/`));
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  const routeLocale = segments[0];

  if (isLocale(routeLocale)) {
    const publicPath = `/${segments.slice(1).join("/")}` || "/";
    if (!isPagePath(publicPath)) return NextResponse.next();
    url.pathname = publicPath;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-traceframe-locale", routeLocale);
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    response.cookies.set(LOCALE_COOKIE, routeLocale, { path: "/", sameSite: "lax", maxAge: 31536000 });
    return response;
  }

  if (!isPagePath(url.pathname)) return NextResponse.next();
  let refererLocale = null;
  try {
    refererLocale = localeFromPathname(new URL(request.headers.get("referer") ?? "").pathname);
  } catch { /* no usable same-origin referrer */ }
  const locale = refererLocale ?? (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)
    ? request.cookies.get(LOCALE_COOKIE)!.value
    : detectLocale(request.headers.get("accept-language")) || defaultLocale);
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
