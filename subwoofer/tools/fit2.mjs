// Joint fit: shared shape dimensions + one camera per photo, maximising mean silhouette IoU.
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { P as P0 } from '../src/params.js';

const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const views = ['3', '4', '1', '2'];
const ITER = parseInt(process.env.ITER || '1200');
const poseFile = 'tools/poses2.json';
const shapeFile = 'tools/shape.json';
const saved = existsSync(poseFile) ? JSON.parse(readFileSync(poseFile, 'utf8')) : null;

const clone = (o) => JSON.parse(JSON.stringify(o));
let P = existsSync(shapeFile) ? { ...clone(P0), ...JSON.parse(readFileSync(shapeFile, 'utf8')) } : clone(P0);

// Derived/linked parameters keep the motor assembly contiguous: funnel -> band -> end cap.
function relink(P, { bandR, bandH, z1, funnelTop, funnelRatio }) {
  P.band.r = bandR; P.band.z1 = z1; P.band.z0 = z1 + bandH;
  const rF = bandR * funnelRatio;
  const z0 = P.band.z0;
  P.funnel = [[3.95, funnelTop], [4.15, funnelTop - 0.3], [4.5, funnelTop - 0.65], [rF - 0.1, z0 + 0.12], [rF, z0 + 0.04], [rF, z0]];
  P.endCap.r = Math.min(P.endCap.r, bandR - 0.4);
}
const DIM = { bandR: 5.2, bandH: 3.0, z1: -9.3, funnelTop: -4.6, funnelRatio: 0.94 };
const LIM = { bandR: [4.6, 5.7, 0.08], bandH: [1.8, 3.8, 0.15], z1: [-10.6, -8.4, 0.15], funnelTop: [-5.4, -3.8, 0.1], funnelRatio: [0.82, 1.0, 0.02] };
relink(P, DIM);
const SHAPE = [
  ...Object.keys(LIM).map((k) => ({ key: k, get: () => DIM[k], set: (P, v) => { DIM[k] = v; relink(P, DIM); }, sig: LIM[k][2], min: LIM[k][0], max: LIM[k][1] })),
  { key: 'rollApex', get: (P) => P.roll.pts[4][1], set: (P, v) => { const k = v / P.roll.pts[4][1]; P.roll.pts.forEach((p, i) => { if (i > 0 && i < 8) p[1] *= k; }); }, sig: 0.1, min: 0.5, max: 1.8 },
  { key: 'flangeT', get: (P) => P.flangeT, set: (P, v) => (P.flangeT = v), sig: 0.04, min: 0.25, max: 0.7 },
  { key: 'basketBulge', get: (P) => P.basketPts[3][0], set: (P, v) => { const d = v - P.basketPts[3][0]; [1, 2, 3, 4, 5].forEach((i, j) => (P.basketPts[i][0] += d * (j < 3 ? 1 : 0.6))); }, sig: 0.1, min: 5.2, max: 6.9 },
  { key: 'endCap.r', get: (P) => P.endCap.r, set: (P, v) => (P.endCap.r = Math.min(v, P.band.r - 0.35)), sig: 0.08, min: 3.8, max: 5.2 },
];

const { browser, page, logs } = await openHarness({ query: 'sil&notex' });
await page.evaluate(([r, P]) => { window.__boot({ width: r.w, height: r.h, silhouette: true, noTex: true }); window.__sub.rebuild(P); }, [refs['3'], P]);
for (const k of Object.keys(refs)) await page.evaluate(([k, r]) => window.__sub.setRef(k, r.w, r.h, r.b64), [k, refs[k]]);
const ev = (name, pose) => page.evaluate(([n, p]) => window.__sub.iou(n, p), [name, pose]);
const rebuild = async (P) => { await page.evaluate((P) => window.__sub.rebuild(P), P); };

const refBox = {};
for (const v of views) {
  const ref = refs[v];
  const a = Buffer.from(ref.b64, 'base64');
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
  for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) if (a[y * ref.w + x]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  refBox[v] = { x0, x1, y0, y1, n };
}
async function autoFrame(v, pose, iters = 3) {
  const rb = refBox[v];
  const ref = refs[v];
  let p = { ...pose };
  let r;
  for (let i = 0; i < iters; i++) {
    r = await ev(v, p);
    if (r.area < 20) return { p, r };
    const [x0, y0, x1, y1] = r.bbox;
    p.dist *= Math.sqrt(r.area / rb.n);
    p.shiftX += ((rb.x0 + rb.x1) / 2 - (x0 + x1) / 2) / ref.w;
    p.shiftY += ((rb.y0 + rb.y1) / 2 - (y0 + y1) / 2) / ref.h;
  }
  r = await ev(v, p);
  return { p, r };
}
function rand(sig) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sig; }

let FOV = saved?.fov ?? 18;
let poses = saved?.poses ?? {};
const base = (o = {}) => ({ yaw: 0, pitch: 0, roll: 0, dist: 60, fov: FOV, spin: 0, shiftX: 0, shiftY: 0, target: [0, 0, -3.5], ...o });

