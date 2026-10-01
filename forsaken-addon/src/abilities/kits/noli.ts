// Noli (wiki, 2026-10-01): Hallucinations, Prankster, Stab, Void Rush, Nova, Observant.
// Prankster's fake generators are created by the match setup (Game.setupGenerators fakeIdx) and Game grants
// Hallucination for fake puzzles; this kit turns Hallucination levels into Noli's aura reads, fake pizzas and mirages.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { Rgb } from "../../core/fx";
import type { Generator } from "../../world/generators";
import { spawnProjectile, type WorldObject } from "../objects";
import { basicAttack, blocks, enemiesInRadius, knockback, projSpeed, pull, teleportSafe } from "./common";
import { character } from "../../characters/roster";
import { meleeReach, ticks } from "../../core/scale";
import { add, angleBetween2D, dist2D, flat, rotateY, scale, sub, type Vec3 } from "../../util/vec";

type P = Record<string, number>;

function passiveParams(a: Actor, id: string): P {
  return a.character.passives.find((p) => p.id === id)!.params as P;
}

function abilityParams(a: Actor, id: string): P {
  return a.ability(id)!.params as P;
}

// ============================================================================ Hallucinations

/** Aura shades for Noli: darker purple at higher levels (wiki). */
const HALLUCINATION_SHADES: Record<number, Rgb> = { 1: [0.85, 0.6, 1], 2: [0.7, 0.3, 1], 3: [0.45, 0.1, 0.75] };

type HallucinationState = {
  /** victim id -> mirage minion */
  mirages: Map<string, Actor>;
  /** victim id -> fake pizza object */
  pizzas: Map<string, WorldObject>;
  /** victim id -> earliest tick for the next fake pizza */
  nextPizza: Map<string, number>;
  /** victim id -> level seen last tick (to detect the end of a hallucination) */
  prevLevel: Map<string, number>;
};

function hState(noli: Actor): HallucinationState {
  const d = noli.data<{ st?: HallucinationState }>("hallucinations");
  if (!d.st) d.st = { mirages: new Map(), pizzas: new Map(), nextPizza: new Map(), prevLevel: new Map() };
  return d.st;
}

/** Fake damage (positive) / fake heals (negative) shown on the victim's HUD; never below 0 or above max HP. */
function clampFake(s: Actor): void {
  const f = s.res.fakeDamage ?? 0;
  s.res.fakeDamage = Math.max(s.hp - s.maxHp, Math.min(s.hp, f));
}

/** Removes every Hallucination stack: Stab, Void Rush slam, a broken mirage. Fakes are reverted. */
export function clearHallucination(game: Game, s: Actor): void {
  game.removeStatus(s, "hallucination");
  s.res.fakeDamage = 0;
}

/** The mirage was hit by a survivor: it vanishes and the victim's Hallucination ends. */
function breakMirage(game: Game, mirage: Actor, victim: Actor): void {
  game.fx.particle("void", add(mirage.pos, { x: 0, y: 1, z: 0 }));
  if (victim.alive) clearHallucination(game, victim);
}

function spawnMirage(game: Game, noli: Actor, victim: Actor, p: P): Actor {
  const back = flat(victim.facing);
  const want = sub(victim.pos, scale(back.x === 0 && back.z === 0 ? { x: 0, y: 0, z: 1 } : back, blocks(p.mirageSpawnStuds)));
  const cell = game.grid.nearestWalkable(game.grid.toGrid(want), 8) ?? game.grid.toGrid(victim.pos);
  const pos = game.grid.toWorld(cell);
  const m = game.spawnMinion({ owner: noli, character: character("minion_mirage"), pos, name: "Noli", hp: 1, flags: ["silent", "mirage", "hittableMinion"] });
  m.addMoveMod({ id: "mirage_speed", endTick: Infinity, walkStuds: p.mirageSpeedStuds, sprintStuds: p.mirageSpeedStuds });
  m.data("mirage").victimId = victim.id;
  // Mirages die to any survivor attack, which also ends the victim's Hallucination.
  m.addHooks("mirage", {
    afterTakeDamage(self, ev, g) {
      if (ev.source && ev.source.team !== self.team) breakMirage(g, self, victim);
    },
    afterStunned(self, _secs, src, g) {
      if (src && src.team !== self.team) {
        breakMirage(g, self, victim);
        g.kill(self, null);
      }
    },
  });
  game.fx.particle("void", add(pos, { x: 0, y: 1, z: 0 }), { to: [victim.id] });
  game.fx.sound("glitch", pos, { to: [victim.id] });
  game.log(`A Noli mirage hunts ${victim.displayName}`);
  return m;
}

