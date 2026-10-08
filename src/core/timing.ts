/**
 * The 5-7-5 duration scale, in seconds. Every duration on the page comes from here.
 */
export const T = {
  snap: 0.05,
  flick: 0.07,
  micro: 0.17,
  half: 0.35,
  beat5: 0.5,
  beat7: 0.7,
  hold: 0.85,
  settle: 1.19,
  breath: 1.7,
} as const;

export type StaggerWeight = 'front' | 'back' | 'center';

/** Profile in [0, 1] for a normalised position u in [0, 1]. */
function profile(u: number, weight: StaggerWeight): number {
  switch (weight) {
    case 'front':
      return Math.sqrt(u);
    case 'back':
      return 1 - Math.sqrt(1 - u);
    case 'center':
      return Math.sqrt(Math.abs(2 * u - 1));
    default:
      throw new RangeError(`Unknown stagger weight: ${String(weight)}`);
  }
}

/**
 * Non-uniform stagger offsets in seconds, one per item. Item 0 is the lead and is not shifted;
 * every other item gets + lead. Default weight is 'front' (gaps shrink along the sequence).
 */
export function weightedStagger(
  count: number,
  opts: { total: number; lead?: number; weight?: StaggerWeight },
): number[] {
  if (count <= 1) return [0];
  const weight = opts.weight ?? 'front';
  const lead = opts.lead ?? 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const offset = opts.total * profile(i / (count - 1), weight);
    out.push(i === 0 ? offset : offset + lead);
  }
  return out;
}

/**
 * Front-weighted stagger per line. Line k starts at the end of line k-1 (its start + its total)
 * plus breakGap. Returns one absolute offset per item, in order.
 */
export function lineStagger(
  counts: readonly number[],
  opts: { lineTotals: readonly number[]; breakGap: number },
): number[] {
  if (counts.length !== opts.lineTotals.length) {
    throw new RangeError('lineStagger: counts and lineTotals need one entry per line');
  }
  const out: number[] = [];
  let start = 0;
  for (let k = 0; k < counts.length; k++) {
    const total = opts.lineTotals[k];
    for (const offset of weightedStagger(counts[k], { total, weight: 'front' })) {
      out.push(start + offset);
    }
    start += total + opts.breakGap;
  }
  return out;
}

/** Offsets for the 17 blocks of the 5-7-5 haiku, in reading order. */
export const HAIKU_OFFSETS: readonly number[] = Object.freeze(
  lineStagger([5, 7, 5], { lineTotals: [0.1, 0.21, 0.1], breakGap: 0.085 }),
);

/**
 * Scrubbed stagger (direction.md heading 7). Local progress q in [0, 1] of position i in a scrubbed
 * formation, for the normalised transition progress t in [0, 1]. The caller applies the named curve to q:
 * settle for followers, anticipate for the kireji.
 *   Position 0 is the lead: q = t / lead, clamped. It completes within the first lead of the transition.
 *   A follower i >= 1 starts at o(i) = lead + total * sqrt((i - 1) / (count - 2)) and runs to t = 1:
 *   q = (t - o(i)) / (1 - o(i)), clamped. With count 2, o = lead. With count 1, q = t.
 * Every item is 0 at t = 0 and 1 at t = 1.
 */
export function scrubLocal(
  i: number,
  count: number,
  t: number,
  opts?: { total?: number; lead?: number },
): number {
  const total = opts?.total ?? 0.35;
  const lead = opts?.lead ?? 0.1;
  const clamp = (v: number): number => Math.min(1, Math.max(0, v));
  if (count <= 1) return clamp(t);
  if (i <= 0) {
    if (lead <= 0) return t > 0 ? 1 : 0;
    return clamp(t / lead);
  }
  const start = count === 2 ? lead : lead + total * Math.sqrt((i - 1) / (count - 2));
  const span = 1 - start;
  if (span <= 0) return t >= 1 ? 1 : 0;
  return clamp((t - start) / span);
}

/** For QA: 1 - gap / duration for each consecutive pair of offsets (gap = next - previous). */
export function overlapRatios(offsets: readonly number[], duration: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < offsets.length; i++) {
    out.push(1 - (offsets[i] - offsets[i - 1]) / duration);
  }
  return out;
}
