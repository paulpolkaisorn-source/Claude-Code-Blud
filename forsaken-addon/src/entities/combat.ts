// Damage, healing, statuses and stuns. Every HP change in the game goes through these functions.
import type { Actor, ShieldLayer } from "./actor";
import type { DamageEvent, DamageKind, Hooks, StatusChange } from "./hooks";
import { incomingDamageMultiplier, outgoingDamageMultiplier, SLATESKIN_IMMUNE, statusDef, type ApplyOptions, type StatusId } from "./statuses";
import type { Game } from "../core/game";
import { config } from "../core/config";
import { ticks } from "../core/scale";

export interface DamageOptions {
  kind?: DamageKind;
  abilityId?: string | null;
  tags?: string[];
  canKill?: boolean;
  floor?: number;
  bypassInvincible?: boolean;
  ignoreResistance?: boolean;
  /** Skip the survivor on-hit speed boost. */
  noOnHitSpeed?: boolean;
}

// ----------------------------------------------------------------------------- hook helpers

type HookName = keyof Hooks;

export function activeHooks<K extends HookName>(actor: Actor, name: K, now: number): Array<NonNullable<Hooks[K]>> {
  const out: Array<NonNullable<Hooks[K]>> = [];
  for (const h of actor.hooks) {
    if (h.endTick <= now) continue;
    const fn = h.hooks[name];
    if (fn) out.push(fn as NonNullable<Hooks[K]>);
  }
  return out;
}

export function pruneHooks(actor: Actor, now: number): void {
  if (actor.hooks.some((h) => h.endTick <= now)) actor.hooks = actor.hooks.filter((h) => h.endTick > now);
}

// ----------------------------------------------------------------------------- damage

export function makeDamageEvent(target: Actor, source: Actor | null, amount: number, opts: DamageOptions): DamageEvent {
  const kind = opts.kind ?? "ability";
  return {
    target,
    source,
    amount,
    kind,
    abilityId: opts.abilityId ?? null,
    tags: new Set(opts.tags ?? []),
    canKill: opts.canKill ?? true,
    floor: opts.floor ?? 0,
    bypassInvincible: opts.bypassInvincible ?? false,
    ignoreResistance: opts.ignoreResistance ?? false,
    cancelled: false,
    cancelReason: "",
    multiplier: 1,
    absorbed: 0,
    dealt: 0,
    killed: false,
    prevented: false,
  };
}

/**
 * The damage pipeline:
 * 1. dead/invulnerable checks  2. source hooks (Strength/Weakness multiplier)  3. target hooks (blocks, shields)
 * 4. Resistance/Vulnerable/Creatures  5. shield layers  6. HP with floors  7. lethal hooks  8. after-effects.
 */
