// The arena "Hollow Hamlet": a ruined village at night. Pure description: the grid (for bots, sight and
// hit detection) and the list of block operations (for the Minecraft builder) come from the same code,
// so what bots believe is exactly what gets built.
import { Cell, NavGrid, type GridPos } from "./nav";
import type { Vec3 } from "../util/vec";

export interface BlockOp {
  /** Grid x/z (0..size-1) and y relative to the floor top (0 = first air layer above the floor). */
  from: [number, number, number];
  to: [number, number, number];
  block: string;
  states?: Record<string, string | number | boolean>;
}

export interface DoorSpec {
  x: number;
  z: number;
  /** Wall runs along X ("x") or along Z ("z"). */
  axis: "x" | "z";
}

export interface ArenaLayout {
  id: string;
  name: string;
  size: number;
  /** Height of the barrier ceiling above the floor. */
  ceiling: number;
  cells: Uint8Array;
  ops: BlockOp[];
  doors: DoorSpec[];
  generatorSpots: GridPos[];
  survivorSpawns: GridPos[];
  killerSpawn: GridPos;
  itemSpots: GridPos[];
  /** Two barrel positions (grid x/z, y relative) used to store the player's inventory. */
  vault: Array<[number, number, number]>;
  /** Light sources (decoration). */
  lights: GridPos[];
}

export const ARENA_BLOCKS = {
  outer: "minecraft:deepslate_bricks",
  outerCracked: "minecraft:cracked_deepslate_bricks",
  barrier: "minecraft:barrier",
  air: "minecraft:air",
  subfloor: "minecraft:stone",
  floor: ["minecraft:coarse_dirt", "minecraft:podzol", "minecraft:gravel", "minecraft:mud", "minecraft:moss_block", "minecraft:packed_mud"],
  path: "minecraft:grass_path",
  vault: "minecraft:barrel",
  log: "minecraft:dark_oak_log",
  crate: "minecraft:barrel",
  hay: "minecraft:hay_block",
  lantern: "minecraft:soul_lantern",
  door: "minecraft:spruce_door",
  bars: "minecraft:iron_bars",
  generator: "forsaken:generator",
} as const;

interface Palette {
  wall: string[];
  floor: string;
}

const PALETTES: Record<string, Palette> = {
  chapel: { wall: ["minecraft:stone_bricks", "minecraft:mossy_stone_bricks", "minecraft:cracked_stone_bricks"], floor: "minecraft:polished_andesite" },
  farm: { wall: ["minecraft:dark_oak_planks", "minecraft:cobblestone", "minecraft:dark_oak_planks"], floor: "minecraft:spruce_planks" },
  barn: { wall: ["minecraft:spruce_planks", "minecraft:spruce_planks", "minecraft:dark_oak_planks"], floor: "minecraft:packed_mud" },
  shack: { wall: ["minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:cobblestone"], floor: "minecraft:smooth_stone" },
  ruin: { wall: ["minecraft:tuff_bricks", "minecraft:cracked_polished_blackstone_bricks", "minecraft:tuff"], floor: "minecraft:tuff" },
  cottage: { wall: ["minecraft:mud_bricks", "minecraft:mud_bricks", "minecraft:packed_mud"], floor: "minecraft:oak_planks" },
  gym: { wall: ["minecraft:polished_blackstone_bricks", "minecraft:cracked_polished_blackstone_bricks", "minecraft:blackstone"], floor: "minecraft:coarse_dirt" },
};

