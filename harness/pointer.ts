// Harness for src/core/pointer.ts (architecture section 10a). Open /harness/pointer.html on the dev
// server. The verdict lands in dataset.harness.
//
// Checks that need real input pause at a named step. The page sets dataset.harnessWait to the step
// name and waits until the driver sets dataset.harnessGo to the same name. The driver then performs
// the input (mouse, touch or emulateMedia) and the page records the pointer once per frame for a span
// of page time. Page time is the sum of Tick.dt, so the expected damping does not depend on the
// frame rate. With reduced motion on at load, the page runs a shorter set of steps instead.
import { env } from '../src/core/env';
import { initPointer, onPointerType, pointer, type PointerState } from '../src/core/pointer';
import { addTick, initTicker, type Tick } from '../src/core/ticker';
import { T } from '../src/core/timing';

interface Snap {
  /** Page time since the step began, in seconds. */
  t: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  inside: boolean;
  type: PointerState['type'];
  clientX: number;
  clientY: number;
}

const root = document.documentElement;
const WATCHDOG_MS = 90_000;
let passed = 0;
const failed: string[] = [];
let finished = false;

const typeLog: string[] = [];
const offType = onPointerType((type) => {
  typeLog.push(type);
});

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failed.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

function finish(verdict: string): void {
  if (finished) return;
  finished = true;
  root.dataset.harness = verdict;
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

function snapshot(t: number): Snap {
  return {
    t,
    x: pointer.x,
    y: pointer.y,
    sx: pointer.sx,
    sy: pointer.sy,
    vx: pointer.vx,
    vy: pointer.vy,
    inside: pointer.inside,
    type: pointer.type,
    clientX: pointer.clientX,
    clientY: pointer.clientY,
  };
}

function isZero(s: Snap): boolean {
  return s.x === 0 && s.y === 0 && s.sx === 0 && s.sy === 0 && s.vx === 0 && s.vy === 0;
}

/** Records the pointer once per frame for `seconds` of page time, starting on the next frame. */
function record(seconds: number): Promise<Snap[]> {
  return new Promise((resolve) => {
    const trace: Snap[] = [];
    let elapsed = 0;
    const off = addTick((tick: Tick) => {
      elapsed += tick.dt;
      trace.push(snapshot(elapsed));
      if (elapsed >= seconds) {
        off();
        resolve(trace);
      }
    });
  });
}

/** Hands one input step to the driver. Resolves once the driver has set dataset.harnessGo to the same name. */
function gate(step: string): Promise<void> {
  root.dataset.harnessWait = step;
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (root.dataset.harnessGo === step) {
        window.clearInterval(timer);
        resolve();
      }
    }, 4);
  });
}

/** The first sample at or after page time t. */
function at(trace: readonly Snap[], t: number): Snap {
  for (const s of trace) {
    if (s.t >= t) return s;
  }
  return trace[trace.length - 1];
}

/** Largest magnitude of pick(sample) over samples with from <= t <= to. */
function peak(trace: readonly Snap[], pick: (s: Snap) => number, from: number, to: number): number {
  let m = 0;
  for (const s of trace) {
    if (s.t >= from && s.t <= to) m = Math.max(m, Math.abs(pick(s)));
  }
  return m;
}

/** True when pred holds for every sample at or after page time from. */
function everyFrom(trace: readonly Snap[], from: number, pred: (s: Snap) => boolean): boolean {
  return trace.every((s) => s.t < from || pred(s));
}

/** Counts listeners added to window or the root element while fn runs. Restores the original method. */
function countListenerAdds(fn: () => void): number {
  const real = EventTarget.prototype.addEventListener;
  let adds = 0;
  EventTarget.prototype.addEventListener = function (this: EventTarget, ...args: Parameters<typeof real>): void {
    if (this === window || this === root) adds += 1;
    real.apply(this, args);
  };
  try {
    fn();
  } finally {
    EventTarget.prototype.addEventListener = real;
  }
  return adds;
}

