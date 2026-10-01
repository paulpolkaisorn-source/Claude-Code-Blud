// 1x1x1x1 (wiki, 2026-10-01): Slash, Mass Infection, Entanglement, Unstable Eye, Rejuvenate the Rotten. No passive.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { spawnProjectile } from "../objects";
import { ACTOR_RADIUS, eye, inArc } from "../hit";
import { addRes, blocks, meleeReach, projSpeed, pull, swing } from "./common";
import { character } from "../../characters/roster";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, scale, sub, type Vec3 } from "../../util/vec";
import type { Rgb } from "../../core/fx";

/** Horizontal distance (blocks, center to center) at which a zombie touches a survivor. */
const ZOMBIE_CONTACT = ACTOR_RADIUS * 2 + 0.3;
const CHARGES = "rotCharges";
const POPUPS = "oneXPopups";
const POPUP_JUMPS = "oneXPopupJumps";

interface Corpse {
  victimId: string;
  name: string;
  pos: Vec3;
}

interface Zombie {
  id: string;
  corpseId: string;
  aggro: string | null;
  wander: Vec3 | null;
  wanderUntil: number;
  /** survivor id → tick of this zombie's last hit on them. */
  lastHit: Record<string, number>;
}

type RotData = {
  corpses?: Corpse[];
  zombies?: Zombie[];
};

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

function aim(a: Actor): Vec3 {
  const f = flat(a.facing);
  return f.x === 0 && f.z === 0 ? { x: 0, y: 0, z: 1 } : f;
}

/** No other cast while a windup (e.g. the 3.5 s ritual) is in progress. */
function idle(ctx: AbilityCtx): true | string {
  return ctx.actor.channel ? "busy" : true;
}

function rot(a: Actor): Required<RotData> {
  const d = a.data<RotData>("rejuvenate_the_rotten");
  if (!d.corpses) d.corpses = [];
  if (!d.zombies) d.zombies = [];
  return d as Required<RotData>;
}

/** 1x1x1x1's living zombies. */
export function zombiesOf(game: Game, a: Actor): Actor[] {
  return rot(a)
    .zombies.map((z) => game.get(z.id))
    .filter((z): z is Actor => !!z && z.alive);
}

function isOwnZombie(a: Actor, t: Actor): boolean {
  return t.isMinion && t.ownerId === a.id && t.flags.has("rottenZombie");
}

/** Corpses that have no living zombie standing for them. */
function raisableCorpses(game: Game, a: Actor): Corpse[] {
  const d = rot(a);
  const standing = new Set(d.zombies.filter((z) => game.get(z.id)?.alive).map((z) => z.corpseId));
  return d.corpses.filter((c) => !standing.has(c.victimId));
}

/** 1x can kill his own zombies with his attacks: Speed I 8 s (does not stack). */
function hitOwnZombie(game: Game, a: Actor, z: Actor, amount: number, abilityId: string): void {
  const ev = game.damage(z, amount, a, { kind: "ability", abilityId, tags: ["zombie"], bypassInvincible: true });
  if (ev.killed) {
    const p = params(a, "rejuvenate_the_rotten");
    game.status(a, "speed", p.killSpeedLevel, p.killSpeedSeconds, a, { mode: "max" });
    game.fx.particle("poison", add(z.pos, { x: 0, y: 1, z: 0 }));
  }
}

function glitchColor(t: Actor): Rgb {
  // Unstable Eye highlights survivors by health.
  const f = t.hp / t.maxHp;
  if (f > 0.66) return [0.3, 1, 0.3];
  if (f > 0.33) return [1, 0.9, 0.2];
  return [1, 0.15, 0.15];
}

