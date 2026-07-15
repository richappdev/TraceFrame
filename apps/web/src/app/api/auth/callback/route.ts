import { NextResponse } from "next/server";
import { exchangeCode, fetchBangumiMe, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { openAppStore } from "@/lib/db";
import {
  COOKIE_NAME,
  encodeSessionCookie,
  encryptToken,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { configured } = getBangumiOAuthConfig();
  if (!configured) {
    return NextResponse.redirect(new URL("/?auth=not_configured", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(new URL(`/?auth=error&reason=${err}`, request.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?auth=missing_code", request.url));
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("antiable_oauth_state="))
    ?.split("=")[1];
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(new URL("/?auth=bad_state", request.url));
  }

  try {
    const token = await exchangeCode(code);
    const me = await fetchBangumiMe(token.access_token);
    const userId = `bgm:${me.id}`;
    const accessTokenEnc = encryptToken(token.access_token);
    const refreshTokenEnc = token.refresh_token ? encryptToken(token.refresh_token) : null;
    const tokenExpiresAt = Date.now() + token.expires_in * 1000;

    const store = openAppStore();
    store.upsertUser({
      id: userId,
      bangumiUserId: me.id,
      username: me.username,
      nickname: me.nickname,
      avatar: me.avatar?.large ?? me.avatar?.medium ?? null,
      accessTokenEnc,
      refreshTokenEnc,
      tokenExpiresAt,
      updatedAt: new Date().toISOString(),
    });
    store.close();

    const session = encodeSessionCookie({
      user: {
        id: userId,
        bangumiUserId: me.id,
        username: me.username,
        nickname: me.nickname,
        avatar: me.avatar?.large,
      },
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc ?? undefined,
      tokenExpiresAt,
    });

    const res = NextResponse.redirect(new URL("/library", request.url));
    const opts = sessionCookieOptions();
    res.cookies.set(COOKIE_NAME, session, opts);
    res.cookies.set("antiable_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/?auth=exchange_failed", request.url));
  }
}
