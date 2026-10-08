// Harness for the footer section's 3D layer (src/sections/footer/gl.ts; architecture section 10a). The world is the page's
// own (createWorld from src/gl/boot.ts). As in the pricing harness, the page choreography is replaced by an empty list and
// disposed, and the footer handle is driven here the way the choreography drives it on the page: setActive(true) when the
// footer becomes current, then update() on every frame with progress 0 (the footer has no progress, direction-act3 C3).
// The closing is the previous section, as a SectionGL literal, because src/sections/closing/gl.ts does not exist yet. The
// choreography's commit for the footer (dof, breath, mix and theme) is set here too. The verdict goes to
// document.documentElement.dataset.harness once the checks are done. Playwright then drives the screenshot states through
// window.__footer.
import * as THREE from 'three';
import { footerGL } from '../src/sections/footer/gl';
import { createWorld } from '../src/gl/boot';
import { env } from '../src/core/env';
import { blockRects, type ScreenRect } from '../src/core/projection';
import { PRIORITY, addTick, initTicker, tickerTime, type Tick } from '../src/core/ticker';
import { T } from '../src/core/timing';
import { initChoreo } from '../src/choreo/timeline';
import { cameraKey } from '../src/gl/rig';
import { BLOCK_COUNT, KIREJI, formationFor, type Pose } from '../src/gl/blocks/formations';
import type { CameraKey, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
}

interface FooterControls {
  /** Sets the progress passed to the footer handle. The page never passes progress to the footer, so this is a test input. */
  show(progress: number): void;
  /** Resolves after n frames have been drawn (after PRIORITY.glRender). */
  frames(n: number): Promise<void>;
  /** Resolves once the page clock has advanced by the given number of seconds. */
  wait(seconds: number): Promise<void>;
}

interface FooterWindow extends Window {
  __footer?: FooterControls;
}

// SwiftShader notices that are environment noise, not defects: the GPU stall on ReadPixels, and the missing
// KHR_parallel_shader_compile extension that WebGLRenderer.compileAsync reports.
const ENVIRONMENT_NOTICES = ['GPU stall due to ReadPixels', 'KHR_parallel_shader_compile extension not supported'];
/** Pose tolerance in bu for exact states (no breath running). */
const POSE_TOL = 1e-4;
/** Breath bound in bu: the 0.010 bu wave, with the float32 rounding of the instance matrices. */
const BREATH_TOL = 0.0105;
/** Camera tolerance in bu. */
const CAMERA_TOL = 1e-3;
/** The column block scale, 0.22 / 0.70 (direction-3d 11.10). */
const COLUMN_SCALE = 0.22 / 0.7;
/** The wave fit: the gain must be the full 0.010 bu after the hold, and the residual must show the 0.2 rad step per block. */
const WAVE_GAIN_MIN = 0.0085;
const WAVE_GAIN_MAX = 0.0101;
const WAVE_RESIDUAL_TOL = 2e-4;
/** Kireji rest height in bu (block 05 is the fifth block from the top, y = (8 - 4) x 0.27). */
const KIREJI_Y = 1.08;

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

/** Resolves after n frames have been drawn (after PRIORITY.glRender). */
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

/** Resolves once the page clock has advanced by seconds. */
function waitSeconds(seconds: number): Promise<void> {
  const until = tickerTime() + seconds;
  return new Promise((resolve) => {
    const remove = addTick(() => {
      if (tickerTime() < until) return;
      remove();
      resolve();
    }, PRIORITY.glRender + 2);
  });
}

/**
 * The P1 extents of the column in CSS px at the two reference viewports: the centre x, the top edge of block 00 and the
 * bottom edge of block 16 (direction-act3, closing 2D layer: 1440 by 900 gives x 1038.8 and 88.2 to 811.8 px; 375 by 812
 * gives x 187.5 and 9.8 % to 90.2 % of the height). Other viewports have no printed numbers, so they are not checked here.
 */
