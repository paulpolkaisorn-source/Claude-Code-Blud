// Clawd Physics Playground
// A 3D physics sandbox: you are Clawd, with Roblox-style controls on PC and mobile.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const $ = (id) => document.getElementById(id);
const view = $('view');
const pad = $('pad');

function fatal(msg) {
  const el = $('error');
  el.textContent = msg;
  el.hidden = false;
}

const isCoarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ───────────────────────────── Icons and buttons ─────────────────────────────
const ICONS = {
  star: '<path class="fill" d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>',
  fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  'fullscreen-exit': '<path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5"/>',
  settings: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="5.5"/><path d="M7 10.5v4M5 12.5h4"/><circle class="fill" cx="15.5" cy="11.5" r="1.2"/><circle class="fill" cx="18" cy="14" r="1.2"/>',
  clawd: '<rect x="5" y="6" width="14" height="9" rx="1"/><path d="M3 10h2M19 10h2M7.5 15v4M10.5 15v4M13.5 15v4M16.5 15v4"/><path d="M9.5 9v2.5M14.5 9v2.5"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
  jump: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
  grab: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4.3-2.5L4.9 14a1.4 1.4 0 0 1 2.3-1.6L8 13.5"/>',
  throw: '<path d="M4 19C5 11 10 6 19 6"/><path d="M14 3l5 3-3 5"/>',
  ride: '<path d="M3 15l2-5h10l5 3v3H3z"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  exit: '<path d="M10 4H5v16h5M14 8l4 4-4 4M9 12h9"/>',
  bolt: '<path class="fill" d="M13.5 2L5 13.5h5.5L9.5 22 19 10h-5.5z"/>',
  flag: '<path d="M5 21V4"/><path class="fill" d="M5 4h12l-2.5 4L17 12H5z"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  home: '<path d="M3 11.5l9-8 9 8"/><path d="M6 10v10h12V10"/>',
  pointer: '<path class="fill" d="M12 3l8 17-8-4.5L4 20z"/>',
  crate: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 4l16 16M20 4L4 20"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M4.5 9c5 3 10 3 15 0M4.5 15c5-3 10-3 15 0"/>',
  plank: '<rect x="2" y="8.5" width="20" height="7" rx="1"/><path d="M8 8.5v7M15 8.5v7"/>',
  barrel: '<rect x="6" y="3" width="12" height="18" rx="4"/><path d="M6 9h12M6 15h12"/>',
  bigball: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="4"/>',
  balloon: '<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v1.5M12 17.5c-2 1.5 2 2.5 0 4.5"/>',
  tnt: '<rect x="4.5" y="9" width="15" height="11" rx="1.5"/><path d="M8.5 14.5h7M12 9V6.5c0-2 3-1.5 3.5-3.5"/>',
  anvil: '<path d="M3 7h15v3c-3 0-4.5 2-4.5 4.5H17V18H6v-3.500h3.500C9.500 11 7 10 3 10z"/>',
};
const iconSvg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
function setIcon(el, name) {
  if (el.dataset.shown === name) return;
  el.dataset.shown = name;
  el.innerHTML = iconSvg(name);
}
for (const el of document.querySelectorAll('[data-icon]')) setIcon(el, el.dataset.icon);
function makeIcon(name) {
  const span = document.createElement('span');
  span.className = 'ico';
  setIcon(span, name);
  return span;
}
function popAnim(el) {
  el.classList.remove('pop');
  void el.offsetWidth; // restart the animation
  el.classList.add('pop');
}
// tap(): a button press that works for every finger at once. Browsers only send `click` for the first
// finger on the screen, so a thumb on the joystick used to block every other button.
// when = 'down' fires the instant it is touched; 'up' fires on release (needed for full screen and sound).
function tap(el, fn, when = 'up') {
  const active = new Set();
  let lastPointer = -1e9;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active.add(e.pointerId);
    el.classList.add('down');
    try { el.setPointerCapture(e.pointerId); } catch { /* ok */ }
    if (when === 'down') { e.preventDefault(); lastPointer = performance.now(); popAnim(el); fn(e); }
  });
  const end = (e, fire) => {
    if (!active.delete(e.pointerId)) return;
    if (!active.size) el.classList.remove('down');
    lastPointer = performance.now();
    if (!fire || when !== 'up') return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
    popAnim(el); fn(e);
  };
  el.addEventListener('pointerup', (e) => end(e, true));
  el.addEventListener('pointercancel', (e) => end(e, false));
  el.addEventListener('click', (e) => { // keyboard and assistive tech
    if (performance.now() - lastPointer < 700) return;
    popAnim(el); fn(e);
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ───────────────────────────── Settings ─────────────────────────────
const SETTINGS_KEY = 'clawd-playground-settings-v1';
const PRESETS = {
  low: { scale: 60, shadows: 'off', view: 'near', aa: false, particles: false, scenery: false },
  medium: { scale: 80, shadows: 'low', view: 'medium', aa: false, particles: true, scenery: true },
  high: { scale: 100, shadows: 'high', view: 'far', aa: true, particles: true, scenery: true },
  ultra: { scale: 100, shadows: 'ultra', view: 'far', aa: true, particles: true, scenery: true },
};
const DEFAULTS = {
  preset: isCoarse ? 'medium' : 'high', ...PRESETS[isCoarse ? 'medium' : 'high'],
  time: 'day', fov: 70, fps: false, shake: true,
  sound: true, sens: 100, invertY: false,
  gravity: 'normal', slowmo: false, doubleJump: true,
  color: '#d97757', hat: 'none',
};
const settings = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) settings[k] = saved[k];
  }
} catch { /* storage unavailable: defaults are fine */ }
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ok */ }
}

// ───────────────────────────── Tunables ─────────────────────────────
const FIXED = 1 / 60;
const GRAVITY = -30;
const GRAVITY_MULT = { moon: 0.3, normal: 1, heavy: 1.7 };
const PLAYER_R = 0.75;
const WALK_SPEED = 8;
const SPRINT_SPEED = 13;
const JUMP_SPEED = 13;
const GROUND_ACCEL = 90;
const AIR_ACCEL = 45;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.15;
const SPAWN = new CANNON.Vec3(0, 2, 0);
const BOT_IT_SPEED = 9.4, BOT_RUN_SPEED = 8.3;
const G_STATIC = 1, G_PLAYER = 2, G_PROP = 4;
const MAX_SPAWNED = 120;
const DYNAMIC = CANNON.Body.DYNAMIC, KINEMATIC = CANNON.Body.KINEMATIC, STATIC = CANNON.Body.STATIC;
const SLEEPING = CANNON.Body.SLEEPING;

// ───────────────────────────── Scene ─────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3ff);
scene.fog = new THREE.Fog(0x8fd3ff, 80, 260);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);

const hemi = new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
sun.shadow.camera.left = -42; sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const sunOffset = new THREE.Vector3(22, 48, 16);
const flash = new THREE.PointLight(0xffb347, 0, 40, 1.6);
scene.add(flash);

// ───────────────────────────── Renderer (rebuilt when antialiasing changes) ─────────────────────────────
let renderer = null, canvas = null;
const applied = { aa: null, shadows: null };

