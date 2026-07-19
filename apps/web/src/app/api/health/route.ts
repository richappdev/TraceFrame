import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "traceframe",
    phase: "M2",
    releaseStatus: "implemented-awaiting-acceptance",
    appStore: process.env.APP_STORE === "firestore" ? "firestore" : "sqlite-development",
    time: new Date().toISOString(),
  });
}
