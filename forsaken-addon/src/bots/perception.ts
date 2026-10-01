// What a bot can know without cheating: vision cone + line of sight, hearing, and its own aura reveals.
import type { Actor } from "../entities/actor";
import type { Game } from "../core/game";
import { config } from "../core/config";
import { dist2D, dot, flat, sub, type Vec3 } from "../util/vec";

export interface Sighting {
  id: string;
  pos: Vec3;
  tick: number;
  /** How it was learned. */
  how: "sight" | "aura" | "sound" | "terror" | "touch" | "shout";
}

export class Memory {
  private readonly seen = new Map<string, Sighting>();
  readonly noises: Array<{ pos: Vec3; tick: number; kind: string }> = [];

  note(s: Sighting): void {
    const old = this.seen.get(s.id);
    if (!old || old.tick <= s.tick) this.seen.set(s.id, s);
  }

  get(id: string): Sighting | undefined {
    return this.seen.get(id);
  }

  /** Most recent sighting no older than maxAgeTicks. */
  recent(id: string, now: number, maxAgeTicks: number): Sighting | undefined {
    const s = this.seen.get(id);
    return s && now - s.tick <= maxAgeTicks ? s : undefined;
  }

  all(): Sighting[] {
    return [...this.seen.values()];
  }

  forget(id: string): void {
    this.seen.delete(id);
  }

  noise(pos: Vec3, tick: number, kind: string): void {
    this.noises.push({ pos, tick, kind });
    while (this.noises.length > 12) this.noises.shift();
  }
}

/** Effective vision range in blocks (Blindness −20% per level). */
export function visionRange(a: Actor): number {
  return config().bots.visionBlocks * Math.max(0.3, 1 - 0.2 * a.statuses.level("blindness"));
}

/** Can `a` currently see `t`? Cone + range + line of sight + invisibility. */
export function canSee(game: Game, a: Actor, t: Actor): boolean {
  if (!t.alive) return false;
  const d = dist2D(a.pos, t.pos);
  // Invisibility: each level hides more; IV+ only seen at arm's length.
  const inv = t.statuses.level("invisibility");
  const maxD = inv >= 4 ? 2 : inv >= 3 ? 5 : visionRange(a) * (1 - 0.15 * inv);
  if (d > maxD) return false;
  if (d > 2.5) {
    const half = (config().bots.visionDegrees / 2) * (Math.PI / 180);
    const f = flat(a.facing);
    const dir = flat(sub(t.pos, a.pos));
    if (dot(f, dir) < Math.cos(half)) return false;
  }
  return game.lineOfSight({ x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }, { x: t.pos.x, y: t.pos.y + 1.6, z: t.pos.z });
}

/** Footsteps: sprinting/moving actors are heard nearby unless silent (Levitation), crouching or invisible. */
export function canHear(a: Actor, t: Actor): boolean {
  if (!t.alive || t.flags.has("silent") || t.flags.has("crouching") || t.statuses.level("invisibility") > 0) return false;
  const d = dist2D(a.pos, t.pos);
  const loud = t.state.speed > 0.2 ? 10 : t.state.speed > 0.05 ? 5 : 0;
  return d <= loud;
}

/** Updates a bot's memory of enemies from sight, auras, footsteps and (survivors) the terror radius. */
export function perceive(game: Game, a: Actor, mem: Memory): void {
  const now = game.now;
  for (const t of game.enemiesOf(a, true)) {
    // Survivor-side minions (007n7 clones) are deliberately indistinguishable from survivors.
    if (canSee(game, a, t)) mem.note({ id: t.id, pos: { ...t.pos }, tick: now, how: "sight" });
    else if (game.isRevealedTo(t, a)) mem.note({ id: t.id, pos: { ...t.pos }, tick: now, how: "aura" });
    // Footsteps only give a rough position (±1.5 blocks).
    else if (canHear(a, t)) mem.note({ id: t.id, pos: { x: t.pos.x + (game.rng.next() - 0.5) * 3, y: t.pos.y, z: t.pos.z + (game.rng.next() - 0.5) * 3 }, tick: now, how: "sound" });
    else if (dist2D(a.pos, t.pos) < 1.2) mem.note({ id: t.id, pos: { ...t.pos }, tick: now, how: "touch" });
  }
  // Survivors feel the terror radius (direction is only approximate: ±3 blocks of noise).
  const k = game.killer;
  if (a.team === "survivor" && k && k.alive && !a.statuses.has("oblivious")) {
    const d = dist2D(a.pos, k.pos);
    if (d <= game.terrorRadius(k) && !mem.recent(k.id, now, 10)) {
      const jitter = (n: number) => n + (game.rng.next() - 0.5) * 6;
      mem.note({ id: k.id, pos: { x: jitter(k.pos.x), y: k.pos.y, z: jitter(k.pos.z) }, tick: now, how: "terror" });
    }
  }
}