/** Entanglement pop-ups: the victim closes them by pressing jump (cosmetic, like the 12 pop-ups in FORSAKEN). */
function popupTick(game: Game): void {
  for (const s of game.aliveSurvivors()) {
    const left = s.res[POPUPS] ?? 0;
    if (left <= 0) continue;
    const pressed = s.input.jumpPresses - (s.res[POPUP_JUMPS] ?? s.input.jumpPresses);
    s.res[POPUP_JUMPS] = s.input.jumpPresses;
    const now = Math.max(0, left - Math.max(0, pressed));
    s.res[POPUPS] = now;
    if (now <= 0) {
      game.fx.flash([s.id], "§aPop-ups closed", 20);
      continue;
    }
    if (pressed > 0 || game.now % 10 === 0) game.fx.flash([s.id], `§2[§a${"■".repeat(Math.min(12, now))}§2] §fJUMP to close pop-ups (${now})`, 12);
  }
}

// ------------------------------------------------------------------ Mass Infection

function massInfectionHit(ctx: AbilityCtx, t: Actor, close: boolean): void {
  const { game, actor } = ctx;
  const glitched = t.statuses.has("glitched");
  const dmg = ctx.n("universalDamage") + (glitched ? ctx.n("glitchedBonus") : 0) + (close ? ctx.n("closeExtraDamage") : 0);
  const ev = game.damage(t, dmg, actor, { kind: "ability", abilityId: "mass_infection", tags: close ? ["melee", "aoe"] : ["projectile", "aoe"] });
  if (ev.cancelled) return;
  if (close) {
    game.status(t, "glitched", ctx.n("closeGlitchLevel"), ctx.n("closeGlitchSeconds"), actor);
    game.status(t, "poisoned", ctx.n("closePoisonLevel"), ctx.n("closePoisonSeconds"), actor);
    // Survivors hit up close get a short speed boost (undocumented wiki note).
    game.status(t, "speed", ctx.n("closeSpeedLevel"), ctx.n("closeSpeedSeconds"), actor);
  } else {
    game.status(t, "glitched", ctx.n("farGlitchLevel"), ctx.n("farGlitchSeconds"), actor);
    game.status(t, "poisoned", ctx.n("farPoisonLevel"), ctx.n("farPoisonSeconds"), actor);
  }
  game.reveal(t, [actor.id], ctx.n("revealSeconds"), { color: glitchColor(t), source: "mass_infection" });
  game.fx.particle("glitch", add(t.pos, { x: 0, y: 1, z: 0 }));
}

function releaseMassInfection(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const dir = aim(actor);
  const origin = { ...actor.pos };
  const hitSet = new Set<string>();
  game.fx.sound("zap", actor.pos, { volume: 2 });
  game.fx.particle("sonic", add(origin, { x: 0, y: 1, z: 0 }));
  // Close-range hitbox around him (it also reaches behind him).
  const close = blocks(ctx.n("closeRangeStuds"));
  for (const t of game.enemiesOf(actor)) {
    if (dist2D(t.pos, origin) > close + ACTOR_RADIUS || Math.abs(t.pos.y - origin.y) > 2) continue;
    hitSet.add(t.id);
    massInfectionHit(ctx, t, true);
  }
  // The shockwave: a wide front travelling 104 studs/s for 6 s through walls. Zombies are on his team, so it ignores them.
  const halfWidth = blocks(ctx.n("waveHalfWidthStuds"));
  const step = projSpeed(ctx.n("waveStudsPerSecond"));
  const side = { x: -dir.z, y: 0, z: dir.x };
  game.spawnObject({
    kind: "mass_infection_wave",
    owner: actor,
    pos: { ...origin },
    radius: halfWidth,
    lifeSeconds: ctx.n("waveSeconds"),
    data: { along: 0 },
    update(o, g) {
      const prev = o.data.along as number;
      const next = prev + step;
      o.data.along = next;
      o.pos = add(origin, scale(dir, next));
      if (g.now % 2 === 0) {
        const c = add(o.pos, { x: 0, y: 1, z: 0 });
        g.fx.line("glitch", add(c, scale(side, -halfWidth)), add(c, scale(side, halfWidth)), 1.2);
      }
      // Hitboxes are disabled while he is stunned.
      if (actor.isStunned(g.now)) return;
      for (const t of g.enemiesOf(actor)) {
        if (hitSet.has(t.id)) continue;
        const rel = sub(t.pos, origin);
        const along = rel.x * dir.x + rel.z * dir.z;
        const lateral = Math.abs(rel.x * side.x + rel.z * side.z);
        if (along < prev - ACTOR_RADIUS || along > next + ACTOR_RADIUS || lateral > halfWidth + ACTOR_RADIUS) continue;
        // Elevation blocks the wave.
        if (Math.abs(t.pos.y - origin.y) > 1.5) continue;
        hitSet.add(t.id);
        massInfectionHit(ctx, t, false);
      }
    },
  });
}

