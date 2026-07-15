import path from "node:path";
import { loadValidIdsCsv, PresenceStore } from "@antiable/presence";
import { anitabiMapUrl } from "@antiable/anitabi";
import { getDataDir, getSeedCsvPath } from "./paths";

let seeded = false;

/** Resolve presence DB path (local data/ or /tmp on App Hosting). */
export function getPresenceDbPath(): string {
  if (process.env.PRESENCE_DB) return process.env.PRESENCE_DB;
  return path.join(getDataDir(), "presence.sqlite");
}

function ensureSeeded(store: PresenceStore): void {
  if (seeded || store.count() > 0) {
    seeded = true;
    return;
  }
  try {
    const csvPath = getSeedCsvPath();
    const records = loadValidIdsCsv(csvPath);
    if (records.length > 0) {
      store.upsertMany(records);
    }
  } catch (err) {
    console.warn("[presence] seed import skipped:", err);
  } finally {
    seeded = true;
  }
}

export function openPresenceStore(): PresenceStore {
  const store = new PresenceStore(getPresenceDbPath());
  ensureSeeded(store);
  return store;
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
