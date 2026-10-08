// ai.test.mjs — unit tests for src/ai/astar.js and src/ai/bots.js. Fake arena only (no THREE, no DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { BRAWLERS, DT, T, makeBrawler } from '../../src/contracts.js';
import { findPath, clearPathCache } from '../../src/ai/astar.js';
import { createAI, INTENT } from '../../src/ai/bots.js';

const CH = { '.': T.FLOOR, '#': T.WALL, '"': T.BUSH, '~': T.WATER };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Fake arena with the ARCHITECTURE.md surface the AI uses (tile, blocksMove, blocksShot, hasLOS, navVersion, spawns).
function makeArena(rowStrings, spawns) {
  const rows = rowStrings.length;
  const cols = rowStrings[0].length;
  const tiles = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) tiles[r * cols + c] = CH[rowStrings[r][c]] ?? T.FLOOR;
  }
  const tile = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? T.WALL : tiles[r * cols + c]);
  return {
    cols, rows, tiles, tile, navVersion: 0,
    spawns: spawns ?? [[{ x: cols / 2, z: rows - 1.5 }], [{ x: cols / 2, z: 1.5 }]],
    mine: { x: cols / 2, z: rows / 2 },
    blocksMove: (c, r) => { const t = tile(c, r); return t === T.WALL || t === T.WATER; },
    blocksShot: (c, r) => tile(c, r) === T.WALL,
    hasLOS(x0, z0, x1, z1) {
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 4);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (tile(Math.floor(x0 + (x1 - x0) * t), Math.floor(z0 + (z1 - z0) * t)) === T.WALL) return false;
      }
      return true;
    },
  };
}

// 21x33 open field (BLUE spawn near row 32, RED near row 0) with the given wall tiles [c, r].
function openArena(walls = []) {
  const grid = [];
  for (let r = 0; r < 33; r++) grid.push(Array(21).fill('.'));
  for (const [c, r] of walls) grid[r][c] = '#';
  return makeArena(grid.map((row) => row.join('')));
}

// Reference optimal cost (plain O(n^2) Dijkstra with the same movement rules).
function refCost(arena, c0, r0, c1, r1) {
  const { cols, rows } = arena;
  const N = cols * rows;
  const d = new Float64Array(N).fill(Infinity);
  const done = new Uint8Array(N);
  const s = r0 * cols + c0;
  const g = r1 * cols + c1;
  d[s] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0) return Infinity;
    if (u === g) return d[u];
    done[u] = 1;
    const cx = u % cols;
    const cy = (u - cx) / cols;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (arena.blocksMove(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (arena.blocksMove(nx, cy) || arena.blocksMove(cx, ny))) continue;
      const v = ny * cols + nx;
      const nd = d[u] + (diag ? Math.SQRT2 : 1);
      if (nd < d[v]) d[v] = nd;
    }
  }
}

// Validates a returned path (adjacent steps, no blocked tiles, no corner cutting) and returns its cost.
function checkPath(arena, out, len) {
  const { cols } = arena;
  let cost = 0;
  for (let i = 0; i < len; i++) {
    const c = out[i] % cols;
    const r = (out[i] - c) / cols;
    assert.ok(!arena.blocksMove(c, r), `path enters blocked tile ${c},${r}`);
    if (i === 0) continue;
    const pc = out[i - 1] % cols;
    const pr = (out[i - 1] - pc) / cols;
    const dx = c - pc;
    const dy = r - pr;
    assert.ok(Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy), 'steps must be adjacent');
    if (dx && dy) {
      assert.ok(!arena.blocksMove(c, pr) && !arena.blocksMove(pc, r), 'diagonal step cuts a corner');
      cost += Math.SQRT2;
    } else {
      cost += 1;
    }
  }
  return cost;
}

function unit(id, brawlerId, team, x, z) {
  const b = makeBrawler(id, brawlerId, team, id);
  b.x = x;
  b.z = z;
  b.px = x;
  b.pz = z;
  return b;
}

// Simple axis-sliding integration of b.input movement (test-only; the real game uses arena.moveCircle).
function moveBot(arena, b, dt) {
  const step = BRAWLERS[b.brawlerId].speed * dt;
  const nx = b.x + b.input.moveX * step;
  const nz = b.z + b.input.moveZ * step;
  const solid = (x, z) => arena.blocksMove(Math.floor(x), Math.floor(z));
  if (!solid(nx, nz)) { b.x = nx; b.z = nz; }
  else if (!solid(nx, b.z)) b.x = nx;
  else if (!solid(b.x, nz)) b.z = nz;
}

const ctxOf = (brawlers, extra = {}) => ({
  brawlers, crystals: [], mine: null, teamCrystals: [0, 0], countdownTeam: -1, time: 0, ...extra,
});