async function runFull(): Promise<void> {
  const rest = snapshot(0);
  check(
    'rest: all six values 0, inside false, type none before any input',
    isZero(rest) && !rest.inside && rest.type === 'none',
    `type=${rest.type} inside=${rest.inside}`,
  );

  // The viewport is 1280 x 720. (640, 360) is the centre, (0, 0) the top-left corner.
  await gate('center');
  const centre = await record(0.25);
  const c = at(centre, 0.1);
  check(
    'centre: mouse sets inside and type, x = 0 and y = 0',
    c.inside && c.type === 'mouse' && c.x === 0 && c.y === 0,
    `x=${c.x} y=${c.y} type=${c.type} inside=${c.inside}`,
  );

  await gate('corner');
  const corner = await record(1.6);
  const k = at(corner, 0.1);
  check(
    'corner: x = -1 and y = +1 on the first frame after the move',
    near(k.x, -1, 1e-9) && near(k.y, 1, 1e-9),
    `x=${k.x} y=${k.y}`,
  );
  const k35 = at(corner, 0.35);
  const frac35 = k35.sx / k35.x;
  const expect35 = 1 - Math.exp(-0.35 / T.half);
  check(
    'corner: sx covers about 63% of the way at 0.35 s',
    near(frac35, expect35, 0.08),
    `fraction=${fmt(frac35)} at t=${fmt(k35.t)} (expect ${fmt(expect35)} +/- 0.08)`,
  );
  const k15 = at(corner, 1.5);
  check(
    'corner: sx and sy within 0.02 of the target by 1.5 s',
    near(k15.sx, -1, 0.02) && near(k15.sy, 1, 0.02),
    `sx=${fmt(k15.sx)} sy=${fmt(k15.sy)} at t=${fmt(k15.t)}`,
  );
  check(
    'corner: velocity from the single jump has decayed to about 0 by 1.5 s',
    near(k15.vx, 0, 0.01) && near(k15.vy, 0, 0.01),
    `vx=${fmt(k15.vx)} vy=${fmt(k15.vy)}`,
  );

  // A fast move leaves sx about velocity * T.half behind the target, so it needs about 2 s to settle.
  await gate('fast');
  const fast = await record(2.6);
  const vPeak = peak(fast, (s) => s.vx, 0, 0.8);
  check('fast move: vx rises well above 0 while the pointer moves', vPeak > 0.5, `peak |vx|=${fmt(vPeak)}`);
  const f25 = at(fast, 2.5);
  check(
    'fast move: ends at the bottom-right position (x = 0.984, y = -0.972)',
    near(f25.x, (1270 / 1280) * 2 - 1, 1e-6) && near(f25.y, 1 - (710 / 720) * 2, 1e-6),
    `x=${fmt(f25.x)} y=${fmt(f25.y)}`,
  );
  check(
    'fast move: vx and vy decay to about 0 after the move',
    near(f25.vx, 0, 0.01) && near(f25.vy, 0, 0.01),
    `vx=${fmt(f25.vx)} vy=${fmt(f25.vy)}`,
  );
  check(
    'fast move: sx and sy settle on the final position by 2.5 s',
    near(f25.sx, f25.x, 0.02) && near(f25.sy, f25.y, 0.02),
    `sx=${fmt(f25.sx)} sy=${fmt(f25.sy)}`,
  );

  const x0 = pointer.x;
  const y0 = pointer.y;
  await gate('leave');
  const leave = await record(2.6);
  check('leave: inside false once the pointer is outside the window', !at(leave, 0.1).inside, `inside=${at(leave, 0.1).inside}`);
  const l35 = at(leave, 0.35);
  const left35 = Math.exp(-0.35 / T.half);
  check(
    'leave: x and y ease back to 0 with the same damping (about 37% left at 0.35 s)',
    near(l35.x / x0, left35, 0.08) && near(l35.y / y0, left35, 0.08),
    `x ratio=${fmt(l35.x / x0)} y ratio=${fmt(l35.y / y0)} at t=${fmt(l35.t)}`,
  );
  const l25 = at(leave, 2.5);
  check(
    'leave: sx and sy come back to 0 within 0.02 by 2.5 s',
    near(l25.sx, 0, 0.02) && near(l25.sy, 0, 0.02),
    `sx=${fmt(l25.sx)} sy=${fmt(l25.sy)}`,
  );
  check('leave: x and y reach 0 by 2.5 s', near(l25.x, 0, 0.01) && near(l25.y, 0, 0.01), `x=${fmt(l25.x)} y=${fmt(l25.y)}`);

  await gate('reenter');
  const reenter = await record(0.4);
  const r0 = at(reenter, 0.05);
  check(
    're-enter: x = -0.5 and y = 0.5 on the first frame back at (320, 180)',
    r0.inside && near(r0.x, -0.5, 1e-9) && near(r0.y, 0.5, 1e-9),
    `x=${r0.x} y=${r0.y} inside=${r0.inside}`,
  );
  const reVx = peak(reenter, (s) => s.vx, 0, 0.2);
  const reVy = peak(reenter, (s) => s.vy, 0, 0.2);
  check(
    're-enter: the jump in position does not register as velocity',
    reVx < 0.05 && reVy < 0.05,
    `peak |vx|=${fmt(reVx)} peak |vy|=${fmt(reVy)}`,
  );

  // The mouse is at (320, 180) here, so x = -0.5 and y = 0.5 are held for the tap.
  const tx0 = pointer.x;
  const ty0 = pointer.y;
  await gate('touch');
  const touch = await record(0.6);
  const t0 = at(touch, 0.05);
  check(
    'touch tap: type becomes touch and clientX/Y report the tap',
    t0.type === 'touch' && t0.clientX === 1000 && t0.clientY === 600,
    `type=${t0.type} client=(${t0.clientX}, ${t0.clientY})`,
  );
  check(
    'touch tap: x and y stay exactly where the mouse left them',
    everyFrom(touch, 0, (s) => s.x === tx0 && s.y === ty0),
    `before=(${tx0}, ${ty0})`,
  );
  check('touch tap: inside is left alone', everyFrom(touch, 0, (s) => s.inside), `inside=${t0.inside}`);
  check(
    'onPointerType: touch reported after the tap',
    typeLog.join() === 'mouse,touch',
    `log=${typeLog.join()}`,
  );

  // A window blur is the other way the pointer leaves. It is dispatched here, not driven by Playwright.
  window.dispatchEvent(new Event('blur'));
  const blur = await record(2.6);
  check('window blur: inside false on the next frame', !at(blur, 0.05).inside, `inside=${at(blur, 0.05).inside}`);
  const b25 = at(blur, 2.5);
  check(
    'window blur: x, y, sx and sy return to about 0 by 2.5 s',
    near(b25.x, 0, 0.01) && near(b25.y, 0, 0.01) && near(b25.sx, 0, 0.02) && near(b25.sy, 0, 0.02),
    `x=${fmt(b25.x)} y=${fmt(b25.y)} sx=${fmt(b25.sx)} sy=${fmt(b25.sy)}`,
  );

  offType();
  const typesAtOff = typeLog.length;

  await gate('final');
  const fin = await record(0.3);
  const f0 = at(fin, 0.05);
  check(
    'mouse back after touch: type mouse, x = -1, y = +1',
    f0.type === 'mouse' && near(f0.x, -1, 1e-9) && near(f0.y, 1, 1e-9),
    `type=${f0.type} x=${f0.x} y=${f0.y}`,
  );
  check(
    'onPointerType: an unsubscribed listener is not called',
    typeLog.length === typesAtOff,
    `calls before=${typesAtOff} after=${typeLog.length}`,
  );

  // Reduced motion switched on while the pointer is still moving the state (sx is about -0.58).
  const sxBeforeReduce = pointer.sx;
  check(
    'precondition: sx is non-zero before reduced motion is switched on',
    Math.abs(sxBeforeReduce) > 0.1,
    `sx=${fmt(sxBeforeReduce)}`,
  );
  await gate('reduce-live');
  const live = await record(0.3);
  check(
    'reduce motion on, live: env reports it and all six values are 0 from 0.05 s',
    env.reducedMotion && everyFrom(live, 0.05, isZero),
    `env.reducedMotion=${env.reducedMotion}`,
  );

  await gate('reduce-move');
  const moved = await record(1.0);
  check('reduce motion: moving the pointer keeps all six values at 0', moved.every(isZero));
  const m0 = at(moved, 0.05);
  check(
    'reduce motion: raw position, inside and type are still tracked',
    m0.inside && m0.type === 'mouse' && m0.clientX === 320 && m0.clientY === 180,
    `client=(${m0.clientX}, ${m0.clientY}) inside=${m0.inside} type=${m0.type}`,
  );
}

