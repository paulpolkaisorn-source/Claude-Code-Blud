# Gummy Bears: Prompt Pack for Gemini

Build the jelly gummy bear page (soft-body physics + sound effects) with a Gemini model, one stage at a time.

## How to use it

1. Start a **new chat** with Gemini and paste **Prompt 1**. It contains our tested starting file, so also save that `html` block as `gummy-bears.html` and open it in Chrome: you should see 7 glossy bears standing in the studio.
2. Paste **Prompt 2**. Save the file it returns over `gummy-bears.html`, open it, and check the stage's ACCEPTANCE list.
3. Works? Paste the next prompt. Broken? Use the **Fix prompt** with the console error (in Chrome: F12, then the Console tab). One stage per message, always.
4. If a reply stops mid-file, use the **Continue prompt**.
5. Test on a computer first. Phones hide error messages.

Stage 2 (the physics) is the hardest. Expect 1 to 3 fix rounds there, and that is normal.


## Prompt 1: Master brief + starting file

````text
You are a senior real-time graphics and physics engineer. You write complete, working code and you check it before you send it. We will build ONE thing together in 5 stages. Follow this brief exactly, in every reply, for the whole conversation.

# THE PRODUCT
A single HTML file: 3D see-through jelly gummy bears with REAL soft-body physics, made with three.js. You can drag a bear to squish and fling it, tap empty space to drop a new bear, press Shake / Reset, change the jiggliness with a slider, and hear squishy sound effects. It must look like a candy commercial ("studio product render") and the bears must wobble, squash and settle like real jelly.

# HARD RULES (breaking one = wrong answer)
1. Always output the WHOLE file in ONE ```html code block. Every line, every time. NEVER write "...", "// rest unchanged", "// same as before", "// TODO" or any placeholder. If a part did not change, write it out again anyway.
2. If the file is too long for one reply, split it into PART 1, PART 2, ... at a function boundary. End each part with the line `<!-- CONTINUES IN NEXT PART -->` and wait until I say "next". Never summarize or skip code to make it fit.
3. External resources: ONLY the three.js r170 importmap already in the file and Google Fonts (Fredoka + Inter). No other libraries. NO physics libraries (no cannon, ammo, rapier, oimo): all physics is hand-written in this file.
4. Plain JavaScript inside <script type="module">. No TypeScript, no npm, no build step. The file must work when opened straight from disk in Chrome and on phones.
5. Only use three.js r170 APIs that really exist. If you are not sure an API exists, do not use it. Never invent functions.
6. Code I mark VERBATIM is tested. Paste it exactly. Do not rename, shorten, "improve" or reformat it.
7. Never remove or break something from an earlier stage. Each stage adds on top of the last.
8. Do ONLY the stage I ask for. Do not jump ahead.
9. Keep every name in the NAMES CONTRACT below exactly as written. Later stages depend on them.

# YOUR REPLY FORMAT (every stage)
1. PLAN: at most 6 short bullets.
2. The complete file in one ```html block (or PARTS, see rule 2).
3. SELF-CHECK. Answer each line with ✅, or fix the code BEFORE sending:
   - Every variable and function I use is defined, with the same spelling everywhere.
   - Brackets, braces and parentheses are balanced; the file ends with </script>, </body>, </html>.
   - Imports come only from 'three' and 'three/addons/...'.
   - No placeholder anywhere ("...", TODO, "unchanged").
   - Everything from earlier stages is still there and still wired up.
   - Every acceptance item of this stage is covered.
4. TEST: 3 to 5 things I should see when I open the file.

# STYLE LOCK: "Studio product render" (already built in Stage 1, keep it)
- Seamless cream studio backdrop #FFE7D6 (floor curving up into the back wall), warm soft shadows (never black), a soft contact blob under every bear.
- 5 flavors: red #E3122B, orange #FF7A1A, yellow #FFC61A, green #4CC22E, clear #F4EBD9. Glossy see-through MeshPhysicalMaterial (transmission 1, clearcoat 1, roughness 0.07, ior 1.46).
- UI text #3A1F14 on cream chips; Fredoka for the title, Inter for the rest. No neon, no emojis on the page, no extra UI.

# WORLD UNITS
A bear is about 2.4 units tall. The floor is the plane y = 0. Gravity is 17 units/s². The physics runs in world space.

# NAMES CONTRACT (from Stage 2 on)
- const SLOTS = 20 (storage), MAX_ALIVE = 16 (bears at once), H = 1 / 240 (physics substep, seconds)
- One World object called `world` with:
  - world.N: particles per bear (the same for every bear)
  - world.X, world.V: Float64Array(3 * world.N * SLOTS), positions and velocities. Particle i of the bear in slot s is at index 3 * (s * N + i).
  - world.t: simulated time in seconds (+H every substep)
  - world.bears[s] for s = 0..SLOTS-1: { alive, asleep, dying, grabbed, color } (color 0 red, 1 orange, 2 yellow, 3 green, 4 clear)
  - world.live: array of slots that are alive and not dying
  - world.frame(dt): advances physics by one real frame of dt seconds
  - world.hitFloor, world.hitPair: Uint8Array(SLOTS) contact flags for sound (Stage 4)
- ARENA { xmin, xmax, zmin, zmax, floor: 0, ceil: 22 } is set by layout(); the physics walls read it.
- window.__gummy (debug API, Stage 2 on): { ready, step(n), advance(seconds), stats(), spawn(color), shake(), reset() }

