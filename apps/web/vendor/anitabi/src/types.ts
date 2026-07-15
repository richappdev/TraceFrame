export interface AnitabiLiteSummary {
  id?: number;
  cn?: string;
  title?: string;
  city?: string;
  /** Geo centroid; may be [lng, lat] or { lat, lng }. */
  geo?: number[] | { lat: number; lng: number };
  color?: string;
  cover?: string;
  pointsLength: number;
  imagesLength?: number;
}

export interface AnitabiClientOptions {
  baseUrl?: string;
  /** Max requests per minute. Plan: < 100. Default 60. */
  maxRequestsPerMinute?: number;
  /** Random delay range between requests (ms). */
  jitterMs?: { min: number; max: number };
  /** Max concurrent in-flight requests. Default 3. */
  concurrency?: number;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export interface LiteProbeResult {
  subjectId: number;
  ok: boolean;
  httpStatus: number;
  summary?: AnitabiLiteSummary;
  error?: string;
}