/** A mirage swing: the victim's HUD loses HP, nothing real happens (no damage, no interrupt, no on-hit speed). */
function fakeHit(game: Game, victim: Actor, p: P): void {
  victim.res.fakeDamage = (victim.res.fakeDamage ?? 0) + p.mirageDamage;
  clampFake(victim);
  victim.statuses.extend("hallucination", ticks(p.mirageHitExtendSeconds));
  game.fx.sound("hit", victim.pos, { to: [victim.id] });
  game.fx.particle("hitSpark", add(victim.pos, { x: 0, y: 1.2, z: 0 }), { to: [victim.id] });
  game.fx.shake(victim.id, 0.15, 0.2);
}

function driveMirage(game: Game, noli: Actor, m: Actor, victim: Actor, p: P): void {
  const stab = abilityParams(noli, "stab");
  const reach = meleeReach(stab.rangeStuds);
  const d = dist2D(m.pos, victim.pos);
  m.input.moveDir = d > reach * 0.6 ? game.navDirection(m, victim.pos, 0.8) : null;
  m.input.wantSprint = true;
  m.input.lookAt = add(victim.pos, { x: 0, y: 1.6, z: 0 });
  const md = m.data<{ nextSwing?: number; swinging?: boolean }>("mirage");
  if (md.swinging || game.now < (md.nextSwing ?? 0) || d > reach) return;
  md.swinging = true;
  game.fx.sound("swing", m.pos, { to: [victim.id] });
  game.schedule(m, stab.windup, () => {
    md.swinging = false;
    md.nextSwing = game.now + ticks(p.mirageHitCooldown);
    if (!m.alive || !victim.alive || victim.statuses.level("hallucination") < 3) return;
    if (dist2D(m.pos, victim.pos) > reach + 0.5) return;
    fakeHit(game, victim, p);
  });
}

function spawnFakePizza(game: Game, noli: Actor, victim: Actor, p: P, st: HallucinationState): void {
  const dir = rotateY({ x: 0, y: 0, z: 1 }, game.rng.range(0, 360));
  const want = add(victim.pos, scale(dir, blocks(p.fakePizzaStuds)));
  const cell = game.grid.nearestWalkable(game.grid.toGrid(want), 6);
  if (!cell) return;
  const o = game.spawnObject({
    kind: "fake_pizza",
    owner: noli,
    pos: game.grid.toWorld(cell),
    radius: 1.1,
    lifeSeconds: p.seconds,
    prop: "fake_pizza",
    propName: "§6Pizza",
    data: { victimId: victim.id },
    update(obj, g) {
      if (!victim.alive || victim.statuses.level("hallucination") < 2) {
        g.removeObject(obj, "cleanup");
        return;
      }
      if (g.now % 10 === 0) g.fx.particle("heal", add(obj.pos, { x: 0, y: 0.6, z: 0 }), { to: [victim.id] });
      // Only the hallucinating survivor can "eat" it: a fake heal that is reverted with the other fakes.
      if (dist2D(victim.pos, obj.pos) > obj.radius + 0.4) return;
      victim.res.fakeDamage = (victim.res.fakeDamage ?? 0) - p.fakeHeal;
      clampFake(victim);
      g.fx.sound("eat", victim.pos, { to: [victim.id] });
      g.fx.particle("heal", add(victim.pos, { x: 0, y: 2, z: 0 }), { to: [victim.id] });
      g.removeObject(obj, "consumed");
    },
  });
  st.pizzas.set(victim.id, o);
}

