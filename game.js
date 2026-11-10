// Clawd Physics Playground
// A small 3D physics sandbox: you are Clawd, with Roblox-style controls on PC and mobile.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const $ = (id) => document.getElementById(id);
const canvas = $('game');

function fatal(msg) {
  const el = $('error');
  el.textContent = msg;
  el.hidden = false;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  fatal('This game needs WebGL, and your browser could not start it. Try another browser or turn on hardware acceleration.');
  throw err;
}

const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

// ───────────────────────────── Tunables ─────────────────────────────
const FIXED = 1 / 60;
const GRAVITY = -30;
const PLAYER_R = 0.75;
const WALK_SPEED = 8;
const JUMP_SPEED = 13;
const GROUND_ACCEL = 90;
const AIR_ACCEL = 45;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.15;
const SPAWN = new CANNON.Vec3(0, 2, 0);
const G_STATIC = 1, G_PLAYER = 2, G_PROP = 4;
const MAX_SPAWNED = 60;

// ───────────────────────────── Renderer / scene ─────────────────────────────
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = 0x8fd3ff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 70, 210);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(isCoarse ? 1024 : 2048, isCoarse ? 1024 : 2048);
sun.shadow.camera.left = -42; sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
resize();

// ───────────────────────────── Physics world ─────────────────────────────
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 12;

const matWorld = new CANNON.Material('world');
const matPlayer = new CANNON.Material('player');
const matBouncy = new CANNON.Material('bouncy');
world.defaultContactMaterial.friction = 0.45;
world.defaultContactMaterial.restitution = 0.05;
world.addContactMaterial(new CANNON.ContactMaterial(matWorld, matWorld, { friction: 0.45, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matPlayer, matWorld, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(matPlayer, matBouncy, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBouncy, matWorld, { friction: 0.3, restitution: 0.65 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBouncy, matBouncy, { friction: 0.3, restitution: 0.65 }));

// ───────────────────────────── Object helpers ─────────────────────────────
const synced = [];   // { mesh, body } pairs that move
const props = [];    // dynamic props that are part of the level (restored on Reset)
const spawned = [];  // props the player spawned (removed on Reset)
const movers = [];   // kinematic platforms: { body, path(t, outVec3) }

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
  mesh.castShadow = o.castShadow !== false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  world.addBody(body);
  const entry = { mesh, body };
  if (body.type !== CANNON.Body.STATIC) synced.push(entry);
  if (body.type === CANNON.Body.DYNAMIC && !o.spawned) {
    entry.home = { p: body.position.clone(), q: body.quaternion.clone() };
    props.push(entry);
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
  if (o.kinematic) { body.type = CANNON.Body.KINEMATIC; body.mass = 0; }
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
  const mesh = new THREE.Mesh(sphereGeo, lambert(o.color));
  mesh.scale.setScalar(o.r);
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  return finishBody(body, mesh, o);
}

function addCylinder(o) {
  const body = new CANNON.Body(bodyOpts(o));
  body.addShape(new CANNON.Cylinder(o.r, o.r, o.h, 14));
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, o.h, 20), lambert(o.color));
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  return finishBody(body, mesh, o);
}

// ───────────────────────────── Level ─────────────────────────────
function checkerTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, 64, 64);
  g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const GROUND = 140;
{
  const tex = checkerTexture('#7cc36a', '#74ba63');
  tex.repeat.set(GROUND / 8, GROUND / 8);
  const groundMats = [0, 1, 2, 3, 4, 5].map((i) =>
    i === 2 ? new THREE.MeshLambertMaterial({ map: tex }) : lambert(0x8a6a4a));
  addBox({ size: [GROUND, 4, GROUND], pos: [0, -2, 0], mat: groundMats, castShadow: false });
}

const CRATE_COLORS = [0xe9b872, 0xd9a35f, 0xf0c98a];
const TOY_COLORS = [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xb983ff, 0xff9f45, 0x4dd4c6];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Spawn pad
addCylinder({ r: 2.2, h: 0.2, pos: [0, 0.1, 0], color: 0xfff7ef, castShadow: false });