export function dealDamage(game: Game, target: Actor, amount: number, source: Actor | null, opts: DamageOptions = {}): DamageEvent {
  const ev = makeDamageEvent(target, source, amount, opts);
  const now = game.now;
  if (!target.alive || amount <= 0) {
    ev.cancelled = true;
    ev.cancelReason = "dead";
    return ev;
  }
  const isDot = ev.kind === "dot";
  if (!ev.bypassInvincible && !isDot && ev.kind !== "self") {
    if (now < target.invulnerableUntil || target.statuses.has("invincible")) {
      ev.cancelled = true;
      ev.cancelReason = "invincible";
      return ev;
    }
  }
  // Source-side modifiers.
  if (source && source.alive !== undefined && ev.kind !== "dot" && ev.kind !== "self") {
    ev.multiplier *= outgoingDamageMultiplier(source.statuses);
    for (const fn of activeHooks(source, "beforeDealDamage", now)) fn(source, ev, game);
  }
  if (ev.cancelled) return ev;
  for (const fn of activeHooks(target, "beforeTakeDamage", now)) {
    fn(target, ev, game);
    if (ev.cancelled) return ev;
  }
  // Status multipliers.
  let amt = ev.amount * ev.multiplier;
  if (!ev.ignoreResistance) {
    if (isDot && ev.abilityId === "status:burning" && target.statuses.level("resistance") > 0) amt = 0;
    amt *= incomingDamageMultiplier(target.statuses);
  }
  // Purified: one hit reduced by 20% per 20 missing HP (max 80%).
  if (!isDot && target.statuses.has("purified") && amt > 0) {
    const missing = Math.max(0, target.maxHp - target.hp);
    const red = Math.min(0.8, Math.floor(missing / 20) * 0.2);
    amt *= 1 - red;
    target.statuses.remove("purified");
  }
  if (amt <= 0) {
    ev.dealt = 0;
    ev.cancelled = amt <= 0 && ev.amount > 0;
    ev.cancelReason = "resisted";
    return ev;
  }
  // Shield layers (overheal, Slateskin, Shatterpoint).
  let rest = amt;
  for (const layer of target.shields) {
    if (rest <= 0) break;
    if (layer.amount <= 0) continue;
    const red = isDot && layer.dotSkipsReduction ? 0 : layer.reduction;
    const effective = rest * (1 - red); // what the layer has to soak
    if (effective <= layer.amount) {
      layer.amount -= effective;
      ev.absorbed += rest;
      rest = 0;
    } else {
      // The layer breaks; the unabsorbed fraction passes through without the reduction.
      const soakedRaw = layer.amount / (1 - red || 1);
      ev.absorbed += soakedRaw;
      rest -= soakedRaw;
      layer.amount = 0;
    }
  }
  const brokenLayers = target.shields.filter((l) => l.amount <= 0.0001);
  target.shields = target.shields.filter((l) => l.amount > 0.0001);
  for (const l of brokenLayers) game.onShieldBroken(target, l);
  // HP
  if (rest > 0) {
    const floor = ev.floor;
    if (floor > 0 && target.hp <= floor) rest = 0;
    else if (floor > 0) rest = Math.min(rest, target.hp - floor);
    if (!ev.canKill) rest = Math.min(rest, Math.max(0, target.hp - 1));
  }
  // Overkill is not counted: HP never drops below 0 and stats / hooks see the HP actually removed.
  rest = Math.min(rest, Math.max(0, target.hp));
  ev.dealt = rest;
  target.hp -= rest;
  const totalLoss = ev.dealt + ev.absorbed;
  target.stats.damageTaken += totalLoss;
  if (source) source.stats.damageDealt += totalLoss;
  if (rest > 0) {
    target.lastDamagedTick = now;
    if (source) target.lastHitBy = source.id;
  }
  // Lethal?
  if (target.hp <= 0.0001) {
    let prevented = false;
    for (const fn of activeHooks(target, "lethal", now)) {
      if (fn(target, ev, game)) {
        prevented = true;
        break;
      }
    }
    if (prevented) {
      ev.prevented = true;
      if (target.hp <= 0) target.hp = 1;
    } else {
      target.hp = 0;
      ev.killed = true;
    }
  }
  game.afterDamage(ev);
  return ev;
}

// ----------------------------------------------------------------------------- healing

export interface HealOptions {
  /** "self" heals (Veeronica battery) are not "external". */
  external?: boolean;
  /** Overflow becomes overheal of this layer id. */
  overhealLayer?: string;
}

export function heal(game: Game, target: Actor, amount: number, source: Actor | null, opts: HealOptions = {}): number {
  if (!target.alive || amount <= 0) return 0;
  let amt = amount;
  for (const fn of activeHooks(target, "modifyHeal", game.now)) amt = fn(target, amt, source, game);
  if (amt <= 0) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amt);
  const healed = target.hp - before;
  if (source && healed > 0) source.stats.healingDone += healed;
  if (healed > 0) game.fx.particle("heal", { x: target.pos.x, y: target.pos.y + 2, z: target.pos.z });
  return healed;
}

/** Adds or refreshes an overheal layer. */
export function addShield(target: Actor, layer: Omit<ShieldLayer, "max"> & { max?: number }): ShieldLayer {
  const existing = target.shield(layer.id);
  const max = layer.max ?? layer.amount;
  if (existing) {
    existing.amount = Math.min(max, layer.amount);
    existing.max = max;
    existing.endTick = layer.endTick;
    existing.decayPerSecond = layer.decayPerSecond;
    existing.reduction = layer.reduction;
    return existing;
  }
  const l: ShieldLayer = { ...layer, max };
  target.shields.push(l);
  return l;
}