// ------------------------------------------------------------------ Entanglement

function throwSword(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const dir = aim(actor);
  game.fx.sound("projectile", actor.pos);
  spawnProjectile(game, {
    owner: actor,
    kind: "entanglement",
    pos: add(actor.pos, { x: dir.x * 0.6, y: 1.2, z: dir.z * 0.6 }),
    vel: scale(dir, projSpeed(ctx.n("projectileStudsPerSecond"))),
    radius: blocks(ctx.n("radiusStuds")),
    lifeSeconds: ctx.n("lifeSeconds"),
    hit: "all",
    hitMinions: true,
    particle: "glitch",
    onHitActor(_o, t, g) {
      if (isOwnZombie(actor, t)) {
        // 100 damage: kills a zombie instantly.
        hitOwnZombie(g, actor, t, ctx.n("zombieDamage"), "entanglement");
        return true;
      }
      if (t.team === actor.team) return false; // flies past other killer-side minions
      const glitched = t.statuses.has("glitched");
      const ev = g.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "entanglement", tags: ["projectile"] });
      if (ev.cancelled) return true;
      g.reveal(t, [actor.id], ctx.n("revealSeconds"), { color: glitchColor(t), source: "entanglement" });
      g.status(t, "helpless", 1, ctx.n("helplessSeconds"), actor);
      g.status(t, "glitched", ctx.n("glitchLevel"), ctx.n("glitchSeconds"), actor);
      g.status(t, "slowness", ctx.n("slowLevel"), ctx.n("slowSeconds"), actor);
      // Pulled toward him, 50% harder when already Glitched.
      if (t.alive) pull(t, actor.pos, ctx.n("pullBlocks") * (glitched ? 1 + ctx.n("glitchedPullBonus") : 1));
      if (t.isSurvivor) {
        t.res[POPUPS] = ctx.n("popups");
        t.res[POPUP_JUMPS] = t.input.jumpPresses;
      }
      g.fx.sound("chain", t.pos);
      g.fx.line("glitch", add(eye(actor), { x: 0, y: -0.4, z: 0 }), add(t.pos, { x: 0, y: 1.2, z: 0 }), 0.5);
      return true;
    },
  });
}

// ------------------------------------------------------------------ Rejuvenate the Rotten

function raiseZombies(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = rot(actor);
  const def = character("minion_zombie");
  for (const c of raisableCorpses(game, actor)) {
    const cell = game.grid.nearestWalkable(game.grid.toGrid(c.pos), 4) ?? game.grid.toGrid(c.pos);
    const pos = { ...game.grid.toWorld(cell), y: c.pos.y };
    const z = game.spawnMinion({ owner: actor, character: def, pos, name: `§2Rotten ${c.name}`, hp: ctx.n("zombieHp"), flags: ["hittableMinion", "rottenZombie"] });
    z.addMoveMod({ id: "zombie_speed", endTick: Infinity, walkStuds: ctx.n("zombieSpeedStuds"), sprintStuds: ctx.n("zombieSpeedStuds") });
    d.zombies.push({ id: z.id, corpseId: c.victimId, aggro: null, wander: null, wanderUntil: 0, lastHit: {} });
    game.fx.particle("poison", add(pos, { x: 0, y: 0.5, z: 0 }));
    game.fx.sound("minion", pos);
  }
}

