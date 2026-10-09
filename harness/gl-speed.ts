// Harness for the speed section's 3D layer, src/sections/speed/gl.ts (architecture section 10a). The world comes from the
// real createWorld (src/gl/boot.ts). As in gl-hero.ts, boot's choreography is replaced by one with no sections, and the
// speed handle is driven the way the choreography drives it: setActive(true), then update(progress, tick, ctx) every frame.
// Synchronous checks run first and set document.documentElement.dataset.harness. They cover the registration, the race
// entry at u = 0, 0.05, 0.5 and 1 (direction-3d 11.2 and 11.3, the kireji on anticipate), the camera from the hero key to
// the speed key (direction-act1 A7 and D15.1), that the handle makes no depth of field call (D23.12), the breath (held off until u = 1, then T.hold
// later), the hover lift (fine pointer, at rest, footprints without the lift), taps (a tap toggles, a moved tap, a
// cancelled tap and a tap on a control do nothing), reduced motion, the portrait race, setActive(false) and dispose.
// The lift runs along y on a landscape viewport and along x on a portrait one (D22.10), and each check reads the lift
// along its own axis. A tap writes nothing to the shared blocks until update() runs (D22.9).
// Then initPointer runs and window.__speedHarness drives the states that the screenshots show. The screenshot driver is a
// Playwright script kept outside the repository.
import { ef } from '../src/core/ease';
import { env } from '../src/core/env';
import { initPointer, pointer } from '../src/core/pointer';
import { formationRects } from '../src/core/projection';
import { PRIORITY, addTick, initTicker, type Tick } from '../src/core/ticker';
import { T, scrubLocal } from '../src/core/timing';
import { initChoreo } from '../src/choreo/timeline';
import { createWorld } from '../src/gl/boot';
import { BLOCK_COUNT, staggerPosition } from '../src/gl/blocks/formations';
import { FIT, cameraKey } from '../src/gl/rig';
import type { GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { heroGL } from '../src/sections/hero/gl';
import { speedGL } from '../src/sections/speed/gl';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
  /** Environment notices, kept apart from the verdict (see ENVIRONMENT_NOTICE). */
  notices: string[];
}

/** What the screenshot driver calls. drive sets the section progress s and waits for frames rendered after it. */
interface SpeedDriver {
  /** Sets s and waits for frames rendered after it. With snap, resolves with the canvas as a PNG data URL. */
  drive(progress: number, frames?: number, snap?: boolean): Promise<string>;
  /** The centre, in CSS px, of block i's race footprint at the current viewport. */
  centre(i: number): { x: number; y: number };
  frames(): number;
  /**
   * The drawn screen rectangles of the 17 blocks, as the GPU holds them (Blocks.projectRects): minX, minY, maxX, maxY in
   * CSS px for block 0, then block 1, and so on. A lift shows here, so the screenshot driver measures it from this.
   */
  rects(): number[];
}

interface HarnessWindow extends Window {
  __speedHarness?: SpeedDriver;
  __speedReport?: Report;
}

type XY = readonly (readonly [number, number])[];
type Size = { width: number; height: number };

const root = document.documentElement;
const FRAME = 1 / 60;
const EPS = 1e-5;
const LIFT = 0.15;
const TAN11 = Math.tan((11 * Math.PI) / 180);
const report: Report = { passes: [], failures: [], diagnostics: [], notices: [] };

// Headless Chromium's SwiftShader has no KHR_parallel_shader_compile, and it reports GPU stalls on ReadPixels. Both are
// notices of the software GL, not shader messages, so they are kept out of the verdict. Every other warning fails.
const ENVIRONMENT_NOTICE = /KHR_parallel_shader_compile extension not supported|GPU stall due to ReadPixels/;

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

/** The race's x and y (direction-3d 11.3): a row at pitch 0.95, or the turned column on a phone (D15.1). */
function raceXY(portrait: boolean): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    out.push(portrait ? [0, (8 - i) * 0.95] : [(i - 8) * 0.95, 0]);
  }
  return out;
}

/**
 * The expected block positions at race progress u: each block moves from the hero exit pose (the stanza open at 1) to the
 * race, eased by anticipate for the kireji (stagger position 0) and settle for the others (direction-act1 speed, 3D layer).
 */
function entryXY(u: number, size: Size): [number, number][] {
  const portrait = size.width < size.height;
  const shift = portrait ? expectedShift(size) : 0;
  const from = stanzaXY(0.95, 1.13);
  const to = raceXY(portrait);
  const order = staggerPosition('race');
  return from.map(([fx, fy], i): [number, number] => {
    const k = order[i];
    const q = scrubLocal(k, BLOCK_COUNT, u, { total: 0.35, lead: 0.1 });
    const e = k === 0 ? ef.anticipate(q) : ef.settle(q);
    // The portrait start shift decays with the block's own entry (gl.ts header, rule 2).
    return [fx + (to[i][0] - fx) * e + shift * (1 - e), fy + (to[i][1] - fy) * e];
  });
}

