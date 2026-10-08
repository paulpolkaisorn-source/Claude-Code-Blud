// Harness for the pricing section's 3D layer (src/sections/pricing/gl.ts; architecture section 10a). The world is the
// page's own (createWorld from src/gl/boot.ts). As in the family harness, the page choreography is replaced by an empty
// list and the handles are driven here. The previous section is the family's own SectionGL, so the family handle
// supplies the exit pose, the key and the phantom outlines. While the section top is below the viewport top, the family
// handle runs every frame (it is the current section then) and the pricing handle runs after it in the same frame. Once
// the top reaches the viewport top, the family is set inactive and the pricing handle is set active. The block mix, the
// background bleed and the theme follow p2 = clamp(1 - topVh) (direction-3d 10.10; direction-act3 C11), as the
// choreography sets them on the page. The verdict goes to document.documentElement.dataset.harness once the checks are
// done. Playwright then drives the screenshot states through window.__pricing.
import * as THREE from 'three';
import { familyGL } from '../src/sections/family/gl';
import { pricingGL } from '../src/sections/pricing/gl';
import { createWorld } from '../src/gl/boot';
import { env } from '../src/core/env';
import { ef } from '../src/core/ease';
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

interface PricingControls {
  /** Moves the section top to topVh (viewport heights), and sets the handles and the mix for that position. */
  show(topVh: number): void;
  /** Resolves after n frames have been drawn. */
  frames(n: number): Promise<void>;
}

interface PricingWindow extends Window {
  __pricing?: PricingControls;
}

// SwiftShader notices that are environment noise, not defects: the GPU stall on ReadPixels, and the missing
// KHR_parallel_shader_compile extension that WebGLRenderer.compileAsync reports.
const ENVIRONMENT_NOTICES = ['GPU stall due to ReadPixels', 'KHR_parallel_shader_compile extension not supported'];
/** Pose tolerance in bu for exact states (no breath running). */
const POSE_TOL = 1e-4;
/** Breath bound in bu: the family's rows breath (0.012) runs on the rest blocks until the choreography commits. */
const BREATH_TOL = 0.0125;
const CAMERA_TOL = 1e-3;
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

