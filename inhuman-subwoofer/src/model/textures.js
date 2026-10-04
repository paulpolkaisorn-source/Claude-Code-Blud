// Procedural textures: carbon-fibre twill, rubber grain, embossed markings
// (flange badges, motor boot) and the printed dust-cap logo.

import * as THREE from 'three';
import { makeCanvas, drawSundownLogo, drawSundownFlat, warpPerspective, drawInhuman, drawAlienHeight, drawAudio } from './logos.js';

// Deterministic PRNG so every build of the model is identical.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(canvas, { srgb = false, repeat = null, wrap = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// Height map (R channel) -> tangent-space normal map (OpenGL convention,
// canvas top = texture top).
export function heightToNormal(src, strength = 2, { wrap = true } = {}) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const o = img.data;
  const H = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y)); }
    return d[(y * w + x) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 0.5 * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * 0.5 * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      o[i] = (nx * 0.5 + 0.5) * 255;
      o[i + 1] = (ny * 0.5 + 0.5) * 255;
      o[i + 2] = (nz * 0.5 + 0.5) * 255;
      o[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

// ---- carbon fibre 2x2 twill ---------------------------------------------------
// One tile = `tows` x `tows` tow cells. Returns colour + height canvases.
export function carbonCanvases(size = 1024, tows = 16) {
  const col = makeCanvas(size, size);
  const hgt = makeCanvas(size, size);
  const cimg = col.getContext('2d').createImageData(size, size);
  const himg = hgt.getContext('2d').createImageData(size, size);
  const c = cimg.data, hd = himg.data;
  const cell = size / tows;
  const r = rng(7);
  // per-filament streak noise, separate for warp (vertical) and weft (horizontal)
  const fil = 3; // px per filament streak
  const streakV = Array.from({ length: Math.ceil(size / fil) + 1 }, () => r());
  const streakH = Array.from({ length: Math.ceil(size / fil) + 1 }, () => r());
  const towTint = Array.from({ length: tows * tows }, () => 0.9 + r() * 0.2);
  for (let y = 0; y < size; y++) {
    const j = Math.floor(y / cell), fy = (y % cell) / cell;
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / cell), fx = (x % cell) / cell;
      const m = (i + j) % 4;
      const warp = m < 2; // vertical tow on top
      const across = warp ? fx : fy;
      const along = warp ? (m + fy) / 2 : (m - 2 + fx) / 2;
      const bulge = Math.pow(Math.sin(Math.PI * across), 0.55);
      const taper = Math.pow(Math.sin(Math.PI * along), 0.3);
      const height = bulge * taper;
      const streak = warp ? streakV[Math.floor(x / fil)] : streakH[Math.floor(y / fil)];
      // warp tows catch the key light, weft tows stay dark (the classic checker)
      let v = warp ? 0.2 : 0.065;
      v *= 0.82 + 0.3 * streak;
      v *= 0.55 + 0.45 * bulge;
      v *= towTint[(i % tows) * tows + (j % tows)];
      const k = (y * size + x) * 4;
      c[k] = Math.min(255, v * 255 * 1.0);
      c[k + 1] = Math.min(255, v * 255 * 0.99);
      c[k + 2] = Math.min(255, v * 255 * 0.9);
      c[k + 3] = 255;
      const hv = Math.round((0.15 + 0.85 * height) * 255);
      hd[k] = hd[k + 1] = hd[k + 2] = hv;
      hd[k + 3] = 255;
    }
  }
  col.getContext('2d').putImageData(cimg, 0, 0);
  hgt.getContext('2d').putImageData(himg, 0, 0);
  return { col, hgt };
}

let carbonCache = null;
export function carbonTextures() {
  if (carbonCache) return carbonCache;
  const { col, hgt } = carbonCanvases(1024, 16);
  const nrm = heightToNormal(hgt, 3.2);
  carbonCache = {
    canvases: { col, hgt, nrm },
    map: canvasTexture(col, { srgb: true }),
    normalMap: canvasTexture(nrm),
  };
  return carbonCache;
}
// physical size of one carbon tile (16 tows of ~3.1 mm)
export const CARBON_TILE_MM = 36;

