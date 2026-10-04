// Glass Marbles — 3D (Three.js). A big clear glass bowl full of swirled glass marbles on a
// dark walnut table. Custom sphere-vs-bowl and sphere-vs-sphere physics with rolling
// rotation; drag to tilt the bowl (spring-smoothed), tap the glass to drop a marble.
// Every sound (glass clacks, bowl tonks, rolling rumble) is synthesized live.

import { THREE, createStage, gradientTexture, glowTexture, Sparkles } from '../three-base.js';
import { createLoop, track, rand, clamp, lerp, pick } from '../util.js';
import { Pad } from '../audio.js';

// ---------- palettes: each colour = { c: glass tint, a/b: swirl ribbon colours } ----------
const PALETTES = [
  {
    name: 'Jewel', kind: 'jewel',
    colors: [
      { c: '#c4123f', a: '#ff7a96', b: '#ffd9b0' }, // ruby
      { c: '#2250ea', a: '#78b8ff', b: '#eaf5ff' }, // sapphire
      { c: '#0fa86a', a: '#86ffc8', b: '#f6ffe0' }, // emerald
      { c: '#f0951a', a: '#ffe08a', b: '#fff6dc' }, // amber
      { c: '#8a3fe8', a: '#dcaaff', b: '#ffe6ff' }, // amethyst
      { c: '#12b8c4', a: '#94f6ff', b: '#ffffff' }, // aquamarine
      { c: '#e83f9a', a: '#ffaad8', b: '#fff0f6' }, // rose
      { c: '#a9c81a', a: '#f4ffa0', b: '#ffffff' }, // peridot
    ],
  },
  {
    name: 'Pastel', kind: 'pastel',
    colors: [
      { c: '#ff9db8', a: '#fff1f5', b: '#ffd0a8' },
      { c: '#8fe3c4', a: '#f0fff8', b: '#c2f0ff' },
      { c: '#b9a4ff', a: '#f4efff', b: '#ffc6ee' },
      { c: '#8cc8ff', a: '#eef8ff', b: '#d9c9ff' },
      { c: '#ffe08a', a: '#fffbe6', b: '#ffc2c2' },
      { c: '#ffb48c', a: '#fff1e6', b: '#ffe7a6' },
      { c: '#c5ee8f', a: '#f6ffe8', b: '#9ee8d2' },
      { c: '#f4a6e6', a: '#fff0fc', b: '#c8d4ff' },
    ],
  },
  {
    name: 'Galaxy', kind: 'galaxy',
    colors: [
      { c: '#4a22b8', a: '#ff4fd8', b: '#6af0ff' },
      { c: '#1634a8', a: '#3a8bff', b: '#c0f4ff' },
      { c: '#0b6a66', a: '#38ffb4', b: '#d2fff4' },
      { c: '#8a1a72', a: '#ff62b8', b: '#ffd6f4' },
      { c: '#8a3410', a: '#ff9a3a', b: '#ffe6a8' },
      { c: '#2a1a74', a: '#9a7bff', b: '#ff9be8' },
      { c: '#0c4a8e', a: '#38d0ff', b: '#a8ffe8' },
      { c: '#6a1230', a: '#ff5a7a', b: '#ffc2a0' },
    ],
  },
  {
    name: 'Mono', kind: 'mono',
    colors: [
      { c: '#8e98ab', a: '#ffffff', b: '#4a5266' }, // smoke
      { c: '#d6dfee', a: '#ffffff', b: '#9fb0cc' }, // clear
      { c: '#f2efe8', a: '#ffffff', b: '#cfc7b8' }, // pearl
      { c: '#4a5060', a: '#c4cde0', b: '#ffffff' }, // slate
      { c: '#20232c', a: '#8d97ad', b: '#e6ecf8' }, // obsidian
      { c: '#b9c4d4', a: '#ffffff', b: '#6c7a92' }, // steel
      { c: '#e4dcd0', a: '#ffffff', b: '#a89c8c' }, // bone
      { c: '#2d3a4e', a: '#a8c0e6', b: '#ffffff' }, // ink
    ],
  },
];

// ---------- bowl geometry constants (bowl-local space: origin = sphere centre) ----------
const R = 2.0;                              // inner radius
const WALL = 0.075;
const RO = R + WALL;                        // outer radius
const TH_MAX = (76 * Math.PI) / 180;        // rim angle measured from the bottom
const Y_RIM = -R * Math.cos(TH_MAX);        // rim plane height (local)
const RHO_RIM = R * Math.sin(TH_MAX);
const G = 22;                               // slowed-down gravity: ASMR pace

const RADII = [0.15, 0.17, 0.2, 0.23, 0.27, 0.32];
const RADII_W = [1, 2, 3, 3, 2, 1];

function pickRadius() {
  let t = Math.random() * RADII_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RADII.length; i++) {
    t -= RADII_W[i];
    if (t <= 0) return RADII[i] + rand(-0.01, 0.01);
  }
  return 0.22;
}

