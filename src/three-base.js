// Shared Three.js plumbing: renderer/stage setup, procedural textures, sparkle particles.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { observeSize } from './util.js';
import { makeProfile } from './gfx.js';

export { THREE };

/**
 * Creates a renderer + scene + camera that fills `root`, scaled by the graphics profile `gfx`.
 * opts: { fov, near, far, gfx, bloom:{strength,radius,threshold}, ao:true, shadows:true, environment, exposure }
 */
export function createStage(root, opts = {}) {
  const gfx = opts.gfx || makeProfile('high');
  const usesComposer = !!((opts.bloom && gfx.bloom) || (opts.ao && gfx.ao));
  const renderer = new THREE.WebGLRenderer({
    antialias: gfx.antialias && !usesComposer,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const pr = Math.min((window.devicePixelRatio || 1) * gfx.ss, gfx.dpr);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = gfx.transmissionScale;
  if (opts.shadows && gfx.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = gfx.level >= 4 ? THREE.VSMShadowMap : THREE.PCFShadowMap;
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
  const wantBloom = opts.bloom && gfx.bloom;
  const wantAO = opts.ao && gfx.ao;
  if (usesComposer) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: gfx.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pr);
    composer.addPass(new RenderPass(scene, camera));
    if (wantAO) {
      aoPass = new GTAOPass(scene, camera, 256, 256);
      aoPass.output = GTAOPass.OUTPUT.Default;
      aoPass.blendIntensity = 0.85 * Math.min(1.4, gfx.aoMul);
      try { aoPass.updateGtaoMaterial({ radius: opts.aoRadius ?? 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: gfx.level >= 5 ? 24 : 16 }); } catch (_) { /* older API */ }
      composer.addPass(aoPass);
    }
    if (wantBloom) {
      const b = opts.bloom;
      bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), (b.strength ?? 0.6) * gfx.bloomMul, b.radius ?? 0.6, b.threshold ?? 0.6);
      composer.addPass(bloomPass);
    }
    composer.addPass(new OutputPass());
  }

  const stage = {
    renderer,
    scene,
    camera,
    composer,
    bloomPass,
    aoPass,
    gfx,
    pixelRatio: pr,
    width: 1,
    height: 1,
    onResize: null,
    render() {
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

  const stopObserve = observeSize(root, (w, h) => {
    if (!w || !h) return;
    stage.width = w;
    stage.height = h;
    renderer.setSize(w, h);
    composer?.setSize(w, h);
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
