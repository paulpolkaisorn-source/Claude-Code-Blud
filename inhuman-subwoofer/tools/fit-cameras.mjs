// Fit a camera to each reference photo by maximising silhouette IoU between
// the photo's alpha mask and a rendered mask of the model, then write the
// result to src/photo-views.js and side-by-side comparison images.
//
//   node tools/fit-cameras.mjs <photoDir> [outDir] [only]
//
// photoDir must contain 1.webp ... 5.webp (cut-out product photos with alpha).

import fs from 'node:fs';
import path from 'node:path';
import { openPage, dataUrlToFile, ROOT } from './lib.mjs';

const [photoDir, outDir = path.join(ROOT, 'renders', 'compare'), only] = process.argv.slice(2);
if (!photoDir) { console.error('usage: node tools/fit-cameras.mjs <photoDir> [outDir] [only]'); process.exit(1); }

// Initial guesses in the model frame (degrees / metres):
//   a = angle between view direction and the cone axis (0 = straight at the cone)
//   b = azimuth of the camera around the axis (0 = from 12 o'clock, clockwise seen from the front)
//   g = camera roll, d = distance, t = look-at point, f = vertical fov
// pts: model-space points (mm) pinned to photo pixels (back-disc centre, dust-cap apex)
const SEEDS = {
  1: { a: 120, b: 56, g: -23, d: 2.4, t: [-0.07, -0.05, 0.1], f: 18, pts: [[[0, -421, 0], [1280, 1412]]] },
  2: { a: 125, b: 289, g: 30, d: 2.4, t: [-0.09, 0.03, -0.07], f: 18, pts: [[[0, -421, 0], [556, 1300]]] },
  3: { a: 0, b: 0, g: 0, d: 2.6, t: [0, 0, 0.1], f: 18, pts: [[[52.4, 0, -222.5], [1150, 270]], [[195.4, 0, -118.6], [1595, 610]]] },
  4: { a: 45, b: 289, g: 5, d: 2.4, t: [0.02, 0.01, 0.04], f: 18, pts: [[[0, -62, 0], [1078, 1042]]] },
  // close-up crop: the silhouette only shows the flange corners, so the dust-cap
  // rim (model circle r=75.9 mm at y=-86 mm) is pinned to points picked on the photo
  5: { a: 18, b: 270, g: 10, d: 0.8, t: [0, 0, 0.13], f: 31,
    rims: [
      { r: 73.9, y: -86.1, px: [[600, 730], [580, 1330], [310, 1000], [880, 1040], [390, 800], [790, 790], [380, 1220], [840, 1220]] },
      { r: 228.6, y: 0, px: [[155, 120], [440, 22], [730, 48], [285, 45], [865, 95], [240, 1670], [620, 1895], [1240, 1805]] },
      { r: 149.8, y: -19, px: [[420, 335], [600, 318], [800, 325], [700, 1560], [900, 1588]] },
    ] },
  // extra manufacturer shots used only for checking proportions
  D: { a: 84, b: 0, g: 0, d: 4, t: [0, 0, 0], f: 9, extra: true, aMax: 90 },
  M: { a: 84, b: 0, g: 0, d: 4, t: [0, 0, 0], f: 9, extra: true },
  S: { a: 150, b: 180, g: 0, d: 3, t: [0, 0, -0.1], f: 14, extra: true },
};

const prev = fs.existsSync(path.join(ROOT, 'src', 'photo-views.js'))
  ? (await import(path.join(ROOT, 'src', 'photo-views.js'))).PHOTO_FITS || {}
  : {};