// ---- fine rubber / powder grain -------------------------------------------------
export function grainNormal(size = 512, seed = 3, blur = 1.2, strength = 1.2) {
  const h = makeCanvas(size, size);
  const ctx = h.getContext('2d');
  const img = ctx.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // tile-safe blur: blur a 3x3 tiled copy and take the centre
  const big = makeCanvas(size * 3, size * 3);
  const b = big.getContext('2d');
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) b.drawImage(h, x * size, y * size);
  const out = makeCanvas(size, size);
  const o = out.getContext('2d');
  o.filter = `blur(${blur}px)`;
  o.drawImage(big, -size, -size);
  return canvasTexture(heightToNormal(out, strength));
}

// Blur helper used to give embossed shapes a rounded shoulder.
function blurred(src, px) {
  const out = makeCanvas(src.width, src.height);
  const ctx = out.getContext('2d');
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(src, 0, 0);
  return out;
}

// Draw a white-on-transparent mark as grey relief into a height canvas.
function stampHeight(ctx, mark, x, y, w, h, level = 255, rotation = 0) {
  const tmp = makeCanvas(mark.width, mark.height);
  const t = tmp.getContext('2d');
  t.drawImage(mark, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = `rgb(${level},${level},${level})`;
  t.fillRect(0, 0, tmp.width, tmp.height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(tmp, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---- flange: 8 raised SUNDOWN AUDIO badges ---------------------------------------
// Planar texture covering the whole flange disc (x, y in [-R, R] mm).
export function flangeEmboss({ R = 240, size = 4096, badgeR = 228.6, angles = [], badgeW = 33, badgeH = 13 } = {}) {
  const hgt = makeCanvas(size, size);
  const ctx = hgt.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const k = size / (2 * R);
  const mark = drawSundownLogo(5, { warp: { left: 0.92, right: 1.08, drop: 0.05 } });
  const aspect = mark.width / mark.height;
  for (const th of angles) {
    const x = size / 2 + Math.sin(th) * badgeR * k;
    const y = size / 2 - Math.cos(th) * badgeR * k;
    const w = badgeW * k;
    stampHeight(ctx, mark, x, y, w, w / aspect, 255, th);
  }
  const soft = blurred(hgt, 2.4);
  // machined letter tops read as bright metal against the gloss-black paint
  const col = makeCanvas(size, size);
  const cc = col.getContext('2d');
  cc.fillStyle = '#060606';
  cc.fillRect(0, 0, size, size);
  const tint = makeCanvas(size, size);
  const tc = tint.getContext('2d');
  tc.drawImage(hgt, 0, 0);
  tc.globalCompositeOperation = 'multiply';
  tc.fillStyle = '#808080';
  tc.fillRect(0, 0, size, size);
  cc.globalCompositeOperation = 'lighter';
  cc.drawImage(tint, 0, 0);
  return {
    normalMap: canvasTexture(heightToNormal(soft, 9, { wrap: false }), { wrap: false }),
    map: canvasTexture(col, { srgb: true, wrap: false }),
    metalnessMap: canvasTexture(hgt, { wrap: false }),
  };
}

// ---- motor boot: SUNDOWN / AUDIO / INHUMAN + alien heads ---------------------------
// Texture covers 1/3 of the circumference (120 deg) x the band height.
// Text block centred at u = 0.25, alien at u = 0.75.
export function bootEmboss({ arcMM = 344.5, bandMM = 86, pxPerMM = 11 } = {}) {
  const W = Math.round(arcMM * pxPerMM), H = Math.round(bandMM * pxPerMM);
  const hgt = makeCanvas(W, H);
  const ctx = hgt.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const mm = pxPerMM;
  const cx = W * 0.25;

  // SUNDOWN / AUDIO / INHUMAN stacked block. Extents (mm) measured on the
  // manufacturer's side profile: rows at 13-38 %, 41-60 % and 72-92 % of the band.
  const place = (mark, cxMM, top, bottom, wMM) => {
    const t = tightCrop(mark);
    const hMM = (bottom - top) * bandMM;
    for (const off of [-W, 0, W]) stampHeight(ctx, t, cxMM * mm + off, ((top + bottom) / 2) * bandMM * mm, wMM * mm, hMM * mm, 255);
  };
  const cxMM = cx / mm;
  place(warpPerspective(drawSundownFlat(5, { audio: false }), { left: 0.88, right: 1.12, drop: 0.1 }), cxMM + 4, 0.125, 0.39, 182);
  place(warpPerspective(drawAudio(5), { left: 0.9, right: 1.1, drop: 0.1 }), cxMM + 2, 0.41, 0.605, 160);
  place(drawInhuman(5), cxMM, 0.715, 0.92, 120);

  // alien head emblem
  const alien = tightCrop(drawAlienHeight(6));
  const ahH = 0.9 * bandMM, ahW = ahH * (alien.width / alien.height);
  ctx.drawImage(alien, W * 0.75 - (ahW * mm) / 2, (bandMM / 2 - ahH / 2) * mm, ahW * mm, ahH * mm);

  const soft = blurred(hgt, 5);
  const nrm = heightToNormal(soft, 14);
  // darken the moulded edges (crisp outlines like the real boot)
  const sd = soft.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const col = makeCanvas(W, H);
  const cctx = col.getContext('2d');
  const img = cctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const gx = sd[(y * W + Math.min(W - 1, x + 1)) * 4] - sd[(y * W + Math.max(0, x - 1)) * 4];
      const gy = sd[(Math.min(H - 1, y + 1) * W + x) * 4] - sd[(Math.max(0, y - 1) * W + x) * 4];
      const g = Math.min(1, Math.hypot(gx, gy) / 60);
      const v = 255 * (1 - 0.55 * g);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  return { normalMap: canvasTexture(nrm), map: canvasTexture(col, { srgb: true }) };
}

// Crop a canvas to the bounding box of its non-transparent / non-black pixels.
export function tightCrop(src) {
  const { width: w, height: h } = src;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 8 && (d[i] > 8 || d[i + 1] > 8 || d[i + 2] > 8)) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return src;
  const c = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  c.getContext('2d').drawImage(src, -x0, -y0);
  return c;
}

// ---- dust cap: carbon + white printed logo ----------------------------------------
// Planar texture over the cap diameter (x, y in [-R, R] mm).
export function dustCapTextures({ R = 76, size = 2048, logoW = 84, logoY = 0 } = {}) {
  const carb = carbonTextures().canvases;
  const k = size / (2 * R);
  const tilePx = CARBON_TILE_MM * k;
  const col = makeCanvas(size, size);
  const nrm = makeCanvas(size, size);
  const cc = col.getContext('2d'), nc = nrm.getContext('2d');
  for (let x = 0; x < size; x += tilePx) {
    for (let y = 0; y < size; y += tilePx) {
      cc.drawImage(carb.col, x, y, tilePx, tilePx);
      nc.drawImage(carb.nrm, x, y, tilePx, tilePx);
    }
  }
  const logo = drawSundownLogo(6);
  const w = logoW * k, h = w / (logo.width / logo.height);
  const lx = size / 2 - w / 2, ly = size / 2 - h / 2 - logoY * k;
  cc.drawImage(logo, lx, ly, w, h);
  // the print sits under the clear coat: flatten the weave relief where it is
  const mask = makeCanvas(size, size);
  const mc = mask.getContext('2d');
  mc.drawImage(logo, lx, ly, w, h);
  mc.globalCompositeOperation = 'source-in';
  mc.fillStyle = 'rgb(128,128,255)';
  mc.fillRect(0, 0, size, size);
  nc.drawImage(mask, 0, 0);
  return {
    map: canvasTexture(col, { srgb: true, wrap: false }),
    normalMap: canvasTexture(nrm, { wrap: false }),
  };
}

// ---- threaded hole decal (for the chrome top-plate shoulder) ------------------------
export function threadedHoleTexture(size = 128) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, '#0b0906');
  g.addColorStop(0.45, '#2a2116');
  g.addColorStop(0.62, '#8a6a3e');
  g.addColorStop(0.8, '#5d4628');
  g.addColorStop(0.92, '#c9c4bb');
  g.addColorStop(1, '#f2f2f2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // thread lines
  ctx.strokeStyle = 'rgba(20,14,6,0.55)';
  ctx.lineWidth = size / 90;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    const y = r - r * 0.55 + k * (r * 1.1) / 6;
    ctx.ellipse(r, y, r * 0.62, r * 0.12, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  return canvasTexture(c, { srgb: true, wrap: false });
}