/** Entrance progress w_p of a section top at topVh (direction-act3 C3: span 0.4). */
function entranceOf(topVh: number): number {
  return clamp01((1 - topVh) / 0.4);
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

async function main(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas#gl is missing');
  initTicker();
  const boot = createWorld(canvas);
  const world = boot.world;
  // The page choreography is live inside boot. This harness drives the two handles itself, so it is replaced by an
  // empty section list and disposed.
  initChoreo(world, []).dispose();
  const { stage, blocks, lighting, background, post } = world;
  const camera = stage.camera;
  const scene = stage.scene;
  post.setDof(null);

  // The code section's exit, as a SectionGL literal (code has no gl.ts yet). The family handle takes it as its previous section.
  const CODE: SectionGL = {
    id: 'code',
    formation: 'recede',
    key: 'hero',
    ink: 1,
    dof: { focus: 21.15, bokeh: 2 },
    breath: { amplitude: 0.012, phase: 'rows' },
  };
  const familySetup = familyGL.setup;
  const pricingSetup = pricingGL.setup;
  if (familySetup === undefined || pricingSetup === undefined) throw new Error('a section GL has no setup');
  const family: SectionGLHandle = familySetup(world);
  const pricing: SectionGLHandle = pricingSetup(world);

  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });
  const ctxFamily = (): SectionGLContext => {
    const s = size();
    return { prev: CODE, portrait: s.width < s.height, reducedMotion: env.reducedMotion, size: s };
  };
  const ctxPricing = (): SectionGLContext => {
    const s = size();
    return { prev: familyGL, portrait: s.width < s.height, reducedMotion: env.reducedMotion, size: s };
  };

  const drive = { topVh: 1, current: false, on: false };

  // One tick per frame, after the choreography's state tick (PRIORITY.state + 5) and before the GL update, so the
  // pricing poses and camera are the last written in the frame.
  addTick((tick: Tick) => {
    if (!drive.on) return;
    if (!drive.current) family.update(1, tick, ctxFamily());
    pricing.update(entranceOf(drive.topVh), tick, ctxPricing());
  }, PRIORITY.state + 5);

  /** Makes the pricing handle current, or hands the blocks back to the family, as the choreography's commit does. */
  function setCurrent(next: boolean): void {
    if (next === drive.current) return;
    drive.current = next;
    if (next) {
      family.setActive(false, ctxFamily());
      pricing.setActive(true, ctxPricing());
      post.setDof(pricingGL.dof);
      blocks.setBreath(pricingGL.breath);
    } else {
      pricing.setActive(false, ctxPricing());
      family.setActive(true, ctxFamily());
      post.setDof(familyGL.dof);
      blocks.setBreath(familyGL.breath);
    }
  }

  /** The mix, the bleed and the theme for a section top at topVh (choreography rules, p2 = clamp(1 - topVh)). */
  function applyMix(topVh: number): void {
    const reduced = env.reducedMotion;
    // Under reduced motion the choreography cuts the bleed at raw 0.5, so p2 is 0 or 1 (direction-3d 10.15).
    const p2 = reduced ? (topVh <= 0.5 ? 1 : 0) : clamp01(1 - topVh);
    const m = 1 - p2;
    blocks.setMix(m);
    lighting.setMix(m);
    post.setMix(m);
    if (!reduced && p2 > 0.02 && p2 < 0.98) {
      background.setBleed({ boundary: 2, p: p2 });
    } else {
      background.setBleed(null);
      background.setTheme(m >= 0.5 ? 'ink' : 'paper');
    }
  }

  function show(topVh: number): void {
    drive.topVh = topVh;
    setCurrent(topVh <= 0);
    applyMix(topVh);
  }

  const scratch = new THREE.Matrix4();
  function blockPos(i: number): [number, number, number] {
    blocks.mesh.getMatrixAt(i, scratch);
    const e = scratch.elements;
    return [e[12], e[13], e[14]];
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

  /** True when x and z match within POSE_TOL and y within yTol. yTol is BREATH_TOL while the breath may run on y. */
  function fits(target: readonly Pose[], yTol: number): boolean {
    const e = errorOf(target);
    return e.xz <= POSE_TOL && e.y <= yTol;
  }

  function errorText(target: readonly Pose[]): string {
    const e = errorOf(target);
    return `xz=${e.xz.toExponential(2)} y=${e.y.toExponential(2)}`;
  }

  /** How far block i has travelled from the family exit to the rest pose, as a share (0 at the exit, 1 at rest). */
  function shareOf(i: number, from: readonly Pose[], to: readonly Pose[]): number {
    const got = blockPos(i);
    const a = from[i].p;
    const b = to[i].p;
    const span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const moved = Math.hypot(got[0] - a[0], got[1] - a[1], got[2] - a[2]);
    return span === 0 ? 1 : moved / span;
  }

  function cameraError(key: CameraKey): number {
    const p = camera.position;
    return Math.max(
      Math.abs(p.x - key.position[0]),
      Math.abs(p.y - key.position[1]),
      Math.abs(p.z - key.position[2]),
    );
  }

  function outlineState(): { visible: boolean; opacity: number; transparent: boolean } | null {
    const line = scene.getObjectByName('family-phantoms');
    if (!(line instanceof THREE.LineSegments) || !(line.material instanceof THREE.LineDashedMaterial)) return null;
    return { visible: line.visible, opacity: line.material.opacity, transparent: line.material.transparent };
  }

  /**
   * Samples block 0's height after a warm-up of 40 frames, for 60 frames and at least one breath period of page time.
   * The warm-up lets the family's breath ease out (T.half) before the sample starts. Returns the range of the samples
   * and the largest distance of a sample from restY. Frame times differ between machines, so both the frame count and
   * the page time bound the window.
   */
  async function breathOf(restY: number): Promise<{ range: number; reach: number }> {
    await framesN(40);
    const start = tickerTime();
    const samples: number[] = [];
    const remove = addTick((tick: Tick) => {
      if (tick.time >= start) samples.push(blockPos(0)[1]);
    }, PRIORITY.glRender + 2);
    let frames = 0;
    while (frames < 60 || tickerTime() < start + T.breath) {
      await framesN(1);
      frames += 1;
    }
    remove();
    const hi = Math.max(...samples);
    const lo = Math.min(...samples);
    return { range: hi - lo, reach: Math.max(Math.abs(hi - restY), Math.abs(lo - restY)) };
  }

  // Structure (checked before the first frame).
  check('boot collects the pricing SectionGL object', boot.sections.includes(pricingGL));
  check(
    'pricingGL carries id pricing, formation rest, key pricing, ink 0, dof null and breath 0.010 zero',
    pricingGL.id === 'pricing' &&
      pricingGL.formation === 'rest' &&
      pricingGL.key === 'pricing' &&
      pricingGL.ink === 0 &&
      pricingGL.dof === null &&
      pricingGL.breath !== null &&
      pricingGL.breath.amplitude === 0.01 &&
      pricingGL.breath.phase === 'zero',
  );
  check('the handle exposes update, setActive and dispose', typeof pricing.update === 'function' && typeof pricing.setActive === 'function' && typeof pricing.dispose === 'function');

  await boot.compile();
  family.setActive(true, ctxFamily());
  pricing.setActive(false, ctxPricing());
  blocks.setBreath(familyGL.breath);
  show(1);
  drive.on = true;
  await framesN(3);

  const reduced = env.reducedMotion;
  const portrait = stage.size.width < stage.size.height;
  const far = portrait ? 120 : 80;
  const exitPose = formationFor('family', portrait);
  const restPose = formationFor('rest', portrait);
  const famKey = (): CameraKey => cameraKey('family', size());
  const priceKey = (): CameraKey => cameraKey('pricing', size());
  const farOk = (): boolean => camera.far === far;

  if (!reduced) {
    // Entry start: w_p 0 holds the family exit pose and key. The family is current, so the breath may run on the blocks.
    check(
      'entry start (w_p 0): the blocks hold the family exit formation',
      fits(exitPose, BREATH_TOL),
      errorText(exitPose),
    );
    check(
      'entry start: the camera holds the family key',
      cameraError(famKey()) <= CAMERA_TOL,
      `err=${cameraError(famKey()).toFixed(5)}`,
    );
    const o0 = outlineState();
    check(
      'entry start: the phantom outlines are shown at opacity 1',
      o0 !== null && o0.visible && Math.abs(o0.opacity - 1) < 1e-6 && !o0.transparent,
      o0 === null ? 'no outlines' : `visible=${o0.visible} opacity=${o0.opacity.toFixed(4)}`,
    );
    check(`far plane is ${far} for this viewport`, farOk(), `far=${camera.far}`);

    // The kireji leads: its lead completes in the first 0.10 of progress (w_p 0.15 here), so it is at rest while block 0 has barely moved.
    show(0.94);
    await framesN(3);
    const kireji = shareOf(KIREJI, exitPose, restPose);
    const outer = shareOf(0, exitPose, restPose);
    check(
      'w_p 0.15: the kireji (block 4) has reached rest (its lead ends at 0.10)',
      kireji >= 0.98,
      `kireji=${kireji.toFixed(4)}`,
    );
    check(
      'w_p 0.15: the kireji leads block 0',
      kireji - outer > 0.5,
      `kireji=${kireji.toFixed(4)} block0=${outer.toFixed(4)}`,
    );

    // Mid entry (w_p 0.5, the top at 80 %): the camera is the sym midpoint of the two keys, and the outlines are half faded.
    show(0.8);
    await framesN(3);
    const fam = famKey();
    const pri = priceKey();
    const mid: CameraKey = {
      position: [0, 0, 0],
      target: [0, 0, 0],
      fov: fam.fov,
    };
    const k = ef.sym(0.5);
    for (let c = 0; c < 3; c += 1) {
      mid.position[c] = fam.position[c] + (pri.position[c] - fam.position[c]) * k;
      mid.target[c] = fam.target[c] + (pri.target[c] - fam.target[c]) * k;
    }
    check(
      'w_p 0.5: the camera is the sym midpoint of the family and pricing keys',
      cameraError(mid) <= CAMERA_TOL,
      `err=${cameraError(mid).toFixed(5)}`,
    );
    const o1 = outlineState();
    const want = 1 - ef.sym(0.5);
    check(
      'w_p 0.5: the phantom outlines are at opacity 1 - sym(0.5) and transparent',
      o1 !== null && o1.visible && Math.abs(o1.opacity - want) < 1e-6 && o1.transparent,
      o1 === null ? 'no outlines' : `opacity=${o1.opacity.toFixed(4)} want=${want.toFixed(4)}`,
    );

    // Rest (w_p 1): the blocks are at the rest formation, the camera at the pricing key, and the outlines hidden.
    show(0.6);
    await framesN(3);
    check(
      'w_p 1: the blocks hold the rest formation',
      fits(restPose, BREATH_TOL),
      errorText(restPose),
    );
    check(
      'w_p 1: the camera holds the pricing key',
      cameraError(priceKey()) <= CAMERA_TOL,
      `err=${cameraError(priceKey()).toFixed(5)}`,
    );
    const o2 = outlineState();
    check(
      'w_p 1: the phantom outlines are hidden',
      o2 !== null && !o2.visible,
      o2 === null ? 'no outlines' : `visible=${o2.visible}`,
    );

    // Current (section top at the viewport top): x and z hold exactly. y stays within the breath bound, because the
    // family's breath eases out over T.half while the rest breath eases in (blocks.ts setBreath and update).
    show(0);
    await framesN(3);
    check(
      'current: the blocks hold the rest formation (x and z exact, y within the breath bound)',
      fits(restPose, BREATH_TOL),
      errorText(restPose),
    );
    check(
      'current: the camera holds the pricing key',
      cameraError(priceKey()) <= CAMERA_TOL,
      `err=${cameraError(priceKey()).toFixed(5)}`,
    );
    const g = scene.getObjectByName('family-phantom-group');
    check('current: the family outline group is hidden by the family handle', g !== undefined && !g.visible);
    check(`current: the far plane is ${far}`, farOk(), `far=${camera.far}`);

    // Keep-alive: the rest breath runs after T.hold and stays within its 0.010 bu amplitude. BREATH_TOL allows for the
    // family's residual breath during the warm-up.
    const breath = await breathOf(restPose[0].p[1]);
    check(
      'current: the rest breath runs after T.hold (block 0 moves on y)',
      breath.range > 0.012,
      `range=${breath.range.toFixed(5)}`,
    );
    check(
      'current: the rest breath stays within the 0.010 bu amplitude',
      breath.reach <= BREATH_TOL,
      `reach=${breath.reach.toFixed(5)}`,
    );

    // Leaving upward: the outlines are restored to the family state, then the entry shows them again at opacity 1.
    show(1);
    await framesN(3);
    const o3 = outlineState();
    check(
      'leaving pricing upward restores the family outlines (visible, opacity 1)',
      o3 !== null && o3.visible && Math.abs(o3.opacity - 1) < 1e-6 && !o3.transparent,
      o3 === null ? 'no outlines' : `visible=${o3.visible} opacity=${o3.opacity.toFixed(4)}`,
    );
    check(
      'entry start again: the blocks hold the family exit formation',
      fits(exitPose, BREATH_TOL),
      errorText(exitPose),
    );
  } else {
    // Reduced motion: the previous state holds until the top crosses 80 %, then the rest state is complete at once.
    show(0.9);
    await framesN(3);
    check(
      'reduced motion, w_p 0.25: the blocks hold the family exit formation',
      fits(exitPose, POSE_TOL),
      errorText(exitPose),
    );
    check(
      'reduced motion, w_p 0.25: the camera holds the family key',
      cameraError(famKey()) <= CAMERA_TOL,
      `err=${cameraError(famKey()).toFixed(5)}`,
    );
    const r0 = outlineState();
    check(
      'reduced motion, w_p 0.25: the outlines are shown at opacity 1',
      r0 !== null && r0.visible && Math.abs(r0.opacity - 1) < 1e-6,
      r0 === null ? 'no outlines' : `visible=${r0.visible} opacity=${r0.opacity.toFixed(4)}`,
    );

    show(0.7);
    await framesN(3);
    check(
      'reduced motion, w_p 0.75: the blocks are at the rest formation at once',
      fits(restPose, POSE_TOL),
      errorText(restPose),
    );
    check(
      'reduced motion, w_p 0.75: the camera is at the pricing key at once',
      cameraError(priceKey()) <= CAMERA_TOL,
      `err=${cameraError(priceKey()).toFixed(5)}`,
    );
    const r1 = outlineState();
    check(
      'reduced motion, w_p 0.75: the outlines are hidden',
      r1 !== null && !r1.visible,
      r1 === null ? 'no outlines' : `visible=${r1.visible}`,
    );

    show(0);
    await framesN(3);
    check(
      'reduced motion, current: the rest formation holds',
      fits(restPose, POSE_TOL),
      errorText(restPose),
    );
    check(`reduced motion, current: the far plane is ${far}`, farOk(), `far=${camera.far}`);
    const still = await breathOf(restPose[0].p[1]);
    check(
      'reduced motion: no breath (block 0 holds still)',
      still.range < 1e-6 && still.reach < 1e-6,
      `range=${still.range.toExponential(2)} reach=${still.reach.toExponential(2)}`,
    );
  }

  const failures = [...report.failures, ...report.diagnostics.map((d) => `diagnostic: ${d}`)];
  root.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.slice(0, 8).join(' | ')}`;
  console.log(`[pricing harness] ${report.passes.length} passed, ${failures.length} failed`);

  // Playwright drives the screenshot states through these controls.
  (window as PricingWindow).__pricing = { show, frames: framesN };
}

main().catch((err: unknown) => {
  const text = err instanceof Error ? (err.stack ?? err.message) : String(err);
  report.failures.push(`exception: ${text}`);
  root.dataset.harness = `fail:exception ${text.slice(0, 300)}`;
  console.error(text);
});
