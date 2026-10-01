// Ability engine shared by players and bots: the same checks, cooldowns and handlers for both.
import type { Actor } from "../entities/actor";
import type { AbilityDef } from "../characters/types";
import type { Game } from "../core/game";
import { activeHooks } from "../entities/combat";
import { ticks } from "../core/scale";

export interface AbilityCtx {
  game: Game;
  actor: Actor;
  def: AbilityDef;
  now: number;
  /** Numeric parameter from the ability's data (throws if missing, so data and code stay in sync). */
  n(key: string): number;
  /** Optional numeric parameter. */
  opt(key: string, fallback: number): number;
  /** Any parameter. */
  param<T>(key: string): T;
  /** Per-ability runtime data on the actor. */
  data: Record<string, unknown>;
}

export type UseResult = void | boolean | { cooldown?: number; noCooldown?: boolean };

export interface AbilityHandler {
  /** Extra precondition; return a reason string to deny. */
  can?(ctx: AbilityCtx): true | string;
  /** First press. false = failed cast (no cooldown); { noCooldown } = handler starts it later. */
  use(ctx: AbilityCtx): UseResult;
  /** Second press for charge/toggle inputs (tap to release / stop). */
  release?(ctx: AbilityCtx): void;
  /** Whether a second press should go to release() right now. */
  isActive?(ctx: AbilityCtx): boolean;
  /** Short HUD suffix (charges, mode, Blood cost...). */
  hud?(ctx: AbilityCtx): string | null;
  /** Usable while Helpless (e.g. cancelling Sk8). */
  ignoresHelpless?: boolean | ((ctx: AbilityCtx) => boolean);
  /** Usable while repairing a generator. */
  usableWhileRepairing?: boolean;
  /** Can be pressed while a windup / channel is running (default: no). */
  usableWhileChanneling?: boolean;
}

export interface Kit {
  id: string;
  abilities: Record<string, AbilityHandler>;
  /** Once per match, after the actor is created (resources, passives, hooks). */
  init?(actor: Actor, game: Game): void;
  /** Every tick while alive (passives). */
  tick?(actor: Actor, game: Game): void;
  /** Cooldown override (Slasher's ENRAGED values etc.). */
  cooldownFor?(actor: Actor, abilityId: string, base: number, game: Game): number;
}

export type KitRegistry = ReadonlyMap<string, Kit>;

export interface UseOutcome {
  ok: boolean;
  reason?: string;
}

export function makeCtx(game: Game, actor: Actor, def: AbilityDef): AbilityCtx {
  const params = def.params;
  return {
    game,
    actor,
    def,
    now: game.now,
    n(key: string): number {
      const v = params[key];
      if (typeof v !== "number") throw new Error(`${actor.character.id}.${def.id}: numeric param "${key}" missing`);
      return v;
    },
    opt(key: string, fallback: number): number {
      const v = params[key];
      return typeof v === "number" ? v : fallback;
    },
    param<T>(key: string): T {
      return params[key] as T;
    },
    data: actor.data(def.id),
  };
}

/** Why an ability cannot be used right now, or null if it can. */
export function blockReason(game: Game, actor: Actor, def: AbilityDef, handler: AbilityHandler, ctx: AbilityCtx, releasing: boolean): string | null {
  if (!actor.alive) return "dead";
  if (game.phase !== "ROUND" && game.phase !== "HEAD_START") return "not in a round";
  if (game.phase === "HEAD_START" && actor.isKiller) return "head start";
  if (actor.isStunned(game.now)) return "stunned";
  if (actor.repairing && !handler.usableWhileRepairing) return "repairing";
  const ignoresHelpless = typeof handler.ignoresHelpless === "function" ? handler.ignoresHelpless(ctx) : handler.ignoresHelpless === true;
  if (actor.statuses.has("helpless") && !ignoresHelpless && !releasing) return "helpless";
  if (actor.flags.has("locked")) return "busy";
  // A windup / channel in progress blocks other presses (releasing a charge ability is still allowed).
  if (actor.channel && !releasing && !handler.usableWhileChanneling) return "busy";
  if (!releasing) {
    const rem = actor.cooldowns.remaining(def.id, game.now);
    if (rem > 0) return rem === Infinity ? "active" : `cooldown ${(rem / 20).toFixed(1)}s`;
  }
  if (!releasing && handler.can) {
    const r = handler.can(ctx);
    if (r !== true) return r;
  }
  return null;
}

/**
 * Presses an ability. If the ability is a charge/toggle and currently active, the press releases it.
 */
export function useAbility(game: Game, actor: Actor, abilityId: string): UseOutcome {
  const def = actor.ability(abilityId);
  if (!def) return { ok: false, reason: "unknown ability" };
  const kit = game.kits.get(actor.character.id);
  const handler = kit?.abilities[abilityId];
  if (!handler) return { ok: false, reason: "no handler" };
  const ctx = makeCtx(game, actor, def);
  const releasing = !!handler.release && (handler.isActive ? handler.isActive(ctx) : ctx.data.active === true);
  const reason = blockReason(game, actor, def, handler, ctx, releasing);
  if (reason) return { ok: false, reason };
  if (releasing && handler.release) {
    handler.release(ctx);
    return { ok: true };
  }
  const res = handler.use(ctx);
  if (res === false) return { ok: false, reason: "failed" };
  actor.stats.abilitiesUsed++;
  if (typeof res === "object" && res !== null && res.noCooldown) {
    // handler starts the cooldown itself
  } else {
    const cd = typeof res === "object" && res !== null && res.cooldown !== undefined ? res.cooldown : cooldownFor(game, actor, def);
    if (cd > 0) game.startCooldown(actor, abilityId, cd);
  }
  for (const fn of activeHooks(actor, "abilityUsed", game.now)) fn(actor, abilityId, game);
  return { ok: true };
}

/** Cooldown in seconds for an ability, after kit overrides. */
export function cooldownFor(game: Game, actor: Actor, def: AbilityDef): number {
  const base = def.cooldown ?? 0;
  const kit = game.kits.get(actor.character.id);
  return kit?.cooldownFor ? kit.cooldownFor(actor, def.id, base, game) : base;
}

/** Applies round-start cooldowns (e.g. Noli's Void Rush 10 s, 1x1x1x1's Unstable Eye 12.5 s). */
export function applyStartCooldowns(game: Game, actor: Actor): void {
  for (const def of actor.character.abilities) {
    if (def.startCooldown && def.startCooldown > 0) actor.cooldowns.start(def.id, ticks(def.startCooldown), game.now);
  }
}

/** HUD label for one ability: "[2] Behead 12.4s". */
export function abilityHudText(game: Game, actor: Actor, def: AbilityDef): { label: string; ready: boolean; remaining: number } {
  const kit = game.kits.get(actor.character.id);
  const handler = kit?.abilities[def.id];
  const ctx = makeCtx(game, actor, def);
  const rem = actor.cooldowns.remaining(def.id, game.now);
  const suffix = handler?.hud ? handler.hud(ctx) : null;
  const active = handler?.release && (handler.isActive ? handler.isActive(ctx) : ctx.data.active === true);
  let state: string;
  if (active) state = "§aACTIVE";
  else if (rem === Infinity) state = "§7ACTIVE";
  else if (rem > 0) state = `§c${(rem / 20).toFixed(1)}s`;
  else state = "§aREADY";
  return { label: `§f[${def.slot}] ${def.name} ${state}${suffix ? ` §7${suffix}` : ""}`, ready: rem <= 0, remaining: rem / 20 };
}
