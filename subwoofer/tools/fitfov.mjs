// For views 1 and 2: re-optimise the camera from several starting fields of view and report chamfer.
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { P as P0 } from '../src/params.js';
const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const views = (process.argv[2] || '1,2,4').split(',');
const fovs = [10, 14, 20, 28, 38];
const { browser, page } = await openHarness({ query: 'sil&notex' });
await page.evaluate(([r, P]) => { window.__boot({ width: r.w, height: r.h, silhouette: true, noTex: true }); window.__sub.rebuild(P); }, [refs['3'], P0]);
for (const k of Object.keys(refs)) await page.evaluate(([k, r]) => window.__sub.setRef(k, r.w, r.h, r.b64), [k, refs[k]]);
const ev = (n, p) => page.evaluate(([n, p]) => window.__sub.chamfer(n, p), [n, p]);
function rand(sig) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sig; }
const out = {};
for (const v of views) {
  const p0 = poses[v];
  const rb = (() => { const a = Buffer.from(refs[v].b64, 'base64'); let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0; const { w, h } = refs[v]; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1, n }; })();
  for (const fov of fovs) {
    let cur = { ...p0, fov, dist: p0.dist * Math.tan(p0.fov * Math.PI / 360) / Math.tan(fov * Math.PI / 360) };
    // re-frame
    for (let i = 0; i < 3; i++) {
      const r = await ev(v, cur);
      const [x0, y0, x1, y1] = r.bbox;
      cur.dist *= Math.sqrt(r.area / rb.n);
      cur.shiftX += ((rb.x0 + rb.x1) / 2 - (x0 + x1) / 2) / refs[v].w;
      cur.shiftY += ((rb.y0 + rb.y1) / 2 - (y0 + y1) / 2) / refs[v].h;
    }
    let cs = (await ev(v, cur)).score;
    for (let it = 0; it < 160; it++) {
      const k = it < 80 ? 1 : 0.4;
      const c = { ...cur };
      for (const key of ['yaw', 'roll', 'pitch', 'dist', 'shiftX', 'shiftY']) if (Math.random() < 0.5) {
        const sig = { yaw: 4, roll: 4, pitch: 2, dist: 0.02, shiftX: 0.006, shiftY: 0.006 }[key] * k;
        c[key] = key === 'dist' ? c.dist * (1 + rand(sig)) : c[key] + rand(sig);
      }
      c.pitch = Math.max(-25, Math.min(25, c.pitch));
      const r = await ev(v, c);
      if (r.score < cs) { cs = r.score; cur = c; }
    }
    console.log(v, 'fov', fov, 'chamfer', cs.toFixed(2), 'yaw', cur.yaw.toFixed(1), 'pitch', cur.pitch.toFixed(1), 'roll', cur.roll.toFixed(1), 'dist', cur.dist.toFixed(1));
    out[`${v}_${fov}`] = { score: cs, pose: cur };
  }
}
writeFileSync('tools/fitfov.json', JSON.stringify(out, null, 1));
await browser.close();