# STAGE 1 (already done, by me)
Below is our current file. It is tested and it works: the studio scene, the materials, the UI and the screen-fitting camera are finished, with 7 STATIC bears standing on the floor. Study it carefully: from Stage 2 on, everything builds on it.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gummy Bears</title>
<meta name="description" content="Translucent jelly gummy bears with real soft-body physics. Drag, fling and drop them.">
<meta name="theme-color" content="#FFE7D6">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='18' cy='14' r='8' fill='%23E3122B'/%3E%3Ccircle cx='46' cy='14' r='8' fill='%23E3122B'/%3E%3Ccircle cx='32' cy='30' r='18' fill='%23E3122B'/%3E%3Cellipse cx='32' cy='48' rx='15' ry='13' fill='%23E3122B'/%3E%3Ccircle cx='25' cy='27' r='2.5' fill='%233A1F14'/%3E%3Ccircle cx='39' cy='27' r='2.5' fill='%233A1F14'/%3E%3Cellipse cx='32' cy='34' rx='5' ry='3.5' fill='%23FF8F8F'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
<style>
  :root {
    --cream: #FFE7D6;
    --peach: #FBD3C0;
    --ink: #3A1F14;          /* dark warm brown text: 12.5:1 on the chips */
    --chip: rgba(255, 246, 238, 0.9);
    --chip-solid: #FFF6EE;
    --line: rgba(58, 31, 20, 0.22);
    --accent: #3A1F14;
    --accent-ink: #FFF3E8;
    --shadow: 0 6px 22px rgba(120, 52, 30, 0.16), 0 1px 3px rgba(120, 52, 30, 0.18);
    --gutter: 16px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--cream); color: var(--ink); overflow: hidden; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; }
  #stage { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; outline: none; background: var(--cream); user-select: none; -webkit-user-select: none; }
  #stage.grabbing { cursor: grabbing; }
  .ui { position: fixed; inset: 0; pointer-events: none; padding: max(var(--gutter), env(safe-area-inset-top)) max(var(--gutter), env(safe-area-inset-right)) max(var(--gutter), env(safe-area-inset-bottom)) max(var(--gutter), env(safe-area-inset-left)); display: flex; flex-direction: column; justify-content: space-between; }
  .head { align-self: flex-start; max-width: min(100%, 560px); }
  h1 { margin: 0; font: 600 clamp(26px, 4.6vw, 40px)/1.05 'Fredoka', 'Inter', system-ui, sans-serif; letter-spacing: 0.005em; color: var(--ink); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55); }
  .hint { display: inline-block; margin: 8px 0 0; padding: 6px 12px; font-size: 13.5px; line-height: 1.35; font-weight: 500; background: var(--chip); border-radius: 999px; box-shadow: var(--shadow); color: var(--ink); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
  .bar { pointer-events: auto; align-self: center; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px 14px; padding: 10px 12px; max-width: 100%; background: var(--chip); border-radius: 22px; box-shadow: var(--shadow); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .btns { display: flex; gap: 8px; }
  .btn { appearance: none; white-space: nowrap; font: 600 15px/1 'Inter', system-ui, sans-serif; color: var(--ink); background: var(--chip-solid); border: 1.5px solid var(--line); border-radius: 999px; padding: 11px 18px; min-height: 44px; cursor: pointer; transition: transform .12s ease, background .12s ease, box-shadow .12s ease; touch-action: manipulation; }
  .btn:hover { background: #fff; box-shadow: 0 2px 8px rgba(120, 52, 30, 0.18); }
  .btn:active { transform: scale(0.96); }
  .btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .btn.primary:hover { background: #55301f; }
  .btn:focus-visible, .slider input:focus-visible { outline: 3px solid #3A1F14; outline-offset: 3px; }
  .row2 { display: flex; align-items: center; gap: 12px; }
  .btn.icon { width: 44px; height: 44px; min-height: 44px; padding: 0; flex: 0 0 44px; display: grid; place-items: center; }
  .btn.icon svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .btn.icon .spk { fill: currentColor; }
  .btn.icon[aria-pressed="false"] .wave, .btn.icon[aria-pressed="true"] .mute { display: none; }
  .slider { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--ink); }
  .slider .name { font-family: 'Fredoka', 'Inter', sans-serif; font-weight: 600; font-size: 16px; }
  .slider .end { font-weight: 500; font-size: 12.5px; }
  .slider input { -webkit-appearance: none; appearance: none; width: clamp(110px, 22vw, 190px); height: 28px; background: transparent; margin: 0; cursor: pointer; touch-action: pan-y; }
  .slider input::-webkit-slider-runnable-track { height: 8px; border-radius: 999px; background: linear-gradient(90deg, #F7B8A3, #C8644A); border: 1px solid var(--line); }
  .slider input::-moz-range-track { height: 8px; border-radius: 999px; background: linear-gradient(90deg, #F7B8A3, #C8644A); border: 1px solid var(--line); }
  .slider input::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; margin-top: -10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff 0 18%, #FF6B5E 19% 100%); border: 2px solid var(--ink); box-shadow: 0 2px 6px rgba(58, 31, 20, 0.35); }
  .slider input::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff 0 18%, #FF6B5E 19% 100%); border: 2px solid var(--ink); box-shadow: 0 2px 6px rgba(58, 31, 20, 0.35); }
  .toast { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 12px 18px; border-radius: 16px; background: var(--chip-solid); color: var(--ink); font-weight: 600; box-shadow: var(--shadow); pointer-events: none; max-width: calc(100% - 32px); text-align: center; }
  .toast[hidden] { display: none; }
  .sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (max-width: 560px) {
    :root { --gutter: 14px; }
    .hint { font-size: 12.5px; padding: 6px 11px; }
    .bar { width: 100%; border-radius: 20px; padding: 9px 10px; gap: 8px 12px; }
    .btns { width: 100%; }
    .btn { flex: 1; padding: 11px 8px; font-size: 14.5px; }
    .row2 { width: 100%; gap: 10px; }
    .slider { flex: 1; min-width: 0; justify-content: space-between; gap: 8px; }
    .slider input { flex: 1; width: auto; min-width: 0; }
  }
  @media (max-width: 360px) { .slider .end { display: none; } }
  @media (max-width: 340px) { .btn { padding: 11px 4px; font-size: 13.5px; } }
  @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
</style>
</head>
<body>
<canvas id="stage" tabindex="0" role="img" aria-label="Interactive 3D scene of translucent gummy bears. Drag a bear to squish and fling it; tap empty space to drop a new bear."></canvas>
<div class="ui">
  <header class="head">
    <h1>Gummy Bears</h1>
    <p class="hint">Drag to squish &amp; fling &middot; Tap empty space to drop a bear</p>
  </header>
  <div class="bar" role="group" aria-label="Controls">
    <div class="btns">
      <button class="btn primary" id="btnDrop" type="button">Drop bear</button>
      <button class="btn" id="btnShake" type="button">Shake</button>
      <button class="btn" id="btnReset" type="button">Reset</button>
    </div>
    <div class="row2">
      <label class="slider" for="jiggle">
        <span class="name">Jiggle</span>
        <span class="end" aria-hidden="true">Wobbly</span>
        <input id="jiggle" type="range" min="0" max="100" step="1" value="35" aria-label="Jiggle, from wobbly to firm">
        <span class="end" aria-hidden="true">Firm</span>
      </label>
      <button class="btn icon" id="btnSound" type="button" aria-pressed="true" title="Mute sound effects">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="wave" d="M15.5 9a4.5 4.5 0 0 1 0 6"/><path class="wave" d="M18.5 6.5a8 8 0 0 1 0 11"/><path class="mute" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
        <span class="sr">Sound effects</span>
      </button>
    </div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite">Loading the jelly&hellip;</div>
<noscript><div class="toast">This page needs JavaScript and WebGL2 to show 3D gummy bears.</div></noscript>
<script type="module">
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('stage');
const toastEl = document.getElementById('toast');
const DEG = Math.PI / 180;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let dpr = Math.min(window.devicePixelRatio || 1, 2); // layout() reads this
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xffe7d6, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 220);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
scene.environment = envTex;
pmrem.dispose();

const key = new THREE.DirectionalLight(0xfff0e2, 2.6);
key.position.set(-4.5, 11.5, -3.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 2;
key.shadow.camera.far = 40;
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xffd6c4, 1.0);
rim.position.set(6, 6, 9);
scene.add(rim);

const ARENA = { xmin: -4.6, xmax: 4.6, zmin: -2.4, zmax: 1.9, floor: 0, ceil: 22 }; // layout() resizes it
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
/* ---------- signed distance field of one gummy bear (local space, faces +z) ---------- */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function sdEll(px, py, pz, rx, ry, rz) {
  const qx = px / rx, qy = py / ry, qz = pz / rz;
  const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  const wx = qx / rx, wy = qy / ry, wz = qz / rz;
  const k1 = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (k1 < 1e-12) return -Math.min(rx, ry, rz);
  return (k0 * (k0 - 1)) / k1;
}
function sdCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  let t = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = pax - bax * t, dy = pay - bay * t, dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * t);
}
function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r, qz = Math.abs(pz) - bz + r;
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
  return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function bearSDF(x, y, z) {
  const ax = Math.abs(x); // left/right symmetric
  let d = sdEll(x, y + 0.24, z, 0.64, 0.78, 0.5); // chubby body
  d = smin(d, sdRoundBox(x, y + 0.82, z - 0.02, 0.6, 0.26, 0.54, 0.25), 0.2); // broad, softly rounded seat: butt + hips
  d = smin(d, sdEll(x, y - 0.8, z - 0.03, 0.54, 0.47, 0.47), 0.24); // head
  d = smin(d, sdEll(x, y - 0.68, z - 0.42, 0.22, 0.165, 0.2), 0.12); // snout
  d = smin(d, sdEll(ax - 0.4, y - 1.17, z + 0.02, 0.2, 0.2, 0.13), 0.1); // ears
  d = smin(d, sdCone(ax, y, z, 0.5, 0.3, 0.02, 0.84, -0.02, 0.17, 0.2, 0.155), 0.15); // arms
  d = smin(d, sdCone(ax, y, z, 0.32, -0.6, 0.0, 0.42, -0.9, 0.34, 0.29, 0.25), 0.17); // legs / feet (feet point forward a little: a stable stance)
  d = smin(d, sdEll(ax - 0.19, y - 0.93, z - 0.4, 0.06, 0.06, 0.06), 0.05); // eye bumps
  d = smin(d, sdEll(x, y - 0.74, z - 0.61, 0.085, 0.06, 0.065), 0.05); // nose bump
  // flat sole: smooth intersection with the half space y > -1.04 (butt and both feet touch down together)
  const cut = -(y + 1.04);
  const k = 0.12, hh = Math.max(k - Math.abs(d - cut), 0) / k;
  return Math.max(d, cut) + hh * hh * k * 0.25;
}
function sdfGrad(f, x, y, z, out, e) {
  e = e || 0.002;
  out[0] = f(x + e, y, z) - f(x - e, y, z);
  out[1] = f(x, y + e, z) - f(x, y - e, z);
  out[2] = f(x, y, z + e) - f(x, y, z - e);
  const k = 1 / (2 * e);
  out[0] *= k; out[1] *= k; out[2] *= k;
}
/* ---------- surface nets polygonizer (own implementation, no lookup tables) ---------- */
function surfaceNets(f, min, max, h) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1;
  const ny = Math.ceil((max[1] - min[1]) / h) + 1;
  const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) F[x + nx * (y + ny * z)] = f(min[0] + x * h, min[1] + y * h, min[2] + z * h);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cell = new Int32Array(cx * cy * cz).fill(-1);
  const verts = [];
  const CORNER = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDGE = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float64Array(8);
  for (let z = 0; z < cz; z++)
    for (let y = 0; y < cy; y++)
      for (let x = 0; x < cx; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = F[x + CORNER[c][0] + nx * (y + CORNER[c][1] + ny * (z + CORNER[c][2]))];
          val[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EDGE[e][0], b = EDGE[e][1];
          const va = val[a], vb = val[b];
          if (va < 0 !== vb < 0) {
            const t = va / (va - vb);
            sx += CORNER[a][0] + t * (CORNER[b][0] - CORNER[a][0]);
            sy += CORNER[a][1] + t * (CORNER[b][1] - CORNER[a][1]);
            sz += CORNER[a][2] + t * (CORNER[b][2] - CORNER[a][2]);
            n++;
          }
        }
        cell[x + cx * (y + cy * z)] = verts.length / 3;
        verts.push(min[0] + (x + sx / n) * h, min[1] + (y + sy / n) * h, min[2] + (z + sz / n) * h);
      }
  const tris = [];
  const ci = (x, y, z) => cell[x + cx * (y + cy * z)];
  const dist2 = (a, b) => {
    const dx = verts[3 * a] - verts[3 * b], dy = verts[3 * a + 1] - verts[3 * b + 1], dz = verts[3 * a + 2] - verts[3 * b + 2];
    return dx * dx + dy * dy + dz * dz;
  };
  function quad(a, b, c, d, flip) {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) { const t = b; b = d; d = t; }
    if (dist2(a, c) <= dist2(b, d)) tris.push(a, b, c, a, c, d);
    else tris.push(a, b, d, b, c, d);
  }
  // x-edges (outward normal of the cyclic cell order is +x)
  for (let z = 1; z < cz; z++)
    for (let y = 1; y < cy; y++)
      for (let x = 0; x < cx; x++) {
        const a = F[x + nx * (y + ny * z)], b = F[x + 1 + nx * (y + ny * z)];
        if (a < 0 === b < 0) continue;
        quad(ci(x, y - 1, z - 1), ci(x, y, z - 1), ci(x, y, z), ci(x, y - 1, z), !(a < 0));
      }
  // y-edges (cyclic order gives -y)
  for (let z = 1; z < cz; z++)
    for (let y = 0; y < cy; y++)
      for (let x = 1; x < cx; x++) {
        const a = F[x + nx * (y + ny * z)], b = F[x + nx * (y + 1 + ny * z)];
        if (a < 0 === b < 0) continue;
        quad(ci(x - 1, y, z - 1), ci(x, y, z - 1), ci(x, y, z), ci(x - 1, y, z), a < 0);
      }
  // z-edges (+z)
  for (let z = 0; z < cz; z++)
    for (let y = 1; y < cy; y++)
      for (let x = 1; x < cx; x++) {
        const a = F[x + nx * (y + ny * z)], b = F[x + nx * (y + ny * (z + 1))];
        if (a < 0 === b < 0) continue;
        quad(ci(x - 1, y - 1, z), ci(x, y - 1, z), ci(x, y, z), ci(x - 1, y, z), !(a < 0));
      }
  // project every vertex onto the exact surface (a few Newton steps along the gradient)
  const g = [0, 0, 0];
  const nv = verts.length / 3;
  const pos = new Float32Array(verts.length);
  const nor = new Float32Array(verts.length);
  for (let i = 0; i < nv; i++) {
    let x = verts[3 * i], y = verts[3 * i + 1], z = verts[3 * i + 2];
    for (let it = 0; it < 3; it++) {
      const d = f(x, y, z);
      sdfGrad(f, x, y, z, g);
      const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] + 1e-12;
      let s = d / gg;
      const mv = Math.abs(s) * Math.sqrt(gg);
      if (mv > 0.6 * h) s *= (0.6 * h) / mv;
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    sdfGrad(f, x, y, z, g);
    const il = 1 / (Math.hypot(g[0], g[1], g[2]) + 1e-12);
    pos[3 * i] = x; pos[3 * i + 1] = y; pos[3 * i + 2] = z;
    nor[3 * i] = g[0] * il; nor[3 * i + 1] = g[1] * il; nor[3 * i + 2] = g[2] * il;
  }
  return { pos, nor, idx: Uint32Array.from(tris) };
}
const CYC = { z0: -6.5, R: 9, front: 46, wallH: 70, halfW: 90 };
function buildCyclorama() {
  const prof = []; // [z, y, nz, ny]
  prof.push([CYC.front, 0, 0, 1]);
  for (let z = CYC.front - 4; z > CYC.z0; z -= 4) prof.push([z, 0, 0, 1]);
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 0.5;
    prof.push([CYC.z0 - CYC.R * Math.sin(th), CYC.R * (1 - Math.cos(th)), Math.sin(th), Math.cos(th)]);
  }
  prof.push([CYC.z0 - CYC.R, CYC.wallH, 1, 0]);
  const pos = [], nor = [], idx = [];
  prof.forEach((p, i) => {
    pos.push(-CYC.halfW, p[1], p[0], CYC.halfW, p[1], p[0]);
    nor.push(0, p[3], p[2], 0, p[3], p[2]);
    if (i > 0) { const a = 2 * (i - 1), b = a + 1, c = 2 * i, d = c + 1; idx.push(a, c, b, b, c, d); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
const tmpV = new THREE.Vector3();
let layoutPt = 0; // 0 = landscape ... 1 = tall phone (the opening layout reads it)
function layout() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = aspect;
  const pt = clamp((1.3 - aspect) / (1.3 - 0.5), 0, 1); // 0 = landscape, 1 = tall phone
  layoutPt = pt;
  camera.fov = lerp(26, 34, pt);
  const pitch = lerp(26, 43, pt) * DEG;
  const hx = lerp(clamp(2.25 * aspect, 2.05, 5.0), 2.4, pt);
  // a tall phone gets a deep, narrow arena: the bears stack up the screen (more height to fill) instead of leaving empty bands
  const zf = lerp(1.9, 5.2, pt), zb = lerp(2.4, 6.0, pt);
  const arena = { xmin: -hx, xmax: hx, zmin: -zb, zmax: zf, floor: 0, ceil: 22 };
  Object.assign(ARENA, arena); // the physics reads ARENA
  // safe rectangle in NDC (keep clear of the title and the control bar)
  const head = document.querySelector('.head').getBoundingClientRect();
  const bar = document.querySelector('.bar').getBoundingClientRect();
  const topPx = head.bottom + 8, botPx = h - bar.top + 8;
  const yTop = 1 - (2 * topPx) / h, yBot = -1 + (2 * botPx) / h;
  const xs = 0.965;
  const bearH = 2.5;
  const corners = [];
  for (const x of [-hx, hx]) for (const z of [-zb, zf]) { corners.push([x, 0, z]); corners.push([x, bearH, z]); }
  const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
  const tgt = new THREE.Vector3();
  const tanH = Math.tan(0.5 * camera.fov * DEG);
  // put the camera `d` away from a look-at point at height ty and test whether the whole arena box lands inside the safe rectangle
  const place = (d, ty) => {
    tgt.set(0, ty, (zf - zb) * 0.5);
    camera.position.copy(tgt).addScaledVector(dir, d);
    camera.lookAt(tgt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    let minX = 9, maxX = -9, minY = 9, maxY = -9;
    for (const c of corners) { tmpV.set(c[0], c[1], c[2]).project(camera); minX = Math.min(minX, tmpV.x); maxX = Math.max(maxX, tmpV.x); minY = Math.min(minY, tmpV.y); maxY = Math.max(maxY, tmpV.y); }
    return { ok: maxX <= xs && minX >= -xs && maxY <= yTop && minY >= yBot, minY, maxY };
  };
  // slide the look-at point so the box sits in the middle of the safe rectangle (vertical NDC shift ~ dy / (d * tan(fov/2)), so a few steps)
  const centre = (d, steps) => {
    let ty = bearH * 0.38, f = place(d, ty);
    for (let i = 0; i < steps; i++) {
      const mid = 0.5 * (f.minY + f.maxY), want = 0.5 * (yTop + yBot);
      if (Math.abs(mid - want) < 1e-4) break;
      ty = clamp(ty - (want - mid) * d * tanH * 0.9, -2, 4);
      f = place(d, ty);
    }
    return f;
  };
  let lo = 6, hi = 120;
  for (let i = 0; i < 40; i++) { const mid = 0.5 * (lo + hi); if (place(mid, bearH * 0.38).ok) hi = mid; else lo = mid; }
  const dFixed = hi; // closest distance when the look-at point stays put (the landscape framing)
  let dCentred = dFixed;
  if (pt > 0) { // portrait: search with the box re-centred at every distance, which lets the camera come closer
    lo = 6; hi = dFixed;
    for (let i = 0; i < 40; i++) { const mid = 0.5 * (lo + hi); if (centre(mid, 6).ok) hi = mid; else lo = mid; }
    dCentred = hi;
  }
  centre(lerp(dFixed, dCentred, pt) * 1.015, pt > 0 ? 6 : 1);
  // key light shadow frustum hugging the arena
  const half = Math.hypot(hx, Math.max(zf, zb)) + 3.2;
  const sc = key.shadow.camera;
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
  sc.updateProjectionMatrix();
  key.target.position.set(0, 0, (zf - zb) * 0.5);
  key.position.set(-4.5, 11.5, -3.6 + (zf - zb) * 0.5);
}
// 7 opening spots [x, z] spread over the current ARENA (call after layout()); far row first
function openingSpots(rnd = Math.random) {
  const a = ARENA, W = a.xmax - a.xmin;
  const cols = clamp(Math.floor((W - 0.4) / 2.2), 2, 4);
  const counts = cols === 2 ? [2, 1, 2, 2] : cols === 3 ? [2, 3, 2] : [3, 4];
  const sx = Math.min(2.45, (W - 1.9) / Math.max(1, Math.max(...counts) - 1));
  const inset = lerp(1.0, 0.6, layoutPt); // near and far rows sit this far inside the walls
  const pts = [];
  counts.forEach((count, r) => {
    const z = counts.length > 1 ? lerp(a.zmin + inset, a.zmax - inset, r / (counts.length - 1)) : 0.5 * (a.zmin + a.zmax);
    for (let i = 0; i < count; i++) pts.push([(i - (count - 1) / 2) * sx + (rnd() - 0.5) * 0.3, z + (rnd() - 0.5) * 0.3]);
  });
  return pts.sort((p, q) => p[1] - q[1]);
}

// backdrop: unlit so it shows exactly #FFE7D6 (toneMapped: false), plus a shadow-catcher floor for warm, soft shadows
const backdrop = new THREE.Mesh(buildCyclorama(), new THREE.MeshBasicMaterial({ color: 0xffe7d6, toneMapped: false, side: THREE.DoubleSide }));
backdrop.frustumCulled = false;
scene.add(backdrop);
const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x8a4a33, opacity: 0.22 }));
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.position.y = 0.001;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

// soft contact shadow texture (one shared radial gradient) for the blob under each bear
function makeBlobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(120, 52, 30, 0.55)');
  grd.addColorStop(0.55, 'rgba(120, 52, 30, 0.22)');
  grd.addColorStop(1, 'rgba(120, 52, 30, 0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blobTex = makeBlobTexture();
const blobGeo = new THREE.PlaneGeometry(2.3, 1.7);

const FLAVORS = [
  { name: 'red', hex: '#E3122B', dist: 0.9 },
  { name: 'orange', hex: '#FF7A1A', dist: 0.9 },
  { name: 'yellow', hex: '#FFC61A', dist: 0.9 },
  { name: 'green', hex: '#4CC22E', dist: 0.9 },
  { name: 'clear', hex: '#F4EBD9', dist: 2.6 },
];
function makeBearMaterial(f) {
  const c = new THREE.Color(f.hex);
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.07, metalness: 0, transmission: 1, thickness: 1.0, ior: 1.46,
    attenuationColor: c, attenuationDistance: f.dist, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: c, emissiveIntensity: f.name === 'clear' ? 0.03 : 0.2, envMapIntensity: 1, side: THREE.DoubleSide,
  });
}
const bearMats = FLAVORS.map(makeBearMaterial);

const rest = surfaceNets(bearSDF, [-1.12, -1.3, -0.72], [1.12, 1.5, 0.84], 0.066);
const bears = [];
const colors = [0, 1, 2, 3, 4, 0, 2];
function placeStatic() {
  openingSpots().forEach((p, i) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(rest.pos.slice(), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(rest.nor.slice(), 3));
    g.setIndex(new THREE.BufferAttribute(rest.idx, 1));
    const m = new THREE.Mesh(g, bearMats[colors[i]]);
    m.castShadow = true;
    m.position.set(p[0], 1.04, p[1]);
    m.rotation.y = (Math.random() - 0.5) * 0.8;
    scene.add(m);
    const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(p[0], 0.002, p[1]);
    scene.add(blob);
    bears.push(m);
  });
}
window.addEventListener('resize', () => layout());
layout();
placeStatic();
let first = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (first) { first = false; toastEl.hidden = true; window.__gummy = { ready: true }; }
});

