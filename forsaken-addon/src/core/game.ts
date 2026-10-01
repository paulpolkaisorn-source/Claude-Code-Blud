// The whole match state and the per-tick update. Pure TypeScript: Minecraft is reached only through
// `WorldPorts` (creating bodies/props) and the `Fx` queue (particles, sounds, titles).
import { Actor, type Body, type ForcedMove, type ShieldLayer } from "../entities/actor";
import type { CharacterDef, Team } from "../characters/types";
import type { DamageEvent } from "../entities/hooks";
import { activeHooks, addShield, applyStatus, dealDamage, heal, pruneHooks, removeStatus, stun, type DamageOptions, type HealOptions } from "../entities/combat";
import { statusDef, type ApplyOptions, type StatusId } from "../entities/statuses";
import { computeSpeeds } from "../entities/movement";
import { updateStamina } from "../entities/stamina";
import { applyStartCooldowns, type KitRegistry } from "../abilities/engine";
import type { ObjectSpec, WorldObject } from "../abilities/objects";
import { Fx, type Rgb } from "./fx";
import { Scheduler } from "./scheduler";
import { config, type Difficulty } from "./config";
import { studs, ticks } from "./scale";
import { evaluate, maybeStartLms, newRound, onElimination, onGeneratorCompleted, onLayerCompleted, tickClock, type RoundState, type Winner } from "./round";
import type { WorldPorts } from "./ports";
import { Rng } from "../util/rng";
import { add, dist, dist2D, flat, len2D, norm, rotateY, scale, sub, type Vec3, angleBetween2D } from "../util/vec";
import type { NavGrid } from "../world/nav";
import type { ArenaLayout } from "../world/layout";
import { advanceGenerator, createGenerators, generatorsDone, resetFake, type Generator } from "../world/generators";
import { ACTOR_RADIUS } from "../abilities/hit";

export type GamePhase = "SETUP" | "HEAD_START" | "ROUND" | "ENDED";

export type RevealViewers = "killer" | "survivors" | "all" | string[];

export interface Reveal {
  id: number;
  targetId: string;
  viewers: RevealViewers;
  endTick: number;
  color: Rgb;
  /** Marked reveals bypass Undetectable (Guest 666). */
  marked: boolean;
  source: string;
}

export interface GameInit {
  grid: NavGrid;
  layout: ArenaLayout;
  ports: WorldPorts;
  kits: KitRegistry;
  rng?: Rng;
  difficulty?: Difficulty;
  humanId?: string | null;
}

export interface ResultRow {
  id: string;
  name: string;
  character: string;
  team: Team;
  isBot: boolean;
  alive: boolean;
  layers: number;
  generators: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  stuns: number;
  healing: number;
}

export const AURA_COLORS: Record<string, Rgb> = {
  yellow: [1, 0.9, 0.2],
  red: [1, 0.15, 0.15],
  white: [1, 1, 1],
  purple: [0.7, 0.3, 1],
  green: [0.3, 1, 0.3],
  blue: [0.3, 0.6, 1],
  pink: [1, 0.4, 0.8],
};

export class Game {
  readonly fx = new Fx();
  readonly scheduler = new Scheduler();
  readonly rng: Rng;
  readonly grid: NavGrid;
  readonly layout: ArenaLayout;
  readonly ports: WorldPorts;
  readonly kits: KitRegistry;
  readonly dt = 1 / 20;
  now = 0;
  phase: GamePhase = "SETUP";
  difficulty: Difficulty;
  humanId: string | null;

  readonly actors: Actor[] = [];
  private readonly byId = new Map<string, Actor>();
  killer: Actor | null = null;
  round: RoundState = newRound();
  generators: Generator[] = [];
  objects: WorldObject[] = [];
  reveals: Reveal[] = [];
  headStartEndTick = 0;
  readonly eventLog: string[] = [];
  /** Listeners for the adapter / bots (generator noise, kills...). */
  readonly listeners: { onNoise: Array<(pos: Vec3, loudness: number, kind: string) => void>; onKill: Array<(victim: Actor, killer: Actor | null) => void> } = { onNoise: [], onKill: [] };
  private nextObjectId = 1;
  private nextRevealId = 1;
  private nextMinionId = 1;
  lmsStartedTick = -1;

  constructor(init: GameInit) {
    this.grid = init.grid;
    this.layout = init.layout;
    this.ports = init.ports;
    this.kits = init.kits;
    this.rng = init.rng ?? new Rng(Date.now() & 0xffffffff);
    this.difficulty = init.difficulty ?? "normal";
    this.humanId = init.humanId ?? null;
  }

  // ======================================================================= setup

  /** Creates a participant (player or bot) from a character definition. */
  addParticipant(id: string, displayName: string, character: CharacterDef, body: Body, isBot: boolean, hpOverride?: number): Actor {
    let hp = hpOverride;
    if (hp === undefined && character.id === "1x1x1x1" && config().oneXOneHpOverride) hp = config().oneXOneHpOverride ?? undefined;
    const a = new Actor({ id, displayName, character, body, isBot, hp });
    if (character.id === "daemon") a.flags.add("tall");
    this.actors.push(a);
    this.byId.set(id, a);
    if (a.isKiller) this.killer = a;
    if (a.isSurvivor) a.hitPriority = 1;
    return a;
  }