// 1. Crate pyramid (north of spawn)
for (let row = 0; row < 5; row++) {
  for (let i = 0; i < 5 - row; i++) {
    addBox({
      size: [1.2, 1.2, 1.2], mass: 1.2, color: CRATE_COLORS[(row + i) % 3],
      pos: [(i - (4 - row) / 2) * 1.25, 0.6 + row * 1.2, -14],
    });
  }
}

// 2. Ball pit (north-west)
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

// 3. Dominoes (east)
for (let i = 0; i < 14; i++) {
  addBox({ size: [0.3, 2, 1.1], mass: 1.2, color: TOY_COLORS[i % TOY_COLORS.length], pos: [8 + i * 1.15, 1, -6] });
}

// 4. Seesaw (south-east)
{
  const x = 14, z = 8;
  addBox({ size: [0.4, 0.7, 2.5], pos: [x, 0.35, z], color: 0x6b7280 });
  const plank = addBox({ size: [10, 0.3, 2.5], mass: 8, pos: [x, 1, z], color: 0x4d96ff });
  plank.body.allowSleep = false;
  const pivot = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 1, z) });
  pivot.collisionFilterGroup = 0; pivot.collisionFilterMask = 0;
  world.addBody(pivot);
  world.addConstraint(new CANNON.HingeConstraint(pivot, plank.body, {
    pivotA: new CANNON.Vec3(0, 0, 0), axisA: new CANNON.Vec3(0, 0, 1),
    pivotB: new CANNON.Vec3(0, 0, 0), axisB: new CANNON.Vec3(0, 0, 1),
  }));
  addBox({ size: [1.5, 1.5, 1.5], mass: 30, pos: [x - 4, 2.2, z], color: 0x374151 });
}

// 5. Spinner (south-west)
{
  const x = -14, z = 12;
  addCylinder({ r: 0.9, h: 1.4, pos: [x, 0.7, z], color: 0x6b7280 });
  const bar = addBox({ size: [11, 0.5, 0.6], pos: [x, 0.72, z], color: 0xff6b6b, kinematic: true });
  bar.body.angularVelocity.set(0, 1.5, 0);
  bar.body.allowSleep = false;
}

// 6. Wrecking ball (south)
let wrecker;
const WRECK_ANCHOR = new CANNON.Vec3(0, 10, 20);
const WRECK_LEN = 8;
{
  const post = 0x6b7280;
  addBox({ size: [0.7, 10.4, 0.7], pos: [-5, 5.2, 20], color: post });
  addBox({ size: [0.7, 10.4, 0.7], pos: [5, 5.2, 20], color: post });
  addBox({ size: [10.7, 0.7, 0.7], pos: [0, 10.4, 20], color: post });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      addBox({ size: [1.2, 1.2, 1.2], mass: 1, color: CRATE_COLORS[(row + i) % 3], pos: [(i - 1.5) * 1.25, 0.6 + row * 1.2, 20] });
    }
  }
  const ang = Math.PI / 3;
  wrecker = addBall({
    r: 1.2, mass: 25, color: 0x374151,
    pos: [0, WRECK_ANCHOR.y - Math.cos(ang) * WRECK_LEN, WRECK_ANCHOR.z + Math.sin(ang) * WRECK_LEN],
  });
  wrecker.body.type = CANNON.Body.KINEMATIC; // held until Clawd walks up
  wrecker.body.allowSleep = false;
  wrecker.body.linearDamping = 0.01;
  wrecker.armed = true;
  const anchor = new CANNON.Body({ mass: 0, position: WRECK_ANCHOR.clone() });
  anchor.collisionFilterGroup = 0; anchor.collisionFilterMask = 0;
  world.addBody(anchor);
  world.addConstraint(new CANNON.DistanceConstraint(anchor, wrecker.body, WRECK_LEN));
}
const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), lambert(0x2a1a14));
scene.add(rope);

