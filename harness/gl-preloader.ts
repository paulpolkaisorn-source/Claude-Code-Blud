// Harness for the preloader's 3D layer, src/sections/preloader/gl.ts (design/direction-act1.md, preloader). The mode
// comes from ?mode=:
//   main     the page's own path. createWorld builds the choreography (src/choreo/timeline.ts), which calls the
//            preloader's setup. Normal motion: nothing shows before loader:done, then the kireji and the followers grow.
//   reduced  the same path under reduced motion (emulated by Playwright): blocks at full scale on the first frame after
//            loader:done, and the canvas fades in over T.half.
//   late     loader:done fires before createWorld, so the setup takes the late path: blocks at full scale at once.
//   direct   the choreography is replaced by an empty one (initChoreo(world, [])), which disposes its preloader handle.
//            The harness then calls the preloader's setup, setActive and update itself.
//   dispose  as direct, but the handle is disposed before loader:done. A later loader:done must change nothing.
// While the clock runs, the stage's render hook is replaced, so every frame is cheap and every frame is sampled. A capture
// renders one frame explicitly (composer.render) in the tick after the frame's update, then reads the canvas in that same
// task, so each snapshot is the state of the frame it names. The verdict goes to document.documentElement.dataset.harness,
// and the snapshots go to window.__shots.
import { initChoreo } from '../src/choreo/timeline';
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

type Mode = 'main' | 'reduced' | 'late' | 'direct' | 'dispose';

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
  environmentNotes: string[];
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
  return m === 'reduced' || m === 'late' || m === 'direct' || m === 'dispose' ? m : 'main';
})();

const root = document.documentElement;
const win = window as HarnessWindow;
const canvasNode = document.getElementById('gl');
if (!(canvasNode instanceof HTMLCanvasElement)) throw new Error('harness: canvas#gl is missing');
const canvas: HTMLCanvasElement = canvasNode;

// Errors and warnings are recorded as well as shown. The renderer's notice that SwiftShader lacks the
// KHR_parallel_shader_compile extension is environment noise, so it is kept apart from the verdict.
const ENVIRONMENT_NOISE = /KHR_parallel_shader_compile extension not supported/;
const diagnostics: string[] = [];
const environmentNotes: string[] = [];
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    const text = `${level}: ${args.map((a) => String(a)).join(' ')}`;
    if (ENVIRONMENT_NOISE.test(text)) environmentNotes.push(text);
    else diagnostics.push(text);
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
/** Frames that must fall inside the handoff for the sampling to count as dense. */
const MIN_FRAMES = 30;

/**
 * The snapshots of each mode, in seconds after loader:done. Reduced motion keeps only the rest pose: its canvas fade is
 * CSS opacity, which a canvas snapshot does not contain, so a mid-fade snapshot would show the full stanza.
 */
const SHOT_PLAN: Readonly<Record<Mode, ReadonlyArray<{ name: string; at: number }>>> = {
  main: [
    { name: 't010', at: 0.1 },
    { name: 't040', at: 0.4 },
    { name: 't080', at: 0.8 },
    { name: 't120', at: 1.2 },
  ],
  reduced: [{ name: 't120', at: 1.2 }],
  late: [],
  direct: [],
  dispose: [],
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// loader:done before createWorld is the late path. The bus remembers the flag only in the GL module, so it is set here,
// before the setup that createWorld runs through the choreography.
initTicker();
if (MODE === 'late') bus.emit('loader:done');

const boot: GLBoot = createWorld(canvas);
const world = boot.world;
// Under SwiftShader, compositing a WebGL canvas at a fractional CSS opacity stalls the page for seconds at a time, so the
// reduced run takes the canvas out of compositing. The opacity values are still written and checked on every frame, and
// the snapshots read the canvas buffer, which display does not affect.
if (MODE === 'reduced') canvas.style.display = 'none';
const size = { width: world.stage.size.width, height: world.stage.size.height };
const ctx: SectionGLContext = {
  prev: null,
  portrait: size.width / size.height < 1,
  reducedMotion: env.reducedMotion,
  size: { width: size.width, height: size.height },
  bleed: { p1: 0, p2: 0 },
};

let handle: SectionGLHandle | undefined;
if (MODE === 'direct' || MODE === 'dispose') {
  // An empty choreography disposes the one createWorld started, and with it the preloader handle that it set up.
  initChoreo(world, []);
  handle = preloaderGL.setup?.(world);
  if (handle !== undefined && MODE === 'dispose') handle.dispose();
  if (handle !== undefined && MODE === 'direct') handle.setActive(true, ctx);
}

// The rendering is paused while the clock runs (see the header). capture() renders the frames it needs.
world.stage.setRenderHook(() => undefined);

const instances = world.blocks.mesh.instanceMatrix;
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
  if (MODE === 'dispose') return MIN_SCALE;
  if (MODE === 'reduced' || MODE === 'late') return 1;
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
  const want = cameraKey('hero', size);
  const p = world.stage.camera.position;
  const dx = Math.abs(p.x - want.position[0]);
  const dy = Math.abs(p.y - want.position[1]);
  const dz = Math.abs(p.z - want.position[2]);
  return {
    ok: dx < 1e-4 && dy < 1e-4 && dz < 1e-4,
    detail: `camera (${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)}) want (${want.position[0].toFixed(4)}, ${want.position[1].toFixed(4)}, ${want.position[2].toFixed(4)})`,
  };
}

const shots: Record<string, string> = {};
const captures: Capture[] = [];
const captured = new Set<string>();

// A capture keeps the 17 instance matrices of its frame. Rendering is slow under SwiftShader, so the frames are rendered
// once the sampling has ended, with each saved state written back into the instance buffer first.
interface Pending {
  name: string;
  target: number;
  elapsed: number;
  matrices: Float32Array;
}
const pending: Pending[] = [];

