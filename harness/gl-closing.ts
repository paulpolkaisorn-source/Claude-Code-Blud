// Harness for the closing section's 3D layer (src/sections/closing/gl.ts; architecture section 10a). The world is the
// page's own (createWorld from src/gl/boot.ts). Two modes, chosen by the ?mode= query:
//   direct (default): the closing handle is driven here, as the choreography drives it, with the pricing SectionGL as the
//     previous section. The checks cover the write from the rest formation to the column (poses, write order, camera
//     blend, far plane), the held state, the travelling wave and, under reduced motion, the 80 % rule.
//   page: the page choreography (src/choreo/timeline.ts) runs over the page's section ids and heights, with the real
//     pricing and closing handles, and the document is scrolled. It checks the write while pricing is still the current
//     section. Pricing then writes its rest formation and camera every frame, and the closing handle must hold.
// The verdict goes to document.documentElement.dataset.harness ('pass' or 'fail:<count>') once the checks finish.
// window.__closing then drives the screenshot states for the Playwright run.
import * as THREE from 'three';
import { closingGL } from '../src/sections/closing/gl';
import { pricingGL } from '../src/sections/pricing/gl';
import { createWorld } from '../src/gl/boot';
import { env } from '../src/core/env';
import { ef } from '../src/core/ease';
import { PRIORITY, addTick, initTicker, tickerTime, type Tick } from '../src/core/ticker';
import { T, scrubLocal } from '../src/core/timing';
import { scrollState } from '../src/core/scroll';
import { initChoreo } from '../src/choreo/timeline';
import { cameraKey } from '../src/gl/rig';
import { BLOCK_COUNT, formationFor, lerpPose, type Pose } from '../src/gl/blocks/formations';
import type { CameraKey, GLWorld, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
}

interface ClosingControls {
  mode: 'direct' | 'page';
  /** Direct mode: sets the entry progress w, as the choreography would, and draws three frames. */
  set(w: number): Promise<void>;
  /** Direct mode: starts (true) or stops (false) the travelling wave, as the choreography does at a commit. */
  wave(on: boolean): void;
  /** Page mode: scrolls so that the closing top sits at topVh viewport heights. */
  scrollTo(topVh: number): void;
  /** Resolves after n frames have been drawn. */
  frames(n: number): Promise<void>;
}

interface ClosingWindow extends Window {
  __closing?: ClosingControls;
}

interface PoseError {
  xz: number;
  y: number;
  s: number;
}

type Blocks = GLWorld['blocks'];

// SwiftShader notices that are environment noise, not defects: the GPU stall on ReadPixels, and the missing
// KHR_parallel_shader_compile extension that WebGLRenderer.compileAsync reports.
const ENVIRONMENT_NOTICES = ['GPU stall due to ReadPixels', 'KHR_parallel_shader_compile extension not supported'];
/** Pose tolerance in bu for the xz position and the block scale. */
const POSE_TOL = 1e-4;
/** Height tolerance in bu when no breath runs. */
const Y_TOL = 1e-4;
/** Height tolerance in bu while a breath of 0.010 bu runs on the blocks (page mode: pricing's rest breath, or the wave). */
const Y_TOL_BREATH = 0.0105;
const CAMERA_TOL = 1e-3;
/** The column's block scale, 0.22 / 0.70 (direction-3d 11.10). */
const COLUMN_SCALE = 0.22 / 0.7;
/** Local progress of the write (direction-act3 Sequence 1). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** Entrance span of the closing (direction-act3 C3). */
const CLOSING_SPAN = 0.6;

const root = document.documentElement;
const report: Report = { passes: [], failures: [], diagnostics: [] };

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

// Errors and warnings are recorded as well as shown, so the verdict counts them. The SwiftShader notices are not counted.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    const text = args.map((a) => String(a)).join(' ');
    if (!ENVIRONMENT_NOTICES.some((n) => text.includes(n))) report.diagnostics.push(`${level}: ${text}`);
    original(...args);
  };
}
window.addEventListener('error', (e: ErrorEvent) => {
  report.diagnostics.push(`uncaught: ${e.message}`);
});

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** Resolves after n page-clock ticks, once the frame for each has been drawn (after PRIORITY.glRender). */
function framesN(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const remove = addTick(() => {
      seen += 1;
      if (seen >= n) {
        remove();
        resolve();
      }
    }, PRIORITY.glRender + 2);
  });
}

const scratchMatrix = new THREE.Matrix4();

