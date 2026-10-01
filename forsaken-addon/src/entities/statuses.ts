import rawStatuses from "../../data/statuses.json";

export type StatusId =
  | "slowness"
  | "speed"
  | "resistance"
  | "vulnerable"
  | "weakness"
  | "strength"
  | "helpless"
  | "stunned"
  | "bleeding"
  | "burning"
  | "poisoned"
  | "corrupted"
  | "glitched"
  | "blindness"
  | "hallucination"
  | "hemorrhage"
  | "subspaced"
  | "oblivious"
  | "creatures"
  | "exhausted"
  | "marked"
  | "invisibility"
  | "undetectable"
  | "purified"
  | "resonance"
  | "slateskin"
  | "regeneration"
  | "invincible"
  | "stun_immune"
  | "flagged";

export type Stacking = "max" | "add" | "add_keep" | "replace";

export interface StatusDef {
  id: StatusId;
  name: string;
  maxLevel: number;
  kind: "buff" | "debuff" | "neutral";
  stacking: Stacking;
  cleanse: string[];
  hud: string;
  color: string;
  source: "wiki" | "assumed" | "original";
  description: string;
  vanilla?: string | null;
  hidden?: boolean;
}

export const STATUS_DEFS: ReadonlyMap<StatusId, StatusDef> = new Map(
  (rawStatuses.statuses as StatusDef[]).map((s) => [s.id, s]),
);

export function statusDef(id: StatusId): StatusDef {
  const d = STATUS_DEFS.get(id);
  if (!d) throw new Error(`unknown status ${id}`);
  return d;
}

export interface StatusInstance {
  id: StatusId;
  level: number;
  /** Absolute tick at which the status ends (Infinity = until removed). */
  endTick: number;
  startTick: number;
  totalTicks: number;
  /** Actor id of whoever applied it (kill credit for damage over time). */
  sourceId: string | null;
  /** Tick accumulator used by damage-over-time statuses. */
  accum: number;
  /** Free-form per-status data (e.g. regeneration amount left). */
  data: Record<string, number>;
}

export interface ApplyOptions {
  sourceId?: string | null;
  mode?: Stacking;
  data?: Record<string, number>;
}

export interface ApplyResult {
  applied: boolean;
  instance?: StatusInstance;
  reason?: string;
}

/** Per-actor status container. Pure: knows nothing about damage or Minecraft. */
export class StatusSet {
  private readonly map = new Map<StatusId, StatusInstance>();

  has(id: StatusId): boolean {
    return this.map.has(id);
  }

  get(id: StatusId): StatusInstance | undefined {
    return this.map.get(id);
  }

  level(id: StatusId): number {
    return this.map.get(id)?.level ?? 0;
  }

  remainingTicks(id: StatusId, now: number): number {
    const s = this.map.get(id);
    if (!s) return 0;
    return s.endTick === Infinity ? Infinity : Math.max(0, s.endTick - now);
  }

  all(): StatusInstance[] {
    return [...this.map.values()];
  }

