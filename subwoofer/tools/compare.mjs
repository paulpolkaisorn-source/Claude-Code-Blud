// Render the textured model with the fitted camera of a photo and write ref|render side by side.
// usage: node tools/compare.mjs <outDir> <ids,comma> [size=640]
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const outDir = process.argv[2];
const ids = (process.argv[3] || '3').split(',');
const SIZE = parseInt(process.argv[4] || '640');
const fitted = existsSync('tools/poses3.json') ? { fov: 20, poses: JSON.parse(readFileSync('tools/poses3.json', 'utf8')) } : { fov: 20, poses: {} };
const manual = existsSync('tools/poses_manual.json') ? JSON.parse(readFileSync('tools/poses_manual.json', 'utf8')) : {};
const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const Pover = existsSync('tools/shape3.json') && process.env.SHAPE ? JSON.parse(readFileSync('tools/shape3.json', 'utf8')) : null;
const { P: P0 } = await import('../src/params.js');
const P = Pover && !process.env.NOSHAPE ? { ...JSON.parse(JSON.stringify(P0)), ...Pover } : null;

const { browser, page, logs } = await openHarness();
for (const id of ids) {
  const ref = refs[id] || { w: 1, h: 1, W: 1920, H: 1920 };
  const asp = ref.W / ref.H;
  const w = Math.round(asp >= 1 ? SIZE : SIZE * asp);
  const h = Math.round(asp >= 1 ? SIZE / asp : SIZE);
  const pose = manual[id] || (fitted.poses[id] ? { ...fitted.poses[id], fov: fitted.poses[id].fov ?? fitted.fov } : { yaw: 0, pitch: 0, roll: 0, dist: 61.2, fov: 20, spin: 0, shiftX: 0, shiftY: 0, target: [0, 0, -3.5] });
  const url = await page.evaluate(async ([w, h, pose, P]) => {
    if (!window.__sub) window.__boot({ width: w, height: h, pixelRatio: 1 });
    if (P) window.__sub.rebuild(P);
    window.__sub.resize(w, h);
    window.__sub.pose(pose);
    return window.__sub.shot();
  }, [w, h, pose, P]);
  writeFileSync(`${outDir}/render_${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('rendered', id, w, h);
}
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