</script>
</body>
</html>
```

YOUR TASK NOW: do not write code yet. Reply with:
1. "READY"
2. A 6-line summary of how this file is organised (which parts do what).
3. The names of the functions and objects you will reuse in Stage 2 (for example surfaceNets, bearSDF, rest, layout, openingSpots, ARENA, bearMats, blobTex).
Then wait for Stage 2.
````

## Prompt 2: Stage 2, soft-body physics

````text
STAGE 2: real soft-body jelly physics. Bears drop in one by one, land with a squash, wobble, and settle.
Start from the current file. Keep everything from Stage 1 (look, UI, layout, shadows). Replace the 7 static bears with simulated ones. Follow the NAMES CONTRACT. Reply in the format from the master brief, with the WHOLE file.

## 2.1 The rig: built once at startup, shared by all bears
1. Particles: sample a symmetric grid inside the bear. This exact loop gives about 172 particles:
   for z from -0.7 to 0.84 step 0.2, for y from -1.2 to 1.46 step 0.2, for x from 0.1 to 1.1 step 0.2:
     if bearSDF(x, y, z) < -0.07: add (x, y, z) AND its mirror (-x, y, z)
2. Radius of particle i: r_i = clamp(-bearSDF(p_i) + 0.015, 0.10, 0.205). Deep particles are bigger, so the collision surface matches the visible surface.
3. Clusters: use REGION_DEFS (VERBATIM below). While still in SDF space (before step 5), particle i joins every region whose centre is closer than that region's radius. If it joins none, put it in the region with the smallest distance / radius. Add one GLOBAL cluster that contains every particle.
4. Mass: m_i = 1 + 2.4 * exp(-(y_i - yLow) / 0.55), where yLow is the lowest particle y. Bottom-heavy bears stand back up like toys.
5. Recentre: C = mass-weighted centroid. Subtract C from every particle AND from every vertex of rest.pos (the mesh). Then rig.bottom = min over particles of (y_i - r_i).
6. For each cluster c, precompute: c0 = sum(m_i p_i) / sum(m_i) over its members; q_i = p_i - c0 per member; Aqq = sum(m_i * q_i q_i^T) (3x3); lambda_c = 0.03 * trace(Aqq) / 3 + 1e-4; AqqInv_c = invert3(Aqq + lambda_c * I).
7. Skin binding: bindSkin(rest.pos, P, N) (VERBATIM below) with the recentred mesh and particles.

## 2.2 Per-bear state inside World (slot s)
X and V (contract), goal G and previous goal GP (same layout as X), one quaternion per cluster (Float64Array(4 * nClusters * SLOTS), order x, y, z, w) and one 3x3 matrix Gm per cluster (skinning needs it). One THREE.Mesh per slot with its own BufferGeometry (position + normal copied from rest, index shared), material = bearMats[color]. One blob shadow mesh per slot.

## 2.3 Spawning a bear: spawn({ x, y, z, yaw, pitch, roll, color })
- q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')). Particle i: position = (x, y, z) + p_i rotated by q; velocity = (0, -1, 0) plus a small random spin (angular velocity components in [-1.5, 1.5]: v += w x (position - centre)).
- Write q.x, q.y, q.z, q.w into every cluster quaternion of that slot (warm start), compute the goals once with 12 rotation iterations, then set GP = G.
- If MAX_ALIVE bears are alive: the OLDEST one starts dying (Stage 3 animates it; for now just remove it).
- Opening: 7 bears at openingSpots(), colors shuffled from [0, 1, 2, 3, 4, 0, 2], dropped from y = 5 + random * 3, yaw random in [-0.4, 0.4], pitch and roll in [-0.06, 0.06], staggered 0.16 s apart in SIMULATED time (queue them and spawn inside the substep loop once world.t reaches their time).

## 2.4 Shape matching: every substep, every awake bear, every cluster c
```
c    = sum(m_i x_i) / sum(m_i)                              // current centre
Apq  = sum(m_i * (x_i - c) q_i^T)                           // 3x3; Apq[r][k] = sum m_i (x_i - c)[r] * q_i[k]
extractRotation(quats, 4 * (s * nClusters + c), Apq00, Apq01, Apq02, Apq10, Apq11, Apq12, Apq20, Apq21, Apq22, 2)
R    = 3x3 rotation matrix of that quaternion (x, y, z, w)
A    = (Apq + lambda_c * R) * AqqInv_c                      // 3x3 matrix product
det  = determinant(A)
GLOBAL cluster: Gm = R
LOCAL clusters: wA = beta * sstep(0.12, 0.35, det) * (1 - sstep(4, 7, det))
                sc = 1 / cbrt(max(det, 0.12))
                Gm = (1 - wA) * R + wA * sc * A
