// Per-character bot heuristics (brief §5.3 / §5.4). They only press abilities through Brain.use(),
// which goes through the same ability engine and cooldowns as a human.
import type { Actor } from "../entities/actor";
import type { Game } from "../core/game";
import type { Brain } from "./brain";
import type { Sighting } from "./perception";
import { studs } from "../core/scale";
import { dist2D, type Vec3 } from "../util/vec";
import { facingAway } from "../abilities/kits/common";
import { parryReady } from "../abilities/kits/guest_1337";
import { broadcastMode } from "../abilities/kits/veeronica";
import type { Generator } from "../world/generators";
import { Cell } from "../world/nav";

export interface SurvivorView {
  game: Game;
  me: Actor;
  brain: Brain;
  killer: Actor | null;
  killerSeen: Sighting | null;
  threatDist: number;
  danger: boolean;
  chased: boolean;
  recentlyHit: boolean;
}

export interface KillerView {
  game: Game;
  me: Actor;
  brain: Brain;
  target: Actor | null;
  targetSeen: Sighting | null;
  targetDist: number;
  known: Sighting[];
  chaseSeconds: number;
}

export interface BotHooks {
  survivor?(v: SurvivorView): void;
  killer?(v: KillerView): void;
}

// ------------------------------------------------------------------ helpers

/** No known killer within `blocks` (and not just hit): safe to start a long cast. */
function safeFor(v: SurvivorView, blocks: number): boolean {
  return !v.danger && !v.recentlyHit && v.threatDist > blocks;
}

function killerFacingMe(v: SurvivorView): boolean {
  return !!v.killer && !facingAway(v.me, v.killer, 80);
}

function lowestAlly(v: SurvivorView, rangeBlocks: number, below = 0.6): Actor | null {
  let best: Actor | null = null;
  for (const a of v.game.alliesOf(v.me)) {
    if (dist2D(a.pos, v.me.pos) > rangeBlocks) continue;
    if (a.hp / a.maxHp >= below) continue;
    if (!best || a.hp / a.maxHp < best.hp / best.maxHp) best = a;
  }
  return best;
}

function chasedAlly(v: SurvivorView, rangeBlocks: number): Actor | null {
  const k = v.killer;
  if (!k) return null;
  for (const a of v.game.alliesOf(v.me)) {
    if (dist2D(a.pos, v.me.pos) <= rangeBlocks && dist2D(a.pos, k.pos) < 7) return a;
  }
  return null;
}

/** Releases a charge ability after `seconds` (bots tap twice like humans). */
function releaseLater(v: { game: Game; me: Actor; brain: Brain }, abilityId: string, seconds: number, at?: () => Vec3 | Actor | null): void {
  v.game.schedule(v.me, seconds, () => {
    if (!v.me.alive || !v.brain.isActive(abilityId)) return;
    const t = at?.();
    v.brain.use(abilityId, t ?? undefined, true);
  });
}

function nearWall(game: Game, me: Actor, maxBlocks: number): Vec3 | null {
  const c = game.grid.toGrid(me.pos);
  let best: Vec3 | null = null;
  let bd = Infinity;
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      const cell = game.grid.get(c.x + dx, c.z + dz);
      if (cell !== Cell.Wall && cell !== Cell.Pillar) continue;
      const p = game.grid.toWorld({ x: c.x + dx, z: c.z + dz });
      const d = dist2D(p, me.pos);
      if (d < bd && d <= maxBlocks) {
        bd = d;
        best = p;
      }
    }
  return best;
}

function genPos(g: Generator): Vec3 {
  return { x: g.block.x + 0.5, y: g.block.y, z: g.block.z + 0.5 };
}

