// world.test.mjs — unit tests for maps, generator, arena collision/raycast/destruction/visibility helpers and the
// crystal view. Runs in Node without DOM or WebGL: `node --test tests/unit/world.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MAPS, MAP_IDS, parseMap } from '../../src/world/maps.js';
import { generateMap, checkMap, resolveMapRows } from '../../src/world/generator.js';
import { createArena } from '../../src/world/arena.js';
import { createCrystalView } from '../../src/world/crystals.js';
import { bus, EV, T } from '../../src/contracts.js';

const W = 21, H = 33;
const SWAP = { B: 'R', R: 'B' };

// Independent contract check on raw rows (does not reuse the generator's checker).
function assertValid(rows) {
  assert.equal(rows.length, H);
  for (const row of rows) assert.equal(row.length, W);
  const at = (c, r) => rows[r][c];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      assert.equal(SWAP[at(c, r)] ?? at(c, r), at(W - 1 - c, H - 1 - r), `point symmetry at ${c},${r}`);
    }
  }
  const bRows = [], rRows = [], mines = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (at(c, r) === 'B') bRows.push(r);
      if (at(c, r) === 'R') rRows.push(r);
      if (at(c, r) === 'M') mines.push([c, r]);
    }
  }
  assert.deepEqual(bRows.sort((a, b) => a - b), [29, 30, 31], 'one B per row in 29-31');
  assert.deepEqual(rRows.sort((a, b) => a - b), [1, 2, 3], 'one R per row in 1-3');
  assert.deepEqual(mines, [[10, 16]], 'single M at (10,16)');
  const walkable = (c, r) => c >= 0 && r >= 0 && c < W && r < H && at(c, r) !== '#' && at(c, r) !== '~';
  const seen = new Set(['10,16']);
  const stack = [[10, 16]];
  while (stack.length) {
    const [c, r] = stack.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, key = `${nc},${nr}`;
      if (walkable(nc, nr) && !seen.has(key)) { seen.add(key); stack.push([nc, nr]); }
    }
  }
  let walk = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (walkable(c, r)) walk++;
  assert.equal(seen.size, walk, 'every walkable tile is connected to the mine');
}

// Blank 21x33 test map with three spawns per team and an M, plus the given features.
function customRows({ walls = [], water = [], bushes = [] } = {}) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (const [c, r] of bushes) g[r][c] = '"';
  for (const [c, r] of water) g[r][c] = '~';
  for (const [c, r] of walls) g[r][c] = '#';
  for (const [c, r] of [[2, 29], [4, 29], [6, 29]]) g[r][c] = 'B';
  for (const [c, r] of [[14, 3], [16, 3], [18, 3]]) g[r][c] = 'R';
  g[16][10] = 'M';
  return g.map((row) => row.join(''));
}

const countChar = (rows, ch) => rows.reduce((n, row) => n + [...row].filter((x) => x === ch).length, 0);

test('handcrafted maps parse: dimensions, 3 spawns per team, one mine', () => {
  for (const id of ['canyon', 'lagoons']) {
    const p = parseMap(MAPS[id].rows);
    assert.equal(p.cols, 21, id);
    assert.equal(p.rows, 33, id);
    assert.equal(p.tiles.length, 21 * 33, id);
    assert.equal(p.spawns[0].length, 3, `${id} blue spawns`);
    assert.equal(p.spawns[1].length, 3, `${id} red spawns`);
    for (const s of p.spawns[0]) assert.ok(Math.floor(s.z) >= 29 && Math.floor(s.z) <= 31, id);
    for (const s of p.spawns[1]) assert.ok(Math.floor(s.z) >= 1 && Math.floor(s.z) <= 3, id);
    assert.deepEqual(p.mine, { x: 10.5, z: 16.5 }, id);
    assert.equal(p.tiles[16 * 21 + 10], T.MINE, id);
    assert.equal(p.tiles[0 * 21 + 0], T.WALL, `${id} far corner is rim`);
  }
});

