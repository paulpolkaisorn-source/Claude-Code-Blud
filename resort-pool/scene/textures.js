// Procedural textures for man-made materials: mosaic tile, stone, teak decking, plaster, fabric.
// Everything is painted into canvases (the page may not load any image or HDR file).
import * as THREE from 'three';
import { mulberry32, hash2, fbm, vnoise, smooth, mix } from './noise.js';

const _cache = new Map();
// Build a texture set once and share it between modules (generation is the slow part of start-up).
export function shared(key, make) { if (!_cache.has(key)) _cache.set(key, make()); return _cache.get(key); }

export function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// UV units are meters for most of the shell/deck geometry, so repeat = 1 / patch size.
export function tex(c, { srgb = false, patch = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(1 / patch[0], 1 / patch[1]);
  t.anisotropy = 8;
  return t;
}
export function retile(t, rx, ry) { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; }
export function setAniso(set, n) { for (const k in set) if (set[k] && set[k].isTexture) set[k].anisotropy = n; }

export function normalFromHeight(hm, w, h, strength) {
  const c = cv(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, y0 = y * w, yp = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      let nx = (hm[y0 + xm] - hm[y0 + xp]) * strength, ny = (hm[yp + x] - hm[ym + x]) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = (y0 + x) * 4;
      d[o] = (nx * inv * 0.5 + 0.5) * 255; d[o + 1] = (ny * inv * 0.5 + 0.5) * 255; d[o + 2] = (inv * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---- mosaic glass tile: 32 x 32 tiles per square meter ------------------------------------------
export function makeTile({ seed = 3, N = 1024, T = 32, palette, patch = 1, grout = [208, 212, 210], gloss = 0.2 } = {}) {
  const rnd = mulberry32(seed), S = N / T;
  const pal = palette || [[44, 148, 176, 3], [58, 166, 190, 3], [34, 128, 162, 2], [78, 184, 204, 2], [28, 112, 150, 1],
    [100, 198, 208, 1], [226, 238, 238, 0.35], [18, 86, 128, 0.3]];
  const tot = pal.reduce((a, p) => a + p[3], 0);
  const col = [], tilt = [];
  for (let i = 0; i < T * T; i++) {
    let r = rnd() * tot, k = 0;
    while (k < pal.length - 1 && r > pal[k][3]) { r -= pal[k][3]; k++; }
    const v = 0.9 + 0.2 * rnd();
    col.push([pal[k][0] * v, pal[k][1] * v, pal[k][2] * v]);
    tilt.push([(rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4]);
  }
  const mapC = cv(N, N), roC = cv(N, N);
  const md = mapC.getContext('2d').createImageData(N, N), rd = roC.getContext('2d').createImageData(N, N);
  const hg = new Float32Array(N * N);
  const cells = N / 128;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const tx = (x / S) | 0, ty = (y / S) | 0, lx = x - tx * S, ly = y - ty * S;
    const d = Math.min(lx, ly, S - 1 - lx, S - 1 - ly);
    const c = col[ty * T + tx];
    const low = 0.94 + 0.12 * fbm(x / 128, y / 128, 3, 7, cells, cells);
    const i = y * N + x, o = i * 4;
    let r, g, b, h, rough;
    if (d < 1.5) {
      const gn = 0.9 + 0.1 * vnoise(x / 4, y / 4, 3, N / 4, N / 4);
      r = grout[0] * gn; g = grout[1] * gn; b = grout[2] * gn; h = 0; rough = 0.9;
    } else {
      let sh = low;
      if (lx < 3 || ly < 3) sh *= 1.1; else if (lx > S - 4 || ly > S - 4) sh *= 0.9;
      r = c[0] * sh; g = c[1] * sh; b = c[2] * sh;
      const e = smooth(1.5, 5, d);
      h = e + e * ((lx / S - 0.5) * tilt[ty * T + tx][0] + (ly / S - 0.5) * tilt[ty * T + tx][1]);
      rough = gloss + 0.08 * vnoise(x / 8, y / 8, 5, N / 8, N / 8);
    }
    md.data[o] = r; md.data[o + 1] = g; md.data[o + 2] = b; md.data[o + 3] = 255;
    const rv = rough * 255; rd.data[o] = rv; rd.data[o + 1] = rv; rd.data[o + 2] = rv; rd.data[o + 3] = 255;
    hg[i] = h;
  }
  mapC.getContext('2d').putImageData(md, 0, 0); roC.getContext('2d').putImageData(rd, 0, 0);
  const p = [patch, patch];
  return { map: tex(mapC, { srgb: true, patch: p }), rough: tex(roC, { patch: p }), normal: tex(normalFromHeight(hg, N, N, 2.2), { patch: p }) };
}

// ---- paved stone (travertine pavers in running bond, or long coping slabs) ----------------------
export function makeStone({ seed = 11, W = 960, H = 640, pw = 480, ph = 320, bond = 0.5, base = [226, 210, 184], tintVar = 0.05,
  patch = [1.2, 0.8], joint = 3, rough = 0.82, jointCol = [166, 150, 126], pits = 0.0016 } = {}) {
  const rnd = mulberry32(seed);
  const cols = Math.round(W / pw), rows = Math.round(H / ph);
  const tint = [];
  for (let i = 0; i < cols * rows; i++) tint.push([1 + (rnd() - 0.5) * 2 * tintVar, (rnd() - 0.5)]);
  const mapC = cv(W, H), roC = cv(W, H);
  const md = mapC.getContext('2d').createImageData(W, H), rd = roC.getContext('2d').createImageData(W, H);
  const hg = new Float32Array(W * H);
  const px = Math.round(W / 64), py = Math.round(H / 16);
  for (let y = 0; y < H; y++) {
    const row = (y / ph) | 0, ly = y - row * ph;
    const off = (row % 2) * bond * pw;
    for (let x = 0; x < W; x++) {
      const xs = (x + off) % W, cx = (xs / pw) | 0, lx = xs - cx * pw;
      const jd = Math.min(lx, pw - 1 - lx, ly, ph - 1 - ly);
      const i = y * W + x, o = i * 4;
      let r, g, b, h, ro;
      if (jd < joint * 0.5) {
        const gn = 0.85 + 0.15 * vnoise(x / 3, y / 3, 9, W / 3 | 0, H / 3 | 0);
        r = jointCol[0] * gn; g = jointCol[1] * gn; b = jointCol[2] * gn; h = 0; ro = 0.95;
      } else {
        const t = tint[row * cols + cx];
        const v1 = fbm(x / 64, y / 16, 3, 21, px, py), v2 = fbm(x / 20, y / 8, 2, 5, W / 20 | 0, H / 8 | 0);
        let sh = t[0] * (0.9 + 0.2 * v1) * (0.96 + 0.08 * v2);
        const band = Math.sin((y + 40 * v1) * 0.21 + t[1] * 6);
        sh *= 1 + 0.035 * band;
        const pit = hash2(x >> 1, y, 77) > 1 - pits * 2 && hash2(x, y >> 1, 78) > 0.4 ? 1 : 0;
        if (pit) sh *= 0.62;
        r = base[0] * sh * (1 + 0.025 * t[1]); g = base[1] * sh; b = base[2] * sh * (1 - 0.05 * t[1]);
        h = smooth(joint * 0.5, joint * 0.5 + 3, jd) * 0.55 + 0.25 * v2 - pit * 0.3;
        ro = rough + 0.1 * (v1 - 0.5);
      }
      md.data[o] = r; md.data[o + 1] = g; md.data[o + 2] = b; md.data[o + 3] = 255;
      const rv = ro * 255; rd.data[o] = rv; rd.data[o + 1] = rv; rd.data[o + 2] = rv; rd.data[o + 3] = 255;
      hg[i] = h;
    }
  }
  mapC.getContext('2d').putImageData(md, 0, 0); roC.getContext('2d').putImageData(rd, 0, 0);
  return { map: tex(mapC, { srgb: true, patch }), rough: tex(roC, { patch }), normal: tex(normalFromHeight(hg, W, H, 1.6), { patch }) };
}

// ---- teak decking: 8 planks of 15 cm across a 1.2 m patch -----------------------------------------
export function makeWood({ seed = 5, N = 1024, planks = 8, patch = 1.2, base = [168, 118, 72] } = {}) {
  const rnd = mulberry32(seed), PH = N / planks;
  const pc = [], joints = [];
  for (let i = 0; i < planks; i++) { pc.push(0.88 + 0.24 * rnd()); joints.push(Math.floor(rnd() * N)); }
  const mapC = cv(N, N), roC = cv(N, N);
  const md = mapC.getContext('2d').createImageData(N, N), rd = roC.getContext('2d').createImageData(N, N);
  const hg = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    const p = (y / PH) | 0, ly = y - p * PH;
    for (let x = 0; x < N; x++) {
      const i = y * N + x, o = i * 4;
      const gap = ly < 2 || ly > PH - 3;
      const jx = Math.abs(x - joints[p]); const jgap = jx < 1.5 || (N - jx) < 1.5;
      let r, g, b, h, ro;
      if (gap || jgap) { r = 52; g = 36; b = 26; h = 0; ro = 0.9; }
      else {
        const n1 = fbm(x / 128, (y + p * 91) / 6, 4, 13 + p, 8, 0);
        const ring = Math.sin(ly * 0.34 + n1 * 14 + p * 3) * 0.5 + 0.5;
        const sh = pc[p] * (0.82 + 0.3 * n1) * (0.93 + 0.1 * ring);
        r = base[0] * sh; g = base[1] * sh; b = base[2] * sh;
        h = 0.6 + 0.12 * ring + 0.1 * n1; ro = 0.58 + 0.12 * ring;
      }
      md.data[o] = r; md.data[o + 1] = g; md.data[o + 2] = b; md.data[o + 3] = 255;
      const rv = ro * 255; rd.data[o] = rv; rd.data[o + 1] = rv; rd.data[o + 2] = rv; rd.data[o + 3] = 255;
      hg[i] = h;
    }
  }
  mapC.getContext('2d').putImageData(md, 0, 0); roC.getContext('2d').putImageData(rd, 0, 0);
  const pt = [patch, patch];
  return { map: tex(mapC, { srgb: true, patch: pt }), rough: tex(roC, { patch: pt }), normal: tex(normalFromHeight(hg, N, N, 2.4), { patch: pt }) };
}

// ---- rendered plaster / stucco ---------------------------------------------------------------------
export function makePlaster({ seed = 8, N = 512, base = [238, 230, 216], patch = 2 } = {}) {
  const mapC = cv(N, N), ctx = mapC.getContext('2d'), md = ctx.createImageData(N, N);
  const hg = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, o = i * 4;
    const big = fbm(x / 64, y / 64, 3, seed, 8, 8), fine = vnoise(x / 1.6, y / 1.6, seed + 3, N / 1.6 | 0 || 0, N / 1.6 | 0 || 0);
    const sh = 0.95 + 0.07 * big + 0.04 * fine;
    md.data[o] = base[0] * sh; md.data[o + 1] = base[1] * sh; md.data[o + 2] = base[2] * sh * 0.99; md.data[o + 3] = 255;
    hg[i] = fine * 0.6 + big * 0.3;
  }
  ctx.putImageData(md, 0, 0);
  const pt = [patch, patch];
  return { map: tex(mapC, { srgb: true, patch: pt }), normal: tex(normalFromHeight(hg, N, N, 1.1), { patch: pt }) };
}

// ---- striped awning / cushion cloth -------------------------------------------------------------------
export function makeStripes({ a = [246, 243, 236], b = [52, 152, 168], N = 256, stripes = 8, seed = 4, weave = true } = {}) {
  const c = cv(N, N), ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
  const w = N / stripes;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const s = ((x / w) | 0) % 2 === 0 ? a : b;
    const t = weave ? 0.96 + 0.04 * ((x & 1) ^ (y & 1)) + 0.03 * (hash2(x, y, seed) - 0.5) : 1;
    const o = (y * N + x) * 4;
    img.data[o] = s[0] * t; img.data[o + 1] = s[1] * t; img.data[o + 2] = s[2] * t; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: true });
}

export function makeSolidNoise({ base = [200, 200, 200], amp = 0.08, N = 128, seed = 2 } = {}) {
  const c = cv(N, N), ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = 1 - amp + amp * 2 * fbm(x / 16, y / 16, 3, seed, N / 16, N / 16);
    const o = (y * N + x) * 4;
    img.data[o] = base[0] * t; img.data[o + 1] = base[1] * t; img.data[o + 2] = base[2] * t; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: true });
}
export { mix };
