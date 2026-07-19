import type { TripDay } from "./planner";

export const MAX_TRIP_TITLE_LENGTH = 80;
export const MAX_TRIP_SUBJECTS = 50;
export const MAX_TRIP_DAYS = 3;
export const MAX_TRIP_REQUEST_BYTES = 64 * 1024;

export class TripInputError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}

export function assertReasonableRequestSize(request: Request): void {
  const raw = request.headers.get("content-length");
  if (!raw) return;
  const bytes = Number(raw);
  if (Number.isFinite(bytes) && bytes > MAX_TRIP_REQUEST_BYTES) {
    throw new TripInputError("payload_too_large", 413);
  }
}

export function normalizeTripTitle(value: unknown): string {
  const title = String(value ?? "").trim() || "我的巡礼行程";
  if (title.length > MAX_TRIP_TITLE_LENGTH) {
    throw new TripInputError("title_too_long");
  }
  return title;
}

export function normalizeSubjectIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = [
    ...new Set(
      value
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  ];
  if (ids.length > MAX_TRIP_SUBJECTS) {
    throw new TripInputError("too_many_subjects");
  }
  return ids;
}

export function normalizeTripDays(value: unknown): TripDay[] {
  if (!Array.isArray(value)) throw new TripInputError("invalid_days");
  if (value.length === 0 || value.length > MAX_TRIP_DAYS) {
    throw new TripInputError("invalid_day_count");
  }

  const seen = new Set<number>();
  const days = value.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new TripInputError("invalid_day");
    const day = raw as { city?: unknown; subjectIds?: unknown };
    const city = String(day.city ?? "").trim().slice(0, 120);
    const subjectIds = normalizeSubjectIds(day.subjectIds);
    if (subjectIds.length === 0) throw new TripInputError("empty_day");
    for (const id of subjectIds) {
      if (seen.has(id)) throw new TripInputError("duplicate_subject");
      seen.add(id);
    }
    return { day: index + 1, city, subjectIds };
  });

  if (seen.size > MAX_TRIP_SUBJECTS) throw new TripInputError("too_many_subjects");
  return days;
}
