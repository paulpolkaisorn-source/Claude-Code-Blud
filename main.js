import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Woofer, DRIVER, ENCLOSURES, wattsToPeakVolts, bl } from './physics.js';

const MODEL_URL = './assets/sundown-inhuman-18.glb';
const $ = (id) => document.getElementById(id);

// ───────────────────────────── UI state ─────────────────────────────
const ui = { freq: 30, watts: 1500, on: true, speed: 'auto', exag: 1, enc: 'free', sound: false, cutaway: false };

const FREQ_MIN = 1, FREQ_MAX = 1000, PWR_MIN = 1, PWR_MAX = 20000;
const logMap = (t, lo, hi) => lo * Math.pow(hi / lo, t / 1000);
const logUnmap = (v, lo, hi) => (1000 * Math.log(v / lo)) / Math.log(hi / lo);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ───────────────────────────── physics ─────────────────────────────
const woofer = new Woofer();
const H = woofer.h;
const RING = Math.round(4 / H); // 4 s of history
const histX = new Float32Array(RING);
const histV = new Float32Array(RING);
let histW = 0;

const peak = { x: 0, v: 0, a: 0, i: 0, blMin: DRIVER.Bl0 };
let hitFlashUntil = 0;
let pendingHits = 0;
let pendingHitSpeed = 0;
let stepCarry = 0;

function onStep(w) {
  const k = peak.decay;
  const ax = Math.abs(w.x);
  peak.x = ax > peak.x ? ax : peak.x * k;
  const av = Math.abs(w.v);
  peak.v = av > peak.v ? av : peak.v * k;
  const aa = Math.abs(w.a);
  peak.a = aa > peak.a ? aa : peak.a * k;
  const ai = Math.abs(w.i);
  peak.i = ai > peak.i ? ai : peak.i * k;
  histX[histW] = w.x;
  histV[histW] = w.Vout;
  histW = histW + 1 === RING ? 0 : histW + 1;
  if (w.stopHit) {
    pendingHits++;
    if (w.stopSpeed > pendingHitSpeed) pendingHitSpeed = w.stopSpeed;
  }
}

function playbackScale() {
  if (ui.speed === 'auto') return Math.min(1, 2.5 / ui.freq); // show ≤ 2.5 strokes per second
  return parseFloat(ui.speed);
}

// ───────────────────────────── three.js scene ─────────────────────────────
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(1.2, 1.6, 2);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc4ff, 1.1);
rim.position.set(-1.5, 0.4, -1);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 20);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.35;
controls.maxDistance = 4;

const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
const home = { target: new THREE.Vector3(), pos: new THREE.Vector3() };
const camGoal = { target: new THREE.Vector3(), pos: new THREE.Vector3(), t: 1 };

function resize() {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

// moving parts, filled once the model is loaded
const rigid = []; // objects that translate with the cone
const bendUniform = { value: 0 }; // displacement (model units = mm) used by the surround/spider shader
const allMaterials = new Set();
let modelRoot = null;
const rootBase = new THREE.Vector3();

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Surround and spider are anchored at their outer edge (frame / basket) and ride with the
// cone at their inner edge, so they flex instead of sliding as a rigid ring.
function makeFlexible(obj, rIn, rOut) {
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    const w = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) w[i] = 1 - smooth(rIn, rOut, Math.hypot(pos.getX(i), pos.getZ(i)));
    m.geometry.setAttribute('aW', new THREE.BufferAttribute(w, 1));
    const mat = m.material.clone();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBend = bendUniform;
      shader.vertexShader =
        'attribute float aW;\nuniform float uBend;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += aW * uBend;');
    };
    mat.customProgramCacheKey = () => 'woofer-bend';
    m.material = mat;
    m.frustumCulled = false;
  });
}

function frameModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  root.position.sub(c); // centre on origin
  rootBase.copy(root.position);
  clipPlane.constant = 0;
  const d = Math.max(size.x, size.y) * 1.9 + size.z * 0.6;
  home.target.set(0, 0, 0);
  home.pos.set(d * 0.52, d * 0.3, d * 0.88);
  camera.position.copy(home.pos);
  controls.target.copy(home.target);
  controls.maxDistance = d * 3;
  controls.minDistance = d * 0.3;
  controls.update();
}

