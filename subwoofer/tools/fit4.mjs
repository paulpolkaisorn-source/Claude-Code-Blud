// Camera + shape fit using symmetric chamfer distance between silhouette boundaries.
// usage: STAGE=cam|joint ITER=n node tools/fit3.mjs
import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { P as P0 } from '../src/params.js';

const refs = JSON.parse(readFileSync('tools/refmasks.json', 'utf8'));
const views = ['3', '4', '1', '2'];
const STAGE = process.env.STAGE || 'cam';
const ITER = parseInt(process.env.ITER || '400');
const poseFile = 'tools/poses4.json';
const shapeFile = 'tools/shape4.json';
const clone = (o) => JSON.parse(JSON.stringify(o));
let P = clone(P0);
if (existsSync(shapeFile)) P = { ...P, ...JSON.parse(readFileSync(shapeFile, 'utf8')) };
let poses = existsSync(poseFile) ? JSON.parse(readFileSync(poseFile, 'utf8')) : JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
let FOV = parseFloat(process.env.FOV0 || '30');
for (const v of views) if (v !== '3' && Math.abs(poses[v].fov - FOV) > 1e-6 && !existsSync(poseFile)) { poses[v].dist *= Math.tan(poses[v].fov * Math.PI / 360) / Math.tan(FOV * Math.PI / 360); poses[v].fov = FOV; }
const SH = ['1', '2', '4'];

const BASKET0 = clone(P0.basketPts);
const DIM = { bandR: 5.3, bandH: 3.2, z1: -9.9, Lf: 1.15, funnelRatio: 1.0 };
function relink(P, { bandR, bandH, z1, Lf, funnelRatio }) {
  P.band.r = bandR; P.band.z1 = z1; P.band.z0 = z1 + bandH;
  const rF = bandR * funnelRatio, z0 = P.band.z0, top = z0 + Lf;
  P.funnel = [0, 0.12, 0.3, 0.55, 0.8, 0.95, 1].map((t) => [3.95 + (rF - 3.95) * Math.pow(t, 0.75), top + (z0 - top) * t]);
  const kz = (-0.3 - top) / (-0.3 + 4.05);
  P.basketPts = BASKET0.map(([r, z]) => [r, -0.3 + (z + 0.3) * kz]);
  P.endCap.r = Math.min(P.endCap.r, bandR - 0.4);
}
relink(P, DIM);
const LIM = { bandR: [4.6, 6.4, 0.08], bandH: [2.0, 4.4, 0.15], z1: [-10.8, -8.0, 0.15], Lf: [0.8, 1.6, 0.06], funnelRatio: [0.82, 1.02, 0.02] };
const SHAPE = [
  ...Object.keys(LIM).map((k) => ({ key: k, get: () => DIM[k], set: (P, v) => { DIM[k] = v; relink(P, DIM); }, sig: LIM[k][2], min: LIM[k][0], max: LIM[k][1] })),
  { key: 'rollApex', get: (P) => P.roll.pts[4][1], set: (P, v) => { const k = v / P.roll.pts[4][1]; P.roll.pts.forEach((p, i) => { if (i > 0 && i < 8) p[1] *= k; }); }, sig: 0.1, min: 0.5, max: 1.6 },
  { key: 'flangeT', get: (P) => P.flangeT, set: (P, v) => (P.flangeT = v), sig: 0.04, min: 0.25, max: 0.7 },
  { key: 'endCap.r', get: (P) => P.endCap.r, set: (P, v) => (P.endCap.r = Math.min(v, P.band.r - 0.35)), sig: 0.08, min: 3.8, max: 5.2 },
];

const { browser, page, logs } = await openHarness({ query: 'sil&notex' });
await page.evaluate(([r, P]) => { window.__boot({ width: r.w, height: r.h, silhouette: true, noTex: true }); window.__sub.rebuild(P); }, [refs['3'], P]);
for (const k of Object.keys(refs)) await page.evaluate(([k, r]) => window.__sub.setRef(k, r.w, r.h, r.b64), [k, refs[k]]);
const ev = (name, pose) => page.evaluate(([n, p]) => window.__sub.chamfer(n, p), [name, pose]);
const rebuild = async (P) => { await page.evaluate((P) => window.__sub.rebuild(P), P); };

