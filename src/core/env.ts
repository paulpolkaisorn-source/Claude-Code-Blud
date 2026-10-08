// Environment flags and quality tier (architecture sections 6 and 8).
// The inline script in src/partials/head-env.html sets the <html> classes before first paint.
// This module reads those classes, so the classes are the single source of truth. A page without
// head-env (a harness, for example) gets the same values computed here and mirrored to the classes.
import type { Tier } from './types';

export type { Tier } from './types';

export interface Env {
  reducedMotion: boolean; // (prefers-reduced-motion: reduce)
  gl: boolean; // a WebGL2 context can be created
  touch: boolean; // (hover: none) and (pointer: coarse)
  finePointer: boolean; // (hover: hover) and (pointer: fine)
  dprCap: number; // device pixel ratio cap for the GL canvas, set by tier
  tier: Tier; // boot guess; quality.ts moves it through setTier
}

/** Inputs to the tier heuristic. */
export interface DeviceSignals {
  cores: number; // navigator.hardwareConcurrency
  mem: number; // navigator.deviceMemory, in GB
  shortSide: number; // min(screen.width, screen.height), in CSS px
  touch: boolean;
}

const DPR_CAP: Readonly<Record<Tier, number>> = { low: 1.5, mid: 1.75, high: 2 };

const QUERY = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  touch: '(hover: none) and (pointer: coarse)',
  finePointer: '(hover: hover) and (pointer: fine)',
} as const;

const root = document.documentElement;

function matches(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Creates a WebGL2 context, releases it at once, and reports whether one could be created. */
function probeWebGL2(): boolean {
  try {
    const ctx = document.createElement('canvas').getContext('webgl2', {
      failIfMajorPerformanceCaveat: false,
    });
    if (!ctx) return false;
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Tier heuristic. It is only the boot guess: setTier() takes over once the quality watchdog runs.
 *   cores     = navigator.hardwareConcurrency || 4
 *   mem       = navigator.deviceMemory ?? 8   (Chromium only, GB)
 *   shortSide = min(screen.width, screen.height)
 *   low  if cores <= 4 or mem <= 4 or (touch and shortSide <= 420)
 *   high if cores >= 8 and mem >= 8 and not touch
 *   mid  otherwise
 */
export function pickTier(s: DeviceSignals): Tier {
  if (s.cores <= 4 || s.mem <= 4 || (s.touch && s.shortSide <= 420)) return 'low';
  if (s.cores >= 8 && s.mem >= 8 && !s.touch) return 'high';
  return 'mid';
}

function readDeviceSignals(touch: boolean): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: navigator.hardwareConcurrency || 4,
    mem: nav.deviceMemory ?? 8,
    shortSide: Math.min(screen.width, screen.height),
    touch,
  };
}

function readEnv(): Env {
  let reducedMotion: boolean;
  let gl: boolean;
  let touch: boolean;
  if (root.classList.contains('js')) {
    // head-env ran before first paint, so its classes are the source of truth.
    reducedMotion = root.classList.contains('reduced-motion');
    gl = !root.classList.contains('no-gl');
    touch = root.classList.contains('touch');
  } else {
    // No head-env on this page: compute the same values and mirror them to the classes.
    root.classList.remove('no-js');
    root.classList.add('js');
    reducedMotion = matches(QUERY.reducedMotion);
    gl = !location.search.includes('nogl') && probeWebGL2();
    touch = matches(QUERY.touch);
    root.classList.toggle('reduced-motion', reducedMotion);
    root.classList.toggle('touch', touch);
    root.classList.toggle('no-gl', !gl);
  }
  const tier = pickTier(readDeviceSignals(touch));
  return {
    reducedMotion,
    gl,
    touch,
    finePointer: matches(QUERY.finePointer),
    dprCap: DPR_CAP[tier],
    tier,
  };
}

export const env: Env = readEnv();

const reducedListeners = new Set<(reduced: boolean) => void>();

// One listener for the life of the page keeps env and the html class current,
// whether or not anything has subscribed.
window.matchMedia(QUERY.reducedMotion).addEventListener('change', (e: MediaQueryListEvent) => {
  env.reducedMotion = e.matches;
  root.classList.toggle('reduced-motion', e.matches);
  reducedListeners.forEach((cb) => cb(e.matches));
});

/** Calls cb with the new value on every prefers-reduced-motion change. Returns the unsubscribe. */
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  const entry = (reduced: boolean): void => cb(reduced);
  reducedListeners.add(entry);
  return (): void => {
    reducedListeners.delete(entry);
  };
}

/**
 * Sets the quality tier and its DPR cap. Called by the quality watchdog.
 * It does not resize the canvas: the stage reads env.dprCap when it resizes.
 */
export function setTier(tier: Tier): void {
  env.tier = tier;
  env.dprCap = DPR_CAP[tier];
}
