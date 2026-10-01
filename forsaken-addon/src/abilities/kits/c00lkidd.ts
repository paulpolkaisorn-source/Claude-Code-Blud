// c00lkidd (wiki, 2026-10-01): Tag, Corrupt Nature, Walkspeed Override, Pizza Delivery. No passive.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor, ForcedMove } from "../../entities/actor";
import type { Game } from "../../core/game";
import { spawnProjectile } from "../objects";
import { ACTOR_RADIUS } from "../hit";
import { basicAttack, blocks, knockback, projSpeed } from "./common";
import { character } from "../../characters/roster";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, rotateY, scale, sub, type Vec3 } from "../../util/vec";

/** Horizontal distance (blocks, center to center) at which a minion touches a survivor. */
const MINION_CONTACT = ACTOR_RADIUS * 2 + 0.3;

type WsoData = {
  /** "windup" while standing still, "dash" while lunging. */
  phase?: "windup" | "dash" | null;
};

interface PizzaBot {
  id: string;
  endTick: number;
}

type PizzaData = {
  bots?: PizzaBot[];
};

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

/** Horizontal aim direction (falls back to the body yaw when looking straight up/down). */
function aim(a: Actor): Vec3 {
  const f = flat(a.facing);
  return f.x === 0 && f.z === 0 ? { x: 0, y: 0, z: 1 } : f;
}

/** True while Walkspeed Override is standing still or dashing: no other ability can be used. */
export function inWalkspeedOverride(a: Actor): boolean {
  const p = a.data<WsoData>("walkspeed_override").phase;
  return p === "windup" || p === "dash";
}

/** No other cast while winding something up or dashing. */
function notBusy(ctx: AbilityCtx): true | string {
  return inWalkspeedOverride(ctx.actor) || ctx.actor.channel ? "busy" : true;
}

function pizzaBots(a: Actor): PizzaBot[] {
  const d = a.data<PizzaData>("pizza_delivery");
  if (!d.bots) d.bots = [];
  return d.bots;
}

/** Nearest living survivor a minion may hunt (Undetectable is ignored by minions). */
function nearestHuntable(game: Game, from: Vec3): { target: Actor | null; dist: number } {
  let target: Actor | null = null;
  let best = Infinity;
  for (const s of game.aliveSurvivors()) {
    if (s.statuses.has("undetectable")) continue;
    const d = dist2D(s.pos, from);
    if (d < best) {
      best = d;
      target = s;
    }
  }
  return { target, dist: best };
}

function startDash(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = ctx.data as WsoData;
  const radius = blocks(ctx.n("hitRadiusStuds"));
  d.phase = "dash";
  game.fx.sound("zap", actor.pos);
  const fm: ForcedMove = game.dash(actor, {
    id: "walkspeed_override",
    // Fixed speed: forced movement ignores Speed/Slowness. Stamina keeps regenerating unless sprint is held.
    studsPerSecond: ctx.n("dashStudsPerSecond"),
    seconds: ctx.n("dashSeconds"),
    turnRate: ctx.n("turnRateDegPerTick"),
    onTick: () => {
      const move = fm;
      game.fx.particle("fire", add(actor.pos, { x: 0, y: 0.8, z: 0 }));
      const touched = game.enemiesOf(actor).filter((t) => !move.hit.has(t.id) && dist2D(t.pos, actor.pos) <= radius && Math.abs(t.pos.y - actor.pos.y) <= 2);
      if (touched.length === 0) return;
      // He halts and slashes everyone he collided with (several survivors if they stand together).
      let landed = false;
      for (const t of touched) {
        move.hit.add(t.id);
        const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "walkspeed_override", tags: ["melee"] });
        if (ev.cancelled) continue;
        landed = true;
        game.status(t, "burning", ctx.n("burnLevel"), ctx.n("burnSeconds"), actor);
        // Knockback follows the direction he is dashing/facing.
        if (t.alive) knockback(t, sub(t.pos, move.dir), blocks(ctx.n("knockbackStuds")), 0.35);
        game.reveal(t, [actor.id], ctx.n("revealSeconds"), { color: "yellow", source: "walkspeed_override" });
        // Short slowdown without a status icon (undocumented wiki note).
        t.addMoveMod({ id: "wso_hit", endTick: game.now + ticks(ctx.n("hitSlowSeconds")), mul: ctx.n("hitSlowMul") });
        game.fx.particle("fire", add(t.pos, { x: 0, y: 1.2, z: 0 }));
      }
      game.fx.sound("explosion", actor.pos);
      if (landed) game.invulnerable(actor, ctx.n("iframesSeconds"));
      return false;
    },
    onWall: () => {
      // Crashing into a wall leaves him dazed and slow for a moment.
      game.fx.sound("explosion", actor.pos);
      game.fx.particle("smoke", add(actor.pos, { x: 0, y: 1, z: 0 }));
      actor.addMoveMod({ id: "wso_crash", endTick: game.now + ticks(ctx.n("crashSlowSeconds")), mul: ctx.n("crashMoveMul"), noSprint: true });
      game.fx.flash([actor.id], "§cCRASH!");
    },
    onEnd: () => {
      d.phase = null;
    },
  });
}

