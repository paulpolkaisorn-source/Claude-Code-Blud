import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const outDir = process.argv[2];
import { P as P0 } from '../src/params.js';
const Pover = process.env.SHAPE ? { ...JSON.parse(JSON.stringify(P0)), ...JSON.parse(readFileSync('tools/shape3.json', 'utf8')) } : JSON.parse(JSON.stringify(P0));
const { browser, page, logs } = await openHarness({ query: 'sil&notex' });
await page.evaluate(([r, P]) => { window.__boot({ width: r.w, height: r.h, silhouette: true, noTex: true }); if (P) window.__sub.rebuild(P); }, [refs['3'], Pover]);
for (const k of Object.keys(refs)) await page.evaluate(([k, r]) => window.__sub.setRef(k, r.w, r.h, r.b64), [k, refs[k]]);
for (const name of Object.keys(poses)) {
  const url = await page.evaluate(([n, p]) => window.__sub.overlay(n, p, 2), [name, poses[name]]);
  writeFileSync(`${outDir}/ov_${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
