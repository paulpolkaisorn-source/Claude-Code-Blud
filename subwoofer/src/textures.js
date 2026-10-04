import * as THREE from 'three';
import { rng, TAU, DEG } from './util.js';
import { drawWord, wordWidth, drawAlienHead, drawBeeLogo, drawSundownLogo } from './glyphs.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Height canvas (grey, 128 = flat) -> tangent-space normal map canvas (OpenGL convention, +Y up). */
export function heightToNormal(hc, strength = 2, { wrapX = false, wrapY = false } = {}) {
  const w = hc.width;
  const h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const octx = out.getContext('2d');
  const dst = octx.createImageData(w, h);
  const H = (x, y) => {
    if (wrapX) x = (x + w) % w;
    else x = x < 0 ? 0 : x >= w ? w - 1 : x;
    if (wrapY) y = (y + h) % h;
    else y = y < 0 ? 0 : y >= h ? h - 1 : y;
    return src[(y * w + x) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * strength;
      let ny = dy * strength; // canvas y is down, texture v is up
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const k = (y * w + x) * 4;
      dst.data[k] = (nx * 0.5 + 0.5) * 255;
      dst.data[k + 1] = (ny * 0.5 + 0.5) * 255;
      dst.data[k + 2] = (nz * 0.5 + 0.5) * 255;
      dst.data[k + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function tex(c, { srgb = false, repeat = false, aniso = 16 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------------------------------------ */
/* Carbon fibre: 2x2 twill, tileable.                                                          */
/* ------------------------------------------------------------------------------------------ */
export function makeCarbon({ tile = 512, tows = 8 } = {}) {
  const ts = tile / tows;
  const rand = rng(7);
  const hc = canvas(tile, tile);
  const cc = canvas(tile, tile);
  const rc = canvas(tile, tile);
  const hctx = hc.getContext('2d');
  const cctx = cc.getContext('2d');
  const rctx = rc.getContext('2d');
  const hd = hctx.createImageData(tile, tile);
  const cd = cctx.createImageData(tile, tile);
  const rd = rctx.createImageData(tile, tile);
  const striations = new Float32Array(tows * tows * 2);
  for (let i = 0; i < striations.length; i++) striations[i] = rand() * 100;
  for (let y = 0; y < tile; y++) {
    for (let x = 0; x < tile; x++) {
      const i = Math.floor(x / ts);
      const j = Math.floor(y / ts);
      const fx = (x % ts) / ts;
      const fy = (y % ts) / ts;
      const warpTop = ((i + j) & 3) < 2;
      const across = warpTop ? fx : fy;
      const along = warpTop ? fy : fx;
      const prof = Math.sin(Math.PI * across);
      const taper = 0.55 + 0.45 * Math.sin(Math.PI * along);
      const ht = Math.pow(prof, 0.75) * taper;
      const stri = 0.5 + 0.5 * Math.sin(across * 90 + striations[(j * tows + i) * 2]);
      // tows that run vertical pick up the (top) light a bit more than horizontal ones
      const dir = warpTop ? 1.0 : 0.62;
      const lum = 0.016 + dir * (0.2 * Math.pow(prof, 3.0) * taper + 0.035 * stri * prof);
      const k = (y * tile + x) * 4;
      const hv = Math.min(255, ht * 255);
      hd.data[k] = hd.data[k + 1] = hd.data[k + 2] = hv;
      hd.data[k + 3] = 255;
      // slightly warm/olive highlights like real carbon cloth
      cd.data[k] = Math.min(255, 255 * lum * 1.0);
      cd.data[k + 1] = Math.min(255, 255 * lum * 0.97);
      cd.data[k + 2] = Math.min(255, 255 * lum * 0.82);
      cd.data[k + 3] = 255;
      const rough = 0.45 + 0.25 * (1 - prof);
      rd.data[k] = 255;
      rd.data[k + 1] = rough * 255;
      rd.data[k + 2] = 0;
      rd.data[k + 3] = 255;
    }
  }
  hctx.putImageData(hd, 0, 0);
  cctx.putImageData(cd, 0, 0);
  rctx.putImageData(rd, 0, 0);
  const nc = heightToNormal(hc, 2.2, { wrapX: true, wrapY: true });
  return {
    map: tex(cc, { srgb: true, repeat: true }),
    normalMap: tex(nc, { repeat: true }),
    roughnessMap: tex(rc, { repeat: true }),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Motor-cover band: cylindrical wrap, 3.1" tall.                                              */
/* ------------------------------------------------------------------------------------------ */
export function makeBand({ circumference, height, pxPerIn = 240, layout }) {
  const W = Math.round(circumference * pxPerIn);
  const H = Math.round(height * pxPerIn);
  const rand = rng(11);
  const hc = canvas(W, H);
  const cc = canvas(W, H);
  const h = hc.getContext('2d');
  const c = cc.getContext('2d');
  h.fillStyle = 'rgb(140,140,140)';
  h.fillRect(0, 0, W, H);
  c.fillStyle = '#3d3d40';
  c.fillRect(0, 0, W, H);

  const angX = (deg) => ((((deg % 360) + 360) % 360) / 360) * W;
  const pp = pxPerIn;

  const textBlock = (cxPx, cyPx) => {
    const rows = [
      { t: 'SUNDOWN', h: 0.8, th: 2.3, skew: 0.14, dx: 0, w: 5.0 },
      { t: 'AUDIO', h: 0.62, th: 2.7, skew: 0.3, dx: 0.4, w: 3.7 },
      { t: 'INHUMAN', h: 0.4, th: 2.2, skew: 0.2, dx: -0.1, w: 3.3 },
    ];
    let y = cyPx - 1.08 * pp;
    for (const r of rows) {
      const hp = r.h * pp;
      const natural = wordWidth(r.t, 0.45) * (hp / 10);
      const stretch = (r.w * pp) / natural;
      const x0 = cxPx - (r.w * pp) / 2 + r.dx * pp;
      // outline (groove) first, then raised face
      for (const [ctx, col, extra] of [[h, 'rgb(40,40,40)', 0.9], [c, '#0b0b0c', 0.9]]) {
        drawWord(ctx, r.t, x0, y, hp, { thickness: r.th + extra, skew: r.skew, gap: 0.45, stretch, color: col, join: 'miter' });
      }
      drawWord(h, r.t, x0, y, hp, { thickness: r.th - 0.15, skew: r.skew, gap: 0.45, stretch, color: 'rgb(235,235,235)' });
      drawWord(c, r.t, x0, y, hp, { thickness: r.th - 0.15, skew: r.skew, gap: 0.45, stretch, color: '#47474a' });
      y += hp * 1.28;
    }
  };

  const logo = (kind, cxPx, cyPx, sizeIn, rot = 0) => {
    const s = (sizeIn * pp) / 2;
    for (const ctx of [h, c]) {
      ctx.save();
      ctx.translate(cxPx, cyPx);
      ctx.rotate(rot);
      ctx.translate(-cxPx, -cyPx);
    }
    const fn = kind === 'alien' ? drawAlienHead : drawBeeLogo;
    fn(h, cxPx, cyPx, s, { fill: 'rgb(190,190,190)', stroke: 'rgb(20,20,20)', line: 0.035, mode: 'plate' });
    fn(h, cxPx, cyPx, s, { fill: 'rgb(190,190,190)', stroke: 'rgb(20,20,20)', line: 0.035, mode: 'lines' });
    fn(c, cxPx, cyPx, s, { fill: '#454548', stroke: '#0b0b0c', line: 0.035, mode: 'plate' });
    fn(c, cxPx, cyPx, s, { fill: '#454548', stroke: '#0b0b0c', line: 0.035, mode: 'lines' });
    h.restore();
    c.restore();
  };

  const midY = H * 0.5;
  for (const a of layout.text) textBlock(angX(a), midY);
  logo('alien', angX(layout.alien), midY, 2.1, layout.alienRot ?? 0);
  logo('bee', angX(layout.bee), midY, 2.0, layout.beeRot ?? 0);

  // bead-blast grain
  const hd = h.getImageData(0, 0, W, H);
  for (let i = 0; i < hd.data.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    hd.data[i] = Math.max(0, Math.min(255, hd.data[i] + n));
  }
  h.putImageData(hd, 0, 0);

  const nc = heightToNormal(hc, 1.6, { wrapX: true });
  return { map: tex(cc, { srgb: true }), normalMap: tex(nc), W, H };
}

/* ------------------------------------------------------------------------------------------ */
/* Front flange ring decals (planar, covers +-R). Plates + engraved lettering.                 */
/* ------------------------------------------------------------------------------------------ */
export function makeFlangeDecals({ R = 8, px = 3072, plateR = 7.52, plateAngles, arcTextR = 6.98, arcTexts = [] }) {
  const hc = canvas(px, px);
  const cc = canvas(px, px);
  const rc = canvas(px, px);
  const h = hc.getContext('2d');
  const c = cc.getContext('2d');
  const r = rc.getContext('2d');
  h.fillStyle = 'rgb(160,160,160)';
  h.fillRect(0, 0, px, px);
  c.fillStyle = '#070707';
  c.fillRect(0, 0, px, px);
  r.fillStyle = 'rgb(0,60,0)'; // G channel = roughness 0.24
  r.fillRect(0, 0, px, px);
  const k = px / (2 * R);
  const X = (x) => (x / (2 * R) + 0.5) * px;
  const Y = (y) => (0.5 - y / (2 * R)) * px;

  for (const th of plateAngles) {
    const t = th * DEG; // clockwise from top
    const x = plateR * Math.sin(t);
    const y = plateR * Math.cos(t);
    const pw = 1.36 * k;
    const ph = 0.62 * k;
    for (const [ctx, fill] of [[h, 'rgb(105,105,105)'], [c, '#070707'], [r, 'rgb(0,150,0)']]) {
      ctx.save();
      ctx.translate(X(x), Y(y));
      ctx.rotate(t);
      ctx.fillStyle = fill;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    }
    // text: SUNDOWN / AUDIO, tiny and tracked, raised inside the recess
    for (const [ctx, col] of [[h, 'rgb(190,190,190)'], [c, '#4a4a4a'], [r, 'rgb(0,120,0)']]) {
      ctx.save();
      ctx.translate(X(x), Y(y));
      ctx.rotate(t);
      const nat1 = wordWidth('SUNDOWN', 0.4) * (0.24 * k / 10);
      drawWord(ctx, 'SUNDOWN', -pw * 0.44, -ph * 0.42, 0.24 * k, { thickness: 2.6, skew: 0.1, gap: 0.4, stretch: (pw * 0.88) / nat1, color: col });
      const nat2 = wordWidth('AUDIO', 0.4) * (0.2 * k / 10);
      drawWord(ctx, 'AUDIO', -pw * 0.34, ph * 0.06, 0.2 * k, { thickness: 2.8, skew: 0.28, gap: 0.4, stretch: (pw * 0.78) / nat2, color: col });
      ctx.restore();
    }
  }

  // small engraved lettering that runs along the inner lip
  for (const { deg, text, span } of arcTexts) {
    for (const [ctx, col] of [[h, 'rgb(105,105,105)'], [c, '#3a3a3a']]) {
      ctx.save();
      ctx.translate(X(0), Y(0));
      const a0 = deg * DEG;
      const rr = arcTextR * k;
      const hh = 0.17 * k;
      const total = wordWidth(text, 0.5);
      const unit = (span * DEG * rr) / total; // px per glyph unit along the arc
      let cx = 0;
      for (const ch of text) {
        const wch = wordWidth(ch, 0) + 0.5;
        const ang = a0 + (cx * unit) / rr;
        ctx.save();
        ctx.rotate(ang);
        ctx.translate(0, -rr);
        drawWord(ctx, ch, 0, -hh, hh, { thickness: 1.5, skew: 0, gap: 0, stretch: unit / (hh / 10), color: col });
        ctx.restore();
        cx += wch;
      }
      ctx.restore();
    }
  }

  const nc = heightToNormal(hc, 3.2);
  return {
    map: tex(cc, { srgb: true }),
    normalMap: tex(nc),
    roughnessMap: tex(rc),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* White Sundown Audio logo printed on the dust cap (planar, alpha).                           */
/* ------------------------------------------------------------------------------------------ */
export function makeDustLogo() {
  const W = 1024;
  const H = 1024;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // planar front projection covering +-capR*1.1; the logo is about 1.9" wide on a 4.65" dia cap
  drawSundownLogo(ctx, W * 0.24, H * 0.405, W * 0.52, { color: '#eeeeec' });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

/* ------------------------------------------------------------------------------------------ */
/* Tiny noise map for subtle surface breakup on matte rubber.                                  */
/* ------------------------------------------------------------------------------------------ */
export function makeRubberGrain() {
  const S = 512;
  const rand = rng(23);
  const hc = canvas(S, S);
  const h = hc.getContext('2d');
  const d = h.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 128 + (rand() - 0.5) * 60;
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
    d.data[i * 4 + 3] = 255;
  }
  h.putImageData(d, 0, 0);
  return tex(heightToNormal(hc, 0.8, { wrapX: true, wrapY: true }), { repeat: true });
}