store Gm for this cluster
for each member i: goalSum_i += w_c * (c + Gm q_i)          // w_c = 1 for local clusters, wG for the global one
```
Then goal_i = goalSum_i / (number of LOCAL clusters containing i + wG).

## 2.5 Integrate: every substep, every awake bear, every particle
```
gy = 17                                    // x1.3 while grabbed (Stage 3)
a  = k * (goal_i - x_i) + cd * ((goal_i - GP_i) / H - v_i) + (0, -gy, 0)
GP_i = goal_i
v  = (v + a * H) / (1 + 0.12 * H)
if (a.y < 0 && x.y - r_i < 0.003) {        // resting on the floor: Coulomb friction
  cap = 0.9 * (-a.y) * H;  t = length(v.x, v.z)
  if (t <= cap) v.x = v.z = 0;  else scale v.x, v.z by (1 - cap / t)
}
if (|v| > 24) scale v down to length 24
x += v * H
```
Rolling resistance (do this BEFORE the particle loop, only when the bear touched the floor or another bear in the previous substep and is not grabbed):
```
com = sum(m x) / sum(m);  r = x - com;  L = sum(m * cross(r, v));  I = sum(m * |r|^2) + 1e-9
w = L * (5 * H / I);   for each particle: v -= cross(w, r)
```

## 2.6 Floor and walls: every substep, after integrating (Stage 3 puts bear-bear contacts right before this)
```
for every particle (x, v, r) of every awake bear:
  if (x.x < xmin + r) { x.x = xmin + r; if (v.x < 0) v.x *= -0.25 }    // same for xmax, zmin, zmax
  if (x.y > 22 - r)   { x.y = 22 - r;   if (v.y > 0) v.y *= -0.3 }
  if (x.y < r + 0.004) touchedSomething[s] = true
  if (x.y < r) {
    x.y = r
    if (v.y < 0) {
      vn = -v.y;  v.y = vn > 1.2 ? vn * 0.06 : 0
      drop = 0.9 * 1.06 * vn;  t = length(v.x, v.z)
      if (t <= drop) v.x = v.z = 0;  else scale v.x, v.z by (1 - drop / t)
    }
  }
