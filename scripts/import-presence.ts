#!/usr/bin/env tsx
/**
 * Import valid-ids.csv into SQLite presence store (E0.4).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadValidIdsCsv, PresenceStore } from "@antiable/presence";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = process.env.VALID_IDS_CSV ?? path.join(root, "valid-ids.csv");
const dbPath = process.env.PRESENCE_DB ?? path.join(root, "data", "presence.sqlite");

function main() {
  const records = loadValidIdsCsv(csvPath);
  const store = new PresenceStore(dbPath);
  const n = store.upsertMany(records);
  const cities = store.cityStats(10);
  console.log(
    JSON.stringify(
      {
        ok: true,
        csvPath,
        dbPath,
        imported: n,
        total: store.count(),
        topCities: cities.map((c) => ({ city: c.city, titles: c.titleCount })),
      },
      null,
      2,
    ),
  );
  store.close();
}

main();
