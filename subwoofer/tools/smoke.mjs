import { openHarness } from './browser.mjs';
import { writeFileSync } from 'node:fs';
const t0 = Date.now();
const { browser, page, logs } = await openHarness();
const res = await page.evaluate(async () => {
  const t = performance.now();
  window.__boot({ width: 640, height: 640 });
  const tb = performance.now() - t;
  window.__sub.pose({ yaw: 0, pitch: 0, dist: 120, fov: 12 });
  const url = window.__sub.shot();
  const tri = (() => { let n = 0; window.__sub.viewer.state.root.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; })();
  return { url, buildMs: tb, tris: tri };
});
writeFileSync(process.argv[2] || 'out_smoke.png', Buffer.from(res.url.split(',')[1], 'base64'));
console.log('build ms', res.buildMs.toFixed(0), 'tris', res.tris, 'total s', ((Date.now() - t0) / 1000).toFixed(1));
console.log(logs.join('\n'));
await browser.close();
