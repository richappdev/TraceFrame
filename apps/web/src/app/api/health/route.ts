import { NextResponse } from "next/server";
import { checkRuntimeReadiness } from "@/lib/runtime-readiness";

export const runtime = "nodejs";

export async function GET() {
  try {
    await checkRuntimeReadiness();
    return NextResponse.json({
      ok: true,
      service: "anipins",
      phase: "M2",
      releaseStatus: "implemented-awaiting-acceptance",
      appStore: process.env.APP_STORE === "firestore" ? "firestore" : "sqlite-development",
      dependencies: { appStore: "ready" },
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Runtime readiness check failed", error);
    return NextResponse.json(
      {
        ok: false,
        service: "anipins",
        phase: "M2",
        releaseStatus: "not-ready",
        error: "runtime_not_ready",
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