function pickWander(game: Game, z: Actor, radius: number): Vec3 {
  const ang = game.rng.range(0, Math.PI * 2);
  const r = game.rng.range(1.5, Math.max(2, radius));
  const want = add(z.pos, { x: Math.cos(ang) * r, y: 0, z: Math.sin(ang) * r });
  const cell = game.grid.nearestWalkable(game.grid.toGrid(want), 3) ?? game.grid.toGrid(z.pos);
  return { ...game.grid.toWorld(cell), y: z.pos.y };
}

function zombieTouch(game: Game, a: Actor, s: Actor, p: Record<string, number>): void {
  // Only survivors who are already Glitched take damage (and only they can be killed by zombies).
  const glitched = s.statuses.has("glitched");
  game.status(s, "poisoned", p.poisonLevel, p.debuffSeconds, a);
  game.status(s, "glitched", p.glitchLevel, p.debuffSeconds, a);
  game.reveal(s, [a.id], p.revealSeconds, { color: "green", source: "rejuvenate_the_rotten" });
  if (glitched) game.damage(s, p.glitchedDamage, a, { kind: "minion", abilityId: "rejuvenate_the_rotten", tags: ["minion"] });
  game.fx.particle("poison", add(s.pos, { x: 0, y: 1, z: 0 }));
}

/** Zombie AI: wander, chase survivors within 20 studs, give up beyond 30 studs, touch to infect. */
function driveZombies(a: Actor, game: Game): void {
  const d = rot(a);
  if (d.zombies.length === 0) return;
  const p = params(a, "rejuvenate_the_rotten");
  const aggro = blocks(p.aggroStuds);
  const lose = blocks(p.loseStuds);
  const keep: Zombie[] = [];
  for (const z of d.zombies) {
    const m = game.get(z.id);
    if (!m || !m.alive) continue;
    keep.push(z);
    // Green aura visible only to 1x1x1x1.
    if (game.now % 20 === 0) game.reveal(m, [a.id], 1.5, { color: "green", source: "rotten_zombie" });
    let target = z.aggro ? game.get(z.aggro) ?? null : null;
    if (target && (!target.alive || target.statuses.has("undetectable") || dist2D(target.pos, m.pos) > lose)) target = null;
    if (!target) {
      let best = aggro;
      for (const s of game.aliveSurvivors()) {
        if (s.statuses.has("undetectable")) continue;
        const dd = dist2D(s.pos, m.pos);
        if (dd <= best) {
          best = dd;
          target = s;
        }
      }
    }
    z.aggro = target ? target.id : null;
    if (target) {
      m.input.moveDir = game.navDirection(m, target.pos, 0.1);
      m.input.lookAt = add(target.pos, { x: 0, y: 1.5, z: 0 });
      z.wander = null;
    } else {
      if (!z.wander || game.now >= z.wanderUntil || dist2D(m.pos, z.wander) < 0.8) {
        z.wander = pickWander(game, m, blocks(p.wanderStuds));
        z.wanderUntil = game.now + ticks(game.rng.range(3, 6));
      }
      m.input.moveDir = game.navDirection(m, z.wander);
      m.input.lookAt = null;
    }
    m.input.wantSprint = false;
    // Contact (zombies can hit repeatedly, once per hitCooldown per survivor).
    for (const s of game.aliveSurvivors()) {
      if (s.statuses.has("undetectable")) continue;
      if (dist2D(s.pos, m.pos) > ZOMBIE_CONTACT || Math.abs(s.pos.y - m.pos.y) > 1.5) continue;
      if (game.now - (z.lastHit[s.id] ?? -Infinity) < ticks(p.hitCooldown)) continue;
      z.lastHit[s.id] = game.now;
      zombieTouch(game, a, s, p);
    }
  }
  d.zombies = keep;
}

// ------------------------------------------------------------------ kit

