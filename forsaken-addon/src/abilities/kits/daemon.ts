// Daemon (ORIGINAL killer for this addon, brief §4.3): Uptime, Ping, Fork, Segfault, Kill -9.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { ACTOR_RADIUS, eye } from "../hit";
import { basicAttack, enemiesInRadius } from "./common";
import { character } from "../../characters/roster";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, len2D, rotateY, scale, sub, type Vec3 } from "../../util/vec";

/** Horizontal distance (blocks, center to center) at which a decoy touches a survivor. */
const DECOY_CONTACT = ACTOR_RADIUS * 2 + 0.3;

interface Decoy {
  id: string;
  dir: Vec3;
  endTick: number;
}

type ForkData = {
  decoys?: Decoy[];
};

function passive(a: Actor, id: string): Record<string, number> {
  return a.character.passives.find((p) => p.id === id)!.params as Record<string, number>;
}

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

function aim(a: Actor): Vec3 {
  const f = flat(a.facing);
  return f.x === 0 && f.z === 0 ? { x: 0, y: 0, z: 1 } : f;
}

function idle(ctx: AbilityCtx): true | string {
  return ctx.actor.channel ? "busy" : true;
}

function decoys(a: Actor): Decoy[] {
  const d = a.data<ForkData>("fork");
  if (!d.decoys) d.decoys = [];
  return d.decoys;
}

/** Survivors Daemon can see on his HUD: Flagged and within the Uptime range, nearest first. */
export function flaggedInRange(game: Game, a: Actor): Actor[] {
  const range = passive(a, "uptime").hudRangeBlocks;
  return game
    .aliveSurvivors()
    .filter((s) => s.statuses.has("flagged") && dist2D(s.pos, a.pos) <= range)
    .sort((x, y) => dist2D(x.pos, a.pos) - dist2D(y.pos, a.pos));
}

