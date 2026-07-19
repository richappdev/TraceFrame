import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/request-origin";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { isLocale, localePath } from "@/lib/i18n";

export const runtime = "nodejs";

export function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions(0);
  res.cookies.set(COOKIE_NAME, "", { ...opts, maxAge: 0 });
  res.cookies.set("antiable_session", "", { path: "/", maxAge: 0 });
  res.cookies.set("antiable_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}

export function GET(request: Request) {
  const requestedLocale = new URL(request.url).searchParams.get("locale");
  const destination = isLocale(requestedLocale) ? localePath(requestedLocale) : "/";
  const res = NextResponse.redirect(absoluteUrl(request, destination));
  const opts = sessionCookieOptions(0);
  res.cookies.set(COOKIE_NAME, "", { ...opts, maxAge: 0 });
  res.cookies.set("antiable_session", "", { path: "/", maxAge: 0 });
  res.cookies.set("antiable_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
