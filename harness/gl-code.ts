// Harness for src/sections/code/gl.ts (direction-act2.md section 12, code; direction-3d.md sections 10.6,
// 10.8, 10.12, 10.13 and 11.7). Open /harness/gl-code.html on the dev server.
//
// The page builds the GL world with the factories of src/gl/boot.ts, in the same order, and drives the
// code handle the way the choreography will: while the handle is active, every frame calls
// update(progress) with the progress the driver has set. The checks run on load and set
// dataset.harness to 'pass' or 'fail:<check ids>'. window.codeHarness lets the Playwright driver set the
// progress, read the group offset and count quality steps, and it takes the screenshots.
//
// Why the default build leaves out the quality watchdog. createWorld starts src/gl/quality.ts, which
// steps depth of field off (once, and for good) whenever the median frame time is above 18.5 ms. Under
// the software GL of this environment that happens within seconds, and boot has no switch for it, so
// the depth-of-field screenshots would lose their pass. The default build is createWorld without
// initQuality. ?boot runs createWorld itself, so the real boot path is checked too, and the quality
// steps it takes are reported.
import * as THREE from 'three';
import { ef } from '../src/core/ease';
import { bus } from '../src/core/bus';
import { env, onReducedMotionChange } from '../src/core/env';
import { initPointer } from '../src/core/pointer';
import { addTick, initTicker, PRIORITY, type Tick } from '../src/core/ticker';
import { T, scrubLocal } from '../src/core/timing';
import { createBackground } from '../src/gl/background/background';
import { createWorld } from '../src/gl/boot';
import { Blocks } from '../src/gl/blocks/blocks';
import { createBlockMaterial } from '../src/gl/blocks/material';
import { BLOCK_COUNT, FORMATIONS, STAGGER_ORDER, lerpPose, type Pose } from '../src/gl/blocks/formations';
import { createLighting } from '../src/gl/lighting';
import { createPost } from '../src/gl/post';
import { cameraKey, createRig } from '../src/gl/rig';
import type { GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { createStage } from '../src/gl/stage';
import { codeGL } from '../src/sections/code/gl';

interface CodeHarness {
  mode: 'manual' | 'boot';
  set(next: { s?: number; dof?: boolean; active?: boolean }): Promise<void>;
  groupOffset(): number[];
  env(): { finePointer: boolean; touch: boolean; reducedMotion: boolean; tier: string };
  qualitySteps(): number;
  consoleProblems(): string[];
}

declare global {
  interface Window {
    codeHarness: CodeHarness;
  }
}

const root = document.documentElement;
const bootMode = new URLSearchParams(window.location.search).has('boot');
const failed: string[] = [];
let passed = 0;
let skipped = 0;
let qualitySteps = 0;

// Every warning and error the page logs, including three's shader compile and link messages.
const consoleProblems: string[] = [];
for (const level of ['warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    consoleProblems.push(args.map((a) => String(a)).join(' '));
    original(...args);
  };
}

function check(id: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${id}${suffix}`);
  } else {
    failed.push(id);
    console.log(`FAIL ${id}${suffix}`);
  }
}

function skip(id: string, reason: string): void {
  skipped += 1;
  console.log(`SKIP ${id} :: ${reason}`);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Resolves after n frames have been drawn: a tick at glRender + 1 runs after the stage's draw. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const remove = addTick(() => {
      left -= 1;
      if (left > 0) return;
      remove();
      resolve();
    }, PRIORITY.glRender + 1);
  });
}

/** The GL world the way src/gl/boot.ts builds it, without the quality watchdog (see the header). */
function buildWorld(canvas: HTMLCanvasElement): GLWorld {
  const stage = createStage(canvas);
  const lighting = createLighting(stage);
  const background = createBackground(stage);
  const material = createBlockMaterial();
  const blocks = new Blocks(stage, material);
  const post = createPost(stage);
  const rig = createRig(stage);
  material.setQuality(env.tier);
  background.setQuality(env.tier);
  const applyReducedMotion = (rm: boolean): void => {
    blocks.setReducedMotion(rm);
    background.setReducedMotion(rm);
    post.setReducedMotion(rm);
  };
  applyReducedMotion(env.reducedMotion);
  onReducedMotionChange(applyReducedMotion);
  addTick((tick) => {
    background.update(tick);
    blocks.update(tick);
    rig.update(tick);
  }, PRIORITY.glUpdate);
  return { stage, blocks, material, lighting, background, post, rig };
}

const drive = { s: 0, active: false };

/** The capabilities section as the code section sees it: its exit is cap-2 and it rests on the hero key. */
const prev: SectionGL = {
  id: 'capabilities',
  formation: 'cap-0',
  exitFormation: 'cap-2',
  key: 'hero',
  ink: 1,
  dof: null,
  breath: null,
};

const ctx: SectionGLContext = {
  prev,
  portrait: false,
  reducedMotion: env.reducedMotion,
  size: { width: 1, height: 1 },
};

const scratchM = new THREE.Matrix4();
const expectM = new THREE.Matrix4();
const scratchP = new THREE.Vector3();
const scratchS = new THREE.Vector3();
const scratchQ = new THREE.Quaternion();
const scratchE = new THREE.Euler();

/** The instance matrix that a pose composes to, with no breath, lift or group offset. */
function expectedMatrix(pose: Pose, out: THREE.Matrix4): THREE.Matrix4 {
  scratchE.set(pose.r[0], pose.r[1], pose.r[2]);
  scratchQ.setFromEuler(scratchE);
  scratchP.set(pose.p[0], pose.p[1], pose.p[2]);
  scratchS.set(pose.s, pose.s, pose.s);
  return out.compose(scratchP, scratchQ, scratchS);
}

/** The largest element difference between block i's instance matrix and a pose. skipY ignores the y translation. */
function poseDiff(blocks: Blocks, i: number, pose: Pose, skipY: boolean): number {
  blocks.mesh.getMatrixAt(i, scratchM);
  expectedMatrix(pose, expectM);
  let worst = 0;
  for (let k = 0; k < 16; k += 1) {
    if (skipY && k === 13) continue;
    worst = Math.max(worst, Math.abs(scratchM.elements[k] - expectM.elements[k]));
  }
  return worst;
}

/** The largest poseDiff over the 17 blocks, against poses[i] of the given list. */
function worstDiff(blocks: Blocks, poses: readonly Pose[], skipY: boolean): number {
  let worst = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) worst = Math.max(worst, poseDiff(blocks, i, poses[i], skipY));
  return worst;
}

/** The largest y offset of any block from its recede pose: the breath, once it runs. */
function maxYOffset(blocks: Blocks, poses: readonly Pose[]): number {
  let worst = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    blocks.mesh.getMatrixAt(i, scratchM);
    worst = Math.max(worst, Math.abs(scratchM.elements[13] - poses[i].p[1]));
  }
  return worst;
}

/**
 * The expected entry poses at progress s, written from the curves of direction-act2 section 12 (code): t is
 * sym of s over 0.5, each block reads scrubLocal at its recede stagger position, the kireji uses anticipate
 * and the others settle. The stagger position comes from STAGGER_ORDER, not from staggerPosition.
 */
function expectedEntry(s: number): Pose[] {
  const t = ef.sym(clamp01(s / 0.5));
  const cap2 = FORMATIONS['cap-2'];
  const recede = FORMATIONS.recede;
  return Array.from({ length: BLOCK_COUNT }, (_, i) => {
    const position = STAGGER_ORDER.recede.indexOf(i);
    const local = scrubLocal(position, BLOCK_COUNT, t, { total: 0.35, lead: 0.1 });
    const curve = i === 4 ? ef.anticipate(local) : ef.settle(local);
    return lerpPose(cap2[i], recede[i], curve, { p: [0, 0, 0], r: [0, 0, 0], s: 1 });
  });
}

function dofConfig(): { focus: number; bokeh: number } {
  if (codeGL.dof === null) throw new Error('codeGL.dof is null');
  return codeGL.dof;
}

async function main(): Promise<void> {
  initTicker();
  initPointer();
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('harness: #gl canvas is missing');

  bus.on('quality', () => {
    qualitySteps += 1;
  });

  let world: GLWorld;
  if (bootMode) {
    const boot = createWorld(canvas);
    world = boot.world;
    await boot.compile();
  } else {
    world = buildWorld(canvas);
    await world.stage.renderer.compileAsync(world.stage.scene, world.stage.camera);
    await frames(1);
  }
  const { stage, blocks, post } = world;

  // The code section's ground and block mix (ink, m = 1), set the way the choreography sets them.
  blocks.setMix(1);
  world.lighting.setMix(1);
  post.setMix(1);
  world.background.setTheme('ink');

  const setupFn = codeGL.setup;
  if (setupFn === undefined) throw new Error('codeGL.setup is missing');
  const handle: SectionGLHandle = setupFn(world);

  // The driver tick. It runs before the blocks, rig and stage ticks of the same frame (glUpdate, glRender).
  addTick((tick: Tick) => {
    ctx.size.width = stage.size.width;
    ctx.size.height = stage.size.height;
    ctx.portrait = stage.size.width / stage.size.height < 1;
    if (drive.active) handle.update(drive.s, tick, ctx);
  }, PRIORITY.glUpdate - 1);

  function activate(on: boolean): void {
    drive.active = on;
    handle.setActive(on, ctx);
  }

  async function setState(next: { s?: number; dof?: boolean; active?: boolean }): Promise<void> {
    if (next.dof !== undefined) post.setDof(next.dof ? dofConfig() : null);
    if (next.s !== undefined) drive.s = clamp01(next.s);
    if (next.active !== undefined && next.active !== drive.active) activate(next.active);
    await frames(2);
  }

  window.codeHarness = {
    mode: bootMode ? 'boot' : 'manual',
    set: setState,
    groupOffset: () => [blocks.group.position.x, blocks.group.position.y, blocks.group.position.z],
    env: () => ({ finePointer: env.finePointer, touch: env.touch, reducedMotion: env.reducedMotion, tier: env.tier }),
    qualitySteps: () => qualitySteps,
    consoleProblems: () => consoleProblems.slice(),
  };

  const cap2 = FORMATIONS['cap-2'];
  const recede = FORMATIONS.recede;
  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });

  // Shape of the section's GL layer, as the directions set it.
  const dof = codeGL.dof;
  check(
    'shape: id, formation, key, ink, dof, breath, no exit formation',
    codeGL.id === 'code' &&
      codeGL.formation === 'recede' &&
      codeGL.key === 'hero' &&
      codeGL.ink === 1 &&
      dof !== null &&
      dof.focus === 21.15 &&
      dof.bokeh === 2 &&
      codeGL.breath !== null &&
      codeGL.breath.amplitude === 0.012 &&
      codeGL.breath.phase === 'rows' &&
      codeGL.exitFormation === undefined &&
      typeof codeGL.setup === 'function',
  );

  if (env.reducedMotion) {
    // Reduced motion: the recede is complete at once, with no breath, whatever the progress.
    skip('entry and mid-entry checks', 'reduced motion run');
    await setState({ active: true, s: 0, dof: true });
    check(
      'reduced motion: p 0 is already the recede pose',
      worstDiff(blocks, recede, false) < 1e-4,
      `worst ${worstDiff(blocks, recede, false).toExponential(2)}`,
    );
    await delay(T.hold + 0.8);
    check(
      'reduced motion: no breath after the hold',
      maxYOffset(blocks, recede) < 1e-6,
      `max y offset ${maxYOffset(blocks, recede).toExponential(2)}`,
    );
  } else {
    // Entry start: the cap-2 exit pose, stair included (direction-3d 11.6), held by the camera at the hero key.
    await setState({ active: true, s: 0, dof: true });
    const startWorst = worstDiff(blocks, cap2, false);
    check('entry start: p 0 is the cap-2 exit pose with its stair', startWorst < 1e-4, `worst ${startWorst.toExponential(2)}`);

    // Mid-entry at p 0.25: the kireji on anticipate, the others on settle, in the recede order.
    await setState({ s: 0.25 });
    const mid = expectedEntry(0.25);
    const midWorst = worstDiff(blocks, mid, false);
    check('mid-entry: p 0.25 matches the anticipate and settle curves', midWorst < 1e-4, `worst ${midWorst.toExponential(2)}`);

    // Lead: at p 0.1 the kireji (position 0) has moved and the last block in the order (position 16) has not.
    await setState({ s: 0.1 });
    const kiMoved = poseDiff(blocks, 4, cap2[4], false);
    const lastStill = poseDiff(blocks, 16, cap2[16], false);
    check(
      'lead: at p 0.1 the kireji has moved and block 16 has not',
      kiMoved > 1e-3 && lastStill < 1e-6,
      `block 4 moved ${kiMoved.toExponential(2)}, block 16 moved ${lastStill.toExponential(2)}`,
    );

    // Rest at p 0.5: the recede pose. The y translation may carry the breath, checked separately below.
    await setState({ s: 0.5 });
    const restWorst = worstDiff(blocks, recede, true);
    check('rest: p 0.5 is the recede pose (x, z, scale and yaw)', restWorst < 1e-4, `worst ${restWorst.toExponential(2)}`);
    const restY = maxYOffset(blocks, recede);
    check('rest: y offset within the breath amplitude', restY <= 0.0125, `max ${restY.toExponential(3)}`);

    // Breath: starts T.hold after the recede arrives, at 0.012 bu, with the row phases. Its gain eases on the
    // clamped tick dt, so the check waits for frames rather than seconds, and keeps the largest offset seen.
    await delay(T.hold + 0.5);
    await frames(30);
    let breathY = 0;
    for (let k = 0; k < 20; k += 1) {
      await frames(1);
      breathY = Math.max(breathY, maxYOffset(blocks, recede));
    }
    check(
      'breath: runs after the hold, within 0.012 bu',
      breathY > 0.005 && breathY <= 0.0125,
      `largest y offset ${breathY.toFixed(5)}`,
    );

    // Camera: the hero keyframe, held through the section (C6, direction-3d 10.6).
    const want = cameraKey('hero', size());
    const cam = stage.camera;
    const camDiff = Math.max(
      Math.abs(cam.position.x - want.position[0]),
      Math.abs(cam.position.y - want.position[1]),
      Math.abs(cam.position.z - want.position[2]),
    );
    check(
      'camera: holds the hero keyframe',
      camDiff < 1e-4 && cam.fov === want.fov,
      `position (${cam.position.x.toFixed(3)}, ${cam.position.y.toFixed(3)}, ${cam.position.z.toFixed(3)}) fov ${cam.fov}`,
    );

    // Back to rest without breath for the pointer and screenshot checks below.
    await setState({ s: 0.5 });
  }

  // Environment notices of the software GL (SwiftShader) are excluded by name: its ReadPixels stall notice, and
  // three's warnOnce for KHR_parallel_shader_compile, which the software GL does not offer. Any other warning
  // or error, shader or otherwise, fails the run.
  const environmentNotice = /GPU stall due to ReadPixels|KHR_parallel_shader_compile extension not supported/;
  const unexplained = consoleProblems.filter((m) => !environmentNotice.test(m));
  check(
    'console: no warning or error besides the software GL notices',
    unexplained.length === 0,
    unexplained.slice(0, 3).join(' | '),
  );

  const failures = failed.length === 0 ? 'pass' : `fail:${failed.join(', ')}`;
  console.log(`harness: ${passed} passed, ${failed.length} failed, ${skipped} skipped (mode ${bootMode ? 'boot' : 'manual'})`);
  root.dataset.harness = failures;
}

main().catch((err: unknown) => {
  console.error('harness error', err);
  root.dataset.harness = `fail:harness-error ${String(err)}`;
});
