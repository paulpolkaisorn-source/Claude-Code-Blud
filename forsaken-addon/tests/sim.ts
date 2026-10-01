// Headless match simulation: bodies move by integrating the same inputs the Minecraft adapter applies
// (bot steering, dashes, impulses) with simple collision against the arena grid. Used for bot tests,
// back-to-back match tests and profiling. No Minecraft involved.
import type { Body, BodyState } from "../src/entities/actor";
import type { BotBodyOptions, PropHandle, PropKind, WorldPorts } from "../src/core/ports";
import { Game } from "../src/core/game";
import { buildHollowHamlet } from "../src/world/layout";
import { Cell, type NavGrid } from "../src/world/nav";
import { KITS } from "../src/abilities/kits";
import { BotDirector } from "../src/bots/director";
import { character, KILLERS, SURVIVORS } from "../src/characters/roster";
import { pickBotCharacters, pickGeneratorSpots } from "../src/core/setup";
import { spawnMapItems } from "../src/world/items";
import { config, type Difficulty } from "../src/core/config";
import { Rng } from "../src/util/rng";
import { flat, len2D, yawToDir, type Vec3 } from "../src/util/vec";
import type { Actor } from "../src/entities/actor";

export class SimBody implements Body {
  readonly kind = "bot" as const;
  pos: Vec3;
  vel: Vec3 = { x: 0, y: 0, z: 0 };
  facing: Vec3;
  drive_: Vec3 | null = null;
  valid = true;
  actor: Actor | null = null;
  constructor(
    pos: Vec3,
    private readonly grid: NavGrid,
  ) {
    this.pos = { ...pos };
    this.facing = yawToDir(0);
  }
  read(): BodyState {
    return { pos: { ...this.pos }, facing: { ...this.facing }, yaw: 0, pitch: 0, sprintInput: false, sneaking: false, speed: len2D(this.vel), onGround: true, jumping: false, valid: this.valid };
  }
  teleport(pos: Vec3, facing?: Vec3): void {
    if (pos.y < -500) {
      this.valid = false;
      return;
    }
    this.pos = { ...pos };
    if (facing) this.facing = flat(facing);
  }
  impulse(v: Vec3): void {
    this.vel = { x: this.vel.x + v.x, y: 0, z: this.vel.z + v.z };
  }
  drive(v: Vec3): void {
    this.drive_ = v;
  }
  setFacing(dir: Vec3): void {
    const f = flat(dir);
    if (f.x !== 0 || f.z !== 0) this.facing = f;
  }
  isValid(): boolean {
    return this.valid;
  }
  /** One physics step (mirrors applyBotMovement: velocity toward the steering target, friction otherwise). */
  step(a: Actor): void {
    let desired: Vec3 | null = null;
    if (this.drive_) desired = this.drive_;
    else if (!a.frozen && a.input.moveDir) {
      const bps = a.sprinting ? a.sprintBps : a.walkBps;
      const d = flat(a.input.moveDir);
      desired = { x: (d.x * bps) / 20, y: 0, z: (d.z * bps) / 20 };
    }
    if (desired) this.vel = { x: desired.x, y: 0, z: desired.z };
    else this.vel = { x: this.vel.x * 0.4, y: 0, z: this.vel.z * 0.4 };
    this.drive_ = null;
    const next = { x: this.pos.x + this.vel.x, y: this.pos.y, z: this.pos.z + this.vel.z };
    const blocked = (p: Vec3) => this.grid.blocksBody(Math.floor(p.x - this.grid.originX), Math.floor(p.z - this.grid.originZ)) && this.grid.get(Math.floor(p.x - this.grid.originX), Math.floor(p.z - this.grid.originZ)) !== Cell.Door;
    if (!blocked(next)) this.pos = next;
    else if (!blocked({ ...this.pos, x: next.x })) this.pos = { ...this.pos, x: next.x };
    else if (!blocked({ ...this.pos, z: next.z })) this.pos = { ...this.pos, z: next.z };
    if (a.input.lookAt) this.setFacing({ x: a.input.lookAt.x - this.pos.x, y: 0, z: a.input.lookAt.z - this.pos.z });
    else if (desired && (desired.x !== 0 || desired.z !== 0)) this.setFacing(desired);
  }
}