function resize() {
  if (!renderer) return;
  const w = view.clientWidth || window.innerWidth;
  const h = view.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function buildRenderer(aa) {
  const c = document.createElement('canvas');
  let r;
  try {
    r = new THREE.WebGLRenderer({ canvas: c, antialias: aa, powerPreference: 'high-performance' });
  } catch (err) {
    if (!renderer) {
      fatal('This game needs WebGL, and your browser could not start it. Try another browser or turn on hardware acceleration.');
      throw err;
    }
    return false; // keep the renderer we have
  }
  const old = renderer, oldCanvas = canvas;
  renderer = r; canvas = c;
  if (old) {
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    old.dispose();
    old.forceContextLoss();
    oldCanvas.remove();
  }
  view.appendChild(c);
  c.addEventListener('webglcontextlost', (e) => {
    if (e.target !== canvas) return;
    e.preventDefault();
    fatal('The graphics context was lost. Reload the page to keep playing.');
  });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  applied.aa = aa;
  applied.shadows = null; // force the shadow settings to be re-applied
  resize();
  return true;
}
buildRenderer(settings.aa);
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(view);

// ───────────────────────────── Physics world ─────────────────────────────
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 12;

const matWorld = new CANNON.Material('world');
const matPlayer = new CANNON.Material('player');
const matBouncy = new CANNON.Material('bouncy');
const matIce = new CANNON.Material('ice');
const matSteel = new CANNON.Material('steel');
const matKart = new CANNON.Material('kart');
world.defaultContactMaterial.friction = 0.45;
world.defaultContactMaterial.restitution = 0.05;
const contact = (a, b, friction, restitution) => world.addContactMaterial(new CANNON.ContactMaterial(a, b, { friction, restitution }));
contact(matWorld, matWorld, 0.45, 0.05);
for (const m of [matWorld, matBouncy, matIce, matSteel, matKart, matPlayer]) contact(matPlayer, m, 0, 0);
contact(matBouncy, matWorld, 0.3, 0.65);
contact(matBouncy, matBouncy, 0.3, 0.65);
for (const m of [matWorld, matBouncy, matIce, matSteel, matKart]) contact(matIce, m, 0.005, 0.2);
contact(matSteel, matSteel, 0.1, 0.94);
contact(matSteel, matWorld, 0.3, 0.3);
for (const m of [matWorld, matBouncy, matSteel, matKart]) contact(matKart, m, 0, 0.05); // grip is handled by the kart code

// ───────────────────────────── Object helpers ─────────────────────────────
const synced = [];   // { mesh, body } pairs that move
const props = [];    // dynamic props that are part of the level (restored on Reset)
const spawned = [];  // props the player spawned (removed on Reset)
const movers = [];   // kinematic platforms: { body, path(t, outVec3) }
const ropes = [];    // visual ropes: { mesh, a, b } with endpoints { v } or { mesh, local }
const links = [];    // balloon strings: { constraint, rope, a, b }

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
const matCache = new Map();
function lambert(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

function finishBody(body, mesh, o) {
  if (o.rot) {
    body.quaternion.setFromEuler(o.rot[0], o.rot[1], o.rot[2]);
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
  }
  mesh.traverse((m) => { if (m.isMesh) { m.castShadow = o.castShadow !== false; m.receiveShadow = true; } });
  scene.add(mesh);
  world.addBody(body);
  const entry = { mesh, body, fuse: Infinity };
  body.entry = entry;
  if (body.type !== STATIC) synced.push(entry);
  if (body.type === DYNAMIC) {
    if (o.spawned) entry.spawned = true;
    else {
      entry.home = { p: body.position.clone(), q: body.quaternion.clone() };
      props.push(entry);
    }
  }
  return entry;
}

function bodyOpts(o) {
  const mass = o.mass || 0;
  const body = {
    mass,
    material: o.material || matWorld,
    position: new CANNON.Vec3(o.pos[0], o.pos[1], o.pos[2]),
    collisionFilterGroup: mass > 0 ? G_PROP : G_STATIC,
    collisionFilterMask: -1,
  };
  if (o.kinematic) { body.type = KINEMATIC; body.mass = 0; }
  if (mass > 0) {
    body.linearDamping = 0.05;
    body.angularDamping = 0.1;
    body.sleepSpeedLimit = 0.25;
    body.sleepTimeLimit = 0.6;
  }
  return body;
}

function addBox(o) {
  const [sx, sy, sz] = o.size;
  const body = new CANNON.Body(bodyOpts(o));
  body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
  const mesh = new THREE.Mesh(boxGeo, o.mat || lambert(o.color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  return finishBody(body, mesh, o);
}

function addBall(o) {
  const body = new CANNON.Body(bodyOpts(o));
  body.addShape(new CANNON.Sphere(o.r));
  if (o.mass > 0) body.angularDamping = 0.25;
  const mesh = new THREE.Mesh(sphereGeo, o.mat || lambert(o.color));
  mesh.scale.setScalar(o.r);
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  return finishBody(body, mesh, o);
}

const cylGeoCache = new Map();
function addCylinder(o) {
  const body = new CANNON.Body(bodyOpts(o));
  body.addShape(new CANNON.Cylinder(o.r, o.r, o.h, o.segments || 14));
  const key = `${o.r}|${o.h}`;
  if (!cylGeoCache.has(key)) cylGeoCache.set(key, new THREE.CylinderGeometry(o.r, o.r, o.h, 20));
  const mesh = new THREE.Mesh(cylGeoCache.get(key), o.mat || lambert(o.color));
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  return finishBody(body, mesh, o);
}

function anchorAt(x, y, z) {
  const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, y, z) });
  b.collisionFilterGroup = 0; b.collisionFilterMask = 0;
  world.addBody(b);
  return b;
}

const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
function addRope(a, b, color = 0x2a1a14) {
  const mesh = new THREE.Mesh(ropeGeo, lambert(color));
  scene.add(mesh);
  const rope = { mesh, a, b };
  ropes.push(rope);
  return rope;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function checkerTexture(a, b) {
  const t = canvasTexture(64, 64, (g) => {
    g.fillStyle = a; g.fillRect(0, 0, 64, 64);
    g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

// ───────────────────────────── Level ─────────────────────────────
const GROUND = 240;
{
  const tex = checkerTexture('#7cc36a', '#74ba63');
  tex.repeat.set(GROUND / 8, GROUND / 8);
  const groundMats = [0, 1, 2, 3, 4, 5].map((i) =>
    i === 2 ? new THREE.MeshLambertMaterial({ map: tex }) : lambert(0x8a6a4a));
  addBox({ size: [GROUND, 4, GROUND], pos: [0, -2, 0], mat: groundMats, castShadow: false });
}

const CRATE_COLORS = [0xe9b872, 0xd9a35f, 0xf0c98a];
const TOY_COLORS = [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xb983ff, 0xff9f45, 0x4dd4c6];
const STONE = 0xf4f1de, STEEL = 0x6b7280, DARK = 0x374151;

const tntTex = canvasTexture(128, 128, (g) => {
  g.fillStyle = '#e03131'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff7ef'; g.fillRect(0, 40, 128, 48);
  g.fillStyle = '#2a1a14'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TNT', 64, 66);
});
const tntMat = new THREE.MeshLambertMaterial({ map: tntTex });
function addTNT(pos, isSpawned) {
  const e = addBox({ size: [1.1, 1.1, 1.1], mass: 1.2, pos, mat: tntMat, spawned: isSpawned });
  e.tnt = true;
  return e;
}

// Spawn pad
addCylinder({ r: 2.2, h: 0.2, pos: [0, 0.1, 0], color: 0xfff7ef, castShadow: false });

// Crate pyramid (north of spawn)
for (let row = 0; row < 5; row++) {
  for (let i = 0; i < 5 - row; i++) {
    addBox({
      size: [1.2, 1.2, 1.2], mass: 1.2, color: CRATE_COLORS[(row + i) % 3],
      pos: [(i - (4 - row) / 2) * 1.25, 0.6 + row * 1.2, -14],
    });
  }
}

// Ball pit (north-west)
{
  const cx = -16, cz = -6, half = 4.2;
  const wall = 0xb9573a;
  addBox({ size: [half * 2 + 0.4, 1, 0.4], pos: [cx, 0.5, cz - half], color: wall });
  addBox({ size: [half * 2 + 0.4, 1, 0.4], pos: [cx, 0.5, cz + half], color: wall });
  addBox({ size: [0.4, 1, half * 2 + 0.4], pos: [cx - half, 0.5, cz], color: wall });
  addBox({ size: [0.4, 1, half * 2 + 0.4], pos: [cx + half, 0.5, cz], color: wall });
  for (let i = 0; i < 18; i++) {
    const r = 0.45 + (i % 4) * 0.1;
    addBall({
      r, mass: 0.5, material: matBouncy, color: TOY_COLORS[i % TOY_COLORS.length],
      pos: [cx - 2.7 + (i % 4) * 1.8, 1 + Math.floor(i / 8) * 1.7, cz - 2.7 + (Math.floor(i / 4) % 2) * 2.2 + (i % 3) * 1.1],
    });
  }
}

// Dominoes (east)
for (let i = 0; i < 14; i++) {
  addBox({ size: [0.3, 2, 1.1], mass: 1.2, color: TOY_COLORS[i % TOY_COLORS.length], pos: [8 + i * 1.15, 1, -6] });
}

// Seesaw (south-east)
{
  const x = 14, z = 8;
  addBox({ size: [0.4, 0.7, 2.5], pos: [x, 0.35, z], color: STEEL });
  const plank = addBox({ size: [10, 0.3, 2.5], mass: 8, pos: [x, 1, z], color: 0x4d96ff });
  plank.body.allowSleep = false;
  plank.grab = false;
  world.addConstraint(new CANNON.HingeConstraint(anchorAt(x, 1, z), plank.body, {
    pivotA: new CANNON.Vec3(0, 0, 0), axisA: new CANNON.Vec3(0, 0, 1),
    pivotB: new CANNON.Vec3(0, 0, 0), axisB: new CANNON.Vec3(0, 0, 1),
  }));
  addBox({ size: [1.5, 1.5, 1.5], mass: 30, pos: [x - 4, 2.2, z], color: DARK });
}

// Spinner (south-west)
{
  const x = -14, z = 12;
  addCylinder({ r: 0.9, h: 1.4, pos: [x, 0.7, z], color: STEEL });
  const bar = addBox({ size: [11, 0.5, 0.6], pos: [x, 0.72, z], color: 0xff6b6b, kinematic: true });
  bar.body.angularVelocity.set(0, 1.5, 0);
  bar.body.allowSleep = false;
}

// Wrecking ball (south)
let wrecker;
const WRECK_ANCHOR = new CANNON.Vec3(0, 10, 20);
const WRECK_LEN = 8;
{
  addBox({ size: [0.7, 10.4, 0.7], pos: [-5, 5.2, 20], color: STEEL });
  addBox({ size: [0.7, 10.4, 0.7], pos: [5, 5.2, 20], color: STEEL });
  addBox({ size: [10.7, 0.7, 0.7], pos: [0, 10.4, 20], color: STEEL });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      addBox({ size: [1.2, 1.2, 1.2], mass: 1, color: CRATE_COLORS[(row + i) % 3], pos: [(i - 1.5) * 1.25, 0.6 + row * 1.2, 20] });
    }
  }
  const ang = Math.PI / 3;
  wrecker = addBall({
    r: 1.2, mass: 25, color: DARK,
    pos: [0, WRECK_ANCHOR.y - Math.cos(ang) * WRECK_LEN, WRECK_ANCHOR.z + Math.sin(ang) * WRECK_LEN],
  });
  wrecker.body.type = KINEMATIC; // held until Clawd walks up
  wrecker.body.allowSleep = false;
  wrecker.body.linearDamping = 0.01;
  wrecker.armed = true;
  world.addConstraint(new CANNON.DistanceConstraint(anchorAt(0, 10, 20), wrecker.body, WRECK_LEN));
  addRope({ v: new THREE.Vector3(0, 10, 20) }, { mesh: wrecker.mesh, local: new THREE.Vector3() });
}

// Trampolines
function addTrampoline(x, y, z, power) {
  addBox({ size: [2.9, 0.2, 2.9], pos: [x, y - 0.05, z], color: 0x2a1a14 });
  const t = addBox({ size: [2.5, 0.3, 2.5], pos: [x, y, z], color: 0xb983ff });
  t.body.bouncy = power;
  return t;
}
addTrampoline(-6, 0.15, 6, 20);

// Checkpoint pads: standing on one moves your respawn point
function markCheckpoint(entry, x, y, z) {
  entry.body.checkpoint = new CANNON.Vec3(x, y, z);
}

// Sky course (north-east): ramp → moving platform → lift → stepping pads → trampoline → island
{
  const padC = 0xffd93d;
  const rise = 3, run = 9.5;
  const len = Math.hypot(rise, run), ang = Math.atan2(rise, run);
  addBox({
    size: [4, 0.4, len + 0.4], color: 0xff9f45, rot: [ang, 0, 0],
    pos: [26, rise / 2 - 0.2 * Math.cos(ang), -10 - run / 2 - 0.2 * Math.sin(ang)],
  });
  addBox({ size: [6, 0.5, 6], pos: [26, 2.75, -23], color: STONE });                 // A
  const m1 = addBox({ size: [4, 0.4, 4], pos: [31, 2.8, -23], color: 0x4dd4c6, kinematic: true });
  movers.push({ body: m1.body, path: (t, v) => v.set(36 - 5 * Math.cos(t * 0.7), 2.8, -23) });
  addBox({ size: [6, 0.5, 6], pos: [46, 2.75, -23], color: STONE });                 // B
  const m2 = addBox({ size: [4, 0.4, 4], pos: [46, 2.8, -29], color: 0x4dd4c6, kinematic: true });
  movers.push({ body: m2.body, path: (t, v) => v.set(46, 6.3 - 3.5 * Math.cos(t * 0.6), -29) });
  markCheckpoint(addBox({ size: [6, 0.5, 6], pos: [46, 9.75, -35], color: STONE }), 46, 12, -35); // C
  addBox({ size: [2.6, 0.4, 2.6], pos: [40.2, 10.2, -35], color: padC });
  addBox({ size: [2.6, 0.4, 2.6], pos: [35.6, 10.8, -36.2], color: padC });
  addBox({ size: [2.6, 0.4, 2.6], pos: [31, 11.4, -34.5], color: padC });
  addBox({ size: [6, 0.5, 6], pos: [25, 11.75, -35], color: STONE });                // D
  addTrampoline(23.5, 12.15, -35, 27);
  addBox({ size: [8, 0.5, 8], pos: [15.5, 19.75, -35], color: 0xd97757 });           // E
}

// Block castle with TNT inside (far north)
{
  const cx = 0, cz = -45, brick = 0xcfc7b8, brick2 = 0xb8b0a2;
  for (let layer = 0; layer < 3; layer++) {
    const y = 0.5 + layer;
    for (let i = -1; i <= 1; i++) addBox({ size: [3, 1, 1], mass: 2, color: (i + layer) % 2 ? brick : brick2, pos: [cx + i * 3, y, cz - 4] });
    if (layer < 2) {
      addBox({ size: [3, 1, 1], mass: 2, color: brick, pos: [cx - 3, y, cz + 4] });
      addBox({ size: [3, 1, 1], mass: 2, color: brick2, pos: [cx + 3, y, cz + 4] });
    } else addBox({ size: [9, 1, 1], mass: 5, color: brick, pos: [cx, y, cz + 4] });
    for (const sx of [-4, 4]) {
      for (const sz of [-1.75, 1.75]) addBox({ size: [1, 1, 3.5], mass: 2, color: (layer + (sz > 0 ? 1 : 0)) % 2 ? brick : brick2, pos: [cx + sx, y, cz + sz] });
    }
  }
  addTNT([cx - 2, 0.55, cz - 2]);
  addTNT([cx + 2, 0.55, cz - 2]);
  addTNT([cx, 0.55, cz + 1.5]);
}

// Newton's cradle
{
  const cx = 12, cz = -24, top = 6.5, L = 4.8;
  addBox({ size: [0.5, top + 0.3, 0.5], pos: [cx - 5.5, (top + 0.3) / 2, cz], color: STEEL });
  addBox({ size: [0.5, top + 0.3, 0.5], pos: [cx + 5.5, (top + 0.3) / 2, cz], color: STEEL });
  addBox({ size: [11.5, 0.4, 0.5], pos: [cx, top + 0.1, cz], color: STEEL });
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 1.62;
    const ball = addBall({ r: 0.8, mass: 4, material: matSteel, color: 0xc9d1d9, pos: [x, top - L, cz] });
    ball.grab = false;
    ball.body.linearDamping = 0.01;
    ball.body.sleepSpeedLimit = 0.05;
    world.addConstraint(new CANNON.DistanceConstraint(anchorAt(x, top, cz), ball.body, L));
    addRope({ v: new THREE.Vector3(x, top, cz) }, { mesh: ball.mesh, local: new THREE.Vector3() });
  }
}

// Launch pad → floating island (north-west)
{
  addBox({ size: [3.4, 0.2, 3.4], pos: [-25, 0.1, -30], color: 0x2a1a14 });
  const padE = addBox({ size: [3, 0.3, 3], pos: [-25, 0.15, -30], color: 0xff6b6b });
  padE.body.launch = { x: -9.9, y: 30, z: -9.9 };
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 4), lambert(0xfff7ef));
  arrow.position.set(-25, 0.5, -30); arrow.rotation.set(0, Math.PI / 4, 0); arrow.scale.set(1, 0.25, 1);
  scene.add(arrow);
  markCheckpoint(addBox({ size: [10, 0.5, 10], pos: [-37.4, 9.75, -42.4], color: 0xd97757 }), -37.4, 12, -42.4);
}

// Soccer field (west)
const soccer = { cx: -52, cz: -5, halfZ: 17, goals: 0, cooldown: 0, ball: null };
{
  const { cx, cz, halfZ } = soccer;
  const tex = canvasTexture(256, 400, (g, w, h) => {
    g.fillStyle = '#5fae52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i += 2) { g.fillStyle = '#58a54b'; g.fillRect(0, (i * h) / 8, w, h / 8); }
    g.strokeStyle = '#fff7ef'; g.lineWidth = 5;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 6, h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 40, 0, Math.PI * 2); g.stroke();
    g.strokeRect(w / 2 - 60, 6, 120, 50); g.strokeRect(w / 2 - 60, h - 56, 120, 50);
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(22, halfZ * 2), new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  field.rotation.x = -Math.PI / 2; field.position.set(cx, 0.02, cz); field.receiveShadow = true;
  scene.add(field);
  const net = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (const dir of [-1, 1]) {
    const gz = cz + dir * halfZ;
    addBox({ size: [0.3, 3.5, 0.3], pos: [cx - 4, 1.75, gz], color: 0xfff7ef });
    addBox({ size: [0.3, 3.5, 0.3], pos: [cx + 4, 1.75, gz], color: 0xfff7ef });
    addBox({ size: [8.3, 0.3, 0.3], pos: [cx, 3.5, gz], color: 0xfff7ef });
    addBox({ size: [8.3, 3.6, 0.15], pos: [cx, 1.8, gz + dir * 2.5], mat: net, castShadow: false });
    addBox({ size: [0.15, 3.6, 2.5], pos: [cx - 4.1, 1.8, gz + dir * 1.25], mat: net, castShadow: false });
    addBox({ size: [0.15, 3.6, 2.5], pos: [cx + 4.1, 1.8, gz + dir * 1.25], mat: net, castShadow: false });
    addBox({ size: [8.3, 0.15, 2.5], pos: [cx, 3.6, gz + dir * 1.25], mat: net, castShadow: false });
  }
  const ballTex = canvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = '#fff7ef'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a1a14';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(i * 22 + (j % 2) * 11 + 6, j * 22 + 10, 6, 0, 7); g.fill(); }
  });
  soccer.ball = addBall({ r: 0.8, mass: 0.7, material: matBouncy, mat: new THREE.MeshLambertMaterial({ map: ballTex }), pos: [cx, 0.8, cz] });
}

// Carousel (west)
{
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.4, 28), new THREE.MeshLambertMaterial({ map: (() => {
    const t = canvasTexture(128, 128, (c, w) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = ['#ff6b6b', '#ffd93d', '#4d96ff', '#6bcb77'][i % 4];
        c.beginPath(); c.moveTo(w / 2, w / 2); c.arc(w / 2, w / 2, w, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4); c.fill();
      }
    });
    return t;
  })() }));
  g.add(disc);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(boxGeo, lambert(0xfff7ef));
    post.scale.set(0.15, 1.3, 0.15);
    post.position.set(Math.cos((i * Math.PI) / 2) * 3.2, 0.85, Math.sin((i * Math.PI) / 2) * 3.2);
    g.add(post);
  }
  g.position.set(-30, 0.3, 12);
  const body = new CANNON.Body({ type: KINEMATIC, mass: 0, material: matWorld, position: new CANNON.Vec3(-30, 0.3, 12), collisionFilterGroup: G_STATIC });
  body.addShape(new CANNON.Cylinder(4, 4, 0.4, 20));
  body.angularVelocity.set(0, 1.3, 0);
  body.allowSleep = false;
  finishBody(body, g, {});
}

// Swings (south-west)
{
  const z = 34, top = 6.5;
  addBox({ size: [0.5, top + 0.3, 0.5], pos: [-25.5, (top + 0.3) / 2, z], color: STEEL });
  addBox({ size: [0.5, top + 0.3, 0.5], pos: [-14.5, (top + 0.3) / 2, z], color: STEEL });
  addBox({ size: [11.5, 0.4, 0.5], pos: [-20, top + 0.1, z], color: STEEL });
  for (const x of [-22.6, -17.4]) {
    const seat = addBox({ size: [1.8, 0.2, 0.9], mass: 3, pos: [x, 1, z], color: 0xff9f45 });
    seat.grab = false;
    seat.body.allowSleep = false;
    seat.body.linearDamping = 0.02; seat.body.angularDamping = 0.02;
    world.addConstraint(new CANNON.HingeConstraint(anchorAt(x, top, z), seat.body, {
      pivotA: new CANNON.Vec3(0, 0, 0), axisA: new CANNON.Vec3(1, 0, 0),
      pivotB: new CANNON.Vec3(0, top - 1, 0), axisB: new CANNON.Vec3(1, 0, 0),
    }));
    for (const s of [-0.45, 0.45]) addRope({ v: new THREE.Vector3(x + s * 1.8, top, z) }, { mesh: seat.mesh, local: new THREE.Vector3(s, 0.5, 0) });
  }
}

// Bowling lane (south-west)
const bowling = { pins: [], done: false };
{
  const z = 28;
  addBox({ size: [30, 0.1, 4], pos: [-43, 0.05, z], color: 0xd9a35f, castShadow: false });
  addBox({ size: [30, 0.5, 0.3], pos: [-43, 0.25, z - 2.15], color: DARK });
  addBox({ size: [30, 0.5, 0.3], pos: [-43, 0.25, z + 2.15], color: DARK });
  addBox({ size: [0.3, 1.6, 4.6], pos: [-58.15, 0.8, z], color: DARK });
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      bowling.pins.push(addCylinder({ r: 0.28, h: 1.3, mass: 0.5, color: 0xfff7ef, pos: [-53 - row * 0.9, 0.76, z + (i - row / 2) * 0.9] }));
    }
  }
  addBall({ r: 0.75, mass: 8, color: 0x3b3b98, pos: [-31, 0.86, z] });
}

