import { NextResponse } from "next/server";
import { getAccessToken, getSession } from "@/lib/auth";
import { collectionTypeLabel, fetchUserCollections } from "@/lib/collections";
import { openAppStore } from "@/lib/db";
import { absoluteUrl, isTrustedMutationOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

async function syncLibrary() {
  const session = await getSession();
  const token = await getAccessToken();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  if (!token) {
    return { ok: false as const, status: 401, error: "reauth_required" };
  }
  const username = session.user.username;
  if (!username) {
    return { ok: false as const, status: 400, error: "missing_username" };
  }

  const collections = await fetchUserCollections(username, token);
  const now = new Date().toISOString();
  const store = openAppStore();
  await store.replaceLibrary(
    session.user.id,
    collections.map((c) => ({
      userId: session.user.id,
      subjectId: c.subject_id,
      collectionType: collectionTypeLabel(c.type),
      score: c.rate ?? null,
      updatedAt: c.updated_at ?? now,
    })),
  );
  const count = (await store.listLibrary(session.user.id)).length;
  await store.close();
  return { ok: true as const, synced: count };
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const wantsHtml =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    (request.headers.get("accept") ?? "").includes("text/html");

  try {
    const result = await syncLibrary();
    if (!result.ok) {
      if (wantsHtml) {
        return NextResponse.redirect(absoluteUrl(request, `/?auth=${result.error}`), 303);
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (wantsHtml) {
      return NextResponse.redirect(absoluteUrl(request, "/library?synced=1"), 303);
    }
    return NextResponse.json({ ok: true, synced: result.synced });
  } catch (err) {
    console.error(err);
    if (wantsHtml) {
      return NextResponse.redirect(absoluteUrl(request, "/library?sync=failed"), 303);
    }
    return NextResponse.json(
      { error: "sync_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
