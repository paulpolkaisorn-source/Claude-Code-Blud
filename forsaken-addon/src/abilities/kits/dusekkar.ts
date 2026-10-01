// Dusekkar (wiki, 2026-10-01): Levitation, Spawn Protection, Plasma Beam.
import type { Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { blocks } from "./common";
import { eye, inBox } from "../hit";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, scale, sub } from "../../util/vec";

interface ShieldData {
  active?: boolean;
  targetId?: string;
  endTick?: number;
  losLostTicks?: number;
  resistEndTick?: number;
  /** The ally's own Resistance before the shield (restored when the shield ends early). */
  prevResist?: { level: number; endTick: number } | null;
  /** Ally id -> tick until which that ally cannot be shielded again. */
  lockouts?: Record<string, number>;
  lastResult?: string;
}

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

function shieldData(a: Actor): ShieldData {
  return a.data<ShieldData & Record<string, unknown>>("spawn_protection");
}

function hookOwner(dusekkar: Actor): string {
  return `spawn_protection:${dusekkar.id}`;
}

function extraDusekkars(game: Game): number {
  return Math.max(0, game.aliveSurvivors().filter((s) => s.character.id === "dusekkar").length - 1);
}

/** The ally whose shield Dusekkar is channelling, if any. */
export function shieldedAlly(game: Game, dusekkar: Actor): Actor | null {
  const d = shieldData(dusekkar);
  return d.active ? (game.get(d.targetId) ?? null) : null;
}

