// Building blocks shared by character kits.
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { AbilityCtx } from "../engine";
import { inArc, inBox, inSphere, eye } from "../hit";
import { blocksPerSecond, meleeReach, perTick, studs, ticks } from "../../core/scale";
import { add, dist2D, flat, scale, sub, type Vec3 } from "../../util/vec";

export interface MeleeOptions {
  rangeStuds: number;
  halfAngle: number;
  /** Hit only the best target (hit priority, then distance) instead of everyone in the arc. */
  single?: boolean;
  /** Include enemy minions (clones, zombies...) — default true. */
  minions?: boolean;
}

/** Enemies inside a melee arc in front of `a`, best first (hit priority, then distance). */
export function meleeTargets(game: Game, a: Actor, o: MeleeOptions): Actor[] {
  const reach = meleeReach(o.rangeStuds);
  const list = game.enemiesOf(a, o.minions ?? true).filter((t) => inArc(a, t, reach, o.halfAngle) && game.lineOfSight(eye(a), eye(t)));
  list.sort((x, y) => y.hitPriority - x.hitPriority || dist2D(a.pos, x.pos) - dist2D(a.pos, y.pos));
  return o.single ? list.slice(0, 1) : list;
}

export interface SwingOptions extends MeleeOptions {
  windup: number;
  abilityId: string;
  /** Called once per target hit. */
  onHit: (target: Actor) => void;
  onMiss?: () => void;
  /** Called after the windup whether or not something was hit. */
  after?: (hits: Actor[]) => void;
  /** Lunge forward when the swing starts (studs over seconds). */
  lunge?: { studs: number; seconds: number };
  /** Damage dealt to traps/buildings/graffiti in the arc (killer swings). */
  objectDamage?: number;
  moveMul?: number;
}

/** Windup → arc check → onHit per target. Used by every basic attack and many swings. */
export function swing(ctx: AbilityCtx, o: SwingOptions): void {
  const { game, actor } = ctx;
  game.fx.sound("swing", actor.pos);
  if (o.lunge) game.lunge(actor, o.lunge.studs, o.lunge.seconds);
  const resolve = () => {
    const hits = meleeTargets(game, actor, o);
    if (o.objectDamage) game.damageObjectsInArc(actor, meleeReach(o.rangeStuds), o.halfAngle, o.objectDamage);
    if (hits.length === 0) o.onMiss?.();
    for (const t of hits) o.onHit(t);
    o.after?.(hits);
    game.fx.particle("hitSpark", add(actor.pos, add(scale(flat(actor.facing), 1.2), { x: 0, y: 1.2, z: 0 })));
  };
  if (o.windup <= 0.05) resolve();
  else game.windup(actor, o.windup, resolve, { abilityId: o.abilityId, label: ctx.def.name, moveMul: o.moveMul });
}

/** Standard killer basic attack: damage of kind "basic" to everyone (or one) in the arc. */
export function basicAttack(ctx: AbilityCtx, damage: number, extra?: (t: Actor) => void, single = false): void {
  swing(ctx, {
    windup: ctx.opt("windup", 0.2),
    rangeStuds: ctx.n("rangeStuds"),
    halfAngle: ctx.opt("halfAngle", 40),
    abilityId: ctx.def.id,
    single,
    objectDamage: damage,
    onHit: (t) => {
      const ev = ctx.game.damage(t, damage, ctx.actor, { kind: "basic", abilityId: ctx.def.id, tags: ["melee"] });
      if (!ev.cancelled && extra) extra(t);
    },
  });
}

