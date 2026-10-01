// Veeronica (wiki, 2026-10-01): Metal Frame (battery), Vandalism (graffiti zones), Sk8 (+ Trick), Broadcast, Activate Battery.
import type { AbilityCtx, Kit } from "../engine";
import { cooldownFor } from "../engine";
import type { Actor, ForcedMove } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { WorldObject } from "../objects";
import { speedStatusMultiplier } from "../../entities/statuses";
import { addStamina } from "../../entities/stamina";
import { blocksPerSecond, studs, ticks } from "../../core/scale";
import { Cell } from "../../world/nav";
import { ACTOR_RADIUS } from "../hit";
import { add, dist, dist2D, flat, rotateY, scale, sub, type Vec3 } from "../../util/vec";
import { addRes, knockback } from "./common";

const VAND = "vandalism";
const SK8 = "sk8";
const BROAD = "broadcast";
const BATT = "activate_battery";
/** Set only while the battery heals, so Metal Frame lets that one heal through. */
const BATTERY_HEAL = "batteryHeal";
const MAX_BATTERY = 100;
/** Horizontal distance at which Sk8 collides with the killer (two body radii plus a little). */
const KILLER_COLLIDE = ACTOR_RADIUS * 2 + 0.25;

export const BROADCAST_MODES = ["phase", "bumper", "mobile"] as const;
export type BroadcastMode = (typeof BROADCAST_MODES)[number];
const MODE_NAMES: Record<BroadcastMode, string> = { phase: "Phase", bumper: "Bumper", mobile: "Mobile" };

interface Sk8Data extends Record<string, unknown> {
  active?: boolean;
  startTick?: number;
  jumpSeen?: number;
  trickReady?: number;
  streak?: number;
  immuneUntil?: number;
  airUntil?: number;
  mobileUntil?: number;
  phaseBatteryGiven?: boolean;
  touching?: boolean;
  endReason?: string;
  highlightUntil?: number;
  highlightIds?: string[];
  /** Bumper lockout per killer id (tick). */
  bumperLock?: Record<string, number>;
  tricks?: number;
}

interface BatteryData extends Record<string, unknown> {
  active?: boolean;
  accum?: number;
}

interface WallSpot {
  /** World point on the wall face at graffiti height. */
  point: Vec3;
}

function params(a: Actor, id: string): Record<string, number> {
  return a.ability(id)!.params as Record<string, number>;
}

function metalFrame(a: Actor): Record<string, number> {
  return a.character.passives.find((p) => p.id === "metal_frame")!.params as Record<string, number>;
}

function sk8(a: Actor): Sk8Data {
  return a.data<Sk8Data>(SK8);
}

// ------------------------------------------------------------------------------------------- battery

export function batteryInUse(a: Actor): boolean {
  return a.data<BatteryData>(BATT).active === true;
}

/** Adds battery (percent). The battery cannot be recharged while Activate Battery is running. */
export function gainBattery(a: Actor, amount: number): number {
  if (batteryInUse(a)) return 0;
  const before = a.res.battery ?? 0;
  return addRes(a, "battery", amount, MAX_BATTERY) - before;
}

function stopBattery(game: Game, a: Actor): void {
  const d = a.data<BatteryData>(BATT);
  if (!d.active) return;
  d.active = false;
  d.accum = 0;
  game.startCooldown(a, BATT, cooldownFor(game, a, a.ability(BATT)!));
  game.fx.sound("countdown", a.pos, { to: [a.id], pitch: 0.6 });
}

/** One second of Activate Battery: heals healPerSecond HP for 2% each (a last 1% still heals a full HP). */
function batteryPulse(game: Game, a: Actor): void {
  const mf = metalFrame(a);
  const bp = params(a, BATT);
  const want = Math.min(bp.healPerSecond, a.maxHp - a.hp);
  const battery = a.res.battery ?? 0;
  if (want <= 0 || battery <= 0) return;
  a.flags.add(BATTERY_HEAL);
  const healed = game.heal(a, want, a);
  a.flags.delete(BATTERY_HEAL);
  a.res.battery = Math.max(0, battery - Math.min(battery, healed * mf.costPerHp));
  game.fx.particle("spark", { x: a.pos.x, y: a.pos.y + 1.2, z: a.pos.z });
}