/** Position and scale of block i, as the last update drew it. */
function blockAt(blocks: Blocks, i: number): { x: number; y: number; z: number; s: number } {
  blocks.mesh.getMatrixAt(i, scratchMatrix);
  const e = scratchMatrix.elements;
  return { x: e[12], y: e[13], z: e[14], s: e[0] };
}

/** The largest gap between the 17 blocks and a target formation. */
function poseError(blocks: Blocks, target: readonly Pose[]): PoseError {
  let xz = 0;
  let y = 0;
  let s = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const got = blockAt(blocks, i);
    const want = target[i];
    xz = Math.max(xz, Math.abs(got.x - want.p[0]), Math.abs(got.z - want.p[2]));
    y = Math.max(y, Math.abs(got.y - want.p[1]));
    s = Math.max(s, Math.abs(got.s - want.s));
  }
  return { xz, y, s };
}

function fits(err: PoseError, yTol: number): boolean {
  return err.xz <= POSE_TOL && err.s <= POSE_TOL && err.y <= yTol;
}

function errorText(err: PoseError): string {
  return `xz=${err.xz.toExponential(2)} y=${err.y.toExponential(2)} s=${err.s.toExponential(2)}`;
}

function cameraError(camera: THREE.PerspectiveCamera, key: CameraKey): number {
  const p = camera.position;
  return Math.max(
    Math.abs(p.x - key.position[0]),
    Math.abs(p.y - key.position[1]),
    Math.abs(p.z - key.position[2]),
  );
}

/** The camera position at entry progress w: the pricing key to the closing key through ef.sym(w), as rig.blend does. */
function camAt(w: number, size: { width: number; height: number }): CameraKey {
  const a = cameraKey('pricing', size);
  const b = cameraKey('closing', size);
  const k = ef.sym(w);
  const lerp = (i: 0 | 1 | 2): number => a.position[i] + (b.position[i] - a.position[i]) * k;
  return { position: [lerp(0), lerp(1), lerp(2)], target: [0, 0, 0], fov: a.fov };
}

/**
 * The pose each block should hold at entry progress w: the write of direction-act3 Sequence 1, from the rest formation
 * to the column, with block i on scrubLocal(i, 17, w, { total 0.35, lead 0.10 }) and settle.
 */
function expectedAt(w: number, portrait: boolean): Pose[] {
  const from = formationFor('rest', portrait);
  const to = formationFor('column', portrait);
  return Array.from({ length: BLOCK_COUNT }, (_, i) => {
    const local = scrubLocal(i, BLOCK_COUNT, w, SCRUB);
    return lerpPose(from[i], to[i], ef.settle(local), { p: [0, 0, 0], r: [0, 0, 0], s: 1 });
  });
}

/**
 * Drives blocks.update with synthetic ticks at 60 Hz, so the wave does not depend on the browser's frame rate (the
 * software renderer here runs at under 1 fps). The breath must hold still until T.hold after the request, then swing
 * (direction-3d 10.12). Returns the height range of block 0 before the hold, and of blocks 0 and 16 over one cycle after it.
 */
function waveSamples(blocks: Blocks): { early: number; range0: number; range16: number } {
  const base = 100;
  const step = 1 / 60;
  const holdEnd = base + T.hold;
  const sampleFrom = holdEnd + 3 * T.half;
  const sampleTo = sampleFrom + T.breath;
  let eLo = Infinity;
  let eHi = -Infinity;
  let lo0 = Infinity;
  let hi0 = -Infinity;
  let lo16 = Infinity;
  let hi16 = -Infinity;
  const steps = Math.round((sampleTo - base) / step);
  for (let k = 0; k <= steps; k += 1) {
    const now = base + k * step;
    blocks.update({ time: now, dt: k === 0 ? 0 : step, frame: k });
    const y0 = blockAt(blocks, 0).y;
    const y16 = blockAt(blocks, 16).y;
    if (now < holdEnd - step) {
      eLo = Math.min(eLo, y0);
      eHi = Math.max(eHi, y0);
    }
    if (now >= sampleFrom) {
      lo0 = Math.min(lo0, y0);
      hi0 = Math.max(hi0, y0);
      lo16 = Math.min(lo16, y16);
      hi16 = Math.max(hi16, y16);
    }
  }
  return { early: eHi - eLo, range0: hi0 - lo0, range16: hi16 - lo16 };
}

