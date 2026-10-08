// generator.js — deterministic random arenas (same seed -> same rows) and the shared map validity check.
// Obstacles are placed as point-symmetric pairs in small blobs. A blob is kept only if every walkable tile stays
// connected to the mine, so each generated map is valid by construction. checkMap() re-verifies the full contract.
import { GRID, T, MAP_CHARS } from '../contracts.js';
import { MAPS } from './maps.js';

const C = GRID.cols, R = GRID.rows, N = C * R;
const MINE_C = (C - 1) / 2, MINE_R = (R - 1) / 2;   // (10,16)
const MINE_IDX = MINE_R * C + MINE_C;
const BLOBS = 46;                                    // obstacle blobs attempted per map
const CHAR_OF = [];
for (const ch of Object.keys(MAP_CHARS)) CHAR_OF[MAP_CHARS[ch]] = ch;

const walkable = (t) => t !== T.WALL && t !== T.WATER;
const otherTeam = (t) => (t === T.SPAWN0 ? T.SPAWN1 : t === T.SPAWN1 ? T.SPAWN0 : t);
const mirror = (i) => (R - 1 - ((i / C) | 0)) * C + (C - 1 - (i % C));   // 180-degree rotation

// mulberry32 seeded through an integer hash, so nearby seeds give unrelated maps.
function makeRng(seed) {
  let h = Math.imul((Math.floor(Number(seed)) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  let a = h | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Count of walkable tiles reachable from `start` (4-neighbour flood fill).
function reachCount(g, start) {
  const seen = new Uint8Array(N), stack = new Int32Array(N);
  let sp = 0, n = 0;
  seen[start] = 1; stack[sp++] = start;
  while (sp > 0) {
    const i = stack[--sp];
    n++;
    const c = i % C;
    for (let k = 0; k < 4; k++) {
      let j;
      if (k === 0) { if (c === 0) continue; j = i - 1; }
      else if (k === 1) { if (c === C - 1) continue; j = i + 1; }
      else if (k === 2) { if (i < C) continue; j = i - C; }
      else { if (i >= N - C) continue; j = i + C; }
      if (!seen[j] && walkable(g[j])) { seen[j] = 1; stack[sp++] = j; }
    }
  }
  return n;
}

function walkableCount(g) {
  let n = 0;
  for (let i = 0; i < N; i++) if (walkable(g[i])) n++;
  return n;
}

const allowed = (g, guard, i, kind) => {
  if (kind === T.BUSH) return g[i] === T.FLOOR;
  return !guard[i] && (g[i] === T.FLOOR || g[i] === T.BUSH);
};

function build(seed) {
  const rng = makeRng(seed);
  const g = new Uint8Array(N);                       // starts all FLOOR
  g[MINE_IDX] = T.MINE;

  // Spawns: three columns at least 3 apart, one per home row (29-31), mirrored onto the far base (rows 1-3).
  const cols = [];
  while (cols.length < 3) {
    const c = 2 + Math.floor(rng() * (C - 4));
    if (cols.every((k) => Math.abs(k - c) >= 3)) cols.push(c);
  }
  const homeRows = [29, 30, 31];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = homeRows[i]; homeRows[i] = homeRows[j]; homeRows[j] = t;
  }
  const spawnIdx = [];
  for (let k = 0; k < 3; k++) {
    const b = homeRows[k] * C + cols[k];
    g[b] = T.SPAWN0;
    g[mirror(b)] = T.SPAWN1;
    spawnIdx.push(b);
  }

  // No walls or water within one tile of a spawn or the mine (bushes may sit there).
  const guard = new Uint8Array(N);
  for (const i of [MINE_IDX, ...spawnIdx, ...spawnIdx.map(mirror)]) {
    const c0 = i % C, r0 = (i / C) | 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = c0 + dc, r = r0 + dr;
        if (c >= 0 && c < C && r >= 0 && r < R) guard[r * C + c] = 1;
      }
    }
  }

  // Solid far and near rims like the handcrafted maps, except cells beside a spawn (mirror-symmetric by construction).
  for (let c = 0; c < C; c++) {
    if (!guard[c]) g[c] = T.WALL;
    if (!guard[(R - 1) * C + c]) g[(R - 1) * C + c] = T.WALL;
  }

  const cells = [], changed = [];
  for (let n = 0; n < BLOBS; n++) {
    const roll = rng();
    const kind = roll < 0.5 ? T.WALL : roll < 0.8 ? T.BUSH : T.WATER;
    const size = kind === T.BUSH ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 4);
    cells.length = 0;
    cells.push((1 + Math.floor(rng() * 15)) * C + (1 + Math.floor(rng() * (C - 2))));
    while (cells.length < size) {
      const base = cells[Math.floor(rng() * cells.length)];
      const d = Math.floor(rng() * 4);
      const c = (base % C) + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const r = ((base / C) | 0) + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (c < 1 || c > C - 2 || r < 1 || r > R - 2) continue;
      const j = r * C + c;
      if (!cells.includes(j)) cells.push(j);
    }

    // Write each cell together with its mirror (skipping pairs that are not allowed) so symmetry always holds.
    changed.length = 0;
    for (const i of cells) {
      const m = mirror(i);
      if (!allowed(g, guard, i, kind) || !allowed(g, guard, m, kind)) continue;
      changed.push(i, g[i]); g[i] = kind;
      if (m !== i) { changed.push(m, g[m]); g[m] = kind; }
    }
    // Walls and water can cut the map; bushes never can. Revert the blob if anything became unreachable.
    if (changed.length && kind !== T.BUSH && reachCount(g, MINE_IDX) !== walkableCount(g)) {
      for (let k = changed.length - 2; k >= 0; k -= 2) g[changed[k]] = changed[k + 1];
    }
  }

  const rows = [];
  for (let r = 0; r < R; r++) {
    let s = '';
    for (let c = 0; c < C; c++) s += CHAR_OF[g[r * C + c]];
    rows.push(s);
  }
  return rows;
}