function tickBattery(game: Game, a: Actor): void {
  const d = a.data<BatteryData>(BATT);
  if (!d.active) return;
  if (a.hp >= a.maxHp || (a.res.battery ?? 0) <= 0) {
    stopBattery(game, a);
    return;
  }
  d.accum = (d.accum ?? 0) + 1;
  if (d.accum >= ticks(1)) {
    d.accum = 0;
    batteryPulse(game, a);
    if (a.hp >= a.maxHp || (a.res.battery ?? 0) <= 0) stopBattery(game, a);
  }
}

// ------------------------------------------------------------------------------------------- graffiti

/** Her graffiti, oldest first. */
export function graffitiOf(game: Game, a: Actor): WorldObject[] {
  return game.objectsOf("graffiti", a).sort((x, y) => (x.data.placedTick as number) - (y.data.placedTick as number));
}

/** Is `p` inside the 12×30×12-stud zone of graffiti `o` (the box passes through walls)? */
export function inZone(a: Actor, o: WorldObject, p: Vec3 = a.pos): boolean {
  const vp = params(a, VAND);
  const hw = studs(vp.zoneWidthStuds) / 2;
  const hh = studs(vp.zoneHeightStuds) / 2;
  return Math.abs(p.x - o.pos.x) <= hw && Math.abs(p.z - o.pos.z) <= hw && Math.abs(p.y - o.pos.y) <= hh;
}

export function zoneAt(game: Game, a: Actor): WorldObject | null {
  return graffitiOf(game, a).find((o) => inZone(a, o)) ?? null;
}

function isWallCell(c: Cell): boolean {
  return c === Cell.Wall || c === Cell.Pillar || c === Cell.Window;
}

/**
 * The wall Veeronica is facing within spray range (grid cell Wall/Pillar/Window), faced within `faceAngle`
 * degrees of its normal (since 4.0.0 she must face it directly). Null when there is none.
 */
export function wallInFront(game: Game, a: Actor): WallSpot | null {
  const vp = params(a, VAND);
  const f = flat(a.facing);
  if (f.x === 0 && f.z === 0) return null;
  const g = game.grid;
  const max = studs(vp.sprayRangeStuds) + ACTOR_RADIUS;
  let prev = g.toGrid(a.pos);
  for (let d = 0.1; d <= max; d += 0.05) {
    const q = add(a.pos, scale(f, d));
    const cell = g.toGrid(q);
    if (cell.x === prev.x && cell.z === prev.z) continue;
    const c = g.get(cell.x, cell.z);
    if (isWallCell(c)) {
      // Normal of the face that was crossed.
      const nx = cell.x !== prev.x ? 1 : 0;
      const nz = cell.z !== prev.z ? 1 : 0;
      const cos = Math.abs(f.x * nx + f.z * nz) / Math.hypot(nx, nz);
      if (cos < Math.cos((vp.faceAngle * Math.PI) / 180)) return null;
      const face = add(a.pos, scale(f, Math.max(0, d - 0.08)));
      return { point: { x: face.x, y: g.originY + 1.2, z: face.z } };
    }
    if (g.blocksBody(cell.x, cell.z)) return null; // crate/generator in the way
    prev = cell;
  }
  return null;
}

