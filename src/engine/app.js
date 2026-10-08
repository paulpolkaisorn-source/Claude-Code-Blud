import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { animate } from 'animejs';
import { createFinishPass } from './postfx.js';
import { QualityManager, TIERS } from './quality.js';
import { buildRoom, STATION_X } from './room.js';
import { makeRippleUniform, RIPPLE_COUNT } from './shaders.js';
import { AudioEngine } from '../audio/engine.js';
import { Voices } from '../audio/voices.js';
import { FixedStep } from '../utils/spring.js';
import { noise1 } from '../utils/noise.js';
import { clamp, expDamp } from '../utils/math.js';

const CAMERA_FOV = 36;
const CAMERA_HEIGHT = 2.7;
const CAMERA_DIST = 4.7;
const LOOK_HEIGHT = 0.45;
const KEY_SPEED = 0.55; // viewport heights per second for keyboard cursor
const PHYS_HZ = 120;

// The App owns the renderer, the post chain, the shared room, the camera, input routing,
// the frame loop and the flow meter. Stations are created on demand and disposed on leave.
export class App {
  constructor({ canvas, stage, sheetHost, settings, ui, stationDefs }) {
    this.canvas = canvas;
    this.stage = stage;
    this.sheetHost = sheetHost;
    this.settings = settings;
    this.ui = ui;
    this.defs = stationDefs;
    this.index = clamp(settings.station | 0, 0, stationDefs.length - 1);
    this.station = null;
    this.started = false;
    this.paused = false;
    this.time = 0;
    this.keys = new Set();
    this.kbd = { nx: 0.5, ny: 0.5, down: false, visible: false };
    this.downPointers = new Set();
    this.transitioning = false;
    this.pendingIndex = null;
    this.shakeAmt = 0;
    this.bloomBoost = 0;
    this.flowEnergy = 0;
    this.flowLevel = 0;
    this.rippleUniform = makeRippleUniform();
    this.lastHaptic = 0;
    this.camState = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.dolly = { t: 1 };
    this.dollyFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.dollyTo = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.fixed = new FixedStep(1 / PHYS_HZ, 10);
    this.saveTimer = 0;
    this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    this.audio = new AudioEngine();
    this.audio.setVolume(settings.volume);
    this.audio.setMuted(settings.muted);
    for (const k of Object.keys(settings.mix)) this.audio.mix[k] = settings.mix[k];
    this.voices = new Voices(this.audio);

    this.quality = new QualityManager({
      mode: settings.quality === 'auto' ? 'auto' : settings.quality,
      tier: 1,
      onChange: () => this.applyQuality(),
    });
  }

  get reduce() {
    return this.reducedMotion || this.settings.reduceEffects;
  }

  // ---- Setup -------------------------------------------------------------

  init() {
    const canvas = this.canvas;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 80);
    this.raycaster = new THREE.Raycaster();

