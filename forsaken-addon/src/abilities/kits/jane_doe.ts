// Jane Doe (wiki, 2026-10-01): Digital Footprint, Shatterpoint, Crystal Pitch, Hatchet.
import type { Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { Rgb } from "../../core/fx";
import { spawnProjectile } from "../objects";
import { blocks, projSpeed } from "./common";
import { lungeStrike } from "./two_time";
import { eye, inSphere } from "../hit";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, type Vec3 } from "../../util/vec";

const SHP = "shatterpoint";

function passive(a: Actor, id: string): Record<string, number> {
  return a.character.passives.find((p) => p.id === id)!.params as Record<string, number>;
}

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

// ------------------------------------------------------------------------------------------ Shatterpoint

/** Current Shatterpoint HP. */
export function shatterpoint(a: Actor): number {
  return a.shield(SHP)?.amount ?? 0;
}

export function shatterpointLocked(a: Actor): boolean {
  return (a.res.shpLocked ?? 0) > 0;
}

/** Keeps Shatterpoint as the last shield layer so overheal (Plasma Beam...) is spent first. */
function keepShatterpointLast(a: Actor): void {
  const i = a.shields.findIndex((l) => l.id === SHP);
  if (i >= 0 && i !== a.shields.length - 1) a.shields.push(...a.shields.splice(i, 1));
}

function setShatterpoint(game: Game, a: Actor, amount: number): void {
  const p = passive(a, SHP);
  game.shield(a, SHP, Math.min(p.max, amount), { max: p.max, reduction: p.reduction, dotSkipsReduction: true });
  keepShatterpointLast(a);
  a.res.shatterpoint = shatterpoint(a);
}

/**
 * Restores Shatterpoint from one of Jane's landed abilities. Nothing during the lockout; each other living
 * Jane Doe cuts the gain by 10 %. Returns the SHP actually gained.
 */
export function addShatterpoint(game: Game, jane: Actor, amount: number): number {
  if (!jane.alive || amount <= 0 || shatterpointLocked(jane)) return 0;
  const p = passive(jane, SHP);
  const others = game.aliveSurvivors().filter((s) => s !== jane && s.character.id === "jane_doe").length;
  const gain = amount * Math.max(0, 1 - p.multiJanePenalty * others);
  if (gain <= 0) return 0;
  const before = shatterpoint(jane);
  setShatterpoint(game, jane, before + gain);
  return shatterpoint(jane) - before;
}

/** Detects a broken Shatterpoint (starts the 40 s lockout) and ends the lockout with +5. */
function updateShatterpoint(game: Game, a: Actor): void {
  const p = passive(a, SHP);
  if (shatterpointLocked(a)) {
    if (game.now >= (a.res.shpUnlockTick ?? 0)) {
      a.res.shpLocked = 0;
      setShatterpoint(game, a, p.recoverAmount);
      game.fx.flash([a.id], `§bShatterpoint restored (+${p.recoverAmount})`);
    }
    return;
  }
  if (a.shield(SHP)) {
    keepShatterpointLast(a);
    a.res.shatterpoint = shatterpoint(a);
    return;
  }
  a.res.shpLocked = 1;
  a.res.shpUnlockTick = game.now + ticks(p.lockoutSeconds);
  a.res.shatterpoint = 0;
  game.fx.sound("glitch", a.pos);
  game.fx.particle("glitch", add(a.pos, { x: 0, y: 1.2, z: 0 }));
  game.fx.flash([a.id], `§cShatterpoint broken §7(${p.lockoutSeconds}s)`);
}

// ------------------------------------------------------------------------------------------ Digital Footprint

interface Footprint {
  pos: Vec3;
  tick: number;
}

const FOOT_RED: Rgb = [1, 0.12, 0.12];
const FOOT_YELLOW: Rgb = [1, 0.9, 0.2];
const FOOT_GREY: Rgb = [0.55, 0.55, 0.55];

/** Footprint colour by age: red, then yellow, then grey before fading out. */
export function footprintLook(ageTicks: number, lifeTicks: number): { key: string; color: Rgb } {
  const f = ageTicks / lifeTicks;
  if (f < 1 / 3) return { key: "blood", color: FOOT_RED };
  if (f < 2 / 3) return { key: "dust", color: FOOT_YELLOW };
  return { key: "dust", color: FOOT_GREY };
}

