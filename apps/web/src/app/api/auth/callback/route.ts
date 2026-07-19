import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode, fetchBangumiMe, getBangumiOAuthConfig } from "@/lib/bangumi-oauth";
import { openAppStore } from "@/lib/db";
import { OAUTH_STATE_COOKIE, parseOAuthState } from "@/lib/oauth-state";
import { absoluteUrl } from "@/lib/request-origin";
import {
  COOKIE_NAME,
  encodeSessionCookie,
  encryptToken,
  sessionCookieOptions,
} from "@/lib/session";
import { isLocale, localePath } from "@/lib/i18n";

export const runtime = "nodejs";

function redirectHome(request: Request, auth: string) {
  return NextResponse.redirect(absoluteUrl(request, `/?auth=${auth}`));
}

function clearSessionCookie(res: NextResponse) {
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  // Legacy names from before the Firebase Hosting `__session` cutover.
  res.cookies.set("antiable_session", "", { path: "/", maxAge: 0 });
  res.cookies.set("antiable_oauth_state", "", { path: "/", maxAge: 0 });
}

function redirectFailure(request: Request, auth: string, locale?: string) {
  const target = isLocale(locale)
    ? NextResponse.redirect(absoluteUrl(request, `${localePath(locale)}?auth=${auth}`))
    : redirectHome(request, auth);
  const res = target;
  clearSessionCookie(res);
  return res;
}

export async function GET(request: Request) {
  const { configured } = getBangumiOAuthConfig();
  if (!configured) {
    return redirectHome(request, "not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) {
    return redirectHome(request, `error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return redirectHome(request, "missing_code");
  }

  const jar = await cookies();
  const stateCookie = jar.get(OAUTH_STATE_COOKIE)?.value;
  const payload = parseOAuthState(state);
  const stateOk = Boolean(payload) && Boolean(stateCookie) && stateCookie === state;

  if (!stateOk || !payload) {
    return redirectHome(request, "bad_state");
  }

  let token;
  try {
    token = await exchangeCode(code, payload.r);
  } catch (error) {
    console.error("Bangumi OAuth token exchange failed", error);
    return redirectFailure(request, "exchange_failed", payload.l);
  }

  let me;
  try {
    me = await fetchBangumiMe(token.access_token);
  } catch (error) {
    console.error("Bangumi profile request failed", error);
    return redirectFailure(request, "profile_failed", payload.l);
  }

  const userId = `bgm:${me.id}`;
  let accessTokenEnc: string;
  let refreshTokenEnc: string | null;
  try {
    accessTokenEnc = encryptToken(token.access_token);
    refreshTokenEnc = token.refresh_token ? encryptToken(token.refresh_token) : null;
  } catch (error) {
    console.error("OAuth token encryption failed", error);
    return redirectFailure(request, "session_failed", payload.l);
  }
  const tokenExpiresAt = Date.now() + token.expires_in * 1000;

  try {
    const store = openAppStore();
    try {
      await store.upsertUser({
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
    } finally {
      await store.close();
    }
  } catch (error) {
    console.error("OAuth user persistence failed", error);
    return redirectFailure(request, "storage_failed", payload.l);
  }

  try {
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

    const destination = isLocale(payload.l) ? localePath(payload.l, "/library") : "/library";
    const res = NextResponse.redirect(absoluteUrl(request, destination));
    const opts = sessionCookieOptions();
    // Overwrites the temporary OAuth state value in `__session`.
    res.cookies.set(COOKIE_NAME, session, opts);
    res.cookies.set("antiable_session", "", { path: "/", maxAge: 0 });
    res.cookies.set("antiable_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    console.error("OAuth session creation failed", error);
    return redirectFailure(request, "session_failed", payload.l);
  }
}
