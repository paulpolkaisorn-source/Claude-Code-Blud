/**
 * Per-actor cooldown bookkeeping in ticks. Pure.
 * - start(id, ticks) sets a cooldown; remaining() reads it.
 * - reduce / reduceAll support Guest 666 Blood Orbs (-3 s to all) and similar effects.
 * - Cooldowns may be "paused" (Slateskin Potion's cooldown only starts after the effect ends).
 */
export interface CooldownEntry {
  endTick: number;
  totalTicks: number;
}

export class CooldownManager {
  private readonly map = new Map<string, CooldownEntry>();
  private readonly paused = new Set<string>();

  start(id: string, durationTicks: number, now: number): void {
    if (durationTicks <= 0) {
      this.map.delete(id);
      return;
    }
    this.map.set(id, { endTick: now + durationTicks, totalTicks: durationTicks });
  }

  /** Remaining ticks (0 when ready). Paused abilities report Infinity. */
  remaining(id: string, now: number): number {
    if (this.paused.has(id)) return Infinity;
    const e = this.map.get(id);
    return e ? Math.max(0, e.endTick - now) : 0;
  }

  ready(id: string, now: number): boolean {
    return this.remaining(id, now) <= 0;
  }

  total(id: string): number {
    return this.map.get(id)?.totalTicks ?? 0;
  }

  /** Fraction of the cooldown left, 0..1. */
  fraction(id: string, now: number): number {
    const e = this.map.get(id);
    if (!e || e.totalTicks <= 0) return 0;
    return Math.max(0, Math.min(1, (e.endTick - now) / e.totalTicks));
  }

  reduce(id: string, ticks: number, now: number): void {
    const e = this.map.get(id);
    if (!e) return;
    e.endTick = Math.max(now, e.endTick - ticks);
    if (e.endTick <= now) this.map.delete(id);
  }

  /** Multiplies the remaining time (Eviscerate "halves its cooldown on hit"). */
  scaleRemaining(id: string, factor: number, now: number): void {
    const e = this.map.get(id);
    if (!e) return;
    const rem = Math.max(0, e.endTick - now);
    e.endTick = now + Math.round(rem * factor);
    if (e.endTick <= now) this.map.delete(id);
  }

  reduceAll(ticks: number, now: number): void {
    for (const id of [...this.map.keys()]) this.reduce(id, ticks, now);
  }

  reset(id: string): void {
    this.map.delete(id);
    this.paused.delete(id);
  }

  resetAll(): void {
    this.map.clear();
    this.paused.clear();
  }

  pause(id: string): void {
    this.paused.add(id);
  }

  unpause(id: string): void {
    this.paused.delete(id);
  }

  isPaused(id: string): boolean {
    return this.paused.has(id);
  }

  ids(): string[] {
    return [...this.map.keys()];
  }
}
