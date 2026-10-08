// Harness for src/gl/blocks/blocks.ts (architecture section 10a). The blocks draw through the real stage, the
// real lighting (createLighting: key, rim and fill lights, RoomEnvironment through PMREM, shadow catcher) and
// the real block material. Synchronous checks run first: one draw call, scrubbed transitions at t 0 and t 1
// read back from the instance matrices, projected rectangles against a direct projection, lifts, tilt, group
// offset, breath phases, active groups, reduced motion, entrance, colours, dispose, and a heap check over 600
// update() calls. Then a ticker-driven sequence (stanza, half, race, column, ink) takes canvas snapshots into
// window.__blocksShots. The verdict goes to document.documentElement.dataset.harness.
import * as THREE from 'three';
import { PRIORITY, addTick, initTicker, type Tick } from '../src/core/ticker';
import { T } from '../src/core/timing';
import { createLighting } from '../src/gl/lighting';
import { createStage } from '../src/gl/stage';
import { createBlockMaterial } from '../src/gl/blocks/material';
import { Blocks } from '../src/gl/blocks/blocks';
import { BLOCK, BLOCK_COUNT, FORMATIONS, KIREJI, formationFor, type Pose } from '../src/gl/blocks/formations';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
}

interface HarnessWindow extends Window {
  __blocksShots?: Record<string, string>;
  __blocksReport?: Report;
}

const root = document.documentElement;
const FRAME = 1 / 60;
const VIEW = { width: 1440, height: 900 }; // the driver's viewport
const HERO = { x: -2.89, z: 21.15 }; // direction-3d 10.6, desktop hero keyframe
const SPEED = { x: 0, z: 31.95 }; // speed keyframe: the race fills 0.80 of the width
const CLOSING = { x: -2.0, z: 14.6 }; // closing keyframe: the column fills 0.80 of the height
const AMP = 0.012; // idle breath amplitude, bu (10.12)
const TILT = 0.035; // tilt cap, rad (10.13)
const MEGABYTE = 1048576;

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

// Errors and warnings are recorded as well as shown, so the verdict can count them.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    report.diagnostics.push(`${level}: ${args.map((a) => String(a)).join(' ')}`);
    original(...args);
  };
}

type Quad = [number, number, number, number];

/** Screen rectangle of a box, projected corner by corner with Vector3.project. group maps the box into the scene. */
function directRect(
  centre: readonly number[],
  size: readonly number[],
  group: THREE.Matrix4,
  camera: THREE.Camera,
): Quad {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let c = 0; c < 8; c += 1) {
    const corner = new THREE.Vector3(
      centre[0] + ((c & 1) !== 0 ? size[0] / 2 : -size[0] / 2),
      centre[1] + ((c & 2) !== 0 ? size[1] / 2 : -size[1] / 2),
      centre[2] + ((c & 4) !== 0 ? size[2] / 2 : -size[2] / 2),
    )
      .applyMatrix4(group)
      .project(camera);
    const x = (corner.x * 0.5 + 0.5) * VIEW.width;
    const y = (0.5 - corner.y * 0.5) * VIEW.height;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

/** The instance matrices a set of poses should produce, rounded to float32 as the GPU buffer holds them. */
function referenceMatrices(poses: readonly Pose[]): Float32Array {
  const out = new Float32Array(BLOCK_COUNT * 16);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  poses.forEach((pose, i) => {
    e.set(pose.r[0], pose.r[1], pose.r[2]);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(pose.p[0], pose.p[1], pose.p[2]), q, new THREE.Vector3(pose.s, pose.s, pose.s));
    out.set(m.elements, i * 16);
  });
  return out;
}

function sameFloats(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k += 1) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function sameColour(a: THREE.Color, b: THREE.Color): boolean {
  return Math.abs(a.r - b.r) < 1e-6 && Math.abs(a.g - b.g) < 1e-6 && Math.abs(a.b - b.b) < 1e-6;
}

