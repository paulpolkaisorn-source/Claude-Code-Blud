// Minecraft implementations of the model's Body interface, and per-tick movement application.
import { Entity, EntityComponentTypes, InputPermissionCategory, Player } from "@minecraft/server";
import type { Actor, Body, BodyState } from "../entities/actor";
import { config } from "../core/config";
import { movementAttribute } from "../core/scale";
import { dirToYaw, flat, norm, type Vec3 } from "../util/vec";

/** Knockback strength per block/tick of desired velocity (spike: strength 1 ≈ 0.73 blocks/tick initial). */
const KNOCKBACK_PER_VELOCITY = 1.37;

function readEntity(e: Entity, sprint: boolean, sneaking: boolean, jumping: boolean): BodyState {
  const loc = e.location;
  const view = e.getViewDirection();
  const rot = e.getRotation();
  const vel = e.getVelocity();
  return {
    pos: { x: loc.x, y: loc.y, z: loc.z },
    facing: { x: view.x, y: view.y, z: view.z },
    yaw: rot.y,
    pitch: rot.x,
    sprintInput: sprint,
    sneaking,
    speed: Math.hypot(vel.x, vel.z),
    onGround: e.isOnGround,
    jumping,
    valid: e.isValid,
  };
}

const INVALID: BodyState = { pos: { x: 0, y: -1000, z: 0 }, facing: { x: 0, y: 0, z: 1 }, yaw: 0, pitch: 0, sprintInput: false, sneaking: false, speed: 0, onGround: true, jumping: false, valid: false };

export class PlayerBody implements Body {
  readonly kind = "player" as const;
  private last: BodyState = INVALID;
  constructor(readonly player: Player) {}

  read(): BodyState {
    if (!this.player.isValid) return { ...this.last, valid: false };
    this.last = readEntity(this.player, this.player.isSprinting, this.player.isSneaking, this.player.isJumping);
    return this.last;
  }
  teleport(pos: Vec3, facing?: Vec3): void {
    if (!this.player.isValid) return;
    this.player.teleport(pos, facing ? { facingLocation: { x: pos.x + facing.x, y: pos.y + 1.6, z: pos.z + facing.z } } : { keepVelocity: false });
  }
  impulse(vel: Vec3): void {
    if (!this.player.isValid) return;
    this.player.applyKnockback({ x: vel.x * KNOCKBACK_PER_VELOCITY, z: vel.z * KNOCKBACK_PER_VELOCITY }, Math.max(0, vel.y));
  }
  drive(v: Vec3): void {
    if (!this.player.isValid) return;
    if (v.x === 0 && v.z === 0) return;
    // Knockback sets the player's motion; re-applied every tick it acts as a forced dash.
    this.player.applyKnockback({ x: v.x * KNOCKBACK_PER_VELOCITY, z: v.z * KNOCKBACK_PER_VELOCITY }, 0);
  }
  setFacing(dir: Vec3): void {
    if (!this.player.isValid) return;
    const l = this.player.location;
    this.player.teleport(l, { facingLocation: { x: l.x + dir.x * 5, y: l.y + 1.6, z: l.z + dir.z * 5 }, keepVelocity: true });
  }
  isValid(): boolean {
    return this.player.isValid;
  }
}

export class BotBody implements Body {
  readonly kind = "bot" as const;
  /** Forced velocity for this tick (dashes), consumed by applyBotMovement. */
  driveThisTick: Vec3 | null = null;
  private last: BodyState = INVALID;
  /** Monotonic action id → animation property (forsaken:action). */
  action = 0;
  actionUntil = 0;
  constructor(readonly entity: Entity) {}

  read(): BodyState {
    if (!this.entity.isValid) return { ...this.last, valid: false };
    this.last = readEntity(this.entity, false, false, false);
    return this.last;
  }
  teleport(pos: Vec3, facing?: Vec3): void {
    if (!this.entity.isValid) return;
    if (pos.y < -500) {
      this.entity.remove();
      return;
    }
    this.entity.teleport(pos, facing ? { facingLocation: { x: pos.x + facing.x, y: pos.y + 1.6, z: pos.z + facing.z } } : undefined);
  }
  impulse(vel: Vec3): void {
    if (!this.entity.isValid) return;
    this.entity.applyImpulse(vel);
  }
  drive(v: Vec3): void {
    this.driveThisTick = v;
  }
  setFacing(dir: Vec3): void {
    if (!this.entity.isValid) return;
    this.entity.setRotation({ x: 0, y: dirToYaw(dir) });
  }
  isValid(): boolean {
    return this.entity.isValid;
  }
}

