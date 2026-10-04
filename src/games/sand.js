// Zen Sand — 2D canvas. A real height-field of sand, lit per-pixel, raked with
// multi-tine tools. Sound is a granular noise texture driven by stroke speed.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, mulberry32, smoothstep } from '../util.js';
import { Pad } from '../audio.js';

const TOOLS = {
  rake: { tines: 5, spacing: 14, depth: 1, hiss: 1, hissF: 0, body: 1 },
  comb: { tines: 10, spacing: 6.5, depth: 0.8, hiss: 0.85, hissF: 900, body: 0.7 },
  finger: { tines: 1, spacing: 0, radius: 11, depth: 1.05, hiss: 1.1, hissF: -700, body: 1.3 },
};

// Light direction (towards the light), screen space with y down. Top-left light.
const LX = -0.52;
const LY = -0.62;
const LZ = 0.6;
const SAND = [226, 200, 154];

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;

  let W = 0, H = 0, k = 1;      // sim size and sim-px per css-px
  let fx = 0, fy = 0, fw = 0, fh = 0; // sand area inside the frame (css px)
  let hf, grainX, grainY, lum, img, img32;
  let sandCanvas, sandCtx, frameSprite;
  let dirty = { x0: 0, y0: 0, x1: -1, y1: -1 };
  let tool = 'rake';
  let stones = [];
  let particles = [];
  let pending = []; // ripples spreading around freshly dropped stones
  let resetT = 0;
  let stroke = null;
  let hoverP = null;
  let lastDir = { x: 1, y: 0 };

  const cv = createCanvas2D(root, { maxPixels: gfx.pixels2D, onResize: setup });
  const { ctx } = cv;

  // ---------- setup ----------
  function markDirty(x0, y0, x1, y1) {
    if (dirty.x1 < dirty.x0) dirty = { x0, y0, x1, y1 };
    else {
      dirty.x0 = Math.min(dirty.x0, x0);
      dirty.y0 = Math.min(dirty.y0, y0);
      dirty.x1 = Math.max(dirty.x1, x1);
      dirty.y1 = Math.max(dirty.y1, y1);
    }
  }
  const markAll = () => markDirty(0, 0, W - 1, H - 1);

  function setup() {
    const w = cv.w;
    const h = cv.h;
    if (!w) return;
    const frame = Math.round(clamp(Math.min(w, h) * 0.028, 10, 22));
    fx = frame;
    fy = frame;
    fw = w - frame * 2;
    fh = h - frame * 2;
    k = Math.max(0.5, Math.min(cv.dpr, Math.sqrt((1_000_000 * gfx.detail) / (fw * fh))));
    W = Math.round(fw * k);
    H = Math.round(fh * k);
    hf = new Float32Array(W * H);
    grainX = new Float32Array(W * H);
    grainY = new Float32Array(W * H);
    lum = new Float32Array(W * H);
    const rnd = mulberry32(1234);
    for (let i = 0; i < W * H; i++) {
      grainX[i] = rnd() - 0.5;
      grainY[i] = rnd() - 0.5;
      lum[i] = 0.93 + rnd() * 0.14;
    }
    sandCanvas = document.createElement('canvas');
    sandCanvas.width = W;
    sandCanvas.height = H;
    sandCtx = sandCanvas.getContext('2d');
    img = sandCtx.createImageData(W, H);
    img32 = new Uint32Array(img.data.buffer);
    buildFrame(w, h, frame);
    if (!stones.length) seedStones();
    for (const s of stones) { buildStoneSprite(s); ringAround(s, 1, 1); }
    markAll();
  }

  function buildFrame(w, h, frame) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * cv.dpr);
    c.height = Math.round(h * cv.dpr);
    const g = c.getContext('2d');
    g.scale(cv.dpr, cv.dpr);
    const rad = frame * 0.9;
    const wood = g.createLinearGradient(0, 0, w, h);
    wood.addColorStop(0, '#6b4a33');
    wood.addColorStop(0.5, '#4d3424');
    wood.addColorStop(1, '#5e422d');
    g.fillStyle = wood;
    g.beginPath();
    g.rect(0, 0, w, h);
    g.roundRect(fx, fy, fw, fh, rad);
    g.fill('evenodd');
    // wood grain streaks
    const rnd = mulberry32(99);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.roundRect(fx, fy, fw, fh, rad);
    g.clip('evenodd');
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${rnd() > 0.5 ? '255,220,180' : '20,10,0'},${0.04 + rnd() * 0.06})`;
      g.lineWidth = 0.6 + rnd() * 1.4;
      g.beginPath();
      const y = rnd() * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + rnd() * 12 - 6, w * 0.7, y + rnd() * 12 - 6, w, y + rnd() * 10 - 5);
      g.stroke();
    }
    g.restore();
    // inner shadow where sand meets wood
    g.save();
    g.beginPath();
    g.roundRect(fx, fy, fw, fh, rad);
    g.clip();
    g.shadowColor = 'rgba(0,0,0,0.65)';
    g.shadowBlur = frame * 1.8;
    g.fillStyle = '#000';
    g.beginPath();
    g.rect(fx - 200, fy - 200, fw + 400, fh + 400);
    g.roundRect(fx, fy, fw, fh, rad);
    g.fill('evenodd');
    g.restore();
    // bevel highlight
    g.strokeStyle = 'rgba(255,230,200,0.22)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.roundRect(fx - 0.5, fy - 0.5, fw + 1, fh + 1, rad);
    g.stroke();
    frameSprite = c;
  }

  // ---------- stones ----------
  function seedStones() {
    stones = [
      makeStone(0.72, 0.38, 46),
      makeStone(0.27, 0.66, 34),
      makeStone(0.82, 0.74, 24),
    ];
  }

  function makeStone(u, v, rx) {
    const s = { u, v, rx, ry: rx * rand(0.72, 0.86), seed: Math.floor(rand(1, 1e6)), rot: rand(-0.4, 0.4), drop: 1, sprite: null };
    return s;
  }

  function buildStoneSprite(s) {
    const dpr = cv.dpr;
    const pad = s.rx * 1.6;
    const size = Math.ceil((s.rx + pad) * 2 * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const cx = size / dpr / 2;
    const cy = size / dpr / 2;
    const rnd = mulberry32(s.seed);
    const pts = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = 1 + (rnd() - 0.5) * 0.22;
      pts.push([Math.cos(a + s.rot) * s.rx * rr, Math.sin(a + s.rot) * s.ry * rr]);
    }
    const body = () => {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % n];
        const mx = (p0[0] + p1[0]) / 2;
        const my = (p0[1] + p1[1]) / 2;
        if (i === 0) g.moveTo(cx + (pts[n - 1][0] + p0[0]) / 2, cy + (pts[n - 1][1] + p0[1]) / 2);
        g.quadraticCurveTo(cx + p0[0], cy + p0[1], cx + mx, cy + my);
      }
      g.closePath();
    };
    // soft contact shadow cast away from the light
    g.save();
    g.translate(cx + s.rx * 0.28, cy + s.ry * 0.46);
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, s.rx * 1.25);
    sh.addColorStop(0, 'rgba(50,30,10,0.55)');
    sh.addColorStop(0.65, 'rgba(50,30,10,0.22)');
    sh.addColorStop(1, 'rgba(50,30,10,0)');
    g.fillStyle = sh;
    g.scale(1, 0.62);
    g.beginPath();
    g.arc(0, 0, s.rx * 1.25, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // body
    body();
    const grad = g.createRadialGradient(cx - s.rx * 0.38, cy - s.ry * 0.5, s.rx * 0.08, cx, cy, s.rx * 1.15);
    grad.addColorStop(0, '#bdb9b4');
    grad.addColorStop(0.35, '#85817f');
    grad.addColorStop(0.8, '#4a484c');
    grad.addColorStop(1, '#2d2b30');
    g.fillStyle = grad;
    g.fill();
    g.save();
    body();
    g.clip();
    // mineral speckle + subtle strata
    for (let i = 0; i < 160; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * d * s.rx;
      const y = cy + Math.sin(a) * d * s.ry;
      g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.05 + rnd() * 0.18})` : `rgba(0,0,0,${0.06 + rnd() * 0.18})`;
      g.fillRect(x, y, 0.9 + rnd() * 1.5, 0.9 + rnd() * 1.5);
    }
    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      const y = cy - s.ry * 0.5 + i * s.ry * 0.3;
      g.moveTo(cx - s.rx, y + rnd() * 6);
      g.bezierCurveTo(cx - s.rx * 0.3, y - 6 + rnd() * 12, cx + s.rx * 0.3, y - 6 + rnd() * 12, cx + s.rx, y + rnd() * 6);
      g.stroke();
    }
    // top-left rim light and bottom-right bounce
    const rim = g.createLinearGradient(cx - s.rx, cy - s.ry, cx + s.rx, cy + s.ry);
    rim.addColorStop(0, 'rgba(255,255,255,0.35)');
    rim.addColorStop(0.4, 'rgba(255,255,255,0)');
    rim.addColorStop(0.85, 'rgba(255,225,170,0.0)');
    rim.addColorStop(1, 'rgba(255,210,150,0.28)');
    g.fillStyle = rim;
    g.fillRect(0, 0, size, size);
    g.restore();
    s.sprite = c;
    s.spriteSize = size / dpr;
  }

  const stonePos = (s) => ({ x: s.u * fw, y: s.v * fh }); // css px inside sand area

  /** Concentric ripples around a stone. progress 0..1 grows the ripple outward. */
  function ringAround(s, progress, strength) {
    const cx = s.u * W;
    const cy = s.v * H;
    const rxs = s.rx * k;
    const rys = s.ry * k;
    const spacing = 11 * k;
    const maxOut = spacing * 5.2;
    const reach = maxOut * progress;
    const ext = Math.max(rxs, rys) + reach + 2;
    const x0 = Math.max(1, Math.floor(cx - ext));
    const x1 = Math.min(W - 2, Math.ceil(cx + ext));
    const y0 = Math.max(1, Math.floor(cy - ext));
    const y1 = Math.min(H - 2, Math.ceil(cy + ext));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rxs;
        const dy = (y - cy) / rys;
        const e = Math.hypot(dx, dy);
        if (e < 0.9) continue;
        const out = (e - 1) * (rxs + rys) * 0.5;
        if (out < 0 || out > reach) continue;
        const env = smoothstep(0, spacing * 0.6, out) * (1 - smoothstep(maxOut * 0.55, maxOut, out)) * smoothstep(reach, reach - spacing, out);
        const g = 0.5 - 0.5 * Math.cos((2 * Math.PI * out) / spacing + 0.5);
        const target = env * (-0.85 * g + 0.3 * (1 - g)) * strength;
        const i = y * W + x;
        hf[i] += (target - hf[i]) * Math.min(1, 0.35 + env * 0.4);
      }
    }
    markDirty(x0, y0, x1, y1);
  }

  function addStone(cssX, cssY) {
    const rx = rand(22, 42);
    const s = makeStone(cssX / fw, cssY / fh, rx);
    s.drop = 0;
    buildStoneSprite(s);
    stones.push(s);
    pending.push({ s, t: 0 });
    // puff of sand
    for (let i = 0, np = Math.round(26 * gfx.particles); i < np; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(30, 120);
      particles.push({ x: cssX, y: cssY + rx * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - rand(10, 60), life: rand(0.3, 0.7), t: 0, s: rand(0.8, 1.9) });
    }
    if (audio.ready) {
      const pan = clamp((cssX / fw - 0.5) * 1.5, -0.9, 0.9);
      audio.tone(bus, { freq: 120, freqEnd: 52, dur: 0.22, gain: 0.55, pan, send: 0.25, attack: 0.002 });
      audio.burst(bus, { kind: 'brown', dur: 0.22, gain: 0.5, type: 'lowpass', freq: 700, freqEnd: 200, pan, send: 0.2 });
      audio.burst(bus, { kind: 'white', dur: 0.09, gain: 0.12, type: 'bandpass', freq: 3000, q: 0.7, pan, send: 0.15 });
      for (let i = 0; i < 12; i++) audio.burst(bus, { kind: 'white', dur: 0.004, gain: rand(0.04, 0.1), type: 'bandpass', freq: rand(2500, 7000), q: 1.2, pan: pan + rand(-0.2, 0.2), send: 0.1, delay: rand(0.03, 0.35) });
    }
    audio.haptic?.(18);
  }

  function removeStoneAt(cssX, cssY) {
    for (let i = stones.length - 1; i >= 0; i--) {
      const s = stones[i];
      const p = stonePos(s);
      if (((cssX - p.x) / (s.rx * 1.1)) ** 2 + ((cssY - p.y) / (s.ry * 1.1)) ** 2 < 1) {
        stones.splice(i, 1);
        pending = pending.filter((q) => q.s !== s);
        // flatten the area it leaves behind
        const cx = s.u * W;
        const cy = s.v * H;
        const ext = (s.rx + 11 * 5.5) * k;
        for (let y = Math.max(1, Math.floor(cy - ext)); y <= Math.min(H - 2, Math.ceil(cy + ext)); y++) {
          for (let x = Math.max(1, Math.floor(cx - ext)); x <= Math.min(W - 2, Math.ceil(cx + ext)); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 < ext * ext) hf[y * W + x] *= 0.2;
          }
        }
        markDirty(Math.floor(cx - ext), Math.floor(cy - ext), Math.ceil(cx + ext), Math.ceil(cy + ext));
        if (audio.ready) {
          audio.burst(bus, { kind: 'pink', dur: 0.25, gain: 0.3, type: 'bandpass', freq: 600, freqEnd: 1800, q: 0.8, curve: 'lin', pan: clamp((cssX / fw - 0.5) * 1.5, -1, 1) });
          audio.tone(bus, { freq: 90, freqEnd: 140, dur: 0.15, gain: 0.25, send: 0.2 });
        }
        return true;
      }
    }
    return false;
  }

  const insideStone = (sx, sy) => {
    for (const s of stones) {
      const dx = (sx - s.u * W) / (s.rx * k * 0.98);
      const dy = (sy - s.v * H) / (s.ry * k * 0.98);
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  };

  // ---------- carving ----------
  function groove(cx, cy, R, depth) {
    const x0 = Math.max(1, Math.floor(cx - R));
    const x1 = Math.min(W - 2, Math.ceil(cx + R));
    const y0 = Math.max(1, Math.floor(cy - R));
    const y1 = Math.min(H - 2, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / R;
        if (d >= 1) continue;
        // groove in the middle, raised ridges on both sides
        const prof = d < 0.5 ? -0.5 * (1 + Math.cos(2 * Math.PI * d)) : 0.38 * Math.sin(2 * Math.PI * (d - 0.5));
        const w = 0.62 * (1 - d * d * 0.5);
        const i = y * W + x;
        hf[i] += (prof * depth - hf[i]) * w;
      }
    }
    markDirty(x0, y0, x1, y1);
  }

  function smoothAt(cx, cy, R, amt) {
    const x0 = Math.max(1, Math.floor(cx - R));
    const x1 = Math.min(W - 2, Math.ceil(cx + R));
    const y0 = Math.max(1, Math.floor(cy - R));
    const y1 = Math.min(H - 2, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / R;
        if (d >= 1) continue;
        const i = y * W + x;
        hf[i] *= 1 - amt * (1 - d * d);
      }
    }
    markDirty(x0, y0, x1, y1);
  }

  function carveSegment(x0, y0, x1, y1) {
    const t = TOOLS[tool];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    const ux = dx / len;
    const uy = dy / len;
    const step = 0.8;
    const n = Math.max(1, Math.ceil(len / step));
    const lag = 26 * k; // the rake head swings round behind the hand
    for (let i = 1; i <= n; i++) {
      const s = (i / n) * len;
      const px = x0 + ux * s;
      const py = y0 + uy * s;
      const a = 1 - Math.exp(-(len / n) / lag);
      stroke.dx += (ux - stroke.dx) * a;
      stroke.dy += (uy - stroke.dy) * a;
      const m = Math.hypot(stroke.dx, stroke.dy) || 1;
      stroke.dx /= m;
      stroke.dy /= m;
      stroke.travel += len / n;
      const ramp = smoothstep(0, 16 * k, stroke.travel);
      const nx = -stroke.dy;
      const ny = stroke.dx;
      if (tool === 'smooth') {
        smoothAt(px, py, 26 * k, 0.22);
        continue;
      }
      if (t.tines === 1) {
        if (!insideStone(px, py)) groove(px, py, t.radius * k, t.depth * ramp);
      } else {
        const sp = t.spacing * k;
        const R = sp * 0.47;
        for (let j = 0; j < t.tines; j++) {
          const off = (j - (t.tines - 1) / 2) * sp;
          const tx = px + nx * off;
          const ty = py + ny * off;
          if (tx < 2 || ty < 2 || tx > W - 3 || ty > H - 3) continue;
          if (insideStone(tx, ty)) continue;
          groove(tx, ty, R, t.depth * ramp);
        }
      }
    }
    lastDir = { x: stroke.dx, y: stroke.dy };
  }

  // ---------- rendering ----------
  function renderSand() {
    if (dirty.x1 < dirty.x0) return;
    const x0 = clamp(dirty.x0 - 1, 1, W - 2);
    const x1 = clamp(dirty.x1 + 1, 1, W - 2);
    const y0 = clamp(dirty.y0 - 1, 1, H - 2);
    const y1 = clamp(dirty.y1 + 1, 1, H - 2);
    const SL = 2.6;
    const GR = 0.42;
    const norm = 1 / Math.hypot(LX, LY, LZ);
    const lx = LX * norm, ly = LY * norm, lz = LZ * norm;
    const [r0, g0, b0] = SAND;
    for (let y = y0; y <= y1; y++) {
      let i = y * W + x0;
      for (let x = x0; x <= x1; x++, i++) {
        const hc = hf[i];
        const nx = (hf[i - 1] - hf[i + 1]) * SL + grainX[i] * GR;
        const ny = (hf[i - W] - hf[i + W]) * SL + grainY[i] * GR;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const diff = (nx * lx + ny * ly + lz) * inv; // 0..1
        const flat = lz; // lighting of a perfectly flat patch
        let shade = 0.78 + (diff - flat) * 1.35;
        shade *= 1 + hc * 0.16; // grooves a little darker (ambient occlusion)
        shade *= lum[i];
        const r = clamp(r0 * shade, 0, 255);
        const g = clamp(g0 * shade * 0.995, 0, 255);
        const b = clamp(b0 * shade * 0.97, 0, 255);
        img32[i] = 0xff000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
    sandCtx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    dirty = { x0: 0, y0: 0, x1: -1, y1: -1 };
  }

  function drawGhost() {
    if (!hoverP || hoverP.type !== 'mouse' || stroke) return;
    const x = hoverP.x;
    const y = hoverP.y;
    if (x < fx || y < fy || x > fx + fw || y > fy + fh) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(70,40,10,0.55)';
    ctx.fillStyle = 'rgba(255,245,220,0.35)';
    ctx.lineWidth = 1.5;
    if (tool === 'rake' || tool === 'comb') {
      const t = TOOLS[tool];
      const nx = -lastDir.y;
      const ny = lastDir.x;
      for (let j = 0; j < t.tines; j++) {
        const off = (j - (t.tines - 1) / 2) * t.spacing;
        ctx.beginPath();
        ctx.arc(x + nx * off, y + ny * off, tool === 'rake' ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (tool === 'finger') {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (tool === 'smooth') {
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.setLineDash([4, 5]);
      ctx.stroke();
    } else if (tool === 'stone') {
      ctx.beginPath();
      ctx.ellipse(x, y, 30, 23, 0, 0, Math.PI * 2);
      ctx.setLineDash([5, 5]);
      ctx.stroke();
    }
    ctx.restore();
  }

  setup();

  // ---------- audio ----------
  let hiss = null;
  let body = null;
  let pad = null;
  let padLevel = 0.055;
  let wind = null;
  let speedS = 0;
  if (audio.ready) {
    hiss = audio.loop(bus, { kind: 'white', filter: 'bandpass', freq: 2600, q: 0.5, gain: 0, send: 0.12 });
    body = audio.loop(bus, { kind: 'pink', filter: 'lowpass', freq: 800, q: 0.5, gain: 0, send: 0.1 });
    wind = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 380, q: 0.7, gain: 0.02, send: 0.5 });
    pad = new Pad(audio, bus, {
      chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 62], [45, 52, 57, 61]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 900,
      period: 20,
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);
  let windT = 0;

  function updateAudio(dt) {
    if (!audio.ready) return;
    const t = TOOLS[tool] || { hiss: 0.7, hissF: -200, body: 0.8 };
    const moving = stroke && (stroke.speed > 0);
    const target = moving ? clamp(stroke.speed / 900, 0, 1) : 0;
    speedS += (target - speedS) * (1 - Math.exp(-(target > speedS ? 14 : 7) * dt));
    const sp = speedS;
    const pan = stroke ? clamp(((stroke.cssX / fw) - 0.5) * 1.6, -0.9, 0.9) : 0;
    hiss.set({ gain: 0.42 * Math.pow(sp, 1.15) * t.hiss, freq: 1700 + 2600 * sp + t.hissF, pan }, 0.035);
    body.set({ gain: 0.3 * sp * t.body, freq: 450 + 900 * sp, pan }, 0.05);
    // granular crackle: individual grains shifting
    if (sp > 0.03) {
      const rate = 55 * sp;
      let nEv = rate * dt;
      while (nEv > 0) {
        if (Math.random() < nEv) {
          audio.burst(bus, { kind: 'white', dur: rand(0.002, 0.006), attack: 0.0003, gain: rand(0.03, 0.11) * (0.4 + sp), type: 'bandpass', freq: rand(2500, 8000), q: rand(0.8, 2), pan: pan + rand(-0.2, 0.2), send: 0.08 });
        }
        nEv -= 1;
      }
    }
    // slow breathing wind
    windT += dt;
    wind.set({ gain: 0.018 + 0.014 * Math.sin(windT * 0.23) * Math.sin(windT * 0.11 + 1), freq: 320 + 160 * Math.sin(windT * 0.17) }, 0.5);
  }

  // ---------- input ----------
  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      const cx = p.x - fx;
      const cy = p.y - fy;
      if (cx < 0 || cy < 0 || cx > fw || cy > fh) return;
      if (tool === 'stone') {
        if (!removeStoneAt(cx, cy)) addStone(clamp(cx, 20, fw - 20), clamp(cy, 20, fh - 20));
        return;
      }
      stroke = { id: p.id, x: cx * k, y: cy * k, dx: lastDir.x, dy: lastDir.y, travel: 0, speed: 0, cssX: cx };
      if (tool === 'finger' || tool === 'smooth') carveSegment(stroke.x, stroke.y, stroke.x + 0.01, stroke.y);
    },
    move(p) {
      hoverP = p;
      if (!stroke || stroke.id !== p.id) return;
      const cx = clamp(p.x - fx, 0, fw);
      const cy = clamp(p.y - fy, 0, fh);
      const x = cx * k;
      const y = cy * k;
      stroke.speed = p.speed;
      stroke.cssX = cx;
      if (Math.hypot(x - stroke.x, y - stroke.y) < 0.35) return;
      carveSegment(stroke.x, stroke.y, x, y);
      stroke.x = x;
      stroke.y = y;
    },
    up(p) {
      if (stroke && stroke.id === p.id) stroke = null;
    },
    leave() { hoverP = null; },
  });

  // ---------- HUD ----------
  const toolSeg = hud.segmented({
    label: 'Tool',
    options: [
      { id: 'rake', label: 'Rake' },
      { id: 'comb', label: 'Comb' },
      { id: 'finger', label: 'Finger' },
      { id: 'stone', label: 'Stone' },
      { id: 'smooth', label: 'Smooth' },
    ],
    value: tool,
    onChange: (id) => { tool = id; stroke = null; hint(); },
  });
  hud.button({ label: 'Reset', title: 'Wipe the sand clean', onClick: () => { resetT = 1; audio.ready && audio.burst(bus, { kind: 'pink', dur: 0.9, attack: 0.3, gain: 0.28, type: 'bandpass', freq: 500, freqEnd: 2200, q: 0.7, curve: 'lin', send: 0.25 }); } });
  function hint() {
    const m = {
      rake: 'Drag slowly for long, even lines. Curves fan the tines out.',
      comb: 'A fine comb leaves tight ridges.',
      finger: 'One wide groove — draw anything.',
      stone: 'Tap sand to set a stone. Tap a stone to lift it away.',
      smooth: 'Brush away what you made.',
    };
    hud.setHint(m[tool], 6000);
  }
  hint();

  // ---------- main loop ----------
  function frame(dt) {
    // pending stone ripples (spread outward over ~0.5s)
    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i];
      q.t += dt;
      const prog = clamp(q.t / 0.55, 0, 1);
      ringAround(q.s, smoothstep(0, 1, prog), 1);
      q.s.drop = clamp(q.t / 0.22, 0, 1);
      if (prog >= 1) pending.splice(i, 1);
    }
    // reset animation: sand slumps flat
    if (resetT > 0) {
      resetT -= dt * 1.1;
      const f = Math.pow(0.82, dt * 60);
      for (let i = 0; i < hf.length; i++) hf[i] *= f;
      markAll();
      if (resetT <= 0) { hf.fill(0); for (const s of stones) ringAround(s, 1, 1); markAll(); }
    }
    updateAudio(dt);
    renderSand();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sandCanvas, 0, 0, W, H, fx, fy, fw, fh);

    // soft light falloff across the tray
    const vg = ctx.createRadialGradient(fx + fw * 0.4, fy + fh * 0.35, Math.min(fw, fh) * 0.25, fx + fw * 0.5, fy + fh * 0.5, Math.max(fw, fh) * 0.75);
    vg.addColorStop(0, 'rgba(255,240,200,0.07)');
    vg.addColorStop(1, 'rgba(60,30,0,0.2)');
    ctx.fillStyle = vg;
    ctx.fillRect(fx, fy, fw, fh);

    // stones
    for (const s of stones) {
      const sz = s.spriteSize;
      const p = stonePos(s);
      const d = s.drop;
      const lift = (1 - d) * (1 - d) * 26;
      const sc = 1 + (1 - d) * 0.18;
      ctx.globalAlpha = Math.min(1, d * 3);
      ctx.save();
      ctx.translate(fx + p.x, fy + p.y - lift);
      ctx.scale(sc, sc);
      ctx.drawImage(s.sprite, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // sand puffs
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t >= p.life) { particles.splice(i, 1); continue; }
      p.vx *= 0.93;
      p.vy = p.vy * 0.93 + 160 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = `rgba(240,215,170,${0.85 * (1 - p.t / p.life)})`;
      ctx.beginPath();
      ctx.arc(fx + p.x, fy + p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGhost();
    ctx.drawImage(frameSprite, 0, 0, cv.w, cv.h);
  }

  const loop = createLoop(frame);

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      hiss?.stop(0.1);
      body?.stop(0.1);
      wind?.stop(0.3);
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      cv.dispose();
    },
  };
}
