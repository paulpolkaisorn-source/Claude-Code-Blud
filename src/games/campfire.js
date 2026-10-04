// Campfire — 3D (Three.js). A night forest clearing around a living fire:
// layered noise-driven flame billboards, rising embers, smoke, a flickering
// shadow-casting point light, glowing log cracks, and a layered procedural fire
// soundscape (breathing body, hiss, Poisson-timed crackles, snaps and ticks).

import { THREE, createStage, glowTexture, Sparkles } from '../three-base.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createLoop, track, rand, clamp, lerp, smoothstep, damp, pick, mulberry32 } from '../util.js';
import { Pad } from '../audio.js';

const FOV = 46;
const TAU = Math.PI * 2;
const FLAME_H = 3.4; // world height of a flame quad

// ---------------------------------------------------------------- shaders
const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCT; i++){ v += a*vnoise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return v;
}`;

const FLAME_VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FLAME_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uInt, uKick, uWind, uFlame, uSeed, uTone, uWidth, uAlpha, uFade, uHMul;
${NOISE_GLSL}
void main(){
  float v = vUv.y;
  float h = v / max(uFlame * uHMul, 0.05);
  if (h >= 1.0) discard;
  float t = uTime;
  float x = (vUv.x - 0.5) * 2.0;
  // slow lateral sway that grows toward the tip, plus wind bending
  float sw = (fbm(vec2(uSeed*5.0, h*1.3 - t*0.55)) - 0.5) * 0.8;
  x -= sw * h + uWind * h * h * 1.15;
  // turbulence scrolling upward (faster when the fire is bigger)
  float n = fbm(vec2(x*1.7 + uSeed, h*2.4 - t*(1.5 + uInt*0.9)));
  x += (n - 0.5) * 0.8 * (0.2 + h);
  // body profile: bulb near the base tapering to a tongue
  float prof = uWidth * pow(1.0 - h, 0.55) * (0.62 + 0.38*smoothstep(0.0, 0.2, h));
  float d = abs(x) / max(prof, 0.01);
  float core = 1.0 - smoothstep(0.3, 1.0, d);
  float e = fbm(vec2(x*2.6 + uSeed*3.0, h*3.4 - t*2.7 + 4.0));
  float dens = core * (1.0 + 0.5*e) - h*h*0.22 - (1.0 - e)*h*0.3;
  dens = smoothstep(0.03, 0.55, dens);
  dens *= smoothstep(0.0, 0.05, v);
  float heat = clamp(core*0.72 + (1.0 - h)*0.42 - 0.2 + (uTone - 0.5)*0.5 + uKick*0.1, 0.0, 1.25);
  vec3 c0 = vec3(0.75, 0.06, 0.0);
  vec3 c1 = vec3(1.0, 0.36, 0.035);
  vec3 c2 = vec3(1.0, 0.74, 0.20);
  vec3 c3 = vec3(1.0, 0.95, 0.78);
  vec3 col = mix(c0, c1, smoothstep(0.0, 0.42, heat));
  col = mix(col, c2, smoothstep(0.36, 0.78, heat));
  col = mix(col, c3, smoothstep(0.98, 1.25, heat));
  float a = dens * uAlpha * uFade;
  gl_FragColor = vec4(col * (1.0 + heat*0.7), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const BED_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uGlow;
${NOISE_GLSL}
void main(){
  vec2 p = vUv*2.0 - 1.0;
  float r = length(p);
  float edge = 1.0 - smoothstep(0.7, 1.0, r);
  if (edge < 0.01) discard;
  float n1 = fbm(p*3.6 + vec2(uTime*0.03, 0.0));
  float n2 = fbm(p*8.5 - uTime*0.05 + 3.0);
  float crack = pow(1.0 - abs(n1*2.0 - 1.0), 5.0);
  float pulse = 0.62 + 0.38*sin(uTime*1.7 + n2*9.0 + n1*5.0);
  float glow = (crack + 0.35*smoothstep(0.45, 0.85, n2)) * pulse * uGlow * (1.0 - r*0.45);
  vec3 coal = vec3(0.028, 0.019, 0.015) * (0.5 + n2);
  vec3 hot = mix(vec3(0.95, 0.12, 0.0), vec3(1.0, 0.55, 0.14), clamp(glow, 0.0, 1.0));
  vec3 col = coal + hot * glow * 2.0;
  gl_FragColor = vec4(col, edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uZen, uHor, uFog;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 c = mix(uHor, uZen, pow(clamp(y, 0.0, 1.0), 0.5));
  c = mix(c, uFog, smoothstep(0.0, -0.1, y));
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- canvas textures
function wrapDraw(S, x, y, r, fn) {
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      if (x + ox + r < 0 || x + ox - r > S || y + oy + r < 0 || y + oy - r > S) continue;
      fn(x + ox, y + oy);
    }
  }
}

function groundTexture(aniso) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3122';
  g.fillRect(0, 0, S, S);
  const earth = ['#2c2418', '#463a28', '#33301c', '#3a4222', '#52402a', '#241e14'];
  for (let i = 0; i < 160; i++) {
    const r = rand(14, 52);
    const col = pick(earth);
    wrapDraw(S, rand(0, S), rand(0, S), r, (x, y) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col + 'aa');
      gr.addColorStop(1, col + '00');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  const blades = ['#4c6a34', '#3a5a2c', '#56733a', '#2f4a28', '#6b7a3a'];
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const len = rand(4, 13);
    const a = -Math.PI / 2 + rand(-0.7, 0.7);
    const col = pick(blades);
    wrapDraw(S, rand(0, S), rand(0, S), len, (x, y) => {
      g.strokeStyle = col;
      g.globalAlpha = rand(0.35, 0.8);
      g.lineWidth = rand(0.8, 1.6);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    });
  }
  g.globalAlpha = 1;
  const litter = ['#7a4a22', '#5e3418', '#8a5a2a', '#4b2c14', '#6e5a2a'];
  for (let i = 0; i < 520; i++) {
    const col = pick(litter);
    const w = rand(2, 5), h = rand(1, 2.4), a = rand(0, TAU);
    wrapDraw(S, rand(0, S), rand(0, S), 6, (x, y) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.globalAlpha = rand(0.4, 0.9);
      g.fillStyle = col;
      g.fillRect(-w / 2, -h / 2, w, h);
      g.restore();
    });
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 26);
  t.anisotropy = aniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function stoneTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#6a645a';
  g.fillRect(0, 0, S, S);
  const tones = ['#7c766a', '#585248', '#8a8274', '#4d4a44', '#6e665a', '#5a6054'];
  for (let i = 0; i < 90; i++) {
    const r = rand(10, 46);
    const col = pick(tones);
    wrapDraw(S, rand(0, S), rand(0, S), r, (x, y) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col + 'cc');
      gr.addColorStop(1, col + '00');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,240,0.1)';
    g.fillRect(rand(0, S), rand(0, S), rand(1, 2.4), rand(1, 2.4));
  }
  for (let i = 0; i < 26; i++) {
    const r = rand(3, 9);
    wrapDraw(S, rand(0, S), rand(0, S), r, (x, y) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(110,130,60,0.5)');
      gr.addColorStop(1, 'rgba(110,130,60,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bark diffuse + matching emissive "ember crack" map sharing the same fissure paths.
function barkTextures() {
  const W = 256, H = 512;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const cd = mk(), ce = mk();
  const d = cd.getContext('2d'), e = ce.getContext('2d');
  const bg = d.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c120b');
  bg.addColorStop(0.15, '#33231a');
  bg.addColorStop(0.85, '#2d2016');
  bg.addColorStop(1, '#150c07');
  d.fillStyle = bg;
  d.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 2) {
    d.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '90,62,40'},${rand(0.03, 0.16)})`;
    d.fillRect(x, 0, rand(1, 4), H);
  }
  for (let i = 0; i < 700; i++) {
    d.fillStyle = `rgba(${Math.random() < 0.6 ? '0,0,0' : '110,80,52'},${rand(0.05, 0.22)})`;
    d.fillRect(rand(0, W), rand(0, H), rand(1, 3), rand(5, 26));
  }
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  d.lineCap = e.lineCap = 'round';
  d.lineJoin = e.lineJoin = 'round';
  for (let i = 0; i < 34; i++) {
    let x = rand(0, W);
    let y = rand(-30, H * 0.8);
    const len = rand(60, 260);
    const lw = rand(2.5, 6);
    const dark = rand(0.55, 0.95);
    let px = x, py = y;
    const segs = Math.round(len / 14);
    const glowy = Math.random() < 0.62;
    for (let s = 0; s < segs; s++) {
      x += rand(-5, 5);
      y += rand(9, 18);
      d.strokeStyle = `rgba(6,3,1,${dark})`;
      d.lineWidth = lw;
      d.beginPath();
      d.moveTo(px, py);
      d.lineTo(x, y);
      d.stroke();
      if (glowy && Math.random() < 0.8) {
        // hotter toward the bottom of the log (where the coals are)
        const hot = clamp(0.3 + (y / H) * 0.9, 0, 1);
        const a = rand(0.35, 1) * hot;
        e.strokeStyle = `rgba(255,${Math.round(70 + 90 * a)},${Math.round(14 + 20 * a)},${a})`;
        e.lineWidth = lw * rand(0.5, 0.95);
        e.shadowColor = '#ff6a18';
        e.shadowBlur = 7;
        e.beginPath();
        e.moveTo(px, py);
        e.lineTo(x, y);
        e.stroke();
      }
      px = x;
      py = y;
    }
  }
  e.shadowBlur = 0;
  // charred ends glow a little too
  const eg = e.createLinearGradient(0, H * 0.82, 0, H);
  eg.addColorStop(0, 'rgba(160,40,0,0)');
  eg.addColorStop(1, 'rgba(180,50,4,0.35)');
  e.fillStyle = eg;
  e.fillRect(0, H * 0.82, W, H * 0.18);
  const map = new THREE.CanvasTexture(cd);
  map.wrapS = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(ce);
  emissive.wrapS = THREE.RepeatWrapping;
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function smokeTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const a = rand(0, TAU);
    const rr = rand(0, 30);
    const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
    const r = rand(18, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.3)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.6, 'rgba(0,0,0,0.55)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function moonTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#d9dccd';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const r = rand(8, 24);
    const x = rand(20, 108), y = rand(20, 108);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(110,120,125,0.34)');
    gr.addColorStop(1, 'rgba(110,120,125,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- geometry helpers
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function stoneGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = 1 + 0.16 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.7) + 0.1 * Math.sin(v.z * 5.3 + seed * 0.7) + 0.05 * hash3(Math.round(v.x * 4), Math.round(v.y * 4) + seed, Math.round(v.z * 4));
    p.setXYZ(i, v.x * n, v.y * n * 0.78, v.z * n);
  }
  g.computeVertexNormals();
  return g;
}