// Ice rink (south)
{
  const cx = -20, cz = 48;
  const ice = addBox({ size: [18, 0.1, 14], pos: [cx, 0.05, cz], color: 0xd6f1ff, material: matIce, castShadow: false });
  ice.body.slippery = true;
  const rail = 0xfff7ef;
  addBox({ size: [18.6, 0.4, 0.3], pos: [cx, 0.2, cz - 7.15], color: rail });
  addBox({ size: [18.6, 0.4, 0.3], pos: [cx, 0.2, cz + 7.15], color: rail });
  addBox({ size: [0.3, 0.4, 14], pos: [cx - 9.15, 0.2, cz], color: rail });
  addBox({ size: [0.3, 0.4, 14], pos: [cx + 9.15, 0.2, cz], color: rail });
  for (let i = 0; i < 4; i++) addCylinder({ r: 0.5, h: 0.25, mass: 0.5, material: matIce, color: 0x2a1a14, pos: [cx - 4 + i * 2.6, 0.24, cz + (i % 2 ? 2 : -2)] });
}

// Pool with a slide tower (south-east)
const WATER = { x0: 33.3, x1: 46.7, z0: 25.3, z1: 34.7, top: 1.9 };
{
  const wall = 0x4d96ff;
  addBox({ size: [14.4, 2.2, 0.5], pos: [40, 1.1, 25], color: wall });
  addBox({ size: [14.4, 2.2, 0.5], pos: [40, 1.1, 35], color: wall });
  addBox({ size: [0.5, 2.2, 10.5], pos: [33, 1.1, 30], color: wall });
  addBox({ size: [0.5, 2.2, 10.5], pos: [47, 1.1, 30], color: wall });
  for (let i = 0; i < 4; i++) addBox({ size: [4, 2.2 - i * 0.55, 1], pos: [40, (2.2 - i * 0.55) / 2, 35.75 + i], color: STONE });
  const water = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.55, depthWrite: false }));
  water.scale.set(13.5, WATER.top, 9.5); water.position.set(40, WATER.top / 2, 30);
  scene.add(water);
  const raft = addBox({ size: [3, 0.4, 2], mass: 2, color: 0xffd93d, pos: [37, 2.4, 28] });
  raft.body.buoy = 2.6;
  for (let i = 0; i < 4; i++) {
    const b = addBall({ r: 0.6, mass: 0.3, material: matBouncy, color: TOY_COLORS[i], pos: [36 + i * 2.5, 2.8, 32] });
    b.body.buoy = 3;
  }
  // Tower: stairs up, slide down into the pool
  for (let i = 0; i < 18; i++) addBox({ size: [3, 0.4 * (i + 1), 1], pos: [62, 0.2 * (i + 1), 48 - i], color: i % 2 ? STONE : 0xe2dcc8 });
  markCheckpoint(addBox({ size: [4, 0.5, 4], pos: [62, 6.95, 28.5], color: STONE }), 62, 9, 28.5);
  for (const [px, pz] of [[60.4, 26.9], [63.6, 26.9], [63.6, 30.1], [60.4, 30.1]]) addBox({ size: [0.5, 6.7, 0.5], pos: [px, 3.35, pz], color: STEEL });
  const rise = 4.6, run = 13.4, ang = Math.atan2(rise, run), len = Math.hypot(rise, run);
  const mx = 60 - run / 2, my = 7.2 - rise / 2, nx = -Math.sin(ang), ny = Math.cos(ang);
  const slide = addBox({ size: [len + 0.3, 0.3, 2.6], pos: [mx - nx * 0.15, my - ny * 0.15, 28.5], rot: [0, 0, ang], color: 0xff6b6b });
  slide.body.slippery = true;
  for (const s of [-1.4, 1.4]) addBox({ size: [len + 0.3, 0.7, 0.2], pos: [mx + nx * 0.3, my + ny * 0.3, 28.5 + s], rot: [0, 0, ang], color: 0xffd93d });
}

// Wind fan (east)
const WIND = { x0: 49.5, x1: 54.5, z0: 3.5, z1: 8.5, top: 24 };
const fanBlades = new THREE.Group();
const windBits = [];
{
  addCylinder({ r: 2.6, h: 0.3, pos: [52, 0.15, 6], color: DARK });
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(boxGeo, lambert(0xfff7ef));
    blade.scale.set(2.1, 0.06, 0.6);
    blade.position.set(Math.cos((i * Math.PI) / 2) * 1.1, 0, Math.sin((i * Math.PI) / 2) * 1.1);
    blade.rotation.y = -(i * Math.PI) / 2;
    fanBlades.add(blade);
  }
  fanBlades.position.set(52, 0.4, 6);
  scene.add(fanBlades);
  const bitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 14; i++) {
    const bit = new THREE.Mesh(boxGeo, bitMat);
    bit.scale.set(0.06, 0.9, 0.06);
    bit.position.set(50 + Math.random() * 4, Math.random() * 18, 4 + Math.random() * 4);
    scene.add(bit);
    windBits.push(bit);
  }
  addBox({ size: [5, 0.5, 5], pos: [58.5, 11.75, 6], color: STONE });
  addBox({ size: [0.6, 11.5, 0.6], pos: [58.5, 5.75, 6], color: STEEL });
}

// Conveyor belt (east)
let beltTex;
{
  beltTex = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#2f3640'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ffd93d';
    g.beginPath(); g.moveTo(8, 12); g.lineTo(36, 32); g.lineTo(8, 52); g.lineTo(20, 52); g.lineTo(48, 32); g.lineTo(20, 12); g.fill();
  });
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(6, 1);
  const side = lambert(DARK), top = new THREE.MeshLambertMaterial({ map: beltTex });
  const belt = addBox({ size: [12, 0.3, 3], pos: [30, 0.15, 16], mat: [side, side, top, side, side, side], castShadow: false });
  belt.body.conveyor = new CANNON.Vec3(4.5, 0, 0);
}

// Scenery: trees (solid), clouds, flowers, night stars
const sceneryGroup = new THREE.Group();
scene.add(sceneryGroup);
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
let nightStars;
{
  const spots = [[20, 30], [-30, -18], [16, 46], [-44, 44], [72, -10], [62, -52], [-72, -40], [-10, -66], [78, 46], [-76, 30], [0, 64], [40, 62], [-56, -52], [84, 14], [-20, 70], [30, -60]];
  for (const [x, z] of spots) {
    addCylinder({ r: 0.5, h: 3, pos: [x, 1.5, z], color: 0x8a6a4a });
    addBox({ size: [3.4, 3.2, 3.4], pos: [x, 4.4, z], color: 0x3f9b5c });
    addBox({ size: [2.2, 1.6, 2.2], pos: [x, 6.8, z], color: 0x4fb26c });
  }
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, r = 60 + (i * 37) % 90;
    const cloud = new THREE.Mesh(boxGeo, cloudMat);
    cloud.scale.set(12 + (i % 3) * 5, 2.5, 7 + (i % 2) * 4);
    cloud.position.set(Math.cos(a) * r, 50 + (i % 4) * 6, Math.sin(a) * r);
    sceneryGroup.add(cloud);
  }
  const flowerColors = [0xff6b6b, 0xffd93d, 0xfff7ef, 0xb983ff];
  const dummy = new THREE.Object3D();
  flowerColors.forEach((col, ci) => {
    const inst = new THREE.InstancedMesh(boxGeo, lambert(col), 90);
    for (let i = 0; i < 90; i++) {
      const a = (i * 2.399 + ci) % (Math.PI * 2), r = 6 + ((i * 53 + ci * 17) % 100);
      dummy.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
      dummy.scale.set(0.16, 0.2, 0.16);
      dummy.rotation.y = i;
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    sceneryGroup.add(inst);
  });
  const pts = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.random() * 0.95 + 0.05;
    const r = 380, y = v * r, h = Math.sqrt(r * r - y * y);
    pts[i * 3] = Math.cos(u) * h; pts[i * 3 + 1] = y; pts[i * 3 + 2] = Math.sin(u) * h;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  nightStars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
  nightStars.visible = false;
  scene.add(nightStars);
}

// ───────────────────────────── Stars ─────────────────────────────
const stars = [];
{
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.34 : 0.78;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc93c, emissive: 0xb37400, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.3 });
  const spots = [
    [0, 1.6, -19],            // behind the crate pyramid
    [-16, 1.7, -6],           // in the ball pit
    [25.5, 1.6, -6],          // end of the dominoes
    [18.4, 5.2, 8],           // above the raised seesaw end
    [-14, 3.1, 12],           // on the spinner hub
    [0, 1.6, 23],             // behind the wrecking-ball crates
    [46, 11.6, -35],          // sky course platform C
    [14, 21.8, -35],          // top island
    [-6, 7.2, 6],             // high above the ground trampoline
    [0, 1.6, -45],            // inside the castle
    [12, 1.6, -27],           // behind the Newton's cradle
    [-37.4, 11.6, -42.4],     // launch island
    [-52, 1.6, -23.2],        // in the north soccer goal
    [-30, 2, 12],             // on the carousel
    [-20, 1.6, 34],           // between the swings
    [-56.9, 1.6, 28],         // behind the bowling pins
    [-20, 1.6, 48],           // middle of the ice rink
    [40, 1.3, 30],            // in the pool
    [62, 8.8, 27.5],          // top of the slide tower
    [59.5, 13.6, 6],          // wind fan platform
    [37.5, 1.6, 16],          // end of the conveyor
    [20, 9.2, 30],            // on top of the tree
  ];
  for (const [x, y, z] of spots) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    stars.push({ mesh, baseY: y, got: false, phase: x + z });
  }
}
let starCount = 0;
$('stars').textContent = `0 / ${stars.length}`;

// ───────────────────────────── Clawd (and buddies) ─────────────────────────────
function makeClawd(color) {
  const group = new THREE.Group();      // origin at the feet, front faces +Z
  const bodyGroup = new THREE.Group();  // squashes and bobs
  const mat = new THREE.MeshLambertMaterial({ color });
  const dark = lambert(0x2a1a14);
  const legs = [], arms = [], eyes = [];
  const part = (m, sx, sy, sz, x, y, z, parent) => {
    const mesh = new THREE.Mesh(boxGeo, m);
    mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  part(mat, 1.5, 0.85, 0.95, 0, 0.74, 0, bodyGroup);
  for (const x of [-0.33, 0.33]) eyes.push(part(dark, 0.13, 0.3, 0.06, x, 0.86, 0.48, bodyGroup));
  for (const x of [-0.88, 0.88]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    part(mat, 0.28, 0.26, 0.42, 0, 0, 0, pivot);
    bodyGroup.add(pivot);
    arms.push(pivot);
  }
  for (const x of [-0.56, -0.2, 0.2, 0.56]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.36, 0);
    part(mat, 0.2, 0.4, 0.28, 0, -0.18, 0, pivot);
    group.add(pivot);
    legs.push(pivot);
  }
  const hatAnchor = new THREE.Group();
  hatAnchor.position.set(0, 1.165, 0);
  bodyGroup.add(hatAnchor);
  group.add(bodyGroup);
  return { group, bodyGroup, mat, legs, arms, eyes, hatAnchor, walkPhase: 0, squash: 0, blink: 1 + Math.random() * 3 };
}

function animateClawd(c, dt, grounded, hSpeed, vy, maxSpeed) {
  const walking = grounded && hSpeed > 0.5;
  if (walking) c.walkPhase += hSpeed * dt * 1.9;
  const swing = walking ? Math.min(1, hSpeed / maxSpeed) : 0;
  c.legs.forEach((leg, i) => {
    const target = grounded ? Math.sin(c.walkPhase + (i % 2 ? Math.PI : 0)) * 0.75 * swing : (i % 2 ? 0.5 : -0.5);
    leg.rotation.x += (target - leg.rotation.x) * Math.min(1, dt * 18);
  });
  const armTarget = grounded ? 0 : (vy > 0 ? 0.9 : 0.4);
  c.arms.forEach((arm, i) => {
    const t = (i ? -1 : 1) * -armTarget;
    arm.rotation.z += (t - arm.rotation.z) * Math.min(1, dt * 12);
  });
  c.squash *= Math.exp(-9 * dt);
  c.bodyGroup.scale.set(1 - c.squash * 0.5, 1 + c.squash, 1 - c.squash * 0.5);
  c.bodyGroup.position.y = walking ? Math.abs(Math.sin(c.walkPhase)) * 0.07 : 0;
  c.blink -= dt;
  const blinkScale = c.blink < 0.12 ? 0.03 : 0.3;
  for (const eye of c.eyes) eye.scale.y = blinkScale;
  if (c.blink < 0) c.blink = 2 + Math.random() * 3;
}

const playerBody = new CANNON.Body({
  mass: 5, material: matPlayer, fixedRotation: true, allowSleep: false,
  position: SPAWN.clone(), collisionFilterGroup: G_PLAYER, collisionFilterMask: -1,
  linearDamping: 0,
});
playerBody.addShape(new CANNON.Sphere(PLAYER_R));
playerBody.updateMassProperties();
playerBody.buoy = 1.25;
world.addBody(playerBody);

const clawd = makeClawd(settings.color);
scene.add(clawd.group);
const headlamp = new THREE.PointLight(0xffe2b0, 0, 24, 1.4);
headlamp.position.set(0, 1.6, 0.6);
clawd.group.add(headlamp);

// Hats
const hats = {};
let propeller = null;
{
  const mk = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, lambert(color)); m.position.set(x, y, z); m.castShadow = true; return m; };
  const top = new THREE.Group();
  top.add(mk(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 18), 0x2a1a14, 0, 0.04, 0));
  top.add(mk(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 18), 0x2a1a14, 0, 0.38, 0));
  top.add(mk(new THREE.CylinderGeometry(0.41, 0.41, 0.12, 18), 0xe03131, 0, 0.16, 0));
  hats.tophat = top;
  const crown = new THREE.Group();
  crown.add(mk(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12, 1, true), 0xffc93c, 0, 0.125, 0));
  for (let i = 0; i < 6; i++) crown.add(mk(new THREE.ConeGeometry(0.12, 0.28, 4), 0xffc93c, Math.cos(i * 1.047) * 0.43, 0.38, Math.sin(i * 1.047) * 0.43));
  hats.crown = crown;
  const party = new THREE.Group();
  party.add(mk(new THREE.ConeGeometry(0.36, 0.9, 14), 0x4d96ff, 0, 0.45, 0));
  party.add(mk(new THREE.SphereGeometry(0.1, 10, 8), 0xffd93d, 0, 0.94, 0));
  hats.party = party;
  const cap = new THREE.Group();
  cap.add(mk(new THREE.SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x6bcb77, 0, 0, 0));
  cap.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), 0x2a1a14, 0, 0.58, 0));
  propeller = new THREE.Group();
  propeller.add(mk(boxGeo, 0xe03131, 0, 0, 0));
  propeller.children[0].scale.set(1.1, 0.04, 0.16);
  propeller.position.y = 0.74;
  cap.add(propeller);
  hats.propeller = cap;
  for (const h of Object.values(hats)) { h.visible = false; clawd.hatAnchor.add(h); }
}
function applySkin() {
  clawd.mat.color.set(settings.color);
  for (const [name, h] of Object.entries(hats)) h.visible = settings.hat === name;
}

