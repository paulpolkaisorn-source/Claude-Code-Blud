/** Plain 3D vector used everywhere in the pure game model (blocks). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const ZERO: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });

export function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function len(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function len2D(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.z * a.z);
}

export function dist(a: Vec3, b: Vec3): number {
  return len(sub(a, b));
}

/** Horizontal (XZ) distance. Most gameplay ranges are measured flat because the arena floor is flat. */
export function dist2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function norm(a: Vec3): Vec3 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 0 };
}

/** Horizontal unit vector (y = 0). */
export function flat(a: Vec3): Vec3 {
  const l = len2D(a);
  return l > 1e-9 ? { x: a.x / l, y: 0, z: a.z / l } : { x: 0, y: 0, z: 0 };
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

export function clone(a: Vec3): Vec3 {
  return { x: a.x, y: a.y, z: a.z };
}

export function eq(a: Vec3, b: Vec3, eps = 1e-6): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.z - b.z) < eps;
}

/**
 * Minecraft yaw (degrees): 0 = +Z (south), 90 = -X (west), 180/-180 = -Z (north), -90 = +X (east).
 * Returns the horizontal unit direction for a yaw.
 */
export function yawToDir(yawDeg: number): Vec3 {
  const r = (yawDeg * Math.PI) / 180;
  return { x: -Math.sin(r), y: 0, z: Math.cos(r) };
}

/** Inverse of yawToDir. */
export function dirToYaw(d: Vec3): number {
  return (Math.atan2(-d.x, d.z) * 180) / Math.PI;
}

/** Rotates a vector around the Y axis by `deg` degrees (same handedness as Minecraft yaw). */
export function rotateY(d: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: d.x * c - d.z * s, y: d.y, z: d.x * s + d.z * c };
}

/** Signed horizontal angle in degrees from `a` to `b` (both horizontal directions), in (-180, 180]. */
export function angleBetween2D(a: Vec3, b: Vec3): number {
  const ya = dirToYaw(a);
  const yb = dirToYaw(b);
  let d = yb - ya;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

/** Distance from point p to segment ab (3D). */
export function distPointSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, scale(ab, t)));
}

/** Shortest distance between segments p1q1 and p2q2 (used for capsule tests). */
export function distSegmentSegment(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s: number;
  let t: number;
  if (a <= 1e-12 && e <= 1e-12) return dist(p1, p2);
  if (a <= 1e-12) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const c1 = add(p1, scale(d1, s));
  const c2 = add(p2, scale(d2, t));
  return dist(c1, c2);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
