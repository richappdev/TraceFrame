/** Bangumi subject type: 2 = anime. */
export const SUBJECT_TYPE_ANIME = 2;

export type BangumiSort = "rank" | "date";

export interface BangumiImageSet {
  large?: string;
  common?: string;
  medium?: string;
  small?: string;
  grid?: string;
}

export interface BangumiSubjectSummary {
  id: number;
  type: number;
  name: string;
  name_cn: string;
  summary?: string;
  date?: string;
  images?: BangumiImageSet;
  score?: number;
  rank?: number;
}

export interface BangumiPagedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  data: T[];
}

export interface BangumiClientOptions {
  /** Identifying User-Agent required by Bangumi. */
  userAgent: string;
  baseUrl?: string;
  /** Subject cache TTL in ms. Default 24h. */
  subjectCacheTtlMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RankedSubjectsParams {
  pages?: number;
  pageSize?: number;
  sort?: BangumiSort;
  type?: number;
}