// Bots: five Clawds that wander in free play and play tag against you
const buddies = [];
{
  const defs = [[5, -4, 0x4d96ff, 'Blue'], [-5, -3, 0x6bcb77, 'Green'], [-3, 9, 0xb983ff, 'Purple'], [4, 11, 0xffd93d, 'Yellow'], [-8, 3, 0xff6b9d, 'Pink']];
  for (const [x, z, color, name] of defs) {
    const model = makeClawd(color);
    model.group.scale.setScalar(0.8);
    const holder = new THREE.Group();
    holder.add(model.group);
    model.group.position.y = -0.62;
    holder.position.set(x, 0.65, z);
    const body = new CANNON.Body({
      mass: 3, material: matPlayer, fixedRotation: true, allowSleep: false,
      position: new CANNON.Vec3(x, 0.65, z), collisionFilterGroup: G_PROP, collisionFilterMask: -1,
    });
    body.addShape(new CANNON.Sphere(0.62));
    body.updateMassProperties();
    const entry = finishBody(body, holder, {});
    entry.buddy = true;
    const b = {
      entry, body, model, name, isBot: true, alive: true, stun: 0,
      grounded: false, water: false, timer: Math.random() * 3, tx: null, tz: 0, homeX: x, homeZ: z, facing: Math.random() * 6,
      stuck: 0, sideT: 0, side: 1, jit: 0, jitT: 0,
    };
    body.walker = b;
    buddies.push(b);
  }
}

// Kart
const kart = { entry: null, body: null, grounded: false, wheels: [], speed: 0 };
{
  const g = new THREE.Group();
  const add = (geo, color, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(geo, lambert(color)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
  add(boxGeo, 0x4d96ff, 2, 0.4, 3.2, 0, 0, 0);
  add(boxGeo, 0xffd93d, 1.6, 0.25, 0.9, 0, 0.3, 1.1);
  add(boxGeo, 0x2a1a14, 1.5, 0.7, 0.25, 0, 0.5, -1.35);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1.1, 1.05], [1.1, 1.05], [-1.1, -1.05], [1.1, -1.05]]) kart.wheels.push(add(wheelGeo, 0x2a1a14, 1, 1, 1, x, -0.03, z));
  g.position.set(5, 0.5, 3);
  const body = new CANNON.Body({ mass: 20, material: matKart, position: new CANNON.Vec3(5, 0.5, 3), collisionFilterGroup: G_PROP, collisionFilterMask: -1 });
  body.addShape(new CANNON.Box(new CANNON.Vec3(1.1, 0.42, 1.6)));
  body.angularFactor.set(0, 1, 0);
  body.linearDamping = 0.4; body.angularDamping = 0.9;
  body.allowSleep = false;
  body.walker = kart;
  kart.entry = finishBody(body, g, {});
  kart.entry.kart = true;
  kart.entry.grab = false;
  kart.body = body;
}

// ───────────────────────────── Sound ─────────────────────────────
let actx = null, noiseBuf = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    actx = new AC();
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.8, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { actx = null; }
}
const audible = () => actx && settings.sound && actx.state === 'running';
function beep(f0, f1, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!audible()) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, vol) {
  if (!audible()) return;
  const t = actx.currentTime;
  const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf;
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start(t); src.stop(t + dur);
}
const sfx = {
  jump: () => beep(300, 620, 0.16),
  jump2: () => beep(420, 880, 0.16),
  land: () => beep(160, 70, 0.1, 'triangle', 0.1),
  bounce: () => beep(220, 900, 0.3, 'sine', 0.1),
  star: () => { beep(880, 880, 0.1, 'triangle', 0.09); beep(1320, 1320, 0.22, 'triangle', 0.09, 0.09); },
  spawn: () => beep(520, 260, 0.1, 'sine', 0.07),
  grab: () => beep(260, 420, 0.08, 'sine', 0.07),
  throw: () => beep(500, 180, 0.14, 'triangle', 0.08),
  boom: () => { noise(0.7, 1400, 0.5); beep(110, 30, 0.5, 'sine', 0.3); },
  splash: () => noise(0.35, 2600, 0.18),
  goal: () => [659, 784, 1047].forEach((f, i) => beep(f, f, 0.2, 'square', 0.06, i * 0.1)),
  check: () => { beep(660, 660, 0.08, 'sine', 0.08); beep(990, 990, 0.14, 'sine', 0.08, 0.08); },
  tag: () => { beep(740, 180, 0.2, 'sawtooth', 0.08); },
  go: () => beep(660, 1320, 0.25, 'square', 0.07),
  tick: () => beep(980, 980, 0.05, 'square', 0.05),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.25, 'triangle', 0.09, i * 0.13)),
};

// ───────────────────────────── Game state ─────────────────────────────
const keys = new Set();
const input = { stickX: 0, stickY: 0, jumpHeld: false, touchJump: false, jumpPressedAt: -10, runToggle: false };
const cam = { yaw: 0, pitch: 0.38, dist: 11, shiftLock: false };
const state = {
  grounded: false, groundBody: null, coyote: 0, jumpCooldown: 0, airJumps: 1,
  carryX: 0, carryZ: 0, carryDecay: 1.5, lastVy: 0, facing: Math.PI,
  moveX: 0, moveZ: 0, moveMag: 0, inF: 0, inS: 0, sprint: false,
  water: 0, wasWater: 0, inWind: false, riding: false, emote: 0, shake: 0, throwT: 0, stamina: 100, winded: false,
  respawns: 0, jumps: 0,
};
const playerWalker = { hit: false, best: 0.5, ground: null };
playerBody.walker = playerWalker;
const spawnPoint = SPAWN.clone();
const pp = new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z); // where Clawd is, riding or not
let simTime = 0;
let held = null;
let selectedItem = 0;

function hideHintSoon() {}
function pressJump() { input.jumpPressedAt = simTime; }

let toastTimer = null;
function toast(text, ms = 2200) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Particles
const particles = [];
function burst(at, n, color, power = 6) {
  if (!settings.particles) return;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(boxGeo, lambert(color));
    m.scale.setScalar(0.16 + Math.random() * 0.12);
    m.position.set(at.x, at.y + 0.6, at.z);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.9;
    particles.push({ m, vx: Math.cos(a) * power * Math.random(), vy: up * power, vz: Math.sin(a) * power * Math.random(), life: 0.9 + Math.random() * 0.5 });
  }
}

// ───────────────────────────── Actions ─────────────────────────────
function facingDir(out) {
  out.set(Math.sin(state.facing), 0, Math.cos(state.facing));
  return out;
}
const aimV = new THREE.Vector3();
function aimDir(out) {
  if (cam.shiftLock || cam.dist < 0.5) {
    const cp = Math.cos(cam.pitch);
    return out.set(-Math.sin(cam.yaw) * cp, -Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp);
  }
  return facingDir(out);
}

function setPlayerPos(v) {
  playerBody.position.copy(v);
  playerBody.velocity.set(0, 0, 0);
  playerBody.previousPosition.copy(v);
  playerBody.interpolatedPosition.copy(v);
}
function respawn() {
  if (state.riding) exitKart();
  setPlayerPos(spawnPoint);
  state.carryX = state.carryZ = 0;
  state.respawns++;
}

function removeLinksOf(entry) {
  for (let i = links.length - 1; i >= 0; i--) {
    const l = links[i];
    if (l.a !== entry && l.b !== entry) continue;
    world.removeConstraint(l.constraint);
    scene.remove(l.rope.mesh);
    const ri = ropes.indexOf(l.rope);
    if (ri >= 0) ropes.splice(ri, 1);
    links.splice(i, 1);
  }
}
function removeEntry(entry) {
  if (held === entry) held = null;
  removeLinksOf(entry);
  world.removeBody(entry.body);
  scene.remove(entry.mesh);
  const i = synced.indexOf(entry);
  if (i >= 0) synced.splice(i, 1);
}
function removeSpawned(entry) {
  const i = spawned.indexOf(entry);
  if (i >= 0) spawned.splice(i, 1);
  removeEntry(entry);
}

const ITEMS = [
  { id: 'crate', name: 'Crate', color: '#f0c98a' },
  { id: 'ball', name: 'Ball', color: '#7db4ff' },
  { id: 'plank', name: 'Plank', color: '#d9a878' },
  { id: 'barrel', name: 'Barrel', color: '#8ddc97' },
  { id: 'bigball', name: 'Big ball', color: '#ffb469' },
  { id: 'balloon', name: 'Balloon', color: '#ff8f8f' },
  { id: 'tnt', name: 'TNT', color: '#ff6b6b' },
  { id: 'anvil', name: 'Anvil', color: '#c9d1d9' },
];

function nearestEntry(x, y, z, maxDist, filter) {
  let best = null, bestD = maxDist;
  for (const b of world.bodies) {
    const e = b.entry;
    if (!e || b.type !== DYNAMIC || e.dead || !filter(e, b)) continue;
    const d = Math.hypot(b.position.x - x, b.position.y - y, b.position.z - z) - b.boundingRadius * 0.5;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// Clawd tosses the item straight up (90°); it is back on the floor in about a second and a half.
function spawnProp(kind) {
  const d = facingDir(aimV);
  const g = -world.gravity.y;
  const up = g * 0.72;
  const at = (reach) => [pp.x + d.x * reach, pp.y + 1.3, pp.z + d.z * reach];
  let entry;
  if (kind === 'crate') {
    const s = 0.9 + Math.random() * 0.7;
    entry = addBox({ size: [s, s, s], mass: s * s * s, color: pick(TOY_COLORS), pos: at(1.3 + s * 0.6), spawned: true });
  } else if (kind === 'ball') {
    const r = 0.45 + Math.random() * 0.4;
    entry = addBall({ r, mass: r * 2, material: matBouncy, color: pick(TOY_COLORS), pos: at(1.2 + r), spawned: true });
  } else if (kind === 'plank') {
    entry = addBox({ size: [5, 0.3, 1.2], mass: 2.5, color: 0xb98b5e, pos: at(1.9), rot: [0, state.facing + Math.PI / 2, 0], spawned: true });
  } else if (kind === 'barrel') {
    entry = addCylinder({ r: 0.6, h: 1.4, mass: 1.5, color: pick([0x6bcb77, 0x4dd4c6, 0xff9f45]), pos: at(1.9), spawned: true });
  } else if (kind === 'bigball') {
    entry = addBall({ r: 1.6, mass: 6, material: matBouncy, color: pick(TOY_COLORS), pos: at(2.9), spawned: true });
  } else if (kind === 'anvil') {
    entry = addBox({ size: [1.6, 1, 1], mass: 40, color: DARK, pos: at(2.2), spawned: true });
  } else if (kind === 'tnt') {
    entry = addTNT(at(2), true);
    entry.fuse = 3;
  } else if (kind === 'balloon') {
    const bpos = at(2);
    const target = held || nearestEntry(bpos[0], bpos[1] - 1, bpos[2], 3.2, (e) => !e.balloon && !(tag.active && e.buddy));
    entry = addBall({ r: 0.6, mass: 0.15, color: pick(TOY_COLORS), pos: bpos, spawned: true });
    entry.balloon = true;
    entry.grab = false;
    entry.body.lift = 14;
    entry.body.linearDamping = 0.5;
    entry.body.allowSleep = false;
    if (target) {
      const tp = target.body.position;
      entry.body.position.set(tp.x, tp.y + 2.2, tp.z);
      const constraint = new CANNON.DistanceConstraint(entry.body, target.body, 2.2);
      world.addConstraint(constraint);
      target.body.wakeUp();
      const rope = addRope({ mesh: entry.mesh, local: new THREE.Vector3(0, -1, 0) }, { mesh: target.mesh, local: new THREE.Vector3() }, 0xfff7ef);
      links.push({ constraint, rope, a: entry, b: target });
    }
  }
  if (!entry) return;
  if (kind === 'balloon') entry.body.velocity.set(0, entry.body.lift && links.some((l) => l.a === entry) ? 0 : 7, 0);
  else {
    entry.body.velocity.set(0, up, 0);
    entry.body.angularVelocity.set(Math.random() * 3 - 1.5, Math.random() * 3 - 1.5, Math.random() * 3 - 1.5);
  }
  state.throwT = 0.35;
  clawd.squash = 0.22;
  spawned.push(entry);
  if (spawned.length > MAX_SPAWNED) removeSpawned(spawned[0]);
  sfx.spawn();
}

function explode(x, y, z, radius = 9, power = 24) {
  for (const b of world.bodies) {
    if (b.type !== DYNAMIC) continue;
    const dx = b.position.x - x, dy = b.position.y - y, dz = b.position.z - z;
    const d = Math.hypot(dx, dy, dz);
    if (d > radius) continue;
    const k = 1 - d / radius, inv = 1 / (d || 1);
    if (b === playerBody) {
      if (state.riding) continue;
      b.velocity.y += (dy * inv * power * 0.6 + 9) * k;
      state.carryX += dx * inv * power * k; state.carryZ += dz * inv * power * k;
      b.velocity.x += dx * inv * power * k; b.velocity.z += dz * inv * power * k;
      state.carryDecay = 1; state.grounded = false; state.coyote = 0;
      continue;
    }
    b.wakeUp();
    b.velocity.x += dx * inv * power * k;
    b.velocity.y += (dy * inv * power + 8) * k;
    b.velocity.z += dz * inv * power * k;
    b.angularVelocity.set((Math.random() - 0.5) * 12 * k, (Math.random() - 0.5) * 12 * k, (Math.random() - 0.5) * 12 * k);
    const e = b.entry;
    if (e && e.tnt && !e.dead) e.fuse = Math.min(e.fuse, 0.12 + Math.random() * 0.25);
  }
  const at = { x, y: y - 0.4, z };
  burst(at, 16, 0xff9f45, 13); burst(at, 10, 0x374151, 9); burst(at, 8, 0xffd93d, 11);
  flash.position.set(x, y + 1, z); flash.intensity = 400;
  const dist = Math.hypot(pp.x - x, pp.y - y, pp.z - z);
  state.shake = Math.max(state.shake, clamp(1.2 - dist / 30, 0, 1));
  sfx.boom();
}

function detonate(entry) {
  const p = entry.body.position;
  const x = p.x, y = p.y, z = p.z;
  entry.fuse = Infinity;
  if (held === entry) held = null;
  if (entry.spawned) removeSpawned(entry);
  else {
    entry.dead = true;
    entry.mesh.visible = false;
    removeLinksOf(entry);
    entry.body.position.set(0, -500, 0);
    entry.body.velocity.set(0, 0, 0);
    entry.body.sleep();
  }
  explode(x, y, z);
}

// Grab / throw / ride
function grabTarget() {
  const d = facingDir(aimV);
  return nearestEntry(pp.x + d.x * 1.2, pp.y, pp.z + d.z * 1.2, 2.4, (e, b) => e.grab !== false && b.mass <= 12 && !(tag.active && e.buddy));
}
const kartNear = () => !state.riding && Math.hypot(kart.body.position.x - pp.x, kart.body.position.y - pp.y, kart.body.position.z - pp.z) < 2.9;

function dropHeld() {
  if (!held) return;
  held.body.collisionFilterMask = -1;
  held = null;
}
function enterKart() {
  dropHeld();
  state.riding = true;
  world.removeBody(playerBody);
  kart.body.linearDamping = 0.05;
  kart.body.wakeUp();
  toast('Vroom! E to hop off', 1400);
}
function exitKart() {
  if (!state.riding) return;
  state.riding = false;
  const kp = kart.body.position;
  playerBody.position.set(kp.x, kp.y + 1.9, kp.z);
  playerBody.previousPosition.copy(playerBody.position);
  playerBody.interpolatedPosition.copy(playerBody.position);
  playerBody.velocity.copy(kart.body.velocity);
  playerBody.velocity.y = 6;
  world.addBody(playerBody);
  kart.body.linearDamping = 0.4;
  state.carryX = kart.body.velocity.x; state.carryZ = kart.body.velocity.z; state.carryDecay = 1.5;
  state.grounded = false; state.coyote = 0;
}
function currentAction() {
  if (state.riding) return 'exit';
  if (held) return 'throw';
  if (kartNear()) return 'ride';
  return grabTarget() ? 'grab' : null;
}
function doAction() {
  const act = currentAction();
  if (act === 'exit') exitKart();
  else if (act === 'throw') {
    const e = held, d = aimDir(aimV);
    dropHeld();
    e.body.velocity.set(d.x * 17 + playerBody.velocity.x * 0.5, d.y * 17 + 6, d.z * 17 + playerBody.velocity.z * 0.5);
    e.body.angularVelocity.set(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3);
    if (e.tnt && e.fuse === Infinity) e.fuse = 2.2;
    sfx.throw();
  } else if (act === 'ride') enterKart();
  else if (act === 'grab') {
    held = grabTarget();
    if (held) { held.body.collisionFilterMask = ~G_PLAYER; held.body.wakeUp(); sfx.grab(); }
  }
}

function resetWorld(quiet) {
  if (state.riding) exitKart();
  dropHeld();
  while (spawned.length) removeSpawned(spawned[spawned.length - 1]);
  for (const e of props) {
    e.dead = false; e.fuse = Infinity;
    e.mesh.visible = true;
    e.body.position.copy(e.home.p);
    e.body.quaternion.copy(e.home.q);
    e.body.velocity.set(0, 0, 0);
    e.body.angularVelocity.set(0, 0, 0);
    e.body.wakeUp();
  }
  wrecker.body.type = KINEMATIC;
  wrecker.armed = true;
  bowling.done = false;
  for (const b of buddies) { b.alive = true; b.stun = 0; b.tx = null; }
  spawnPoint.copy(SPAWN);
  respawn();
  if (!quiet) toast('World reset');
}

function collectStar(s) {
  s.got = true;
  s.mesh.visible = false;
  starCount++;
  $('stars').textContent = `${starCount} / ${stars.length}`;
  popBump($('star-chip'));
  burst(s.mesh.position, 14, 0xffc93c);
  if (starCount === stars.length) {
    sfx.win();
    toast(`All ${stars.length} stars! Clawd is the champion!`, 5000);
    for (let i = 0; i < 5; i++) setTimeout(() => burst(pp, 18, pick(TOY_COLORS), 9), i * 220);
  } else {
    sfx.star();
    toast(`Star ${starCount} of ${stars.length}!`, 1400);
  }
}

// ───────────────────────────── Tag mode ─────────────────────────────
// Hot-potato tag: whoever is IT when the fuse burns out is blown up; last Clawd standing wins.
const playerP = { isPlayer: true, name: 'You', alive: true, stun: 0 };
const tag = { active: false, phase: 'idle', it: null, fuse: 0, pause: 0, round: 0, immune: null, immuneT: 0, lastTick: 0, banner: '' };
const tagPos = new THREE.Vector3(), tagPos2 = new THREE.Vector3(), tagScreen = new THREE.Vector3();
const tagPlayers = [playerP, ...buddies];
const aliveList = () => tagPlayers.filter((p) => p.alive);
function posOf(p, out) {
  if (p.isPlayer) return out.copy(pp);
  const q = p.body.position;
  return out.set(q.x, q.y, q.z);
}
const itMarker = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 4), new THREE.MeshBasicMaterial({ color: 0xe03131 }));
itMarker.rotation.x = Math.PI;
itMarker.visible = false;
scene.add(itMarker);
function popBump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

