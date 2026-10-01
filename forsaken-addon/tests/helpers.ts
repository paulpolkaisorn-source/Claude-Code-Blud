// Test doubles for the Minecraft side: bodies, props and ports. No @minecraft imports here.
import type { Body, BodyState } from "../src/entities/actor";
import type { CharacterDef } from "../src/characters/types";
import type { BotBodyOptions, PropHandle, PropKind, WorldPorts } from "../src/core/ports";
import { Game } from "../src/core/game";
import { buildHollowHamlet } from "../src/world/layout";
import type { Kit, KitRegistry } from "../src/abilities/engine";
import { Rng } from "../src/util/rng";
import { flat, yawToDir, type Vec3 } from "../src/util/vec";

export class FakeBody implements Body {
  readonly kind = "fake" as const;
  st: BodyState;
  teleports: Vec3[] = [];
  impulses: Vec3[] = [];
  drives: Vec3[] = [];
  valid = true;
  /** When true, drive() moves the body (simulates the adapter applying velocity). */
  physics = true;

  constructor(pos: Vec3, yaw = 0) {
    this.st = { pos: { ...pos }, facing: yawToDir(yaw), yaw, pitch: 0, sprintInput: false, sneaking: false, speed: 0, onGround: true, jumping: false, valid: true };
  }
  read(): BodyState {
    return { ...this.st, pos: { ...this.st.pos }, facing: { ...this.st.facing } };
  }
  teleport(pos: Vec3, facing?: Vec3): void {
    this.st.pos = { ...pos };
    if (facing) this.st.facing = flat(facing);
    this.teleports.push({ ...pos });
  }
  impulse(vel: Vec3): void {
    this.impulses.push({ ...vel });
  }
  drive(v: Vec3): void {
    this.drives.push({ ...v });
    if (this.physics) {
      this.st.pos = { x: this.st.pos.x + v.x, y: this.st.pos.y, z: this.st.pos.z + v.z };
      this.st.speed = Math.hypot(v.x, v.z);
    }
  }
  setFacing(dir: Vec3): void {
    this.st.facing = flat(dir);
  }
  isValid(): boolean {
    return this.valid;
  }
  // helpers for tests
  face(dir: Vec3): void {
    this.st.facing = flat(dir);
  }
  moveTo(p: Vec3): void {
    this.st.pos = { ...p };
  }
}

export class FakeProp implements PropHandle {
  removed = false;
  constructor(
    readonly id: string,
    readonly kind: PropKind,
    public pos: Vec3,
  ) {}
  move(pos: Vec3): void {
    this.pos = { ...pos };
  }
  setNameTag(): void {}
  remove(): void {
    this.removed = true;
  }
  isValid(): boolean {
    return !this.removed;
  }
}

export class FakePorts implements WorldPorts {
  bodies: Array<{ opts: BotBodyOptions; body: FakeBody }> = [];
  props: FakeProp[] = [];
  litGenerators: Vec3[] = [];
  doors: Array<[number, number]> = [];
  private n = 0;
  createBotBody(opts: BotBodyOptions): Body {
    const b = new FakeBody(opts.pos);
    this.bodies.push({ opts, body: b });
    return b;
  }
  createProp(kind: PropKind, pos: Vec3): PropHandle {
    const p = new FakeProp(`prop${this.n++}`, kind, pos);
    this.props.push(p);
    return p;
  }
  setGeneratorBlock(pos: Vec3, lit: boolean): void {
    if (lit) this.litGenerators.push(pos);
  }
  openDoor(x: number, z: number): void {
    this.doors.push([x, z]);
  }
}

export function testCharacter(over: Partial<CharacterDef> & { id: string; team: "killer" | "survivor" }): CharacterDef {
  const killer = over.team === "killer";
  return {
    name: over.id,
    role: killer ? "killer" : "survivalist",
    playstyle: "test",
    summary: "test",
    difficulty: 1,
    stats: killer
      ? { hp: 1000, walk: 9, sprint: 28, stamina: 110, staminaDrain: 9.5, staminaRegen: 21, terrorRadius: 60, limps: false }
      : { hp: 100, walk: 12, sprint: 26, stamina: 100, staminaDrain: 10, staminaRegen: 20, limps: true },
    passives: [],
    abilities: [],
    bot: { aggression: 0.5, notes: "" },
    skinIndex: 0,
    origin: "wiki",
    assumed: [],
    undocumented: [],
    changes: [],
    ...over,
  } as CharacterDef;
}