test('handcrafted maps: 180-degree point symmetry with B<->R, connected, valid per checkMap', () => {
  for (const id of ['canyon', 'lagoons']) {
    assertValid(MAPS[id].rows);
    assert.equal(checkMap(MAPS[id].rows), null, id);
  }
});

test('handcrafted maps have rich cover (walls and bushes) and parse without error', () => {
  for (const id of ['canyon', 'lagoons']) {
    assert.ok(countChar(MAPS[id].rows, '#') >= 40, `${id} walls`);
    assert.ok(countChar(MAPS[id].rows, '"') >= 40, `${id} bushes`);
  }
  assert.ok(countChar(MAPS.lagoons.rows, '~') >= 40, 'lagoons has water pools');
  assert.equal(countChar(MAPS.canyon.rows, '~'), 0, 'canyon is walls and bush lanes');
});

test('generator: 20 seeds give valid, point-symmetric, connected, deterministic maps', () => {
  const distinct = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const rows = generateMap(seed);
    assertValid(rows);
    assert.equal(checkMap(rows), null, `seed ${seed}`);
    parseMap(rows);
    assert.deepEqual(generateMap(seed), rows, `seed ${seed} must be deterministic`);
    assert.ok(countChar(rows, '#') >= 40, `seed ${seed} has walls`);
    assert.ok(countChar(rows, '"') >= 20, `seed ${seed} has bushes`);
    distinct.add(rows.join('|'));
  }
  assert.ok(distinct.size >= 18, 'different seeds give different maps');
});

test('resolveMapRows: handcrafted ids return their rows, random runs the generator', () => {
  assert.deepEqual(resolveMapRows('canyon'), MAPS.canyon.rows);
  assert.deepEqual(resolveMapRows('lagoons'), MAPS.lagoons.rows);
  assert.deepEqual(resolveMapRows('random', 5), generateMap(5));
  for (const id of MAP_IDS) assert.equal(resolveMapRows(id, 3).length, 33, id);
  assert.throws(() => resolveMapRows('nope'));
});

test('parseMap rejects malformed layouts', () => {
  const good = MAPS.canyon.rows;
  assert.throws(() => parseMap(good.slice(0, 32)), 'row count');
  assert.throws(() => parseMap(good.map((r, i) => (i === 0 ? r.slice(0, 20) : r))), 'row length');
  assert.throws(() => parseMap(good.map((r, i) => (i === 0 ? `x${r.slice(1)}` : r))), 'unknown char');
  assert.throws(() => parseMap(good.map((r) => r.replace('M', '.'))), 'missing mine');
  assert.throws(() => parseMap(good.map((r, i) => (i === 29 ? r.replace('B', '.') : r))), 'two blue spawns');
});

test('moveCircle stops at a wall face, slides along it, and moves freely on floor', () => {
  const A = createArena(new THREE.Scene(), parseMap(customRows({ walls: [[10, 10]] })));
  const out = {};
  A.moveCircle(8.5, 10.5, 0.4, 3, 0, out);
  assert.equal(out.hit, true);
  assert.ok(out.x > 9.4 && out.x <= 9.6 + 1e-9, `stops at the face, x=${out.x}`);
  assert.ok(Math.abs(out.z - 10.5) < 1e-9);
  // Diagonal into the face: x is stopped by the wall, z keeps going past the corner.
  A.moveCircle(8.5, 10.5, 0.4, 3, 0.5, out);
  assert.equal(out.hit, true);
  assert.ok(out.x < 9.6, `x=${out.x}`);
  assert.ok(Math.abs(out.z - 11.0) < 1e-6, `slides to z=11, got ${out.z}`);
  // Free floor: exact displacement, no hit.
  A.moveCircle(3.5, 5.5, 0.4, 1, -1, out);
  assert.equal(out.hit, false);
  assert.ok(Math.abs(out.x - 4.5) < 1e-9 && Math.abs(out.z - 4.5) < 1e-9);
});