const card = $('card');
const CARD_TEXT = $('card-text').textContent;
function showCard(title, text) {
  $('card-title').textContent = title || 'Clawd Tag';
  $('card-text').textContent = text || CARD_TEXT;
  $('card-tips').hidden = !!title;
  $('btn-play-tag').querySelector('.label').textContent = title ? 'Play again' : 'Play tag';
  card.hidden = false;
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  if (document.pointerLockElement) document.exitPointerLock();
}
function hideCard() { card.hidden = true; }

function startTag() {
  hideCard();
  resetWorld(true);
  tag.active = true; tag.round = 0;
  playerP.alive = true; playerP.stun = 0;
  state.stamina = 100; state.winded = false;
  buddies.forEach((b, i) => {
    const a = ((i + 1) / (buddies.length + 1)) * Math.PI * 2;
    b.entry.grab = false;
    b.body.position.set(Math.sin(a) * 12, 0.7, Math.cos(a) * 12);
    b.body.velocity.set(0, 0, 0);
  });
  nextRound();
}
function startFree() {
  hideCard();
  if (tag.active) { tag.active = false; resetWorld(true); }
  tag.phase = 'idle'; tag.it = null;
  for (const b of buddies) delete b.entry.grab;
  toast('Free play', 1200);
}
function onReset() { if (tag.active) startTag(); else resetWorld(); }

function nextRound() {
  tag.round++;
  tag.it = pick(aliveList());
  tag.fuse = Math.max(16, 30 - (tag.round - 1) * 3);
  tag.phase = 'countdown'; tag.pause = 3;
  tag.immune = null; tag.immuneT = 0;
  sfx.check();
  toast(tag.it === playerP ? "You're IT!" : `${tag.it.name} is IT!`, 1500);
}
function passIt(to) {
  const from = tag.it;
  tag.it = to; tag.immune = from; tag.immuneT = 2.5;
  to.stun = 1;
  burst(posOf(to, tagPos2), 12, 0xe03131, 7);
  sfx.tag();
  if (to === playerP) { toast("Tagged! You're IT!", 1300); state.shake = Math.max(state.shake, 0.5); }
  else if (from === playerP) toast(`You tagged ${to.name}!`, 1200);
}
function tagStep() {
  if (!tag.active || tag.phase !== 'run') return;
  if (tag.immuneT > 0) tag.immuneT -= FIXED;
  const it = tag.it;
  if (it.stun > 0) return;
  posOf(it, tagPos);
  for (const p of tagPlayers) {
    if (p === it || !p.alive || (p === tag.immune && tag.immuneT > 0)) continue;
    const reach = it.isPlayer || p.isPlayer ? 1.75 : 1.6;
    if (tagPos.distanceToSquared(posOf(p, tagPos2)) < reach * reach) { passIt(p); break; }
  }
}
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 < 4 && (n % 100 < 11 || n % 100 > 13) ? n % 10 : 0]}`;
function endTag(win, place) {
  tag.phase = 'over'; tag.it = null;
  const total = tagPlayers.length;
  if (win) { sfx.win(); for (let i = 0; i < 5; i++) setTimeout(() => burst(pp, 18, pick(TOY_COLORS), 9), i * 220); }
  setTimeout(() => {
    if (tag.phase !== 'over') return;
    if (win) showCard('You win!', `Last Clawd standing out of ${total}. The bots never stood a chance.`);
    else showCard('Boom!', `The fuse ran out while you were IT. You finished ${ordinal(place)} of ${total}.`);
  }, 1400);
}
function eliminate(p) {
  posOf(p, tagPos);
  const place = aliveList().length;
  p.alive = false;
  explode(tagPos.x, tagPos.y, tagPos.z, 10, 26);
  if (p.isPlayer) { endTag(false, place); return; }
  const e = p.entry;
  e.dead = true; e.mesh.visible = false;
  p.body.position.set(0, -500, 0); p.body.velocity.set(0, 0, 0); p.body.sleep();
  const left = aliveList().length;
  if (left === 1) { endTag(true, 1); return; }
  toast(`${p.name} went boom! ${left} left`, 1800);
  tag.phase = 'between'; tag.pause = 2.5; tag.it = null;
}
function tagFrame(dt) {
  if (playerP.stun > 0) playerP.stun -= dt;
  if (!tag.active) return;
  if (tag.phase === 'countdown') {
    tag.pause -= dt;
    if (tag.pause <= 0) { tag.phase = 'run'; sfx.go(); }
  } else if (tag.phase === 'between') {
    tag.pause -= dt;
    if (tag.pause <= 0) nextRound();
  } else if (tag.phase === 'run') {
    tag.fuse -= dt;
    const sec = Math.ceil(tag.fuse);
    if (sec !== tag.lastTick) { tag.lastTick = sec; if (sec <= 5 && sec > 0) sfx.tick(); }
    if (tag.fuse <= 0) eliminate(tag.it);
  }
}
function tagHud(now) {
  const hud = $('tag-hud'), arrow = $('it-arrow');
  const show = tag.active && tag.phase !== 'over' && tag.phase !== 'idle';
  hud.hidden = !show;
  itMarker.visible = show && !!tag.it && !(tag.it === playerP && cam.dist < 0.5);
  if (!show) { arrow.hidden = true; return; }
  const it = tag.it, youIt = it === playerP, running = tag.phase === 'run';
  let text;
  if (!it) text = 'Next round…';
  else if (!running) text = youIt ? `You're IT in ${Math.ceil(tag.pause)}` : `${it.name} is IT in ${Math.ceil(tag.pause)}`;
  else text = youIt ? "YOU'RE IT!" : `${it.name} is IT. Run!`;
  const fuse = Math.max(0, Math.ceil(tag.fuse));
  const key = `${text}|${fuse}|${youIt}`;
  if (key !== tag.banner) {
    tag.banner = key;
    $('banner-text').textContent = text;
    $('fuse').textContent = `0:${String(fuse).padStart(2, '0')}`;
    $('banner').classList.toggle('it', youIt);
    hud.classList.toggle('it', youIt && running && fuse <= 8);
  }
  $('stamina-fill').style.transform = `scaleX(${(state.stamina / 100).toFixed(3)})`;
  $('stamina-fill').style.background = state.winded ? '#e03131' : '';
  if (!it) { arrow.hidden = true; return; }

  posOf(it, tagPos);
  const urgency = running ? clamp(1 - tag.fuse / 10, 0, 1) : 0;
  itMarker.position.set(tagPos.x, tagPos.y + (it.isPlayer ? 2.1 : 1.8) + Math.sin(now * 0.006) * 0.15, tagPos.z);
  itMarker.rotation.y = now * 0.004;
  itMarker.scale.setScalar(1 + urgency * 0.5 * Math.abs(Math.sin(now * 0.012)));

  // Edge arrow: points at IT (or at the nearest runner when you are IT)
  let target = it;
  if (youIt) {
    target = null;
    let best = 1e9;
    for (const p of buddies) {
      if (!p.alive) continue;
      const d = pp.distanceToSquared(posOf(p, tagPos2));
      if (d < best) { best = d; target = p; }
    }
  }
  if (!target) { arrow.hidden = true; return; }
  tagScreen.copy(posOf(target, tagPos2)); tagScreen.y += 1;
  tagScreen.project(camera);
  const behind = tagScreen.z > 1;
  let x = tagScreen.x, y = tagScreen.y;
  if (behind) { x = -x; y = -y; }
  if (!behind && Math.abs(x) < 0.86 && Math.abs(y) < 0.8) { arrow.hidden = true; return; }
  const ang = Math.atan2(y, x), w = view.clientWidth, h = view.clientHeight;
  arrow.hidden = false;
  arrow.classList.toggle('chase', youIt);
  arrow.style.left = `${w / 2 + Math.cos(ang) * (w / 2 - 54)}px`;
  arrow.style.top = `${h / 2 - Math.sin(ang) * (h / 2 - 110)}px`;
  arrow.style.transform = `rotate(${90 - (ang * 180) / Math.PI}deg)`;
}

// ───────────────────────────── Input ─────────────────────────────
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  const inForm = t instanceof HTMLSelectElement || t instanceof HTMLInputElement
    || (t instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter'));
  if (e.code === 'Escape' && !$('menu').hidden) { toggleMenu(false); return; }
  if (inForm && e.code !== 'KeyM') return; // let menu controls and buttons use the keyboard
  if (MOVE_KEYS.includes(e.code)) e.preventDefault();
  initAudio(); hideHintSoon();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') pressJump();
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') toggleShiftLock();
  else if (e.code === 'KeyE') doAction();
  else if (e.code === 'KeyF') spawnProp(ITEMS[selectedItem].id);
  else if (e.code === 'KeyR') onReset();
  else if (e.code === 'KeyG') { if (card.hidden) showCard(); else hideCard(); }
  else if (e.code === 'KeyM') toggleMenu();
  else if (e.code === 'KeyP') toggleFullscreen();
  else if (e.code === 'KeyT') state.emote = 2.4;
  else if (/^Digit[1-8]$/.test(e.code)) { selectItem(+e.code.slice(5) - 1); spawnProp(ITEMS[selectedItem].id); }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); input.touchJump = false; endStick(); camTouches.clear(); mouseDrag = false; });