// ----------------------------------------------------------------------------- statuses

export function applyStatus(game: Game, target: Actor, id: StatusId, level: number, seconds: number, source: Actor | null, opts: ApplyOptions = {}): boolean {
  if (!target.alive) return false;
  const now = game.now;
  const def = statusDef(id);
  // Slateskin immunities (wiki).
  if (target.statuses.has("slateskin") && SLATESKIN_IMMUNE.has(id)) return false;
  // Subspaced cannot be reapplied while active.
  if (id === "subspaced" && target.statuses.has("subspaced")) return false;
  // Invincible targets ignore offensive debuffs from enemies.
  if (def.kind === "debuff" && source && source.team !== target.team && (now < target.invulnerableUntil || target.statuses.has("invincible")) && !opts.data?.bypassInvincible) {
    return false;
  }
  let change: StatusChange | null = { level, seconds };
  for (const fn of activeHooks(target, "modifyStatus", now)) {
    if (!change) break;
    change = fn(target, id, change, source, game);
  }
  if (!change || change.level <= 0) return false;
  // Gaining Undetectable while Marked removes Marked (wiki).
  if (id === "undetectable" && target.statuses.has("marked")) target.statuses.remove("marked");
  const res = target.statuses.apply(id, change.level, change.seconds > 0 ? ticks(change.seconds) : 0, now, { ...opts, sourceId: source?.id ?? null });
  if (res.applied) game.onStatusApplied(target, id, source);
  return res.applied;
}

export function removeStatus(game: Game, target: Actor, id: StatusId): boolean {
  const had = target.statuses.remove(id);
  if (had) for (const fn of activeHooks(target, "statusRemoved", game.now)) fn(target, id, game);
  if (had) game.onStatusRemoved(target, id);
  return had;
}

// ----------------------------------------------------------------------------- stuns

/**
 * Stuns `target` for `seconds`. Rules (wiki 1.1.0 / 5.0.0 / 5.1.0):
 * - no stun while stunned or stun-immune; ENRAGED and similar abilities add hooks that zero the duration;
 * - killers get +0.6 s recovery and are invulnerable for the stun + 1 s;
 * - afterwards stun immunity for 4 s + 3 s per additional living Sentinel;
 * - stuns cancel windups, channels and dashes.
 */
export function stun(game: Game, target: Actor, seconds: number, source: Actor | null): boolean {
  const now = game.now;
  if (!target.alive || now < target.stunImmuneUntil || target.statuses.has("stun_immune")) return false;
  let dur = seconds;
  for (const fn of activeHooks(target, "modifyStun", now)) dur = fn(target, dur, source, game);
  if (dur <= 0) return false;
  const c = config().combat;
  if (target.isKiller) dur += c.killerStunRecoverySeconds;
  target.stunnedUntil = now + ticks(dur);
  target.statuses.apply("stunned", 1, ticks(dur), now, { mode: "replace" });
  const extraSentinels = Math.max(0, game.aliveSentinels() - 1);
  target.stunImmuneUntil = target.stunnedUntil + ticks(c.stunImmunityBaseSeconds + c.stunImmunityPerExtraSentinelSeconds * extraSentinels);
  if (target.isKiller) target.invulnerableUntil = Math.max(target.invulnerableUntil, target.stunnedUntil + ticks(c.killerStunInvulnerableExtraSeconds));
  game.interrupt(target, "stun");
  if (source) source.stats.stunsLanded++;
  game.fx.sound("stun", target.pos);
  game.fx.particle("stun", { x: target.pos.x, y: target.pos.y + 2.1, z: target.pos.z });
  for (const fn of activeHooks(target, "afterStunned", now)) fn(target, dur, source, game);
  game.log(`${target.displayName} stunned ${dur.toFixed(1)}s${source ? ` by ${source.displayName}` : ""}`);
  return true;
}
