// Harness for the preloader's 3D layer, src/sections/preloader/gl.ts (design/direction-act1.md, preloader). It builds
// the real world through createWorld (src/gl/boot.ts) and drives the preloader's own handle. The mode comes from ?mode=:
//   main     normal motion. Nothing shows before loader:done, then the kireji and the 16 followers grow on the page clock.
//   reduced  reduced motion. Every block is at full scale on the first frame after loader:done, and the canvas fades in.
//   late     loader:done fires before setup. Every block is at full scale on the first frame after setup.
//   dispose  the handle is disposed before loader:done. The blocks are left at full scale, and a later loader:done
//            changes nothing.
// Every frame, a tick after the render (PRIORITY.glRender + 1) reads the 17 instance matrices as block scales and the
// canvas opacity, compares them with the act-file curves, and takes canvas snapshots in the same task as the frame, while
// the frame is still in the drawing buffer. The page clock is the only clock. The verdict goes to
// document.documentElement.dataset.harness; the snapshots go to window.__shots.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { ef } from '../src/core/ease';
import { PRIORITY, addTick, initTicker, type Tick } from '../src/core/ticker';
import { HAIKU_OFFSETS, T } from '../src/core/timing';
import { BLOCK_COUNT, STAGGER_ORDER } from '../src/gl/blocks/formations';
import { createWorld, type GLBoot } from '../src/gl/boot';
import { cameraKey } from '../src/gl/rig';
import type { SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { preloaderGL } from '../src/sections/preloader/gl';

type Mode = 'main' | 'reduced' | 'late' | 'dispose';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface Capture {
  name: string;
  target: number;
  elapsed: number;
}

interface Report {
  mode: Mode;
  width: number;
  height: number;
  checks: Check[];
  captures: Capture[];
  samples: number;
  maxError: number;
  lastElapsed: number;
  diagnostics: string[];
}

interface HarnessWindow extends Window {
  __ready?: boolean;
  __emit?: () => void;
  __shots?: Record<string, string>;
  __report?: Report;
}

const MODE: Mode = ((): Mode => {
  const m = new URLSearchParams(location.search).get('mode');
  return m === 'reduced' || m === 'late' || m === 'dispose' ? m : 'main';
})();

const root = document.documentElement;
const win = window as HarnessWindow;
const canvas = document.getElementById('gl');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('harness: canvas#gl is missing');

// Errors and warnings are recorded as well as shown, so the verdict can count them.
const diagnostics: string[] = [];
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    diagnostics.push(`${level}: ${args.map((a) => String(a)).join(' ')}`);
    original(...args);
  };
}

