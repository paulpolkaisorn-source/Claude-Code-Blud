// Non-actor things that live in the arena: projectiles, traps, zones, buildings, pickups. Pure.
import type { Actor } from "../entities/actor";
import type { Team } from "../characters/types";
import type { PropHandle, PropKind } from "../core/ports";
import type { Game } from "../core/game";
import type { GridPos } from "../world/nav";
import type { Rgb } from "../core/fx";
import { add, len, scale, type Vec3 } from "../util/vec";
import { sweepHits } from "./hit";

export interface WorldObject {
  id: string;
  kind: string;
  owner: Actor | null;
  team: Team | null;
  pos: Vec3;
  radius: number;
  hp: number;
  maxHp: number;
  endTick: number;
  dead: boolean;
  prop: PropHandle | null;
  /** Grid cells blocked for bots while this object exists. */
  blockCells: GridPos[];
  /** Which team's attacks can damage it ("killer" for traps/buildings, "survivor" for minion-like objects). */
  targetableBy: Team | null;
  data: Record<string, unknown>;
  update?(o: WorldObject, game: Game): void;
  onDamaged?(o: WorldObject, game: Game, attacker: Actor, amount: number): void;
  onRemove?(o: WorldObject, game: Game, reason: "expired" | "destroyed" | "cleanup" | "consumed"): void;
}

export interface ObjectSpec {
  kind: string;
  owner: Actor | null;
  pos: Vec3;
  radius?: number;
  hp?: number;
  lifeSeconds?: number;
  prop?: PropKind;
  propName?: string;
  blockCells?: GridPos[];
  targetableBy?: Team | null;
  data?: Record<string, unknown>;
  update?: WorldObject["update"];
  onDamaged?: WorldObject["onDamaged"];
  onRemove?: WorldObject["onRemove"];
}

export type HitFilter = "enemies" | "allies" | "all" | "killer" | "survivors";

export interface ProjectileSpec {
  owner: Actor;
  kind: string;
  pos: Vec3;
  /** Blocks per tick. */
  vel: Vec3;
  /** Blocks per tick² (downward). */
  gravity?: number;
  radius: number;
  lifeSeconds: number;
  throughWalls?: boolean;
  /** Keep flying after hitting an actor. */
  pierce?: boolean;
  hit: HitFilter;
  /** Include minions as targets. */
  hitMinions?: boolean;
  particle?: string;
  color?: Rgb;
  prop?: PropKind;
  data?: Record<string, unknown>;
  /** Return true to stop the projectile. */
  onHitActor?(o: WorldObject, target: Actor, game: Game): boolean;
  onHitWall?(o: WorldObject, at: Vec3, game: Game, surface: "wall" | "floor"): void;
  onExpire?(o: WorldObject, game: Game): void;
  onTick?(o: WorldObject, game: Game): void;
}

export function matchesFilter(owner: Actor, target: Actor, f: HitFilter): boolean {
  switch (f) {
    case "enemies":
      return target.team !== owner.team;
    case "allies":
      return target.team === owner.team && target !== owner;
    case "all":
      return target !== owner;
    case "killer":
      return target.team === "killer";
    case "survivors":
      return target.team === "survivor";
  }
}

/** Creates a script-simulated projectile (no Minecraft projectile entity involved). */
export function spawnProjectile(game: Game, spec: ProjectileSpec): WorldObject {
  const hitSet = new Set<string>();
  return game.spawnObject({
    kind: spec.kind,
    owner: spec.owner,
    pos: { ...spec.pos },
    radius: spec.radius,
    lifeSeconds: spec.lifeSeconds,
    prop: spec.prop,
    data: { ...(spec.data ?? {}), vel: { ...spec.vel }, hitSet },
    update(o, g) {
      const vel = o.data.vel as Vec3;
      if (spec.gravity) vel.y -= spec.gravity;
      const speed = len(vel);
      const steps = Math.max(1, Math.ceil(speed / 0.45));
      const stepV = scale(vel, 1 / steps);
      for (let s = 0; s < steps && !o.dead; s++) {
        const from = o.pos;
        const to = add(from, stepV);
        // actors
        for (const t of g.actors) {
          if (!t.alive || hitSet.has(t.id) || t === spec.owner) continue;
          if (t.isMinion && !spec.hitMinions && !t.flags.has("hittableMinion")) continue;
          if (!matchesFilter(spec.owner, t, spec.hit)) continue;
          if (!sweepHits(from, to, o.radius, t)) continue;
          hitSet.add(t.id);
          const stop = spec.onHitActor ? spec.onHitActor(o, t, g) : true;
          if (stop && !spec.pierce) {
            g.removeObject(o, "consumed");
            return;
          }
        }
        // floor
        const floorY = g.grid.originY;
        if (to.y <= floorY + 0.05 && (spec.gravity ?? 0) > 0) {
          spec.onHitWall?.(o, { x: to.x, y: floorY, z: to.z }, g, "floor");
          g.removeObject(o, "consumed");
          return;
        }
        // walls
        if (!spec.throughWalls) {
          const cx = Math.floor(to.x - g.grid.originX);
          const cz = Math.floor(to.z - g.grid.originZ);
          if (g.grid.blocksProjectile(cx, cz, to.y - floorY) || to.y > floorY + 11.5) {
            spec.onHitWall?.(o, from, g, "wall");
            g.removeObject(o, "consumed");
            return;
          }
        }
        o.pos = to;
      }
      if (o.prop) o.prop.move(o.pos);
      if (spec.particle) g.fx.particle(spec.particle, o.pos, { color: spec.color });
      spec.onTick?.(o, g);
    },
    onRemove(o, g, reason) {
      if (reason === "expired") spec.onExpire?.(o, g);
    },
  });
}
