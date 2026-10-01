// Two Time (wiki, 2026-10-01). Default: the July 2026 kit (Oblation, Sacrificial Dagger, Crouch, Pray, Ritual).
// config.twoTimeVariant = "undying_devotion" switches to the oldest kit: one passive revive, no usable abilities.
import type { AbilityCtx, AbilityHandler, Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { WorldObject } from "../objects";
import { addRes, blocks, facingAway, meleeTargets, teleportSafe } from "./common";
import { eye } from "../hit";
import { config } from "../../core/config";
import { ticks } from "../../core/scale";
import { addStamina } from "../../entities/stamina";
import { add, dist2D, flat, sub } from "../../util/vec";

const DEVOTION_DENY = "Undying Devotion variant";
const MAX_OBLATION = 100;

export function devotionVariant(): boolean {
  return config().twoTimeVariant === "undying_devotion";
}

function oblationParams(a: Actor): Record<string, number> {
  return a.character.passives.find((p) => p.id === "oblation")!.params as Record<string, number>;
}

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

export function oblation(a: Actor): number {
  return a.res.oblation ?? 0;
}

export function addOblation(a: Actor, amount: number): number {
  return addRes(a, "oblation", amount, MAX_OBLATION);
}

/** Two Time's own Ritual (at most one per round). */
export function ritualOf(game: Game, a: Actor): WorldObject | null {
  return game.objectsOf("ritual", a)[0] ?? null;
}

function stunImmune(game: Game, t: Actor): boolean {
  return game.now < t.stunImmuneUntil || t.statuses.has("stun_immune");
}

/**
 * Lunge that strikes the first enemy it reaches (Sacrificial Dagger while crouched, Jane Doe's Hatchet).
 * Checks before moving, every lunge tick, and once more when the lunge ends (wall/time); a stun cancels it.
 */
export function lungeStrike(
  game: Game,
  a: Actor,
  o: { studs: number; seconds: number; rangeStuds: number; halfAngle: number; onHit: (t: Actor) => void; onEnd?: (hit: boolean) => void },
): void {
  let done = false;
  const tryHit = (): boolean => {
    if (done || !a.alive) return done;
    const t = meleeTargets(game, a, { rangeStuds: o.rangeStuds, halfAngle: o.halfAngle, single: true })[0];
    if (!t) return false;
    done = true;
    o.onHit(t);
    return true;
  };
  if (tryHit()) {
    o.onEnd?.(true);
    return;
  }
  const fm = game.lunge(a, o.studs, o.seconds, () => (tryHit() ? false : undefined));
  fm.onEnd = (reason) => {
    if (!done && reason !== "stun") tryHit();
    o.onEnd?.(done);
  };
}

// ------------------------------------------------------------------------------------------ second life

function clearStatuses(game: Game, a: Actor): void {
  for (const s of a.statuses.all()) game.removeStatus(a, s.id);
  a.stunnedUntil = Math.min(a.stunnedUntil, game.now);
}

type ReviveMode = "ritual" | "lms" | "devotion";

/** Starts the second life. The lethal hit is already prevented by the caller (lethal hook). */
function secondLife(game: Game, a: Actor, mode: ReviveMode): void {
  const p = oblationParams(a);
  a.res.secondLifeUsed = 1;
  endCrouch(game, a, false);
  endPray(game, a);
  game.interrupt(a, "manual");
  if (a.forced) game.endForced(a, "cancel");
  clearStatuses(game, a);
  const lms = game.round.lms;
  const ritual = ritualOf(game, a);
  let invuln = p.invulnSeconds;
  let vulnerable = true;
  if (mode === "ritual" && ritual) {
    teleportSafe(game, a, ritual.pos, a.facing);
    game.clearNav(a);
    game.removeObject(ritual, "consumed");
    a.baseMaxHp = p.secondLifeHp;
    a.hp = Math.min(a.maxHp, p.secondLifeHp);
  } else if (mode === "lms") {
    // LMS: in place, Ritual destroyed, max HP 110, healed to 50, no Vulnerable.
    if (ritual) game.removeObject(ritual, "destroyed");
    a.baseMaxHp = p.lmsMaxHp;
    a.hp = Math.min(a.maxHp, p.lmsHeal);
    vulnerable = false;
  } else {
    // Undying Devotion (oldest kit): in place at 40 HP (LMS: max HP 110, healed 50), 1.5 s invincible.
    invuln = p.devotionInvuln;
    if (lms) {
      a.baseMaxHp = p.lmsMaxHp;
      a.hp = Math.min(a.maxHp, p.lmsHeal);
    } else {
      a.hp = Math.min(a.maxHp, p.devotionHp);
    }
  }
  addStamina(a, (a.staminaMax * p.staminaBonus) / 100);
  game.invulnerable(a, invuln);
  game.status(a, "speed", p.speedLevel, p.speedSeconds, a);
  if (vulnerable) game.status(a, "vulnerable", p.vulnLevel, p.vulnSeconds, a, { mode: "replace" });
  // The respawn adds half the elimination bonus to the clock (wiki 3.1.0); the LMS clock is fixed.
  if (!lms) game.round.timeLeft += config().match.secondsAddedPerElimination * p.timerBonusFraction;
  a.res.oblation = 0;
  game.fx.sound("teleport", a.pos);
  game.fx.particle("soul", add(a.pos, { x: 0, y: 1, z: 0 }));
  game.fx.title([a.id], "§5SECOND LIFE", mode === "lms" ? "§7The ritual answers in place" : "§7Vulnerable V for 12 s", 40);
  game.fx.message("all", `§5${a.displayName} rose again.`);
  game.log(`${a.displayName} second life (${mode})`);
}

// ------------------------------------------------------------------------------------------ crouch / pray

export function endCrouch(game: Game, a: Actor, manual: boolean): void {
  const d = a.data<{ active?: boolean }>("crouch");
  if (!d.active) return;
  d.active = false;
  a.flags.delete("crouching");
  a.removeMoveMod("crouch");
  a.removeMoveMod("crouch_ramp");
  game.removeStatus(a, "undetectable");
  game.removeStatus(a, "invisibility");
  const p = params(a, "crouch");
  const k = game.killer;
  if (manual && k && k.alive && dist2D(a.pos, k.pos) <= blocks(p.exitRangeStuds)) game.status(a, "speed", p.exitSpeedLevel, p.exitSpeedSeconds, a);
  // The cooldown starts when Crouch ends.
  game.startCooldown(a, "crouch", cooldownFor(game, a, a.ability("crouch")!));
  game.fx.particle("smoke", add(a.pos, { x: 0, y: 1, z: 0 }));
}

export function endPray(game: Game, a: Actor): void {
  const d = a.data<{ active?: boolean }>("pray");
  if (!d.active) return;
  d.active = false;
  a.removeMoveMod("pray");
  game.fx.flash([a.id], "§7Prayer ended");
}

function tickCrouch(game: Game, a: Actor): void {
  const d = a.data<{ active?: boolean; endTick?: number; rampTicks?: number }>("crouch");
  if (!d.active) return;
  if (game.now >= (d.endTick ?? 0)) {
    endCrouch(game, a, false);
    return;
  }
  const p = params(a, "crouch");
  // Running toward the killer builds up to +40 % speed over 4 s; lost when turning away or stopping.
  const k = game.killer;
  let toward = false;
  if (k && k.alive && a.sprinting && a.state.speed > 0.02) {
    const f = flat(a.facing);
    const dir = flat(sub(k.pos, a.pos));
    toward = f.x * dir.x + f.z * dir.z >= Math.cos((p.rampHalfAngle * Math.PI) / 180);
  }
  d.rampTicks = toward ? Math.min(ticks(p.rampSeconds), (d.rampTicks ?? 0) + 1) : 0;
  const bonus = (p.rampBonus * (d.rampTicks ?? 0)) / ticks(p.rampSeconds);
  if (bonus > 0) a.addMoveMod({ id: "crouch_ramp", endTick: game.now + 2, mul: 1 + bonus });
  else a.removeMoveMod("crouch_ramp");
  // Her aura is shown to survivors within 100 studs (marked so her own Undetectable does not hide it from allies).
  if (game.now % 10 === 0) {
    const ids = game.aliveSurvivors().filter((s) => s !== a && dist2D(s.pos, a.pos) <= blocks(p.allyRevealStuds)).map((s) => s.id);
    if (ids.length) game.reveal(a, ids, 0.75, { color: "white", marked: true, source: "crouch" });
  }
}

function tickPray(game: Game, a: Actor): void {
  const d = a.data<{ active?: boolean; anchor?: { x: number; y: number; z: number } }>("pray");
  if (!d.active) return;
  const p = params(a, "pray");
  const ritual = ritualOf(game, a);
  const moved = d.anchor ? dist2D(a.pos, d.anchor) > 0.35 : false;
  if (!ritual || moved || oblation(a) <= 0 || a.hp >= a.maxHp || dist2D(a.pos, ritual.pos) > blocks(p.rangeStuds)) {
    endPray(game, a);
    return;
  }
  // 1 HP per 2 % Oblation, 20 % per second.
  const pct = Math.min(oblation(a), p.percentPerSecond / 20, (a.maxHp - a.hp) / p.hpPerPercent);
  const healed = game.heal(a, pct * p.hpPerPercent, a);
  if (healed <= 0) {
    endPray(game, a);
    return;
  }
  a.res.oblation = Math.max(0, oblation(a) - healed / p.hpPerPercent);
  if (game.now % 10 === 0) game.fx.particle("soul", add(ritual.pos, { x: 0, y: 0.6, z: 0 }));
}

// ------------------------------------------------------------------------------------------ dagger

function stab(ctx: AbilityCtx, t: Actor, crouched: boolean): void {
  const { game, actor } = ctx;
  const ob = oblationParams(actor);
  const fills = t.isKiller && !stunImmune(game, t);
  const back = facingAway(actor, t);
  game.fx.particle("blood", add(t.pos, { x: 0, y: 1.2, z: 0 }));
  if (back) {
    const ev = game.damage(t, ctx.n("backDamage"), actor, { kind: "ability", abilityId: "sacrificial_dagger", tags: ["melee"] });
    if (ev.cancelReason === "invincible" || ev.cancelReason === "dead") return;
    if (t.alive) game.stun(t, crouched ? ctx.n("crouchBackStun") : ctx.n("backStun"), actor);
    if (fills && ev.dealt + ev.absorbed > 0) addOblation(actor, crouched ? ob.crouchBackFill : ob.backFill);
    game.fx.flash([actor.id], `§5Backstab! §7Oblation ${Math.round(oblation(actor))}%`);
  } else {
    const ev = game.damage(t, ctx.n("frontDamage"), actor, { kind: "ability", abilityId: "sacrificial_dagger", tags: ["melee"] });
    if (ev.cancelReason === "invincible" || ev.cancelReason === "dead") return;
    if (t.alive) {
      game.status(t, "slowness", ctx.n("frontSlowLevel"), ctx.n("frontHelplessSeconds"), actor);
      game.status(t, "helpless", 1, ctx.n("frontHelplessSeconds"), actor);
    }
    if (fills && ev.dealt + ev.absorbed > 0) addOblation(actor, ob.frontFill);
    game.fx.flash([actor.id], `§dStab §7Oblation ${Math.round(oblation(actor))}%`);
  }
}

function deny(extra?: (ctx: AbilityCtx) => true | string): AbilityHandler["can"] {
  return (ctx) => (devotionVariant() ? DEVOTION_DENY : extra ? extra(ctx) : true);
}

export const twoTimeKit: Kit = {
  id: "two_time",
  init(a) {
    a.res.oblation = 0;
    a.res.secondLifeUsed = 0;
    a.res.ritualPlaced = 0;
    const p = oblationParams(a);
    a.addHooks("oblation", {
      lethal(self, _ev, g) {
        if (self.res.secondLifeUsed) return false;
        if (devotionVariant()) {
          secondLife(g, self, "devotion");
          return true;
        }
        if (!ritualOf(g, self)) return false;
        if (g.round.lms) {
          secondLife(g, self, "lms");
          return true;
        }
        if (oblation(self) >= MAX_OBLATION) {
          secondLife(g, self, "ritual");
          return true;
        }
        return false;
      },
      afterTakeDamage(self, ev, g) {
        if (ev.dealt + ev.absorbed <= 0) return;
        self.data<{ rampTicks?: number }>("crouch").rampTicks = 0;
        endPray(g, self);
      },
      anyDeath(self, victim, g) {
        if (victim !== self) return;
        // The respawn already added half the bonus, so the final death only adds the other half.
        if (self.res.secondLifeUsed && !g.round.lms) g.round.timeLeft = Math.max(0, g.round.timeLeft - config().match.secondsAddedPerElimination * (1 - p.timerBonusFraction));
        for (const r of g.objectsOf("ritual", self)) g.removeObject(r, "cleanup");
      },
    });
  },
  tick(a, game) {
    if (devotionVariant()) return;
    tickCrouch(game, a);
    tickPray(game, a);
  },
  abilities: {
    sacrificial_dagger: {
      can: deny(),
      use(ctx) {
        const { game, actor } = ctx;
        const crouched = actor.flags.has("crouching");
        if (crouched) endCrouch(game, actor, false);
        game.status(actor, "resistance", ctx.n("resistLevel"), ctx.n("resistSeconds"), actor);
        const busy = ctx.n("windup") + (crouched ? ctx.n("crouchLungeSeconds") : 0);
        actor.addMoveMod({ id: "dagger", endTick: game.now + ticks(Math.max(busy, ctx.n("resistSeconds"))), noSprint: true });
        game.fx.sound("swing", actor.pos);
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            if (crouched) {
              lungeStrike(game, actor, {
                studs: ctx.n("crouchLungeStuds"),
                seconds: ctx.n("crouchLungeSeconds"),
                rangeStuds: ctx.n("rangeStuds"),
                halfAngle: ctx.n("halfAngle"),
                onHit: (t) => stab(ctx, t, true),
                // More end-lag after the crouched lunge.
                onEnd: () => actor.addMoveMod({ id: "dagger_endlag", endTick: game.now + ticks(ctx.n("crouchEndlagSeconds")), frozen: true }),
              });
              return;
            }
            const t = meleeTargets(game, actor, { rangeStuds: ctx.n("rangeStuds"), halfAngle: ctx.n("halfAngle"), single: true })[0];
            if (t) stab(ctx, t, false);
          },
          { abilityId: "sacrificial_dagger", label: "Dagger", noSprint: true },
        );
      },
    },
    crouch: {
      can: deny(),
      hud(ctx) {
        const d = ctx.data as { active?: boolean; endTick?: number };
        return d.active ? `${Math.max(0, ((d.endTick ?? 0) - ctx.game.now) / 20).toFixed(1)}s` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const secs = ctx.n("maxSeconds");
        ctx.data.active = true;
        ctx.data.endTick = game.now + ticks(secs);
        ctx.data.rampTicks = 0;
        actor.flags.add("crouching");
        game.status(actor, "undetectable", 1, secs, actor);
        game.status(actor, "invisibility", ctx.n("invisLevel"), secs, actor);
        actor.addMoveMod({ id: "crouch", endTick: game.now + ticks(secs), walkStuds: ctx.n("walk"), sprintStuds: ctx.n("sprint") });
        game.fx.particle("smoke", add(actor.pos, { x: 0, y: 1, z: 0 }));
        return { noCooldown: true };
      },
      release(ctx) {
        endCrouch(ctx.game, ctx.actor, true);
      },
    },
    pray: {
      can: deny((ctx) => {
        if (!ritualOf(ctx.game, ctx.actor)) return "needs a Ritual";
        if (oblation(ctx.actor) <= 0) return "no Oblation";
        if (ctx.actor.hp >= ctx.actor.maxHp) return "full HP";
        return true;
      }),
      hud(ctx) {
        return `${Math.round(oblation(ctx.actor))}%`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const ritual = ritualOf(game, actor)!;
        if (dist2D(actor.pos, ritual.pos) > blocks(ctx.n("rangeStuds"))) {
          // Too far: show where the Ritual is for 4 s instead.
          ritual.data.showUntil = game.now + ticks(ctx.n("showRitualSeconds"));
          game.fx.line("soul", eye(actor), add(ritual.pos, { x: 0, y: 1, z: 0 }), 1, { viewers: [actor.id] });
          game.fx.flash([actor.id], `§dYour Ritual is ${Math.round(dist2D(actor.pos, ritual.pos))} blocks away`);
          return false;
        }
        ctx.data.active = true;
        ctx.data.anchor = { ...actor.pos };
        actor.addMoveMod({ id: "pray", endTick: Infinity, frozen: true });
        game.fx.sound("abilityCast", actor.pos);
      },
      release(ctx) {
        endPray(ctx.game, ctx.actor);
      },
    },
    ritual: {
      can: deny((ctx) => (ctx.actor.res.ritualPlaced ? "once per round" : true)),
      hud(ctx) {
        return ctx.actor.res.ritualPlaced ? "§7placed" : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos);
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            actor.res.ritualPlaced = 1;
            game.spawnObject({
              kind: "ritual",
              owner: actor,
              pos: { ...actor.pos },
              radius: 1,
              prop: "ritual",
              propName: "§5Ritual",
              data: { showUntil: 0 },
              update(o, g) {
                const owner = o.owner!;
                // Visuals intensify as Oblation rises.
                const every = Math.max(4, Math.round(30 - (22 * oblation(owner)) / MAX_OBLATION));
                if (g.now % every === 0) g.fx.particle("dragon", add(o.pos, { x: 0, y: 0.3, z: 0 }));
                if ((o.data.showUntil as number) > g.now && g.now % 5 === 0) {
                  for (let y = 0.5; y <= 6; y += 1.1) g.fx.particle("soul", add(o.pos, { x: 0, y, z: 0 }), { to: [owner.id] });
                }
              },
            });
            game.fx.sound("build", actor.pos);
            game.fx.flash([actor.id], "§5Ritual carved");
          },
          { abilityId: "ritual", label: "Ritual", frozen: true },
        );
      },
    },
  },
};
