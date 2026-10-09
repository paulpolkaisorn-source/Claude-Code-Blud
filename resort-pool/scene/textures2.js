// Procedural textures for organic surfaces: bark, foliage, thatch, lawn, sand and ocean ripples.
import * as THREE from 'three';
import { mulberry32, hash2, fbm, vnoise, smooth } from './noise.js';
import { cv, tex, normalFromHeight } from './textures.js';

// Paint a leaf-like ellipse into both a colour canvas and a height canvas, wrapping at the edges.
function stamp(ctxC, ctxH, N, x, y, rx, ry, rot, fill, hv) {
  for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
    const X = x + dx, Y = y + dy;
    if (X < -rx * 2 || X > N + rx * 2 || Y < -rx * 2 || Y > N + rx * 2) continue;
    ctxC.fillStyle = fill; ctxC.beginPath(); ctxC.ellipse(X, Y, rx, ry, rot, 0, Math.PI * 2); ctxC.fill();
    ctxH.fillStyle = hv; ctxH.beginPath(); ctxH.ellipse(X, Y, rx, ry, rot, 0, Math.PI * 2); ctxH.fill();
  }
}
function heightFromCanvas(c, N) {
  const d = c.getContext('2d').getImageData(0, 0, N, N).data, h = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) h[i] = d[i * 4] / 255;
  return h;
}

// Dense clipped-hedge / shrub foliage, 1 m patch.
export function makeFoliage({ seed = 6, N = 512, count = 5200, hue = 0, patch = 1 } = {}) {
  const rnd = mulberry32(seed);
  const mc = cv(N, N), hc = cv(N, N), mx = mc.getContext('2d'), hx = hc.getContext('2d');
  mx.fillStyle = 'rgb(14,32,16)'; mx.fillRect(0, 0, N, N);
  hx.fillStyle = 'rgb(20,20,20)'; hx.fillRect(0, 0, N, N);
  for (let i = 0; i < count; i++) {
    const x = rnd() * N, y = rnd() * N, s = 8 + rnd() * 14, rot = rnd() * Math.PI;
    const t = rnd(), lum = 0.55 + 0.75 * t * t;
    const r = (24 + 30 * lum + hue) | 0, g = (56 + 58 * lum) | 0, b = (18 + 18 * lum) | 0;
    const hh = (60 + 150 * t) | 0;
    stamp(mx, hx, N, x, y, s, s * 0.38, rot, `rgb(${r},${g},${b})`, `rgb(${hh},${hh},${hh})`);
    stamp(mx, hx, N, x, y, s * 0.8, s * 0.04, rot, `rgb(${r + 24},${g + 22},${b + 10})`, `rgb(${hh + 30},${hh + 30},${hh + 30})`);
  }
  const p = [patch, patch];
  return { map: tex(mc, { srgb: true, patch: p }), normal: tex(normalFromHeight(heightFromCanvas(hc, N), N, N, 3.2), { patch: p }) };
}

// Palm trunk bark: ring scars around the stem + vertical fibres. u wraps around, v along the trunk.
export function makeBark({ seed = 9, W = 256, H = 512 } = {}) {
  const mc = cv(W, H), ctx = mc.getContext('2d'), img = ctx.createImageData(W, H), hg = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4;
    const warp = fbm(x / 16, y / 32, 3, seed, W / 16, H / 32);
    const ring = Math.pow(Math.abs(Math.sin((y + warp * 10) * Math.PI / 16)), 14);
    const fib = fbm(x / 4, y / 64, 3, seed + 4, W / 4, H / 64);
    const sh = 0.78 + 0.34 * fib - 0.34 * ring * (0.6 + 0.8 * warp);
    img.data[o] = 132 * sh; img.data[o + 1] = 112 * sh; img.data[o + 2] = 90 * sh; img.data[o + 3] = 255;
    hg[i] = 0.55 + 0.3 * fib - 0.5 * ring;
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(mc, { srgb: true, patch: [1, 1] }), normal: tex(normalFromHeight(hg, W, H, 3), { patch: [1, 1] }) };
}

// Thatch for the palapa roof: bundles of straw.
export function makeThatch({ seed = 12, N = 512 } = {}) {
  const rnd = mulberry32(seed);
  const mc = cv(N, N), hc = cv(N, N), mx = mc.getContext('2d'), hx = hc.getContext('2d');
  mx.fillStyle = 'rgb(98,74,42)'; mx.fillRect(0, 0, N, N); hx.fillStyle = 'rgb(40,40,40)'; hx.fillRect(0, 0, N, N);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * N, y = rnd() * N, len = 90 + rnd() * 170, ang = (rnd() - 0.5) * 0.16, w = 0.8 + rnd() * 1.8;
    const t = rnd(), r = (150 + 80 * t) | 0, g = (112 + 70 * t) | 0, b = (62 + 40 * t) | 0;
    const band = 0.6 + 0.4 * Math.sin(y / N * Math.PI * 8);
    for (const dy of [-N, 0, N]) for (const dx of [-N, 0, N]) {
      const X = x + dx, Y = y + dy;
      if (X < -10 || X > N + 10 || Y < -len || Y > N + len) continue;
      mx.strokeStyle = `rgb(${r * band | 0},${g * band | 0},${b * band | 0})`; mx.lineWidth = w;
      mx.beginPath(); mx.moveTo(X, Y); mx.lineTo(X + Math.sin(ang) * len, Y + Math.cos(ang) * len); mx.stroke();
      const hh = (90 + 140 * t) | 0; hx.strokeStyle = `rgb(${hh},${hh},${hh})`; hx.lineWidth = w;
      hx.beginPath(); hx.moveTo(X, Y); hx.lineTo(X + Math.sin(ang) * len, Y + Math.cos(ang) * len); hx.stroke();
    }
  }
  return { map: tex(mc, { srgb: true }), normal: tex(normalFromHeight(heightFromCanvas(hc, N), N, N, 2.2)) };
}