function expectedColumn(width: number, height: number): { cx: number; top: number; bottom: number } | null {
  if (width === 1440 && height === 900) return { cx: 1038.8, top: 88.2, bottom: 811.8 };
  if (width === 375 && height === 812) return { cx: 187.5, top: 0.098 * 812, bottom: 0.902 * 812 };
  return null;
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas#gl is missing');
  initTicker();
  const boot = createWorld(canvas);
  const world = boot.world;
  // The page choreography is live inside boot. This harness drives the footer handle itself, so the choreography is
  // replaced by an empty section list and disposed.
  initChoreo(world, []).dispose();
  const { stage, blocks, lighting, background, post } = world;
  const camera = stage.camera;

  // The closing, the footer's previous section, as a SectionGL literal (src/sections/closing/gl.ts does not exist yet).
  const CLOSING: SectionGL = {
    id: 'closing',
    formation: 'column',
    key: 'closing',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.01, phase: 'wave' },
  };
  const setup = footerGL.setup;
  if (setup === undefined) throw new Error('footerGL has no setup');
  const footer: SectionGLHandle = setup(world);

  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });
  const isPortrait = (): boolean => stage.size.width < stage.size.height;
  const ctx = (): SectionGLContext => ({
    prev: CLOSING,
    portrait: isPortrait(),
    reducedMotion: env.reducedMotion,
    size: size(),
  });

  const drive = { on: false, progress: 0 };
  // One tick per frame, after the choreography's state tick (PRIORITY.state + 5) and before the GL update, so the
  // footer's poses and camera are the last written before the blocks compose.
  addTick((tick: Tick) => {
    if (!drive.on) return;
    footer.update(drive.progress, tick, ctx());
  }, PRIORITY.state + 5);

  /** The choreography's commit for the footer: the handle goes active, then dof, breath, mix and theme are set (choreo commit). */
  function commitFooter(): void {
    footer.setActive(true, ctx());
    post.setDof(footerGL.dof);
    blocks.setBreath(footerGL.breath);
    blocks.setActiveGroup(null);
    blocks.setMix(0);
    lighting.setMix(0);
    post.setMix(0);
    background.setBleed(null);
    background.setTheme('paper');
    drive.on = true;
  }

  const scratch = new THREE.Matrix4();
  function blockPos(i: number): [number, number, number] {
    blocks.mesh.getMatrixAt(i, scratch);
    const e = scratch.elements;
    return [e[12], e[13], e[14]];
  }

  function scaleOf(i: number): number {
    blocks.mesh.getMatrixAt(i, scratch);
    const e = scratch.elements;
    return Math.hypot(e[0], e[1], e[2]);
  }

  /** The largest gap between the blocks and a formation: xz over x and z, and y over the height (bu). */
  function errorOf(target: readonly Pose[]): { xz: number; y: number } {
    let xz = 0;
    let y = 0;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const got = blockPos(i);
      const want = target[i].p;
      xz = Math.max(xz, Math.abs(got[0] - want[0]), Math.abs(got[2] - want[2]));
      y = Math.max(y, Math.abs(got[1] - want[1]));
    }
    return { xz, y };
  }

  /** True when x and z match within POSE_TOL and y within yTol. */
  function fits(target: readonly Pose[], yTol: number): boolean {
    const e = errorOf(target);
    return e.xz <= POSE_TOL && e.y <= yTol;
  }

  function errorText(target: readonly Pose[]): string {
    const e = errorOf(target);
    return `xz=${e.xz.toExponential(2)} y=${e.y.toExponential(2)}`;
  }

  function closingNow(): CameraKey {
    return cameraKey('closing', size());
  }

  function cameraError(key: CameraKey): number {
    const p = camera.position;
    return Math.max(
      Math.abs(p.x - key.position[0]),
      Math.abs(p.y - key.position[1]),
      Math.abs(p.z - key.position[2]),
    );
  }

  /** The offsets of the 17 blocks from their column rest heights, in bu, from the instance matrices as they stand. */
  function offsetsNow(): number[] {
    const rest = formationFor('column', isPortrait());
    return Array.from({ length: BLOCK_COUNT }, (_, i) => blockPos(i)[1] - rest[i].p[1]);
  }

  /** Least-squares gain c in dy_k = c sin(2 pi t / T.breath - 0.2 k) at page time t, and the largest residual (bu). */
  function fitWave(t: number, dy: readonly number[]): { gain: number; residual: number } {
    const theta = (2 * Math.PI * t) / T.breath;
    const basis = Array.from({ length: BLOCK_COUNT }, (_, k) => Math.sin(theta - 0.2 * k));
    let num = 0;
    let den = 0;
    for (let k = 0; k < BLOCK_COUNT; k += 1) {
      num += dy[k] * basis[k];
      den += basis[k] * basis[k];
    }
    const gain = den > 0 ? num / den : 0;
    let residual = 0;
    for (let k = 0; k < BLOCK_COUNT; k += 1) residual = Math.max(residual, Math.abs(dy[k] - gain * basis[k]));
    return { gain, residual };
  }

  /** Samples the offsets in the frame after the render and fits the wave at that frame's page time. */
  function sampleWave(): Promise<{ gain: number; residual: number; reach: number }> {
    return new Promise((resolve) => {
      const remove = addTick((tick: Tick) => {
        remove();
        const dy = offsetsNow();
        const fit = fitWave(tick.time, dy);
        resolve({ ...fit, reach: Math.max(...dy.map((v) => Math.abs(v))) });
      }, PRIORITY.glRender + 2);
    });
  }

  /** Runs frames until the breath has started and eased in: T.hold, then 1.5 s of page time, and at least 90 frames. */
  async function warmWave(): Promise<void> {
    const start = tickerTime();
    let frames = 0;
    while (frames < 90 || tickerTime() < start + T.hold + 1.5) {
      await framesN(1);
      frames += 1;
    }
  }

  // Structure (checked before the first frame).
  check('boot collects the footer SectionGL object', boot.sections.includes(footerGL));
  check(
    'footerGL carries id footer, formation column, key closing, ink 0, dof null and breath 0.010 wave',
    footerGL.id === 'footer' &&
      footerGL.formation === 'column' &&
      footerGL.key === 'closing' &&
      footerGL.ink === 0 &&
      footerGL.dof === null &&
      footerGL.breath !== null &&
      footerGL.breath.amplitude === 0.01 &&
      footerGL.breath.phase === 'wave',
  );
  check(
    'the handle exposes update, setActive and dispose',
    typeof footer.update === 'function' && typeof footer.setActive === 'function' && typeof footer.dispose === 'function',
  );

  await boot.compile();
  const reduced = env.reducedMotion;
  const portrait = isPortrait();
  const far = portrait ? 120 : 80;
  const column = formationFor('column', portrait);
  const yTol = reduced ? POSE_TOL : BREATH_TOL;

  // Entry start: the footer becomes current with the closing as its previous section. The act gives no entry window, so
  // the column and the closing key are in place at once.
  commitFooter();
  drive.progress = 0;
  await framesN(3);
  check(
    'entry start: the 17 blocks stand in the column (x and z exact, y within the breath bound)',
    fits(column, yTol),
    errorText(column),
  );
  let scaleErr = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) scaleErr = Math.max(scaleErr, Math.abs(scaleOf(i) - COLUMN_SCALE));
  check(
    'entry start: all 17 blocks are at the column scale 0.22 / 0.70 (0.3143)',
    scaleErr <= POSE_TOL,
    `maxErr=${scaleErr.toExponential(2)}`,
  );
  check(
    'entry start: the kireji (block 05, index 4) is the fifth block from the top at y 1.08',
    Math.abs(blockPos(KIREJI)[1] - KIREJI_Y) <= yTol,
    `y=${blockPos(KIREJI)[1].toFixed(5)}`,
  );
  check(
    'entry start: the camera holds the closing key',
    cameraError(closingNow()) <= CAMERA_TOL,
    `err=${cameraError(closingNow()).toFixed(5)}`,
  );
  check(`far plane is ${far} for this viewport`, camera.far === far, `far=${camera.far}`);

  // P1 footprint of the column, from the projection module (the same numbers the 2D layer reads).
  const here = size();
  const expected = expectedColumn(here.width, here.height);
  const rects: ScreenRect[] = blockRects(column, cameraKey('closing', here), here);
  const cx = (rects[0].x0 + rects[0].x1) / 2;
  const top = rects[0].y0;
  const bottom = rects[BLOCK_COUNT - 1].y1;
  console.log(`[footer harness] P1 column centre x ${cx.toFixed(2)}, top ${top.toFixed(2)}, bottom ${bottom.toFixed(2)}`);
  if (expected !== null) {
    check(
      'P1 footprint of the column matches the act numbers (centre x, top of block 00, bottom of block 16; 2 px)',
      Math.abs(cx - expected.cx) <= 2 && Math.abs(top - expected.top) <= 2 && Math.abs(bottom - expected.bottom) <= 2,
      `cx=${cx.toFixed(1)} top=${top.toFixed(1)} bottom=${bottom.toFixed(1)} want ${expected.cx} ${expected.top.toFixed(1)} ${expected.bottom.toFixed(1)}`,
    );
  }

  // No progress: the hold is the same at 0.5 and at 1 (the footer has no entry move and no camera move).
  drive.progress = 0.5;
  await framesN(3);
  check(
    'progress 0.5: the column and the closing key hold (no formation or camera change)',
    fits(column, yTol) && cameraError(closingNow()) <= CAMERA_TOL,
    `${errorText(column)} camErr=${cameraError(closingNow()).toFixed(5)}`,
  );
  drive.progress = 1;
  await framesN(3);
  check(
    'progress 1: the column and the closing key hold (no formation or camera change)',
    fits(column, yTol) && cameraError(closingNow()) <= CAMERA_TOL,
    `${errorText(column)} camErr=${cameraError(closingNow()).toFixed(5)}`,
  );
  drive.progress = 0;

  if (!reduced) {
    // Keep-alive: the closing's travelling wave continues in the footer.
    await warmWave();
    const w = await sampleWave();
    check(
      'wave: the column breathes as one travelling wave, dy_k = c sin(2 pi t / T.breath - 0.2 k) (residual within 2e-4 bu)',
      w.residual <= WAVE_RESIDUAL_TOL,
      `residual=${w.residual.toExponential(2)} gain=${w.gain.toFixed(5)}`,
    );
    check(
      'wave: the gain is the full 0.010 bu after T.hold and the ease in',
      w.gain >= WAVE_GAIN_MIN && w.gain <= WAVE_GAIN_MAX,
      `gain=${w.gain.toFixed(5)}`,
    );
    check('wave: the column stays within the breath bound', w.reach <= BREATH_TOL, `reach=${w.reach.toFixed(5)}`);
  } else {
    // Reduced motion: the wave stops and the column holds its closing final state.
    await framesN(60);
    const w = await sampleWave();
    check('reduced motion: no wave (every block at its column height)', w.reach <= POSE_TOL, `reach=${w.reach.toExponential(2)}`);
    check('reduced motion: the column holds its closing final state exactly', fits(column, POSE_TOL), errorText(column));
    check(
      'reduced motion: the camera holds the closing key exactly',
      cameraError(closingNow()) <= CAMERA_TOL,
      `err=${cameraError(closingNow()).toFixed(5)}`,
    );
  }

  const failures = [...report.failures, ...report.diagnostics.map((d) => `diagnostic: ${d}`)];
  root.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.slice(0, 8).join(' | ')}`;
  console.log(`[footer harness] ${report.passes.length} passed, ${failures.length} failed`);

  // Playwright drives the screenshot states through these controls.
  (window as FooterWindow).__footer = {
    show: (progress: number): void => {
      drive.progress = clamp01(progress);
    },
    frames: framesN,
    wait: waitSeconds,
  };
}

main().catch((err: unknown) => {
  const text = err instanceof Error ? (err.stack ?? err.message) : String(err);
  report.failures.push(`exception: ${text}`);
  root.dataset.harness = `fail:exception ${text.slice(0, 300)}`;
  console.error(text);
});