test('A* returns the optimal 8-way path around a wall', () => {
  const arena = makeArena([
    '.........',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '.........',
    '.........',
  ]);
  const out = new Int32Array(arena.cols * arena.rows);
  const pairs = [[0, 2, 8, 2], [0, 0, 8, 0], [1, 6, 7, 0], [4, 0, 4, 6], [0, 3, 8, 3]];
  for (const [c0, r0, c1, r1] of pairs) {
    const len = findPath(arena, c0, r0, c1, r1, out);
    assert.ok(len > 1, `no path for ${c0},${r0} -> ${c1},${r1}`);
    assert.equal(out[0], r0 * arena.cols + c0, 'path starts at the start tile');
    assert.equal(out[len - 1], r1 * arena.cols + c1, 'path ends at the goal tile');
    const cost = checkPath(arena, out, len);
    assert.ok(Math.abs(cost - refCost(arena, c0, r0, c1, r1)) < 1e-6, `not optimal for ${c0},${r0} -> ${c1},${r1}`);
  }
});

test('A* never cuts a corner diagonally', () => {
  // Start (0,1) and goal (1,0) are diagonal neighbours, but both orthogonal tiles around the step are blocked.
  const arena = makeArena([
    '#..',
    '.#.',
    '...',
  ]);
  const out = new Int32Array(9);
  const len = findPath(arena, 0, 1, 1, 0, out);
  assert.ok(len > 2, 'the diagonal step is not allowed');
  const cost = checkPath(arena, out, len);
  assert.ok(Math.abs(cost - refCost(arena, 0, 1, 1, 0)) < 1e-6);
});

test('A* returns 0 when the goal is unreachable', () => {
  const arena = makeArena([
    '.......',
    '..###..',
    '..#.#..',
    '..###..',
    '.......',
  ]);
  const out = new Int32Array(35);
  assert.equal(findPath(arena, 0, 0, 3, 2, out), 0);
  assert.equal(findPath(arena, 0, 0, 3, 2, out), 0, 'unreachable result is cached too');
});

test('A* path cache: repeat query hits, navVersion bump invalidates', () => {
  const arena = openArena([[10, 5], [10, 6], [10, 7]]);
  let calls = 0;
  const orig = arena.blocksMove;
  arena.blocksMove = (c, r) => { calls++; return orig(c, r); };
  const a = new Int32Array(arena.cols * arena.rows);
  const b = new Int32Array(arena.cols * arena.rows);
  const n1 = findPath(arena, 0, 0, 20, 30, a);
  const firstCalls = calls;
  calls = 0;
  const n2 = findPath(arena, 0, 0, 20, 30, b);
  assert.ok(firstCalls > 0, 'first query searches');
  assert.equal(calls, 0, 'second query is served from cache');
  assert.equal(n2, n1);
  assert.deepEqual(Array.from(b.subarray(0, n2)), Array.from(a.subarray(0, n1)));
  arena.navVersion++;
  calls = 0;
  findPath(arena, 0, 0, 20, 30, b);
  assert.ok(calls > 0, 'a new navVersion forces a fresh search');
  clearPathCache(arena);
});

test('bot moves toward a crystal', () => {
  const arena = openArena();
  const b = unit('a', 'pip', 0, 2.5, 12.5);
  const crystal = { active: true, x: 12.5, y: 0, z: 2.5, vx: 0, vy: 0, vz: 0, age: 0, settled: true };
  const ai = createAI({ arena, combat: {} });
  ai.addBot(b, 'normal');
  const ctx = ctxOf([b], { crystals: [crystal] });
  ai.update(DT, ctx);
  const dx = crystal.x - b.x;
  const dz = crystal.z - b.z;
  const L = Math.hypot(dx, dz);
  const dot = (b.input.moveX * dx + b.input.moveZ * dz) / L;
  assert.ok(dot > 0.9, `first move should head to the crystal (dot ${dot.toFixed(3)})`);
  for (let i = 1; i < 300; i++) {
    ctx.time += DT;
    ai.update(DT, ctx);
    moveBot(arena, b, DT);
  }
  assert.ok(Math.hypot(crystal.x - b.x, crystal.z - b.z) < 1.0, 'bot reaches the crystal');
});

