// Render the view at many spins, write PNGs and the projected dust-cap centre, for logo-based spin matching.
// usage: node tools/spinscan.mjs <outDir> <viewId> [steps=72] [size=480]
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [out, view, nS = '72', sz = '480'] = process.argv.slice(2);
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const n = parseInt(nS), size = parseInt(sz);
const { P: P0 } = await import('../src/params.js');
const OVR = process.env.OVR ? JSON.parse(process.env.OVR) : null;
const { browser, page } = await openHarness();
const res = await page.evaluate(([pose, n, size, P0, OVR]) => {
  window.__boot({ width: size, height: size, pixelRatio: 1 });
  if (OVR) window.__sub.rebuild({ ...JSON.parse(JSON.stringify(P0)), ...OVR });
  const S = window.__sub, v = S.viewer;
  const urls = [];
  S.pose({ ...pose, spin: 0 });
  const p = new v.camera.position.constructor(0, 0, -2.4).project(v.camera);
  const center = [(p.x * 0.5 + 0.5) * size, (1 - (p.y * 0.5 + 0.5)) * size];
  // the dust cap radius in pixels: project a point on the rim
  const q = new v.camera.position.constructor(2.5, 0, -3.4).project(v.camera);
  const rim = [(q.x * 0.5 + 0.5) * size, (1 - (q.y * 0.5 + 0.5)) * size];
  for (let i = 0; i < n; i++) { S.pose({ ...pose, spin: (i * 360) / n }); urls.push(S.shot()); }
  return { urls, center, rim };
}, [poses[view], n, size, P0, OVR]);
res.urls.forEach((u, i) => writeFileSync(`${out}/scan_${view}_${String(i).padStart(2, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
writeFileSync(`${out}/scan_${view}.json`, JSON.stringify({ center: res.center, rim: res.rim, n, size }));
console.log(JSON.stringify({ center: res.center, rim: res.rim }));
await browser.close();
