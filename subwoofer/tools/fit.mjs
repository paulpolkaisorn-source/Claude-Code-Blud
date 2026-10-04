// Fit one camera per reference photo by maximising silhouette IoU against the photo cut-outs.
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const only = process.argv[2] ? process.argv[2].split(',') : ['3', '4', '1', '2'];
const poseFile = 'tools/poses.json';
const poses = existsSync(poseFile) ? JSON.parse(readFileSync(poseFile, 'utf8')) : {};
const Pover = process.env.POVER ? JSON.parse(readFileSync(process.env.POVER, 'utf8')) : null;

const { browser, page, logs } = await openHarness({ query: 'sil&notex' });
await page.evaluate(([r, P]) => {
  window.__boot({ width: r.w, height: r.h, silhouette: true, noTex: true });
  if (P) window.__sub.rebuild(P);
}, [refs[only[0]], Pover]);
for (const k of Object.keys(refs)) await page.evaluate(([k, r]) => window.__sub.setRef(k, r.w, r.h, r.b64), [k, refs[k]]);

const ev = (name, pose) => page.evaluate(([n, p]) => window.__sub.iou(n, p), [name, pose]);
const clampP = (p) => ({ ...p, pitch: Math.max(-85, Math.min(85, p.pitch)), fov: Math.max(6, Math.min(60, p.fov)), dist: Math.max(20, p.dist) });

async function autoFrame(name, pose, iters = 3) {
  const ref = refs[name];
  const rb = (() => { // reference bbox
    const a = Buffer.from(ref.b64, 'base64');
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
    for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) if (a[y * ref.w + x]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, x1, y0, y1, n };
  })();
  let p = { ...pose };
  let r;
  for (let i = 0; i < iters; i++) {
    r = await ev(name, p);
    if (r.area < 20) return { p, r };
    const [x0, y0, x1, y1] = r.bbox;
    const s = Math.sqrt(r.area / rb.n);
    p.dist *= s;
    const mcx = (x0 + x1) / 2, mcy = (y0 + y1) / 2;
    const rcx = (rb.x0 + rb.x1) / 2, rcy = (rb.y0 + rb.y1) / 2;
    p.shiftX += (rcx - mcx) / ref.w;
    p.shiftY += (rcy - mcy) / ref.h;
  }
  r = await ev(name, p);
  return { p, r };
}

function rand(sig) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sig; }

for (const name of only) {
  let best = poses[name];
  let bi = 0;
  if (!best) {
    // coarse grid search over viewing direction
    const cand = [];
    const yaws = name === '3' ? [0] : Array.from({ length: 24 }, (_, i) => -180 + i * 15);
    const pitches = name === '3' ? [0] : [-45, -30, -15, 0, 15, 30, 45];
    for (const yaw of yaws) for (const pitch of pitches) {
      const { p, r } = await autoFrame(name, { yaw, pitch, roll: 0, dist: 60, fov: 20, spin: 0, shiftX: 0, shiftY: 0, target: [0, 0, -3.5] }, 2);
      cand.push({ p, iou: r.iou });
    }
    cand.sort((a, b) => b.iou - a.iou);
    console.log(name, 'grid top', cand.slice(0, 3).map((c) => `${c.p.yaw}/${c.p.pitch}:${c.iou.toFixed(3)}`).join('  '));
    best = cand[0].p;
    bi = cand[0].iou;
  } else {
    bi = (await ev(name, best)).iou;
  }
  // stochastic refinement
  let sig = { yaw: 6, pitch: 5, roll: 3, fov: 2, dist: 0.04, shiftX: 0.01, shiftY: 0.01 };
  for (let it = 0; it < 260; it++) {
    const k = it < 130 ? 1 : it < 200 ? 0.4 : 0.15;
    const cand = { ...best };
    for (const key of Object.keys(sig)) if (Math.random() < 0.55) cand[key] = key === 'dist' ? best.dist * (1 + rand(sig[key] * k)) : best[key] + rand(sig[key] * k);
    if (name === '3') { cand.yaw = 0; cand.pitch = 0; }
    const c = clampP(cand);
    const r = await ev(name, c);
    if (r.iou > bi) { bi = r.iou; best = c; }
  }
  poses[name] = best;
  console.log(name, 'IoU', bi.toFixed(4), JSON.stringify(best, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
  writeFileSync(poseFile, JSON.stringify(poses, null, 1));
}
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
