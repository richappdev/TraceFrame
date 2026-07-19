import { NextResponse } from "next/server";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";
import { parsePaginationInteger } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePaginationInteger(url.searchParams.get("limit"), {
    defaultValue: 50,
    min: 1,
    max: 100,
  });
  const offset = parsePaginationInteger(url.searchParams.get("offset"), {
    defaultValue: 0,
    min: 0,
  });
  if (limit == null || offset == null) {
    return NextResponse.json({ error: "invalid_pagination" }, { status: 400 });
  }
  const city = url.searchParams.get("city") ?? undefined;

  const store = await openPresenceStore();
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
