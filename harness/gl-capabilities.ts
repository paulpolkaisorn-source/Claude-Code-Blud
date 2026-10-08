// Harness for the capabilities section's 3D layer, src/sections/capabilities/gl.ts (architecture section 10a). The page
// has three sections in order (speed, capabilities, pricing) with the real heights of act II, and the real choreography
// (src/choreo/timeline.ts) runs over the speed and capabilities layers. Scroll is set through scrollState, so the
// choreography computes the progress it passes to each handle, exactly as on the page: the centre-line progress of
// act rule C2 for capabilities (p = (Y / vh - 2.5) / 3 with Y the scroll position in viewport heights).
// Checks, each against the formulas of direction-act2 section 12 and direction-3d 10.6 and 11.4 to 11.6:
//   desktop (1440 by 900) and phone (375 by 812): the entry from the race at p 0, its midpoint and its end; the card
//   rests at p 0.2, 0.5 and 0.9 with their groups; the blend band at p 1/3; the hover lift; the keyboard or tap activation
//   as a timed move that lands on cap-2 and is held; a wheel input that ends the hold; the activating key input that
//   does not end it; the release by landing; the phone camera.
//   reduced motion: no entry blend, discrete card changes with the canvas crossfade of C14, no hover lift, the hold.
// The verdict is document.documentElement.dataset.harness: 'pass' or 'fail:<reason>'. window.__capHarness drives the
// states that the screenshot driver (a Playwright script kept outside the repository) captures.
import { gsap } from 'gsap';
import { ef } from '../src/core/ease';
import { env } from '../src/core/env';
import { initChoreo } from '../src/choreo/timeline';
import type { FormationId } from '../src/core/types';
import { scrollState } from '../src/core/scroll';
import { initTicker } from '../src/core/ticker';
import { scrubLocal } from '../src/core/timing';
import { createWorld } from '../src/gl/boot';
import { BLOCK_COUNT, KIREJI, formationFor, staggerPosition, type Pose } from '../src/gl/blocks/formations';
import { cameraKey } from '../src/gl/rig';
import type { CameraKey, GLWorld, KeyName } from '../src/gl/section-gl';
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

/** The scrubbed blend between two sets of block positions at transition progress t (Sequence). */
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

