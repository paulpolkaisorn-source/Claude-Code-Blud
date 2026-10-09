// Sky, sun, image-based lighting and distance haze. One slider (hour of day) drives everything.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { POOL } from '../pool-config.js';
import { Clouds } from './clouds.js';

const P = { turbidity: 2.0, rayleigh: 1.4, mieCoefficient: 0.0025, mieDirectionalG: 0.8 };
const GAIN = { value: 0.58 };   // scales the sky's HDR output so it tone-maps to a richer blue
const RAY = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];

// JS port of the Preetham sky in three's Sky shader (sun disc left out): linear colour for a
// view direction. Used to colour the fog so the haze melts into the real sky at the horizon.
export function skyRadiance(dir, sunDir, out = new THREE.Color()) {
  const cz = Math.min(1, Math.max(-1, sunDir.y));
  const sunE = 1000 * Math.max(0, 1 - Math.pow(Math.E, -((1.6110731556870734 - Math.acos(cz)) / 1.5)));
  const betaM = MIE.map((m) => 0.434 * (0.2 * P.turbidity * 1e-17) * m * P.mieCoefficient);
  const betaR = RAY.map((r) => r * P.rayleigh);
  const zen = Math.acos(Math.max(0, dir.y));
  const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - (zen * 180) / Math.PI, -1.253));
  const sR = 8400 * inv, sM = 1250 * inv;
  const cosT = dir.x * sunDir.x + dir.y * sunDir.y + dir.z * sunDir.z;
  const rPh = 0.05968310365946075 * (1 + Math.pow(cosT * 0.5 + 0.5, 2));
  const g = P.mieDirectionalG, g2 = g * g;
  const mPh = 0.07957747154594767 * ((1 - g2) / Math.pow(1 - 2 * g * cosT + g2, 1.5));
  const mixAmt = Math.min(1, Math.max(0, Math.pow(1 - sunDir.y, 5)));
  const c = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const fex = Math.exp(-(betaR[i] * sR + betaM[i] * sM));
    const ratio = (betaR[i] * rPh + betaM[i] * mPh) / (betaR[i] + betaM[i]);
    let lin = Math.pow(sunE * ratio * (1 - fex), 1.5);
    lin *= 1 + (Math.pow(sunE * ratio * fex, 0.5) - 1) * mixAmt;
    const tex = (lin + 0.1 * fex) * 0.04 + [0, 0.0003, 0.00075][i];
    c[i] = Math.pow(tex, 1 / 2.4) * GAIN.value;
  }
  return out.setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
}