```

## 2.7 Jiggle: setJiggle(j), j = slider value / 100, default 0.35
k = 1800 * (6000 / 1800)^j;  beta = lerp(0.8, 0.45, j);  wG = lerp(5, 7, j);  cd = 2 * lerp(0.17, 0.3, j) * sqrt(k * (1 - beta)).
Save j in localStorage inside try/catch and restore it on load (also inside try/catch).

## 2.8 Time stepping: world.frame(dt)
```
dt = clamp(dt, 0, 1 / 30);  acc += dt;  n = 0
while (acc >= H && n < 10) { step(); acc -= H; n++ }
if (acc > H) acc = H                        // never build a backlog
```
Animation loop: dt from requestAnimationFrame timestamps (first frame 1/60). On document 'visibilitychange': hidden → cancel the loop; visible → restart it and reset the timestamp.

## 2.9 Sleep and safety (every 4th substep)
- For each awake bear: keep a snapshot of its positions. If a particle has moved farther than 0.03 from the snapshot, re-snapshot and reset its calm timer. Otherwise add 4*H to the timer; after 0.5 s the bear falls asleep (velocities = 0, skipped by integration and shape matching). Grabbed bears never sleep.
- NaN guard: if any position or velocity of a bear is not finite, remove that bear and spawn a fresh one of the same color at y = 8.

## 2.10 Skinning the mesh: every rendered frame, for each bear that is awake (or just spawned)
```
for each particle i: F_i = average of Gm over the LOCAL clusters containing i (3x3);  T_i = x_i - F_i * p_i
for each mesh vertex with rest position u: out = sum over its 4 skin particles k of w_k * (F_k * u + T_k)
out.y = max(out.y, 0.003)                  // the jelly never pokes through the floor
```
Write out into that bear's geometry position attribute (world space: the mesh object stays at the origin, no transform), set needsUpdate, call geometry.computeVertexNormals() and geometry.computeBoundingSphere().
Blob shadow: follows the bear's centre (x, z); opacity = 0.9 * exp(-2 * h), where h = height of the lowest particle bottom above the floor.

## 2.11 Debug API window.__gummy (required)
step(n): n substeps;  advance(sec): world.frame(sec);  stats(): { bears, particles, hasNaN, minY (lowest particle bottom), maxSpeed, asleep };  spawn(color);  reset();  ready = true after the first rendered frame.

## VERBATIM code for this stage (paste exactly)
```js
/* ---------- region (cluster) layout for shape matching, in SDF space ---------- */
const REGION_DEFS = [
  // cx, cy, cz, radius  (overlapping clusters; mirrored left/right)
  [-0.3, -0.62, 0.02, 0.46], [0.3, -0.62, 0.02, 0.46], // pelvis
  [-0.3, -0.2, 0.03, 0.46], [0.3, -0.2, 0.03, 0.46], // belly
  [-0.3, 0.2, 0.02, 0.46], [0.3, 0.2, 0.02, 0.46], // chest
  [-0.3, 0.56, 0.0, 0.46], [0.3, 0.56, 0.0, 0.46], // shoulders / neck
  [-0.22, 0.95, 0.03, 0.48], [0.22, 0.95, 0.03, 0.48], // head (upper)
  [0.0, 0.72, 0.28, 0.44], // face + snout
  [-0.4, 1.12, 0.0, 0.5], [0.4, 1.12, 0.0, 0.5], // ears
  [-0.72, 0.1, 0.08, 0.5], [0.72, 0.1, 0.08, 0.5], // arms
  [-0.33, -0.84, 0.06, 0.47], [0.33, -0.84, 0.06, 0.47], // legs
];