function logGeometry(len, r0, r1, rs, hs) {
  const g = new THREE.CylinderGeometry(r1, r0, len, rs, hs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const ang = Math.atan2(z, x);
    const k = 1 + 0.09 * Math.sin(y * 7.0 + ang * 3.0) + 0.06 * Math.sin(y * 17.0 + ang * 5.0 + 1.3) + 0.04 * Math.sin(ang * 7.0 + y * 3.0);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

function treeGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.13, 0.22, 1.7, 6);
  trunk.translate(0, 0.85, 0);
  parts.push(trunk);
  const tiers = 5;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const r = lerp(1.95, 0.55, t);
    const h = lerp(2.5, 1.5, t);
    const y = 1.1 + k * 1.12 + h * 0.5;
    const cone = new THREE.ConeGeometry(r, h, 10, 1);
    const pa = cone.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const yy = pa.getY(i);
      if (yy < -h / 2 + 1e-3) {
        const x = pa.getX(i), z = pa.getZ(i);
        const ang = Math.atan2(z, x);
        const m = 1 + 0.2 * Math.sin(ang * 5 + k * 1.7) + 0.1 * Math.sin(ang * 9 + k);
        pa.setX(i, x * m);
        pa.setZ(i, z * m);
        pa.setY(i, yy + 0.2 * Math.sin(ang * 7 + k * 2));
      }
    }
    cone.rotateY(rand(0, TAU));
    cone.translate(0, y, 0);
    parts.push(cone);
  }
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return g;
}