function toggleShiftLock() {
  if (document.pointerLockElement === pad) { document.exitPointerLock(); return; }
  if (!pad.requestPointerLock) return;
  try {
    const p = pad.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch { /* not available here */ }
}
document.addEventListener('pointerlockchange', () => {
  cam.shiftLock = document.pointerLockElement === pad;
  $('crosshair').hidden = !cam.shiftLock;
});

function rotateCam(dx, dy, sens) {
  const s = sens * (settings.sens / 100);
  cam.yaw -= dx * s;
  cam.pitch = clamp(cam.pitch + dy * s * (settings.invertY ? -1 : 1), -1.35, 1.45);
}
function zoomCam(factor) {
  let d = cam.dist;
  if (d < 0.5) { if (factor > 1) d = 2; }           // leaving first person
  else { d *= factor; if (d < 1.6) d = 0; }         // entering first person
  cam.dist = Math.min(40, d);
}

// Pointer handling: mouse drags turn the camera; touches are a thumbstick (lower left) or camera (elsewhere)
let mouseDrag = false;
let stickId = null, stickOX = 0, stickOY = 0;
const STICK_R = 52;
const camTouches = new Map();
let pinchDist = 0;
const stickBase = $('stick-base'), stickKnob = $('stick-knob');

function enableTouchUI() {
  if (document.body.classList.contains('touch')) return;
  document.body.classList.add('touch');
  restStick();
}
function restStick() {
  const r = pad.getBoundingClientRect();
  const x = 96, y = r.height - 110;
  stickBase.hidden = stickKnob.hidden = false;
  stickBase.classList.add('resting');
  stickBase.style.left = stickKnob.style.left = x + 'px';
  stickBase.style.top = stickKnob.style.top = y + 'px';
}
function endStick() {
  stickId = null; input.stickX = 0; input.stickY = 0;
  if (document.body.classList.contains('touch')) restStick();
}
if (isCoarse) enableTouchUI();
window.addEventListener('resize', () => { if (stickId === null && document.body.classList.contains('touch')) restStick(); });

pad.addEventListener('contextmenu', (e) => e.preventDefault());
pad.addEventListener('pointerdown', (e) => {
  initAudio(); hideHintSoon();
  if (e.pointerType === 'mouse') {
    if (e.button === 0 || e.button === 2) { mouseDrag = true; try { pad.setPointerCapture(e.pointerId); } catch { /* ok */ } }
    return;
  }
  e.preventDefault();
  enableTouchUI();
  try { pad.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const r = pad.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (stickId === null && x < r.width * 0.42 && y > r.height * 0.35) {
    stickId = e.pointerId; stickOX = x; stickOY = y;
    stickBase.classList.remove('resting');
    stickBase.style.left = stickKnob.style.left = x + 'px';
    stickBase.style.top = stickKnob.style.top = y + 'px';
  } else {
    camTouches.set(e.pointerId, { x, y });
    pinchDist = 0;
  }
});
pad.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (cam.shiftLock) rotateCam(e.movementX || 0, e.movementY || 0, 0.0028);
    else if (mouseDrag) rotateCam(e.movementX || 0, e.movementY || 0, 0.0055);
    return;
  }
  const r = pad.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (e.pointerId === stickId) {
    let dx = x - stickOX, dy = y - stickOY;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
    stickKnob.style.left = stickOX + dx + 'px';
    stickKnob.style.top = stickOY + dy + 'px';
    const mag = Math.hypot(dx, dy) / STICK_R;
    if (mag < 0.15) { input.stickX = 0; input.stickY = 0; }
    else { input.stickX = dx / STICK_R; input.stickY = dy / STICK_R; }
    return;
  }
  const t = camTouches.get(e.pointerId);
  if (!t) return;
  if (camTouches.size >= 2) {
    t.x = x; t.y = y;
    const [a, b] = [...camTouches.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0 && d > 0) {
      const f = pinchDist / d;
      if (cam.dist < 0.5) { if (f > 1.04) { zoomCam(1.2); pinchDist = d; } }
      else { zoomCam(f); pinchDist = d; }
    } else pinchDist = d;
  } else {
    rotateCam(x - t.x, y - t.y, 0.007);
    t.x = x; t.y = y;
  }
});
function pointerEnd(e) {
  if (e.pointerType === 'mouse') { mouseDrag = false; return; }
  if (e.pointerId === stickId) endStick();
  camTouches.delete(e.pointerId);
  pinchDist = 0;
}
pad.addEventListener('pointerup', pointerEnd);
pad.addEventListener('pointercancel', pointerEnd);
pad.addEventListener('wheel', (e) => { e.preventDefault(); zoomCam(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });

// Touch buttons
const jumpBtn = $('jump'), actBtn = $('act'), runBtn = $('run');
function holdButton(btn, down, up) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio(); hideHintSoon();
    try { btn.setPointerCapture(e.pointerId); } catch { /* ok */ }
    btn.classList.add('down'); popAnim(btn); down();
  });
  const end = () => { btn.classList.remove('down'); if (up) up(); };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdButton(jumpBtn, () => { input.touchJump = true; pressJump(); }, () => { input.touchJump = false; });
holdButton(actBtn, () => doAction());
holdButton(runBtn, () => {
  input.runToggle = !input.runToggle;
  runBtn.classList.toggle('on', input.runToggle);
  runBtn.setAttribute('aria-pressed', String(input.runToggle));
});
jumpBtn.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') pressJump(); });
actBtn.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') doAction(); });

// Hotbar: every tap spawns, any number of fingers, and holding a slot keeps spawning
const hotbar = $('hotbar');
function selectItem(i) {
  selectedItem = i;
  [...hotbar.children].forEach((el, j) => el.classList.toggle('selected', j === i));
}
ITEMS.forEach((item, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'slot'; b.id = `slot-${item.id}`;
  b.setAttribute('aria-label', `Spawn ${item.name}`);
  const num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1);
  const ico = makeIcon(item.id); ico.style.color = item.color;
  const label = document.createElement('span'); label.className = 'label'; label.textContent = item.name;
  b.append(num, ico, label);
  const spawn = () => { initAudio(); selectItem(i); spawnProp(item.id); };
  let repeat = null;
  const stop = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };
  tap(b, () => {
    spawn();
    stop();
    repeat = setTimeout(() => { repeat = setInterval(() => { popAnim(b); spawn(); }, 130); }, 380);
  }, 'down');
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointercancel', stop);
  b.addEventListener('lostpointercapture', stop);
  hotbar.appendChild(b);
});
selectItem(0);

tap($('btn-reset'), () => { initAudio(); onReset(); });
tap($('btn-mode'), () => { initAudio(); if (card.hidden) showCard(); else hideCard(); });
tap($('btn-play-tag'), () => { initAudio(); startTag(); });
tap($('btn-play-free'), () => { initAudio(); startFree(); });
window.addEventListener('pointerup', initAudio);

// Full screen (hidden where the browser cannot do it, e.g. iPhone Safari)
const fsBtn = $('btn-fullscreen');
const fsRoot = document.documentElement;
const fsRequest = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsSupported = !!(fsRequest && fsExit) && document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
function toggleFullscreen() {
  if (!fsSupported) { toast('Full screen is not available in this browser', 1800); return; }
  const fail = () => toast('Full screen is not available here', 1800);
  try {
    const p = fsElement() ? fsExit.call(document) : fsRequest.call(fsRoot);
    if (p && p.catch) p.catch(fail);
  } catch { fail(); }
}
function onFullscreenChange() {
  const on = !!fsElement();
  fsBtn.querySelector('.label').textContent = on ? 'Exit full screen' : 'Full screen';
  fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  setIcon(fsBtn.querySelector('.ico'), on ? 'fullscreen-exit' : 'fullscreen');
  fsBtn.setAttribute('aria-pressed', String(on));
  resize();
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
fsBtn.hidden = !fsSupported;
tap(fsBtn, () => { initAudio(); toggleFullscreen(); });

// ───────────────────────────── Settings menu ─────────────────────────────
const TIMES = {
  day: { sky: 0x8fd3ff, hemiSky: 0xffffff, hemiGround: 0x6b8f5a, hemiI: 1.15, sunC: 0xfff1d6, sunI: 2.1, off: [22, 48, 16], cloud: 0xffffff, cloudA: 0.9 },
  sunset: { sky: 0xf7a072, hemiSky: 0xffd9b8, hemiGround: 0x7a6a55, hemiI: 0.85, sunC: 0xff8a4a, sunI: 2.0, off: [44, 16, 12], cloud: 0xffd0b0, cloudA: 0.9 },
  night: { sky: 0x0c1230, hemiSky: 0x8fa3ff, hemiGround: 0x1a2030, hemiI: 0.42, sunC: 0xa9bcff, sunI: 0.55, off: [-18, 46, 14], cloud: 0x33406a, cloudA: 0.5 },
};
const VIEWS = { near: [35, 95], medium: [60, 160], far: [80, 270] };
const SHADOW_SIZE = { low: 1024, high: 2048, ultra: 4096 };

function applySettings() {
  if (applied.aa !== settings.aa) {
    if (!buildRenderer(settings.aa)) settings.aa = applied.aa;
  }
  const cap = settings.preset === 'ultra' ? 3 : 2;
  renderer.setPixelRatio(Math.max(0.35, Math.min(window.devicePixelRatio || 1, cap) * (settings.scale / 100)));
  resize();

  if (applied.shadows !== settings.shadows) {
    const on = settings.shadows !== 'off';
    renderer.shadowMap.enabled = on;
    sun.castShadow = on;
    if (on) sun.shadow.mapSize.set(SHADOW_SIZE[settings.shadows], SHADOW_SIZE[settings.shadows]);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    scene.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
    });
    applied.shadows = settings.shadows;
  }

  const t = TIMES[settings.time] || TIMES.day;
  scene.background.setHex(t.sky);
  scene.fog.color.setHex(t.sky);
  const [near, far] = VIEWS[settings.view] || VIEWS.far;
  scene.fog.near = near; scene.fog.far = far;
  hemi.color.setHex(t.hemiSky); hemi.groundColor.setHex(t.hemiGround); hemi.intensity = t.hemiI;
  sun.color.setHex(t.sunC); sun.intensity = t.sunI;
  sunOffset.set(t.off[0], t.off[1], t.off[2]);
  cloudMat.color.setHex(t.cloud); cloudMat.opacity = t.cloudA;
  nightStars.visible = settings.time === 'night';
  headlamp.intensity = settings.time === 'night' ? 22 : 0;

  sceneryGroup.visible = settings.scenery;
  $('fps-chip').hidden = !settings.fps;
  world.gravity.y = GRAVITY * (GRAVITY_MULT[settings.gravity] || 1);
  applySkin();
  camera.updateProjectionMatrix();
}

const controls = {}; // key → function that refreshes the control from settings
function onSettingChanged(key) {
  if (key === 'preset') {
    if (PRESETS[settings.preset]) Object.assign(settings, PRESETS[settings.preset]);
  } else if (key in PRESETS.low) settings.preset = 'custom';
  for (const k of Object.keys(controls)) controls[k]();
  applySettings();
  saveSettings();
}

function addRow(panelName, key, label, kind, opt, hint) {
  const panel = document.querySelector(`[data-panel="${panelName}"]`);
  const row = document.createElement('label');
  row.className = 'row';
  const text = document.createElement('span');
  text.textContent = label;
  if (hint) { const s = document.createElement('small'); s.textContent = hint; text.appendChild(s); }
  row.appendChild(text);
  let el;
  if (kind === 'select') {
    el = document.createElement('select');
    for (const [value, name] of opt) { const o = document.createElement('option'); o.value = value; o.textContent = name; el.appendChild(o); }
    el.addEventListener('change', () => { settings[key] = el.value; onSettingChanged(key); });
    controls[key] = () => { el.value = settings[key]; };
    row.appendChild(el);
  } else if (kind === 'range') {
    el = document.createElement('input');
    el.type = 'range'; el.min = opt[0]; el.max = opt[1]; el.step = opt[2];
    const val = document.createElement('span'); val.className = 'val';
    el.addEventListener('input', () => { settings[key] = +el.value; onSettingChanged(key); });
    controls[key] = () => { el.value = settings[key]; val.textContent = settings[key] + opt[3]; };
    row.append(el, val);
  } else {
    el = document.createElement('input');
    el.type = 'checkbox';
    el.addEventListener('change', () => { settings[key] = el.checked; onSettingChanged(key); });
    controls[key] = () => { el.checked = !!settings[key]; };
    row.appendChild(el);
  }
  el.id = `set-${key}`;
  panel.appendChild(row);
}

addRow('graphics', 'preset', 'Quality preset', 'select', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['custom', 'Custom']]);
addRow('graphics', 'scale', 'Resolution', 'range', [40, 100, 5, '%'], 'Lower is faster');
addRow('graphics', 'shadows', 'Shadows', 'select', [['off', 'Off'], ['low', 'Low'], ['high', 'High'], ['ultra', 'Ultra']]);
addRow('graphics', 'view', 'View distance', 'select', [['near', 'Near'], ['medium', 'Medium'], ['far', 'Far']]);
addRow('graphics', 'aa', 'Anti-aliasing', 'check', null, 'Smooths jagged edges');
addRow('graphics', 'particles', 'Particles', 'check');
addRow('graphics', 'scenery', 'Clouds and flowers', 'check');
addRow('graphics', 'time', 'Time of day', 'select', [['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']]);
addRow('graphics', 'fov', 'Field of view', 'range', [50, 100, 1, '°']);
addRow('graphics', 'shake', 'Camera shake', 'check');
addRow('graphics', 'fps', 'Show FPS', 'check');

addRow('game', 'gravity', 'Gravity', 'select', [['moon', 'Moon'], ['normal', 'Normal'], ['heavy', 'Heavy']]);
addRow('game', 'slowmo', 'Slow motion', 'check');
addRow('game', 'doubleJump', 'Double jump', 'check');
addRow('game', 'sens', 'Look sensitivity', 'range', [30, 300, 10, '%']);
addRow('game', 'invertY', 'Invert look up/down', 'check');
addRow('game', 'sound', 'Sound', 'check');
{
  const panel = document.querySelector('[data-panel="game"]');
  const actions = document.createElement('div');
  actions.className = 'actions';
  const mk = (id, text, icon, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.id = id;
    const label = document.createElement('span'); label.className = 'label'; label.textContent = text;
    b.append(makeIcon(icon), label);
    tap(b, () => { initAudio(); fn(); });
    actions.appendChild(b);
  };
  mk('btn-respawn', 'Respawn', 'home', () => respawn());
  mk('btn-reset2', 'Reset world', 'reset', () => onReset());
  mk('btn-defaults', 'Default settings', 'settings', () => { Object.assign(settings, DEFAULTS); onSettingChanged(''); });
  panel.appendChild(actions);
}
{
  const panel = document.querySelector('[data-panel="clawd"]');
  const row = document.createElement('div');
  row.className = 'row';
  const text = document.createElement('span'); text.textContent = 'Colour';
  const sw = document.createElement('div'); sw.className = 'swatches';
  const colors = [['#d97757', 'Classic orange'], ['#4d96ff', 'Blue'], ['#6bcb77', 'Green'], ['#b983ff', 'Purple'], ['#ff6b9d', 'Pink'], ['#ffd93d', 'Yellow'], ['#f4f1de', 'Cream'], ['#374151', 'Charcoal']];
  const btns = [];
  for (const [hex, name] of colors) {
    const b = document.createElement('button');
    b.type = 'button'; b.style.background = hex; b.setAttribute('aria-label', name); b.dataset.color = hex;
    tap(b, () => { settings.color = hex; onSettingChanged('color'); });
    sw.appendChild(b); btns.push(b);
  }
  controls.color = () => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === settings.color)));
  row.append(text, sw);
  panel.appendChild(row);
}
addRow('clawd', 'hat', 'Hat', 'select', [['none', 'None'], ['tophat', 'Top hat'], ['crown', 'Crown'], ['party', 'Party hat'], ['propeller', 'Propeller cap']]);
{
  const panel = document.querySelector('[data-panel="clawd"]');
  const actions = document.createElement('div');
  actions.className = 'actions';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn'; b.id = 'btn-dance';
  const label = document.createElement('span'); label.className = 'label'; label.textContent = 'Dance';
  b.append(makeIcon('music'), label);
  tap(b, () => { state.emote = 2.4; });
  actions.appendChild(b);
  panel.appendChild(actions);
}

function toggleMenu(force) {
  const menu = $('menu');
  const open = force === undefined ? menu.hidden : force;
  menu.hidden = !open;
  $('btn-menu').setAttribute('aria-expanded', String(open));
  if (open) { if (document.pointerLockElement) document.exitPointerLock(); keys.clear(); }
  else pad.focus({ preventScroll: true });
}
tap($('btn-menu'), () => { initAudio(); toggleMenu(); });
tap($('menu-close'), () => toggleMenu(false));
for (const tab of document.querySelectorAll('.tabs button')) {
  tap(tab, () => {
    for (const t of document.querySelectorAll('.tabs button')) t.setAttribute('aria-selected', String(t === tab));
    for (const p of document.querySelectorAll('.panel')) p.hidden = p.dataset.panel !== tab.dataset.tab;
  });
}
for (const k of Object.keys(controls)) controls[k]();
applySettings();

