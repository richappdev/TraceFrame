import { NextResponse } from "next/server";
import { buildAuthorizeUrl, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { createOAuthState, normalizeReturnPath, OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
import { getRequestOrigin } from "@/lib/request-origin";
import { sessionCookieOptions } from "@/lib/session";
import { getCopy, isLocale, localeFromCookieHeader, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

/**
 * Return 200 HTML that navigates to Bangumi after Set-Cookie.
 * Set-Cookie on a 302 to a third party is flaky in some browsers (cookie never
 * stored → callback sees auth=bad_state).
 * Cache-Control must stay private/no-store: Firebase Hosting keys CDN on `__session`.
 */
function interstitialRedirect(authorizeUrl: string, locale: Locale): NextResponse {
  const href = escapeHtmlAttr(authorizeUrl);
  const login = getCopy(locale).common.login;
  const title = locale === "ja-JP" ? "Bangumiへ移動しています…" : locale === "zh-TW" ? "正在前往 Bangumi…" : "正在跳转到 Bangumi…";
  const fallback = locale === "ja-JP" ? "自動的に移動しない場合は、ここをクリックしてください" : locale === "zh-TW" ? "若未自動前往，請點選這裡" : "如果没有自动跳转，请点击这里";
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0;url=${href}"/>
  <title>${title}</title>
</head>
<body>
  <p>${login}…</p>
  <p><a href="${href}">${fallback}</a></p>
  <script>location.replace(${JSON.stringify(authorizeUrl)})</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestedLocale = requestUrl.searchParams.get("locale");
  const returnPath = normalizeReturnPath(requestUrl.searchParams.get("next"));
  const locale = isLocale(requestedLocale) ? requestedLocale : localeFromCookieHeader(request.headers.get("cookie"));
  const { configured, redirectUri: configuredRedirect } = getBangumiOAuthConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error: "oauth_not_configured",
        hint: "Set BANGUMI_CLIENT_ID, BANGUMI_CLIENT_SECRET, and BANGUMI_REDIRECT_URI (see apps/web/.env.example)",
      },
      { status: 503 },
    );
  }

  const canonicalOrigin = new URL(configuredRedirect).origin;
  const requestOrigin = getRequestOrigin(request);
  if (process.env.NODE_ENV === "production" && requestOrigin !== canonicalOrigin) {
    const canonical = new URL("/api/auth/bangumi", canonicalOrigin);
    canonical.search = new URL(request.url).search;
    return NextResponse.redirect(canonical, 307);
  }

  // Use the one callback registered with Bangumi. Alternate/rollback hosts are
  // redirected above so the temporary state cookie is created on this host.
  const redirectUri = configuredRedirect;
  const state = createOAuthState(redirectUri, undefined, locale, returnPath);
  const url = buildAuthorizeUrl(state, redirectUri);
  if (!url.includes("redirect_uri=")) {
    return NextResponse.json(
      {
        error: "missing_redirect_uri",
        hint: `Expected redirect_uri=${configuredRedirect}. Also set the same callback URL on https://bgm.tv/dev/app`,
      },
      { status: 500 },
    );
  }

  const res = interstitialRedirect(url, locale);
  const cookie = sessionCookieOptions(600);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: cookie.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
