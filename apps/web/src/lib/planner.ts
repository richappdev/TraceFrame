import type { PresenceRecord } from "@antiable/presence";

export interface TripDay {
  day: number;
  city: string;
  subjectIds: number[];
}

/** Group mapped titles into 1–3 city-level day buckets. */
export function buildTripDays(
  records: PresenceRecord[],
  dayCount: number,
): TripDay[] {
  const days = Math.min(3, Math.max(1, Math.floor(dayCount) || 1));
  const byCity = new Map<string, number[]>();
  const cityWeight = new Map<string, number>();

  for (const r of records) {
    if (r.pointsLength <= 0) continue;
    const city = (r.city || "未标注城市").trim() || "未标注城市";
    const ids = byCity.get(city) ?? [];
    ids.push(r.subjectId);
    byCity.set(city, ids);
    cityWeight.set(city, (cityWeight.get(city) ?? 0) + r.pointsLength);
  }

  const cities = [...byCity.keys()].sort(
    (a, b) => (cityWeight.get(b) ?? 0) - (cityWeight.get(a) ?? 0),
  );

  const buckets: TripDay[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    city: "",
    subjectIds: [] as number[],
  }));

  if (cities.length === 0) return buckets;

  if (cities.length <= days) {
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i]!;
      const bucket = buckets[i]!;
      bucket.city = city;
      bucket.subjectIds = byCity.get(city) ?? [];
    }
    return buckets.filter((b) => b.subjectIds.length > 0);
  }

  // More cities than days: pack heaviest cities first into least-loaded days.
  for (const city of cities) {
    let best = 0;
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i]!.subjectIds.length < buckets[best]!.subjectIds.length) {
        best = i;
      }
    }
    const bucket = buckets[best]!;
    if (!bucket.city) bucket.city = city;
    else if (!bucket.city.split(" / ").includes(city)) {
      bucket.city = `${bucket.city} / ${city}`;
    }
    bucket.subjectIds.push(...(byCity.get(city) ?? []));
  }

  return buckets.filter((b) => b.subjectIds.length > 0);
}

export function clampDayCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2;
  return Math.min(3, Math.max(1, Math.round(n)));
}
