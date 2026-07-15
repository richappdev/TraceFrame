import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptDir, "..");
const standaloneRoot = path.join(root, ".next", "standalone");
const candidates = [
  path.join(standaloneRoot, "server.js"),
  path.join(standaloneRoot, "apps", "web", "server.js"),
];
const serverJs = candidates.find((p) => existsSync(p));
if (!serverJs) {
  console.error("prepare-standalone: server.js not found under .next/standalone");
  process.exit(1);
}

const appDir = path.dirname(serverJs);
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(appDir, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(appDir, "public");
const seedSrc = path.join(root, "seed");
const seedDest = path.join(appDir, "seed");

mkdirSync(path.join(appDir, ".next"), { recursive: true });
if (existsSync(staticSrc)) cpSync(staticSrc, staticDest, { recursive: true });
if (existsSync(publicSrc)) cpSync(publicSrc, publicDest, { recursive: true });
if (existsSync(seedSrc)) cpSync(seedSrc, seedDest, { recursive: true });

const rel = path.relative(root, serverJs).replace(/\\/g, "/");
console.log(
  JSON.stringify({
    ok: true,
    serverJs: rel,
    runCommand: `node ${rel}`,
    staticCopied: existsSync(staticDest),
    seedCopied: existsSync(seedDest),
  }),
);