class SimProp implements PropHandle {
  removed = false;
  constructor(
    readonly id: string,
    readonly kind: PropKind,
  ) {}
  move(): void {}
  setNameTag(): void {}
  remove(): void {
    this.removed = true;
  }
  isValid(): boolean {
    return !this.removed;
  }
}

export class SimPorts implements WorldPorts {
  constructor(private readonly grid: NavGrid) {}
  bodies: SimBody[] = [];
  private n = 0;
  createBotBody(opts: BotBodyOptions): Body {
    const b = new SimBody(opts.pos, this.grid);
    this.bodies.push(b);
    return b;
  }
  createProp(kind: PropKind): PropHandle {
    return new SimProp(`p${this.n++}`, kind);
  }
  setGeneratorBlock(): void {}
  openDoor(): void {}
}

export interface SimResult {
  game: Game;
  winner: string | null;
  seconds: number;
  msPerTick: number;
  maxMsTick: number;
  profile: Record<string, number>;
}

/** Runs a full bots-only match (9 bots). */
export function simulateMatch(opts: { seed: number; killerId?: string; survivorIds?: string[]; difficulty?: Difficulty; maxSeconds?: number; onTick?: (game: Game) => void }): SimResult {
  const origin = { x: 0, y: 100, z: 0 };
  const { layout, grid } = buildHollowHamlet(origin);
  const rng = new Rng(opts.seed);
  const ports = new SimPorts(grid);
  const game = new Game({ grid, layout, ports, kits: KITS, rng, difficulty: opts.difficulty ?? "normal", humanId: null });
  const pick = pickBotCharacters(rng, { humanRole: null, humanCharacter: null, killers: KILLERS, survivors: SURVIVORS, survivorCount: config().match.survivorCount, allowDuplicates: false, forcedKiller: opts.killerId ? character(opts.killerId) : null });
  if (opts.survivorIds) pick.survivors = opts.survivorIds.map((id) => character(id));
  const gens = pickGeneratorSpots(rng, layout.generatorSpots.length, config().match.generatorCount, pick.killer.id === "noli" ? config().match.noliFakeGenerators : 0);
  layout.generatorSpots.forEach((g, i) => {
    if (!gens.real.includes(i) && !gens.fake.includes(i)) grid.set(g.x, g.z, Cell.Floor);
  });
  const kb = new SimBody(grid.toWorld(layout.killerSpawn), grid);
  ports.bodies.push(kb);
  game.addParticipant("bot_killer", pick.killer.name, pick.killer, kb, true);
  pick.survivors.forEach((c, i) => {
    const b = new SimBody(grid.toWorld(layout.survivorSpawns[i]), grid);
    ports.bodies.push(b);
    game.addParticipant(`bot_${i}`, c.name, c, b, true);
  });
  game.setupGenerators(gens.real, gens.fake);
  spawnMapItems(game);
  const director = new BotDirector(game);
  game.startHeadStart();
  const maxTicks = Math.round((opts.maxSeconds ?? 900) * 20);
  const profile: Record<string, number> = { game: 0, bots: 0, physics: 0 };
  let total = 0;
  let maxMs = 0;
  let n = 0;
  const now = () => performance.now();
  while (game.phase !== "ENDED" && n < maxTicks) {
    const t0 = now();
    game.tick();
    const t1 = now();
    director.update();
    const t2 = now();
    for (const a of game.actors) if (a.alive && a.body instanceof SimBody) a.body.step(a);
    const t3 = now();
    game.fx.drain();
    opts.onTick?.(game);
    profile.game += t1 - t0;
    profile.bots += t2 - t1;
    profile.physics += t3 - t2;
    const dt = t3 - t0;
    total += dt;
    maxMs = Math.max(maxMs, dt);
    n++;
  }
  return { game, winner: game.round.winner, seconds: n / 20, msPerTick: total / Math.max(1, n), maxMsTick: maxMs, profile };
}
