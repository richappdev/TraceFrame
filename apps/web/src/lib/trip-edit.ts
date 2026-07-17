/** Client-safe trip reorder helpers (no SQLite / Node imports). */

export type EditableTitle = {
  subjectId: number;
  title?: string;
  titleCn?: string;
  city?: string;
  pointsLength?: number;
  mapUrl?: string;
};

export type EditableDay = {
  day: number;
  city: string;
  subjectIds: number[];
  titles: EditableTitle[];
};

/** Rebuild day.city labels from title cities after reordering. */
export function relabelDayCities(days: EditableDay[]): EditableDay[] {
  return days.map((day, i) => {
    const cities = [
      ...new Set(
        day.titles
          .map((t) => (t.city || "").trim())
          .filter(Boolean),
      ),
    ];
    return {
      ...day,
      day: i + 1,
      city: cities.join(" / ") || day.city || "未标注城市",
      subjectIds: day.titles.map((t) => t.subjectId),
    };
  });
}

export function swapDays(days: EditableDay[], i: number, j: number): EditableDay[] {
  if (i < 0 || j < 0 || i >= days.length || j >= days.length) return days;
  const next = days.slice();
  const a = next[i]!;
  const b = next[j]!;
  next[i] = b;
  next[j] = a;
  return relabelDayCities(next);
}

export function moveTitle(
  days: EditableDay[],
  dayIndex: number,
  titleIndex: number,
  targetDayIndex: number,
  targetTitleIndex: number,
): EditableDay[] {
  if (
    dayIndex < 0 ||
    targetDayIndex < 0 ||
    dayIndex >= days.length ||
    targetDayIndex >= days.length
  ) {
    return days;
  }
  const next = days.map((d) => ({ ...d, titles: d.titles.slice() }));
  const from = next[dayIndex]!;
  const title = from.titles[titleIndex];
  if (!title) return days;
  from.titles.splice(titleIndex, 1);

  const to = next[targetDayIndex]!;
  const insertAt = Math.max(0, Math.min(targetTitleIndex, to.titles.length));
  to.titles.splice(insertAt, 0, title);

  return relabelDayCities(next.filter((d) => d.titles.length > 0));
}