function invert3(m) {
  // symmetric/general 3x3 inverse of row-major array
  const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const id = 1 / det;
  return [A * id, -(b * i - c * h) * id, (b * f - c * e) * id, B * id, (a * i - c * g) * id, -(a * f - c * d) * id, C * id, -(a * h - b * g) * id, (a * e - b * d) * id];
}

const sstep = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };

/* Mueller et al. 2016 "A robust method to extract the rotational part of deformations":
   iterate a quaternion (warm started from the previous step) toward the polar-decomposition rotation of A. */
function extractRotation(q, o, a00, a01, a02, a10, a11, a12, a20, a21, a22, iters) {
  let qx = q[o], qy = q[o + 1], qz = q[o + 2], qw = q[o + 3];
  for (let it = 0; it < iters; it++) {
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz), r01 = 2 * (xy - wz), r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz), r11 = 1 - 2 * (xx + zz), r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy), r21 = 2 * (yz + wx), r22 = 1 - 2 * (xx + yy);
    const ox = r10 * a20 - r20 * a10 + (r11 * a21 - r21 * a11) + (r12 * a22 - r22 * a12);
    const oy = r20 * a00 - r00 * a20 + (r21 * a01 - r01 * a21) + (r22 * a02 - r02 * a22);
    const oz = r00 * a10 - r10 * a00 + (r01 * a11 - r11 * a01) + (r02 * a12 - r12 * a02);
    const dot = r00 * a00 + r10 * a10 + r20 * a20 + r01 * a01 + r11 * a11 + r21 * a21 + r02 * a02 + r12 * a12 + r22 * a22;
    const den = 1 / (Math.abs(dot) + 1e-9);
    const wxv = ox * den, wyv = oy * den, wzv = oz * den;
    const w = Math.sqrt(wxv * wxv + wyv * wyv + wzv * wzv);
    if (w < 1e-9) break;
    const sn = Math.sin(0.5 * w) / w, cs = Math.cos(0.5 * w);
    const dx = wxv * sn, dy = wyv * sn, dz = wzv * sn;
    const nx = cs * qx + dx * qw + dy * qz - dz * qy;
    const ny = cs * qy - dx * qz + dy * qw + dz * qx;
    const nz = cs * qz + dx * qy - dy * qx + dz * qw;
    const nw = cs * qw - dx * qx - dy * qy - dz * qz;
    const il = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
    qx = nx * il; qy = ny * il; qz = nz * il; qw = nw * il;
  }
  q[o] = qx; q[o + 1] = qy; q[o + 2] = qz; q[o + 3] = qw;
}
// For every mesh vertex: its 4 nearest rest particles and smooth weights (they sum to 1).
// restPos: Float32Array of mesh vertices (bear space), P: Float64Array of rest particle positions (same space), N: particle count.
function bindSkin(restPos, P, N) {
  const K = 4, nV = restPos.length / 3;
  const skinIdx = new Uint16Array(K * nV), skinW = new Float32Array(K * nV);
  const dd = new Float64Array(N), ord = new Int32Array(N);
  for (let v = 0; v < nV; v++) {
    const vx = restPos[3 * v], vy = restPos[3 * v + 1], vz = restPos[3 * v + 2];
    for (let i = 0; i < N; i++) { ord[i] = i; dd[i] = Math.hypot(vx - P[3 * i], vy - P[3 * i + 1], vz - P[3 * i + 2]); }
    for (let a = 0; a <= K; a++) { // partial selection sort: the K+1 nearest come first
      let m = a;
      for (let b = a + 1; b < N; b++) if (dd[ord[b]] < dd[ord[m]]) m = b;
      const t = ord[a]; ord[a] = ord[m]; ord[m] = t;
    }
    const dK = dd[ord[K]];
    let sum = 0;
    const w = [0, 0, 0, 0];
    for (let a = 0; a < K; a++) { const r = 1 - dd[ord[a]] / dK; w[a] = r * r; sum += w[a]; }
    if (sum < 1e-9) { w[0] = 1; sum = 1; }
    for (let a = 0; a < K; a++) { skinIdx[K * v + a] = ord[a]; skinW[K * v + a] = w[a] / sum; }
  }
  return { skinIdx, skinW };
}
```

## ACCEPTANCE (say how your code meets each one)
- The 7 bears drop one by one, land with a visible squash, wobble, and are completely still within about 3 seconds.
- No bear sinks into the floor, sticks to a wall or flies away. The console shows zero errors.
- Console: __gummy.advance(5); __gummy.stats() → hasNaN false, minY >= -0.001.
- Jiggle slider: Wobbly gives a big jiggle on landing, Firm stays stiff.
````

## Prompt 3: Stage 3, collisions + grab and fling

````text
STAGE 3: bears collide with each other, and you can grab, squish, fling and drop them.
Start from the current file. Keep everything from Stages 1 and 2. Reply in the master-brief format with the WHOLE file.

## 3.1 Bear-bear contacts (inside every substep, right before the floor/walls pass)
- Broad phase: a spatial hash over every particle of every live bear. Cell size = 2 * (largest particle radius) + 0.16. Use typed arrays (head: Int32Array(8192) filled with -1, next: Int32Array(N * SLOTS)) and the hash ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) & 8191, with ix = floor(x / cell) + 1024 (same for y and z).
- Pair list: for each particle of each AWAKE bear, look in the 27 neighbouring cells for particles of OTHER bears with distance < r_i + r_j + 0.14. If both bears are awake, keep the pair only once (from the lower slot). Rebuild the list only when an awake particle has moved more than 0.07 since the last build, or when a bear was added, removed or woken up.
- Solve, 3 iterations per substep. Each iteration: solve all pairs, then apply DV, then run the floor/walls pass:
```
d = x_i - x_j;  dist = |d|;  pen = r_i + r_j - dist;  if (pen <= 0) continue
n = dist > 1e-7 ? d / dist : (0, 1, 0)
if (pen > 0.008) wake any sleeping bear in this pair
w_i = bear_i asleep ? 0 : 1 / m_i;   w_j likewise;   ws = w_i + w_j;   if (ws == 0) continue
x_i += n * pen * w_i / ws;           x_j -= n * pen * w_j / ws
DV_i += n * (pen * w_i / ws) / H;    DV_j -= n * (pen * w_j / ws) / H
rv = (v_i + DV_i) - (v_j + DV_j);    vn = dot(rv, n);    t = rv - n * vn
if (|t| > 1e-9) { f = min(|t|, 0.55 * pen / H) / |t|;  v_i -= t * f * w_i / ws;  v_j += t * f * w_j / ws }
mark both bears as "touched something" (rolling resistance uses it)
// after all pairs: for every awake particle: v += DV; DV = 0
```

## 3.2 Grab and fling (pointer events: mouse and touch)
- canvas pointerdown (left button or touch only): THREE.Raycaster from the pointer, intersect the bear meshes (they have up-to-date bounding spheres from skinning). Nearest hit → bear s at point P. canvas.setPointerCapture(pointerId), add the CSS class "grabbing".
  - Drag plane: normal = camera direction, passing through P.
  - Patch: every particle of s with d = |x_i - P| < 1.1 gets weight w_i = (1 - d*d / 1.21)^3, then scale all weights so they sum to 9. Store offset o_i = x_i - P. If nothing is in range, it is not a grab.
  - grab = { slot: s, items, target: P, prevTarget: P, vel: (0, 0, 0) }; bear.grabbed++; wake the bear.
- pointermove: target = ray ∩ drag plane.
- Once per frame, before the substeps (in world.frame, when dt > 1e-4): v = (target - prevTarget) / dt, limited to length 30; grab.vel = 0.5 * grab.vel + 0.5 * v; prevTarget = target.
- Every substep, for each grab:
```
grab.vel *= 0.985
for each item: delta = target + o_i - x_i;  if (|delta| > 0.5) scale delta to length 0.5
               a = 1800 * w_i * delta + 70 * w_i * (grab.vel - v_i);  if (|a| > 3000) scale a to length 3000
               v_i += a * H