  /**
   * Applies a status. `durationTicks` <= 0 means "until removed".
   * Returns the resulting instance; immunity checks are done by the caller (Game.applyStatus).
   */
  apply(id: StatusId, level: number, durationTicks: number, now: number, opts: ApplyOptions = {}): ApplyResult {
    const def = statusDef(id);
    const lvl = Math.max(1, Math.min(def.maxLevel, Math.round(level)));
    const end = durationTicks > 0 ? now + durationTicks : Infinity;
    const mode = opts.mode ?? def.stacking;
    const old = this.map.get(id);
    if (!old || old.endTick <= now) {
      const inst: StatusInstance = {
        id,
        level: lvl,
        endTick: end,
        startTick: now,
        totalTicks: durationTicks > 0 ? durationTicks : Infinity,
        sourceId: opts.sourceId ?? null,
        accum: 0,
        data: { ...(opts.data ?? {}) },
      };
      this.map.set(id, inst);
      return { applied: true, instance: inst };
    }
    switch (mode) {
      case "max":
        old.level = Math.max(old.level, lvl);
        if (end > old.endTick) {
          old.endTick = end;
          old.totalTicks = end === Infinity ? Infinity : end - now;
        }
        break;
      case "add":
        old.level = Math.min(def.maxLevel, old.level + lvl);
        old.endTick = end;
        old.totalTicks = durationTicks > 0 ? durationTicks : Infinity;
        break;
      case "add_keep":
        old.level = Math.min(def.maxLevel, old.level + lvl);
        break;
      case "replace":
        old.level = lvl;
        old.endTick = end;
        old.startTick = now;
        old.totalTicks = durationTicks > 0 ? durationTicks : Infinity;
        old.accum = 0;
        break;
    }
    if (opts.sourceId !== undefined) old.sourceId = opts.sourceId;
    if (opts.data) Object.assign(old.data, opts.data);
    return { applied: true, instance: old };
  }

  /** Lowers a status by `levels`; removes it at 0. */
  reduce(id: StatusId, levels: number): void {
    const s = this.map.get(id);
    if (!s) return;
    s.level -= levels;
    if (s.level <= 0) this.map.delete(id);
  }

  remove(id: StatusId): boolean {
    return this.map.delete(id);
  }

  /** Removes every status carrying `tag` in its definition's cleanse list. Returns removed ids. */
  cleanse(tag: string): StatusId[] {
    const out: StatusId[] = [];
    for (const [id] of this.map) {
      if (statusDef(id).cleanse.includes(tag)) {
        this.map.delete(id);
        out.push(id);
      }
    }
    return out;
  }

  clear(): void {
    this.map.clear();
  }

  /** Removes expired statuses and returns them. */
  expire(now: number): StatusInstance[] {
    const out: StatusInstance[] = [];
    for (const [id, s] of this.map) {
      if (s.endTick <= now) {
        this.map.delete(id);
        out.push(s);
      }
    }
    return out;
  }

  /** Extends the remaining duration of a status (Blood Hunt kills etc.). */
  extend(id: StatusId, ticks: number): void {
    const s = this.map.get(id);
    if (s && s.endTick !== Infinity) {
      s.endTick += ticks;
      s.totalTicks += ticks;
    }
  }

  setEnd(id: StatusId, endTick: number): void {
    const s = this.map.get(id);
    if (s) s.endTick = endTick;
  }
}

// --------------------------------------------------------------------------- derived values

/** Net movement multiplier from Speed/Slowness: each Slowness level cancels one Speed level, ±10% per level. */
export function speedStatusMultiplier(set: StatusSet): number {
  const net = set.level("speed") - set.level("slowness");
  return Math.max(0, 1 + 0.1 * net);
}

/** Incoming damage multiplier from Resistance/Vulnerable/Creatures. Resistance V+ (after Vulnerable cancel) = 0. */
export function incomingDamageMultiplier(set: StatusSet): number {
  const net = set.level("resistance") - set.level("vulnerable");
  let m: number;
  if (net >= 5) m = 0;
  else if (net > 0) m = 1 - 0.2 * net;
  else m = 1 + 0.2 * -net;
  if (set.has("creatures")) m *= 1.25;
  return m;
}

/** Outgoing damage multiplier from Strength/Weakness. */
export function outgoingDamageMultiplier(set: StatusSet): number {
  const m = (1 + 0.2 * set.level("strength")) * (1 - 0.1 * set.level("weakness"));
  return Math.max(0, m);
}

/** Statuses Slateskin grants immunity to (wiki Status Effects / Slateskin). */
export const SLATESKIN_IMMUNE: ReadonlySet<StatusId> = new Set<StatusId>([
  "bleeding",
  "burning",
  "poisoned",
  "corrupted",
  "regeneration",
  "speed",
  "hemorrhage",
  "weakness",
]);
