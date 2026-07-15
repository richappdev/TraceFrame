export { BangumiClient } from "./client";
export type {
  BangumiClientOptions,
  BangumiImageSet,
  BangumiPagedResponse,
  BangumiSort,
  BangumiSubjectSummary,
  RankedSubjectsParams,
} from "./types";
export { SUBJECT_TYPE_ANIME } from "./types";

/** Default UA for this product (override contact URL in deploy). */
export function defaultBangumiUserAgent(
  version = "0.1.0",
  contactUrl = "https://github.com/antiable/trip",
): string {
  return `antiable/trip (${version}) (${contactUrl})`;
}
