import path from "node:path";
import { PresenceStore } from "@antiable/presence";
import { anitabiMapUrl } from "@antiable/anitabi";

/** Resolve presence DB from monorepo root when running via Next (apps/web). */
export function getPresenceDbPath(): string {
  if (process.env.PRESENCE_DB) return process.env.PRESENCE_DB;
  // apps/web → repo root
  return path.resolve(process.cwd(), "../../data/presence.sqlite");
}

export function openPresenceStore(): PresenceStore {
  return new PresenceStore(getPresenceDbPath());
}

export function presenceToPublic(record: {
  subjectId: number;
  title: string;
  titleCn: string;
  city: string;
  lat: number | null;
  lng: number | null;
  pointsLength: number;
  imagesLength: number;
  coverUrl: string | null;
  color: string | null;
  verifiedAt: string;
}) {
  return {
    ...record,
    mapUrl: anitabiMapUrl(record.subjectId),
  };
}
