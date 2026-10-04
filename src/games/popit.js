// Pop It — 2D canvas. A glossy silicone fidget board: every dome is a spring that
// flips between convex and concave. Sweep to push (or pop) whole rows; pitch walks a
// pentatonic scale across the board. All shading is procedural, all sound synthesized.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, pentatonic, midiToFreq, safeStorage, mulberry32 } from '../util.js';
import { Pad } from '../audio.js';

// ---------- colour helpers ----------
function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return [f(0), f(8), f(4)];
}
function rgb2hsl(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const WHITE = [255, 255, 255];

function makeTones(c) {
  const [h, s, l] = rgb2hsl(c);
  return {
    c,
    hi: hsl2rgb(h + 4, s * 0.85, Math.min(95, l + 27)),
    lo: hsl2rgb(h - 8, Math.min(100, s + 8), l * 0.6),
    deep: hsl2rgb(h - 14, Math.min(100, s + 12), l * 0.36),
    sss: hsl2rgb(h + 10, 100, Math.min(82, l + 13)),
  };
}

const K = 12; // distinct colours per palette (keeps the sprite cache small)
const GALAXY_STOPS = [[60, 120, 255], [112, 72, 255], [182, 78, 255], [255, 84, 200], [255, 140, 220]];
const gradient = (stops, t) => {
  const x = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
};

const PALETTES = {
  rainbow: {
    label: 'Rainbow',
    colors: Array.from({ length: K }, (_, i) => hsl2rgb(lerp(2, 286, Math.pow(i / (K - 1), 1)), 92, 58)),
    t: (u, v) => v,
    bg: [[44, 28, 98], [18, 14, 48]],
    plate: [[255, 246, 236], [226, 208, 214], [196, 176, 190]],
    shadow: [70, 30, 80],
    blobs: [[255, 120, 170], [120, 160, 255], [255, 200, 110], [140, 255, 200]],
    glow: 0,
  },
  pastel: {
    label: 'Pastel',
    colors: Array.from({ length: K }, (_, i) => hsl2rgb(lerp(350, 280, 0) + (i / (K - 1)) * 280, 72, 80)),
    t: (u, v) => v,
    bg: [[74, 60, 128], [34, 28, 78]],
    plate: [[255, 252, 250], [236, 226, 240], [206, 192, 222]],
    shadow: [90, 60, 120],
    blobs: [[255, 190, 220], [190, 210, 255], [255, 235, 190], [200, 255, 230]],
    glow: 0,
  },
  neon: {
    label: 'Neon',
    colors: Array.from({ length: K }, (_, i) => hsl2rgb(lerp(325, 128, i / (K - 1)), 100, 56)),
    t: (u, v) => v,
    bg: [[12, 8, 34], [3, 3, 14]],
    plate: [[44, 36, 84], [22, 18, 52], [12, 10, 30]],
    shadow: [4, 2, 20],
    blobs: [[255, 40, 170], [40, 240, 255], [150, 90, 255], [60, 255, 150]],
    glow: 1,
  },
  galaxy: {
    label: 'Galaxy',
    colors: Array.from({ length: K }, (_, i) => gradient(GALAXY_STOPS, i / (K - 1))),
    t: (u, v) => u * 0.55 + v * 0.45,
    bg: [[26, 14, 74], [6, 4, 26]],
    plate: [[52, 38, 108], [28, 20, 70], [16, 10, 44]],
    shadow: [6, 2, 30],
    blobs: [[110, 80, 255], [255, 90, 210], [70, 180, 255], [170, 90, 255]],
    glow: 0.6,
    stars: true,
  },
};
for (const k of Object.keys(PALETTES)) PALETTES[k].tones = PALETTES[k].colors.map(makeTones);

// ---------- board shapes (in units of the bubble pitch) ----------
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function insidePoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function edgeDist(poly, x, y) {
  let m = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) m = Math.min(m, distSeg(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  return m;
}

function buildShape(kind, big, portrait) {
  let poly;
  let stag = false;
  let ox = 0;
  let oy = 0;
  if (kind === 'square') {
    const cols = big ? 8 : 7;
    const rows = portrait ? 9 : big ? 8 : 7;
    const hw = (cols - 1) / 2 + 0.62;
    const hh = (rows - 1) / 2 + 0.62;
    poly = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    ox = cols % 2 ? 0 : 0.5;
    oy = rows % 2 ? 0 : 0.5;
  } else if (kind === 'circle') {
    const R = big ? 5.3 : 4.85;
    poly = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      poly.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    stag = true;
  } else if (kind === 'heart') {
    const s = (big ? 11.4 : 10.4) / 32;
    poly = [];
    for (let i = 0; i < 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      poly.push([16 * Math.pow(Math.sin(t), 3) * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s]);
    }
    ox = 0.5;
  } else {
    const R = big ? 4.72 : 3.72;
    poly = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      poly.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    stag = true;
  }
  const rowH = stag ? 0.866 : 1;
  const pts = [];
  for (let j = -14; j <= 14; j++) {
    for (let i = -14; i <= 14; i++) {
      const gx = i + ox + (stag && (j & 1) ? 0.5 : 0);
      const gy = j * rowH + oy;
      if (insidePoly(poly, gx, gy) && edgeDist(poly, gx, gy) >= 0.6) pts.push({ gx, gy });
    }
  }
  return { poly, pts, rowH };
}

const SHAPES = [
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Circle' },
  { id: 'heart', label: 'Heart' },
  { id: 'hex', label: 'Hex' },
];

const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

// ---------- the silicone dome ----------
// h in about [-1.4, 1.4]: +1 convex (up), -1 concave (pushed in). Everything is drawn from h so
// the flip animates through a flat disc. g is already scaled to css px.
function drawBubble(g, x, y, P, h, T, glow, rich) {
  const R = P * 0.43;
  const up = clamp(h, 0, 1);
  const dn = clamp(-h, 0, 1);
  const Rd = R * (1 + 0.05 * h);
  const { c, hi, lo, deep, sss } = T;

  if (glow > 0.01) {
    const ga = glow * (up + dn * 0.3);
    if (ga > 0.01) {
      const gr = g.createRadialGradient(x, y, R * 0.5, x, y, R * 1.72);
      gr.addColorStop(0, rgba(c, 0.34 * ga));
      gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, R * 1.72, 0, Math.PI * 2);
      g.fill();
    }
  }
  // soft coloured contact shadow, cast to the lower right
  if (up > 0.02) {
    const sx = x + R * 0.16 * up;
    const sy = y + R * 0.3 * up;
    const gr = g.createRadialGradient(sx, sy, R * 0.5, sx, sy, R * 1.32);
    gr.addColorStop(0, rgba(deep, 0.5 * up));
    gr.addColorStop(0.55, rgba(deep, 0.2 * up));
    gr.addColorStop(1, rgba(deep, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(sx, sy, R * 1.32, 0, Math.PI * 2);
    g.fill();
  }

  g.save();
  g.beginPath();
  g.arc(x, y, Rd, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = rgba(c);
  g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);

  if (up > 0.01) {
    g.globalAlpha = up;
    const gr = g.createRadialGradient(x - Rd * 0.3, y - Rd * 0.36, Rd * 0.04, x, y, Rd * 1.02);
    gr.addColorStop(0, rgba(hi));
    gr.addColorStop(0.28, rgba(mix(hi, c, 0.6)));
    gr.addColorStop(0.6, rgba(c));
    gr.addColorStop(0.86, rgba(mix(c, lo, 0.55)));
    gr.addColorStop(1, rgba(lo));
    g.fillStyle = gr;
    g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);
    if (rich) {
      // light travelling through the silicone glows warm in the lower right
      const s2 = g.createRadialGradient(x + Rd * 0.3, y + Rd * 0.38, 0, x + Rd * 0.3, y + Rd * 0.38, Rd * 0.8);
      s2.addColorStop(0, rgba(sss, 0.55));
      s2.addColorStop(1, rgba(sss, 0));
      g.fillStyle = s2;
      g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);
    }
    // broad soft highlight
    g.save();
    g.translate(x - Rd * 0.3, y - Rd * 0.4);
    g.rotate(-0.62);
    g.scale(1, 0.56);
    const sp = g.createRadialGradient(0, 0, 0, 0, 0, Rd * 0.5);
    sp.addColorStop(0, 'rgba(255,255,255,0.82)');
    sp.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp;
    g.beginPath();
    g.arc(0, 0, Rd * 0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // crisp window reflection
    g.globalAlpha = up * up;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = Math.max(1, Rd * 0.1);
    g.beginPath();
    g.arc(x, y, Rd * 0.73, Math.PI * 1.1, Math.PI * 1.44);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(x + Math.cos(Math.PI * 1.56) * Rd * 0.73, y + Math.sin(Math.PI * 1.56) * Rd * 0.73, Math.max(0.8, Rd * 0.048), 0, Math.PI * 2);
    g.fill();
    // bounce light
    g.strokeStyle = 'rgba(255,255,255,0.2)';
    g.lineWidth = Math.max(1, Rd * 0.12);
    g.beginPath();
    g.arc(x, y, Rd * 0.8, Math.PI * 0.08, Math.PI * 0.42);
    g.stroke();
    g.globalAlpha = 1;
  }

  if (dn > 0.01) {
    g.globalAlpha = dn;
    // pressed-in dimple: far wall (lower right) catches the light, near wall is in shadow
    const lg = g.createLinearGradient(x - Rd * 0.7, y - Rd * 0.8, x + Rd * 0.7, y + Rd * 0.8);
    lg.addColorStop(0, rgba(deep));
    lg.addColorStop(0.32, rgba(mix(c, lo, 0.7)));
    lg.addColorStop(0.58, rgba(mix(c, lo, 0.12)));
    lg.addColorStop(1, rgba(mix(c, hi, 0.55)));
    g.fillStyle = lg;
    g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);
    const is = g.createRadialGradient(x + Rd * 0.26, y + Rd * 0.32, Rd * 0.5, x + Rd * 0.26, y + Rd * 0.32, Rd * 1.5);
    is.addColorStop(0, rgba(deep, 0));
    is.addColorStop(0.55, rgba(deep, 0.18));
    is.addColorStop(1, rgba(deep, 0.85));
    g.fillStyle = is;
    g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);
    if (rich) {
      const s2 = g.createRadialGradient(x + Rd * 0.5, y + Rd * 0.6, 0, x + Rd * 0.5, y + Rd * 0.6, Rd * 0.6);
      s2.addColorStop(0, rgba(sss, 0.5));
      s2.addColorStop(1, rgba(sss, 0));
      g.fillStyle = s2;
      g.fillRect(x - Rd - 1, y - Rd - 1, Rd * 2 + 2, Rd * 2 + 2);
    }
    // soft sheen on the dimple floor
    g.save();
    g.translate(x + Rd * 0.05, y + Rd * 0.12);
    g.rotate(-0.5);
    g.scale(1, 0.5);
    const fl = g.createRadialGradient(0, 0, 0, 0, 0, Rd * 0.42);
    fl.addColorStop(0, 'rgba(255,255,255,0.2)');
    fl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fl;
    g.beginPath();
    g.arc(0, 0, Rd * 0.42, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // lit far lip
    g.lineCap = 'round';
    g.strokeStyle = rgba(hi, 0.65);
    g.lineWidth = Math.max(1, Rd * 0.1);
    g.beginPath();
    g.arc(x, y, Rd * 0.88, Math.PI * 0.06, Math.PI * 0.56);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();

  // outline: the seam where the dome meets the plate
  g.lineWidth = Math.max(0.8, P * 0.016);
  g.strokeStyle = rgba(deep, 0.38);
  g.beginPath();
  g.arc(x, y, Rd, 0, Math.PI * 2);
  g.stroke();
  if (dn > 0.01) {
    g.lineCap = 'round';
    g.strokeStyle = `rgba(255,255,255,${0.6 * dn})`;
    g.lineWidth = Math.max(1, P * 0.026);
    g.beginPath();
    g.arc(x, y, Rd * 1.045, Math.PI * 1.04, Math.PI * 1.56);
    g.stroke();
  }
}

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const store = safeStorage();
  let total = parseInt(store.getItem('hush:popit:total') || '0', 10) || 0;

  let shapeId = 'square';
  let palId = 'rainbow';
  let pal = PALETTES.rainbow;

  let L = null; // layout
  let cells = [];
  let sprites = [];
  let sprSc = 1;
  let plate = null;
  let bgCache = null;
  let blobSprites = [];
  let particles = [];
  let ripples = [];
  let cascade = null;
  let celeb = null;
  let shimmer = null;
  let hover = null;
  let shimmerX = 0.5;
  let shimmerSm = 0.5;
  let boardIntro = 0;
  let T = 0;
  const strokes = new Map();
  const rich = gfx.detail >= 0.7;
  const maxParticles = Math.round(120 * gfx.particles);

  const cv = createCanvas2D(root, { maxPixels: gfx.pixels2D, onResize: layout });
  const { ctx } = cv;

  // ---------- layout ----------
  function layout() {
    const w = cv.w;
    const h = cv.h;
    if (!w) return;
    const narrow = w < 640;
    const top = 60;
    const bottom = narrow ? 196 : 124;
    const side = narrow ? 14 : 28;
    const aw = w - side * 2;
    const ah = Math.max(120, h - top - bottom);
    const def = buildShape(shapeId, !narrow, aw / ah < 0.85);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of def.poly) {
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
    const padU = 0.34;
    const bw = x1 - x0 + padU * 2 + 0.3;
    const bh = y1 - y0 + padU * 2 + 0.7;
    const P = Math.min(aw / bw, ah / bh, 98);
    const cx = w / 2 - ((x0 + x1) / 2) * P;
    const cy = top + ah / 2 - ((y0 + y1) / 2) * P - P * 0.1;
    const poly = def.poly.map((p) => [cx + p[0] * P, cy + p[1] * P]);

    let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9;
    for (const p of def.pts) {
      gx0 = Math.min(gx0, p.gx); gx1 = Math.max(gx1, p.gx);
      gy0 = Math.min(gy0, p.gy); gy1 = Math.max(gy1, p.gy);
    }
    const old = cells;
    const keep = old.length === def.pts.length && L && L.shapeId === shapeId;
    const centerX = cx + ((gx0 + gx1) / 2) * P;
    const centerY = cy + ((gy0 + gy1) / 2) * P;
    const next = def.pts.map((p, i) => {
      const x = cx + p.gx * P;
      const y = cy + p.gy * P;
      const u = gx1 > gx0 ? (p.gx - gx0) / (gx1 - gx0) : 0.5;
      const v = gy1 > gy0 ? (p.gy - gy0) / (gy1 - gy0) : 0.5;
      const yUp = (gy1 - p.gy) / def.rowH;
      const o = keep ? old[i] : null;
      return {
        x, y, u, v,
        ci: 0,
        deg: Math.round((p.gx - gx0) * 0.8 + yUp * 0.45),
        h: o ? o.h : 0,
        vel: o ? o.vel : 0,
        target: o ? o.target : 1,
        delay: o ? 0 : Math.hypot(x - centerX, y - centerY) / (P * 9) * 0.9 + rand(0, 0.05),
        phase: rand(0, 6.28),
        rest: o ? o.rest : false,
      };
    });
    cells = next;
    if (!keep) boardIntro = 0;
    let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    for (const p of poly) {
      bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]);
      by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]);
    }
    const path = new Path2D();
    poly.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
    path.closePath();
    L = { shapeId, P, poly, path, bx0, bx1, by0, by1, pad: P * padU, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2 };
    applyPalette(false);
    buildBackdrop();
  }

  function applyPalette(rebuildBg = true) {
    pal = PALETTES[palId];
    for (const c of cells) c.ci = clamp(Math.round(pal.t(c.u, c.v) * (K - 1)), 0, K - 1);
    sprites = [];
    sprSc = Math.min(cv.dpr * (gfx.ss || 1), 3.5);
    buildPlate();
    if (rebuildBg) buildBackdrop();
  }

  // ---------- cached art ----------
  function buildPlate() {
    const { P, poly, pad } = L;
    const margin = P * 1.5;
    const ex = L.bx0 - pad - margin;
    const ey = L.by0 - pad - margin;
    const ew = L.bx1 - L.bx0 + (pad + margin) * 2;
    const eh = L.by1 - L.by0 + (pad + margin) * 2;
    let sc = Math.min(cv.dpr * (gfx.ss || 1), 3.5);
    const maxPx = 6.5e6;
    if (ew * eh * sc * sc > maxPx) sc = Math.sqrt(maxPx / (ew * eh));
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(ew * sc);
      c.height = Math.ceil(eh * sc);
      const g = c.getContext('2d');
      g.setTransform(sc, 0, 0, sc, -ex * sc, -ey * sc);
      return { c, g };
    };
    const { c: pc, g } = mk();
    const outline = (q) => {
      q.beginPath();
      poly.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])));
      q.closePath();
    };
    const fillShape = (q, style, dx = 0, dy = 0) => {
      q.save();
      q.translate(dx, dy);
      outline(q);
      q.fillStyle = style;
      q.strokeStyle = style;
      q.lineWidth = pad * 2;
      q.lineJoin = 'round';
      q.fill();
      q.stroke();
      q.restore();
    };
    // drop shadows: wide ambient + tight contact
    g.save();
    g.shadowColor = rgba(pal.shadow, 0.55);
    g.shadowBlur = P * 1.1 * sc;
    g.shadowOffsetY = P * 0.5 * sc;
    fillShape(g, '#000');
    g.restore();
    g.save();
    g.shadowColor = rgba(pal.shadow, 0.6);
    g.shadowBlur = P * 0.26 * sc;
    g.shadowOffsetY = P * 0.15 * sc;
    fillShape(g, '#000');
    g.restore();
    // side wall for thickness, then the face
    fillShape(g, rgba(pal.plate[2]), 0, P * 0.14);
    const face = g.createLinearGradient(L.bx0, L.by0, L.bx1, L.by1);
    face.addColorStop(0, rgba(pal.plate[0]));
    face.addColorStop(1, rgba(pal.plate[1]));
    fillShape(g, face);
    // bevel: highlight on the upper-left rim, shade on the lower-right
    const { c: tc, g: t } = mk();
    const bevel = (style, dx, dy, blur) => {
      t.save();
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.clearRect(0, 0, tc.width, tc.height);
      t.restore();
      t.save();
      t.setTransform(sc, 0, 0, sc, -ex * sc, -ey * sc);
      fillShape(t, style);
      t.globalCompositeOperation = 'destination-out';
      fillShape(t, '#000', dx, dy);
      t.restore();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (blur) g.filter = `blur(${blur * sc}px)`;
      g.drawImage(tc, 0, 0);
      g.restore();
    };
    bevel('rgba(255,255,255,0.8)', P * 0.045, P * 0.06, 0);
    bevel(rgba(pal.shadow, 0.3), -P * 0.07, -P * 0.09, 0);
    // soft overall sheen on the face (masked through a temp layer so alpha never doubles up)
    {
      const { c: sc2, g: s2 } = mk();
      s2.save();
      fillShape(s2, '#fff');
      s2.globalCompositeOperation = 'source-in';
      const sh = s2.createLinearGradient(L.bx0, L.by0, L.bx0 + (L.bx1 - L.bx0) * 0.7, L.by0 + (L.by1 - L.by0) * 0.7);
      sh.addColorStop(0, 'rgba(255,255,255,0.2)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0)');
      s2.fillStyle = sh;
      s2.fillRect(ex, ey, ew, eh);
      s2.restore();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(sc2, 0, 0);
      g.restore();
    }
    // matte micro-texture / galaxy dust
    if (gfx.detail >= 0.7) {
      g.save();
      g.beginPath();
      poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      g.clip();
      const rnd = mulberry32(77);
      const n = Math.round(260 * gfx.detail);
      for (let i = 0; i < n; i++) {
        const x = lerp(L.bx0, L.bx1, rnd());
        const y = lerp(L.by0, L.by1, rnd());
        if (pal.stars) {
          const big = rnd() > 0.93;
          g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.5})`;
          g.beginPath();
          g.arc(x, y, big ? 0.9 + rnd() * 0.8 : 0.35 + rnd() * 0.5, 0, Math.PI * 2);
          g.fill();
        } else {
          g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : rgba(pal.shadow, 0.05);
          g.fillRect(x, y, 1, 1);
        }
      }
      g.restore();
    }
    // sockets
    for (const c of cells) {
      const sx = c.x + P * 0.02;
      const sy = c.y + P * 0.03;
      const gr = g.createRadialGradient(sx, sy, P * 0.36, sx, sy, P * 0.55);
      gr.addColorStop(0, rgba(pal.shadow, 0.46));
      gr.addColorStop(0.55, rgba(pal.shadow, 0.28));
      gr.addColorStop(1, rgba(pal.shadow, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(sx, sy, P * 0.55, 0, Math.PI * 2);
      g.fill();
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.lineWidth = P * 0.032;
      g.beginPath();
      g.arc(c.x, c.y, P * 0.525, Math.PI * 0.1, Math.PI * 0.56);
      g.stroke();
    }
    plate = { c: pc, x: ex, y: ey, w: ew, h: eh };
  }

  function makeBlobShape(kind, g, cx, cy, r) {
    g.beginPath();
    if (kind === 0) g.arc(cx, cy, r, 0, Math.PI * 2);
    else if (kind === 1) g.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.45);
    else if (kind === 2) {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
      }
      g.closePath();
    } else g.roundRect(cx - r * 1.4, cy - r * 0.6, r * 2.8, r * 1.2, r * 0.6);
  }

  function buildBackdrop() {
    const w = cv.w;
    const h = cv.h;
    const dpr = cv.dpr;
    const c = document.createElement('canvas');
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const lg = g.createLinearGradient(0, 0, w * 0.5, h);
    lg.addColorStop(0, rgba(pal.bg[0]));
    lg.addColorStop(1, rgba(pal.bg[1]));
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.7);
    glow.addColorStop(0, `rgba(${pal.blobs[0].join(',')},0.16)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,12,0.42)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    bgCache = c;

    // blurred floating shapes (shadow trick: works everywhere, no ctx.filter needed)
    const n = Math.round(4 + 3 * gfx.detail);
    const rnd = mulberry32(5 + palId.length * 13);
    blobSprites = [];
    const base = Math.max(w, h);
    for (let i = 0; i < n; i++) {
      const r = base * (0.07 + rnd() * 0.1);
      const blur = r * 0.9;
      const size = Math.ceil((r + blur) * 2.6);
      const sc = Math.min(dpr, 1.5);
      const bc = document.createElement('canvas');
      bc.width = bc.height = Math.ceil(size * sc);
      const bg2 = bc.getContext('2d');
      bg2.scale(sc, sc);
      const off = size * 3;
      const col = pal.blobs[i % pal.blobs.length];
      bg2.shadowColor = rgba(col, 0.9);
      bg2.shadowBlur = blur * sc;
      bg2.shadowOffsetX = off * sc;
      bg2.fillStyle = '#000';
      makeBlobShape(Math.floor(rnd() * 4), bg2, size / 2 - off, size / 2, r);
      bg2.fill();
      blobSprites.push({
        c: bc, size,
        x: rnd(), y: rnd(),
        ax: 0.04 + rnd() * 0.08, ay: 0.04 + rnd() * 0.08,
        fx: 0.05 + rnd() * 0.09, fy: 0.04 + rnd() * 0.08,
        rot: (rnd() - 0.5) * 0.12, ph: rnd() * 6.28,
        a: 0.28 + rnd() * 0.18,
      });
    }
  }

  function getSprite(ci, upSide) {
    const key = ci * 2 + (upSide ? 1 : 0);
    let s = sprites[key];
    if (s) return s;
    const S = L.P * 1.5;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(S * sprSc);
    const g = c.getContext('2d');
    g.scale(sprSc, sprSc);
    drawBubble(g, S / 2, S / 2, L.P, upSide ? 1 : -1, pal.tones[ci], pal.glow, rich);
    s = sprites[key] = { c, S };
    return s;
  }

  // ---------- audio ----------
  function squeak(pan, v, delay = 0) {
    audio.tone(bus, { freq: rand(1500, 2700), freqEnd: rand(1200, 3000), dur: 0.05, gain: 0.014 * v, attack: 0.012, pan, send: 0.25, delay });
    audio.burst(bus, { kind: 'white', dur: 0.075, attack: 0.025, gain: 0.03 * v, type: 'bandpass', freq: rand(2600, 4400), freqEnd: rand(2000, 3600), q: 5, pan, send: 0.2, delay });
    audio.burst(bus, { kind: 'brown', dur: 0.06, attack: 0.012, gain: 0.07 * v, type: 'bandpass', freq: rand(500, 900), q: 1.2, pan, send: 0.08, delay });
  }

  function sfx(c, dirIn, vel, delay = 0, o = {}) {
    if (!audio.ready) return;
    const pan = clamp((c.x / cv.w - 0.5) * 1.7, -0.85, 0.85);
    const deg = o.deg ?? c.deg;
    const f = midiToFreq(pentatonic(deg, 48)) * rand(0.994, 1.006);
    const v = clamp(vel, 0.35, 1);
    if (dirIn) {
      // hollow "thop": pitch-swept sine plus a soft pillow of air
      audio.tone(bus, { freq: f * 2.1, freqEnd: f, sweepTime: 0.055, dur: 0.17, gain: 0.34 * v, pan, send: 0.2, delay, attack: 0.002 });
      audio.tone(bus, { freq: f * 4.3, freqEnd: f * 2.1, sweepTime: 0.04, dur: 0.07, gain: 0.07 * v, pan, send: 0.2, delay, attack: 0.002 });
      audio.tone(bus, { freq: f * 0.5, freqEnd: f * 0.44, dur: 0.15, gain: 0.15 * v, pan, send: 0.08, delay, attack: 0.003 });
      audio.burst(bus, { kind: 'pink', dur: 0.06, attack: 0.002, gain: 0.2 * v, type: 'bandpass', freq: 760, freqEnd: 240, q: 0.8, pan, send: 0.12, delay });
      audio.burst(bus, { kind: 'white', dur: 0.008, attack: 0.0003, gain: 0.07 * v, type: 'bandpass', freq: 2300, q: 1, pan, send: 0.08, delay });
    } else {
      // brighter "pop": quick upward chirp, a snap of air and the dome's thud
      const fo = f * 2;
      audio.tone(bus, { freq: fo * 0.78, freqEnd: fo * 1.36, sweepTime: 0.034, dur: 0.12, gain: 0.28 * v, pan, send: 0.22, delay, attack: 0.001 });
      audio.tone(bus, { freq: fo * 2, freqEnd: fo * 2.7, sweepTime: 0.03, dur: 0.05, gain: 0.05 * v, type: 'triangle', pan, send: 0.2, delay, attack: 0.001 });
      audio.tone(bus, { freq: f, freqEnd: f * 0.8, dur: 0.1, gain: 0.13 * v, pan, send: 0.1, delay, attack: 0.002 });
      audio.burst(bus, { kind: 'white', dur: 0.022, attack: 0.0004, gain: 0.2 * v, type: 'bandpass', freq: 3900, freqEnd: 1800, q: 0.9, pan, send: 0.14, delay });
      audio.burst(bus, { kind: 'white', dur: 0.03, attack: 0.0005, gain: 0.06 * v, type: 'highpass', freq: 6500, pan, send: 0.2, delay });
    }
    if (!o.quiet) squeak(pan, v, delay);
  }

  function chimeSound() {
    if (!audio.ready) return;
    const degs = [0, 1, 2, 3, 4, 5, 7];
    degs.forEach((d, i) => audio.bell(bus, { freq: midiToFreq(pentatonic(d, 72)), gain: 0.085, decay: 2.4, vel: 0.6, delay: 0.05 + i * 0.085, pan: (i / 6 - 0.5) * 0.9, send: 0.45 }));
    audio.burst(bus, { kind: 'pink', dur: 0.8, attack: 0.3, gain: 0.07, type: 'bandpass', freq: 1200, freqEnd: 6000, q: 0.8, send: 0.35, curve: 'lin' });
  }

  function shimmerSound(delay = 0) {
    if (!audio.ready) return;
    [0, 2, 4, 6].forEach((d, i) => audio.bell(bus, { freq: midiToFreq(pentatonic(d + 5, 72)), gain: 0.06, decay: 2, vel: 0.5, delay: delay + i * 0.07, pan: rand(-0.6, 0.6), send: 0.5 }));
    for (let i = 0; i < 12; i++) audio.burst(bus, { kind: 'white', dur: 0.006, attack: 0.0004, gain: rand(0.015, 0.04), type: 'bandpass', freq: rand(5000, 11000), q: 2, pan: rand(-0.8, 0.8), send: 0.3, delay: delay + rand(0, 0.5) });
  }

  // ---------- ambient pad ----------
  let pad = null;
  const padLevel = 0.04;
  if (audio.ready) {
    pad = new Pad(audio, bus, {
      chords: [[48, 55, 59, 64], [45, 52, 60, 64], [41, 48, 57, 60], [43, 50, 59, 62]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1000,
      period: 18,
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  // ---------- gameplay ----------
  function updateStat() {
    hud.setStat(`Pops ${total.toLocaleString()}`);
    store.setItem('hush:popit:total', String(total));
  }

  function addSparkles(x, y, n, spread = 1) {
    for (let i = 0; i < n; i++) {
      if (particles.length > maxParticles) particles.shift();
      const a = rand(0, 6.283);
      const sp = rand(30, 120) * spread;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25, life: rand(0.35, 0.8), t: 0, s: rand(1, 2.4) * (L.P / 60) });
    }
  }

  function setTarget(c, tgt, vel, delay = 0, o = {}) {
    if (c.target === tgt) return;
    c.target = tgt;
    c.rest = false;
    c.delay = 0;
    // kick the spring so the flip starts instantly and wobbles on arrival
    c.vel += (tgt > 0 ? 7 : -9) * (0.5 + vel * 0.6);
    total++;
    sfx(c, tgt < 0, vel, delay, o);
    ripples.push({ x: c.x, y: c.y, t: 0, ci: c.ci });
    if (ripples.length > 40) ripples.shift();
    if (tgt > 0) addSparkles(c.x, c.y, Math.max(1, Math.round(3 * gfx.particles)), 0.8);
  }

  function inCount() {
    let n = 0;
    for (const c of cells) if (c.target < 0) n++;
    return n;
  }

  function checkWin() {
    if (celeb || cascade || !cells.length) return;
    if (inCount() === cells.length) startCelebration();
  }

  function startCelebration() {
    celeb = { t: 0 };
    chimeSound();
    shimmer = { t: 0 };
    for (const c of cells) if (Math.random() < 0.5) addSparkles(c.x, c.y, 1, 0.5);
    hud.setHint('Every bubble pushed in. Flipping them back…', 3200);
  }

  function hitSegment(s, x0, y0, x1, y1, vel) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const hitR = L.P * 0.47;
    const found = [];
    for (const c of cells) {
      if (s.touched.has(c)) continue;
      let t = len2 ? ((c.x - x0) * dx + (c.y - y0) * dy) / len2 : 0;
      t = clamp(t, 0, 1);
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      if ((c.x - px) ** 2 + (c.y - py) ** 2 <= hitR * hitR) found.push({ c, t });
    }
    if (!found.length) return;
    found.sort((a, b) => a.t - b.t);
    let k = 0;
    for (const { c } of found) {
      s.touched.add(c);
      if (!s.mode) s.mode = c.target > 0 ? -1 : 1; // first bubble decides push vs pop
      if (c.target === s.mode) continue;
      setTarget(c, s.mode, vel, Math.min(0.1, k * 0.012), { quiet: k > 0 && Math.random() < 0.4 });
      k++;
    }
    if (k) {
      audio.haptic?.(k > 2 ? 12 : 7);
      updateStat();
      if (s.mode < 0) checkWin();
    }
  }

  // ---------- flip all ----------
  function startFlipAll(auto = false) {
    if (cascade || !cells.length) return;
    let list = cells.slice();
    const mode = Math.random();
    const ox = mode < 0.5 ? L.bx0 + (Math.random() < 0.5 ? 0 : L.bx1 - L.bx0) : L.cx;
    const oy = mode < 0.5 ? L.by0 + (Math.random() < 0.5 ? 0 : L.by1 - L.by0) : L.cy;
    list.sort((a, b) => Math.hypot(a.x - ox, (a.y - oy) * 0.9) - Math.hypot(b.x - ox, (b.y - oy) * 0.9));
    const times = [];
    let t = 0;
    list.forEach((_, i) => {
      times.push(t);
      t += lerp(0.085, 0.017, Math.pow(i / list.length, 0.75));
    });
    cascade = { list, times, i: 0, t: 0, auto };
    celeb = null;
    if (audio.ready) audio.burst(bus, { kind: 'pink', dur: 0.5, attack: 0.15, gain: 0.07, type: 'bandpass', freq: 300, freqEnd: 1800, q: 0.8, send: 0.25, curve: 'lin' });
  }

  function stepCascade(dt) {
    const cs = cascade;
    cs.t += dt;
    const n = cs.list.length;
    let guard = 0;
    while (cs.i < n && cs.t >= cs.times[cs.i] && guard++ < 10) {
      const c = cs.list[cs.i];
      const prog = cs.i / n;
      const tgt = -c.target;
      setTarget(c, tgt, 0.55 + prog * 0.4, 0, { deg: Math.round(prog * 11) + (cs.i % 2), quiet: true });
      cs.i++;
    }
    if (cs.i >= n) {
      cascade = null;
      shimmer = { t: 0 };
      shimmerSound(0.05);
      for (const c of cells) if (Math.random() < 0.35) addSparkles(c.x, c.y, 1, 0.4);
      updateStat();
      if (!cs.auto) checkWin();
    } else if (cs.i % 6 === 0) updateStat();
  }

  // ---------- input ----------
  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      hover = p;
      const s = { mode: 0, touched: new Set() };
      strokes.set(p.id, s);
      hitSegment(s, p.x, p.y, p.x, p.y, clamp(0.7 + p.speed / 2500, 0.5, 1));
    },
    move(p) {
      hover = p;
      shimmerX = clamp(p.x / cv.w, 0, 1);
      if (!p.down) return;
      const s = strokes.get(p.id);
      if (!s) return;
      hitSegment(s, p.px, p.py, p.x, p.y, clamp(0.55 + p.speed / 2200, 0.45, 1));
    },
    up(p) {
      strokes.delete(p.id);
    },
    leave() { hover = null; },
  });

  // ---------- HUD ----------
  hud.segmented({
    options: SHAPES.map((s) => ({ id: s.id, label: s.label })),
    value: shapeId,
    onChange: (id) => {
      audio.unlock?.();
      if (id === shapeId) return;
      shapeId = id;
      cascade = null;
      celeb = null;
      strokes.clear();
      layout();
      if (audio.ready) {
        audio.burst(bus, { kind: 'pink', dur: 0.45, attack: 0.12, gain: 0.08, type: 'bandpass', freq: 500, freqEnd: 2200, q: 0.8, send: 0.3, curve: 'lin' });
        audio.bell(bus, { freq: midiToFreq(pentatonic(2, 72)), gain: 0.06, decay: 1.6, vel: 0.5, delay: 0.1 });
      }
    },
  });
  hud.segmented({
    options: Object.keys(PALETTES).map((id) => ({ id, label: PALETTES[id].label })),
    value: palId,
    onChange: (id) => {
      audio.unlock?.();
      if (id === palId) return;
      palId = id;
      applyPalette(true);
      shimmer = { t: 0 };
      if (audio.ready) audio.bell(bus, { freq: midiToFreq(pentatonic(Object.keys(PALETTES).indexOf(id) * 2 + 1, 72)), gain: 0.07, decay: 1.8, vel: 0.55, send: 0.4 });
    },
  });
  hud.button({ label: 'Flip all', title: 'Flip every bubble in a rolling wave', onClick: () => { audio.unlock?.(); startFlipAll(); } });
  hud.setHint('Press a bubble to push it in. Drag across the board to push or pop a whole row.', 7000);
  updateStat();

  // ---------- spring ----------
  function stepCell(c, dt) {
    if (c.delay > 0) { c.delay -= dt; return; }
    if (c.rest) return;
    const up = c.target > 0;
    const k = up ? 540 : 440;
    const d = up ? 14.5 : 23;
    const n = Math.min(8, Math.ceil(dt * 240));
    const sub = dt / n;
    for (let i = 0; i < n; i++) {
      c.vel += (k * (c.target - c.h) - d * c.vel) * sub;
      c.h += c.vel * sub;
    }
    if (Math.abs(c.h - c.target) < 0.004 && Math.abs(c.vel) < 0.04) {
      c.h = c.target;
      c.vel = 0;
      c.rest = true;
    }
  }

  // ---------- render ----------
  function render(dt) {
    const w = cv.w;
    const h = cv.h;
    if (!L) return;
    T += dt;
    boardIntro = Math.min(1, boardIntro + dt / 0.7);
    shimmerSm += (shimmerX - shimmerSm) * (1 - Math.exp(-3 * dt));

    if (cascade) stepCascade(dt);
    if (celeb) {
      celeb.t += dt;
      if (celeb.t > 1.7) {
        const all = inCount() === cells.length;
        celeb = null;
        if (all) startFlipAll(true);
      }
    }
    for (const c of cells) stepCell(c, dt);

    // backdrop
    ctx.drawImage(bgCache, 0, 0, w, h);
    ctx.save();
    for (const b of blobSprites) {
      const x = (b.x + Math.sin(T * b.fx + b.ph) * b.ax) * w;
      const y = (b.y + Math.cos(T * b.fy + b.ph * 1.7) * b.ay) * h;
      ctx.globalAlpha = b.a * (0.85 + 0.15 * Math.sin(T * 0.4 + b.ph));
      ctx.translate(x, y);
      ctx.rotate(Math.sin(T * 0.1 + b.ph) * b.rot * 3);
      ctx.drawImage(b.c, -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // board (grows in when the shape changes)
    const ie = easeOut(boardIntro);
    const bs = 0.94 + 0.06 * ie;
    ctx.save();
    ctx.globalAlpha = ie;
    ctx.translate(L.cx, L.cy);
    ctx.scale(bs, bs);
    ctx.translate(-L.cx, -L.cy);
    ctx.drawImage(plate.c, plate.x, plate.y, plate.w, plate.h);

    // ripples travelling through the plate
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt / 0.55;
      if (r.t >= 1) { ripples.splice(i, 1); continue; }
      const e = easeOut(r.t);
      const tn = pal.tones[r.ci];
      ctx.strokeStyle = rgba(pal.glow ? tn.c : tn.lo, 0.38 * (1 - e));
      ctx.lineWidth = L.P * 0.07 * (1 - e) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, L.P * (0.5 + e * 1.05), 0, Math.PI * 2);
      ctx.stroke();
    }

    // hovered bubble (mouse) lifts a hair
    let hov = null;
    if (hover && hover.type === 'mouse' && !hover.down) {
      let best = (L.P * 0.5) ** 2;
      for (const c of cells) {
        const d = (c.x - hover.x) ** 2 + (c.y - hover.y) ** 2;
        if (d < best) { best = d; hov = c; }
      }
    }

    // bubbles
    for (const c of cells) {
      if (c.delay > 0) {
        // not inflated yet: flat disc
        drawBubble(ctx, c.x, c.y, L.P, 0, pal.tones[c.ci], pal.glow, false);
        continue;
      }
      const tn = pal.tones[c.ci];
      if (c.rest) {
        const sp = getSprite(c.ci, c.target > 0);
        let sz = sp.S;
        if (c.target > 0) sz *= 1 + 0.007 * Math.sin(T * 1.1 + c.phase) + (c === hov ? 0.03 : 0);
        ctx.drawImage(sp.c, c.x - sz / 2, c.y - sz / 2, sz, sz);
      } else {
        drawBubble(ctx, c.x, c.y, L.P, c.h, tn, pal.glow, rich);
      }
    }

    // glossy sweep (celebration / flip finish)
    if (shimmer) {
      shimmer.t += dt / 1.3;
      if (shimmer.t >= 1) shimmer = null;
    }
    ctx.save();
    ctx.clip(L.path);
    const bw = L.bx1 - L.bx0;
    const bh = L.by1 - L.by0;
    const sx = L.bx0 + (0.12 + 0.76 * shimmerSm) * bw + Math.sin(T * 0.25) * bw * 0.08;
    const sg = ctx.createLinearGradient(sx - bw * 0.35, L.by0, sx + bw * 0.35, L.by1);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, `rgba(255,255,255,${0.07 + 0.02 * Math.sin(T * 0.6)})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(L.bx0, L.by0, bw, bh);
    if (shimmer) {
      const p = easeOut(shimmer.t);
      const cxp = L.bx0 - bw * 0.3 + p * bw * 1.6;
      const gs = ctx.createLinearGradient(cxp - bw * 0.22, L.by0, cxp + bw * 0.22 + bh * 0.3, L.by1);
      gs.addColorStop(0, 'rgba(255,255,255,0)');
      gs.addColorStop(0.5, `rgba(255,255,255,${0.42 * Math.sin(Math.PI * shimmer.t)})`);
      gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gs;
      ctx.fillRect(L.bx0, L.by0, bw, bh);
    }
    ctx.restore();
    ctx.restore();

    // sparkles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t > p.life) { particles.splice(i, 1); continue; }
      p.vx *= 0.93;
      p.vy = p.vy * 0.93 + 90 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.t / p.life;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
      const s = p.s * (0.5 + k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s * 1.8);
      ctx.lineTo(p.x + s * 0.5, p.y);
      ctx.lineTo(p.x, p.y + s * 1.8);
      ctx.lineTo(p.x - s * 0.5, p.y);
      ctx.closePath();
      ctx.moveTo(p.x - s * 1.8, p.y);
      ctx.lineTo(p.x, p.y - s * 0.5);
      ctx.lineTo(p.x + s * 1.8, p.y);
      ctx.lineTo(p.x, p.y + s * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  layout(); // first layout once everything above is defined
  const loop = createLoop(render);

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      store.setItem('hush:popit:total', String(total));
      cv.dispose();
    },
  };
}
