// Shedletsky (wiki, 2026-10-01): Slash, Fried Chicken. No passive.
import type { Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import { meleeReach, ticks } from "../../core/scale";
import { add, flat, scale } from "../../util/vec";
import { meleeTargets } from "./common";

function chickenParams(a: Actor): Record<string, number> {
  return a.ability("fried_chicken")!.params as Record<string, number>;
}

export const shedletskyKit: Kit = {
  id: "shedletsky",
  init(a) {
    // Fried Chicken: 2 per round.
    a.res.chicken = chickenParams(a).charges;
  },
  abilities: {
    slash: {
      use(ctx) {
        const { game, actor } = ctx;
        const windup = ctx.n("windup");
        // Resistance II during the 0.55 s windup; slowed 75% for 1.4 s.
        game.status(actor, "resistance", ctx.n("resistLevel"), windup, actor);
        actor.addMoveMod({ id: "shed_slash_slow", endTick: game.now + ticks(ctx.n("selfSlowSeconds")), mul: ctx.n("selfSlowMul") });
        game.fx.sound("swing", actor.pos, { pitch: 1.1 });
        const hit = new Set<string>();
        const opts = { rangeStuds: ctx.n("rangeStuds"), halfAngle: ctx.n("halfAngle") };
        const check = () => {
          if (!actor.alive) return;
          for (const t of meleeTargets(game, actor, opts)) {
            if (hit.has(t.id)) continue;
            hit.add(t.id);
            const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "slash", tags: ["melee"] });
            if (!ev.cancelled && t.alive) game.stun(t, ctx.n("stunSeconds"), actor);
          }
        };
        game.windup(
          actor,
          windup,
          () => {
            check();
            game.damageObjectsInArc(actor, meleeReach(opts.rangeStuds), opts.halfAngle, ctx.n("damage"));
            game.fx.particle("hitSpark", add(actor.pos, add(scale(flat(actor.facing), 1.2), { x: 0, y: 1.2, z: 0 })));
            // The hitbox lingers 0.4 s (each target is hit once).
            const linger = ticks(ctx.n("lingerSeconds"));
            for (let i = 1; i <= linger; i++) game.schedule(actor, i / 20, check, { stunCancels: true });
          },
          { abilityId: "slash", label: "Slash" },
        );
      },
    },
    fried_chicken: {
      can(ctx) {
        if ((ctx.actor.res.chicken ?? 0) <= 0) return "no chicken left";
        if (ctx.actor.hp >= ctx.actor.maxHp) return "full HP";
        return true;
      },
      hud(ctx) {
        return `x${ctx.actor.res.chicken ?? 0}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        actor.res.chicken = (actor.res.chicken ?? 0) - 1;
        game.heal(actor, ctx.n("instantHeal"), actor);
        // 25 more over 10 s, cancelled by 5+ damage.
        const hot = ctx.n("hotHeal");
        const secs = ctx.n("hotSeconds");
        game.status(actor, "regeneration", 1, secs + 1, actor, { mode: "replace", data: { perSecond: hot / secs, remaining: hot, cancelAt: ctx.n("cancelDamage") } });
        actor.addMoveMod({ id: "fried_chicken_slow", endTick: game.now + ticks(ctx.n("slowSeconds")), mul: ctx.n("slowMul") });
        game.fx.sound("eat", actor.pos);
        game.fx.particle("heal", { x: actor.pos.x, y: actor.pos.y + 1.8, z: actor.pos.z });
      },
    },
  },
};