/** The enemy closest to the actor's crosshair within range (for aimed abilities); null if none. */
export function aimedEnemy(game: Game, a: Actor, rangeBlocks: number, halfAngle = 25, requireLos = true, includeMinions = false): Actor | null {
  let best: Actor | null = null;
  let bestScore = Infinity;
  const f = flat(a.facing);
  for (const t of game.enemiesOf(a, includeMinions)) {
    const d = dist2D(a.pos, t.pos);
    if (d > rangeBlocks) continue;
    const dir = flat(sub(t.pos, a.pos));
    const cos = f.x * dir.x + f.z * dir.z;
    const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (ang > halfAngle && d > 1.5) continue;
    if (requireLos && !game.lineOfSight(eye(a), eye(t))) continue;
    const score = ang * 2 + d;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Same for allies (Dusekkar's Spawn Protection, Elliot's pizza aim). */
export function aimedAlly(game: Game, a: Actor, rangeBlocks: number, halfAngle = 25, requireLos = false): Actor | null {
  let best: Actor | null = null;
  let bestScore = Infinity;
  const f = flat(a.facing);
  for (const t of game.alliesOf(a)) {
    const d = dist2D(a.pos, t.pos);
    if (d > rangeBlocks) continue;
    const dir = flat(sub(t.pos, a.pos));
    const ang = (Math.acos(Math.max(-1, Math.min(1, f.x * dir.x + f.z * dir.z))) * 180) / Math.PI;
    if (ang > halfAngle) continue;
    if (requireLos && !game.lineOfSight(eye(a), eye(t))) continue;
    const score = ang * 2 + d;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Pushes `target` away from `from` by about `blocks` (horizontal) plus a small hop. */
export function knockback(target: Actor, from: Vec3, blocks: number, up = 0.25): void {
  const dir = flat(sub(target.pos, from));
  const d = dir.x === 0 && dir.z === 0 ? flat(target.facing) : dir;
  target.body.impulse({ x: d.x * blocks * 0.45, y: up, z: d.z * blocks * 0.45 });
}

/** Pulls `target` toward `to` by about `blocks`. */
export function pull(target: Actor, to: Vec3, blocks: number): void {
  const d = flat(sub(to, target.pos));
  target.body.impulse({ x: d.x * blocks * 0.45, y: 0.15, z: d.z * blocks * 0.45 });
}

/** Enemies inside a sphere (blocks). */
export function enemiesInRadius(game: Game, a: Actor, center: Vec3, radiusBlocks: number, includeMinions = true): Actor[] {
  return game.enemiesOf(a, includeMinions).filter((t) => inSphere(center, radiusBlocks, t));
}

/** Enemies inside a box in front of `a`. */
export function enemiesInBox(game: Game, a: Actor, lengthBlocks: number, halfWidthBlocks: number): Actor[] {
  return game.enemiesOf(a).filter((t) => inBox(a.pos, a.facing, lengthBlocks, halfWidthBlocks, t));
}

/** Teleports an actor to the nearest walkable cell around `pos`. */
export function teleportSafe(game: Game, a: Actor, pos: Vec3, facing?: Vec3): Vec3 {
  const g = game.grid.toGrid(pos);
  const w = game.grid.nearestWalkable(g, 6) ?? g;
  const p = game.grid.toWorld(w);
  a.body.teleport(p, facing);
  a.state = { ...a.state, pos: p };
  return p;
}

/** Re-applies a numeric resource with clamping. */
export function addRes(a: Actor, key: string, amount: number, max = Infinity, min = 0): number {
  const v = Math.max(min, Math.min(max, (a.res[key] ?? 0) + amount));
  a.res[key] = v;
  return v;
}

/** Plays the ability-cast sound and a particle burst at the actor. */
export function castFx(game: Game, a: Actor, particle = "spark"): void {
  game.fx.sound("abilityCast", a.pos);
  game.fx.particle(particle, add(a.pos, { x: 0, y: 1, z: 0 }));
}

/** Blocks → studs helpers re-exported for kits. */
export { studs, ticks, meleeReach };

/** Floor-level point in front of an actor clamped to the arena (for placing traps/buildings). */
export function placeInFront(game: Game, a: Actor, blocks: number): Vec3 {
  return game.pointInFront(a, blocks);
}

/** Is any killer-team actor (not minion) within `blocks` of `p`? */
export function killerNear(game: Game, p: Vec3, blocks: number): Actor | null {
  const k = game.killer;
  return k && k.alive && dist2D(k.pos, p) <= blocks ? k : null;
}

/** Ends a temporary flag+hook bundle registered under `owner`. */
export function clearOwned(a: Actor, owner: string, flags: string[] = []): void {
  a.removeHooks(owner);
  a.removeMoveMod(owner);
  for (const f of flags) a.flags.delete(f);
}

/** Simple "is the target facing away from me" helper for backstabs (target's back toward attacker). */
export function facingAway(attacker: Actor, target: Actor, rearHalfAngle = 70): boolean {
  const toAttacker = flat(sub(attacker.pos, target.pos));
  const f = flat(target.facing);
  return f.x * toAttacker.x + f.z * toAttacker.z <= -Math.cos((rearHalfAngle * Math.PI) / 180);
}

/** Converts studs/s to blocks per tick for projectiles (speed scale, brief §3.10). */
export function projSpeed(studsPerSecond: number): number {
  return perTick(blocksPerSecond(studsPerSecond));
}

/** Distance in blocks from a stud value (distance scale). */
export function blocks(studValue: number): number {
  return studs(studValue);
}

/** Point `d` blocks along facing at eye height. */
export function eyeFront(a: Actor, d: number): Vec3 {
  return add(eye(a), scale(flat(a.facing), d));
}

export function secondsToTicks(s: number): number {
  return ticks(s);
}
