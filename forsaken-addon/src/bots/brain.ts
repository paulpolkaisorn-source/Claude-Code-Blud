// Shared bot machinery: memory, steering toward goals with A*, stuck recovery, aiming, ability presses.
import type { Actor } from "../entities/actor";
import type { Game } from "../core/game";
import { config, type DifficultyTuning } from "../core/config";
import { useAbility, blockReason, makeCtx } from "../abilities/engine";
import { Memory, perceive } from "./perception";
import { dist2D, flat, norm, sub, type Vec3 } from "../util/vec";
import { ticks } from "../core/scale";

export type Target = Actor | Vec3;

function posOf(t: Target): Vec3 {
  return "pos" in t ? (t as Actor).pos : (t as Vec3);
}

export abstract class Brain {
  readonly mem = new Memory();
  state = "IDLE";
  /** Where the bot wants to go (null = stand still). */
  goal: Vec3 | null = null;
  sprint = false;
  arrive = 0.7;
  /** Set by a character hook during think() to override where the state machine wanted to go this round. */
  hookGoal: Vec3 | null = null;
  private lastProgressPos: Vec3;
  private lastProgressTick = 0;
  private stuckLevel = 0;
  /** Tick at which a newly noticed threat becomes actionable (reaction delay). */
  protected noticed = new Map<string, number>();
  readonly tuning: DifficultyTuning;

  constructor(
    readonly game: Game,
    readonly me: Actor,
    readonly offset: number,
  ) {
    this.tuning = config().bots.difficulty[game.difficulty];
    this.lastProgressPos = { ...me.pos };
    game.listeners.onNoise.push((pos, loudness, kind) => {
      if (dist2D(pos, this.me.pos) <= config().bots.hearingBlocks * loudness) this.mem.noise(pos, this.game.now, kind);
    });
  }

  /** Called every tick by the director. */
  update(): void {
    const g = this.game;
    if (!this.me.alive) return;
    const interval = config().bots.thinkIntervalTicks;
    if ((g.now + this.offset) % interval === 0) {
      perceive(g, this.me, this.mem);
      this.hookGoal = null;
      this.think();
      if (this.hookGoal) {
        this.goal = this.hookGoal;
        this.arrive = 0.8;
        this.me.input.repairTarget = null;
      }
    }
    this.steer();
    this.autoInputs();
  }

  protected abstract think(): void;

  /** Has the bot known about `id` long enough to react (difficulty reaction time)? */
  protected reacted(id: string): boolean {
    const now = this.game.now;
    const t = this.noticed.get(id);
    if (t === undefined) {
      this.noticed.set(id, now + ticks(this.tuning.reactionSeconds));
      return false;
    }
    return now >= t;
  }

  protected forgetNotice(id: string): void {
    this.noticed.delete(id);
  }

  /** Per-tick movement: path to goal, sprint decision, stuck recovery. */
  private steer(): void {
    const me = this.me;
    const g = this.game;
    if (!this.goal || me.repairing || me.frozen) {
      me.input.moveDir = null;
      me.input.wantSprint = false;
      this.lastProgressPos = { ...me.pos };
      this.lastProgressTick = g.now;
      return;
    }
    const dir = g.navDirection(me, this.goal, this.arrive);
    me.input.moveDir = dir;
    me.input.wantSprint = !!dir && this.sprint;
    if (!dir) {
      this.lastProgressTick = g.now;
      return;
    }
    // Stuck detection.
    const c = config().bots;
    if (dist2D(me.pos, this.lastProgressPos) > 0.6) {
      this.lastProgressPos = { ...me.pos };
      this.lastProgressTick = g.now;
      this.stuckLevel = 0;
      return;
    }
    const stuckFor = (g.now - this.lastProgressTick) / 20;
    if (stuckFor > c.stuckSafeSeconds && this.stuckLevel < 3) {
      const cell = g.grid.nearestWalkable(g.grid.toGrid(me.pos), 8);
      if (cell) me.body.teleport(g.grid.toWorld(cell));
      g.clearNav(me);
      this.stuckLevel = 3;
      this.lastProgressTick = g.now;
    } else if (stuckFor > c.stuckWaypointSeconds && this.stuckLevel < 2) {
      const p = { x: me.pos.x + dir.x * 1.2, y: me.pos.y, z: me.pos.z + dir.z * 1.2 };
      if (g.grid.walkable(Math.floor(p.x - g.grid.originX), Math.floor(p.z - g.grid.originZ))) me.body.teleport(p);
      this.stuckLevel = 2;
    } else if (stuckFor > c.stuckRepathSeconds && this.stuckLevel < 1) {
      g.clearNav(me);
      this.stuckLevel = 1;
    }
  }

  /** Inputs that humans produce by pressing keys (jump spam in tug-of-war, flapping). */
  private autoInputs(): void {
    const me = this.me;
    if (me.flags.has("tugOfWar")) {
      const rate = this.tuning.accuracy * 0.45;
      if (this.game.rng.chance(rate)) me.input.jumpPresses++;
    }
  }

  /** Points the bot (and the model's facing used by kits this tick) at a target. */
  aim(t: Target): void {
    const p = posOf(t);
    const me = this.me;
    const d = sub({ x: p.x, y: p.y + 1.0, z: p.z }, { x: me.pos.x, y: me.pos.y + 1.6, z: me.pos.z });
    const f = norm(d);
    // Accuracy: easier bots aim a little off.
    const err = (1 - this.tuning.accuracy) * 0.25 * (this.game.rng.next() - 0.5);
    const facing = norm({ x: f.x + err, y: f.y, z: f.z - err });
    me.state = { ...me.state, facing };
    me.input.lookAt = { ...p };
    me.body.setFacing(flat(facing));
  }

  /** Can the ability be pressed right now (cooldown, Helpless, stun, kit preconditions)? */
  canUse(abilityId: string): boolean {
    const def = this.me.ability(abilityId);
    const kit = this.game.kits.get(this.me.character.id);
    const h = kit?.abilities[abilityId];
    if (!def || !h) return false;
    const ctx = makeCtx(this.game, this.me, def);
    const active = !!h.release && (h.isActive ? h.isActive(ctx) : ctx.data.active === true);
    return blockReason(this.game, this.me, def, h, ctx, active) === null;
  }

  /** Is a charge/toggle ability currently active? */
  isActive(abilityId: string): boolean {
    const def = this.me.ability(abilityId);
    const h = this.game.kits.get(this.me.character.id)?.abilities[abilityId];
    if (!def || !h) return false;
    const ctx = makeCtx(this.game, this.me, def);
    return h.isActive ? h.isActive(ctx) : ctx.data.active === true;
  }

  /** Presses an ability, optionally aiming first. Respects the difficulty's ability-use chance. */
  use(abilityId: string, at?: Target, force = false): boolean {
    if (!force && !this.game.rng.chance(this.tuning.abilityUseChance)) return false;
    if (!this.canUse(abilityId)) return false;
    if (at) this.aim(at);
    return useAbility(this.game, this.me, abilityId).ok;
  }

  distTo(t: Target): number {
    return dist2D(this.me.pos, posOf(t));
  }

  hpFrac(a: Actor = this.me): number {
    return a.hp / Math.max(1, a.maxHp);
  }
}
