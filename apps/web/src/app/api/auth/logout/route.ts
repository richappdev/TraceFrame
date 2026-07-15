import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions(0);
  res.cookies.set(COOKIE_NAME, "", { ...opts, maxAge: 0 });
  return res;
}

export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/", request.url));
  const opts = sessionCookieOptions(0);
  res.cookies.set(COOKIE_NAME, "", { ...opts, maxAge: 0 });
  return res;
}
