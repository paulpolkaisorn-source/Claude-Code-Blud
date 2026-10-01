// 2D navigation grid over the (flat) arena floor + A* + line of sight. Pure.
import type { Vec3 } from "../util/vec";

export const enum Cell {
  Floor = 0,
  Wall = 1, // full-height wall: blocks movement and sight
  Window = 2, // wall with an opening: blocks movement, not sight
  Door = 3, // doorway with a door: passable, sight passes (bots open doors)
  Low = 4, // 1-block-high obstacle (crate, generator, pew): blocks bot movement, not sight
  Pillar = 5, // full-height column/tree: blocks movement and sight
  Void = 6, // outside the arena
}

export interface GridPos {
  x: number;
  z: number;
}

export class NavGrid {
  readonly size: number;
  readonly cells: Uint8Array;
  /** World coordinates of grid cell (0,0)'s minimum corner; floor top at originY. */
  readonly originX: number;
  readonly originY: number;
  readonly originZ: number;
  /** Extra per-cell blockers placed at runtime (spikes, buildings) — counted, so overlapping blockers stack. */
  private readonly dynamicBlock: Uint16Array;
  private gScore: Float32Array | null = null;
  private came: Int32Array | null = null;
  private stamp: Uint32Array | null = null;
  private closedStamp: Uint32Array | null = null;
  private searchGen = 0;
  private readonly heap = new MinHeap();
  private readonly fieldHeap = new MinHeap();

  constructor(size: number, origin: Vec3, cells?: Uint8Array) {
    this.size = size;
    this.cells = cells ?? new Uint8Array(size * size);
    this.originX = origin.x;
    this.originY = origin.y;
    this.originZ = origin.z;
    this.dynamicBlock = new Uint16Array(size * size);
  }

  idx(x: number, z: number): number {
    return z * this.size + x;
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.size && z < this.size;
  }

  get(x: number, z: number): Cell {
    return this.inBounds(x, z) ? (this.cells[this.idx(x, z)] as Cell) : Cell.Void;
  }

  set(x: number, z: number, c: Cell): void {
    if (this.inBounds(x, z)) this.cells[this.idx(x, z)] = c;
  }

  addDynamic(x: number, z: number): void {
    if (this.inBounds(x, z)) this.dynamicBlock[this.idx(x, z)]++;
  }

  removeDynamic(x: number, z: number): void {
    if (this.inBounds(x, z) && this.dynamicBlock[this.idx(x, z)] > 0) this.dynamicBlock[this.idx(x, z)]--;
  }

  clearDynamic(): void {
    this.dynamicBlock.fill(0);
  }

  isDynamicBlocked(x: number, z: number): boolean {
    return this.inBounds(x, z) && this.dynamicBlock[this.idx(x, z)] > 0;
  }

  /** Bots can stand / walk here. */
  walkable(x: number, z: number): boolean {
    const c = this.get(x, z);
    return (c === Cell.Floor || c === Cell.Door) && !this.isDynamicBlocked(x, z);
  }

  /** Sight passes through this cell (at eye height). */
  seeThrough(x: number, z: number): boolean {
    const c = this.get(x, z);
    return c === Cell.Floor || c === Cell.Door || c === Cell.Window || c === Cell.Low;
  }

  /** Projectiles that do not pass walls stop in these cells (at body height). */
  blocksProjectile(x: number, z: number, yAboveFloor: number): boolean {
    const c = this.get(x, z);
    if (c === Cell.Wall || c === Cell.Pillar || c === Cell.Void) return true;
    if (c === Cell.Window) return yAboveFloor < 1 || yAboveFloor >= 3;
    if (c === Cell.Low) return yAboveFloor < 1;
    return false;
  }

  /** Solid for dashes (actors crash into these). */
  blocksBody(x: number, z: number): boolean {
    const c = this.get(x, z);
    return c === Cell.Wall || c === Cell.Pillar || c === Cell.Void || c === Cell.Window || c === Cell.Low || this.isDynamicBlocked(x, z);
  }

  toGrid(p: Vec3): GridPos {
    return { x: Math.floor(p.x - this.originX), z: Math.floor(p.z - this.originZ) };
  }

  /** World position of a cell's center at floor level. */
  toWorld(g: GridPos): Vec3 {
    return { x: this.originX + g.x + 0.5, y: this.originY, z: this.originZ + g.z + 0.5 };
  }

  /** True when the straight segment a→b stays in see-through cells (2D DDA). */
  lineOfSight(a: Vec3, b: Vec3): boolean {
    return this.traverse(a, b, (x, z) => this.seeThrough(x, z));
  }

