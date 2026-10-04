// Contact sheet: render a view at several spins about the speaker axis.
// usage: node tools/spin.mjs <outDir> <viewId> [n=8] [size=360]
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [out, view, nS = '8', sz = '360'] = process.argv.slice(2);
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const n = parseInt(nS), size = parseInt(sz);
const s0 = parseFloat(process.env.S0 || '0'), ds = parseFloat(process.env.DS || String(360 / n));
const { P: P0 } = await import('../src/params.js');
const OVR = process.env.OVR ? JSON.parse(process.env.OVR) : null; // list of param overrides, one per tile
const { browser, page, logs } = await openHarness();
const urls = await page.evaluate(([pose, n, size, s0, ds, P0, OVR]) => {
  window.__boot({ width: size, height: size, pixelRatio: 1 });
  const res = [];
  for (let i = 0; i < n; i++) {
    if (OVR) window.__sub.rebuild({ ...JSON.parse(JSON.stringify(P0)), ...OVR[i] });
    window.__sub.pose({ ...pose, spin: s0 + i * ds });
    res.push(window.__sub.shot());
  }
  return res;
}, [poses[view], n, size, s0, ds, P0, OVR]);
urls.forEach((u, i) => writeFileSync(`${out}/spin_${view}_${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