function tickFootprints(game: Game, a: Actor): void {
  const p = passive(a, "digital_footprint");
  const every = Math.max(1, ticks(p.everySeconds));
  if (game.now % every !== 0) return;
  const d = a.data<{ prints?: Footprint[]; lastPos?: Vec3 }>("digital_footprint");
  const prints = (d.prints ??= []);
  const life = ticks(p.lifeSeconds);
  const k = game.killer;
  // A new print each time the killer has moved since the last one.
  if (k && k.alive && (!d.lastPos || dist2D(d.lastPos, k.pos) > 0.3)) {
    d.lastPos = { ...k.pos };
    prints.push({ pos: { x: k.pos.x, y: k.pos.y + 0.1, z: k.pos.z }, tick: game.now });
  }
  while (prints.length && game.now - prints[0].tick >= life) prints.shift();
  for (const fp of prints) {
    const look = footprintLook(game.now - fp.tick, life);
    game.fx.particle(look.key, fp.pos, { to: [a.id], color: look.color });
  }
}

// ------------------------------------------------------------------------------------------ Resonance

/** Resonance cannot be applied if the killer had it, or was stunned, within the last 10 s (it can stack while active). */
export function resonanceBlocked(game: Game, k: Actor, lockSeconds: number): boolean {
  if (k.statuses.has("resonance")) return false;
  if (k.isStunned(game.now)) return true;
  const last = Math.max(k.res.janeResonanceSeenTick ?? -1e9, k.res.janeStunSeenTick ?? -1e9);
  return game.now - last < ticks(lockSeconds);
}

/** Shared bookkeeping on the killer (all Janes share Resonance). */
function trackKiller(game: Game): void {
  const k = game.killer;
  if (!k) return;
  if (k.statuses.has("resonance")) k.res.janeResonanceSeenTick = game.now;
  if (k.isStunned(game.now)) k.res.janeStunSeenTick = game.now;
}

// ------------------------------------------------------------------------------------------ Crystal Pitch

function crystalExplode(game: Game, jane: Actor, at: Vec3, radius: number, direct: Actor | null, origin: Vec3): void {
  const p = params(jane, "crystal_pitch");
  game.fx.sound("glitch", at, { pitch: 1.6 });
  game.fx.ring("spark", at, radius, 20);
  game.fx.particle("shield", at);
  // Survivors (any non-killer humanoid): Purified I 3 s; Jane +2 SHP once.
  let survivorHit = false;
  for (const s of game.actors) {
    if (!s.alive || s === jane || s.team !== "survivor") continue;
    if (s !== direct && !inSphere(at, radius, s)) continue;
    game.status(s, "purified", 1, p.purifiedSeconds, jane);
    survivorHit = true;
  }
  if (survivorHit) addShatterpoint(game, jane, p.survivorShp);
  const k = game.killer;
  if (k && k.alive && (direct === k || inSphere(at, radius, k))) {
    if (!resonanceBlocked(game, k, p.resonanceLockSeconds)) {
      const levels = direct === k && dist2D(origin, k.pos) >= blocks(p.longShotStuds) ? 2 : 1;
      game.status(k, "resonance", levels, p.resonanceSeconds, jane, { mode: "add" });
    }
    addShatterpoint(game, jane, p.killerShp);
    game.reveal(jane, "killer", p.revealSelfSeconds, { color: "red", source: "crystal_pitch" });
  }
}

/** Charge fraction 0..1 of an active Crystal Pitch. */
export function crystalCharge(game: Game, jane: Actor): number {
  const d = jane.data<{ active?: boolean; startTick?: number }>("crystal_pitch");
  if (!d.active) return 0;
  return Math.max(0, Math.min(1, (game.now - (d.startTick ?? game.now)) / ticks(params(jane, "crystal_pitch").maxChargeSeconds)));
}

function throwCrystal(game: Game, jane: Actor): void {
  const d = jane.data<{ active?: boolean; startTick?: number }>("crystal_pitch");
  if (!d.active) return;
  const p = params(jane, "crystal_pitch");
  const c = crystalCharge(game, jane);
  d.active = false;
  jane.removeMoveMod("crystal_charge");
  const sps = p.minStudsPerSecond + (p.maxStudsPerSecond - p.minStudsPerSecond) * c;
  const radius = blocks(p.minRadiusStuds + (p.maxRadiusStuds - p.minRadiusStuds) * c);
  // Arcing throw: the view pitch plus a small upward launch angle.
  const h = flat(jane.facing);
  const pitch = Math.asin(Math.max(-1, Math.min(1, jane.facing.y))) + (p.launchPitchDegrees * Math.PI) / 180;
  const speed = projSpeed(sps);
  const vel = { x: h.x * Math.cos(pitch) * speed, y: Math.sin(pitch) * speed, z: h.z * Math.cos(pitch) * speed };
  const origin = { ...jane.pos };
  game.fx.sound("projectile", jane.pos);
  spawnProjectile(game, {
    owner: jane,
    kind: "crystal",
    pos: add(eye(jane), { x: h.x * 0.4, y: -0.2, z: h.z * 0.4 }),
    vel,
    gravity: p.gravity,
    radius: 0.3,
    lifeSeconds: p.lifeSeconds,
    hit: "all",
    hitMinions: true,
    particle: "spark",
    prop: "crystal",
    onHitActor(o, t, g) {
      crystalExplode(g, jane, o.pos, radius, t, origin);
      return true;
    },
    onHitWall(_o, at, g) {
      crystalExplode(g, jane, at, radius, null, origin);
    },
    onExpire(o, g) {
      crystalExplode(g, jane, o.pos, radius, null, origin);
    },
  });
  game.startCooldown(jane, "crystal_pitch", cooldownFor(game, jane, jane.ability("crystal_pitch")!));
}

