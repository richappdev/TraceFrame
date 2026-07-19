import { NextResponse } from "next/server";
import { anitabiMapUrl } from "@antiable/anitabi";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { openPresenceStore } from "@/lib/presence";
import { libraryMapState, openPresenceVerifyBackend } from "@/lib/presence-verify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mappedOnly = url.searchParams.get("mapped") === "1";
  const typeFilter = url.searchParams.get("type");

  const app = openAppStore();
  const presence = await openPresenceStore();
  const verify = openPresenceVerifyBackend();
  try {
    let items = await app.listLibrary(session.user.id);
    if (typeFilter) {
      items = items.filter((i) => i.collectionType === typeFilter);
    }

    const queueStatuses = await verify.getQueueStatuses(items.map((i) => i.subjectId));

    const joined = items.map((item) => {
      const p = presence.get(item.subjectId);
      const state = libraryMapState({
        presence: p,
        queueStatus: queueStatuses.get(item.subjectId),
      });
      const mapped = state === "mapped";
      return {
        subjectId: item.subjectId,
        collectionType: item.collectionType,
        score: item.score,
        updatedAt: item.updatedAt,
        state,
        mapped,
        title: p?.title ?? item.title ?? null,
        titleCn: p?.titleCn ?? item.titleCn ?? null,
        city: p?.city ?? null,
        pointsLength: p?.pointsLength ?? 0,
        mapUrl: mapped ? anitabiMapUrl(item.subjectId) : null,
      };
    });

    const filtered = mappedOnly ? joined.filter((j) => j.mapped) : joined;
    const mappedCount = joined.filter((j) => j.mapped).length;
    const checkingCount = joined.filter((j) => j.state === "checking").length;

    return NextResponse.json({
      user: session.user,
      total: joined.length,
      mappedCount,
      checkingCount,
      items: filtered,
    });
  } finally {
    await app.close();
    presence.close();
  }
}