// 7. Trampolines
function addTrampoline(x, y, z, power) {
  addBox({ size: [2.9, 0.2, 2.9], pos: [x, y - 0.05, z], color: 0x2a1a14 });
  const t = addBox({ size: [2.5, 0.3, 2.5], pos: [x, y, z], color: 0xb983ff });
  t.body.bouncy = power;
  return t;
}
addTrampoline(-6, 0.15, 6, 20);

// 8. Sky course (north-east): ramp → moving platform → lift → stepping pads → trampoline → island
{
  const stone = 0xf4f1de, pad = 0xffd93d;
  const rise = 3, run = 9.5;
  const len = Math.hypot(rise, run), ang = Math.atan2(rise, run);
  // top surface runs from (26, 0, -10) to (26, 3, -19.5); the box sits 0.2 below it
  addBox({
    size: [4, 0.4, len + 0.4], color: 0xff9f45, rot: [ang, 0, 0],
    pos: [26, rise / 2 - 0.2 * Math.cos(ang), -10 - run / 2 - 0.2 * Math.sin(ang)],
  });
  addBox({ size: [6, 0.5, 6], pos: [26, 2.75, -23], color: stone });                 // A
  const m1 = addBox({ size: [4, 0.4, 4], pos: [31, 2.8, -23], color: 0x4dd4c6, kinematic: true });
  movers.push({ body: m1.body, path: (t, v) => v.set(36 - 5 * Math.cos(t * 0.7), 2.8, -23) });
  addBox({ size: [6, 0.5, 6], pos: [46, 2.75, -23], color: stone });                 // B
  const m2 = addBox({ size: [4, 0.4, 4], pos: [46, 2.8, -29], color: 0x4dd4c6, kinematic: true });
  movers.push({ body: m2.body, path: (t, v) => v.set(46, 6.3 - 3.5 * Math.cos(t * 0.6), -29) });
  addBox({ size: [6, 0.5, 6], pos: [46, 9.75, -35], color: stone });                 // C
  addBox({ size: [2.6, 0.4, 2.6], pos: [40.2, 10.2, -35], color: pad });
  addBox({ size: [2.6, 0.4, 2.6], pos: [35.6, 10.8, -36.2], color: pad });
  addBox({ size: [2.6, 0.4, 2.6], pos: [31, 11.4, -34.5], color: pad });
  addBox({ size: [6, 0.5, 6], pos: [25, 11.75, -35], color: stone });                // D
  addTrampoline(23.5, 12.15, -35, 27);
  addBox({ size: [8, 0.5, 8], pos: [15.5, 19.75, -35], color: 0xd97757 });           // E
}

