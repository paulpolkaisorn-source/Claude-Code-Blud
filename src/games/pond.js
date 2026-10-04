// Moonlit Pond — 3D (Three.js). A real 2D wave-equation height field drives a
// custom water shader (moon reflection, glitter, refracted pebbles + caustics),
// lily pads that bob on the ripples, koi under the surface, fireflies, and a
// pentatonic droplet soundscape with crickets.

import { THREE, createStage, gradientTexture, Sparkles } from '../three-base.js';
import { createLoop, track, rand, clamp, lerp, pick, midiToFreq, pentatonic } from '../util.js';
import { Pad } from '../audio.js';

const SIZE = 14; // pond plane size in world units

const WATER_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position,1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WATER_FS = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vWorld;
uniform sampler2D uH; uniform float uTexel; uniform float uTime; uniform vec3 uFog; uniform vec3 uMoon;
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec3 sky(vec3 d){
  float t = clamp(d.y,0.0,1.0);
  vec3 c = mix(vec3(0.020,0.075,0.120), vec3(0.002,0.008,0.030), pow(t,0.45));
  float m = max(dot(d, uMoon), 0.0);
  c += vec3(1.0,0.92,0.75) * (smoothstep(0.9993,0.9998,m)*2.2 + pow(m,160.0)*0.25 + pow(m,10.0)*0.05);
  vec3 sp = floor(d*220.0);
  float st = step(0.9975, hash(sp)) * smoothstep(0.02,0.3,d.y);
  c += vec3(0.8,0.9,1.0) * st * (0.4 + 0.6*hash(sp+7.0));
  return c;
}
void main(){
  float e = uTexel;
  float hl = texture2D(uH, vUv - vec2(e,0.0)).r;
  float hr = texture2D(uH, vUv + vec2(e,0.0)).r;
  float hd = texture2D(uH, vUv - vec2(0.0,e)).r;
  float hu = texture2D(uH, vUv + vec2(0.0,e)).r;
  float K = 2.4;
  vec3 N = normalize(vec3(-(hr-hl)*K, 1.0, (hu-hd)*K));
  // a whisper of ambient wind ripple
  vec2 w = vWorld.xz;
  N.xz += 0.012*vec2(sin(w.x*3.1+uTime*0.9)+sin(w.y*4.3-uTime*0.7), cos(w.y*3.7+uTime*0.8)+sin(w.x*5.1+uTime*0.6));
  N = normalize(N);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  float cosv = max(dot(N,V),0.0);
  float fres = 0.04 + 0.96*pow(1.0-cosv, 4.0);
  fres = clamp(fres*1.9, 0.0, 1.0);
  vec3 refl = sky(R);
  vec3 tint = vec3(0.004,0.040,0.055);
  vec3 col = mix(tint, refl, fres);
  // moon glitter on the ripples
  float g = pow(max(dot(R, uMoon),0.0), 2200.0) * 5.0;
  col += vec3(1.0,0.93,0.78) * g;
  float alpha = mix(0.22, 1.0, fres);
  alpha = max(alpha, clamp(g, 0.0, 1.0));
  // fade into the dark at the pond's edge
  float r = length(vWorld.xz);
  float edge = smoothstep(4.6, 6.8, r);
  col = mix(col, uFog, edge);
  alpha = max(alpha, edge);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

const FLOOR_FS = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vWorld;
uniform sampler2D uH; uniform float uTexel; uniform float uTime; uniform vec3 uFog;
vec2 h22(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float caustic(vec2 uv, float t){
  vec2 p = mod(uv*6.28318, 6.28318) - 250.0;
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n=0;n<4;n++){
    float tt = t*(1.0 - (3.5/float(n+1)));
    i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main(){
  float e = uTexel;
  float hl = texture2D(uH, vUv - vec2(e,0.0)).r;
  float hr = texture2D(uH, vUv + vec2(e,0.0)).r;
  float hd = texture2D(uH, vUv - vec2(0.0,e)).r;
  float hu = texture2D(uH, vUv + vec2(0.0,e)).r;
  vec2 grad = vec2(hr-hl, hu-hd);
  vec2 p = vWorld.xz*1.1 + grad*3.2;
  vec2 ip = floor(p); vec2 fp = fract(p);
  float f1 = 9.0, f2 = 9.0; vec2 id = vec2(0.0);
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 g = vec2(float(i),float(j));
    vec2 o = h22(ip+g);
    float d = length(g + o*0.85 + 0.075 - fp);
    if (d < f1){ f2 = f1; f1 = d; id = ip+g; } else if (d < f2){ f2 = d; }
  }
  float rnd = h21(id);
  vec3 stone = mix(vec3(0.10,0.17,0.19), vec3(0.30,0.28,0.22), rnd);
  stone = mix(stone, vec3(0.16,0.26,0.27), step(0.7,h21(id+3.0)));
  float rim = smoothstep(0.0, 0.2, f2-f1);
  float dome = 1.0 - f1*1.1;
  vec3 col = stone * (0.3 + 0.7*dome) * mix(0.5, 1.0, rim);
  float c = caustic(vWorld.xz*0.16 + grad*0.55, uTime*0.45);
  col *= vec3(0.42,0.66,0.74);
  col += vec3(0.10,0.34,0.38) * c * 1.5;
  float r = length(vWorld.xz);
  col = mix(col, uFog, smoothstep(3.0, 7.0, r));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function padTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 128);
  gr.addColorStop(0, '#6fcf7a');
  gr.addColorStop(0.7, '#3ea85a');
  gr.addColorStop(1, '#1f7a45');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(210,255,200,0.35)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126);
    g.stroke();
  }
  g.strokeStyle = 'rgba(0,40,20,0.25)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const high = gfx.level >= 2;
  const N = [96, 128, 176, 208, 256, 320][gfx.level];
  const NS = N / 176; // grid scale relative to the reference 176 grid

  const stage = createStage(root, { fov: 38, gfx, exposure: 1.0, envIntensity: 0.35 });
  const { scene, camera } = stage;
  const fogColor = new THREE.Color('#050f16');
  scene.background = fogColor;
  scene.fog = null;
  const moon = new THREE.Vector3(0.18, 0.62, -0.76).normalize();

  // ---------- lighting for the 3D props ----------
  scene.add(new THREE.HemisphereLight(0x6f9cc0, 0x0a1a20, 0.9));
  const moonLight = new THREE.DirectionalLight(0xdfe9ff, 2.2);
  moonLight.position.copy(moon).multiplyScalar(12);
  scene.add(moonLight);

  // ---------- wave field ----------
  let h0 = new Float32Array(N * N);
  let h1 = new Float32Array(N * N);
  const damp = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.min(x, y, N - 1 - x, N - 1 - y);
      damp[y * N + x] = Math.pow(0.9915, 1 / NS) * (d < 14 * NS ? 0.86 + 0.14 * (d / (14 * NS)) : 1);
    }
  }
  const half = new Uint16Array(N * N);
  const heightTex = new THREE.DataTexture(half, N, N, THREE.RedFormat, THREE.HalfFloatType);
  heightTex.minFilter = THREE.LinearFilter;
  heightTex.magFilter = THREE.LinearFilter;
  heightTex.wrapS = heightTex.wrapT = THREE.ClampToEdgeWrapping;
  heightTex.needsUpdate = true;

  const toGrid = (x, z) => [(x / SIZE + 0.5) * N, (0.5 - z / SIZE) * N];

  function sampleH(x, z) {
    const [gx, gy] = toGrid(x, z);
    const ix = clamp(Math.floor(gx), 1, N - 3);
    const iy = clamp(Math.floor(gy), 1, N - 3);
    const fx = clamp(gx - ix, 0, 1);
    const fy = clamp(gy - iy, 0, 1);
    const a = h0[iy * N + ix], b = h0[iy * N + ix + 1], c = h0[(iy + 1) * N + ix], d = h0[(iy + 1) * N + ix + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }

  function disturb(x, z, amp, radius = 3.2) {
    const [gx, gy] = toGrid(x, z);
    const r = radius * NS;
    for (let y = Math.max(2, Math.floor(gy - r)); y <= Math.min(N - 3, Math.ceil(gy + r)); y++) {
      for (let xx = Math.max(2, Math.floor(gx - r)); xx <= Math.min(N - 3, Math.ceil(gx + r)); xx++) {
        const d = Math.hypot(xx - gx, y - gy) / r;
        if (d >= 1) continue;
        const f = Math.cos(d * Math.PI * 0.5);
        h0[y * N + xx] -= amp * f * f;
      }
    }
  }

  function stepWave() {
    for (let y = 1; y < N - 1; y++) {
      let i = y * N + 1;
      for (let x = 1; x < N - 1; x++, i++) {
        h1[i] = ((h0[i - 1] + h0[i + 1] + h0[i - N] + h0[i + N]) * 0.5 - h1[i]) * damp[i];
      }
    }
    const t = h0; h0 = h1; h1 = t;
  }

  function uploadHeights() {
    for (let i = 0; i < h0.length; i++) half[i] = THREE.DataUtils.toHalfFloat(clamp(h0[i], -2, 2));
    heightTex.needsUpdate = true;
  }

  // ---------- floor + water ----------
  const uniforms = {
    uH: { value: heightTex },
    uTexel: { value: 1 / N },
    uTime: { value: 0 },
    uFog: { value: fogColor },
    uMoon: { value: moon },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({ uniforms, vertexShader: WATER_VS.replace('vUv = uv;', 'vUv = (modelMatrix * vec4(position,1.0)).xz / 14.0 * vec2(1.0,-1.0) + 0.5;'), fragmentShader: FLOOR_FS, toneMapped: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.0;
  scene.add(floor);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({ uniforms, vertexShader: WATER_VS.replace('vUv = uv;', 'vUv = (modelMatrix * vec4(position,1.0)).xz / 14.0 * vec2(1.0,-1.0) + 0.5;'), fragmentShader: WATER_FS, transparent: true, depthWrite: false, toneMapped: false })
  );
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 2;
  scene.add(water);

  // ---------- lily pads and lotus ----------
  const padTex = padTexture();
  const padGeo = new THREE.CircleGeometry(0.5, 40, 0.35, Math.PI * 2 - 0.5);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  const pads = [];
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xffc4de, roughness: 0.5, emissive: 0xff7fb0, emissiveIntensity: 0.28 });
  const lotusMatInner = new THREE.MeshStandardMaterial({ color: 0xffe6f1, roughness: 0.45, emissive: 0xffa6c8, emissiveIntensity: 0.4 });
  const petalGeo = new THREE.SphereGeometry(1, 12, 8);
  function makeLotus() {
    const g = new THREE.Group();
    const ring = (count, tilt, len, mat, y) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
        const holder = new THREE.Group();
        const petal = new THREE.Mesh(petalGeo, mat);
        petal.scale.set(0.085, len, 0.028);
        petal.position.set(0, len * 0.92, 0);
        holder.add(petal);
        holder.rotation.set(0, a, 0);
        holder.rotateX(tilt);
        holder.position.y = y;
        g.add(holder);
      }
    };
    ring(9, 1.25, 0.17, lotusMat, 0.015);
    ring(7, 0.75, 0.16, lotusMatInner, 0.03);
    ring(5, 0.28, 0.13, lotusMatInner, 0.045);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffc94d, emissiveIntensity: 0.9 }));
    core.position.y = 0.07;
    g.add(core);
    return g;
  }
  const padCount = Math.round(9 * Math.max(0.7, gfx.detail * 0.9));
  let placed = 0;
  let guardP = 0;
  while (placed < padCount && guardP++ < 200) {
    const a = rand(0, Math.PI * 2);
    const r = rand(1.8, 5.0);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.8;
    const s = rand(0.9, 1.7);
    if (pads.some((p) => Math.hypot(p.hx - x, p.hz - z) < (p.s + s) * 0.62)) continue;
    const m = new THREE.Mesh(padGeo, padMat);
    m.scale.setScalar(s);
    m.rotation.y = rand(0, 6.28);
    const grp = new THREE.Group();
    grp.add(m);
    const withLotus = placed % 3 === 1;
    if (withLotus) {
      const lotus = makeLotus();
      lotus.scale.setScalar(s * 0.95);
      lotus.rotation.y = rand(0, 6);
      grp.add(lotus);
    }
    scene.add(grp);
    pads.push({ g: grp, hx: x, hz: z, x, z, vx: 0, vz: 0, s, rot: rand(0, 6.28), spin: rand(-0.04, 0.04), lotus: withLotus });
    placed++;
  }

  // ---------- koi ----------
  const koiCount = Math.min(8, Math.round(2 + gfx.level * 1.2));
  const koiPalette = [
    [0xff6a1f, 0xfff4e6, 0xff3b1f],
    [0xffffff, 0xff7a2a, 0xffd0a0],
    [0xff9d2e, 0xfff4e6, 0xffb36b],
    [0xffe3c0, 0xff5a2a, 0xffffff],
  ];
  const sphereGeo = new THREE.SphereGeometry(1, 14, 10);
  // flat triangular fin: apex at the origin, fanning out along +X
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(0.18, 0.05, 0.34, 0.2);
  finShape.quadraticCurveTo(0.26, 0, 0.34, -0.2);
  finShape.quadraticCurveTo(0.18, -0.05, 0, 0);
  const finGeo = new THREE.ShapeGeometry(finShape);
  finGeo.rotateX(-Math.PI / 2);
  const koi = [];
  for (let k = 0; k < koiCount; k++) {
    const pal = koiPalette[k % koiPalette.length];
    const segs = [];
    const group = new THREE.Group();
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const rad = 0.17 * Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.9)) + 0.035;
      const mat = new THREE.MeshStandardMaterial({ color: pal[(i < 3 ? 0 : i % 3 === 0 ? 1 : i % 2) % 3], roughness: 0.45, metalness: 0.05, emissive: 0x1a0800, emissiveIntensity: 0.4 });
      const m = new THREE.Mesh(sphereGeo, mat);
      m.scale.set(rad * 1.5, rad * 0.8, rad);
      group.add(m);
      segs.push({ m, t });
    }
    const finMat = new THREE.MeshStandardMaterial({ color: pal[2], roughness: 0.6, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const tail = new THREE.Mesh(finGeo, finMat);
    tail.scale.setScalar(1.15);
    group.add(tail);
    const fins = [-1, 1].map((sd) => {
      const f = new THREE.Mesh(finGeo, finMat);
      f.scale.setScalar(0.55);
      group.add(f);
      return { f, sd };
    });
    scene.add(group);
    koi.push({ group, segs, tail, fins, a: rand(2, 4), b: rand(1.4, 3), f1: rand(0.16, 0.26), f2: rand(0.18, 0.3), p1: rand(0, 6.28), p2: rand(0, 6.28), speed: rand(0.85, 1.15), boost: 0 });
  }
  const koiPath = (k, t) => [k.a * Math.sin(k.f1 * t * k.speed + k.p1) + Math.sin(t * 0.05 + k.p2) * 0.8, k.b * Math.cos(k.f2 * t * k.speed + k.p2) + 0.4];

  // ---------- particles ----------
  const flies = new Sparkles(Math.round(50 * gfx.particles), { size: 0.12, drag: 0.05 });
  scene.add(flies.points);
  const fireflyColor = new THREE.Color('#d7ff7a');
  const spray = new Sparkles(Math.round(120 * gfx.particles), { size: 0.085, gravity: -9, drag: 0.4 });
  scene.add(spray.points);
  const sprayColor = new THREE.Color('#bfeaff');
  let flyClock = 0;

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const toWater = (px, py) => {
    ndc.set((px / stage.width) * 2 - 1, -(py / stage.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(waterPlane, hit) ? hit : null;
  };

  // ---------- audio ----------
  let trickle = null;
  let lap = null;
  let pad = null;
  const padLevel = 0.045;
  if (audio.ready) {
    trickle = audio.loop(bus, { kind: 'brown', filter: 'lowpass', freq: 650, q: 0.6, gain: 0, send: 0.35 });
    lap = audio.loop(bus, { kind: 'brown', filter: 'lowpass', freq: 260, q: 0.5, gain: 0.05, send: 0.4 });
    pad = new Pad(audio, bus, {
      chords: [[57, 64, 69, 72], [55, 62, 67, 71], [53, 60, 65, 69], [52, 59, 64, 67]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1000,
      period: 19,
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);
  const panFor = (x) => clamp(x / (SIZE * 0.4), -0.9, 0.9);

  function dropSound(x, z, strength = 1, soft = false) {
    if (!audio.ready) return;
    const deg = Math.round(clamp((x / SIZE + 0.5) * 9, 0, 9)) + (strength < 0.5 ? 5 : 0);
    const f = midiToFreq(pentatonic(deg, 60));
    const pan = panFor(x);
    const g = (soft ? 0.5 : 1) * clamp(strength, 0.25, 1.1);
    // the "plip": a bubble-style upward chirp
    audio.bubble(bus, { freq: f * 1.2, gain: 0.26 * g, pan, send: 0.55, dur: 0.38, rise: 1.7 });
    // a glassy overtone that sings in the reverb
    audio.tone(bus, { freq: f * 2.003, dur: 1.1, gain: 0.05 * g, pan, send: 0.7, attack: 0.004 });
    audio.tone(bus, { freq: f * 3.01, dur: 0.6, gain: 0.018 * g, pan, send: 0.7, attack: 0.004 });
    // body of the splash
    audio.tone(bus, { freq: f * 0.5, freqEnd: f * 0.9, sweepTime: 0.09, dur: 0.16, gain: 0.12 * g, pan, send: 0.3 });
    audio.burst(bus, { kind: 'white', dur: 0.07, attack: 0.002, gain: 0.1 * g, type: 'bandpass', freq: 1500 + strength * 800, q: 0.9, pan, send: 0.3 });
  }

  function splash(x, z, strength = 1) {
    disturb(x, z, 0.55 * strength, 3.6 + strength * 1.2);
    const n = Math.round(8 + 8 * strength);
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28);
      const sp = rand(0.3, 1.1) * (0.6 + strength * 0.5);
      spray.spawn(x, 0.02, z, Math.cos(a) * sp, rand(2.2, 4.2) * (0.7 + strength * 0.4), Math.sin(a) * sp, sprayColor, rand(0.5, 1.1), rand(0.45, 0.8));
    }
    dropSound(x, z, strength);
    // koi come to investigate
    for (const k of koi) k.boost = 1;
  }

  // ---------- input ----------
  let finger = null;
  let rainMode = 'off';
  const tracker = track(root, {
    down(p) {
      audio.unlock?.();
      const w = toWater(p.x, p.y);
      if (!w) return;
      splash(w.x, w.z, rand(0.85, 1.1));
      audio.haptic?.(10);
      finger = { id: p.id, x: w.x, z: w.z, acc: 0, lastDrip: 0 };
    },
    move(p) {
      if (!finger || finger.id !== p.id) return;
      const w = toWater(p.x, p.y);
      if (!w) return;
      const d = Math.hypot(w.x - finger.x, w.z - finger.z);
      finger.speed = p.speed;
      // trail of small ripples along the finger path
      const steps = Math.max(1, Math.ceil(d / 0.25));
      for (let i = 1; i <= steps; i++) disturb(lerp(finger.x, w.x, i / steps), lerp(finger.z, w.z, i / steps), 0.07 + Math.min(0.1, d * 0.1), 2.4);
      finger.acc += d;
      if (finger.acc > 0.9) {
        finger.acc = 0;
        dropSound(w.x, w.z, 0.3, true);
      }
      finger.x = w.x;
      finger.z = w.z;
    },
    up(p) {
      if (finger && finger.id === p.id) finger = null;
    },
  });

  // ---------- HUD ----------
  hud.segmented({
    label: 'Rain',
    options: [{ id: 'off', label: 'Off' }, { id: 'light', label: 'Light' }, { id: 'heavy', label: 'Heavy' }],
    value: rainMode,
    onChange: (id) => { rainMode = id; },
  });
  hud.setHint('Tap the water to drop a pebble. Drag a finger through it. Every drop plays a note.');

  // ---------- frame ----------
  let waveClock = 0;
  let rainClock = 0;
  let cricketClock = rand(1, 3);
  let lapT = 0;
  let camSway = { x: 0, y: 0 };
  const ptr = { x: 0, y: 0 };
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });

  function cricket() {
    if (!audio.ready) return;
    const pan = rand(-0.9, 0.9);
    const base = rand(4200, 5000);
    const chirps = Math.random() < 0.5 ? 3 : 4;
    for (let c = 0; c < chirps; c++) {
      audio.tone(bus, { freq: base, freqEnd: base * 1.03, dur: 0.028, attack: 0.004, gain: 0.011, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
      audio.tone(bus, { freq: base * 0.5, dur: 0.028, attack: 0.004, gain: 0.006, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
    }
  }

  const loop = createLoop((dt, time) => {
    uniforms.uTime.value = time;

    // fixed-step wave equation (60 Hz)
    waveClock += dt;
    let steps = 0;
    const stepDt = 1 / (60 * NS);
    while (waveClock >= stepDt && steps < 6) { stepWave(); waveClock -= stepDt; steps++; }
    if (waveClock > 0.1) waveClock = 0;

    // ambient rain
    if (rainMode !== 'off') {
      rainClock -= dt;
      if (rainClock <= 0) {
        rainClock = rainMode === 'light' ? rand(0.25, 0.8) : rand(0.04, 0.2);
        const a = rand(0, 6.28);
        const r = Math.sqrt(Math.random()) * 5.2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r * 0.8;
        const s = rand(0.18, 0.45);
        disturb(x, z, 0.2 + s * 0.5, 2.4);
        dropSound(x, z, s, true);
        if (Math.random() < 0.4) spray.spawn(x, 0.02, z, rand(-0.3, 0.3), rand(1, 2), rand(-0.3, 0.3), sprayColor, 0.5, 0.4);
      }
    }
    if (audio.ready) {
      const sp = finger ? clamp((finger.speed || 0) / 700, 0, 1) : 0;
      trickle.set({ gain: 0.16 * sp, freq: 450 + 700 * sp, pan: finger ? panFor(finger.x) : 0 }, 0.06);
      if (finger) finger.speed = (finger.speed || 0) * 0.9;
      lapT += dt;
      lap.set({ gain: 0.045 + 0.025 * Math.sin(lapT * 0.4) * Math.sin(lapT * 0.17), freq: 230 + 80 * Math.sin(lapT * 0.3) }, 0.5);
      cricketClock -= dt;
      if (cricketClock <= 0) { cricket(); cricketClock = rand(1.4, 4.5); }
    }
    uploadHeights();

    // lily pads ride the ripples
    for (const p of pads) {
      const e = 0.18;
      const gx = (sampleH(p.x + e, p.z) - sampleH(p.x - e, p.z)) / (2 * e);
      const gz = (sampleH(p.x, p.z + e) - sampleH(p.x, p.z - e)) / (2 * e);
      p.vx += (-gx * 5 + (p.hx - p.x) * 0.7) * dt;
      p.vz += (-gz * 5 + (p.hz - p.z) * 0.7) * dt;
      p.vx *= Math.pow(0.35, dt);
      p.vz *= Math.pow(0.35, dt);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.rot += (p.spin + p.vx * 0.2) * dt;
      const hh = sampleH(p.x, p.z);
      p.g.position.set(p.x, 0.035 + hh * 0.4, p.z);
      p.g.rotation.set(gz * 0.9, p.rot, -gx * 0.9);
    }

    // koi glide beneath
    for (const k of koi) {
      k.boost = Math.max(0, k.boost - dt * 0.3);
      let back = 0;
      k.segs.forEach((s, i) => {
        const tt = time - i * 0.2;
        const [px, pz] = koiPath(k, tt);
        const [nx, nz] = koiPath(k, tt - 0.05);
        let dx = px - nx, dz = pz - nz;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const wig = Math.sin(time * (2.4 + k.boost * 2) - i * 0.8) * 0.045 * (0.2 + s.t);
        s.m.position.set(px - dz * wig, -0.42 + Math.sin(time * 0.7 + i) * 0.01, pz + dx * wig);
        s.m.rotation.y = Math.atan2(-dz, dx);
      });
      const last = k.segs[k.segs.length - 1].m;
      const prev = k.segs[k.segs.length - 2].m;
      back = Math.atan2(last.position.z - prev.position.z, last.position.x - prev.position.x);
      k.tail.position.copy(prev.position);
      k.tail.position.x += Math.cos(back) * 0.03;
      k.tail.position.z += Math.sin(back) * 0.03;
      k.tail.rotation.y = -back + Math.sin(time * 5 + k.p1) * 0.35;
      k.fins.forEach(({ f, sd }) => {
        const seg = k.segs[2].m;
        const nxt = k.segs[3].m.position;
        const bk = Math.atan2(nxt.z - seg.position.z, nxt.x - seg.position.x);
        f.position.copy(seg.position);
        f.position.x += -Math.sin(bk) * 0.11 * sd;
        f.position.z += Math.cos(bk) * 0.11 * sd;
        f.rotation.y = -bk - sd * (0.75 + Math.sin(time * 3 + sd) * 0.25);
      });
    }

    // fireflies
    flyClock -= dt;
    if (flyClock <= 0) {
      flyClock = rand(0.15, 0.5);
      flies.spawn(rand(-5, 5), rand(0.4, 1.8), rand(-4, 3), rand(-0.12, 0.12), rand(-0.04, 0.08), rand(-0.12, 0.12), fireflyColor, rand(0.6, 1.4), rand(5, 9));
    }
    flies.update(dt, stage.height, 38);
    spray.update(dt, stage.height, 38);
    // splashes should vanish when they fall back to the water
    for (let i = 0; i < spray.count; i++) if (spray.age[i] < 1 && spray.pos[i * 3 + 1] < 0) spray.age[i] = 1;

    // camera drifts a touch with the pointer
    camSway.x = lerp(camSway.x, ptr.x * 0.5, 1 - Math.exp(-2 * dt));
    camSway.y = lerp(camSway.y, ptr.y * 0.3, 1 - Math.exp(-2 * dt));
    camera.position.set(camSway.x, 8.4 - camSway.y * 0.6, 7.4);
    camera.lookAt(camSway.x * 0.2, 0, 0.3);
    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      trickle?.stop(0.1);
      lap?.stop(0.3);
      pad?.stop(0.6);
      window.removeEventListener('hush:ambience', onAmb);
      heightTex.dispose();
      padTex.dispose();
      stage.dispose();
    },
  };
}