// ------------------------------------------------------------------------------------------ Hatchet

function hatchetHit(game: Game, jane: Actor, t: Actor): void {
  const p = jane.ability("hatchet")!.params as Record<string, unknown>;
  const n = p as Record<string, number>;
  const dmg = t.character.id === "john_doe" ? n.johnDoeDamage : n.damage;
  const ev = game.damage(t, dmg, jane, { kind: "ability", abilityId: "hatchet", tags: ["melee"] });
  game.fx.particle("blood", add(t.pos, { x: 0, y: 1.2, z: 0 }));
  if (ev.cancelReason === "invincible" || ev.cancelReason === "dead" || !t.isKiller || !t.alive) return;
  const shp = p.shp as number[];
  const lvl = Math.min(3, t.statuses.level("resonance"));
  if (lvl <= 0) {
    // No Resonance: Helpless I + Slowness II (works through stun immunity), +5 SHP.
    game.status(t, "helpless", 1, n.noResHelplessSeconds, jane);
    game.status(t, "slowness", n.noResSlowLevel, n.noResSlowSeconds, jane);
    addShatterpoint(game, jane, shp[0]);
    return;
  }
  const stuns = p.stun as number[];
  if (game.stun(t, stuns[lvl - 1], jane)) {
    game.removeStatus(t, "resonance");
    addShatterpoint(game, jane, shp[lvl]);
    game.fx.flash([jane.id], `§bResonance ${"I".repeat(lvl)} — stunned!`);
  }
}

export const janeDoeKit: Kit = {
  id: "jane_doe",
  init(a, game) {
    const p = passive(a, SHP);
    a.res.shpLocked = 0;
    setShatterpoint(game, a, p.start);
    a.addHooks(SHP, {
      afterTakeDamage(self, _ev, g) {
        updateShatterpoint(g, self);
      },
    });
  },
  tick(a, game) {
    updateShatterpoint(game, a);
    trackKiller(game);
    tickFootprints(game, a);
    const d = a.data<{ active?: boolean }>("crystal_pitch");
    if (d.active && a.isStunned(game.now)) {
      // A stun drops the crystal (no throw, no cooldown).
      d.active = false;
      a.removeMoveMod("crystal_charge");
    } else if (d.active && crystalCharge(game, a) >= 1) throwCrystal(game, a);
  },
  abilities: {
    crystal_pitch: {
      hud(ctx) {
        const shp = `SHP ${Math.round(shatterpoint(ctx.actor))}${shatterpointLocked(ctx.actor) ? "§c(locked)" : ""}`;
        return ctx.data.active ? `${Math.round(crystalCharge(ctx.game, ctx.actor) * 100)}% ${shp}` : shp;
      },
      use(ctx) {
        const { game, actor } = ctx;
        ctx.data.active = true;
        ctx.data.startTick = game.now;
        actor.addMoveMod({ id: "crystal_charge", endTick: game.now + ticks(ctx.n("maxChargeSeconds")) + 5, mul: ctx.n("chargeMoveMul") });
        game.fx.sound("windup", actor.pos, { pitch: 1.4 });
        return { noCooldown: true };
      },
      release(ctx) {
        throwCrystal(ctx.game, ctx.actor);
      },
    },
    hatchet: {
      hud(ctx) {
        const k = ctx.game.killer;
        const lvl = k ? k.statuses.level("resonance") : 0;
        return lvl > 0 ? `§bRES ${lvl}` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        // Resistance I for the whole attack (windup + lunge).
        game.status(actor, "resistance", ctx.n("resistLevel"), ctx.n("windup") + ctx.n("lungeSeconds") + 0.1, actor);
        game.fx.sound("windup", actor.pos, { pitch: 0.8 });
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            game.fx.sound("swing", actor.pos);
            lungeStrike(game, actor, {
              studs: ctx.n("lungeStuds"),
              seconds: ctx.n("lungeSeconds"),
              rangeStuds: ctx.n("rangeStuds"),
              halfAngle: ctx.n("halfAngle"),
              onHit: (t) => hatchetHit(game, actor, t),
            });
          },
          { abilityId: "hatchet", label: "Hatchet" },
        );
      },
    },
  },
};