// ───────────────────────────── Simulation step hooks ─────────────────────────────
const tmpV = new CANNON.Vec3();
const tmpV2 = new CANNON.Vec3();
const tmpV3 = new CANNON.Vec3();
const LOCAL_Z = new CANNON.Vec3(0, 0, 1);
const LOCAL_Y = new CANNON.Vec3(0, 1, 0);

function readMove() {
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('KeyA')) s -= 1;
  f -= input.stickY; s += input.stickX;
  let mag = Math.hypot(f, s);
  if (mag > 1) { f /= mag; s /= mag; mag = 1; }
  state.inF = f; state.inS = s;
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  state.moveX = -sy * f + cy * s;
  state.moveZ = -cy * f - sy * s;
  state.moveMag = mag;
  input.jumpHeld = keys.has('Space') || input.touchJump;
  state.sprint = keys.has('KeyQ') || input.runToggle;
  if (mag > 0.1 || input.jumpHeld) state.emote = 0;
}

world.addEventListener('preStep', () => {
  const g = -world.gravity.y;

  // Kinematic platforms follow their paths
  for (const mv of movers) {
    mv.path(simTime + FIXED, tmpV);
    mv.body.velocity.set((tmpV.x - mv.body.position.x) / FIXED, (tmpV.y - mv.body.position.y) / FIXED, (tmpV.z - mv.body.position.z) / FIXED);
  }

  // Release the wrecking ball when Clawd gets close
  if (wrecker.armed) {
    const dx = pp.x - WRECK_ANCHOR.x, dz = pp.z - WRECK_ANCHOR.z;
    if (dx * dx + dz * dz < 13 * 13) {
      wrecker.armed = false;
      wrecker.body.type = DYNAMIC;
      wrecker.body.velocity.set(0, 0, 0);
      wrecker.body.wakeUp();
    }
  }

  // Zones: wind column, water, balloon lift
  state.water = 0; state.inWind = false;
  for (const b of buddies) b.water = false;
  for (const b of world.bodies) {
    if (b.type !== DYNAMIC) continue;
    const p = b.position;
    if (p.y < -100) continue;
    if (p.x > WIND.x0 && p.x < WIND.x1 && p.z > WIND.z0 && p.z < WIND.z1 && p.y < WIND.top && p.y > 0) {
      if (b.sleepState === SLEEPING) b.wakeUp();
      const a = 2.7 * g * (1 - p.y / 26);
      if (a > 0) b.force.y += b.mass * a;
      b.velocity.y *= 1 - 1.8 * FIXED;
      if (b === playerBody) state.inWind = true;
    }
    if (b.sleepState === SLEEPING) continue;
    if (b.lift) b.force.y += b.mass * g + b.lift;
    if (p.x > WATER.x0 && p.x < WATER.x1 && p.z > WATER.z0 && p.z < WATER.z1) {
      const r = Math.max(0.3, b.boundingRadius * 0.7);
      const frac = clamp((WATER.top - (p.y - r)) / (2 * r), 0, 1);
      if (frac > 0) {
        b.force.y += b.mass * g * (b.buoy || 1.6) * frac;
        const k = 1 - 2.4 * FIXED * frac;
        if (b === playerBody) { b.velocity.y *= k; state.water = frac; }
        else { b.velocity.scale(k, b.velocity); b.angularVelocity.scale(k, b.angularVelocity); }
        if (b.walker && b.walker.isBot && frac > 0.3) b.walker.water = true;
      }
    }
  }

  // Bots: wander in free play; in tag the IT bot chases and the rest run away
  const tagging = tag.active && tag.it && (tag.phase === 'run' || tag.phase === 'countdown');
  for (const b of buddies) {
    const e = b.entry, body = b.body, v = body.velocity, bp = body.position;
    if (e.dead || held === e) continue;
    if (b.stun > 0) { b.stun -= FIXED; v.x *= 0.85; v.z *= 0.85; continue; }
    let dx = 0, dz = 0, speed = 0, hop = false, wander = false;
    if (tagging && tag.it === b) {
      if (tag.phase === 'run') {
        let bestD = 1e9, ty = 0;
        for (const p of tagPlayers) {
          if (p === b || !p.alive || (p === tag.immune && tag.immuneT > 0)) continue;
          posOf(p, tagPos2);
          const d = Math.hypot(tagPos2.x - bp.x, tagPos2.z - bp.z);
          if (d < bestD) { bestD = d; dx = tagPos2.x - bp.x; dz = tagPos2.z - bp.z; ty = tagPos2.y; }
        }
        if (bestD < 1e9) { speed = BOT_IT_SPEED; if (ty - bp.y > 1.2 && bestD < 6) hop = true; }
      }
    } else if (tagging) {
      posOf(tag.it, tagPos2);
      const ax = bp.x - tagPos2.x, az = bp.z - tagPos2.z, d = Math.hypot(ax, az) || 1;
      if (d < 30) {
        speed = d < 16 ? BOT_RUN_SPEED : 5.5;
        b.jitT -= FIXED;
        if (b.jitT <= 0) { b.jitT = 0.6 + Math.random(); b.jit = (Math.random() - 0.5) * 1.4; }
        const c = Math.cos(b.jit), s = Math.sin(b.jit);
        dx = (ax * c - az * s) / d; dz = (ax * s + az * c) / d;
        const r = Math.hypot(bp.x, bp.z);
        if (r > 40) { const k = (r - 40) / 8; dx -= (bp.x / r) * k; dz -= (bp.z / r) * k; } // stay in the arena
      } else wander = true;
    } else wander = true;
    if (wander) {
      b.timer -= FIXED;
      if (b.timer <= 0) {
        b.timer = 2 + Math.random() * 4;
        if (Math.random() < 0.3) b.tx = null;
        else { b.tx = b.homeX + (Math.random() - 0.5) * 26; b.tz = b.homeZ + (Math.random() - 0.5) * 26; }
      }
      if (b.tx !== null) {
        dx = b.tx - bp.x; dz = b.tz - bp.z;
        if (Math.hypot(dx, dz) < 0.7) { b.tx = null; dx = dz = 0; } else speed = 3.2;
      }
    }
    const m = Math.hypot(dx, dz);
    if (m > 0) { dx /= m; dz /= m; } else speed = 0;
    if (b.sideT > 0) { // steer around whatever blocked us
      b.sideT -= FIXED;
      const c = Math.cos(b.side * 1.1), s = Math.sin(b.side * 1.1), ox = dx;
      dx = ox * c - dz * s; dz = ox * s + dz * c;
    }
    const onFloor = b.grounded || b.water;
    let ax = dx * speed - v.x, az = dz * speed - v.z;
    const am = Math.hypot(ax, az), maxA = (onFloor ? 60 : 14) * FIXED;
    if (am > maxA) { ax *= maxA / am; az *= maxA / am; }
    v.x += ax; v.z += az;
    if (!onFloor) continue;
    if (speed > 4 && Math.hypot(v.x, v.z) < 1.5) {
      b.stuck += FIXED;
      if (b.stuck > 0.3) { hop = true; b.stuck = 0; b.sideT = 0.9; b.side = Math.random() < 0.5 ? -1 : 1; }
    } else b.stuck = 0;
    if (b.water && speed > 0 && Math.random() < 0.08) hop = true;
    if (wander && speed > 0 && Math.random() < 0.006) hop = true;
    if (hop) { v.y = b.water ? 10.5 : 9.5; b.model.squash = 0.3; }
  }

  // Held object follows a point in front of Clawd
  if (held) {
    const hb = held.body, d = aimDir(aimV);
    const reach = 1.5 + hb.boundingRadius * 0.6;
    const src = state.riding ? kart.body.position : playerBody.position;
    tmpV3.set(src.x + d.x * reach - hb.position.x, src.y + 0.6 + d.y * reach - hb.position.y, src.z + d.z * reach - hb.position.z);
    const dist = tmpV3.length();
    if (dist > 7 || held.dead) dropHeld();
    else {
      tmpV3.scale(14, tmpV3);
      const sp = tmpV3.length();
      if (sp > 30) tmpV3.scale(30 / sp, tmpV3);
      hb.velocity.copy(tmpV3);
      hb.angularVelocity.scale(0.85, hb.angularVelocity);
      hb.wakeUp();
    }
  }

  // Kart driving
  if (state.riding) {
    const kb = kart.body, v = kb.velocity;
    kb.quaternion.vmult(LOCAL_Z, tmpV);            // forward
    const fx = tmpV.x, fz = tmpV.z;
    const vf = v.x * fx + v.z * fz;
    const vl = v.x * fz - v.z * fx;                // sideways slip (along +right = (fz, -fx))
    if (kart.grounded) {
      const target = state.inF >= 0 ? state.inF * (state.sprint ? 24 : 18) : state.inF * 8;
      const dv = clamp(target - vf, -26 * FIXED, 26 * FIXED);
      v.x += fx * dv; v.z += fz * dv;
      const grip = Math.min(1, 9 * FIXED);
      v.x -= fz * vl * grip; v.z -= -fx * vl * grip;
      if ((input.jumpHeld || simTime - input.jumpPressedAt < JUMP_BUFFER) && state.jumpCooldown <= 0) {
        v.y = 9; state.jumpCooldown = 0.4; input.jumpPressedAt = -10; sfx.jump();
      }
    }
    kb.angularVelocity.y = -state.inS * 2.4 * clamp(vf / 5, -1, 1);
    kart.speed = vf;
    state.jumpCooldown -= FIXED;
    return;
  }
  if (kart.grounded) { kart.body.velocity.x *= 0.9; kart.body.velocity.z *= 0.9; }
  kart.speed = 0;

  // Player: velocity-driven walking with full air control
  const v = playerBody.velocity;
  const ground = state.grounded ? state.groundBody : null;
  if (ground) {
    if (ground.conveyor) { state.carryX = ground.conveyor.x; state.carryZ = ground.conveyor.z; }
    else if (ground.slippery) {
      // sliding: keep the momentum you have (capped), steer only a little
      const sp = Math.hypot(v.x, v.z), k = sp > 15 ? 15 / sp : 0.997;
      state.carryX = v.x * k; state.carryZ = v.z * k;
    } else {
      ground.getVelocityAtWorldPoint(playerBody.position, tmpV2);
      state.carryX = tmpV2.x; state.carryZ = tmpV2.z;
    }
    state.carryDecay = 1.5;
  } else {
    const k = Math.exp(-state.carryDecay * FIXED);
    state.carryX *= k; state.carryZ *= k;
  }
  const swimming = state.water > 0.35;
  const sliding = !!(ground && ground.slippery);
  const speed = (state.sprint ? SPRINT_SPEED : WALK_SPEED) * (swimming ? 0.6 : 1) * (sliding ? 0.35 : 1);
  const tx = state.moveX * speed + state.carryX;
  const tz = state.moveZ * speed + state.carryZ;
  const accel = sliding ? 7 : (state.grounded ? GROUND_ACCEL : AIR_ACCEL);
  const maxDv = accel * FIXED;
  let dvx = tx - v.x, dvz = tz - v.z;
  const dv = Math.hypot(dvx, dvz);
  if (dv > maxDv) { dvx *= maxDv / dv; dvz *= maxDv / dv; }
  v.x += dvx; v.z += dvz;

  state.jumpCooldown -= FIXED;
  const pressed = simTime - input.jumpPressedAt < JUMP_BUFFER;
  if (state.jumpCooldown <= 0) {
    if (swimming) {
      if (input.jumpHeld || pressed) {
        v.y = 10.5; state.jumpCooldown = 0.4; input.jumpPressedAt = -10; state.airJumps = 1;
      }
    } else if ((input.jumpHeld || pressed) && state.coyote > 0) {
      const gvy = ground ? Math.max(0, ground.velocity.y) : 0;
      v.y = JUMP_SPEED + gvy;
      state.coyote = 0; state.jumpCooldown = 0.25; state.grounded = false;
      input.jumpPressedAt = -10;
      clawd.squash = 0.3; state.jumps++;
      sfx.jump();
    } else if (pressed && settings.doubleJump && state.airJumps > 0 && state.coyote <= 0) {
      v.y = JUMP_SPEED * 0.92;
      state.airJumps--; state.jumpCooldown = 0.2;
      input.jumpPressedAt = -10;
      clawd.squash = 0.25; state.jumps++;
      burst({ x: playerBody.position.x, y: playerBody.position.y - 1.2, z: playerBody.position.z }, 6, 0xfff7ef, 3);
      sfx.jump2();
    }
  }
  state.lastVy = v.y;
});

world.addEventListener('postStep', () => {
  simTime += FIXED;
  playerWalker.hit = false; playerWalker.best = 0.5; playerWalker.ground = null;
  kart.grounded = false;
  for (const b of buddies) b.grounded = false;

  for (const c of world.contacts) {
    const bi = c.bi, bj = c.bj, ny = c.ni.y;
    // A fast prop stuns the bot it hits
    const botBody = bi.walker && bi.walker.isBot ? bi : (bj.walker && bj.walker.isBot ? bj : null);
    if (botBody) {
      const other = botBody === bi ? bj : bi, w = botBody.walker;
      if (other.type === DYNAMIC && !other.walker && other.entry && other.entry !== held && w.stun <= 0) {
        const rel = Math.hypot(other.velocity.x - botBody.velocity.x, other.velocity.y - botBody.velocity.y, other.velocity.z - botBody.velocity.z);
        if (rel > 9) { w.stun = 1.6; w.model.squash = -0.35; burst(botBody.position, 8, 0xffd93d, 5); }
      }
    }
    if (bi.walker && -ny > 0.5) {
      if (bi === playerBody) { if (-ny > playerWalker.best) { playerWalker.best = -ny; playerWalker.hit = true; playerWalker.ground = bj; } }
      else if (bj !== playerBody) bi.walker.grounded = true;
    }
    if (bj.walker && ny > 0.5) {
      if (bj === playerBody) { if (ny > playerWalker.best) { playerWalker.best = ny; playerWalker.hit = true; playerWalker.ground = bi; } }
      else if (bi !== playerBody) bj.walker.grounded = true;
    }
    // Conveyors drag whatever sits on them
    const belt = bi.conveyor ? bi : (bj.conveyor ? bj : null);
    if (belt) {
      const other = belt === bi ? bj : bi;
      if (other.type === DYNAMIC && other !== playerBody) {
        other.velocity.x += (belt.conveyor.x - other.velocity.x) * 0.15;
        other.velocity.z += (belt.conveyor.z - other.velocity.z) * 0.15;
        other.wakeUp();
      }
    }
  }
  tagStep();
  if (state.riding) { state.grounded = false; state.groundBody = null; return; }

  let grounded = playerWalker.hit;
  const groundBody = playerWalker.ground;
  if (grounded && state.jumpCooldown > 0.1) grounded = false; // just jumped; ignore the lingering contact
  if (grounded && !state.grounded && state.lastVy < -7) {
    clawd.squash = -0.3;
    if (!(groundBody && groundBody.bouncy)) sfx.land();
  }
  state.grounded = grounded;
  state.groundBody = grounded ? groundBody : null;
  state.coyote = grounded ? COYOTE : state.coyote - FIXED;
  if (grounded) state.airJumps = 1;

  if (grounded && state.jumpCooldown <= 0) {
    if (groundBody.bouncy) {
      playerBody.velocity.y = groundBody.bouncy;
      state.grounded = false; state.coyote = 0; state.jumpCooldown = 0.25;
      clawd.squash = 0.4;
      sfx.bounce();
    } else if (groundBody.launch) {
      const l = groundBody.launch;
      playerBody.velocity.set(l.x, l.y, l.z);
      state.carryX = l.x; state.carryZ = l.z; state.carryDecay = 0.3;
      state.grounded = false; state.coyote = 0; state.jumpCooldown = 0.3;
      clawd.squash = 0.45;
      burst(playerBody.position, 10, 0xff6b6b, 6);
      sfx.bounce();
    } else if (groundBody.checkpoint && !spawnPoint.almostEquals(groundBody.checkpoint, 0.1)) {
      spawnPoint.copy(groundBody.checkpoint);
      toast('Checkpoint!', 1300);
      sfx.check();
    }
  }
});

