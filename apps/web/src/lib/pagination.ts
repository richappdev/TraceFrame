export function parsePaginationInteger(
  raw: string | null,
  options: { defaultValue: number; min: number; max?: number },
): number | null {
  if (raw == null || raw === "") return options.defaultValue;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < options.min) return null;
  if (options.max != null && value > options.max) return options.max;
  return value;
}
