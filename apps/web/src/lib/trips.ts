import { anitabiMapUrl } from "@antiable/anitabi";
import type { TripDay } from "@/lib/planner";
import type { TripRow } from "@/lib/app-store";
import { openPresenceStore, presenceToPublic } from "@/lib/presence";

export function parseTripDays(json: string): TripDay[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((d, i) => {
        const row = d as Partial<TripDay>;
        return {
          day: Number(row.day) || i + 1,
          city: String(row.city ?? ""),
          subjectIds: Array.isArray(row.subjectIds)
            ? row.subjectIds.map(Number).filter((n) => Number.isFinite(n))
            : [],
        };
      })
      .filter((d) => d.subjectIds.length > 0);
  } catch {
    return [];
  }
}

export function parseSubjectIds(json: string): number[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map(Number).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

export function hydrateTrip(trip: TripRow) {
  const days = parseTripDays(trip.daysJson);
  const subjectIds = parseSubjectIds(trip.subjectIdsJson);
  const presence = openPresenceStore();
  try {
    const titles = new Map<number, ReturnType<typeof presenceToPublic>>();
    for (const id of subjectIds) {
      const row = presence.get(id);
      if (row) titles.set(id, presenceToPublic(row));
    }
    return {
      id: trip.id,
      ownerId: trip.ownerId,
      title: trip.title,
      shareToken: trip.shareToken,
      subjectIds,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      days: days.map((day) => ({
        ...day,
        titles: day.subjectIds.map((id) => {
          const t = titles.get(id);
          return (
            t ?? {
              subjectId: id,
              title: `#${id}`,
              titleCn: "",
              city: day.city,
              lat: null,
              lng: null,
              pointsLength: 0,
              imagesLength: 0,
              coverUrl: null,
              color: null,
              verifiedAt: "",
              mapUrl: anitabiMapUrl(id),
            }
          );
        }),
      })),
    };
  } finally {
    presence.close();
  }
}
