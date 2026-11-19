// Render QA stills fast: one bundle, one browser, many frames.
// Usage: node scripts/stills.mjs <compositionId> <frame,frame,...> [outDir] [--bundle=dir]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [comp = "Teaser", framesArg = "0", outDir = "out/stills"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const bundleArg = process.argv.find((a) => a.startsWith("--bundle="));
const frames = framesArg.split(",").map((s) => parseInt(s, 10));
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = bundleArg ? bundleArg.split("=")[1] : await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "swangle" } });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
for (const frame of frames) {
  const t0 = Date.now();
  const output = path.join(outDir, `${comp}_${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, overwrite: true });
  console.log(`${output} ${Date.now() - t0}ms`);
}
await browser.close({ silent: true });