function spawnPizzaBots(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const count = ctx.n("minions");
  const dir = aim(actor);
  const def = character("minion_pizza_bot");
  game.fx.sound("explosion", actor.pos);
  game.fx.particle("fire", add(actor.pos, { x: 0, y: 0.3, z: 0 }));
  for (let i = 0; i < count; i++) {
    // Fan out left/right in front of him.
    const ang = count === 1 ? 0 : -60 + (120 * i) / (count - 1);
    const want = add(actor.pos, scale(rotateY(dir, ang), 1.2));
    const cell = game.grid.nearestWalkable(game.grid.toGrid(want), 4) ?? game.grid.toGrid(actor.pos);
    const pos = { ...game.grid.toWorld(cell), y: actor.pos.y };
    const bot = game.spawnMinion({ owner: actor, character: def, pos, name: "§cPizza Delivery", hp: ctx.n("minionHp"), flags: ["hittableMinion", "pizzaBot"] });
    bot.addMoveMod({ id: "pizza_speed", endTick: Infinity, walkStuds: ctx.n("speedStuds"), sprintStuds: ctx.n("farSpeedStuds") });
    pizzaBots(actor).push({ id: bot.id, endTick: game.now + ticks(ctx.n("lifeSeconds")) });
    game.fx.sound("minion", pos);
  }
}

/** Pizza bots hunt the nearest survivor, explode on contact and expire after 35 s. */
function drivePizzaBots(a: Actor, game: Game): void {
  const list = pizzaBots(a);
  if (list.length === 0) return;
  const p = params(a, "pizza_delivery");
  const farRange = blocks(p.farRangeStuds);
  const keep: PizzaBot[] = [];
  for (const entry of list) {
    const bot = game.get(entry.id);
    if (!bot || !bot.alive) continue;
    if (game.now >= entry.endTick) {
      game.fx.particle("smoke", add(bot.pos, { x: 0, y: 1, z: 0 }));
      game.despawnMinion(bot);
      continue;
    }
    // Contact with any (detectable) survivor.
    const victim = game.aliveSurvivors().find((s) => !s.statuses.has("undetectable") && dist2D(s.pos, bot.pos) <= MINION_CONTACT && Math.abs(s.pos.y - bot.pos.y) <= 1.5);
    if (victim) {
      const ev = game.damage(victim, p.damage, a, { kind: "minion", abilityId: "pizza_delivery", tags: ["minion"] });
      if (!ev.cancelled) {
        game.status(victim, "burning", p.burnLevel, p.burnSeconds, a);
        game.status(victim, "slowness", p.slowLevel, p.slowSeconds, a);
        game.reveal(victim, [a.id], p.revealSeconds, { color: "yellow", source: "pizza_delivery" });
      }
      game.fx.sound("explosion", bot.pos);
      game.fx.particle("explosion", add(bot.pos, { x: 0, y: 1, z: 0 }));
      game.despawnMinion(bot);
      continue;
    }
    const { target, dist } = nearestHuntable(game, bot.pos);
    if (!target) {
      bot.input.moveDir = null;
      bot.input.wantSprint = false;
      bot.input.lookAt = null;
    } else {
      // 14 studs/s, 19.5 while the nearest survivor is farther than 70 studs.
      bot.input.moveDir = game.navDirection(bot, target.pos, 0.1);
      bot.input.wantSprint = dist > farRange;
      bot.input.lookAt = add(target.pos, { x: 0, y: 1.5, z: 0 });
    }
    keep.push(entry);
  }
  a.data<PizzaData>("pizza_delivery").bots = keep;
}

export const c00lkiddKit: Kit = {
  id: "c00lkidd",
  tick(a, game) {
    drivePizzaBots(a, game);
  },
  abilities: {
    tag: {
      can: notBusy,
      use(ctx) {
        basicAttack(ctx, ctx.n("damage"));
      },
    },
    corrupt_nature: {
      can: notBusy,
      use(ctx) {
        const { game, actor } = ctx;
        const dir = aim(actor);
        game.fx.sound("projectile", actor.pos);
        // A spinning 2x1x2 part that passes through walls and survivors (one throw can hit several).
        spawnProjectile(game, {
          owner: actor,
          kind: "corrupt_nature",
          pos: add(actor.pos, { x: dir.x * 0.8, y: 1.0, z: dir.z * 0.8 }),
          vel: scale(dir, projSpeed(ctx.n("projectileStudsPerSecond"))),
          radius: blocks(ctx.n("radiusStuds")),
          lifeSeconds: ctx.n("lifeSeconds"),
          throughWalls: true,
          pierce: true,
          hit: "enemies",
          hitMinions: true,
          prop: "corrupt_cube",
          particle: "smoke",
          onHitActor(_o, t, g) {
            const ev = g.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "corrupt_nature", tags: ["projectile"] });
            if (!ev.cancelled) {
              g.status(t, "slowness", ctx.n("slowLevel"), ctx.n("slowSeconds"), actor);
              g.reveal(t, [actor.id], ctx.n("revealSeconds"), { color: "yellow", source: "corrupt_nature" });
            }
            return true;
          },
        });
      },
    },
    walkspeed_override: {
      can: notBusy,
      hud(ctx) {
        const p = (ctx.data as WsoData).phase;
        return p === "dash" ? "§6DASH" : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as WsoData;
        d.phase = "windup";
        game.fx.sound("windup", actor.pos);
        game.fx.flash([actor.id], "§acl1ck 4 SPEED!1!!", 20);
        // Stand still for 0.5 s (a stun here cancels the dash).
        game.windup(actor, ctx.n("standStillSeconds"), () => startDash(ctx), {
          abilityId: "walkspeed_override",
          label: ctx.def.name,
          frozen: true,
          onCancel: () => {
            d.phase = null;
          },
        });
      },
    },
    pizza_delivery: {
      can: notBusy,
      hud(ctx) {
        const n = pizzaBots(ctx.actor).filter((b) => ctx.game.get(b.id)?.alive).length;
        return n > 0 ? `${n} bots` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("windup"), () => spawnPizzaBots(ctx), { abilityId: "pizza_delivery", label: ctx.def.name, moveMul: ctx.n("windupMoveMul") });
      },
    },
  },
};
