import { NextResponse } from "next/server";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const city = url.searchParams.get("city") ?? undefined;

  const store = openPresenceStore();
  try {
    const items = store.list({ limit, offset, city }).map(presenceToPublic);
    return NextResponse.json({
      total: store.count(city ? { city } : undefined),
      city: city ?? null,
      limit,
      offset,
      items,
    });
  } finally {
    store.close();
  }
}
