// Noob (wiki, 2026-10-01): Bloxy Cola, Slateskin Potion, Ghostburger. No passive.
import type { AbilityCtx, Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { config } from "../../core/config";
import { ticks } from "../../core/scale";
import { castFx } from "./common";

const COLA = "bloxy_cola";
const SLATE = "slateskin_potion";
const BURGER = "ghostburger";

interface SlateData extends Record<string, unknown> {
  /** Drinking the potion (windup running). */
  drinking?: boolean;
  /** Channel id of the drink, to notice a cancelled drink. */
  channelId?: string | null;
  /** Slateskin effect running (second press ends it). */
  active?: boolean;
  startTick?: number;
  prevPriority?: number;
}

function params(a: Actor, id: string): Record<string, number> {
  return a.ability(id)!.params as Record<string, number>;
}

/** Drinks/eats are channels: only one at a time. */
function notBusy(ctx: AbilityCtx): true | string {
  return ctx.actor.channel ? "busy" : true;
}

/** "Boowomp": the cola does nothing while Slateskin is active. */
function boowomp(game: Game, a: Actor): void {
  game.fx.sound("drink", a.pos, { pitch: 0.5 });
  game.fx.sound("trap", a.pos);
  game.fx.flash([a.id], "§7*boowomp*");
}

function startSlateCooldown(game: Game, a: Actor): void {
  game.startCooldown(a, SLATE, cooldownFor(game, a, a.ability(SLATE)!));
}

function applySlateskin(game: Game, a: Actor): void {
  const p = params(a, SLATE);
  const d = a.data<SlateData>(SLATE);
  d.drinking = false;
  d.channelId = null;
  d.active = true;
  d.startTick = game.now;
  game.status(a, "slateskin", p.level, p.seconds, a, { mode: "replace" });
  // 40 overheal per level; it decays like Plasma Beam overheal and ends instantly with the effect (wiki Overheal).
  game.shield(a, "slateskin", p.level * p.overhealPerLevel, { seconds: p.seconds, decayPerSecond: config().statusTuning.overhealDecayPerSecond });
  // Extra hit priority while stoned.
  d.prevPriority = a.hitPriority;
  a.hitPriority = Math.max(a.hitPriority, p.hitPriority);
  game.fx.sound("block", a.pos, { pitch: 0.6 });
  game.fx.particle("shield", { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z });
  game.fx.flash([a.id], "§7SLATESKIN III");
}

/** Ends Slateskin: natural expiry → Speed II 2 s, manual recast → Speed I 2 s. The cooldown starts now. */
function endSlateskin(game: Game, a: Actor, manual: boolean): void {
  const d = a.data<SlateData>(SLATE);
  if (!d.active) return;
  const p = params(a, SLATE);
  d.active = false;
  game.removeStatus(a, "slateskin");
  a.shields = a.shields.filter((l) => l.id !== "slateskin");
  a.hitPriority = d.prevPriority ?? 1;
  // Slateskin is gone, so the Speed immunity no longer applies.
  game.status(a, "speed", manual ? p.manualSpeedLevel : p.naturalSpeedLevel, p.endSpeedSeconds, a);
  startSlateCooldown(game, a);
  game.fx.sound("abilityCast", a.pos, { pitch: 0.8 });
}

/**
 * Bloxy Cola speed counts as a cola drink (wiki Items, log 3.5.3): being hit by Slowness while it lasts
 * cancels the speed entirely instead of slowing Noob.
 */
function addColaSpeedHook(game: Game, a: Actor, seconds: number): void {
  a.removeHooks("bloxy_cola_speed");
  a.addHooks(
    "bloxy_cola_speed",
    {
      modifyStatus(self, id, change, _source, g) {
        if (id !== "slowness" || !self.statuses.has("speed")) return change;
        g.removeStatus(self, "speed");
        self.removeHooks("bloxy_cola_speed");
        return null;
      },
    },
    game.now + ticks(seconds),
  );
}

export const noobKit: Kit = {
  id: "noob",
  init(a) {
    a.data<SlateData>(SLATE).active = false;
  },
  tick(a, game) {
    const d = a.data<SlateData>(SLATE);
    // A drink cancelled by a stun (or overridden by another channel) still uses the potion.
    if (d.drinking && a.channel?.id !== d.channelId) {
      d.drinking = false;
      d.channelId = null;
      if (!d.active) startSlateCooldown(game, a);
    }
    if (d.active && !a.statuses.has("slateskin")) endSlateskin(game, a, false);
  },
  abilities: {
    bloxy_cola: {
      can: notBusy,
      use(ctx) {
        const { game, actor } = ctx;
        // Using it during Slateskin only plays a "boowomp" sound.
        if (actor.statuses.has("slateskin")) {
          boowomp(game, actor);
          return;
        }
        game.fx.sound("drink", actor.pos);
        game.windup(
          actor,
          ctx.n("drinkSeconds"),
          () => {
            if (actor.statuses.has("slateskin")) {
              boowomp(game, actor);
              return;
            }
            game.removeStatus(actor, "slowness");
            game.status(actor, "speed", ctx.n("speedLevel"), ctx.n("speedSeconds"), actor);
            addColaSpeedHook(game, actor, ctx.n("speedSeconds"));
            // Counts as drinking a Bloxy Cola item (item repeat rule).
            actor.res.lastColaTick = game.now;
            game.fx.sound("heal", actor.pos);
            game.fx.particle("spark", { x: actor.pos.x, y: actor.pos.y + 1, z: actor.pos.z });
          },
          { abilityId: COLA, label: "Bloxy Cola", moveMul: ctx.n("drinkMoveMul"), noSprint: true },
        );
      },
    },
    slateskin_potion: {
      can: notBusy,
      isActive(ctx) {
        return (ctx.data as SlateData).active === true;
      },
      hud(ctx) {
        const d = ctx.data as SlateData;
        if (!d.active) return null;
        const left = ctx.actor.statuses.remainingTicks("slateskin", ctx.now) / 20;
        const canEnd = ctx.now - (d.startTick ?? 0) >= ticks(ctx.n("recastAfter"));
        return `${left.toFixed(1)}s${canEnd ? " §a(recast ends)" : ""}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as SlateData;
        // The cooldown starts only when the effect ends (or the drink is lost).
        actor.cooldowns.pause(SLATE);
        game.fx.sound("drink", actor.pos, { pitch: 0.7 });
        game.windup(actor, ctx.n("drinkSeconds"), () => applySlateskin(game, actor), {
          abilityId: SLATE,
          label: "Slateskin Potion",
          moveMul: ctx.n("drinkMoveMul"),
          noSprint: true,
        });
        d.drinking = true;
        d.channelId = actor.channel?.id ?? null;
        return { noCooldown: true };
      },
      release(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as SlateData;
        if (ctx.now - (d.startTick ?? 0) < ticks(ctx.n("recastAfter"))) {
          game.fx.flash([actor.id], `§7Can end Slateskin after ${ctx.n("recastAfter")}s`);
          return;
        }
        endSlateskin(game, actor, true);
      },
    },
    ghostburger: {
      can: notBusy,
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("eat", actor.pos);
        game.windup(
          actor,
          ctx.n("eatSeconds"),
          () => {
            game.status(actor, "undetectable", 1, ctx.n("seconds"), actor);
            game.status(actor, "invisibility", ctx.n("invisLevel"), ctx.n("seconds"), actor);
            castFx(game, actor, "whiteSmoke");
          },
          { abilityId: BURGER, label: "Ghostburger", moveMul: ctx.n("eatMoveMul"), noSprint: true },
        );
      },
    },
  },
};
