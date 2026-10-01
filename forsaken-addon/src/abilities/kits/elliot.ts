// Elliot (wiki, 2026-10-01). Reference survivor kit.
import type { Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { addRes, castFx, killerNear, studs } from "./common";
import { dist2D } from "../../util/vec";

/** Pizza healing after Order Up! (+2 per repaired generator, max +10) and the multi-Elliot penalty. */
export function pizzaHotHeal(game: Game, elliot: Actor): number {
  const ou = elliot.character.passives.find((p) => p.id === "order_up")!.params as Record<string, number>;
  const p = elliot.ability("pizza_throw")!.params as Record<string, number>;
  const bonus = Math.min(ou.maxBonus, ou.perGenerator * game.round.generatorsDone);
  const elliots = game.aliveSurvivors().filter((s) => s.character.id === "elliot").length;
  const eff = Math.max(p.minEffectiveness, 1 - p.multiElliotPenalty * Math.max(0, elliots - 1));
  return (p.hotHeal + bonus) * eff;
}

export const elliotKit: Kit = {
  id: "elliot",
  init(a) {
    const rh = a.ability("rush_hour")!.params as Record<string, number>;
    a.res.rushCharges = rh.startCharges;
    const dr = a.character.passives.find((p) => p.id === "delivers_resolve")!.params as Record<string, number>;
    a.addHooks("delivers_resolve", {
      // Sees the aura of any survivor who takes damage (not Undetectable, not from statuses, not overheal-only).
      anyDamage(self, ev, g) {
        const t = ev.target;
        if (!self.alive || t === self || !t.isSurvivor || ev.kind === "dot" || ev.dealt < 1 || t.statuses.has("undetectable")) return;
        g.reveal(t, [self.id], dr.revealSeconds, { color: "white", source: "delivers_resolve" });
      },
    });
  },
  abilities: {
    pizza_throw: {
      use(ctx) {
        const { game, actor } = ctx;
        castFx(game, actor, "heal");
        const land = game.pointInFront(actor, studs(ctx.n("throwStuds")) * 0.5);
        game.fx.sound("projectile", actor.pos);
        const hot = pizzaHotHeal(game, actor);
        game.spawnObject({
          kind: "pizza",
          owner: actor,
          pos: land,
          radius: 1.1,
          lifeSeconds: ctx.n("lifeSeconds"),
          prop: "pizza",
          propName: "§6Pizza",
          update(o, g) {
            if (g.now % 10 === 0) g.fx.particle("heal", { x: o.pos.x, y: o.pos.y + 0.6, z: o.pos.z }, { to: g.aliveSurvivors().filter((s) => dist2D(s.pos, o.pos) <= studs(ctx.n("highlightStuds"))).map((s) => s.id) });
            for (const s of g.aliveSurvivors()) {
              if (s === actor || s.character.id === "veeronica" || s.hp >= s.maxHp) continue;
              if (dist2D(s.pos, o.pos) > o.radius + 0.4) continue;
              const healed = g.heal(s, ctx.n("instantHeal"), actor);
              g.status(s, "regeneration", 1, ctx.n("hotSeconds") + 1, actor, { mode: "replace", data: { perSecond: hot / ctx.n("hotSeconds"), remaining: hot, cancelAt: ctx.n("cancelDamage") } });
              g.fx.sound("eat", s.pos);
              if (healed > 0 || hot > 0) addRes(actor, "rushCharges", 1, (actor.ability("rush_hour")!.params as Record<string, number>).maxCharges);
              g.removeObject(o, "consumed");
              return;
            }
          },
        });
      },
    },
    rush_hour: {
      hud(ctx) {
        return `x${ctx.actor.res.rushCharges ?? 0}${killerNear(ctx.game, ctx.actor.pos, studs(ctx.n("rangeStuds"))) ? " §cNEAR" : ""}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const charges = actor.res.rushCharges ?? 0;
        const near = killerNear(game, actor.pos, studs(ctx.n("rangeStuds")));
        game.fx.sound("abilityCast", actor.pos);
        if (near && charges > 0) {
          actor.res.rushCharges = 0;
          game.status(actor, "speed", charges, ctx.n("seconds"), actor);
          actor.flags.add("noOnHitSpeed");
          game.schedule(actor, ctx.n("seconds"), () => {
            actor.flags.delete("noOnHitSpeed");
            if (charges >= ctx.n("exhaustedMinCharges")) game.status(actor, "exhausted", ctx.n("exhaustedLevel"), ctx.n("exhaustedSeconds"), actor);
          });
        } else {
          // Outside the terror radius no charges are spent and no Exhausted is applied [assumed: Speed I].
          game.status(actor, "speed", 1, ctx.n("seconds"), actor);
        }
      },
    },
  },
};