function main(): void {
  initTicker();
  const element = document.getElementById('gl');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the #gl canvas is missing');
  const canvas: HTMLCanvasElement = element;
  const stage = createStage(canvas);
  const { renderer, scene, camera } = stage;
  const lighting = createLighting(stage);
  const mat = createBlockMaterial();
  const blocks = new Blocks(stage, mat);
  const mesh = blocks.mesh;
  addTick((t) => blocks.update(t), PRIORITY.glUpdate);

  // A synthetic clock for the checks. Each frame is 1/60 s, applied through the same update() the page uses.
  const tick: Tick = { time: 0, dt: 0, frame: 0 };
  let clock = 0;
  const advance = (frames: number): void => {
    for (let n = 0; n < frames; n += 1) {
      clock += FRAME;
      tick.time = clock;
      tick.dt = FRAME;
      tick.frame += 1;
      blocks.update(tick);
    }
  };
  const aim = (k: { x: number; z: number }): void => {
    camera.position.set(k.x, 0, k.z);
    camera.lookAt(k.x, 0, 0);
  };
  const el = (i: number, k: number): number => mesh.instanceMatrix.array[i * 16 + k];
  const readBack = (): Float32Array => new Float32Array(mesh.instanceMatrix.array);
  const colourOf = (i: number): THREE.Color => {
    const attr = mesh.instanceColor;
    if (attr === null) throw new Error('the instance colours are missing');
    return new THREE.Color(attr.getX(i), attr.getY(i), attr.getZ(i));
  };
  const smearUniform = (): number | undefined => {
    const shader = mat.material.userData.shader as { uniforms: { uSmear: { value: number } } } | undefined;
    return shader?.uniforms.uSmear.value;
  };
  /** Returns every state to the stanza at rest, and lets the damped values settle. */
  const rest = (): void => {
    blocks.setBreath(null);
    blocks.setActiveGroup(null);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      blocks.setLift(i, 0, 0);
      blocks.setEntrance(i, 1);
    }
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
    blocks.setSmear(0);
    blocks.setMix(0);
    blocks.setPoses(FORMATIONS.stanza);
    advance(600);
  };

  // Structure and flags.
  aim(HERO);
  check('the mesh holds 17 instances', mesh.count === BLOCK_COUNT, `count=${mesh.count}`);
  check(
    'castShadow on, receiveShadow off, frustumCulled off',
    mesh.castShadow && !mesh.receiveShadow && !mesh.frustumCulled,
  );
  const finishAttr = mesh.geometry.getAttribute('aFinish');
  let finishOk = finishAttr instanceof THREE.InstancedBufferAttribute && finishAttr.count === BLOCK_COUNT;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    if (finishAttr.getX(i) !== (i === KIREJI ? 1 : 0)) finishOk = false;
  }
  check('aFinish is an instanced attribute, 1 on index 4 and 0 elsewhere', finishOk);

  // One draw call. Shadows and the catcher are off for the count, so only the blocks are drawn.
  renderer.shadowMap.enabled = false;
  lighting.catcher.visible = false;
  renderer.render(scene, camera);
  const calls = renderer.info.render.calls;
  lighting.catcher.visible = true;
  renderer.shadowMap.enabled = true;
  check('the 17 blocks draw in one call (shadows and catcher off for the count)', calls === 1, `render.calls=${calls}`);

  // Scrubbed transitions, read back from the instance matrices.
  const stanzaRef = referenceMatrices(FORMATIONS.stanza);
  const raceRef = referenceMatrices(FORMATIONS.race);
  const columnRef = referenceMatrices(FORMATIONS.column);
  blocks.setTransition('stanza', 'race', 0, false);
  advance(1);
  check('scrubbed transition at t 0 equals the from formation (instance matrices, exact)', sameFloats(readBack(), stanzaRef));
  blocks.setTransition('stanza', 'race', 0.5, false);
  advance(1);
  const half = readBack();
  check(
    'at t 0.5 the blocks are neither the from nor the to formation',
    !sameFloats(half, stanzaRef) && !sameFloats(half, raceRef),
  );
  blocks.setTransition('stanza', 'race', 1, false);
  advance(1);
  check('scrubbed transition at t 1 equals the to formation (exact)', sameFloats(readBack(), raceRef));
  blocks.setTransition('race', 'column', 1, false);
  advance(1);
  check('race to column at t 1 equals the column formation (exact)', sameFloats(readBack(), columnRef));
  blocks.setTransition('stanza', 'race', 1, true);
  advance(1);
  check(
    'portrait race (turned, D15.1) equals its portrait formation (exact)',
    sameFloats(readBack(), referenceMatrices(formationFor('race', true))),
  );
  blocks.setPoses(FORMATIONS.stanza);
  advance(1);
  check('setPoses writes the poses directly (exact)', sameFloats(readBack(), stanzaRef));

  // Projected rectangles.
  camera.updateMatrixWorld();
  const rects = new Float32Array(BLOCK_COUNT * 4);
  blocks.projectRects(camera, VIEW, rects);
  let inside = true;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const x0 = rects[i * 4];
    const y0 = rects[i * 4 + 1];
    const x1 = rects[i * 4 + 2];
    const y1 = rects[i * 4 + 3];
    if (!(x0 >= 0 && y0 >= 0 && x1 <= VIEW.width && y1 <= VIEW.height && x1 > x0 && y1 > y0)) inside = false;
  }
  check('projectRects gives 17 rectangles inside the 1440 by 900 viewport for the stanza', inside);
  const size = [BLOCK.width, BLOCK.height, BLOCK.depth];
  const block2 = directRect(FORMATIONS.stanza[2].p, size, new THREE.Matrix4(), camera);
  let worst = 0;
  for (let k = 0; k < 4; k += 1) worst = Math.max(worst, Math.abs(rects[8 + k] - block2[k]));
  check(
    'block 2 rectangle matches a direct projection of its eight corners (0.01 px)',
    worst < 0.01,
    `max diff=${worst.toFixed(5)} px`,
  );
  blocks.setGroupOffset(0.5, -0.25, 0.1);
  blocks.setTilt(1, 1);
  advance(600);
  blocks.projectRects(camera, VIEW, rects);
  const groupMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(0.5, -0.25, 0.1),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-TILT, TILT, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  const moved = directRect(FORMATIONS.stanza[2].p, size, groupMatrix, camera);
  let worstMoved = 0;
  for (let k = 0; k < 4; k += 1) worstMoved = Math.max(worstMoved, Math.abs(rects[8 + k] - moved[k]));
  check(
    'with tilt and group offset the rectangles follow the group (0.01 px)',
    worstMoved < 0.01,
    `max diff=${worstMoved.toFixed(5)} px`,
  );
  check(
    'tilt caps at 0.035 rad and the offset settles on its target',
    Math.abs(blocks.group.rotation.x + TILT) < 1e-9 &&
      Math.abs(blocks.group.rotation.y - TILT) < 1e-9 &&
      Math.abs(blocks.group.position.x - 0.5) < 1e-9 &&
      Math.abs(blocks.group.position.y + 0.25) < 1e-9 &&
      Math.abs(blocks.group.position.z - 0.1) < 1e-9,
  );
  blocks.setGroupOffset(0, 0, 0);
  blocks.setTilt(0, 0);
  advance(600);

  // Lifts: block 0 lifts 0.2 bu on y and 0.1 on z, damped with T.half. After 1 s the lift is 1 - e^(-1/0.35) short.
  blocks.setLift(0, 0.2, 0.1);
  advance(60);
  const remaining = 1 - Math.exp(-1 / T.half);
  check(
    'a lift eases in with T.half (after 1 s it is at 1 - e^(-1/0.35) of its target)',
    Math.abs(el(0, 13) - (1.05 + 0.2 * remaining)) < 1e-5 && Math.abs(el(0, 14) - 0.1 * remaining) < 1e-5,
    `y=${el(0, 13).toFixed(6)} z=${el(0, 14).toFixed(6)}`,
  );
  blocks.setLift(0, 0, 0);
  advance(600);
  check('the lift returns to rest exactly', sameFloats(readBack(), stanzaRef));

  // Breath: nothing moves during the hold, then each pattern moves its blocks as direction 10.12 gives.
  const expectY = (base: number, phase: number, now: number): number =>
    base + AMP * Math.sin((2 * Math.PI * now) / T.breath + phase);
  blocks.setBreath({ amplitude: AMP, phase: 'rows' });
  advance(1);
  advance(30);
  check('no breath during the T.hold after a breath request', sameFloats(readBack(), stanzaRef));
  advance(570);
  const rowsNow = clock;
  check(
    'rows: each row breathes at its own phase once it is up (0, 0.4 pi, 0.8 pi)',
    Math.abs(el(0, 13) - expectY(1.05, 0, rowsNow)) < 1e-5 &&
      Math.abs(el(5, 13) - expectY(0, 0.4 * Math.PI, rowsNow)) < 1e-5 &&
      Math.abs(el(12, 13) - expectY(-1.05, 0.8 * Math.PI, rowsNow)) < 1e-5,
  );
  blocks.setBreath({ amplitude: AMP, phase: 'wave' });
  advance(600);
  const waveNow = clock;
  check(
    'wave: block k follows A sin(omega t - 0.2 k) (k = 0, 8, 16)',
    Math.abs(el(0, 13) - expectY(1.05, 0, waveNow)) < 1e-5 &&
      Math.abs(el(8, 13) - expectY(0, -0.2 * 8, waveNow)) < 1e-5 &&
      Math.abs(el(16, 13) - expectY(-1.05, -0.2 * 16, waveNow)) < 1e-5,
  );
  blocks.setBreath({ amplitude: AMP, phase: 'zero' });
  advance(600);
  const zeroNow = clock;
  check(
    'zero: every block has phase 0 (blocks 5 and 16)',
    Math.abs(el(5, 13) - expectY(0, 0, zeroNow)) < 1e-5 && Math.abs(el(16, 13) - expectY(-1.05, 0, zeroNow)) < 1e-5,
  );
  // A call that changes nothing must not pause a running breath: no new hold, no dip.
  blocks.setReducedMotion(false);
  advance(60);
  const undisturbedNow = clock;
  check(
    'a repeated setReducedMotion(false) does not interrupt the breath',
    Math.abs(el(5, 13) - expectY(0, 0, undisturbedNow)) < 1e-5,
    `y5=${el(5, 13).toFixed(6)}`,
  );
  blocks.setActiveGroup([5, 6, 7, 8, 9, 10, 11]);
  blocks.setBreath({ amplitude: AMP, phase: 'rows' });
  advance(600);
  const activeNow = clock;
  check(
    'an active group: row A and row C hold still, row B breathes',
    Math.abs(el(0, 13) - 1.05) < 1e-6 &&
      Math.abs(el(12, 13) + 1.05) < 1e-6 &&
      Math.abs(el(5, 13) - expectY(0, 0.4 * Math.PI, activeNow)) < 1e-5,
  );
  blocks.setActiveGroup(null);
  blocks.setBreath(null);
  advance(6);
  const stopNow = clock;
  check(
    'breath off eases out over T.half: 0.1 s after the stop, block 5 is at e^(-0.1/0.35) of its offset',
    Math.abs(el(5, 13) - AMP * Math.exp(-0.1 / T.half) * Math.sin((2 * Math.PI * stopNow) / T.breath + 0.4 * Math.PI)) <
      1e-5,
    `y5=${el(5, 13).toFixed(6)}`,
  );
  advance(600);
  check('breath off: every block returns exactly to the stanza', sameFloats(readBack(), stanzaRef));

  // Reduced motion holds breath, tilt, lifts, group offset and smear at 0.
  blocks.setBreath({ amplitude: AMP, phase: 'rows' });
  blocks.setLift(0, 0.2, 0.1);
  blocks.setTilt(1, 1);
  blocks.setGroupOffset(0.5, 0, 0);
  blocks.setSmear(0.6);
  advance(600);
  check(
    'before reduced motion the breath, lift, tilt and offset all move',
    !sameFloats(readBack(), stanzaRef) && blocks.group.rotation.y > 0.03 && blocks.group.position.x > 0.4,
  );
  blocks.setReducedMotion(true);
  blocks.setSmear(0.6);
  advance(60);
  check(
    'reduced motion holds breath, lifts, tilt and group offset at 0 (exact)',
    sameFloats(readBack(), stanzaRef) &&
      blocks.group.rotation.x === 0 &&
      blocks.group.rotation.y === 0 &&
      blocks.group.position.x === 0 &&
      blocks.group.position.z === 0,
  );
  check('reduced motion holds the smear at 0, including a new request', smearUniform() === 0, `uSmear=${String(smearUniform())}`);
  blocks.setReducedMotion(false);
  advance(30);
  check('leaving reduced motion holds the breath for T.hold again (block 5 at rest)', el(5, 13) === 0, `y5=${el(5, 13)}`);
  check('leaving reduced motion restores the smear request (0.6)', smearUniform() === 0.6, `uSmear=${String(smearUniform())}`);
  rest();

  // Entrance: scales block 0 in place to half size, and leaves block 1 alone.
  blocks.setEntrance(0, 0.5);
  advance(1);
  const scale0 = Math.hypot(el(0, 0), el(0, 1), el(0, 2));
  const scale1 = Math.hypot(el(1, 0), el(1, 1), el(1, 2));
  check(
    'entrance 0.5 scales block 0 in place, and block 1 is untouched',
    Math.abs(scale0 - 0.5) < 1e-6 &&
      Math.abs(scale1 - 1) < 1e-6 &&
      Math.abs(el(0, 12) + 1.74) < 1e-6 &&
      Math.abs(el(0, 13) - 1.05) < 1e-6,
    `scale0=${scale0.toFixed(6)} scale1=${scale1.toFixed(6)}`,
  );
  blocks.setEntrance(0, 1);
  advance(1);

  // Colours: linear lerps between the paper and ink values, with the kireji on its own pair.
  const anodized = new THREE.Color(0x2b2a26);
  const steel = new THREE.Color(0xbdb7a9);
  const seal = new THREE.Color(0xb5312a);
  const sealInk = new THREE.Color(0xe7735f);
  blocks.setMix(1);
  check(
    'm 1: blocks #BDB7A9 and the kireji #E7735F (linear)',
    sameColour(colourOf(0), steel) && sameColour(colourOf(KIREJI), sealInk),
  );
  blocks.setMix(0.5);
  check(
    'm 0.5: the linear midpoints of both pairs',
    sameColour(colourOf(0), anodized.clone().lerp(steel, 0.5)) &&
      sameColour(colourOf(KIREJI), seal.clone().lerp(sealInk, 0.5)),
  );
  blocks.setMix(0);
  check(
    'm 0: blocks #2B2A26 and the kireji #B5312A (linear)',
    sameColour(colourOf(0), anodized) && sameColour(colourOf(KIREJI), seal),
  );
  check('the material follows the mix (metalness 0.35 at m 0)', Math.abs(mat.material.metalness - 0.35) < 1e-9);

  // Dispose: a second Blocks leaves the scene on dispose, twice safely, and its update is then inert.
  const extra = new Blocks(stage, mat);
  check('a second Blocks adds its group to the stage scene', scene.children.includes(extra.group));
  extra.dispose();
  extra.dispose();
  extra.update(tick);
  check(
    'dispose removes the group from the stage scene, is safe twice, and leaves update inert',
    !scene.children.includes(extra.group),
  );

  // Allocation: update() with every layer active. The JS heap must not grow by a megabyte over 600 frames.
  blocks.setBreath({ amplitude: AMP, phase: 'rows' });
  blocks.setTilt(0.5, 0.5);
  blocks.setLift(4, 0.1, 0.05);
  blocks.setGroupOffset(0.1, 0.1, 0);
  blocks.setSmear(0.3);
  advance(120);
  const collect = (globalThis as unknown as { gc?: () => void }).gc;
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  collect?.();
  const heapBefore = memory?.usedJSHeapSize;
  advance(600);
  collect?.();
  const heapAfter = memory?.usedJSHeapSize;
  if (heapBefore === undefined || heapAfter === undefined) {
    console.log('SKIP update allocation: performance.memory is not available in this browser');
  } else {
    const grew = heapAfter - heapBefore;
    check(
      'update() over 600 frames grows the JS heap by less than 1 MB',
      grew < MEGABYTE,
      `delta=${grew} bytes${collect === undefined ? ' (no gc hook)' : ' after gc'}`,
    );
  }
  rest();

  // The ticker-driven sequence. A blank frame (blocks hidden) is the reference for "drawn".
  blocks.group.visible = false;
  renderer.render(scene, camera);
  const blank = canvas.toDataURL('image/png');
  blocks.group.visible = true;

  interface Step {
    name: string;
    hold: number;
    apply: () => void;
  }
  const steps: Step[] = [
    {
      name: 'stanza',
      hold: 3,
      apply: () => {
        aim(HERO);
        blocks.setPoses(FORMATIONS.stanza);
      },
    },
    {
      name: 'half',
      hold: 3,
      apply: () => {
        aim(HERO);
        blocks.setTransition('stanza', 'race', 0.5, false);
      },
    },
    {
      name: 'race',
      hold: 3,
      apply: () => {
        aim(SPEED);
        blocks.setTransition('stanza', 'race', 1, false);
      },
    },
    {
      name: 'column',
      hold: 3,
      apply: () => {
        aim(CLOSING);
        blocks.setTransition('race', 'column', 1, false);
      },
    },
    {
      name: 'ink',
      hold: 3,
      apply: () => {
        renderer.setClearColor(0x151512, 1);
        blocks.setMix(1);
        lighting.setMix(1);
      },
    },
  ];
  const shots: Record<string, string> = {};
  const captured: string[] = [];
  let index = 0;
  let entered = false;
  let held = 0;
  let finished = false;

  function finish(): void {
    finished = true;
    const sequenceOk = captured.length === steps.length;
    check('the sequence captured every state', sequenceOk, `captured=${captured.join(',')}`);
    for (const name of captured) {
      check(`the ${name} frame is drawn (differs from the blank frame)`, shots[name] !== blank);
    }
    const pairs: Array<[string, string]> = [
      ['stanza', 'half'],
      ['half', 'race'],
      ['race', 'column'],
      ['column', 'ink'],
    ];
    for (const [a, b] of pairs) {
      check(`the ${b} frame differs from the ${a} frame`, shots[a] !== undefined && shots[a] !== shots[b]);
    }
    const win = window as HarnessWindow;
    win.__blocksShots = shots;
    win.__blocksReport = report;
    const problems = [...report.failures, ...report.diagnostics];
    root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;
  }

  // Runs after the frame has rendered (PRIORITY.glRender is 40): a step holds for three frames, then the
  // canvas is read in the same task, while its drawing buffer still holds that frame.
  let sequenceRunning = false;
  const sequence = (): void => {
    if (!sequenceRunning || finished) return;
    const step = steps[index];
    if (!entered) {
      step.apply();
      entered = true;
      held = 0;
      return;
    }
    held += 1;
    if (held < step.hold) return;
    shots[step.name] = canvas.toDataURL('image/png');
    captured.push(step.name);
    index += 1;
    entered = false;
    if (index === steps.length) finish();
  };
  addTick(sequence, PRIORITY.glRender + 1);
  sequenceRunning = true;
}

try {
  main();
} catch (err) {
  const reason = err instanceof Error ? err.message : String(err);
  check('the harness ran to the end', false, reason);
  root.dataset.harness = `fail:${report.failures.join('; ')}`;
}