/** Her own graffiti close enough to erase (spray range, in sight). */
function graffitiToErase(game: Game, a: Actor): WorldObject | null {
  const r = studs(params(a, VAND).sprayRangeStuds);
  const eye = { x: a.pos.x, y: a.pos.y + 1.2, z: a.pos.z };
  let best: WorldObject | null = null;
  let bd = Infinity;
  for (const o of graffitiOf(game, a)) {
    const d = dist2D(a.pos, o.pos);
    if (d <= r + 0.3 && d < bd && game.lineOfSight(eye, o.pos)) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function tooCloseToGraffiti(game: Game, a: Actor, p: Vec3): boolean {
  const r = studs(params(a, VAND).sprayRangeStuds);
  return graffitiOf(game, a).some((o) => dist(o.pos, p) <= r && game.lineOfSight(o.pos, p));
}

function onGraffitiRemoved(game: Game, vee: Actor, o: WorldObject, reason: string): void {
  if (reason !== "destroyed") return;
  // Erased by the killer: 10 s Vandalism lockout, and every graffiti within 4.5 studs goes too.
  const vp = params(vee, VAND);
  if (vee.channel?.abilityId === VAND) game.interrupt(vee, "manual");
  game.startCooldown(vee, VAND, vp.erasedLockout);
  game.fx.particle("smoke", o.pos);
  game.fx.sound("spray", o.pos, { pitch: 0.7 });
  game.fx.flash([vee.id], "§cGraffiti erased!");
  if (o.data.chained) return;
  for (const other of graffitiOf(game, vee)) {
    if (other === o || dist(other.pos, o.pos) > studs(vp.killerChainStuds)) continue;
    other.data.chained = 1;
    game.removeObject(other, "destroyed");
  }
}

function placeGraffiti(game: Game, a: Actor, spot: WallSpot): WorldObject {
  const vp = params(a, VAND);
  const list = graffitiOf(game, a);
  while (list.length >= vp.maxGraffiti) game.removeObject(list.shift()!, "cleanup");
  const o = game.spawnObject({
    kind: "graffiti",
    owner: a,
    pos: spot.point,
    radius: 0.75,
    hp: vp.graffitiHp,
    prop: "graffiti",
    targetableBy: "killer",
    data: { placedTick: game.now },
    onRemove: (obj, g, reason) => onGraffitiRemoved(g, a, obj, reason),
  });
  game.fx.sound("spray", spot.point);
  game.fx.particle("dust", spot.point);
  game.fx.flash([a.id], `§dGraffiti ${graffitiOf(game, a).length}/${vp.maxGraffiti}`);
  return o;
}

/** Draws the zone box outline (floor rectangle + graffiti post) for the given viewers. */
function drawZone(game: Game, a: Actor, o: WorldObject, viewers: string[]): void {
  const vp = params(a, VAND);
  const hw = studs(vp.zoneWidthStuds) / 2;
  const y = game.grid.originY + 0.15;
  const c = [
    { x: o.pos.x - hw, y, z: o.pos.z - hw },
    { x: o.pos.x + hw, y, z: o.pos.z - hw },
    { x: o.pos.x + hw, y, z: o.pos.z + hw },
    { x: o.pos.x - hw, y, z: o.pos.z + hw },
  ];
  for (let i = 0; i < 4; i++) game.fx.line("dragon", c[i], c[(i + 1) % 4], 0.6, { viewers });
  game.fx.line("dragon", { x: o.pos.x, y, z: o.pos.z }, { x: o.pos.x, y: y + 3, z: o.pos.z }, 0.6, { viewers });
}

// ------------------------------------------------------------------------------------------- Sk8

export function broadcastMode(a: Actor): BroadcastMode {
  const m = a.data(BROAD).mode as BroadcastMode | undefined;
  return m && BROADCAST_MODES.includes(m) ? m : "phase";
}

/** Distance (blocks) to the first solid cell along `dir`, or null within `maxBlocks`. */
function wallDistance(game: Game, pos: Vec3, dir: Vec3, maxBlocks: number): number | null {
  const g = game.grid;
  for (let d = 0.1; d <= maxBlocks + ACTOR_RADIUS; d += 0.1) {
    const q = add(pos, scale(dir, d));
    if (g.blocksBody(Math.floor(q.x - g.originX), Math.floor(q.z - g.originZ))) return d;
  }
  return null;
}

/** Trick available: a surface she is heading toward within 13 studs, or one beside her within 3 studs. */
function trickSurface(game: Game, a: Actor, dir: Vec3): boolean {
  const sp = params(a, SK8);
  if (wallDistance(game, a.pos, dir, studs(sp.trickRangeStuds)) !== null) return true;
  const side = studs(sp.trickSideStuds);
  return wallDistance(game, a.pos, flat(rotateY(dir, 90)), side) !== null || wallDistance(game, a.pos, flat(rotateY(dir, -90)), side) !== null;
}

/** Skating speed in blocks/tick: 1.15× her sprint speed, scaled by Speed/Slowness, 1.42× while airborne. */
export function skateSpeed(game: Game, a: Actor): number {
  const sp = params(a, SK8);
  const air = game.now < (sk8(a).airUntil ?? 0);
  return (blocksPerSecond(a.character.stats.sprint * sp.speedMul) / 20) * speedStatusMultiplier(a.statuses) * (air ? sp.trickAirMul : 1);
}

/** Heavy slows (Entanglement-like) knock her out of Sk8. */
function heavySlowed(game: Game, a: Actor): boolean {
  let mul = speedStatusMultiplier(a.statuses);
  for (const m of a.moveMods) {
    if (m.endTick <= game.now || m.id === "sk8") continue;
    if (m.frozen) return true;
    if (m.mul !== undefined) mul *= m.mul;
  }
  return mul <= params(a, SK8).heavySlowMul;
}

function crash(game: Game, a: Actor): void {
  const sp = params(a, SK8);
  game.damage(a, sp.crashDamage, a, { kind: "self", abilityId: SK8 });
  game.status(a, "slowness", sp.crashSlowLevel, sp.crashSlowSeconds, a);
  game.fx.sound("hit", a.pos);
  game.fx.particle("hitSpark", { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z });
  game.fx.flash([a.id], "§cCrashed!");
}

/** Ends Sk8 (idempotent). Manual cancels put Sk8 on a 5 s cooldown. */
function finishSk8(game: Game, a: Actor, reason: string): void {
  const d = sk8(a);
  if (!d.active) return;
  d.active = false;
  d.streak = 0;
  a.removeMoveMod("sk8");
  if (a.forced?.id === "sk8") game.endForced(a, "cancel");
  if (reason === "manual") game.startCooldown(a, SK8, params(a, SK8).cancelCooldown);
  game.fx.sound("door", a.pos, { pitch: 1.6 });
}

/** Mirror of `dir` off the blocking surface (bounce while crash-immune after a Trick). */
function reflect(game: Game, a: Actor, dir: Vec3, speed: number): Vec3 {
  const g = game.grid;
  const r = speed + ACTOR_RADIUS;
  const bx = g.blocksBody(Math.floor(a.pos.x + dir.x * r - g.originX), Math.floor(a.pos.z - g.originZ));
  const bz = g.blocksBody(Math.floor(a.pos.x - g.originX), Math.floor(a.pos.z + dir.z * r - g.originZ));
  if (!bx && !bz) return { x: -dir.x, y: 0, z: -dir.z };
  return flat({ x: bx ? -dir.x : dir.x, y: 0, z: bz ? -dir.z : dir.z });
}

function tryTrick(game: Game, a: Actor, fm: ForcedMove): void {
  const d = sk8(a);
  const sp = params(a, SK8);
  const now = game.now;
  d.trickReady = now + ticks(sp.trickCooldown);
  if (!trickSurface(game, a, fm.dir)) {
    // A trick on nothing glows red, uses the cooldown and breaks the streak.
    d.streak = 0;
    game.fx.particle("lava", { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, { to: [a.id] });
    return;
  }
  a.body.impulse({ x: 0, y: 0.42, z: 0 });
  addStamina(a, sp.trickStamina);
  d.immuneUntil = now + ticks(sp.trickImmunity);
  d.airUntil = now + ticks(sp.trickAirSeconds);
  if (broadcastMode(a) === "mobile") d.mobileUntil = now + ticks(params(a, BROAD).mobileSeconds);
  d.tricks = (d.tricks ?? 0) + 1;
  d.streak = (d.streak ?? 0) + 1;
  if (d.streak >= sp.trickStreak) {
    d.streak = 0;
    gainBattery(a, sp.trickBattery);
    game.fx.flash([a.id], `§a+${sp.trickBattery}% battery`);
  }
  game.fx.sound("swing", a.pos, { pitch: 1.9 });
  game.fx.particle("trail", { x: a.pos.x, y: a.pos.y + 0.5, z: a.pos.z });
}

/** Collision with the killer, decided by the Broadcast mode. Returns true when Sk8 must end. */
function collideKiller(game: Game, a: Actor, k: Actor, fm: ForcedMove): boolean {
  const d = sk8(a);
  const bp = params(a, BROAD);
  const now = game.now;
  const mode = broadcastMode(a);
  if (mode === "phase") {
    // Passes through: Resistance II + Speed II (overrides other speed boosts), +15% battery once per Sk8.
    game.status(a, "resistance", bp.phaseResistLevel, bp.phaseResistSeconds, a);
    game.status(a, "speed", bp.phaseSpeedLevel, bp.phaseSpeedSeconds, a, { mode: "replace" });
    if (!d.phaseBatteryGiven) {
      d.phaseBatteryGiven = true;
      gainBattery(a, bp.phaseBattery);
    }
    game.fx.particle("glitch", { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z });
    game.fx.sound("glitch", a.pos, { pitch: 1.4 });
    return false;
  }
  const locks = (d.bumperLock ??= {});
  if (mode === "bumper" && (locks[k.id] ?? 0) <= now) {
    game.damage(k, bp.bumperDamage, a, { kind: "ability", abilityId: BROAD, tags: ["melee"] });
    knockback(k, sub(a.pos, fm.dir), bp.bumperKnockbackBlocks, 0.3);
    gainBattery(a, bp.bumperBattery);
    locks[k.id] = now + ticks(bp.bumperLockout);
    game.fx.sound("hitKiller", k.pos);
    game.fx.flash([a.id], "§eBUMPER!");
    d.endReason = "bumper";
    return true;
  }
  if (now < (d.immuneUntil ?? 0)) return false;
  crash(game, a);
  d.endReason = "crash";
  return true;
}

/** Per-tick Sk8 logic (forced move onTick, after moving). Returning false ends the ride. */
function sk8Tick(game: Game, a: Actor, fm: ForcedMove): boolean | void {
  const d = sk8(a);
  const sp = params(a, SK8);
  const now = game.now;
  if (!a.alive || !d.active) return false;
  // Stamina drain ×1.35 (Exhausted applies); ends at 0 without extra exhaustion.
  const exh = a.statuses.level("exhausted");
  a.stamina -= a.staminaDrain * sp.drainMul * (1 + 0.1 * exh) * game.dt;
  if (a.stamina <= 0) {
    a.stamina = 0;
    d.endReason = "stamina";
    return false;
  }
  if (heavySlowed(game, a)) {
    d.endReason = "slowed";
    return false;
  }
  // Trick (jump input).
  if (a.input.jumpPresses > (d.jumpSeen ?? 0)) {
    d.jumpSeen = a.input.jumpPresses;
    if (now >= (d.trickReady ?? 0)) tryTrick(game, a, fm);
  }
  // Killer collision.
  const k = game.killer;
  if (k && k.alive) {
    const kd = dist2D(a.pos, k.pos);
    if (kd <= KILLER_COLLIDE && Math.abs(k.pos.y - a.pos.y) < 2) {
      if (!d.touching) {
        d.touching = true;
        if (collideKiller(game, a, k, fm)) return false;
      }
    } else if (kd > KILLER_COLLIDE + 0.6) {
      d.touching = false;
    }
  }
  // Steering and speed for the next tick (Mobile: better turning for 2 s after a trick).
  fm.turnRate = broadcastMode(a) === "mobile" && now < (d.mobileUntil ?? 0) ? sp.mobileTurnRateDegPerTick : sp.turnRateDegPerTick;
  fm.speed = skateSpeed(game, a);
  // She glows while a trick is available.
  if (now % 5 === 0 && now >= (d.trickReady ?? 0) && trickSurface(game, a, fm.dir)) {
    game.fx.particle("spark", { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, { to: [a.id] });
  }
}

function onRideEnd(game: Game, a: Actor, fm: ForcedMove, reason: "time" | "wall" | "stun" | "cancel"): void {
  const d = sk8(a);
  if (!d.active) return;
  if (reason === "wall") {
    if (game.now < (d.immuneUntil ?? 0)) {
      // Crash immunity after a Trick: bounce off the surface and keep skating.
      startRide(game, a, reflect(game, a, fm.dir, fm.speed));
      game.fx.sound("block", a.pos, { pitch: 1.5 });
      return;
    }
    crash(game, a);
    finishSk8(game, a, "crash");
    return;
  }
  finishSk8(game, a, d.endReason ?? (reason === "stun" ? "stun" : reason));
}

function startRide(game: Game, a: Actor, dir: Vec3): ForcedMove {
  const sp = params(a, SK8);
  const fm: ForcedMove = game.dash(a, {
    id: "sk8",
    dir,
    blocksPerTick: skateSpeed(game, a),
    seconds: 3600,
    turnRate: sp.turnRateDegPerTick,
    noStaminaRegen: true,
    stopOnStun: true,
    onTick: () => sk8Tick(game, a, fm),
    onEnd: (reason) => onRideEnd(game, a, fm, reason),
  });
  return fm;
}

function startSk8(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = sk8(actor);
  const zone = zoneAt(game, actor);
  d.active = true;
  d.startTick = game.now;
  d.jumpSeen = actor.input.jumpPresses;
  d.trickReady = 0;
  d.streak = 0;
  d.immuneUntil = 0;
  d.airUntil = 0;
  d.mobileUntil = 0;
  d.phaseBatteryGiven = false;
  d.touching = false;
  d.endReason = undefined;
  // Sprint input must not drain stamina on top of the skate drain.
  actor.addMoveMod({ id: "sk8", endTick: Infinity, noSprint: true });
  // The graffiti she used (and her others within 25 studs) are highlighted to her and the killer for 2 s.
  const near = graffitiOf(game, actor).filter((o) => o === zone || dist2D(o.pos, actor.pos) <= studs(ctx.n("highlightStuds")));
  d.highlightIds = near.map((o) => o.id);
  d.highlightUntil = game.now + ticks(ctx.n("highlightSeconds"));
  game.fx.sound("door", actor.pos, { pitch: 1.2 });
  startRide(game, actor, flat(actor.facing));
}

// ------------------------------------------------------------------------------------------- kit

export const veeronicaKit: Kit = {
  id: "veeronica",
  init(a) {
    const mf = metalFrame(a);
    a.res.battery = mf.startBattery;
    a.data(BROAD).mode = "phase";
    a.res.broadcastMode = 0;
    a.addHooks("metal_frame", {
      // Nothing heals her except her own battery.
      modifyHeal(self, amount) {
        return self.flags.has(BATTERY_HEAL) ? amount : 0;
      },
      // +8% per generator puzzle she completes (real generators only: fake ones never fire this hook).
      layerRepaired(self, _gen, repairer) {
        if (repairer === self) gainBattery(self, mf.perLayer);
      },
      // Activate Battery stops on any HP damage (overheal-only hits do not count).
      afterTakeDamage(self, ev, g) {
        if (ev.dealt > 0 && batteryInUse(self)) stopBattery(g, self);
      },
    });
  },
  tick(a, game) {
    const now = game.now;
    // Spraying needs her to stand still (also for bots, whose channels ignore moveCancels).
    const vd = a.data(VAND);
    if (a.channel?.abilityId === VAND && vd.from && dist2D(a.pos, vd.from as Vec3) > 0.35) game.interrupt(a, "move");
    if (a.channel?.abilityId === VAND && vd.spot && now % 10 === 0) game.fx.particle("dust", (vd.spot as WallSpot).point);
    // Zones are visible only to her.
    if (now % 20 === 0) for (const o of graffitiOf(game, a)) drawZone(game, a, o, [a.id]);
    // Sk8 start highlight (her and the killer).
    const d = sk8(a);
    if (now < (d.highlightUntil ?? 0) && now % 10 === 0) {
      const viewers = [a.id, ...(game.killer ? [game.killer.id] : [])];
      for (const o of graffitiOf(game, a)) if (d.highlightIds?.includes(o.id)) drawZone(game, a, o, viewers);
    }
    tickBattery(game, a);
  },
  abilities: {
    vandalism: {
      isActive(ctx) {
        return ctx.actor.channel?.abilityId === VAND;
      },
      can(ctx) {
        const { game, actor } = ctx;
        if (actor.forced) return "skating";
        if (actor.channel) return "busy";
        if (!actor.state.onGround) return "airborne";
        if (graffitiToErase(game, actor)) return true;
        const spot = wallInFront(game, actor);
        if (!spot) return "face a wall";
        if (tooCloseToGraffiti(game, actor, spot.point)) return "too close to graffiti";
        return true;
      },
      hud(ctx) {
        return `${graffitiOf(ctx.game, ctx.actor).length}/${ctx.n("maxGraffiti")}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        ctx.data.from = { ...actor.pos };
        const old = graffitiToErase(game, actor);
        if (old) {
          // Erasing her own graffiti (Space with the can in FORSAKEN): press while next to it.
          ctx.data.spot = null;
          game.windup(
            actor,
            ctx.n("eraseSeconds"),
            () => {
              if (!old.dead) game.removeObject(old, "consumed");
              game.fx.particle("whiteSmoke", old.pos);
            },
            { abilityId: VAND, label: "Erasing", moveCancels: true },
          );
          return;
        }
        const spot = wallInFront(game, actor)!;
        ctx.data.spot = spot;
        game.fx.sound("spray", actor.pos);
        game.windup(actor, ctx.n("spraySeconds"), () => placeGraffiti(game, actor, spot), { abilityId: VAND, label: "Spraying", moveCancels: true });
      },
      release(ctx) {
        ctx.game.interrupt(ctx.actor, "manual");
      },
    },
    sk8: {
      isActive(ctx) {
        return sk8(ctx.actor).active === true;
      },
      ignoresHelpless(ctx) {
        return sk8(ctx.actor).active === true;
      },
      can(ctx) {
        const { game, actor } = ctx;
        if (actor.forced || actor.channel) return "busy";
        if (actor.stamina <= 0) return "no stamina";
        if (heavySlowed(game, actor)) return "slowed";
        if (!zoneAt(game, actor)) return "not in a graffiti zone";
        return true;
      },
      hud(ctx) {
        const d = sk8(ctx.actor);
        if (d.active) {
          const fm = ctx.actor.forced;
          const trick = fm && ctx.now >= (d.trickReady ?? 0) && trickSurface(ctx.game, ctx.actor, fm.dir);
          return `${trick ? "§eTRICK " : ""}§7${d.streak ?? 0}/${ctx.n("trickStreak")}`;
        }
        return zoneAt(ctx.game, ctx.actor) ? "§dZONE" : null;
      },
      use(ctx) {
        startSk8(ctx);
      },
      release(ctx) {
        const d = sk8(ctx.actor);
        d.endReason = "manual";
        finishSk8(ctx.game, ctx.actor, "manual");
      },
    },
    broadcast: {
      can(ctx) {
        return sk8(ctx.actor).active ? "skating" : true;
      },
      hud(ctx) {
        const k = ctx.game.killer;
        const lock = k ? ((sk8(ctx.actor).bumperLock ?? {})[k.id] ?? 0) - ctx.now : 0;
        return `${MODE_NAMES[broadcastMode(ctx.actor)]}${lock > 0 ? ` §c${Math.ceil(lock / 20)}s` : ""}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const i = (BROADCAST_MODES.indexOf(broadcastMode(actor)) + 1) % BROADCAST_MODES.length;
        ctx.data.mode = BROADCAST_MODES[i];
        actor.res.broadcastMode = i;
        game.fx.sound("countdown", actor.pos, { to: [actor.id], pitch: 1.3 });
        game.fx.flash([actor.id], `§dBroadcast: §f${MODE_NAMES[BROADCAST_MODES[i]]}`);
      },
    },
    activate_battery: {
      isActive(ctx) {
        return batteryInUse(ctx.actor);
      },
      hud(ctx) {
        return `${Math.floor(ctx.actor.res.battery ?? 0)}%`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        // Used at full HP or 0% charge: nothing happens and the cooldown is only 1 s.
        if (actor.hp >= actor.maxHp || (actor.res.battery ?? 0) <= 0) {
          game.fx.flash([actor.id], actor.hp >= actor.maxHp ? "§7Already at full HP" : "§7Battery empty");
          return { cooldown: ctx.n("quickCooldown") };
        }
        const d = ctx.data as BatteryData;
        d.active = true;
        d.accum = 0;
        game.fx.sound("abilityCast", actor.pos, { pitch: 1.5 });
        return { noCooldown: true };
      },
      release(ctx) {
        stopBattery(ctx.game, ctx.actor);
      },
    },
  },
};
