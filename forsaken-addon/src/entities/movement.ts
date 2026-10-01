// Effective walk/sprint speeds per actor (brief §3.10: speeds are multiples of survivor sprint speed).
import type { Actor } from "./actor";
import { speedStatusMultiplier } from "./statuses";
import { blocksPerSecond } from "../core/scale";
import { config } from "../core/config";

export interface SpeedContext {
  now: number;
  /** Killers: true when no survivor is within 85 studs (+10% speed, wiki 3.6.2). */
  killerFar: boolean;
}

export interface Speeds {
  walkBps: number;
  sprintBps: number;
  canSprint: boolean;
  frozen: boolean;
}

export function computeSpeeds(a: Actor, ctx: SpeedContext): Speeds {
  const st = a.character.stats;
  let walk = st.walk;
  let sprint = st.sprint;
  let mul = 1;
  let canSprint = true;
  let frozen = false;
  let ignoreStatuses = false;

  // Movement rules from abilities (latest set* wins; multipliers stack).
  const mods = a.moveMods.filter((m) => m.endTick > ctx.now);
  for (const m of mods) {
    if (m.walkStuds !== undefined) walk = m.walkStuds;
    if (m.sprintStuds !== undefined) sprint = m.sprintStuds;
    if (m.mul !== undefined) mul *= m.mul;
    if (m.noSprint) canSprint = false;
    if (m.frozen) frozen = true;
    if (m.ignoreStatuses) ignoreStatuses = true;
  }
  if (!ignoreStatuses) {
    mul *= speedStatusMultiplier(a.statuses);
    if (a.statuses.has("slateskin")) mul *= 0.55;
  }
  if (a.isStunned(ctx.now)) frozen = true;
  if (a.repairing) frozen = true;
  // Limping (survivors at <= 50% HP).
  if (st.limps && a.team === "survivor" && a.hp <= a.maxHp * config().combat.limpHpFraction) mul *= config().combat.limpSpeedMultiplier;
  if (a.isKiller && ctx.killerFar) mul *= 1 + config().combat.killerFarSpeedBonus;
  if (a.exhausted) canSprint = false;

  const walkBps = frozen ? 0 : blocksPerSecond(walk) * mul;
  const sprintBps = frozen ? 0 : blocksPerSecond(canSprint ? sprint : walk) * mul;
  return { walkBps, sprintBps, canSprint, frozen };
}
