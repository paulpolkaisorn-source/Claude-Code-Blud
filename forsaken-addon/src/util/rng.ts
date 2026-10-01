/** Small seeded PRNG (mulberry32) so matches and tests are reproducible. */
export class Rng {
  private s: number;

  constructor(seed = 0x2f6b1d3) {
    this.s = seed >>> 0 || 1;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Uniform integer in [a, b] (inclusive). */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Rng.pick on empty array");
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /** Picks an index according to non-negative weights. */
  weighted(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
    if (total <= 0) return Math.floor(this.next() * weights.length);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r < 0) return i;
    }
    return weights.length - 1;
  }
}
