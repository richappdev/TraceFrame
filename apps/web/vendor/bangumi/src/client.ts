import type {
  BangumiClientOptions,
  BangumiPagedResponse,
  BangumiSort,
  BangumiSubjectSummary,
  RankedSubjectsParams,
} from "./types";
import { SUBJECT_TYPE_ANIME } from "./types";

const DEFAULT_BASE = "https://api.bgm.tv";
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 50;

interface CacheEntry {
  subject: BangumiSubjectSummary;
  expiresAt: number;
}

/**
 * Bangumi HTTP client with identifying UA and 24h subject cache.
 * Collections that need Authorization are handled in a later epic (E1).
 */
export class BangumiClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly subjectCacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly subjectCache = new Map<number, CacheEntry>();

  constructor(options: BangumiClientOptions) {
    if (!options.userAgent?.trim()) {
      throw new Error("BangumiClient requires a non-empty userAgent");
    }
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.userAgent = options.userAgent;
    this.subjectCacheTtlMs = options.subjectCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Fetch ranked anime subjects across multiple pages. */
  async fetchRankedSubjects(
    params: RankedSubjectsParams = {},
  ): Promise<BangumiSubjectSummary[]> {
    const pages = Math.max(1, params.pages ?? 4);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? 50));
    const sort: BangumiSort = params.sort ?? "rank";
    const type = params.type ?? SUBJECT_TYPE_ANIME;

    const results: BangumiSubjectSummary[] = [];
    const seen = new Set<number>();

    for (let page = 0; page < pages; page++) {
      const offset = page * pageSize;
      const url = new URL(`${this.baseUrl}/v0/subjects`);
      url.searchParams.set("type", String(type));
      url.searchParams.set("sort", sort);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));

      const payload = await this.getJson<BangumiPagedResponse<BangumiSubjectSummary>>(
        url.toString(),
      );
      const batch = payload.data ?? [];
      if (batch.length === 0) break;

      for (const item of batch) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          results.push(item);
          this.cacheSubject(item);
        }
      }
    }

    return results;
  }

  /** Convenience: ranked subject IDs only. */
  async fetchRankedIds(params: RankedSubjectsParams = {}): Promise<number[]> {
    const subjects = await this.fetchRankedSubjects(params);
    return subjects.map((s) => s.id);
  }

  /** GET /v0/subjects/{id} with in-memory TTL cache. */
  async getSubject(id: number, opts?: { forceRefresh?: boolean }): Promise<BangumiSubjectSummary> {
    if (!opts?.forceRefresh) {
      const hit = this.subjectCache.get(id);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.subject;
      }
    }

    const subject = await this.getJson<BangumiSubjectSummary>(
      `${this.baseUrl}/v0/subjects/${id}`,
    );
    this.cacheSubject(subject);
    return subject;
  }

  /**
   * POST /v0/search/subjects — keyword search (anime by default).
   * Used to recover Presence rows whose stored id/title pair was wrong.
   */
  async searchSubjects(
    keyword: string,
    opts?: { limit?: number; type?: number },
  ): Promise<BangumiSubjectSummary[]> {
    const q = keyword.trim();
    if (!q) return [];
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts?.limit ?? 5));
    const type = opts?.type ?? SUBJECT_TYPE_ANIME;
    const url = `${this.baseUrl}/v0/search/subjects?limit=${limit}`;
    const payload = await this.postJson<{ data?: BangumiSubjectSummary[] }>(url, {
      keyword: q,
      filter: { type: [type] },
    });
    const batch = payload.data ?? [];
    for (const item of batch) this.cacheSubject(item);
    return batch;
  }

  clearSubjectCache(): void {
    this.subjectCache.clear();
  }

  private cacheSubject(subject: BangumiSubjectSummary): void {
    this.subjectCache.set(subject.id, {
      subject,
      expiresAt: Date.now() + this.subjectCacheTtlMs,
    });
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Bangumi ${res.status} ${res.statusText} for ${url}: ${body.slice(0, 200)}`,
      );
    }
    return (await res.json()) as T;
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.userAgent,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Bangumi ${res.status} ${res.statusText} for ${url}: ${text.slice(0, 200)}`,
      );
    }
    return (await res.json()) as T;
  }
}
