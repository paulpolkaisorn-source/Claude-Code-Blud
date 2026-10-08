// arena.js — one parsed map -> grid collision, raycast, wall destruction and toon-shaded world visuals.
// Tile (c,r) spans x in [c,c+1], z in [r,r+1]; y is up. Meshes: ground, cliffs, walls (+outline), bushes (+outline),
// water, spawn pads, mine (base + glow) = 10 draw calls (crystals add one more). Hot paths (moveCircle, raycast,
// update) never allocate: they read typed arrays and write into caller-provided objects.
import * as THREE from 'three';
import { bus, EV, T, TEAM_COLORS, CRYSTAL_COLOR, OUTLINE_COLOR } from '../contracts.js';
import { toonMat, addInstancedOutline, outlineGeometry, mergeColored } from '../render/toon.js';

const SUBSTEP = 0.2;             // max travel per collision substep; below the smallest brawler radius (no tunnelling)
const EDGE = 1e-6;               // tolerance so a circle can slide along a wall face without sticking
const SQUASH_R = 1.2;            // bushes whose centre is this close to the focus squash...
const SQUASH_MIN = 0.4;          // ...down to this height fraction, approached exponentially
const SQUASH_RATE = 12;          // 1/s
const WATER_Y = 0.015;
const PAD_Y = 0.012;
const TEX_PX = 16;               // ground texels per tile
const ROCK = 0x5b4a3a;
const SWAY_TIME = { value: 0 };  // one uniform object shared by every animated material
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const RX_FLAT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

// Bush sway in object space: weight = local height, phase = instance origin (instanceMatrix translation).
const SWAY_GLSL = `
  float swH = max(transformed.y, 0.0);
  float swP = instanceMatrix[3].x * 1.31 + instanceMatrix[3].z * 0.87;
  float swA = sin(uTime * 2.1 + swP) * 0.05 + sin(uTime * 3.7 + swP * 1.9) * 0.018;
  transformed.x += swA * swH;
  transformed.z += swA * 0.55 * swH;`;

const hash01 = (a, b) => {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

// Matrix = translate(x,y,z) * rotateY(yaw) * scale(sx,sy,sz).
function xf(x, y, z, yaw = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().makeTranslation(x, y, z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
}

// mergeColored plus disposal of the temporary part geometries (the merged result owns its own buffers).
function mergeParts(parts) {
  const geo = mergeColored(parts);
  for (const p of parts) p.geo.dispose();
  return geo;
}

function bushMaterial() {
  const m = toonMat(0xffffff, { vertexColors: true, unique: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = SWAY_TIME;
    sh.vertexShader = 'uniform float uTime;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${SWAY_GLSL}`);
  };
  m.customProgramCacheKey = () => 'arena-bush';
  return m;
}

function bushOutlineMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = SWAY_TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n  transformed += normalize(normal) * 0.035;\n${SWAY_GLSL}`);
  };
  m.customProgramCacheKey = () => 'arena-bush-outline';
  return m;
}

function waterMaterial() {
  const m = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = SWAY_TIME;
    sh.vertexShader = 'uniform float uTime;\nvarying vec2 vWp;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWp = position.xz;');
    sh.fragmentShader = 'uniform float uTime;\nvarying vec2 vWp;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  float wv = sin(vWp.x * 2.3 + uTime * 1.2) * sin(vWp.y * 2.9 - uTime * 0.9) + 0.45 * sin((vWp.x + vWp.y) * 4.1 + uTime * 2.1);
  float crest = step(0.55, wv);
  float tint = 0.5 + 0.5 * sin(vWp.x * 0.7 - vWp.y * 0.9 + uTime * 0.4);
  diffuseColor.rgb = mix(vec3(0.12, 0.40, 0.66), vec3(0.20, 0.52, 0.80), tint) + crest * vec3(0.28, 0.36, 0.40);`);
  };
  m.customProgramCacheKey = () => 'arena-water';
  return m;
}