/** Keeps the state of the frame that is running now, under a name. Called from a tick after the frame's update. */
function capture(name: string, target: number, e: number): void {
  pending.push({ name, target, elapsed: e, matrices: Float32Array.from(instances.array as Float32Array) });
  captured.add(name);
}

/** Renders each saved state, reads the canvas after each render, then puts the final state back. */
function renderPending(): void {
  const buffer = instances.array as Float32Array;
  const final = Float32Array.from(buffer);
  for (const p of pending) {
    buffer.set(p.matrices);
    instances.needsUpdate = true;
    world.post.composer.render(0);
    shots[p.name] = canvas.toDataURL('image/png');
    captures.push({ name: p.name, target: p.target, elapsed: p.elapsed });
  }
  buffer.set(final);
  instances.needsUpdate = true;
}

type Step = 'warm' | 'pre' | 'zeroed' | 'late' | 'await' | 'live' | 'done';
let step: Step = 'warm';
let framesIn = 0;
let emitted = false;
let t0 = -1;
let samples = 0;
let framesBeforeEnd = 0;
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
    width: size.width,
    height: size.height,
    checks,
    captures,
    samples,
    maxError,
    lastElapsed,
    environmentNotes,
    diagnostics,
  };
  win.__shots = shots;
  win.__report = report;
  const failed = checks.filter((c) => !c.ok).map((c) => `${c.name}${c.detail === '' ? '' : ` (${c.detail})`}`);
  const problems = [...failed, ...diagnostics.map((d) => `console ${d}`)];
  root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;
}

/** The checks that run after loader:done, once the sampling has ended. */
function finishLive(): void {
  renderPending();
  check(
    'nothing shows before loader:done (every block <= 1e-3)',
    preViolations === 0,
    `frames over: ${preViolations}`,
  );
  check(
    `the scales match the act-file curves (max error <= ${TOLERANCE})`,
    maxError <= TOLERANCE,
    `max ${maxError.toExponential(2)} over ${samples} frames`,
  );
  check('no block scale decreases during the handoff', monotoneViolations === 0, `violations: ${monotoneViolations}`);
  if (MODE === 'main' || MODE === 'direct') {
    check('the kireji (block 4) is the first block to grow', firstLeaver === 4, `first block: ${firstLeaver}`);
  }
  if (MODE === 'main' || MODE === 'reduced' || MODE === 'direct') {
    check(
      `the sampling is dense through the handoff (at least ${MIN_FRAMES} frames before ${HANDOFF_END.toFixed(2)} s)`,
      framesBeforeEnd >= MIN_FRAMES,
      `frames: ${framesBeforeEnd}`,
    );
    check(
      `the sampling reaches the end of the handoff (${HANDOFF_END.toFixed(2)} s)`,
      lastElapsed >= HANDOFF_END,
      `last ${lastElapsed.toFixed(3)} s`,
    );
    const full = maxDeviation(1);
    check('every block is at full scale at the end of the sampling', full <= 1e-3, `worst ${full.toExponential(2)}`);
    const cam = cameraOnHero();
    check('the camera holds the hero keyframe through the handoff', cam.ok, cam.detail);
  }
  if (MODE === 'main') {
    check(
      'normal: the canvas keeps its CSS opacity unset (no fade in normal motion)',
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
    const planned = SHOT_PLAN[MODE];
    check(
      'each snapshot was taken on the first frame at or after its time (within 0.1 s)',
      planned.every((p) => captured.has(p.name)) &&
        captures.every((c) => c.elapsed >= c.target && c.elapsed - c.target < 0.1),
      captures.map((c) => `${c.name}=${c.elapsed.toFixed(3)}`).join(' '),
    );
  }
  if (MODE === 'dispose') {
    check(
      'after dispose, a later loader:done changes no block',
      preViolations === 0 && maxError <= TOLERANCE,
      `max ${maxError.toExponential(2)}`,
    );
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
  if (e < HANDOFF_END) framesBeforeEnd += 1;
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
  for (const shot of SHOT_PLAN[MODE]) {
    if (!captured.has(shot.name) && e >= shot.at) capture(shot.name, shot.at, e);
  }
  if (e >= END) finishLive();
}

/** The per-frame driver. It runs after the stage's (now empty) render tick, in the same task as the frame. */
function onFrame(tick: Tick): void {
  if (step === 'done') return;
  framesIn += 1;
  // The direct and dispose modes drive the handle as the brief asks: update every frame with progress 0 (no-op).
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
      if (MODE === 'reduced') {
        check('reduced: the canvas is held at opacity 0 before loader:done', canvas.style.opacity === '0', `style "${canvas.style.opacity}"`);
      } else {
        check('normal: the canvas has no inline opacity before loader:done', canvas.style.opacity === '', `style "${canvas.style.opacity}"`);
      }
      check('the reduced-motion flag matches the mode', env.reducedMotion === (MODE === 'reduced'), `env.reducedMotion=${env.reducedMotion}`);
      if (MODE === 'main' || MODE === 'reduced') capture('pre', 0, 0);
      win.__ready = true;
      step = 'await';
      return;
    }
    case 'zeroed': {
      if (framesIn < 2) return;
      const zero = maxScale();
      check('dispose: blocks set back to entrance 0 stay at 1e-4 (no handle runs)', zero <= 1e-3, `largest ${zero.toExponential(2)}`);
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
      publish();
      return;
    }
    case 'await': {
      if (!emitted) {
        if (maxScale() > 1e-3) preViolations += 1;
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

// Playwright emits loader:done after the pre-state is read. The page itself never emits it in the other modes.
win.__emit = (): void => {
  if (emitted || step !== 'await') return;
  emitted = true;
  bus.emit('loader:done');
};

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
