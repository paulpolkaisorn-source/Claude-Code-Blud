// WorldPorts implementation: spawns bots/props and edits arena blocks.
import { BlockPermutation, Dimension, Entity } from "@minecraft/server";
import type { BotBodyOptions, PropHandle, PropKind, WorldPorts } from "../core/ports";
import { PROP_VARIANTS } from "../core/ports";
import type { Body } from "../entities/actor";
import { BotBody } from "./bodies.mc";
import type { Vec3 } from "../util/vec";

export const RUNTIME_TAG = "forsaken:runtime";

class McProp implements PropHandle {
  constructor(
    readonly id: string,
    private readonly e: Entity,
  ) {}
  move(pos: Vec3, yaw?: number): void {
    if (!this.e.isValid) return;
    this.e.teleport(pos, yaw !== undefined ? { rotation: { x: 0, y: yaw } } : undefined);
  }
  setNameTag(text: string): void {
    if (this.e.isValid) this.e.nameTag = text;
  }
  remove(): void {
    if (this.e.isValid) this.e.remove();
  }
  isValid(): boolean {
    return this.e.isValid;
  }
}

export class McPorts implements WorldPorts {
  private n = 0;
  readonly spawned: Entity[] = [];

  constructor(
    private readonly dim: Dimension,
    private readonly grid: { originX: number; originY: number; originZ: number },
  ) {}

  createBotBody(opts: BotBodyOptions): Body {
    const e = this.dim.spawnEntity("forsaken:bot", opts.pos, { initialPersistence: true });
    e.addTag(RUNTIME_TAG);
    e.addTag(opts.minion ? "forsaken:minion" : "forsaken:botplayer");
    e.setProperty("forsaken:character", opts.skinIndex);
    e.setProperty("forsaken:role", opts.minion ? 2 : 0);
    e.nameTag = opts.nameTag;
    this.spawned.push(e);
    return new BotBody(e);
  }

  createProp(kind: PropKind, pos: Vec3, opts: { yaw?: number; nameTag?: string } = {}): PropHandle {
    const e = this.dim.spawnEntity("forsaken:prop", pos, { initialPersistence: true, initialRotation: opts.yaw ?? 0 });
    e.addTag(RUNTIME_TAG);
    e.setProperty("forsaken:variant", PROP_VARIANTS[kind]);
    if (opts.nameTag) e.nameTag = opts.nameTag;
    this.spawned.push(e);
    return new McProp(`prop${this.n++}`, e);
  }

  setGeneratorBlock(pos: Vec3, lit: boolean): void {
    try {
      this.dim.setBlockType({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) }, lit ? "forsaken:generator_lit" : "forsaken:generator");
    } catch {
      // chunk unloaded: the match controller re-places generators at the next reset
    }
  }

  openDoor(cellX: number, cellZ: number): void {
    const x = this.grid.originX + cellX;
    const z = this.grid.originZ + cellZ;
    for (const dy of [0, 1]) {
      try {
        const b = this.dim.getBlock({ x, y: this.grid.originY + dy, z });
        if (!b || !b.typeId.endsWith("_door")) continue;
        if (b.permutation.getState("open_bit") === true) continue;
        b.setPermutation(b.permutation.withState("open_bit", true));
      } catch {
        // unloaded or not a door: ignore
      }
    }
  }

  /** Removes every entity this port created (match cleanup). */
  removeAll(): void {
    for (const e of this.spawned) if (e.isValid) e.remove();
    this.spawned.length = 0;
  }
}

/** Removes stray runtime entities (world load / match end). */
export function purgeRuntimeEntities(dim: Dimension): number {
  let n = 0;
  for (const e of dim.getEntities({ tags: [RUNTIME_TAG] })) {
    try {
      e.remove();
      n++;
    } catch {
      // already gone
    }
  }
  return n;
}

export function doorPermutation(block: string, upper: boolean, dir: string, open: boolean): BlockPermutation {
  return BlockPermutation.resolve(block, { upper_block_bit: upper, "minecraft:cardinal_direction": dir, open_bit: open, door_hinge_bit: false });
}