function flyTo(pos, target) {
  camGoal.pos.copy(pos);
  camGoal.target.copy(target);
  camGoal.t = 0;
}

function onModelLoaded(gltf) {
  const root = gltf.scene;
  const find = (name) => {
    let hit = null;
    root.traverse((o) => { if (!hit && o.name === name) hit = o; });
    return hit;
  };
  const missing = [];
  for (const n of ['cone', 'cone_back', 'dust_cap', 'dust_cap_rim', 'voice_coil_former', 'surround_glue_lip']) {
    const o = find(n);
    if (o) rigid.push(o); else missing.push(n);
  }
  const surround = find('surround');
  const spider = find('spider');
  if (surround) makeFlexible(surround, 160, 214); else missing.push('surround');
  if (spider) makeFlexible(spider, 66, 160); else missing.push('spider');
  if (missing.length) console.warn('GLB parts not found:', missing.join(', '));

  root.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => allMaterials.add(m));
  });
  scene.add(root);
  modelRoot = root;
  frameModel(root);
  resize();
  $('loader').classList.add('done');
  setTimeout(() => $('loader').remove(), 600);
}

function onModelError(err) {
  $('loader').hidden = true;
  $('loadError').hidden = false;
  $('errDetail').textContent = String(err && err.message ? err.message : err);
}

function loadModel() {
  const loader = new GLTFLoader();
  const embedded = document.getElementById('glbData'); // present in the standalone build
  if (embedded) {
    const bin = atob(embedded.textContent.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    loader.parse(bytes.buffer, '', onModelLoaded, onModelError);
    return;
  }
  loader.load(
    MODEL_URL,
    onModelLoaded,
    (e) => {
      if (!e.total) return;
      const p = Math.round((100 * e.loaded) / e.total);
      $('loadBar').style.width = p + '%';
      $('loadPct').textContent = p + '%';
    },
    onModelError
  );
}

// ───────────────────────────── sound ─────────────────────────────
let audio = null; // { ctx, osc, gain, noiseBuf }
function startAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.35; // hard cap
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain).connect(master);
  osc.start();
  const nb = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio = { ctx, osc, gain, master, noiseBuf: nb };
}
function stopAudio() {
  if (!audio) return;
  audio.gain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03);
  const a = audio;
  audio = null;
  setTimeout(() => a.ctx.close(), 200);
}
function updateAudio() {
  if (!audio) return;
  const t = audio.ctx.currentTime;
  audio.osc.frequency.setTargetAtTime(ui.freq, t, 0.03);
  // radiated pressure follows volume acceleration of cone (+port); map to a comfy level
  const level = DRIVER.Sd * peak.a; // m^3/s^2
  const db = 20 * Math.log10(Math.max(level, 1e-3));
  const ear = Math.min(1, Math.pow(ui.freq / 80, 0.8)); // equal-loudness: very low notes are barely heard
  const g = clamp((db + 5) / 55, 0, 1) * ear;
  audio.gain.gain.setTargetAtTime(g * g, t, 0.04);
}
function thump(speed) {
  if (!audio) return;
  const { ctx, master, noiseBuf } = audio;
  const t = ctx.currentTime;
  const amp = clamp(speed / 6, 0.15, 1);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(amp * 0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  const og = ctx.createGain();
  og.gain.setValueAtTime(amp, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.2);
}

// ───────────────────────────── controls ─────────────────────────────
const freqRange = $('freqRange'), freqNum = $('freqNum');
const pwrRange = $('pwrRange'), pwrNum = $('pwrNum');
const fmtFreq = (f) => (f >= 100 ? String(Math.round(f)) : String(Math.round(f * 10) / 10));

function setFreq(f, from) {
  ui.freq = clamp(f, FREQ_MIN, FREQ_MAX);
  if (from !== 'range') freqRange.value = logUnmap(ui.freq, FREQ_MIN, FREQ_MAX);
  if (from !== 'num') freqNum.value = fmtFreq(ui.freq);
  peak.decay = Math.exp(-H * Math.max(ui.freq, 1) / 1.5); // peak hold decays over ~1.5 cycles
  document.querySelectorAll('#freqChips button').forEach((b) => b.classList.toggle('active', parseFloat(b.dataset.v) === ui.freq));
}
function setPower(w, from) {
  ui.watts = clamp(w, PWR_MIN, PWR_MAX);
  if (from !== 'range') pwrRange.value = logUnmap(ui.watts, PWR_MIN, PWR_MAX);
  if (from !== 'num') pwrNum.value = String(Math.round(ui.watts));
  document.querySelectorAll('#pwrChips button').forEach((b) => b.classList.toggle('active', parseFloat(b.dataset.v) === Math.round(ui.watts)));
  $('pwrHint').textContent = `${wattsToPeakVolts(ui.watts).toFixed(1)} V peak into ${DRIVER.Znom} Ω nominal`;
}

freqRange.addEventListener('input', () => setFreq(Math.round(logMap(+freqRange.value, FREQ_MIN, FREQ_MAX) * 10) / 10, 'range'));
freqNum.addEventListener('input', () => { const v = parseFloat(freqNum.value); if (Number.isFinite(v)) setFreq(v, 'num'); });
freqNum.addEventListener('change', () => setFreq(parseFloat(freqNum.value) || ui.freq));
pwrRange.addEventListener('input', () => setPower(Math.round(logMap(+pwrRange.value, PWR_MIN, PWR_MAX)), 'range'));
pwrNum.addEventListener('input', () => { const v = parseFloat(pwrNum.value); if (Number.isFinite(v)) setPower(v, 'num'); });
pwrNum.addEventListener('change', () => setPower(parseFloat(pwrNum.value) || ui.watts));

for (const f of [1, 5, 10, 20, 32, 40, 60, 100, 250, 500, 1000]) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.v = f; b.textContent = f;
  b.addEventListener('click', () => setFreq(f));
  $('freqChips').append(b);
}
for (const [w, label] of [[10, '10'], [100, '100'], [500, '500'], [1000, '1 k'], [2500, '2.5 k'], [5000, '5 k'], [10000, '10 k'], [20000, '20 k']]) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.v = w; b.textContent = label;
  b.addEventListener('click', () => setPower(w));
  $('pwrChips').append(b);
}

