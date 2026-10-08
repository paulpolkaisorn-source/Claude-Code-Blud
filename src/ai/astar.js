// astar.js — 8-way grid A* over arena.blocksMove. No corner cutting (a diagonal step needs both orthogonal
// neighbours free), octile heuristic, typed-array binary heap, shared scratch buffers (no per-search allocation).
// Path cache: LRU of 64 entries per arena, keyed by from/to/navVersion. Unreachable -> 0 (cached too).
// findPath writes tile indices (r*cols+c) start..goal INCLUDING both endpoints and returns the length.

const SQRT2 = Math.SQRT2;
const DIAG_EXTRA = SQRT2 - 1;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
const CACHE_MAX = 64;

// Shared scratch, grown on demand, reused by every search.
let cap = 0;
let gScore = new Float32Array(0);
let parent = new Int32Array(0);
let seen = new Uint32Array(0);     // generation stamp: node touched in this search
let closed = new Uint32Array(0);   // generation stamp: node expanded in this search
let scratch = new Int32Array(0);   // path reconstruction buffer
let heapNode = new Int32Array(0);
let heapKey = new Float32Array(0);
let heapSize = 0;
let gen = 0;

function ensure(cells) {
  if (cells <= cap) return;
  cap = cells;
  gScore = new Float32Array(cells);
  parent = new Int32Array(cells);
  seen = new Uint32Array(cells);
  closed = new Uint32Array(cells);
  scratch = new Int32Array(cells);
  heapNode = new Int32Array(cells * 8 + 16);   // lazy-deletion heap: <= 1 + 8 pushes per expansion
  heapKey = new Float32Array(cells * 8 + 16);
}

function heapPush(node, key) {
  let i = heapSize++;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapKey[p] <= key) break;
    heapKey[i] = heapKey[p];
    heapNode[i] = heapNode[p];
    i = p;
  }
  heapKey[i] = key;
  heapNode[i] = node;
}

function heapPop() {
  const top = heapNode[0];
  const last = --heapSize;
  if (last > 0) {
    const key = heapKey[last];
    const node = heapNode[last];
    let i = 0;
    for (;;) {
      let c = (i << 1) + 1;
      if (c >= last) break;
      if (c + 1 < last && heapKey[c + 1] < heapKey[c]) c++;
      if (heapKey[c] >= key) break;
      heapKey[i] = heapKey[c];
      heapNode[i] = heapNode[c];
      i = c;
    }
    heapKey[i] = key;
    heapNode[i] = node;
  }
  return top;
}

// Octile distance between tile coordinates (exact lower bound for the 8-way cost model).
function octile(x0, y0, x1, y1) {
  const dx = Math.abs(x0 - x1);
  const dy = Math.abs(y0 - y1);
  return dx > dy ? dx + DIAG_EXTRA * dy : dy + DIAG_EXTRA * dx;
}

// Runs the search; on success the path (start..goal) is in `scratch[0..len)` and len is returned.
function search(arena, from, to, cols, rows) {
  ensure(cols * rows);
  const g = ++gen;
  const tx = to % cols;
  const ty = (to - tx) / cols;
  const fx = from % cols;
  const fy = (from - fx) / cols;
  heapSize = 0;
  gScore[from] = 0;
  parent[from] = -1;
  seen[from] = g;
  heapPush(from, octile(fx, fy, tx, ty));

  let found = false;
  while (heapSize > 0) {
    const cur = heapPop();
    if (closed[cur] === g) continue;
    if (cur === to) { found = true; break; }
    closed[cur] = g;
    const cx = cur % cols;
    const cy = (cur - cx) / cols;
    const gc = gScore[cur];
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k];
      const ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (arena.blocksMove(nx, ny)) continue;
      const diag = DX[k] !== 0 && DY[k] !== 0;
      if (diag && (arena.blocksMove(nx, cy) || arena.blocksMove(cx, ny))) continue; // no corner cutting
      const n = ny * cols + nx;
      if (closed[n] === g) continue;
      const ng = gc + (diag ? SQRT2 : 1);
      if (seen[n] !== g || ng < gScore[n]) {
        seen[n] = g;
        gScore[n] = ng;
        parent[n] = cur;
        heapPush(n, ng + octile(nx, ny, tx, ty));
      }
    }
  }
  if (!found) return 0;

  let len = 0;
  for (let n = to; n !== -1; n = parent[n]) scratch[len++] = n;   // goal -> start
  for (let i = 0, j = len - 1; i < j; i++, j--) {
    const t = scratch[i];
    scratch[i] = scratch[j];
    scratch[j] = t;
  }
  return len;
}

const caches = new WeakMap();   // arena -> Map<key, Int32Array path> (insertion order = LRU order)

// Shortest 8-way path from tile (c0,r0) to tile (c1,r1). Fills `out` with tile indices r*cols+c, start..goal.
// Returns the number of tiles written, or 0 when unreachable or out of bounds.
export function findPath(arena, c0, r0, c1, r1, out) {
  const cols = arena.cols;
  const rows = arena.rows;
  if (c0 < 0 || r0 < 0 || c1 < 0 || r1 < 0 || c0 >= cols || c1 >= cols || r0 >= rows || r1 >= rows) return 0;
  const cells = cols * rows;
  const from = r0 * cols + c0;
  const to = r1 * cols + c1;

  let cache = caches.get(arena);
  if (cache === undefined) { cache = new Map(); caches.set(arena, cache); }
  const key = ((arena.navVersion | 0) * cells + from) * cells + to;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);          // refresh LRU position
    cache.set(key, hit);
    for (let i = 0; i < hit.length; i++) out[i] = hit[i];
    return hit.length;
  }

  const n = search(arena, from, to, cols, rows);
  const stored = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    stored[i] = scratch[i];
    out[i] = scratch[i];
  }
  cache.set(key, stored);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return n;
}

// Drops every cached path for one arena (tests / hard resets).
export function clearPathCache(arena) {
  caches.delete(arena);
}