// ---------- procedural textures ----------
function woodTexture(aniso) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rows = 4;
  const rh = S / rows;
  for (let p = 0; p < rows; p++) {
    const l = 10 + Math.random() * 4;
    g.fillStyle = `hsl(${22 + Math.random() * 5}, 34%, ${l}%)`;
    g.fillRect(0, p * rh, S, rh);
    // grain lines run along x, seamless because they use whole sine cycles
    const lines = 70;
    for (let i = 0; i < lines; i++) {
      const y0 = p * rh + Math.random() * rh;
      const k = 1 + Math.floor(Math.random() * 3);
      const ph = Math.random() * 6.28;
      const amp = 1 + Math.random() * 3.5;
      const dark = Math.random() < 0.62;
      g.strokeStyle = dark ? `rgba(18,8,3,${0.05 + Math.random() * 0.2})` : `rgba(150,100,58,${0.04 + Math.random() * 0.1})`;
      g.lineWidth = 0.5 + Math.random() * 2.2;
      g.beginPath();
      for (let x = 0; x <= S; x += 16) {
        const y = y0 + amp * Math.sin((6.28 * k * x) / S + ph) + 1.2 * Math.sin((6.28 * (k + 3) * x) / S + ph * 2.3);
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    // soft broad tone variation
    const gr = g.createLinearGradient(0, p * rh, 0, (p + 1) * rh);
    gr.addColorStop(0, 'rgba(0,0,0,0.22)');
    gr.addColorStop(0.12, 'rgba(0,0,0,0)');
    gr.addColorStop(0.9, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = gr;
    g.fillRect(0, p * rh, S, rh);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, p * rh, S, 1.5);
  }
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(200,150,100,0.05)';
    g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.repeat.set(9, 9);
  return t;
}

function swirlTexture(col, kind) {
  const W = 256;
  const H = 128;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const base = new THREE.Color(col.c);
  const dark = base.clone().multiplyScalar(kind === 'pastel' ? 0.82 : kind === 'galaxy' ? 0.35 : 0.5);
  g.fillStyle = `#${dark.getHexString()}`;
  g.fillRect(0, 0, W, H);
  // broad soft blotch of the glass colour
  const bl = g.createRadialGradient(W * rand(0.2, 0.8), H * 0.5, 4, W * 0.5, H * 0.5, W * 0.55);
  bl.addColorStop(0, col.c);
  bl.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.55;
  g.fillStyle = bl;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  g.lineCap = 'round';
  const ribbon = (color, lw, alpha, y0, amp, k, ph) => {
    g.strokeStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 7;
    g.lineWidth = lw;
    g.globalAlpha = alpha;
    g.beginPath();
    for (let x = -8; x <= W + 8; x += 4) {
      const y = y0 + amp * Math.sin((6.2832 * k * x) / W + ph) + amp * 0.32 * Math.sin((6.2832 * (k + 2) * x) / W + ph * 1.7);
      if (x === -8) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  };
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const color = i % 3 === 0 ? col.b : col.a;
    ribbon(color, rand(9, 24), rand(0.72, 1), H * rand(0.18, 0.82), H * rand(0.08, 0.3), 1 + Math.floor(Math.random() * 3), rand(0, 6.28));
  }
  for (let i = 0; i < 2; i++) {
    ribbon('#ffffff', rand(2, 4), rand(0.45, 0.8), H * rand(0.2, 0.8), H * rand(0.1, 0.3), 1 + Math.floor(Math.random() * 3), rand(0, 6.28));
  }
  // meridian ribbons so the swirl also reads near the poles
  for (let i = 0; i < 2; i++) {
    const x0 = Math.random() * W;
    const color = i ? col.b : col.a;
    g.strokeStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 6;
    g.lineWidth = rand(8, 16);
    g.globalAlpha = rand(0.6, 0.9);
    for (const off of [-W, 0, W]) {
      g.beginPath();
      for (let y = -4; y <= H + 4; y += 4) {
        const x = x0 + off + 20 * Math.sin(y * 0.09 + i * 2);
        if (y === -4) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  if (kind === 'galaxy') {
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${rand(0.4, 1)})`;
      const s = Math.random() < 0.15 ? 2.4 : 1.2;
      g.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function create(env) {
  const { audio, bus, hud, root, settings } = env;
  const gfx = env.gfx;
  const D = gfx.detail;
  const useTransmission = !!gfx.transmission;
  const realShadows = gfx.shadows > 0;
  const FOV = 30;

  const stage = createStage(root, {
    fov: FOV,
    gfx,
    exposure: 1.15,
    envIntensity: 1.0,
    environment: false,
    shadows: true,
    bloom: { strength: 0.22, radius: 0.5, threshold: 0.95 },
    ao: false,
  });
  const { scene, camera, renderer } = stage;

  // ---------- studio environment: dark warm room with softboxes (so glass reflects light shapes, not a bright floor) ----------
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    const mk = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
    const room = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), mk(0x1c130e, 1));
    room.position.y = 6;
    room.material.side = THREE.BackSide;
    es.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), mk(0x2b190d, 1));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    es.add(floor);
    const panel = (w, h, hex, k, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mk(hex, k));
      m.position.set(x, y, z);
      m.lookAt(0, 2, 0);
      es.add(m);
    };
    panel(7, 5, 0xfff0dc, 9, -7, 7, 7);      // big warm softbox, front-left (matches key light)
    panel(2.2, 9, 0xcfe0ff, 6, 9, 5, 1);     // tall cool strip, right
    panel(8, 1.6, 0xffe8cc, 5, 0, 12, -2);   // overhead strip
    panel(5, 3, 0xdce8ff, 3.5, 2, 6, -10);   // back panel
    panel(3, 2, 0xffd8b0, 3, 8, 3, 8);       // small warm accent front-right
    scene.environment = pm.fromScene(es, 0.03).texture;
    scene.environmentIntensity = 1.0;
    es.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    pm.dispose();
  }

  // ---------- backdrop, vignette ----------
  scene.background = gradientTexture([[0, '#0d0907'], [0.5, '#1d130d'], [1, '#2a1a10']]);
  scene.fog = new THREE.Fog(0x140d09, 12, 34);
  const vignette = document.createElement('div');
  vignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(6,3,2,0.5) 100%);';
  root.appendChild(vignette);

  // ---------- table ----------
  const woodTex = woodTexture(gfx.anisotropy);
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.52, metalness: 0, envMapIntensity: 0.55 })
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = realShadows;
  scene.add(table);

  // ---------- lights ----------
  const key = new THREE.DirectionalLight(0xffe4c4, 2.3);
  key.position.set(-3.6, 9, 4.2);
  if (realShadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(gfx.shadows, gfx.shadows);
    const sc = key.shadow.camera;
    sc.left = -3.8; sc.right = 3.8; sc.top = 3.8; sc.bottom = -3.8;
    sc.near = 3; sc.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    key.shadow.intensity = 0.6;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 1.5);
  rim.position.set(4.5, 4, -5);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffd2a0, 9, 14, 2);
  fill.position.set(3.2, 2.2, 5.2);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x2a1a10, 0.22));
  const keyDir = key.position.clone().normalize();

  // soft contact blob under the bowl (stronger when there are no real shadows)
  const blobTex = glowTexture(128, 'rgba(0,0,0,0.95)', 'rgba(0,0,0,0.5)');
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: realShadows ? 0.35 : 0.62, depthWrite: false, color: 0x080402 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.006;
  blob.scale.setScalar(5.6);
  scene.add(blob);

  // ---------- bowl ----------
  const bowl = new THREE.Group();
  scene.add(bowl);
  const bowlPts = [];
  const arcN = Math.max(36, Math.round(56 * D));
  for (let i = 0; i <= arcN; i++) {
    const th = (i / arcN) * TH_MAX;
    bowlPts.push(new THREE.Vector2(R * Math.sin(th), -R * Math.cos(th)));
  }
  {
    const nx = Math.sin(TH_MAX), ny = -Math.cos(TH_MAX);
    const tx = Math.cos(TH_MAX), ty = Math.sin(TH_MAX);
    const px = R * nx, py = R * ny;
    const mx = px + nx * WALL * 0.5, my = py + ny * WALL * 0.5;
    for (let i = 1; i < 9; i++) {
      const ph = (i / 9) * Math.PI;
      const rr = WALL * 0.5;
      bowlPts.push(new THREE.Vector2(mx + rr * (-nx * Math.cos(ph) + tx * Math.sin(ph)), my + rr * (-ny * Math.cos(ph) + ty * Math.sin(ph))));
    }
  }
  for (let i = arcN; i >= 0; i--) {
    const th = (i / arcN) * TH_MAX;
    bowlPts.push(new THREE.Vector2(RO * Math.sin(th), -RO * Math.cos(th)));
  }
  const bowlGeo = new THREE.LatheGeometry(bowlPts, Math.max(72, Math.round(112 * D)));
  const bowlSpecMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.04, metalness: 0, ior: 1.5, specularIntensity: 1,
    envMapIntensity: 0.6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const bowlSpec = new THREE.Mesh(bowlGeo, bowlSpecMat);
  bowlSpec.castShadow = realShadows;
  bowlSpec.renderOrder = 5;
  bowl.add(bowlSpec);
  const bowlTintMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTint: { value: new THREE.Color('#9fbdb8') }, uBase: { value: 0.02 }, uEdge: { value: 0.22 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint; uniform float uBase; uniform float uEdge;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float a = uBase + uEdge * pow(f, 2.6);
        gl_FragColor = vec4(uTint, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const bowlTint = new THREE.Mesh(bowlGeo, bowlTintMat);
  bowlTint.renderOrder = 4;
  bowl.add(bowlTint);

  // ---------- marble materials (cached per palette) ----------
  const sphereSeg = clampInt(Math.round(30 * D), 18, 64);
  const shellGeo = new THREE.SphereGeometry(1, sphereSeg, Math.max(12, Math.round(sphereSeg * 0.6)));
  const coreGeo = new THREE.SphereGeometry(1, Math.max(14, Math.round(sphereSeg * 0.7)), Math.max(10, Math.round(sphereSeg * 0.45)));
  const specMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.03, metalness: 0, ior: 1.52, specularIntensity: 1,
    envMapIntensity: 1.25, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const palCache = new Map();
  function palMats(pi) {
    if (palCache.has(pi)) return palCache.get(pi);
    const pal = PALETTES[pi];
    const arr = pal.colors.map((c) => {
      const tex = swirlTexture(c, pal.kind);
      const core = new THREE.MeshStandardMaterial({
        map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: pal.kind === 'galaxy' ? 0.9 : 0.7,
        roughness: 0.3, metalness: 0, envMapIntensity: 0.6,
      });
      const base = new THREE.Color(c.c);
      const tint = base.clone().multiplyScalar(0.85);
      const shell = useTransmission
        ? new THREE.MeshPhysicalMaterial({
          color: tint.clone().lerp(new THREE.Color('#ffffff'), 0.35), transmission: 0.96, thickness: 0.5, ior: 1.5, roughness: 0.03, metalness: 0,
          attenuationColor: base, attenuationDistance: 1.5, clearcoat: 1, clearcoatRoughness: 0.02,
          specularIntensity: 1, envMapIntensity: 1.7,
        })
        : new THREE.MeshStandardMaterial({
          color: tint, transparent: true, opacity: 0.55, roughness: 0.65, metalness: 0, depthWrite: false, envMapIntensity: 0.3,
        });
      return { tex, core, shell, base, light: new THREE.Color(c.a) };
    });
    palCache.set(pi, arr);
    return arr;
  }

  // ---------- state ----------
  let palIdx = 0;
  let lastColor = -1;
  const marbles = [];
  const cap = Math.round(54 * D);
  const spawnQueue = [];
  const dust = new Sparkles(Math.round(150 * gfx.particles), { size: 0.075, gravity: -0.4, drag: 1.1 });
  scene.add(dust.points);
  const motes = new Sparkles(Math.round(46 * gfx.particles), { size: 0.08, gravity: 0, drag: 0.1 });
  scene.add(motes.points);
  const moteColor = new THREE.Color('#ffd9a8');
  let moteClock = 0;
  const tmpC = new THREE.Color();

  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const axisV = new THREE.Vector3();
  const dq = new THREE.Quaternion();

  function spawnGlints(lx, ly, lz, n, color, speed = 1) {
    if (n <= 0) return;
    tmpV.set(lx, ly, lz).applyMatrix4(bowl.matrixWorld);
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.283);
      dust.spawn(tmpV.x + rand(-0.04, 0.04), tmpV.y + rand(-0.04, 0.04), tmpV.z + rand(-0.04, 0.04),
        Math.cos(a) * speed * rand(0.1, 0.7), speed * rand(0.2, 1), Math.sin(a) * speed * rand(0.1, 0.7), color, rand(0.5, 1.2), rand(0.5, 1.2));
    }
  }

  function addMarble(x, y, z, vx, vy, vz, r, ci, pop = true) {
    const mats = palMats(palIdx)[ci];
    const group = new THREE.Group();
    const core = new THREE.Mesh(coreGeo, mats.core);
    core.scale.setScalar(r * 0.7);
    core.castShadow = realShadows;
    const shell = new THREE.Mesh(shellGeo, mats.shell);
    shell.scale.setScalar(r);
    group.add(core, shell);
    let spec = null;
    if (!useTransmission) {
      shell.renderOrder = 2;
      spec = new THREE.Mesh(shellGeo, specMat);
      spec.scale.setScalar(r * 1.003);
      spec.renderOrder = 3;
      group.add(spec);
    }
    group.position.set(x, y, z);
    group.scale.setScalar(pop ? 0.01 : 1);
    bowl.add(group);
    const m = {
      x, y, z, vx, vy, vz, wx: rand(-2, 2), wy: rand(-2, 2), wz: rand(-2, 2),
      r, inv: 1 / Math.pow(r / 0.22, 3), ci, group, core, shell, spec,
      q: new THREE.Quaternion().random(), cd: 0, dead: false, dieT: 0, pop: pop ? 0 : 1, age: 0, calm: 0, hot: 0,
    };
    core.quaternion.copy(m.q);
    marbles.push(m);
    return m;
  }

  function setPalette(pi) {
    palIdx = pi;
    const mats = palMats(pi);
    for (const m of marbles) {
      if (m.dead) continue;
      const mm = mats[m.ci];
      m.core.material = mm.core;
      m.shell.material = mm.shell;
      spawnGlints(m.x, m.y, m.z, 2, mm.light, 0.8);
    }
  }

  function killMarble(m, quiet = false) {
    if (m.dead) return;
    m.dead = true;
    m.dieT = 0;
    if (!quiet) spawnGlints(m.x, m.y, m.z, 3, palMats(palIdx)[m.ci].light, 0.7);
  }

  function liveCount() {
    let n = 0;
    for (const m of marbles) if (!m.dead) n++;
    return n;
  }

  function dropMarble(lx, lz, opts = {}) {
    const r = opts.r ?? pickRadius();
    let ci;
    do { ci = Math.floor(Math.random() * 8); } while (ci === lastColor);
    lastColor = ci;
    let y = Y_RIM + (opts.h ?? rand(1.1, 1.5));
    for (let tries = 0; tries < 10; tries++) {
      let clash = false;
      for (const o of marbles) {
        if (o.dead) continue;
        const dx = o.x - lx, dy = o.y - y, dz = o.z - lz;
        const rs = o.r + r + 0.02;
        if (dx * dx + dy * dy + dz * dz < rs * rs) { clash = true; y += rs; break; }
      }
      if (!clash) break;
    }
    // enforce cap
    while (liveCount() >= cap) {
      const old = marbles.find((m) => !m.dead);
      if (!old) break;
      killMarble(old);
    }
    const m = addMarble(lx, y, lz, rand(-0.4, 0.4), opts.vy ?? -2, rand(-0.4, 0.4), r, ci);
    if (!opts.silent) plink(lx);
    hud.setStat?.(`${liveCount()} marbles`);
    return m;
  }

  function randomSpot(rad = 0.6) {
    const a = rand(0, 6.283);
    const d = Math.sqrt(Math.random()) * RHO_RIM * rad;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  function queueDrops(n, spacing = 0.07, delay = 0) {
    for (let i = 0; i < n; i++) spawnQueue.push({ t: delay + i * spacing * rand(0.7, 1.3) });
  }

  // ---------- tilt spring ----------
  const tilt = { x: 0, z: 0, vx: 0, vz: 0, tx: 0, tz: 0, ax: 0, az: 0 };
  const TILT_MAX = 0.46;
  const SPRING_W = 8.5;
  const SPRING_Z = 0.5;
  const center = new THREE.Vector3(0, RO, 0);
  const qi = new THREE.Quaternion();
  let gLx = 0, gLy = -G, gLz = 0;

  function updateBowlTransform() {
    const a = Math.hypot(tilt.x, tilt.z);
    if (a > 1e-5) {
      axisV.set(tilt.z / a, 0, -tilt.x / a);
      bowl.quaternion.setFromAxisAngle(axisV, a);
    } else bowl.quaternion.identity();
    center.set(tilt.x * RO * 0.9, RO, tilt.z * RO * 0.9);
    bowl.position.copy(center);
    bowl.updateMatrix();
    bowl.updateMatrixWorld(true);
    qi.copy(bowl.quaternion).invert();
  }

  // ---------- caustic glow on the table ----------
  const maxPts = cap + 8;
  const cPos = new Float32Array(maxPts * 3);
  const cCol = new Float32Array(maxPts * 3);
  const cSize = new Float32Array(maxPts);
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute('aColor', new THREE.BufferAttribute(cCol, 3));
  cGeo.setAttribute('aSize', new THREE.BufferAttribute(cSize, 1));
  cGeo.setDrawRange(0, 0);
  const cMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; varying vec3 vC; uniform float uScale;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vC = aColor;
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.7, 1.0, r));
        gl_FragColor = vec4(vC * a, a);
      }`,
  });
  const caustics = new THREE.Points(cGeo, cMat);
  caustics.frustumCulled = false;
  caustics.renderOrder = 1;
  scene.add(caustics);

  // ---------- camera framing ----------
  const cam = { dist: 9, sway: 0 };
  const lookY = 0.95;
  function frame() {
    const aspect = stage.width / Math.max(1, stage.height);
    const t = Math.tan((FOV * Math.PI) / 360);
    const distH = 2.75 / (t * aspect);
    const distV = 2.3 / t;
    cam.dist = Math.max(distH, distV, 7.5);
    scene.fog.near = cam.dist * 1.1;
    scene.fog.far = cam.dist * 3.4;
  }
  stage.onResize = frame;
  frame();

  function placeCamera(time) {
    const pitch = 0.74;
    const yaw = Math.sin(time * 0.11) * 0.05;
    const ly = aspectPortrait() ? lookY - 0.15 : lookY;
    camera.position.set(Math.sin(yaw) * cam.dist * Math.cos(pitch), ly + Math.sin(pitch) * cam.dist, Math.cos(yaw) * cam.dist * Math.cos(pitch));
    camera.lookAt(0, ly, 0);
  }
  const aspectPortrait = () => stage.width < stage.height * 0.9;

  // ---------- audio ----------
  let rollLow = null;
  let rollGrit = null;
  let rollRes = null;
  let pad = null;
  const padLevel = 0.04;
  if (audio.ready) {
    rollLow = audio.loop(bus, { kind: 'pink', filter: 'lowpass', freq: 300, q: 0.7, gain: 0, send: 0.12 });
    rollGrit = audio.loop(bus, { kind: 'white', filter: 'bandpass', freq: 2400, q: 0.9, gain: 0, send: 0.2 });
    rollRes = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 780, q: 7, gain: 0, send: 0.3 });
    pad = new Pad(audio, bus, {
      chords: [[57, 64, 69, 73], [55, 62, 67, 71], [53, 60, 65, 69], [52, 59, 64, 68]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1100,
      period: 19,
      wave: 'sine',
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  let tokens = 12;
  let tokenT = 0;
  const spend = (cost) => {
    if (tokens < cost) return false;
    tokens -= cost;
    return true;
  };
  const worldPan = (x, y, z) => {
    const e = bowl.matrixWorld.elements;
    return clamp((e[0] * x + e[4] * y + e[8] * z + e[12]) / 2.4, -0.85, 0.85);
  };
  let lastHaptic = 0;

  function clack(a, b, vn) {
    if (!audio.ready) return;
    const s = clamp(vn / 9, 0, 1);
    if (vn < 0.18) return;
    if (!spend(vn > 3 ? 0.8 : 1.15)) return;
    const pan = worldPan((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const f = (r) => clamp(540 / r, 1500, 5200) * rand(0.97, 1.03);
    const lvl = 0.025 + 0.15 * Math.pow(s, 0.9);
    const vel = 0.25 + 0.75 * s;
    audio.bell(bus, {
      freq: f(a.r), gain: lvl, pan, send: 0.3, vel, decay: 0.2 + 0.28 * s,
      partials: [[1, 1, 1], [2.76, 0.42, 0.55], [5.4, 0.2, 0.3]],
    });
    if (vn > 0.5) {
      audio.bell(bus, {
        freq: f(b.r), gain: lvl * 0.6, pan, send: 0.3, vel, decay: 0.16 + 0.2 * s, delay: 0.001,
        partials: [[1, 1, 0.8], [2.76, 0.3, 0.45]],
      });
    }
    if (s > 0.55 && performance.now() - lastHaptic > 120) { lastHaptic = performance.now(); audio.haptic?.(5); }
  }

  function tonk(m, vn) {
    if (!audio.ready) return;
    if (vn < 0.3) return;
    const s = clamp(vn / 9, 0, 1);
    if (!spend(1.2)) return;
    const pan = worldPan(m.x, m.y, m.z);
    const h = clamp((m.y + R) / (R + Y_RIM + 0.5), 0, 1);
    const fb = (520 + 150 * h) * rand(0.985, 1.015);
    const lvl = 0.03 + 0.16 * Math.pow(s, 0.85);
    audio.bell(bus, {
      freq: fb, gain: lvl, pan, send: 0.45, vel: 0.3 + 0.7 * s, decay: 0.3 + 0.7 * s,
      partials: [[1, 1, 1], [2.32, 0.5, 0.6], [4.17, 0.28, 0.4], [6.63, 0.12, 0.25]],
    });
    audio.tone(bus, { freq: 190 * rand(0.95, 1.05), freqEnd: 80, dur: 0.07 + 0.05 * s, gain: 0.12 * s + 0.02, pan, send: 0.1, attack: 0.002 });
    audio.burst(bus, { kind: 'white', dur: 0.01, attack: 0.0004, gain: 0.04 + 0.1 * s, type: 'bandpass', freq: clamp(520 / m.r, 1500, 5200), q: 3, pan, send: 0.1 });
    if (s > 0.55 && performance.now() - lastHaptic > 120) { lastHaptic = performance.now(); audio.haptic?.(6); }
  }

  function plink(lx) {
    if (!audio.ready) return;
    if (!spend(1)) return;
    audio.bell(bus, {
      freq: 1568 * rand(0.92, 1.12), gain: 0.07, pan: clamp(lx / 2.4, -0.7, 0.7), send: 0.55, vel: 0.45, decay: 1.3,
      partials: [[1, 1, 1], [2.76, 0.18, 0.5]],
    });
  }

  function settleTick(m) {
    if (!audio.ready || !spend(0.5)) return;
    const pan = worldPan(m.x, m.y, m.z);
    audio.burst(bus, { kind: 'white', dur: 0.006, attack: 0.0003, gain: rand(0.015, 0.04), type: 'bandpass', freq: rand(2800, 5200), q: 4, pan, send: 0.2 });
    audio.tone(bus, { freq: clamp(500 / m.r, 1700, 4800) * rand(0.97, 1.03), dur: 0.05, gain: 0.012, pan, send: 0.3, attack: 0.0006 });
  }

  // ---------- physics ----------
  function boundMarble(m, sound) {
    let nx, ny, nz, pen, out;
    if (m.y < Y_RIM) {
      const d = Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z) || 1e-6;
      const maxd = R - m.r;
      if (d <= maxd) return false;
      nx = m.x / d; ny = m.y / d; nz = m.z / d;
      pen = d - maxd;
      m.x -= nx * pen; m.y -= ny * pen; m.z -= nz * pen;
    } else {
      const rho = Math.hypot(m.x, m.z) || 1e-6;
      const maxr = Math.sqrt(Math.max(0.01, (R - m.r) * (R - m.r) - Y_RIM * Y_RIM));
      if (rho <= maxr) return false;
      nx = m.x / rho; ny = 0; nz = m.z / rho;
      pen = rho - maxr;
      m.x -= nx * pen; m.z -= nz * pen;
    }
    out = m.vx * nx + m.vy * ny + m.vz * nz; // speed along the outward normal
    if (out > 0) {
      const e = out > 0.55 ? 0.5 : 0.04;
      m.vx -= (1 + e) * out * nx;
      m.vy -= (1 + e) * out * ny;
      m.vz -= (1 + e) * out * nz;
      if (sound && m.cd <= 0) {
        m.cd = 0.05;
        tonk(m, out);
        if (out > 1.2) spawnGlints(m.x + nx * m.r, m.y + ny * m.r, m.z + nz * m.r, Math.min(3, Math.round(out * 0.4 * gfx.particles)), palMats(palIdx)[m.ci].light, 0.5);
      }
    }
    return true;
  }

  const MU = 0.22;
  function solvePairs(first) {
    const n = marbles.length;
    for (let i = 0; i < n; i++) {
      const a = marbles[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = marbles[j];
        if (b.dead) continue;
        let dx = b.x - a.x;
        if (dx > 0.6 || dx < -0.6) continue;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        const rs = a.r + b.r;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= rs * rs) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-5) { dx = rand(-1, 1) * 1e-3; dy = 1e-3; dz = rand(-1, 1) * 1e-3; d = Math.hypot(dx, dy, dz); }
        const nx = dx / d, ny = dy / d, nz = dz / d;
        const ov = rs - d;
        const ia = a.inv, ib = b.inv, is = ia + ib;
        const wa = (ia / is) * 0.82, wb = (ib / is) * 0.82;
        a.x -= nx * ov * wa; a.y -= ny * ov * wa; a.z -= nz * ov * wa;
        b.x += nx * ov * wb; b.y += ny * ov * wb; b.z += nz * ov * wb;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rel >= 0) continue;
        const e = -rel > 0.6 ? 0.7 : 0.05;
        const J = (-(1 + e) * rel) / is;
        a.vx -= J * nx * ia; a.vy -= J * ny * ia; a.vz -= J * nz * ia;
        b.vx += J * nx * ib; b.vy += J * ny * ib; b.vz += J * nz * ib;
        // tangential friction => the marbles spin each other
        const ux = b.vx - a.vx - b.r * (b.wy * nz - b.wz * ny) - a.r * (a.wy * nz - a.wz * ny);
        const uy = b.vy - a.vy - b.r * (b.wz * nx - b.wx * nz) - a.r * (a.wz * nx - a.wx * nz);
        const uz = b.vz - a.vz - b.r * (b.wx * ny - b.wy * nx) - a.r * (a.wx * ny - a.wy * nx);
        const un = ux * nx + uy * ny + uz * nz;
        let tx = ux - un * nx, ty = uy - un * ny, tz = uz - un * nz;
        const mt = 1 / (3.5 * is);
        tx *= -mt; ty *= -mt; tz *= -mt;
        const tm = Math.hypot(tx, ty, tz);
        const maxF = MU * J;
        if (tm > maxF && tm > 1e-9) { const k = maxF / tm; tx *= k; ty *= k; tz *= k; }
        a.vx -= tx * ia; a.vy -= ty * ia; a.vz -= tz * ia;
        b.vx += tx * ib; b.vy += ty * ib; b.vz += tz * ib;
        // torque: B contact at -rb*n, A contact at +ra*n
        const kb = (2.5 * ib) / (b.r * b.r) * b.r;
        const ka = (2.5 * ia) / (a.r * a.r) * a.r;
        // dwB = kb * (-n x Jt),  dwA = ka * (n x (-Jt))  (both reduce to the same sign pattern)
        const cxn = ny * tz - nz * ty, cyn = nz * tx - nx * tz, czn = nx * ty - ny * tx;
        b.wx -= kb * cxn; b.wy -= kb * cyn; b.wz -= kb * czn;
        a.wx -= ka * cxn; a.wy -= ka * cyn; a.wz -= ka * czn;
        if (first && a.cd <= 0 && b.cd <= 0) {
          a.cd = b.cd = 0.045;
          clack(a, b, -rel);
          if (-rel > 1.6) {
            const lc = palMats(palIdx);
            spawnGlints(a.x + nx * a.r, a.y + ny * a.r, a.z + nz * a.r, Math.min(3, Math.round(-rel * 0.35 * gfx.particles)), lc[a.ci].light, 0.6);
          }
        }
      }
    }
  }

  let rollE = 0;
  let rollX = 0;
  function step(h) {
    const n = marbles.length;
    for (let i = 0; i < n; i++) {
      const m = marbles[i];
      if (m.dead) continue;
      m.cd -= h;
      let ax = gLx, ay = gLy, az = gLz;
      const d = Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z) || 1e-6;
      const contact = m.y < Y_RIM + 0.05 && d > R - m.r - 0.03;
      if (contact) {
        const nx = -m.x / d, ny = -m.y / d, nz = -m.z / d;
        const an = ax * nx + ay * ny + az * nz;
        ax = an * nx + 0.714 * (ax - an * nx);
        ay = an * ny + 0.714 * (ay - an * ny);
        az = an * nz + 0.714 * (az - an * nz);
      }
      m.vx += ax * h; m.vy += ay * h; m.vz += az * h;
      if (contact) {
        const k = Math.exp(-0.3 * h);
        m.vx *= k; m.vy *= k; m.vz *= k;
        const sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz);
        const dec = 0.2 * h;
        if (sp <= dec) { m.vx = m.vy = m.vz = 0; } else { const f = (sp - dec) / sp; m.vx *= f; m.vy *= f; m.vz *= f; }
      } else {
        const k = Math.exp(-0.04 * h);
        m.vx *= k; m.vy *= k; m.vz *= k;
      }
      m.x += m.vx * h; m.y += m.vy * h; m.z += m.vz * h;
      if (m.y > 7) { m.y = 7; if (m.vy > 0) m.vy = 0; }
    }
    solvePairs(true);
    solvePairs(false);
    for (let i = 0; i < n; i++) {
      const m = marbles[i];
      if (m.dead) continue;
      boundMarble(m, true);
      // rolling: angular velocity relaxes toward the no-slip value while touching the bowl
      const d = Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z) || 1e-6;
      if (m.y < Y_RIM + 0.05 && d > R - m.r - 0.03) {
        const nx = -m.x / d, ny = -m.y / d, nz = -m.z / d;
        const wrx = (ny * m.vz - nz * m.vy) / m.r;
        const wry = (nz * m.vx - nx * m.vz) / m.r;
        const wrz = (nx * m.vy - ny * m.vx) / m.r;
        const wn = m.wx * nx + m.wy * ny + m.wz * nz;
        const tx = m.wx - wn * nx, ty = m.wy - wn * ny, tz = m.wz - wn * nz;
        const k = Math.min(1, 18 * h);
        const sn = wn * (1 - 0.6 * h);
        m.wx = tx + (wrx - tx) * k + sn * nx;
        m.wy = ty + (wry - ty) * k + sn * ny;
        m.wz = tz + (wrz - tz) * k + sn * nz;
      } else {
        const k = 1 - 0.05 * h;
        m.wx *= k; m.wy *= k; m.wz *= k;
      }
    }
  }

  // ---------- input ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitV = new THREE.Vector3();
  function setRay(px, py) {
    ndc.set((px / stage.width) * 2 - 1, -(py / stage.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  let press = null;
  function setTiltTarget(p) {
    setRay(p.x, p.y);
    planeY.constant = -0.9;
    if (!raycaster.ray.intersectPlane(planeY, hitV)) return;
    const len = Math.hypot(hitV.x, hitV.z);
    if (len < 1e-4) { tilt.tx = tilt.tz = 0; return; }
    const ang = TILT_MAX * clamp((len - 0.25) / 2.6, 0, 1);
    tilt.tx = (hitV.x / len) * ang;
    tilt.tz = (hitV.z / len) * ang;
  }

  function tapAt(p) {
    setRay(p.x, p.y);
    // poke a marble?
    let best = null, bestT = 1e9;
    for (const m of marbles) {
      if (m.dead) continue;
      tmpV.set(m.x, m.y, m.z).applyMatrix4(bowl.matrixWorld);
      const oc = tmpV.clone().sub(raycaster.ray.origin);
      const t = oc.dot(raycaster.ray.direction);
      if (t < 0) continue;
      const d2 = oc.lengthSq() - t * t;
      const rr = m.r * 1.15;
      if (d2 < rr * rr && t < bestT) { bestT = t; best = m; }
    }
    if (best) {
      const dir = raycaster.ray.direction.clone().applyQuaternion(qi);
      best.vx += dir.x * 3.2 + rand(-0.3, 0.3);
      best.vy += dir.y * 3.2 + 3.4;
      best.vz += dir.z * 3.2 + rand(-0.3, 0.3);
      best.wx += rand(-6, 6); best.wy += rand(-6, 6); best.wz += rand(-6, 6);
      spawnGlints(best.x, best.y, best.z, 5, palMats(palIdx)[best.ci].light, 0.9);
      return;
    }
    planeY.constant = -(center.y + 0.5);
    if (!raycaster.ray.intersectPlane(planeY, hitV)) return;
    tmpV.copy(hitV).sub(center).applyQuaternion(qi);
    const rho = Math.hypot(tmpV.x, tmpV.z);
    if (rho > RHO_RIM * 1.3) return; // tapped the table, not the glass
    const k = rho > RHO_RIM * 0.82 ? (RHO_RIM * 0.82) / rho : 1;
    dropMarble(tmpV.x * k, tmpV.z * k);
    audio.haptic?.(8);
  }

  const tracker = track(root, {
    down(p) {
      audio.unlock?.();
      if (press) return;
      press = { id: p.id, x: p.x, y: p.y, t: performance.now(), drag: false };
    },
    move(p) {
      if (!press || press.id !== p.id) return;
      if (!press.drag && Math.hypot(p.x - press.x, p.y - press.y) > 7) press.drag = true;
      if (press.drag) setTiltTarget(p);
    },
    up(p) {
      if (!press || press.id !== p.id) return;
      const wasDrag = press.drag;
      const quick = performance.now() - press.t < 600;
      press = null;
      tilt.tx = tilt.tz = 0;
      if (!wasDrag && quick) tapAt(p);
    },
  });

  // ---------- HUD ----------
  hud.segmented({
    label: 'Glass',
    options: PALETTES.map((p, i) => ({ id: String(i), label: p.name })),
    value: String(palIdx),
    onChange: (id) => setPalette(+id),
  });
  hud.button({
    label: 'Shake', title: 'Rattle the bowl',
    onClick: () => {
      audio.unlock?.();
      for (const m of marbles) {
        if (m.dead) continue;
        m.vx += rand(-3.5, 3.5);
        m.vy += rand(3.5, 8.5);
        m.vz += rand(-3.5, 3.5);
        m.wx += rand(-8, 8); m.wy += rand(-8, 8); m.wz += rand(-8, 8);
      }
      tilt.vx += rand(-1.4, 1.4);
      tilt.vz += rand(-1.4, 1.4);
      if (audio.ready) {
        audio.burst(bus, { kind: 'pink', dur: 0.4, attack: 0.03, gain: 0.12, type: 'bandpass', freq: 900, freqEnd: 2600, q: 0.8, send: 0.25 });
      }
    },
  });
  hud.button({ label: 'Add 10', title: 'Pour in ten more', onClick: () => { audio.unlock?.(); queueDrops(10, 0.08); } });
  hud.button({
    label: 'Reset', title: 'Empty the bowl and pour a fresh handful',
    onClick: () => {
      audio.unlock?.();
      spawnQueue.length = 0;
      for (const m of marbles) killMarble(m);
      queueDrops(Math.min(20, Math.round(cap * 0.5)), 0.07, 0.35);
    },
  });
  hud.setHint('Drag to tilt the bowl. Tap the glass to drop a marble, tap a marble to flick it.');

  // initial pour
  queueDrops(Math.min(22, Math.round(cap * 0.55)), 0.09, 0.45);

  // ---------- frame ----------
  const cA = new THREE.Color();
  const loop = createLoop((dt, time) => {
    // tilt spring (critically-ish damped, overshoots a little => marbles slosh)
    {
      const sub = 2;
      const h = dt / sub;
      for (let s = 0; s < sub; s++) {
        tilt.ax = SPRING_W * SPRING_W * (tilt.tx - tilt.x) - 2 * SPRING_Z * SPRING_W * tilt.vx;
        tilt.az = SPRING_W * SPRING_W * (tilt.tz - tilt.z) - 2 * SPRING_Z * SPRING_W * tilt.vz;
        tilt.vx += tilt.ax * h; tilt.vz += tilt.az * h;
        tilt.x += tilt.vx * h; tilt.z += tilt.vz * h;
      }
      const m = Math.hypot(tilt.x, tilt.z);
      if (m > 0.62) { tilt.x *= 0.62 / m; tilt.z *= 0.62 / m; }
    }
    updateBowlTransform();
    // gravity + pseudo force from the bowl's own motion, in bowl-local space
    tmpV.set(-tilt.ax * RO * 0.9 * 0.7, -G, -tilt.az * RO * 0.9 * 0.7).applyQuaternion(qi);
    gLx = tmpV.x; gLy = tmpV.y; gLz = tmpV.z;

    // queued drops
    for (let i = spawnQueue.length - 1; i >= 0; i--) {
      spawnQueue[i].t -= dt;
      if (spawnQueue[i].t <= 0) {
        const [x, z] = spawnQueue[i].x !== undefined ? [spawnQueue[i].x, spawnQueue[i].z] : randomSpot(0.62);
        dropMarble(x, z);
        spawnQueue.splice(i, 1);
      }
    }

    // sound budget
    tokens = Math.min(12, tokens + dt * 30);
    tokenT += dt;

    // physics
    const sub = clamp(Math.ceil(dt / 0.0045), 2, 8);
    const h = dt / sub;
    for (let s = 0; s < sub; s++) step(h);

    // update visuals + collect rolling stats
    let rollSum = 0;
    let rollXs = 0;
    let moving = 0;
    for (let i = marbles.length - 1; i >= 0; i--) {
      const m = marbles[i];
      if (m.dead) {
        m.dieT += dt;
        const k = 1 - m.dieT / 0.22;
        if (k <= 0) {
          bowl.remove(m.group);
          marbles.splice(i, 1);
          hud.setStat?.(`${liveCount()} marbles`);
          continue;
        }
        m.group.scale.setScalar(Math.max(0.01, k));
        continue;
      }
      m.age += dt;
      if (m.pop < 1) {
        m.pop = Math.min(1, m.pop + dt / 0.14);
        const e = 1 - Math.pow(1 - m.pop, 3);
        m.group.scale.setScalar(Math.max(0.01, e));
      }
      m.group.position.set(m.x, m.y, m.z);
      const wl = Math.hypot(m.wx, m.wy, m.wz);
      if (wl > 1e-3) {
        axisV.set(m.wx / wl, m.wy / wl, m.wz / wl);
        dq.setFromAxisAngle(axisV, wl * dt);
        m.q.premultiply(dq).normalize();
        m.core.quaternion.copy(m.q);
      }
      const sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz);
      const d = Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z);
      if (m.y < Y_RIM + 0.05 && d > R - m.r - 0.05) {
        const wgt = Math.min(sp, 7) * (m.r / 0.22);
        rollSum += wgt;
        const e = bowl.matrixWorld.elements;
        rollXs += wgt * (e[0] * m.x + e[4] * m.y + e[8] * m.z + e[12]);
      }
      // gentle "settle" tick when a fast marble comes to rest
      if (sp > 0.5) m.calm = 0.001 + Math.max(m.calm, 0.0);
      if (sp < 0.04) {
        if (m.calm > 0.0005) {
          m.calm = 0;
          if (Math.random() < 0.35) settleTick(m);
        }
      }
      if (sp > 0.15) moving++;
    }
    rollE = rollSum;
    rollX = rollSum > 0.01 ? rollXs / rollSum : 0;

    // rolling audio
    if (audio.ready && rollLow) {
      const e = 1 - Math.exp(-rollE / 7);
      const pan = clamp(rollX / 2.2, -0.8, 0.8);
      rollLow.set({ gain: 0.2 * Math.pow(e, 1.15), freq: 240 + 760 * e, pan }, 0.06);
      rollGrit.set({ gain: 0.045 * Math.pow(e, 1.6), freq: 1700 + 2300 * e, pan }, 0.06);
      rollRes.set({ gain: 0.03 * Math.pow(e, 1.3), freq: 640 + 360 * e, pan }, 0.08);
    }

    // caustic glows
    let cn = 0;
    for (const m of marbles) {
      if (m.dead && m.dieT > 0.1) continue;
      tmpV.set(m.x, m.y, m.z).applyMatrix4(bowl.matrixWorld);
      const f = tmpV.y / keyDir.y;
      cPos[cn * 3] = tmpV.x - keyDir.x * f;
      cPos[cn * 3 + 1] = 0.012;
      cPos[cn * 3 + 2] = tmpV.z - keyDir.z * f;
      const mm = palMats(palIdx)[m.ci];
      cA.copy(mm.base).lerp(mm.light, 0.2);
      const k = 0.2 * (m.dead ? 0 : Math.min(1, m.pop));
      cCol[cn * 3] = cA.r * k; cCol[cn * 3 + 1] = cA.g * k; cCol[cn * 3 + 2] = cA.b * k;
      cSize[cn] = m.r * 2.9;
      cn++;
      if (cn >= maxPts) break;
    }
    cGeo.setDrawRange(0, cn);
    cGeo.attributes.position.needsUpdate = true;
    cGeo.attributes.aColor.needsUpdate = true;
    cGeo.attributes.aSize.needsUpdate = true;
    cMat.uniforms.uScale.value = stage.height / (2 * Math.tan((FOV * Math.PI) / 360));

    // contact blob follows the bowl
    blob.position.x = center.x + 0.5;
    blob.position.z = center.z - 0.4;
    // ambient motes in the light
    moteClock -= dt;
    if (moteClock <= 0) {
      moteClock = rand(0.18, 0.5);
      motes.spawn(rand(-3.2, 3.2), rand(0.4, 3.6), rand(-2.5, 2.5), rand(-0.03, 0.03), rand(0.03, 0.12), rand(-0.03, 0.03), moteColor, rand(0.4, 1.0), rand(6, 10));
    }
    motes.update(dt, stage.height, FOV);
    dust.update(dt, stage.height, FOV);

    placeCamera(time);
    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      window.removeEventListener('hush:ambience', onAmb);
      rollLow?.stop(0.15);
      rollGrit?.stop(0.15);
      rollRes?.stop(0.15);
      pad?.stop(0.6);
      vignette.remove();
      for (const arr of palCache.values()) {
        for (const e of arr) { e.tex.dispose(); e.core.dispose(); e.shell.dispose(); }
      }
      palCache.clear();
      woodTex.dispose();
      blobTex.dispose();
      shellGeo.dispose();
      coreGeo.dispose();
      bowlGeo.dispose();
      cGeo.dispose();
      cMat.dispose();
      specMat.dispose();
      bowlTintMat.dispose();
      bowlSpecMat.dispose();
      stage.dispose();
    },
  };
}

function clampInt(v, a, b) {
  return Math.max(a, Math.min(b, v | 0));
}