function tickHallucinations(noli: Actor, game: Game): void {
  const p = passiveParams(noli, "hallucinations");
  const st = hState(noli);
  for (const s of game.allSurvivors()) {
    const lvl = s.alive ? s.statuses.level("hallucination") : 0;
    const prev = st.prevLevel.get(s.id) ?? 0;
    st.prevLevel.set(s.id, lvl);
    if (lvl > 0) {
      // Noli always sees hallucinating survivors (darker at higher levels).
      game.reveal(s, [noli.id], 0.3, { color: HALLUCINATION_SHADES[Math.min(3, lvl)], source: `hallucination${Math.min(3, lvl)}` });
      clampFake(s);
    } else {
      if (s.res.fakeDamage) s.res.fakeDamage = 0; // fakes are reverted when Hallucination ends
      if (prev > 0 && s.alive) game.fx.title([s.id], "§5☻", "", 6, 0, 6); // a Noli image flashes on screen
    }
    // Level III: a mirage hunts the survivor.
    const m = st.mirages.get(s.id);
    if (m && (!m.alive || lvl < 3)) {
      if (m.alive) game.despawnMinion(m);
      st.mirages.delete(s.id);
    } else if (m) {
      driveMirage(game, noli, m, s, p);
    } else if (lvl >= 3 && game.phase === "ROUND") {
      st.mirages.set(s.id, spawnMirage(game, noli, s, p));
    }
    // Level II+: fake pizzas appear near the survivor.
    const pz = st.pizzas.get(s.id);
    if (pz && pz.dead) {
      st.pizzas.delete(s.id);
      st.nextPizza.set(s.id, game.now + ticks(p.fakePizzaIntervalSeconds));
    } else if (!pz && lvl >= 2 && game.now >= (st.nextPizza.get(s.id) ?? 0)) {
      spawnFakePizza(game, noli, s, p, st);
    }
  }
}

// ============================================================================ shared ability guards

function busy(ctx: AbilityCtx): true | string {
  const { actor } = ctx;
  if (actor.channel) return "busy";
  const vr = actor.data<VoidRushData>("void_rush");
  if (vr.phase === "prepare" || vr.phase === "rush") return "rushing";
  return true;
}

// ============================================================================ Void Rush

type VoidRushData = {
  active?: boolean;
  phase?: "prepare" | "rush" | "wait";
  /** Slam amplifier: re-rushes plus extra survivors hit by earlier rushes. */
  amp?: number;
  reRushes?: number;
  rushStart?: number;
  waitReady?: number;
  waitEnd?: number;
  endReason?: "hit" | "slam" | "manual";
};

function vrFinish(game: Game, a: Actor, seconds: number): void {
  const d = a.data<VoidRushData>("void_rush");
  d.active = false;
  d.phase = undefined;
  d.amp = 0;
  d.reRushes = 0;
  d.endReason = undefined;
  game.startCooldown(a, "void_rush", seconds);
}

function vrCooldown(a: Actor): number {
  return a.ability("void_rush")!.cooldown ?? 20;
}

function crash(game: Game, a: Actor, p: P): void {
  game.status(a, "slowness", p.crashSlowLevel, p.crashSlowSeconds, a);
  game.fx.sound("hitKiller", a.pos);
  game.fx.particle("smoke", add(a.pos, { x: 0, y: 1, z: 0 }));
}

function startRush(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = actor.data<VoidRushData>("void_rush");
  d.phase = "rush";
  d.endReason = undefined;
  d.rushStart = game.now;
  game.fx.sound("shriek", actor.pos);
  game.dash(actor, {
    id: "void_rush",
    studsPerSecond: ctx.n("rushStudsPerSecond"),
    seconds: ctx.n("rushSeconds"),
    // Heavily increased turn rate during the first 1.12 s (wiki tip: 6x).
    turnRate: ctx.n("turnRateDegPerTick") * ctx.n("earlyTurnMul"),
    noStaminaRegen: true,
    onTick: () => rushTick(ctx),
    onEnd: (reason) => rushEnd(ctx, reason),
  });
}

