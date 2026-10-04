// Bubble Wrap — 2D canvas. Tap or sweep to pop. Fully procedural sound & visuals.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, safeStorage } from '../util.js';

const PALETTES = [
  { name: 'Rose', bg: ['#ffd9ea', '#ff9cc8'], tint: [255, 120, 175], rim: [190, 60, 120] },
  { name: 'Lilac', bg: ['#e6d9ff', '#a98bff'], tint: [150, 110, 255], rim: [90, 50, 190] },
  { name: 'Sky', bg: ['#d8f1ff', '#7cc4ff'], tint: [90, 175, 255], rim: [30, 100, 190] },
  { name: 'Mint', bg: ['#d9fff0', '#7fe5c0'], tint: [70, 210, 165], rim: [20, 130, 100] },
  { name: 'Peach', bg: ['#ffe8d6', '#ffab85'], tint: [255, 150, 105], rim: [200, 80, 40] },
];

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutBack = (t) => {
  t = clamp(t, 0, 1);
  const c1 = 1.9;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function makeSprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size / 2);
  return c;
}

function hexPath(g, cx, cy, R) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

function drawCell(g, c, D, pal) {
  const R = D * 0.575;
  g.lineJoin = 'round';
  g.lineWidth = Math.max(1, D * 0.022);
  g.strokeStyle = 'rgba(80,20,70,0.16)';
  hexPath(g, c + D * 0.012, c + D * 0.016, R);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.34)';
  hexPath(g, c - D * 0.01, c - D * 0.012, R);
  g.stroke();
}

function buildSprites(r, D, dpr, pal) {
  const S = Math.ceil(D * 1.7 * dpr);
  const R = r * dpr;
  const Dd = D * dpr;

  const intact = makeSprite(S, (g, c) => {
    drawCell(g, c, Dd, pal);
    // contact shadow
    let gr = g.createRadialGradient(c + R * 0.1, c + R * 0.22, R * 0.2, c + R * 0.1, c + R * 0.22, R * 1.22);
    gr.addColorStop(0, 'rgba(60,10,70,0.30)');
    gr.addColorStop(0.7, 'rgba(60,10,70,0.10)');
    gr.addColorStop(1, 'rgba(60,10,70,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(c + R * 0.1, c + R * 0.22, R * 1.22, 0, Math.PI * 2);
    g.fill();
    // translucent dome body
    gr = g.createRadialGradient(c - R * 0.3, c - R * 0.36, R * 0.04, c, c, R);
    gr.addColorStop(0, 'rgba(255,255,255,0.72)');
    gr.addColorStop(0.22, 'rgba(255,255,255,0.30)');
    gr.addColorStop(0.62, rgba(pal.tint, 0.06));
    gr.addColorStop(0.88, rgba(pal.rim, 0.17));
    gr.addColorStop(1, rgba(pal.rim, 0.36));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(c, c, R, 0, Math.PI * 2);
    g.fill();
    // refractive rim
    const rim = g.createLinearGradient(c - R, c - R, c + R, c + R);
    rim.addColorStop(0, 'rgba(255,255,255,0.95)');
    rim.addColorStop(0.45, 'rgba(255,255,255,0.1)');
    rim.addColorStop(1, 'rgba(255,255,255,0.55)');
    g.strokeStyle = rim;
    g.lineWidth = Math.max(1.2, R * 0.075);
    g.beginPath();
    g.arc(c, c, R * 0.955, 0, Math.PI * 2);
    g.stroke();
    // inner dark ring for thickness
    g.strokeStyle = rgba(pal.rim, 0.22);
    g.lineWidth = Math.max(1, R * 0.07);
    g.beginPath();
    g.arc(c, c, R * 0.85, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
    // main specular crescent
    g.save();
    g.translate(c - R * 0.34, c - R * 0.42);
    g.rotate(-0.62);
    const sp = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.36);
    sp.addColorStop(0, 'rgba(255,255,255,0.98)');
    sp.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp;
    g.scale(1, 0.46);
    g.beginPath();
    g.arc(0, 0, R * 0.36, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // pin-point glint
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.arc(c - R * 0.08, c - R * 0.62, R * 0.045, 0, Math.PI * 2);
    g.fill();
    // bounce light bottom right
    g.strokeStyle = 'rgba(255,255,255,0.42)';
    g.lineCap = 'round';
    g.lineWidth = Math.max(1.2, R * 0.1);
    g.beginPath();
    g.arc(c, c, R * 0.74, Math.PI * 0.12, Math.PI * 0.42);
    g.stroke();
  });

  const popped = [0, 1, 2].map((v) =>
    makeSprite(S, (g, c) => {
      drawCell(g, c, Dd, pal);
      // collapsed dimple
      const gr = g.createRadialGradient(c, c, R * 0.1, c, c, R);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)');
      gr.addColorStop(0.7, rgba(pal.rim, 0.1));
      gr.addColorStop(1, rgba(pal.rim, 0.24));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c, c, R * 0.95, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = rgba(pal.rim, 0.3);
      g.lineWidth = Math.max(1, R * 0.05);
      g.beginPath();
      g.arc(c, c, R * 0.95, 0, Math.PI * 2);
      g.stroke();
      // crinkles: pairs of dark/light strokes
      let seed = 17 + v * 101;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2;
        const len = R * (0.35 + rnd() * 0.5);
        const off = R * (0.05 + rnd() * 0.25);
        const x0 = c + Math.cos(a) * off;
        const y0 = c + Math.sin(a) * off;
        const bend = (rnd() - 0.5) * R * 0.5;
        const x1 = x0 + Math.cos(a + 0.3) * len;
        const y1 = y0 + Math.sin(a + 0.3) * len;
        const mx = (x0 + x1) / 2 + Math.cos(a + 1.57) * bend;
        const my = (y0 + y1) / 2 + Math.sin(a + 1.57) * bend;
        g.lineWidth = Math.max(1, R * 0.05);
        g.strokeStyle = rgba(pal.rim, 0.28);
        g.beginPath();
        g.moveTo(x0 + 1, y0 + 1);
        g.quadraticCurveTo(mx + 1, my + 1, x1 + 1, y1 + 1);
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(mx, my, x1, y1);
        g.stroke();
      }
      // leftover rim glint
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = Math.max(1.2, R * 0.06);
      g.beginPath();
      g.arc(c, c, R * 0.88, Math.PI * (1.05 + v * 0.1), Math.PI * (1.45 + v * 0.1));
      g.stroke();
    })
  );
  return { intact, popped, S, scale: 1 / dpr };
}

