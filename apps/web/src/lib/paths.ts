import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

/**
 * Writable data dir.
 * - Local monorepo: ../../data from apps/web cwd
 * - Cloud Run / App Hosting: ephemeral /tmp (override with DATA_DIR)
 */
export function getDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.NODE_ENV === "production") {
    return path.join(os.tmpdir(), "antiable");
  }
  return path.resolve(process.cwd(), "../../data");
}

/** Seed CSV shipped with the web app for cold-start presence import. */
export function getSeedCsvPath(): string {
  if (process.env.VALID_IDS_CSV && existsSync(process.env.VALID_IDS_CSV)) {
    return process.env.VALID_IDS_CSV;
  }
  const candidates = [
    path.resolve(process.cwd(), "seed/valid-ids.csv"),
    path.resolve(process.cwd(), "apps/web/seed/valid-ids.csv"),
    path.resolve(process.cwd(), "../../valid-ids.csv"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0]!;
}
