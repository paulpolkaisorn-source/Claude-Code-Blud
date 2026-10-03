// Rainy Window — 2D canvas. Wipe condensation off cold glass; raindrops refract
// the out-of-focus city lights, merge, and run. Rain, drips, squeaks and thunder
// are all synthesized.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, pick, smoothstep } from '../util.js';
import { Pad } from '../audio.js';

const MOODS = {
  night: {
    label: 'Night',
    sky: [[0, '#15215e'], [0.5, '#2c1d60'], [1, '#5a2468']],
    lights: [[255, 176, 72], [255, 230, 190], [255, 84, 160], [70, 200, 225], [100, 140, 255], [255, 80, 70], [255, 200, 120]],
    glow: 'rgba(255,150,80,0.18)',
  },
  dusk: {
    label: 'Dusk',
    sky: [[0, '#3a2a6e'], [0.5, '#a24a78'], [1, '#ff9a62']],
    lights: [[255, 190, 110], [255, 140, 90], [255, 105, 140], [255, 235, 190], [190, 120, 255], [255, 170, 60]],
    glow: 'rgba(255,170,90,0.28)',
  },
  neon: {
    label: 'Neon',
    sky: [[0, '#0a1038'], [0.6, '#1d0e4a'], [1, '#3a1068']],
    lights: [[0, 230, 255], [255, 40, 190], [150, 90, 255], [120, 255, 160], [255, 255, 255], [255, 120, 60]],
    glow: 'rgba(160,60,255,0.2)',
  },
};

const LEVELS = {
  drizzle: { spawn: 5, maxR: 5.5, ticks: 3, bed: 0.1, big: 0.1 },
  rain: { spawn: 13, maxR: 7.5, ticks: 9, bed: 0.19, big: 0.3 },
  storm: { spawn: 30, maxR: 9, ticks: 20, bed: 0.3, big: 0.5 },
};

const BG_SCALE = 0.5; // background + fog render at half resolution (they are out of focus anyway)

function glowSprite(rgb, kind = 'bokeh') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  if (kind === 'bokeh') {
    // an out-of-focus light: flat disc with a brighter edge
    gr.addColorStop(0, col(0.42));
    gr.addColorStop(0.7, col(0.6));
    gr.addColorStop(0.9, col(1));
    gr.addColorStop(1, col(0));
  } else {
    // pure soft blob (what frosted glass turns a light into)
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, col(Math.exp(-Math.pow((i / 8) * 2.1, 2))));
    gr.addColorStop(1, col(0));
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return c;
}