const encHints = {
  free: 'No box: nothing but the suspension resists the cone, so low notes move it the most.',
  sealed: 'Trapped air acts as a second spring: stiffer, less excursion at low frequencies.',
  ported: 'The port resonates at 32 Hz and does the work there, so the cone barely moves at the tuning.',
};
for (const [k, e] of Object.entries(ENCLOSURES)) {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.k = k;
  b.textContent = k === 'free' ? 'Free air' : k === 'sealed' ? 'Sealed' : 'Ported';
  b.title = e.label;
  b.addEventListener('click', () => setEnclosure(k));
  $('encSeg').append(b);
}
function setEnclosure(k) {
  ui.enc = k;
  woofer.setEnclosure(k);
  document.querySelectorAll('#encSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.k === k)));
  $('encHint').textContent = `${ENCLOSURES[k].label}. ${encHints[k]}`;
}

function setDrive(on) {
  ui.on = on;
  const b = $('driveBtn');
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', String(on));
  $('driveLabel').textContent = on ? 'Signal ON' : 'Signal OFF (cone rings down)';
}
$('driveBtn').addEventListener('click', () => setDrive(!ui.on));
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    setDrive(!ui.on);
  }
});

$('speedSel').addEventListener('change', (e) => { ui.speed = e.target.value; });
$('exagSel').addEventListener('change', (e) => { ui.exag = parseFloat(e.target.value); });
$('resetView').addEventListener('click', () => flyTo(home.pos, home.target));
$('soundToggle').addEventListener('change', (e) => {
  ui.sound = e.target.checked;
  if (ui.sound) startAudio(); else stopAudio();
});
$('cutToggle').addEventListener('change', (e) => {
  ui.cutaway = e.target.checked;
  renderer.clippingPlanes = ui.cutaway ? [clipPlane] : [];
  allMaterials.forEach((m) => {
    if (m.userData.side0 === undefined) m.userData.side0 = m.side;
    m.side = ui.cutaway ? THREE.DoubleSide : m.userData.side0;
    m.needsUpdate = true;
  });
  if (ui.cutaway) {
    // look at the cut face from the side
    const d = home.pos.length();
    flyTo(new THREE.Vector3(d * 0.98, d * 0.2, d * 0.32), home.target);
  } else {
    flyTo(home.pos, home.target);
  }
});