  /** Spawns a minion actor (pizza bot, zombie, clone, mirage, decoy) with a bot body. */
  spawnMinion(opts: { owner: Actor; character: CharacterDef; pos: Vec3; name: string; hp: number; team?: Team; skinIndex?: number; flags?: string[] }): Actor {
    const id = `minion${this.nextMinionId++}`;
    const body = this.ports.createBotBody({ characterId: opts.character.id, skinIndex: opts.skinIndex ?? opts.character.skinIndex, pos: opts.pos, nameTag: opts.name, minion: true });
    const ch: CharacterDef = opts.team && opts.team !== opts.character.team ? { ...opts.character, team: opts.team } : opts.character;
    const a = new Actor({ id, displayName: opts.name, character: ch, body, isBot: true, isMinion: true, ownerId: opts.owner.id, hp: opts.hp });
    for (const f of opts.flags ?? []) a.flags.add(f);
    a.staminaMax = 1e9;
    a.stamina = 1e9;
    this.actors.push(a);
    this.byId.set(id, a);
    return a;
  }

  /** Removes a dead or expired minion from the game (and its body). */
  despawnMinion(a: Actor): void {
    if (!a.isMinion) return;
    a.alive = false;
    const i = this.actors.indexOf(a);
    if (i >= 0) this.actors.splice(i, 1);
    this.byId.delete(a.id);
    this.scheduler.cancelOwner(a.id);
    a.body.teleport({ x: a.pos.x, y: -1000, z: a.pos.z });
  }

  /** Picks generator spots (real + Noli fakes) and creates the generator state. */
  setupGenerators(realIdx: number[], fakeIdx: number[] = []): void {
    const spots = [...realIdx, ...fakeIdx].map((i) => {
      const cell = this.layout.generatorSpots[i];
      return { cell, block: { x: this.grid.originX + cell.x, y: this.grid.originY, z: this.grid.originZ + cell.z } };
    });
    this.generators = createGenerators(spots, fakeIdx.map((_, k) => realIdx.length + k));
  }

  /** Starts the head start: killer frozen, clock stopped. */
  startHeadStart(): void {
    this.phase = "HEAD_START";
    this.headStartEndTick = this.now + ticks(config().match.headStartSeconds);
    for (const a of this.actors) {
      const kit = this.kits.get(a.character.id);
      kit?.init?.(a, this);
      applyStartCooldowns(this, a);
    }
    if (this.killer) this.killer.addMoveMod({ id: "headStart", endTick: this.headStartEndTick, frozen: true });
  }

  startRound(): void {
    this.phase = "ROUND";
    this.killer?.removeMoveMod("headStart");
    this.log("Round started");
  }

  // ======================================================================= queries

  get(id: string | null | undefined): Actor | undefined {
    return id ? this.byId.get(id) : undefined;
  }

  get human(): Actor | undefined {
    return this.get(this.humanId);
  }

  /** Living, non-minion survivors. */
  aliveSurvivors(): Actor[] {
    return this.actors.filter((a) => a.isSurvivor && a.alive);
  }

  allSurvivors(): Actor[] {
    return this.actors.filter((a) => a.isSurvivor);
  }

  aliveSentinels(): number {
    return this.actors.filter((a) => a.isSurvivor && a.alive && (a.role === "sentinel" || a.character.altRole === "sentinel")).length;
  }

  /** Targets an attacker may hit: alive actors of the other team (minions included when they are hittable). */
  enemiesOf(a: Actor, includeMinions = true): Actor[] {
    return this.actors.filter((t) => t.alive && t.team !== a.team && t !== a && (includeMinions || !t.isMinion));
  }

  alliesOf(a: Actor, includeSelf = false): Actor[] {
    return this.actors.filter((t) => t.alive && t.team === a.team && !t.isMinion && (includeSelf || t !== a));
  }

