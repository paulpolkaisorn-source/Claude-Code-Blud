// Crystal Chimes — 3D (Three.js) with bloom. Hanging crystal bells with real
// pendulum physics and collisions; each one rings with inharmonic additive
// "glass" partials through a long reverb. Brush through them, or let the wind.

import { THREE, createStage, gradientTexture, glowTexture, Sparkles } from '../three-base.js';
import { createLoop, track, rand, clamp, lerp, midiToFreq, pick } from '../util.js';
import { Pad } from '../audio.js';

const SCALE = [62, 64, 67, 69, 72, 74, 76, 79, 81]; // D major pentatonic over ~1.5 octaves
const HUES = [330, 20, 48, 150, 185, 215, 255, 285, 315];
const BEAM_Y = 3.7;

const segDist = (ax, ay, bx, by, cx, cy, dx, dy) => {
  // minimum distance between segments AB and CD (2D)
  const d = (px, py, x1, y1, x2, y2) => {
    const vx = x2 - x1, vy = y2 - y1;
    const l2 = vx * vx + vy * vy;
    const t = l2 ? clamp(((px - x1) * vx + (py - y1) * vy) / l2, 0, 1) : 0;
    return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
  };
  // check for proper intersection
  const o = (x1, y1, x2, y2, x3, y3) => (y2 - y1) * (x3 - x2) - (x2 - x1) * (y3 - y2);
  const o1 = o(ax, ay, bx, by, cx, cy), o2 = o(ax, ay, bx, by, dx, dy), o3 = o(cx, cy, dx, dy, ax, ay), o4 = o(cx, cy, dx, dy, bx, by);
  if (o1 * o2 < 0 && o3 * o4 < 0) return 0;
  return Math.min(d(ax, ay, cx, cy, dx, dy), d(bx, by, cx, cy, dx, dy), d(cx, cy, ax, ay, bx, by), d(dx, dy, ax, ay, bx, by));
};