/** Nearest Flagged survivor (Undetectable ones are not tracked). */
function nearestFlagged(game: Game, a: Actor): Actor | null {
  let best: Actor | null = null;
  let bd = Infinity;
  for (const s of game.aliveSurvivors()) {
    if (!s.statuses.has("flagged") || s.statuses.has("undetectable")) continue;
    const d = dist2D(s.pos, a.pos);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/** The survivor Kill -9 would terminate right now: Flagged, within range, at or under the HP threshold, in sight. */
export function kill9Target(game: Game, a: Actor): Actor | null {
  const p = params(a, "kill_9");
  let best: Actor | null = null;
  let bd = Infinity;
  for (const s of game.aliveSurvivors()) {
    if (!s.statuses.has("flagged")) continue;
    if (s.hp > s.maxHp * p.hpThreshold) continue;
    const d = dist2D(s.pos, a.pos);
    if (d > p.rangeBlocks || d >= bd) continue;
    if (!game.lineOfSight(eye(a), eye(s))) continue;
    bd = d;
    best = s;
  }
  return best;
}

/** Uptime: +5% speed while moving toward the nearest Flagged survivor (refreshed every tick). */
function uptimeTick(a: Actor, game: Game): void {
  const up = passive(a, "uptime");
  const target = nearestFlagged(game, a);
  let toward = false;
  if (target) {
    const moved = sub(a.pos, a.lastPos);
    const dir = len2D(moved) > 0.01 ? flat(moved) : a.isBot && a.input.moveDir ? flat(a.input.moveDir) : null;
    const to = flat(sub(target.pos, a.pos));
    if (dir && dir.x * to.x + dir.z * to.z >= Math.cos((up.towardHalfAngle * Math.PI) / 180)) toward = true;
  }
  if (toward) a.addMoveMod({ id: "uptime", endTick: game.now + 2, mul: 1 + up.speedBonus });
  else a.removeMoveMod("uptime");
}

/** Decoys run in straight lines (turning at walls), hit the first survivor they touch, then vanish. */
function driveDecoys(a: Actor, game: Game): void {
  const list = decoys(a);
  if (list.length === 0) return;
  const p = params(a, "fork");
  const keep: Decoy[] = [];
  for (const dc of list) {
    const m = game.get(dc.id);
    if (!m || !m.alive) continue;
    if (game.now >= dc.endTick) {
      game.fx.particle("smoke", add(m.pos, { x: 0, y: 1, z: 0 }));
      game.despawnMinion(m);
      continue;
    }
    const victim = game.aliveSurvivors().find((s) => dist2D(s.pos, m.pos) <= DECOY_CONTACT && Math.abs(s.pos.y - m.pos.y) <= 1.5);
    if (victim) {
      game.damage(victim, p.damage, a, { kind: "minion", abilityId: "fork", tags: ["minion"] });
      game.status(victim, "flagged", 1, passive(a, "uptime").flagSeconds, a);
      game.fx.particle("glitch", add(m.pos, { x: 0, y: 1, z: 0 }));
      game.fx.sound("glitch", m.pos);
      game.despawnMinion(m);
      continue;
    }
    // Turn when the straight line runs into a wall.
    const ahead = add(m.pos, scale(dc.dir, 1));
    if (!game.grid.walkable(Math.floor(ahead.x - game.grid.originX), Math.floor(ahead.z - game.grid.originZ))) {
      const options = [90, -90, 180].map((deg) => flat(rotateY(dc.dir, deg)));
      const open = options.find((o) => {
        const q = add(m.pos, scale(o, 1));
        return game.grid.walkable(Math.floor(q.x - game.grid.originX), Math.floor(q.z - game.grid.originZ));
      });
      if (open) dc.dir = open;
    }
    m.input.moveDir = dc.dir;
    m.input.wantSprint = true;
    m.input.lookAt = add(m.pos, add(scale(dc.dir, 4), { x: 0, y: 1.5, z: 0 }));
    keep.push(dc);
  }
  a.data<ForkData>("fork").decoys = keep;
}

export const daemonKit: Kit = {
  id: "daemon",
  init(a) {
    const up = passive(a, "uptime");
    a.addHooks("uptime", {
      // Every survivor Daemon damages (directly or through decoys) is Flagged for 20 s.
      afterDealDamage(self, ev, g) {
        const t = ev.target;
        if (!t.isSurvivor || !t.alive || ev.kind === "dot" || ev.dealt + ev.absorbed <= 0) return;
        g.status(t, "flagged", 1, up.flagSeconds, self);
      },
    });
  },
  tick(a, game) {
    uptimeTick(a, game);
    driveDecoys(a, game);
  },
  abilities: {
    ping: {
      can: idle,
      use(ctx) {
        basicAttack(ctx, ctx.n("damage"));
      },
    },
    fork: {
      can: idle,
      hud(ctx) {
        const n = decoys(ctx.actor).filter((d) => ctx.game.get(d.id)?.alive).length;
        return n > 0 ? `${n} running` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const count = ctx.n("decoys");
        const spread = ctx.n("spreadDegrees");
        const base = aim(actor);
        const def = character("minion_decoy");
        game.fx.sound("glitch", actor.pos);
        game.fx.particle("glitch", add(actor.pos, { x: 0, y: 1, z: 0 }));
        for (let i = 0; i < count; i++) {
          const ang = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1);
          const dir = flat(rotateY(base, ang));
          const want = add(actor.pos, scale(dir, 0.8));
          const cell = game.grid.nearestWalkable(game.grid.toGrid(want), 3) ?? game.grid.toGrid(actor.pos);
          const pos = { ...game.grid.toWorld(cell), y: actor.pos.y };
          // Decoys carry Daemon's own name tag.
          const m = game.spawnMinion({ owner: actor, character: def, pos, name: actor.displayName, hp: def.stats.hp, flags: ["hittableMinion", "decoy"] });
          m.addMoveMod({ id: "fork_speed", endTick: Infinity, walkStuds: ctx.n("speedStuds"), sprintStuds: ctx.n("speedStuds") });
          m.body.setFacing(dir);
          m.input.moveDir = dir;
          m.input.wantSprint = true;
          decoys(actor).push({ id: m.id, dir, endTick: game.now + ticks(ctx.n("lifeSeconds")) });
        }
      },
    },
    segfault: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos);
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            const r = ctx.n("radiusBlocks");
            game.fx.sound("explosion", actor.pos);
            game.fx.particle("explosion", add(actor.pos, { x: 0, y: 0.3, z: 0 }));
            game.fx.ring("glitch", add(actor.pos, { x: 0, y: 0.2, z: 0 }), r, 32);
            for (const t of enemiesInRadius(game, actor, add(actor.pos, { x: 0, y: 0.5, z: 0 }), r)) {
              if (!game.lineOfSight(eye(actor), eye(t))) continue;
              const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "segfault", tags: ["aoe"] });
              if (ev.cancelled) continue;
              game.status(t, "slowness", ctx.n("slowLevel"), ctx.n("slowSeconds"), actor);
              game.status(t, "helpless", 1, ctx.n("helplessSeconds"), actor);
            }
          },
          { abilityId: "segfault", label: ctx.def.name },
        );
      },
    },
    kill_9: {
      can(ctx) {
        if (ctx.actor.channel) return "busy";
        return kill9Target(ctx.game, ctx.actor) ? true : "no target";
      },
      hud(ctx) {
        const t = kill9Target(ctx.game, ctx.actor);
        if (t) return `§4» ${t.displayName}`;
        const n = flaggedInRange(ctx.game, ctx.actor).length;
        return n > 0 ? `§a${n} flagged` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const t = kill9Target(game, actor);
        if (!t) return false;
        const secs = ctx.n("channelSeconds");
        ctx.data.targetId = t.id;
        // The process is held while the signal is delivered; a stun on Daemon is the only way out.
        t.addMoveMod({ id: "kill_9", endTick: game.now + ticks(secs), frozen: true });
        game.fx.title([t.id], "§4kill -9", `§c${t.displayName} is being terminated`, ticks(secs));
        game.fx.sound("shriek", actor.pos);
        game.fx.line("glitch", eye(actor), eye(t), 0.4);
        game.windup(
          actor,
          secs,
          () => {
            t.removeMoveMod("kill_9");
            ctx.data.targetId = null;
            if (!t.alive) return;
            game.fx.sound("zap", t.pos);
            game.fx.particle("sonic", add(t.pos, { x: 0, y: 1, z: 0 }));
            // Instant elimination (still blocked by invulnerability, e.g. Spawn Protection).
            game.damage(t, 1e6, actor, { kind: "ability", abilityId: "kill_9", canKill: true, bypassInvincible: false });
          },
          {
            abilityId: "kill_9",
            label: ctx.def.name,
            frozen: true,
            onCancel: (reason) => {
              t.removeMoveMod("kill_9");
              ctx.data.targetId = null;
              // Interrupted by a stun: shorter cooldown.
              if (reason === "stun") game.startCooldown(actor, "kill_9", ctx.n("stunnedCooldown"));
            },
          },
        );
      },
    },
  },
};
