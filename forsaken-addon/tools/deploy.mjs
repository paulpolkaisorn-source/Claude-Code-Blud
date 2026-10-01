// Copies the packs into a com.mojang folder for fast iteration.
// Usage: FORSAKEN_COM_MOJANG="<path to com.mojang>" npm run deploy
import fs from "node:fs";
import path from "node:path";
import { BP, RP } from "./lib/fsutil.mjs";

const target = process.env.FORSAKEN_COM_MOJANG;
if (!target) {
  console.error("[deploy] Set FORSAKEN_COM_MOJANG to your com.mojang folder, for example:");
  console.error('  Windows (PowerShell): $env:FORSAKEN_COM_MOJANG="$env:APPDATA\\Minecraft Bedrock\\Users\\Shared\\games\\com.mojang"; npm run deploy');
  console.error('  Linux/macOS: FORSAKEN_COM_MOJANG=/path/to/com.mojang npm run deploy');
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.error(`[deploy] ${target} does not exist`);
  process.exit(1);
}
if (!fs.existsSync(path.join(BP, "scripts", "main.js"))) {
  console.error("[deploy] packs/Forsaken_BP/scripts/main.js missing - run npm run build first");
  process.exit(1);
}
for (const [src, sub] of [[BP, "development_behavior_packs"], [RP, "development_resource_packs"]]) {
  const dest = path.join(target, sub, path.basename(src));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`[deploy] ${path.basename(src)} -> ${dest}`);
}