// Xmax / stop markers on the meter (meter spans 0 … stop+10 %)
const METER_MAX = Math.max(-DRIVER.xStopIn, DRIVER.xStopOut) * 1.1;
$('meterFill').parentElement.style.setProperty('--xmax-pos', (100 * DRIVER.Xmax) / METER_MAX + '%');
$('meterFill').parentElement.style.setProperty('--stop-pos', (100 * DRIVER.xStopOut) / METER_MAX + '%');

setFreq(ui.freq);
setPower(ui.watts);
setEnclosure(ui.enc);
setDrive(ui.on);

// ───────────────────────────── readouts + scope ─────────────────────────────
const scope = $('scope');
const sctx = scope.getContext('2d');
const css = getComputedStyle(document.documentElement);
const col = (n) => css.getPropertyValue(n).trim();

const fmtLen = (m) => (m >= 0.0995e-3 ? (m * 1000).toFixed(1) + ' mm' : (m * 1e6).toFixed(0) + ' µm');

function updateReadouts() {
  const x = peak.x;
  $('rdX').textContent = '±' + fmtLen(x);
  $('rdPct').textContent = Math.round((100 * x) / DRIVER.Xmax) + ' %';
  $('rdV').textContent = peak.v.toFixed(peak.v < 10 ? 2 : 1) + ' m/s';
  $('rdA').textContent = (peak.a / 9.81).toFixed(peak.a / 9.81 < 100 ? 1 : 0) + ' g';
  $('rdI').textContent = peak.i.toFixed(peak.i < 10 ? 1 : 0) + ' A';
  $('rdBl').textContent = Math.round((100 * bl(x)) / DRIVER.Bl0) + ' %';
  const f = $('meterFill');
  f.style.width = clamp((100 * x) / METER_MAX, 0, 100) + '%';
  const now = performance.now();
  let level, text;
  if (now < hitFlashUntil) { level = 'bottom'; text = 'BOTTOMING OUT, the cone is hitting its stops'; }
  else if (x > DRIVER.Xmax) { level = 'warn'; text = 'Past Xmax: coil leaving the gap, distortion climbing'; }
  else if (x < 5e-5 && !ui.on) { level = 'idle'; text = 'At rest'; }
  else { level = 'ok'; text = 'Linear: inside Xmax'; }
  f.style.background = level === 'bottom' ? col('--danger') : x > DRIVER.Xmax * 1.5 ? col('--hot') : x > DRIVER.Xmax ? col('--warn') : col('--accent');
  $('statusChip').dataset.level = level;
  $('statusText').textContent = text;

  const s = playbackScale();
  $('speedNote').textContent =
    (s < 0.999 ? `Slow motion: 1/${Math.round(1 / s)} speed` : 'Real time') +
    (ui.exag > 1 ? ` · motion ×${ui.exag}` : '') +
    (s >= 0.999 && ui.freq > 30 ? ' · too fast for the screen, expect strobing' : '');
}