export function create(env) {
  const { audio, bus, hud, root, gfx } = env;
  const store = safeStorage();
  let total = parseInt(store.getItem('hush:bubbles:total') || '0', 10) || 0;
  let paletteIdx = Math.floor(Math.random() * PALETTES.length);
  let bubbles = [];
  let sprites = null;
  let D = 70;
  let r = 31;
  let particles = [];
  let rings = [];
  let sheetTime = 0;
  let cascade = null;
  let refillCooldown = 0;
  let shimmerX = 0.5;
  let hover = null;
  let sessionPopped = 0;

  const cv = createCanvas2D(root, { maxPixels: gfx.pixels2D, onResize: layout });
  const { ctx } = cv;
  layout();

  function layout() {
    const w = cv.w;
    const h = cv.h;
    if (!w) return;
    D = clamp(Math.min(w, h) / 6.4, 54, 96);
    r = D * 0.455;
    const margin = D * 0.3;
    const topPad = 64;
    const bottomPad = 84;
    const cols = Math.max(3, Math.floor((w - margin * 2 - D * 0.5) / D));
    const pitch = D * 0.875;
    const rows = Math.max(3, Math.floor((h - topPad - bottomPad - D) / pitch) + 1);
    const gw = cols * D + D * 0.5;
    const x0 = (w - gw) / 2 + D / 2;
    const gh = (rows - 1) * pitch + D;
    const y0 = topPad + (h - topPad - bottomPad - gh) / 2 + D / 2;
    const old = bubbles;
    bubbles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = bubbles.length;
        bubbles.push({
          x: x0 + col * D + (row % 2) * (D / 2),
          y: y0 + row * pitch,
          popped: old[i]?.popped ?? false,
          popT: old[i]?.popped ? 9 : 0,
          grow: old[i] ? 1 : 0,
          variant: (row * 3 + col * 7) % 3,
          phase: rand(0, 6.28),
        });
      }
    }
    if (!old.length) bubbles.forEach((b) => { b.grow = -(b.x / w) * 0.7 - rand(0, 0.15); });
    sprites = buildSprites(r, D, cv.dpr, PALETTES[paletteIdx]);
  }

  function remaining() {
    return bubbles.reduce((n, b) => n + (b.popped ? 0 : 1), 0);
  }

  // ---------- audio ----------
  function popSound(x, y, vel = 1, delay = 0) {
    if (!audio.ready) return;
    const pan = clamp((x / cv.w - 0.5) * 1.7, -0.9, 0.9);
    const pitch = rand(0.8, 1.25) * (1.08 - (y / cv.h) * 0.16);
    const v = clamp(vel, 0.35, 1);
    // crack of the plastic film
    audio.burst(bus, { kind: 'white', dur: 0.016, attack: 0.0004, gain: 0.5 * v, type: 'bandpass', freq: 3400 * pitch, freqEnd: 1700 * pitch, q: 0.65, pan, send: 0.08, delay });
    audio.burst(bus, { kind: 'white', dur: 0.007, attack: 0.0002, gain: 0.35 * v, type: 'highpass', freq: 6500, pan, send: 0.05, delay });
    // air "thock" of the dome collapsing
    audio.tone(bus, { freq: 560 * pitch, freqEnd: 140 * pitch, sweepTime: 0.05, dur: 0.07, gain: 0.5 * v, pan, send: 0.14, delay, attack: 0.001 });
    audio.tone(bus, { freq: 170 * pitch, freqEnd: 62, dur: 0.1, gain: 0.34 * v, pan, send: 0.1, delay, attack: 0.001 });
    // little plastic crinkles after
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      audio.burst(bus, { kind: 'white', dur: 0.007, attack: 0.0003, gain: rand(0.07, 0.17) * v, type: 'bandpass', freq: rand(3800, 9000), q: 1.6, pan: pan + rand(-0.15, 0.15), send: 0.12, delay: delay + rand(0.014, 0.09) });
    }
  }

  function refillSound() {
    if (!audio.ready) return;
    const notes = [523.25, 659.25, 783.99, 987.77, 1318.5];
    notes.forEach((f, i) => audio.bell(bus, { freq: f, gain: 0.1, decay: 2.4, vel: 0.55, delay: 0.1 + i * 0.09, pan: (i - 2) * 0.3 }));
    audio.burst(bus, { kind: 'pink', dur: 0.7, attack: 0.25, gain: 0.14, type: 'bandpass', freq: 400, freqEnd: 3200, q: 0.9, send: 0.3, curve: 'lin' });
  }

  // ---------- gameplay ----------
  function popBubble(b, vel = 1, soundDelay = 0, silent = false) {
    if (b.popped || b.grow < 0.6) return false;
    b.popped = true;
    b.popT = 0;
    total++;
    sessionPopped++;
    if (!silent) popSound(b.x, b.y, vel, soundDelay);
    rings.push({ x: b.x, y: b.y, t: 0 });
    for (let i = 0, np = Math.round(6 * gfx.particles); i < np; i++) {
      const a = rand(0, 6.283);
      const sp = rand(40, 140) * (0.6 + vel * 0.6);
      particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: rand(0.25, 0.55), t: 0, s: rand(1.2, 2.8) });
    }
    if (particles.length > 260 * gfx.particles) particles.splice(0, particles.length - 260 * gfx.particles);
    return true;
  }

  function popAlong(x0, y0, x1, y1, vel) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const hit = r * 0.95;
    let k = 0;
    const found = [];
    for (const b of bubbles) {
      if (b.popped) continue;
      let t = len2 ? ((b.x - x0) * dx + (b.y - y0) * dy) / len2 : 0;
      t = clamp(t, 0, 1);
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      if ((b.x - cx) ** 2 + (b.y - cy) ** 2 < hit * hit) found.push({ b, t });
    }
    found.sort((a, c) => a.t - c.t);
    for (const { b } of found) {
      if (popBubble(b, vel, Math.min(0.12, k * 0.012))) k++;
    }
    if (k) {
      audio.haptic?.(k > 2 ? 14 : 8);
      updateStat();
    }
    return k;
  }

  function updateStat() {
    hud.setStat(`Popped ${total.toLocaleString()}`);
    store.setItem('hush:bubbles:total', String(total));
  }

  function newSheet() {
    paletteIdx = (paletteIdx + 1 + Math.floor(Math.random() * (PALETTES.length - 1))) % PALETTES.length;
    cascade = null;
    sprites = buildSprites(r, D, cv.dpr, PALETTES[paletteIdx]);
    sheetTime = 0;
    for (const b of bubbles) {
      b.popped = false;
      b.popT = 0;
      b.grow = -(b.x / cv.w) * 0.7 - rand(0, 0.15); // negative = delay before inflating
      b.variant = Math.floor(Math.random() * 3);
    }
    refillSound();
  }

  function startCascade() {
    const list = bubbles.filter((b) => !b.popped);
    if (!list.length) return;
    const ox = hover ? hover.x : cv.w / 2;
    const oy = hover ? hover.y : cv.h / 2;
    list.sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));
    cascade = { list, i: 0, t: 0, next: 0 };
  }

  // ---------- input ----------
  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      hover = p;
      const vel = clamp(0.7 + p.speed / 2500, 0.5, 1);
      popAlong(p.x, p.y, p.x, p.y, vel);
    },
    move(p) {
      hover = p;
      shimmerX = clamp(p.x / cv.w, 0, 1);
      if (!p.down) return;
      const vel = clamp(0.55 + p.speed / 2200, 0.5, 1);
      popAlong(p.px, p.py, p.x, p.y, vel);
    },
    leave() { hover = null; },
  });

  hud.button({ label: 'Cascade', title: 'Pop everything in a rolling wave', onClick: () => { audio.unlock?.(); startCascade(); } });
  hud.button({ label: 'New sheet', onClick: () => { audio.unlock?.(); newSheet(); } });
  hud.setHint('Tap to pop. Hold and sweep across the sheet for a rolling crackle.');
  updateStat();

  // ---------- render ----------
  function render(dt, time) {
    const w = cv.w;
    const h = cv.h;
    const pal = PALETTES[paletteIdx];
    sheetTime += dt;

    // cascade scheduling: starts slow and accelerates into a crescendo
    if (cascade) {
      cascade.t += dt;
      const count = cascade.list.length;
      let guard = 0;
      while (cascade.i < count && cascade.t >= cascade.next && guard++ < 12) {
        const prog = cascade.i / count;
        popBubble(cascade.list[cascade.i++], 0.55 + prog * 0.4);
        cascade.next += lerp(0.085, 0.016, easeOut(prog));
      }
      if (cascade.i >= count) { cascade = null; updateStat(); }
      else if (cascade.i % 7 === 0) updateStat();
    }

    // background sheet
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, pal.bg[0]);
    bg.addColorStop(1, pal.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // bubbles
    let live = 0;
    const S = sprites.S * sprites.scale;
    for (const b of bubbles) {
      if (b.grow < 1 && !b.popped) {
        b.grow += dt * 1.8;
      }
      if (b.popped) b.popT += dt;
      else live++;
      const half = S / 2;
      if (b.popped) {
        const t = b.popT / 0.2;
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites.popped[b.variant], b.x - half, b.y - half, S, S);
        if (t < 1) {
          const e = easeOut(t);
          const sc = 1 - 0.4 * e + 0.12 * Math.sin(Math.min(1, t * 3) * Math.PI);
          ctx.globalAlpha = 1 - e;
          const sz = S * sc;
          ctx.drawImage(sprites.intact, b.x - sz / 2, b.y - sz / 2, sz, sz);
          ctx.globalAlpha = 1;
        }
      } else if (b.grow > 0) {
        const g = easeOutBack(b.grow);
        const idle = 1 + Math.sin(sheetTime * 1.3 + b.phase) * 0.004;
        const sz = S * clamp(g, 0, 1.15) * idle;
        ctx.globalAlpha = clamp(b.grow * 2, 0, 1);
        ctx.drawImage(sprites.intact, b.x - sz / 2, b.y - sz / 2, sz, sz);
        ctx.globalAlpha = 1;
      } else {
        // not yet inflated: show the flat dimple
        ctx.drawImage(sprites.popped[b.variant], b.x - half, b.y - half, S, S);
        b.grow += dt * 1.4;
      }
    }

    // hover ring (mouse only)
    if (hover && hover.type === 'mouse') {
      let near = null;
      let best = r * r;
      for (const b of bubbles) {
        if (b.popped) continue;
        const d = (b.x - hover.x) ** 2 + (b.y - hover.y) ** 2;
        if (d < best) { best = d; near = b; }
      }
      if (near) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(near.x, near.y, r * 1.04, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // pop rings and sparkles
    for (let i = rings.length - 1; i >= 0; i--) {
      const rg = rings[i];
      rg.t += dt / 0.32;
      if (rg.t >= 1) { rings.splice(i, 1); continue; }
      const e = easeOut(rg.t);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - e)})`;
      ctx.lineWidth = 3 * (1 - e) + 0.5;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, r * (0.9 + e * 0.95), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t > p.life) { particles.splice(i, 1); continue; }
      p.vx *= 0.92;
      p.vy = p.vy * 0.92 + 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - p.t / p.life)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s * (1 - p.t / p.life * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // plastic sheen that slides with the pointer
    const sx = (shimmerX - 0.5) * w * 0.6 + w * 0.5;
    const sheen = ctx.createLinearGradient(sx - w * 0.35, 0, sx + w * 0.35, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    // edge vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(60,10,70,0)');
    vg.addColorStop(1, 'rgba(60,10,70,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // refill when the sheet is empty
    if (live === 0 && !cascade) {
      refillCooldown += dt;
      if (refillCooldown > 1.1) { refillCooldown = 0; newSheet(); hud.setHint('Fresh sheet.', 2500); }
    } else refillCooldown = 0;
  }

  const loop = createLoop(render);

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      cv.dispose();
      store.setItem('hush:bubbles:total', String(total));
    },
  };
}