// Scenery: trees and clouds
{
  const spots = [[-30, -30], [-40, 10], [-28, 34], [10, 40], [38, 30], [50, 4], [-48, -14], [-10, -44], [34, 16], [-34, 50], [56, -50], [-56, -52]];
  for (const [x, z] of spots) {
    addCylinder({ r: 0.5, h: 3, pos: [x, 1.5, z], color: 0x8a6a4a });
    const top = new THREE.Mesh(boxGeo, lambert(0x3f9b5c));
    top.scale.set(3.4, 3.2, 3.4); top.position.set(x, 4.4, z); top.castShadow = true;
    scene.add(top);
    const top2 = new THREE.Mesh(boxGeo, lambert(0x4fb26c));
    top2.scale.set(2.2, 1.6, 2.2); top2.position.set(x, 6.4, z); top2.castShadow = true;
    scene.add(top2);
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 50 + (i * 37) % 70;
    const cloud = new THREE.Mesh(boxGeo, cloudMat);
    cloud.scale.set(12 + (i % 3) * 5, 2.5, 7 + (i % 2) * 4);
    cloud.position.set(Math.cos(a) * r, 46 + (i % 4) * 6, Math.sin(a) * r);
    scene.add(cloud);
  }
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
    [0, 1.6, -19],        // behind the crate pyramid
    [-16, 1.7, -6],       // in the ball pit
    [25.5, 1.6, -6],      // end of the dominoes
    [18.4, 5.2, 8],       // above the raised seesaw end
    [-14, 3.1, 12],       // on the spinner hub
    [0, 1.6, 23],         // behind the wrecking-ball crates
    [46, 11.6, -35],      // sky course platform C
    [14, 21.8, -35],      // top island
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

// ───────────────────────────── Clawd ─────────────────────────────
const playerBody = new CANNON.Body({
  mass: 5, material: matPlayer, fixedRotation: true, allowSleep: false,
  position: SPAWN.clone(), collisionFilterGroup: G_PLAYER, collisionFilterMask: -1,
  linearDamping: 0,
});
playerBody.addShape(new CANNON.Sphere(PLAYER_R));
playerBody.updateMassProperties();
world.addBody(playerBody);

const clawd = new THREE.Group();     // origin at the feet, front faces +Z
const clawdBody = new THREE.Group(); // squashes and bobs
const legs = [], arms = [], eyes = [];
{
  const orange = lambert(0xd97757), dark = lambert(0x2a1a14);
  const part = (mat, sx, sy, sz, x, y, z, parent) => {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  part(orange, 1.5, 0.85, 0.95, 0, 0.74, 0, clawdBody);
  for (const x of [-0.33, 0.33]) eyes.push(part(dark, 0.13, 0.3, 0.06, x, 0.86, 0.48, clawdBody));
  for (const x of [-0.88, 0.88]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    part(orange, 0.28, 0.26, 0.42, 0, 0, 0, pivot);
    clawdBody.add(pivot);
    arms.push(pivot);
  }
  for (const x of [-0.56, -0.2, 0.2, 0.56]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.36, 0);
    part(orange, 0.2, 0.4, 0.28, 0, -0.18, 0, pivot);
    clawd.add(pivot);
    legs.push(pivot);
  }
  clawd.add(clawdBody);
  scene.add(clawd);
}

// ───────────────────────────── Sound ─────────────────────────────
let actx = null, muted = false;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { actx = new AC(); } catch { actx = null; }
}
function beep(f0, f1, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!actx || muted || actx.state !== 'running') return;
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
const sfx = {
  jump: () => beep(300, 620, 0.16),
  land: () => beep(160, 70, 0.1, 'triangle', 0.1),
  bounce: () => beep(220, 900, 0.3, 'sine', 0.1),
  star: () => { beep(880, 880, 0.1, 'triangle', 0.09); beep(1320, 1320, 0.22, 'triangle', 0.09, 0.09); },
  spawn: () => beep(520, 260, 0.1, 'sine', 0.07),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.25, 'triangle', 0.09, i * 0.13)),
};

// ───────────────────────────── Input ─────────────────────────────
const keys = new Set();
const input = { stickX: 0, stickY: 0, jumpHeld: false, touchJump: false, jumpPressedAt: -10 };
const cam = { yaw: 0, pitch: 0.38, dist: 11, shiftLock: false };
let simTime = 0;
let helpTimer = null;

function hideHelpSoon() {
  if (helpTimer) return;
  helpTimer = setTimeout(() => $('help').classList.add('faded'), 6000);
}
function pressJump() { input.jumpPressedAt = simTime; }

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onButton = e.target instanceof HTMLButtonElement;
  if (onButton && (e.code === 'Space' || e.code === 'Enter')) return; // let buttons work from the keyboard
  if (MOVE_KEYS.includes(e.code)) e.preventDefault();
  initAudio(); hideHelpSoon();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') pressJump();
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') toggleShiftLock();
  else if (e.code === 'KeyF') spawnProp('crate');
  else if (e.code === 'KeyG') spawnProp('ball');
  else if (e.code === 'KeyR') resetWorld();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); input.touchJump = false; endStick(); camTouches.clear(); mouseDrag = false; });

