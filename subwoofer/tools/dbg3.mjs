import { openHarness } from './browser.mjs';
const { browser, page } = await openHarness({ query: 'sil&notex' });
const res = await page.evaluate(() => {
  window.__boot({ width: 64, height: 64, silhouette: false, noTex: true, pixelRatio: 1 });
  const root = window.__sub.viewer.state.root;
  const sp = root.getObjectByName('Spokes');
  const p = sp.geometry.attributes.position;
  let best = null;
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); if (!best || r > best.r) best = { r, x: p.getX(i), y: p.getY(i), z: p.getZ(i) }; }
  const rad = []; for (let i = 0; i < p.count; i += 97) rad.push(+Math.hypot(p.getX(i), p.getY(i)).toFixed(2));
  return { best, rad: rad.slice(0, 60), group: sp.parent.name, rot: sp.parent.rotation.z };
});
console.log(JSON.stringify(res));
await browser.close();