// Procedural ground on the CPU (DataTexture, no DOM): checker-shaded tiles, grass, darker bush ground,
// sand on shores, violet under the mine. Texel row 0 is the near edge (v=0), so tile row = R-1-floor(j/TEX_PX).
function groundTexture(tiles, C, R) {
  const cls = new Uint8Array(C * R);   // 0 grass, 1 bush ground, 2 sand (shore or water bed), 3 mine
  for (let i = 0; i < C * R; i++) {
    const t = tiles[i], c = i % C, r = (i / C) | 0;
    if (t === T.WATER) cls[i] = 2;
    else if (t === T.MINE) cls[i] = 3;
    else if (t === T.BUSH) cls[i] = 1;
    else if ((c > 0 && tiles[i - 1] === T.WATER) || (c < C - 1 && tiles[i + 1] === T.WATER) ||
      (r > 0 && tiles[i - C] === T.WATER) || (r < R - 1 && tiles[i + C] === T.WATER)) cls[i] = 2;
  }
  const pal = [hex(0x9bd46f), hex(0x6fb456), hex(0xe6d096), hex(0x9d8fc4)];
  const W = C * TEX_PX, H = R * TEX_PX;
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const r = R - 1 - ((j / TEX_PX) | 0);
    const seamY = j % TEX_PX === 0;
    for (let x = 0; x < W; x++) {
      const c = (x / TEX_PX) | 0;
      const base = pal[cls[r * C + c]];
      const f = (((c + r) & 1) ? 1 : 0.955) * (0.985 + 0.03 * hash01(c, r)) * (seamY || x % TEX_PX === 0 ? 0.92 : 1);
      const o = (j * W + x) * 4;
      px[o] = Math.min(255, base[0] * f);
      px[o + 1] = Math.min(255, base[1] * f);
      px[o + 2] = Math.min(255, base[2] * f);
      px[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(px, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Rock frame outside the playable grid, with jagged chunks along the edges. One vertex-coloured mesh.
function cliffGeometry(C, R) {
  const parts = [];
  const box = (w, h, d, x, y, z, color) => parts.push({ geo: new THREE.BoxGeometry(w, h, d), color, matrix: xf(x, y, z) });
  const shade = (k) => [ROCK, 0x6a5847, 0x4f4032][Math.floor(hash01(k, 9) * 3)];
  box(C + 4, 1.4, 2, C / 2, 0.7, -1, ROCK);
  box(C + 4, 1.4, 2, C / 2, 0.7, R + 1, ROCK);
  box(2, 1.4, R, -1, 0.7, R / 2, ROCK);
  box(2, 1.4, R, C + 1, 0.7, R / 2, ROCK);
  for (let c = 0; c < C; c += 2) {
    const hF = 1.5 + 0.9 * hash01(c, 3), hN = 1.5 + 0.9 * hash01(c, 4);
    box(1.1, hF, 1.1, c + 0.5, hF / 2, -1, shade(c));
    box(1.1, hN, 1.1, c + 0.5, hN / 2, R + 1, shade(c + 1));
  }
  for (let r = 0; r < R; r += 3) {
    const hL = 1.5 + 0.9 * hash01(r, 5), hR = 1.5 + 0.9 * hash01(r, 6);
    box(1.1, hL, 1.1, -1, hL / 2, r + 0.5, shade(r + 2));
    box(1.1, hR, 1.1, C + 1, hR / 2, r + 0.5, shade(r + 3));
  }
  return mergeParts(parts);
}

// One chunky tuft with its origin at its feet: four faceted blobs in three greens.
function tuftGeometry() {
  const blob = (r) => new THREE.IcosahedronGeometry(r, 0);
  return mergeParts([
    { geo: blob(0.36), color: 0x3c9a48, matrix: xf(0, 0.3, 0, 0, 1, 0.85, 1) },
    { geo: blob(0.26), color: 0x52b35a, matrix: xf(0.22, 0.2, 0.1) },
    { geo: blob(0.24), color: 0x2e7f3e, matrix: xf(-0.18, 0.18, -0.14) },
    { geo: blob(0.2), color: 0x6cc46a, matrix: xf(0.02, 0.5, -0.04) },
  ]);
}

// Water tiles as flat quads just above the ground: one mesh, animated by the shader.
function waterGeometry(tiles, C, R) {
  const list = [];
  for (let i = 0; i < C * R; i++) if (tiles[i] === T.WATER) list.push(i);
  const pos = new Float32Array(list.length * 12), idx = new Uint16Array(list.length * 6);
  list.forEach((i, k) => {
    const c = i % C, r = (i / C) | 0, y = WATER_Y;
    pos.set([c, y, r, c + 1, y, r, c + 1, y, r + 1, c, y, r + 1], k * 12);
    const q = k * 4;
    idx.set([q, q + 2, q + 1, q, q + 3, q + 2], k * 6);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return { geo, count: list.length };
}

// Team-tinted rings (solid inner disc, lighter) under each spawn. One vertex-coloured mesh.
function padGeometry(spawns) {
  const ring = new THREE.RingGeometry(0.22, 0.42, 24);
  const disc = new THREE.CircleGeometry(0.2, 24);
  const parts = [];
  spawns.forEach((list, team) => {
    const bright = new THREE.Color(TEAM_COLORS[team]).lerp(new THREE.Color(0xffffff), 0.35).getHex();
    for (const s of list) {
      const m = new THREE.Matrix4().makeTranslation(s.x, PAD_Y, s.z).multiply(RX_FLAT);
      parts.push({ geo: ring, color: TEAM_COLORS[team], matrix: m });
      parts.push({ geo: disc, color: bright, matrix: m });
    }
  });
  return mergeParts(parts);
}

// Centre mine: a dark stone base plus a glowing ring and crystal core (the glow part gets emissive pulsing).
function mineGeometries(mx, mz) {
  const base = mergeParts([
    { geo: new THREE.CylinderGeometry(0.44, 0.5, 0.1, 8), color: 0x3b2f55, matrix: xf(mx, 0.05, mz) },
  ]);
  const glow = mergeParts([
    { geo: new THREE.TorusGeometry(0.36, 0.05, 6, 20), color: CRYSTAL_COLOR,
      matrix: new THREE.Matrix4().makeTranslation(mx, 0.12, mz).multiply(RX_FLAT) },
    { geo: new THREE.OctahedronGeometry(0.16, 0), color: CRYSTAL_COLOR, matrix: xf(mx, 0.38, mz, 0, 1, 1.6, 1) },
  ]);
  return { base, glow };
}

export function createArena(scene, parsed) {
  const C = parsed.cols, R = parsed.rows, N = C * R;
  const tiles = new Uint8Array(parsed.tiles);   // private copy: destroyWalls mutates it
  const owned = [];                              // geometries, materials and textures this arena created
  const keep = (o) => { owned.push(o); return o; };
  const group = new THREE.Group();
  group.name = 'arena';
  scene.add(group);
  const add = (obj, name) => { obj.name = name; group.add(obj); return obj; };

  const tile = (c, r) => (c < 0 || r < 0 || c >= C || r >= R ? T.WALL : tiles[r * C + c]);
  const blocksMove = (c, r) => { const t = tile(c, r); return t === T.WALL || t === T.WATER; };
  const blocksShot = (c, r) => tile(c, r) === T.WALL;
  const isBushAt = (x, z) => tile(Math.floor(x), Math.floor(z)) === T.BUSH;

  // ---- ground and frame
  const groundGeo = keep(new THREE.PlaneGeometry(C, R));
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(C / 2, 0, R / 2);
  const groundMat = keep(toonMat(0xffffff, { unique: true }));
  groundMat.map = keep(groundTexture(tiles, C, R));
  add(new THREE.Mesh(groundGeo, groundMat), 'ground').receiveShadow = true;
  add(new THREE.Mesh(keep(cliffGeometry(C, R)), toonMat(0xffffff, { vertexColors: true })), 'cliffs');

  // ---- walls: one instanced box per wall tile, toon outline shares its matrices
  const wallIndex = new Int32Array(N).fill(-1);
  let nWalls = 0;
  for (let i = 0; i < N; i++) if (tiles[i] === T.WALL) wallIndex[i] = nWalls++;
  const wallGeo = keep(new THREE.BoxGeometry(0.94, 1.1, 0.94));
  wallGeo.translate(0, 0.55, 0);
  const walls = new THREE.InstancedMesh(wallGeo, toonMat(0xffffff), Math.max(1, nWalls));
  walls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  walls.count = nWalls;
  walls.castShadow = true;
  walls.receiveShadow = true;
  walls.frustumCulled = false;
  const rockColor = new THREE.Color(0xb49a7c), tint = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const w = wallIndex[i];
    if (w < 0) continue;
    const c = i % C, r = (i / C) | 0;
    walls.setMatrixAt(w, xf(c + 0.5, 0, r + 0.5, 0, 1, 0.92 + 0.16 * hash01(c, r), 1));
    walls.setColorAt(w, tint.copy(rockColor).multiplyScalar(0.9 + 0.2 * hash01(r, c + 7)));
  }
  walls.instanceMatrix.needsUpdate = true;
  if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
  add(walls, 'walls');
  const wallOutline = addInstancedOutline(walls, 0.04);
  wallOutline.frustumCulled = false;
  group.add(wallOutline);

  // ---- bushes: swaying tufts, squashed near the focus; outline uses the same sway and squash
  const bushTiles = [];
  for (let i = 0; i < N; i++) if (tiles[i] === T.BUSH) bushTiles.push(i);
  const nb = bushTiles.length;
  const tuftGeo = keep(tuftGeometry());
  const bushes = new THREE.InstancedMesh(tuftGeo, keep(bushMaterial()), Math.max(1, nb));
  bushes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bushes.count = nb;
  bushes.frustumCulled = false;
  const bushX = new Float32Array(nb), bushZ = new Float32Array(nb), squash = new Float32Array(nb).fill(1);
  bushTiles.forEach((i, k) => {
    const c = i % C, r = (i / C) | 0;
    bushX[k] = c + 0.5;
    bushZ[k] = r + 0.5;
    const s = 0.92 + 0.16 * hash01(c, r);
    bushes.setMatrixAt(k, xf(c + 0.5, 0, r + 0.5, hash01(r, c) * Math.PI * 2, s, s, s));
  });
  bushes.instanceMatrix.needsUpdate = true;
  const bushBase = bushes.instanceMatrix.array.slice(0, nb * 16);
  add(bushes, 'bushes');
  const bushOutline = new THREE.InstancedMesh(keep(outlineGeometry(tuftGeo)), keep(bushOutlineMaterial()), Math.max(1, nb));
  bushOutline.instanceMatrix = bushes.instanceMatrix;
  bushOutline.count = nb;
  bushOutline.frustumCulled = false;
  add(bushOutline, 'bushOutline');

  // ---- water (only when the map has any)
  const water = waterGeometry(tiles, C, R);
  if (water.count > 0) add(new THREE.Mesh(keep(water.geo), keep(waterMaterial())), 'water');

  // ---- spawn pads and mine
  const padMat = keep(toonMat(0xffffff, { vertexColors: true, unique: true }));
  padMat.polygonOffset = true;
  padMat.polygonOffsetFactor = -2;
  padMat.polygonOffsetUnits = -2;
  add(new THREE.Mesh(keep(padGeometry(parsed.spawns)), padMat), 'pads');
  const mines = mineGeometries(parsed.mine.x, parsed.mine.z);
  add(new THREE.Mesh(keep(mines.base), toonMat(0xffffff, { vertexColors: true })), 'mineBase');
  const mineGlowMat = keep(toonMat(0xffffff, { vertexColors: true, emissive: CRYSTAL_COLOR, emissiveIntensity: 1, unique: true }));
  add(new THREE.Mesh(keep(mines.glow), mineGlowMat), 'mineGlow');

  // ---- collision: circle vs blocking tiles (walls, water, grid edge)
  const circleBlocked = (x, z, r) => {
    const r2 = r * r - EDGE;
    const c0 = Math.floor(x - r), c1 = Math.floor(x + r), r0 = Math.floor(z - r), r1 = Math.floor(z + r);
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        if (!blocksMove(cc, rr)) continue;
        const px = x < cc ? cc : x > cc + 1 ? cc + 1 : x;
        const pz = z < rr ? rr : z > rr + 1 ? rr + 1 : z;
        const dx = x - px, dz = z - pz;
        if (dx * dx + dz * dz < r2) return true;
      }
    }
    return false;
  };

  // Axis-separated substeps: each step tries x then z, so a blocked axis slides along the other one.
  const moveCircle = (x, z, radius, dx, dz, out) => {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / SUBSTEP));
    const sx = dx / n, sz = dz / n;
    let cx = x, cz = z, hit = false;
    for (let k = 0; k < n; k++) {
      if (sx !== 0) { if (circleBlocked(cx + sx, cz, radius)) hit = true; else cx += sx; }
      if (sz !== 0) { if (circleBlocked(cx, cz + sz, radius)) hit = true; else cz += sz; }
    }
    out.x = cx;
    out.z = cz;
    out.hit = hit;
    return out;
  };

  // Grid DDA. Returns the fraction along the segment where it first enters a shot-blocking tile (1 = clear).
  const raycast = (x0, z0, x1, z1) => {
    let c = Math.floor(x0), r = Math.floor(z0);
    if (blocksShot(c, r)) return 0;
    const dx = x1 - x0, dz = z1 - z0;
    const ax = Math.abs(dx), az = Math.abs(dz);
    const sc = dx >= 0 ? 1 : -1, sr = dz >= 0 ? 1 : -1;
    const tDX = ax > 0 ? 1 / ax : Infinity, tDZ = az > 0 ? 1 / az : Infinity;
    let tX = ax > 0 ? (sc > 0 ? c + 1 - x0 : x0 - c) / ax : Infinity;
    let tZ = az > 0 ? (sr > 0 ? r + 1 - z0 : z0 - r) / az : Infinity;
    for (;;) {
      let t;
      if (tX < tZ) { t = tX; if (t > 1) return 1; c += sc; tX += tDX; }
      else { t = tZ; if (t > 1) return 1; r += sr; tZ += tDZ; }
      if (blocksShot(c, r)) return t;
    }
  };
  const hasLOS = (x0, z0, x1, z1) => raycast(x0, z0, x1, z1) >= 1;

  // Destroys every wall tile whose square comes within `radius` of (x,z). Returns how many fell.
  const destroyWalls = (x, z, radius) => {
    const r2 = radius * radius;
    const c0 = Math.max(0, Math.floor(x - radius)), c1 = Math.min(C - 1, Math.floor(x + radius));
    const r0 = Math.max(0, Math.floor(z - radius)), r1 = Math.min(R - 1, Math.floor(z + radius));
    let n = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * C + c;
        if (tiles[i] !== T.WALL) continue;
        const px = x < c ? c : x > c + 1 ? c + 1 : x;
        const pz = z < r ? r : z > r + 1 ? r + 1 : z;
        const dx = px - x, dz = pz - z;
        if (dx * dx + dz * dz > r2) continue;
        tiles[i] = T.FLOOR;
        walls.setMatrixAt(wallIndex[i], HIDDEN);
        A.navVersion++;
        n++;
        bus.emit(EV.WALL_DESTROYED, { c, r, x: c + 0.5, z: r + 0.5 });
      }
    }
    if (n) walls.instanceMatrix.needsUpdate = true;
    return n;
  };

  // Per frame: shared time uniform (sway, water ripples), mine pulse, bush squash toward the focus.
  const update = (dt, time, focusX, focusZ) => {
    SWAY_TIME.value = time;
    mineGlowMat.emissiveIntensity = 1.05 + 0.35 * Math.sin(time * 3);
    if (nb === 0) return;
    const k = 1 - Math.exp(-Math.max(0, dt) * SQUASH_RATE);
    const arr = bushes.instanceMatrix.array;
    let dirty = false;
    for (let b = 0; b < nb; b++) {
      const dx = bushX[b] - focusX, dz = bushZ[b] - focusZ;
      const target = dx * dx + dz * dz < SQUASH_R * SQUASH_R ? SQUASH_MIN : 1;
      const s0 = squash[b];
      if (s0 === target) continue;
      let s = s0 + (target - s0) * k;
      if (Math.abs(target - s) < 0.002) s = target;
      squash[b] = s;
      const o = b * 16;
      arr[o + 4] = bushBase[o + 4] * s;
      arr[o + 5] = bushBase[o + 5] * s;
      arr[o + 6] = bushBase[o + 6] * s;
      dirty = true;
    }
    if (dirty) bushes.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    scene.remove(group);
    for (const o of owned) o.dispose();
    owned.length = 0;
  };

  const A = {
    cols: C, rows: R, tiles, spawns: parsed.spawns, mine: parsed.mine, navVersion: 0,
    tile, blocksMove, blocksShot, isBushAt, moveCircle, raycast, hasLOS, destroyWalls, update, dispose,
  };
  return A;
}
