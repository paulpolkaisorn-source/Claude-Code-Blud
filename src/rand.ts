import { random } from "remotion";

// Deterministic helpers. Never use Math.random(): every render must match.

/** Seeded random in [0, 1). */
export const rnd = (seed: string | number) => random(seed);
/** Seeded random in [a, b). */
export const rndRange = (seed: string | number, a: number, b: number) => a + (b - a) * random(seed);
/** Seeded pick from a list. */
export const pick = <T,>(seed: string | number, list: readonly T[]): T =>
  list[Math.floor(random(seed) * list.length) % list.length];

/** Smooth 1D value noise in [-1, 1], deterministic. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`n-${seed}-${i}`) * 2 - 1;
  const b = random(`n-${seed}-${i + 1}`) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};