const { page, close } = await openPage('?headless&lod=0.35', { width: 400, height: 400 });
try {
  await page.evaluate(() => {
    const api = window.__api;
    const { THREE } = api;
    const rt = new THREE.WebGLRenderTarget(16, 16);
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const deg = Math.PI / 180;

    // camera from fit parameters (model frame: axis +Z after the holder transform)
    api.viewFromParams = (p) => {
      const a = p.a * deg, b = p.b * deg, g = p.g * deg;
      const dir = new THREE.Vector3(Math.sin(a) * Math.sin(b), Math.sin(a) * Math.cos(b), Math.cos(a));
      const target = new THREE.Vector3(...p.t);
      const pos = target.clone().addScaledVector(dir, p.d);
      // reference up: world +Y, or +Z when looking along the axis
      let ref = Math.abs(dir.y) > 0.98 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const fwd = dir.clone().negate();
      const right = new THREE.Vector3().crossVectors(fwd, ref).normalize();
      let up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      up.applyAxisAngle(fwd, g);
      return { fov: p.f, position: pos.toArray(), target: target.toArray(), up: up.toArray() };
    };

    api.maskIoU = (p, ref, W, H) => {
      const v = api.viewFromParams(p);
      api.setView(v);
      api.camera.aspect = W / H;
      api.camera.updateProjectionMatrix();
      if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
      const s = api.scene;
      const bg = s.background;
      s.background = new THREE.Color(0x000000);
      s.overrideMaterial = white;
      api.renderer.setRenderTarget(rt);
      api.renderer.render(s, api.camera);
      api.renderer.setRenderTarget(null);
      s.overrideMaterial = null;
      s.background = bg;
      const px = new Uint8Array(W * H * 4);
      api.renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      let inter = 0, uni = 0;
      for (let y = 0; y < H; y++) {
        const ry = H - 1 - y; // render target rows are bottom-up
        for (let x = 0; x < W; x++) {
          const m = px[(ry * W + x) * 4] > 127 ? 1 : 0;
          const r = ref[y * W + x];
          inter += m & r;
          uni += m | r;
        }
      }
      return inter / uni;
    };

    api.loadMask = async (dataUrl, W) => {
      const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
      const H = Math.round((W * img.height) / img.width);
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      return { mask: m, W, H, aspect: img.width / img.height, width: img.width, height: img.height };
    };

    // Nelder-Mead over the parameter vector
    api.rimError = (p, rims, W, H, imgW, imgH) => {
      if (!rims) return 0;
      api.setView(api.viewFromParams(p));
      api.camera.aspect = W / H;
      api.camera.updateProjectionMatrix();
      api.camera.updateMatrixWorld();
      api.model.updateMatrixWorld(true);
      let err = 0, n = 0;
      for (const rim of rims) {
        const proj = [];
        for (let k = 0; k < 180; k++) {
          const t = (k / 180) * Math.PI * 2;
          const v = new THREE.Vector3(Math.sin(t) * rim.r, rim.y, -Math.cos(t) * rim.r);
          api.model.localToWorld(v);
          v.project(api.camera);
          if (v.z < 1) proj.push([(v.x + 1) / 2, (1 - v.y) / 2]);
        }
        for (const [px, py] of rim.px) {
          const x = px / imgW, y = py / imgH;
          let best = 1e9;
          for (const q of proj) best = Math.min(best, Math.hypot((q[0] - x) * (W / H), q[1] - y));
          err += best; n++;
        }
      }
      return err / n;
    };

    api.ptsError = (p, pts, W, H, imgW, imgH) => {
      if (!pts) return 0;
      api.setView(api.viewFromParams(p));
      api.camera.aspect = W / H;
      api.camera.updateProjectionMatrix();
      api.camera.updateMatrixWorld();
      api.model.updateMatrixWorld(true);
      let err = 0;
      for (const [m, px] of pts) {
        const v = api.model.localToWorld(new THREE.Vector3(...m)).project(api.camera);
        err += Math.hypot(((v.x + 1) / 2 - px[0] / imgW) * (W / H), (1 - v.y) / 2 - px[1] / imgH);
      }
      return err / pts.length;
    };

    api.fit = (p0, steps, ref, W, H, iters, rim, imgW, imgH, pts) => {
      const keys = ['a', 'b', 'g', 'd', 'tx', 'ty', 'tz', 'f'];
      const toP = (x) => ({ a: x[0], b: x[1], g: x[2], d: x[3], t: [x[4], x[5], x[6]], f: x[7] });
      const cost = (x) => {
        if (x[7] < 6 || x[7] > 60 || x[3] < 0.3) return 10;
        if (p0.aMax !== undefined && x[0] > p0.aMax) return 10;
        const p = toP(x);
        return 1 - api.maskIoU(p, ref, W, H) + (rim ? 4 * api.rimError(p, rim, W, H, imgW, imgH) : 0) + (pts ? 3 * api.ptsError(p, pts, W, H, imgW, imgH) : 0);
      };
      const x0 = [p0.a, p0.b, p0.g, p0.d, ...p0.t, p0.f];
      let simplex = [x0];
      for (let i = 0; i < x0.length; i++) { const x = x0.slice(); x[i] += steps[i]; simplex.push(x); }
      let vals = simplex.map(cost);
      for (let it = 0; it < iters; it++) {
        const order = vals.map((v, i) => i).sort((i, j) => vals[i] - vals[j]);
        simplex = order.map((i) => simplex[i]); vals = order.map((i) => vals[i]);
        const n = x0.length;
        const cen = new Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) cen[k] += simplex[i][k] / n;
        const worst = simplex[n];
        const refl = cen.map((c, k) => c + (c - worst[k]));
        const fr = cost(refl);
        if (fr < vals[0]) {
          const exp = cen.map((c, k) => c + 2 * (c - worst[k]));
          const fe = cost(exp);
          if (fe < fr) { simplex[n] = exp; vals[n] = fe; } else { simplex[n] = refl; vals[n] = fr; }
        } else if (fr < vals[n - 1]) {
          simplex[n] = refl; vals[n] = fr;
        } else {
          const con = cen.map((c, k) => c + 0.5 * (worst[k] - c));
          const fc = cost(con);
          if (fc < vals[n]) { simplex[n] = con; vals[n] = fc; } else {
            for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, k) => simplex[0][k] + 0.5 * (v - simplex[0][k])); vals[i] = cost(simplex[i]); }
          }
        }
      }
      const best = vals.indexOf(Math.min(...vals));
      return { p: toP(simplex[best]), iou: 1 - vals[best], keys };
    };
  });

  const fits = { ...prev };
  for (const id of Object.keys(SEEDS)) {
    if (only ? !only.split(',').includes(id) : SEEDS[id].extra) continue;
    const webp = path.join(photoDir, `${id}.webp`);
    const file = fs.existsSync(webp) ? webp : path.join(photoDir, `${id}.png`);
    const dataUrl = `data:image/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString('base64')}`;
    let p = (process.env.FRESH ? null : prev[id]?.p) || SEEDS[id];
    let best = null;
    // multi-start over lens focal length (perspective strength is easy to get stuck on)
    const fovs = process.env.FOVS ? process.env.FOVS.split(',').map(Number) : [];
    if (fovs.length) {
      let bestStart = null;
      for (const f of fovs) {
        const k = Math.tan((p.f * Math.PI) / 360) / Math.tan((f * Math.PI) / 360);
        const t = p.t;
        const seed = { ...p, f, d: p.d * k, aMax: SEEDS[id].aMax };
        const res = await page.evaluate(async ([dataUrl, p, rim, pts]) => {
          const api = window.__api;
          const ref = await api.loadMask(dataUrl, 80);
          const r = api.fit(p, [8, 10, 6, 0.3 * p.d / 2.4, 0.03, 0.03, 0.05, 3], ref.mask, ref.W, ref.H, 200, rim, ref.width, ref.height, pts);
          r.pureIoU = api.maskIoU(r.p, ref.mask, ref.W, ref.H);
          return r;
        }, [dataUrl, seed, SEEDS[id].rims || null, SEEDS[id].pts || null]);
        console.log(`  start f=${f}: IoU=${res.pureIoU.toFixed(4)} cost=${(1 - res.iou).toFixed(4)} -> f=${res.p.f.toFixed(1)} a=${res.p.a.toFixed(1)}`);
        if (!bestStart || res.iou > bestStart.iou) bestStart = res;
      }
      p = bestStart.p;
    }
    // coarse-to-fine: low-res masks first, then refine
    for (const [W, iters, scale] of [[96, 220, 1], [160, 160, 0.4], [220, 110, 0.15]]) {
      const res = await page.evaluate(async ([dataUrl, p, W, iters, scale, rim, pts]) => {
        const api = window.__api;
        const ref = await api.loadMask(dataUrl, W);
        const steps = [8, 10, 6, 0.3, 0.03, 0.03, 0.05, 3].map((s) => s * scale);
        const r = api.fit(p, steps, ref.mask, ref.W, ref.H, iters, rim, ref.width, ref.height, pts);
        const rimErr = (rim ? api.rimError(r.p, rim, ref.W, ref.H, ref.width, ref.height) : 0) + (pts ? api.ptsError(r.p, pts, ref.W, ref.H, ref.width, ref.height) : 0);
        r.pureIoU = api.maskIoU(r.p, ref.mask, ref.W, ref.H);
        return { ...r, rimErr, aspect: ref.aspect, width: ref.width, height: ref.height };
      }, [dataUrl, { ...p, aMax: SEEDS[id].aMax }, W, iters, scale, SEEDS[id].rims || null, SEEDS[id].pts || null]);
      p = res.p;
      best = res;
      console.log(`photo ${id} @${W}px  IoU=${res.pureIoU.toFixed(4)} ptErr=${(res.rimErr || 0).toFixed(4)}`, JSON.stringify(res.p, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
    }
    fits[id] = { p: best.p, iou: best.pureIoU, ptErr: best.rimErr, width: best.width, height: best.height };
  }

  // write presets
  const views = {};
  for (const [id, f] of Object.entries(fits)) {
    const v = await page.evaluate((p) => window.__api.viewFromParams(p), f.p);
    const r = (x) => +x.toFixed(5);
    views[`photo${id}`] = { label: SEEDS[id]?.extra ? `Ref ${id}` : `Photo ${id}`, fov: r(v.fov), position: v.position.map(r), target: v.target.map(r), up: v.up.map(r), size: [Math.round((1200 * f.width) / f.height), 1200], hidden: true };
  }
  const src = `// Generated by tools/fit-cameras.mjs — cameras matched to the reference photos.\nexport const PHOTO_FITS = ${JSON.stringify(fits, null, 2)};\n\nexport const PHOTO_VIEWS = ${JSON.stringify(views, null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, 'src', 'photo-views.js'), src);
  console.log('wrote src/photo-views.js');

} finally {
  await close();
}
