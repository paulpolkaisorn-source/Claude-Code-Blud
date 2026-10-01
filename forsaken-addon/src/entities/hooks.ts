import type { Actor } from "./actor";
import type { StatusId } from "./statuses";
import type { Game } from "../core/game";
import type { Generator } from "../world/generators";

export type DamageKind = "basic" | "ability" | "dot" | "self" | "minion" | "environment";

export interface DamageEvent {
  target: Actor;
  source: Actor | null;
  /** Raw amount before multipliers; hooks may change it. */
  amount: number;
  kind: DamageKind;
  abilityId: string | null;
  /** Free tags: "melee", "projectile", "aoe", "grab", "sentry", "tripmine", "fake", ... */
  tags: Set<string>;
  canKill: boolean;
  /** HP floor for damage over time (Bleeding 10, Poison 1). */
  floor: number;
  bypassInvincible: boolean;
  ignoreResistance: boolean;
  cancelled: boolean;
  cancelReason: string;
  /** Multiplier applied after hooks (hooks multiply this, e.g. Guest 1337 failed block 0.6). */
  multiplier: number;
  // results
  absorbed: number;
  dealt: number;
  killed: boolean;
  prevented: boolean;
}

export interface StatusChange {
  level: number;
  seconds: number;
}

export interface Hooks {
  tick(self: Actor, game: Game): void;
  beforeTakeDamage(self: Actor, ev: DamageEvent, game: Game): void;
  afterTakeDamage(self: Actor, ev: DamageEvent, game: Game): void;
  beforeDealDamage(self: Actor, ev: DamageEvent, game: Game): void;
  afterDealDamage(self: Actor, ev: DamageEvent, game: Game): void;
  /** Return true to prevent the death (HP is left at the value the hook sets). */
  lethal(self: Actor, ev: DamageEvent, game: Game): boolean;
  /** Return a new stun duration in seconds (or the same). */
  modifyStun(self: Actor, seconds: number, source: Actor | null, game: Game): number;
  afterStunned(self: Actor, seconds: number, source: Actor | null, game: Game): void;
  /** Return null to block the status, or a modified level/duration. */
  modifyStatus(self: Actor, id: StatusId, change: StatusChange, source: Actor | null, game: Game): StatusChange | null;
  statusRemoved(self: Actor, id: StatusId, game: Game): void;
  abilityUsed(self: Actor, abilityId: string, game: Game): void;
  kill(self: Actor, victim: Actor, ev: DamageEvent | null, game: Game): void;
  /** Called on every actor whenever anyone takes damage (observers like Elliot). */
  anyDamage(self: Actor, ev: DamageEvent, game: Game): void;
  /** Called on every actor whenever any actor dies. */
  anyDeath(self: Actor, victim: Actor, game: Game): void;
  layerRepaired(self: Actor, gen: Generator, repairer: Actor, game: Game): void;
  generatorCompleted(self: Actor, gen: Generator, game: Game): void;
  /** Heal about to be applied to self; return the new amount (0 blocks). */
  modifyHeal(self: Actor, amount: number, source: Actor | null, game: Game): number;
}
