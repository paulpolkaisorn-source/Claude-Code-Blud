import { openHarness } from './browser.mjs';
const { browser, page } = await openHarness({ query: 'sil&notex' });
const res = await page.evaluate(() => {
  window.__boot({ width: 64, height: 64, silhouette: false, noTex: true, pixelRatio: 1 });
  const out = [];
  window.__sub.viewer.state.root.updateMatrixWorld(true);
  window.__sub.viewer.state.root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    out.push([o.name, +(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +b.min.z.toFixed(2), +b.max.z.toFixed(2)]);
  });
  return out;
});
for (const r of res) console.log(r.join('  '));
await browser.close();