// Returns null when rows satisfy the full map contract (shape, legend, symmetry, spawns, mine, connectivity),
// otherwise a short reason string.
export function checkMap(rows) {
  if (!Array.isArray(rows) || rows.length !== R) return `expected ${R} rows`;
  const g = new Uint8Array(N);
  for (let r = 0; r < R; r++) {
    if (typeof rows[r] !== 'string' || rows[r].length !== C) return `row ${r} must be ${C} chars`;
    for (let c = 0; c < C; c++) {
      const t = MAP_CHARS[rows[r][c]];
      if (t === undefined) return `bad char at ${c},${r}`;
      g[r * C + c] = t;
    }
  }
  const bRows = [], rRows = [];
  let mines = 0;
  for (let i = 0; i < N; i++) {
    const t = g[i], r = (i / C) | 0;
    if (otherTeam(t) !== g[mirror(i)]) return `not point-symmetric at ${i % C},${r}`;
    if (t === T.SPAWN0) bRows.push(r);
    else if (t === T.SPAWN1) rRows.push(r);
    else if (t === T.MINE) {
      mines++;
      if (i !== MINE_IDX) return `M must sit at (${MINE_C},${MINE_R})`;
    }
  }
  if (mines !== 1) return 'exactly one M required';
  if (bRows.sort((a, b) => a - b).join() !== '29,30,31') return 'B spawns must be one per row in 29-31';
  if (rRows.sort((a, b) => a - b).join() !== '1,2,3') return 'R spawns must be one per row in 1-3';
  if (reachCount(g, MINE_IDX) !== walkableCount(g)) return 'walkable tiles are not all connected';
  return null;
}

// Deterministic random map: the same seed always yields the same 33 rows. Falls back to derived seeds if a build
// ever fails validation (it should not, since every placement is connectivity-checked).
export function generateMap(seed = 0) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = build(Number(seed) + attempt * 7919);
    if (checkMap(rows) === null) return rows;
  }
  throw new Error(`generateMap: no valid layout for seed ${seed}`);
}

// Rows for any MAP_IDS entry: handcrafted maps return their literal rows, 'random' runs the generator with `seed`.
export function resolveMapRows(id, seed = 0) {
  if (id === 'random') return generateMap(seed);
  if (!Object.prototype.hasOwnProperty.call(MAPS, id)) throw new Error(`unknown map id '${id}'`);
  return MAPS[id].rows;
}