    const tier = TIERS[this.quality.tier];
    this.room = buildRoom({
      renderer,
      scene: this.scene,
      rippleUniform: this.rippleUniform,
      texSize: tier.texSize,
      dustMax: tier.dust,
      shadowMap: tier.shadowMap,
      reduced: this.reduce,
    });

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.6, 0.85);
    this.outputPass = new OutputPass();
    this.finish = createFinishPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.finish);

    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);

    this.resize();
    this.applyQuality();
    this.attachInput();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

  }

  // Called from the start screen (a user gesture): audio can now start.
  begin() {
    if (this.started) return;
    this.started = true;
    this.audio.start();
    this.voices.startAmbient();
    this.enterStation(this.index, false);
    this.start();
  }

  // Pixel density, bloom and shadow resolution follow the active quality tier.
  applyQuality() {
    if (!this.renderer) return;
    const t = this.quality.settings;
    const dpr = Math.min(window.devicePixelRatio || 1, t.maxDpr) * this.quality.resScale;
    this.renderer.setPixelRatio(clamp(dpr, 0.5, 2));
    this.composer.setPixelRatio(clamp(dpr, 0.5, 2));
    this.resize();

    const reduce = this.reduce;
    this.bloom.strength = reduce ? Math.min(t.bloom, 0.2) : t.bloom;
    this.bloom.enabled = this.bloom.strength > 0;
    this.finish.uniforms.uGrain.value = reduce ? 0 : t.grain;
    this.finish.uniforms.uAberration.value = reduce ? 0 : t.aberration;
    this.finish.uniforms.uEdgeBlur.value = t.edgeBlur;
    this.finish.uniforms.uVignette.value = 0.42;

    const key = this.room?.key;
    if (key && key.shadow.mapSize.x !== t.shadowMap) {
      key.shadow.mapSize.set(t.shadowMap, t.shadowMap);
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
    }
    this.room?.dust.setCount(reduce ? Math.floor(t.dust * 0.5) : t.dust);
    this.station?.setQuality?.(t);
    this.ui.setQualityLabel(this.quality.label);
  }

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.bloom.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewW = w;
    this.viewH = h;
    this.finish.uniforms.uRes.value.set(w * pr, h * pr);
    this.station?.resize?.(w, h);
  }

  onResize = () => {
    this.resize();
  };

  onVisibility = () => {
    if (document.hidden) {
      this.saveSettings();
    }
    this.audio.applyMaster(0.2);
  };

  onContextLost = (e) => {
    e.preventDefault();
    this.paused = true;
    this.ui.message('Graphics were reset by the system. Restoring…');
  };

  onContextRestored = () => {
    this.paused = false;
    this.renderer.resetState();
    this.applyQuality();
    this.ui.message('');
  };

  // ---- Camera ------------------------------------------------------------

  // Portrait screens are narrower, so the camera pulls back to keep a whole pad in frame.
  fitDistance() {
    const aspect = this.viewW / this.viewH || 1;
    return CAMERA_DIST * clamp(0.95 / aspect, 1, 2.2);
  }

  anchorPos(i) {
    return new THREE.Vector3(STATION_X[i], CAMERA_HEIGHT, this.fitDistance());
  }

  anchorLook(i) {
    return new THREE.Vector3(STATION_X[i], LOOK_HEIGHT, 0);
  }

  // Dolly: an arc between stations, eased by anime.js. Reduced motion uses a short cut.
  dollyTo3(i) {
    this.dollyFrom.pos.copy(this.camState.pos);
    this.dollyFrom.look.copy(this.camState.look);
    this.dollyTo.pos.copy(this.anchorPos(i));
    this.dollyTo.look.copy(this.anchorLook(i));
    this.dolly.t = 0;
    this.dollyAnim?.cancel?.();
    this.dollyAnim = animate(this.dolly, {
      t: 1,
      duration: this.reduce ? 320 : 1500,
      ease: 'inOutCubic',
    });
  }

  updateCamera(dt) {
    const k = this.dolly.t;
    const arc = Math.sin(Math.PI * k) * (this.reduce ? 0.1 : 0.7);
    if (k < 1) {
      this.camState.pos.lerpVectors(this.dollyFrom.pos, this.dollyTo.pos, k);
      this.camState.pos.y += arc;
      this.camState.look.lerpVectors(this.dollyFrom.look, this.dollyTo.look, k);
    } else {
      this.camState.pos.copy(this.anchorPos(this.index));
      this.camState.look.copy(this.anchorLook(this.index));
    }
    // Quiet idle sway so the camera never feels locked. Off under reduced motion.
    const sway = this.reduce ? 0 : 0.035;
    const sx = noise1(this.time * 0.11) * sway;
    const sy = noise1(this.time * 0.09 + 7) * sway * 0.5;
    const shake = this.reduce ? 0 : this.shakeAmt;
    const jx = noise1(this.time * 46) * shake;
    const jy = noise1(this.time * 41 + 3) * shake * 0.7;
    this.camera.position.set(
      this.camState.pos.x + sx + jx,
      this.camState.pos.y + sy + jy,
      this.camState.pos.z
    );
    this.camera.lookAt(this.camState.look);
    this.shakeAmt = expDamp(this.shakeAmt, 0, 6, dt);
  }

  // Micro-shake from cutting. Clamped and damped; zeroed under reduced motion.
  shake(amount) {
    if (this.reduce) return;
    this.shakeAmt = Math.min(0.06, Math.max(this.shakeAmt, amount));
  }

  // ---- Shared effects ----------------------------------------------------

  ripple(x, z, strength = 1) {
    const list = this.rippleUniform.value;
    let slot = list.findIndex((v) => v.w <= 0);
    if (slot < 0) {
      let oldest = 0;
      for (let i = 1; i < RIPPLE_COUNT; i++) if (list[i].z > list[oldest].z) oldest = i;
      slot = oldest;
    }
    list[slot].set(x, z, 0, this.reduce ? strength * 0.5 : strength);
  }

  bloomPulse(amount) {
    this.bloomBoost = Math.min(0.25, this.bloomBoost + (this.reduce ? amount * 0.3 : amount));
  }

  haptic(ms) {
    const now = performance.now();
    if (now - this.lastHaptic < 40 || !navigator.vibrate) return;
    this.lastHaptic = now;
    try {
      navigator.vibrate(ms);
    } catch (_) {
      /* not permitted */
    }
  }

  // Adds to the flow meter. Rhythm builds energy; it decays when you stop.
  flow(amount) {
    this.flowEnergy = Math.min(6, this.flowEnergy + amount);
  }

  // ---- Stations ----------------------------------------------------------

  enterStation(i, withDolly = true) {
    const def = this.defs[i];
    this.index = i;
    this.station = def.create(this);
    this.station.id = def.id;
    if (this.station.group) this.scene.add(this.station.group);
    this.station.enter?.();
    this.ui.setStation(i, def);
    this.settings.station = i;
    this.kbd.nx = this.station.cursorStart?.nx ?? 0.5;
    this.kbd.ny = this.station.cursorStart?.ny ?? 0.5;
    if (withDolly) this.dollyTo3(i);
    this.setQualityStation();
  }

  setQualityStation() {
    this.station?.setQuality?.(this.quality.settings);
  }

  goTo(i) {
    if (!this.started) return;
    if (i < 0 || i >= this.defs.length || i === this.index) return;
    if (this.transitioning) {
      this.pendingIndex = i;
      return;
    }
    this.transitioning = true;
    this.haptic(12);
    this.ui.wipe(
      () => {
        this.station.exit?.();
        if (this.station.group) this.scene.remove(this.station.group);
        this.station.dispose?.();
        this.station = null;
        this.enterStation(i, true);
      },
      () => {
        this.transitioning = false;
        if (this.pendingIndex !== null && this.pendingIndex !== this.index) {
          const next = this.pendingIndex;
          this.pendingIndex = null;
          this.goTo(next);
        }
        this.pendingIndex = null;
      }
    );
  }

  // ---- Input -------------------------------------------------------------

  attachInput() {
    const stage = this.stage;
    stage.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detachInput() {
    const stage = this.stage;
    stage.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  // Normalised viewport coordinates, plus pan (-1 left .. 1 right) for spatial audio.
  pointerInfo(e) {
    const w = this.viewW || window.innerWidth;
    const h = this.viewH || window.innerHeight;
    const nx = clamp(e.clientX / w, 0, 1);
    const ny = clamp(e.clientY / h, 0, 1);
    return {
      nx,
      ny,
      x: e.clientX,
      y: e.clientY,
      ndc: { x: nx * 2 - 1, y: -(ny * 2 - 1) },
      pan: (nx * 2 - 1) * 0.75,
      time: performance.now(),
      id: e.pointerId,
      type: e.pointerType,
    };
  }

  onPointerDown = (e) => {
    if (e.target.closest?.('.ui')) return;
    if (!this.started || this.transitioning || !this.station) return;
    this.downPointers.add(e.pointerId);
    try {
      this.stage.setPointerCapture(e.pointerId);
    } catch (_) {
      /* synthetic events cannot be captured */
    }
    this.station.pointerDown?.(this.pointerInfo(e));
  };

  onPointerMove = (e) => {
    if (!this.started || !this.station || this.transitioning) return;
    this.station.pointerMove?.(this.pointerInfo(e), this.downPointers.has(e.pointerId));
  };

  onPointerUp = (e) => {
    if (!this.started || !this.station) return;
    if (!this.downPointers.delete(e.pointerId)) return;
    this.station.pointerUp?.(this.pointerInfo(e));
  };

  onKeyDown = (e) => {
    if (!this.started) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const k = e.key;
    if (/^[1-4]$/.test(k)) {
      this.goTo(parseInt(k, 10) - 1);
      return;
    }
    if (k === 'q' || k === 'Q' || k === '[' || k === 'PageUp') {
      this.goTo(this.index - 1);
      return;
    }
    if (k === 'e' || k === 'E' || k === ']' || k === 'PageDown') {
      this.goTo(this.index + 1);
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      if (tag === 'BUTTON') return;
      this.keys.add(k);
      this.kbd.visible = true;
      e.preventDefault();
      return;
    }
    if ((k === ' ' || k === 'Enter') && tag !== 'BUTTON' && tag !== 'A') {
      e.preventDefault();
      if (e.repeat || this.kbd.down) return;
      this.kbd.down = true;
      this.kbd.visible = true;
      this.downPointers.add('kbd');
      this.station?.pointerDown?.(this.kbdInfo());
    }
  };

  onKeyUp = (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      this.keys.delete(k);
      return;
    }
    if ((k === ' ' || k === 'Enter') && this.kbd.down) {
      this.kbd.down = false;
      if (this.downPointers.delete('kbd')) this.station?.pointerUp?.(this.kbdInfo());
    }
  };

  onBlur = () => {
    this.keys.clear();
    if (this.kbd.down) {
      this.kbd.down = false;
      if (this.downPointers.delete('kbd')) this.station?.pointerUp?.(this.kbdInfo());
    }
  };

  // The keyboard cursor reports itself as a pointer, so every station works without a mouse.
  kbdInfo() {
    const w = this.viewW;
    const h = this.viewH;
    const nx = this.kbd.nx;
    const ny = this.kbd.ny;
    return {
      nx,
      ny,
      x: nx * w,
      y: ny * h,
      ndc: { x: nx * 2 - 1, y: -(ny * 2 - 1) },
      pan: (nx * 2 - 1) * 0.75,
      time: performance.now(),
      id: 'kbd',
      type: 'keyboard',
    };
  }

  updateKeyboard(dt) {
    if (!this.keys.size) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    const w = this.viewW / this.viewH || 1;
    this.kbd.nx = clamp(this.kbd.nx + (dx * KEY_SPEED * dt) / w, 0, 1);
    this.kbd.ny = clamp(this.kbd.ny + dy * KEY_SPEED * dt, 0, 1);
    this.station?.pointerMove?.(this.kbdInfo(), this.kbd.down);
  }

  // ---- Loop --------------------------------------------------------------

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  loop = (now) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.lastFrame) this.lastFrame = now;
    const dtMs = Math.min(now - this.lastFrame, 250);
    this.lastFrame = now;
    const dt = dtMs / 1000;
    if (this.paused || this.renderer.getContext().isContextLost()) return;
    this.time += dt;

    this.quality.update(dtMs, dt);
    this.updateKeyboard(dt);
    this.ui.updateCursor(this.kbd, this.viewW, this.viewH);

    this.fixed.run(dt, (h) => {
      this.station?.step?.(h, this.time);
    });
    this.station?.frame?.(dt, this.time);

    // Ripples and bloom pulses decay.
    for (const r of this.rippleUniform.value) {
      if (r.w > 0) {
        r.z += dt / 2.6;
        if (r.z >= 1) r.w = 0;
      }
    }
    this.bloomBoost = expDamp(this.bloomBoost, 0, 2.2, dt);
    this.bloom.strength = (this.reduce ? Math.min(this.quality.settings.bloom, 0.2) : this.quality.settings.bloom) + this.bloomBoost;

    // Flow meter: energy from rhythm, decaying, smoothed for display.
    this.flowEnergy = expDamp(this.flowEnergy, 0, 0.35, dt);
    const target = 1 - Math.exp(-this.flowEnergy * 0.9);
    this.flowLevel = expDamp(this.flowLevel, target, 2.5, dt);
    this.voices.setActivity(this.flowLevel);

    this.updateCamera(dt);
    this.room.dust.update(this.time);
    this.finish.uniforms.uTime.value = this.time;

    // Time spent and periodic save (silent when storage is unavailable).
    if (!document.hidden) this.settings.timeSpent = (this.settings.timeSpent || 0) + dt;
    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.saveSettings();
    }

    // devicePixelRatio changes (moving between displays, browser zoom) without a resize event.
    this.dprCheck = (this.dprCheck || 0) + dt;
    if (this.dprCheck > 0.5) {
      this.dprCheck = 0;
      if (Math.abs((window.devicePixelRatio || 1) - (this.lastDpr || 1)) > 0.001) {
        this.lastDpr = window.devicePixelRatio;
        this.applyQuality();
      }
    }

    this.ui.updateFlow(this.flowLevel, this.quality);
    this.composer.render(dt);
  };

  saveSettings() {
    this.settings.quality = this.quality.mode === 'auto' ? 'auto' : this.quality.mode;
    this.ui.persist?.();
  }

  dispose() {
    this.stop();
    this.detachInput();
    this.station?.dispose?.();
    this.room?.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