/** Deterministic hash for decoration choices. */
function hash(x: number, z: number, salt = 0): number {
  let h = (x * 374761393 + z * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

class Builder {
  readonly ops: BlockOp[] = [];
  readonly doors: DoorSpec[] = [];
  readonly lights: GridPos[] = [];
  constructor(readonly grid: NavGrid) {}

  fill(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, block: string, states?: BlockOp["states"]): void {
    this.ops.push({ from: [Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)], to: [Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)], block, states });
  }

  set(x: number, y: number, z: number, block: string, states?: BlockOp["states"]): void {
    this.fill(x, y, z, x, y, z, block, states);
  }

  cell(x: number, z: number, c: Cell): void {
    this.grid.set(x, z, c);
  }

  /** A wall column of height h at (x,z) using the palette (random cracked/mossy mix, ruined tops). */
  column(x: number, z: number, h: number, pal: Palette, ruin = true): void {
    const top = ruin && hash(x, z, 7) < 0.25 ? h - 1 : h;
    for (let y = 0; y < top; y++) this.set(x, y, z, pal.wall[Math.floor(hash(x * 3 + y, z, 11) * pal.wall.length)]);
    this.cell(x, z, Cell.Wall);
  }

  /**
   * Straight wall from (x1,z1) to (x2,z2) (axis aligned). `open` maps an offset along the wall to an opening:
   * "door" (door block, passable), "gap" (open passage), "window" (sill 1 high, bars above).
   */
  wall(x1: number, z1: number, x2: number, z2: number, h: number, pal: Palette, open: Record<number, "door" | "gap" | "window"> = {}): void {
    const axis: "x" | "z" = z1 === z2 ? "x" : "z";
    const n = axis === "x" ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const sx = Math.sign(x2 - x1);
    const sz = Math.sign(z2 - z1);
    for (let i = 0; i <= n; i++) {
      const x = x1 + sx * i;
      const z = z1 + sz * i;
      const o = open[i];
      if (o === "door") {
        this.doors.push({ x, z, axis });
        this.cell(x, z, Cell.Door);
        // lintel above the 2-high door
        for (let y = 2; y < h; y++) this.set(x, y, z, pal.wall[0]);
      } else if (o === "gap") {
        this.cell(x, z, Cell.Floor);
      } else if (o === "window") {
        this.set(x, 0, z, pal.wall[0]);
        this.set(x, 1, z, ARENA_BLOCKS.bars);
        for (let y = 2; y < h; y++) this.set(x, y, z, pal.wall[1 % pal.wall.length]);
        this.cell(x, z, Cell.Window);
      } else {
        this.column(x, z, h, pal);
      }
    }
  }

  /** Rectangular building with walls on the border and a floor material inside. */
  room(x1: number, z1: number, x2: number, z2: number, h: number, pal: Palette, openings: { n?: Record<number, "door" | "gap" | "window">; s?: Record<number, "door" | "gap" | "window">; w?: Record<number, "door" | "gap" | "window">; e?: Record<number, "door" | "gap" | "window"> }): void {
    this.fill(x1, -1, z1, x2, -1, z2, pal.floor);
    this.wall(x1, z1, x2, z1, h, pal, openings.n);
    this.wall(x1, z2, x2, z2, h, pal, openings.s);
    this.wall(x1, z1, x1, z2, h, pal, openings.w);
    this.wall(x2, z1, x2, z2, h, pal, openings.e);
  }

  low(x: number, z: number, block: string): void {
    this.set(x, 0, z, block);
    this.cell(x, z, Cell.Low);
  }

  pillar(x: number, z: number, h: number, block: string, lantern = false): void {
    this.fill(x, 0, z, x, h - 1, z, block);
    this.cell(x, z, Cell.Pillar);
    if (lantern) {
      this.set(x, h, z, ARENA_BLOCKS.lantern);
      this.lights.push({ x, z });
    }
  }
}

export const ARENA_SIZE = 81;

