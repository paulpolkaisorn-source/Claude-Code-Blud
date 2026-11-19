import { noise1 } from "./rand";

/**
 * Neon ignition flicker, shared by S1, S4 (NEON lettering) and S10.
 * Local frame 0 = ignition start. Three uneven flickers at 10, 22 and 31,
 * then the tube holds lit with a faint gas hum.
 */
const PATTERN: Record<number, number> = {
  // flicker 1: short pop
  10: 0.85,
  11: 1.0,
  12: 0.35,
  13: 0.08,
  // flicker 2: stuttery, weaker
  22: 0.55,
  23: 0.92,
  24: 0.25,
  25: 0.7,
  26: 0.12,
  // flicker 3: catches and holds
  31: 1.0,
  32: 0.78,
  33: 1.0,
  34: 0.9,
};

export const IGNITION_HOLD = 35;

/** Returns tube intensity 0..~1.04 for the given local frame. */
export const ignition = (f: number, seed = 0): number => {
  if (f < 10) return 0;
  if (f >= IGNITION_HOLD) return hum(f, seed);
  return PATTERN[Math.floor(f)] ?? 0;
};

/** Gas hum once lit: tiny deterministic shimmer around 1. */
export const hum = (f: number, seed = 0) => 1 + 0.035 * noise1(f * 0.45, seed) + 0.015 * noise1(f * 2.3, seed + 7);

/**
 * The final flicker at the end of the piece (S10, starting at local frame 0):
 * a dip, a sputter, back on, then everything cuts.
 */
const FINAL: number[] = [1, 0.25, 0.05, 0.6, 1.0, 0.4, 0.08, 0.9, 1.0, 0.7, 0.3];
export const finalFlicker = (f: number) => {
  if (f < 0) return 1;
  const i = Math.floor(f);
  return i < FINAL.length ? FINAL[i] : FINAL[FINAL.length - 1];
};