export const oneXKit: Kit = {
  id: "1x1x1x1",
  init(a) {
    a.res[CHARGES] = 0;
    rot(a);
    a.addHooks("rejuvenate_the_rotten", {
      // +1 charge per kill (max 1).
      kill(self) {
        addRes(self, CHARGES, 1, params(self, "rejuvenate_the_rotten").maxCharges);
      },
      // Remember where survivors died: zombies rise there.
      anyDeath(self, victim) {
        if (!victim.isSurvivor) return;
        const d = rot(self);
        d.corpses = d.corpses.filter((c) => c.victimId !== victim.id);
        d.corpses.push({ victimId: victim.id, name: victim.displayName, pos: { ...victim.pos } });
      },
    });
  },
  tick(a, game) {
    driveZombies(a, game);
    popupTick(game);
  },
  abilities: {
    slash: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        const dmg = ctx.n("damage");
        swing(ctx, {
          windup: ctx.n("windup"),
          rangeStuds: ctx.n("rangeStuds"),
          halfAngle: ctx.n("halfAngle"),
          abilityId: "slash",
          objectDamage: dmg,
          onHit(t) {
            const ev = game.damage(t, dmg, actor, { kind: "basic", abilityId: "slash", tags: ["melee"] });
            if (ev.cancelled) return;
            game.status(t, "glitched", ctx.n("glitchLevel"), ctx.n("glitchSeconds"), actor);
            game.status(t, "poisoned", ctx.n("poisonLevel"), ctx.n("poisonSeconds"), actor);
          },
          after() {
            // His own zombies are on his team, so the arc check is done here.
            const reach = meleeReach(ctx.n("rangeStuds"));
            for (const z of zombiesOf(game, actor)) {
              if (inArc(actor, z, reach, ctx.n("halfAngle")) && game.lineOfSight(eye(actor), eye(z))) hitOwnZombie(game, actor, z, dmg, "slash");
            }
          },
        });
      },
    },
    mass_infection: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        // Audible to everyone; heavily slowed during the 1.7 s windup.
        game.fx.sound("windup", actor.pos, { volume: 3 });
        game.fx.sound("chain", actor.pos, { volume: 2 });
        game.windup(actor, ctx.n("windup"), () => releaseMassInfection(ctx), { abilityId: "mass_infection", label: ctx.def.name, moveMul: ctx.n("windupMoveMul"), noSprint: true });
      },
    },
    entanglement: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("windup"), () => throwSword(ctx), { abilityId: "entanglement", label: ctx.def.name });
      },
    },
    unstable_eye: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("glitch", actor.pos, { volume: 3 });
        // He can walk during the startup and sprint again 0.35 s after it.
        actor.addMoveMod({ id: "unstable_eye", endTick: game.now + ticks(ctx.n("windup") + ctx.n("sprintLockAfterSeconds")), noSprint: true });
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            for (const s of game.aliveSurvivors()) game.reveal(s, [actor.id], ctx.n("revealSeconds"), { color: glitchColor(s), source: "unstable_eye" });
            game.status(actor, "speed", ctx.n("speedLevel"), ctx.n("speedSeconds"), actor);
            game.status(actor, "blindness", ctx.n("blindLevel"), ctx.n("blindSeconds"), actor);
            // Stamina starts regenerating immediately.
            actor.regenDelayTicks = 0;
            game.fx.fade(actor.id, 0.6, [0.6, 0, 0]);
            game.fx.sound("shriek", actor.pos);
          },
          { abilityId: "unstable_eye", label: ctx.def.name, onCancel: () => actor.removeMoveMod("unstable_eye") },
        );
      },
    },
    rejuvenate_the_rotten: {
      can(ctx) {
        if (ctx.actor.channel) return "busy";
        if ((ctx.actor.res[CHARGES] ?? 0) < 1) return "no charge";
        if (raisableCorpses(ctx.game, ctx.actor).length === 0) return "no corpses";
        return true;
      },
      hud(ctx) {
        return `x${ctx.actor.res[CHARGES] ?? 0} §2${zombiesOf(ctx.game, ctx.actor).length} zombies`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        actor.res[CHARGES] = (actor.res[CHARGES] ?? 0) - 1;
        game.fx.sound("lms", actor.pos);
        // Stuns cannot cancel the ritual.
        game.windup(actor, ctx.n("windup"), () => raiseZombies(ctx), { abilityId: "rejuvenate_the_rotten", label: ctx.def.name, stunCancels: false });
      },
    },
  },
};
