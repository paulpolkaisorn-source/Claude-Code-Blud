// Builderman (wiki, 2026-10-01): Sentry, Dispenser, Carry / Place. No passive.
import type { AbilityHandler, Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { WorldObject } from "../objects";
import { blocks } from "./common";
import { sweepHits } from "../hit";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, scale, type Vec3 } from "../../util/vec";

export type BuildingKind = "sentry" | "dispenser";

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

/**
 * Floor point up to `distBlocks` in front of `a` that is reachable in a straight line: stops before the first
 * wall / blocked cell instead of jumping over it (used for buildings and Taph's traps).
 */
export function frontPoint(game: Game, a: Actor, distBlocks: number): Vec3 {
  const f = flat(a.facing);
  const g = game.grid;
  let last: Vec3 = { ...a.pos };
  const steps = Math.max(1, Math.ceil(distBlocks / 0.25));
  for (let i = 1; i <= steps; i++) {
    const q = add(a.pos, scale(f, (distBlocks * i) / steps));
    if (!g.walkable(Math.floor(q.x - g.originX), Math.floor(q.z - g.originZ))) break;
    last = q;
  }
  return { x: last.x, y: a.pos.y, z: last.z };
}

/** Every placed building of every Builderman (carried ones excluded). */
export function placedBuildings(game: Game): WorldObject[] {
  return game.objects.filter((o) => !o.dead && (o.kind === "sentry" || o.kind === "dispenser") && !o.data.carried);
}

/** A building works when it is placed and its build / reactivation delay has passed. */
export function buildingActive(o: WorldObject, game: Game): boolean {
  return !o.dead && !o.data.carried && game.now >= ((o.data.activeAt as number) ?? 0);
}

/** Why a building of `kind` cannot go at `pos` (null = OK). No other building within 125 / 60 studs of a Sentry / Dispenser. */
export function placementProblem(game: Game, a: Actor, kind: BuildingKind, pos: Vec3, ignore: readonly WorldObject[] = []): string | null {
  if (dist2D(pos, a.pos) < 0.9) return "no room in front";
  const own = params(a, kind).spacingStuds;
  for (const b of placedBuildings(game)) {
    if (ignore.includes(b)) continue;
    const need = Math.max(own, (b.data.spacingStuds as number) ?? 0);
    if (dist2D(b.pos, pos) < blocks(need)) return `too close to a ${b.kind === "sentry" ? "Sentry" : "Dispenser"} (${need} studs)`;
  }
  return null;
}

function carriedBuilding(game: Game, a: Actor): WorldObject | null {
  const id = a.data<{ objectId?: string }>("carry").objectId;
  return game.objects.find((o) => o.id === id && !o.dead) ?? null;
}

function endCarry(a: Actor): void {
  const d = a.data<{ active?: boolean; objectId?: string }>("carry");
  d.active = false;
  d.objectId = undefined;
  a.removeMoveMod("carry");
}

function setBlockCell(game: Game, o: WorldObject, pos: Vec3 | null): void {
  for (const c of o.blockCells) game.grid.removeDynamic(c.x, c.z);
  o.blockCells = pos ? [game.grid.toGrid(pos)] : [];
  for (const c of o.blockCells) game.grid.addDynamic(c.x, c.z);
}

// ------------------------------------------------------------------------------------------ behaviour