test('bot aims at a visible enemy and fires after its reaction delay', () => {
  const arena = openArena();
  const b = unit('a', 'pip', 0, 10.5, 20.5);
  const e = unit('e', 'rivet', 1, 10.5, 16.5); // 4 tiles north of the bot
  const ai = createAI({ arena, combat: {} });
  ai.addBot(b, 'normal');
  const ctx = ctxOf([b, e]);
  ai.update(DT, ctx);
  assert.equal(b.input.aiming, true);
  // Normal difficulty: angular error at most 0.35 * (1 - 0.6) = 0.14 rad.
  const angle = Math.abs(Math.atan2(b.input.aimX, -b.input.aimZ));
  assert.ok(angle <= 0.141, `aim error ${angle.toFixed(3)} rad too large`);
  let firstFire = -1;
  for (let i = 1; i < 60 && firstFire < 0; i++) {
    ai.update(DT, ctx);
    if (b.input.fire) firstFire = i;
    moveBot(arena, b, DT);
  }
  assert.ok(firstFire >= 10, `fired too early (tick ${firstFire}), reaction delay ignored`);
  assert.ok(firstFire > 0 && firstFire <= 45, `never fired at the visible enemy (tick ${firstFire})`);
});

test('bot ignores an enemy hidden from its team', () => {
  const arena = openArena();
  const b = unit('a', 'pip', 0, 10.5, 20.5);
  const e = unit('e', 'rivet', 1, 10.5, 16.5);
  e.visibleTo = [false, false];
  const ai = createAI({ arena, combat: {} });
  ai.addBot(b, 'hard');
  const ctx = ctxOf([b, e]);
  for (let i = 0; i < 120; i++) {
    ai.update(DT, ctx);
    assert.equal(b.input.fire, false, 'must not fire at a hidden enemy');
    assert.equal(b.input.superFire, false, 'must not super a hidden enemy');
    assert.equal(b.input.aiming, false, 'must not aim at a hidden enemy');
    moveBot(arena, b, DT);
  }
});

test('bot does not fire without line of sight', () => {
  const walls = [];
  for (let c = 0; c < 21; c++) walls.push([c, 17]); // full-width wall between the two bots
  const arena = openArena(walls);
  const b = unit('a', 'pip', 0, 10.5, 19.5);
  const e = unit('e', 'rivet', 1, 10.5, 15.5);
  const ai = createAI({ arena, combat: {} });
  ai.addBot(b, 'hard');
  const ctx = ctxOf([b, e]);
  for (let i = 0; i < 60; i++) {
    ai.update(DT, ctx);
    assert.equal(b.input.fire, false, 'walls block the shot');
    moveBot(arena, b, DT);
  }
});

test('bot retreats toward its spawn when hp is low', () => {
  const arena = openArena();
  const b = unit('a', 'rivet', 0, 10.5, 20.5);
  b.hp = b.maxHp * 0.2;
  const spawn = arena.spawns[0][0];
  const ai = createAI({ arena, combat: {} });
  ai.addBot(b, 'normal');
  const ctx = ctxOf([b]);
  const d0 = Math.hypot(spawn.x - b.x, spawn.z - b.z);
  for (let i = 0; i < 180; i++) {
    ai.update(DT, ctx);
    moveBot(arena, b, DT);
  }
  assert.equal(ai.intentOf(b), INTENT.RETREAT);
  const d1 = Math.hypot(spawn.x - b.x, spawn.z - b.z);
  assert.ok(d1 < d0 - 4, `retreat did not close the distance to spawn (${d0.toFixed(2)} -> ${d1.toFixed(2)})`);
});

test('six bots for 600 ticks update in under 50 ms', () => {
  const walls = [];
  for (let c = 0; c < 21; c++) if (c !== 3 && c !== 17) walls.push([c, 16]);
  const arena = openArena(walls);
  const ids = ['rivet', 'pip', 'mortara', 'lumen', 'pip', 'rivet'];
  const bots = ids.map((id, i) => unit(`bot${i}`, id, i % 2, 4.5 + 6 * (i >> 1), i % 2 === 0 ? 28.5 : 4.5));
  const ai = createAI({ arena, combat: {} });
  for (const b of bots) ai.addBot(b, 'hard');
  const crystals = [[3.5, 10.5], [17.5, 10.5], [10.5, 14.5], [6.5, 22.5], [14.5, 22.5]].map(([x, z]) => (
    { active: true, x, y: 0, z, vx: 0, vy: 0, vz: 0, age: 0, settled: true }
  ));
  const ctx = ctxOf(bots, { crystals, mine: arena.mine });
  let ms = 0;
  for (let i = 0; i < 600; i++) {
    const t0 = performance.now();
    ai.update(DT, ctx);
    ms += performance.now() - t0;
    for (const b of bots) moveBot(arena, b, DT);
    ctx.time += DT;
  }
  assert.ok(ms < 50, `six bots x 600 ticks took ${ms.toFixed(2)} ms`);
});

