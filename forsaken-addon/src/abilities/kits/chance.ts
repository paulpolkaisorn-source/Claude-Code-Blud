// Chance (wiki, 2026-10-01): Unpredictable Fate, Coin Flip, One Shot, Reroll, Hat Fix.
// All three gamble abilities share one pool of charges (res.charges, 0-3) built by Coin Flip heads.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { addRes, aimedEnemy, blocks, eyeFront, knockback } from "./common";
import { eye, inSphere } from "../hit";
import { toStuds } from "../../core/scale";
import { add, dist2D } from "../../util/vec";

export type OneShotOutcome = "success" | "misfire" | "explode";

function num(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

export function chanceCharges(a: Actor): number {
  return a.res.charges ?? 0;
}

/** Heads chance: 50 % plus 2.5 % per consecutive tails (reset by heads). */
export function headsChance(a: Actor): number {
  const p = num(a, "coin_flip");
  return Math.min(1, p.headsChance + p.pityPerTails * (a.res.tailsStreak ?? 0));
}

/** Success / explosion odds of One Shot at the current charge count. */
export function oneShotOdds(a: Actor): { success: number; explode: number; misfire: number } {
  const p = a.ability("one_shot")!.params as Record<string, unknown>;
  const c = Math.min(3, chanceCharges(a));
  const success = (p.successChance as number[])[c];
  const explode = (p.explodeChance as number[])[c];
  return { success, explode, misfire: Math.max(0, 1 - success - explode) };
}

/** Spends every shared charge and returns how many there were. */
function spendCharges(a: Actor): number {
  const c = Math.min(3, chanceCharges(a));
  a.res.charges = 0;
  return c;
}

/** Adds one Vulnerable tier. The tier survives the status expiring; only Hat Fix resets it. */
function addVulnerableTier(game: Game, a: Actor, seconds: number): number {
  const tier = addRes(a, "vulnTier", 1);
  const cur = a.statuses.level("vulnerable");
  // Running: one more level (refreshes the timer). Expired: back at the remembered tier.
  game.status(a, "vulnerable", cur > 0 ? Math.max(1, tier - cur) : tier, seconds, a, { mode: "add" });
  return tier;
}

function fireOneShot(ctx: AbilityCtx, charges: number): OneShotOutcome {
  const { game, actor } = ctx;
  const success = ctx.param<number[]>("successChance")[charges];
  const explode = ctx.param<number[]>("explodeChance")[charges];
  const r = game.rng.next();
  const outcome: OneShotOutcome = r < success ? "success" : r < success + explode ? "explode" : "misfire";
  ctx.data.lastOutcome = outcome;
  const muzzle = eye(actor);
  if (outcome === "success") {
    game.fx.sound("gun", actor.pos);
    const range = blocks(ctx.n("rangeStuds"));
    const t = aimedEnemy(game, actor, range, ctx.n("aimHalfAngle"), true, false);
    if (!t) {
      game.fx.line("trail", muzzle, eyeFront(actor, range), 0.5);
      game.fx.flash([actor.id], "§7One Shot: no target");
      return outcome;
    }
    game.fx.line("trail", muzzle, eye(t), 0.5);
    const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "one_shot", tags: ["projectile"] });
    if (ev.cancelReason === "invincible" || ev.cancelReason === "dead") return outcome;
    // Stun 4 s point-blank down to 1 s at 90 studs, linearly.
    const frac = Math.min(1, toStuds(dist2D(actor.pos, t.pos)) / ctx.n("rangeStuds"));
    const stun = ctx.n("stunMax") - (ctx.n("stunMax") - ctx.n("stunMin")) * frac;
    game.stun(t, stun, actor);
    if (t.alive) knockback(t, actor.pos, blocks(ctx.n("knockbackStuds")));
    game.fx.flash([actor.id], `§aOne Shot hit! §7stun ${stun.toFixed(1)}s`);
  } else if (outcome === "explode") {
    game.fx.sound("explosion", actor.pos);
    game.fx.particle("explosion", add(actor.pos, { x: 0, y: 1, z: 0 }));
    actor.res.gunBroken = 1;
    game.damage(actor, ctx.n("explodeSelfDamage"), actor, { kind: "self", abilityId: "one_shot" });
    const k = game.killer;
    if (k && k.alive && inSphere(add(actor.pos, { x: 0, y: 1, z: 0 }), blocks(ctx.n("explodeRadiusStuds")), k)) game.stun(k, ctx.n("explodeStun"), actor);
    game.fx.flash([actor.id], "§cThe gun exploded! §7(Hat Fix repairs it)");
  } else {
    game.fx.sound("trap", actor.pos);
    game.fx.particle("smoke", eyeFront(actor, 0.6));
    game.fx.flash([actor.id], "§7Misfire...");
  }
  return outcome;
}