function sentryUpdate(o: WorldObject, game: Game): void {
  const owner = o.owner!;
  if (o.data.carried) {
    o.pos = add(owner.pos, { x: 0, y: 2, z: 0 });
    o.prop?.move(o.pos);
    return;
  }
  if (!buildingActive(o, game) || game.now < (o.data.nextFire as number)) return;
  const p = params(owner, "sentry");
  const k = game.killer;
  if (!k || !k.alive) return;
  // Range shrinks 16 % per other active Sentry (minimum 8 studs).
  const others = placedBuildings(game).filter((b) => b !== o && b.kind === "sentry" && buildingActive(b, game)).length;
  const rangeStuds = Math.max(p.minRangeStuds, p.rangeStuds * (1 - p.rangeDecayPerSentry * others));
  if (dist2D(o.pos, k.pos) > blocks(rangeStuds)) return;
  const muzzle = add(o.pos, { x: 0, y: 1, z: 0 });
  const aim = add(k.pos, { x: 0, y: 1.2, z: 0 });
  if (!game.lineOfSight(muzzle, aim)) return;
  o.data.nextFire = game.now + ticks(p.fireInterval);
  game.fx.sound("zap", o.pos, { volume: 0.35, pitch: 2 });
  // Survivors standing in the line of fire block the shot.
  const blocker = game.actors
    .filter((s) => s.alive && s.team === "survivor" && sweepHits(muzzle, aim, 0.05, s))
    .sort((x, y) => dist2D(x.pos, o.pos) - dist2D(y.pos, o.pos))[0];
  if (blocker) {
    game.fx.line("trail", muzzle, add(blocker.pos, { x: 0, y: 1.2, z: 0 }), 0.5);
    return;
  }
  game.fx.line("trail", muzzle, aim, 0.5);
  // Sentry shots ignore invincibility (they still affect ENRAGED Slasher).
  const bypass = { data: { bypassInvincible: 1 } };
  game.status(k, "slowness", p.slowLevel, p.slowSeconds, owner, bypass);
  game.status(k, "bleeding", p.bleedLevel, p.bleedSeconds, owner, { mode: "max", ...bypass });
  game.damage(k, p.damage, owner, { kind: "ability", abilityId: "sentry", tags: ["sentry"], bypassInvincible: true });
}

function dispenserUpdate(o: WorldObject, game: Game): void {
  const owner = o.owner!;
  if (o.data.carried) {
    o.pos = add(owner.pos, { x: 0, y: 2, z: 0 });
    o.prop?.move(o.pos);
    return;
  }
  if (!buildingActive(o, game) || game.now % 10 !== 0) return;
  const p = params(owner, "dispenser");
  // Heal rate drops 8 % per other active Dispenser (minimum 0.3 HP/s).
  const others = placedBuildings(game).filter((b) => b !== o && b.kind === "dispenser" && buildingActive(b, game)).length;
  const rate = Math.max(p.minHealPerSecond, p.healPerSecond * (1 - p.decayPerDispenser * others));
  const r = blocks(p.radiusStuds);
  for (const s of game.aliveSurvivors()) {
    if (s.statuses.has("undetectable") || s.hp >= s.maxHp || dist2D(s.pos, o.pos) > r) continue;
    game.heal(s, rate / 2, owner);
  }
  if (game.now % 40 === 0) game.fx.ring("heal", add(o.pos, { x: 0, y: 0.2, z: 0 }), r, 12);
}

function spawnBuilding(game: Game, owner: Actor, kind: BuildingKind, pos: Vec3): WorldObject {
  const p = params(owner, kind);
  return game.spawnObject({
    kind,
    owner,
    pos,
    radius: 0.6,
    hp: p.hp,
    prop: kind,
    propName: kind === "sentry" ? "§eSentry" : "§aDispenser",
    targetableBy: "killer",
    blockCells: [game.grid.toGrid(pos)],
    data: { spacingStuds: p.spacingStuds, activeAt: game.now, nextFire: game.now, carried: 0 },
    update: kind === "sentry" ? sentryUpdate : dispenserUpdate,
    onDamaged(o, g) {
      g.fx.particle("hitSpark", add(o.pos, { x: 0, y: 0.8, z: 0 }));
    },
    onRemove(o, g, reason) {
      if (o.data.carried && o.owner) endCarry(o.owner);
      if (reason === "destroyed") {
        g.fx.sound("explosion", o.pos, { volume: 0.6 });
        g.fx.particle("smoke", add(o.pos, { x: 0, y: 0.6, z: 0 }));
        if (o.owner) g.fx.flash([o.owner.id], `§cYour ${kind === "sentry" ? "Sentry" : "Dispenser"} was destroyed`);
      }
    },
  });
}