export function create(env) {
  const { audio, bus, hud, root, settings, quality } = env;
  const low = quality === 'low';

  let moodKey = 'night';
  let levelKey = 'rain';
  let sprites = [];
  let discs = [];
  let bg, bgCtx, fog, fogCtx, fogSrc;
  let statics = [];
  let runners = [];
  let tick = 0;
  let regrow = 0;
  let flash = 0;
  let flashQueue = [];
  let nextLightning = 12;
  let wipe = null;
  let hover = null;
  let tapTimer = 0;
  let time = 0;

  const cv = createCanvas2D(root, { maxPixels: low ? 1_300_000 : 2_400_000, onResize: setup });
  const { ctx } = cv;
  const mood = () => MOODS[moodKey];
  const level = () => LEVELS[levelKey];

  // ---------- scene setup ----------
  function buildDiscs() {
    const w = cv.w;
    const h = cv.h;
    const n = Math.round(clamp((w * h) / 4800, 60, low ? 110 : 200));
    discs = [];
    for (let i = 0; i < n; i++) {
      const col = pick(mood().lights);
      const near = Math.random() < 0.18;
      discs.push({
        x: rand(-0.05, 1.05) * w,
        y: (0.12 + Math.pow(Math.random(), 0.8) * 0.95) * h,
        r: near ? rand(34, 80) : rand(10, 38),
        a: near ? rand(0.4, 0.7) : rand(0.55, 1),
        sp: rand(0.4, 1.6),
        ph: rand(0, 6.28),
        s: 0,
        col,
      });
    }
    // big soft washes of colour (distant building glow)
    for (let i = 0; i < 7; i++) {
      discs.push({ x: rand(0, 1) * w, y: rand(0.4, 1) * h, r: rand(130, 280), a: rand(0.16, 0.3), sp: rand(0.15, 0.4), ph: rand(0, 6.28), s: 0, col: pick(mood().lights), wash: true });
    }
    buildSprites();
  }

  function buildSprites() {
    sprites = { bokeh: mood().lights.map((c) => glowSprite(c, 'bokeh')), blob: mood().lights.map((c) => glowSprite(c, 'blob')) };
    for (const d of discs) d.s = mood().lights.indexOf(d.col);
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w));
    c.height = Math.max(2, Math.round(h));
    return c;
  }

  function drawScene(g, W, H, t, blur) {
    const grad = g.createLinearGradient(0, 0, 0, H);
    for (const [p, c] of mood().sky) grad.addColorStop(p, c);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const d of discs) {
      const tw = 0.8 + 0.2 * Math.sin(t * d.sp + d.ph);
      const soft = blur || d.wash;
      g.globalAlpha = Math.min(1, d.a * tw * (blur && !d.wash ? 0.9 : 1));
      const s = d.r * 2 * BG_SCALE * (blur && !d.wash ? 1.9 : 1);
      g.drawImage((soft ? sprites.blob : sprites.bokeh)[d.s], d.x * BG_SCALE - s / 2, d.y * BG_SCALE - s / 2, s, s);
    }
    g.globalAlpha = 1;
    // warm haze rising from street level
    const hz = g.createLinearGradient(0, H * 0.55, 0, H);
    hz.addColorStop(0, 'rgba(0,0,0,0)');
    hz.addColorStop(1, mood().glow);
    g.fillStyle = hz;
    g.fillRect(0, H * 0.55, W, H * 0.45);
    g.globalCompositeOperation = 'source-over';
  }

  function buildFogSource() {
    const W = fog.width;
    const H = fog.height;
    fogSrc = makeCanvas(W, H);
    const g = fogSrc.getContext('2d');
    drawScene(g, W, H, 3, true);
    // milky condensation
    const milk = g.createLinearGradient(0, 0, 0, H);
    milk.addColorStop(0, 'rgba(190,205,232,0.5)');
    milk.addColorStop(1, 'rgba(218,226,242,0.58)');
    g.fillStyle = milk;
    g.fillRect(0, 0, W, H);
    // fine mist grain
    for (let i = 0; i < (W * H) / 40; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
  }

  function setup() {
    const w = cv.w;
    const h = cv.h;
    if (!w) return;
    bg = makeCanvas(w * BG_SCALE, h * BG_SCALE);
    bgCtx = bg.getContext('2d');
    fog = makeCanvas(w * BG_SCALE, h * BG_SCALE);
    fogCtx = fog.getContext('2d');
    buildDiscs();
    buildFogSource();
    fogCtx.globalCompositeOperation = 'source-over';
    fogCtx.drawImage(fogSrc, 0, 0);
    // scatter an initial set of beads on the glass
    statics = [];
    runners = [];
    const count = Math.round(clamp((w * h) / 4200, 80, low ? 220 : 380));
    for (let i = 0; i < count; i++) spawnStatic(true);
    const bigs = Math.round(w / 220);
    for (let i = 0; i < bigs; i++) spawnRunner(rand(0, w), rand(0, h * 0.7), rand(5, 8), true);
  }

  // ---------- drops ----------
  function clearFog(x, y, r) {
    fogCtx.globalCompositeOperation = 'destination-out';
    fogCtx.beginPath();
    fogCtx.arc(x * BG_SCALE, y * BG_SCALE, Math.max(1, r * BG_SCALE), 0, Math.PI * 2);
    fogCtx.fill();
    fogCtx.globalCompositeOperation = 'source-over';
  }

  function spawnStatic(initial = false) {
    const lv = level();
    const r = 1.1 + Math.pow(Math.random(), 3.4) * lv.maxR;
    const x = rand(0, cv.w);
    const y = rand(0, cv.h);
    if (r > 4.6 && !initial && Math.random() < lv.big + 0.2) {
      spawnRunner(x, y, r);
      return;
    }
    statics.push({ x, y, r, a: initial ? 1 : 0, sq: rand(0.9, 1.1) });
    clearFog(x, y, r * 1.35 + 0.8);
  }

  function spawnRunner(x, y, r, startMoving = false) {
    runners.push({
      x, y, r, vy: 0, px: x, py: y,
      wait: startMoving ? rand(0, 1) : rand(0.2, 2.2),
      moving: false,
      wob: rand(0, 6.28),
      drift: rand(-6, 6),
      trailAcc: 0,
      a: 1,
    });
    clearFog(x, y, r * 1.35 + 0.8);
  }

  function updateDrops(dt) {
    const lv = level();
    // new rain hitting the glass
    const n = lv.spawn * dt;
    let k = n;
    while (k > 0) {
      if (Math.random() < k) spawnStatic();
      k -= 1;
    }
    if (statics.length > 520) statics.splice(0, statics.length - 520);

    for (const s of statics) if (s.a < 1) s.a = Math.min(1, s.a + dt * 6);

    for (let i = runners.length - 1; i >= 0; i--) {
      const d = runners[i];
      d.px = d.x;
      d.py = d.y;
      if (!d.moving) {
        d.wait -= dt;
        if (d.wait <= 0) {
          d.moving = true;
          d.run = rand(0.3, 1.6);
          d.vy = 20 + d.r * 5;
        }
      } else {
        // stick-slip: heavier drops move faster, then pause on a bump
        const vmax = 25 + d.r * d.r * 3.2;
        d.vy += (vmax - d.vy) * Math.min(1, dt * 2.5);
        d.run -= dt;
        d.wob += dt * 3;
        d.x += (Math.sin(d.wob) * 5 + d.drift) * dt * (0.3 + d.r * 0.08);
        d.y += d.vy * dt;
        d.trailAcc += d.vy * dt;
        // shed a little water behind
        if (d.trailAcc > 14 + d.r * 2.2) {
          d.trailAcc = 0;
          const rr = rand(0.8, 1.7);
          statics.push({ x: d.x + rand(-1, 1), y: d.py - d.r * 0.4, r: rr, a: 1, sq: 1 });
          d.r *= 0.985;
        }
        // clear a thin trail in the fog
        fogCtx.globalCompositeOperation = 'destination-out';
        fogCtx.lineCap = 'round';
        fogCtx.lineWidth = Math.max(1.2, d.r * 0.95 * BG_SCALE);
        fogCtx.beginPath();
        fogCtx.moveTo(d.px * BG_SCALE, d.py * BG_SCALE);
        fogCtx.lineTo(d.x * BG_SCALE, d.y * BG_SCALE);
        fogCtx.stroke();
        fogCtx.globalCompositeOperation = 'source-over';
        if (d.run <= 0) {
          d.moving = false;
          d.wait = rand(0.15, 1.8);
        }
        // merge any beads we run over
        for (let j = statics.length - 1; j >= 0; j--) {
          const s = statics[j];
          const dx = s.x - d.x;
          const dy = s.y - d.y;
          const rr = d.r + s.r * 0.7;
          if (dx * dx + dy * dy < rr * rr) {
            d.r = Math.cbrt(d.r ** 3 + s.r ** 3 * 0.9);
            statics.splice(j, 1);
          }
        }
      }
      if (d.moving && d.r < 3.1) {
        // too small to keep running: becomes a bead
        statics.push({ x: d.x, y: d.y, r: d.r, a: 1, sq: 1 });
        runners.splice(i, 1);
        continue;
      }
      if (d.y > cv.h + 20) runners.splice(i, 1);
    }
    // runners merge into each other
    for (let i = 0; i < runners.length; i++) {
      for (let j = runners.length - 1; j > i; j--) {
        const a = runners[i];
        const b = runners[j];
        const rr = (a.r + b.r) * 0.75;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < rr * rr) {
          a.r = Math.cbrt(a.r ** 3 + b.r ** 3);
          a.moving = true;
          a.run = Math.max(a.run || 0, 0.8);
          runners.splice(j, 1);
        }
      }
    }
    // keep the glass populated with runners
    const want = Math.round(cv.w / (levelKey === 'drizzle' ? 380 : levelKey === 'rain' ? 220 : 130));
    if (runners.length < want && Math.random() < dt * 0.9) spawnRunner(rand(0, cv.w), rand(-10, cv.h * 0.45), rand(4.6, lv.maxR + 1));
  }

  function drawDrop(x, y, r, a = 1, tall = 1.12) {
    if (r < 2.1) {
      // tiny bead: cheap highlight + shade
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.arc(x + 0.3, y + 0.5, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const ry = r * tall;
    ctx.save();
    ctx.globalAlpha = a;
    // soft contact shadow so the drop feels like it sits on glass
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.12, y + ry * 0.2, r * 1.04, ry * 1.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    // the drop is a tiny wide-angle lens: it shows the scene upside-down and compressed
    const M = 2.1;
    const sw = r * 2 * M;
    const shh = ry * 2 * M;
    ctx.translate(x, y);
    ctx.scale(-1, -1);
    const sx = (x - sw / 2) * BG_SCALE;
    const sy = (y - shh / 2 + ry * 0.2) * BG_SCALE;
    ctx.drawImage(bg, sx, sy, sw * BG_SCALE, shh * BG_SCALE, -r, -ry, r * 2, ry * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.7;
    ctx.drawImage(bg, sx, sy, sw * BG_SCALE, shh * BG_SCALE, -r, -ry, r * 2, ry * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    // darker rim, brighter bottom caustic
    const edge = ctx.createRadialGradient(x, y, r * 0.45, x, y, r * 1.02);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = edge;
    ctx.fillRect(x - r - 1, y - ry - 1, r * 2 + 2, ry * 2 + 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.06, r * 0.72, ry * 0.76, 0, Math.PI * 0.18, Math.PI * 0.62);
    ctx.globalAlpha = a * 0.4;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, y - ry * 0.4, r * 0.24, ry * 0.15, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y + ry * 0.42, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- wiping ----------
  function wipeSegment(x0, y0, x1, y1) {
    const R = clamp(Math.min(cv.w, cv.h) * 0.045, 26, 40);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len / 5));
    fogCtx.globalCompositeOperation = 'destination-out';
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(x0, x1, t);
      const y = lerp(y0, y1, t);
      const gr = fogCtx.createRadialGradient(x * BG_SCALE, y * BG_SCALE, R * BG_SCALE * 0.35, x * BG_SCALE, y * BG_SCALE, R * BG_SCALE);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      fogCtx.fillStyle = gr;
      fogCtx.beginPath();
      fogCtx.arc(x * BG_SCALE, y * BG_SCALE, R * BG_SCALE, 0, Math.PI * 2);
      fogCtx.fill();
      // sweep up the beads in the way
      for (let j = statics.length - 1; j >= 0; j--) {
        const s = statics[j];
        if ((s.x - x) ** 2 + (s.y - y) ** 2 < (R * 0.75) ** 2) {
          wipe.mass += s.r * s.r * 0.12;
          statics.splice(j, 1);
        }
      }
    }
    fogCtx.globalCompositeOperation = 'source-over';
  }

  setup();

  // ---------- audio ----------
  let bedPink, bedHiss, bedRumble, squeak, skritch, pad;
  const padLevel = 0.05;
  if (audio.ready) {
    bedPink = audio.loop(bus, { kind: 'pink', filter: 'lowpass', freq: 3600, q: 0.4, gain: 0, send: 0.12 });
    bedHiss = audio.loop(bus, { kind: 'white', filter: 'highpass', freq: 5200, q: 0.5, gain: 0, send: 0.05 });
    bedRumble = audio.loop(bus, { kind: 'brown', filter: 'lowpass', freq: 240, q: 0.5, gain: 0, send: 0.1 });
    squeak = audio.loop(bus, { kind: 'white', filter: 'bandpass', freq: 2500, q: 26, gain: 0, send: 0.2 });
    skritch = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 1100, q: 1.6, gain: 0, send: 0.12 });
    pad = new Pad(audio, bus, {
      chords: [[50, 57, 60, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 800,
      period: 22,
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  function applyLevelAudio() {
    if (!audio.ready) return;
    const l = level();
    bedPink.set({ gain: l.bed, freq: 2600 + l.bed * 5000 }, 1.2);
    bedHiss.set({ gain: l.bed * 0.22 }, 1.2);
    bedRumble.set({ gain: 0.05 + l.bed * 0.5 }, 1.2);
  }

  function dripSound() {
    if (!audio.ready) return;
    const pan = rand(-0.8, 0.8);
    const p = Math.random();
    if (p < 0.6) {
      // tiny tick on glass
      audio.burst(bus, { kind: 'white', dur: rand(0.004, 0.009), attack: 0.0003, gain: rand(0.03, 0.12), type: 'bandpass', freq: rand(2200, 6500), q: rand(1, 3), pan, send: 0.2 });
    } else if (p < 0.9) {
      // slightly weightier tap
      audio.tone(bus, { freq: rand(900, 1700), freqEnd: rand(500, 800), dur: 0.03, gain: rand(0.015, 0.045), pan, send: 0.3, attack: 0.001 });
      audio.burst(bus, { kind: 'white', dur: 0.012, gain: rand(0.04, 0.09), type: 'bandpass', freq: rand(1500, 3200), q: 1, pan, send: 0.2 });
    } else {
      // droplet landing in a puddle outside
      audio.bubble(bus, { freq: rand(700, 1500), gain: 0.025, pan, send: 0.5, dur: 0.12 });
    }
  }

  function thunder(delay) {
    if (!audio.ready) return;
    const pan = rand(-0.5, 0.5);
    audio.burst(bus, { kind: 'brown', dur: rand(3.5, 5.5), attack: rand(0.4, 1.2), gain: 1.1, type: 'lowpass', freq: 220, freqEnd: 50, q: 0.7, pan, send: 0.55, delay, curve: 'lin' });
    audio.burst(bus, { kind: 'pink', dur: 2.2, attack: 0.15, gain: 0.25, type: 'lowpass', freq: 600, freqEnd: 90, q: 0.5, pan, send: 0.5, delay: delay + 0.1 });
    // sharp crackle at the front
    for (let i = 0; i < 9; i++) audio.burst(bus, { kind: 'white', dur: rand(0.01, 0.05), gain: rand(0.04, 0.12), type: 'bandpass', freq: rand(400, 1400), q: 1, pan, send: 0.4, delay: delay + rand(0, 0.5) });
  }

  function updateAudio(dt) {
    if (!audio.ready) return;
    const l = level();
    tapTimer += dt * l.ticks;
    while (tapTimer > 1) {
      tapTimer -= Math.random() * 1.6;
      dripSound();
    }
    if (wipe) {
      const sp = clamp(wipe.speed / 800, 0, 1);
      wipe.sp += (sp - wipe.sp) * Math.min(1, dt * 14);
      // squeaky stick-slip: jitter gain and pitch
      const stick = 0.55 + Math.random() * 0.45;
      squeak.set({ gain: 0.075 * Math.pow(wipe.sp, 0.8) * stick, freq: 2000 + wipe.sp * 1500 + Math.sin(time * 40) * 160 + Math.random() * 120, pan: clamp((wipe.x / cv.w - 0.5) * 1.6, -0.9, 0.9) }, 0.02);
      skritch.set({ gain: 0.2 * wipe.sp, freq: 800 + wipe.sp * 900 }, 0.03);
    } else {
      squeak.set({ gain: 0 }, 0.05);
      skritch.set({ gain: 0 }, 0.08);
    }
  }

  // ---------- lightning ----------
  function strike() {
    flashQueue = [0, 0.11, 0.2].map((d, i) => ({ t: d, a: i === 1 ? 0.55 : 1 }));
    thunder(rand(0.5, 2.8));
  }

  // ---------- input ----------
  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      wipe = { id: p.id, x: p.x, y: p.y, speed: 0, sp: 0, mass: 0 };
      wipeSegment(p.x, p.y, p.x + 0.01, p.y);
    },
    move(p) {
      hover = p;
      if (!wipe || wipe.id !== p.id) return;
      wipeSegment(wipe.x, wipe.y, p.x, p.y);
      wipe.x = p.x;
      wipe.y = p.y;
      wipe.speed = p.speed;
    },
    up(p) {
      if (wipe && wipe.id === p.id) {
        // everything the finger gathered runs off as one fat drop
        if (wipe.mass > 0.6) spawnRunner(wipe.x, wipe.y, clamp(2.6 + wipe.mass * 0.6, 4, 9));
        wipe = null;
      }
    },
    leave() { hover = null; },
  });

  // ---------- HUD ----------
  hud.segmented({
    label: 'Rain',
    options: [{ id: 'drizzle', label: 'Drizzle' }, { id: 'rain', label: 'Rain' }, { id: 'storm', label: 'Storm' }],
    value: levelKey,
    onChange: (id) => { levelKey = id; applyLevelAudio(); nextLightning = time + rand(3, 8); },
  });
  hud.segmented({
    label: 'City',
    options: Object.entries(MOODS).map(([id, m]) => ({ id, label: m.label })),
    value: moodKey,
    onChange: (id) => {
      moodKey = id;
      for (const d of discs) d.col = pick(mood().lights);
      buildSprites();
      buildFogSource();
    },
  });
  hud.button({ label: 'Fog up', title: 'Breathe on the glass', onClick: () => { regrow = 1; if (audio.ready) audio.burst(bus, { kind: 'pink', dur: 1.2, attack: 0.5, gain: 0.12, type: 'lowpass', freq: 1400, freqEnd: 500, q: 0.5, curve: 'lin', send: 0.3 }); } });
  hud.setHint('Wipe the glass with your finger. Drops gather and run.');
  applyLevelAudio();

  // ---------- frame ----------
  let regrowClock = 0;
  function frame(dt, t) {
    time = t;
    updateDrops(dt);
    updateAudio(dt);

    // slow condensation regrowth (or a quick breath when asked)
    regrowClock += dt;
    if (regrowClock > 0.2) {
      regrowClock = 0;
      fogCtx.globalAlpha = regrow > 0 ? 0.35 : 0.028;
      fogCtx.drawImage(fogSrc, 0, 0);
      fogCtx.globalAlpha = 1;
      if (regrow > 0) regrow -= 0.34;
    }

    if (levelKey === 'storm') {
      nextLightning -= dt;
      if (nextLightning <= 0) { strike(); nextLightning = rand(9, 20); }
    }
    let fl = 0;
    for (let i = flashQueue.length - 1; i >= 0; i--) {
      const q = flashQueue[i];
      q.t -= dt;
      if (q.t <= 0) { flash = Math.max(flash, q.a); flashQueue.splice(i, 1); }
    }
    flash *= Math.pow(0.0009, dt);
    fl = flash > 0.01 ? flash : 0;

    drawScene(bgCtx, bg.width, bg.height, t, false);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bg, 0, 0, cv.w, cv.h);
    ctx.drawImage(fog, 0, 0, cv.w, cv.h);

    for (const s of statics) drawDrop(s.x, s.y, s.r, s.a, 1.1);
    for (const d of runners) {
      // little tail above a moving drop
      if (d.moving) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = d.r * 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - d.r * 1.6);
        ctx.lineTo(d.x, d.y - d.r * 0.2 - Math.min(14, d.vy * 0.12));
        ctx.stroke();
      }
      drawDrop(d.x, d.y, d.r, 1, d.moving ? 1.28 : 1.12);
    }

    // soft vignette
    const vg = ctx.createRadialGradient(cv.w / 2, cv.h / 2, Math.min(cv.w, cv.h) * 0.45, cv.w / 2, cv.h / 2, Math.max(cv.w, cv.h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,10,0)');
    vg.addColorStop(1, 'rgba(0,0,10,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cv.w, cv.h);

    if (fl) {
      ctx.fillStyle = `rgba(215,228,255,${fl * 0.6})`;
      ctx.fillRect(0, 0, cv.w, cv.h);
    }
    if (hover && hover.type === 'mouse' && !wipe) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, clamp(Math.min(cv.w, cv.h) * 0.045, 26, 40) * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const loop = createLoop(frame);

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      [bedPink, bedHiss, bedRumble, squeak, skritch].forEach((l) => l?.stop(0.2));
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      cv.dispose();
    },
  };
}
