import { gsap } from 'gsap';

/** One frame of the page clock. The same object is handed to every tick function, reused each frame. */
export interface Tick {
  /** Seconds since the first tick after initTicker (0 on that tick). Wall-clock: it keeps counting while the tab is hidden. */
  time: number;
  /** Seconds since the previous tick, clamped to [0, 0.05]. Integrate motion with this. */
  dt: number;
  /** Ticks run since initTicker. The first tick is frame 0. */
  frame: number;
}

export type TickFn = (t: Tick) => void;

/** Run order for tick functions. Lower values run first. */
export const PRIORITY = { input: 0, scroll: 10, state: 20, glUpdate: 30, glRender: 40 } as const;

/** Largest dt any tick function sees, in seconds. */
const MAX_DT = 0.05;

interface Entry {
  readonly fn: TickFn;
  readonly priority: number;
}

// Sorted by priority, then insertion order. Never mutated in place: every change installs a new
// array, so a tick that is already running keeps iterating the array it started with.
let entries: readonly Entry[] = [];

const reported = new WeakSet<TickFn>();
const tick: Tick = { time: 0, dt: 0, frame: 0 };
let installed = false;
let epoch = 0;
let lastGsapTime = 0;
let ticksRun = 0;

function onGsapTick(gsapTime: number): void {
  if (ticksRun === 0) {
    epoch = gsapTime;
    tick.dt = 0;
  } else {
    const elapsed = gsapTime - lastGsapTime;
    tick.dt = elapsed > 0 ? Math.min(elapsed, MAX_DT) : 0;
  }
  lastGsapTime = gsapTime;
  tick.time = gsapTime - epoch;
  tick.frame = ticksRun;
  ticksRun += 1;

  const list = entries;
  for (let i = 0; i < list.length; i += 1) {
    const fn = list[i].fn;
    try {
      fn(tick);
    } catch (err) {
      if (!reported.has(fn)) {
        reported.add(fn);
        console.error(
          `[ticker] tick function "${fn.name || 'anonymous'}" threw; later errors from it are not reported`,
          err,
        );
      }
    }
  }
}

/**
 * Starts the page clock. Idempotent. gsap.ticker is the only requestAnimationFrame loop on the
 * page, so this adds exactly one listener to it and turns off gsap's lag smoothing: a slow frame
 * shows up as a clamped dt instead of being hidden.
 */
export function initTicker(): void {
  if (installed) return;
  installed = true;
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add(onGsapTick);
}

/**
 * Registers fn to run on every tick, in ascending priority. Functions with equal priority run in
 * the order they were added. Safe to call before initTicker; fn runs once the loop has started.
 *
 * Changes made during a tick apply from the next tick: a function added mid-tick first runs on
 * the following frame, and a function removed mid-tick may still run once in that tick.
 *
 * Returns the function that removes this registration. Calling it again does nothing.
 * Registering the same function twice runs it twice, and each registration is removed separately.
 */
export function addTick(fn: TickFn, priority: number = PRIORITY.state): () => void {
  const entry: Entry = { fn, priority };
  const next = entries.slice();
  let at = next.length;
  while (at > 0 && next[at - 1].priority > priority) at -= 1;
  next.splice(at, 0, entry);
  entries = next;

  return () => {
    const index = entries.indexOf(entry);
    if (index === -1) return;
    const remaining = entries.slice();
    remaining.splice(index, 1);
    entries = remaining;
  };
}

/** Tick.time of the most recent tick, in seconds. Returns 0 before the first tick. */
export function tickerTime(): number {
  return tick.time;
}
