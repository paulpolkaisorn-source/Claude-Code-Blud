// Render views with explicit spin/twist overrides and write photo|render crops.
// usage: node tools/pose_cmp.mjs <outDir> '{"4":{"spin":350},"1":{"spin":95}}' [P-override-json] [size=720]
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [out, spec, ovr = '{}', sz = '720'] = process.argv.slice(2);
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const { P: P0 } = await import('../src/params.js');
const P = { ...JSON.parse(JSON.stringify(P0)), ...JSON.parse(ovr) };
const want = JSON.parse(spec);
const { browser, page, logs } = await openHarness();
for (const [id, extra] of Object.entries(want)) {
  const url = await page.evaluate(([pose, P, size]) => {
    const asp = pose.crop ? (pose.crop[2] - pose.crop[0]) / (pose.crop[3] - pose.crop[1]) : 1;
    const W = Math.round(size * asp);
    if (!window.__sub) window.__boot({ width: W, height: size, pixelRatio: 1 });
    window.__sub.resize(W, size);
    window.__sub.rebuild(P);
    window.__sub.pose(pose);
    return window.__sub.shot();
  }, [{ ...poses[id], ...extra }, P, parseInt(sz)]);
  writeFileSync(`${out}/render_${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