async function runReduced(): Promise<void> {
  check('reduced load: env.reducedMotion is true', env.reducedMotion);
  const rest = snapshot(0);
  check('reduced load: rest state is all six values 0', isZero(rest));

  await gate('center');
  const centre = await record(0.3);
  const c = at(centre, 0.1);
  check(
    'reduced: centre move sets inside and type while all six values stay 0',
    c.inside && c.type === 'mouse' && c.clientX === 640 && everyFrom(centre, 0, isZero),
    `inside=${c.inside} type=${c.type} client=(${c.clientX}, ${c.clientY})`,
  );

  await gate('corner');
  const corner = await record(1.2);
  check('reduced: corner move keeps all six values at 0 for 1.2 s', corner.every(isZero));

  await gate('fast');
  const fast = await record(1.2);
  check('reduced: fast move keeps all six values at 0 for 1.2 s', fast.every(isZero));
}

const watchdog = window.setTimeout(() => {
  finish(`fail:timeout after ${WATCHDOG_MS / 1000} s`);
}, WATCHDOG_MS);

async function main(): Promise<void> {
  initTicker();
  initPointer();
  const extraListeners = countListenerAdds(() => {
    initPointer();
  });
  check('initPointer is idempotent: a second call adds no listeners', extraListeners === 0, `added=${extraListeners}`);

  if (env.reducedMotion) {
    await runReduced();
  } else {
    await runFull();
  }

  window.clearTimeout(watchdog);
  console.log(`[harness] ${passed} checks passed, ${failed.length} failed`);
  finish(failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`);
}

main().catch((err: unknown) => {
  window.clearTimeout(watchdog);
  console.log(`[harness] uncaught: ${String(err)}`);
  finish(`fail:exception ${String(err)}`);
});