function nearestOpenGenerator(game: Game, from: Vec3): Vec3 | null {
  let best: Vec3 | null = null;
  let bd = Infinity;
  for (const g of game.generators) {
    if (g.completed) continue;
    const p = genPos(g);
    const d = dist2D(p, from);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function inRange(v: KillerView, minStuds: number, maxStuds: number): boolean {
  return v.targetDist >= studs(minStuds) && v.targetDist <= studs(maxStuds);
}

function seenDirectly(v: KillerView): boolean {
  return !!v.targetSeen && (v.targetSeen.how === "sight" || v.targetSeen.how === "aura");
}

// ------------------------------------------------------------------ survivors

const survivors: Record<string, BotHooks> = {
  noob: {
    survivor(v) {
      const b = v.brain;
      if (v.chased && v.me.stamina < 40) b.use("bloxy_cola");
      if (v.danger && v.threatDist < 6 && v.me.hp / v.me.maxHp < 0.5 && !b.isActive("slateskin_potion")) b.use("slateskin_potion");
      if (v.chased && v.threatDist < 4) b.use("ghostburger");
    },
  },
  "007n7": {
    survivor(v) {
      const b = v.brain;
      if (v.danger && v.threatDist < 10) {
        const mode = (v.me.data("inject").mode as string | undefined) ?? "aimless";
        if (mode !== "pathfind") b.use("inject", undefined, true);
        b.use("clone");
      }
      if (safeFor(v, 20) && v.me.hp / v.me.maxHp < 0.5) b.use("c00lgui");
    },
  },
  veeronica: {
    survivor(v) {
      const b = v.brain;
      const me = v.me;
      const graffiti = v.game.objectsOf("graffiti", me).length;
      // Vandalism is a toggle: a second press would cancel the spray, so only press when idle.
      if (safeFor(v, 25) && graffiti < 2 && !b.isActive("vandalism")) {
        const wall = nearWall(v.game, me, 2.4);
        if (wall) b.use("vandalism", wall);
      }
      // Sk8 only starts inside one of her graffiti zones: when chased, run to the nearest one first.
      if (v.chased && !b.isActive("sk8")) {
        const away = v.killer ? { x: me.pos.x * 2 - v.killer.pos.x, y: me.pos.y, z: me.pos.z * 2 - v.killer.pos.z } : undefined;
        if (!b.use("sk8", away)) {
          const zone = v.game.objectsOf("graffiti", me).sort((x, y) => dist2D(x.pos, me.pos) - dist2D(y.pos, me.pos))[0];
          if (zone && dist2D(zone.pos, me.pos) < 18) b.hookGoal = zone.pos;
        }
      }
      if (b.isActive("sk8") && v.game.rng.chance(0.2)) me.input.jumpPresses++;
      if (!v.danger && me.hp / me.maxHp < 0.6 && (me.res.battery ?? 0) > 10 && !b.isActive("activate_battery")) b.use("activate_battery");
      // Broadcast: Phase (pass through + Resistance) when hurt, Bumper (knock the killer back) otherwise.
      const wantMode = me.hp / me.maxHp < 0.5 ? "phase" : "bumper";
      if (!b.isActive("sk8") && broadcastMode(me) !== wantMode) b.use("broadcast", undefined, true);
    },
  },
  guest_1337: {
    survivor(v) {
      const b = v.brain;
      const k = v.killer;
      if (!k) return;
      const d = dist2D(v.me.pos, k.pos);
      if (parryReady(v.game, v.me) && d < 4) b.use("punch", k, true);
      if (d < 4 && killerFacingMe(v) && (k.channel || k.isKiller)) b.use("block");
      const ally = chasedAlly(v, 14);
      if (ally && d < 12 && d > 3) b.use("charge", k);
      if (v.chased && d < 3.5 && !b.canUse("block")) b.use("punch", k);
    },
  },
  shedletsky: {
    survivor(v) {
      const b = v.brain;
      const k = v.killer;
      if (k && dist2D(v.me.pos, k.pos) < 3 && killerFacingMe(v)) b.use("slash", k);
      if (!v.danger && v.me.hp / v.me.maxHp < 0.65) b.use("fried_chicken");
    },
  },
  chance: {
    survivor(v) {
      const b = v.brain;
      const charges = v.me.res.charges ?? 0;
      const k = v.killer;
      if (k && dist2D(v.me.pos, k.pos) < studs(90) * 0.6 && charges >= 2 && v.killerSeen?.how === "sight") b.use("one_shot", k);
      if (charges >= 3 && ((v.me.res.vulnTier ?? 0) >= 2 || (v.me.res.gunBroken ?? 0) > 0)) b.use("hat_fix");
      if (!v.danger && charges < 3) b.use("coin_flip", undefined, true);
      if (!v.danger && charges >= 2 && v.me.maxHp < 75) b.use("reroll");
    },
  },
  two_time: {
    survivor(v) {
      const b = v.brain;
      const me = v.me;
      const k = v.killer;
      const hasRitual = v.game.objectsOf("ritual", me).length > 0;
      if (!hasRitual && safeFor(v, 25) && v.game.now > 200) b.use("ritual");
      if (k) {
        const d = dist2D(me.pos, k.pos);
        if (d < 2.6 && (facingAway(me, k) || v.chased)) b.use("sacrificial_dagger", k);
        if (v.danger && d > 6 && d < 15 && !b.isActive("crouch")) b.use("crouch");
      }
      if (hasRitual && !v.danger && me.hp / me.maxHp < 0.6 && (me.res.oblation ?? 0) > 20 && !b.isActive("pray")) b.use("pray");
    },
  },
  jane_doe: {
    survivor(v) {
      const b = v.brain;
      const k = v.killer;
      if (k && v.killerSeen?.how === "sight") {
        const d = dist2D(v.me.pos, k.pos);
        if (d < 4 && k.statuses.level("resonance") >= 1) b.use("hatchet", k);
        if (d > 6 && d < 30 && !b.isActive("crystal_pitch") && b.use("crystal_pitch", k)) releaseLater(v, "crystal_pitch", 0.4 + (d / 30) * 1.4, () => (k.alive ? k : null));
      }
      const hurt = !v.danger ? lowestAlly(v, 20, 0.5) : null;
      if (hurt && !b.isActive("crystal_pitch") && b.use("crystal_pitch", hurt)) releaseLater(v, "crystal_pitch", 0.3, () => (hurt.alive ? hurt : null));
    },
  },
  elliot: {
    survivor(v) {
      const b = v.brain;
      const hurt = lowestAlly(v, studs(30) * 0.8, 0.6);
      if (hurt) b.use("pizza_throw", hurt);
      if (v.chased && (v.me.res.rushCharges ?? 0) > 0) b.use("rush_hour");
    },
  },
  builderman: {
    survivor(v) {
      const b = v.brain;
      const me = v.me;
      // Carry: relocate a building left behind at a finished generator; drop it on the spot when chased.
      if (b.isActive("carry")) {
        const target = v.game.generators.find((g) => !g.completed && dist2D(me.pos, genPos(g)) < 5);
        if (v.danger || target) b.use("carry", undefined, true);
        else {
          const next = nearestOpenGenerator(v.game, me.pos);
          if (next) b.hookGoal = next;
        }
        return;
      }
      if (!safeFor(v, 25)) return;
      const stranded = v.game.objects.find((o) => o.owner === me && !o.dead && (o.kind === "sentry" || o.kind === "dispenser") && dist2D(o.pos, me.pos) < 16 && !v.game.generators.some((g) => !g.completed && dist2D(o.pos, genPos(g)) < 10));
      if (stranded && v.game.generators.some((g) => !g.completed)) {
        if (dist2D(stranded.pos, me.pos) <= studs(8) * 0.9) b.use("carry", undefined, true);
        else {
          me.input.repairTarget = null;
          b.hookGoal = stranded.pos;
        }
        return;
      }
      const nearGen = v.game.generators.find((g) => !g.completed && dist2D(me.pos, { x: g.block.x, y: g.block.y, z: g.block.z }) < 6);
      if (nearGen && v.game.objectsOf("sentry", me).length === 0) b.use("sentry");
      const allies = v.game.alliesOf(me).filter((a) => dist2D(a.pos, me.pos) < 8).length;
      if (allies >= 1 && v.game.objectsOf("dispenser", me).length === 0 && lowestAlly(v, 12, 0.8)) b.use("dispenser");
    },
  },
  dusekkar: {
    survivor(v) {
      const b = v.brain;
      const ally = chasedAlly(v, studs(95) * 0.9);
      if (ally && !b.isActive("spawn_protection") && b.use("spawn_protection", ally)) releaseLater(v, "spawn_protection", 3.4);
      const k = v.killer;
      if (k && v.killerSeen && dist2D(v.me.pos, k.pos) < studs(75) * 0.9 && (ally || v.chased)) b.use("plasma_beam", k);
    },
  },
  taph: {
    survivor(v) {
      const b = v.brain;
      const me = v.me;
      if (v.danger) return;
      const atGen = me.repairing || v.game.generators.some((g) => !g.completed && dist2D(me.pos, { x: g.block.x, y: g.block.y, z: g.block.z }) < 4);
      if (!atGen) return;
      const from = v.killerSeen?.pos ?? v.game.grid.toWorld({ x: 40, z: 40 });
      if (v.game.objectsOf("tripwire", me).length < 3) b.use("tripwire", from);
      b.use("subspace_tripmine", from);
    },
  },
};

// ------------------------------------------------------------------ killers

const killers: Record<string, BotHooks> = {
  slasher: {
    killer(v) {
      const b = v.brain;
      const t = v.target;
      if (!t) return;
      const enraged = ((v.me.data("raging_pace").endTick as number | undefined) ?? 0) > v.game.now;
      if (!enraged && v.targetDist < 15 && (t.stamina < 30 || v.chaseSeconds > 8)) b.use("raging_pace");
      if (v.targetDist < 3.2 && (t.role === "sentinel" || t.character.altRole === "sentinel")) b.use("behead", t);
      if (v.targetDist < 2.8 && (t.exhausted || t.hp < t.maxHp * 0.5)) b.use("gashing_wound", t);
      if (enraged && v.targetDist < 7) b.use("slash", t, true);
    },
  },
  c00lkidd: {
    killer(v) {
      const b = v.brain;
      const t = v.target;
      if (!t) {
        if (v.game.aliveSurvivors().length > 0) b.use("pizza_delivery");
        return;
      }
      if (inRange(v, 15, 70)) b.use("corrupt_nature", v.targetSeen!.pos);
      if (seenDirectly(v) && inRange(v, 15, 60) && v.game.lineOfSight(v.me.pos, t.pos)) b.use("walkspeed_override", t);
      if (v.chaseSeconds > 10) b.use("pizza_delivery");
    },
  },
  john_doe: {
    killer(v) {
      const b = v.brain;
      const t = v.target;
      if (!t) {
        const gen = v.game.generators.find((g) => !g.completed && dist2D(v.me.pos, { x: g.block.x, y: g.block.y, z: g.block.z }) < 8);
        if (gen && v.game.objectsOf("shadow_trap", v.me).length < 3) b.use("digital_footprint");
        if (v.known.length === 0) b.use("error_404");
        return;
      }
      if (inRange(v, 10, 32) && !b.isActive("corrupt_energy")) b.use("corrupt_energy", t);
    },
  },
  "1x1x1x1": {
    killer(v) {
      const b = v.brain;
      const t = v.target;
      // Only usable with a charge (one per kill); canUse() inside use() checks it.
      if (v.game.allSurvivors().some((s) => !s.alive)) b.use("rejuvenate_the_rotten");
      if (!t) {
        if (v.known.length === 0) b.use("unstable_eye");
        return;
      }
      if (inRange(v, 12, 70)) b.use("mass_infection", v.targetSeen!.pos);
      if (seenDirectly(v) && inRange(v, 15, 110)) b.use("entanglement", t);
    },
  },
  noli: {
    killer(v) {
      const b = v.brain;
      const t = v.target;
      if (!t) {
        const busy = v.game.generators.find((g) => g.repairers.size > 0 && dist2D(v.me.pos, { x: g.block.x, y: g.block.y, z: g.block.z }) > studs(60));
        if (busy && !b.isActive("observant")) b.use("observant", { x: busy.block.x, y: busy.block.y, z: busy.block.z });
        return;
      }
      if (b.isActive("void_rush")) {
        b.aim(t);
        if (v.game.rng.chance(0.5)) b.use("void_rush", t, true);
        return;
      }
      if (seenDirectly(v) && inRange(v, 15, 55)) b.use("void_rush", t);
      if (b.isActive("nova")) {
        if (v.targetDist < studs(15)) b.use("nova", undefined, true);
      } else if (inRange(v, 20, 60)) b.use("nova", t);
    },
  },
  guest_666: {
    killer(v) {
      const b = v.brain;
      const me = v.me;
      const t = v.target;
      const blood = me.res.blood ?? 0;
      const max = me.res.maxBlood ?? 200;
      if (blood >= max) b.use("blood_rush");
      // Collect nearby blood orbs.
      const orb = v.game.objectsOf("blood_orb").find((o) => dist2D(o.pos, me.pos) < 8);
      if (orb && (!t || v.targetDist > 6)) b.hookGoal = orb.pos;
      if (!t) {
        if (v.known.length === 0) b.use("blood_rush");
        return;
      }
      if (blood >= 10 && v.targetDist < 3.2) b.use("eviscerate", t);
      if (inRange(v, 18, 60)) b.use("infernal_cry", t);
      if (!b.isActive("demonic_pursuit") && inRange(v, 20, 50) && seenDirectly(v) && b.use("demonic_pursuit", t)) releaseLater(v, "demonic_pursuit", 1.2, () => (t.alive ? t : null));
    },
  },
  nosferatu: {
    killer(v) {
      const b = v.brain;
      const me = v.me;
      const t = v.target;
      if (me.flags.has("batForm")) {
        if (t && v.targetDist < 7) b.use("lacerate", t, true);
        else if (!t && v.game.rng.chance(0.05)) b.use("ascension", undefined, true);
        return;
      }
      if (!t) {
        if (v.known.length === 0 && v.game.rng.chance(0.3)) b.use("ascension");
        return;
      }
      if (b.isActive("hunters_feast")) {
        if (v.game.rng.chance(0.2)) b.use("hunters_feast", t, true); // redirect once toward the target
      } else if (inRange(v, 30, 70)) b.use("hunters_feast", t);
      if (seenDirectly(v) && inRange(v, 25, 100) && v.game.lineOfSight(me.pos, t.pos)) b.use("bloodhook", t);
      if (inRange(v, 12, 35)) b.use("cataclysm", t);
      if (v.targetDist > studs(70)) b.use("ascension");
    },
  },
  daemon: {
    killer(v) {
      const b = v.brain;
      const me = v.me;
      const t = v.target;
      const weak = v.game.aliveSurvivors().find((s) => s.statuses.has("flagged") && dist2D(s.pos, me.pos) <= 6 && s.hp <= s.maxHp * 0.35);
      if (weak) b.use("kill_9", weak, true);
      const close = v.game.aliveSurvivors().filter((s) => dist2D(s.pos, me.pos) < 6).length;
      if (close >= 1 && v.targetDist < 5) b.use("segfault");
      if (t && inRange(v, 20, 70)) b.use("fork", t);
    },
  },
};

const ALL: Record<string, BotHooks> = { ...survivors, ...killers };

export function botHooks(characterId: string): BotHooks {
  return ALL[characterId] ?? {};
}

/** Character ids with a bot profile (data-completeness test). */
export function botProfileIds(): string[] {
  return Object.keys(ALL);
}
