import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export function GET() {
  const { configured, redirectUri } = getBangumiOAuthConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error: "oauth_not_configured",
        hint: "Set BANGUMI_CLIENT_ID, BANGUMI_CLIENT_SECRET, and BANGUMI_REDIRECT_URI (see apps/web/.env.example)",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state);
  // Guard: never send Bangumi an authorize URL without redirect_uri
  if (!url.includes("redirect_uri=")) {
    return NextResponse.json(
      {
        error: "missing_redirect_uri",
        hint: `Expected redirect_uri=${redirectUri}. Also set the same callback URL on https://bgm.tv/dev/app`,
      },
      { status: 500 },
    );
  }
  const res = NextResponse.redirect(url);
  const cookie = sessionCookieOptions(600);
  res.cookies.set("antiable_oauth_state", state, {
    httpOnly: true,
    secure: cookie.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