/** Velocity steering for bots and minions (DECISIONS.md D5). Called once per tick per bot actor. */
export function applyBotMovement(a: Actor, floorY: number): void {
  const body = a.body as BotBody;
  const e = body.entity;
  if (!e.isValid) return;
  const gain = config().bots.impulseGain;
  const v = e.getVelocity();
  let desired: Vec3 | null = null;
  if (body.driveThisTick) desired = body.driveThisTick;
  else if (!a.frozen && a.input.moveDir) {
    const bps = a.sprinting ? a.sprintBps : a.walkBps;
    const d = flat(a.input.moveDir);
    desired = { x: (d.x * bps) / 20, y: 0, z: (d.z * bps) / 20 };
  }
  let vy = 0;
  if (a.flags.has("flying")) {
    const target = floorY + (a.res.hoverHeight ?? 3);
    vy = Math.max(-0.2, Math.min(0.2, (target - e.location.y) * 0.25)) - v.y * 0.5;
  }
  if (desired) {
    e.applyImpulse({ x: desired.x * gain - v.x, y: vy, z: desired.z * gain - v.z });
  } else if (Math.abs(v.x) + Math.abs(v.z) > 0.01 || vy !== 0) {
    e.applyImpulse({ x: -v.x * 0.6, y: vy, z: -v.z * 0.6 });
  }
  body.driveThisTick = null;
  // Rotation: look at a point if asked, else face the movement direction.
  const look = a.input.lookAt ? flat({ x: a.input.lookAt.x - e.location.x, y: 0, z: a.input.lookAt.z - e.location.z }) : desired ? flat(desired) : null;
  if (look && (look.x !== 0 || look.z !== 0)) e.setRotation({ x: 0, y: dirToYaw(look) });
}

export interface PlayerMoveCache {
  attr: number;
  frozen: boolean;
  hunger: number;
  hearts: number;
}

/** Applies speed attribute, freeze, sprint lock (hunger) and heart display to a human player. */
export function applyPlayerMovement(a: Actor, p: Player, cache: PlayerMoveCache): void {
  if (!p.isValid) return;
  const frozen = a.frozen && !a.forced;
  if (frozen !== cache.frozen) {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, !frozen);
    cache.frozen = frozen;
  }
  if (config().playerSpeedMode === "attribute") {
    const sprinting = p.isSprinting;
    const bps = sprinting ? (a.canSprint && !a.exhausted ? a.sprintBps : a.walkBps) : a.walkBps;
    const attr = Math.max(0, Math.min(1, movementAttribute(bps, sprinting)));
    if (Math.abs(attr - cache.attr) > 0.0005) {
      const mv = p.getComponent(EntityComponentTypes.Movement);
      if (mv && mv.setCurrentValue(attr)) cache.attr = attr;
    }
  } else {
    // Fallback: vanilla Speed/Slowness approximation (each level ±20% in vanilla).
    const ratio = (a.sprinting ? a.sprintBps : a.walkBps) / (a.sprinting ? 5.612 : 4.317);
    const lvl = Math.round((ratio - 1) / 0.2);
    if (lvl > 0) p.addEffect("speed", 30, { amplifier: Math.min(4, lvl - 1), showParticles: false });
    else if (lvl < 0) p.addEffect("slowness", 30, { amplifier: Math.min(4, -lvl - 1), showParticles: false });
  }
  // Sprint lock via hunger (<= 6 = no sprinting), otherwise hunger mirrors stamina (7..20).
  const hunger = a.exhausted || !a.canSprint ? 6 : 7 + Math.round((13 * a.stamina) / Math.max(1, a.staminaMax));
  if (hunger !== cache.hunger) {
    const hc = p.getComponent(EntityComponentTypes.Hunger);
    try {
      if (hc) hc.setCurrentValue(hunger);
      const sc = p.getComponent(EntityComponentTypes.Saturation);
      if (sc) sc.setCurrentValue(20);
      cache.hunger = hunger;
    } catch {
      cache.hunger = hunger; // attribute rejected: soft lock (walk speed while exhausted) still applies
    }
  }
  // Hearts as a proportional display of virtual HP (never 0 while alive).
  if (a.alive) {
    const hearts = Math.max(1, Math.ceil((a.hp / Math.max(1, a.maxHp)) * 20));
    if (hearts !== cache.hearts) {
      const h = p.getComponent(EntityComponentTypes.Health);
      try {
        h?.setCurrentValue(hearts);
        cache.hearts = hearts;
      } catch {
        cache.hearts = hearts;
      }
    }
  }
}

/** Restores the vanilla movement state of a player after a match. */
export function resetPlayerMovement(p: Player): void {
  if (!p.isValid) return;
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
    p.getComponent(EntityComponentTypes.Movement)?.resetToDefaultValue();
    p.getComponent(EntityComponentTypes.Hunger)?.resetToMaxValue();
    p.getComponent(EntityComponentTypes.Saturation)?.resetToMaxValue();
    p.getComponent(EntityComponentTypes.Health)?.resetToMaxValue();
  } catch {
    // components may be unavailable in spectator mode; nothing else to restore
  }
}

export function unitOrNull(v: Vec3 | null): Vec3 | null {
  return v ? norm(v) : null;
}
