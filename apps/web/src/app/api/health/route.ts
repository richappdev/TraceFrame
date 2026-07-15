import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "traceframe",
    phase: "E1",
    time: new Date().toISOString(),
  });
}
