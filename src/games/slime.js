// Slime Squish — 3D (Three.js). A soft-body slime on a ~14k-vertex mesh:
// per-vertex spring physics with neighbour coupling, grab/stretch/press with
// the pointer, translucent physical material, and a squelchy procedural soundscape.

import { THREE, createStage, gradientTexture, glowTexture, Sparkles } from '../three-base.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createLoop, track, rand, clamp, lerp, smoothstep } from '../util.js';
import { Pad } from '../audio.js';

const THEMES = [
  { name: 'Bubblegum', color: '#ff4fa8', top: '#ffd6ec', fog: '#eaa6cc', floor: '#efb4d3' },
  { name: 'Mint', color: '#1fd6a0', top: '#d4fff0', fog: '#9fe3cb', floor: '#aeead4' },
  { name: 'Lavender', color: '#8e6bff', top: '#e6dcff', fog: '#bfaff0', floor: '#c9bcf3' },
  { name: 'Peach', color: '#ff8a45', top: '#ffe6d2', fog: '#f5b99a', floor: '#f8c6ab' },
  { name: 'Ocean', color: '#2aa8ff', top: '#d6f0ff', fog: '#9fcdea', floor: '#addaf0' },
  { name: 'Butter', color: '#ffc61f', top: '#fff3c4', fog: '#f1d98e', floor: '#f5e1a2' },
];

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const high = gfx.transmission;

  const stage = createStage(root, { fov: 30, gfx, exposure: 0.92, envIntensity: 0.9, shadows: true, ao: true, aoRadius: 0.6 });
  const { scene, camera, renderer } = stage;
  let themeIdx = 0;
  const theme = () => THEMES[themeIdx];

  // ---------- environment ----------
  scene.fog = new THREE.Fog(theme().fog, 12, 30);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: theme().floor, roughness: 0.92, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const key = new THREE.DirectionalLight(0xfff0e0, 1.7);
  key.position.set(3.5, 7, 4);
  if (gfx.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(gfx.shadows, gfx.shadows);
    key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = gfx.level >= 4 ? 5 : 2;
    key.shadow.blurSamples = 16;
    floor.receiveShadow = true;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d8ff, 1.8);
  rim.position.set(-5, 3.5, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3d9ff, 0.3));

  // contact shadow
  const shadowTex = glowTexture(128, 'rgba(0,0,0,0.95)', 'rgba(0,0,0,0.45)');
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false, color: 0x2a1030 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  shadow.visible = !gfx.shadows;
  scene.add(shadow);

  function applyTheme(animate = false) {
    const t = theme();
    scene.background?.dispose?.();
    scene.background = gradientTexture([[0, t.top], [0.5, t.fog], [1, t.fog]]);
    scene.fog.color.set(t.fog);
    floor.material.color.set(t.floor);
    mat.color.set(t.color);
    mat.attenuationColor.set(t.color);
    mat.emissive.set(t.color);
    mat.sheenColor.set(new THREE.Color(t.color).lerp(new THREE.Color('#ffffff'), 0.5));
    bubbleMat.color.set(new THREE.Color(t.color).lerp(new THREE.Color('#ffffff'), 0.7));
    dustColor.set(t.color).lerp(new THREE.Color('#ffffff'), 0.5);
    if (animate) burstSparkles(new THREE.Vector3(0, 1.2, 0), 26, 2.6);
  }

  // ---------- slime mesh ----------
  const detail = Math.round([14, 20, 30, 38, 46, 54][gfx.level]);
  let geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  const N = geo.attributes.position.count;
  const posAttr = geo.attributes.position;
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const R0 = Float32Array.from(posAttr.array);
  const P = posAttr.array;
  const D = new Float32Array(N * 3);
  const V = new Float32Array(N * 3);
  const gw = new Float32Array(N); // grab weights

  // adjacency (CSR)
  const idx = geo.index.array;
  const sets = Array.from({ length: N }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    sets[a].add(b); sets[a].add(c);
    sets[b].add(a); sets[b].add(c);
    sets[c].add(a); sets[c].add(b);
  }
  const nbrStart = new Uint32Array(N + 1);
  let total = 0;
  for (let i = 0; i < N; i++) { nbrStart[i] = total; total += sets[i].size; }
  nbrStart[N] = total;
  const nbrIdx = new Uint32Array(total);
  for (let i = 0; i < N; i++) { let o = nbrStart[i]; for (const j of sets[i]) nbrIdx[o++] = j; }
  sets.length = 0;

  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(-4, -4, -4), new THREE.Vector3(4, 4, 4));

  const mat = new THREE.MeshPhysicalMaterial({
    color: theme().color,
    roughness: 0.14,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.6,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color('#ffffff'),
    transmission: high ? 0.35 : 0,
    thickness: 2.2,
    ior: 1.36,
    attenuationColor: new THREE.Color(theme().color),
    attenuationDistance: 0.55,
    emissive: new THREE.Color(theme().color),
    emissiveIntensity: 0.1,
    envMapIntensity: 1.25,
    transparent: !high,
    opacity: high ? 1 : 0.93,
  });
  const slime = new THREE.Mesh(geo, mat);
  slime.frustumCulled = false;
  slime.castShadow = !!gfx.shadows;
  const BASE = new THREE.Vector3(1.2, 0.86, 1.2);
  slime.scale.copy(BASE);
  slime.position.y = BASE.y;
  scene.add(slime);

  // bubbles trapped inside the slime
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, clearcoat: 1, envMapIntensity: 1.6 });
  const bubbleGeo = new THREE.SphereGeometry(1, 14, 10);
  const bubbles = [];
  for (let i = 0, nb = Math.round(16 * gfx.detail * 1.3); i < nb; i++) {
    const dir = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize();
    const rad = rand(0.15, 0.78);
    const m = new THREE.Mesh(bubbleGeo, bubbleMat);
    const s = Math.pow(rand(0.2, 1), 2) * 0.075 + 0.016;
    m.scale.setScalar(s);
    m.position.copy(dir).multiplyScalar(rad);
    slime.add(m);
    // nearest surface vertex → how much this bubble gets carried by the jiggle
    let best = 0, bd = 1e9;
    const target = dir.clone();
    for (let v = 0; v < N; v += 7) {
      const d = (R0[v * 3] - target.x) ** 2 + (R0[v * 3 + 1] - target.y) ** 2 + (R0[v * 3 + 2] - target.z) ** 2;
      if (d < bd) { bd = d; best = v; }
    }
    bubbles.push({ m, base: m.position.clone(), vi: best, k: rad * 0.9 });
  }

  // dust motes
  const dust = new Sparkles(Math.round(70 * gfx.particles), { size: 0.09, gravity: 0, drag: 0.1 });
  scene.add(dust.points);
  const dustColor = new THREE.Color('#ffffff');
  const burstSparkles = (at, n, speed) => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const up = rand(0.2, 1);
      dust.spawn(at.x + rand(-0.3, 0.3), at.y + rand(-0.2, 0.3), at.z + rand(-0.3, 0.3), Math.cos(a) * speed * rand(0.2, 1), up * speed * 0.8, Math.sin(a) * speed * rand(0.2, 1), dustColor, rand(0.5, 1.5), rand(0.9, 2));
    }
  };
  let moteTimer = 0;

  applyTheme();

  // ---------- camera orbit ----------
  const cam = { yaw: 0.35, pitch: 0.34, dist: 8.6, ty: 0.85, tyYaw: 0, tPitch: 0.34 };
  function updateCamera(dt, time) {
    const cy = cam.yaw;
    const cp = cam.pitch;
    camera.position.set(Math.sin(cy) * Math.cos(cp) * cam.dist, cam.ty + Math.sin(cp) * cam.dist, Math.cos(cy) * Math.cos(cp) * cam.dist);
    camera.lookAt(0, cam.ty - 0.05, 0);
  }

  // ---------- simulation ----------
  const K = 58;        // restoring spring
  const KN = 34;       // neighbour coupling (wave propagation)
  const C = 5.2;       // damping (slime: bouncy but not jelly)
  const KV = 26;       // volume compensation
  const KG = 150;      // grab spring
  let meanRadial = 0;
  let active = true;
  let kin = 0;         // mean speed of the grabbed region
  const grab = { on: false, id: -1, n: new THREE.Vector3(), p0: new THREE.Vector3(), plane: new THREE.Plane(), t: 0, target: new THREE.Vector3(), dent: 0, stretch: 0, moved: false, dx: 0, dy: 0, dz: 0, last: new THREE.Vector3(), pull: 0 };
  const body = { x: 0, z: 0, vx: 0, vz: 0, sy: 0, vsy: 0 };

  // give it a little drop-in wobble
  for (let i = 0; i < N; i++) V[i * 3 + 1] = -1.6 * Math.max(0, R0[i * 3 + 1] + 0.3);

  function step(h) {
    const gdent = grab.on ? grab.dent : 0;
    const tx = grab.dx, ty = grab.dy, tz = grab.dz;
    const nx = grab.n.x, ny = grab.n.y, nz = grab.n.z;
    let sumRad = 0;
    let kinSum = 0;
    let kinCnt = 0;
    const vol = -meanRadial * KV;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const s = nbrStart[i];
      const e = nbrStart[i + 1];
      const inv = 1 / (e - s);
      let sx = 0, sy = 0, sz = 0;
      for (let j = s; j < e; j++) {
        const q = nbrIdx[j] * 3;
        sx += D[q]; sy += D[q + 1]; sz += D[q + 2];
      }
      const dx = D[o], dy = D[o + 1], dz = D[o + 2];
      let ax = -K * dx + KN * (sx * inv - dx) - C * V[o] + vol * R0[o];
      let ay = -K * dy + KN * (sy * inv - dy) - C * V[o + 1] + vol * R0[o + 1];
      let az = -K * dz + KN * (sz * inv - dz) - C * V[o + 2] + vol * R0[o + 2];
      const w = gw[i];
      if (w > 0) {
        // The grabbed patch is pulled toward the pointer (stretch) and pressed in (dent).
        const gx = (tx - nx * gdent) * w;
        const gy = (ty - ny * gdent) * w;
        const gz = (tz - nz * gdent) * w;
        const kg = KG * w;
        ax += kg * (gx - dx);
        ay += kg * (gy - dy);
        az += kg * (gz - dz);
        kinSum += Math.abs(V[o]) + Math.abs(V[o + 1]) + Math.abs(V[o + 2]);
        kinCnt++;
      }
      V[o] += ax * h;
      V[o + 1] += ay * h;
      V[o + 2] += az * h;
    }
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      D[o] += V[o] * h;
      D[o + 1] += V[o + 1] * h;
      D[o + 2] += V[o + 2] * h;
      // floor: the blob can't sink below its resting plane (local y = -1)
      const floorD = -1 - R0[o + 1];
      if (D[o + 1] < floorD) { D[o + 1] = floorD; if (V[o + 1] < 0) V[o + 1] *= -0.05; }
      sumRad += D[o] * R0[o] + D[o + 1] * R0[o + 1] + D[o + 2] * R0[o + 2];
      energy += Math.abs(V[o]) + Math.abs(V[o + 1]) + Math.abs(V[o + 2]);
    }
    meanRadial = sumRad / N;
    kin = kinCnt ? kinSum / kinCnt : 0;
    return energy / N;
  }

  function writeGeometry() {
    for (let i = 0; i < N * 3; i++) P[i] = R0[i] + D[i];
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    for (const b of bubbles) {
      const o = b.vi * 3;
      b.m.position.set(b.base.x + D[o] * b.k, b.base.y + D[o + 1] * b.k, b.base.z + D[o + 2] * b.k);
    }
  }

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmpV = new THREE.Vector3();
  const rect = () => root.getBoundingClientRect();
  function setRay(px, py) {
    ndc.set((px / stage.width) * 2 - 1, -(py / stage.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  function startGrab(p) {
    setRay(p.x, p.y);
    slime.updateMatrixWorld(true);
    const hit = raycaster.intersectObject(slime, false)[0];
    if (!hit) return false;
    const local = slime.worldToLocal(hit.point.clone());
    const n = local.clone().normalize();
    grab.on = true;
    grab.id = p.id;
    grab.n.copy(n);
    grab.p0.copy(hit.point);
    grab.t = 0;
    grab.dent = 0;
    grab.moved = false;
    grab.stretch = 0;
    grab.dx = grab.dy = grab.dz = 0;
    camera.getWorldDirection(tmpV);
    grab.plane.setFromNormalAndCoplanarPoint(tmpV, hit.point);
    // weights fall off with angle from the grab point
    const sigma = 0.52;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const cos = clamp(R0[o] * n.x + R0[o + 1] * n.y + R0[o + 2] * n.z, -1, 1);
      const ang = Math.acos(cos);
      const w = Math.exp(-((ang / sigma) ** 2));
      gw[i] = w > 0.015 ? w : 0;
    }
    active = true;
    return true;
  }

  function updateGrab(dt, p) {
    grab.t += dt;
    setRay(p.x, p.y);
    if (raycaster.ray.intersectPlane(grab.plane, tmpV)) {
      grab.target.copy(tmpV);
      const dxw = tmpV.x - grab.p0.x;
      const dyw = tmpV.y - grab.p0.y;
      const dzw = tmpV.z - grab.p0.z;
      // express in the slime's local (unscaled) space, clamp the stretch length
      let lx = dxw / BASE.x, ly = dyw / BASE.y, lz = dzw / BASE.z;
      const len = Math.hypot(lx, ly, lz);
      const maxLen = 2.6;
      if (len > maxLen) { lx *= maxLen / len; ly *= maxLen / len; lz *= maxLen / len; }
      grab.dx = lx; grab.dy = ly; grab.dz = lz;
      grab.stretch = Math.min(len, maxLen);
      if (len > 0.12) grab.moved = true;
    }
    // press in while held, ease off when pulling away from the surface
    const press = 1 - Math.exp(-grab.t * 9);
    const lift = smoothstep(0.35, 1.1, grab.stretch);
    grab.dent = 0.34 * press * (1 - lift * 0.85);
  }

  function endGrab() {
    if (!grab.on) return;
    const stretch = grab.stretch;
    grab.on = false;
    gw.fill(0);
    releaseSound(stretch);
    const at = grab.p0.clone().add(new THREE.Vector3(grab.dx * BASE.x, grab.dy * BASE.y, grab.dz * BASE.z));
    if (stretch > 0.5) burstSparkles(at, Math.round(stretch * 10), 1.4 + stretch);
  }

  // ---------- input ----------
  let orbit = null;
  let ptrNow = null;
  const tracker = track(root, {
    down(p) {
      audio.unlock?.();
      ptrNow = p;
      if (!grab.on && startGrab(p)) {
        grabSound(p);
        audio.haptic?.(14);
      } else {
        orbit = { id: p.id, x: p.x, y: p.y };
      }
    },
    move(p) {
      ptrNow = p;
      if (orbit && orbit.id === p.id) {
        cam.yaw -= (p.x - orbit.x) * 0.006;
        cam.pitch = clamp(cam.pitch + (p.y - orbit.y) * 0.005, 0.06, 1.15);
        orbit.x = p.x;
        orbit.y = p.y;
      }
    },
    up(p) {
      if (grab.on && grab.id === p.id) endGrab();
      if (orbit && orbit.id === p.id) orbit = null;
    },
  });
  const onWheel = (e) => {
    e.preventDefault();
    cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.001), 5.5, 13);
  };
  root.addEventListener('wheel', onWheel, { passive: false });

  // ---------- audio ----------
  let moveLoop = null;
  let wetLoop = null;
  let pad = null;
  const padLevel = 0.05;
  if (audio.ready) {
    moveLoop = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 700, q: 5, gain: 0, send: 0.2 });
    wetLoop = audio.loop(bus, { kind: 'white', filter: 'bandpass', freq: 2200, q: 2.5, gain: 0, send: 0.15 });
    pad = new Pad(audio, bus, {
      chords: [[53, 60, 64, 69], [50, 57, 62, 65], [55, 62, 67, 71], [52, 59, 64, 67]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1300,
      period: 17,
      wave: 'triangle',
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  const panFor = (x) => clamp((x / stage.width - 0.5) * 1.5, -0.85, 0.85);

  function grabSound(p) {
    if (!audio.ready) return;
    const pan = panFor(p.x);
    const f = rand(0.85, 1.2);
    audio.burst(bus, { kind: 'pink', dur: 0.2, attack: 0.004, gain: 0.55, type: 'lowpass', freq: 1700 * f, freqEnd: 240, q: 2.2, pan, send: 0.15 });
    audio.tone(bus, { freq: 240 * f, freqEnd: 82, dur: 0.15, gain: 0.34, pan, send: 0.12 });
    audio.burst(bus, { kind: 'white', dur: 0.014, attack: 0.0004, gain: 0.26, type: 'bandpass', freq: 2600 * f, q: 4, pan, send: 0.1 });
    audio.bubble(bus, { freq: rand(280, 520), gain: 0.14, pan, dur: 0.12, rise: 1.5, delay: 0.03 });
  }

  function releaseSound(stretch) {
    if (!audio.ready) return;
    const pan = ptrNow ? panFor(ptrNow.x) : 0;
    const s = clamp(stretch / 1.5, 0, 1);
    audio.burst(bus, { kind: 'pink', dur: 0.14, gain: 0.3 + 0.2 * s, type: 'bandpass', freq: 900 + 800 * s, freqEnd: 300, q: 3, pan, send: 0.2 });
    audio.tone(bus, { freq: 160 + 260 * s, freqEnd: 70, dur: 0.18, gain: 0.3 + 0.15 * s, pan, send: 0.2 });
    audio.bubble(bus, { freq: rand(260, 480) * (1 + s * 0.6), gain: 0.2, pan, dur: 0.2, rise: 1.9 });
    // sticky separation: tiny wet "tk tk tk" as the slime lets go
    const n = 3 + Math.round(s * 5);
    for (let i = 0; i < n; i++) {
      audio.burst(bus, { kind: 'white', dur: 0.006, attack: 0.0003, gain: rand(0.05, 0.16), type: 'bandpass', freq: rand(1400, 4200), q: rand(2, 6), pan: pan + rand(-0.2, 0.2), send: 0.15, delay: 0.01 + i * rand(0.012, 0.04) });
    }
  }

  let bubbleClock = 0;
  let crackClock = 0;
  function updateAudio(dt, activity, stretch) {
    if (!audio.ready) return;
    const pan = ptrNow && grab.on ? panFor(ptrNow.x) : 0;
    moveLoop.set({ gain: 0.38 * Math.pow(activity, 1.15), freq: 380 + 1300 * activity + 500 * stretch, q: 3 + 6 * stretch, pan }, 0.03);
    wetLoop.set({ gain: 0.1 * Math.pow(activity, 1.6) * (0.4 + stretch), freq: 1700 + 1900 * stretch, pan }, 0.03);
    // bubbles popping inside the goo
    bubbleClock += dt * (3 + 24 * activity);
    while (bubbleClock > 1) {
      bubbleClock -= Math.random() * 1.8;
      audio.bubble(bus, { freq: rand(240, 1000), gain: rand(0.04, 0.12) * (0.5 + activity), pan: pan + rand(-0.3, 0.3), dur: rand(0.06, 0.14), rise: rand(1.3, 2), send: 0.3 });
    }
    // gooey strands tearing under strong stretch
    if (stretch > 0.55 && grab.on) {
      crackClock += dt * (10 + 70 * (stretch - 0.5)) * activity;
      while (crackClock > 1) {
        crackClock -= Math.random() * 1.5;
        audio.burst(bus, { kind: 'white', dur: rand(0.003, 0.009), gain: rand(0.05, 0.14), type: 'bandpass', freq: rand(1600, 5200), q: rand(2, 5), pan: pan + rand(-0.2, 0.2), send: 0.12 });
      }
    }
  }

  // ---------- HUD ----------
  hud.swatches({ colors: THEMES.map((t) => t.color), value: themeIdx, onChange: (i) => { themeIdx = i; applyTheme(true); } });
  hud.button({ label: 'Shake', title: 'Give it a jiggle', onClick: () => {
    for (let i = 0; i < N; i++) { V[i * 3 + 1] += rand(2.2, 4) * Math.max(0.2, R0[i * 3 + 1] + 0.5); V[i * 3] += rand(-1, 1); V[i * 3 + 2] += rand(-1, 1); }
    active = true;
    if (audio.ready) { audio.bubble(bus, { freq: 300, gain: 0.25, dur: 0.2 }); audio.burst(bus, { kind: 'pink', dur: 0.3, gain: 0.35, type: 'lowpass', freq: 1200, freqEnd: 200, q: 2 }); }
  } });
  hud.setHint('Press, pull and stretch the slime. Drag the background to look around.');

  // ---------- frame ----------
  let activitySm = 0;
  let stretchSm = 0;
  let lastTarget = new THREE.Vector3();
  const loop = createLoop((dt, time) => {
    if (grab.on && ptrNow) updateGrab(dt, ptrNow);

    let energy = 0;
    if (active || grab.on) {
      const sub = Math.min(4, Math.max(1, Math.ceil(dt / 0.008)));
      const h = dt / sub;
      for (let s = 0; s < sub; s++) energy = step(h);
      writeGeometry();
      if (!grab.on && energy < 0.0008 && Math.abs(meanRadial) < 0.0004) active = false;
    }

    // whole-body response: squash when pressed, shuffle toward the pull
    const press = grab.on ? grab.dent / 0.34 : 0;
    const tSy = -0.07 * press - (grab.on ? 0.05 * Math.min(1, grab.stretch) : 0);
    body.vsy += ((tSy - body.sy) * 110 - body.vsy * 9) * dt;
    body.sy += body.vsy * dt;
    const tx = grab.on ? grab.dx * 0.1 : 0;
    const tz = grab.on ? grab.dz * 0.1 : 0;
    body.vx += ((tx - body.x) * 90 - body.vx * 8) * dt;
    body.vz += ((tz - body.z) * 90 - body.vz * 8) * dt;
    body.x += body.vx * dt;
    body.z += body.vz * dt;
    const breathe = Math.sin(time * 1.4) * 0.004;
    slime.scale.set(BASE.x * (1 - body.sy * 0.45 + breathe), BASE.y * (1 + body.sy + breathe * 0.5), BASE.z * (1 - body.sy * 0.45 + breathe));
    slime.position.set(body.x, BASE.y * (1 + body.sy) * 1.0, body.z);
    const sh = 2.7 * (1 - body.sy * 0.45) * (1 + meanRadial * -0.2);
    shadow.scale.set(sh * 1.15, sh * 1.15, 1);
    shadow.material.opacity = 0.42 + 0.1 * press;

    // audio activity = pointer speed in world units + how fast the goo is moving
    let ptrSpeed = 0;
    if (grab.on) {
      ptrSpeed = grab.target.distanceTo(lastTarget) / Math.max(dt, 1e-3);
      lastTarget.copy(grab.target);
    }
    const act = grab.on ? clamp(ptrSpeed * 0.16 + kin * 0.08, 0, 1) : clamp(energy * 0.5, 0, 0.35);
    activitySm += (act - activitySm) * (1 - Math.exp(-(act > activitySm ? 18 : 6) * dt));
    stretchSm += ((grab.on ? grab.stretch : 0) - stretchSm) * (1 - Math.exp(-10 * dt));
    updateAudio(dt, activitySm, stretchSm);

    // ambient motes
    moteTimer -= dt;
    if (moteTimer <= 0) {
      moteTimer = rand(0.12, 0.35);
      dust.spawn(rand(-3.5, 3.5), rand(0.1, 0.6), rand(-3, 2), rand(-0.05, 0.05), rand(0.08, 0.22), rand(-0.05, 0.05), dustColor, rand(0.4, 1.1), rand(5, 9));
    }
    dust.update(dt, stage.height, 30);

    updateCamera(dt, time);
    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      root.removeEventListener('wheel', onWheel);
      moveLoop?.stop(0.1);
      wetLoop?.stop(0.1);
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      shadowTex.dispose();
      bubbleGeo.dispose();
      stage.dispose();
    },
  };
}