const refBox = {};
for (const v of views) {
  const ref = refs[v];
  const a = Buffer.from(ref.b64, 'base64');
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
  for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) if (a[y * ref.w + x]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  refBox[v] = { x0, x1, y0, y1, n };
}
async function autoFrame(v, pose, iters = 2) {
  const rb = refBox[v], ref = refs[v];
  let p = { ...pose }, r;
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
const base = (o = {}) => ({ yaw: 0, pitch: 0, roll: 0, dist: 60, fov: 18, spin: 0, shiftX: 0, shiftY: 0, target: [0, 0, -3.5], ...o });

// ---- phase A: coarse grid (only for views without a pose yet)
for (const v of views) {
  if (poses[v]) continue;
  if (v === '3') { poses[v] = (await autoFrame(v, base(), 3)).p; continue; }
  const cand = [];
  const [lo, hi] = { '4': [-80, 80], '1': [100, 260], '2': [100, 260] }[v];
  for (let y0 = lo; y0 <= hi; y0 += 10) for (let roll = -180; roll < 180; roll += 15) {
    const yaw = ((y0 + 180) % 360) - 180;
    const { p, r } = await autoFrame(v, base({ yaw, roll }), 2);
    cand.push({ p, s: r.score });
  }
  cand.sort((a, b) => a.s - b.s);
  console.log(v, 'grid', cand.slice(0, 5).map((c) => `${c.p.yaw}/${c.p.roll}:${c.s.toFixed(2)}`).join('  '));
  // refine the best few and keep the best
  let bestP = null, bestS = 1e9;
  for (const c of cand.slice(0, 4)) {
    let cur = c.p, cs = c.s;
    for (let it = 0; it < 70; it++) {
      const k = it < 35 ? 1 : 0.4;
      const cn = { ...cur };
      for (const key of ['yaw', 'roll', 'dist', 'shiftX', 'shiftY', 'pitch']) if (Math.random() < 0.5) {
        const sig = { yaw: 5, roll: 5, pitch: 2.5, dist: 0.03, shiftX: 0.008, shiftY: 0.008 }[key] * k;
        cn[key] = key === 'dist' ? cn.dist * (1 + rand(sig)) : cn[key] + rand(sig);
      }
      cn.pitch = Math.max(-20, Math.min(20, cn.pitch));
      const r = await ev(v, cn);
      if (r.score < cs) { cs = r.score; cur = cn; }
    }
    console.log(v, 'refined cand', cur.yaw.toFixed(1), cur.roll.toFixed(1), cs.toFixed(2));
    if (cs < bestS) { bestS = cs; bestP = cur; }
  }
  poses[v] = bestP;
  writeFileSync(poseFile, JSON.stringify(poses, null, 1));
}

async function evalAll() { const o = {}; for (const v of views) o[v] = (await ev(v, poses[v])).score; return o; }
const mean = (o) => views.reduce((s, v) => s + o[v], 0) / views.length;
let cur = await evalAll(), best = mean(cur);
console.log('start', JSON.stringify(cur), best.toFixed(3));

for (let it = 0; it < ITER; it++) {
  const k = it < ITER * 0.5 ? 1 : it < ITER * 0.8 ? 0.45 : 0.2;
  const u = Math.random();
  if (STAGE === 'joint' && u < 0.3) {
    const P2 = clone(P), DIM0 = { ...DIM };
    const n = 1 + (Math.random() < 0.35 ? 1 : 0), used = [];
    for (let i = 0; i < n; i++) {
      const s = SHAPE[Math.floor(Math.random() * SHAPE.length)];
      used.push(s.key);
      s.set(P2, Math.min(s.max, Math.max(s.min, s.get(P2) + rand(s.sig * k))));
    }
    await rebuild(P2);
    const c2 = await evalAll();
    if (mean(c2) < best) { P = P2; cur = c2; best = mean(c2); console.log(it, 'shape', used.join(','), best.toFixed(3)); }
    else { Object.assign(DIM, DIM0); await rebuild(P); }
  } else if (u < 0.38) {
    const f0 = FOV, f1 = Math.max(8, Math.min(60, f0 * (1 + rand(0.06 * k))));
    const old = SH.map((v) => ({ ...poses[v] }));
    for (const v of SH) { poses[v].dist *= Math.tan(f0 * Math.PI / 360) / Math.tan(f1 * Math.PI / 360); poses[v].fov = f1; }
    const c2 = await evalAll();
    if (mean(c2) < best) { cur = c2; best = mean(c2); FOV = f1; console.log(it, 'fov', f1.toFixed(2), best.toFixed(3)); }
    else SH.forEach((v, i) => (poses[v] = old[i]));
  } else {
    const v = views[Math.floor(Math.random() * views.length)];
    const cand = { ...poses[v] };
    const keys = v === '3' ? ['dist', 'shiftX', 'shiftY'] : ['yaw', 'roll', 'dist', 'shiftX', 'shiftY', 'pitch'];
    for (const key of keys) if (Math.random() < 0.5) {
      const sig = { yaw: 3, roll: 3, pitch: 1.5, dist: 0.02, shiftX: 0.005, shiftY: 0.005 }[key] * k;
      cand[key] = key === 'dist' ? cand.dist * (1 + rand(sig)) : cand[key] + rand(sig);
    }
    cand.pitch = Math.max(-20, Math.min(20, cand.pitch));
    const r = await ev(v, cand);
    if (r.score < cur[v]) { poses[v] = cand; cur[v] = r.score; best = mean(cur); }
  }
  if (it % 50 === 49) {
    console.log(it, JSON.stringify(Object.fromEntries(views.map((v) => [v, +cur[v].toFixed(2)]))), 'mean', best.toFixed(3));
    writeFileSync(poseFile, JSON.stringify(poses, null, 1));
    writeFileSync(shapeFile, JSON.stringify({ band: P.band, funnel: P.funnel, basketPts: P.basketPts, roll: P.roll, flangeT: P.flangeT, endCap: P.endCap }, null, 1));
  }
}
writeFileSync(poseFile, JSON.stringify(poses, null, 1));
writeFileSync(shapeFile, JSON.stringify({ band: P.band, funnel: P.funnel, basketPts: P.basketPts, roll: P.roll, flangeT: P.flangeT, endCap: P.endCap }, null, 1));
console.log('final', JSON.stringify(cur), best.toFixed(3));
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
