// Harness for the capabilities section's 3D layer, src/sections/capabilities/gl.ts (architecture section 10a). The page
// has three sections in order (speed, capabilities, pricing) with the real heights of act II, and the real choreography
// (src/choreo/timeline.ts) runs over the speed and capabilities layers. Scroll is set through scrollState, so the
// choreography computes the progress it passes to each handle, exactly as on the page: the centre-line progress of
// act rule C2 for capabilities, and the ink-bleed progress p1 that it passes in ctx.bleed (D22.8).
// Checks:
//   unit (desktop and phone, the choreography disposed): the handle alone, with ctx.bleed.p1 = 0, 0.2, 0.5 and 1. The camera
//   is linear in p1 from the speed key to the hero key, within 0.01 bu (D22.8); the blocks are the race scrubbed to cap-0 at
//   t = p1. At 1440 by 900 the camera also matches act II line 37 (z 31.95 + (21.15 - 31.95) p1, x -2.894 p1).
//   choreography (desktop and phone): the entry at top 0.3 vh, card 1 settled on cap-0 and the hero key, the card rests at
//   p 0.5 and 0.9 with their groups; the blend band at p 1/3; the hover lift; the keyboard or tap activation as a timed move
//   that lands on cap-2 and is held; a wheel input that ends the hold; the activating key input that does not end it; the
//   release by landing; the phone camera.
//   [timeline gate], desktop and phone: at top 0.6 vh the bleed p1 is about 0.35 but the centre-line progress is 0. The
//   choreography does not call an entering section at progress 0, so the camera does not follow p1 here. This check fails
//   until src/choreo/timeline.ts calls the entering section while its bleed is above 0 (see the report).
//   reduced motion: no entry blend, discrete card changes with the canvas crossfade of C14, no hover lift, the hold.
// The verdict is document.documentElement.dataset.harness: 'pass' or 'fail:<reason>'. window.__capHarness drives the
// states that the screenshot driver (a Playwright script kept outside the repository) captures.
import { gsap } from 'gsap';
import { choreoSnapshot, initChoreo } from '../src/choreo/timeline';
import { ef } from '../src/core/ease';
import { env } from '../src/core/env';
import type { FormationId } from '../src/core/types';
import { scrollState } from '../src/core/scroll';
import { initTicker, type Tick } from '../src/core/ticker';
import { scrubLocal } from '../src/core/timing';
import { createWorld } from '../src/gl/boot';
import { BLOCK_COUNT, KIREJI, formationFor, staggerPosition, type Pose } from '../src/gl/blocks/formations';
import { cameraKey } from '../src/gl/rig';
import type { CameraKey, GLWorld, KeyName, SectionGLContext } from '../src/gl/section-gl';
import { capabilitiesGL } from '../src/sections/capabilities/gl';
import { speedGL } from '../src/sections/speed/gl';

type V3 = [number, number, number];

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
  notices: string[];
}

interface Snapshot {
  blocks: V3[];
  camera: V3;
  group: number[] | null;
  opacity: string;
}

interface CapHarness {
  /** Sets the scroll position in viewport heights and waits for frames rendered after it. */
  goto(yvh: number, frames?: number): Promise<void>;
  frames(n: number): Promise<void>;
  waitMs(ms: number): Promise<void>;
  activate(index: number, source: 'key' | 'tap'): void;
  hover(index: number | null): void;
  wheel(): void;
  snapshot(): Snapshot;
  /** Turns the draw calls on or off. The checks read CPU state, so they run with draws off; a screenshot draws one frame. */
  render(on: boolean): void;
  /** Scales the time of every gsap tween (the timed moves are tweens). The screenshot driver slows them to catch a move mid-way. */
  timeScale(v: number): void;
  portrait: boolean;
  reduced: boolean;
}

interface HarnessWindow extends Window {
  __capHarness?: CapHarness;
  __capReport?: Report;
}

