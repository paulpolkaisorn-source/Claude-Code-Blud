// Adaptive quality watchdog (direction-3d section 10.9; architecture sections 6 and 9).
//
// Each frame that counts adds its dt, in ms, to a ring of the last 60 frames. After every 30 counted
// frames the median of the ring is taken. When the median is above 18.5 ms the watchdog takes the next
// step, and it waits at least 3 s before the step after that. The four steps run once each, in this
// order, and are never restored: depth of field off, bloom off, DPR cap 1.25, shadow map 1024. After
// the fourth step the watchdog removes its tick, because nothing is left to do.
//
// Frames that do not count: the first 2 s after init (warm-up and shader compile), every frame while
// document.hidden is true, and the clamped frame that follows a tab switch.
//
// The watchdog holds no GL object. The caller passes the four steps. After each step the watchdog moves
// env.tier down through setTier, then emits 'quality' on the bus. setTier does not resize the canvas, so
// the stage applies the new DPR cap on its next resize; the boot should re-apply env.dprCap on 'quality'.
import { bus } from '../core/bus';
import { env, setTier } from '../core/env';
import { addTick, initTicker, PRIORITY, type Tick } from '../core/ticker';
import type { Tier } from '../core/types';

/** The four quality steps. The caller supplies them; the watchdog decides when each one runs. */
export interface QualitySteps {
  /** Removes the depth-of-field pass from the chain. */
  dofOff(): void;
  /** Removes the bloom effect. */
  bloomOff(): void;
  /** Sets the device-pixel-ratio cap, whatever the tier. */
  dprCap(cap: number): void;
  /** Sets the shadow map size of the contact light, the only shadow caster (lighting.ts). */
  shadowMap(size: 1024): void;
}

export interface QualityOptions {
  /** Median frame time, in ms, above which a step is taken. Default 18.5. */
  thresholdMs?: number;
  /** Least time between two steps, in seconds. Default 3. */
  hysteresisS?: number;
  /** Time after init whose frames are ignored, in seconds. Default 2. */
  warmupS?: number;
}

export interface QualityWatchdog {
  /** Steps taken so far: 0 at start, 4 when all four are done. */
  level(): number;
  /** Stops watching. Steps already taken stay in place. A second call does nothing. */
  stop(): void;
}

const WINDOW = 60; // frames in the median
const EVAL_EVERY = 30; // the median is taken every this many counted frames
const STEP_COUNT = 4;
const STEP_DPR_CAP = 1.25;
const STEP_SHADOW_SIZE = 1024;
const CLAMP_DT = 0.05; // the ticker's dt ceiling, in seconds

const DEFAULT_THRESHOLD_MS = 18.5;
const DEFAULT_HYSTERESIS_S = 3;
const DEFAULT_WARMUP_S = 2;

const RANK: Readonly<Record<Tier, number>> = { low: 0, mid: 1, high: 2 };

/** The tier after step n (1 to 4): 'mid' after steps 1 and 2, 'low' after steps 3 and 4. */
function tierForStep(n: number): Tier {
  return n <= 2 ? 'mid' : 'low';
}

/** The lower-quality of two tiers. The watchdog only ever moves quality down. */
function lowerOf(a: Tier, b: Tier): Tier {
  return RANK[a] <= RANK[b] ? a : b;
}

function checkOption(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`initQuality: ${name} must be a finite number, 0 or more; got ${String(value)}`);
  }
}

/**
 * Starts the watchdog. Call it once the GL layers exist. It runs on the page clock and calls initTicker
 * itself, which is idempotent, so the boot order does not matter.
 */
export function initQuality(steps: QualitySteps, opts: QualityOptions = {}): QualityWatchdog {
  const thresholdMs = opts.thresholdMs ?? DEFAULT_THRESHOLD_MS;
  const hysteresisS = opts.hysteresisS ?? DEFAULT_HYSTERESIS_S;
  const warmupS = opts.warmupS ?? DEFAULT_WARMUP_S;
  checkOption('thresholdMs', thresholdMs);
  checkOption('hysteresisS', hysteresisS);
  checkOption('warmupS', warmupS);

  // Allocated once. A frame writes one float into ring and never allocates.
  const ring = new Float32Array(WINDOW); // frame times in ms, the last WINDOW counted frames
  const sorted = new Float32Array(WINDOW); // copy of ring, sorted to take the median

  // One action per step, built once. Each runs exactly once, in this order.
  const actions: readonly (() => void)[] = [
    () => steps.dofOff(),
    () => steps.bloomOff(),
    () => steps.dprCap(STEP_DPR_CAP),
    () => steps.shadowMap(STEP_SHADOW_SIZE),
  ];

  let head = 0; // next write position in ring
  let filled = 0; // valid entries in ring, at most WINDOW; a step empties it
  let sinceStep = 0; // counted frames since init or the last step; sets the every-30 cadence
  let taken = 0; // steps taken so far
  let origin: number | null = null; // tick time of the first tick after init, in seconds
  let lastStep = Number.NEGATIVE_INFINITY; // tick time of the last step, in seconds
  let switchedBack = false; // the page became visible again since the last visible tick
  let stopped = false;
  let removeTick: (() => void) | null = null;

  function onVisibilityChange(): void {
    if (!document.hidden) switchedBack = true;
  }

  function stop(): void {
    if (stopped) return;
    stopped = true;
    removeTick?.();
    removeTick = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  function takeStep(now: number): void {
    const index = taken;
    taken += 1;
    lastStep = now;
    head = 0;
    filled = 0;
    sinceStep = 0;
    // The tier moves before the step runs, so a DPR cap that the step sets is the final value.
    const next = lowerOf(env.tier, tierForStep(taken));
    if (next !== env.tier) setTier(next);
    try {
      actions[index]();
    } catch (err) {
      console.error(`[quality] step ${taken} threw; the watchdog moves on`, err);
    }
    bus.emit('quality', next);
    if (taken === STEP_COUNT) stop();
  }

  function evaluate(now: number): void {
    sorted.set(ring);
    sorted.sort();
    const median = (sorted[WINDOW / 2 - 1] + sorted[WINDOW / 2]) / 2;
    if (!(median > thresholdMs)) return;
    if (now - lastStep < hysteresisS) return;
    takeStep(now);
  }

  function onTick(t: Tick): void {
    if (stopped) return;
    if (origin === null) origin = t.time;
    // Hidden frames are not counted. The switch-back flag waits for the first visible tick.
    if (document.hidden) return;
    const afterSwitch = switchedBack;
    switchedBack = false;
    if (t.time - origin < warmupS) return;
    if (afterSwitch && t.dt >= CLAMP_DT) return; // the clamped frame that follows a tab switch

    ring[head] = t.dt * 1000;
    head = (head + 1) % WINDOW;
    if (filled < WINDOW) filled += 1;
    sinceStep += 1;
    if (filled === WINDOW && sinceStep % EVAL_EVERY === 0) evaluate(t.time);
  }

  initTicker();
  document.addEventListener('visibilitychange', onVisibilityChange);
  removeTick = addTick(onTick, PRIORITY.state);

  return {
    level: () => taken,
    stop,
  };
}
