// Shared Three.js plumbing: renderer/stage setup, procedural textures, sparkle particles.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { DynamicRes } from './perf.js';
import { observeSize } from './util.js';
import { makeProfile } from './gfx.js';

export { THREE };

// Edge-adaptive sharpen, used to crisp up the image when the internal resolution is scaled down.
const SharpenShader = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uAmount: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uAmount; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb;
      vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
      vec3 mn = min(c, min(min(n, s), min(e, w)));
      vec3 mx = max(c, max(max(n, s), max(e, w)));
      vec3 sharp = c + (c * 4.0 - n - s - e - w) * uAmount;
      gl_FragColor = vec4(clamp(sharp, mn, mx), 1.0); // clamped to the local range: no halos
    }`,
};

/**
 * Creates a renderer + scene + camera that fills `root`, scaled by the graphics profile `gfx`.
 * opts: { fov, near, far, gfx, bloom:{strength,radius,threshold}, ao:true, shadows:true, shadowFps,
 *         environment, exposure }
 * The drawing buffer is capped by gfx.pixels3D and (unless disabled) dynamically rescaled to hold ~60 fps.
 */
export function createStage(root, opts = {}) {
  const gfx = opts.gfx || makeProfile('high');
  const usesComposer = !!((opts.bloom && gfx.bloom) || (opts.ao && gfx.ao));
  const renderer = new THREE.WebGLRenderer({
    antialias: gfx.antialias && !usesComposer,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = gfx.transmissionScale;
  let shadowInterval = 0;
  let shadowClock = 0;
  if (opts.shadows && gfx.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // hardware-filtered; VSM/soft variants cost far more
    if (opts.shadowFps) { // static-ish casters (e.g. a campfire) don't need a re-render every frame
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true; // render the first shadow map before any frame samples it
      shadowInterval = 1 / opts.shadowFps;
    }
  }
  renderer.domElement.className = 'game-canvas';
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, opts.near ?? 0.1, opts.far ?? 200);

  let pmrem = null;
  if (opts.environment !== false) {
    pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    scene.environmentIntensity = opts.envIntensity ?? 0.8;
    env.dispose?.();
  }

  let composer = null;
  let bloomPass = null;
  let aoPass = null;
  let sharpenPass = null;
  const wantBloom = opts.bloom && gfx.bloom;
  const wantAO = opts.ao && gfx.ao;
  if (usesComposer) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: gfx.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    if (wantAO) {
      aoPass = new GTAOPass(scene, camera, 256, 256);
      aoPass.output = GTAOPass.OUTPUT.Default;
      aoPass.blendIntensity = 0.85 * Math.min(1.4, gfx.aoMul);
      try { aoPass.updateGtaoMaterial({ radius: opts.aoRadius ?? 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: gfx.level >= 5 ? 12 : 8 }); } catch (_) { /* older API */ }
      // Ambient occlusion is low-frequency: compute it at half resolution (4x cheaper), upsample.
      const baseSetSize = aoPass.setSize.bind(aoPass);
      aoPass.setSize = (w, h) => baseSetSize(Math.max(2, Math.round(w * 0.5)), Math.max(2, Math.round(h * 0.5)));
      composer.addPass(aoPass);
    }
    if (wantBloom) {
      const b = opts.bloom;
      bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), (b.strength ?? 0.6) * gfx.bloomMul, b.radius ?? 0.6, b.threshold ?? 0.6);
      composer.addPass(bloomPass);
    }
    composer.addPass(new OutputPass());
    sharpenPass = new ShaderPass(SharpenShader);
    sharpenPass.enabled = false;
    composer.addPass(sharpenPass);
  }

  const stage = {
    renderer,
    scene,
    camera,
    composer,
    bloomPass,
    aoPass,
    gfx,
    pixelRatio: 1,
    scale: 1,
    fps: 60,
    width: 1,
    height: 1,
    onResize: null,
    render() {
      const now = performance.now();
      dyn.tick(now);
      stage.fps = dyn.fps;
      if (shadowInterval) {
        shadowClock += (now - (stage._t || now)) / 1000;
        if (shadowClock >= shadowInterval && stage.shadowActive !== false) { shadowClock = 0; renderer.shadowMap.needsUpdate = true; }
        stage._t = now;
      }
      if (window.__hushNoRender) return; // CPU-only profiling hook
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      stopObserve();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose();
            m.dispose();
          }
        }
        o.shadow?.map?.dispose?.();
      });
      if (scene.background?.isTexture) scene.background.dispose();
      scene.environment?.dispose?.();
      pmrem?.dispose();
      composer?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };

  // Effective pixel ratio = device ratio x supersample, capped by the profile and by the pixel budget,
  // then multiplied by the dynamic/fixed render scale.
  const basePR = () => {
    const w = Math.max(1, stage.width), h = Math.max(1, stage.height);
    const want = Math.min((window.devicePixelRatio || 1) * gfx.ss, gfx.dpr);
    return Math.min(want, Math.sqrt(gfx.pixels3D / (w * h)));
  };
  const applyScale = (scale) => {
    stage.scale = scale;
    const pr = Math.max(0.35, basePR() * scale);
    stage.pixelRatio = pr;
    renderer.setPixelRatio(pr);
    composer?.setPixelRatio(pr);
    renderer.setSize(stage.width, stage.height); // CSS size stays; the browser upscales the buffer
    composer?.setSize(stage.width, stage.height);
    if (sharpenPass) {
      sharpenPass.enabled = scale < 0.98;
      sharpenPass.uniforms.uTexel.value.set(1 / (stage.width * pr), 1 / (stage.height * pr));
      sharpenPass.uniforms.uAmount.value = 0.2 + (1 - scale) * 0.9;
    }
  };
  const dyn = new DynamicRes({ mode: gfx.renderScale, min: 0.5, apply: applyScale });
  stage.dyn = dyn;
  window.__hushStage = stage; // debugging / tests

  const stopObserve = observeSize(root, (w, h) => {
    if (!w || !h) return;
    stage.width = w;
    stage.height = h;
    applyScale(dyn.scale);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    stage.onResize?.(w, h);
  });
  return stage;
}

/** Vertical gradient background texture. stops: [[pos 0..1 top→bottom, css color], ...] */
export function gradientTexture(stops, { w = 4, h = 512 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) grad.addColorStop(p, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft radial glow sprite texture (white → transparent). */
export function glowTexture(size = 128, inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.25)') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Pool of additive soft points with per-particle velocity, gravity-ish drift and life. */
export class Sparkles {
  constructor(count = 300, { size = 0.12, gravity = 0, drag = 0.4 } = {}) {
    this.count = count;
    this.gravity = gravity;
    this.drag = drag;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.life = new Float32Array(count); // remaining seconds
    this.maxLife = new Float32Array(count).fill(1);
    this.sz = new Float32Array(count);
    this.age = new Float32Array(count).fill(1); // 0..1, 1 = dead
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sz, 1));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 600 }, uBase: { value: size } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; attribute float aAge;
        varying vec3 vColor; varying float vAlpha;
        uniform float uScale; uniform float uBase;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          float fade = smoothstep(0.0,0.12,aAge) * (1.0 - smoothstep(0.55,1.0,aAge));
          vAlpha = (aAge >= 1.0) ? 0.0 : fade;
          vColor = aColor;
          gl_PointSize = aSize * uBase * uScale / max(0.1, -mv.z) * (0.6 + 0.4*(1.0-aAge));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = smoothstep(1.0, 0.0, r);
          float a = (core*core*0.9 + exp(-r*r*14.0)*0.7) * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.geo = geo;
  }

  spawn(x, y, z, vx, vy, vz, color, size = 1, life = 2) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = color.r; this.col[k + 1] = color.g; this.col[k + 2] = color.b;
    this.sz[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.age[i] = 0;
  }

  update(dt, viewportHeight = 800, fovDeg = 40) {
    this.material.uniforms.uScale.value = viewportHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= 1) continue;
      this.life[i] -= dt;
      this.age[i] = Math.min(1, 1 - this.life[i] / this.maxLife[i]);
      const k = i * 3;
      const d = Math.exp(-this.drag * dt);
      this.vel[k] *= d;
      this.vel[k + 1] = this.vel[k + 1] * d + this.gravity * dt;
      this.vel[k + 2] *= d;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAge.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
}
