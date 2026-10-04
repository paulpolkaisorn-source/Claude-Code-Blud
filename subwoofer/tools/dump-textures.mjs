import { openHarness } from './browser.mjs';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const { browser, page, logs } = await openHarness();
const urls = await page.evaluate(() => {
  window.__boot({ width: 64, height: 64, pixelRatio: 1 });
  const res = {};
  const seen = new Set();
  window.__sub.viewer.state.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    for (const k of ['map', 'normalMap']) {
      const t = m[k];
      if (t && t.image && !seen.has(t)) {
        seen.add(t);
        res[`${m.name}_${k}`] = t.image.toDataURL('image/png');
      }
    }
  });
  return res;
});
for (const [k, v] of Object.entries(urls)) writeFileSync(`${out}/tex_${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log(Object.keys(urls).join(' '));
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
