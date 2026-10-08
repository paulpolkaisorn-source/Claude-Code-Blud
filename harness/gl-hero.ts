// Harness for the hero's 3D layer, src/sections/hero/gl.ts (architecture section 10a). The world comes from the real
// createWorld (src/gl/boot.ts), and the hero handle is driven as the choreography will drive it: setActive(true) once,
// then update(progress, tick, ctx) on every frame. Synchronous checks run first and set
// document.documentElement.dataset.harness. They cover the registration, the stanza at rest, at 0.25, at 0.5 and at 1
// (direction-3d 11.2 and 11.11, read back from the instance matrices), the sym mapping, the portrait stanza,
// heroExitPoses, the hero camera (direction-act1 A7), the pointer tilt (fine pointer only, capped, damped), touch,
// reduced motion, the tidy on setActive(false), and dispose. Then initPointer runs, and window.__heroHarness drives
// the states that the screenshots show. The driver is scripts kept outside the repository (see the run notes).
import { ef } from '../src/core/ease';
import { env } from '../src/core/env';
import { initPointer, pointer } from '../src/core/pointer';
import { PRIORITY, addTick, initTicker, type Tick } from '../src/core/ticker';
import { createWorld } from '../src/gl/boot';
import { BLOCK_COUNT, FORMATIONS, formationFor, type Pose } from '../src/gl/blocks/formations';
import { cameraKey } from '../src/gl/rig';
import type { GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { heroExitPoses, heroGL } from '../src/sections/hero/gl';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
  /** Environment notices, kept apart from the verdict (see ENVIRONMENT_NOTICE). */
  notices: string[];
}

/** What the screenshot driver calls. progress is the hero's section progress s; frames is how long to wait. */
interface HeroDriver {
  drive(progress: number, opts?: { reduced?: boolean; frames?: number }): Promise<number>;
  wait(frames: number): Promise<number>;
  frames(): number;
}

interface HarnessWindow extends Window {
  __heroHarness?: HeroDriver;
  __heroReport?: Report;
}

type XY = readonly (readonly [number, number])[];

const root = document.documentElement;
const FRAME = 1 / 60;
const TILT = 0.035; // rad, the cap on each tilt axis (direction-3d 10.13)
const EPS = 1e-5;
const report: Report = { passes: [], failures: [], diagnostics: [], notices: [] };

// Headless Chromium's SwiftShader has no KHR_parallel_shader_compile, so three's WebGLExtensions warns once when
// compileAsync asks for it. This is a capability notice of the software GL, not a shader message: real GPUs have
// the extension. It is recorded in report.notices and kept out of the verdict. Every other warning still fails.
const ENVIRONMENT_NOTICE = /KHR_parallel_shader_compile extension not supported/;

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    report.passes.push(name);
    console.log(`PASS ${name}${suffix}`);
  } else {
    report.failures.push(`${name}${suffix}`);
    console.log(`FAIL ${name}${suffix}`);
  }
}

// Errors and warnings are recorded as well as shown, so the verdict counts them.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    const text = `${level}: ${args.map((a) => String(a)).join(' ')}`;
    if (ENVIRONMENT_NOTICE.test(text)) report.notices.push(text);
    else report.diagnostics.push(text);
    original(...args);
  };
}
window.addEventListener('error', (e) => report.diagnostics.push(`uncaught: ${e.message}`));

/** The stanza's x and y for a pitch and a row offset (direction-3d 11.2 and 11.11), written out from the formula. */
function stanzaXY(pitch: number, offset: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const row = i < 5 ? 0 : i < 12 ? 1 : 2;
    const n = row === 1 ? 7 : 5;
    const k = row === 0 ? i : row === 1 ? i - 5 : i - 12;
    const y = row === 0 ? offset : row === 1 ? 0 : -offset;
    out.push([(k - (n - 1) / 2) * pitch, y]);
  }
  return out;
}

/** The open stanza at progress s: k = ef.sym(s), pitch 0.87 + 0.08 k, row offsets 1.05 + 0.08 k (11.11). */
function openXY(s: number): [number, number][] {
  const k = ef.sym(s);
  return stanzaXY(0.87 + 0.08 * k, 1.05 + 0.08 * k);
}

/** The hero keyframe of direction-act1 A7, from its formulas and not from cameraKey. */
function expectedHeroCamera(size: { width: number; height: number }): { x: number; y: number; z: number } {
  const a = size.width / size.height;
  const t = Math.tan((11 * Math.PI) / 180);
  if (a >= 1) {
    const z = 5.92 / (0.9 * t * a);
    return { x: -0.22 * 2 * z * t * a, y: 0, z };
  }
  return { x: 0, y: -1.1, z: 5.92 / (1.68 * t * a) };
}