for EVERY particle of that bear: v += 12 * H * (grab.vel - v)      // the body follows the hand, no stretching into a spike
while held: gravity x1.3, k x0.4 and cd x sqrt(0.4) for that bear (it hangs and stretches, then snaps back)
```
- pointerup / pointercancel / lostpointercapture: delete the grab, bear.grabbed--, wake it. Its velocity stays, so a fast drag flings it.

## 3.3 Tap empty space = drop a bear
If the pointer never grabbed, moved less than 10 px and lasted less than 600 ms: intersect the ray with the floor plane y = 0 and spawn a random-colored bear above that (x, z), clamped inside ARENA, at y = 6.

## 3.4 Buttons
- Drop bear: spawn at a random x in [0.7 xmin, 0.7 xmax], z in [0.5 zmin, 0.5 zmax], y = 6.
- Shake: for every live bear: wake it, com = its centre; k = ((rnd - 0.5) * 7, 7.5 + rnd * 4, (rnd - 0.5) * 3.5); w = 3 random values in [-3.5, 3.5]; every particle: v += k + cross(w, x - com).
- Reset: remove every bear and drop the 7 opening bears again.
- Bear cap: when a 17th bear spawns, the OLDEST bear starts dying: bears[s].dying = true (it leaves world.live and the contacts), its mesh scales toward its centre with scale = 1 - (t / 0.3)^2 over 0.3 s, then it is removed (alive = false, mesh hidden).

## 3.5 Also
canvas: touch-action none (already in the CSS); ignore right-click (contextmenu preventDefault); __gummy.shake() calls the same shake.

## ACCEPTANCE
- Bears land ON each other and pile up, never passing through each other.
- Grab a bear by the head and pull up: the whole bear stretches and sags like jelly (no pointy spike), then wobbles back when released. A fast drag throws it.
- Tap empty floor: a bear drops there. Spam Drop bear: never more than 16 bears; the oldest shrinks away smoothly.
- Shake throws everything up, and it all settles again within about 3 seconds.
- Console: __gummy.shake(); __gummy.advance(5); __gummy.stats() → hasNaN false. Zero console errors.
````

## Prompt 4: Stage 4, sound effects

````text
STAGE 4: sound effects. All sounds are synthesized live with the Web Audio API (no audio files).
Start from the current file. Keep everything from Stages 1 to 3. Reply in the master-brief format with the WHOLE file.

## 4.1 Physics contact flags (small change in the World)
- In the floor/walls pass: when a particle of bear s has x.y < r + 0.004, set world.hitFloor[s] = 1.
- In the pair solver: for every pair that is really touching (pen > 0), set world.hitPair[s_i] = 1 and world.hitPair[s_j] = 1.
- Do NOT clear them in the physics. playImpacts() (below) reads and clears them once per rendered frame.

## 4.2 The sound engine: paste VERBATIM, right after the line that creates window.__gummy (or near the top of the module script)
```js
/* ---------- sound effects: synthesized with Web Audio (no audio files), started by the first touch / click / key ---------- */
const sfx = (() => {
  let ctx = null, out = null, master = null, noiseBuf = null, voices = 0, on = true;
  try { on = localStorage.getItem('gummy.sound') !== 'off'; } catch (e) { /* storage may be blocked */ }
  const MAX_VOICES = 32, LEVEL = 0.85;
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    const comp = ctx.createDynamicsCompressor(); // keeps a pile of simultaneous plops from clipping
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = on ? LEVEL : 0;
    master.connect(comp);
    comp.connect(ctx.destination);
    // a small soft room (synthetic decaying-noise impulse response), so the plops sound like they land on a studio table
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.5), ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5); }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const send = ctx.createGain();
    send.gain.value = 0.14;
    out = ctx.createGain(); // every voice ends here: dry to the master, plus a send into the room
    out.connect(master); out.connect(send); send.connect(verb); verb.connect(master);
    noiseBuf = ctx.createBuffer(1, Math.floor(sr * 0.5), sr);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
      // older iOS only unlocks once something actually plays inside the gesture: a one-sample silent buffer
      try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); b.connect(ctx.destination); b.start(0); } catch (e) { /* ignore */ }
    }
  }
  // only play into a running context: a suspended one would queue sounds and blurt them all out on resume
  const live = () => ctx !== null && on && ctx.state === 'running' && voices < MAX_VOICES;
  const now = () => ctx.currentTime + 0.004;
  const jitter = () => 0.95 + Math.random() * 0.1;
  // envelope: quick attack to `peak`, exponential decay to silence over `dec` seconds
  function envGain(t, peak, att, dec) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
    return g;
  }
  function run(src, nodes, t, end) {
    voices++;
    src.onended = () => { voices--; for (const n of nodes) n.disconnect(); };
    src.start(t);
    src.stop(end);
  }
  // a pitched voice gliding f0 -> f1
  function tone(type, f0, f1, t, dur, peak, att) {
    const o = ctx.createOscillator(), g = envGain(t, peak, att, dur);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + att + dur);
    o.connect(g); g.connect(out);
    run(o, [o, g], t, t + att + dur + 0.02);
    return o;
  }
  // noise through a filter that sweeps f0 -> f1 (wet slaps, squelches, whooshes)
  function hiss(t, dur, peak, att, type, f0, f1, q) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = envGain(t, peak, att, dur);
    s.buffer = noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + att + dur);
    s.connect(f); f.connect(g); g.connect(out);
    run(s, [s, f, g], t, t + att + dur + 0.02);
  }
  // jelly wobble: a tone whose pitch shakes (vibrato) and settles, like the bear jiggling after a hit
  function wobble(t, f, dur, peak, rate, depth) {
    const o = tone('triangle', f, f * 0.92, t, dur, peak, 0.006);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = rate;
    lg.gain.setValueAtTime(f * depth, t);
    lg.gain.exponentialRampToValueAtTime(Math.max(f * depth * 0.05, 0.01), t + dur);
    lfo.connect(lg); lg.connect(o.frequency);
    run(lfo, [lfo, lg], t, t + dur + 0.03);
  }
  return {
    get on() { return on; },
    get state() { return ctx ? ctx.state : 'none'; },
    unlock,
    setOn(v) {
      on = !!v;
      try { localStorage.setItem('gummy.sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (master) master.gain.setTargetAtTime(on ? LEVEL : 0, ctx.currentTime, 0.02);
    },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); },
    // a bear landing on the floor (k: 0..1 impact strength, p: pitch factor of that bear)
    plop(k, p) {
      if (!live()) return;
      const t = now(), v = 0.12 + 0.5 * k;
      p *= jitter();
      tone('sine', 200 * p, 58 * p, t, 0.12 + 0.1 * k, v, 0.003);
      hiss(t, 0.04 + 0.04 * k, v * 0.5, 0.002, 'bandpass', 1700 * p, 600 * p, 1.2);
      if (k > 0.2) wobble(t + 0.03, 210 * p, 0.2 + 0.25 * k, v * 0.3 * k, 10 + 4 * k, 0.07);
    },
    // two bears bumping into each other
    bump(k, p) {
      if (!live()) return;
      const t = now(), v = 0.06 + 0.32 * k;
      p *= jitter();
      tone('sine', 340 * p, 150 * p, t, 0.08 + 0.05 * k, v, 0.003);
      hiss(t, 0.03, v * 0.45, 0.002, 'bandpass', 2600 * p, 1300 * p, 1.5);
    },
    // grabbing a bear: a wet squish
    squelch(p) {
      if (!live()) return;
      const t = now();
      p *= jitter();
      hiss(t, 0.14, 0.34, 0.012, 'bandpass', 320 * p, 2100 * p, 6);
      tone('sine', 560 * p, 240 * p, t, 0.07, 0.12, 0.004);
    },
    // letting go: the jelly snaps back (k: how hard it was flung)
    boing(k, p) {
      if (!live()) return;
      const t = now();
      p *= jitter();
      wobble(t, (250 + 140 * k) * p, 0.3 + 0.4 * k, 0.1 + 0.26 * k, 12 + 3 * k, 0.12);
      tone('sine', 150 * p, 330 * p, t, 0.09, 0.08 + 0.12 * k, 0.003);
    },
    // a new bear appears
    pop() {
      if (!live()) return;
      const t = now(), p = jitter();
      tone('sine', 480 * p, 1150 * p, t, 0.06, 0.24, 0.003);
      hiss(t, 0.012, 0.12, 0.001, 'highpass', 3500, 3500, 0.7);
    },
    // the oldest bear shrinks away when the 16-bear cap is reached
    bloop() {
      if (!live()) return;
      const t = now(), p = jitter();
      tone('sine', 640 * p, 170 * p, t, 0.24, 0.16, 0.004);
    },
    // Shake: the table shudders
    rumble() {
      if (!live()) return;
      const t = now();
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = envGain(t, 0.32, 0.02, 0.5);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(48, t);
      o.frequency.linearRampToValueAtTime(72, t + 0.5);
      f.type = 'lowpass'; f.frequency.value = 240; f.Q.value = 3;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 11; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(f.frequency);
      o.connect(f); f.connect(g); g.connect(out);
      run(o, [o, f, g], t, t + 0.56);
      run(lfo, [lfo, lg], t, t + 0.56);
      hiss(t, 0.35, 0.1, 0.03, 'lowpass', 900, 300, 0.8);
    },
    // Reset: everything swept away
    whoosh() {
      if (!live()) return;
      hiss(now(), 0.32, 0.22, 0.08, 'bandpass', 260, 2800, 1.3);
    },
  };
})();
// any first interaction starts the audio (browsers only allow sound after the viewer interacts)
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, () => { if (sfx.on) sfx.unlock(); }, { capture: true, passive: true });
```

## 4.3 Impact sounds: paste VERBATIM after the bear meshes are created
It only sounds when a bear STARTS touching the floor or another bear, at a loudness set by how fast the whole bear was moving. That way a resting pile stays silent.
```js
/* impact sounds: once per frame, a bear that starts touching the floor (or another bear) makes a sound as loud as the whole
   bear was moving the frame before. Jelly jiggling inside a resting pile stays in contact, so it stays silent. */