export function create(env) {
  const { audio, bus, hud, root, settings, quality } = env;
  const high = quality !== 'low';

  const stage = createStage(root, {
    fov: 38,
    quality,
    exposure: 1.05,
    envIntensity: 0.55,
    bloom: { strength: 0.85, radius: 0.8, threshold: 0.62 },
  });
  const { scene, camera } = stage;
  scene.background = gradientTexture([[0, '#04051a'], [0.45, '#161040'], [1, '#43205f']]);

  // ---------- sky ----------
  scene.add(new THREE.HemisphereLight(0x8a96ff, 0x26104a, 0.4));
  const moonLight = new THREE.DirectionalLight(0xd5deff, 1.8);
  moonLight.position.set(-5, 6, 7);
  scene.add(moonLight);
  const warm = new THREE.PointLight(0xffb4d8, 18, 14, 2);
  warm.position.set(3, 1, 4);
  scene.add(warm);

  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = rand(0, Math.PI * 2);
    const y = rand(-0.1, 1);
    const r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(a) * r * 70;
    sp[i * 3 + 1] = y * 70;
    sp[i * 3 + 2] = Math.sin(a) * r * 70 - 20;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false }));
  scene.add(stars);

  const moonGlowTex = glowTexture(256, 'rgba(255,244,214,1)', 'rgba(255,230,190,0.35)');
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonGlowTex, color: 0xffe9c0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  moonGlow.position.set(-19, 13, -44);
  moonGlow.scale.setScalar(30);
  scene.add(moonGlow);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ color: 0xe9dcc0, toneMapped: false }));
  moonDisc.position.copy(moonGlow.position);
  scene.add(moonDisc);

  const mistTex = glowTexture(128, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.15)');
  const mists = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: pick([0x5a3a9a, 0x2f4fa8, 0x8a3a8a]), transparent: true, opacity: rand(0.1, 0.2), depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(rand(-10, 10), rand(-1, 5), rand(-16, -6));
    m.scale.setScalar(rand(10, 18));
    scene.add(m);
    mists.push({ m, sp: rand(0.05, 0.14), ph: rand(0, 6) });
  }

  const dust = new Sparkles(high ? 260 : 110, { size: 0.16, gravity: 0, drag: 0.55 });
  scene.add(dust.points);
  const motes = new Sparkles(high ? 70 : 30, { size: 0.1, drag: 0.05 });
  scene.add(motes.points);
  const moteColor = new THREE.Color('#c9b6ff');
  let moteClock = 0;

  // ---------- chimes ----------
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x6a4a36, roughness: 0.7, metalness: 0.05 });
  const threadMat = new THREE.MeshBasicMaterial({ color: 0xcfd6ff, transparent: true, opacity: 0.55 });
  const glowTex = glowTexture(128, 'rgba(255,255,255,1)', 'rgba(255,255,255,0.35)');
  let chimeRoot = null;
  let chimes = [];
  let layoutClass = '';
  let camDist = 9.6;
  const crystalGeos = [];

  function buildChimes() {
    if (chimeRoot) {
      scene.remove(chimeRoot);
      chimeRoot.traverse((o) => { o.geometry?.dispose?.(); if (o.material && o.material.dispose && o.material !== beamMat && o.material !== threadMat) o.material.dispose(); });
    }
    chimeRoot = new THREE.Group();
    scene.add(chimeRoot);
    chimes = [];
    const aspect = stage.width / Math.max(1, stage.height);
    const n = aspect < 0.85 ? 5 : aspect < 1.25 ? 7 : 9;
    layoutClass = String(n);
    camDist = aspect < 0.85 ? 11.5 : aspect < 1.25 ? 10.5 : 9.6;
    const hw = camDist * Math.tan((38 * Math.PI) / 360) * aspect * 0.86;
    const spread = Math.min(3.6, hw);
    const notes = n === 9 ? SCALE : n === 7 ? SCALE.slice(1, 8) : SCALE.slice(2, 7);
    const hues = n === 9 ? HUES : n === 7 ? HUES.slice(1, 8) : HUES.slice(2, 7);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, spread * 2 + 1.2, 16), beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = BEAM_Y;
    chimeRoot.add(beam);
    for (const sx of [-1, 1]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 6, 6), threadMat);
      rope.position.set(sx * (spread + 0.5), BEAM_Y + 3, 0);
      chimeRoot.add(rope);
    }

    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = lerp(-spread, spread, t);
      const len = lerp(2.0, 1.15, t) * (n < 9 ? 0.95 : 1);
      const thread = lerp(0.65, 0.95, (i % 3) / 2) + 0.1;
      const rad = 0.17 - t * 0.025;
      const color = new THREE.Color().setHSL(hues[i] / 360, 0.95, 0.56);
      const pts = [
        new THREE.Vector2(0.0001, 0),
        new THREE.Vector2(rad * 0.62, 0),
        new THREE.Vector2(rad, -0.12),
        new THREE.Vector2(rad, -len + 0.42),
        new THREE.Vector2(0.0001, -len),
      ];
      const geo = new THREE.LatheGeometry(pts, 6);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.06,
        metalness: 0,
        flatShading: true,
        transmission: high ? 0.5 : 0,
        thickness: 0.8,
        ior: 1.5,
        iridescence: 1,
        iridescenceIOR: 1.35,
        clearcoat: 1,
        envMapIntensity: 1.0,
        emissive: color,
        emissiveIntensity: 0.06,
        transparent: !high,
        opacity: high ? 1 : 0.88,
      });
      const group = new THREE.Group();
      group.position.set(x, BEAM_Y - 0.06, 0);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, thread, 5), threadMat);
      cord.position.y = -thread / 2;
      const crystal = new THREE.Mesh(geo, mat);
      crystal.position.y = -thread;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.y = -thread - len * 0.5;
      halo.scale.set(1.2, len * 1.6, 1);
      group.add(cord, crystal, halo);
      chimeRoot.add(group);
      chimes.push({
        i, x, group, crystal, halo, mat, color, len, thread, rad,
        freq: midiToFreq(notes[i]),
        ax: 0, vx: 0, az: 0, vz: 0,
        w0: 2.45 - t * 0.35 + rand(-0.04, 0.04),
        glow: 0, lastHit: 0, delay: 0, pendingKick: 0,
      });
    }
  }

  stage.onResize = () => { if (String(aspectCount()) !== layoutClass) buildChimes(); };
  const aspectCount = () => { const a = stage.width / Math.max(1, stage.height); return a < 0.85 ? 5 : a < 1.25 ? 7 : 9; };
  buildChimes();

  // ---------- audio ----------
  const recent = [];
  let windLoop = null;
  let pad = null;
  const padLevel = 0.05;
  if (audio.ready) {
    windLoop = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 520, q: 0.8, gain: 0.015, send: 0.5 });
    pad = new Pad(audio, bus, {
      chords: [[62, 69, 74, 78], [59, 66, 71, 74], [57, 64, 69, 73], [60, 67, 72, 76]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1500,
      period: 18,
      wave: 'triangle',
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  function ring(c, vel, quiet = false) {
    const now = performance.now();
    c.glow = Math.max(c.glow, clamp(vel * 1.1, 0.35, 1));
    // sparkles drift up from the struck crystal
    c.group.updateMatrixWorld();
    const tip = new THREE.Vector3(0, -c.thread - c.len * rand(0.3, 0.9), 0).applyMatrix4(c.group.matrixWorld);
    const n = Math.round((quiet ? 4 : 8) + vel * 16);
    const col = c.color.clone().lerp(new THREE.Color('#ffffff'), 0.4);
    for (let k = 0; k < n; k++) {
      const a = rand(0, 6.28);
      dust.spawn(tip.x + rand(-0.12, 0.12), tip.y + rand(-0.4, 0.4), tip.z + rand(-0.12, 0.12), Math.cos(a) * rand(0.1, 0.7), rand(0.2, 1.1), Math.sin(a) * rand(0.1, 0.5), col, rand(0.4, 1.2), rand(1.2, 2.8));
    }
    if (!audio.ready) return;
    while (recent.length && now - recent[0] > 1500) recent.shift();
    if (recent.length > (high ? 16 : 9)) return;
    recent.push(now);
    const pan = clamp(c.x / 4, -0.9, 0.9);
    const idx = chimes.indexOf(c);
    audio.bell(bus, {
      freq: c.freq,
      gain: (quiet ? 0.1 : 0.2) * (0.35 + vel * 0.9),
      pan,
      send: 0.5,
      decay: 5.8 - (idx / Math.max(1, chimes.length - 1)) * 2.2,
      vel: clamp(vel, 0.2, 1),
    });
    audio.haptic?.(6);
  }

  function kick(c, impulseX, impulseZ = 0) {
    c.vx = clamp(c.vx + impulseX, -7, 7);
    c.vz = clamp(c.vz + impulseZ, -4, 4);
  }

  // ---------- picking by screen-space proximity ----------
  const tA = new THREE.Vector3();
  const tB = new THREE.Vector3();
  const pxPerUnit = () => stage.height / (2 * camDist * Math.tan((38 * Math.PI) / 360));
  function chimeScreen(c) {
    c.group.updateMatrixWorld();
    tA.set(0, -c.thread, 0).applyMatrix4(c.group.matrixWorld).project(camera);
    tB.set(0, -c.thread - c.len, 0).applyMatrix4(c.group.matrixWorld).project(camera);
    const w = stage.width, h = stage.height;
    return [(tA.x * 0.5 + 0.5) * w, (-tA.y * 0.5 + 0.5) * h, (tB.x * 0.5 + 0.5) * w, (-tB.y * 0.5 + 0.5) * h];
  }

  function brush(p, tap = false) {
    const ppu = pxPerUnit();
    const worldV = p.vx / ppu; // world units / second horizontally
    const now = performance.now();
    const speedOK = tap || p.speed > 60;
    if (!speedOK) return;
    for (const c of chimes) {
      const [x1, y1, x2, y2] = chimeScreen(c);
      const reach = c.rad * ppu + (p.type === 'touch' ? 20 : 9);
      const d = segDist(p.px, p.py, p.x, p.y, x1, y1, x2, y2);
      if (d <= reach && now - c.lastHit > 150) {
        c.lastHit = now;
        const dir = tap ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(worldV) || 1;
        const mag = tap ? 2.4 : clamp(Math.abs(worldV) * 0.5, 0.5, 6);
        kick(c, dir * mag, rand(-0.4, 0.4));
        ring(c, clamp(tap ? 0.7 : 0.25 + Math.abs(worldV) / 7, 0.25, 1));
      }
    }
  }

  const tracker = track(root, {
    hover: true,
    down(p) { audio.unlock?.(); brush(p, true); },
    move(p) { brush(p, false); },
  });

  // ---------- wind ----------
  let breeze = 'gentle';
  let gustClock = 3;
  function gust(strength = 1) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    chimes.forEach((c, i) => { c.delay = (dir > 0 ? i : chimes.length - 1 - i) * 0.09 + rand(0, 0.08); c.pendingKick = dir * strength * rand(0.7, 1.5); });
    if (audio.ready) {
      audio.burst(bus, { kind: 'pink', dur: 2.4, attack: 0.9, gain: 0.12 * strength, type: 'bandpass', freq: 260, freqEnd: 900, q: 0.9, curve: 'lin', pan: -dir * 0.4, send: 0.5 });
      audio.burst(bus, { kind: 'white', dur: 2.0, attack: 0.9, gain: 0.025 * strength, type: 'highpass', freq: 3000, curve: 'lin', send: 0.4, pan: dir * 0.3 });
    }
  }
  hud.segmented({
    label: 'Breeze',
    options: [{ id: 'off', label: 'Still' }, { id: 'gentle', label: 'Gentle' }, { id: 'windy', label: 'Windy' }],
    value: breeze,
    onChange: (id) => { breeze = id; gustClock = id === 'off' ? 99 : 1.2; },
  });
  hud.button({ label: 'Gust', title: 'A puff of wind', onClick: () => { audio.unlock?.(); gust(1.2); } });
  hud.setHint('Brush your pointer through the crystals. Faster sweeps ring louder.');

  // ---------- frame ----------
  const camTarget = new THREE.Vector3(0, 2.15, 0);
  const ptr = { x: 0, y: 0 };
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  let sway = { x: 0, y: 0 };
  let windT = 0;

  const loop = createLoop((dt, time) => {
    // wind schedule
    if (breeze !== 'off') {
      gustClock -= dt;
      if (gustClock <= 0) {
        gust(breeze === 'gentle' ? rand(0.25, 0.6) : rand(0.8, 1.6));
        gustClock = breeze === 'gentle' ? rand(7, 13) : rand(2.5, 5.5);
      }
    }
    windT += dt;
    const breath = breeze === 'off' ? 0 : breeze === 'gentle' ? 0.03 : 0.07;
    windLoop?.set({ gain: breeze === 'off' ? 0.006 : 0.012 + breath * 0.5 * (0.6 + 0.4 * Math.sin(windT * 0.4)), freq: 380 + 220 * Math.sin(windT * 0.23) }, 0.4);

    // pendulum physics (sub-stepped for stability)
    const sub = 2;
    const h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (const c of chimes) {
        if (c.pendingKick) {
          c.delay -= h;
          if (c.delay <= 0) {
            kick(c, c.pendingKick * 0.9, rand(-0.2, 0.2));
            if (Math.abs(c.pendingKick) > 0.5 && Math.random() < 0.8) ring(c, 0.2 + Math.random() * 0.2, true);
            c.pendingKick = 0;
          }
        }
        // a hint of continual breeze noise keeps them alive
        const breezeF = breath * (Math.sin(time * 0.7 + c.i * 0.9) + Math.sin(time * 1.3 + c.i * 2.1) * 0.6);
        c.vx += (-c.w0 * c.w0 * Math.sin(c.ax) - 0.3 * c.vx + breezeF) * h;
        c.vz += (-c.w0 * c.w0 * Math.sin(c.az) - 0.3 * c.vz + breezeF * 0.3) * h;
        c.ax += c.vx * h;
        c.az += c.vz * h;
      }
      // neighbours knock into each other
      for (let i = 0; i < chimes.length - 1; i++) {
        const a = chimes[i];
        const b = chimes[i + 1];
        const gap = (b.x + (b.thread + b.len * 0.55) * Math.sin(b.ax)) - (a.x + (a.thread + a.len * 0.55) * Math.sin(a.ax));
        const min = (a.rad + b.rad) * 1.15;
        if (gap < min) {
          const rel = a.vx - b.vx;
          if (rel > 0) {
            const delta = rel * 0.5 * 1.8;
            a.vx -= delta;
            b.vx += delta;
            const now = performance.now();
            if (Math.abs(delta) > 0.35) {
              const v = clamp(Math.abs(delta) / 3, 0.15, 0.8);
              if (now - a.lastHit > 90) { a.lastHit = now; ring(a, v, true); }
              if (now - b.lastHit > 90) { b.lastHit = now; ring(b, v, true); }
            }
          }
          const push = (min - gap) * 0.5 / (a.thread + a.len * 0.55);
          a.ax -= push;
          b.ax += push;
        }
      }
    }

    for (const c of chimes) {
      c.group.rotation.z = c.ax;
      c.group.rotation.x = c.az;
      c.glow *= Math.exp(-dt / 1.6);
      const g = c.glow;
      c.mat.emissiveIntensity = 0.06 + g * 1.6;
      c.halo.material.opacity = g * 0.75;
      c.halo.scale.set(1.1 + g * 1.4, c.len * (1.4 + g * 0.5), 1);
    }

    // ambience: drifting motes and slow mist
    moteClock -= dt;
    if (moteClock <= 0) {
      moteClock = rand(0.1, 0.35);
      motes.spawn(rand(-5, 5), rand(-0.5, 4.5), rand(-2, 3), rand(-0.05, 0.05), rand(0.05, 0.18), rand(-0.05, 0.05), moteColor, rand(0.5, 1.3), rand(6, 10));
    }
    motes.update(dt, stage.height, 38);
    dust.update(dt, stage.height, 38);
    for (const m of mists) m.m.position.x += Math.sin(time * m.sp + m.ph) * dt * 0.25;
    stars.rotation.y = time * 0.002;
    moonGlow.material.opacity = 0.62 + Math.sin(time * 0.3) * 0.06;

    sway.x = lerp(sway.x, ptr.x * 0.55 + Math.sin(time * 0.16) * 0.25, 1 - Math.exp(-1.6 * dt));
    sway.y = lerp(sway.y, ptr.y * 0.25 + Math.sin(time * 0.12) * 0.1, 1 - Math.exp(-1.6 * dt));
    camera.position.set(sway.x, 2.15 - sway.y, camDist);
    camera.lookAt(camTarget);
    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      windLoop?.stop(0.2);
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      glowTex.dispose();
      mistTex.dispose();
      moonGlowTex.dispose();
      stage.dispose();
    },
  };
}