/** Largest error between the 17 poses and the expected x and y, with scale 1 and no roll. */
function poseError(poses: readonly Pose[], xy: XY): number {
  let worst = 0;
  poses.forEach((q, i) => {
    const [x, y] = xy[i];
    worst = Math.max(
      worst,
      Math.abs(q.p[0] - x),
      Math.abs(q.p[1] - y),
      Math.abs(q.p[2]),
      Math.abs(q.s - 1),
      Math.abs(q.r[0]),
      Math.abs(q.r[1]),
      Math.abs(q.r[2]),
    );
  });
  return worst;
}

async function main(): Promise<void> {
  const element = document.getElementById('gl');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the #gl canvas is missing');
  const canvas: HTMLCanvasElement = element;

  // The desktop run forces a fine pointer, so the tilt path runs even where the headless browser reports none.
  // Touch is off in both runs. The reduced-motion run is the context that sets env.reducedMotion before boot.
  const isReducedRun = env.reducedMotion;
  env.finePointer = true;
  env.touch = false;

  initTicker();
  const boot = createWorld(canvas);
  await boot.compile();
  const world: GLWorld = boot.world;

  const tick: Tick = { time: 0, dt: FRAME, frame: 0 };
  let clock = 0;
  /** Advances n frames of the synthetic clock. each runs first, as the choreography's update does, then the shared blocks and rig. */
  function step(n: number, each?: () => void): void {
    for (let i = 0; i < n; i += 1) {
      clock += FRAME;
      tick.time = clock;
      tick.dt = FRAME;
      tick.frame += 1;
      if (each !== undefined) each();
      world.blocks.update(tick);
      world.rig.update(tick);
    }
  }

  const prev: SectionGL = { id: 'preloader', formation: 'stanza', key: 'hero', ink: 0, dof: null, breath: null };
  const viewport = (): { width: number; height: number } => ({ width: window.innerWidth, height: window.innerHeight });
  function contextFor(over: Partial<SectionGLContext> = {}): SectionGLContext {
    const size = viewport();
    return { prev, portrait: size.width < size.height, reducedMotion: env.reducedMotion, size, ...over };
  }

  // The 17 instance matrices, read back as the GPU buffer holds them.
  const matrices = (): Float32Array => world.blocks.mesh.instanceMatrix.array as Float32Array;
  /** Largest error between the instance matrices and the expected x and y, with unit scale and no roll. */
  function matrixError(xy: XY): number {
    const a = matrices();
    let worst = 0;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const o = i * 16;
      const [x, y] = xy[i];
      worst = Math.max(worst, Math.abs(a[o + 12] - x), Math.abs(a[o + 13] - y), Math.abs(a[o + 14]));
      worst = Math.max(worst, Math.abs(a[o] - 1), Math.abs(a[o + 5] - 1), Math.abs(a[o + 10] - 1));
      worst = Math.max(
        worst,
        Math.abs(a[o + 1]),
        Math.abs(a[o + 2]),
        Math.abs(a[o + 4]),
        Math.abs(a[o + 6]),
        Math.abs(a[o + 8]),
        Math.abs(a[o + 9]),
      );
    }
    return worst;
  }
  const rotX = (): number => world.blocks.group.rotation.x;
  const rotY = (): number => world.blocks.group.rotation.y;

  // Registration.
  check('boot collects heroGL into the world sections (by identity)', boot.sections.includes(heroGL));
  check(
    'heroGL fields: id hero, formation stanza, key hero, ink 0, dof null, breath 0.012 rows',
    heroGL.id === 'hero' &&
      heroGL.formation === 'stanza' &&
      heroGL.key === 'hero' &&
      heroGL.ink === 0 &&
      heroGL.dof === null &&
      heroGL.breath !== null &&
      heroGL.breath.amplitude === 0.012 &&
      heroGL.breath.phase === 'rows' &&
      heroGL.exitFormation === undefined &&
      heroGL.smear === undefined,
  );
  const setup = heroGL.setup;
  if (setup === undefined) throw new Error('heroGL has no setup');
  const handle: SectionGLHandle = setup(world);
  check(
    'setup returns a handle with update, setActive and dispose',
    typeof handle.update === 'function' && typeof handle.setActive === 'function' && typeof handle.dispose === 'function',
  );
  check(
    'formationFor keeps the stanza unturned in portrait (the premise of the one modulation)',
    formationFor('stanza', true) === FORMATIONS.stanza && formationFor('stanza', false) === FORMATIONS.stanza,
  );

  handle.setActive(true, contextFor());

  // The stanza at rest, the open stanza and the sym mapping, read back from the instance matrices.
  handle.update(0, tick, contextFor());
  step(2);
  const restErr = matrixError(stanzaXY(0.87, 1.05));
  check('update(0) sets the stanza rest pose (11.2) on all 17 blocks', restErr < EPS, `max error ${restErr.toExponential(2)}`);
  const formationErr = matrixError(FORMATIONS.stanza.map((q): [number, number] => [q.p[0], q.p[1]]));
  check('update(0) matches FORMATIONS.stanza', formationErr < EPS, `max error ${formationErr.toExponential(2)}`);

  handle.update(1, tick, contextFor());
  step(2);
  const openErr = matrixError(stanzaXY(0.95, 1.13));
  check('update(1) opens to pitch 0.95 and row offsets 1.13 (11.11)', openErr < EPS, `max error ${openErr.toExponential(2)}`);

  handle.update(0.25, tick, contextFor());
  step(2);
  const midErr = matrixError(openXY(0.25));
  check(
    'update(0.25) follows ef.sym: pitch and offsets from k = sym(0.25)',
    midErr < EPS && Math.abs(ef.sym(0.25) - 0.25) > 0.05,
    `k ${ef.sym(0.25).toFixed(4)}, max error ${midErr.toExponential(2)}`,
  );

  handle.update(0.5, tick, contextFor());
  step(2);
  const halfErr = matrixError(stanzaXY(0.91, 1.09));
  check(
    'update(0.5): sym(0.5) = 0.5, so pitch 0.91 and offsets 1.09',
    Math.abs(ef.sym(0.5) - 0.5) < 1e-6 && halfErr < EPS,
    `max error ${halfErr.toExponential(2)}`,
  );

  // Portrait: the same stanza and the same modulation.
  handle.update(1, tick, contextFor({ portrait: true }));
  step(2);
  check('portrait takes the same open stanza', matrixError(stanzaXY(0.95, 1.13)) < EPS);

  // The exit pose that the speed section starts from.
  const exitOut: Pose[] = [];
  const exitBack = heroExitPoses(false, exitOut);
  check('heroExitPoses writes into the array it is given, 17 poses', exitBack === exitOut && exitOut.length === BLOCK_COUNT);
  check('heroExitPoses(false) is the s = 1 stanza', poseError(exitOut, stanzaXY(0.95, 1.13)) < EPS);
  const exitPortrait: Pose[] = [];
  heroExitPoses(true, exitPortrait);
  check('heroExitPoses(true) equals heroExitPoses(false)', poseError(exitPortrait, stanzaXY(0.95, 1.13)) < EPS);

  // The hero camera: held on the keyframe, from the A7 formulas and from cameraKey.
  const size = viewport();
  handle.update(0.5, tick, contextFor());
  step(2);
  const want = expectedHeroCamera(size);
  const cam = world.stage.camera;
  const camErr = Math.max(
    Math.abs(cam.position.x - want.x),
    Math.abs(cam.position.y - want.y),
    Math.abs(cam.position.z - want.z),
    Math.abs(cam.fov - 22),
  );
  check(
    'the camera holds the hero keyframe (direction-act1 A7 formulas)',
    camErr < 1e-3,
    `camera (${cam.position.x.toFixed(4)}, ${cam.position.y.toFixed(4)}, ${cam.position.z.toFixed(4)}), fov ${cam.fov}`,
  );
  const key = cameraKey('hero', size);
  check(
    'cameraKey(hero) agrees with the formulas at this size',
    Math.abs(key.position[0] - want.x) < 1e-6 && Math.abs(key.position[2] - want.z) < 1e-6,
  );
  if (size.width === 1440 && size.height === 900) {
    check(
      'at 1440 by 900 the hero key is z 21.15 and x -2.894 (A7)',
      Math.abs(cam.position.z - 21.15) < 0.01 && Math.abs(cam.position.x + 2.894) < 0.002,
    );
  }

  if (!isReducedRun) {
    // Tilt on a fine pointer: rotX = -sy x 0.035, rotY = sx x 0.035, capped at 0.035 on each axis (10.13).
    pointer.sx = 3;
    pointer.sy = 0.5;
    step(600, () => handle.update(0, tick, contextFor()));
    check(
      'tilt: rotX -sy x 0.035 and rotY capped at 0.035 (sx 3 and sy 0.5)',
      Math.abs(rotX() + 0.5 * TILT) < 1e-4 && Math.abs(rotY() - TILT) < 1e-4,
      `rotX ${rotX().toFixed(5)}, rotY ${rotY().toFixed(5)}`,
    );

    // Touch: no tilt.
    env.touch = true;
    pointer.sx = 1;
    pointer.sy = 1;
    step(600, () => handle.update(0, tick, contextFor()));
    check('touch: no tilt', Math.abs(rotX()) < 1e-6 && Math.abs(rotY()) < 1e-6, `rotX ${rotX()}, rotY ${rotY()}`);
    env.touch = false;

    // Reduced motion (the context flag): no tilt.
    step(600, () => handle.update(0, tick, contextFor({ reducedMotion: true })));
    check('reduced motion (context): no tilt', Math.abs(rotX()) < 1e-6 && Math.abs(rotY()) < 1e-6);
  }

  // Reduced motion: the stanza stays at rest whatever the scroll progress (direction-act1 hero, reduced motion).
  handle.update(1, tick, contextFor({ reducedMotion: true }));
  step(2);
  check(
    'reduced motion: update(1) holds the rest pose, with no scroll mapping',
    matrixError(stanzaXY(0.87, 1.05)) < EPS,
    `max error ${matrixError(stanzaXY(0.87, 1.05)).toExponential(2)}`,
  );

  // setActive(false) leaves the group tidy for the next section: tilt, group offset and lifts back to rest.
  pointer.sx = 1;
  pointer.sy = 1;
  handle.update(0, tick, contextFor());
  world.blocks.setLift(2, 0.15, 0);
  world.blocks.setGroupOffset(0.2, 0.1, 0);
  step(600, () => handle.update(0, tick, contextFor()));
  const liftedY = matrices()[2 * 16 + 13];
  check('control: a lift and a group offset from elsewhere are applied', liftedY > 1.05 + 0.1 && world.blocks.group.position.x > 0.15);
  handle.setActive(false, contextFor());
  step(600);
  const restY = matrices()[2 * 16 + 13];
  check(
    'setActive(false) tidies: tilt 0, group offset 0, lifts 0',
    Math.abs(rotX()) < 1e-4 &&
      Math.abs(rotY()) < 1e-4 &&
      Math.abs(world.blocks.group.position.x) < 1e-4 &&
      Math.abs(world.blocks.group.position.y) < 1e-4 &&
      Math.abs(restY - 1.05) < 1e-4,
    `rotX ${rotX().toExponential(2)}, rotY ${rotY().toExponential(2)}, block 2 y ${restY.toFixed(5)}`,
  );
  pointer.sx = 0;
  pointer.sy = 0;

  // Dispose: a disposed handle changes nothing, and its setActive does nothing.
  const second = setup(world);
  second.setActive(true, contextFor());
  second.update(0, tick, contextFor());
  step(2);
  const before = Float32Array.from(matrices());
  second.dispose();
  second.update(1, tick, contextFor());
  second.setActive(true, contextFor());
  step(2);
  const after = matrices();
  let unchanged = before.length === after.length;
  for (let k = 0; unchanged && k < before.length; k += 1) if (before[k] !== after[k]) unchanged = false;
  check('dispose: a disposed handle changes no matrix and ignores setActive', unchanged);

  // Back to the live state: the hero active at rest, with the pointer at rest.
  handle.setActive(true, contextFor());
  handle.update(0, tick, contextFor());
  step(300, () => handle.update(0, tick, contextFor()));

  const problems = [...report.failures, ...report.diagnostics];
  root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;

  // Live driving for the screenshots. The choreography's per-frame update is simulated at PRIORITY.scroll, and the
  // frame is counted after the render (PRIORITY.glRender + 1), so a driven state is on screen once its frames pass.
  initPointer();
  const live: SectionGLContext = contextFor();
  let progress = 0;
  let reduced = env.reducedMotion;
  let frameCount = 0;
  const waiters: { until: number; resolve: (n: number) => void }[] = [];
  addTick((t) => {
    const now = viewport();
    live.size = now;
    live.portrait = now.width < now.height;
    live.reducedMotion = reduced;
    handle.update(progress, t, live);
  }, PRIORITY.scroll);
  addTick(() => {
    frameCount += 1;
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      if (waiters[i].until <= frameCount) {
        const [done] = waiters.splice(i, 1);
        done.resolve(frameCount);
      }
    }
  }, PRIORITY.glRender + 1);

  const driver: HeroDriver = {
    async drive(p, opts = {}) {
      progress = p;
      reduced = opts.reduced ?? env.reducedMotion;
      return driver.wait(opts.frames ?? 8);
    },
    wait(n) {
      return new Promise<number>((resolve) => {
        waiters.push({ until: frameCount + n, resolve });
      });
    },
    frames: () => frameCount,
  };
  const win = window as HarnessWindow;
  win.__heroHarness = driver;
  win.__heroReport = report;
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err);
  check('the harness ran to the end', false, reason);
  root.dataset.harness = `fail:${report.failures.join('; ')}`;
});
