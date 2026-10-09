// Particle fluid for the pool: a 3D FLIP/PIC simulation (see fluid-sim.js) that runs in a Blob
// Web Worker, with a time-budgeted main-thread fallback. This wrapper owns the worker protocol,
// the exported surface heightfield and the point-sprite rendering of spray / all particles.
import * as THREE from 'three';
import { POOL, HF } from './pool-config.js';
import { FlipSim } from './fluid-sim.js';
import { makeSimConfig } from './fluid-config.js';

const MAX_SPRAY = 4096;

const WORKER_GLUE = `
let sim = null;
const pack = (all, light) => {
  if (light) return [{ light: true, n: sim.n, drift: sim.drift }, []];
  const heights = sim.heights.slice();
  const spray = new Float32Array(3 * sim.maxSpray);
  const ns = sim.packSpray(spray);
  const tr = [heights.buffer, spray.buffer];
  let pos = null;
  if (all) { pos = new Float32Array(3 * sim.n); sim.packAll(pos); tr.push(pos.buffer); }
  return [{ heights, spray, ns, all: pos, n: sim.n, drift: sim.drift }, tr];
};
self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.t === 'init') {
      sim = new FlipSim(m.cfg);
      const [r, tr] = pack(m.all, false);
      self.postMessage({ t: 'res', ready: true, epoch: m.epoch, simTime: 0, steps: 0, ms: 0, ...r }, tr);
    } else if (m.t === 'reset') {
      sim.reset();
      const [r, tr] = pack(m.all, false);
      self.postMessage({ t: 'res', epoch: m.epoch, simTime: 0, steps: 0, ms: 0, ...r }, tr);
    } else if (m.t === 'adv') {
      const t0 = performance.now();
      if (m.imp) for (let i = 0; i < m.imp.length; i += 4) sim.disturb(m.imp[i], m.imp[i + 1], m.imp[i + 2], m.imp[i + 3]);
      if (sim.acc > m.maxBacklog) sim.acc = m.maxBacklog;
      const steps = sim.advance(m.dt, m.budget);
      const [r, tr] = pack(m.all, steps === 0 && !m.all);
      self.postMessage({ t: 'res', epoch: m.epoch, simTime: sim.simTime, steps, ms: performance.now() - t0, backlog: sim.acc, ...r }, tr);
    }
  } catch (err) {
    self.postMessage({ t: 'err', message: String((err && err.stack) || err) });
  }
};`;

