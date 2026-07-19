import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { buildTripDays, clampDayCount } from "@/lib/planner";
import { openPresenceStore } from "@/lib/presence";
import { absoluteUrl, isTrustedMutationOrigin } from "@/lib/request-origin";
import { hydrateTrip } from "@/lib/trips";
import {
  TripInputError,
  assertReasonableRequestSize,
  normalizeSubjectIds,
  normalizeTripTitle,
} from "@/lib/trip-validation";

export const runtime = "nodejs";

function parseSubjectIdsFromBody(body: unknown): number[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { subjectIds?: unknown }).subjectIds;
  return normalizeSubjectIds(raw);
}

async function parseCreateInput(request: Request): Promise<{
  title: string;
  subjectIds: number[];
  dayCount: number;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      title?: string;
      subjectIds?: unknown;
      dayCount?: unknown;
    };
    return {
      title: normalizeTripTitle(body.title),
      subjectIds: parseSubjectIdsFromBody(body),
      dayCount: clampDayCount(body.dayCount),
    };
  }

  const form = await request.formData();
  const ids = normalizeSubjectIds(form.getAll("subjectId"));
  return {
    title: normalizeTripTitle(form.get("title")),
    subjectIds: ids,
    dayCount: clampDayCount(form.get("dayCount")),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = openAppStore();
  try {
    const trips = (await store.listTrips(session.user.id)).map((t) => ({
      id: t.id,
      title: t.title,
      shareToken: t.shareToken,
      subjectIds: JSON.parse(t.subjectIdsJson) as number[],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    return NextResponse.json({ items: trips });
  } finally {
    await store.close();
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const wantsHtml =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    (request.headers.get("accept") ?? "").includes("text/html");

  try {
    assertReasonableRequestSize(request);
    const input = await parseCreateInput(request);
    if (input.subjectIds.length === 0) {
      if (wantsHtml) {
        return NextResponse.redirect(absoluteUrl(request, "/trips/new?error=empty"), 303);
      }
      return NextResponse.json({ error: "empty_selection" }, { status: 400 });
    }

    const presence = openPresenceStore();
    const records = input.subjectIds
      .map((id) => presence.get(id))
      .filter((r): r is NonNullable<typeof r> => r != null && r.pointsLength > 0);
    presence.close();

    if (records.length === 0) {
      if (wantsHtml) {
        return NextResponse.redirect(absoluteUrl(request, "/trips/new?error=unmapped"), 303);
      }
      return NextResponse.json({ error: "no_mapped_titles" }, { status: 400 });
    }

    const days = buildTripDays(records, input.dayCount);
    const now = new Date().toISOString();
    const tripId = randomUUID();
    const shareToken = randomBytes(24).toString("base64url");
    const subjectIds = records.map((r) => r.subjectId);

    const store = openAppStore();
    await store.createTrip({
      id: tripId,
      ownerId: session.user.id,
      title: input.title,
      shareToken,
      daysJson: JSON.stringify(days),
      subjectIdsJson: JSON.stringify(subjectIds),
      createdAt: now,
      updatedAt: now,
    });
    const created = (await store.getTrip(tripId))!;
    await store.close();

    if (wantsHtml) {
      return NextResponse.redirect(absoluteUrl(request, `/trips/${tripId}`), 303);
    }
    return NextResponse.json({ ok: true, trip: hydrateTrip(created) }, { status: 201 });
  } catch (err) {
    console.error(err);
    if (wantsHtml) {
      return NextResponse.redirect(absoluteUrl(request, "/trips/new?error=failed"), 303);
    }
    return NextResponse.json(
      { error: "create_failed", message: err instanceof Error ? err.message : String(err) },
      { status: err instanceof TripInputError ? err.status : 500 },
    );
  }
}