// ---- phase A: coarse search for the two angles that matter (pitch = 0 by construction)
for (const v of views) {
  if (poses[v]) continue;
  if (v === '3') { poses[v] = (await autoFrame(v, base())).p; continue; }
  const cand = [];
  const [lo, hi] = { '4': [-80, 80], '1': [100, 260], '2': [100, 260] }[v];
  for (let y0 = lo; y0 <= hi; y0 += 10) for (let roll = -180; roll < 180; roll += 20) {
    const yaw = ((y0 + 180) % 360) - 180;
    const { p, r } = await autoFrame(v, base({ yaw, roll }), 2);
    cand.push({ p, iou: r.iou });
  }
  cand.sort((a, b) => b.iou - a.iou);
  console.log(v, 'grid', cand.slice(0, 4).map((c) => `${c.p.yaw}/${c.p.roll}:${c.iou.toFixed(3)}`).join('  '));
  poses[v] = cand[0].p;
}

async function evalAll() {
  const out = {};
  for (const v of views) out[v] = (await ev(v, { ...poses[v], fov: poses[v].fov ?? FOV })).iou;
  return out;
}
let cur = await evalAll();
const mean = (o) => views.reduce((s, v) => s + o[v], 0) / views.length;
let best = mean(cur);
console.log('start', JSON.stringify(cur), best.toFixed(4));

for (let it = 0; it < ITER; it++) {
  const k = it < ITER * 0.5 ? 1 : it < ITER * 0.8 ? 0.45 : 0.2;
  const u = Math.random();
  if (u < 0.28) {
    // shape move
    const P2 = clone(P);
    const DIM0 = { ...DIM };
    const n = 1 + (Math.random() < 0.35 ? 1 : 0);
    const used = [];
    for (let i = 0; i < n; i++) {
      const s = SHAPE[Math.floor(Math.random() * SHAPE.length)];
      used.push(s.key);
      const v = Math.min(s.max, Math.max(s.min, s.get(P2) + rand(s.sig * k)));
      s.set(P2, v);
    }
    await rebuild(P2);
    const c2 = await evalAll();
    if (mean(c2) > best) { P = P2; cur = c2; best = mean(c2); console.log(it, 'shape', used.join(','), best.toFixed(4)); }
    else { Object.assign(DIM, DIM0); await rebuild(P); }
  } else if (u < 0.97) {
    // camera move on one view
    const v = views[Math.floor(Math.random() * views.length)];
    const cand = { ...poses[v] };
    const keys = v === '3' ? ['dist', 'shiftX', 'shiftY'] : ['yaw', 'roll', 'dist', 'shiftX', 'shiftY', 'pitch'];
    for (const key of keys) if (Math.random() < 0.5) {
      const sig = { yaw: 5, roll: 4, pitch: 2, dist: 0.03, shiftX: 0.008, shiftY: 0.008 }[key] * k;
      cand[key] = key === 'dist' ? cand.dist * (1 + rand(sig)) : cand[key] + rand(sig);
    }
    cand.pitch = Math.max(-25, Math.min(25, cand.pitch));
    if (Math.random() < 0.35) {
      // change perspective strength while keeping the apparent size of the target constant
      const f0 = cand.fov ?? FOV;
      const f1 = Math.max(6, Math.min(45, f0 * (1 + rand(0.06 * k))));
      cand.dist *= Math.tan(f0 * Math.PI / 360) / Math.tan(f1 * Math.PI / 360);
      cand.fov = f1;
    }
    const r = await ev(v, { ...cand, fov: cand.fov ?? FOV });
    if (r.iou > cur[v]) { poses[v] = cand; cur[v] = r.iou; best = mean(cur); }
  } else {
    // shared field of view
    const f2 = Math.max(8, Math.min(40, FOV + rand(1.2 * k)));
    const old = FOV;
    FOV = f2;
    const c2 = await evalAll();
    if (mean(c2) > best) { cur = c2; best = mean(c2); console.log(it, 'fov', FOV.toFixed(2), best.toFixed(4)); }
    else FOV = old;
  }
  if (it % 100 === 99) {
    console.log(it, JSON.stringify(Object.fromEntries(views.map((v) => [v, +cur[v].toFixed(3)]))), 'mean', best.toFixed(4), 'fov', FOV.toFixed(2));
    writeFileSync(poseFile, JSON.stringify({ fov: FOV, poses }, null, 1));
    writeFileSync(shapeFile, JSON.stringify({ band: P.band, funnel: P.funnel, roll: P.roll, flangeT: P.flangeT, basketPts: P.basketPts, endCap: P.endCap }, null, 1));
  }
}
writeFileSync(poseFile, JSON.stringify({ fov: FOV, poses }, null, 1));
writeFileSync(shapeFile, JSON.stringify({ band: P.band, funnel: P.funnel, roll: P.roll, flangeT: P.flangeT, basketPts: P.basketPts, endCap: P.endCap }, null, 1));
console.log('final', JSON.stringify(cur), best.toFixed(4));
console.log(JSON.stringify({ fov: FOV, poses }, null, 1));
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
