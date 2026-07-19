import { NextResponse } from "next/server";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ subjectId: string }> },
) {
  const { subjectId } = await context.params;
  const id = Number(subjectId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_subject_id" }, { status: 400 });
  }

  const store = await openPresenceStore();
  try {
    const record = store.get(id);
    if (!record) {
      return NextResponse.json({ error: "not_found", mapped: false }, { status: 404 });
    }
    return NextResponse.json({ mapped: true, ...presenceToPublic(record) });
  } finally {
    store.close();
  }
}
