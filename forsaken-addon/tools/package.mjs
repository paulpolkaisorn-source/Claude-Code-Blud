// Packs packs/Forsaken_BP and packs/Forsaken_RP into dist/Forsaken.mcaddon (a zip).
import fs from "node:fs";
import path from "node:path";
import { ROOT, BP, RP, walk } from "./lib/fsutil.mjs";
import { createZip } from "./lib/zip.mjs";

const entries = [];
for (const [dir, prefix] of [[BP, "Forsaken_BP"], [RP, "Forsaken_RP"]]) {
  for (const f of walk(dir)) {
    const r = path.relative(dir, f).split(path.sep).join("/");
    if (r.endsWith(".md")) continue;
    entries.push({ name: `${prefix}/${r}`, data: fs.readFileSync(f) });
  }
}
if (!entries.some((e) => e.name === "Forsaken_BP/scripts/main.js")) {
  console.error("[package] Forsaken_BP/scripts/main.js is missing - run the build step first");
  process.exit(1);
}
const out = path.join(ROOT, "dist", "Forsaken.mcaddon");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, createZip(entries));
console.log(`[package] wrote dist/Forsaken.mcaddon (${entries.length} files, ${(fs.statSync(out).size / 1024).toFixed(1)} KiB)`);