test('moveCircle is blocked by water but walks over bushes; grid edges block', () => {
  const A = createArena(new THREE.Scene(), parseMap(customRows({ water: [[13, 10]], bushes: [[12, 10]] })));
  const out = {};
  A.moveCircle(11.5, 10.5, 0.4, 3, 0, out);
  assert.equal(out.hit, true);
  assert.ok(out.x > 12.4 && out.x <= 12.6 + 1e-9, `stops before water, x=${out.x}`);
  assert.equal(A.isBushAt(12.5, 10.5), true);
  assert.equal(A.blocksMove(13, 10), true);
  assert.equal(A.blocksShot(13, 10), false);
  A.moveCircle(0.5, 5.5, 0.4, -2, 0, out);
  assert.equal(out.hit, true);
  assert.ok(out.x >= 0.4 - 1e-9 && out.x < 0.6, `stops at the grid edge, x=${out.x}`);
});

test('raycast is blocked by walls only; water and bushes let shots through', () => {
  const A = createArena(new THREE.Scene(), parseMap(customRows({ walls: [[10, 10]], water: [[13, 10]], bushes: [[6, 10]] })));
  assert.ok(Math.abs(A.raycast(8.5, 10.5, 12.5, 10.5) - 0.375) < 1e-9, 'wall face at x=10');
  assert.equal(A.hasLOS(8.5, 10.5, 12.5, 10.5), false);
  assert.equal(A.raycast(11.5, 10.5, 15.5, 10.5), 1, 'water does not block shots');
  assert.equal(A.hasLOS(11.5, 10.5, 15.5, 10.5), true);
  assert.equal(A.raycast(4.5, 10.5, 7.5, 10.5), 1, 'bush does not block shots');
  assert.equal(A.raycast(3.5, 10.5, 5.5, 10.5), 1, 'floor is clear');
  assert.ok(A.raycast(5.5, 0.5, 5.5, -2) < 1, 'grid edge blocks');
  assert.equal(A.tile(-1, 0), T.WALL);
  assert.equal(A.tile(21, 5), T.WALL);
});

test('destroyWalls: tile opens, navVersion bumps, instance hides, event fires, path opens', () => {
  const scene = new THREE.Scene();
  const A = createArena(scene, parseMap(customRows({ walls: [[10, 10], [11, 10]] })));
  const seen = [];
  const off = bus.on(EV.WALL_DESTROYED, (e) => seen.push(e));
  try {
    const nav = A.navVersion;
    assert.equal(A.destroyWalls(10.5, 10.5, 0.2), 1, 'only the touching wall falls');
    assert.equal(A.tile(10, 10), T.FLOOR);
    assert.equal(A.tile(11, 10), T.WALL);
    assert.equal(A.blocksMove(10, 10), false);
    assert.equal(A.blocksShot(10, 10), false);
    assert.equal(A.navVersion, nav + 1);
    assert.deepEqual(seen.map((e) => [e.c, e.r]), [[10, 10]]);
    const walls = scene.getObjectByName('walls');
    const m = new THREE.Matrix4();
    walls.getMatrixAt(0, m);
    assert.equal(m.elements[0], 0, 'destroyed wall instance is scaled to zero');
    walls.getMatrixAt(1, m);
    assert.ok(m.elements[0] > 0, 'neighbouring wall stays');
    assert.equal(A.destroyWalls(0.5, 0.5, 0.1), 0, 'nothing to break on open floor');
    const out = {};
    A.moveCircle(8.5, 10.5, 0.4, 4, 0, out);
    assert.equal(out.hit, true);
    assert.ok(out.x > 10.2 && out.x < 10.7, `passes the hole, stops at the next wall, x=${out.x}`);
  } finally {
    off();
  }
});