function rushTick(ctx: AbilityCtx): boolean | void {
  const { game, actor } = ctx;
  const d = actor.data<VoidRushData>("void_rush");
  const fm = actor.forced;
  if (!fm) return;
  if (game.now - (d.rushStart ?? game.now) >= ticks(ctx.n("earlyTurnSeconds"))) fm.turnRate = ctx.n("turnRateDegPerTick");
  if (game.now % 2 === 0) game.fx.particle("void", add(actor.pos, { x: 0, y: 1, z: 0 }));
  const center = add(actor.pos, { x: fm.dir.x * 0.6, y: 1, z: fm.dir.z * 0.6 });
  const touched = enemiesInRadius(game, actor, center, blocks(ctx.n("hitRadiusStuds"))).filter((t) => !fm.hit.has(t.id));
  if (touched.length === 0) return;
  const rest: Actor[] = [];
  for (const t of touched) {
    fm.hit.add(t.id);
    if (t.hp <= ctx.n("executeHp")) {
      // Survivors at 10 HP or less are killed outright and Noli keeps rushing.
      game.damage(t, t.hp + t.shieldTotal(), actor, { kind: "ability", abilityId: "void_rush", tags: ["melee"], ignoreResistance: true });
      continue;
    }
    rest.push(t);
  }
  if (rest.length === 0) return;
  rest.sort((x, y) => dist2D(actor.pos, x.pos) - dist2D(actor.pos, y.pos));
  if (rest.some((t) => t.statuses.level("hallucination") >= 2)) {
    // Slam: 10 + 30 + 3.5 per re-rush / extra target; ends the move and clears Hallucination.
    const dmg = ctx.n("slamBase") + ctx.n("slamDamage") + ctx.n("slamPerReRush") * (d.amp ?? 0);
    for (const t of rest) {
      const ev = game.damage(t, dmg, actor, { kind: "ability", abilityId: "void_rush", tags: ["melee"] });
      if (!ev.cancelled && t.alive) {
        clearHallucination(game, t);
        knockback(t, actor.pos, 1, 0.1);
      }
    }
    game.fx.sound("explosion", actor.pos);
    game.fx.particle("void", add(actor.pos, { x: 0, y: 0.3, z: 0 }));
    d.endReason = "slam";
    return false;
  }
  // First hit: 10 damage to everyone in the hitbox, Hallucination II to the closest, then the re-rush window.
  const pp = passiveParams(actor, "hallucinations");
  let closestDone = false;
  for (const t of rest) {
    const ev = game.damage(t, ctx.n("hitDamage"), actor, { kind: "ability", abilityId: "void_rush", tags: ["melee"] });
    if (!ev.cancelled && !closestDone && !t.isMinion && t.alive) {
      game.status(t, "hallucination", ctx.n("hallucinationLevel"), pp.seconds, actor, { mode: "max" });
      closestDone = true;
    }
  }
  d.amp = (d.amp ?? 0) + rest.length - 1;
  d.phase = "wait";
  d.waitReady = game.now + ticks(ctx.n("reRushDelay"));
  d.waitEnd = game.now + ticks(ctx.n("reRushWindow"));
  d.endReason = "hit";
  return false;
}

function rushEnd(ctx: AbilityCtx, reason: "time" | "wall" | "stun" | "cancel"): void {
  const { game, actor } = ctx;
  const d = actor.data<VoidRushData>("void_rush");
  if (reason === "cancel" && d.endReason === "hit") return; // waiting for a re-rush
  const p = actor.ability("void_rush")!.params as P;
  if (reason === "wall" || (reason === "cancel" && d.endReason === "manual")) crash(game, actor, p);
  vrFinish(game, actor, vrCooldown(actor));
}

// ============================================================================ Nova

type NovaData = { active?: boolean; pending?: boolean; orb?: WorldObject | null };

function implode(ctx: AbilityCtx, center: Vec3, radiusBlocks: number): void {
  const { game, actor } = ctx;
  const d = actor.data<NovaData>("nova");
  if (!d.active) return;
  d.active = false;
  d.orb = null;
  game.fx.sound("explosion", center);
  game.fx.particle("void", center);
  game.fx.ring("void", center, radiusBlocks, 24);
  for (const t of enemiesInRadius(game, actor, center, radiusBlocks)) {
    const dist = dist2D(t.pos, center);
    const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "nova", tags: ["aoe"] });
    if (ev.cancelled || !t.alive || t.isMinion) continue;
    pull(t, center, Math.min(ctx.n("pullBlocks"), dist));
    // The slow decays the further the survivor was from the implosion.
    const lvl = Math.max(1, Math.round(ctx.n("slowLevel") * (1 - dist / radiusBlocks)));
    game.status(t, "slowness", lvl, ctx.n("slowSeconds"), actor);
  }
  // Cooldown starts only after detonation.
  game.startCooldown(actor, "nova", ctx.def.cooldown ?? 12);
}