const root = document.documentElement;
/** Poses are direct functions of p, so a few frames show them. Lifts and breath damp with T.half, so they take longer. */
const POSE_FRAMES = 14;
const LIFT_FRAMES = 150;
/** The bleed settles on its own smoothing (T.beat7 to within 1e-3 in about 5 s at 60 fps); the wait covers it. */
const SETTLE_MS = 7000;
/** The most a block may sit from its expected x or z, in bu, and from its expected y (the breath is 0.012 bu). */
const TOL_XZ = 0.002;
const TOL_Y = 0.0125;
const TOL_CAM = 0.01;
const report: Report = { passes: [], failures: [], diagnostics: [], notices: [] };

// Headless Chromium's SwiftShader has no KHR_parallel_shader_compile, and it reports GPU stalls on ReadPixels. Both are
// notices of the software GL, so they are kept out of the verdict. Every other warning fails the run.
const ENVIRONMENT_NOTICE = /KHR_parallel_shader_compile extension not supported|GPU stall due to ReadPixels/;

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

function fmt(v: number): string {
  return v.toFixed(4);
}

function heightOf(id: string, px: number): void {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) throw new Error(`the #${id} section is missing`);
  el.style.height = `${px}px`;
}

function layout(): void {
  const vh = window.innerHeight;
  heightOf('speed', 3 * vh);
  heightOf('capabilities', 3 * vh);
  heightOf('pricing', vh);
}

function viewport(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** The race in the stage's own frame (direction-3d 11.3), turned to a column on a phone (D15.1). */
function expectRace(portrait: boolean): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    out.push(portrait ? [0, (8 - i) * 0.95, 0] : [(i - 8) * 0.95, 0, 0]);
  }
  return out;
}

function formationXYZ(id: FormationId, portrait: boolean): V3[] {
  return formationFor(id, portrait).map((q: Pose): V3 => [q.p[0], q.p[1], q.p[2]]);
}

/** The scrubbed blend between two sets of block positions at transition t (Sequence). t is used as given. */
function blendXYZ(from: readonly V3[], to: readonly V3[], t: number, toId: FormationId): V3[] {
  const order = staggerPosition(toId);
  return from.map((a, i): V3 => {
    const q = scrubLocal(order[i], BLOCK_COUNT, t, { total: 0.35, lead: 0.1 });
    const e = i === KIREJI ? ef.anticipate(q) : ef.settle(q);
    const b = to[i];
    return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  });
}

function keyXYZ(name: KeyName, size: { width: number; height: number }): V3 {
  const key: CameraKey = cameraKey(name, size);
  return [key.position[0], key.position[1], key.position[2]];
}

/** The camera on the straight line from a to b at p1 (D22.8: linear in the already eased bleed progress). */
function lerpCam(a: V3, b: V3, p1: number): V3 {
  return [a[0] + (b[0] - a[0]) * p1, a[1] + (b[1] - a[1]) * p1, a[2] + (b[2] - a[2]) * p1];
}

/** The largest deviation between blocks and their expected positions, and whether each is inside its tolerance. */
function blockDeviation(actual: readonly V3[], expected: readonly V3[]): { ok: boolean; worst: number } {
  let ok = true;
  let worst = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const dx = Math.abs(actual[i][0] - expected[i][0]);
    const dy = Math.abs(actual[i][1] - expected[i][1]);
    const dz = Math.abs(actual[i][2] - expected[i][2]);
    if (dx > TOL_XZ || dz > TOL_XZ || dy > TOL_Y) ok = false;
    worst = Math.max(worst, dx, dy, dz);
  }
  return { ok, worst };
}

function camDeviation(actual: V3, expected: V3): { ok: boolean; worst: number } {
  const worst = Math.max(
    Math.abs(actual[0] - expected[0]),
    Math.abs(actual[1] - expected[1]),
    Math.abs(actual[2] - expected[2]),
  );
  return { ok: worst <= TOL_CAM, worst };
}

