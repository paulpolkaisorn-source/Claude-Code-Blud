import { openHarness } from './browser.mjs';
const { browser, page } = await openHarness({ query: 'sil&notex' });
const res = await page.evaluate(() => {
  window.__boot({ width: 64, height: 64, silhouette: false, noTex: true, pixelRatio: 1 });
  const root = window.__sub.viewer.state.root;
  const out = {};
  root.updateMatrixWorld(true);
  for (const name of ['Spokes', 'SpokeRails', 'SpokeRibs', 'Neck', 'NeckTerraces']) {
    const m = root.getObjectByName(name);
    const p = m.geometry.attributes.position;
    let mx = 0, worst = null, nan = 0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (!isFinite(x + y + z)) { nan++; continue; }
      const r = Math.hypot(x, y);
      if (r > mx) { mx = r; worst = [x, y, z].map((v) => +v.toFixed(2)); }
    }
    out[name] = { count: p.count, maxR: +mx.toFixed(2), worst, nan };
  }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