/**
 * The speed key's distance and x, from rig.ts (cameraKey, the key the handle must use). The desktop fill and the tablet and
 * phone fits are the rig's (polish pass 1, D15.1, D21.2), so the harness reads them rather than repeating them.
 */
function expectedSpeedZ(size: Size): number {
  return cameraKey('speed', size).position[2];
}

function expectedSpeedX(size: Size): number {
  return cameraKey('speed', size).position[0];
}

/** The phone speed key's x from its definition (D21.2): the column centre at 86% of the width, 0.36 of the width left of centre. */
function phoneSpeedX(size: Size): number {
  return -(0.86 - 0.5) * 2 * expectedSpeedZ(size) * TAN11 * (size.width / size.height);
}

/**
 * The portrait start shift (gl.ts header, rule 2): the leftmost block of the open stanza (-2.85 bu, row B) moves to 6 px left
 * of the column's centre line, seen from the speed camera at its distance in a viewport height px tall.
 */
function expectedShift(size: Size): number {
  const pxPerBu = size.height / (2 * expectedSpeedZ(size) * FIT.tanHalfFov);
  return -6 / pxPerBu + 2.85;
}

/** The 17 start poses of the entry at a viewport: the open stanza, shifted right on a portrait viewport. */
function startXY(size: Size): [number, number][] {
  const shift = size.width < size.height ? expectedShift(size) : 0;
  return stanzaXY(0.95, 1.13).map(([x, y]): [number, number] => [x + shift, y]);
}

/** The hero key's distance and x (direction-3d 10.6): width fit at 0.45 on desktop, 0.84 on a phone; x -0.22 W on desktop. */
function expectedHeroKey(size: Size): { x: number; y: number; z: number } {
  const a = size.width / size.height;
  if (a >= 1) {
    const z = 5.92 / (0.45 * 2 * TAN11 * a);
    return { x: -0.22 * 2 * z * TAN11 * a, y: 0, z };
  }
  return { x: 0, y: -1.1, z: 5.92 / (0.84 * 2 * TAN11 * a) };
}

