import { NextResponse } from "next/server";
import { openPresenceStore } from "@/lib/presence";
import { drainPresenceQueue, openPresenceVerifyBackend } from "@/lib/presence-verify";
import { PRESENCE_DRAIN_BATCH } from "@/lib/presence-verify-types";

export const runtime = "nodejs";
export const maxDuration = 120;

function isDrainAuthorized(request: Request): boolean {
  const secret = process.env.PRESENCE_DRAIN_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-presence-drain-secret") === secret;
}

/**
 * Rate-limited Anitabi /lite drain for queued unmatched library IDs.
 * Intended for Cloud Scheduler (Bearer PRESENCE_DRAIN_SECRET).
 */
export async function POST(request: Request) {
  if (!isDrainAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? PRESENCE_DRAIN_BATCH);
  const limit = Number.isFinite(limitParam)
    ? Math.min(20, Math.max(1, Math.floor(limitParam)))
    : PRESENCE_DRAIN_BATCH;

  const verify = openPresenceVerifyBackend();
  const presence = await openPresenceStore();
  try {
    const result = await drainPresenceQueue({ verify, presence, limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[presence-drain]", err);
    return NextResponse.json(
      { error: "drain_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  } finally {
    presence.close();
  }
}