function throwNova(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = actor.data<NovaData>("nova");
  const f = flat(actor.facing);
  const big = blocks(ctx.n("radiusStuds"));
  const small = blocks(ctx.n("smallRadiusStuds"));
  d.active = true;
  game.fx.sound("projectile", actor.pos);
  d.orb = spawnProjectile(game, {
    owner: actor,
    kind: "nova",
    pos: { x: actor.pos.x + f.x * 0.8, y: actor.pos.y + 1.3, z: actor.pos.z + f.z * 0.8 },
    vel: scale(f, projSpeed(ctx.n("projectileStudsPerSecond"))),
    radius: 0.45,
    lifeSeconds: ctx.n("lifeSeconds"),
    hit: "enemies",
    prop: "nova",
    particle: "void",
    onHitActor: (o) => {
      implode(ctx, o.pos, big);
      return true;
    },
    onHitWall: (_o, at, _g, surface) => implode(ctx, at, surface === "floor" ? small : big),
    onExpire: (o) => implode(ctx, o.pos, small),
  });
}

// ============================================================================ Observant

type ObservantData = { active?: boolean; genId?: string };

function genCenter(game: Game, g: Generator): Vec3 {
  return { x: g.block.x + 0.5, y: game.grid.originY, z: g.block.z + 0.5 };
}

/** The generator (real or fake) closest to the view direction that is at least `minBlocks` away. */
export function observantTarget(game: Game, a: Actor, minBlocks: number): Generator | null {
  const f = flat(a.facing);
  let best: Generator | null = null;
  let bestAng = Infinity;
  for (const g of game.generators) {
    const c = genCenter(game, g);
    if (dist2D(a.pos, c) < minBlocks) continue;
    const ang = Math.abs(angleBetween2D(f, flat(sub(c, a.pos))));
    if (ang < bestAng) {
      bestAng = ang;
      best = g;
    }
  }
  return best;
}

/** Hallucination level from the distance (blocks) to Observant's arrival point. */
export function observantLevel(distBlocks: number, p: P): number {
  if (distBlocks <= blocks(p.safeStuds)) return 0;
  if (distBlocks > blocks(p.level3Studs)) return 3;
  if (distBlocks > blocks(p.level2Studs)) return 2;
  if (distBlocks > blocks(p.level1Studs)) return 1;
  return 0;
}

function observantArrive(ctx: AbilityCtx, gen: Generator): void {
  const { game, actor } = ctx;
  const d = actor.data<ObservantData>("observant");
  d.active = false;
  const c = genCenter(game, gen);
  const away = flat(sub(actor.pos, c));
  const side = away.x === 0 && away.z === 0 ? { x: 1, y: 0, z: 0 } : away;
  const want = add(c, scale(side, 1.5));
  game.fx.sound("teleport", actor.pos);
  game.fx.particle("void", add(actor.pos, { x: 0, y: 1, z: 0 }));
  const arrived = teleportSafe(game, actor, want, flat(sub(c, want)));
  game.clearNav(actor);
  game.fx.sound("teleport", arrived);
  game.fx.particle("void", add(arrived, { x: 0, y: 1, z: 0 }));
  const pp = passiveParams(actor, "hallucinations");
  const p = ctx.def.params as P;
  for (const s of game.aliveSurvivors()) {
    const lvl = observantLevel(dist2D(s.pos, arrived), p);
    if (lvl > 0) game.status(s, "hallucination", lvl, pp.seconds, actor, { mode: "max" });
  }
  game.status(actor, "stun_immune", 1, ctx.n("stunImmuneSeconds"), actor);
  game.startCooldown(actor, "observant", ctx.def.cooldown ?? 30);
}

// ============================================================================ kit

