import { NextResponse } from "next/server";
import { isSiteAccessBlocked, SITE_ACCESS_CACHE_TTL_MS } from "@/lib/site-access";

export const runtime = "nodejs";

/** Lightweight poll target for open AppShell tabs when the site may be gated. */
export async function GET() {
  const blocked = await isSiteAccessBlocked();
  return NextResponse.json(
    { blocked },
    {
      headers: {
        "Cache-Control": `private, max-age=0, must-revalidate`,
        "X-Site-Access-Cache-Ttl-Ms": String(SITE_ACCESS_CACHE_TTL_MS),
      },
    },
  );
}