const BEAR_PITCH = [1.0, 1.05, 1.1, 0.94, 1.16]; // red, orange, yellow, green, clear: each flavor sounds a little different
const SFX_COOLDOWN = 0.22; // simulated seconds between two impact sounds of the same bear
const sfxLast = new Float64Array(SLOTS).fill(-1);
const wasOnFloor = new Uint8Array(SLOTS), wasOnBear = new Uint8Array(SLOTS);
const comVel = new Float64Array(3 * SLOTS); // each bear's average velocity at the end of the previous frame
function playImpacts() {
  const t = world.t, hf = world.hitFloor, hp = world.hitPair, N = world.N, V = world.V;
  let budget = 4; // impact sounds per frame
  for (let s = 0; s < SLOTS; s++) {
    const b = world.bears[s];
    const onFloor = hf[s] === 1, onBear = hp[s] === 1;
    hf[s] = 0; hp[s] = 0;
    const vx = comVel[3 * s], vy = comVel[3 * s + 1], vz = comVel[3 * s + 2];
    let sx = 0, sy = 0, sz = 0;
    if (b.alive && !b.asleep) { for (let k = 3 * s * N, e = k + 3 * N; k < e; k += 3) { sx += V[k]; sy += V[k + 1]; sz += V[k + 2]; } }
    comVel[3 * s] = sx / N; comVel[3 * s + 1] = sy / N; comVel[3 * s + 2] = sz / N;
    const newFloor = onFloor && !wasOnFloor[s], newBear = onBear && !wasOnBear[s];
    wasOnFloor[s] = onFloor ? 1 : 0; wasOnBear[s] = onBear ? 1 : 0;
    if (!b.alive || b.dying || budget <= 0 || t - sfxLast[s] < SFX_COOLDOWN) continue;
    const p = BEAR_PITCH[b.color] || 1, down = -vy, speed = Math.hypot(vx, vy, vz);
    if (newFloor && down > 2.5) { sfx.plop(clamp((down - 2.5) / 10, 0, 1), p); sfxLast[s] = t; budget--; }
    else if (newBear && speed > 2) { sfx.bump(clamp((speed - 2) / 8, 0, 1), p); sfxLast[s] = t; budget--; }
  }
}
```
Call playImpacts() once per rendered frame, right after world.frame(dt) and before rendering.

## 4.4 Hooks: add exactly these
- Grab starts: sfx.squelch(BEAR_PITCH[world.bears[s].color] || 1)
- Grab ends: before deleting the grab, sfx.boing(clamp(length(grab.vel) / 14, 0.15, 1), BEAR_PITCH[color] || 1)
- A bear spawned by a tap or by the Drop bear button: sfx.pop()
- Shake button: sfx.rumble(). Reset button: sfx.whoosh().
- A bear starts dying because of the 16-bear cap: sfx.bloop()
- visibilitychange: hidden → sfx.suspend(); visible → sfx.resume()
- The sound button (already in the HTML, id btnSound): paste VERBATIM:
```js
const soundBtn = document.getElementById('btnSound');
function syncSoundBtn() { soundBtn.setAttribute('aria-pressed', String(sfx.on)); soundBtn.title = sfx.on ? 'Mute sound effects' : 'Turn sound effects on'; }
soundBtn.addEventListener('click', () => { sfx.setOn(!sfx.on); if (sfx.on) { sfx.unlock(); sfx.pop(); } syncSoundBtn(); });
syncSoundBtn();
```
- Add sfx and playImpacts to window.__gummy.

## ACCEPTANCE
- Nothing plays before the first tap or click (browsers forbid it). After that: a plop when a bear lands (louder for higher drops), a squelch when grabbing, a boing when releasing, a pop for new bears, a rumble on Shake, a whoosh on Reset.
- A resting pile is SILENT: no ticking or clicking.
- The speaker button mutes and unmutes, its icon changes, and the choice survives a page reload.
- Zero console errors.
````

## Prompt 5: Stage 5, polish + final audit

````text
STAGE 5: polish and final audit. No new features.
Start from the current file. Reply in the master-brief format with the WHOLE file.

## 5.1 Must have
- prefers-reduced-motion: the opening bears start STANDING on the floor (y = -rig.bottom + 0.004, no rotation, no velocity, no stagger); nothing moves on its own.
- Performance: renderer pixel ratio <= min(devicePixelRatio, 2). Adaptive quality: every 45 frames, if the average frame time is > 34 ms and dpr > 1, lower dpr by 0.25 and call layout().
- The loop stops when the tab is hidden and resumes when it is visible (Stage 2); check it is still true.
- The loading toast hides after the first rendered frame. If WebGL fails, the toast says: "This page needs WebGL2 to draw the gummy bears."
- Every localStorage read and write is wrapped in try/catch.
- At 375 px wide: no horizontal scrolling, the buttons do not wrap, and the bears stay between the title and the controls.

## 5.2 Stress test: run this in your head against the code, then fix anything that would fail
```
for (let i = 0; i < 20; i++) __gummy.spawn(i % 5);   // only 16 stay alive
__gummy.advance(5); __gummy.shake(); __gummy.advance(0.5); __gummy.advance(5);
__gummy.stats()                                       // hasNaN false, minY >= -0.001, bears <= 16 (+ dying)
```

## 5.3 Final audit (write this table in your reply)
List EVERY hard rule from the master brief and EVERY acceptance item from Stages 2, 3 and 4. Mark each one ✅ with the function or line that satisfies it, or fix the code until you can. Then output the final file.
````

## Fix prompt (use whenever something breaks)

````text
BUG REPORT for our gummy bear file.
What I did: <describe the steps>
What I expected: <...>
What happened instead: <...>
Console errors (F12 → Console), copied exactly:
<paste them here, or write "none">

Rules for your answer:
1. ROOT CAUSE first: explain in at most 3 lines WHY it happens (point to the function or line). No guessing: if you are not sure, say what you would log to find out.
2. Fix it with the smallest change that solves the root cause. Do not rewrite unrelated parts. Do not remove features.
3. Output the WHOLE file again (no placeholders), then the SELF-CHECK and a TEST list that includes my bug.
````

## Continue prompt (when a reply gets cut off)

````text
Your reply was cut off. Continue EXACTLY where it stopped, starting with the line right after this one:
<paste the last full line you received>
Do not restart the file. Do not repeat earlier lines. Do not summarize. Just continue the code until the end of the file, then do the SELF-CHECK.
````