export const noliKit: Kit = {
  id: "noli",
  init(a) {
    hState(a);
  },
  tick(a, game) {
    tickHallucinations(a, game);
    const vr = a.data<VoidRushData>("void_rush");
    if (vr.phase === "wait" && game.now >= (vr.waitEnd ?? 0)) vrFinish(game, a, vrCooldown(a));
  },
  abilities: {
    stab: {
      can: busy,
      use(ctx) {
        // Removes all Hallucination stacks from the target.
        basicAttack(ctx, ctx.n("damage"), (t) => {
          if (t.alive) clearHallucination(ctx.game, t);
        });
      },
    },
    void_rush: {
      can: busy,
      hud(ctx) {
        const d = ctx.data as VoidRushData;
        if (d.phase === "wait") return ctx.game.now >= (d.waitReady ?? 0) ? "§dRE-RUSH" : "§7re-rush...";
        if (d.phase === "prepare") return "§7preparing";
        return null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as VoidRushData;
        d.active = true;
        d.phase = "prepare";
        d.amp = 0;
        d.reRushes = 0;
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("prepareSeconds"), () => startRush(ctx), {
          abilityId: "void_rush",
          label: "Void Rush",
          moveMul: ctx.n("prepareMoveMul"),
          onCancel: () => {
            if (d.phase === "prepare") vrFinish(game, actor, ctx.n("cancelCooldown"));
          },
        });
        return { noCooldown: true };
      },
      release(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as VoidRushData;
        if (d.phase === "prepare") {
          // Cancelling the windup: 1.2 s cooldown.
          if (actor.channel?.abilityId === "void_rush") game.interrupt(actor, "manual");
          else vrFinish(game, actor, ctx.n("cancelCooldown"));
        } else if (d.phase === "rush") {
          d.endReason = "manual";
          game.endForced(actor, "cancel");
        } else if (d.phase === "wait") {
          if (game.now < (d.waitReady ?? 0)) return;
          d.reRushes = (d.reRushes ?? 0) + 1;
          d.amp = (d.amp ?? 0) + 1;
          startRush(ctx);
        } else {
          d.active = false;
        }
      },
    },
    nova: {
      can(ctx) {
        if ((ctx.data as NovaData).pending) return "busy";
        return busy(ctx);
      },
      hud(ctx) {
        return (ctx.data as NovaData).active ? "§dDETONATE" : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as NovaData;
        d.pending = true;
        // 0.9 s cooldown upon usage; the full cooldown starts when it implodes.
        game.startCooldown(actor, "nova", ctx.n("usageCooldown"));
        game.fx.sound("windup", actor.pos);
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            d.pending = false;
            throwNova(ctx);
          },
          {
            abilityId: "nova",
            label: "Nova",
            onCancel: () => {
              // Stunned during the windup: no throw, short cooldown.
              d.pending = false;
              game.startCooldown(actor, "nova", ctx.n("stunCancelCooldown"));
            },
          },
        );
        return { noCooldown: true };
      },
      release(ctx) {
        const { game } = ctx;
        const d = ctx.data as NovaData;
        const o = d.orb;
        if (!o || o.dead) {
          d.active = false;
          return;
        }
        // Manual detonation: smaller implosion where the Voidstar is.
        implode(ctx, o.pos, blocks(ctx.n("smallRadiusStuds")));
        game.removeObject(o, "consumed");
      },
    },
    observant: {
      can: busy,
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as ObservantData;
        const gen = observantTarget(game, actor, blocks(ctx.n("minDistanceStuds")));
        if (!gen) {
          game.fx.flash([actor.id], "§7No generator far enough away");
          return false;
        }
        d.active = true;
        d.genId = gen.id;
        // Stance: all generators highlighted for Noli, a warning mirage above the chosen one.
        for (const g of game.generators) game.fx.particle("void", add(genCenter(game, g), { x: 0, y: 2, z: 0 }), { to: [actor.id] });
        const c = genCenter(game, gen);
        game.fx.particle("void", add(c, { x: 0, y: 3, z: 0 }));
        game.fx.sound("glitch", c);
        game.windup(actor, ctx.n("windup"), () => observantArrive(ctx, gen), {
          abilityId: "observant",
          label: "Observant",
          frozen: true,
          onCancel: () => {
            d.active = false;
            game.startCooldown(actor, "observant", ctx.n("cancelCooldown"));
          },
        });
        return { noCooldown: true };
      },
      release(ctx) {
        // Recast during selection to cancel (15 s cooldown).
        const { game, actor } = ctx;
        const d = ctx.data as ObservantData;
        if (actor.channel?.abilityId === "observant") game.interrupt(actor, "manual");
        else {
          d.active = false;
          game.startCooldown(actor, "observant", ctx.n("cancelCooldown"));
        }
      },
    },
  },
};