/** Direct mode: the closing handle alone, driven as the choreography drives it. */
function startDirect(world: GLWorld): { controls: ClosingControls; run: () => Promise<void> } {
  const { stage, blocks, lighting, background, post, rig } = world;
  const camera = stage.camera;
  // The page choreography that boot started is replaced by an empty list, before any frame can run it.
  initChoreo(world, []).dispose();
  const setup = closingGL.setup;
  if (setup === undefined) throw new Error('closingGL has no setup');
  const handle: SectionGLHandle = setup(world);

  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });
  const portraitNow = (): boolean => stage.size.width < stage.size.height;
  const ctx = (): SectionGLContext => ({
    prev: pricingGL,
    portrait: portraitNow(),
    reducedMotion: env.reducedMotion,
    size: size(),
  });
  const tick = (): Tick => ({ time: tickerTime(), dt: 1 / 60, frame: 0 });
  const setW = (w: number): void => handle.update(w, tick(), ctx());

  // A stand-in for pricing's handle while it is current: pricing writes its rest formation and pricing camera each frame.
  let rivalOn = false;
  addTick(() => {
    if (!rivalOn) return;
    const s = size();
    blocks.setPoses(formationFor('rest', portraitNow()));
    rig.blend(cameraKey('pricing', s), cameraKey('pricing', s), 1);
  }, PRIORITY.state + 5);

  const controls: ClosingControls = {
    mode: 'direct',
    async set(w: number): Promise<void> {
      setW(w);
      await framesN(2);
    },
    wave(on: boolean): void {
      blocks.setBreath(on ? closingGL.breath : null);
    },
    scrollTo(): void {
      throw new Error('scrollTo is a page-mode control');
    },
    frames: framesN,
  };

  async function run(): Promise<void> {
    blocks.setMix(0);
    lighting.setMix(0);
    post.setMix(0);
    post.setDof(null);
    background.setBleed(null);
    background.setTheme('paper');

    const portrait = portraitNow();
    const far = portrait ? 120 : 80;
    const rest = formationFor('rest', portrait);
    const column = formationFor('column', portrait);
    const pricingKey = (): CameraKey => cameraKey('pricing', size());
    const closingKey = (): CameraKey => cameraKey('closing', size());

    check(
      'closingGL carries id closing, formation column, key closing, ink 0, dof null and breath 0.010 wave',
      closingGL.id === 'closing' &&
        closingGL.formation === 'column' &&
        closingGL.key === 'closing' &&
        closingGL.ink === 0 &&
        closingGL.dof === null &&
        closingGL.breath !== null &&
        closingGL.breath.amplitude === 0.01 &&
        closingGL.breath.phase === 'wave',
    );
    check('the handle exposes update, setActive and dispose', typeof handle.update === 'function' && typeof handle.setActive === 'function' && typeof handle.dispose === 'function');

    handle.setActive(true, ctx());

    if (!env.reducedMotion) {
      // Entry start, w 0: the rest formation and the pricing key.
      setW(0);
      await framesN(2);
      const e0 = poseError(blocks, rest);
      check('entry start (w 0): the blocks hold the rest formation', fits(e0, Y_TOL), errorText(e0));
      check(
        'entry start: the camera holds the pricing key',
        cameraError(camera, pricingKey()) <= CAMERA_TOL,
        `err=${cameraError(camera, pricingKey()).toFixed(5)}`,
      );

      // Mid-entry, w 0.5: every block at its written pose, and the camera halfway between the two keys (sym(0.5) = 0.5).
      setW(0.5);
      await framesN(2);
      const e5 = poseError(blocks, expectedAt(0.5, portrait));
      check('mid-entry (w 0.5): every block at its written pose', fits(e5, Y_TOL), errorText(e5));
      check(
        'mid-entry: the camera is the sym blend of the pricing and closing keys',
        cameraError(camera, camAt(0.5, size())) <= CAMERA_TOL,
        `err=${cameraError(camera, camAt(0.5, size())).toFixed(5)}`,
      );

      // Write order, w 0.3: the column is written from index 0 down to index 16, and no block leads (direction-act3 C4).
      setW(0.3);
      await framesN(2);
      const shares: number[] = [];
      for (let i = 0; i < BLOCK_COUNT; i += 1) {
        const y = blockAt(blocks, i).y;
        shares.push((y - rest[i].p[1]) / (column[i].p[1] - rest[i].p[1]));
      }
      let ordered = true;
      for (let i = 0; i + 1 < BLOCK_COUNT; i += 1) {
        if (shares[i] < shares[i + 1] - 1e-6) ordered = false;
      }
      check(
        'write order (w 0.3): block 0 has arrived, block 16 has not, and the travel falls from index 0 to 16',
        shares[0] > 0.999 && shares[16] < 0.001 && ordered,
        `share0=${shares[0].toFixed(4)} share16=${shares[16].toFixed(4)}`,
      );
      check(
        'no lead (w 0.3): the kireji (index 4) has travelled less than block 0',
        shares[4] < shares[0],
        `share4=${shares[4].toFixed(4)} share0=${shares[0].toFixed(4)}`,
      );

      // Column, w 1: the 17 blocks stand in the column with index 0 at the top, and the closing key.
      setW(1);
      await framesN(2);
      const e1 = poseError(blocks, column);
      check('column (w 1): the 17 blocks stand in the column, scale 0.22 / 0.70', fits(e1, Y_TOL) && Math.abs(blockAt(blocks, 4).s - COLUMN_SCALE) < POSE_TOL, errorText(e1));
      check(
        'column: the camera holds the closing key',
        cameraError(camera, closingKey()) <= CAMERA_TOL,
        `err=${cameraError(camera, closingKey()).toFixed(5)}`,
      );
      check(`far plane is ${far} for this viewport (direction-act3 C8)`, camera.far === far, `far=${camera.far}`);

      // Held: the handle is not current, and another section writes the rest formation and the pricing camera every frame.
      handle.setActive(false, ctx());
      rivalOn = true;
      await framesN(3);
      rivalOn = false;
      const eh = poseError(blocks, column);
      check(
        'held (not current, w 1): the column survives a frame that writes the rest formation and the pricing camera',
        fits(eh, Y_TOL) && cameraError(camera, closingKey()) <= CAMERA_TOL,
        errorText(eh),
      );
      handle.setActive(true, ctx());
      await framesN(2);

      // Wave: the breath is requested at the commit, holds still for T.hold, then swings about 0.010 bu either side of the column.
      blocks.setBreath(closingGL.breath);
      const wave = waveSamples(blocks);
      check(
        'wave: the column holds still for T.hold after the request, then blocks 0 and 16 swing 0.012 to 0.0205 bu peak to peak',
        wave.early < 1e-6 && wave.range0 >= 0.012 && wave.range0 <= 0.0205 && wave.range16 >= 0.012 && wave.range16 <= 0.0205,
        `early=${wave.early.toExponential(2)} range0=${wave.range0.toFixed(5)} range16=${wave.range16.toFixed(5)}`,
      );
      blocks.setBreath(null);
      await framesN(2);
    } else {
      // Reduced motion: the closing state is set at once when the section top crosses 80 % of the viewport (w 1/3).
      setW(0.2);
      await framesN(2);
      const r2 = poseError(blocks, rest);
      check('reduced (w 0.2, top above 80 %): the blocks hold the rest formation', fits(r2, Y_TOL), errorText(r2));
      setW(0.4);
      await framesN(2);
      const r4 = poseError(blocks, column);
      check(
        'reduced (w 0.4, top below 80 %): the column and the closing camera are set at once',
        fits(r4, Y_TOL) && cameraError(camera, closingKey()) <= CAMERA_TOL,
        errorText(r4),
      );
      check(`reduced: far plane is ${far}`, camera.far === far, `far=${camera.far}`);
      blocks.setBreath(closingGL.breath);
      const quiet = waveSamples(blocks);
      check(
        'reduced: no wave (the breath is zero under reduced motion)',
        quiet.early < 1e-6 && quiet.range0 < 1e-6 && quiet.range16 < 1e-6,
        `range0=${quiet.range0.toExponential(2)} range16=${quiet.range16.toExponential(2)}`,
      );
      blocks.setBreath(null);
      await framesN(2);
    }
    handle.setActive(true, ctx());
    setW(1);
    await framesN(2);
  }

  return { controls, run };
}

