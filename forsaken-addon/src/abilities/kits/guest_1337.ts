// Guest 1337 (wiki, 2026-10-01; revamp 4.1.6 + 5.0.0 values): Made to Last (+10 HP, already in data),
// Self Sacrifice (hit priority), Block, Charge, Punch / Parry Punch.
import type { Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { DamageEvent } from "../../entities/hooks";
import { config } from "../../core/config";
import { studs, ticks, toStuds } from "../../core/scale";
import { dist2D } from "../../util/vec";
import { knockback, swing } from "./common";

interface BlockData extends Record<string, unknown> {
  blockId?: number;
  lockUntil?: number;
  /** Resistance he had before blocking (restored when the block's Resistance V ends). */
  prevResLevel?: number;
  prevResEnd?: number;
}

function params(a: Actor, id: string): Record<string, number> {
  return a.ability(id)!.params as Record<string, number>;
}

function selfSacrifice(a: Actor): Record<string, number> {
  return a.character.passives.find((p) => p.id === "self_sacrifice")!.params as Record<string, number>;
}

/** Knockback is reduced by 10% for each other living Guest 1337. */
function knockbackScale(game: Game, a: Actor, cutPerGuest: number): number {
  const others = game.aliveSurvivors().filter((s) => s !== a && s.character.id === "guest_1337").length;
  return Math.max(0, 1 - cutPerGuest * others);
}

export function parryReady(game: Game, a: Actor): boolean {
  return ((a.data("punch").parryUntil as number | undefined) ?? 0) > game.now;
}

/** Ends the blocking window: Resistance V goes away (an earlier Resistance that is still running comes back). */
function endBlock(game: Game, a: Actor): void {
  a.flags.delete("blocking");
  a.removeHooks("block");
  a.hitPriority = selfSacrifice(a).priority;
  const d = a.data<BlockData>("block");
  game.removeStatus(a, "resistance");
  const left = (d.prevResEnd ?? 0) - game.now;
  if ((d.prevResLevel ?? 0) > 0 && left > 0) game.status(a, "resistance", d.prevResLevel!, left === Infinity ? 0 : left / 20, a);
  d.prevResLevel = 0;
  d.prevResEnd = 0;
}

function blockSucceeded(game: Game, self: Actor, ev: DamageEvent, attacker: Actor): void {
  const bp = params(self, "block");
  ev.cancelled = true;
  ev.cancelReason = "blocked";
  // The Resistance V and the block slow end; +10 overheal that stacks to 30 and never decays.
  endBlock(game, self);
  self.removeMoveMod("block_slow");
  const current = self.shield("block_overheal")?.amount ?? 0;
  game.shield(self, "block_overheal", Math.min(bp.overhealMax, current + bp.overheal), { max: bp.overhealMax });
  game.status(self, "speed", bp.speedLevel, bp.speedSeconds, self);
  game.status(self, "strength", bp.strengthLevel, bp.strengthSeconds, self);
  // The killer is slowed 30% for 1 s.
  attacker.addMoveMod({ id: "guest_block_slow", endTick: game.now + ticks(bp.killerSlowSeconds), mul: bp.killerSlowMul });
  // Punch's cooldown resets and the next Punch is a Parry Punch.
  self.cooldowns.reset("punch");
  self.data("punch").parryUntil = game.now + ticks(bp.parryWindowSeconds);
  game.fx.sound("block", self.pos);
  game.fx.particle("hitSpark", { x: self.pos.x, y: self.pos.y + 1.3, z: self.pos.z });
  game.fx.flash([self.id], "§eBLOCKED! §6Parry Punch ready");
  game.fx.flash([attacker.id], "§cBlocked!");
}

function blockBroken(game: Game, self: Actor, ev: DamageEvent): void {
  const bp = params(self, "block");
  // The block breaks: the hit lands at -40% (without the Resistance V), then Resistance II 3 s.
  endBlock(game, self);
  ev.multiplier *= bp.failMul;
  game.schedule(self, 0.05, () => game.status(self, "resistance", bp.failResistLevel, bp.failResistSeconds, self));
  // Abilities are silently locked for ~2 s after a failed block.
  const d = self.data<BlockData>("block");
  const until = game.now + ticks(bp.failLockSeconds);
  d.lockUntil = until;
  self.flags.add("locked");
  game.schedule(self, bp.failLockSeconds, () => {
    if (game.now >= (d.lockUntil ?? 0)) self.flags.delete("locked");
  });
  game.fx.sound("glitch", self.pos, { pitch: 1.6 });
  game.fx.flash([self.id], "§cBlock broken");
}

export const guest1337Kit: Kit = {
  id: "guest_1337",
  init(a) {
    // Self Sacrifice: Guest takes the hit when survivors are stacked (3 while blocking).
    a.hitPriority = selfSacrifice(a).priority;
    a.data("charge").locks = {};
  },
  tick(a, game) {
    // Charge can be cancelled by starting a generator.
    if (a.forced?.id === "charge" && a.input.repairTarget) {
      const g = game.generators.find((x) => x.id === a.input.repairTarget);
      if (g && !g.completed && dist2D(a.pos, { x: g.block.x + 0.5, y: g.block.y, z: g.block.z + 0.5 }) <= config().match.repairRangeBlocks) {
        a.data("charge").cancelled = true;
        game.endForced(a, "cancel");
      }
    }
  },
  abilities: {
    block: {
      hud(ctx) {
        const oh = ctx.actor.shield("block_overheal")?.amount ?? 0;
        return oh > 0 ? `+${Math.round(oh)}` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as BlockData;
        const id = (d.blockId ?? 0) + 1;
        d.blockId = id;
        const resist = ctx.n("resistSeconds");
        const prev = actor.statuses.get("resistance");
        d.prevResLevel = prev && prev.endTick > game.now ? prev.level : 0;
        d.prevResEnd = prev ? prev.endTick : 0;
        game.status(actor, "resistance", 5, resist, actor, { mode: "replace" });
        actor.addMoveMod({ id: "block_slow", endTick: game.now + ticks(ctx.n("slowSeconds")), mul: ctx.n("moveMul") });
        actor.flags.add("blocking");
        actor.hitPriority = selfSacrifice(actor).blockingPriority;
        actor.removeHooks("block");
        // One block covers one attack.
        actor.addHooks(
          "block",
          {
            beforeTakeDamage(self, ev, g) {
              if (!self.flags.has("blocking")) return;
              const src = ev.source;
              if (!src || src.team === self.team) return;
              if (ev.kind === "basic") blockSucceeded(g, self, ev, src);
              else if (ev.kind === "ability" || ev.kind === "minion") blockBroken(g, self, ev);
            },
          },
          game.now + ticks(resist),
        );
        game.schedule(actor, resist, () => {
          if (d.blockId === id && actor.flags.has("blocking")) endBlock(game, actor);
        });
        game.fx.sound("block", actor.pos, { pitch: 0.8 });
      },
    },
    charge: {
      hud(ctx) {
        const k = ctx.game.killer;
        const lock = k ? (((ctx.data.locks as Record<string, number>) ?? {})[k.id] ?? 0) - ctx.now : 0;
        return lock > 0 ? `§c${Math.ceil(lock / 20)}s` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const start = game.now;
        const locks = ((ctx.data.locks as Record<string, number> | undefined) ??= {});
        const hitRadius = studs(ctx.n("hitRadiusStuds"));
        let contact = false;
        ctx.data.cancelled = false;
        game.fx.sound("roar", actor.pos, { pitch: 1.4 });
        game.dash(actor, {
          id: "charge",
          dir: actor.facing,
          studsPerSecond: ctx.n("studsPerSecond"),
          seconds: ctx.n("seconds"),
          turnRate: ctx.n("turnRateDegPerTick"),
          noStaminaRegen: true,
          stopOnStun: true,
          onTick: () => {
            const k = game.killer;
            if (!k || !k.alive || dist2D(actor.pos, k.pos) > hitRadius || Math.abs(k.pos.y - actor.pos.y) > 2) return;
            contact = true;
            // A killer charged within the last 20 s: the charge does nothing.
            if ((locks[k.id] ?? 0) > game.now) {
              game.fx.sound("trap", actor.pos);
              return false;
            }
            locks[k.id] = game.now + ticks(ctx.n("lockoutSeconds"));
            game.damage(k, ctx.n("damage"), actor, { kind: "ability", abilityId: "charge", tags: ["melee"] });
            // Knockback grows from 6 to 11 studs over the first 0.5 s of the charge.
            const built = Math.min(1, (game.now - start) / 20 / ctx.n("buildSeconds"));
            const kbStuds = (ctx.n("knockbackMinStuds") + (ctx.n("knockbackMaxStuds") - ctx.n("knockbackMinStuds")) * built) * knockbackScale(game, actor, ctx.n("knockbackCutPerGuest"));
            knockback(k, actor.pos, studs(kbStuds), 0.35);
            game.status(actor, "resistance", ctx.n("resistLevel"), ctx.n("resistSeconds"), actor);
            game.fx.sound("hitKiller", k.pos);
            game.fx.particle("roar", { x: k.pos.x, y: k.pos.y + 1, z: k.pos.z });
            return false;
          },
          onEnd: () => {
            if (contact || ctx.data.cancelled) return;
            // Miss (time out or wall): Slowness II for 3×distance/13 s, 3–15 s; none when he ends next to the killer.
            const k = game.killer;
            if (!k || !k.alive) return;
            const dStuds = toStuds(dist2D(actor.pos, k.pos));
            if (dStuds <= ctx.n("hitRadiusStuds")) return;
            const secs = Math.max(ctx.n("missMin"), Math.min(ctx.n("missMax"), (3 * dStuds) / 13));
            game.status(actor, "slowness", ctx.n("missSlowLevel"), secs, actor);
          },
        });
      },
    },
    punch: {
      hud(ctx) {
        return parryReady(ctx.game, ctx.actor) ? "§ePARRY" : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const parry = parryReady(game, actor);
        ctx.data.parryUntil = 0;
        const cut = knockbackScale(game, actor, ctx.n("knockbackCutPerGuest"));
        if (parry) {
          // Parry Punch: Resistance II during a 0.4 s windup, piercing hitbox, 35 damage (42 with Strength I), 2 s stun.
          game.status(actor, "resistance", 2, ctx.n("parryWindup"), actor);
          swing(ctx, {
            windup: ctx.n("parryWindup"),
            rangeStuds: ctx.n("rangeStuds"),
            halfAngle: ctx.n("halfAngle"),
            abilityId: "punch",
            onHit(t) {
              const ev = game.damage(t, ctx.n("parryDamage"), actor, { kind: "ability", abilityId: "punch", tags: ["melee"] });
              if (ev.cancelled || !t.alive) return;
              game.stun(t, ctx.n("parryStunSeconds"), actor);
              knockback(t, actor.pos, studs(ctx.n("parryKnockbackStuds")) * cut, 0.35);
            },
          });
          return;
        }
        // Regular Punch: single target, no stun.
        swing(ctx, {
          windup: ctx.n("windup"),
          rangeStuds: ctx.n("rangeStuds"),
          halfAngle: ctx.n("halfAngle"),
          abilityId: "punch",
          single: true,
          onHit(t) {
            const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "punch", tags: ["melee"] });
            if (ev.cancelled || !t.alive) return;
            game.status(t, "helpless", 1, ctx.n("helplessSeconds"), actor);
            game.status(t, "slowness", ctx.n("slowLevel"), ctx.n("slowSeconds"), actor);
            knockback(t, actor.pos, studs(ctx.n("knockbackStuds")) * cut, 0.3);
          },
        });
      },
    },
  },
};