function sameGroup(actual: number[] | null, expected: readonly number[]): boolean {
  return actual !== null && actual.length === expected.length && actual.every((v, k) => v === expected[k]);
}

async function main(): Promise<void> {
  const element = document.getElementById('gl');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the #gl canvas is missing');
  const canvas: HTMLCanvasElement = element;
  layout();
  // The hover checks need a fine pointer, which the headless browser does not report, so the harness forces it.
  env.finePointer = true;
  env.touch = false;

  initTicker();
  const boot = createWorld(canvas);
  await boot.compile();
  const world: GLWorld = boot.world;
  for (let i = 0; i < BLOCK_COUNT; i += 1) world.blocks.setEntrance(i, 1);

  /** The group the handle last asked the blocks to breathe: the spy records what setActiveGroup received. */
  let lastGroup: number[] | null = null;
  const realSetActiveGroup = world.blocks.setActiveGroup.bind(world.blocks);
  world.blocks.setActiveGroup = (indices: readonly number[] | null): void => {
    lastGroup = indices === null ? null : [...indices];
    realSetActiveGroup(indices);
  };

  // Draw calls are costly under SwiftShader (about two seconds a frame at 1440 by 900), and the checks read CPU state only
  // (instance matrices and the camera). So the draws are off while the checks run and on for the screenshot frames. The
  // choreography, the blocks and the rig keep updating every frame either way.
  const renderer = world.stage.renderer;
  const realRender = renderer.render.bind(renderer);
  const setRender = (on: boolean): void => {
    renderer.render = on ? realRender : (): void => undefined;
  };
  setRender(false);

  const portrait = window.innerWidth < window.innerHeight;
  const reduced = env.reducedMotion;
  const size = viewport();
  const label = `${portrait ? 'phone' : 'desktop'}${reduced ? ' reduced' : ''}`;
  const speedXYZ = keyXYZ('speed', size);
  const heroXYZ = keyXYZ('hero', size);

  async function frames(n: number): Promise<void> {
    for (let i = 0; i < n; i += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  async function waitMs(ms: number): Promise<void> {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) await frames(1);
  }
  /** Waits for a test to hold, one frame at a time, for up to ms. Resolves with whether it held. */
  async function until(test: () => boolean, ms: number): Promise<boolean> {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (test()) return true;
      await frames(1);
    }
    return test();
  }
  async function goto(yvh: number, n = POSE_FRAMES): Promise<void> {
    scrollState.y = yvh * window.innerHeight;
    await frames(n);
  }
  /** Block translations from the instance matrices, which the blocks write each frame. */
  function blockPositions(): V3[] {
    const a = world.blocks.mesh.instanceMatrix.array as Float32Array;
    const out: V3[] = [];
    for (let i = 0; i < BLOCK_COUNT; i += 1) out.push([a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14]]);
    return out;
  }
  function snapshot(): Snapshot {
    const c = world.stage.camera.position;
    return {
      blocks: blockPositions(),
      camera: [c.x, c.y, c.z],
      group: lastGroup,
      opacity: canvas.style.opacity,
    };
  }
  function activate(index: number, source: 'key' | 'tap'): void {
    document.dispatchEvent(new CustomEvent('hk:cap-active', { detail: { index, source } }));
  }
  function hover(index: number | null): void {
    document.dispatchEvent(new CustomEvent('hk:cap-hover', { detail: { index } }));
  }
  function wheel(): void {
    window.dispatchEvent(new Event('wheel'));
  }

  // The real choreography over the speed and capabilities layers. Its start replaces the page's own choreography, which
  // boot started over every section (a later initChoreo disposes the earlier one). The unit checks dispose it again.
  let choreo = initChoreo(world, [speedGL, capabilitiesGL]);

  const api: CapHarness = {
    goto,
    frames,
    waitMs,
    activate,
    hover,
    wheel,
    snapshot,
    render: setRender,
    timeScale: (v: number): void => {
      gsap.globalTimeline.timeScale(v);
    },
    portrait,
    reduced,
  };
  (window as HarnessWindow).__capHarness = api;

  /**
   * The handle alone, with the choreography disposed: ctx.bleed.p1 at 0, 0.2, 0.5 and 1 (D22.8). The camera must be on
   * the straight line from the speed key to the hero key at p1, and the blocks must be the race scrubbed to cap-0 at
   * t = p1. The 0.2 point is the one that checks the inversion of ef.sym, since sym(0.5) = 0.5.
   */
  async function unitEntry(): Promise<void> {
    const setup = capabilitiesGL.setup;
    if (setup === undefined) throw new Error('capabilities has no setup');
    const handle = setup(world);
    const tick: Tick = { time: 0, dt: 1 / 60, frame: 0 };
    const ctxAt = (p1: number): SectionGLContext => ({
      prev: speedGL,
      portrait,
      reducedMotion: false,
      size: { width: size.width, height: size.height },
      bleed: { p1, p2: 0 },
    });
    handle.setActive(false, ctxAt(0));
    const literal = !portrait && size.width === 1440 && size.height === 900;
    for (const p1 of [0, 0.2, 0.5, 1]) {
      handle.update(0, tick, ctxAt(p1));
      await frames(3);
      const s = snapshot();
      const cd = camDeviation(s.camera, lerpCam(speedXYZ, heroXYZ, p1));
      const bd = blockDeviation(s.blocks, blendXYZ(expectRace(portrait), formationXYZ('cap-0', portrait), p1, 'cap-0'));
      check(
        `${label}: unit entry at p1 ${p1}, camera linear in p1 and blocks at t = p1`,
        cd.ok && bd.ok,
        `camera ${fmt(cd.worst)} block ${fmt(bd.worst)} camera ${s.camera.map(fmt).join(', ')}`,
      );
      if (literal) {
        // Act II line 37 at 1440 by 900: z = 31.95 + (21.15 - 31.95) p1 and x = -2.894 p1 (tolerance 0.01 bu).
        const zLit = 31.95 + (21.15 - 31.95) * p1;
        const xLit = -2.894 * p1;
        check(
          `${label}: unit entry at p1 ${p1} matches act II line 37`,
          Math.abs(s.camera[2] - zLit) <= 0.01 && Math.abs(s.camera[0] - xLit) <= 0.01 && Math.abs(s.camera[1]) <= 1e-6,
          `z ${fmt(s.camera[2])} (want ${fmt(zLit)}) x ${fmt(s.camera[0])} (want ${fmt(xLit)})`,
        );
      }
    }
    if (portrait) {
      // Phone keys (D15.1 and D21.2): the speed key z 51.12 at x -3.30, the hero key z 39.25 at y -1.10.
      check(
        `${label}: phone entry keys, speed z 51.12 x -3.30 and hero z 39.25 y -1.10`,
        Math.abs(speedXYZ[2] - 51.12) <= 0.01 &&
          Math.abs(speedXYZ[0] + 3.3) <= 0.01 &&
          Math.abs(heroXYZ[2] - 39.25) <= 0.01 &&
          Math.abs(heroXYZ[1] + 1.1) <= 0.01,
        `speed ${speedXYZ.map(fmt).join(', ')} hero ${heroXYZ.map(fmt).join(', ')}`,
      );
    }
    handle.dispose();
  }

  /** The choreography over speed and capabilities: entry, rests, bands, hover, activation, hold and release. */
  async function scrollChecks(): Promise<void> {
    if (reduced) {
      // Reduced motion: the entry is not drawn (the section is not current), so the speed key holds until the cut.
      await goto(2.5, 12);
      const before = snapshot();
      const cd0 = camDeviation(before.camera, speedXYZ);
      check(`${label}: entry not drawn before the section is current`, cd0.ok, `camera ${fmt(cd0.worst)}`);
    }
    if (!reduced) {
      // [timeline gate] Top at 0.6 vh: p1 is about 0.35 and the centre-line progress is 0. The camera must already follow p1.
      await goto(2.4, 12);
      let cs = choreoSnapshot();
      let s = snapshot();
      const gateP1 = cs?.p1 ?? Number.NaN;
      let cd = camDeviation(s.camera, lerpCam(speedXYZ, heroXYZ, gateP1));
      check(
        `${label}: [timeline gate] top 0.6 vh, camera follows p1 before the centre line`,
        cd.ok,
        `p1 ${fmt(gateP1)} camera ${fmt(cd.worst)}`,
      );

      // Entry through the choreography, top at 0.3 vh (p 0.067): the handle is called, and the camera and the blocks
      // are the entry at the current p1.
      await goto(2.7, 12);
      cs = choreoSnapshot();
      s = snapshot();
      const p1 = cs?.p1 ?? Number.NaN;
      cd = camDeviation(s.camera, lerpCam(speedXYZ, heroXYZ, p1));
      const bd = blockDeviation(s.blocks, blendXYZ(expectRace(portrait), formationXYZ('cap-0', portrait), p1, 'cap-0'));
      check(
        `${label}: entry at top 0.3 vh, camera and blocks follow p1`,
        cd.ok && bd.ok,
        `p1 ${fmt(p1)} camera ${fmt(cd.worst)} block ${fmt(bd.worst)}`,
      );
    }

    // Card 1 at rest, p 0.2. The bleed settles first, so the camera is on the hero key and the blocks are on cap-0.
    await goto(3.1, POSE_FRAMES);
    await waitMs(reduced ? 900 : SETTLE_MS);
    let s = snapshot();
    let bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
    let cd = camDeviation(s.camera, keyXYZ('hero', size));
    if (reduced) {
      check(`${label}: card 1 at once on cap-0, hero key`, bd.ok && cd.ok, `block ${fmt(bd.worst)} camera ${fmt(cd.worst)}`);
    } else {
      check(
        `${label}: card 1 settled on cap-0, hero key, group 0 to 4`,
        bd.ok && cd.ok && sameGroup(s.group, [0, 1, 2, 3, 4]),
        `block ${fmt(bd.worst)} camera ${fmt(cd.worst)} group ${String(s.group)}`,
      );
    }

    if (!reduced) {
      // Blend band at the first boundary, p 1/3: the scrubbed blend from cap-0 to cap-1 at u 0.5.
      await goto(3.5, POSE_FRAMES);
      s = snapshot();
      bd = blockDeviation(s.blocks, blendXYZ(formationXYZ('cap-0', portrait), formationXYZ('cap-1', portrait), ef.sym(0.5), 'cap-1'));
      check(`${label}: band at p 1/3, blend cap-0 to cap-1`, bd.ok, `block ${fmt(bd.worst)}`);
    } else {
      // Reduced motion: no blend at the boundary, the card changes after one crossfade.
      await goto(3.45, POSE_FRAMES);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
      check(`${label}: no blend below the boundary`, bd.ok, `block ${fmt(bd.worst)}`);
    }

    // Card 2 at rest, p 0.5: cap-1 exactly and group 5 to 11. Under reduced motion the crossfade has to end first.
    await goto(3.6, 1);
    await waitMs(reduced ? 150 : 0);
    if (reduced) {
      const mid = snapshot();
      check(`${label}: card change fades the canvas out (C14)`, mid.opacity !== '' && Number(mid.opacity) < 0.95, `opacity '${mid.opacity}'`);
      await waitMs(900);
    }
    await goto(4.0, POSE_FRAMES);
    if (reduced) await waitMs(900);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-1', portrait));
    check(
      `${label}: card 2 rest on cap-1, group 5 to 11`,
      bd.ok && sameGroup(s.group, [5, 6, 7, 8, 9, 10, 11]) && (!reduced || s.opacity === ''),
      `block ${fmt(bd.worst)} group ${String(s.group)} opacity '${s.opacity}'`,
    );

    // Card 3 at rest, p 0.9: cap-2 with its stair, and group 12 to 16.
    await goto(5.2, POSE_FRAMES);
    if (reduced) await waitMs(900);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-2', portrait));
    check(`${label}: card 3 rest on cap-2 with the stair, group 12 to 16`, bd.ok && sameGroup(s.group, [12, 13, 14, 15, 16]), `block ${fmt(bd.worst)} group ${String(s.group)}`);

    if (portrait && !reduced) {
      // Phone hero key: x 0, y -1.10, z 39.25 (direction-3d 10.6), once the bleed has settled at card 1.
      await goto(3.1, POSE_FRAMES);
      await waitMs(SETTLE_MS);
      s = snapshot();
      cd = camDeviation(s.camera, keyXYZ('hero', size));
      check(`${label}: phone camera on the hero key (y -1.10)`, cd.ok && Math.abs(s.camera[1] + 1.1) < 0.01, `camera ${s.camera.map(fmt).join(', ')}`);
    }

    if (!portrait && !reduced) {
      // Hover lift: a hovered card's rows move 0.2 bu toward the camera (blocks.setLift), and only those rows.
      await goto(4.0, POSE_FRAMES);
      hover(1);
      await frames(LIFT_FRAMES);
      s = snapshot();
      const lifted = [5, 6, 7, 8, 9, 10, 11];
      const expectedZ = formationXYZ('cap-1', false).map((p, i): V3 => [p[0], p[1], lifted.includes(i) ? p[2] + 0.2 : p[2]]);
      bd = blockDeviation(s.blocks, expectedZ);
      check(`${label}: hover lifts card 2 by 0.2 bu on z, only its rows`, bd.ok, `block ${fmt(bd.worst)}`);
      hover(null);
      await frames(LIFT_FRAMES);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-1', false));
      check(`${label}: hover ends, the lift returns to 0`, bd.ok, `block ${fmt(bd.worst)}`);

      // Timed activation from card 2 to card 3. The kireji cuts over T.micro and the followers settle from T.micro plus
      // their offsets, so block 16 (offset 0.355 s) has not moved at about 0.25 s.
      await goto(4.0, POSE_FRAMES);
      const t0 = performance.now();
      activate(2, 'key');
      await waitMs(250);
      const early = performance.now() - t0;
      s = snapshot();
      const z16 = s.blocks[16][2];
      if (early < 330) check(`${label}: timed move, block 16 waits for its offset`, Math.abs(z16 + 1.4) < 0.01, `z16 ${fmt(z16)} at ${Math.round(early)} ms`);
      else report.notices.push(`timed-move offset check skipped: sample at ${Math.round(early)} ms`);
      await waitMs(1700);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-2', false));
      check(`${label}: timed move lands on cap-2 and holds at p 0.5`, bd.ok && sameGroup(s.group, [12, 13, 14, 15, 16]), `block ${fmt(bd.worst)} group ${String(s.group)}`);

      // The landing ends the hold: scroll to card 3 (p 5/6), then back to card 2 with no hold, p 0.5 gives cap-1 again.
      const y0 = 4.0;
      const y1 = 5.0;
      const start = performance.now();
      const duration = 1190;
      while (performance.now() - start < duration) {
        const k = Math.min(1, (performance.now() - start) / duration);
        scrollState.y = (y0 + (y1 - y0) * ef.sym(k)) * window.innerHeight;
        await frames(1);
      }
      await waitMs(1700);
      await goto(4.0, POSE_FRAMES);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-1', false));
      check(`${label}: landing releases the hold, p drives again`, bd.ok && sameGroup(s.group, [5, 6, 7, 8, 9, 10, 11]), `block ${fmt(bd.worst)} group ${String(s.group)}`);

      // A wheel input ends a hold that is still held: after activation, the formation returns to p 0.5 (cap-1).
      activate(2, 'key');
      await waitMs(400);
      wheel();
      await waitMs(1700);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-1', false));
      check(`${label}: wheel input ends the hold`, bd.ok, `block ${fmt(bd.worst)}`);

      // The keydown that caused an activation does not end its hold.
      await goto(4.0, POSE_FRAMES);
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      activate(2, 'key');
      window.dispatchEvent(keyEvent);
      await waitMs(1800);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-2', false));
      check(`${label}: the activating keydown does not end the hold`, bd.ok, `block ${fmt(bd.worst)}`);
      wheel();
      await waitMs(900);
      await goto(4.0, POSE_FRAMES);
    }

    if (reduced) {
      // Reduced motion: a keyboard or tap activation switches the card and holds it until the page is in its range.
      // The crossfade is 2 x T.half (0.7 s). The check polls for the switch to land, up to 2.5 s.
      activate(0, 'key');
      await until(() => blockDeviation(snapshot().blocks, formationXYZ('cap-0', portrait)).ok, 2500);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
      check(`${label}: activation switches to card 1 and holds`, bd.ok && sameGroup(s.group, [0, 1, 2, 3, 4]), `block ${fmt(bd.worst)}`);
      await goto(3.1, POSE_FRAMES);
      await waitMs(900);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
      check(`${label}: landing in card 1 keeps cap-0`, bd.ok, `block ${fmt(bd.worst)}`);

      // Hover lifts are off under reduced motion.
      await goto(4.0, POSE_FRAMES);
      hover(1);
      await frames(LIFT_FRAMES);
      s = snapshot();
      bd = blockDeviation(s.blocks, formationXYZ('cap-1', portrait));
      check(`${label}: no hover lift`, bd.ok, `block ${fmt(bd.worst)}`);
      hover(null);
    }
  }

  // Unit checks first, with no choreography running. Then the choreography runs for the scroll checks.
  if (!reduced) {
    choreo.dispose();
    await unitEntry();
    choreo = initChoreo(world, [speedGL, capabilitiesGL]);
  }

  // Registration (once, on the desktop run).
  if (!reduced) {
    const c = capabilitiesGL;
    check(
      'export: id, formation, exit, key, ink, dof, breath and setup',
      c.id === 'capabilities' &&
        c.formation === 'cap-0' &&
        c.exitFormation === 'cap-2' &&
        c.key === 'hero' &&
        c.ink === 1 &&
        c.dof === null &&
        c.breath?.phase === 'rows' &&
        c.breath.amplitude === 0.012 &&
        typeof c.setup === 'function',
    );
  }

  await scrollChecks();

  // Dispose (checks-only load, ?dispose): the layer stops listening and writes nothing further. The screenshot load
  // keeps the choreography running, so its states are live.
  if (new URLSearchParams(location.search).has('dispose')) {
    choreo.dispose();
    const before = snapshot();
    activate(0, 'key');
    hover(2);
    await frames(60);
    const after = snapshot();
    const moved = before.blocks.some((p, i) => Math.abs(p[0] - after.blocks[i][0]) + Math.abs(p[2] - after.blocks[i][2]) > 1e-4);
    check(`${label}: dispose stops the layer`, !moved, moved ? 'blocks moved after dispose' : '');
  }

  const failed = report.failures.length > 0 || report.diagnostics.length > 0;
  const reason = [...report.failures, ...report.diagnostics].join(' | ');
  (window as HarnessWindow).__capReport = report;
  root.dataset.harness = failed ? `fail:${reason.slice(0, 900)}` : 'pass';
  console.log(`harness ${label}: ${report.passes.length} passed, ${report.failures.length} failed, ${report.diagnostics.length} diagnostics`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  root.dataset.harness = `fail:${message}`;
  console.error(err);
});