// Lawn and sand detail tiles (patch ~ 4 m); hue comes from vertex colours on the terrain.
export function makeGround({ seed = 14, N = 512, patch = 4 } = {}) {
  const gc = cv(N, N), g = gc.getContext('2d'), img = g.createImageData(N, N), hg = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, o = i * 4;
    const big = fbm(x / 64, y / 64, 4, seed, 8, 8), fine = vnoise(x / 1.5, y / 1.5, seed + 1, N / 1.5 | 0, N / 1.5 | 0);
    const blade = hash2(x, y >> 2, seed) * 0.5 + fine * 0.5;
    const sh = 0.72 + 0.34 * big + 0.16 * blade;
    img.data[o] = 255 * sh; img.data[o + 1] = 255 * sh; img.data[o + 2] = 255 * sh; img.data[o + 3] = 255;
    hg[i] = 0.6 * fine + 0.4 * big;
  }
  g.putImageData(img, 0, 0);
  const p = [patch, patch];
  return { map: tex(gc, { srgb: true, patch: p }), normal: tex(normalFromHeight(hg, N, N, 1.6), { patch: p }) };
}

// Tileable ripple normal map for the distant sea (sum of sines with integer wave vectors + noise).
export function makeOceanNormal({ seed = 21, N = 512 } = {}) {
  const rnd = mulberry32(seed), waves = [];
  for (let i = 0; i < 14; i++) {
    const k = 2 + Math.floor(rnd() * 22), a = rnd() * Math.PI * 2;
    waves.push({ kx: Math.round(Math.cos(a) * k), ky: Math.round(Math.sin(a) * k), amp: 1 / (0.6 + k * 0.35), ph: rnd() * 6.283 });
  }
  const hg = new Float32Array(N * N), tw = Math.PI * 2 / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let h = 0;
    for (const w of waves) h += w.amp * Math.sin((w.kx * x + w.ky * y) * tw + w.ph);
    hg[y * N + x] = h * 0.5 + (fbm(x / 8, y / 8, 3, seed, N / 8, N / 8) - 0.5) * 0.9;
  }
  const t = tex(normalFromHeight(hg, N, N, 7), { patch: [1, 1] });
  t.anisotropy = 16;
  return t;
}

export function makeFoamStrip({ N = 256 } = {}) {
  const c = cv(N, 64), ctx = c.getContext('2d'), img = ctx.createImageData(N, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < N; x++) {
    const edge = smooth(0, 0.35, y / 63) * (1 - smooth(0.55, 1, y / 63));
    const n = fbm(x / 10, y / 5, 3, 3, N / 10 | 0, 0);
    const a = Math.max(0, edge * (0.45 + 0.9 * n) - 0.18) * 1.6;
    const o = (y * N + x) * 4;
    img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = Math.min(255, a * 255);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Terracotta barrel-tile roofing: rows of overlapping tiles with per-tile colour variation.
export function makeRoof({ seed = 17, N = 512, rows = 16, cols = 12, patch = 1.5 } = {}) {
  const rnd = mulberry32(seed), RH = N / rows, CW = N / cols;
  const mc = cv(N, N), ctx = mc.getContext('2d'), img = ctx.createImageData(N, N), hg = new Float32Array(N * N);
  const tint = []; for (let i = 0; i < rows * cols; i++) tint.push(0.82 + 0.34 * rnd());
  for (let y = 0; y < N; y++) {
    const r = (y / RH) | 0, ly = (y - r * RH) / RH;
    for (let x = 0; x < N; x++) {
      const xs = (x + (r % 2) * CW * 0.5) % N, c = (xs / CW) | 0, lx = (xs - c * CW) / CW;
      const t = tint[r * cols + c];
      const lip = Math.pow(ly, 2.2);                        // shadow gathers at the lower edge of each tile
      const barrel = 0.88 + 0.12 * Math.cos((lx - 0.5) * Math.PI * 1.4);
      const wear = 0.9 + 0.2 * fbm(x / 24, y / 24, 3, seed, N / 24 | 0, N / 24 | 0);
      const sh = t * barrel * wear * (1 - 0.5 * lip);
      const o = (y * N + x) * 4;
      img.data[o] = 176 * sh; img.data[o + 1] = 84 * sh; img.data[o + 2] = 54 * sh; img.data[o + 3] = 255;
      hg[y * N + x] = 0.7 * (1 - lip) * barrel + 0.15 * wear - (lx < 0.04 || lx > 0.96 ? 0.35 : 0);
    }
  }
  ctx.putImageData(img, 0, 0);
  const p = [patch, patch];
  return { map: tex(mc, { srgb: true, patch: p }), normal: tex(normalFromHeight(hg, N, N, 2.6), { patch: p }) };
}