test('lumen totem and beam heal a hurt ally in range', () => {
  const arena = openArena();
  const healer = unit('l', 'lumen', 0, 10.5, 25.5);
  const ally = unit('a', 'rivet', 0, 12.5, 25.5);
  ally.hp = ally.maxHp * 0.3;
  healer.superCharge = 1;
  const ai = createAI({ arena, combat: {} });
  ai.addBot(healer, 'normal');
  ai.update(DT, ctxOf([healer, ally]));
  assert.equal(healer.input.superFire, true, 'totem is placed on the hurt ally');
  assert.ok(healer.input.aimX > 0.99, 'totem aimed east at the ally');
  healer.superCharge = 0;
  ai.update(DT, ctxOf([healer, ally]));
  assert.equal(healer.input.superFire, false);
  assert.equal(healer.input.fire, true, 'beam fires at the hurt ally');
  assert.ok(healer.input.aimX > 0.99, 'beam aimed east at the ally');
});

test('a crystal carrier holds its own side instead of chasing an enemy', () => {
  const arena = openArena();
  const carrier = unit('c', 'rivet', 0, 10.5, 26.5);
  carrier.crystals = 5;
  const foe = unit('f', 'pip', 1, 10.5, 18.5); // 8 tiles away, outside the rivet engage radius (6)
  const ai = createAI({ arena, combat: {} });
  ai.addBot(carrier, 'normal');
  const ctx = ctxOf([carrier, foe]);
  for (let i = 0; i < 200; i++) {
    ai.update(DT, ctx);
    moveBot(arena, carrier, DT);
  }
  assert.equal(ai.intentOf(carrier), INTENT.PROTECT);
  assert.ok(carrier.z > 29, `carrier should fall back to its side (z ${carrier.z.toFixed(2)})`);
});

test('a bot regroups toward an ally carrier that has enemies close to it', () => {
  const arena = openArena();
  const bot = unit('b', 'rivet', 0, 10.5, 30.5);
  const carrier = unit('c', 'pip', 0, 10.5, 20.5);
  carrier.crystals = 1;
  const foe = unit('f', 'mortara', 1, 10.5, 14.5); // 6 tiles from the carrier, 8 from the approaching bot
  const ai = createAI({ arena, combat: {} });
  ai.addBot(bot, 'normal');
  const ctx = ctxOf([bot, carrier, foe]);
  ai.update(DT, ctx);
  assert.equal(ai.intentOf(bot), INTENT.REGROUP);
  for (let i = 0; i < 200; i++) {
    ai.update(DT, ctx);
    moveBot(arena, bot, DT);
  }
  assert.ok(Math.hypot(carrier.x - bot.x, carrier.z - bot.z) < 3, 'bot ends near the carrier');
});

test('every brawler kit runs with finite, bounded inputs under random scenarios', () => {
  const rand = lcg(7);
  const walls = [];
  for (let i = 0; i < 40; i++) walls.push([Math.floor(rand() * 21), Math.floor(rand() * 33)]);
  const arena = openArena(walls);
  for (const id of ['rivet', 'pip', 'mortara', 'lumen']) {
    const bots = [];
    for (let i = 0; i < 4; i++) {
      const b = unit(`${id}${i}`, id, i % 2, 1.5 + rand() * 18, 1.5 + rand() * 30);
      b.hp = b.maxHp * (0.1 + 0.9 * rand());
      b.ammo = Math.floor(rand() * 4);
      b.superCharge = rand() < 0.5 ? 1 : 0.3;
      b.crystals = i === 0 ? 5 : i === 2 ? 1 : 0;
      bots.push(b);
    }
    const ai = createAI({ arena, combat: {} });
    for (const b of bots) ai.addBot(b, rand() < 0.5 ? 'easy' : 'hard');
    const crystals = [
      { active: true, x: 10.5, y: 0, z: 16.5, vx: 0, vy: 0, vz: 0, age: 0, settled: true },
      { active: true, x: 5.5, y: 0, z: 8.5, vx: 0, vy: 0, vz: 0, age: 0, settled: true },
    ];
    const ctx = ctxOf(bots, { crystals, mine: arena.mine, teamCrystals: [1, 2], countdownTeam: 1 });
    for (let tick = 0; tick < 300; tick++) {
      ai.update(DT, ctx);
      for (const b of bots) {
        const inp = b.input;
        for (const v of [inp.moveX, inp.moveZ, inp.aimX, inp.aimZ, inp.aimLen]) {
          assert.ok(Number.isFinite(v), `${id}: non-finite input at tick ${tick}`);
        }
        assert.ok(Math.hypot(inp.moveX, inp.moveZ) <= 1 + 1e-9, `${id}: move magnitude above 1`);
        assert.ok(inp.aimLen >= 0 && inp.aimLen <= 1 + 1e-9, `${id}: aimLen out of range`);
        moveBot(arena, b, DT);
      }
      ctx.time += DT;
    }
  }
});

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