export const chanceKit: Kit = {
  id: "chance",
  init(a, game) {
    // Unpredictable Fate: max HP rolled each round.
    const uf = a.character.passives.find((p) => p.id === "unpredictable_fate")!.params as Record<string, number>;
    const hp = game.rng.int(uf.minHp, uf.maxHp);
    a.baseMaxHp = hp;
    a.hp = hp;
    a.res.charges = 0;
    a.res.vulnTier = 0;
    a.res.tailsStreak = 0;
    a.res.gunBroken = 0;
  },
  abilities: {
    coin_flip: {
      hud(ctx) {
        return `x${chanceCharges(ctx.actor)} H${Math.round(headsChance(ctx.actor) * 1000) / 10}%`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const heads = game.rng.next() < headsChance(actor);
        game.fx.sound("coin", actor.pos);
        ctx.data.lastResult = heads ? "heads" : "tails";
        if (heads) {
          actor.res.tailsStreak = 0;
          const c = addRes(actor, "charges", 1, ctx.n("maxCharges"));
          game.fx.particle("spark", add(actor.pos, { x: 0, y: 2.2, z: 0 }));
          game.fx.flash([actor.id], `§aHEADS §7charges ${c}/${ctx.n("maxCharges")}`);
        } else {
          addRes(actor, "tailsStreak", 1);
          const tier = addVulnerableTier(game, actor, ctx.n("vulnerableSeconds"));
          game.fx.flash([actor.id], `§cTAILS §7Vulnerable ${tier}`);
        }
      },
    },
    one_shot: {
      can(ctx) {
        return ctx.actor.res.gunBroken ? "gun broken (Hat Fix)" : true;
      },
      hud(ctx) {
        if (ctx.actor.res.gunBroken) return "§cBROKEN";
        return `x${chanceCharges(ctx.actor)} ${Math.round(oneShotOdds(ctx.actor).success * 100)}%`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const charges = spendCharges(actor);
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("windup"), () => fireOneShot(ctx, charges), { abilityId: "one_shot", label: "One Shot" });
      },
    },
    reroll: {
      hud(ctx) {
        return `x${chanceCharges(ctx.actor)}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const charges = spendCharges(actor);
        const bonus = ctx.param<number[]>("bonus")[charges] ?? 0;
        const roll = game.rng.int(ctx.n("minHp"), ctx.n("maxHp"));
        const newMax = Math.min(ctx.n("cap"), Math.round(roll * (1 + bonus)));
        const ratio = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;
        actor.baseMaxHp = newMax;
        actor.hp = Math.min(actor.maxHp, Math.max(0.5, actor.maxHp * ratio));
        game.fx.sound("coin", actor.pos, { pitch: 0.8 });
        game.fx.particle("spark", add(actor.pos, { x: 0, y: 1.2, z: 0 }));
        game.fx.flash([actor.id], `§eReroll: §f${newMax} max HP`);
      },
    },
    hat_fix: {
      can(ctx) {
        return chanceCharges(ctx.actor) >= ctx.n("requiredCharges") ? true : `needs ${ctx.n("requiredCharges")} charges`;
      },
      hud(ctx) {
        return `${chanceCharges(ctx.actor)}/${ctx.n("requiredCharges")}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        spendCharges(actor);
        game.removeStatus(actor, "vulnerable");
        actor.res.vulnTier = 0;
        actor.res.gunBroken = 0;
        game.fx.sound("build", actor.pos);
        game.fx.particle("shield", add(actor.pos, { x: 0, y: 2, z: 0 }));
        game.fx.flash([actor.id], "§aHat Fix: §7Vulnerable reset, gun repaired");
      },
    },
  },
};