  /** True when a body can walk straight from a to b (used for path smoothing). */
  walkLine(a: Vec3, b: Vec3, clearance = 0.3): boolean {
    // Check three parallel lines (center and both sides) so corners are not clipped.
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) return this.walkable(...this.cellOf(a));
    const ox = (-dz / l) * clearance;
    const oz = (dx / l) * clearance;
    for (const s of [0, 1, -1]) {
      const pa = { x: a.x + ox * s, y: a.y, z: a.z + oz * s };
      const pb = { x: b.x + ox * s, y: b.y, z: b.z + oz * s };
      if (!this.traverse(pa, pb, (x, z) => this.walkable(x, z))) return false;
    }
    return true;
  }

  private cellOf(p: Vec3): [number, number] {
    return [Math.floor(p.x - this.originX), Math.floor(p.z - this.originZ)];
  }

  /** Amanatides–Woo voxel traversal over grid cells between two points. */
  traverse(a: Vec3, b: Vec3, ok: (x: number, z: number) => boolean): boolean {
    let x = Math.floor(a.x - this.originX);
    let z = Math.floor(a.z - this.originZ);
    const ex = Math.floor(b.x - this.originX);
    const ez = Math.floor(b.z - this.originZ);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
    const fx = a.x - this.originX;
    const fz = a.z - this.originZ;
    let tMaxX = stepX !== 0 ? ((stepX > 0 ? x + 1 : x) - fx) / dx : Infinity;
    let tMaxZ = stepZ !== 0 ? ((stepZ > 0 ? z + 1 : z) - fz) / dz : Infinity;
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;
    let guard = 0;
    if (!ok(x, z)) return false;
    while ((x !== ex || z !== ez) && guard++ < 4096) {
      if (tMaxX < tMaxZ) {
        tMaxX += tDeltaX;
        x += stepX;
      } else {
        tMaxZ += tDeltaZ;
        z += stepZ;
      }
      if (!ok(x, z)) return false;
    }
    return true;
  }

  /**
   * A* over walkable cells, 8-connected, no corner cutting. Returns the cell path (start..goal) or null.
   * `maxNodes` bounds the work per call.
   */
  findPath(start: GridPos, goal: GridPos, maxNodes = 6000): GridPos[] | null {
    const s = this.nearestWalkable(start, 4);
    const g = this.nearestWalkable(goal, 6);
    if (!s || !g) return null;
    const N = this.size * this.size;
    // Reused buffers with generation stamps: no per-call allocation (matters in the Bedrock JS runtime).
    if (!this.gScore || this.gScore.length !== N) {
      this.gScore = new Float32Array(N);
      this.came = new Int32Array(N);
      this.stamp = new Uint32Array(N);
      this.closedStamp = new Uint32Array(N);
    }
    const gen = ++this.searchGen;
    const gScore = this.gScore;
    const came = this.came as Int32Array;
    const stamp = this.stamp as Uint32Array;
    const closed = this.closedStamp as Uint32Array;
    const heap = this.heap;
    heap.clear();
    const si = this.idx(s.x, s.z);
    const gi = this.idx(g.x, g.z);
    gScore[si] = 0;
    came[si] = -1;
    stamp[si] = gen;
    heap.push(si, octile(s, g));
    let expanded = 0;
    while (heap.size > 0) {
      const cur = heap.pop();
      if (cur === gi) return this.reconstruct(came, gi);
      if (closed[cur] === gen) continue;
      closed[cur] = gen;
      if (++expanded > maxNodes) return null;
      const cx = cur % this.size;
      const cz = (cur - cx) / this.size;
      const cg = gScore[cur];
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k];
        const nz = cz + DZ[k];
        if (!this.walkable(nx, nz)) continue;
        if (k >= 4 && (!this.walkable(cx + DX[k], cz) || !this.walkable(cx, cz + DZ[k]))) continue;
        const ni = this.idx(nx, nz);
        if (closed[ni] === gen) continue;
        const ng = cg + (k >= 4 ? Math.SQRT2 : 1);
        if (stamp[ni] !== gen || ng < gScore[ni]) {
          stamp[ni] = gen;
          gScore[ni] = ng;
          came[ni] = cur;
          heap.push(ni, ng + octileXZ(nx, nz, g.x, g.z));
        }
      }
    }
    return null;
  }

  private reconstruct(came: Int32Array, end: number): GridPos[] {
    const out: GridPos[] = [];
    let c = end;
    while (c >= 0) {
      const x = c % this.size;
      out.push({ x, z: (c - x) / this.size });
      c = came[c];
    }
    return out.reverse();
  }

  /** Removes intermediate waypoints that can be walked in a straight line (string pulling). */
  smooth(path: GridPos[]): Vec3[] {
    const pts = path.map((p) => this.toWorld(p));
    if (pts.length <= 2) return pts;
    const out: Vec3[] = [pts[0]];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (!this.walkLine(pts[anchor], pts[i])) {
        out.push(pts[i - 1]);
        anchor = i - 1;
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  nearestWalkable(p: GridPos, radius: number): GridPos | null {
    if (this.walkable(p.x, p.z)) return p;
    for (let r = 1; r <= radius; r++) {
      let best: GridPos | null = null;
      let bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = p.x + dx;
          const z = p.z + dz;
          if (this.walkable(x, z)) {
            const d = dx * dx + dz * dz;
            if (d < bestD) {
              bestD = d;
              best = { x, z };
            }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** Breadth-first distance field (in cells, 8-connected) from a set of sources. Unreachable = Infinity. */
  distanceField(sources: GridPos[], maxDist = Infinity, out?: Float32Array): Float32Array {
    const N = this.size * this.size;
    const d = out && out.length === N ? out : new Float32Array(N);
    d.fill(Infinity);
    const heap = this.fieldHeap;
    heap.clear();
    for (const s of sources) {
      const w = this.nearestWalkable(s, 3);
      if (!w) continue;
      const i = this.idx(w.x, w.z);
      d[i] = 0;
      heap.push(i, 0);
    }
    // Hot loop: walkability is read straight from the cell / blocker arrays (no per-neighbour method calls).
    const size = this.size;
    const cells = this.cells;
    const dyn = this.dynamicBlock;
    const open = (x: number, z: number): boolean => {
      if (x < 0 || z < 0 || x >= size || z >= size) return false;
      const i = z * size + x;
      const c = cells[i];
      return (c === Cell.Floor || c === Cell.Door) && dyn[i] === 0;
    };
    while (heap.size > 0) {
      const cur = heap.pop();
      const cd = heap.lastPriority;
      if (cd > d[cur]) continue; // stale entry: this cell was already settled with a shorter distance
      if (cd > maxDist) break;
      const cx = cur % size;
      const cz = (cur - cx) / size;
      const e = open(cx + 1, cz);
      const w = open(cx - 1, cz);
      const s2 = open(cx, cz + 1);
      const n = open(cx, cz - 1);
      // Rounded to float32 so the stored distance and the heap priority compare exactly (otherwise a value
      // that rounds up when stored keeps looking improvable and the cell is re-expanded over and over).
      const d1 = Math.fround(cd + 1);
      const d2 = Math.fround(cd + Math.SQRT2);
      if (e && d1 < d[cur + 1]) {
        d[cur + 1] = d1;
        heap.push(cur + 1, d1);
      }
      if (w && d1 < d[cur - 1]) {
        d[cur - 1] = d1;
        heap.push(cur - 1, d1);
      }
      if (s2 && d1 < d[cur + size]) {
        d[cur + size] = d1;
        heap.push(cur + size, d1);
      }
      if (n && d1 < d[cur - size]) {
        d[cur - size] = d1;
        heap.push(cur - size, d1);
      }
      // Diagonals only when both adjacent orthogonal cells are open (no corner cutting).
      if (e && s2 && open(cx + 1, cz + 1) && d2 < d[cur + size + 1]) {
        d[cur + size + 1] = d2;
        heap.push(cur + size + 1, d2);
      }
      if (e && n && open(cx + 1, cz - 1) && d2 < d[cur - size + 1]) {
        d[cur - size + 1] = d2;
        heap.push(cur - size + 1, d2);
      }
      if (w && s2 && open(cx - 1, cz + 1) && d2 < d[cur + size - 1]) {
        d[cur + size - 1] = d2;
        heap.push(cur + size - 1, d2);
      }
      if (w && n && open(cx - 1, cz - 1) && d2 < d[cur - size - 1]) {
        d[cur - size - 1] = d2;
        heap.push(cur - size - 1, d2);
      }
    }
    return d;
  }

  /** Number of walkable neighbours (0..8) — low values mark dead ends / corners. */
  openness(x: number, z: number): number {
    let n = 0;
    for (let k = 0; k < 8; k++) if (this.walkable(x + DX[k], z + DZ[k])) n++;
    return n;
  }
}

const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DZ = [0, 0, 1, -1, 1, -1, 1, -1];

function octile(a: GridPos, b: GridPos): number {
  return octileXZ(a.x, a.z, b.x, b.z);
}

function octileXZ(ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
}

/** Binary min-heap of (index, priority) on growable typed arrays; sifts by moving a hole (no swaps, no garbage). */
class MinHeap {
  private ids = new Int32Array(1024);
  private pr = new Float64Array(1024);
  private n = 0;
  /** Priority of the element returned by the last pop(). */
  lastPriority = 0;

  get size(): number {
    return this.n;
  }

  clear(): void {
    this.n = 0;
  }

  push(id: number, p: number): void {
    if (this.n === this.ids.length) {
      const ids = new Int32Array(this.n * 2);
      ids.set(this.ids);
      const pr = new Float64Array(this.n * 2);
      pr.set(this.pr);
      this.ids = ids;
      this.pr = pr;
    }
    const ids = this.ids;
    const pr = this.pr;
    let i = this.n++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (pr[parent] <= p) break;
      ids[i] = ids[parent];
      pr[i] = pr[parent];
      i = parent;
    }
    ids[i] = id;
    pr[i] = p;
  }

  pop(): number {
    const ids = this.ids;
    const pr = this.pr;
    const top = ids[0];
    this.lastPriority = pr[0];
    const n = --this.n;
    if (n > 0) {
      const id = ids[n];
      const p = pr[n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const m = r < n && pr[r] < pr[l] ? r : l;
        if (pr[m] >= p) break;
        ids[i] = ids[m];
        pr[i] = pr[m];
        i = m;
      }
      ids[i] = id;
      pr[i] = p;
    }
    return top;
  }
}
