// Stamina (wiki Statistics/Stamina): drain while sprinting, regen otherwise, 2 s exhaust at 0,
// regen starts later the longer you sprinted, killers only drain near survivors.
import type { Actor } from "./actor";
import { config } from "../core/config";
import { ticks } from "../core/scale";

export interface StaminaContext {
  dt: number;
  /** Actor wants to sprint and is moving. */
  wantsSprint: boolean;
  /** Killers: a survivor is within the drain range (85 studs). */
  drainAllowed: boolean;
  /** Abilities that pause regeneration (Void Rush, Charge, Ascension). */
  regenPaused: boolean;
}

/** Updates stamina; returns whether the actor is allowed to sprint this tick. */
export function updateStamina(a: Actor, ctx: StaminaContext): boolean {
  const s = config().stamina;
  const exhaustedLvl = a.statuses.level("exhausted");
  const drainMul = 1 + 0.1 * exhaustedLvl;
  const regenMul = Math.max(0, 1 - 0.1 * exhaustedLvl);
  const cap = Math.min(a.staminaMax, a.staminaCap ?? Infinity);

  if (a.staminaFrozen) {
    a.stamina = Math.min(a.stamina, cap);
    return a.canSprint && !a.exhausted && ctx.wantsSprint;
  }

  // Exhaustion lock releases once stamina has recovered a little.
  if (a.exhausted && a.stamina >= s.sprintUnlockAt && a.regenDelayTicks <= 0) a.exhausted = false;

  const sprinting = ctx.wantsSprint && !a.exhausted && a.stamina > 0;
  if (sprinting) {
    if (ctx.drainAllowed) a.stamina -= a.staminaDrain * drainMul * ctx.dt;
    a.sprintTicks++;
    if (a.stamina <= 0) {
      a.stamina = 0;
      a.exhausted = true;
      a.regenDelayTicks = ticks(s.exhaustSeconds);
      a.sprintTicks = 0;
    }
  } else {
    if (a.sprintTicks > 0) {
      // "Stamina will take longer to regenerate the longer you sprint."
      const delay = Math.min(s.regenDelayMax, (a.sprintTicks / 20) * s.regenDelayPerSprintSecond);
      a.regenDelayTicks = Math.max(a.regenDelayTicks, ticks(delay));
      a.sprintTicks = 0;
    }
    if (a.regenDelayTicks > 0) a.regenDelayTicks--;
    else if (!ctx.regenPaused) a.stamina += a.staminaRegen * regenMul * ctx.dt;
  }
  // Caps (Raging Pace) are animated by the ability itself, so clamping here is immediate.
  a.stamina = Math.max(0, Math.min(cap, a.stamina));
  return sprinting;
}

/** Instantly restores stamina (Trick, Two Time second life). */
export function addStamina(a: Actor, amount: number): void {
  a.stamina = Math.max(0, Math.min(a.staminaMax, a.stamina + amount));
  if (a.stamina >= config().stamina.sprintUnlockAt) {
    a.exhausted = false;
    a.regenDelayTicks = 0;
  }
}
