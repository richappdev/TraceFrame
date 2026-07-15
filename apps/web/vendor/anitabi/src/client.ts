import { RateLimiter } from "./rate-limiter";
import type {
  AnitabiClientOptions,
  AnitabiLiteSummary,
  LiteProbeResult,
} from "./types";

const DEFAULT_BASE = "https://api.anitabi.cn";
const DEFAULT_UA =
  "Mozilla/5.0 (compatible; antiable/trip/0.1; +https://github.com/antiable/trip)";

/**
 * Anitabi client ? lite endpoint only for MVP (NC-safe metadata).
 * Detail/POI fetch is deferred to E4.
 */
export class AnitabiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly limiter: RateLimiter;

  constructor(options: AnitabiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.userAgent = options.userAgent ?? DEFAULT_UA;
    this.limiter = new RateLimiter({
      maxRequestsPerMinute: options.maxRequestsPerMinute ?? 60,
      jitterMs: options.jitterMs ?? { min: 400, max: 1200 },
      concurrency: options.concurrency ?? 3,
    });
  }

  /** GET /bangumi/{id}/lite ? returns null if empty / not mapped. */
  async fetchLite(subjectId: number): Promise<AnitabiLiteSummary | null> {
    const result = await this.probeLite(subjectId);
    if (!result.ok || !result.summary) return null;
    if ((result.summary.pointsLength ?? 0) <= 0) return null;
    return result.summary;
  }

  /** Probe with HTTP status retained (for import / refresh jobs). */
  async probeLite(subjectId: number): Promise<LiteProbeResult> {
    return this.limiter.schedule(async () => {
      const url = `${this.baseUrl}/bangumi/${subjectId}/lite`;
      try {
        const res = await this.fetchImpl(url, {
          headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent": this.userAgent,
            Referer: "https://www.anitabi.cn/map",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          },
        });

        if (res.status === 404) {
          return { subjectId, ok: false, httpStatus: 404, error: "not_found" };
        }
        if (res.status === 403 || res.status === 429) {
          const body = await res.text().catch(() => "");
          return {
            subjectId,
            ok: false,
            httpStatus: res.status,
            error: `blocked_or_limited: ${body.slice(0, 120)}`,
          };
        }
        if (!res.ok) {
          return {
            subjectId,
            ok: false,
            httpStatus: res.status,
            error: res.statusText,
          };
        }

        const summary = (await res.json()) as AnitabiLiteSummary;
        return {
          subjectId,
          ok: true,
          httpStatus: res.status,
          summary,
        };
      } catch (err) {
        return {
          subjectId,
          ok: false,
          httpStatus: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }
}

/** Deep-link into Anitabi map for a Bangumi subject. */
export function anitabiMapUrl(subjectId: number): string {
  return `https://anitabi.cn/map?bangumiId=${subjectId}`;
}

/** Attribution string for footers (BY-NC-SA). */
export function anitabiAttribution(origin?: string, originURL?: string): string {
  const who = origin?.trim() || "Anitabi contributors";
  const link = originURL?.trim() || "https://anitabi.cn";
  return `Map data from ${who} (${link}), CC BY-NC-SA`;
}

export function parseGeoCentroid(
  geo: AnitabiLiteSummary["geo"],
): { lat: number; lng: number } | null {
  if (!geo) return null;
  if (Array.isArray(geo) && geo.length >= 2) {
    const a = Number(geo[0]);
    const b = Number(geo[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    // Anitabi commonly uses [lng, lat]
    if (Math.abs(a) > 90 && Math.abs(b) <= 90) return { lng: a, lat: b };
    if (Math.abs(b) > 90 && Math.abs(a) <= 90) return { lng: b, lat: a };
    return { lng: a, lat: b };
  }
  if (typeof geo === "object" && "lat" in geo && "lng" in geo) {
    const lat = Number(geo.lat);
    const lng = Number(geo.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }
  return null;
}
