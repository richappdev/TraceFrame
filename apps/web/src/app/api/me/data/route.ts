import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { absoluteUrl, isTrustedMutationOrigin } from "@/lib/request-origin";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

async function removeData(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const confirmed = request.method === "POST"
    ? String((await request.formData()).get("confirm") ?? "") === "DELETE"
    : request.headers.get("x-confirm-delete") === "DELETE";
  if (!confirmed) {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }
  const store = openAppStore();
  try {
    await store.deleteUserData(session.user.id);
  } finally {
    await store.close();
  }
  const wantsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  const response = wantsHtml
    ? NextResponse.redirect(absoluteUrl(request, "/?data=deleted"), 303)
    : NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}

export async function DELETE(request: Request) { return removeData(request); }
export async function POST(request: Request) { return removeData(request); }