export class SkyRig {
  constructor({ renderer, scene, sun }) {
    this.renderer = renderer; this.scene = scene; this.sun = sun;
    this.hour = 9.5;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.params = P;
    this.tune = { sunMax: 3.2, sunMin: 0.35, hemiBase: 0.3, hemiK: 0.2, envI: 0.8, fogDensity: 0.002 };
    this.sky = new Sky(); this.sky.scale.setScalar(10000); this.sky.name = 'sky';
    this.gain = GAIN;
    this.sky.material.onBeforeCompile = (sh) => {
      sh.uniforms.uSkyGain = GAIN;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uSkyGain;\nvoid main() {').replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uSkyGain, 1.0 );');
    };
    this.applyParams(true);
    scene.add(this.sky);
    this.clouds = new Clouds(); scene.add(this.clouds.mesh);
    // environment: a second sky (sharing uniforms) plus a dim ground disc, filtered by PMREM
    this.envScene = new THREE.Scene();
    this.envSky = new Sky(); this.envSky.scale.setScalar(10000);
    this.envSky.material.uniforms = this.sky.material.uniforms;
    this.envSky.material.onBeforeCompile = this.sky.material.onBeforeCompile;
    this.envScene.add(this.envSky);
    this.envGround = new THREE.Mesh(new THREE.CircleGeometry(4000, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x8a7d62, side: THREE.DoubleSide }));
    this.envGround.position.y = -3;
    this.envScene.add(this.envGround);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null; this.envDirty = true; this.lastEnv = -1e9;
    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0xcdb894, 0.5); this.hemi.name = 'hemi';
    scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0xbcd2e8, 0.002);
    this.fogColor = new THREE.Color(); this.tmp = new THREE.Vector3();
    this.zenith = new THREE.Color(); this.horizon = new THREE.Color();
    sun.castShadow = true;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 2.2;
    scene.add(sun); scene.add(sun.target);
    this.setHour(this.hour, true);
  }

  applyParams(skipLight) {
    const u = this.sky.material.uniforms;
    u.turbidity.value = P.turbidity; u.rayleigh.value = P.rayleigh;
    u.mieCoefficient.value = P.mieCoefficient; u.mieDirectionalG.value = P.mieDirectionalG;
    if (!skipLight) this.setHour(this.hour, true);
  }

  elevationAzimuth(h) {
    const t = Math.min(1, Math.max(0, (h - 6.5) / 13));
    const el = Math.max(3, 62 * Math.pow(Math.sin(Math.PI * t), 0.8));
    return { el: el * Math.PI / 180, az: t * Math.PI };
  }

  setHour(h, immediate = false) {
    this.hour = h;
    const { el, az } = this.elevationAzimuth(h);
    this.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    const d = this.sunDir;
    this.sun.position.copy(d).multiplyScalar(70);
    this.sun.target.position.set(0, 0, 0); this.sun.target.updateMatrixWorld();
    // warm low sun, white high sun
    const k = THREE.MathUtils.smoothstep(Math.sin(el), 0.04, 0.62);
    this.sun.color.setRGB(1, 0.6 + 0.33 * k, 0.34 + 0.46 * k, THREE.SRGBColorSpace);
    this.sun.intensity = this.tune.sunMin + this.tune.sunMax * Math.pow(THREE.MathUtils.smoothstep(Math.sin(el), 0.0, 0.5), 0.7);
    this.hemi.intensity = this.tune.hemiBase + this.tune.hemiK * k;
    skyRadiance(this.tmp.set(0.3, 1, 0.1).normalize(), d, this.zenith);
    skyRadiance(this.tmp.set(1, 0.05, 0).normalize(), d, this.horizon);
    this.hemi.color.copy(this.zenith).lerp(this.horizon, 0.25);
    this.hemi.groundColor.setRGB(0.2 + 0.12 * k, 0.17 + 0.1 * k, 0.12 + 0.06 * k, THREE.LinearSRGBColorSpace);
    this.envGround.material.color.copy(this.horizon).multiplyScalar(0.45).lerp(this.hemi.groundColor, 0.5);
    this.clouds.setSun(d, this.sun.color, this.zenith, k);
    this.fitShadow();
    this.envDirty = true;
    if (immediate) this.refreshEnvironment(true);
  }

  // Orthographic shadow frustum around the terrace, fitted in light space.
  fitShadow() {
    const cam = this.sun.shadow.camera;
    const world = new THREE.Matrix4().lookAt(this.sun.position, this.sun.target.position, new THREE.Vector3(0, 1, 0)).setPosition(this.sun.position);
    const toLight = world.invert();
    const box = new THREE.Box3(), p = new THREE.Vector3();
    for (const x of [-19, 19]) for (const y of [-1.5, 7]) for (const z of [-14, 14]) box.expandByPoint(p.set(x, y, z).applyMatrix4(toLight));
    cam.left = box.min.x - 1; cam.right = box.max.x + 1; cam.bottom = box.min.y - 1; cam.top = box.max.y + 1;
    cam.near = Math.max(0.5, -box.max.z - 6); cam.far = -box.min.z + 6;
    cam.updateProjectionMatrix();
  }

  refreshEnvironment(force = false) {
    const now = performance.now();
    if (!force && (!this.envDirty || now - this.lastEnv < 400)) return;
    this.envDirty = false; this.lastEnv = now;
    const prev = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 2000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = this.tune.envI;
    if (prev) prev.dispose();
  }

  update(camera) {
    this.refreshEnvironment(false);
    this.tmp.set(0, 0, -1).applyQuaternion(camera.quaternion); this.tmp.y = 0;
    if (this.tmp.lengthSq() < 1e-4) this.tmp.set(1, 0, 0);
    this.tmp.normalize(); this.tmp.y = 0.01; this.tmp.normalize();
    skyRadiance(this.tmp, this.sunDir, this.fogColor);
    this.scene.fog.color.copy(this.fogColor);
    this.scene.fog.density = this.tune.fogDensity;
    this.sky.position.copy(camera.position);
    this.clouds.update(performance.now() * 0.001, camera);
  }

  get fog() { return this.scene.fog; }
}

export const SUN_AREA = { x: POOL.length, z: POOL.width };
