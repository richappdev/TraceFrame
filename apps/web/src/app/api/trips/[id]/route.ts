import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import type { TripDay } from "@/lib/planner";
import { hydrateTrip } from "@/lib/trips";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function canRead(
  tripOwnerId: string,
  shareToken: string | null,
  sessionUserId: string | undefined,
  token: string | null,
): boolean {
  if (sessionUserId && sessionUserId === tripOwnerId) return true;
  if (shareToken && token && token === shareToken) return true;
  return false;
}

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const session = await getSession();

  const store = openAppStore();
  try {
    const trip = store.getTrip(id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!canRead(trip.ownerId, trip.shareToken, session?.user?.id, token)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ trip: hydrateTrip(trip) });
  } finally {
    store.close();
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const store = openAppStore();
  try {
    const trip = store.getTrip(id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (trip.ownerId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      days?: TripDay[];
    };

    let daysJson: string | undefined;
    let subjectIdsJson: string | undefined;
    if (Array.isArray(body.days)) {
      const days = body.days
        .map((d, i) => ({
          day: Number(d.day) || i + 1,
          city: String(d.city ?? ""),
          subjectIds: Array.isArray(d.subjectIds)
            ? d.subjectIds.map(Number).filter((n) => Number.isFinite(n))
            : [],
        }))
        .filter((d) => d.subjectIds.length > 0);
      daysJson = JSON.stringify(days);
      subjectIdsJson = JSON.stringify([...new Set(days.flatMap((d) => d.subjectIds))]);
    }

    store.updateTrip(id, {
      title: body.title?.trim() || undefined,
      daysJson,
      subjectIdsJson,
      updatedAt: new Date().toISOString(),
    });

    const updated = store.getTrip(id)!;
    return NextResponse.json({ ok: true, trip: hydrateTrip(updated) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "update_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    store.close();
  }
}