// ───────────────────────────── Frame loop ─────────────────────────────
const rayFrom = new CANNON.Vec3(), rayTo = new CANNON.Vec3();
const rayResult = new CANNON.RaycastResult();
const camTarget = new THREE.Vector3(), camOffset = new THREE.Vector3(), lookAt = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), ropeA = new THREE.Vector3(), ropeB = new THREE.Vector3(), ropeDir = new THREE.Vector3();
let camDistSmooth = cam.dist;
let fovSmooth = settings.fov;
let lastAction = '';
let fpsFrames = 0, fpsTime = 0;

function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function ropeEnd(e, out) {
  if (e.v) return out.copy(e.v);
  e.mesh.updateMatrixWorld();
  return out.copy(e.local).applyMatrix4(e.mesh.matrixWorld);
}
const ACTION_LABEL = { grab: 'GRAB', throw: 'THROW', ride: 'RIDE', exit: 'EXIT' };
const ACTION_ICON = { grab: 'grab', throw: 'throw', ride: 'ride', exit: 'exit' };
const ACTION_PROMPT = { grab: 'grab', throw: 'throw', ride: 'ride the kart', exit: 'hop off' };

function frame(dt, now) {
  if (keys.has('ArrowLeft')) cam.yaw += 2.2 * dt;
  if (keys.has('ArrowRight')) cam.yaw -= 2.2 * dt;
  if (keys.has('KeyI')) zoomCam(1 - 1.5 * dt);
  if (keys.has('KeyO')) zoomCam(1 + 1.5 * dt);

  readMove();
  const simDt = dt * (settings.slowmo ? 0.35 : 1);
  if (tag.active) { // sprinting costs stamina in tag
    if (state.sprint && state.moveMag > 0.1 && !state.winded) {
      state.stamina -= 34 * dt;
      if (state.stamina <= 0) { state.stamina = 0; state.winded = true; }
    } else {
      state.stamina = Math.min(100, state.stamina + 20 * dt);
      if (state.stamina > 30) state.winded = false;
    }
    if (state.winded) state.sprint = false;
  }
  if (playerP.stun > 0) { state.moveX = state.moveZ = state.moveMag = state.inF = state.inS = 0; input.jumpHeld = false; input.jumpPressedAt = -10; }
  world.step(FIXED, simDt, 5);

  // Out-of-world cleanup
  const fellY = state.riding ? kart.body.position.y : playerBody.position.y;
  if (fellY < -25) {
    if (state.riding) {
      exitKart();
      kart.body.position.copy(kart.entry.home.p); kart.body.quaternion.copy(kart.entry.home.q);
      kart.body.velocity.set(0, 0, 0); kart.body.angularVelocity.set(0, 0, 0);
    }
    respawn(); toast('Whoops! Back you go.', 1500);
  }
  for (let i = spawned.length - 1; i >= 0; i--) {
    const y = spawned[i].body.position.y;
    if (y < -40 || y > 90) removeSpawned(spawned[i]);
  }
  for (const e of props) {
    const b = e.body;
    if (b.position.y >= -60 || e.dead) continue;
    if (e.buddy || e.kart || e === soccer.ball) {
      b.position.copy(e.home.p); b.quaternion.copy(e.home.q);
      b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
    } else if (b.sleepState !== SLEEPING) { b.velocity.set(0, 0, 0); b.sleep(); }
  }

  // TNT fuses
  for (const list of [props, spawned]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.tnt || e.dead || e.fuse === Infinity) continue;
      e.fuse -= simDt;
      if (e.fuse <= 0) detonate(e);
    }
  }

  tagFrame(simDt);

  // Sync meshes
  for (const e of synced) {
    const p = e.body.interpolatedPosition, q = e.body.interpolatedQuaternion;
    e.mesh.position.set(p.x, p.y, p.z);
    e.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    if (e.tnt && e.fuse !== Infinity) e.mesh.scale.setScalar(1.1 * (1 + 0.1 * Math.sin(now * 0.03)));
    else if (e.tnt) e.mesh.scale.setScalar(1.1);
  }

  // Where is Clawd?
  const firstPerson = cam.dist < 0.5;
  let kartYaw = 0;
  if (state.riding) {
    kart.body.quaternion.vmult(LOCAL_Z, tmpV);
    kartYaw = Math.atan2(tmpV.x, tmpV.z);
    pp.copy(kart.entry.mesh.position); pp.y += 0.95;
  } else {
    const ip = playerBody.interpolatedPosition;
    pp.set(ip.x, ip.y, ip.z);
  }

  // Ropes
  for (const r of ropes) {
    ropeEnd(r.a, ropeA); ropeEnd(r.b, ropeB);
    ropeDir.subVectors(ropeB, ropeA);
    const len = ropeDir.length();
    r.mesh.position.addVectors(ropeA, ropeB).multiplyScalar(0.5);
    r.mesh.scale.set(1, len, 1);
    r.mesh.quaternion.setFromUnitVectors(UP, ropeDir.divideScalar(len || 1));
  }

  // Clawd pose
  const v = playerBody.velocity;
  if (state.riding) {
    clawd.group.position.set(pp.x, pp.y - 0.55, pp.z);
    state.facing = kartYaw;
    animateClawd(clawd, dt, true, 0, 0, WALK_SPEED);
    for (const w of kart.wheels) w.rotation.x += kart.speed * dt / 0.42;
  } else {
    clawd.group.position.set(pp.x, pp.y - PLAYER_R, pp.z);
    if (cam.shiftLock || firstPerson) state.facing = cam.yaw + Math.PI;
    else if (state.moveMag > 0.1) state.facing = angleLerp(state.facing, Math.atan2(state.moveX, state.moveZ), 1 - Math.exp(-14 * dt));
    const hSpeed = Math.hypot(v.x - state.carryX, v.z - state.carryZ);
    animateClawd(clawd, dt, state.grounded || state.water > 0.35, hSpeed, v.y, WALK_SPEED);
  }
  clawd.group.rotation.y = state.facing;
  clawd.group.visible = !firstPerson;
  if (state.emote > 0) {
    state.emote -= dt;
    const t = 2.4 - state.emote;
    clawd.bodyGroup.rotation.y = t * Math.PI * 2.5;
    clawd.bodyGroup.position.y = Math.abs(Math.sin(t * 9)) * 0.35;
    clawd.arms.forEach((arm, i) => { arm.rotation.z = (i ? 1 : -1) * (0.9 + Math.sin(t * 18) * 0.4); });
    if (state.emote <= 0) clawd.bodyGroup.rotation.y = 0;
  }
  if (state.throwT > 0) {
    state.throwT -= dt;
    clawd.arms.forEach((arm, i) => { arm.rotation.z = (i ? 1 : -1) * 1.3; });
  }
  if (propeller) propeller.rotation.y += dt * (6 + Math.hypot(v.x, v.z) * 2);

  // Splash
  if (state.water > 0.2 && state.wasWater <= 0.2 && !state.riding) {
    burst({ x: pp.x, y: WATER.top - 0.5, z: pp.z }, 12, 0x9bd8ff, 6);
    sfx.splash();
  }
  state.wasWater = state.water;

  // Buddies
  for (const b of buddies) {
    const bv = b.body.velocity, sp = Math.hypot(bv.x, bv.z);
    if (sp > 0.6) b.facing = angleLerp(b.facing, Math.atan2(bv.x, bv.z), 1 - Math.exp(-10 * dt));
    b.model.group.rotation.y = b.facing;
    animateClawd(b.model, dt, (b.grounded || b.water) && held !== b.entry, sp, bv.y, 8);
  }

  // Soccer
  {
    const bp = soccer.ball.body.position;
    if (soccer.cooldown > 0) {
      soccer.cooldown -= dt;
      if (soccer.cooldown <= 0) {
        const e = soccer.ball;
        e.body.position.copy(e.home.p); e.body.velocity.set(0, 0, 0); e.body.angularVelocity.set(0, 0, 0); e.body.wakeUp();
      }
    } else {
      const dz = Math.abs(bp.z - soccer.cz) - soccer.halfZ;
      if (Math.abs(bp.x - soccer.cx) < 3.9 && bp.y < 3.5 && dz > 0.5 && dz < 2.6 && held !== soccer.ball) {
        soccer.goals++;
        soccer.cooldown = 1.6;
        $('goal-chip').hidden = false;
        $('goals').textContent = String(soccer.goals);
        toast('GOAL!', 1600);
        for (let i = 0; i < 3; i++) burst({ x: bp.x, y: bp.y, z: bp.z }, 12, pick(TOY_COLORS), 9);
        sfx.goal();
      } else if (Math.hypot(bp.x - soccer.cx, bp.z - soccer.cz) > 48) soccer.cooldown = 0.01;
    }
  }

  // Bowling
  if (!bowling.done) {
    let down = 0;
    for (const pin of bowling.pins) {
      pin.body.quaternion.vmult(LOCAL_Y, tmpV);
      if (tmpV.y < 0.7 || pin.body.position.y < 0.3) down++;
    }
    if (down === bowling.pins.length) {
      bowling.done = true;
      toast('STRIKE!', 2000);
      for (let i = 0; i < 3; i++) burst({ x: -54.5, y: 1, z: 28 }, 12, pick(TOY_COLORS), 9);
      sfx.goal();
    }
  }

  // Stars
  const tNow = now / 1000;
  for (const s of stars) {
    if (s.got) continue;
    s.mesh.rotation.y = tNow * 2 + s.phase;
    s.mesh.position.y = s.baseY + Math.sin(tNow * 2.2 + s.phase) * 0.18;
    const dx = s.mesh.position.x - pp.x, dy = s.baseY - pp.y, dz = s.mesh.position.z - pp.z;
    if (dx * dx + dy * dy + dz * dz < 1.7 * 1.7) collectStar(s);
  }

  // Moving decorations
  fanBlades.rotation.y += dt * 14;
  for (const bit of windBits) {
    bit.position.y += dt * (10 + (bit.position.x % 1) * 6);
    if (bit.position.y > 20) bit.position.y = 0.5;
  }
  beltTex.offset.x -= dt * 4.5 * (settings.slowmo ? 0.35 : 1) * 0.5;

  // Particles and flash
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy += GRAVITY * 0.6 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.rotation.x += dt * 6; p.m.rotation.y += dt * 5;
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
  flash.intensity *= Math.exp(-10 * dt);
  if (flash.intensity < 0.5) flash.intensity = 0;

  // Action prompt / touch button label
  const act = currentAction() || '';
  if (act !== lastAction) {
    lastAction = act;
    $('act-label').textContent = ACTION_LABEL[act] || 'GRAB';
    setIcon($('act-ico'), ACTION_ICON[act] || 'grab');
    actBtn.style.opacity = act ? '1' : '0.45';
    const prompt = $('prompt');
    prompt.hidden = !act;
    if (act) { prompt.textContent = ''; const b = document.createElement('b'); b.textContent = 'E'; prompt.append(b, ` ${ACTION_PROMPT[act]}`); }
  }

  // Camera: orbit around Clawd, pulled in if something static is in the way
  const cp = Math.cos(cam.pitch);
  camOffset.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
  camTarget.set(pp.x, pp.y + (firstPerson ? 0.35 : 0.9), pp.z);
  if (cam.shiftLock && !firstPerson) {
    camTarget.x += Math.cos(cam.yaw) * 1.1;
    camTarget.z += -Math.sin(cam.yaw) * 1.1;
  }
  let dist = cam.dist;
  if (dist > 0.5) {
    rayFrom.set(camTarget.x, camTarget.y, camTarget.z);
    rayTo.set(camTarget.x + camOffset.x * dist, camTarget.y + camOffset.y * dist, camTarget.z + camOffset.z * dist);
    rayResult.reset();
    world.raycastClosest(rayFrom, rayTo, { collisionFilterMask: G_STATIC, skipBackfaces: true }, rayResult);
    if (rayResult.hasHit) dist = Math.max(0.6, rayResult.distance - 0.35);
  }
  camDistSmooth = dist < camDistSmooth ? dist : camDistSmooth + (dist - camDistSmooth) * Math.min(1, dt * 8);
  camera.position.copy(camTarget).addScaledVector(camOffset, camDistSmooth);
  lookAt.copy(camera.position).sub(camOffset);
  camera.lookAt(lookAt);
  state.shake *= Math.exp(-5 * dt);
  if (settings.shake && state.shake > 0.01) {
    camera.position.x += (Math.random() - 0.5) * state.shake;
    camera.position.y += (Math.random() - 0.5) * state.shake;
    camera.position.z += (Math.random() - 0.5) * state.shake;
  }
  const moving = state.riding ? Math.abs(kart.speed) > 14 : (state.sprint && state.moveMag > 0.3);
  const fovTarget = settings.fov + (moving ? 7 : 0);
  if (Math.abs(fovTarget - fovSmooth) > 0.05) {
    fovSmooth += (fovTarget - fovSmooth) * Math.min(1, dt * 6);
    camera.fov = fovSmooth;
    camera.updateProjectionMatrix();
  }

  // Sun follows the player so shadows stay sharp nearby; the star dome follows the camera
  sun.target.position.set(pp.x, 0, pp.z);
  sun.position.set(pp.x + sunOffset.x, sunOffset.y, pp.z + sunOffset.z);
  nightStars.position.copy(camera.position);
  camera.updateMatrixWorld();
  tagHud(now);

  renderer.render(scene, camera);

  if (settings.fps) {
    fpsFrames++; fpsTime += dt;
    if (fpsTime >= 0.5) { $('fps').textContent = String(Math.round(fpsFrames / fpsTime)); fpsFrames = 0; fpsTime = 0; }
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  frame(dt, now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Small hook for automated playtests
window.__clawd = {
  playerBody, state, input, cam, keys, stars, world, spawned, props, settings, kart, soccer, bowling, buddies, links, pp,
  explode, spawnProp, doAction, resetWorld, toggleFullscreen, startTag, startFree, tag, playerP, eliminate, passIt,
  get held() { return held; },
  get renderer() { return renderer; },
  get starCount() { return starCount; },
  get simTime() { return simTime; },
};
