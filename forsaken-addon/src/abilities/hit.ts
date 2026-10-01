// Hit-detection geometry. Actors are vertical capsules (feet at pos, 1.8 tall, radius 0.35). Pure.
import type { Actor } from "../entities/actor";
import { add, dist2D, distPointSegment, distSegmentSegment, dot, flat, len2D, sub, type Vec3 } from "../util/vec";

export const ACTOR_HEIGHT = 1.8;
export const ACTOR_RADIUS = 0.35;

export function capsule(a: Actor): { bottom: Vec3; top: Vec3 } {
  const scale = a.flags.has("tall") ? 1.15 : 1;
  return { bottom: { x: a.pos.x, y: a.pos.y + ACTOR_RADIUS, z: a.pos.z }, top: { x: a.pos.x, y: a.pos.y + ACTOR_HEIGHT * scale - ACTOR_RADIUS, z: a.pos.z } };
}

export function eye(a: Actor): Vec3 {
  return { x: a.pos.x, y: a.pos.y + 1.62, z: a.pos.z };
}

/**
 * Melee arc: target within `range` blocks (horizontal, to the capsule surface) and within `halfAngle`
 * degrees of the attacker's horizontal facing; vertical overlap within `heightTol` blocks.
 */
export function inArc(attacker: Actor, target: Actor, range: number, halfAngle: number, heightTol = 2): boolean {
  const toT = sub(target.pos, attacker.pos);
  const d = len2D(toT) - ACTOR_RADIUS;
  if (d > range) return false;
  if (Math.abs(target.pos.y - attacker.pos.y) > heightTol) return false;
  if (d <= 0.6) return true; // overlapping bodies always count
  const f = flat(attacker.facing);
  const t = flat(toT);
  const cos = dot(f, t);
  return cos >= Math.cos((halfAngle * Math.PI) / 180);
}

/** Oriented box in front of `origin` along horizontal `dir`: length × (2·halfWidth), vertical ±heightTol. */
export function inBox(origin: Vec3, dir: Vec3, length: number, halfWidth: number, target: Actor, heightTol = 2): boolean {
  const f = flat(dir);
  const rel = sub(target.pos, origin);
  const along = rel.x * f.x + rel.z * f.z;
  const side = Math.abs(rel.x * -f.z + rel.z * f.x);
  if (along < -ACTOR_RADIUS || along > length + ACTOR_RADIUS) return false;
  if (side > halfWidth + ACTOR_RADIUS) return false;
  return Math.abs(target.pos.y - origin.y) <= heightTol;
}

export function inSphere(center: Vec3, radius: number, target: Actor): boolean {
  const c = capsule(target);
  return distPointSegment(center, c.bottom, c.top) <= radius + ACTOR_RADIUS;
}

/** Swept sphere (projectile step a→b with `radius`) against the target capsule. */
export function sweepHits(a: Vec3, b: Vec3, radius: number, target: Actor): boolean {
  const c = capsule(target);
  return distSegmentSegment(a, b, c.bottom, c.top) <= radius + ACTOR_RADIUS;
}

/** Is `target` behind `of` (backstab test): angle between of's facing and of→target > 180-halfAngle... i.e. attacker is in the rear arc. */
export function isBehind(attacker: Actor, victim: Actor, rearHalfAngle = 70): boolean {
  const toAttacker = flat(sub(attacker.pos, victim.pos));
  const f = flat(victim.facing);
  // attacker in the cone opposite to the victim's facing
  return dot(f, toAttacker) <= -Math.cos((rearHalfAngle * Math.PI) / 180);
}

/** Point `dist` blocks in front of an actor at chest height. */
export function front(a: Actor, distance: number, height = 1.0): Vec3 {
  const f = flat(a.facing);
  return add(a.pos, { x: f.x * distance, y: height, z: f.z * distance });
}

export function horizontalDistance(a: Actor, b: Actor): number {
  return dist2D(a.pos, b.pos);
}
