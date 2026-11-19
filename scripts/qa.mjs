// QA checks for a rendered teaser.
// Usage: node scripts/qa.mjs <video.mp4> [--determinism=frame,frame,...] [--comp=Teaser]
//  1. Length: frame count, fps, duration (expects 1800 frames @ 60 fps = 30.0 s)
//  2. Black frames: per-frame max luma; only frame 0 and the final frame may be empty
//  3. Determinism: renders the given frames twice in two fresh browsers, compares PNG hashes
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
let failures = 0;
const report = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

if (video) {
  // ---- 1. length ----
  const probe = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames,r_frame_rate,width,height,codec_name,pix_fmt", "-show_entries", "format=duration", "-of", "json", video]).toString(),
  );
  const s = probe.streams[0];
  const [num, den] = s.r_frame_rate.split("/").map(Number);
  const fps = num / den;
  const frames = Number(s.nb_read_frames);
  report(frames === 1800 && fps === 60, `length: ${frames} frames @ ${fps} fps = ${(frames / fps).toFixed(3)} s (${s.width}x${s.height} ${s.codec_name} ${s.pix_fmt})`);
  const audio = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "csv=p=0", video]).toString().trim();
  console.log(`info  audio stream: ${audio || "none"}`);

  // ---- 2. black frames ----
  const out = execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=-", "-f", "null", "-"], { maxBuffer: 64 * 1024 * 1024 }).toString();
  const ymax = [...out.matchAll(/lavfi\.signalstats\.YMAX=(\d+)/g)].map((m) => Number(m[1]));
  // Void black #05060A is ~Y 21 in limited range; "fully black" = nothing brighter than a faint grain speck.
  const THRESH = 40;
  const dark = ymax.map((y, i) => [i, y]).filter(([, y]) => y <= THRESH).map(([i]) => i);
  const unexpected = dark.filter((i) => i !== 0 && i !== ymax.length - 1);
  report(unexpected.length === 0, `black frames (YMAX <= ${THRESH}): [${dark.join(", ")}]; unexpected: [${unexpected.join(", ")}]`);
  const lowest = ymax.map((y, i) => [i, y]).filter(([i]) => i !== 0 && i !== ymax.length - 1).sort((a, b) => a[1] - b[1]).slice(0, 5);
  console.log(`info  darkest non-edge frames (frame:YMAX): ${lowest.map(([i, y]) => `${i}:${y}`).join("  ")}`);
}

// ---- 3. determinism ----
const detFrames = opt("determinism", "");
if (detFrames) {
  const { bundle } = await import("@remotion/bundler");
  const { openBrowser, renderStill, selectComposition } = await import("@remotion/renderer");
  const comp = opt("comp", "Teaser");
  const frames = detFrames.split(",").map(Number);
  const dir = path.resolve("out/qa-determinism");
  fs.mkdirSync(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const hashes = [];
  for (let pass = 0; pass < 2; pass++) {
    const browser = await openBrowser("chrome", { chromiumOptions: { gl: "swangle" } });
    const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
    // second pass renders in reverse order, so each frame is reached from a different history
    const order = pass === 0 ? frames : [...frames].reverse();
    const h = {};
    for (const frame of order) {
      const output = path.join(dir, `${comp}_${frame}_pass${pass}.png`);
      await renderStill({ serveUrl, composition, frame, output, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, overwrite: true });
      h[frame] = crypto.createHash("sha256").update(fs.readFileSync(output)).digest("hex").slice(0, 16);
    }
    hashes.push(h);
    await browser.close({ silent: true });
  }
  for (const f of frames) report(hashes[0][f] === hashes[1][f], `determinism frame ${f}: ${hashes[0][f]} vs ${hashes[1][f]}`);
}

process.exit(failures ? 1 : 0);
