// Palm Cove pool: app shell (renderer, camera, loop, pointer input, settings) around the water
// module and the procedural resort. Water is used only through its public API.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { POOL, MODES } from './pool-config.js';
import { PoolWater } from './water.js';
import { ParticleFluid } from './fluid.js';
import { SkyRig } from './scene/sky.js';
import { buildWorld } from './scene/world.js';
import { bindUI } from './ui.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const QUALITY = { low: { pr: 1, shadow: 1024 }, medium: { pr: 1.5, shadow: 2048 }, high: { pr: 2, shadow: 4096 } };
const VIEWS = {
  terrace: { pos: [-15.2, 3.3, 7.4], target: [3.2, -0.6, -0.6] },
  deep: { pos: [16.6, 2.8, 8.4], target: [-2.5, -0.4, -0.8] },
  low: { pos: [-10.8, 0.62, 5.4], target: [4, -0.2, -0.6] },
  sundeck: { pos: [1.8, 2.0, -9.9], target: [0.8, -0.3, 6] },
  aerial: { pos: [0.5, 24, 14.5], target: [0, 0, 0] },
  terracePortrait: { pos: [-17.4, 10.4, 2.4], target: [1.5, -0.8, 0.2] },   // tall frames: look down the pool from above the hedge
};

function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();   // free the probe context
    return true;
  } catch { return false; }
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function main() {
  if (!hasWebGL2()) { $('loading').hidden = true; $('nogl').hidden = false; return; }
  await nextFrame();

  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.46;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 12000);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.shadow.mapSize.set(2048, 2048);
  const rig = new SkyRig({ renderer, scene, sun });
  const water = new PoolWater({ renderer, scene, camera, sun });
  const world = buildWorld({ scene, water, renderer });
  const fluid = new ParticleFluid({ scene });
  // lamps, niche lights and windows warm up as the sun gets low
  const lens = world.extras.shell.lensMat, glass = world.extras.villa.glassMat, lamps = world.extras.palapa.lampMat;
  glass.emissive.setRGB(1, 0.62, 0.3);
  rig.onLight.push((night) => {
    lens.emissiveIntensity = 0.9 + 3.2 * night;
    glass.emissiveIntensity = 0.16 * night;
    lamps.emissiveIntensity = 0.5 + 2.4 * night;
  });
  for (const cb of rig.onLight) cb(rig.night);

  // ---- controls and camera ---------------------------------------------------------------
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.minDistance = 2.2; controls.maxDistance = 46;
  controls.maxPolarAngle = Math.PI * 0.497;
  controls.screenSpacePanning = false; controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8; controls.panSpeed = 0.7;
  controls.listenToKeyEvents(canvas); controls.keyPanSpeed = 12;   // arrow keys pan while the canvas has focus
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let tween = null;
  const setView = (name, instant) => {
    const portrait = camera.aspect < 0.9;
    const v = VIEWS[name === 'terrace' && portrait ? 'terracePortrait' : name]; if (!v) return;
    const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target) };
    if (portrait && name !== 'terrace' && name !== 'aerial') to.pos.sub(to.target).multiplyScalar(Math.min(1.35, 1 + (1 / camera.aspect - 1) * 0.3)).add(to.target);
    if (instant || reduced.matches) { camera.position.copy(to.pos); controls.target.copy(to.target); controls.update(); return; }
    tween = { t0: performance.now(), dur: 1100, from: { pos: camera.position.clone(), target: controls.target.clone() }, to };
  };
  const M = 0.42, tmpV = new THREE.Vector3(), boxes = world.colliders;
  const inside = (q) => { for (const b of boxes) if (q.x > b.min.x - M && q.x < b.max.x + M && q.y > b.min.y - M && q.y < b.max.y + M && q.z > b.min.z - M && q.z < b.max.z + M) return b; return null; };
  function constrainCamera() {
    const t = controls.target, p = camera.position;
    const tx = clamp(t.x, -22, 24), ty = clamp(t.y, -1.5, 5), tz = clamp(t.z, -14, 17);
    if (tx !== t.x || ty !== t.y || tz !== t.z) { tmpV.set(tx - t.x, ty - t.y, tz - t.z); t.add(tmpV); p.add(tmpV); }
    p.x = clamp(p.x, -75, 75); p.z = clamp(p.z, -60, 60); p.y = clamp(p.y, 0.3, 140);
    if (inside(p)) {
      // nearest way out that does not land inside another (possibly adjacent) collider
      let best = null, bd = Infinity, top = 0;
      for (const b of boxes) {
        top = Math.max(top, b.max.y);
        if (!(p.x > b.min.x - M && p.x < b.max.x + M && p.y > b.min.y - M && p.y < b.max.y + M && p.z > b.min.z - M && p.z < b.max.z + M)) continue;
        const c = [['x', b.min.x - M, p.x - (b.min.x - M)], ['x', b.max.x + M, (b.max.x + M) - p.x], ['z', b.min.z - M, p.z - (b.min.z - M)], ['z', b.max.z + M, (b.max.z + M) - p.z],
          ['y', b.max.y + M, (b.max.y + M) - p.y], ['y', b.min.y - M, p.y - (b.min.y - M)]];
        for (const [axis, val, dist] of c) {
          if (dist >= bd || (axis === 'y' && val < 0.3)) continue;
          const q = tmpV.copy(p); q[axis] = val;
          if (!inside(q)) { bd = dist; best = [axis, val]; }
        }
      }
      if (best) p[best[0]] = best[1]; else p.y = top + 1;
    }
    if (p.y < 0.3) p.y = 0.3;
  }

  // ---- state ----------------------------------------------------------------------------------
  const state = { mode: 'waves', quality: 'medium', showParticles: false, hour: 9.5 };
  try { const q = localStorage.getItem('palmcove.quality'); if (QUALITY[q]) state.quality = q; else if (window.matchMedia('(pointer: coarse)').matches) state.quality = 'low'; } catch { /* storage blocked */ }

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = camera.aspect < 0.9 ? 52 : 46; camera.updateProjectionMatrix();
  }
  function applyQuality(level) {
    state.quality = level;
    const q = QUALITY[level];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
    water.setQuality(level);
    try { localStorage.setItem('palmcove.quality', level); } catch { /* storage blocked */ }
  }

  function setMode(m) {
    if (!MODES.includes(m) || m === state.mode) { ui?.setModeUI(state.mode); return; }
    if (state.mode === 'particles') { fluid.stop(); water.setExternalHeights(null); water.externalDisturb = null; }
    state.mode = m;
    water.setMode(m);
    if (m === 'particles') {
      water.externalDisturb = (x, z, r, s) => fluid.disturb(x, z, r, s);
      fluid.showParticles(state.showParticles);
      fluid.start();
    }
    state.note = '';
    ui?.setModeUI(m);
  }

  const ui = bindUI({
    setMode,
    showParticles: (on) => { state.showParticles = on; fluid.showParticles(on); },
    spawn: (t) => water.spawnBody(t),
    clearBodies: () => water.clearBodies(),
    resetWater: () => { water.reset(); if (state.mode === 'particles') fluid.reset(); },
    setRain: (v) => water.setRain(v),
    setWind: (v) => water.setWind(v),
    setHour: (h) => { state.hour = h; rig.setHour(h); },
    setQuality: applyQuality,
    camera: (name) => setView(name, false),
  });
  ui.setQualityUI(state.quality);
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[state.quality].pr)); resize(); });
  applyQuality(state.quality);
  setView('terrace', true);

  // ---- pointer: wake on the water, drag floats, otherwise orbit ---------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -POOL.waterLevel);
  const hit = new THREE.Vector3();
  let drag = null;
  function aim(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
  }
  const capture = (e) => { try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ } };
  const onWater = (v, pad = 0) => v.x > POOL.minX - pad && v.x < POOL.maxX + pad && v.z > POOL.minZ - pad && v.z < POOL.maxZ + pad;
  function waterHit() { return ray.ray.intersectPlane(plane, hit) ? hit : null; }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    aim(e);
    if (water.grab(ray)) {
      drag = { type: 'body', id: e.pointerId };
      controls.enabled = false; canvas.classList.add('grab'); capture(e);
      return;
    }
    const h = waterHit();
    if (h && onWater(h)) {
      drag = { type: 'wake', id: e.pointerId, x: h.x, z: h.z, t: performance.now() };
      controls.enabled = false; capture(e);
      water.disturb(h.x, h.z, 0.45, 0.1);
    }
  }, { capture: true });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    aim(e);
    const h = waterHit();
    if (drag.type === 'body') {
      if (h) { hit.x = clamp(hit.x, POOL.minX + 0.2, POOL.maxX - 0.2); hit.z = clamp(hit.z, POOL.minZ + 0.2, POOL.maxZ - 0.2); water.dragTo(hit); }
    } else if (h && onWater(h)) {
      const now = performance.now(), dx = h.x - drag.x, dz = h.z - drag.z, dist = Math.hypot(dx, dz);
      if (dist < 0.06) return;
      const speed = dist / Math.max(0.008, (now - drag.t) / 1000);
      const strength = 0.022 + Math.min(0.05, speed * 0.008);
      const n = Math.min(8, Math.ceil(dist / 0.25));
      for (let i = 1; i <= n; i++) water.disturb(drag.x + (dx * i) / n, drag.z + (dz * i) / n, 0.34, strength);
      drag.x = h.x; drag.z = h.z; drag.t = now;
    }
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.type === 'body') water.release();
    drag = null; controls.enabled = true; canvas.classList.remove('grab');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);

  // ---- initial scene ---------------------------------------------------------------------------
  water.setWind(0.2);
  water.spawnBody('ball');
  water.spawnBody('ring');
  water.disturb(-1.5, 1.2, 0.6, 0.04);
  water.disturb(2.5, -1.0, 0.5, 0.03);

  window.__pool = { water, fluid, setMode, renderer, scene, camera, THREE, controls, world, rig, state, sun, setView };

  // ---- main loop ---------------------------------------------------------------------------------
  let last = performance.now(), frames = 0, acc = 0, shown = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const real = Math.max(0, (now - last) / 1000), dt = Math.min(1 / 30, real); last = now;
    if (tween) {
      const k = clamp((now - tween.t0) / tween.dur, 0, 1), e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
      controls.target.lerpVectors(tween.from.target, tween.to.target, e);
      if (k >= 1) tween = null;
    }
    controls.update();
    constrainCamera();
    rig.update(camera);
    world.update(now * 0.001, dt, camera);
    water.update(dt, now * 0.001);
    if (state.mode === 'particles') { fluid.step(dt); water.setExternalHeights(fluid.heights); }
    water.beforeRender(renderer, scene, camera);
    renderer.render(scene, camera);
    frames++; acc += real;
    if (acc >= 0.5) {
      const fps = Math.round(frames / acc);
      ui.setFps(state.mode === 'particles' && fluid.stepMs ? `${fps} fps, sim ${fluid.stepMs.toFixed(0)} ms` : `${fps} fps`);
      if (state.mode === 'particles' && fluid.count) {
        const note = `A true 3D particle fluid (FLIP): ${(fluid.count / 1000).toFixed(1)}k particles${fluid.mode === 'worker' ? ' on a worker thread' : ' on the main thread'}.`;
        if (note !== state.note) { state.note = note; ui.setNote(note); }
      }
      frames = 0; acc = 0;
    }
    if (!shown) { shown = true; $('loading').hidden = true; }
  }
  requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
  const l = $('loading');
  if (l) { l.hidden = false; l.querySelector('.mark').textContent = 'Something went wrong'; l.querySelector('.bar').hidden = true; }
});
