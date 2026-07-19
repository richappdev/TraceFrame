import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import type { TripDay } from "@/lib/planner";
import { hydrateTrip } from "@/lib/trips";
import { isTrustedMutationOrigin } from "@/lib/request-origin";
import {
  TripInputError,
  assertReasonableRequestSize,
  normalizeTripDays,
  normalizeTripTitle,
} from "@/lib/trip-validation";

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
    const trip = await store.getTrip(id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!canRead(trip.ownerId, trip.shareToken, session?.user?.id, token)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ trip: hydrateTrip(trip) });
  } finally {
    await store.close();
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const store = openAppStore();
  try {
    const trip = await store.getTrip(id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (trip.ownerId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      days?: TripDay[];
      shareAction?: "rotate" | "revoke";
    };

    let daysJson: string | undefined;
    let subjectIdsJson: string | undefined;
    if (Array.isArray(body.days)) {
      const days = normalizeTripDays(body.days);
      daysJson = JSON.stringify(days);
      subjectIdsJson = JSON.stringify([...new Set(days.flatMap((d) => d.subjectIds))]);
    }

    assertReasonableRequestSize(request);
    const shareToken =
      body.shareAction === "rotate"
        ? randomBytes(24).toString("base64url")
        : body.shareAction === "revoke"
          ? null
          : undefined;

    await store.updateTrip(id, {
      title: body.title === undefined ? undefined : normalizeTripTitle(body.title),
      daysJson,
      subjectIdsJson,
      shareToken,
      updatedAt: new Date().toISOString(),
    });

    const updated = (await store.getTrip(id))!;
    return NextResponse.json({ ok: true, trip: hydrateTrip(updated) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "update_failed", message: err instanceof Error ? err.message : String(err) },
      { status: err instanceof TripInputError ? err.status : 500 },
    );
  } finally {
    await store.close();
  }
}