// Mouse-lock ("shift lock") mode
function toggleShiftLock() {
  if (document.pointerLockElement === canvas) { document.exitPointerLock(); return; }
  if (!canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch { /* not available here */ }
}
document.addEventListener('pointerlockchange', () => {
  cam.shiftLock = document.pointerLockElement === canvas;
  $('crosshair').hidden = !cam.shiftLock;
});

function rotateCam(dx, dy, sens) {
  cam.yaw -= dx * sens;
  cam.pitch = Math.max(-1.35, Math.min(1.45, cam.pitch + dy * sens));
}
function zoomCam(factor) {
  let d = cam.dist;
  if (d < 0.5) { if (factor > 1) d = 2; }           // leaving first person
  else { d *= factor; if (d < 1.6) d = 0; }         // entering first person
  cam.dist = Math.min(40, d);
}

// Pointer handling: mouse drags turn the camera; touches are a thumbstick (left) or camera (elsewhere)
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
  const r = canvas.getBoundingClientRect();
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

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  initAudio(); hideHelpSoon();
  if (e.pointerType === 'mouse') {
    if (e.button === 0 || e.button === 2) { mouseDrag = true; try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ } }
    return;
  }
  e.preventDefault();
  enableTouchUI();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (stickId === null && x < r.width * 0.42 && y > r.height * 0.3) {
    stickId = e.pointerId; stickOX = x; stickOY = y;
    stickBase.classList.remove('resting');
    stickBase.style.left = stickKnob.style.left = x + 'px';
    stickBase.style.top = stickKnob.style.top = y + 'px';
  } else {
    camTouches.set(e.pointerId, { x, y });
    pinchDist = 0;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (cam.shiftLock) rotateCam(e.movementX || 0, e.movementY || 0, 0.0028);
    else if (mouseDrag) rotateCam(e.movementX || 0, e.movementY || 0, 0.0055);
    return;
  }
  const r = canvas.getBoundingClientRect();
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
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomCam(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });

// Jump button (touch)
const jumpBtn = $('jump');
jumpBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio(); hideHelpSoon();
  try { jumpBtn.setPointerCapture(e.pointerId); } catch { /* ok */ }
  input.touchJump = true; pressJump(); jumpBtn.classList.add('down');
});
const jumpUp = () => { input.touchJump = false; jumpBtn.classList.remove('down'); };
jumpBtn.addEventListener('pointerup', jumpUp);
jumpBtn.addEventListener('pointercancel', jumpUp);
jumpBtn.addEventListener('keydown', (e) => { if (e.code === 'Enter') pressJump(); });
jumpBtn.addEventListener('contextmenu', (e) => e.preventDefault());

// HUD buttons
function hudButton(id, fn) {
  $(id).addEventListener('click', (e) => { initAudio(); fn(); e.currentTarget.blur(); });
}
hudButton('btn-crate', () => spawnProp('crate'));
hudButton('btn-ball', () => spawnProp('ball'));
hudButton('btn-reset', () => resetWorld());
hudButton('btn-sound', () => {
  muted = !muted;
  const b = $('btn-sound');
  b.textContent = muted ? 'Sound off' : 'Sound on';
  b.setAttribute('aria-pressed', String(!muted));
});

// ───────────────────────────── Game actions ─────────────────────────────
let toastTimer = null;
function toast(text, ms = 2200) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const state = {
  grounded: false, groundBody: null, coyote: 0, jumpCooldown: 0,
  carryX: 0, carryZ: 0, lastVy: 0, facing: Math.PI, squash: 0, walkPhase: 0,
  moveX: 0, moveZ: 0, moveMag: 0, blink: 2, respawns: 0, jumps: 0,
};

function respawn() {
  playerBody.position.copy(SPAWN);
  playerBody.velocity.set(0, 0, 0);
  playerBody.previousPosition.copy(SPAWN);
  playerBody.interpolatedPosition.copy(SPAWN);
  state.carryX = state.carryZ = 0;
  state.respawns++;
}

function removeEntry(entry) {
  world.removeBody(entry.body);
  scene.remove(entry.mesh);
  const i = synced.indexOf(entry);
  if (i >= 0) synced.splice(i, 1);
}