// ---------------------------------------------------------------- the game
export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const level = gfx.level;
  const SH = gfx.shadows > 0;

  const stage = createStage(root, {
    fov: FOV,
    near: 0.1,
    far: 400,
    gfx,
    exposure: 1.0,
    environment: false,
    shadows: true,
    bloom: { strength: 0.3, radius: 0.55, threshold: 1.15 },
    ao: true,
    aoRadius: 0.7,
  });
  const { scene, camera, renderer } = stage;
  if (SH) renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft maps to VSM, which point lights don't support
  const aniso = Math.min(gfx.anisotropy, renderer.capabilities.getMaxAnisotropy());

  // Exclude billboards, sprites, sky and decals from the GTAO normal/depth pass.
  if (stage.aoPass) {
    const orig = stage.aoPass._overrideVisibility.bind(stage.aoPass);
    stage.aoPass._overrideVisibility = function () {
      orig();
      this.scene.traverse((o) => {
        if ((o.userData.noAO || o.isSprite) && o.visible) {
          o.visible = false;
          this._visibilityCache.push(o);
        }
      });
    };
  }

  const disposables = [];
  const own = (x) => { disposables.push(x); return x; };

  // ---------- palette (clear <-> misty) ----------
  const PAL = {
    clear: { zen: new THREE.Color('#03060f'), hor: new THREE.Color('#15233c'), fog: new THREE.Color('#0a1322'), dens: 0.021, moon: 0.85, stars: 0.95, mist: 0 },
    misty: { zen: new THREE.Color('#0a111e'), hor: new THREE.Color('#2b3b52'), fog: new THREE.Color('#222f43'), dens: 0.05, moon: 0.28, stars: 0.22, mist: 1 },
  };
  let mistTarget = 0;
  let mist = 0;
  scene.fog = new THREE.FogExp2(PAL.clear.fog.clone(), PAL.clear.dens);

  // ---------- sky ----------
  const skyU = { uZen: { value: PAL.clear.zen.clone() }, uHor: { value: PAL.clear.hor.clone() }, uFog: { value: PAL.clear.fog.clone() } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 16),
    new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.userData.noAO = true;
  scene.add(sky);

  const nStars = Math.round(1100 * Math.min(1.6, gfx.detail));
  const sp = new Float32Array(nStars * 3);
  const sc = new Float32Array(nStars * 3);
  for (let i = 0; i < nStars; i++) {
    const a = rand(0, TAU);
    const y = Math.pow(rand(0.02, 1), 0.8);
    const r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(a) * r * 150;
    sp[i * 3 + 1] = y * 150;
    sp[i * 3 + 2] = Math.sin(a) * r * 150;
    const b = Math.pow(rand(0.25, 1), 1.6);
    const warm = Math.random();
    sc[i * 3] = b * (0.8 + warm * 0.2);
    sc[i * 3 + 1] = b * 0.88;
    sc[i * 3 + 2] = b * (1.0 - warm * 0.2);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.9, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
  stars.renderOrder = -9;
  stars.frustumCulled = false;
  scene.add(stars);

  const moonDir = new THREE.Vector3(-0.5, 0.3, -0.8).normalize();
  const moonTex = own(moonTexture());
  const moonGlowTex = own(glowTexture(256, 'rgba(255,244,214,1)', 'rgba(255,230,190,0.3)'));
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonGlowTex, color: 0xbfd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moonGlow.position.copy(moonDir).multiplyScalar(140);
  moonGlow.scale.setScalar(52);
  scene.add(moonGlow);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshBasicMaterial({ map: moonTex, color: 0xc8cfdc, toneMapped: false, fog: false, transparent: true }));
  moonDisc.position.copy(moonDir).multiplyScalar(140);
  moonDisc.lookAt(0, 0, 0);
  moonDisc.userData.noAO = true;
  scene.add(moonDisc);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x4a5c90, 0x1a120c, 0.7));
  const moonLight = new THREE.DirectionalLight(0x8aa2ec, 0.55);
  moonLight.position.copy(moonDir).multiplyScalar(30);
  scene.add(moonLight);

  const fireLight = new THREE.PointLight(0xff8a3c, 44, 0, 2);
  fireLight.position.set(0, 1.9, 0);
  if (SH) {
    const S = Math.min(gfx.shadows, 2048);
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.set(S, S);
    fireLight.shadow.camera.near = 0.2;
    fireLight.shadow.camera.far = 24;
    fireLight.shadow.bias = -0.0012;
    fireLight.shadow.normalBias = 0.03;
    fireLight.shadow.radius = 4;
  }
  scene.add(fireLight);
  const fillLight = new THREE.PointLight(0xff4a14, 5, 7, 2);
  fillLight.position.set(0, 0.35, 0);
  scene.add(fillLight);

  // ---------- ground ----------
  const groundTex = own(groundTexture(aniso));
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(90, 64),
    new THREE.MeshStandardMaterial({ map: groundTex, bumpMap: groundTex, bumpScale: 2.2, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const scorchTex = own(glowTexture(256, 'rgba(255,255,255,1)', 'rgba(255,255,255,0.7)'));
  const scorch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: scorchTex, color: 0x030201, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
  scorch.rotation.x = -Math.PI / 2;
  scorch.scale.setScalar(4.4);
  scorch.position.y = 0.006;
  scorch.userData.noAO = true;
  scene.add(scorch);

  // grass blades
  {
    const tuftParts = [];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.ConeGeometry(0.014, rand(0.2, 0.34), 3, 1, true);
      b.translate(0, 0.12, 0);
      b.rotateZ(rand(-0.5, 0.5));
      b.rotateY(rand(0, TAU));
      b.translate(rand(-0.04, 0.04), 0, rand(-0.04, 0.04));
      tuftParts.push(b);
    }
    const bladeGeo = mergeGeometries(tuftParts, false);
    for (const b of tuftParts) b.dispose();
    const n = Math.round(1100 * gfx.detail);
    const blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc2 = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const r = 1.75 + Math.pow(Math.random(), 0.7) * 16;
      e.set(rand(-0.35, 0.35), rand(0, TAU), rand(-0.35, 0.35));
      q.setFromEuler(e);
      const s = rand(0.8, 1.7);
      sc2.set(s, s * rand(0.8, 1.4), s);
      m.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), q, sc2);
      blades.setMatrixAt(i, m);
      col.setHSL(rand(0.22, 0.3), rand(0.25, 0.45), rand(0.05, 0.12));
      blades.setColorAt(i, col);
    }
    blades.instanceMatrix.needsUpdate = true;
    scene.add(blades);
  }

  // ---------- trees ----------
  {
    const geo = treeGeometry();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    const R = mulberry32(11);
    const n = Math.round(40 * gfx.detail);
    const trees = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU * 3.0 + R() * 0.5; // golden-ish spread so the forest never clumps
      const r = 13 + Math.pow(R(), 0.8) * 24;
      const s = (0.85 + R() * 0.8) * (r > 24 ? 1.25 : 1);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * TAU);
      m.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), q, new THREE.Vector3(s, s * (0.9 + R() * 0.35), s));
      trees.setMatrixAt(i, m);
      col.setHSL(0.38 + R() * 0.12, 0.25 + R() * 0.2, 0.06 + R() * 0.07);
      trees.setColorAt(i, col);
    }
    trees.instanceMatrix.needsUpdate = true;
    trees.frustumCulled = false;
    scene.add(trees);
  }

  // ---------- stones, logs, benches ----------
  const stoneTex = own(stoneTexture());
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a8, map: stoneTex, bumpMap: stoneTex, bumpScale: 2.5, roughness: 0.94, metalness: 0 });
  const stoneGeos = [0, 1, 2, 3].map((i) => stoneGeometry(i * 2.3 + 0.7));
  const nStones = 12;
  for (let i = 0; i < nStones; i++) {
    const a = (i / nStones) * TAU + rand(-0.08, 0.08);
    const r = 1.32 + rand(-0.06, 0.1);
    const m = new THREE.Mesh(stoneGeos[i % 4], stoneMat);
    const s = rand(0.2, 0.3);
    m.scale.set(s * rand(1.0, 1.4), s * rand(0.8, 1.05), s * rand(0.9, 1.25));
    m.position.set(Math.cos(a) * r, s * 0.34, Math.sin(a) * r);
    m.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.2, 0.2));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  const bark = barkTextures();
  own(bark.map);
  own(bark.emissive);
  const logMat = new THREE.MeshStandardMaterial({ map: bark.map, bumpMap: bark.map, bumpScale: 3, emissive: 0xffffff, emissiveMap: bark.emissive, emissiveIntensity: 0.6, roughness: 0.95, metalness: 0 });
  const logGeo = logGeometry(1.7, 0.1, 0.135, 12, 10);
  const mkLog = (scale = 1) => {
    const m = new THREE.Mesh(logGeo, logMat);
    m.scale.set(scale, 1, scale);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  // teepee of leaning logs + two base logs
  const up = new THREE.Vector3(0, 1, 0);
  const nLean = 5;
  const baseA = Math.PI / 2 - Math.PI / nLean + rand(-0.08, 0.08);
  for (let i = 0; i < nLean; i++) {
    const a = baseA + (i / nLean) * TAU + rand(-0.06, 0.06);
    const B = new THREE.Vector3(Math.cos(a) * 0.88, 0.14, Math.sin(a) * 0.88);
    const T = new THREE.Vector3(Math.cos(a + 0.4) * 0.09, 1.15 + rand(-0.05, 0.05), Math.sin(a + 0.4) * 0.09);
    const dir = T.clone().sub(B);
    const len = dir.length();
    dir.normalize();
    const m = mkLog(rand(0.92, 1.12));
    m.scale.y = (len + 0.18) / 1.7;
    m.position.copy(B).addScaledVector(dir, (len + 0.18) / 2 - 0.04);
    m.quaternion.setFromUnitVectors(up, dir);
    m.rotateY(rand(0, TAU));
    scene.add(m);
  }
  for (let i = 0; i < 2; i++) {
    const m = mkLog(1.05);
    m.scale.y = 0.82;
    m.rotation.z = Math.PI / 2;
    const g = new THREE.Group();
    g.add(m);
    g.rotation.y = baseA + i * 1.9 + 0.6;
    g.position.set(0, 0.15 + i * 0.01, 0);
    g.children[0].position.set(0, 0, 0.55 * (i ? -1 : 1));
    scene.add(g);
  }
  // sitting logs
  const benchMat = new THREE.MeshStandardMaterial({ map: bark.map, bumpMap: bark.map, bumpScale: 3, roughness: 0.95 });
  const benchGeo = logGeometry(2.5, 0.3, 0.32, 16, 8);
  for (const [bx, bz, ry] of [[3.5, 0.7, 1.35], [-3.2, -1.4, 0.4]]) {
    const m = new THREE.Mesh(benchGeo, benchMat);
    m.rotation.z = Math.PI / 2;
    const g = new THREE.Group();
    g.add(m);
    g.position.set(bx, 0.3, bz);
    g.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    scene.add(g);
  }

  // ember bed
  const bedU = { uTime: { value: 0 }, uGlow: { value: 1 } };
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.ShaderMaterial({ uniforms: bedU, vertexShader: FLAME_VS, fragmentShader: BED_FS, transparent: true, depthWrite: false, defines: { OCT: level >= 4 ? 5 : 4 }, fog: false, toneMapped: false })
  );
  bed.geometry.rotateX(-Math.PI / 2);
  bed.position.y = 0.075;
  bed.renderOrder = 1;
  bed.userData.noAO = true;
  scene.add(bed);

  // ---------- flames ----------
  const fshared = {
    uTime: { value: 0 }, uInt: { value: 1 }, uKick: { value: 0 }, uWind: { value: 0 }, uFlame: { value: 0.6 }, uFade: { value: 1 },
  };
  const nLayers = clamp(Math.round(3 + level * 1.1), 3, 8);
  const flameGeo = new THREE.PlaneGeometry(2.4, FLAME_H);
  flameGeo.translate(0, FLAME_H / 2, 0);
  const flames = [];
  for (let i = 0; i < nLayers; i++) {
    const u = nLayers === 1 ? 0.5 : i / (nLayers - 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...fshared,
        uSeed: { value: rand(0, 10) },
        uTone: { value: lerp(0.12, 0.95, u) },
        uWidth: { value: lerp(0.74, 0.4, u) * rand(0.92, 1.08) },
        uAlpha: { value: lerp(0.38, 0.6, u) * Math.min(1.1, Math.sqrt(3.4 / nLayers)) * (stage.composer ? 0.8 : 1) },
        uHMul: { value: lerp(0.78, 1.0, u) * rand(0.95, 1.05) },
      },
      vertexShader: FLAME_VS,
      fragmentShader: FLAME_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      defines: { OCT: level <= 0 ? 3 : level >= 4 ? 5 : 4 },
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(flameGeo, mat);
    mesh.position.set(rand(-0.1, 0.1) * (1 - u), 0.16, rand(-0.1, 0.1) * (1 - u));
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    mesh.userData.noAO = true;
    scene.add(mesh);
    flames.push({ mesh, yaw: rand(-0.5, 0.5), hMul: lerp(0.8, 1.0, u) * rand(0.95, 1.05), u });
  }

  const glowTex = own(glowTexture(256, 'rgba(255,170,80,1)', 'rgba(255,100,20,0.28)'));
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7a22, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  fireGlow.position.set(0, 1.0, 0);
  fireGlow.scale.setScalar(6);
  scene.add(fireGlow);

  // ---------- embers, sparks, smoke ----------
  const pm = gfx.particles;
  const embers = new Sparkles(Math.round(150 * pm), { size: 0.07, gravity: 0.35, drag: 0.28 });
  const sparks = new Sparkles(Math.round(120 * pm), { size: 0.06, gravity: -5.2, drag: 0.55 });
  embers.points.renderOrder = 4;
  sparks.points.renderOrder = 4;
  embers.points.userData.noAO = sparks.points.userData.noAO = true;
  scene.add(embers.points, sparks.points);
  const emberCols = [new THREE.Color(3.4, 1.15, 0.22), new THREE.Color(4.2, 2.3, 0.7), new THREE.Color(2.4, 0.65, 0.12), new THREE.Color(1.8, 0.4, 0.08)];

  const smokeTex = own(smokeTexture());
  const smokeN = Math.round(10 + 14 * pm);
  const smoke = [];
  for (let i = 0; i < smokeN; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x222222, transparent: true, opacity: 0, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    smoke.push({ s, age: 1, life: 1, vx: 0, vy: 0, vz: 0, size: 1, rot: 0, spin: 0 });
  }

  // mist banks (visible on misty nights)
  const mistTex = own(glowTexture(128, 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)'));
  const mists = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x5d7190, transparent: true, opacity: 0, depthWrite: false }));
    const a = rand(0, TAU);
    const r = rand(6, 22);
    m.position.set(Math.cos(a) * r, rand(0.5, 1.8), Math.sin(a) * r);
    m.scale.set(rand(10, 20), rand(3, 5), 1);
    scene.add(m);
    mists.push({ m, sp: rand(0.03, 0.09), ph: rand(0, 6), base: rand(0.5, 1) });
  }

  // ---------- poking stick ----------
  const stickGeo = new THREE.CylinderGeometry(0.045, 0.02, 1.8, 8);
  stickGeo.translate(0, 0.9, 0);
  const stickMat = new THREE.MeshStandardMaterial({ map: bark.map, roughness: 0.9, emissive: 0xff5a10, emissiveIntensity: 0 });
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.visible = false;
  stick.castShadow = true;
  const stickTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  stick.add(stickTip);
  scene.add(stick);

  // fire pick volume
  const fireVol = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 2.6, 10), new THREE.MeshBasicMaterial());
  fireVol.position.y = 1.3;
  fireVol.visible = false;
  scene.add(fireVol);

  // ---------- state ----------
  let I = 0.85;           // fire intensity 0..1.5
  let kick = 0;           // short flame kick
  let flare = 0;          // random flare-ups
  let whoomph = 0;        // slow breathing swell events
  let nextWhoomph = 4;
  let gust = 0;
  let windDir = 1;
  let statLabel = '';
  const windV = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const flyingLogs = [];
  const extraLogs = [];

  // ---------- camera ----------
  const cam = { dist: 6.4, h: 2.0, ty: 1.9, yaw: 0, ex: 0, ey: 0 };
  function layout() {
    const aspect = stage.width / Math.max(1, stage.height);
    cam.dist = clamp(1.95 / (Math.tan((FOV * Math.PI) / 360) * aspect), 5.3, 11.5);
    const portrait = clamp((1 - aspect) * 1.6, 0, 1);
    cam.h = 1.75 + (cam.dist - 5.3) * 0.12;
    cam.ty = 1.75 + portrait * 0.9;
  }
  stage.onResize = layout;
  layout();
  const ptr = { x: 0, y: 0 };
  let firePan = 0;

  // ---------- audio ----------
  const SND = {};
  let pad = null;
  const padLevel = 0.032;
  if (audio.ready) {
    SND.body = audio.loop(bus, { kind: 'brown', filter: 'lowpass', freq: 300, q: 0.7, gain: 0, send: 0.1 });
    SND.flutter = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 700, q: 0.7, gain: 0, send: 0.12 });
    SND.hiss = audio.loop(bus, { kind: 'white', filter: 'bandpass', freq: 5200, q: 0.55, gain: 0, send: 0.1 });
    SND.wind = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 420, q: 0.6, gain: 0.006, send: 0.5 });
    pad = new Pad(audio, bus, {
      chords: [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 850,
      period: 20,
      wave: 'triangle',
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  const recent = [];
  const budgetOK = (gainHint = 1) => {
    const now = performance.now();
    while (recent.length && now - recent[0] > 1000) recent.shift();
    if (recent.length > 44 && gainHint < 1) return false;
    recent.push(now);
    return true;
  };
  const rpan = (spread = 0.55) => clamp(firePan + rand(-spread, spread), -1, 1);

  function pop(g, pan = rpan(), delay = 0) {
    const f = Math.exp(rand(Math.log(800), Math.log(5200)));
    audio.burst(bus, { kind: 'white', dur: rand(0.008, 0.045), attack: 0.0006, gain: g, type: 'bandpass', freq: f, freqEnd: f * rand(0.55, 0.9), q: rand(1.2, 4.5), pan, send: 0.14, delay });
  }
  function tickCluster(g, pan = rpan(), delay = 0) {
    const n = 2 + Math.floor(Math.random() * 4);
    let d = delay;
    for (let i = 0; i < n; i++) {
      audio.burst(bus, { kind: 'white', dur: rand(0.004, 0.011), attack: 0.0003, gain: g * rand(0.4, 1), type: 'bandpass', freq: rand(2500, 7200), q: rand(3, 8), pan: pan + rand(-0.08, 0.08), send: 0.12, delay: d });
      d += -Math.log(1 - Math.random()) * 0.03 + 0.008;
    }
  }
  function snap(g, pan = rpan(), delay = 0) {
    audio.burst(bus, { kind: 'white', dur: 0.007, attack: 0.0003, gain: 0.34 * g, type: 'highpass', freq: 1800, pan, send: 0.12, delay });
    audio.burst(bus, { kind: 'pink', dur: 0.055, attack: 0.0005, gain: 0.55 * g, type: 'bandpass', freq: rand(900, 1700), q: 1.1, pan, send: 0.2, delay });
    audio.tone(bus, { freq: rand(110, 170), freqEnd: 48, dur: 0.1, gain: 0.42 * g, pan, send: 0.1, delay });
    audio.tone(bus, { freq: rand(1600, 2700), freqEnd: 380, dur: 0.035, gain: 0.075 * g, pan, send: 0.22, delay });
  }
  function roll(g, pan = rpan(), delay = 0) {
    const n = 4 + Math.floor(Math.random() * 5);
    let d = delay;
    for (let i = 0; i < n; i++) {
      pop(g * rand(0.4, 1), pan + rand(-0.15, 0.15), d);
      d += rand(0.008, 0.03);
    }
  }
  function spit(g, pan = rpan()) {
    audio.burst(bus, { kind: 'white', dur: rand(0.12, 0.22), attack: 0.012, gain: g, type: 'bandpass', freq: rand(5200, 7500), q: 1.4, pan, send: 0.15 });
  }
  function randomCrackle() {
    if (!audio.ready) return;
    const Ic = clamp(I, 0, 1.2);
    const lv = 0.5 + 0.5 * Ic;
    if (!budgetOK(rand(0, 1))) return;
    const r = Math.random();
    const snapP = 0.035 + 0.05 * Ic;
    if (r < snapP) snap(rand(0.5, 1) * lv);
    else if (r < snapP + 0.09) roll(rand(0.05, 0.1) * lv);
    else if (r < snapP + 0.09 + 0.26) tickCluster(rand(0.035, 0.085) * lv);
    else if (r < snapP + 0.09 + 0.26 + 0.03) spit(0.035 * lv);
    else pop(rand(0.05, 0.16) * lv);
  }
  function crackleCluster(n, span, g = 1) {
    if (!audio.ready) return;
    for (let i = 0; i < n; i++) {
      const d = Math.pow(Math.random(), 1.4) * span;
      const r = Math.random();
      if (r < 0.14) snap(rand(0.45, 0.85) * g, rpan(0.7), d);
      else if (r < 0.34) tickCluster(rand(0.05, 0.1) * g, rpan(0.7), d);
      else pop(rand(0.08, 0.2) * g, rpan(0.7), d);
    }
  }
  function whoomphSound(amt = 1) {
    if (!audio.ready) return;
    audio.burst(bus, { kind: 'brown', dur: 1.1, attack: 0.28, gain: 0.34 * amt, type: 'lowpass', freq: 240, freqEnd: 640, q: 0.7, curve: 'lin', pan: firePan * 0.8, send: 0.2 });
    audio.burst(bus, { kind: 'pink', dur: 0.8, attack: 0.2, gain: 0.07 * amt, type: 'bandpass', freq: 900, freqEnd: 1700, q: 0.8, curve: 'lin', pan: firePan, send: 0.15 });
  }

  // ---------- fire events ----------
  const sparkPos = new THREE.Vector3();
  function emitSparks(x, y, z, n, speed, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const lat = rand(0.2, 1) * speed * spread;
      sparks.spawn(x + rand(-0.12, 0.12), y + rand(-0.05, 0.2), z + rand(-0.12, 0.12), Math.cos(a) * lat, rand(0.6, 1.5) * speed * 1.4, Math.sin(a) * lat, pick(emberCols), rand(0.45, 1.0), rand(0.5, 1.4));
    }
  }
  function emitEmbers(n, scatter = 0) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(Math.random()) * 0.35;
      embers.spawn(Math.cos(a) * r, rand(0.5, 1.9), Math.sin(a) * r, rand(-0.25, 0.25) + windV.x * scatter, rand(0.6, 1.7), rand(-0.25, 0.25) + windV.z * scatter, pick(emberCols), rand(0.5, 1.1), rand(1.8, 4.6));
    }
  }
  let lastPoke = 0;
  function poke(strength = 1) {
    const now = performance.now();
    if (now - lastPoke < 110) return;
    lastPoke = now;
    kick = Math.min(1.5, kick + 0.95 * strength);
    I = Math.min(1.5, I + 0.1 * strength * (I > 1.1 ? 0.4 : 1));
    emitSparks(0, 0.5, 0, Math.round(34 * Math.min(2, pm) * strength), 2.1 * strength);
    emitEmbers(Math.round(10 * pm), 0);
    if (audio.ready) {
      snap(0.95, firePan);
      crackleCluster(11, 0.38, 1);
      audio.burst(bus, { kind: 'pink', dur: 0.32, attack: 0.01, gain: 0.16, type: 'lowpass', freq: 900, freqEnd: 260, q: 0.8, pan: firePan, send: 0.15 });
      audio.haptic?.(12);
    }
  }

  const logRest = [];
  function feed() {
    audio.unlock?.();
    if (flyingLogs.length >= 2) return;
    const m = mkLog(rand(0.95, 1.2));
    m.scale.y = rand(0.62, 0.78);
    camera.getWorldDirection(tmp);
    camRight.crossVectors(tmp, up).normalize();
    const from = camera.position.clone().lerp(new THREE.Vector3(0, 1, 0), 0.72).addScaledVector(camRight, -1.3);
    from.y = 1.1;
    const to = new THREE.Vector3(rand(-0.22, 0.22), 0.5, rand(-0.22, 0.22));
    const restRot = new THREE.Euler(rand(-0.3, 0.3), rand(0, TAU), Math.PI / 2 + rand(-0.4, 0.4));
    m.position.copy(from);
    scene.add(m);
    flyingLogs.push({ m, from, to, t: 0, T: 0.78, axis: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), spin: rand(5, 8), restQ: new THREE.Quaternion().setFromEuler(restRot) });
    if (audio.ready) {
      audio.burst(bus, { kind: 'pink', dur: 0.6, attack: 0.15, gain: 0.1, type: 'bandpass', freq: 500, freqEnd: 1500, q: 1.1, curve: 'lin', pan: -0.5 + firePan * 0.5, send: 0.2 });
    }
    audio.haptic?.(8);
  }
  function landLog(f) {
    I = Math.min(1.5, I + 0.52);
    kick = Math.min(1.7, kick + 1.4);
    flare = Math.min(1.2, flare + 0.8);
    emitSparks(f.to.x, 0.6, f.to.z, Math.round(70 * Math.min(2.2, pm)), 3.0, 1.3);
    emitEmbers(Math.round(22 * pm), 0);
    if (audio.ready) {
      audio.tone(bus, { freq: 96, freqEnd: 38, dur: 0.26, gain: 0.46, pan: firePan, send: 0.12 });
      audio.burst(bus, { kind: 'brown', dur: 0.4, attack: 0.002, gain: 0.5, type: 'lowpass', freq: 520, freqEnd: 140, q: 0.8, pan: firePan, send: 0.14 });
      audio.burst(bus, { kind: 'pink', dur: 0.05, attack: 0.001, gain: 0.22, type: 'bandpass', freq: 1100, q: 1.4, pan: firePan, send: 0.2 });
      snap(1, firePan, 0.02);
      crackleCluster(16, 0.6, 1.1);
      whoomphSound(1.1);
      audio.haptic?.(16);
    }
    extraLogs.push({ m: f.m, age: 0, dying: false, base: f.m.scale.clone(), y0: f.to.y });
    if (extraLogs.filter((e) => !e.dying).length > 2) {
      const old = extraLogs.find((e) => !e.dying);
      if (old) old.dying = true;
    }
  }

  function doGust(strength = 1) {
    audio.unlock?.();
    gust = Math.min(1.6, gust + strength);
    windDir = Math.random() < 0.5 ? -1 : 1;
    I = Math.min(1.5, I + 0.05);
    flare = Math.min(1.2, flare + 0.4);
    emitEmbers(Math.round(40 * pm), 0);
    emitSparks(0, 0.9, 0, Math.round(26 * pm), 1.6);
    if (audio.ready) {
      audio.burst(bus, { kind: 'pink', dur: 2.6, attack: 0.9, gain: 0.3 * strength, type: 'bandpass', freq: 220, freqEnd: 950, q: 0.8, curve: 'lin', pan: -windDir * 0.4, send: 0.45 });
      audio.burst(bus, { kind: 'white', dur: 2.2, attack: 0.9, gain: 0.04 * strength, type: 'highpass', freq: 2800, curve: 'lin', pan: windDir * 0.3, send: 0.35 });
      whoomphSound(0.7);
    }
  }

  // ---------- input ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.32);
  const stk = { on: false, id: -1, tgt: new THREE.Vector3(1.8, 0.32, 1.8), pos: new THREE.Vector3(1.8, 0.32, 1.8), vis: 0, speed: 0, heat: 0, has: false, lastScritch: 0 };
  function setRay(p) {
    ndc.set((p.x / stage.width) * 2 - 1, -(p.y / stage.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  function aimStick(p) {
    setRay(p);
    if (raycaster.ray.intersectPlane(plane, tmp)) {
      const r = Math.hypot(tmp.x, tmp.z);
      if (r > 5.5) { tmp.x *= 5.5 / r; tmp.z *= 5.5 / r; }
      stk.tgt.copy(tmp);
      if (!stk.has) { stk.pos.copy(tmp); stk.has = true; }
    }
  }
  function hitsFire(p) {
    setRay(p);
    camera.updateMatrixWorld();
    fireVol.updateMatrixWorld();
    if (raycaster.intersectObject(fireVol, false).length) return true;
    if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tmp2)) return Math.hypot(tmp2.x, tmp2.z) < 1.5;
    return false;
  }
  const updPtr = (p) => {
    ptr.x = (p.x / stage.width - 0.5) * 2;
    ptr.y = (p.y / stage.height - 0.5) * 2;
  };
  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      updPtr(p);
      stk.on = true;
      stk.id = p.id;
      aimStick(p);
      if (hitsFire(p)) poke(1);
    },
    move(p) {
      updPtr(p);
      if (stk.on && stk.id === p.id) aimStick(p);
    },
    up(p) {
      if (stk.id === p.id) stk.on = false;
      if (p.type !== 'mouse') { ptr.x = 0; ptr.y = 0; }
    },
    leave() { ptr.x = 0; ptr.y = 0; },
  });

  // ---------- HUD ----------
  hud.segmented({
    label: 'Night',
    options: [{ id: 'clear', label: 'Clear' }, { id: 'misty', label: 'Misty' }],
    value: 'clear',
    onChange: (id) => { mistTarget = id === 'misty' ? 1 : 0; },
  });
  hud.button({ label: 'Feed', title: 'Throw a log on the fire', onClick: feed });
  hud.button({ label: 'Gust', title: 'A gust of wind', onClick: () => doGust(1) });
  hud.setHint('Tap the fire to poke it. Drag a stick through the embers. Feed it logs to keep it roaring.');

  // ---------- ambience ----------
  function cricket() {
    if (!audio.ready) return;
    const pan = rand(-0.9, 0.9);
    const base = rand(4200, 5000);
    const chirps = Math.random() < 0.5 ? 3 : 4;
    const g = 0.011 * (1 - 0.5 * mist);
    for (let c = 0; c < chirps; c++) {
      audio.tone(bus, { freq: base, freqEnd: base * 1.03, dur: 0.028, attack: 0.004, gain: g, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
      audio.tone(bus, { freq: base * 0.5, dur: 0.028, attack: 0.004, gain: g * 0.55, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
    }
  }
  function owl() {
    if (!audio.ready) return;
    const pan = rand(-0.8, 0.8);
    const f = rand(300, 360);
    for (const [d, len, fr] of [[0, 0.32, 1], [0.5, 0.3, 0.97], [1.15, 0.7, 0.88]]) {
      audio.tone(bus, { freq: f * fr * 1.06, freqEnd: f * fr * 0.95, dur: len, attack: 0.07, gain: 0.03, pan, send: 0.75, delay: d });
      audio.tone(bus, { freq: f * fr * 2.01, dur: len * 0.7, attack: 0.08, gain: 0.007, pan, send: 0.75, delay: d });
    }
  }
  let cricketClock = rand(1, 3);
  let owlClock = rand(18, 40);

  // ---------- frame ----------
  const fnoise = (t, k) => clamp(0.5 + (0.5 * (Math.sin(t * 7.3 + k) * 0.45 + Math.sin(t * 12.9 + k * 2.1) * 0.3 + Math.sin(t * 21.7 + k * 3.7) * 0.2 + Math.sin(t * 3.1 + k * 1.3) * 0.35)) / 1.0, 0, 1);
  const camPos = new THREE.Vector3();
  const quatTmp = new THREE.Quaternion();
  const sway = { x: 0, y: 0 };
  let crackClock = 0.2;
  let audioClock = 0;
  let nextSmoke = 0;
  let emberAcc = 0;
  let flutterV = 0.5;
  let hissV = 0.5;
  let stirAcc = 0;
  const camSnap = new THREE.Vector3();

  const loop = createLoop((dt, time) => {
    // ----- intensity -----
    const decay = 0.004 + 0.012 * Math.min(I, 1.5);
    I = Math.max(0, I - decay * dt);
    kick *= Math.exp(-dt / 0.55);
    flare *= Math.exp(-dt / 0.35);
    whoomph *= Math.exp(-dt / 0.7);
    gust *= Math.exp(-dt / 1.7);
    if (Math.random() < dt * (0.25 + 1.2 * Math.min(I, 1.2))) flare = Math.min(1, flare + rand(0.15, 0.55));
    if (time > nextWhoomph) {
      nextWhoomph = time + rand(3.5, 9) / (0.4 + Math.min(I, 1.2));
      if (I > 0.22) {
        whoomph = rand(0.6, 1);
        kick = Math.min(1.5, kick + 0.35 * whoomph);
        whoomphSound(0.55 * whoomph * Math.min(1, I));
      }
    }
    mist = damp(mist, mistTarget, 0.9, dt);
    const Ic = Math.min(I, 1.5);
    const lab = Ic >= 1.1 ? 'Roaring' : Ic >= 0.7 ? 'Bright' : Ic >= 0.35 ? 'Steady' : Ic >= 0.12 ? 'Low' : 'Embers';
    if (lab !== statLabel) { statLabel = lab; hud.setStat?.(`Fire: ${lab}`); }

    // wind
    const ambientWind = 0.08 * Math.sin(time * 0.31) + 0.05 * Math.sin(time * 0.77);
    windV.set(windDir * gust * 1.0 + ambientWind, 0, 0.35 * gust * windDir * Math.sin(time * 1.3));
    camera.getWorldDirection(tmp);
    camRight.crossVectors(tmp, up).normalize();
    fshared.uWind.value = (windV.x * camRight.x + windV.z * camRight.z) * 0.85;

    // ----- stick -----
    stk.vis = damp(stk.vis, stk.on ? 1 : 0, stk.on ? 18 : 8, dt);
    const prev = tmp2.copy(stk.pos);
    stk.pos.x = damp(stk.pos.x, stk.tgt.x, 24, dt);
    stk.pos.y = damp(stk.pos.y, stk.tgt.y, 24, dt);
    stk.pos.z = damp(stk.pos.z, stk.tgt.z, 24, dt);
    const mv = Math.hypot(stk.pos.x - prev.x, stk.pos.z - prev.z) / Math.max(dt, 1e-3);
    stk.speed = lerp(stk.speed, mv, 1 - Math.exp(-14 * dt));
    const inEmbers = stk.on && Math.hypot(stk.pos.x, stk.pos.z) < 1.2;
    stk.heat = damp(stk.heat, inEmbers ? 1 : 0, inEmbers ? 1.4 : 0.7, dt);
    if (stk.vis > 0.01) {
      stick.visible = true;
      camSnap.copy(camera.position).sub(stk.pos);
      camSnap.y = 0;
      camSnap.normalize().multiplyScalar(0.72);
      camSnap.y = 0.8;
      camSnap.normalize();
      quatTmp.setFromUnitVectors(up, camSnap);
      stick.quaternion.copy(quatTmp);
      stick.position.copy(stk.pos);
      stick.scale.setScalar(stk.vis);
      stickMat.emissiveIntensity = stk.heat * 1.4;
      stickTip.material.opacity = stk.heat * 0.9;
    } else {
      stick.visible = false;
    }
    if (inEmbers && stk.speed > 0.35) {
      stirAcc += stk.speed * dt * 11;
      let n = Math.floor(stirAcc);
      stirAcc -= n;
      n = Math.min(n, 5);
      for (let i = 0; i < n; i++) {
        sparks.spawn(stk.pos.x + rand(-0.1, 0.1), 0.3, stk.pos.z + rand(-0.1, 0.1), rand(-0.7, 0.7) + (stk.pos.x - prev.x) * 3, rand(1.0, 2.8) + stk.speed * 0.15, rand(-0.7, 0.7) + (stk.pos.z - prev.z) * 3, pick(emberCols), rand(0.45, 0.95), rand(0.5, 1.2));
      }
      kick = Math.min(0.7, kick + stk.speed * dt * 0.1);
      I = Math.min(Math.max(I, 1.0), I + stk.speed * dt * 0.012);
      if (audio.ready && time - stk.lastScritch > 0.1 && stk.speed > 0.8) {
        stk.lastScritch = time;
        audio.burst(bus, { kind: 'pink', dur: 0.07, attack: 0.008, gain: 0.03 * clamp(stk.speed / 4, 0.3, 1), type: 'bandpass', freq: rand(1200, 3000), q: 1.2, pan: rpan(0.2), send: 0.12 });
        if (Math.random() < 0.5) tickCluster(rand(0.04, 0.09));
      }
    }

    // ----- flying and resting logs -----
    for (let i = flyingLogs.length - 1; i >= 0; i--) {
      const f = flyingLogs[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.T);
      f.m.position.lerpVectors(f.from, f.to, u);
      f.m.position.y += 3.2 * u * (1 - u) * 1.3;
      quatTmp.setFromAxisAngle(f.axis, f.spin * dt);
      f.m.quaternion.premultiply(quatTmp);
      if (u > 0.78) f.m.quaternion.slerp(f.restQ, 0.25);
      if (u >= 1) {
        f.m.quaternion.copy(f.restQ);
        landLog(f);
        flyingLogs.splice(i, 1);
      }
    }
    for (let i = extraLogs.length - 1; i >= 0; i--) {
      const e = extraLogs[i];
      e.age += dt;
      const settle = 0.14 * Math.exp(-e.age * 7) * Math.cos(e.age * 22);
      e.m.position.y = e.y0 - Math.min(0.12, e.age * 0.02) + settle;
      if (e.dying) {
        e.dyingT = (e.dyingT || 0) + dt;
        const k = Math.max(0, 1 - e.dyingT / 1.6);
        e.m.scale.set(e.base.x * k, e.base.y * k, e.base.z * k);
        if (Math.random() < dt * 20) emitSparks(e.m.position.x, 0.4, e.m.position.z, 2, 1.0);
        if (k <= 0) {
          scene.remove(e.m);
          extraLogs.splice(i, 1);
        }
      }
    }

    // ----- flicker, light and flame uniforms -----
    const n1 = fnoise(time, 0.3);
    const n2 = fnoise(time * 1.7, 4.1);
    const flick = 0.74 + 0.3 * n1 + 0.14 * n2 + 0.38 * flare + 0.4 * kick;
    const flameOn = smoothstep(0.03, 0.15, I);
    const IcL = clamp(Ic, 0, 1.3);
    fshared.uTime.value = time;
    fshared.uInt.value = IcL;
    fshared.uKick.value = kick + flare * 0.6;
    fshared.uFade.value = flameOn;
    const baseFlame = (0.13 + 0.55 * Math.pow(IcL, 0.8)) * (1 + 0.08 * (n1 - 0.5) + 0.2 * flare + 0.26 * kick);
    fshared.uFlame.value = Math.min(1.0, baseFlame);
    const widthK = 0.45 + 0.55 * Math.pow(clamp(IcL, 0, 1.2), 0.6);
    for (const f of flames) {
      const dx = camera.position.x - f.mesh.position.x;
      const dz = camera.position.z - f.mesh.position.z;
      f.mesh.rotation.y = Math.atan2(dx, dz) + f.yaw;
      f.mesh.scale.set(widthK * (0.93 + 0.1 * Math.sin(time * 2.1 + f.u * 9)), 1, 1);
    }
    bedU.uTime.value = time;
    bedU.uGlow.value = (0.5 + 0.55 * Math.min(IcL, 1)) * (0.85 + 0.2 * n2);
    logMat.emissiveIntensity = (0.3 + 1.7 * Math.min(IcL, 1.2)) * (0.8 + 0.3 * n1 + 0.4 * kick);
    const lightK = 0.1 + 0.9 * clamp(Ic, 0, 1.3);
    fireLight.intensity = 46 * lightK * flick;
    fireLight.position.set((n1 - 0.5) * 0.18 + windV.x * 0.1, 1.9 + (n2 - 0.5) * 0.2 + 0.1 * kick, (n2 - 0.5) * 0.14);
    fillLight.intensity = 6.5 * (0.35 + 0.65 * clamp(Ic, 0, 1.2)) * (0.85 + 0.3 * n2);
    fireGlow.material.opacity = (0.06 + 0.4 * flameOn * Math.min(IcL, 1.1)) * (0.8 + 0.3 * n1 + 0.3 * kick);
    fireGlow.scale.setScalar(4.5 + 3 * Math.min(IcL, 1.2) + kick);
    fireGlow.position.y = 0.6 + 0.9 * Math.min(IcL, 1);
    scorch.material.opacity = 0.9;

    // ----- embers / sparks / smoke -----
    emberAcc += dt * (4 + 36 * Math.min(IcL, 1.3) * flameOn + 3 * kick * 10);
    let ne = Math.floor(emberAcc);
    emberAcc -= ne;
    ne = Math.min(ne, 6);
    if (ne) emitEmbers(ne, 0);
    // idle coals still release the occasional spark
    if (I < 0.15 && Math.random() < dt * 2) emitSparks(rand(-0.3, 0.3), 0.3, rand(-0.3, 0.3), 1, 0.5, 0.5);
    for (const pool of [embers, sparks]) {
      const v = pool.vel;
      const a = pool.age;
      for (let i = 0; i < pool.count; i++) {
        if (a[i] >= 1) continue;
        const k = i * 3;
        v[k] += (windV.x * 3.2 + Math.sin(time * 2.7 + i * 1.7) * 0.5) * dt;
        v[k + 2] += (windV.z * 3.2 + Math.cos(time * 2.3 + i * 2.3) * 0.5) * dt;
        if (pool === sparks && pool.pos[k + 1] < 0.04 && v[k + 1] < 0) a[i] = 1;
      }
    }
    embers.update(dt, stage.height, FOV);
    sparks.update(dt, stage.height, FOV);

    nextSmoke -= dt;
    if (nextSmoke <= 0) {
      nextSmoke = rand(0.25, 0.7) / (0.35 + Math.min(IcL, 1.2));
      const p = smoke.find((s) => s.age >= 1);
      if (p) {
        p.age = 0;
        p.life = rand(4, 7);
        p.size = rand(0.7, 1.2);
        p.vx = rand(-0.12, 0.12);
        p.vy = rand(0.4, 0.75);
        p.vz = rand(-0.12, 0.12);
        p.rot = rand(0, TAU);
        p.spin = rand(-0.2, 0.2);
        p.s.position.set(rand(-0.3, 0.3), 1.7 + 0.8 * Math.min(IcL, 1) + rand(-0.1, 0.2), rand(-0.3, 0.3));
        p.s.visible = true;
      }
    }
    for (const p of smoke) {
      if (p.age >= 1) continue;
      p.age += dt / p.life;
      if (p.age >= 1) { p.s.visible = false; p.age = 1; continue; }
      const u = p.age;
      p.s.position.x += (p.vx + windV.x * 0.9 + 0.1 * Math.sin(time * 0.6 + p.rot)) * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += (p.vz + windV.z * 0.9) * dt;
      p.vy *= Math.exp(-0.15 * dt);
      const sz = (0.9 + 4.6 * Math.pow(u, 0.7)) * p.size;
      p.s.scale.set(sz, sz, 1);
      p.s.material.rotation = p.rot + p.spin * u * p.life;
      p.s.material.opacity = 0.09 * Math.sin(Math.PI * Math.pow(u, 0.6)) * (0.35 + 0.65 * Math.min(IcL, 1));
      const warm = Math.max(0, 1 - u * 2.4) * 0.5;
      p.s.material.color.setRGB(0.07 + warm * 0.9, 0.08 + warm * 0.38, 0.1 + warm * 0.1);
    }

    // ----- environment (misty crossfade) -----
    const A = PAL.clear, B = PAL.misty;
    skyU.uZen.value.copy(A.zen).lerp(B.zen, mist);
    skyU.uHor.value.copy(A.hor).lerp(B.hor, mist);
    skyU.uFog.value.copy(A.fog).lerp(B.fog, mist);
    scene.fog.color.copy(skyU.uFog.value);
    scene.fog.density = lerp(A.dens, B.dens, mist);
    stars.material.opacity = lerp(A.stars, B.stars, mist) * (0.92 + 0.08 * Math.sin(time * 1.3));
    moonGlow.material.opacity = lerp(0.6, 0.38, mist);
    moonGlow.scale.setScalar(lerp(52, 78, mist));
    moonDisc.material.opacity = lerp(1, 0.4, mist);
    moonLight.intensity = lerp(0.55, 0.35, mist);
    for (const m of mists) {
      m.m.material.opacity = 0.2 * mist * m.base;
      m.m.position.x += Math.sin(time * m.sp + m.ph) * dt * 0.3;
    }
    stars.rotation.y = time * 0.0015;

    // ----- camera -----
    sway.x = damp(sway.x, ptr.x, 1.8, dt);
    sway.y = damp(sway.y, ptr.y, 1.8, dt);
    const yaw = clamp(sway.x * 0.34, -0.38, 0.38) + 0.12 * Math.sin(time * 0.11) + 0.05 * Math.sin(time * 0.27);
    const dist = cam.dist * (1 + 0.014 * Math.sin(time * 0.33));
    const camY = cam.h + clamp(sway.y, -1, 1) * -0.35 + 0.06 * Math.sin(time * 0.21);
    camera.position.set(Math.sin(yaw) * dist, camY, Math.cos(yaw) * dist);
    camera.lookAt(0, cam.ty - clamp(sway.y, -1, 1) * 0.12, 0);
    camera.updateMatrixWorld();
    camPos.set(0, 1.0, 0).project(camera);
    firePan = damp(firePan, clamp(camPos.x * 0.55, -0.8, 0.8), 6, dt);

    // ----- audio -----
    if (audio.ready) {
      audioClock += dt;
      if (audioClock >= 0.04) {
        const adt = audioClock;
        audioClock = 0;
        const swell = 0.5 + 0.5 * (Math.sin(time * 0.37) * 0.5 + Math.sin(time * 0.91 + 2) * 0.35 + Math.sin(time * 0.13) * 0.3);
        flutterV = lerp(flutterV, Math.random(), 0.35);
        hissV = lerp(hissV, Math.random(), 0.25);
        const Is = Math.min(IcL, 1.3);
        SND.body.set({
          gain: (0.05 + 0.3 * Math.pow(Is, 0.9)) * (0.82 + 0.3 * swell) * (1 + 0.8 * whoomph + 0.4 * Math.min(kick, 1)),
          freq: 190 + 330 * Is + 450 * whoomph + 200 * Math.min(kick, 1),
          pan: firePan * 0.6,
        }, 0.12);
        SND.flutter.set({
          gain: (0.008 + 0.075 * Is) * (0.45 + 1.1 * flutterV) * (1 + 0.5 * flare),
          freq: 480 + 700 * Is * (0.6 + 0.8 * flutterV),
          pan: firePan * 0.7,
        }, 0.07);
        SND.hiss.set({
          gain: 0.003 + 0.04 * Math.pow(Is, 1.3) * (0.55 + 0.9 * hissV) + 0.03 * Math.min(kick, 1) + 0.03 * gust,
          freq: 4200 + 2600 * hissV,
          pan: firePan * 0.5,
        }, 0.08);
        SND.wind.set({
          gain: 0.007 + 0.006 * mist + 0.07 * gust + 0.004 * Math.sin(time * 0.4),
          freq: 380 + 160 * Math.sin(time * 0.23) + 600 * gust,
        }, 0.3);
        // Poisson crackles: rate scales with intensity; stirring adds more
        const rate = 0.9 + 11 * Math.pow(Is, 1.1) + (inEmbers ? Math.min(25, stk.speed * 5) : 0) + 6 * Math.min(kick, 1);
        crackClock -= adt;
        let guard = 0;
        while (crackClock <= 0 && guard++ < 5) {
          randomCrackle();
          crackClock += -Math.log(1 - Math.random()) / rate;
        }
      }
      cricketClock -= dt;
      if (cricketClock <= 0) { cricket(); cricketClock = rand(1.2, 4.2) * (1 + mist); }
      owlClock -= dt;
      if (owlClock <= 0) { owl(); owlClock = rand(25, 55); }
    }

    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      window.removeEventListener('hush:ambience', onAmb);
      for (const k of Object.keys(SND)) SND[k]?.stop(0.15);
      pad?.stop(0.6);
      for (const d of disposables) d.dispose?.();
      logGeo.dispose();
      benchGeo.dispose();
      flameGeo.dispose();
      stickGeo.dispose();
      for (const g of stoneGeos) g.dispose();
      stage.dispose();
    },
  };
}
