// Slasher (wiki, 2026-10-01). Reference killer kit.
import type { Kit, AbilityCtx } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { basicAttack, knockback, meleeTargets, swing } from "./common";
import { ticks } from "../../core/scale";

const ENRAGED = "enraged";

function enraged(a: Actor): boolean {
  return a.flags.has(ENRAGED);
}

function endEnraged(game: Game, a: Actor): void {
  if (!enraged(a)) return;
  const p = a.ability("raging_pace")!.params as Record<string, number>;
  a.flags.delete(ENRAGED);
  a.removeMoveMod("enraged");
  a.staminaCap = null;
  game.removeStatus(a, "stun_immune");
  // Invulnerability lingers 1.5 s after ENRAGED ends (wiki Status Effects).
  a.statuses.setEnd("invincible", game.now + ticks(p.lingerInvulnerable));
  a.data("raging_pace").endTick = 0;
  game.fx.flash([a.id], "§7ENRAGED ended");
}

export const slasherKit: Kit = {
  id: "slasher",
  init(a, game) {
    const fc = a.character.passives.find((p) => p.id === "final_chapter")!.params as Record<string, number>;
    a.addHooks("final_chapter", {
      afterStunned(self, _secs, _src, g) {
        // Resistance IV for 10 s after being stunned (applies to damage after the stunning hit).
        g.schedule(self, 0.05, () => g.status(self, "resistance", fc.resistanceLevel, fc.seconds, self));
      },
      abilityUsed(self, abilityId, g) {
        // ENRAGED ends immediately when another ability is used.
        if (abilityId !== "raging_pace" && enraged(self)) endEnraged(g, self);
      },
    });
    void game;
  },
  tick(a, game) {
    const d = a.data<{ endTick?: number; startTick?: number }>("raging_pace");
    if (!enraged(a)) return;
    const p = a.ability("raging_pace")!.params as Record<string, number>;
    const t = (game.now - (d.startTick ?? game.now)) / 20;
    // Stamina gradually caps at 70 over 6.5 s.
    const frac = Math.min(1, t / p.staminaCapSeconds);
    a.staminaCap = a.staminaMax - (a.staminaMax - p.staminaCap) * frac;
    if (game.now >= (d.endTick ?? 0)) endEnraged(game, a);
  },
  cooldownFor(a, abilityId, base) {
    if (!enraged(a)) return base;
    const p = a.ability(abilityId)?.params as Record<string, number> | undefined;
    return p?.enragedCooldown ?? base;
  },
  abilities: {
    slash: {
      use(ctx) {
        const { game, actor } = ctx;
        const isEnraged = enraged(actor);
        const dmg = isEnraged ? ctx.n("enragedDamage") : ctx.n("damage");
        if (isEnraged) game.lunge(actor, ctx.n("enragedLungeStuds"), 0.3);
        basicAttack(ctx, dmg, (t) => game.status(t, "bleeding", ctx.n("bleedLevel"), ctx.n("bleedSeconds"), actor));
      },
    },
    behead: {
      use(ctx) {
        const { game, actor } = ctx;
        const isEnraged = enraged(actor);
        const lungeStuds = isEnraged ? ctx.n("enragedLungeStuds") : actor.state.speed > 0.05 ? ctx.n("movingLungeStuds") : 0;
        let killed = false;
        swing(ctx, {
          windup: ctx.n("windup"),
          rangeStuds: ctx.n("rangeStuds"),
          halfAngle: ctx.n("halfAngle"),
          abilityId: "behead",
          objectDamage: 25,
          lunge: lungeStuds > 0 ? { studs: lungeStuds, seconds: 0.3 } : undefined,
          onHit(t) {
            const ev = game.damage(t, isEnraged ? ctx.n("enragedDamage") : ctx.n("damage"), actor, { kind: "ability", abilityId: "behead", tags: ["melee"] });
            if (ev.killed) killed = true;
            else if (!ev.cancelled) game.status(t, "helpless", 1, ctx.n("helplessSeconds"), actor);
          },
          after() {
            // Slowness I 2 s and a brief immobilisation, hit or miss — but not after a kill.
            if (!killed) {
              game.status(actor, "slowness", ctx.n("selfSlowLevel"), ctx.n("selfSlowSeconds"), actor);
              actor.addMoveMod({ id: "behead_recover", endTick: game.now + ticks(ctx.n("immobileSeconds")), frozen: true });
            }
          },
        });
      },
    },
    gashing_wound: {
      use(ctx) {
        const { game, actor } = ctx;
        const total = enraged(actor) ? ctx.n("enragedTotalDamage") : ctx.n("totalDamage");
        const fractions = ctx.param<number[]>("hitFractions");
        const interval = ctx.n("hitInterval");
        // Slasher is immobilised for 4.5 s after using it, hit or miss.
        actor.addMoveMod({ id: "gashing_endlag", endTick: game.now + ticks(ctx.n("windup") + ctx.n("endlagSeconds")), frozen: true });
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            const target = meleeTargets(game, actor, { rangeStuds: ctx.n("rangeStuds"), halfAngle: ctx.n("halfAngle"), single: true })[0];
            if (!target) {
              game.fx.sound("swing", actor.pos);
              return;
            }
            // Grab: lock the survivor, Slasher stun-immune for the combo + 1.5 s.
            const comboSeconds = interval * fractions.length;
            game.status(actor, "stun_immune", 1, comboSeconds + ctx.n("stunImmuneAfter"), actor);
            target.addMoveMod({ id: "grabbed", endTick: game.now + ticks(comboSeconds), frozen: true });
            target.flags.add("grabbed");
            fractions.forEach((f, i) => {
              game.schedule(actor, interval * i, () => {
                if (!target.alive || !actor.alive) return;
                const last = i === fractions.length - 1;
                game.damage(target, total * f, actor, { kind: "ability", abilityId: "gashing_wound", tags: ["melee", "grab"], bypassInvincible: false });
                game.fx.particle("blood", { x: target.pos.x, y: target.pos.y + 1.2, z: target.pos.z });
                if (last) {
                  target.removeMoveMod("grabbed");
                  target.flags.delete("grabbed");
                  if (target.alive) knockback(target, actor.pos, 3, 0.4);
                }
              });
            });
          },
          { abilityId: "gashing_wound", label: "Gashing Wound" },
        );
      },
    },
    raging_pace: {
      use(ctx: AbilityCtx) {
        const { game, actor } = ctx;
        const dur = ctx.n("durationSeconds");
        actor.flags.add(ENRAGED);
        ctx.data.startTick = game.now;
        ctx.data.endTick = game.now + ticks(dur);
        actor.addMoveMod({ id: "enraged", endTick: game.now + ticks(dur), walkStuds: ctx.n("walkSpeed"), sprintStuds: ctx.n("walkSpeed"), noSprint: true });
        game.fx.sound("roar", actor.pos);
        game.fx.title([actor.id], "§4ENRAGED", "§7Slash and Behead lunge", 30);
        // Nearest survivor's aura for 14 s (lasts even if ENRAGED ends early).
        const nearest = game.nearestEnemy(actor, Infinity, (t) => t.isSurvivor);
        if (nearest) game.reveal(nearest, [actor.id], ctx.n("revealSeconds"), { color: "red", source: "raging_pace" });
        // Stun immunity and attack immunity from 0.3 s after use.
        game.schedule(actor, ctx.n("stunImmuneDelay"), () => {
          if (!enraged(actor)) return;
          const left = ((ctx.data.endTick as number) - game.now) / 20;
          game.status(actor, "stun_immune", 1, left, actor);
          game.status(actor, "invincible", 1, left + ctx.n("lingerInvulnerable"), actor);
        });
      },
    },
  },
};