function buildAbility(kind: BuildingKind): AbilityHandler {
  return {
    can(ctx) {
      const { game, actor } = ctx;
      if (actor.data<{ active?: boolean }>("carry").active) return "carrying a building";
      if (actor.channel?.abilityId === kind) return "building";
      const pos = frontPoint(game, actor, blocks(ctx.n("placeStuds")));
      return placementProblem(game, actor, kind, pos, game.objectsOf(kind, actor)) ?? true;
    },
    hud(ctx) {
      return ctx.game.objectsOf(kind, ctx.actor).length ? "§a●" : null;
    },
    use(ctx) {
      const { game, actor } = ctx;
      const pos = frontPoint(game, actor, blocks(ctx.n("placeStuds")));
      game.fx.sound("build", actor.pos);
      game.windup(
        actor,
        ctx.n("buildSeconds"),
        () => {
          // One of each per Builderman: the new one replaces the old.
          const old = game.objectsOf(kind, actor);
          const problem = placementProblem(game, actor, kind, pos, old);
          if (problem) {
            game.fx.flash([actor.id], `§c${problem}`);
            return;
          }
          for (const o of old) game.removeObject(o, "cleanup");
          spawnBuilding(game, actor, kind, pos);
          game.fx.sound("build", pos);
          game.startCooldown(actor, kind, cooldownFor(game, actor, ctx.def));
        },
        {
          abilityId: kind,
          label: kind === "sentry" ? "Building Sentry" : "Building Dispenser",
          noSprint: true,
          damageCancels: true,
          moveCancels: true,
          onCancel: () => game.fx.flash([actor.id], "§cBuild cancelled"),
        },
      );
      // The cooldown starts when the building is finished (a cancelled build can be retried).
      return { noCooldown: true };
    },
  };
}

export const buildermanKit: Kit = {
  id: "builderman",
  init(a) {
    const cp = params(a, "carry");
    a.addHooks("builderman", {
      afterTakeDamage(self, ev, g) {
        // 10+ damage while carrying destroys the carried building.
        const b = self.data<{ active?: boolean }>("carry").active ? carriedBuilding(g, self) : null;
        if (b && ev.dealt + ev.absorbed >= cp.breakDamage) {
          g.removeObject(b, "destroyed");
          endCarry(self);
        }
      },
      anyDeath(self, victim, g) {
        if (victim !== self) return;
        const b = carriedBuilding(g, self);
        if (b) g.removeObject(b, "destroyed");
      },
    });
  },
  abilities: {
    sentry: buildAbility("sentry"),
    dispenser: buildAbility("dispenser"),
    carry: {
      can(ctx) {
        const { game, actor } = ctx;
        const near = placedBuildings(game).some((o) => o.owner === actor && dist2D(o.pos, actor.pos) <= blocks(ctx.n("pickupStuds")));
        return near ? true : "no building nearby";
      },
      hud(ctx) {
        const b = ctx.data.active ? carriedBuilding(ctx.game, ctx.actor) : null;
        return b ? `§e${b.kind}` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const b = placedBuildings(game)
          .filter((o) => o.owner === actor && dist2D(o.pos, actor.pos) <= blocks(ctx.n("pickupStuds")))
          .sort((x, y) => dist2D(x.pos, actor.pos) - dist2D(y.pos, actor.pos))[0];
        if (!b) return false;
        b.data.carried = 1;
        b.targetableBy = null;
        setBlockCell(game, b, null);
        ctx.data.active = true;
        ctx.data.objectId = b.id;
        actor.addMoveMod({ id: "carry", endTick: Infinity, mul: ctx.n("moveMul"), noSprint: true });
        game.fx.sound("pickup", actor.pos);
      },
      release(ctx) {
        const { game, actor } = ctx;
        const b = carriedBuilding(game, actor);
        if (!b) {
          endCarry(actor);
          return;
        }
        const kind = b.kind as BuildingKind;
        const pos = frontPoint(game, actor, blocks(params(actor, kind).placeStuds));
        const problem = placementProblem(game, actor, kind, pos, [b]);
        if (problem) {
          game.fx.flash([actor.id], `§c${problem}`);
          return;
        }
        b.pos = pos;
        b.prop?.move(pos);
        setBlockCell(game, b, pos);
        b.targetableBy = "killer";
        b.data.carried = 0;
        // Reactivates after a short delay.
        b.data.activeAt = game.now + ticks(ctx.n("reactivateSeconds"));
        b.data.nextFire = b.data.activeAt;
        endCarry(actor);
        game.fx.sound("build", pos);
      },
    },
  },
};

