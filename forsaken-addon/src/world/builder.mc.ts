// Builds the arena in the world, time-sliced with system.runJob so the script watchdog never trips.
import { BlockPermutation, BlockVolume, Dimension, system, world } from "@minecraft/server";
import type { ArenaLayout, BlockOp } from "./layout";
import type { Vec3 } from "../util/vec";

export const TICKING_AREA_ID = "forsaken:arena";
const MAX_FILL = 32768;

export interface BuildProgress {
  (done: number, total: number): void;
}

function arenaBox(origin: Vec3, layout: ArenaLayout): { from: Vec3; to: Vec3 } {
  return {
    from: { x: origin.x - 2, y: origin.y - 6, z: origin.z - 2 },
    to: { x: origin.x + layout.size + 1, y: origin.y + layout.ceiling + 3, z: origin.z + layout.size + 1 },
  };
}

/** Creates (or reuses) the ticking area that keeps the arena loaded. Returns false if no capacity. */
export async function ensureTickingArea(dim: Dimension, origin: Vec3, layout: ArenaLayout): Promise<boolean> {
  const mgr = world.tickingAreaManager;
  if (mgr.hasTickingArea(TICKING_AREA_ID)) return true;
  const box = arenaBox(origin, layout);
  const opts = { dimension: dim, from: box.from, to: box.to };
  if (!mgr.hasCapacity(opts)) return false;
  await mgr.createTickingArea(TICKING_AREA_ID, opts);
  return true;
}

export function removeTickingArea(): void {
  try {
    if (world.tickingAreaManager.hasTickingArea(TICKING_AREA_ID)) world.tickingAreaManager.removeTickingArea(TICKING_AREA_ID);
  } catch {
    // already removed
  }
}

/** True when every corner chunk of the arena is loaded. */
export function arenaLoaded(dim: Dimension, origin: Vec3, layout: ArenaLayout): boolean {
  const s = layout.size - 1;
  for (const [dx, dz] of [
    [0, 0],
    [s, 0],
    [0, s],
    [s, s],
    [s >> 1, s >> 1],
  ]) {
    if (!dim.isChunkLoaded({ x: origin.x + dx, y: origin.y, z: origin.z + dz })) return false;
  }
  return true;
}

export function arenaStamp(layout: ArenaLayout, origin: Vec3, version: number): string {
  return `${layout.id}:${version}:${origin.x},${origin.y},${origin.z}`;
}

/** Splits an op volume into fills of at most 32768 blocks (the /fill limit). */
function* splitOp(op: BlockOp): Generator<[Vec3, Vec3]> {
  const [x1, y1, z1] = op.from;
  const [x2, y2, z2] = op.to;
  const layer = (x2 - x1 + 1) * (z2 - z1 + 1);
  const ys = Math.max(1, Math.floor(MAX_FILL / Math.max(1, layer)));
  if (layer <= MAX_FILL) {
    for (let y = y1; y <= y2; y += ys) yield [{ x: x1, y, z: z1 }, { x: x2, y: Math.min(y2, y + ys - 1), z: z2 }];
    return;
  }
  for (let y = y1; y <= y2; y++) {
    const rows = Math.max(1, Math.floor(MAX_FILL / (x2 - x1 + 1)));
    for (let z = z1; z <= z2; z += rows) yield [{ x: x1, y, z }, { x: x2, y, z: Math.min(z2, z + rows - 1) }];
  }
}

/** Places all block operations of the layout. Resolves when done. */
export function buildArena(dim: Dimension, origin: Vec3, layout: ArenaLayout, progress?: BuildProgress): Promise<void> {
  return new Promise((resolve, reject) => {
    const total = layout.ops.length;
    const job = function* (): Generator<void, void, void> {
      let i = 0;
      let budget = 0;
      for (const op of layout.ops) {
        try {
          if (op.states) {
            const perm = BlockPermutation.resolve(op.block, op.states);
            for (let x = op.from[0]; x <= op.to[0]; x++)
              for (let y = op.from[1]; y <= op.to[1]; y++)
                for (let z = op.from[2]; z <= op.to[2]; z++) {
                  dim.setBlockPermutation({ x: origin.x + x, y: origin.y + y, z: origin.z + z }, perm);
                  if (++budget % 64 === 0) yield;
                }
          } else {
            for (const [a, b] of splitOp(op)) {
              dim.fillBlocks(new BlockVolume({ x: origin.x + a.x, y: origin.y + a.y, z: origin.z + a.z }, { x: origin.x + b.x, y: origin.y + b.y, z: origin.z + b.z }), op.block, { ignoreChunkBoundErrors: true });
              yield;
            }
          }
        } catch (e) {
          reject(new Error(`arena build failed at op ${i} (${op.block}): ${String(e)}`));
          return;
        }
        i++;
        if (i % 8 === 0) progress?.(i, total);
        yield;
      }
      progress?.(total, total);
      resolve();
    };
    system.runJob(job());
  });
}

/** Per-match reset: generator blocks at the chosen spots, air at unused spots, all doors open. */
export function resetArenaBlocks(dim: Dimension, origin: Vec3, layout: ArenaLayout, generatorSpots: number[]): void {
  layout.generatorSpots.forEach((g, i) => {
    const pos = { x: origin.x + g.x, y: origin.y, z: origin.z + g.z };
    try {
      dim.setBlockType(pos, generatorSpots.includes(i) ? "forsaken:generator" : "minecraft:air");
    } catch {
      // unloaded: ensureArena guarantees loading before this is called
    }
  });
  for (const d of layout.doors) {
    for (const dy of [0, 1]) {
      try {
        const b = dim.getBlock({ x: origin.x + d.x, y: origin.y + dy, z: origin.z + d.z });
        if (b && b.typeId.endsWith("_door") && b.permutation.getState("open_bit") !== true) b.setPermutation(b.permutation.withState("open_bit", true));
      } catch {
        // ignore
      }
    }
  }
}
