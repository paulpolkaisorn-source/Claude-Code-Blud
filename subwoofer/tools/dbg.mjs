import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const fit = JSON.parse(readFileSync('tools/poses2.json', 'utf8'));
const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const pose = { ...fit.poses['4'], fov: fit.poses['4'].fov ?? fit.fov };
const { browser, page } = await openHarness({ query: 'sil&notex' });
const urls = await page.evaluate(([pose, r]) => {
  window.__boot({ width: r.w, height: r.h, pixelRatio: 1, silhouette: true, noTex: true });
  window.__sub.setRef('4', r.w, r.h, r.b64);
  const a = window.__sub.overlay('4', pose, 1);
  const b = window.__sub.shot();
  const m = window.__sub.iou('4', pose);
  const c = window.__sub.shot();
  return { a, b, c, iou: m.iou, size: [r.w, r.h] };
}, [pose, refs['4']]);
console.log(urls.iou, urls.size);
for (const k of ['a', 'b', 'c']) writeFileSync(`${process.argv[2]}/dbg_${k}.png`, Buffer.from(urls[k].split(',')[1], 'base64'));
await browser.close();