const checks: Check[] = [];
function check(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ` :: ${detail}`}`);
}

/** Blocks clamps its entrance to this value, so a block at entrance 0 has this scale (blocks.ts MIN_SCALE). */
const MIN_SCALE = 1e-4;
/** Largest allowed gap between a measured scale and the act-file curve. */
const TOLERANCE = 1e-3;
/** Seconds after loader:done that the sampling runs. The handoff ends at 1.10 s. */
const END = 1.5;
/** The handoff end: T.micro + HAIKU_OFFSETS[16] + T.half (direction-act1 preloader, Sequence). */
const HANDOFF_END = T.micro + HAIKU_OFFSETS[BLOCK_COUNT - 1] + T.half;
/** The four snapshots of the handoff, in seconds after loader:done. */
const SHOTS: ReadonlyArray<{ name: string; at: number }> = [
  { name: 't010', at: 0.1 },
  { name: 't040', at: 0.4 },
  { name: 't080', at: 0.8 },
  { name: 't120', at: 1.2 },
];

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

const initialSize = { width: 0, height: 0 };

initTicker();
const boot: GLBoot = createWorld(canvas);
const world = boot.world;
initialSize.width = world.stage.size.width;
initialSize.height = world.stage.size.height;
const ctx: SectionGLContext = {
  prev: null,
  portrait: initialSize.width / initialSize.height < 1,
  reducedMotion: env.reducedMotion,
  size: { width: initialSize.width, height: initialSize.height },
};
const instances = world.blocks.mesh.instanceMatrix;

/** The block at each stagger position (position k is block STAGGER_ORDER.stanza[k]). */
const POSITION_OF: number[] = new Array<number>(BLOCK_COUNT).fill(-1);
STAGGER_ORDER.stanza.forEach((block, k) => {
  POSITION_OF[block] = k;
});

/** Scale of a block: the length of its x column in the instance matrix (the blocks are unrotated). */
function scaleOf(block: number): number {
  const a = instances.array;
  const o = block * 16;
  return Math.hypot(a[o], a[o + 1], a[o + 2]);
}

/** Largest scale over the 17 blocks, and the largest gap from the target scale. */
function maxScale(): number {
  let worst = 0;
  for (let b = 0; b < BLOCK_COUNT; b += 1) worst = Math.max(worst, scaleOf(b));
  return worst;
}
function maxDeviation(target: number): number {
  let worst = 0;
  for (let b = 0; b < BLOCK_COUNT; b += 1) worst = Math.max(worst, Math.abs(scaleOf(b) - target));
  return worst;
}

/** The scale a block should have at e seconds after loader:done, from the act-file curves. */
function expectedScale(block: number, e: number): number {
  if (MODE === 'late' || MODE === 'reduced') return 1;
  if (MODE === 'dispose') return MIN_SCALE;
  const k = POSITION_OF[block];
  const value =
    k === 0
      ? ef.cut(clamp01(e / T.beat5))
      : ef.settle(clamp01((e - T.micro - HAIKU_OFFSETS[k]) / T.half));
  return Math.max(value, MIN_SCALE);
}

/** The canvas opacity as a number. An unset inline style is 1. */
function canvasOpacity(): number {
  const raw = canvas.style.opacity;
  return raw === '' ? 1 : Number(raw);
}

/** The camera position against the hero keyframe for this viewport (direction-act1 A7). */
function cameraOnHero(): { ok: boolean; detail: string } {
  const want = cameraKey('hero', initialSize);
  const p = world.stage.camera.position;
  const dx = Math.abs(p.x - want.position[0]);
  const dy = Math.abs(p.y - want.position[1]);
  const dz = Math.abs(p.z - want.position[2]);
  const ok = dx < 1e-4 && dy < 1e-4 && dz < 1e-4;
  return {
    ok,
    detail: `camera (${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)}) want (${want.position[0].toFixed(4)}, ${want.position[1].toFixed(4)}, ${want.position[2].toFixed(4)})`,
  };
}

const shots: Record<string, string> = {};
const captures: Capture[] = [];
const captured = new Set<string>();

function snapshot(name: string, target: number, elapsed: number): void {
  shots[name] = canvas.toDataURL('image/png');
  captured.add(name);
  captures.push({ name, target, elapsed });
}

let handle: SectionGLHandle | undefined;
let step: 'warm' | 'pre' | 'zeroed' | 'late' | 'await' | 'live' | 'done' = 'warm';
let framesIn = 0;
let emitted = false;
let t0 = -1;
let samples = 0;
let maxError = 0;
let lastElapsed = 0;
let monotoneViolations = 0;
let firstLeaver = -1;
let canvasViolations = 0;
let preViolations = 0;
const previous = new Float64Array(BLOCK_COUNT);

/** Publishes the verdict and the snapshots. */
function publish(): void {
  step = 'done';
  const report: Report = {
    mode: MODE,
    width: initialSize.width,
    height: initialSize.height,
    checks,
    captures,
    samples,
    maxError,
    lastElapsed,
    diagnostics,
  };
  win.__shots = shots;
  win.__report = report;
  const failed = checks.filter((c) => !c.ok).map((c) => `${c.name}${c.detail === '' ? '' : ` (${c.detail})`}`);
  const problems = [...failed, ...diagnostics.map((d) => `console ${d}`)];
  root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;
}

/** Live checks, after loader:done (main, reduced and dispose). */
function finishLive(): void {
  check('nothing shows before loader:done (every block <= 1e-3)', preViolations === 0, `frames over: ${preViolations}`);
  check(
    `the scales match the act-file curves (max error <= ${TOLERANCE})`,
    maxError <= TOLERANCE,
    `max ${maxError.toExponential(2)} over ${samples} frames`,
  );
  check('no block scale decreases during the handoff', monotoneViolations === 0, `violations: ${monotoneViolations}`);
  if (MODE === 'main') {
    check('the kireji (block 4) is the first block to grow', firstLeaver === 4, `first block: ${firstLeaver}`);
    check(
      'the canvas keeps its CSS opacity unset (no fade in normal motion)',
      canvasViolations === 0,
      `violations: ${canvasViolations}`,
    );
  }
  if (MODE === 'reduced') {
    check(
      'reduced: the canvas fades in with ef.fade over T.half and is then released',
      canvasViolations === 0,
      `violations: ${canvasViolations}`,
    );
  }
  if (MODE === 'main' || MODE === 'reduced') {
    check(`the sampling reaches the end of the handoff (${HANDOFF_END.toFixed(2)} s)`, lastElapsed >= HANDOFF_END, `last ${lastElapsed.toFixed(3)} s`);
    const full = maxDeviation(1);
    check('every block is at full scale at the end of the sampling', full <= 1e-3, `worst ${full.toExponential(2)}`);
    const cam = cameraOnHero();
    check('the camera holds the hero keyframe through the handoff', cam.ok, cam.detail);
    check(
      'each snapshot was taken at or after its time',
      SHOTS.every((s) => captured.has(s.name)) && captures.every((c) => c.elapsed >= c.target),
      captures.map((c) => `${c.name}=${c.elapsed.toFixed(3)}`).join(' '),
    );
  }
  if (MODE === 'dispose') {
    check('after dispose a later loader:done leaves every block at its scale', preViolations === 0 && maxError <= TOLERANCE, `max ${maxError.toExponential(2)}`);
  }
  publish();
}

/** Samples one live frame against the curves, and takes the snapshots that are due. */
function sampleLive(tick: Tick): void {
  if (!emitted) return;
  if (t0 < 0) {
    t0 = tick.time;
    step = 'live';
  }
  const e = tick.time - t0;
  lastElapsed = e;
  samples += 1;
  for (let b = 0; b < BLOCK_COUNT; b += 1) {
    const s = scaleOf(b);
    maxError = Math.max(maxError, Math.abs(s - expectedScale(b, e)));
    if (samples > 1 && s < previous[b] - 1e-6) monotoneViolations += 1;
    previous[b] = s;
    if (firstLeaver < 0 && s > 1e-3) firstLeaver = b;
  }
  if (MODE === 'reduced') {
    const want = e >= T.half ? 1 : ef.fade(clamp01(e / T.half));
    if (Math.abs(canvasOpacity() - want) > 1e-3) canvasViolations += 1;
  } else if (canvas.style.opacity !== '') {
    canvasViolations += 1;
  }
  if (MODE === 'main' || MODE === 'reduced') {
    for (const shot of SHOTS) {
      if (!captured.has(shot.name) && e >= shot.at) snapshot(shot.name, shot.at, e);
    }
  }
  if (e >= END) finishLive();
}

/** The per-frame driver. It runs after the render, in the same task as the frame. */
function onFrame(tick: Tick): void {
  if (step === 'done') return;
  framesIn += 1;
  if (handle !== undefined) handle.update(0, tick, ctx);
  switch (step) {
    case 'warm':
      return;
    case 'pre': {
      if (framesIn < 2) return;
      if (MODE === 'dispose') {
        const full = maxDeviation(1);
        check('dispose: the blocks are left at full scale', full <= 1e-3, `worst ${full.toExponential(2)}`);
        for (let b = 0; b < BLOCK_COUNT; b += 1) world.blocks.setEntrance(b, 0);
        step = 'zeroed';
        framesIn = 0;
        return;
      }
      const zero = maxScale();
      check('boot: every block is invisible before loader:done (scale <= 1e-3)', zero <= 1e-3, `largest ${zero.toExponential(2)}`);
      const cam = cameraOnHero();
      check('boot: the camera holds the hero keyframe', cam.ok, cam.detail);
      check('boot: the camera far plane is 80 (direction-3d 10.6)', world.stage.camera.far === 80, `far ${world.stage.camera.far}`);
      check(
        MODE === 'reduced'
          ? 'reduced: the canvas is held at opacity 0 before loader:done'
          : 'normal: the canvas has no inline opacity before loader:done',
        MODE === 'reduced' ? canvas.style.opacity === '0' : canvas.style.opacity === '',
        `style "${canvas.style.opacity}"`,
      );
      check(
        'reduced flag matches the mode',
        env.reducedMotion === (MODE === 'reduced'),
        `env.reducedMotion=${env.reducedMotion}`,
      );
      snapshot('pre', 0, 0);
      win.__ready = true;
      step = 'await';
      return;
    }
    case 'zeroed': {
      if (framesIn < 2) return;
      const zero = maxScale();
      check('dispose: blocks set back to entrance 0 stay at 1e-4 (the handle is gone)', zero <= 1e-3, `largest ${zero.toExponential(2)}`);
      win.__ready = true;
      step = 'await';
      return;
    }
    case 'late': {
      if (framesIn < 2) return;
      const full = maxDeviation(1);
      check('late: every block is at full scale on the first frame after setup', full <= 1e-3, `worst ${full.toExponential(2)}`);
      check('late: the canvas has no inline opacity', canvas.style.opacity === '', `style "${canvas.style.opacity}"`);
      const cam = cameraOnHero();
      check('late: the camera holds the hero keyframe', cam.ok, cam.detail);
      win.__ready = true;
      publish();
      return;
    }
    case 'await': {
      if (!emitted) {
        preViolations += maxScale() > 1e-3 ? 1 : 0;
        return;
      }
      sampleLive(tick);
      return;
    }
    case 'live':
      sampleLive(tick);
      return;
    default:
      return;
  }
}

// The emission is driven from Playwright after the pre-state is read (main, reduced and dispose).
win.__emit = (): void => {
  if (emitted || step !== 'await') return;
  emitted = true;
  bus.emit('loader:done');
};

// Setup order matches the page: loader:done is emitted before setup only in the late mode.
if (MODE === 'late') bus.emit('loader:done');
const made = preloaderGL.setup?.(world);
if (made === undefined) {
  check('the preloader layer exports a setup function', false);
  publish();
} else {
  handle = made;
  if (MODE === 'dispose') {
    handle.dispose();
  } else {
    handle.setActive(true, ctx);
  }
}

addTick(onFrame, PRIORITY.glRender + 1);

boot
  .compile()
  .then(() => {
    framesIn = 0;
    step = MODE === 'late' ? 'late' : 'pre';
  })
  .catch((err: unknown) => {
    check('compile resolves', false, String(err));
    publish();
  });