/** Page mode: the page choreography runs over the two real handles, and the document is scrolled. */
function startPage(world: GLWorld): { controls: ClosingControls; run: () => Promise<void> } {
  const { stage, blocks } = world;
  const camera = stage.camera;
  initChoreo(world, [pricingGL, closingGL]);
  // The choreography reads scrollState.y. initScroll is not started here, so the scroll position is copied each tick.
  addTick(() => {
    scrollState.y = window.scrollY;
    scrollState.velocity = 0;
  }, PRIORITY.scroll);

  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });
  const portraitNow = (): boolean => stage.size.width < stage.size.height;
  const closingTop = (): number => {
    const el = document.getElementById('closing');
    if (el === null) throw new Error('#closing is missing');
    return el.getBoundingClientRect().top + window.scrollY;
  };
  const scrollTo = (topVh: number): void => {
    window.scrollTo(0, closingTop() - topVh * window.innerHeight);
  };

  const controls: ClosingControls = {
    mode: 'page',
    set(): Promise<void> {
      return Promise.reject(new Error('set is a direct-mode control'));
    },
    wave(): void {
      throw new Error('wave is a direct-mode control');
    },
    scrollTo,
    frames: framesN,
  };

  async function run(): Promise<void> {
    const portrait = portraitNow();
    const far = portrait ? 120 : 80;
    const column = formationFor('column', portrait);
    const pricingKey = (): CameraKey => cameraKey('pricing', size());
    const closingKey = (): CameraKey => cameraKey('closing', size());
    // The progress from the live scroll position. Scroll positions are whole device pixels, so a nominal topVh can be off by a fraction of a pixel.
    const wNow = (): number => clamp01((1 - (closingTop() - window.scrollY) / window.innerHeight) / CLOSING_SPAN);
    const detail = (w: number): string => `w=${w.toFixed(5)}`;

    // Pricing is current here: its rest formation sits at w_p 1, and its breath (0.010 bu, phase zero) runs on the blocks.
    scrollTo(1);
    await framesN(3);
    const w1 = wNow();
    const p1 = poseError(blocks, expectedAt(w1, portrait));
    check('page: topVh 1 (w 0), pricing current: the blocks hold the rest formation', fits(p1, Y_TOL_BREATH), `${detail(w1)} ${errorText(p1)}`);
    check(
      'page: topVh 1: the camera holds the pricing key',
      cameraError(camera, pricingKey()) <= CAMERA_TOL,
      `err=${cameraError(camera, pricingKey()).toFixed(5)}`,
    );

    // The key case: the scroll stops mid-entry while pricing is current. Pricing writes its rest formation every frame.
    scrollTo(0.7);
    await framesN(3);
    const wm = wNow();
    const m = poseError(blocks, expectedAt(wm, portrait));
    check('page: topVh 0.7 (w 0.5), scroll stopped, pricing current: the write holds', fits(m, Y_TOL_BREATH), `${detail(wm)} ${errorText(m)}`);
    check(
      'page: topVh 0.7: the camera is the sym blend of the keys (the entry holds)',
      cameraError(camera, camAt(wm, size())) <= CAMERA_TOL,
      `err=${cameraError(camera, camAt(wm, size())).toFixed(5)}`,
    );

    scrollTo(0.4);
    await framesN(3);
    const w4 = wNow();
    const c4 = poseError(blocks, column);
    check('page: topVh 0.4 (w 1), pricing current: the column is complete and held', fits(c4, Y_TOL_BREATH), `${detail(w4)} ${errorText(c4)}`);
    check(
      'page: topVh 0.4: the camera holds the closing key',
      cameraError(camera, closingKey()) <= CAMERA_TOL,
      `err=${cameraError(camera, closingKey()).toFixed(5)}`,
    );
    check(`page: far plane is ${far} for this viewport`, camera.far === far, `far=${camera.far}`);

    scrollTo(0.1);
    await framesN(3);
    const c1 = poseError(blocks, column);
    check('page: topVh 0.1, pricing current: the column still stands', fits(c1, Y_TOL_BREATH), errorText(c1));

    scrollTo(-0.2);
    await framesN(3);
    const cc = poseError(blocks, column);
    check('page: topVh -0.2, closing current: the column stands', fits(cc, Y_TOL_BREATH), errorText(cc));

    // Back up past the closing top: the write runs again in reverse, while pricing is current.
    scrollTo(0.5);
    await framesN(3);
    const wb = wNow();
    const back = poseError(blocks, expectedAt(wb, portrait));
    check('page: topVh 0.5 (w 0.83), scrolled back up: the entry is written again and held', fits(back, Y_TOL_BREATH), `${detail(wb)} ${errorText(back)}`);
    scrollTo(0.1);
    await framesN(3);
  }

  return { controls, run };
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas#gl is missing');
  initTicker();
  const boot = createWorld(canvas);
  const world = boot.world;
  const pageMode = new URLSearchParams(location.search).get('mode') === 'page';

  const built = pageMode ? startPage(world) : startDirect(world);
  if (!pageMode) root.style.overflow = 'hidden';
  await boot.compile();
  (window as ClosingWindow).__closing = built.controls;

  await built.run();

  const failed = report.failures.length + report.diagnostics.length;
  for (const d of report.diagnostics) console.log(`DIAG ${d}`);
  console.log(`SUMMARY passes=${report.passes.length} failures=${report.failures.length} diagnostics=${report.diagnostics.length}`);
  root.dataset.harness = failed === 0 ? 'pass' : `fail:${failed}`;
}

main().catch((err: unknown) => {
  report.diagnostics.push(`main: ${String(err)}`);
  root.dataset.harness = `fail:${report.failures.length + report.diagnostics.length}`;
  console.error(err);
});