function spawnProp(kind) {
  const fx = -Math.sin(state.facing + Math.PI), fz = -Math.cos(state.facing + Math.PI); // facing direction
  const p = playerBody.position;
  const pos = [p.x + fx * 3 + (Math.random() - 0.5) * 0.4, p.y + 3.5, p.z + fz * 3 + (Math.random() - 0.5) * 0.4];
  let entry;
  if (kind === 'crate') {
    const s = 0.9 + Math.random() * 0.7;
    entry = addBox({ size: [s, s, s], mass: s * s * s, color: pick(TOY_COLORS), pos, spawned: true });
    entry.body.angularVelocity.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } else {
    const r = 0.45 + Math.random() * 0.4;
    entry = addBall({ r, mass: r * 2, material: matBouncy, color: pick(TOY_COLORS), pos, spawned: true });
  }
  entry.body.velocity.set(fx * 3, 0, fz * 3);
  spawned.push(entry);
  if (spawned.length > MAX_SPAWNED) removeEntry(spawned.shift());
  sfx.spawn();
}

function resetWorld() {
  while (spawned.length) removeEntry(spawned.pop());
  for (const e of props) {
    e.body.position.copy(e.home.p);
    e.body.quaternion.copy(e.home.q);
    e.body.velocity.set(0, 0, 0);
    e.body.angularVelocity.set(0, 0, 0);
    e.body.wakeUp();
  }
  wrecker.body.type = CANNON.Body.KINEMATIC;
  wrecker.armed = true;
  respawn();
  toast('World reset');
}

function collectStar(s) {
  s.got = true;
  s.mesh.visible = false;
  starCount++;
  $('stars').textContent = `${starCount} / ${stars.length}`;
  burst(s.mesh.position, 14, 0xffc93c);
  if (starCount === stars.length) {
    sfx.win();
    toast('All 8 stars! Clawd is the champion!', 5000);
    for (let i = 0; i < 5; i++) setTimeout(() => burst(clawd.position, 18, pick(TOY_COLORS), 9), i * 220);
  } else {
    sfx.star();
    toast(`Star ${starCount} of ${stars.length}!`, 1400);
  }
}

// Little particle bursts
const particles = [];
function burst(at, n, color, power = 6) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(boxGeo, lambert(color));
    m.scale.setScalar(0.16 + Math.random() * 0.12);
    m.position.set(at.x, at.y + 0.6, at.z);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.9;
    particles.push({ m, vx: Math.cos(a) * power * Math.random(), vy: up * power, vz: Math.sin(a) * power * Math.random(), life: 0.9 + Math.random() * 0.5 });
  }
}

// ───────────────────────────── Simulation step hooks ─────────────────────────────
const tmpV = new CANNON.Vec3();
const tmpV2 = new CANNON.Vec3();

function readMove() {
  // forward / strafe from keys + thumbstick, relative to the camera
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('KeyA')) s -= 1;
  f -= input.stickY; s += input.stickX;
  let mag = Math.hypot(f, s);
  if (mag > 1) { f /= mag; s /= mag; mag = 1; }
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  state.moveX = -sy * f + cy * s;
  state.moveZ = -cy * f - sy * s;
  state.moveMag = mag;
  input.jumpHeld = keys.has('Space') || input.touchJump;
}