test('arena keeps a private tile copy and dispose removes its meshes', () => {
  const scene = new THREE.Scene();
  const parsed = parseMap(customRows({ walls: [[10, 10]] }));
  const A = createArena(scene, parsed);
  assert.notEqual(A.tiles, parsed.tiles);
  assert.equal(A.destroyWalls(10.5, 10.5, 0.2), 1);
  assert.equal(parsed.tiles[10 * 21 + 10], T.WALL, 'parsed map untouched');
  assert.equal(scene.getObjectByName('arena') !== undefined, true);
  A.dispose();
  assert.equal(scene.getObjectByName('arena'), undefined);
  assert.equal(scene.children.length, 0);
});

test('scene mesh count stays within the 14 draw-call budget (world plus crystals)', () => {
  for (const id of ['canyon', 'lagoons']) {
    const scene = new THREE.Scene();
    createArena(scene, parseMap(MAPS[id].rows));
    createCrystalView(scene, 40);
    let meshes = 0;
    scene.traverse((o) => { if (o.isMesh) meshes++; });
    assert.ok(meshes <= 14, `${id}: ${meshes} meshes`);
  }
  const scene = new THREE.Scene();
  createArena(scene, parseMap(generateMap(11)));
  let meshes = 0;
  scene.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes <= 14, `generated: ${meshes} meshes`);
});

test('bushes near the focus squash to ~40% and recover; far bushes are untouched', () => {
  const parsed = parseMap(MAPS.canyon.rows);
  const scene = new THREE.Scene();
  const A = createArena(scene, parsed);
  const bushes = scene.getObjectByName('bushes');
  const instanceOf = (c, r) => {
    const t = r * 21 + c;
    let k = 0;
    for (let i = 0; i < t; i++) if (parsed.tiles[i] === T.BUSH) k++;
    return k;
  };
  const near = instanceOf(1, 8), far = instanceOf(18, 7);
  const m = new THREE.Matrix4();
  const height = (k) => { bushes.getMatrixAt(k, m); return Math.hypot(m.elements[4], m.elements[5], m.elements[6]); };
  const nearH0 = height(near), farH0 = height(far);
  assert.equal(A.isBushAt(1.5, 8.5), true);
  for (let f = 0; f < 120; f++) A.update(1 / 60, f / 60, 1.5, 8.5);
  assert.ok(Math.abs(height(near) - nearH0 * 0.4) < 1e-3, `squashed to ${height(near) / nearH0}`);
  assert.ok(Math.abs(height(far) - farH0) < 1e-6, 'far bush unchanged');
  for (let f = 0; f < 120; f++) A.update(1 / 60, 2 + f / 60, 17.5, 30.5);
  assert.ok(Math.abs(height(near) - nearH0) < 1e-3, 'recovers when the focus leaves');
});

test('crystal view: active gems placed and sized, inactive hidden, dispose removes it', () => {
  const scene = new THREE.Scene();
  const view = createCrystalView(scene, 4);
  const mesh = scene.getObjectByName('crystals');
  const crystals = [
    { active: true, x: 3, y: 0, z: 4, age: 1, settled: true },
    { active: false, x: 0, y: 0, z: 0, age: 0, settled: false },
    null,
    { active: true, x: 5, y: 1, z: 6, age: 0.1, settled: false },
  ];
  view.sync(crystals, 0.5);
  const m = new THREE.Matrix4();
  const size = (k) => { mesh.getMatrixAt(k, m); return Math.hypot(m.elements[0], m.elements[1], m.elements[2]); };
  mesh.getMatrixAt(0, m);
  assert.equal(m.elements[12], 3);
  assert.equal(m.elements[14], 4);
  assert.ok(Math.abs(size(0) - 1) < 1e-6, 'full size');
  assert.equal(size(1), 0, 'inactive hidden');
  assert.equal(size(2), 0, 'empty slot hidden');
  assert.ok(Math.abs(size(3) - 0.4) < 1e-6, 'new crystal pops in');
  view.dispose();
  assert.equal(scene.getObjectByName('crystals'), undefined);
});
