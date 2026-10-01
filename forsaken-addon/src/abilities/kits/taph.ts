// Taph (wiki, 2026-10-01): Tripwire, Subspace Tripmine. No passive. Traps vanish when Taph dies.
import type { Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { PropHandle } from "../../core/ports";
import type { WorldObject } from "../objects";
import { blocks } from "./common";
import { frontPoint } from "./builderman";
import { ACTOR_RADIUS } from "../hit";
import { ticks } from "../../core/scale";
import { add, dist2D, distPointSegment, flat, scale, type Vec3 } from "../../util/vec";

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

/** Other living Taphs shorten trap effects. */
function otherTaphs(game: Game, taph: Actor): number {
  return game.aliveSurvivors().filter((s) => s !== taph && s.character.id === "taph").length;
}

function flat0(p: Vec3): Vec3 {
  return { x: p.x, y: 0, z: p.z };
}

function cross2(ax: number, az: number, bx: number, bz: number): number {
  return ax * bz - az * bx;
}

/** Do the horizontal segments p1-p2 and q1-q2 intersect? */
export function segmentsCross(p1: Vec3, p2: Vec3, q1: Vec3, q2: Vec3): boolean {
  const d1 = cross2(q2.x - q1.x, q2.z - q1.z, p1.x - q1.x, p1.z - q1.z);
  const d2 = cross2(q2.x - q1.x, q2.z - q1.z, p2.x - q1.x, p2.z - q1.z);
  const d3 = cross2(p2.x - p1.x, p2.z - p1.z, q1.x - p1.x, q1.z - p1.z);
  const d4 = cross2(p2.x - p1.x, p2.z - p1.z, q2.x - p1.x, q2.z - p1.z);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Is the killer touching / crossing the wire this tick? */
export function killerCrossesWire(k: Actor, a: Vec3, b: Vec3): boolean {
  if (distPointSegment(flat0(k.pos), flat0(a), flat0(b)) <= ACTOR_RADIUS + 0.15) return true;
  return segmentsCross(k.lastPos, k.pos, a, b);
}

// ------------------------------------------------------------------------------------------ Tripwire

function tripwireUpdate(o: WorldObject, game: Game): void {
  const owner = o.owner!;
  const p = params(owner, "tripwire");
  const a = o.data.a as Vec3;
  const b = o.data.b as Vec3;
  const age = game.now - (o.data.placedAt as number);
  // Visible to survivors only; it fades over 150 s but never expires.
  const every = age < ticks(p.fadeSeconds) ? 20 : 60;
  if (age % every === 0) {
    const ids = game.aliveSurvivors().map((s) => s.id);
    if (ids.length) game.fx.line("trail", add(a, { x: 0, y: 0.35, z: 0 }), add(b, { x: 0, y: 0.35, z: 0 }), 0.5, { viewers: ids });
  }
  if (game.now < (o.data.armAt as number)) return;
  const k = game.killer;
  if (!k || !k.alive || !killerCrossesWire(k, a, b)) return;
  const cut = p.extraTaphCutSeconds * otherTaphs(game, owner);
  const reveal = p.revealSeconds - cut;
  const slow = p.slowSeconds - cut;
  if (reveal > 0) game.reveal(k, "survivors", reveal, { color: "red", source: "tripwire" });
  if (slow > 0) game.status(k, "slowness", p.slowLevel, slow, owner);
  game.fx.sound("trap", k.pos);
  game.fx.particle("hitSpark", add(k.pos, { x: 0, y: 0.5, z: 0 }));
  const ids = game.aliveSurvivors().map((s) => s.id);
  game.fx.flash(ids, "§eTripwire! §7The killer is revealed");
  game.log(`${k.displayName} tripped ${owner.displayName}'s wire`);
  game.removeObject(o, "consumed");
}

function placeTripwire(game: Game, taph: Actor): WorldObject {
  const p = params(taph, "tripwire");
  // Max 3 per Taph: a new one removes the oldest.
  const existing = game.objectsOf("tripwire", taph);
  while (existing.length >= p.maxTraps) game.removeObject(existing.shift()!, "cleanup");
  const center = frontPoint(game, taph, blocks(p.placeStuds));
  const f = flat(taph.facing);
  const perp = { x: -f.z, y: 0, z: f.x };
  const half = blocks(p.wireLengthStuds) / 2;
  const a = add(center, scale(perp, half));
  const b = add(center, scale(perp, -half));
  const stakes: PropHandle[] = [game.ports.createProp("tripwire_stake", a), game.ports.createProp("tripwire_stake", b)];
  return game.spawnObject({
    kind: "tripwire",
    owner: taph,
    pos: center,
    radius: half,
    hp: p.hp,
    targetableBy: "killer",
    data: { a, b, placedAt: game.now, armAt: game.now + ticks(p.armSeconds) },
    update: tripwireUpdate,
    onRemove(o, g, reason) {
      for (const s of stakes) s.remove();
      if (reason === "destroyed") g.fx.particle("smoke", add(o.pos, { x: 0, y: 0.4, z: 0 }));
    },
  });
}

// ------------------------------------------------------------------------------------------ Subspace Tripmine

/** Explodes a mine: Helpless I + Subspaced III + Weakness V on the killer (and Taph) inside the blast; only Subspaced I if it was attacked. */
export function detonateTripmine(game: Game, o: WorldObject, attacked: boolean): void {
  if (o.dead) return;
  const owner = o.owner!;
  const p = params(owner, "subspace_tripmine");
  const cut = p.extraTaphCutSeconds * otherTaphs(game, owner);
  const blast = blocks(p.blastStuds);
  game.removeObject(o, "consumed");
  game.fx.sound("glitch", o.pos, { volume: 1.5 });
  game.fx.particle("void", add(o.pos, { x: 0, y: 0.8, z: 0 }));
  game.fx.ring("glitch", add(o.pos, { x: 0, y: 0.3, z: 0 }), blast, 28, { color: [1, 0.4, 0.8] });
  const k = game.killer;
  const victims: Actor[] = [];
  if (k && k.alive && dist2D(k.pos, o.pos) <= blast) victims.push(k);
  if (owner.alive && dist2D(owner.pos, o.pos) <= blast) victims.push(owner);
  // Tripmine statuses ignore invincibility (they still affect ENRAGED Slasher).
  const bypass = { data: { bypassInvincible: 1 } };
  for (const v of victims) {
    if (attacked) {
      if (p.subspacedSeconds - cut > 0) game.status(v, "subspaced", p.attackedSubspacedLevel, p.subspacedSeconds - cut, owner, bypass);
      continue;
    }
    if (p.helplessSeconds - cut > 0) game.status(v, "helpless", 1, p.helplessSeconds - cut, owner, bypass);
    if (p.subspacedSeconds - cut > 0) game.status(v, "subspaced", p.subspacedLevel, p.subspacedSeconds - cut, owner, bypass);
    if (p.weaknessSeconds - cut > 0) game.status(v, "weakness", p.weaknessLevel, p.weaknessSeconds - cut, owner, bypass);
  }
  if (k && victims.includes(k)) {
    // Going off on a killer takes 10 s off Taph's cooldown.
    owner.cooldowns.reduce("subspace_tripmine", ticks(p.triggeredCooldownCut), game.now);
    game.fx.flash([owner.id], "§dSubspace Tripmine hit the killer!");
    game.log(`${owner.displayName}'s Subspace Tripmine hit ${k.displayName}`);
  }
}

function tripmineUpdate(o: WorldObject, game: Game): void {
  const owner = o.owner!;
  const p = params(owner, "subspace_tripmine");
  const age = game.now - (o.data.placedAt as number);
  if (age >= ticks(p.selfDetonateSeconds)) {
    detonateTripmine(game, o, false);
    return;
  }
  // Nearly invisible: a purple glow + sound every 13 s; survivors see a faint marker.
  if (age > 0 && age % ticks(p.pulseSeconds) === 0) {
    game.fx.particle("void", add(o.pos, { x: 0, y: 0.4, z: 0 }), { color: [0.8, 0.3, 1] });
    game.fx.sound("glitch", o.pos, { volume: 0.5, pitch: 1.8 });
  }
  if (age % 20 === 0) {
    const ids = game.aliveSurvivors().map((s) => s.id);
    if (ids.length) game.fx.particle("glitch", add(o.pos, { x: 0, y: 0.3, z: 0 }), { to: ids });
  }
  const triggerAt = o.data.triggerAt as number;
  if (triggerAt < 0) {
    const k = game.killer;
    if (k && k.alive && dist2D(k.pos, o.pos) <= blocks(p.triggerStuds)) {
      o.data.triggerAt = game.now + ticks(p.delay);
      game.fx.sound("trap", o.pos, { pitch: 1.6 });
    }
  } else if (game.now >= triggerAt) {
    detonateTripmine(game, o, false);
  }
}

function throwTripmine(game: Game, taph: Actor): WorldObject {
  const p = params(taph, "subspace_tripmine");
  // Thrown onto the ground ahead; it cannot pass walls.
  const land = frontPoint(game, taph, blocks(p.throwStuds));
  game.fx.sound("projectile", taph.pos);
  return game.spawnObject({
    kind: "tripmine",
    owner: taph,
    pos: land,
    radius: 0.5,
    hp: 1,
    prop: "tripmine",
    targetableBy: "killer",
    data: { placedAt: game.now, triggerAt: -1 },
    update: tripmineUpdate,
    onDamaged(o, g) {
      // Attacked before it goes off: weakened blast (Subspaced I only).
      detonateTripmine(g, o, true);
    },
  });
}

export const taphKit: Kit = {
  id: "taph",
  init(a) {
    a.addHooks("taph", {
      anyDeath(self, victim, g) {
        if (victim !== self) return;
        for (const o of [...g.objectsOf("tripwire", self), ...g.objectsOf("tripmine", self)]) g.removeObject(o, "cleanup");
      },
    });
  },
  abilities: {
    tripwire: {
      hud(ctx) {
        return `${ctx.game.objectsOf("tripwire", ctx.actor).length}/${ctx.n("maxTraps")}`;
      },
      use(ctx) {
        placeTripwire(ctx.game, ctx.actor);
        ctx.game.fx.sound("build", ctx.actor.pos, { pitch: 1.4 });
      },
    },
    subspace_tripmine: {
      hud(ctx) {
        const mine = ctx.game.objectsOf("tripmine", ctx.actor)[0];
        if (!mine) return null;
        const left = ctx.n("selfDetonateSeconds") - (ctx.game.now - (mine.data.placedAt as number)) / 20;
        return `§d${Math.max(0, left).toFixed(0)}s`;
      },
      use(ctx) {
        throwTripmine(ctx.game, ctx.actor);
      },
    },
  },
};