async function main(): Promise<void> {
  const element = document.getElementById('gl');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the #gl canvas is missing');
  const canvas: HTMLCanvasElement = element;

  // The desktop run forces a fine pointer, so the hover path runs even where the headless browser reports none. Touch
  // is off in that run; the touch checks dispatch their own pointer events. The reduced-motion run is the context that
  // sets env.reducedMotion before boot.
  const isReducedRun = env.reducedMotion;
  env.finePointer = true;
  env.touch = false;

  initTicker();
  const boot = createWorld(canvas);
  await boot.compile();
  const world: GLWorld = boot.world;
  // The harness drives the speed handle directly. Boot's choreography would drive the preloader, whose blocks stay at
  // scale 0 until loader:done, and this harness never emits it. A later initChoreo disposes the earlier one.
  initChoreo(world, []);
  for (let i = 0; i < BLOCK_COUNT; i += 1) world.blocks.setEntrance(i, 1);

  // Depth of field: a spy on the post stack. The choreography sets the focus and bokeh from dof (D22.2), so the handle
  // must make no setDof call at all (D23.12). Every call made while the handle runs is counted.
  let dofCalls = 0;
  const postSetDof = world.post.setDof;
  world.post.setDof = (cfg): void => {
    dofCalls += 1;
    postSetDof(cfg);
  };

  // Writes to the shared blocks, counted. The handle writes them only from update() and setActive() (D22.9).
  const blockWrites = { lift: 0, poses: 0 };
  const realSetLift = world.blocks.setLift.bind(world.blocks);
  world.blocks.setLift = (i: number, dy: number, dz?: number): void => {
    blockWrites.lift += 1;
    realSetLift(i, dy, dz);
  };
  const realSetPoses = world.blocks.setPoses.bind(world.blocks);
  world.blocks.setPoses = (poses): void => {
    blockWrites.poses += 1;
    realSetPoses(poses);
  };

  const tick: Tick = { time: 0, dt: FRAME, frame: 0 };
  let clock = 0;
  /** Advances n frames of the synthetic clock. each runs first, as the choreography's update does, then the shared updates. */
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

  const prev: SectionGL = heroGL;
  const viewport = (): Size => ({ width: window.innerWidth, height: window.innerHeight });
  function contextFor(over: Partial<SectionGLContext> = {}): SectionGLContext {
    const size = viewport();
    return { prev, portrait: size.width < size.height, reducedMotion: false, size, bleed: { p1: 0, p2: 0 }, ...over };
  }

  // The 17 instance matrices, read back as the GPU buffer holds them.
  const matrices = (): Float32Array => world.blocks.mesh.instanceMatrix.array as Float32Array;
  /** Largest error between the instance matrices and the expected x and y, with unit scale and no roll. */
  function matrixError(xy: XY, breathing = false): number {
    const a = matrices();
    let worst = 0;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const o = i * 16;
      const [x, y] = xy[i];
      // While the breath may run, y can be up to its amplitude away from the pose (direction-3d 10.12).
      const dy = Math.abs(a[o + 13] - y);
      const yErr = breathing ? Math.max(0, dy - 0.012) : dy;
      worst = Math.max(worst, Math.abs(a[o + 12] - x), yErr, Math.abs(a[o + 14]));
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
  /** The y of block i in the instance matrices. */
  const yOf = (i: number): number => matrices()[i * 16 + 13];
  const xOf = (i: number): number => matrices()[i * 16 + 12];
  const cameraPos = (): { x: number; y: number; z: number } => {
    const p = world.stage.camera.position;
    return { x: p.x, y: p.y, z: p.z };
  };
  /** The rest footprint centre of block i for a viewport, in CSS px, from P1 without the lift. */
  function centreOf(i: number, size: Size): { x: number; y: number } {
    const rects = formationRects('race', 'speed', size);
    const r = rects[i];
    return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
  }
  /** A pointer event of touch kind, dispatched on the document or on a given target. */
  function touchEvent(type: string, x: number, y: number, id = 7): PointerEvent {
    return new PointerEvent(type, { pointerType: 'touch', pointerId: id, clientX: x, clientY: y, bubbles: true });
  }

  const handleSetup = speedGL.setup;
  if (handleSetup === undefined) throw new Error('speedGL has no setup');

  // Registration.
  check('boot collects speedGL into the world sections (by identity)', boot.sections.includes(speedGL));
  check(
    'speedGL fields: id speed, formation race, key speed, ink 0, dof 31.95 and 1.2, breath 0.012 zero, smear true',
    speedGL.id === 'speed' &&
      speedGL.formation === 'race' &&
      speedGL.key === 'speed' &&
      speedGL.ink === 0 &&
      speedGL.dof !== null &&
      speedGL.dof.focus === 31.95 &&
      speedGL.dof.bokeh === 1.2 &&
      speedGL.breath !== null &&
      speedGL.breath.amplitude === 0.012 &&
      speedGL.breath.phase === 'zero' &&
      speedGL.smear === true &&
      speedGL.exitFormation === undefined,
  );
  const race = staggerPosition('race');
  check(
    'race stagger: kireji first, then 3, 2, 1, 0 and the right side from 16 down to 5',
    race[4] === 0 && race[3] === 1 && race[2] === 2 && race[1] === 3 && race[0] === 4 && race[16] === 5 && race[5] === 16,
  );
  const handle: SectionGLHandle = handleSetup(world);
  check(
    'setup returns a handle with update, setActive and dispose',
    typeof handle.update === 'function' &&
      typeof handle.setActive === 'function' &&
      typeof handle.dispose === 'function',
  );

  if (!isReducedRun) {
    const landscape = viewport().width >= viewport().height;
    const portrait = !landscape;
    const size = viewport();
    handle.setActive(true, contextFor());

    // Entry: the exit pose at u = 0, the race at u = 1, and the scrubbed middle between them.
    handle.update(0, tick, contextFor());
    step(2);
    check(
      portrait
        ? 'entry u = 0 (s = 0): the 17 blocks sit at the open stanza shifted into the right band (portrait, gl.ts header rule 2)'
        : 'entry u = 0 (s = 0): the 17 blocks sit at the hero exit pose (stanza open at 1, pitch 0.95, offsets 1.13)',
      matrixError(startXY(size)) < EPS,
      `max error ${matrixError(startXY(size)).toExponential(2)}`,
    );
    const heroKey = expectedHeroKey(size);
    let cam = cameraPos();
    // Landscape: the camera holds the hero key at u = 0 (A7). Portrait: it is the speed key from s 0 (gl.ts header, rule 1).
    const at0 = portrait ? { x: expectedSpeedX(size), y: 0, z: expectedSpeedZ(size) } : heroKey;
    check(
      portrait
        ? 'camera at u = 0 is the speed key on a portrait viewport (gl.ts header, rule 1)'
        : 'camera at u = 0 holds the hero key (A7, D15.1)',
      Math.abs(cam.z - at0.z) < 1e-3 && Math.abs(cam.x - at0.x) < 1e-3 && Math.abs(cam.y - at0.y) < 1e-3,
      `camera (${cam.x.toFixed(4)}, ${cam.y.toFixed(4)}, ${cam.z.toFixed(4)}), expected (${at0.x.toFixed(4)}, ${at0.y.toFixed(4)}, ${at0.z.toFixed(4)})`,
    );

    handle.update(0.125, tick, contextFor());
    step(2);
    const midErr = matrixError(entryXY(0.5, size));
    check(
      'entry u = 0.5 (s = 0.125): each block sits on its scrubbed settle (anticipate for the kireji), 11.3 and act I speed',
      midErr < EPS,
      `max error ${midErr.toExponential(2)}`,
    );
    cam = cameraPos();
    const speedZ = expectedSpeedZ(size);
    const speedX = expectedSpeedX(size);
    // Landscape: halfway in ef.sym between the hero and speed keys. Portrait: the speed key from s 0 (gl.ts header, rule 1).
    const half = portrait ? { z: speedZ, x: speedX } : { z: (heroKey.z + speedZ) / 2, x: (heroKey.x + speedX) / 2 };
    check(
      portrait
        ? 'camera at u = 0.5 is the speed key on a portrait viewport (gl.ts header, rule 1)'
        : 'camera at u = 0.5 is halfway in ef.sym (sym(0.5) = 0.5) between the hero and speed keys',
      Math.abs(cam.z - half.z) < 1e-3 && Math.abs(cam.x - half.x) < 1e-3,
      `z ${cam.z.toFixed(4)}, expected ${half.z.toFixed(4)}; x ${cam.x.toFixed(4)}, expected ${half.x.toFixed(4)}`,
    );

    // The kireji (stagger position 0) takes anticipate. At u = 0.05 its local progress is 0.5, where anticipate and settle
    // differ by a wide margin, so the check tells them apart.
    handle.update(0.0125, tick, contextFor());
    step(2);
    const q = scrubLocal(0, BLOCK_COUNT, 0.05, { total: 0.35, lead: 0.1 });
    const anticipateGap = Math.abs(ef.anticipate(q) - ef.settle(q));
    check(
      'kireji at u = 0.05 is on anticipate, not settle (their gap at local progress 0.5 is above 0.2)',
      anticipateGap > 0.2 && matrixError(entryXY(0.05, size)) < EPS,
      `anticipate ${ef.anticipate(q).toFixed(4)}, settle ${ef.settle(q).toFixed(4)}, max error ${matrixError(entryXY(0.05, size)).toExponential(2)}`,
    );

    // The race at u = 1 and the hold after it.
    handle.update(0.25, tick, contextFor());
    step(2);
    check(
      'race at u = 1 (s = 0.25): the 17 blocks sit on the race (11.3, turned on a phone)',
      matrixError(raceXY(portrait)) < EPS,
      `max error ${matrixError(raceXY(portrait)).toExponential(2)}`,
    );
    cam = cameraPos();
    check(
      'camera at u = 1 is the speed key from rig.ts (cameraKey: the desktop fill, the tablet fill, or the phone column, D15.1, D21.2)',
      Math.abs(cam.z - speedZ) < 1e-3 && Math.abs(cam.x - expectedSpeedX(size)) < 1e-3 && Math.abs(cam.y) < 1e-3,
      `camera (${cam.x.toFixed(4)}, ${cam.y.toFixed(4)}, ${cam.z.toFixed(4)}), speed (${expectedSpeedX(size).toFixed(4)}, 0, ${speedZ.toFixed(4)})`,
    );
    if (size.width === 1440 && size.height === 900) {
      // The desktop race fill is the rig's FIT.speedDesktopFill (polish pass 1): z = race extent / (fill x 2 tan x aspect).
      const desktopZ = FIT.extent.race / (FIT.speedDesktopFill * 2 * TAN11 * (size.width / size.height));
      check(
        'at 1440 by 900 the speed key is the desktop race fill (FIT.speedDesktopFill)',
        Math.abs(speedZ - desktopZ) < 0.01,
        `z ${speedZ.toFixed(4)}, from the fill ${desktopZ.toFixed(4)}`,
      );
    }
    if (size.width === 375 && size.height === 812) {
      check('at 375 by 812 the speed key is z 51.12 (D15.1)', Math.abs(speedZ - 51.12) < 0.01);
    }

    // The race is a row on a landscape viewport and a column on a phone (D15.1), so each check compares a block with its own
    // race position. The breath is one shared value (every block has phase 0). Block 0 is never lifted in these checks, so
    // its offset from its race position is the breath, and lift(i) is block i's own offset with that breath removed.
    const base = raceXY(portrait);
    const restY = (i: number): number => yOf(i) - base[i][1];
    const restX = (i: number): number => xOf(i) - base[i][0];
    /** Block i's lift along the lift axis: x on a portrait viewport (D22.10), y on a landscape one, breath removed. */
    const lift = (i: number): number => (portrait ? restX(i) : restY(i) - restY(0));
    /** Block i's offset across the lift axis. A lifted block must not drift there (the breath is shared, so it cancels). */
    const across = (i: number): number => (portrait ? restY(i) - restY(0) : restX(i));

    // Breath: held off for T.hold after u reaches 1, then on.
    step(30, () => handle.update(0.25, tick, contextFor()));
    check(
      'breath is off for the first 0.5 s at rest (it starts T.hold after u = 1)',
      Math.abs(restY(0)) < 1e-6,
      `breath offset ${restY(0).toExponential(2)}`,
    );
    let maxBreath = 0;
    let worstBreath = 0;
    step(180, () => {
      handle.update(0.25, tick, contextFor());
      maxBreath = Math.max(maxBreath, Math.abs(restY(0)));
      worstBreath = Math.max(worstBreath, Math.abs(restY(0)));
    });
    check(
      'breath is on after T.hold: it reaches a few thousandths and never passes 0.012 bu',
      maxBreath > 0.008 && worstBreath <= 0.012 + 1e-6,
      `max ${maxBreath.toFixed(5)}, largest ${worstBreath.toFixed(5)}, T.hold ${T.hold}`,
    );

    // Hover: the block under a fine pointer lifts 0.15 bu on y (along the column on a phone, where the race is vertical).
    pointer.type = 'mouse';
    pointer.inside = true;
    const c8 = centreOf(8, size);
    pointer.clientX = c8.x;
    pointer.clientY = c8.y;
    step(240, () => handle.update(0.25, tick, contextFor()));
    check(
      'hover: the block under the pointer (8) lifts 0.15 bu, and no other block does',
      Math.abs(lift(8) - LIFT) < 1e-3 && Math.abs(lift(9)) < 1e-3 && Math.abs(lift(7)) < 1e-3,
      `lift 8 ${lift(8).toFixed(5)}, lift 9 ${lift(9).toFixed(5)}, lift 7 ${lift(7).toFixed(5)}`,
    );
    // The hit test uses the rest footprint, so the pointer near the bottom edge keeps the lift (no flicker at the edge).
    const rect8 = formationRects('race', 'speed', size)[8];
    pointer.clientY = rect8.y1 - 3;
    step(120, () => handle.update(0.25, tick, contextFor()));
    check(
      'hover: a pointer on the lower edge of the rest footprint keeps the lift (the hit test ignores the lift)',
      Math.abs(lift(8) - LIFT) < 1e-3,
      `lift 8 ${lift(8).toFixed(5)}`,
    );
    pointer.clientY = rect8.y0 - 3;
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('hover: a pointer just above the footprint lifts nothing', Math.abs(lift(8)) < 1e-3, `lift 8 ${lift(8).toFixed(5)}`);
    const c9 = centreOf(9, size);
    pointer.clientX = c9.x;
    pointer.clientY = c9.y;
    step(240, () => handle.update(0.25, tick, contextFor()));
    check(
      'hover moves to the next block: 9 lifts, 8 falls back',
      Math.abs(lift(9) - LIFT) < 1e-3 && Math.abs(lift(8)) < 1e-3,
      `lift 9 ${lift(9).toFixed(5)}, lift 8 ${lift(8).toFixed(5)}`,
    );
    pointer.inside = false;
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('hover ends when the pointer leaves the page', Math.abs(lift(9)) < 1e-3, `lift 9 ${lift(9).toFixed(5)}`);

    // Touch (D22.10): a tap lifts its block, a second tap on the same block lowers it, and a tap on another block moves the
    // lift there. Moved taps, cancelled taps and taps on a control do nothing.
    const c3 = centreOf(3, size);
    const writesBefore = blockWrites.lift + blockWrites.poses;
    document.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointerup', c3.x, c3.y));
    const writesAfterTap = blockWrites.lift + blockWrites.poses;
    handle.update(0.25, tick, contextFor());
    const writesAfterUpdate = blockWrites.lift + blockWrites.poses;
    check(
      'a tap writes nothing to the shared blocks until update() runs, and update() writes them (D22.9)',
      writesAfterTap === writesBefore && writesAfterUpdate > writesAfterTap,
      `writes before ${writesBefore}, after the tap ${writesAfterTap}, after update ${writesAfterUpdate}`,
    );
    step(240, () => handle.update(0.25, tick, contextFor()));
    check(
      'touch: a tap lifts block 3 by 0.15 bu along the lift axis, no neighbour does, and nothing drifts across it',
      Math.abs(lift(3) - LIFT) < 1e-3 && Math.abs(lift(4)) < 1e-3 && Math.abs(lift(2)) < 1e-3 && Math.abs(across(3)) < 1e-3,
      `lift 3 ${lift(3).toFixed(5)}, lift 4 ${lift(4).toFixed(5)}, lift 2 ${lift(2).toFixed(5)}, across 3 ${across(3).toFixed(5)}`,
    );
    document.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointerup', c3.x, c3.y));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('touch: a second tap on the same block lowers it', Math.abs(lift(3)) < 1e-3, `lift 3 ${lift(3).toFixed(5)}`);
    // A tap on another block moves the lift: 3 is lifted, a tap on 9 drops 3 and lifts 9, and a tap on 9 drops it.
    document.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointerup', c3.x, c3.y));
    step(240, () => handle.update(0.25, tick, contextFor()));
    document.dispatchEvent(touchEvent('pointerdown', c9.x, c9.y));
    document.dispatchEvent(touchEvent('pointerup', c9.x, c9.y));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check(
      'touch: a tap on another block moves the lift (3 drops, 9 lifts)',
      Math.abs(lift(9) - LIFT) < 1e-3 && Math.abs(lift(3)) < 1e-3,
      `lift 9 ${lift(9).toFixed(5)}, lift 3 ${lift(3).toFixed(5)}`,
    );
    document.dispatchEvent(touchEvent('pointerdown', c9.x, c9.y));
    document.dispatchEvent(touchEvent('pointerup', c9.x, c9.y));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('touch: a tap on the lifted block 9 drops it', Math.abs(lift(9)) < 1e-3, `lift 9 ${lift(9).toFixed(5)}`);
    document.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointerup', c3.x + 40, c3.y + 40));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('touch: a moved touch (a scroll) lifts nothing', Math.abs(lift(3)) < 1e-3, `lift 3 ${lift(3).toFixed(5)}`);
    document.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointercancel', c3.x, c3.y));
    document.dispatchEvent(touchEvent('pointerup', c3.x, c3.y));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('touch: a cancelled touch lifts nothing', Math.abs(lift(3)) < 1e-3, `lift 3 ${lift(3).toFixed(5)}`);
    const control = document.createElement('button');
    control.textContent = 'control';
    document.body.appendChild(control);
    control.dispatchEvent(touchEvent('pointerdown', c3.x, c3.y));
    control.dispatchEvent(touchEvent('pointerup', c3.x, c3.y));
    control.remove();
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('touch: a tap that starts on a control lifts nothing', Math.abs(lift(3)) < 1e-3, `lift 3 ${lift(3).toFixed(5)}`);
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', pointerId: 2, clientX: c3.x, clientY: c3.y, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', pointerId: 2, clientX: c3.x, clientY: c3.y, bubbles: true }));
    step(240, () => handle.update(0.25, tick, contextFor()));
    check('mouse clicks lift nothing (taps are touch only)', Math.abs(lift(3)) < 1e-3, `lift 3 ${lift(3).toFixed(5)}`);

    // Portrait: the race is a column (D15.1), and the depth of field follows the phone key.
    handle.update(0.25, tick, contextFor({ portrait: true, size: { width: 375, height: 812 } }));
    step(2);
    const phoneZ = expectedSpeedZ({ width: 375, height: 812 });
    cam = cameraPos();
    check(
      'portrait race is a column: x 0 and y (8 - k) x 0.95, and the camera is at z 51.12 (D15.1)',
      matrixError(raceXY(true), true) < EPS && Math.abs(cam.z - phoneZ) < 1e-3,
      `max error ${matrixError(raceXY(true), true).toExponential(2)}, camera z ${cam.z.toFixed(4)}`,
    );
    handle.update(0.25, tick, contextFor());
    step(2);

    // Portrait entry (gl.ts header). For each phone size: the phone key puts the column centre at 86% of the width (D21.2), the
    // camera is the speed key at every u of the entry, and no block's centre passes left of 6 px from the column's centre line,
    // so every block stays right of the copy band (the column's left edge less 12 px, D21.2). Swept from s 0 to s 0.25.
    for (const [w, h] of [
      [375, 812],
      [768, 1024],
    ] as const) {
      const phone: Size = { width: w, height: h };
      const ctxPhone = contextFor({ portrait: true, size: phone });
      const limit = -6 / (h / (2 * expectedSpeedZ(phone) * FIT.tanHalfFov));
      let worstX = Number.POSITIVE_INFINITY;
      let camErr = 0;
      for (let k = 0; k <= 40; k += 1) {
        handle.update((k / 40) * 0.25, tick, ctxPhone);
        step(2);
        for (let i = 0; i < BLOCK_COUNT; i += 1) worstX = Math.min(worstX, xOf(i));
        const c = cameraPos();
        camErr = Math.max(
          camErr,
          Math.abs(c.z - expectedSpeedZ(phone)),
          Math.abs(c.x - expectedSpeedX(phone)),
          Math.abs(c.y),
        );
      }
      const keyMatchesD21 = Math.abs(expectedSpeedX(phone) - phoneSpeedX(phone)) < 1e-6;
      check(
        `portrait ${w} by ${h}: the speed key is the 86 percent column (D21.2), the camera holds it for s 0 to 0.25, and every block centre stays at or right of the band (x >= ${limit.toFixed(3)} bu)`,
        keyMatchesD21 && camErr < 1e-3 && worstX >= limit - 1e-6,
        `worst block x ${worstX.toFixed(4)} bu, limit ${limit.toFixed(4)}, camera error ${camErr.toExponential(2)}`,
      );
    }

    // Reduced motion, given through the context: the race is complete at once, with no breath and no lifts.
    handle.update(0, tick, contextFor({ reducedMotion: true }));
    step(2);
    check(
      'reduced motion: the race is set at once whatever the progress (u = 1)',
      matrixError(raceXY(portrait), true) < EPS,
      `max error ${matrixError(raceXY(portrait), true).toExponential(2)}`,
    );
    pointer.inside = true;
    pointer.clientX = c8.x;
    pointer.clientY = c8.y;
    step(240, () => handle.update(0.25, tick, contextFor({ reducedMotion: true })));
    const c3rm = centreOf(3, size);
    document.dispatchEvent(touchEvent('pointerdown', c3rm.x, c3rm.y));
    document.dispatchEvent(touchEvent('pointerup', c3rm.x, c3rm.y));
    step(240, () => handle.update(0.25, tick, contextFor({ reducedMotion: true })));
    check(
      'reduced motion: no hover lift, no tap lift and no breath',
      Math.abs(lift(8)) < 1e-5 && Math.abs(lift(3)) < 1e-5 && Math.abs(restY(0)) < 1e-5,
      `lift 8 ${lift(8).toExponential(2)}, lift 3 ${lift(3).toExponential(2)}, breath ${restY(0).toExponential(2)}`,
    );
    pointer.inside = false;

    // setActive(false) tidies: the lift falls back to 0, the tilt and group offset are 0, and the breath stops. A
    // deactivated handle changes no matrix.
    handle.update(0.25, tick, contextFor());
    pointer.inside = true;
    pointer.clientX = c8.x;
    pointer.clientY = c8.y;
    step(240, () => handle.update(0.25, tick, contextFor()));
    handle.setActive(false, contextFor());
    step(600);
    const before = Float32Array.from(matrices());
    handle.update(0.5, tick, contextFor());
    step(2);
    let unchanged = true;
    const after = matrices();
    for (let k = 0; k < before.length; k += 1) if (before[k] !== after[k]) unchanged = false;
    check(
      'setActive(false) tidies: lifts 0, group tilt and offset 0, breath stopped, and an inactive handle writes nothing',
      Math.abs(lift(8)) < 1e-4 &&
        Math.abs(restY(0)) < 1e-4 &&
        Math.abs(world.blocks.group.rotation.x) < 1e-6 &&
        Math.abs(world.blocks.group.rotation.y) < 1e-6 &&
        Math.abs(world.blocks.group.position.x) < 1e-6 &&
        Math.abs(world.blocks.group.position.y) < 1e-6 &&
        unchanged,
      `lift 8 ${lift(8).toExponential(2)}, breath ${restY(0).toExponential(2)}, unchanged ${unchanged}`,
    );
    pointer.inside = false;

    // Dispose: the three document listeners the handle adds are removed, and a disposed handle changes nothing.
    type Listen = (type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => void;
    const added: [string, EventListenerOrEventListenerObject][] = [];
    const removed: [string, EventListenerOrEventListenerObject][] = [];
    const nativeAdd = document.addEventListener;
    const nativeRemove = document.removeEventListener;
    const spyAdd: Listen = (type, fn, opts) => {
      added.push([type, fn]);
      (nativeAdd as unknown as Listen).call(document, type, fn, opts);
    };
    const spyRemove: Listen = (type, fn, opts) => {
      removed.push([type, fn]);
      (nativeRemove as unknown as Listen).call(document, type, fn, opts);
    };
    document.addEventListener = spyAdd as unknown as typeof document.addEventListener;
    document.removeEventListener = spyRemove as unknown as typeof document.removeEventListener;
    const second = handleSetup(world);
    second.setActive(true, contextFor());
    second.update(0.25, tick, contextFor());
    step(2);
    second.dispose();
    document.addEventListener = nativeAdd;
    document.removeEventListener = nativeRemove;
    const everyRemoved = added.length === 3 && added.every(([type, fn]) => removed.some(([t, f]) => t === type && f === fn));
    check('dispose removes the three document listeners it added', everyRemoved, `added ${added.length}, removed ${removed.length}`);
    step(600);
    const beforeDisposed = Float32Array.from(matrices());
    second.update(0.25, tick, contextFor());
    second.setActive(true, contextFor());
    step(2);
    const afterDisposed = matrices();
    let disposedUnchanged = true;
    for (let k = 0; k < beforeDisposed.length; k += 1) if (beforeDisposed[k] !== afterDisposed[k]) disposedUnchanged = false;
    check('a disposed handle changes no matrix and ignores setActive', disposedUnchanged);
  } else {
    // Reduced-motion run: the race is complete at once at any progress, with no breath, lifts or taps.
    handle.setActive(true, contextFor({ reducedMotion: true }));
    const size = viewport();
    const portrait = size.width < size.height;
    handle.update(0, tick, contextFor({ reducedMotion: true }));
    step(2);
    check(
      'reduced run: at progress 0 the race is already set (u = 1)',
      matrixError(raceXY(portrait)) < EPS,
      `max error ${matrixError(raceXY(portrait)).toExponential(2)}`,
    );
    const speedZ = expectedSpeedZ(size);
    check(
      'reduced run: the camera is the speed key at once',
      Math.abs(cameraPos().z - speedZ) < 1e-3,
      `z ${cameraPos().z.toFixed(4)}, speed ${speedZ.toFixed(4)}`,
    );
    handle.update(0.25, tick, contextFor({ reducedMotion: true }));
    step(240, () => handle.update(0.25, tick, contextFor({ reducedMotion: true })));
    check('reduced run: no breath after the hold', Math.abs(yOf(0) - raceXY(portrait)[0][1]) < 1e-6, `y0 ${yOf(0)}`);
  }

  // Both runs: the handle leaves the depth of field to the choreography (D22.2, D23.12).
  check(
    'the speed handle makes no post.setDof call in any state (the choreography sets the focus from dof)',
    dofCalls === 0,
    `setDof calls ${dofCalls}`,
  );

  const problems = [...report.failures, ...report.diagnostics];
  root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;
  (window as HarnessWindow).__speedReport = report;

  // Live driving for the screenshots. The handle runs at PRIORITY.scroll, as the choreography runs it, and frames are
  // counted after the render (PRIORITY.glRender + 1), so a driven state is on screen once its frames have passed.
  handle.setActive(true, contextFor());
  initPointer();
  const live: SectionGLContext = contextFor();
  let progress = 0;
  let frameCount = 0;
  const waiters: { until: number; snap: boolean; resolve: (png: string) => void }[] = [];
  addTick((t) => {
    const now = viewport();
    live.size = now;
    live.portrait = now.width < now.height;
    live.reducedMotion = env.reducedMotion;
    handle.update(progress, t, live);
  }, PRIORITY.scroll);
  addTick(() => {
    frameCount += 1;
    // This runs in the task that rendered the frame, so the canvas is read while its drawing buffer still holds it.
    let png: string | null = null;
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const waiter = waiters[i];
      if (waiter.until > frameCount) continue;
      waiters.splice(i, 1);
      if (waiter.snap && png === null) png = canvas.toDataURL('image/png');
      waiter.resolve(waiter.snap ? (png ?? '') : '');
    }
  }, PRIORITY.glRender + 1);

  const drawn = new Float32Array(BLOCK_COUNT * 4);
  const driver: SpeedDriver = {
    drive(p: number, frames = 60, snap = false): Promise<string> {
      progress = p;
      return new Promise<string>((resolve) => {
        waiters.push({ until: frameCount + frames, snap, resolve });
      });
    },
    centre(i: number): { x: number; y: number } {
      return centreOf(i, viewport());
    },
    frames: (): number => frameCount,
    rects(): number[] {
      world.blocks.projectRects(world.stage.camera, viewport(), drawn);
      return Array.from(drawn);
    },
  };
  (window as HarnessWindow).__speedHarness = driver;
}

main().catch((err: unknown) => {
  root.dataset.harness = `fail:${String(err)}`;
  console.error(err);
});