function drawScope() {
  const W = scope.width, Hh = scope.height;
  sctx.clearRect(0, 0, W, Hh);
  const yRange = 0.075; // ±75 mm full scale
  const mid = Hh / 2;
  const sy = (v) => mid - (v / yRange) * (mid - 6);
  // limit lines
  sctx.lineWidth = 1;
  sctx.font = '10px ui-monospace, monospace';
  const line = (v, color, dash, label) => {
    sctx.strokeStyle = color; sctx.setLineDash(dash);
    sctx.beginPath(); sctx.moveTo(0, sy(v)); sctx.lineTo(W, sy(v)); sctx.stroke();
    sctx.setLineDash([]);
    sctx.fillStyle = color; sctx.fillText(label, 4, sy(v) - 3);
  };
  line(0, 'rgba(255,255,255,.14)', [], '');
  line(DRIVER.Xmax, col('--warn'), [4, 4], '+Xmax');
  line(-DRIVER.Xmax, col('--warn'), [4, 4], '-Xmax');
  line(DRIVER.xStopOut, col('--danger'), [2, 3], 'stop');
  line(DRIVER.xStopIn, col('--danger'), [2, 3], 'stop');

  const win = Math.min(3.99, 3 / ui.freq); // show 3 cycles (max 4 s of history)
  const n = Math.round(win / H);
  const start = histW - n;
  const at = (arr, i) => arr[(((start + i) % RING) + RING) % RING];

  // drive voltage (normalised to ~half scale)
  const vmax = Math.max(wattsToPeakVolts(ui.watts), 1);
  sctx.strokeStyle = col('--v'); sctx.globalAlpha = 0.6; sctx.lineWidth = 1.5;
  trace((i) => (at(histV, i) / vmax) * 0.035, n, W, sy);
  sctx.globalAlpha = 1;
  sctx.strokeStyle = col('--x'); sctx.lineWidth = 2;
  trace((i) => at(histX, i), n, W, sy);

  $('scopeSpan').textContent = 'window: ' + (win < 0.1 ? (win * 1000).toFixed(1) + ' ms' : win.toFixed(2) + ' s') + ' (3 cycles)';
}

function trace(get, n, W, sy) {
  sctx.beginPath();
  if (n <= W * 2) {
    for (let i = 0; i < n; i++) {
      const X = (i / (n - 1)) * W;
      i ? sctx.lineTo(X, sy(get(i))) : sctx.moveTo(X, sy(get(i)));
    }
  } else {
    const cols = W;
    for (let c = 0; c < cols; c++) {
      const i0 = Math.floor((c * n) / cols), i1 = Math.max(i0 + 1, Math.floor(((c + 1) * n) / cols));
      let lo = Infinity, hi = -Infinity;
      for (let i = i0; i < i1; i++) { const v = get(i); if (v < lo) lo = v; if (v > hi) hi = v; }
      c ? sctx.lineTo(c, sy(hi)) : sctx.moveTo(c, sy(hi));
      sctx.lineTo(c, sy(lo));
    }
  }
  sctx.stroke();
}

// ───────────────────────────── main loop ─────────────────────────────
let last = performance.now();
let readoutT = 0;
let shake = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // 1) advance the physics by exactly the simulated time this frame represents
  stepCarry += (dt * playbackScale()) / H;
  let steps = Math.floor(stepCarry);
  stepCarry -= steps;
  steps = Math.min(steps, 4000);
  if (steps > 0) woofer.advance(steps, { freq: ui.freq, volts: wattsToPeakVolts(ui.watts), on: ui.on }, onStep);

  if (pendingHits) {
    hitFlashUntil = now + 900;
    shake = Math.max(shake, Math.min(1, pendingHitSpeed / 8));
    thump(pendingHitSpeed);
    pendingHits = 0;
    pendingHitSpeed = 0;
  }

  // 2) pose the model
  const xmm = clamp(woofer.x * 1000 * ui.exag, -75, 70);
  for (const o of rigid) o.position.y = xmm;
  bendUniform.value = xmm;
  if (modelRoot) {
    shake *= Math.pow(0.001, dt); // decays in ~0.3 s
    modelRoot.position.set(
      rootBase.x + (Math.random() - 0.5) * 0.006 * shake,
      rootBase.y + (Math.random() - 0.5) * 0.006 * shake,
      rootBase.z + (Math.random() - 0.5) * 0.006 * shake
    );
  }

  // 3) camera fly-to
  if (camGoal.t < 1) {
    camGoal.t = Math.min(1, camGoal.t + dt / 0.7);
    const e = camGoal.t * camGoal.t * (3 - 2 * camGoal.t);
    camera.position.lerp(camGoal.pos, 0.02 + 0.18 * e);
    controls.target.lerp(camGoal.target, 0.02 + 0.18 * e);
  }
  controls.update();

  renderer.render(scene, camera);

  updateAudio();
  readoutT += dt;
  if (readoutT > 0.1) { readoutT = 0; updateReadouts(); drawScope(); }
}

loadModel();
resize();
requestAnimationFrame(frame);

// small hook so the page can be inspected / tested from the console
window.woofer = { woofer, ui, peak, setFreq, setPower, setDrive, setEnclosure };