world.addEventListener('preStep', () => {
  // Kinematic platforms follow their paths
  for (const mv of movers) {
    mv.path(simTime + FIXED, tmpV);
    mv.body.velocity.set((tmpV.x - mv.body.position.x) / FIXED, (tmpV.y - mv.body.position.y) / FIXED, (tmpV.z - mv.body.position.z) / FIXED);
  }

  // Release the wrecking ball when Clawd gets close
  if (wrecker.armed) {
    const dx = playerBody.position.x - WRECK_ANCHOR.x, dz = playerBody.position.z - WRECK_ANCHOR.z;
    if (dx * dx + dz * dz < 13 * 13) {
      wrecker.armed = false;
      wrecker.body.type = CANNON.Body.DYNAMIC;
      wrecker.body.velocity.set(0, 0, 0);
      wrecker.body.wakeUp();
    }
  }

  // Player: velocity-driven walking with full air control
  const v = playerBody.velocity;
  if (state.grounded && state.groundBody) {
    state.groundBody.getVelocityAtWorldPoint(playerBody.position, tmpV2);
    state.carryX = tmpV2.x; state.carryZ = tmpV2.z;
  } else {
    const k = Math.exp(-1.5 * FIXED);
    state.carryX *= k; state.carryZ *= k;
  }
  const tx = state.moveX * WALK_SPEED + state.carryX;
  const tz = state.moveZ * WALK_SPEED + state.carryZ;
  const maxDv = (state.grounded ? GROUND_ACCEL : AIR_ACCEL) * FIXED;
  let dvx = tx - v.x, dvz = tz - v.z;
  const dv = Math.hypot(dvx, dvz);
  if (dv > maxDv) { dvx *= maxDv / dv; dvz *= maxDv / dv; }
  v.x += dvx; v.z += dvz;

  state.jumpCooldown -= FIXED;
  const wantsJump = input.jumpHeld || simTime - input.jumpPressedAt < JUMP_BUFFER;
  if (wantsJump && state.coyote > 0 && state.jumpCooldown <= 0) {
    const gvy = state.groundBody ? Math.max(0, state.groundBody.velocity.y) : 0;
    v.y = JUMP_SPEED + gvy;
    state.coyote = 0; state.jumpCooldown = 0.25; state.grounded = false;
    input.jumpPressedAt = -10;
    state.squash = 0.3; state.jumps++;
    sfx.jump();
  }
  state.lastVy = v.y;
});

world.addEventListener('postStep', () => {
  simTime += FIXED;
  let grounded = false, groundBody = null, best = 0.5;
  for (const c of world.contacts) {
    let up, other;
    if (c.bi === playerBody) { up = -c.ni.y; other = c.bj; }
    else if (c.bj === playerBody) { up = c.ni.y; other = c.bi; }
    else continue;
    if (up > best) { best = up; grounded = true; groundBody = other; }
  }
  if (grounded && state.jumpCooldown > 0.1) grounded = false; // just jumped; ignore the lingering contact
  if (grounded && !state.grounded && state.lastVy < -7) {
    state.squash = -0.3;
    if (!(groundBody && groundBody.bouncy)) sfx.land();
  }
  state.grounded = grounded;
  state.groundBody = grounded ? groundBody : null;
  state.coyote = grounded ? COYOTE : state.coyote - FIXED;

  if (grounded && groundBody.bouncy && state.jumpCooldown <= 0) {
    playerBody.velocity.y = groundBody.bouncy;
    state.grounded = false; state.coyote = 0; state.jumpCooldown = 0.25;
    state.squash = 0.4;
    sfx.bounce();
  }
});

// ───────────────────────────── Frame loop ─────────────────────────────
const rayFrom = new CANNON.Vec3(), rayTo = new CANNON.Vec3();
const rayResult = new CANNON.RaycastResult();
const camTarget = new THREE.Vector3(), camOffset = new THREE.Vector3(), lookAt = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), ropeDir = new THREE.Vector3();
let camDistSmooth = cam.dist;

