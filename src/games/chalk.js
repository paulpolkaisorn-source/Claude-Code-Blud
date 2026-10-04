// Chalkboard — 2D canvas. A slate board in a wooden frame with a chalk tray.
// Strokes are stamped as grainy speckle along the path (pressure = stroke speed),
// the felt eraser smudges chalk into a pale ghost haze, and every sound is
// synthesized: speed-driven band-passed noise with stick-slip AM + grit ticks.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, damp, mulberry32, smoothstep } from '../util.js';
import { Pad } from '../audio.js';

const mixRGB = (a, b, t) => [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

const COLORS = [
  { id: 'white', rgb: [247, 244, 235], pitch: 1.0, name: 'White' },
  { id: 'pink', rgb: [243, 150, 188], pitch: 1.07, name: 'Pink' },
  { id: 'yellow', rgb: [247, 223, 110], pitch: 1.11, name: 'Yellow' },
  { id: 'blue', rgb: [124, 184, 240], pitch: 0.93, name: 'Blue' },
  { id: 'green', rgb: [138, 214, 150], pitch: 0.97, name: 'Green' },
  { id: 'orange', rgb: [246, 160, 92], pitch: 1.035, name: 'Orange' },
].map((c) => ({ ...c, s0: css(c.rgb), s1: css(mixRGB(c.rgb, [255, 255, 255], 0.38)), s2: css(mixRGB(c.rgb, [20, 30, 25], 0.22)) }));
const DUST_PALE = 'rgb(232,236,228)';

const WIDTHS = { thin: 3.2, medium: 6.4, thick: 13 };

// value noise for stick-slip density along the stroke
const NZ = new Float32Array(256);
for (let i = 0; i < 256; i++) NZ[i] = Math.random();
const vnoise = (x) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = NZ[i & 255];
  const b = NZ[(i + 1) & 255];
  return a + (b - a) * u;
};

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const detail = gfx?.detail ?? 1;
  const pFactor = gfx?.particles ?? 1;

  // ---------- state ----------
  let w = 0, h = 0, dpr = 1;
  let bx = 0, by = 0, bw = 0, bh = 0;       // board rect (css px)
  let ty = 0, trayH = 0, frameW = 0;         // tray top / height
  let k = 1, gk = 0.5;                       // chalk / ghost buffer scale
  let uiScale = 1;
  let base = null, overlay = null;
  let chalkCv = null, chalkCtx = null, ghostCv = null, ghostCtx = null;
  let tmpS = null, tmpL = null;
  let brush = null, grainTile = null;
  let chalkSprites = [], eraserSprite = null, shadowSprite = null;
  let slots = [];
  let prevBoard = null;
  let seeded = false;
  let tool = 'chalk';
  let widthId = 'medium';
  let colorIdx = 0;
  let stroke = null;
  let hover = null;
  let hoverSlot = -1;
  let particles = [];
  let wipe = null;
  let dirty = true;
  let elapsed = 0;
  let eraserDir = 0;
  const lift = new Float32Array(COLORS.length + 1);
  const hoverLift = new Float32Array(COLORS.length + 1);

  const cv = createCanvas2D(root, { maxPixels: gfx?.pixels2D ?? 2_600_000, onResize: layout });
  const { ctx } = cv;

  // ---------- layout / static art ----------
  function hudInset() {
    try {
      const el = document.querySelector('.hud-bottom') || document.getElementById('hud-tools');
      const r = root.getBoundingClientRect();
      if (el && el.offsetHeight) {
        const t = el.getBoundingClientRect();
        return clamp(r.bottom - t.top + 4, 54, 230);
      }
    } catch (_) { /* ignore */ }
    return 70;
  }

  function layout() {
    w = cv.w;
    h = cv.h;
    dpr = cv.dpr;
    if (!w || !h) return;
    frameW = Math.round(clamp(Math.min(w, h) * 0.026, 8, 18));
    trayH = Math.round(clamp(h * 0.065, 42, 58));
    const inset = hudInset();
    bx = frameW;
    by = frameW;
    bw = w - frameW * 2;
    bh = Math.max(160, h - frameW - trayH - inset);
    ty = by + bh;
    uiScale = clamp(Math.min(bw, bh) / 700, 0.85, 1.2);
    k = dpr;
    gk = Math.max(0.5, dpr * (gfx?.level >= 3 ? 0.7 : 0.55));

    // keep the drawing across resizes (contain-fit resample)
    const oldChalk = chalkCv;
    const oldGhost = ghostCv;
    const old = prevBoard;
    chalkCv = mk(bw * k, bh * k);
    chalkCtx = chalkCv.getContext('2d');
    chalkCtx.setTransform(k, 0, 0, k, 0, 0);
    ghostCv = mk(bw * gk, bh * gk);
    ghostCtx = ghostCv.getContext('2d');
    ghostCtx.setTransform(gk, 0, 0, gk, 0, 0);
    if (oldChalk && old) {
      const s = Math.min(bw / old.w, bh / old.h);
      const dw = old.w * s;
      const dh = old.h * s;
      const dx = (bw - dw) / 2;
      const dy = (bh - dh) / 2;
      chalkCtx.imageSmoothingQuality = 'high';
      chalkCtx.drawImage(oldChalk, dx, dy, dw, dh);
      ghostCtx.drawImage(oldGhost, dx, dy, dw, dh);
    }
    prevBoard = { w: bw, h: bh };

    buildGrain();
    buildBrush();
    tmpS = makeTmp(Math.ceil(70 * uiScale) + 4, Math.ceil(48 * uiScale) + 4);
    tmpL = makeTmp(Math.ceil(100 * uiScale) + 8, Math.ceil(bh * 0.34) + 8);
    buildBase();
    buildOverlay();
    buildTray();
    if (!seeded) {
      seeded = true;
      drawDoodles();
    }
    dirty = true;
  }

  function makeTmp(cw, ch) {
    const c = mk(cw * k, ch * k);
    return { cv: c, g: c.getContext('2d'), cw, ch };
  }

  function buildGrain() {
    const n = 128;
    const c = mk(n, n);
    const g = c.getContext('2d');
    const img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const r = Math.random();
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = r < 0.42 ? 0 : Math.round(Math.pow(Math.random(), 0.8) * 255);
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
  }

  function buildBrush() {
    // soft rounded-rect alpha mask for the felt eraser
    const W = 96, H = 64;
    const c = mk(W, H);
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = Math.abs((x + 0.5) / W * 2 - 1);
        const v = Math.abs((y + 0.5) / H * 2 - 1);
        const d = Math.pow(Math.pow(u, 3.2) + Math.pow(v, 3.2), 1 / 3.2);
        const a = 1 - smoothstep(0.5, 1, d);
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    brush = c;
  }

  function woodGrain(g, x, y, ww, hh, vertical, rnd, count) {
    g.save();
    g.beginPath();
    g.rect(x, y, ww, hh);
    g.clip();
    const len = vertical ? hh : ww;
    const span = vertical ? ww : hh;
    for (let i = 0; i < count; i++) {
      const o = rnd() * span;
      const wob = () => (rnd() - 0.5) * 5;
      g.strokeStyle = rnd() > 0.5 ? `rgba(255,222,180,${0.03 + rnd() * 0.06})` : `rgba(25,12,0,${0.05 + rnd() * 0.09})`;
      g.lineWidth = 0.5 + rnd() * 1.5;
      g.beginPath();
      if (vertical) {
        g.moveTo(x + o, y);
        g.bezierCurveTo(x + o + wob(), y + len * 0.3, x + o + wob(), y + len * 0.7, x + o + wob(), y + len);
      } else {
        g.moveTo(x, y + o);
        g.bezierCurveTo(x + len * 0.3, y + o + wob(), x + len * 0.7, y + o + wob(), x + len, y + o + wob());
      }
      g.stroke();
    }
    g.restore();
  }

  function buildBase() {
    const c = mk(w * dpr, h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const rnd = mulberry32(4242);
    // ---- wood frame
    const wood = g.createLinearGradient(0, 0, w, h);
    wood.addColorStop(0, '#8a6342');
    wood.addColorStop(0.5, '#6a4a31');
    wood.addColorStop(1, '#7a563a');
    g.fillStyle = wood;
    g.fillRect(0, 0, w, h);
    woodGrain(g, 0, 0, w, frameW, false, rnd, 22);
    woodGrain(g, 0, ty + trayH * 0.78, w, h - ty - trayH * 0.78, false, rnd, 40);
    woodGrain(g, 0, 0, frameW, h, true, rnd, 10);
    woodGrain(g, w - frameW, 0, frameW, h, true, rnd, 10);
    // mitred corners
    g.strokeStyle = 'rgba(20,8,0,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(bx, by);
    g.moveTo(w, 0); g.lineTo(bx + bw, by);
    g.stroke();
    // darker lower rail (HUD lives here)
    const rail = g.createLinearGradient(0, ty + trayH * 0.78, 0, h);
    rail.addColorStop(0, 'rgba(18,8,0,0.32)');
    rail.addColorStop(1, 'rgba(18,8,0,0.12)');
    g.fillStyle = rail;
    g.fillRect(0, ty + trayH * 0.78, w, h - ty - trayH * 0.78);

    // ---- slate
    g.save();
    g.beginPath();
    g.rect(bx, by, bw, bh);
    g.clip();
    const sl = g.createLinearGradient(bx, by, bx + bw, by + bh);
    sl.addColorStop(0, '#34443d');
    sl.addColorStop(0.55, '#2b3a34');
    sl.addColorStop(1, '#25322d');
    g.fillStyle = sl;
    g.fillRect(bx, by, bw, bh);
    // mottled tone variations
    const nm = Math.round(26 * detail);
    for (let i = 0; i < nm; i++) {
      const cx = bx + rnd() * bw;
      const cy = by + rnd() * bh;
      const r = (0.12 + rnd() * 0.3) * Math.max(bw, bh);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      const light = rnd() > 0.45;
      gr.addColorStop(0, light ? 'rgba(160,190,175,0.045)' : 'rgba(5,15,10,0.07)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(bx, by, bw, bh);
    }
    // old wiped residue: broad soft arcs, painted as nested translucent strokes
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = by + rnd() * bh;
      const x0 = bx + rnd() * bw * 0.4 - 30;
      const x1 = x0 + bw * (0.35 + rnd() * 0.5);
      const bend = (rnd() - 0.5) * 90;
      const wd = 36 + rnd() * 70;
      for (let j = 0; j < 7; j++) {
        g.strokeStyle = `rgba(214,232,222,${0.006 * (1 + rnd() * 0.5)})`;
        g.lineWidth = wd * (1 - j / 8);
        g.beginPath();
        g.moveTo(x0, y);
        g.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + bend, x0 + (x1 - x0) * 0.7, y - bend * 0.6, x1, y + (rnd() - 0.5) * 20);
        g.stroke();
      }
    }
    // elliptical cloud puffs
    for (let i = 0; i < 16; i++) {
      const cx = bx + rnd() * bw;
      const cy = by + rnd() * bh;
      const rx = 40 + rnd() * 150;
      g.save();
      g.translate(cx, cy);
      g.rotate((rnd() - 0.5) * 0.5);
      g.scale(1, 0.32 + rnd() * 0.3);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(220,236,226,${0.025 + rnd() * 0.035})`);
      gr.addColorStop(1, 'rgba(220,236,226,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // fine tooth: noise tile (pixel space)
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const tileG = mk(160, 160);
    const tg = tileG.getContext('2d');
    const im = tg.createImageData(160, 160);
    for (let i = 0; i < 160 * 160; i++) {
      const v = 128 + (Math.random() - 0.5) * 120;
      im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
    }
    tg.putImageData(im, 0, 0);
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.55;
    g.fillStyle = g.createPattern(tileG, 'repeat');
    g.fillRect(bx * dpr, by * dpr, bw * dpr, bh * dpr);
    // sparse bright flecks
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    const fl = Math.round(bw * bh * 0.006 * detail);
    for (let i = 0; i < fl; i++) {
      g.fillStyle = `rgba(210,230,220,${0.03 + rnd() * 0.09})`;
      const s = (0.6 + rnd() * 1.2) * dpr;
      g.fillRect((bx + rnd() * bw) * dpr, (by + rnd() * bh) * dpr, s, s);
    }
    g.restore();
    // hairline scratches
    g.lineWidth = 0.6;
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(215,230,222,${0.03 + rnd() * 0.05})`;
      const x = bx + rnd() * bw;
      const y = by + rnd() * bh;
      const a = rnd() * Math.PI * 2;
      const l = 12 + rnd() * 60;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.restore();

    // ---- tray ledge
    const surfH = trayH * 0.78;
    const top = g.createLinearGradient(0, ty, 0, ty + surfH);
    top.addColorStop(0, '#4b3322');
    top.addColorStop(0.18, '#7e5a3c');
    top.addColorStop(1, '#8f6745');
    g.fillStyle = top;
    g.fillRect(bx - frameW * 0.4, ty, bw + frameW * 0.8, surfH);
    woodGrain(g, bx - frameW * 0.4, ty, bw + frameW * 0.8, surfH, false, rnd, 12);
    // chalk dust along the back of the ledge
    for (let i = 0; i < 40; i++) {
      const x = bx + rnd() * bw;
      const y = ty + 2 + rnd() * surfH * 0.7;
      const rx = 10 + rnd() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rx);
      gr.addColorStop(0, `rgba(235,235,225,${0.05 + rnd() * 0.07})`);
      gr.addColorStop(1, 'rgba(235,235,225,0)');
      g.save();
      g.translate(x, y); g.scale(1, 0.22); g.translate(-x, -y);
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // front lip
    const lip = g.createLinearGradient(0, ty + surfH, 0, ty + trayH);
    lip.addColorStop(0, '#9b7249');
    lip.addColorStop(0.15, '#6a4a30');
    lip.addColorStop(1, '#4a3322');
    g.fillStyle = lip;
    g.fillRect(bx - frameW * 0.4, ty + surfH, bw + frameW * 0.8, trayH - surfH);
    g.fillStyle = 'rgba(255,230,190,0.28)';
    g.fillRect(bx - frameW * 0.4, ty + surfH, bw + frameW * 0.8, 1);
    // shadow under the lip
    const ls = g.createLinearGradient(0, ty + trayH, 0, ty + trayH + 14);
    ls.addColorStop(0, 'rgba(0,0,0,0.38)');
    ls.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ls;
    g.fillRect(bx - frameW * 0.4, ty + trayH, bw + frameW * 0.8, 14);
    // bevel highlight on the frame
    g.strokeStyle = 'rgba(255,225,190,0.2)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    base = c;
  }

  function buildOverlay() {
    const s = 0.5;
    const ow = Math.ceil(bw * s);
    const oh = Math.ceil(bh * s);
    const c = mk(ow, oh);
    const g = c.getContext('2d');
    // inner shadow via the shadow trick
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.75)';
    g.shadowBlur = 20 * s * 1.5;
    g.fillStyle = '#000';
    g.beginPath();
    g.rect(-80, -80, ow + 160, oh + 160);
    g.rect(0, 0, ow, oh);
    g.fill('evenodd');
    g.restore();
    g.clearRect(-1, -1, 0, 0);
    // soft overhead light + corner falloff
    const lg = g.createRadialGradient(ow * 0.45, oh * 0.18, Math.min(ow, oh) * 0.1, ow * 0.5, oh * 0.5, Math.max(ow, oh) * 0.72);
    lg.addColorStop(0, 'rgba(255,255,235,0.075)');
    lg.addColorStop(0.5, 'rgba(255,255,235,0.0)');
    lg.addColorStop(1, 'rgba(0,10,5,0.28)');
    g.fillStyle = lg;
    g.fillRect(0, 0, ow, oh);
    // thin highlight along the slate's bottom edge where it meets the ledge
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, oh - 2, ow, 2);
    overlay = c;
  }

  // ---------- tray ----------
  function buildTray() {
    const u = Math.min(90, (bw - 28) / 8.1);
    const L = u * 0.84;
    const T = clamp(L * 0.29, 10.5, 18);
    const eW = u * 1.5;
    const eH = clamp(T * 2.4, 24, 40);
    const gap = u * 0.5;
    const total = u * COLORS.length + gap + eW;
    const sx = bx + (bw - total) / 2;
    const restY = ty + trayH * 0.78 * 0.58;
    const rnd = mulberry32(77);
    slots = [];
    for (let i = 0; i < COLORS.length; i++) {
      slots.push({ kind: 'chalk', i, cx: sx + u * (i + 0.5) + (rnd() - 0.5) * u * 0.06, cy: restY + (rnd() - 0.5) * 2, hw: u / 2, rot: (rnd() - 0.5) * 0.08, L, T });
    }
    slots.push({ kind: 'eraser', i: COLORS.length, cx: sx + u * COLORS.length + gap + eW / 2, cy: restY - 1, hw: eW / 2 + gap * 0.3, rot: 0.02, L: eW, T: eH });

    // chalk sprites (tip on the right)
    const pad = 8;
    chalkSprites = COLORS.map((col, ci) => {
      const c = mk((L + pad * 2) * dpr, (T + pad * 2) * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(pad, pad);
      const r = mulberry32(900 + ci);
      const path = () => {
        g.beginPath();
        g.moveTo(T * 0.3, 0);
        g.lineTo(L - T * 0.35, 0);
        g.lineTo(L, T * 0.22);
        g.lineTo(L - T * 0.05, T * 0.82);
        g.lineTo(L - T * 0.4, T);
        g.lineTo(T * 0.3, T);
        g.quadraticCurveTo(0, T, 0, T * 0.5);
        g.quadraticCurveTo(0, 0, T * 0.3, 0);
        g.closePath();
      };
      path();
      const gr = g.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, col.s1);
      gr.addColorStop(0.45, col.s0);
      gr.addColorStop(1, col.s2);
      g.fillStyle = gr;
      g.fill();
      g.save();
      path();
      g.clip();
      for (let i = 0; i < 70; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,' + (0.1 + r() * 0.25) + ')' : 'rgba(40,40,40,' + (0.06 + r() * 0.12) + ')';
        const s = 0.5 + r() * 1.1;
        g.fillRect(r() * L, r() * T, s, s);
      }
      // rubbed, chalk-dusted tip end
      const tip = g.createLinearGradient(L - T * 1.3, 0, L, 0);
      tip.addColorStop(0, 'rgba(255,255,255,0)');
      tip.addColorStop(1, 'rgba(255,255,255,0.4)');
      g.fillStyle = tip;
      g.fillRect(L - T * 1.3, 0, T * 1.3, T);
      // paper-ish ring near the back end
      g.fillStyle = 'rgba(30,30,30,0.08)';
      g.fillRect(T * 0.8, 0, 1.2, T);
      g.restore();
      path();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 0.8;
      g.stroke();
      return c;
    });

    // eraser sprite
    {
      const c = mk((eW + pad * 2) * dpr, (eH + pad * 2) * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(pad, pad);
      const r = mulberry32(555);
      const rr = Math.min(5, eH * 0.18);
      const woodH = eH * 0.46;
      g.beginPath();
      g.roundRect(0, 0, eW, eH, rr);
      g.save();
      g.clip();
      const wg = g.createLinearGradient(0, 0, 0, woodH);
      wg.addColorStop(0, '#b08a5c');
      wg.addColorStop(1, '#7c5a38');
      g.fillStyle = wg;
      g.fillRect(0, 0, eW, woodH);
      for (let i = 0; i < 8; i++) {
        g.strokeStyle = `rgba(40,20,0,${0.08 + r() * 0.1})`;
        g.lineWidth = 0.6;
        const y = r() * woodH;
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(eW * 0.3, y + 1.5, eW * 0.6, y - 1.5, eW, y + 1); g.stroke();
      }
      const fg = g.createLinearGradient(0, woodH, 0, eH);
      fg.addColorStop(0, '#5a5755');
      fg.addColorStop(1, '#2d2b2b');
      g.fillStyle = fg;
      g.fillRect(0, woodH, eW, eH - woodH);
      // felt fibres + chalk dust
      for (let i = 0; i < 160; i++) {
        g.fillStyle = r() > 0.4 ? `rgba(255,255,255,${0.04 + r() * 0.16})` : `rgba(0,0,0,${0.1 + r() * 0.15})`;
        g.fillRect(r() * eW, woodH + r() * (eH - woodH), 0.6 + r() * 1.6, 0.5 + r() * 0.8);
      }
      for (let i = 0; i < 5; i++) {
        const x = r() * eW;
        const y = woodH + (eH - woodH) * (0.4 + r() * 0.6);
        const gr = g.createRadialGradient(x, y, 0, x, y, eW * 0.18);
        gr.addColorStop(0, 'rgba(235,235,225,0.22)');
        gr.addColorStop(1, 'rgba(235,235,225,0)');
        g.fillStyle = gr;
        g.fillRect(x - eW * 0.2, y - eW * 0.2, eW * 0.4, eW * 0.4);
      }
      g.fillStyle = 'rgba(255,240,215,0.35)';
      g.fillRect(0, 0, eW, 1);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, woodH - 0.5, eW, 1);
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.roundRect(0, 0, eW, eH, rr);
      g.stroke();
      eraserSprite = { cv: c, w: eW, h: eH, pad };
    }

    // blurred drop shadows, one per piece
    for (const sl of slots) {
      const sw = sl.L + 24;
      const c = mk(sw * dpr, (sl.T + 24) * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.shadowColor = 'rgba(0,0,0,0.9)';
      g.shadowBlur = 4.5 * dpr;
      g.shadowOffsetX = 100000 * dpr;
      g.fillStyle = '#000';
      g.beginPath();
      g.roundRect(12 - 100000, 12, sl.L, sl.T, sl.T * 0.4);
      g.fill();
      sl.shadow = { cv: c, w: sw, h: sl.T + 24 };
    }
  }

  // ---------- chalk stamping ----------
  const DENS = 0.95;
  /** Stamp speckled chalk along a segment. st: {w, press, speedN, col, alphaMul, carry, dist, seed} */
  function chalkSeg(g, x0, y0, x1, y1, st) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const wd = st.w;
    const press = st.press;
    const col = st.col;
    const am = st.alphaMul ?? 1;
    const step = Math.max(0.75, wd * 0.17);
    const sn = st.speedN;
    // faint continuous body so thick strokes read as one mark
    g.globalAlpha = clamp(0.2 * press * am * (1 - sn * 0.55), 0, 1);
    g.strokeStyle = col.s0;
    g.lineWidth = wd * 0.46;
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    let d = st.carry;
    let last = null;
    const dens = DENS * (0.6 + detail * 0.4);
    const szMul = (0.8 + 0.45 * press) * (0.85 + wd * 0.02) / Math.sqrt(0.6 + detail * 0.4);
    while (d < len) {
      st.dist += step;
      const slip = 0.5 + 0.5 * vnoise(st.dist * 0.05 + st.seed) ;
      const skip = sn * 0.32 + (1 - slip) * 0.22;
      if (Math.random() >= skip) {
        const px = x0 + ux * d;
        const py = y0 + uy * d;
        const n = Math.max(1, Math.round(dens * step * wd * press * (0.45 + slip * 0.75) * (1 - sn * 0.5)));
        const half = wd * 0.5;
        for (let i = 0; i < n; i++) {
          const off = (Math.random() + Math.random() - 1) * half * (Math.random() < 0.07 ? 1.45 : 1);
          const al = (Math.random() - 0.5) * step * 1.6;
          const sz = (0.5 + Math.random() * Math.random() * 1.7) * szMul;
          const fs = Math.random() < 0.3 ? col.s1 : col.s0;
          if (fs !== last) { g.fillStyle = fs; last = fs; }
          g.globalAlpha = (0.3 + Math.random() * 0.7) * press * am;
          g.fillRect(px + nx * off + ux * al - sz * 0.5, py + ny * off + uy * al - sz * 0.5, sz, sz * (0.45 + Math.random() * 0.9));
        }
        // the odd gritty flake
        if (Math.random() < 0.03 * press) {
          g.fillStyle = col.s1; last = col.s1;
          g.globalAlpha = (0.5 + Math.random() * 0.4) * am;
          const a = Math.random() * Math.PI;
          const fl = 1.5 + Math.random() * 2.8;
          g.fillRect(px + nx * (Math.random() - 0.5) * wd - 0.4, py + ny * (Math.random() - 0.5) * wd - 0.4, Math.cos(a) * fl + 1, Math.sin(a) * fl * 0.4 + 0.8);
        }
      }
      d += step;
    }
    st.carry = d - len;
    g.globalAlpha = 1;
  }

  // ---------- erasing ----------
  /** One felt-eraser footprint: smear chalk into the ghost layer, then remove it. */
  function eraseAt(x, y, ew, eh, o) {
    const X0 = x - ew / 2 - bx;
    const Y0 = y - eh / 2 - by;
    const T = o.tmp;
    const pw = Math.min(T.cv.width, Math.ceil(ew * k));
    const ph = Math.min(T.cv.height, Math.ceil(eh * k));
    const tg = T.g;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.globalAlpha = 1;
    tg.clearRect(0, 0, T.cv.width, T.cv.height);
    tg.drawImage(chalkCv, X0 * k, Y0 * k, pw, ph, 0, 0, pw, ph);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(brush, 0, 0, pw, ph);
    ghostCtx.globalCompositeOperation = 'source-over';
    ghostCtx.globalAlpha = o.ghostA;
    ghostCtx.drawImage(T.cv, 0, 0, pw, ph, X0 + (o.smx || 0), Y0 + (o.smy || 0), pw / k, ph / k);
    if (o.haze) {
      ghostCtx.fillStyle = '#fff';
      ghostCtx.globalAlpha = o.haze;
      ghostCtx.drawImage(brush, X0, Y0, ew, eh);
    }
    ghostCtx.globalAlpha = 1;
    chalkCtx.globalCompositeOperation = 'destination-out';
    chalkCtx.globalAlpha = o.chalkA;
    chalkCtx.drawImage(brush, X0, Y0, ew, eh);
    chalkCtx.globalCompositeOperation = 'source-over';
    chalkCtx.globalAlpha = 1;
  }

  const eraserSize = () => ({ ew: 62 * uiScale, eh: 40 * uiScale });

  function eraseSeg(x0, y0, x1, y1, st) {
    const { ew, eh } = eraserSize();
    const len = Math.hypot(x1 - x0, y1 - y0);
    const step = 5 * uiScale;
    let d = st.carry;
    const ux = (x1 - x0) / (len || 1);
    const uy = (y1 - y0) / (len || 1);
    while (d <= len) {
      eraseAt(x0 + ux * d, y0 + uy * d, ew, eh, { tmp: tmpS, ghostA: 0.05, chalkA: 0.62, smx: ux * 4, smy: uy * 4 });
      d += step;
    }
    st.carry = d - len;
  }

  // ---------- doodles (old residue) ----------
  function drawDoodles() {
    const S = Math.min(bw, bh * 1.3);
    const T = mk(bw * k, bh * k);
    const g = T.getContext('2d');
    g.scale(k, k);
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = Math.max(1.8, S * 0.0042);
    const rnd = mulberry32(31337);
    const jit = (v) => v + (rnd() - 0.5) * S * 0.004;
    const fs = clamp(S * 0.04, 15, 38);
    g.font = `italic ${fs}px "Segoe Script","Bradley Hand","Chalkboard SE","Comic Sans MS","Noteworthy","Comic Neue",cursive`;
    const portrait = bw < bh * 0.9;

    // equations
    const eq = (txt, u, v, rot = 0, size = 1) => {
      g.save();
      g.translate(bw * u, bh * v);
      g.rotate(rot);
      g.font = g.font.replace(/[\d.]+px/, `${(fs * size).toFixed(1)}px`);
      g.fillText(txt, 0, 0);
      g.restore();
    };
    eq('E = mc²', portrait ? 0.08 : 0.07, portrait ? 0.16 : 0.16, -0.04, 1.35);
    eq('a² + b² = c²', portrait ? 0.1 : 0.09, portrait ? 0.27 : 0.3, 0.015, 1);
    eq('∫ x² dx = x³/3 + C', portrait ? 0.07 : 0.55, portrait ? 0.82 : 0.86, -0.02, 0.95);
    eq('π ≈ 3.14159…', portrait ? 0.45 : 0.68, portrait ? 0.31 : 0.4, 0.03, 0.85);
    eq('Δx → 0', portrait ? 0.14 : 0.1, portrait ? 0.7 : 0.78, -0.03, 0.9);
    // underline squiggle
    const squig = (x, y, len) => {
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 1; i <= 16; i++) g.lineTo(x + (len * i) / 16, jit(y + Math.sin(i * 1.3) * S * 0.004));
      g.stroke();
    };
    squig(bw * (portrait ? 0.08 : 0.07), bh * (portrait ? 0.185 : 0.195), S * 0.22);
    // star
    {
      const cx = bw * (portrait ? 0.76 : 0.82);
      const cy = bh * (portrait ? 0.46 : 0.24);
      const R = S * 0.085;
      g.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = -Math.PI / 2 + ((i * 2) % 5) * ((Math.PI * 2) / 5);
        const px = jit(cx + Math.cos(a) * R);
        const py = jit(cy + Math.sin(a) * R);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, R * 1.28, -0.3, 4.4);
      g.stroke();
    }
    // right triangle with ticks
    {
      const x = bw * (portrait ? 0.14 : 0.2);
      const y = bh * (portrait ? 0.6 : 0.7);
      const a = S * 0.17;
      const b = S * 0.11;
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + a, y); g.lineTo(x, y - b); g.closePath();
      g.stroke();
      g.strokeRect(x + 1, y - 10, 10, 9);
    }
    // spiral
    {
      const cx = bw * (portrait ? 0.78 : 0.9);
      const cy = bh * (portrait ? 0.68 : 0.6);
      g.beginPath();
      for (let i = 0; i < 70; i++) {
        const a = i * 0.28;
        const r = i * S * 0.0011;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    }
    // tally marks
    {
      const x = bw * (portrait ? 0.48 : 0.45);
      const y = bh * (portrait ? 0.54 : 0.14);
      for (let j = 0; j < 4; j++) {
        g.beginPath();
        g.moveTo(jit(x + j * 9), y);
        g.lineTo(jit(x + j * 9 + 1), y + S * 0.045);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(x - 6, y + S * 0.035);
      g.lineTo(x + 36, y + S * 0.008);
      g.stroke();
    }
    // little arrow
    {
      const x = bw * (portrait ? 0.3 : 0.38);
      const y = bh * (portrait ? 0.9 : 0.52);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + S * 0.06, y - S * 0.04, x + S * 0.12, y + S * 0.005);
      g.moveTo(x + S * 0.12, y + S * 0.005);
      g.lineTo(x + S * 0.1, y - S * 0.012);
      g.moveTo(x + S * 0.12, y + S * 0.005);
      g.lineTo(x + S * 0.095, y + S * 0.016);
      g.stroke();
    }
    // punch the grain of the slate through everything
    g.globalCompositeOperation = 'destination-out';
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = g.createPattern(grainTile, 'repeat');
    g.globalAlpha = 0.9;
    g.fillRect(0, 0, T.width, T.height);
    g.restore();
    chalkCtx.globalAlpha = 0.24;
    chalkCtx.drawImage(T, 0, 0, bw, bh);
    chalkCtx.globalAlpha = 1;
  }

  // ---------- wipe ----------
  const ROWS = 4;
  const ROW_T = 0.62;
  const TURN_T = 0.16;
  function wipePos(t) {
    const per = ROW_T + TURN_T;
    const row = Math.min(ROWS - 1, Math.floor(t / per));
    const lt = t - row * per;
    const yOf = (r) => bh * (0.13 + r * 0.245);
    const over = 70;
    const ltr = row % 2 === 0;
    let x, y;
    if (lt <= ROW_T) {
      const u = lt / ROW_T;
      const e = u * u * (3 - 2 * u) * 0.5 + u * 0.5;
      x = lerp(-over, bw + over, ltr ? e : 1 - e);
      y = yOf(row) + Math.sin(u * Math.PI * 2) * bh * 0.012;
    } else {
      const u = (lt - ROW_T) / TURN_T;
      x = ltr ? bw + over : -over;
      y = lerp(yOf(row), yOf(row + 1), u * u * (3 - 2 * u));
    }
    return { x, y };
  }

  function startWipe() {
    if (wipe) return;
    stroke = null;
    wipe = { t: 0, prev: wipePos(0), sp: 0, carry: 0 };
    // existing haze is lifted a little so repeated wipes do not build a fog
    ghostCtx.globalCompositeOperation = 'destination-out';
    ghostCtx.globalAlpha = 0.45;
    ghostCtx.fillStyle = '#000';
    ghostCtx.fillRect(0, 0, bw, bh);
    ghostCtx.globalCompositeOperation = 'source-over';
    ghostCtx.globalAlpha = 1;
    if (audio.ready) {
      const per = ROW_T + TURN_T;
      for (let i = 0; i < ROWS; i++) {
        const up = i % 2 === 0;
        audio.burst(bus, { kind: 'pink', dur: ROW_T * 0.75, attack: ROW_T * 0.3, gain: 0.26, type: 'bandpass', freq: up ? 650 : 1700, freqEnd: up ? 1700 : 650, q: 0.55, curve: 'lin', pan: up ? -0.45 : 0.45, send: 0.3, delay: i * per });
        audio.burst(bus, { kind: 'white', dur: ROW_T * 0.7, attack: ROW_T * 0.3, gain: 0.07, type: 'highpass', freq: 3200, curve: 'lin', pan: up ? -0.3 : 0.3, send: 0.2, delay: i * per });
        audio.tone(bus, { freq: 90, freqEnd: 60, dur: 0.12, gain: 0.1, send: 0.2, delay: i * per + ROW_T * 0.95 });
      }
    }
    audio.haptic?.(14);
  }

  function stepWipe(dt) {
    const total = ROWS * (ROW_T + TURN_T) - TURN_T;
    wipe.t = Math.min(total, wipe.t + dt);
    const p = wipePos(wipe.t);
    const dx = p.x - wipe.prev.x;
    const dy = p.y - wipe.prev.y;
    const len = Math.hypot(dx, dy);
    wipe.sp = clamp(len / Math.max(dt, 0.001) / 2400, 0, 1);
    const ew = 86 * uiScale;
    const eh = Math.max(110, bh * 0.3);
    const step = 11 * uiScale;
    let d = wipe.carry;
    const ux = dx / (len || 1);
    const uy = dy / (len || 1);
    while (d <= len) {
      const sx = wipe.prev.x + ux * d;
      const sy = wipe.prev.y + uy * d;
      if (sx > -ew && sx < bw + ew) {
        eraseAt(bx + sx, by + sy, ew, eh, { tmp: tmpL, ghostA: 0.075, chalkA: 0.5, haze: 0.014, smx: ux * 18, smy: uy * 6 });
        if (Math.random() < 0.5 * pFactor) spawnDust(bx + sx, by + sy + (Math.random() - 0.5) * eh * 0.8, 1, ux * 120, true);
      }
      d += step;
    }
    wipe.carry = d - len;
    wipe.prev = p;
    wipe.px = p.x;
    wipe.py = p.y;
    if (wipe.t >= total) {
      chalkCtx.clearRect(0, 0, bw, bh);
      wipe = null;
    }
  }

  // ---------- dust ----------
  const MAX_DUST = Math.round(240 * pFactor);
  function spawnDust(x, y, n, vx0 = 0, pale = false, col = null) {
    for (let i = 0; i < n; i++) {
      if (particles.length >= MAX_DUST) particles.shift();
      particles.push({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * (pale ? 46 : 26) + vx0 * 0.04,
        vy: -Math.random() * (pale ? 22 : 8) + Math.random() * 14,
        g: pale ? 70 + Math.random() * 40 : 140 + Math.random() * 90,
        life: 0.6 + Math.random() * (pale ? 1.7 : 1.1),
        t: 0,
        s: pale ? 0.8 + Math.random() * 1.8 : 0.5 + Math.random() * 1.2,
        a: pale ? 0.3 + Math.random() * 0.25 : 0.45 + Math.random() * 0.4,
        fill: pale ? DUST_PALE : (col || COLORS[colorIdx]).s1,
      });
    }
  }

  // ---------- audio ----------
  let V = null; // voices, built lazily once the context is unlocked
  let pad = null;
  const padLevel = 0.04;
  let chalkSp = 0;
  let eraseSp = 0;
  let gritAcc = 0;
  let lfoJit = 0;
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  function buildVoices() {
    const ac = audio.ctx;
    const src = (kind) => {
      const s = ac.createBufferSource();
      s.buffer = audio.noise[kind];
      s.loop = true;
      s.start(0, rand(0, 4));
      return s;
    };
    const biq = (type, f, q) => {
      const b = ac.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const nodes = [];
    const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; nodes.push(g); return g; };
    const out = audio.route(bus, { pan: 0, send: 0.14 });
    nodes.push(out);
    // scratch body: band-passed white noise, stick-slip AM
    const sA = src('white');
    const bpA = biq('bandpass', 3800, 0.9);
    const hpA = biq('highpass', 1800, 0.5);
    const am = gain(0.55);
    const gA = gain(0);
    sA.connect(bpA); bpA.connect(hpA); hpA.connect(am); am.connect(gA); gA.connect(out);
    const lfo = ac.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 60;
    const lfoG = gain(0.4);
    lfo.connect(lfoG); lfoG.connect(am.gain);
    lfo.start();
    // dusty hush
    const sB = src('pink');
    const bpB = biq('bandpass', 1500, 0.45);
    const gB = gain(0);
    sB.connect(bpB); bpB.connect(gB); gB.connect(out);
    // faint pitched squeak-ring (colour dependent)
    const sC = src('white');
    const bpC = biq('bandpass', 3000, 16);
    const gC = gain(0);
    sC.connect(bpC); bpC.connect(gC); gC.connect(out);
    // eraser: felt swish
    const eOut = audio.route(bus, { pan: 0, send: 0.22 });
    nodes.push(eOut);
    const sE = src('pink');
    const lpE = biq('lowpass', 900, 0.5);
    const gE = gain(0);
    sE.connect(lpE); lpE.connect(gE); gE.connect(eOut);
    const sF = src('white');
    const bpF = biq('bandpass', 1900, 0.5);
    const gF = gain(0);
    sF.connect(bpF); bpF.connect(gF); gF.connect(eOut);
    const sG = src('brown');
    const lpG = biq('lowpass', 260, 0.6);
    const gG = gain(0);
    sG.connect(lpG); lpG.connect(gG); gG.connect(eOut);
    V = { ac, out, eOut, sources: [sA, sB, sC, sE, sF, sG], lfo, nodes, gA, gB, gC, gE, gF, gG, bpA, bpC, bpB, lpE, bpF, lfoG, am, filters: [bpA, hpA, bpB, bpC, lpE, bpF, lpG] };
    pad = new Pad(audio, bus, {
      chords: [[53, 60, 64, 67], [50, 57, 60, 65], [48, 55, 59, 64], [52, 59, 62, 67]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 780,
      period: 22,
    });
  }

  function setG(node, v, tc = 0.03) {
    node.gain.setTargetAtTime(Math.max(0, v), V.ac.currentTime, tc);
  }
  const setF = (node, v, tc = 0.03) => node.frequency.setTargetAtTime(Math.max(20, v), V.ac.currentTime, tc);

  function updateAudio(dt) {
    if (!audio.ready) return;
    if (!V) buildVoices();
    const now = performance.now();
    let tC = 0;
    let tE = 0;
    let pan = 0;
    let press = 1;
    if (stroke) {
      const idle = now - stroke.lastT > 90;
      const s = idle ? 0 : clamp(stroke.spd / 1050, 0, 1);
      if (stroke.kind === 'chalk') tC = s; else tE = s;
      pan = clamp(((stroke.x - bx) / bw - 0.5) * 1.5, -0.85, 0.85);
      press = stroke.press ?? 1;
    }
    if (wipe) tE = wipe.sp * 0.85;
    chalkSp = damp(chalkSp, tC, tC > chalkSp ? 18 : 10, dt);
    eraseSp = damp(eraseSp, tE, tE > eraseSp ? 12 : 6, dt);
    const cm = COLORS[colorIdx].pitch;
    const sp = chalkSp;
    const sw = Math.sqrt(sp);
    V.out.panner?.pan.setTargetAtTime(pan, V.ac.currentTime, 0.05);
    V.eOut.panner?.pan.setTargetAtTime(wipe ? 0 : pan, V.ac.currentTime, 0.05);
    // stick-slip: AM rate follows speed, depth wobbles
    lfoJit += (Math.random() - 0.5) * 0.9;
    lfoJit *= 0.9;
    V.lfo.frequency.setTargetAtTime(28 + sp * 120 * (1 + lfoJit * 0.2), V.ac.currentTime, 0.04);
    setG(V.am, 0.5 + Math.random() * 0.16, 0.02);
    const fc = clamp((2600 + 4200 * sp) * cm * (1 + (Math.random() - 0.5) * 0.12), 1800, 8200);
    setF(V.bpA, fc, 0.025);
    setG(V.gA, 0.62 * Math.pow(sp, 0.85) * (0.65 + 0.35 * press), 0.028);
    setG(V.gB, 0.2 * sw * sp + 0.03 * sp, 0.06);
    setF(V.bpB, 1100 + 900 * sp, 0.05);
    setF(V.bpC, (2700 + 800 * sp) * cm, 0.05);
    setG(V.gC, 0.09 * Math.pow(sp, 1.3) * press, 0.04);
    // grit ticks
    if (sp > 0.04) {
      gritAcc += (8 + 70 * sp) * press * dt;
      while (gritAcc >= 1) {
        gritAcc -= 1;
        audio.burst(bus, { kind: 'white', dur: rand(0.002, 0.007), attack: 0.0003, gain: rand(0.05, 0.16) * (0.35 + sp), type: 'bandpass', freq: rand(3000, 9500) * cm, q: rand(0.9, 2.2), pan: pan + rand(-0.15, 0.15), send: 0.1 });
      }
    }
    // eraser voices
    const es = eraseSp;
    setG(V.gE, 0.5 * Math.pow(es, 0.9), 0.04);
    setF(V.lpE, 420 + 1000 * es, 0.05);
    setG(V.gF, 0.14 * Math.pow(es, 1.2), 0.04);
    setF(V.bpF, 1400 + 1300 * es, 0.05);
    setG(V.gG, 0.3 * es, 0.06);
  }

  function traySound(i) {
    if (!audio.ready) return;
    const cm = i < COLORS.length ? COLORS[i].pitch : 0.8;
    if (i < COLORS.length) {
      audio.burst(bus, { kind: 'pink', dur: 0.045, attack: 0.001, gain: 0.3, type: 'bandpass', freq: 1100 * cm, q: 1.1, send: 0.2 });
      audio.burst(bus, { kind: 'white', dur: 0.012, attack: 0.0005, gain: 0.12, type: 'highpass', freq: 4500 * cm, send: 0.12, delay: 0.004 });
      audio.tone(bus, { freq: 340 * cm, freqEnd: 190 * cm, dur: 0.07, gain: 0.1, type: 'triangle', send: 0.2 });
    } else {
      audio.burst(bus, { kind: 'brown', dur: 0.1, attack: 0.002, gain: 0.35, type: 'lowpass', freq: 500, send: 0.2 });
      audio.burst(bus, { kind: 'pink', dur: 0.05, gain: 0.14, type: 'bandpass', freq: 1500, q: 0.8, send: 0.15 });
    }
  }

  function tapSound(press, col, pan) {
    if (!audio.ready) return;
    const cm = col.pitch;
    audio.burst(bus, { kind: 'pink', dur: 0.04, attack: 0.001, gain: 0.34 * press, type: 'bandpass', freq: 1000 * cm, q: 0.9, pan, send: 0.18 });
    audio.burst(bus, { kind: 'white', dur: 0.014, attack: 0.0004, gain: 0.2 * press, type: 'highpass', freq: 3800 * cm, pan, send: 0.14 });
    audio.tone(bus, { freq: 300 * cm, freqEnd: 150 * cm, dur: 0.055, gain: 0.12 * press, type: 'triangle', pan, send: 0.2 });
    audio.burst(bus, { kind: 'white', dur: 0.2, attack: 0.02, gain: 0.04, type: 'bandpass', freq: 2200 * cm, q: 0.5, pan, send: 0.3, delay: 0.01 });
  }

  function eraserTap(pan) {
    if (!audio.ready) return;
    audio.burst(bus, { kind: 'brown', dur: 0.08, attack: 0.003, gain: 0.3, type: 'lowpass', freq: 420, pan, send: 0.2 });
    audio.burst(bus, { kind: 'pink', dur: 0.05, gain: 0.08, type: 'bandpass', freq: 1200, q: 0.7, pan, send: 0.15 });
  }

  // ---------- input ----------
  const slotAt = (x, y) => {
    if (y < ty - 16 || y > ty + trayH + 4) return -1;
    let best = -1;
    let bd = 1e9;
    for (let i = 0; i < slots.length; i++) {
      const dx = Math.abs(x - slots[i].cx);
      if (dx <= slots[i].hw && dx < bd) { bd = dx; best = i; }
    }
    return best;
  };

  function selectSlot(i) {
    const s = slots[i];
    if (!s) return;
    if (s.kind === 'chalk') {
      colorIdx = s.i;
      tool = 'chalk';
    } else {
      tool = 'eraser';
    }
    toolSeg.set(tool);
    traySound(s.i);
    audio.haptic?.(6);
    updateHint();
    dirty = true;
  }

  const inBoard = (x, y) => x >= bx && y >= by && x <= bx + bw && y <= by + bh;

  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      if (wipe) return;
      const si = slotAt(p.x, p.y);
      if (si >= 0) { selectSlot(si); return; }
      if (!inBoard(p.x, p.y) || stroke) return;
      const kind = tool;
      const col = COLORS[colorIdx];
      stroke = {
        id: p.id, kind, x: p.x, y: p.y, spd: 0, lastT: performance.now(), carry: 0, dist: 0, seed: Math.random() * 200,
        col, press: 1, speedN: 0, w: WIDTHS[widthId] * uiScale, alphaMul: 1, dust: 0,
      };
      const pan = clamp(((p.x - bx) / bw - 0.5) * 1.5, -0.85, 0.85);
      if (kind === 'chalk') {
        const st = { ...stroke, press: 1, speedN: 0 };
        // the first touch leaves a slightly heavier dot
        chalkSeg(chalkCtx, p.x - bx - 0.3, p.y - by, p.x - bx + 0.3, p.y - by, { ...st, w: st.w * 1.1, carry: 0 });
        spawnDust(p.x, p.y, Math.round(5 * pFactor), 0, false, col);
        tapSound(1, col, pan);
      } else {
        const { ew, eh } = eraserSize();
        eraseAt(p.x, p.y, ew, eh, { tmp: tmpS, ghostA: 0.05, chalkA: 0.5 });
        eraserTap(pan);
      }
      audio.haptic?.(5);
      dirty = true;
    },
    move(p) {
      hover = p;
      if (!stroke) { const hs = slotAt(p.x, p.y); if (hs !== hoverSlot) { hoverSlot = hs; } dirty = true; return; }
      if (stroke.id !== p.id) return;
      const x = clamp(p.x, bx, bx + bw);
      const y = clamp(p.y, by, by + bh);
      const len = Math.hypot(x - stroke.x, y - stroke.y);
      if (len < 0.25) return;
      stroke.spd = lerp(stroke.spd, p.speed, 0.5);
      stroke.lastT = performance.now();
      if (stroke.kind === 'chalk') {
        const sn = clamp(stroke.spd / 1300, 0, 1);
        const ramp = 0.65 + 0.35 * smoothstep(0, 14, stroke.dist);
        const press = clamp(1.04 - 0.72 * sn, 0.26, 1) * ramp;
        stroke.speedN = sn;
        stroke.press = press;
        stroke.w = WIDTHS[widthId] * uiScale * (1.12 - 0.42 * sn);
        chalkSeg(chalkCtx, stroke.x - bx, stroke.y - by, x - bx, y - by, stroke);
        stroke.dust += len * 0.1 * pFactor * (0.4 + press);
        while (stroke.dust >= 1) { stroke.dust -= 1; spawnDust(x + (Math.random() - 0.5) * stroke.w * 0.5, y, 1, p.vx, false, stroke.col); }
      } else {
        stroke.speedN = clamp(stroke.spd / 1300, 0, 1);
        eraseSeg(stroke.x, stroke.y, x, y, stroke);
        stroke.dust += len * 0.14 * pFactor;
        const { ew, eh } = eraserSize();
        while (stroke.dust >= 1) { stroke.dust -= 1; spawnDust(x + (Math.random() - 0.5) * ew * 0.8, y + (Math.random() - 0.3) * eh * 0.5, 1, p.vx, true); }
        eraserDir = lerp(eraserDir, clamp(p.vx / 900, -1, 1), 0.2);
      }
      stroke.x = x;
      stroke.y = y;
      dirty = true;
    },
    up(p) {
      if (stroke && stroke.id === p.id) {
        if (audio.ready && stroke.kind === 'chalk') {
          audio.burst(bus, { kind: 'white', dur: 0.012, gain: 0.05, type: 'highpass', freq: 5000 * stroke.col.pitch, pan: clamp(((stroke.x - bx) / bw - 0.5) * 1.5, -0.8, 0.8), send: 0.12 });
        }
        stroke = null;
        dirty = true;
      }
    },
    leave() { hover = null; hoverSlot = -1; dirty = true; },
  });

  // ---------- HUD ----------
  const toolSeg = hud.segmented({
    label: 'Tool',
    options: [
      { id: 'chalk', label: 'Chalk' },
      { id: 'eraser', label: 'Eraser' },
    ],
    value: tool,
    onChange: (id) => { tool = id; stroke = null; updateHint(); traySound(id === 'eraser' ? COLORS.length : colorIdx); dirty = true; },
  });
  hud.segmented({
    label: 'Width',
    options: [
      { id: 'thin', label: 'Thin' },
      { id: 'medium', label: 'Medium' },
      { id: 'thick', label: 'Thick' },
    ],
    value: widthId,
    onChange: (id) => { widthId = id; dirty = true; },
  });
  hud.button({ label: 'Wipe board', title: 'Sweep the whole board clean', onClick: () => startWipe() });
  function updateHint() {
    hud.setHint(tool === 'chalk'
      ? `Draw with the ${COLORS[colorIdx].name.toLowerCase()} chalk. Slow strokes press harder; fast ones skip and fade.`
      : 'The felt eraser lifts chalk and leaves a pale ghost behind.', 6000);
  }
  updateHint();

  // ---------- render ----------
  function drawChalkStick(g, i, cx, cy, rot, liftPx, scale = 1) {
    const s = slots[i];
    const spr = chalkSprites[s.i];
    const pad = 8;
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(scale, scale);
    g.drawImage(spr, -(s.L + pad * 2) / 2, -(s.T + pad * 2) / 2, s.L + pad * 2, s.T + pad * 2);
    g.restore();
  }

  function drawTray() {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const l = lift[i] * (i === COLORS.length ? 7 : 9) + hoverLift[i] * 2.5;
      const sel = i === COLORS.length ? tool === 'eraser' : tool === 'chalk' && colorIdx === i;
      // shadow
      const sh = s.shadow;
      ctx.globalAlpha = clamp(0.62 - l * 0.025, 0.25, 0.65);
      const sw = s.kind === 'eraser' ? s.L : s.L;
      ctx.drawImage(sh.cv, s.cx - sh.w / 2 + 2 + l * 0.5, s.cy - sh.h / 2 + 3 + l * 0.9, sh.w, sh.h);
      ctx.globalAlpha = 1;
      if (s.kind === 'chalk') {
        drawChalkStick(ctx, i, s.cx, s.cy - l, s.rot - (sel ? lift[i] * 0.1 : 0));
      } else {
        const e = eraserSprite;
        ctx.save();
        ctx.translate(s.cx, s.cy - l);
        ctx.rotate(s.rot - lift[i] * 0.05);
        ctx.drawImage(e.cv, -(e.w + e.pad * 2) / 2, -(e.h + e.pad * 2) / 2, e.w + e.pad * 2, e.h + e.pad * 2);
        ctx.restore();
      }
      void sw;
    }
  }

  function drawCursor() {
    if (!hover || wipe) return;
    const x = hover.x;
    const y = hover.y;
    if (!inBoard(x, y) || (hover.type !== 'mouse' && !stroke)) return;
    ctx.save();
    if (tool === 'chalk') {
      const wd = (stroke ? stroke.w : WIDTHS[widthId] * uiScale) ;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, wd * 0.5 + 1), 0, Math.PI * 2);
      ctx.stroke();
      // the held chalk, tip at the pointer
      const si = colorIdx;
      const s = slots[si];
      if (s) {
        ctx.translate(x, y);
        ctx.rotate(2.44);
        ctx.scale(1, -1);
        ctx.globalAlpha = 0.95;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 3;
        const pad = 8;
        const sc = 1.15;
        ctx.drawImage(chalkSprites[si], -(pad + s.L) * sc, -(pad + s.T / 2) * sc, (s.L + pad * 2) * sc, (s.T + pad * 2) * sc);
      }
    } else {
      const e = eraserSprite;
      const { ew } = eraserSize();
      const sc = (ew * 0.95) / e.w;
      ctx.translate(x, y - 6 * uiScale);
      ctx.rotate(-0.12 + eraserDir * 0.18);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(e.cv, -(e.w + e.pad * 2) / 2 * sc, -(e.h + e.pad * 2) / 2 * sc - e.h * sc * 0.4, (e.w + e.pad * 2) * sc, (e.h + e.pad * 2) * sc);
    }
    ctx.restore();
  }

  function drawWipeEraser() {
    if (!wipe || wipe.px === undefined) return;
    const x = bx + wipe.px;
    const y = by + wipe.py;
    const ew = 86 * uiScale;
    const eh = Math.max(110, bh * 0.3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 40, by, bw + 80, bh);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(wipe.t * 9) * 0.015);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 10;
    const g = ctx.createLinearGradient(-ew / 2, 0, ew / 2, 0);
    g.addColorStop(0, '#46433f');
    g.addColorStop(0.5, '#3a3836');
    g.addColorStop(1, '#2a2928');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-ew / 2, -eh / 2, ew, eh, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // felt dust + wooden back strip
    const wg = ctx.createLinearGradient(-ew / 2, 0, -ew / 2 + ew * 0.32, 0);
    wg.addColorStop(0, '#a47c50');
    wg.addColorStop(1, '#7c5a38');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(-ew / 2, -eh / 2, ew * 0.32, eh, [8, 0, 0, 8]);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,235,225,0.1)';
    for (let i = 0; i < 10; i++) {
      const rx = ((i * 37) % 11) / 11;
      ctx.fillRect(-ew / 2 + ew * 0.36 + rx * ew * 0.58, -eh / 2 + ((i * 53) % 17) / 17 * eh, 2 + (i % 3), 1);
    }
    ctx.restore();
  }

  function drawParticles(dt) {
    let any = false;
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.t += dt;
      if (q.t >= q.life || q.y > by + bh) { particles.splice(i, 1); continue; }
      q.vx *= 1 - 0.9 * dt;
      q.vy = q.vy * (1 - 1.2 * dt) + q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const f = 1 - q.t / q.life;
      ctx.globalAlpha = q.a * f * f;
      ctx.fillStyle = q.fill;
      ctx.fillRect(q.x, q.y, q.s, q.s);
      any = true;
    }
    ctx.globalAlpha = 1;
    return any;
  }

  let lastDt = 0.016;
  function frame(dt, t) {
    elapsed = t;
    lastDt = dt;
    if (!w) return;
    if (wipe) stepWipe(dt);
    updateAudio(dt);
    // tray lift springs
    let moving = false;
    for (let i = 0; i < slots.length; i++) {
      const sel = i === COLORS.length ? tool === 'eraser' : tool === 'chalk' && colorIdx === i;
      const a = damp(lift[i], sel ? 1 : 0, 14, dt);
      const hl = damp(hoverLift[i], !stroke && hoverSlot === i && !sel ? 1 : 0, 18, dt);
      if (Math.abs(a - lift[i]) > 0.0005 || Math.abs(hl - hoverLift[i]) > 0.0005) moving = true;
      lift[i] = a;
      hoverLift[i] = hl;
    }
    if (!(dirty || moving || stroke || wipe || particles.length)) return;
    dirty = false;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(base, 0, 0, w, h);
    ctx.globalAlpha = 0.62;
    ctx.drawImage(ghostCv, bx, by, bw, bh);
    ctx.globalAlpha = 1;
    ctx.drawImage(chalkCv, bx, by, bw, bh);
    drawParticles(dt);
    drawWipeEraser();
    drawCursor();
    ctx.drawImage(overlay, bx, by, bw, bh);
    drawTray();
  }

  layout();
  const loop = createLoop(frame);

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      window.removeEventListener('hush:ambience', onAmb);
      if (V) {
        const now = V.ac.currentTime;
        for (const g of [V.gA, V.gB, V.gC, V.gE, V.gF, V.gG]) {
          g.gain.cancelScheduledValues(now);
          g.gain.setTargetAtTime(0, now, 0.04);
        }
        const v = V;
        setTimeout(() => {
          for (const s of v.sources) { try { s.stop(); } catch (_) { /* ignore */ } }
          try { v.lfo.stop(); } catch (_) { /* ignore */ }
          for (const n of [...v.nodes, ...v.filters, v.lfo, ...v.sources]) { try { n.disconnect(); } catch (_) { /* ignore */ } }
        }, 400);
        V = null;
      }
      pad?.stop(0.6);
      pad = null;
      cv.dispose();
    },
  };
}
