import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export function GET() {
  const { configured } = getBangumiOAuthConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error: "oauth_not_configured",
        hint: "Set BANGUMI_CLIENT_ID and BANGUMI_CLIENT_SECRET (see apps/web/.env.example)",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state);
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
