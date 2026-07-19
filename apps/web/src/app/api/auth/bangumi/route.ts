import { NextResponse } from "next/server";
import { buildAuthorizeUrl, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { createOAuthState, OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
import { getRequestOrigin } from "@/lib/request-origin";
import { sessionCookieOptions } from "@/lib/session";

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
function interstitialRedirect(authorizeUrl: string): NextResponse {
  const href = escapeHtmlAttr(authorizeUrl);
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0;url=${href}"/>
  <title>正在跳转到 Bangumi…</title>
</head>
<body>
  <p>正在跳转到 Bangumi 登录…</p>
  <p><a href="${href}">如果没有自动跳转，请点击这里</a></p>
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

  // Prefer the public origin of this request so the state cookie host matches
  // the callback host (preview vs prod App Hosting URLs).
  const redirectUri = `${getRequestOrigin(request)}/api/auth/callback`;
  const state = createOAuthState(redirectUri);
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

  const res = interstitialRedirect(url);
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