/** The camera at rig.blend(from, to, u): ef.sym is applied by the rig. */
function blendCam(from: KeyName, to: KeyName, u: number, size: { width: number; height: number }): V3 {
  const a = keyXYZ(from, size);
  const b = keyXYZ(to, size);
  const k = ef.sym(u);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
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

  // The real choreography over the speed and capabilities layers. Its dispose stops the page's own choreography, which
  // boot started over every section layer.
  const choreo = initChoreo(world, [speedGL, capabilitiesGL]);

  const portrait = window.innerWidth < window.innerHeight;
  const reduced = env.reducedMotion;

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

  const size = viewport();
  const label = `${portrait ? 'phone' : 'desktop'}${reduced ? ' reduced' : ''}`;

  if (!reduced) {
    // Registration (once, on the desktop run).
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

    // Entry, p 0 to 1/6 (u = 6p). At p 0 the blocks are on the race and the camera on the speed key.
    await goto(2.5, 12);
    let s = snapshot();
    let bd = blockDeviation(s.blocks, expectRace(portrait));
    let cd = camDeviation(s.camera, keyXYZ('speed', size));
    check(`${label}: entry start, race and speed key`, bd.ok && cd.ok, `block ${fmt(bd.worst)} camera ${fmt(cd.worst)}`);

    // Midpoint, p 1/12, u 0.5: the scrubbed entry from the race to cap-0 and the camera half way.
    await goto(2.75, 12);
    s = snapshot();
    bd = blockDeviation(s.blocks, blendXYZ(expectRace(portrait), formationXYZ('cap-0', portrait), ef.sym(0.5), 'cap-0'));
    cd = camDeviation(s.camera, blendCam('speed', 'hero', 0.5, size));
    check(`${label}: entry midpoint, scrubbed race to cap-0`, bd.ok && cd.ok, `block ${fmt(bd.worst)} camera ${fmt(cd.worst)}`);

    // Card 1 at rest, p 0.2: cap-0 exactly, the active group is rows 0 to 4, and the hero key.
    await goto(3.1, POSE_FRAMES);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
    cd = camDeviation(s.camera, keyXYZ('hero', size));
    check(
      `${label}: card 1 rest on cap-0, group 0 to 4, hero key`,
      bd.ok && cd.ok && sameGroup(s.group, [0, 1, 2, 3, 4]),
      `block ${fmt(bd.worst)} camera ${fmt(cd.worst)} group ${String(s.group)}`,
    );

    // Blend band at the first boundary, p 1/3: the scrubbed blend from cap-0 to cap-1 at u 0.5.
    await goto(3.5, POSE_FRAMES);
    s = snapshot();
    bd = blockDeviation(s.blocks, blendXYZ(formationXYZ('cap-0', portrait), formationXYZ('cap-1', portrait), ef.sym(0.5), 'cap-1'));
    check(`${label}: band at p 1/3, blend cap-0 to cap-1`, bd.ok, `block ${fmt(bd.worst)}`);

    // Card 2 at rest, p 0.5: cap-1 exactly and group 5 to 11.
    await goto(4.0, POSE_FRAMES);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-1', portrait));
    check(`${label}: card 2 rest on cap-1, group 5 to 11`, bd.ok && sameGroup(s.group, [5, 6, 7, 8, 9, 10, 11]), `block ${fmt(bd.worst)} group ${String(s.group)}`);

    // Card 3 at rest, p 0.9: cap-2 with its stair, and group 12 to 16.
    await goto(5.2, POSE_FRAMES);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-2', portrait));
    check(`${label}: card 3 rest on cap-2 with the stair, group 12 to 16`, bd.ok && sameGroup(s.group, [12, 13, 14, 15, 16]), `block ${fmt(bd.worst)} group ${String(s.group)}`);

    if (portrait) {
      // Phone hero key: x 0, y -1.10, z 39.25 (direction-3d 10.6).
      await goto(3.1, POSE_FRAMES);
      s = snapshot();
      const phoneKey = keyXYZ('hero', size);
      cd = camDeviation(s.camera, phoneKey);
      check(`${label}: phone camera on the hero key (y -1.10)`, cd.ok && Math.abs(s.camera[1] + 1.1) < 0.01, `camera ${s.camera.map(fmt).join(', ')}`);
      // Phone entry midpoint: the turned race (D15.1) to cap-0.
      await goto(2.75, 12);
      s = snapshot();
      bd = blockDeviation(s.blocks, blendXYZ(expectRace(true), formationXYZ('cap-0', true), ef.sym(0.5), 'cap-0'));
      check(`${label}: entry midpoint from the turned race`, bd.ok, `block ${fmt(bd.worst)}`);
    }

    if (!portrait) {
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
  } else {
    // Reduced motion: the entry is not drawn (the section is not current), and each card is a discrete step.
    await goto(2.5, 12);
    let s = snapshot();
    let cd = camDeviation(s.camera, keyXYZ('speed', size));
    check(`${label}: entry not drawn before the section is current`, cd.ok, `camera ${fmt(cd.worst)}`);

    // Crossing into the section runs the choreography's own canvas crossfade (C14), about 0.7 s, before the commit.
    await goto(3.1, POSE_FRAMES);
    await waitMs(900);
    s = snapshot();
    let bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
    cd = camDeviation(s.camera, keyXYZ('hero', size));
    check(`${label}: card 1 at once on cap-0, hero key`, bd.ok && cd.ok, `block ${fmt(bd.worst)} camera ${fmt(cd.worst)}`);

    // No blend at the boundary: at p 0.3167 the card is still 1, and at 0.3667 card 2 appears after one crossfade.
    await goto(3.45, POSE_FRAMES);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-0', portrait));
    check(`${label}: no blend below the boundary`, bd.ok, `block ${fmt(bd.worst)}`);

    await goto(3.6, 1);
    await waitMs(150);
    const mid = snapshot();
    check(`${label}: card change fades the canvas out (C14)`, mid.opacity !== '' && Number(mid.opacity) < 0.95, `opacity '${mid.opacity}'`);
    await waitMs(900);
    s = snapshot();
    bd = blockDeviation(s.blocks, formationXYZ('cap-1', portrait));
    check(`${label}: card 2 after one crossfade, canvas back to 1`, bd.ok && s.opacity === '', `block ${fmt(bd.worst)} opacity '${s.opacity}'`);

    // A keyboard or tap activation under reduced motion switches the card and holds it until the page is in its range.
    // The crossfade is 2 x T.half (0.7 s). The check polls for the switch to land, up to 2.5 s, because frame time varies
    // with CPU contention (a fixed 0.9 s window missed the landing once under load).
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