/** Builds the Hollow Hamlet layout. `originFloorTop` is the world position of grid (0,0) at floor-top height. */
export function buildHollowHamlet(originFloorTop: Vec3 = { x: 0, y: 0, z: 0 }): { layout: ArenaLayout; grid: NavGrid } {
  const S = ARENA_SIZE;
  const grid = new NavGrid(S, originFloorTop);
  const b = new Builder(grid);
  const CEIL = 12;

  // 1. clear the whole volume, sub-floor, floor
  b.fill(0, 0, 0, S - 1, CEIL + 1, S - 1, ARENA_BLOCKS.air);
  b.fill(0, -4, 0, S - 1, -2, S - 1, ARENA_BLOCKS.subfloor);
  for (let z = 0; z < S; z += 9) {
    for (let x = 0; x < S; x += 9) {
      const pick = ARENA_BLOCKS.floor[Math.floor(hash(x, z, 3) * ARENA_BLOCKS.floor.length)];
      b.fill(x, -1, z, Math.min(S - 1, x + 8), -1, Math.min(S - 1, z + 8), pick);
    }
  }
  // speckle: break up the 9x9 patches
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i, 1, 5) * S);
    const z = Math.floor(hash(1, i, 9) * S);
    const w = 1 + Math.floor(hash(i, i, 2) * 3);
    b.fill(x, -1, z, Math.min(S - 1, x + w), -1, Math.min(S - 1, z + w), ARENA_BLOCKS.floor[Math.floor(hash(i, 3, 4) * ARENA_BLOCKS.floor.length)]);
  }
  // dirt paths connecting the quarters
  b.fill(4, -1, 39, 76, -1, 41, ARENA_BLOCKS.path);
  b.fill(39, -1, 24, 41, -1, 76, ARENA_BLOCKS.path);

  // 2. outer wall + barrier shell + ceiling
  const outerPal: Palette = { wall: [ARENA_BLOCKS.outer, ARENA_BLOCKS.outer, ARENA_BLOCKS.outerCracked], floor: "minecraft:coarse_dirt" };
  for (let i = 0; i < S; i++) {
    for (const [x, z] of [
      [i, 0],
      [i, S - 1],
      [0, i],
      [S - 1, i],
    ]) {
      b.column(x, z, 8, outerPal, false);
    }
  }
  b.fill(0, 8, 0, S - 1, CEIL, 0, ARENA_BLOCKS.barrier);
  b.fill(0, 8, S - 1, S - 1, CEIL, S - 1, ARENA_BLOCKS.barrier);
  b.fill(0, 8, 0, 0, CEIL, S - 1, ARENA_BLOCKS.barrier);
  b.fill(S - 1, 8, 0, S - 1, CEIL, S - 1, ARENA_BLOCKS.barrier);
  b.fill(0, CEIL + 1, 0, S - 1, CEIL + 1, S - 1, ARENA_BLOCKS.barrier);
  for (let i = 4; i < S - 4; i += 12) {
    b.set(i, 8, 1, ARENA_BLOCKS.lantern);
    b.set(i, 8, S - 2, ARENA_BLOCKS.lantern);
  }

  // 3. buildings
  const P = PALETTES;
  // A. Chapel (north-centre)
  b.room(30, 6, 50, 22, 5, P.chapel, {
    n: { 4: "window", 8: "window", 12: "window", 16: "window" },
    s: { 9: "door", 10: "gap", 11: "door" },
    w: { 3: "window", 8: "door", 13: "window" },
    e: { 3: "window", 8: "door", 13: "window" },
  });
  for (const z of [11, 13, 16]) {
    for (let x = 33; x <= 37; x++) b.low(x, z, "minecraft:spruce_slab");
    for (let x = 43; x <= 47; x++) b.low(x, z, "minecraft:spruce_slab");
  }
  for (let x = 38; x <= 42; x++) b.low(x, 8, "minecraft:chiseled_tuff_bricks");

  // B. Farmhouse (west)
  b.room(6, 18, 20, 32, 4, P.farm, {
    n: { 3: "window", 10: "window" },
    s: { 4: "door" },
    w: { 6: "window", 10: "window" },
    e: { 4: "door", 10: "window" },
  });
  b.wall(13, 19, 13, 31, 4, P.farm, { 6: "door", 7: "gap" });

  // C. Barn (east)
  b.room(56, 28, 74, 46, 5, P.barn, {
    w: { 7: "gap", 8: "gap", 9: "gap", 10: "gap" },
    s: { 10: "door" },
    e: { 3: "window", 13: "window" },
    n: { 6: "window", 12: "window" },
  });
  b.wall(65, 29, 65, 33, 3, P.barn);
  for (const [x, z] of [
    [60, 31],
    [61, 31],
    [60, 32],
    [69, 42],
    [70, 42],
    [70, 43],
  ])
    b.low(x, z, ARENA_BLOCKS.hay);

  // D. Shack (south-east)
  b.room(58, 58, 68, 68, 4, P.shack, {
    n: { 4: "door" },
    w: { 6: "door" },
    e: { 3: "window", 7: "window" },
    s: { 5: "window" },
  });

  // E. Ruins (centre): broken walls forming loops
  const R = P.ruin;
  b.wall(32, 33, 38, 33, 3, R);
  b.wall(43, 33, 48, 33, 3, R);
  b.wall(32, 33, 32, 38, 3, R);
  b.wall(32, 44, 32, 48, 3, R);
  b.wall(37, 42, 42, 42, 3, R);
  b.wall(42, 42, 42, 45, 3, R);
  b.wall(36, 48, 44, 48, 3, R, { 4: "window" });
  b.wall(48, 35, 48, 43, 3, R, { 4: "window" });

  // F. Cottage (south)
  b.room(26, 60, 36, 70, 4, P.cottage, {
    e: { 4: "door" },
    n: { 4: "door" },
    s: { 3: "window", 7: "window" },
    w: { 5: "window" },
  });

  // 4. outdoor loop structures ("jungle gyms")
  const G = P.gym;
  b.wall(18, 44, 24, 44, 3, G);
  b.wall(24, 45, 24, 50, 3, G);
  b.pillar(20, 48, 3, ARENA_BLOCKS.log);
  b.wall(50, 52, 56, 52, 3, G);
  b.wall(53, 53, 53, 56, 3, G);
  b.wall(64, 14, 68, 14, 3, G);
  b.wall(68, 15, 68, 18, 3, G);
  b.wall(64, 17, 64, 20, 3, G);
  b.wall(8, 12, 12, 12, 3, G);
  b.wall(12, 6, 12, 11, 3, G);
  b.wall(40, 58, 44, 58, 3, G);
  b.wall(75, 50, 75, 56, 3, G);
  b.wall(14, 50, 14, 54, 3, G);
  b.wall(46, 72, 52, 72, 3, G);

  // 5. dead trees / lantern posts
  const trees: Array<[number, number, boolean]> = [
    [26, 30, true],
    [52, 12, false],
    [22, 8, true],
    [46, 28, false],
    [54, 38, true],
    [30, 52, false],
    [48, 64, true],
    [70, 52, false],
    [8, 44, true],
    [17, 58, false],
    [76, 22, true],
    [38, 75, false],
    [62, 75, true],
    [4, 30, false],
    [26, 76, true],
    [76, 76, false],
  ];
  for (const [x, z, lit] of trees) b.pillar(x, z, 4 + Math.floor(hash(x, z, 1) * 3), ARENA_BLOCKS.log, lit);

  // 6. crates
  for (const [x, z] of [
    [28, 40],
    [28, 41],
    [52, 44],
    [52, 45],
    [44, 26],
    [19, 60],
    [64, 52],
    [34, 28],
    [72, 70],
    [6, 52],
    [56, 22],
    [10, 38],
  ])
    b.low(x, z, ARENA_BLOCKS.crate);

  // 7. gameplay spots
  const generatorSpots: GridPos[] = [
    { x: 46, z: 19 }, // chapel
    { x: 9, z: 21 }, // farmhouse west room
    { x: 70, z: 35 }, // barn
    { x: 66, z: 66 }, // shack
    { x: 36, z: 45 }, // ruins
    { x: 28, z: 68 }, // cottage
    { x: 52, z: 26 }, // outdoor north-east
    { x: 21, z: 47 }, // jungle gym west
    { x: 72, z: 60 }, // outdoor east
    { x: 10, z: 8 }, // north-west corner
  ];
  for (const g of generatorSpots) b.cell(g.x, g.z, Cell.Low);
  const survivorSpawns: GridPos[] = [
    { x: 8, z: 72 },
    { x: 14, z: 74 },
    { x: 20, z: 72 },
    { x: 10, z: 66 },
    { x: 16, z: 64 },
    { x: 22, z: 68 },
    { x: 6, z: 60 },
    { x: 22, z: 62 },
  ];
  const killerSpawn: GridPos = { x: 72, z: 8 };
  const itemSpots: GridPos[] = [
    { x: 11, z: 29 },
    { x: 42, z: 19 },
    { x: 62, z: 43 },
    { x: 64, z: 61 },
    { x: 40, z: 45 },
    { x: 31, z: 64 },
    { x: 26, z: 52 },
    { x: 73, z: 64 },
    { x: 48, z: 58 },
  ];

  // 8. inventory vault: sealed under the floor in the corner
  const vault: Array<[number, number, number]> = [
    [2, -3, 2],
    [3, -3, 2],
  ];
  for (const [x, y, z] of vault) b.set(x, y, z, ARENA_BLOCKS.vault);

  // Doors are placed last so the open state survives the wall fills.
  for (const d of b.doors) {
    const dir = d.axis === "x" ? "south" : "east";
    b.set(d.x, 0, d.z, ARENA_BLOCKS.door, { upper_block_bit: false, "minecraft:cardinal_direction": dir, open_bit: true, door_hinge_bit: false });
    b.set(d.x, 1, d.z, ARENA_BLOCKS.door, { upper_block_bit: true, "minecraft:cardinal_direction": dir, open_bit: true, door_hinge_bit: false });
  }

  const layout: ArenaLayout = {
    id: "hollow_hamlet",
    name: "Hollow Hamlet",
    size: S,
    ceiling: CEIL,
    cells: grid.cells,
    ops: b.ops,
    doors: b.doors,
    generatorSpots,
    survivorSpawns,
    killerSpawn,
    itemSpots,
    vault,
    lights: b.lights,
  };
  return { layout, grid };
}

export const ARENAS = [{ id: "hollow_hamlet", name: "Hollow Hamlet", build: buildHollowHamlet }] as const;