function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function frame(dt) {
  // Keyboard camera controls (Roblox: arrow keys turn, I/O zoom)
  if (keys.has('ArrowLeft')) cam.yaw += 2.2 * dt;
  if (keys.has('ArrowRight')) cam.yaw -= 2.2 * dt;
  if (keys.has('KeyI')) zoomCam(1 - 1.5 * dt);
  if (keys.has('KeyO')) zoomCam(1 + 1.5 * dt);

  readMove();
  world.step(FIXED, dt, 5);

  // Fell off the world
  if (playerBody.position.y < -25) { respawn(); toast('Whoops! Back to the start.', 1500); }
  for (let i = spawned.length - 1; i >= 0; i--) {
    if (spawned[i].body.position.y < -40) { removeEntry(spawned[i]); spawned.splice(i, 1); }
  }
  for (const e of props) {
    if (e.body.position.y < -60 && e.body.sleepState !== CANNON.Body.SLEEPING) { e.body.velocity.set(0, 0, 0); e.body.sleep(); }
  }

  // Sync meshes
  for (const e of synced) {
    const p = e.body.interpolatedPosition, q = e.body.interpolatedQuaternion;
    e.mesh.position.set(p.x, p.y, p.z);
    e.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }

  // Rope
  {
    const b = wrecker.mesh.position;
    ropeDir.set(b.x - WRECK_ANCHOR.x, b.y - WRECK_ANCHOR.y, b.z - WRECK_ANCHOR.z);
    const len = ropeDir.length();
    rope.position.set((b.x + WRECK_ANCHOR.x) / 2, (b.y + WRECK_ANCHOR.y) / 2, (b.z + WRECK_ANCHOR.z) / 2);
    rope.scale.set(1, len, 1);
    rope.quaternion.setFromUnitVectors(UP, ropeDir.divideScalar(len || 1));
  }

  // Clawd pose
  const pp = playerBody.interpolatedPosition;
  const firstPerson = cam.dist < 0.5;
  clawd.position.set(pp.x, pp.y - PLAYER_R, pp.z);
  if (cam.shiftLock || firstPerson) state.facing = cam.yaw + Math.PI;
  else if (state.moveMag > 0.1) state.facing = angleLerp(state.facing, Math.atan2(state.moveX, state.moveZ), 1 - Math.exp(-14 * dt));
  clawd.rotation.y = state.facing;
  clawd.visible = !firstPerson;

  const v = playerBody.velocity;
  const hSpeed = Math.hypot(v.x - state.carryX, v.z - state.carryZ);
  const walking = state.grounded && hSpeed > 0.5;
  if (walking) state.walkPhase += hSpeed * dt * 1.9;
  const swing = walking ? Math.min(1, hSpeed / WALK_SPEED) : 0;
  legs.forEach((leg, i) => {
    const target = state.grounded ? Math.sin(state.walkPhase + (i % 2 ? Math.PI : 0)) * 0.75 * swing : (i % 2 ? 0.5 : -0.5);
    leg.rotation.x += (target - leg.rotation.x) * Math.min(1, dt * 18);
  });
  const armTarget = state.grounded ? 0 : (v.y > 0 ? 0.9 : 0.4);
  arms.forEach((arm, i) => {
    const t = (i ? -1 : 1) * -armTarget;
    arm.rotation.z += (t - arm.rotation.z) * Math.min(1, dt * 12);
  });
  state.squash *= Math.exp(-9 * dt);
  const sq = state.squash;
  clawdBody.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
  clawdBody.position.y = walking ? Math.abs(Math.sin(state.walkPhase)) * 0.07 : 0;
  state.blink -= dt;
  const blinkScale = state.blink < 0.12 ? 0.03 : 0.3;
  for (const eye of eyes) eye.scale.y = blinkScale;
  if (state.blink < 0) state.blink = 2 + Math.random() * 3;

  // Stars
  const tNow = performance.now() / 1000;
  for (const s of stars) {
    if (s.got) continue;
    s.mesh.rotation.y = tNow * 2 + s.phase;
    s.mesh.position.y = s.baseY + Math.sin(tNow * 2.2 + s.phase) * 0.18;
    const dx = s.mesh.position.x - pp.x, dy = s.baseY - pp.y, dz = s.mesh.position.z - pp.z;
    if (dx * dx + dy * dy + dz * dz < 1.7 * 1.7) collectStar(s);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy += GRAVITY * 0.6 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.rotation.x += dt * 6; p.m.rotation.y += dt * 5;
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
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
  // snap in instantly (never clip through walls), ease back out
  camDistSmooth = dist < camDistSmooth ? dist : camDistSmooth + (dist - camDistSmooth) * Math.min(1, dt * 8);
  camera.position.copy(camTarget).addScaledVector(camOffset, camDistSmooth);
  lookAt.copy(camera.position).sub(camOffset);
  camera.lookAt(lookAt);

  // Sun follows the player so shadows stay sharp nearby
  sun.target.position.set(pp.x, 0, pp.z);
  sun.position.set(pp.x + 22, 48, pp.z + 16);

  renderer.render(scene, camera);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  fatal('The graphics context was lost. Reload the page to keep playing.');
});

// Small hook for automated playtests
window.__clawd = { playerBody, state, input, cam, keys, stars, world, spawned, props, get starCount() { return starCount; }, get simTime() { return simTime; } };
