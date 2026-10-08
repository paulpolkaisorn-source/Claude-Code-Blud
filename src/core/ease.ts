import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

/**
 * The page's only easing library. Each name is one cubic-bezier curve from (0, 0) to (1, 1).
 * Three forms of every curve: a GSAP ease name (E, registered with CustomEase), a plain
 * function for JS and GL math (ef), and a CSS timing function (cssEase).
 */

export type EaseName = 'cut' | 'settle' | 'anticipate' | 'follow' | 'sym' | 'fade' | 'bleed' | 'press';

type Curve = readonly [number, number, number, number];

/** Control points [x1, y1, x2, y2]. */
export const CURVES: Readonly<Record<EaseName, Curve>> = {
  cut: [0.1, 0.9, 0.05, 1],
  settle: [0.3, 0.5, 0.1, 1],
  anticipate: [0.4, -0.6, 0.2, 1],
  follow: [0.25, 0.8, 0.35, 1.1],
  sym: [0.62, 0, 0.38, 1],
  fade: [0.3, 0.1, 0.2, 1],
  bleed: [0.55, 0.05, 0.25, 1],
  press: [0.1, 0.5, 0.2, 1],
};

/** Builds one value per ease name. The object literal makes every name required. */
function perEase<V>(build: (name: EaseName) => V): Record<EaseName, V> {
  return {
    cut: build('cut'),
    settle: build('settle'),
    anticipate: build('anticipate'),
    follow: build('follow'),
    sym: build('sym'),
    fade: build('fade'),
    bleed: build('bleed'),
    press: build('press'),
  };
}

/** GSAP ease names, e.g. 'hk.cut'. Usable once registerEases() has run. */
export const E: Readonly<Record<EaseName, string>> = perEase((name) => `hk.${name}`);

/** One coordinate of a cubic bezier with end points 0 and 1 (control values p1, p2), at parameter s. */
function bezier(p1: number, p2: number, s: number): number {
  const u = 1 - s;
  return 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s;
}

/** d/ds of bezier(p1, p2, s). */
function bezierSlope(p1: number, p2: number, s: number): number {
  const u = 1 - s;
  return 3 * u * u * p1 + 6 * u * s * (p2 - p1) + 3 * s * s * (1 - p2);
}

const X_TOLERANCE = 1e-7;

/**
 * Parameter s in [0, 1] where x(s) = t. Newton-Raphson for up to 8 steps, then bisection
 * on [0, 1]. x(s) is non-decreasing because x1 and x2 lie in [0, 1] for every curve here.
 */
function solveS(x1: number, x2: number, t: number): number {
  let s = t;
  for (let i = 0; i < 8; i++) {
    const err = bezier(x1, x2, s) - t;
    if (Math.abs(err) < X_TOLERANCE) return s;
    const slope = bezierSlope(x1, x2, s);
    if (Math.abs(slope) < 1e-9) break;
    const next = s - err / slope;
    if (!(next >= 0 && next <= 1)) break;
    s = next;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 64 && hi - lo > X_TOLERANCE; i++) {
    const mid = (lo + hi) / 2;
    const err = bezier(x1, x2, mid) - t;
    if (Math.abs(err) < X_TOLERANCE) return mid;
    if (err < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Eased value at x = t. t is clamped to [0, 1]; NaN is treated as 0. */
function makeEase(curve: Curve): (t: number) => number {
  const [x1, y1, x2, y2] = curve;
  return (t: number): number => {
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    return bezier(y1, y2, solveS(x1, x2, t));
  };
}

/** Exact cubic-bezier evaluation: t (clamped to [0, 1]) in, eased value out. */
export const ef: Readonly<Record<EaseName, (t: number) => number>> = perEase((name) => makeEase(CURVES[name]));

function toCss(curve: Curve): string {
  return `cubic-bezier(${curve.join(', ')})`;
}

/** CSS timing functions, for CSS transitions. */
export const cssEase: Readonly<Record<EaseName, string>> = perEase((name) => toCss(CURVES[name]));

const NAMES = Object.keys(CURVES) as EaseName[];

let registered = false;

/** Registers the eight curves with GSAP as 'hk.<name>'. Safe to call more than once. */
export function registerEases(): void {
  if (registered) return;
  gsap.registerPlugin(CustomEase);
  for (const name of NAMES) {
    const [x1, y1, x2, y2] = CURVES[name];
    CustomEase.create(E[name], `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
  }
  registered = true;
}