/** Arena origin used by tests: grid (0,0) at x=0,z=0, floor top y=100. */
export const ORIGIN = { x: 0, y: 100, z: 0 };

export function cellPos(x: number, z: number): Vec3 {
  return { x: x + 0.5, y: ORIGIN.y, z: z + 0.5 };
}

export function makeGame(kits: KitRegistry = new Map<string, Kit>(), seed = 1234): { game: Game; ports: FakePorts } {
  const { layout, grid } = buildHollowHamlet(ORIGIN);
  const ports = new FakePorts();
  const game = new Game({ grid, layout, ports, kits, rng: new Rng(seed), difficulty: "normal" });
  return { game, ports };
}

/** Adds a killer and survivors at open spots in the arena (survivor spawns / killer spawn). */
export function populate(game: Game, killer: CharacterDef, survivors: CharacterDef[], humanSurvivorIndex = -1) {
  const k = game.addParticipant("killer", killer.name, killer, new FakeBody(cellPos(game.layout.killerSpawn.x, game.layout.killerSpawn.z)), true);
  const ss = survivors.map((c, i) => {
    const sp = game.layout.survivorSpawns[i % game.layout.survivorSpawns.length];
    return game.addParticipant(`s${i}`, c.name, c, new FakeBody(cellPos(sp.x, sp.z)), i !== humanSurvivorIndex);
  });
  return { killer: k, survivors: ss };
}

export function body(a: { body: Body }): FakeBody {
  return a.body as FakeBody;
}

/** Runs n ticks. */
export function run(game: Game, n: number): void {
  for (let i = 0; i < n; i++) game.tick();
}

export function startRound(game: Game): void {
  game.startHeadStart();
  game.headStartEndTick = game.now; // skip the head start in unit tests
  game.tick();
}

// ------------------------------------------------------------------ real-roster helpers
import { character } from "../src/characters/roster";
import { KITS } from "../src/abilities/kits";
import type { Actor } from "../src/entities/actor";

/** Open floor used for duels: x=40, z=50..57 has no walls. */
export const DUEL = { killer: cellPos(40, 50), survivor: cellPos(40, 53) };

/** A match with real characters and kits. Survivors stand in a row east of the duel spot. */
export function realMatch(killerId: string, survivorIds: string[], opts: { seed?: number; humanSurvivor?: number } = {}) {
  const { layout, grid } = buildHollowHamlet(ORIGIN);
  const ports = new FakePorts();
  const game = new Game({ grid, layout, ports, kits: KITS, rng: new Rng(opts.seed ?? 7), difficulty: "normal" });
  const k = game.addParticipant("killer", character(killerId).name, character(killerId), new FakeBody(DUEL.killer, 0), true);
  const ss: Actor[] = survivorIds.map((id, i) =>
    game.addParticipant(`s${i}`, character(id).name, character(id), new FakeBody(i === 0 ? DUEL.survivor : cellPos(14 + i * 2, 72), 180), i !== (opts.humanSurvivor ?? -1)),
  );
  game.setupGenerators([0, 1, 2, 3, 4]);
  startRound(game);
  return { game, ports, killer: k, survivors: ss };
}

/** Face `a` toward `b`. */
export function faceTo(a: Actor, b: { pos: Vec3 } | Vec3): void {
  const p = "pos" in b ? b.pos : b;
  (a.body as FakeBody).face({ x: p.x - a.pos.x, y: 0, z: p.z - a.pos.z });
  a.state = a.body.read();
}

/** Place an actor at a world position. */
export function place(a: Actor, p: Vec3): void {
  (a.body as FakeBody).moveTo(p);
  a.state = a.body.read();
}
