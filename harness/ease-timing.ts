import { gsap } from 'gsap';
import { CURVES, E, cssEase, ef, registerEases, type EaseName } from '../src/core/ease';
import { HAIKU_OFFSETS, T, overlapRatios, scrubLocal, weightedStagger } from '../src/core/timing';

const NAMES: readonly EaseName[] = ['cut', 'settle', 'anticipate', 'follow', 'sym', 'fade', 'bleed', 'press'];
const TOL = 2e-3;
const failures: string[] = [];

function record(label: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} :: ${detail}`);
  if (!ok) failures.push(label);
}

const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
const f5 = (v: number): string => v.toFixed(5);
const f4 = (v: number): string => v.toFixed(4);

/** Independent reference, not using src/core/ease.ts: bisection on x(s), then y(s). */
const bez = (p1: number, p2: number, s: number): number => {
  const u = 1 - s;
  return 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s;
};

function refY(name: EaseName, x: number): number {
  const [x1, y1, x2, y2] = CURVES[name];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (bez(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return bez(y1, y2, (lo + hi) / 2);
}

/** For a monotone curve: the x at which the reference y equals target. */
function refCross(name: EaseName, target: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (refY(name, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function extrema(name: EaseName): { min: number; xMin: number; max: number; xMax: number } {
  let min = Infinity;
  let max = -Infinity;
  let xMin = 0;
  let xMax = 0;
  for (let k = 0; k <= 4000; k++) {
    const x = k / 4000;
    const y = ef[name](x);
    if (y < min) {
      min = y;
      xMin = x;
    }
    if (y > max) {
      max = y;
      xMax = x;
    }
  }
  return { min, xMin, max, xMax };
}

function xIsMonotone(name: EaseName): boolean {
  const [x1, , x2] = CURVES[name];
  let prev = -Infinity;
  for (let k = 0; k < 1000; k++) {
    const x = bez(x1, x2, k / 999);
    if (x < prev - 1e-12) return false;
    prev = x;
  }
  return true;
}

const nonIncreasing = (a: number[]): boolean => a.every((v, i) => i === 0 || v <= a[i - 1] + 1e-12);
const nonDecreasing = (a: number[]): boolean => a.every((v, i) => i === 0 || v >= a[i - 1] - 1e-12);
const gaps = (a: number[]): number[] => a.slice(1).map((v, i) => v - a[i]);

function run(): void {
  // 1. Data: control points, names, CSS strings, duration scale.
  const EXPECTED_CURVES: Record<EaseName, readonly number[]> = {
    cut: [0.1, 0.9, 0.05, 1],
    settle: [0.3, 0.5, 0.1, 1],
    anticipate: [0.4, -0.6, 0.2, 1],
    follow: [0.25, 0.8, 0.35, 1.1],
    sym: [0.62, 0, 0.38, 1],
    fade: [0.3, 0.1, 0.2, 1],
    bleed: [0.55, 0.05, 0.25, 1],
    press: [0.1, 0.5, 0.2, 1],
  };
  for (const n of NAMES) {
    const ok = CURVES[n].length === 4 && CURVES[n].every((v, i) => v === EXPECTED_CURVES[n][i]);
    record(`curve ${n}`, ok, `[${CURVES[n].join(', ')}]`);
  }
  record(
    'E names',
    NAMES.every((n) => E[n] === `hk.${n}`),
    NAMES.map((n) => E[n]).join(' '),
  );

  const EXPECTED_CSS: Record<EaseName, string> = {
    cut: 'cubic-bezier(0.1, 0.9, 0.05, 1)',
    settle: 'cubic-bezier(0.3, 0.5, 0.1, 1)',
    anticipate: 'cubic-bezier(0.4, -0.6, 0.2, 1)',
    follow: 'cubic-bezier(0.25, 0.8, 0.35, 1.1)',
    sym: 'cubic-bezier(0.62, 0, 0.38, 1)',
    fade: 'cubic-bezier(0.3, 0.1, 0.2, 1)',
    bleed: 'cubic-bezier(0.55, 0.05, 0.25, 1)',
    press: 'cubic-bezier(0.1, 0.5, 0.2, 1)',
  };
  record(
    'cssEase strings',
    NAMES.every((n) => cssEase[n] === EXPECTED_CSS[n]),
    NAMES.map((n) => cssEase[n]).join(' | '),
  );

  const EXPECTED_T = {
    snap: 0.05,
    flick: 0.07,
    micro: 0.17,
    half: 0.35,
    beat5: 0.5,
    beat7: 0.7,
    hold: 0.85,
    settle: 1.19,
    breath: 1.7,
  };
  const tKeys = Object.keys(EXPECTED_T) as (keyof typeof EXPECTED_T)[];
  record(
    'T scale',
    tKeys.every((k) => T[k] === EXPECTED_T[k]) && Object.keys(T).length === tKeys.length,
    tKeys.map((k) => `${k}=${T[k]}`).join(' '),
  );

  // 2. Values quoted by the art director's critic (tolerance 2e-3).
  const POINTS: Array<[EaseName, number, number]> = [
    ['cut', 0.25, 0.897],
    ['settle', 0.25, 0.636],
    ['settle', 0.5, 0.911],
    ['settle', 0.75, 0.984],
    ['sym', 0.5, 0.5],
    ['fade', 0.25, 0.392],
    ['fade', 0.5, 0.815],
    ['bleed', 0.25, 0.131],
    ['bleed', 0.5, 0.699],
    ['bleed', 0.75, 0.953],
  ];
  for (const [name, x, want] of POINTS) {
    const got = ef[name](x);
    record(`${name} y(${x})`, near(got, want, TOL), `ef=${f5(got)} want ${want}`);
  }

  const ant = extrema('anticipate');
  record(
    'anticipate min y',
    near(ant.min, -0.1346, TOL),
    `min=${f5(ant.min)} at x=${f4(ant.xMin)} (want -0.1346 near 0.151)`,
  );
  record('anticipate min x', near(ant.xMin, 0.151, TOL), `x=${f4(ant.xMin)} want 0.151`);

  const fol = extrema('follow');
  record('follow max y', near(fol.max, 1.0186, TOL), `max=${f5(fol.max)} at x=${f4(fol.xMax)}`);

  const pressAt09 = refCross('press', 0.9);
  record('press y=0.9 at x', near(pressAt09, 0.49, TOL), `x=${f5(pressAt09)} want 0.49`);

  // The critic's figure for the 0.5 crossing is x = 0.13. The exact crossing of these
  // control points is 0.1335, which is 0.0035 away, outside tolerance. The control points
  // are kept as specified and the exact crossing is asserted instead. Flagged in the report.
  const pressAt05 = refCross('press', 0.5);
  record('press y=0.5 at x (exact)', near(pressAt05, 0.1335, TOL), `x=${f5(pressAt05)}`);
  console.log(
    `NOTE press: critic figure "y reaches 0.5 at x = 0.13" differs from the exact crossing ` +
      `x=${f5(pressAt05)} by ${(pressAt05 - 0.13).toFixed(5)} (tolerance ${TOL}). ` +
      `ef.press(0.13)=${f5(ef.press(0.13))}. Control points unchanged; flagged for review.`,
  );

  // 3. ef: endpoints, monotone x, never NaN, matches an independent solve.
  for (const n of NAMES) {
    const ok = ef[n](0) === 0 && ef[n](1) === 1;
    record(`${n} endpoints`, ok, `ef(0)=${ef[n](0)} ef(1)=${ef[n](1)}`);
  }
  for (const n of NAMES) {
    record(`${n} x monotone`, xIsMonotone(n), '1000 samples of x(s) non-decreasing');
  }
  for (const n of NAMES) {
    let nonFinite = 0;
    let worst = 0;
    for (let k = 0; k < 1000; k++) {
      const t = k / 999;
      const v = ef[n](t);
      if (!Number.isFinite(v)) nonFinite += 1;
      worst = Math.max(worst, Math.abs(v - refY(n, t)));
    }
    record(
      `${n} ef finite and exact`,
      nonFinite === 0 && worst <= 1e-5,
      `nonfinite=${nonFinite} worst |ef - reference| over 1000 samples = ${worst.toExponential(2)}`,
    );
  }

  // 4. GSAP registration: parseEase('hk.<name>') must match ef.
  registerEases();
  registerEases();
  console.log('registerEases() called twice without error');
  const SAMPLE_T = [0.1, 0.25, 0.5, 0.75, 0.9];
  for (const n of NAMES) {
    const g = gsap.parseEase(E[n]);
    const worst = Math.max(...SAMPLE_T.map((t) => Math.abs(g(t) - ef[n](t))));
    record(`gsap ${E[n]} vs ef`, worst <= 3e-3, `max dev at t=0.1..0.9 = ${worst.toExponential(2)}`);
    let full = 0;
    for (let k = 0; k < 1000; k++) full = Math.max(full, Math.abs(g(k / 999) - ef[n](k / 999)));
    console.log(`  info ${E[n]}: max dev over 1000 samples = ${full.toExponential(2)}`);
  }

  // 5. Timing: weightedStagger.
  const ws = weightedStagger(5, { total: 0.35 });
  const WS_WANT = [0, 0.175, 0.2475, 0.3031, 0.35];
  record(
    'weightedStagger(5, total 0.35)',
    ws.length === 5 && ws.every((v, i) => near(v, WS_WANT[i], 5e-5)),
    `[${ws.map(f4).join(', ')}] want [0, 0.1750, 0.2475, 0.3031, 0.3500]`,
  );

  const wl = weightedStagger(5, { total: 0.35, lead: 0.1 });
  const WL_WANT = [0, 0.275, 0.3475, 0.4031, 0.45];
  record(
    'weightedStagger lead (item 0 not shifted)',
    wl.length === 5 && wl.every((v, i) => near(v, WL_WANT[i], 5e-5)),
    `[${wl.map(f4).join(', ')}]`,
  );
  record(
    'weightedStagger(1) = [0]',
    JSON.stringify(weightedStagger(1, { total: 0.35, lead: 0.2 })) === '[0]',
    'n <= 1 returns [0]',
  );

  const front = weightedStagger(5, { total: 0.35, weight: 'front' });
  const back = weightedStagger(5, { total: 0.35, weight: 'back' });
  const center = weightedStagger(5, { total: 0.35, weight: 'center' });
  record('front: gaps shrink', nonIncreasing(gaps(front)), `[${front.map(f4).join(', ')}]`);
  record('back: gaps grow', nonDecreasing(gaps(back)), `[${back.map(f4).join(', ')}]`);
  record(
    'center: centre item first, symmetric',
    center[2] === 0 && near(center[1], center[3], 1e-12) && near(center[0], 0.35, 1e-12) && near(center[4], 0.35, 1e-12),
    `[${center.map(f4).join(', ')}]`,
  );

  // 6. Timing: HAIKU_OFFSETS, overlap ratios, scrubLocal.
  const HAIKU_WANT = [
    0, 0.05, 0.0707, 0.0866, 0.1, 0.185, 0.2707, 0.3062, 0.3335, 0.3565, 0.3767, 0.395, 0.48, 0.53, 0.5507,
    0.5666, 0.58,
  ];
  record(
    'HAIKU_OFFSETS (4 dp)',
    HAIKU_OFFSETS.length === 17 && HAIKU_WANT.every((w, i) => near(HAIKU_OFFSETS[i], w, 5e-5)),
    `[${HAIKU_OFFSETS.map(f4).join(', ')}]`,
  );

  const ov = overlapRatios(HAIKU_OFFSETS, 0.35);
  const ovMin = Math.min(...ov);
  const ovMax = Math.max(...ov);
  record(
    'overlapRatios(HAIKU_OFFSETS, 0.35) in [0.75, 0.985]',
    ov.length === 16 && ovMin >= 0.75 && ovMax <= 0.985,
    `n=${ov.length} min=${f4(ovMin)} max=${f4(ovMax)}`,
  );

  const scrubAt1 = Array.from({ length: 17 }, (_, i) => scrubLocal(i, 17, 1));
  const scrubAt0 = Array.from({ length: 17 }, (_, i) => scrubLocal(i, 17, 0));
  record(
    'scrubLocal(i, 17, 1) === 1 for all i',
    scrubAt1.every((v) => v === 1),
    `${scrubAt1.filter((v) => v === 1).length}/17 exactly 1`,
  );
  record(
    'scrubLocal(i, 17, 0) === 0 for all i',
    scrubAt0.every((v) => v === 0),
    `${scrubAt0.filter((v) => v === 0).length}/17 exactly 0`,
  );
  let scrubMonotone = true;
  for (let i = 0; i < 17; i++) {
    let prev = -1;
    for (let k = 0; k <= 100; k++) {
      const v = scrubLocal(i, 17, k / 100);
      if (v < prev) scrubMonotone = false;
      prev = v;
    }
  }
  record('scrubLocal monotone in t', scrubMonotone, 'all 17 items, 101 samples each');
}

try {
  run();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`FAIL exception :: ${msg}`);
  failures.push(`exception: ${msg}`);
}

console.log(failures.length === 0 ? 'SUMMARY all checks passed' : `SUMMARY ${failures.length} failing: ${failures.join(' | ')}`);
document.documentElement.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.join('; ')}`;