const SPRAY_VERT = /* glsl */`
uniform float uScale;
uniform float uSize;
varying float vFade;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.5, uSize * uScale / -mv.z);
  vFade = 1.0;
}`;
const SPRAY_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  float a = (1.0 - r) * uAlpha;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const ALL_VERT = /* glsl */`
uniform float uScale;
uniform float uSize;
varying vec3 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(2.0, uSize * uScale / -mv.z);
  float t = smoothstep(-2.2, 0.2, position.y);
  vCol = mix(vec3(0.02, 0.12, 0.45), vec3(0.45, 0.85, 1.0), t);
}`;
const ALL_FRAG = /* glsl */`
varying vec3 vCol;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d, d) > 0.25) discard;
  gl_FragColor = vec4(vCol, 0.9);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makePoints(count, vert, frag, uniforms, opts) {
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(new Float32Array(3 * count), 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, ...opts });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  pts.onBeforeRender = (renderer, scene, camera) => {
    const h = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  };
  return pts;
}

export class ParticleFluid {
  /** @param {{scene: THREE.Scene, forceMain?: boolean}} o */
  constructor({ scene, forceMain } = {}) {
    this.scene = scene;
    this.cfg = makeSimConfig();
    this.heights = new Float32Array(HF.nx * HF.nz);
    this.active = false;
    this.showAll = false;
    this.forceMain = forceMain ?? (typeof location !== 'undefined' && /[?&]fluid=main/.test(location.search));
    this.worker = null; this.sim = null; this.mode = 'idle';
    this.ready = false; this.busy = false; this.epoch = 0;
    this.pending = 0; this.queue = []; this.lastCall = 0; this.tight = 0; this.batchUntil = 0;
    this.simTime = 0; this.stepMs = 0; this.nParticles = 0; this.nSpray = 0; this.backlog = 0;
    this.error = null; this.waiters = []; this.autoSync = true;

    const su = { uScale: { value: 600 }, uSize: { value: 0.07 }, uColor: { value: new THREE.Color(0xf2fbff) }, uAlpha: { value: 0.85 } };
    this.spray = makePoints(MAX_SPRAY, SPRAY_VERT, SPRAY_FRAG, su, { depthWrite: false });
    this.spray.renderOrder = 6; this.spray.name = 'fluid-spray';
    const au = { uScale: { value: 600 }, uSize: { value: 0.085 } };
    this.all = null; this.allUniforms = au;
    this.group = new THREE.Group(); this.group.name = 'particle-fluid';
    this.group.add(this.spray);
    scene.add(this.group);
    // Warm the worker a little after load so entering the mode feels instant.
    if (!this.forceMain && typeof setTimeout === 'function') this.warmTimer = setTimeout(() => { if (!this.worker) this._spawn(); }, 4000);
  }

  get count() { return this.nParticles; }
  get particleCount() { return this.nParticles; }
  get numParticles() { return this.nParticles; }
  get useWorker() { return this.mode === 'worker'; }
  set useWorker(v) { // switch execution venue; restarts from the rest state
    this._teardown(); this.forceMain = !v; this.ready = false; this.busy = false; this.epoch++;
    this._boot();
  }

  start() {
    this.active = true;
    this.spray.visible = true;
    if (this.all) this.all.visible = this.showAll;
    if (this.mode === 'idle') this._boot(); else this.reset();
  }

  stop() {
    this.active = false;
    this.spray.visible = false;
    if (this.all) this.all.visible = false;
    this.pending = 0; this.queue.length = 0;
  }

  reset() {
    this.epoch++;
    this.pending = 0; this.queue.length = 0; this.heights.fill(0);
    this.spray.geometry.setDrawRange(0, 0); this.nSpray = 0;
    if (this.mode === 'worker' && this.worker) {
      this.busy = this.ready; // the reset reply clears it
      if (this.ready) this.worker.postMessage({ t: 'reset', epoch: this.epoch, all: this.showAll });
    } else if (this.mode === 'main' && this.sim) {
      this.sim.reset(); this._readMain();
    }
  }

  /** Impulse into nearby particles. strength ~ peak displacement in meters (positive = down). */
  disturb(x, z, radius, strength) {
    if (!this.active) return;
    if (this.queue.length < 4 * 600) this.queue.push(x, z, radius, strength);
  }

  showParticles(on) {
    this.showAll = !!on;
    if (this.showAll && !this.all) this._makeAll();
    if (this.all) this.all.visible = this.active && this.showAll;
  }

  /** Advance the simulation by dt seconds (asynchronous when running in the worker). */
  step(dt) {
    if (!this.active) return;
    const now = performance.now();
    this.tight = (now - this.lastCall < 2) ? this.tight + 1 : 0;
    this.lastCall = now;
    if (this.tight >= 3) this.batchUntil = now + 600;
    // A burst of step() calls (a script stepping in a tight loop) wants synchronous results,
    // which a worker cannot give: continue on the main thread from the rest state.
    if (this.mode === 'worker' && this.autoSync && this.tight >= 3) { this.pending += dt; this._switchToMain(); return; }
    const batch = now < this.batchUntil;
    this.pending += dt;
    if (!batch && this.pending > 0.1) this.pending = 0.1;
    if (this.pending > 60) this.pending = 60;
    if (this.mode === 'main') this._stepMain(batch);
    else if (this.mode === 'worker') this._dispatch();
    else this._boot();
  }

  /** Resolves when every step() so far has been simulated and read back. */
  idle() {
    return new Promise((res) => {
      const check = () => (this.mode === 'main' || (!this.busy && this.ready && this.pending < 1 / 60 - 1e-6 && this.backlog < 1 / 60 - 1e-6 && !this.queue.length));
      if (check()) return res(true);
      this.waiters.push({ check, res });
    });
  }

  dispose() { clearTimeout(this.warmTimer); this._teardown(); this.scene.remove(this.group); }

  // ---------------------------------------------------------------------------------------------
  _boot() {
    if (!this.forceMain && this._spawn()) return;
    this._mainInit();
  }

  _spawn() {
    if (this.worker) return true;
    try {
      const src = `${FlipSim.toString()}\n${WORKER_GLUE}`;
      this.blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      this.worker = new Worker(this.blobUrl);
      this.worker.onmessage = (e) => this._onMessage(e.data);
      this.worker.onerror = (e) => { this.error = e.message || 'worker error'; this._fallback(); };
      this.mode = 'worker'; this.ready = false; this.busy = true;
      this.worker.postMessage({ t: 'init', cfg: this.cfg, epoch: this.epoch, all: false });
      return true;
    } catch (err) {
      this.error = String(err);
      this.worker = null;
      return false;
    }
  }

  _teardown() {
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
    this.sim = null; this.mode = 'idle';
  }

  _switchToMain() {
    console.info('[fluid] burst of step() calls: continuing synchronously on the main thread');
    const queue = this.queue.slice(), pending = this.pending;
    this._teardown(); this.forceMain = true; this.epoch++; this.busy = false;
    this._mainInit();
    this.queue = queue; this.pending = pending;
    this._stepMain(true);
  }

  _fallback() {
    console.warn('[fluid] worker unavailable, running on the main thread:', this.error);
    this._teardown(); this.forceMain = true; this.busy = false;
    this._mainInit();
  }

  _mainInit() {
    this.sim = new FlipSim({ ...this.cfg, settleSteps: 40 });
    this.mode = 'main'; this.ready = true; this.busy = false;
    this.nParticles = this.sim.n;
    this._readMain();
  }

  _stepMain(batch) {
    const sim = this.sim;
    for (let i = 0; i < this.queue.length; i += 4) sim.disturb(this.queue[i], this.queue[i + 1], this.queue[i + 2], this.queue[i + 3]);
    this.queue.length = 0;
    sim.acc = Math.min(sim.acc, batch ? 1e9 : 0.1);
    const steps = sim.advance(this.pending, batch ? 120 : 6);
    this.pending = 0;
    if (steps) this._readMain();
    this.stepMs = sim.lastMs;
  }

  _readMain() {
    const sim = this.sim;
    this.heights.set(sim.heights);
    this.simTime = sim.simTime; this.backlog = sim.acc;
    const g = this.spray.geometry;
    this.nSpray = sim.packSpray(g.attributes.position.array);
    g.setDrawRange(0, this.nSpray); g.attributes.position.needsUpdate = true;
    if (this.showAll) {
      if (!this.all) this._makeAll();
      sim.packAll(this.all.geometry.attributes.position.array);
      this.all.geometry.setDrawRange(0, sim.n); this.all.geometry.attributes.position.needsUpdate = true;
    }
  }

  _makeAll() {
    const n = Math.max(this.nParticles, 40000);
    this.all = makePoints(n, ALL_VERT, ALL_FRAG, this.allUniforms, { depthTest: false, depthWrite: false });
    this.all.renderOrder = 7; this.all.name = 'fluid-particles';
    this.all.visible = this.active && this.showAll;
    this.group.add(this.all);
    if (this.mode === 'main' && this.sim) this._readMain();
  }

  _dispatch() {
    if (!this.worker || !this.ready || this.busy) return;
    if (this.pending < 1e-6 && !this.queue.length && this.backlog < 1 / 60) return;
    const now = performance.now();
    const batch = now < this.batchUntil;
    this.lastWasBatch = batch;
    const imp = this.queue.length ? new Float32Array(this.queue) : null;
    this.queue.length = 0;
    const dt = this.pending; this.pending = 0;
    this.busy = true;
    this.worker.postMessage({
      t: 'adv', dt, imp, epoch: this.epoch, all: this.showAll,
      budget: batch ? 150 : 22, maxBacklog: batch ? 1e9 : 0.1,
    }, imp ? [imp.buffer] : []);
  }

  _onMessage(m) {
    if (m.t === 'err') { this.error = m.message; console.error('[fluid] worker error', m.message); this._fallback(); return; }
    if (m.t !== 'res') return;
    this.busy = false;
    if (m.ready) this.ready = true;
    if (m.epoch !== this.epoch) { if (this.active) this._dispatch(); return; }
    this.nParticles = m.n;
    if (m.simTime !== undefined) this.simTime = m.simTime;
    this.stepMs = m.steps ? m.ms / m.steps : this.stepMs;
    this.backlog = m.backlog || 0;
    if (this.lastWasBatch && this.backlog >= 1 / 60) this.batchUntil = performance.now() + 600;
    if (!m.light && m.heights) {
      this.heights.set(m.heights);
      const g = this.spray.geometry;
      g.attributes.position.array.set(m.spray.subarray(0, 3 * m.ns));
      g.setDrawRange(0, m.ns); g.attributes.position.needsUpdate = true;
      this.nSpray = m.ns;
      if (m.all && this.showAll) {
        if (!this.all) this._makeAll();
        this.all.geometry.attributes.position.array.set(m.all);
        this.all.geometry.setDrawRange(0, m.n); this.all.geometry.attributes.position.needsUpdate = true;
      }
    }
    if (this.active) this._dispatch();
    if (this.waiters.length) {
      this.waiters = this.waiters.filter((w) => { if (w.check()) { w.res(true); return false; } return true; });
    }
  }
}