  nearestEnemy(a: Actor, maxDist = Infinity, filter: (t: Actor) => boolean = () => true): Actor | null {
    let best: Actor | null = null;
    let bd = maxDist;
    for (const t of this.enemiesOf(a, false)) {
      if (!filter(t)) continue;
      const d = dist2D(a.pos, t.pos);
      if (d <= bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  lineOfSight(a: Vec3, b: Vec3): boolean {
    return this.grid.lineOfSight(a, b);
  }

  /** Killer's terror radius in blocks, after modifiers (Blood Hunt -50%, Ascension ...). */
  terrorRadius(k: Actor | null = this.killer): number {
    if (!k) return 0;
    const base = k.character.stats.terrorRadius ?? config().terror.defaultRadiusStuds;
    const mul = k.res.terrorMul ?? 1;
    return studs(base) * mul;
  }

  // ======================================================================= combat API

  damage(target: Actor, amount: number, source: Actor | null, opts: DamageOptions = {}): DamageEvent {
    return dealDamage(this, target, amount, source, opts);
  }

  heal(target: Actor, amount: number, source: Actor | null, opts: HealOptions = {}): number {
    return heal(this, target, amount, source, opts);
  }

  status(target: Actor, id: StatusId, level: number, seconds: number, source: Actor | null, opts: ApplyOptions = {}): boolean {
    return applyStatus(this, target, id, level, seconds, source, opts);
  }

  removeStatus(target: Actor, id: StatusId): boolean {
    return removeStatus(this, target, id);
  }

  stun(target: Actor, seconds: number, source: Actor | null): boolean {
    return stun(this, target, seconds, source);
  }

  shield(target: Actor, id: string, amount: number, opts: { max?: number; seconds?: number; reduction?: number; decayPerSecond?: number; dotSkipsReduction?: boolean } = {}): ShieldLayer {
    return addShield(target, {
      id,
      amount,
      max: opts.max ?? amount,
      reduction: opts.reduction ?? 0,
      decayPerSecond: opts.decayPerSecond ?? 0,
      endTick: opts.seconds ? this.now + ticks(opts.seconds) : Infinity,
      dotSkipsReduction: opts.dotSkipsReduction ?? false,
    });
  }

  startCooldown(a: Actor, abilityId: string, seconds: number): void {
    a.cooldowns.unpause(abilityId);
    a.cooldowns.start(abilityId, ticks(seconds), this.now);
  }

  /** Grants a temporary invulnerability window (i-frames). */
  invulnerable(a: Actor, seconds: number): void {
    a.invulnerableUntil = Math.max(a.invulnerableUntil, this.now + ticks(seconds));
  }

  /** Cancels channels, windups, dashes and repair (stun / damage / manual). */
  interrupt(a: Actor, reason: "stun" | "damage" | "manual" | "move"): void {
    if (reason === "stun") {
      this.scheduler.cancelOwner(a.id, { stunOnly: true });
      if (a.forced && a.forced.stopOnStun) this.endForced(a, "stun");
    }
    if (a.channel) {
      const ch = a.channel;
      const cancel = (reason === "stun" && ch.stunCancels) || (reason === "damage" && ch.damageCancels) || (reason === "move" && ch.moveCancels) || reason === "manual";
      if (cancel) {
        a.channel = null;
        a.removeMoveMod(`channel:${ch.id}`);
        ch.onCancel?.(reason);
      }
    }
    if (reason === "stun" || reason === "damage" || reason === "move") a.repairing = null;
  }

  schedule(owner: Actor | null, delaySeconds: number, fn: () => void, opts: { tag?: string; stunCancels?: boolean } = {}): number {
    return this.scheduler.schedule(this.now + Math.max(0, ticks(delaySeconds)), fn, { ownerId: owner?.id ?? null, tag: opts.tag, stunCancels: opts.stunCancels });
  }

  /**
   * Windup: runs `fn` after `seconds` unless the actor is stunned (or damaged if damageCancels) first.
   * While winding up the actor gets an optional movement multiplier / sprint lock and a HUD channel bar.
   */
  windup(a: Actor, seconds: number, fn: () => void, opts: { abilityId?: string; label?: string; moveMul?: number; noSprint?: boolean; frozen?: boolean; stunCancels?: boolean; damageCancels?: boolean; moveCancels?: boolean; onCancel?: (reason: string) => void } = {}): void {
    const id = `${opts.abilityId ?? "windup"}:${this.now}`;
    const end = this.now + Math.max(1, ticks(seconds));
    if (opts.moveMul !== undefined || opts.noSprint || opts.frozen) a.addMoveMod({ id: `channel:${id}`, endTick: end, mul: opts.moveMul, noSprint: opts.noSprint, frozen: opts.frozen });
    a.channel = {
      id,
      abilityId: opts.abilityId ?? null,
      label: opts.label ?? "Casting",
      startTick: this.now,
      endTick: end,
      stunCancels: opts.stunCancels ?? true,
      damageCancels: opts.damageCancels ?? false,
      moveCancels: opts.moveCancels ?? false,
      onCancel: opts.onCancel,
    };
    this.scheduler.schedule(
      end,
      () => {
        if (a.channel?.id !== id) return; // cancelled
        a.channel = null;
        a.removeMoveMod(`channel:${id}`);
        if (a.alive) fn();
      },
      { ownerId: a.id, tag: `windup:${opts.abilityId ?? ""}`, stunCancels: false },
    );
  }

  /** Starts a dash/lunge. Speed in studs/s (converted), or blocksPerTick directly. */
  dash(a: Actor, opts: { id: string; dir?: Vec3; studsPerSecond?: number; blocksPerTick?: number; seconds: number; turnRate?: number; onTick?: () => boolean | void; onWall?: () => void; onEnd?: ForcedMove["onEnd"]; noStaminaRegen?: boolean; stopOnStun?: boolean }): ForcedMove {
    const dir = flat(opts.dir ?? a.facing);
    const speed = opts.blocksPerTick ?? (studs(opts.studsPerSecond ?? 0) / 20);
    if (a.forced) this.endForced(a, "cancel");
    const fm: ForcedMove = {
      id: opts.id,
      dir,
      speed,
      endTick: this.now + Math.max(1, ticks(opts.seconds)),
      turnRate: opts.turnRate ?? 0,
      hit: new Set(),
      onTick: opts.onTick,
      onWall: opts.onWall,
      onEnd: opts.onEnd,
      noStaminaRegen: opts.noStaminaRegen,
      stopOnStun: opts.stopOnStun ?? true,
    };
    a.forced = fm;
    return fm;
  }

  /** Lunge of `distanceStuds` over `seconds` in the facing direction (Behead, Hatchet, Slash while ENRAGED). */
  lunge(a: Actor, distanceStuds: number, seconds = 0.25, onTick?: () => boolean | void): ForcedMove {
    const blocks = studs(distanceStuds);
    return this.dash(a, { id: "lunge", blocksPerTick: blocks / Math.max(1, ticks(seconds)), seconds, onTick });
  }

  endForced(a: Actor, reason: "time" | "wall" | "stun" | "cancel"): void {
    const fm = a.forced;
    if (!fm) return;
    a.forced = null;
    a.body.drive({ x: 0, y: 0, z: 0 });
    fm.onEnd?.(reason);
  }

  // ======================================================================= reveals (auras)

  reveal(target: Actor, viewers: RevealViewers, seconds: number, opts: { color?: keyof typeof AURA_COLORS | Rgb; marked?: boolean; source?: string } = {}): void {
    if (!target.alive) return;
    const source = opts.source ?? "";
    const endTick = this.now + ticks(seconds);
    const color = Array.isArray(opts.color) ? opts.color : AURA_COLORS[opts.color ?? "yellow"];
    const key = JSON.stringify(viewers);
    const existing = this.reveals.find((r) => r.targetId === target.id && r.source === source && JSON.stringify(r.viewers) === key);
    if (existing) {
      existing.endTick = Math.max(existing.endTick, endTick);
      existing.marked = existing.marked || (opts.marked ?? false);
      return;
    }
    this.reveals.push({ id: this.nextRevealId++, targetId: target.id, viewers, endTick, color, marked: opts.marked ?? false, source });
  }

  private viewerMatches(r: Reveal, viewer: Actor): boolean {
    if (r.viewers === "all") return true;
    if (r.viewers === "killer") return viewer.team === "killer";
    if (r.viewers === "survivors") return viewer.team === "survivor";
    return r.viewers.includes(viewer.id);
  }

  /** Active aura reveals of `target` that `viewer` can see (Subspaced viewers see none; Undetectable hides non-Marked reveals). */
  revealsFor(viewer: Actor, target: Actor): Reveal[] {
    if (!target.alive || viewer.statuses.has("subspaced")) return [];
    const undetectable = target.statuses.has("undetectable");
    const marked = target.statuses.has("marked");
    return this.reveals.filter((r) => r.targetId === target.id && r.endTick > this.now && this.viewerMatches(r, viewer) && (!undetectable || r.marked || marked));
  }

  isRevealedTo(target: Actor, viewer: Actor): boolean {
    return this.revealsFor(viewer, target).length > 0;
  }

  // ======================================================================= objects

  spawnObject(spec: ObjectSpec): WorldObject {
    const o: WorldObject = {
      id: `obj${this.nextObjectId++}`,
      kind: spec.kind,
      owner: spec.owner,
      team: spec.owner?.team ?? null,
      pos: { ...spec.pos },
      radius: spec.radius ?? 0.5,
      hp: spec.hp ?? 1,
      maxHp: spec.hp ?? 1,
      endTick: spec.lifeSeconds !== undefined ? this.now + ticks(spec.lifeSeconds) : Infinity,
      dead: false,
      prop: spec.prop ? this.ports.createProp(spec.prop, spec.pos, { nameTag: spec.propName }) : null,
      blockCells: spec.blockCells ?? [],
      targetableBy: spec.targetableBy ?? null,
      data: spec.data ?? {},
      update: spec.update,
      onDamaged: spec.onDamaged,
      onRemove: spec.onRemove,
    };
    for (const c of o.blockCells) this.grid.addDynamic(c.x, c.z);
    this.objects.push(o);
    return o;
  }

  removeObject(o: WorldObject, reason: "expired" | "destroyed" | "cleanup" | "consumed"): void {
    if (o.dead) return;
    o.dead = true;
    for (const c of o.blockCells) this.grid.removeDynamic(c.x, c.z);
    o.prop?.remove();
    o.onRemove?.(o, this, reason);
  }

  objectsOf(kind: string, owner?: Actor): WorldObject[] {
    return this.objects.filter((o) => !o.dead && o.kind === kind && (!owner || o.owner === owner));
  }

  /** Attacks (killer M1s, survivor stabs) also damage objects targetable by their team within the hit area. */
  damageObjectsInArc(attacker: Actor, range: number, halfAngle: number, amount: number): WorldObject[] {
    const hit: WorldObject[] = [];
    const f = flat(attacker.facing);
    for (const o of this.objects) {
      if (o.dead || o.targetableBy !== attacker.team) continue;
      const rel = sub(o.pos, attacker.pos);
      const d = len2D(rel);
      if (d > range + o.radius) continue;
      if (d > 0.8 && Math.abs(angleBetween2D(f, rel)) > halfAngle) continue;
      hit.push(o);
      o.hp -= amount;
      o.onDamaged?.(o, this, attacker, amount);
      if (o.hp <= 0) this.removeObject(o, "destroyed");
    }
    return hit;
  }

  // ======================================================================= events from combat

  afterDamage(ev: DamageEvent): void {
    const t = ev.target;
    const now = this.now;
    const lost = ev.dealt + ev.absorbed;
    if (ev.dealt > 0) {
      if (t.repairing) t.repairing = null;
      this.interrupt(t, "damage");
      // Regeneration statuses are cancelled by enough real damage.
      const regen = t.statuses.get("regeneration");
      if (regen && ev.kind !== "dot" && ev.dealt >= (regen.data.cancelAt ?? 10)) this.removeStatus(t, "regeneration");
    }
    // On-hit speed boost for survivors hit by the killer side (wiki: "the on-hit speed boost").
    if (t.isSurvivor && lost > 0 && ev.source && ev.source.team === "killer" && ev.kind !== "dot" && !ev.killed && !t.flags.has("noOnHitSpeed") && !ev.tags.has("noOnHitSpeed")) {
      const c = config().combat;
      t.statuses.apply("speed", c.onHitSpeedLevel, ticks(c.onHitSpeedSeconds), now, { mode: "max" });
    }
    if (lost > 0 && ev.kind !== "dot") {
      this.fx.sound(t.isKiller ? "hitKiller" : "hit", t.pos);
      this.fx.particle("hitSpark", { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z });
    }
    for (const fn of activeHooks(t, "afterTakeDamage", now)) fn(t, ev, this);
    if (ev.source) for (const fn of activeHooks(ev.source, "afterDealDamage", now)) fn(ev.source, ev, this);
    for (const a of this.actors) for (const fn of activeHooks(a, "anyDamage", now)) fn(a, ev, this);
    if (ev.killed) this.kill(t, ev);
  }

  onStatusApplied(target: Actor, id: StatusId, _source: Actor | null): void {
    const def = statusDef(id);
    const inst = target.statuses.get(id);
    if (!inst) return;
    const secs = inst.endTick === Infinity ? 600 : (inst.endTick - this.now) / 20;
    if (def.vanilla === "blindness") this.fx.effect(target.id, "blindness", secs, inst.level - 1);
    if (id === "invisibility" && inst.level >= 3) this.fx.effect(target.id, "invisibility", secs, 0);
    if (id === "subspaced") {
      this.fx.effect(target.id, "nausea", secs, 0);
      if (inst.level >= 2) this.fx.effect(target.id, "darkness", secs, 0);
      if (inst.level >= 3) this.fx.shake(target.id, 0.25, secs);
    }
    if (id === "creatures") this.fx.sound("bats", target.pos);
  }

  onStatusRemoved(target: Actor, id: StatusId): void {
    if (id === "blindness") this.fx.clearEffect(target.id, "blindness");
    if (id === "invisibility") this.fx.clearEffect(target.id, "invisibility");
    if (id === "subspaced") {
      this.fx.clearEffect(target.id, "nausea");
      this.fx.clearEffect(target.id, "darkness");
    }
  }

  onShieldBroken(_target: Actor, _layer: ShieldLayer): void {
    // Shield-specific consequences (Shatterpoint lockout) are handled by kit hooks.
  }

  /** Eliminates an actor. Survivors become spectators; a dead killer ends the round. */
  kill(victim: Actor, ev: DamageEvent | null): void {
    if (!victim.alive) return;
    victim.alive = false;
    victim.hp = 0;
    victim.eliminatedTick = this.now;
    victim.repairing = null;
    victim.channel = null;
    victim.forced = null;
    victim.shields = [];
    this.scheduler.cancelOwner(victim.id);
    // Kill credit: direct source, else the last killer-side actor to hurt them (damage over time).
    let credit: Actor | null = ev?.source ?? null;
    if (!credit && victim.lastHitBy) credit = this.get(victim.lastHitBy) ?? null;
    if (victim.isMinion) {
      this.log(`${victim.displayName} destroyed`);
      this.despawnMinion(victim);
      return;
    }
    if (victim.isSurvivor) {
      onElimination(this.round);
      if (credit && credit.team === "killer") {
        const k = credit.isMinion ? this.get(credit.ownerId) : credit;
        if (k) {
          k.stats.kills++;
          for (const fn of activeHooks(k, "kill", this.now)) fn(k, victim, ev, this);
        }
      }
      this.fx.sound("death", victim.pos);
      this.fx.particle("soul", { x: victim.pos.x, y: victim.pos.y + 1, z: victim.pos.z });
      this.fx.message("all", `§c☠ ${victim.displayName} was eliminated. §7(${this.aliveSurvivors().length} left)`);
      this.log(`${victim.displayName} eliminated${credit ? ` by ${credit.displayName}` : ""}`);
      // Remove reveals of the dead.
      this.reveals = this.reveals.filter((r) => r.targetId !== victim.id);
      if (maybeStartLms(this.round, this.aliveSurvivors().length)) this.onLmsStart();
    } else if (victim.isKiller) {
      this.fx.message("all", `§a${victim.displayName} has fallen!`);
      this.log(`${victim.displayName} (killer) died`);
    }
    for (const a of this.actors) for (const fn of activeHooks(a, "anyDeath", this.now)) fn(a, victim, this);
    for (const l of this.listeners.onKill) l(victim, credit);
  }

  private onLmsStart(): void {
    this.lmsStartedTick = this.now;
    const last = this.aliveSurvivors()[0];
    const ids = this.actors.filter((a) => !a.isMinion).map((a) => a.id);
    this.fx.title(ids, "§4LAST MAN STANDING", last && this.killer ? `§f${last.displayName} §7vs §c${this.killer.displayName}` : undefined, 60);
    this.fx.sound("lms", last?.pos ?? this.killer?.pos ?? { x: 0, y: 0, z: 0 });
    for (const id of ids) this.fx.fog(id, "lms", true);
    this.log("Last Man Standing");
  }

  noise(pos: Vec3, loudness: number, kind: string): void {
    for (const l of this.listeners.onNoise) l(pos, loudness, kind);
  }

  log(text: string): void {
    const t = (this.now / 20).toFixed(1);
    this.eventLog.push(`[${t}] ${text}`);
    if (this.eventLog.length > 400) this.eventLog.shift();
  }

  // ======================================================================= tick

  /** Reads all bodies (adapter calls this, tests call it implicitly through tick). */
  syncBodies(): void {
    for (const a of this.actors) {
      if (!a.body.isValid()) continue;
      a.lastPos = a.state.pos;
      a.state = a.body.read();
    }
  }

  tick(): void {
    this.now++;
    if (this.phase === "SETUP" || this.phase === "ENDED") return;
    this.syncBodies();
    this.scheduler.run(this.now);
    if (this.phase === "HEAD_START" && this.now >= this.headStartEndTick) this.startRound();

    const survivorsAlive = this.aliveSurvivors();
    const farRange = studs(config().combat.killerFarRangeStuds);
    const drainRange = studs(config().combat.killerStaminaDrainRangeStuds);

    for (const a of [...this.actors]) {
      if (!a.alive) continue;
      pruneHooks(a, this.now);
      this.tickStatuses(a);
      if (!a.alive) continue;
      this.tickShields(a);
      this.tickChannel(a);
      this.tickForced(a);
      const kit = this.kits.get(a.character.id);
      if (!a.isMinion || a.flags.has("kitTick")) kit?.tick?.(a, this);
      for (const fn of activeHooks(a, "tick", this.now)) fn(a, this);
      if (!a.alive) continue;
      // speeds + stamina
      let killerFar = false;
      let drainAllowed = true;
      if (a.isKiller) {
        const nearest = survivorsAlive.reduce((m, s) => Math.min(m, dist2D(s.pos, a.pos)), Infinity);
        killerFar = nearest > farRange;
        drainAllowed = nearest <= drainRange;
      }
      const sp = computeSpeeds(a, { now: this.now, killerFar });
      a.walkBps = sp.walkBps;
      a.canSprint = sp.canSprint;
      a.frozen = sp.frozen || a.isStunned(this.now);
      const moving = a.state.speed > 0.02 || (a.isBot && !!a.input.moveDir);
      const wantsSprint = sp.canSprint && moving && (a.isBot ? a.input.wantSprint : a.state.sprintInput);
      a.sprinting = updateStamina(a, { dt: this.dt, wantsSprint, drainAllowed, regenPaused: !!a.forced?.noStaminaRegen || a.flags.has("noStaminaRegen") });
      a.sprintBps = a.exhausted ? sp.walkBps : sp.sprintBps;
    }

    for (const o of [...this.objects]) {
      if (o.dead) continue;
      if (this.now >= o.endTick) {
        this.removeObject(o, "expired");
        continue;
      }
      o.update?.(o, this);
    }
    this.objects = this.objects.filter((o) => !o.dead);
    this.reveals = this.reveals.filter((r) => r.endTick > this.now);

    if (this.phase === "ROUND") {
      this.tickGenerators();
      tickClock(this.round, this.dt);
      this.tickLms();
      this.checkEnd();
    }
  }

  private tickStatuses(a: Actor): void {
    const now = this.now;
    const st = config().statusTuning;
    for (const s of a.statuses.all()) {
      if (s.endTick <= now) continue;
      s.accum++;
      const src = this.get(s.sourceId) ?? null;
      const remaining = s.endTick - now;
      switch (s.id) {
        case "bleeding":
          if (s.accum % 20 === 0 && remaining >= 20) this.damage(a, st.bleedingDpsPerLevel * s.level, src, { kind: "dot", abilityId: "status:bleeding", floor: st.bleedingFloorHp });
          break;
        case "burning":
          if (s.accum % 10 === 0) this.damage(a, st.burningDps[Math.min(4, s.level - 1)] / 2, src, { kind: "dot", abilityId: "status:burning" });
          break;
        case "poisoned":
          if (s.accum % 10 === 0) this.damage(a, st.poisonDps[Math.min(4, s.level - 1)] / 2, src, { kind: "dot", abilityId: "status:poisoned", canKill: false, floor: st.dotFloorHp });
          break;
        case "corrupted":
          if (s.accum % 10 === 0) this.damage(a, st.corruptedDps[Math.min(4, s.level - 1)] / 2, src, { kind: "dot", abilityId: "status:corrupted", canKill: false, floor: st.dotFloorHp });
          break;
        case "regeneration": {
          if (s.accum % 10 === 0) {
            const per = (s.data.perSecond ?? 1) / 2;
            const left = s.data.remaining ?? Infinity;
            const amt = Math.min(per, left);
            this.heal(a, amt, src);
            s.data.remaining = left - amt;
            if (s.data.remaining <= 0) a.statuses.remove("regeneration");
          }
          break;
        }
        case "hemorrhage": {
          const cap = st.hemorrhageMaxLossPerLevel * s.level;
          a.maxHpPenalty = Math.min(cap, a.maxHpPenalty + (st.hemorrhageMaxHpLossPerSecondPerLevel * s.level) / 20);
          if (a.hp > a.maxHp) a.hp = a.maxHp;
          break;
        }
        default:
          break;
      }
      if (!a.alive) return;
    }
    if (!a.statuses.has("hemorrhage") && a.maxHpPenalty > 0) a.maxHpPenalty = Math.max(0, a.maxHpPenalty - st.hemorrhageRecoveryPerSecond / 20);
    for (const ex of a.statuses.expire(now)) {
      for (const fn of activeHooks(a, "statusRemoved", now)) fn(a, ex.id, this);
      this.onStatusRemoved(a, ex.id);
    }
  }

  private tickShields(a: Actor): void {
    if (a.shields.length === 0) return;
    for (const l of a.shields) {
      if (l.decayPerSecond > 0) l.amount -= l.decayPerSecond / 20;
      if (l.endTick <= this.now) l.amount = 0;
    }
    const broken = a.shields.filter((l) => l.amount <= 0.0001);
    a.shields = a.shields.filter((l) => l.amount > 0.0001);
    for (const l of broken) this.onShieldBroken(a, l);
  }

  private tickChannel(a: Actor): void {
    const ch = a.channel;
    if (!ch) return;
    if (ch.moveCancels && a.state.speed > 0.04 && !a.isBot) this.interrupt(a, "move");
  }

  private tickForced(a: Actor): void {
    const fm = a.forced;
    if (!fm) return;
    if (this.now >= fm.endTick) {
      this.endForced(a, "time");
      return;
    }
    if (fm.stopOnStun && a.isStunned(this.now)) {
      this.endForced(a, "stun");
      return;
    }
    if (fm.turnRate > 0) {
      const want = flat(a.facing);
      const d = angleBetween2D(fm.dir, want);
      const turn = Math.max(-fm.turnRate, Math.min(fm.turnRate, d));
      // rotateY(+deg) increases yaw by deg, and angleBetween2D(a, b) = yaw(b) - yaw(a).
      fm.dir = flat(rotateY(fm.dir, turn));
    }
    // Wall check one step ahead (body radius).
    const next = add(a.pos, scale(fm.dir, fm.speed + ACTOR_RADIUS));
    const cx = Math.floor(next.x - this.grid.originX);
    const cz = Math.floor(next.z - this.grid.originZ);
    if (this.grid.blocksBody(cx, cz)) {
      fm.onWall?.();
      this.endForced(a, "wall");
      return;
    }
    a.body.drive(scale(fm.dir, fm.speed));
    // Model position advances too, so hit checks this tick use the new position.
    a.state = { ...a.state, pos: add(a.pos, scale(fm.dir, fm.speed)) };
    if (fm.onTick && fm.onTick() === false) this.endForced(a, "cancel");
  }

  private tickGenerators(): void {
    const c = config().match;
    const range = c.repairRangeBlocks;
    // Validate who is repairing what.
    for (const g of this.generators) g.repairers.clear();
    for (const a of this.actors) {
      if (!a.alive || !a.isSurvivor) {
        a.repairing = null;
        continue;
      }
      const wantId = a.input.repairTarget;
      if (!wantId) {
        a.repairing = null;
        continue;
      }
      const g = this.generators.find((x) => x.id === wantId);
      const ok =
        g &&
        !g.completed &&
        !a.isStunned(this.now) &&
        !a.forced &&
        !a.channel &&
        dist2D(a.pos, { x: g.block.x + 0.5, y: g.block.y, z: g.block.z + 0.5 }) <= range &&
        g.repairers.size < c.maxRepairersPerGenerator &&
        !a.flags.has("noRepair");
      if (ok && g) {
        g.repairers.add(a.id);
        a.repairing = g.id;
      } else {
        a.repairing = null;
      }
    }
    for (const g of this.generators) {
      if (g.completed || g.repairers.size === 0) continue;
      const reps = [...g.repairers].map((id) => this.get(id)).filter((x): x is Actor => !!x);
      const muls = reps.map((r) => (r.isBot ? config().bots.difficulty[this.difficulty].repairMultiplier : 1) * (r.res.repairMul ?? 1));
      const before = Math.floor(g.progress + 1e-9);
      const step = advanceGenerator(g, this.dt, muls);
      if (this.now - g.lastNoiseTick > 40) {
        g.lastNoiseTick = this.now;
        this.noise({ x: g.block.x + 0.5, y: g.block.y, z: g.block.z + 0.5 }, 1, "generator");
      }
      for (let i = 0; i < step.layersFinished; i++) {
        const layerNo = before + i + 1;
        for (const r of reps) g.layerCredit.set(r.id, (g.layerCredit.get(r.id) ?? 0) + 1);
        if (g.fake) {
          for (const r of reps) this.onFakeLayer(g, r, layerNo);
          if (g.progress >= g.layers) {
            for (const r of reps) this.onFakeComplete(g, r);
            resetFake(g);
            break;
          }
          continue;
        }
        onLayerCompleted(this.round);
        for (const r of reps) r.stats.layersRepaired++;
        this.fx.sound("generatorLayer", g.block);
        for (const a of this.actors) for (const r of reps) for (const fn of activeHooks(a, "layerRepaired", this.now)) fn(a, g, r, this);
      }
      if (step.completedNow) {
        onGeneratorCompleted(this.round);
        for (const r of reps) r.stats.generatorsCompleted++;
        for (const r of reps) r.repairing = null;
        this.ports.setGeneratorBlock(g.block, true);
        this.fx.sound("generatorDone", g.block);
        this.fx.particle("shield", { x: g.block.x + 0.5, y: g.block.y + 1.5, z: g.block.z + 0.5 });
        const done = generatorsDone(this.generators);
        const total = this.generators.filter((x) => !x.fake).length;
        this.fx.message("all", `§e⚡ Generator repaired (${done}/${total}). §7-${config().match.secondsRemovedPerGenerator}s`);
        this.log(`Generator ${g.id} completed by ${reps.map((r) => r.displayName).join(", ")}`);
        for (const a of this.actors) for (const fn of activeHooks(a, "generatorCompleted", this.now)) fn(a, g, this);
      }
    }
  }

  private onFakeLayer(g: Generator, r: Actor, _layer: number): void {
    // Prankster: each finished puzzle on a fake generator adds a Hallucination stack.
    this.status(r, "hallucination", 1, 20, this.killer, { mode: "add" });
    this.fx.sound("glitch", g.block, { to: [r.id] });
  }

  private onFakeComplete(g: Generator, r: Actor): void {
    this.status(r, "hallucination", 3, 20, this.killer, { mode: "max" });
    this.fx.title([r.id], "§5It was fake.", "§dHallucination III");
    this.log(`${r.displayName} finished a fake generator`);
    r.repairing = null;
    void g;
  }

  private tickLms(): void {
    const r = this.round;
    if (!r.lms) return;
    const c = config().match;
    if (r.lmsRevealIn <= 0) {
      r.lmsRevealIn = ticks(c.lmsRevealEverySeconds);
      const last = this.aliveSurvivors()[0];
      if (last && this.killer && this.killer.alive) {
        this.reveal(last, "killer", c.lmsRevealSeconds, { color: "red", marked: true, source: "lms" });
        this.reveal(this.killer, "survivors", c.lmsRevealSeconds, { color: "red", marked: true, source: "lms" });
      }
    }
    r.lmsRevealIn--;
  }

  checkEnd(): Winner | null {
    const killerAlive = !!this.killer && this.killer.alive;
    const w = evaluate(this.round, {
      aliveSurvivors: this.aliveSurvivors().length,
      killerAlive,
      timerBlocked: !!this.killer && this.killer.flags.has("bloodHunt") && !this.round.lms,
    });
    if (w) {
      this.phase = "ENDED";
      this.log(`Round over: ${w} (${this.round.endReason})`);
    }
    return w;
  }

  /** Forced end (e.g. /scriptevent forsaken:stop). */
  abort(): void {
    this.phase = "ENDED";
    this.round.ended = true;
    this.round.winner = this.round.winner ?? "nobody";
    this.round.endReason = this.round.endReason || "Match aborted.";
  }

  results(): ResultRow[] {
    return this.actors
      .filter((a) => !a.isMinion)
      .map((a) => ({
        id: a.id,
        name: a.displayName,
        character: a.character.name,
        team: a.team,
        isBot: a.isBot,
        alive: a.alive,
        layers: a.stats.layersRepaired,
        generators: a.stats.generatorsCompleted,
        damageDealt: Math.round(a.stats.damageDealt),
        damageTaken: Math.round(a.stats.damageTaken),
        kills: a.stats.kills,
        stuns: a.stats.stunsLanded,
        healing: Math.round(a.stats.healingDone),
      }));
  }

  /** Point at distance `d` (blocks) in front of `a`, clamped to walkable space. */
  pointInFront(a: Actor, d: number): Vec3 {
    const f = flat(a.facing);
    let p = add(a.pos, scale(f, d));
    for (let k = d; k > 0; k -= 0.5) {
      const q = add(a.pos, scale(f, k));
      if (this.grid.walkable(Math.floor(q.x - this.grid.originX), Math.floor(q.z - this.grid.originZ))) {
        p = q;
        break;
      }
    }
    return p;
  }

  /** Normalized direction from a to b (horizontal). */
  dirTo(a: Vec3, b: Vec3): Vec3 {
    return flat(sub(b, a));
  }

  distance(a: Actor, b: Actor): number {
    return dist2D(a.pos, b.pos);
  }

  distance3(a: Vec3, b: Vec3): number {
    return dist(a, b);
  }

  unit(v: Vec3): Vec3 {
    return norm(v);
  }
}