/** Ally closest to the crosshair within range, through walls, skipping invalid targets (lockout, grabbed, channelling Dusekkars). */
export function spawnProtectionTarget(game: Game, a: Actor): Actor | null {
  const p = params(a, "spawn_protection");
  const lock = shieldData(a).lockouts ?? {};
  const f = flat(a.facing);
  let best: Actor | null = null;
  let bestScore = Infinity;
  for (const t of game.alliesOf(a)) {
    if ((lock[t.id] ?? 0) > game.now || t.flags.has("grabbed")) continue;
    if (t.character.id === "dusekkar" && shieldData(t).active) continue;
    const d = dist2D(a.pos, t.pos);
    if (d > blocks(p.rangeStuds)) continue;
    const dir = flat(sub(t.pos, a.pos));
    const ang = (Math.acos(Math.max(-1, Math.min(1, f.x * dir.x + f.z * dir.z))) * 180) / Math.PI;
    if (ang > p.aimHalfAngle && d > 1.5) continue;
    const score = ang * 2 + d;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Ends a Spawn Protection channel; the cooldown starts now. */
export function endSpawnProtection(game: Game, a: Actor, reason: string): void {
  const d = shieldData(a);
  if (!d.active) return;
  d.active = false;
  d.lastResult = reason;
  a.removeMoveMod("spawn_protection");
  const t = game.get(d.targetId);
  if (t) {
    t.removeHooks(hookOwner(a));
    const r = t.statuses.get("resistance");
    if (r && r.endTick === d.resistEndTick && r.level === params(a, "spawn_protection").resistLevel) {
      const prev = d.prevResist;
      if (prev && prev.endTick > game.now) {
        r.level = prev.level;
        r.endTick = prev.endTick;
      } else game.removeStatus(t, "resistance");
    }
  }
  game.startCooldown(a, "spawn_protection", cooldownFor(game, a, a.ability("spawn_protection")!));
  if (reason !== "expired" && reason !== "released") game.fx.flash([a.id], `§7Spawn Protection ended (${reason})`);
}

function startSpawnProtection(game: Game, a: Actor, t: Actor): void {
  const p = params(a, "spawn_protection");
  const d = shieldData(a);
  d.active = true;
  d.targetId = t.id;
  d.endTick = game.now + ticks(p.channelSeconds);
  d.losLostTicks = 0;
  d.lockouts = { ...(d.lockouts ?? {}), [t.id]: game.now + ticks(p.sameAllyLockout) };
  // Dusekkar is slowed 30 % while channelling (overrides weaker Slowness).
  a.addMoveMod({ id: "spawn_protection", endTick: d.endTick, mul: p.selfSlowMul });
  const prev = t.statuses.get("resistance");
  d.prevResist = prev && prev.endTick > game.now ? { level: prev.level, endTick: prev.endTick } : null;
  game.status(t, "resistance", p.resistLevel, p.channelSeconds, a);
  d.resistEndTick = t.statuses.get("resistance")?.endTick;
  t.addHooks(
    hookOwner(a),
    {
      lethal(self, ev, g) {
        // The killing hit is nullified completely and the shield breaks.
        self.hp = Math.max(1, self.hp + ev.dealt);
        g.fx.sound("block", self.pos);
        g.fx.particle("shield", add(self.pos, { x: 0, y: 1.2, z: 0 }));
        g.fx.flash([self.id], "§bSpawn Protection saved you!");
        g.fx.flash([a.id], `§bSpawn Protection saved ${self.displayName}`);
        endSpawnProtection(g, a, "broken");
        return true;
      },
    },
    d.endTick,
  );
  // Run before any other lethal hook (e.g. Two Time's second life) so the shield is spent first.
  const i = t.hooks.findIndex((h) => h.owner === hookOwner(a));
  if (i > 0) t.hooks.unshift(...t.hooks.splice(i, 1));
  game.fx.sound("abilityCast", a.pos);
  game.fx.flash([t.id], `§bShielded by ${a.displayName}`);
  // 3+ Dusekkars channelling at once: every shield shatters (Blindness III + Slowness III 6 s each).
  const channelling = game.aliveSurvivors().filter((s) => s.character.id === "dusekkar" && shieldData(s).active);
  if (channelling.length >= p.overloadCount) {
    for (const s of channelling) {
      endSpawnProtection(game, s, "overload");
      game.status(s, "blindness", p.overloadBlindLevel, p.overloadSeconds, s);
      game.status(s, "slowness", p.overloadSlowLevel, p.overloadSeconds, s);
    }
  }
}

function tickSpawnProtection(game: Game, a: Actor): void {
  const d = shieldData(a);
  if (!d.active) return;
  const p = params(a, "spawn_protection");
  const t = game.get(d.targetId);
  if (!t || !t.alive) return endSpawnProtection(game, a, "ally lost");
  if (a.isStunned(game.now)) return endSpawnProtection(game, a, "stunned");
  if (game.now >= (d.endTick ?? 0)) return endSpawnProtection(game, a, "expired");
  if (dist2D(a.pos, t.pos) > blocks(p.rangeStuds)) return endSpawnProtection(game, a, "out of range");
  // Line of sight broken for more than 2 s collapses the shield.
  if (game.lineOfSight(eye(a), eye(t))) d.losLostTicks = 0;
  else d.losLostTicks = (d.losLostTicks ?? 0) + 1;
  if ((d.losLostTicks ?? 0) > ticks(p.losBreakSeconds)) return endSpawnProtection(game, a, "line of sight");
  if (game.now % 4 === 0) {
    game.fx.line("blueFlame", add(a.pos, { x: 0, y: 1.4, z: 0 }), add(t.pos, { x: 0, y: 1.2, z: 0 }), 0.8);
    game.fx.particle("shield", add(t.pos, { x: 0, y: 2, z: 0 }));
  }
}

function fireBeam(game: Game, a: Actor): void {
  const p = params(a, "plasma_beam");
  const length = blocks(p.rangeStuds);
  const half = blocks(p.beamRadius);
  const dir = flat(a.facing);
  const from = add(a.pos, { x: 0, y: 1.4, z: 0 });
  const extra = extraDusekkars(game);
  game.fx.sound("zap", a.pos);
  game.fx.line("blueFlame", from, add(from, scale(dir, length)), 0.4);
  // Through walls: the killer is slowed, and at most one survivor (the first in line) is boosted.
  const k = game.killer;
  if (k && k.alive && inBox(a.pos, dir, length, half, k)) {
    const secs = p.killerSlowSeconds - p.extraSlowCutSeconds * extra;
    if (secs > p.minSlowSeconds) game.status(k, "slowness", p.killerSlowLevel, secs, a);
  }
  const ally = game
    .alliesOf(a)
    .filter((s) => inBox(a.pos, dir, length, half, s))
    .sort((x, y) => dist2D(a.pos, x.pos) - dist2D(a.pos, y.pos))[0];
  if (ally) {
    game.status(ally, "speed", p.survivorSpeedLevel, p.survivorSpeedSeconds, a);
    const amount = Math.max(0, p.overheal - p.extraOverhealCut * extra);
    if (amount > 0) game.shield(ally, "plasma_overheal", amount, { decayPerSecond: p.overhealDecayPerSecond });
    game.fx.particle("shield", add(ally.pos, { x: 0, y: 1.2, z: 0 }));
  }
}

export const dusekkarKit: Kit = {
  id: "dusekkar",
  init(a) {
    // Levitation: no footsteps; John Doe's trail ignores Dusekkar.
    a.flags.add("silent");
    a.flags.add("levitating");
    a.addHooks("dusekkar", {
      anyDeath(self, victim, g) {
        if (victim === self) endSpawnProtection(g, self, "dead");
      },
    });
  },
  tick(a, game) {
    tickSpawnProtection(game, a);
  },
  abilities: {
    spawn_protection: {
      hud(ctx) {
        const t = shieldedAlly(ctx.game, ctx.actor);
        return t ? `§b→ ${t.displayName}` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const t = spawnProtectionTarget(game, actor);
        if (!t) {
          // A failed cast does not start the cooldown.
          game.fx.flash([actor.id], "§7No ally to shield");
          return false;
        }
        startSpawnProtection(game, actor, t);
        return { noCooldown: true };
      },
      release(ctx) {
        endSpawnProtection(ctx.game, ctx.actor, "released");
      },
    },
    plasma_beam: {
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos, { pitch: 1.5 });
        game.windup(actor, ctx.n("windup"), () => fireBeam(game, actor), { abilityId: "plasma_beam", label: "Plasma Beam", moveMul: ctx.n("windupMoveMul") });
      },
    },
  },
};
