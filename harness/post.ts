// Harness for src/gl/post.ts and src/gl/effects/grain.ts (design/direction-3d.md sections 10.1 and
// 10.8). Open /harness/post.html on the dev server. The page builds the real stage and post chain,
// runs its checks and sets dataset.harness to 'pass' or 'fail:<check ids>'.
//
// Screenshots. The page sets dataset.harnessShot to a name and waits until the driver writes
// dataset.harnessShotAck with the same name, so each picture is taken in the state the page holds.
//
// Readbacks. The composer's draw is wrapped so that a pending read is queued right after the final
// pass has written the default framebuffer, which then holds the composed frame. Each read goes to a
// pixel-pack buffer with a fence, and the bytes are copied out once the GPU has signalled it. The
// colour checks turn the grain off (amplitude 0, dither off) where the stated test needs it, and
// restore it afterwards.
//
// The verdict also fails on any console warning or error logged while the page runs, so a shader
// compile message from three or from the library fails the harness.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  Effect,
  EffectPass,
  RenderPass,
  type Pass,
} from 'postprocessing';
import { addTick, initTicker } from '../src/core/ticker';
import { GRAIN_AMP_M0, GRAIN_AMP_M1, GRAIN_SEED_STATIC, GrainEffect } from '../src/gl/effects/grain';
import { createPost, type Post } from '../src/gl/post';
import { createStage, type Stage } from '../src/gl/stage';

const root = document.documentElement;
const LAST = 1000;
const WAIT_MS = 60000;
const PAPER_HEX = '#F1ECE0';
const PAPER_RGB = [241, 236, 224] as const;
const DOF_FOCUS = 21.15;
const DOF_BOKEH = 2;

// Block layout of the stanza (design/direction-3d.md section 10.2 and 11.2). Row B is pushed 5 bu
// behind the focus plane, so the depth of field has something to blur. The camera stays where the
// stage puts it, at z 21.15.
const BLOCK = { width: 0.7, height: 0.7, depth: 0.46, radius: 0.035, segments: 3 } as const;
const ROWS = [5, 7, 5] as const;
const ROW_Y = [1.05, 0, -1.05] as const;
const ROW_Z = [0, -5, 0] as const;
const PITCH = 0.87;

const failed: string[] = [];
let passed = 0;

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

// Every warning and error the page logs, including three's shader messages.
const problems: string[] = [];
for (const level of ['warn', 'error'] as const) {
  const real = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    problems.push(`${level}: ${args.map((a) => String(a)).join(' ')}`);
    real(...args);
  };
}

/** Resolves after n page-clock ticks. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const off = addTick(() => {
      seen += 1;
      if (seen >= n) {
        off();
        resolve();
      }
    }, LAST);
  });
}

/** Resolves true once done() holds (checked on each tick), or false after ms milliseconds. */
function waitFor(done: () => boolean, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = performance.now();
    const off = addTick(() => {
      if (done()) {
        off();
        resolve(true);
      } else if (performance.now() - started > ms) {
        off();
        resolve(false);
      }
    }, LAST);
  });
}

/** Asks the driver for a screenshot of the state the page holds now, and waits until it is saved. */
async function capture(name: string): Promise<void> {
  await frames(3);
  root.dataset.harnessShot = name;
  const taken = await waitFor(() => root.dataset.harnessShotAck === name, WAIT_MS);
  check(`shot-${name}`, taken, taken ? '' : 'no driver saved the screenshot');
}

/** A rectangle of device pixels. y counts from the bottom, as in GL. */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One rectangle queued into a pixel-pack buffer, with the fence that says the GPU has written it. */
interface QueuedRead {
  rect: Rect;
  pbo: WebGLBuffer;
  fence: WebGLSync | null;
}

interface ReadJob {
  rects: Rect[];
  queued: QueuedRead[] | null;
}

let job: ReadJob | null = null;
let glContext: WebGL2RenderingContext | null = null;

/**
 * Reads rectangles from the frame the composer draws next. The reads go to pixel-pack buffers, so
 * the call does not stall the GPU, and the bytes are copied out once each fence has signalled.
 * Fails the check when no frame draws in time.
 */
async function readRects(rects: Rect[]): Promise<Uint8Array[]> {
  const ctx = glContext;
  const empty = (): Uint8Array[] => rects.map((r) => new Uint8Array(r.w * r.h * 4));
  if (ctx === null) {
    check('readback-completes', false, 'no WebGL2 context');
    return empty();
  }
  const pending: ReadJob = { rects, queued: null };
  job = pending;
  const queued = await waitFor(() => pending.queued !== null, WAIT_MS);
  if (!queued || pending.queued === null) {
    job = null;
    check('readback-completes', false, 'no frame drew within the wait');
    return empty();
  }
  const reads = pending.queued;
  const ready = await waitFor(
    () => reads.every((r) => r.fence === null || ctx.getSyncParameter(r.fence, ctx.SYNC_STATUS) === ctx.SIGNALED),
    WAIT_MS,
  );
  job = null;
  if (!ready) {
    check('readback-completes', false, 'the GPU did not signal the reads within the wait');
    return empty();
  }
  return reads.map((r) => {
    const out = new Uint8Array(r.rect.w * r.rect.h * 4);
    ctx.bindBuffer(ctx.PIXEL_PACK_BUFFER, r.pbo);
    ctx.getBufferSubData(ctx.PIXEL_PACK_BUFFER, 0, out);
    ctx.bindBuffer(ctx.PIXEL_PACK_BUFFER, null);
    if (r.fence !== null) ctx.deleteSync(r.fence);
    ctx.deleteBuffer(r.pbo);
    return out;
  });
}

/** Stats of the red channel of a w x h RGBA patch. Correlations are between neighbours in x and in y. */
interface PatchStats {
  mean: number;
  std: number;
  maxDev: number;
  corrX: number;
  corrY: number;
}

function patchStats(buf: Uint8Array, w: number, h: number): PatchStats {
  const n = w * h;
  const v = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    v[i] = buf[i * 4];
    sum += v[i];
  }
  const mean = sum / n;
  let varSum = 0;
  let maxDev = 0;
  for (let i = 0; i < n; i++) {
    const d = v[i] - mean;
    varSum += d * d;
    maxDev = Math.max(maxDev, Math.abs(d));
  }
  let cx = 0;
  let nx = 0;
  let cy = 0;
  let ny = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = v[y * w + x] - mean;
      if (x + 1 < w) {
        cx += a * (v[y * w + x + 1] - mean);
        nx += 1;
      }
      if (y + 1 < h) {
        cy += a * (v[(y + 1) * w + x] - mean);
        ny += 1;
      }
    }
  }
  const variance = varSum / n;
  return {
    mean,
    std: Math.sqrt(variance),
    maxDev,
    corrX: cx / nx / variance,
    corrY: cy / ny / variance,
  };
}

/** Sum of absolute green-channel differences between neighbours: a measure of sharp edges. */
function edgeEnergy(buf: Uint8Array, w: number, h: number): number {
  let e = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 1;
      if (x + 1 < w) e += Math.abs(buf[i + 4] - buf[i]);
      if (y + 1 < h) e += Math.abs(buf[i + w * 4] - buf[i]);
    }
  }
  return e;
}

function within4(buf: Uint8Array): boolean {
  return (
    Math.abs(buf[0] - PAPER_RGB[0]) <= 4 &&
    Math.abs(buf[1] - PAPER_RGB[1]) <= 4 &&
    Math.abs(buf[2] - PAPER_RGB[2]) <= 4
  );
}

function rgbText(buf: Uint8Array): string {
  return `${buf[0]},${buf[1]},${buf[2]}`;
}

/** Effects of a pass. EffectPass keeps them in a private field, which the harness reads without changing it. */
function effectsOf(pass: Pass): Effect[] {
  const raw: unknown = Reflect.get(pass, 'effects');
  if (!Array.isArray(raw)) return [];
  const list: unknown[] = raw;
  return list.filter((e): e is Effect => e instanceof Effect);
}

async function main(): Promise<void> {
  initTicker();
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) {
    check('canvas-present', false);
    return;
  }

  // ?dpr=2 raises the device-pixel-ratio cap, so the driver can run the same checks at 2x.
  const stage: Stage = createStage(canvas);
  const dprParam = Number(new URLSearchParams(location.search).get('dpr'));
  if (Number.isFinite(dprParam) && dprParam > 0) stage.setDprCap(dprParam);
  const { renderer, scene, camera } = stage;
  const gl = renderer.getContext();
  check('webgl2-context', gl instanceof WebGL2RenderingContext);
  if (!(gl instanceof WebGL2RenderingContext)) return;

  // The scene: a paper plane far behind everything, 17 metal blocks with a strong key light.
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 26),
    new THREE.MeshBasicMaterial({ color: PAPER_HEX }),
  );
  paper.position.set(0, 0, -8);
  scene.add(paper);

  const geometry = new RoundedBoxGeometry(BLOCK.width, BLOCK.height, BLOCK.depth, BLOCK.segments, BLOCK.radius);
  const material = new THREE.MeshPhysicalMaterial({ color: '#BDB7A9', metalness: 1, roughness: 0.1 });
  const rows: THREE.Group[] = [];
  ROWS.forEach((n, row) => {
    const group = new THREE.Group();
    group.position.set(0, ROW_Y[row], ROW_Z[row]);
    for (let k = 0; k < n; k++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((k - (n - 1) / 2) * PITCH, 0, 0);
      group.add(mesh);
    }
    scene.add(group);
    rows.push(group);
  });
  const key = new THREE.DirectionalLight('#FFF4E2', 6);
  key.position.set(-6, 9, 12);
  scene.add(key);

  const post: Post = createPost(stage);

  // The composer's render is wrapped so that a pending readback is queued right after the frame is
  // drawn, while the default framebuffer still holds it. Each read goes to a pixel-pack buffer with a
  // fence, so the draw is not held up by a synchronous readPixels.
  glContext = gl;
  const composer = post.composer;
  const drawComposer = composer.render.bind(composer);
  composer.render = (deltaTime?: number): void => {
    drawComposer(deltaTime);
    const current = job;
    if (current !== null && current.queued === null) {
      current.queued = current.rects.map((r): QueuedRead => {
        const pbo = gl.createBuffer();
        if (pbo === null) throw new Error('createBuffer returned null');
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, r.w * r.h * 4, gl.STREAM_READ);
        gl.readPixels(r.x, r.y, r.w, r.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        return { rect: r, pbo, fence };
      });
    }
  };

  const size = new THREE.Vector2();
  const drawingWidth = (): number => renderer.getDrawingBufferSize(size).x;
  const drawingHeight = (): number => renderer.getDrawingBufferSize(size).y;

  /** The merged pass is the last pass; the chain can be rebuilt, so every lookup goes through here. */
  function mergedPass(): EffectPass {
    const passes = composer.passes;
    const last = passes[passes.length - 1];
    if (!(last instanceof EffectPass)) throw new Error('the last pass is not the merged EffectPass');
    return last;
  }
  function mergedNames(): string[] {
    return effectsOf(mergedPass()).map((e) => e.name);
  }
  function aberrationNow(): ChromaticAberrationEffect {
    const found = effectsOf(mergedPass()).find((e): e is ChromaticAberrationEffect => e instanceof ChromaticAberrationEffect);
    if (found === undefined) throw new Error('no aberration effect in the merged pass');
    return found;
  }
  function grainNow(): GrainEffect {
    const found = effectsOf(mergedPass()).find((e): e is GrainEffect => e instanceof GrainEffect);
    if (found === undefined) throw new Error('no grain effect in the merged pass');
    return found;
  }
  function dofNow(): DepthOfFieldEffect | null {
    for (const pass of composer.passes) {
      if (!(pass instanceof EffectPass)) continue;
      const found = effectsOf(pass).find((e): e is DepthOfFieldEffect => e instanceof DepthOfFieldEffect);
      if (found !== undefined) return found;
    }
    return null;
  }
  /** Aberration offset in device pixels, from the uv offset and the drawing-buffer width. */
  function aberrationPx(): number {
    return aberrationNow().offset.x * drawingWidth();
  }

  /** Device-pixel rectangle that bounds an object on screen, grown by pad pixels. */
  function deviceRect(object: THREE.Object3D, pad: number): Rect {
    const box = new THREE.Box3().setFromObject(object);
    const W = drawingWidth();
    const H = drawingHeight();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const corner = new THREE.Vector3();
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).project(camera);
          const px = ((corner.x + 1) / 2) * W;
          const py = ((corner.y + 1) / 2) * H;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }
    const x0 = Math.max(0, Math.floor(minX - pad));
    const y0 = Math.max(0, Math.floor(minY - pad));
    const x1 = Math.min(W, Math.ceil(maxX + pad));
    const y1 = Math.min(H, Math.ceil(maxY + pad));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // 1. Structure of the chain at rest.
  const W = drawingWidth();
  const H = drawingHeight();
  const passes = composer.passes;
  check(
    'chain-at-rest',
    passes.length === 2 && passes[0] instanceof RenderPass && passes[1] instanceof EffectPass,
    `passes=${passes.length}`,
  );
  check(
    'merged-pass-order',
    mergedNames().join(',') === 'ChromaticAberrationEffect,BloomEffect,GrainEffect',
    mergedNames().join(','),
  );
  check(
    'bloom-effect-in-merged-pass',
    effectsOf(mergedPass()).some((e) => e instanceof BloomEffect),
  );

  // 2. Compile: the first frames must draw with no shader warning or error.
  await frames(4);
  check(
    'shaders-compile-first-frames',
    problems.length === 0 && (renderer.info.programs?.length ?? 0) > 0,
    problems.slice(0, 3).join(' | '),
  );

  // 3. The paper ground, away from every block, with grain and dither off and bloom on.
  grainNow().setAmplitude(0);
  grainNow().setDither(false);
  await frames(2);
  const paperPixels = await readRects([
    { x: 60, y: 60, w: 1, h: 1 },
    { x: W - 60, y: H - 60, w: 1, h: 1 },
  ]);
  check(
    'paper-no-bloom-within-4-of-F1ECE0',
    paperPixels.every(within4),
    `${rgbText(paperPixels[0])} and ${rgbText(paperPixels[1])} against 241,236,224`,
  );
  grainNow().setAmplitude(GRAIN_AMP_M0);
  grainNow().setDither(true);

  // 4. Grain at m = 0 and m = 1: zero mean on the paper value, amplitude as specified, no pattern.
  post.setMix(0);
  check(
    'mix-sets-amplitude-0.028',
    grainNow().amplitude === GRAIN_AMP_M0,
    `amplitude=${grainNow().amplitude}`,
  );
  await frames(2);
  const grainPatch0 = (await readRects([{ x: 40, y: 40, w: 64, h: 64 }]))[0];
  const s0 = patchStats(grainPatch0, 64, 64);
  check(
    'grain-m0-zero-mean-and-std',
    Math.abs(s0.mean - PAPER_RGB[0]) < 0.5 && s0.std > 3.6 && s0.std < 4.6 && s0.maxDev <= 9,
    `mean=${s0.mean.toFixed(2)} std=${s0.std.toFixed(2)} maxDev=${s0.maxDev.toFixed(1)} (predicted std 4.1)`,
  );
  check(
    'grain-no-neighbour-pattern',
    Math.abs(s0.corrX) < 0.08 && Math.abs(s0.corrY) < 0.08,
    `corrX=${s0.corrX.toFixed(3)} corrY=${s0.corrY.toFixed(3)}`,
  );
  const seedA = grainNow().seed;
  await frames(1);
  const seedB = grainNow().seed;
  check('grain-seed-changes-each-frame', seedA !== seedB, `${seedA} then ${seedB}`);

  post.setMix(1);
  check(
    'mix-sets-amplitude-0.040',
    Math.abs(grainNow().amplitude - GRAIN_AMP_M1) < 1e-9,
    `amplitude=${grainNow().amplitude}`,
  );
  await frames(2);
  const grainPatch1 = (await readRects([{ x: 40, y: 40, w: 64, h: 64 }]))[0];
  const s1 = patchStats(grainPatch1, 64, 64);
  check(
    'grain-m1-std',
    s1.std > 5.3 && s1.std < 6.5 && Math.abs(s1.mean - PAPER_RGB[0]) < 0.5,
    `mean=${s1.mean.toFixed(2)} std=${s1.std.toFixed(2)} (predicted std 5.9)`,
  );
  post.setMix(0);
  await frames(2);
  await capture('rest');

  // 5. Aberration: 0.8 px at 3000 px/s, 0.4 px at 1520 px/s (linear between 40 and 3000), 0 at rest.
  post.setVelocity(3000);
  const at3000 = await waitFor(() => Math.abs(aberrationPx() - 0.8) < 0.01, WAIT_MS);
  check('aberration-3000-px-s-is-0.8px', at3000, `px=${aberrationPx().toFixed(4)} offsetY=${aberrationNow().offset.y}`);
  post.setVelocity(1520);
  const at1520 = await waitFor(() => Math.abs(aberrationPx() - 0.4) < 0.01, WAIT_MS);
  check('aberration-1520-px-s-is-0.4px', at1520, `px=${aberrationPx().toFixed(4)}`);
  post.setVelocity(3000);
  const again = await waitFor(() => Math.abs(aberrationPx() - 0.8) < 0.01, WAIT_MS);
  check('aberration-back-to-0.8px', again, `px=${aberrationPx().toFixed(4)}`);
  await capture('velocity');
  post.setVelocity(0);
  const atRest = await waitFor(() => aberrationNow().offset.x === 0, WAIT_MS);
  check('aberration-zero-at-rest', atRest, `offsetX=${aberrationNow().offset.x}`);

  // 6. Depth of field: row B sits 5 bu behind the focus. With grain off, its edges must lose energy.
  grainNow().setAmplitude(0);
  grainNow().setDither(false);
  const rowB = rows[1];
  const bRect = deviceRect(rowB, 12);
  const sharp = (await readRects([bRect]))[0];
  const eSharp = edgeEnergy(sharp, bRect.w, bRect.h);
  const countBefore = composer.passes.length;
  post.setDof({ focus: DOF_FOCUS, bokeh: DOF_BOKEH });
  await frames(2);
  const dof = dofNow();
  const countWithDof = composer.passes.length;
  check(
    'dof-added-one-pass',
    countWithDof === countBefore + 1 && dof !== null,
    `passes ${countBefore} to ${countWithDof}`,
  );
  check(
    'dof-world-focus-and-bokeh',
    dof !== null && dof.cocMaterial.focusDistance === DOF_FOCUS && dof.bokehScale === DOF_BOKEH,
    dof === null
      ? 'no DoF effect'
      : `focusDistance=${dof.cocMaterial.focusDistance} bokeh=${dof.bokehScale}`,
  );
  const blurred = (await readRects([bRect]))[0];
  const eBlurred = edgeEnergy(blurred, bRect.w, bRect.h);
  check(
    'dof-blurs-out-of-focus-row',
    eBlurred < 0.6 * eSharp,
    `edge energy sharp=${eSharp} blurred=${eBlurred} ratio=${(eBlurred / eSharp).toFixed(3)}`,
  );
  grainNow().setAmplitude(GRAIN_AMP_M0);
  grainNow().setDither(true);
  await capture('dof');
  post.setDof(null);
  await frames(2);
  check(
    'dof-removed-back-to-count',
    composer.passes.length === countBefore && dofNow() === null,
    `passes=${composer.passes.length}`,
  );
  await capture('dof-off');

  // 7. Reduced motion: no aberration, grain seed fixed at 17, no depth-of-field pass, even when requested.
  post.setReducedMotion(true);
  post.setVelocity(3000);
  post.setDof({ focus: DOF_FOCUS, bokeh: DOF_BOKEH });
  await frames(3);
  check(
    'reduced-motion-no-aberration-no-dof',
    aberrationNow().offset.x === 0 && composer.passes.length === countBefore,
    `offsetX=${aberrationNow().offset.x} passes=${composer.passes.length}`,
  );
  const reducedSeeds: number[] = [];
  for (let i = 0; i < 3; i++) {
    await frames(1);
    reducedSeeds.push(grainNow().seed);
  }
  check(
    'reduced-motion-seed-17',
    reducedSeeds.every((s) => s === GRAIN_SEED_STATIC),
    reducedSeeds.join(','),
  );
  post.setReducedMotion(false);
  await frames(2);
  check(
    'leaving-reduced-motion-restores-requested-dof',
    composer.passes.length === countBefore + 1,
    `passes=${composer.passes.length}`,
  );
  post.setDof(null);
  post.setVelocity(0);
  await frames(2);

  // 8. Bloom. With grain and dither off, the only change between bloom on and bloom off is the bloom.
  //    It must lift the halo around the glints of row A, and the bloom switch must rebuild the pass.
  const rowA = deviceRect(rows[0], 24);
  grainNow().setAmplitude(0);
  grainNow().setDither(false);
  await frames(2);
  const bloomOn = (await readRects([rowA]))[0];
  post.setBloom(false);
  await frames(2);
  check(
    'bloom-off-rebuilds-merged-pass',
    mergedNames().join(',') === 'ChromaticAberrationEffect,GrainEffect',
    mergedNames().join(','),
  );
  check(
    'bloom-off-keeps-grain-amplitude',
    Math.abs(grainNow().amplitude - GRAIN_AMP_M0) < 1e-12,
    `amplitude=${grainNow().amplitude}`,
  );
  grainNow().setAmplitude(0);
  grainNow().setDither(false);
  const bloomOff = (await readRects([rowA]))[0];
  let maxLift = 0;
  let sumOn = 0;
  let sumOff = 0;
  for (let i = 0; i < bloomOn.length; i++) {
    maxLift = Math.max(maxLift, bloomOn[i] - bloomOff[i]);
    sumOn += bloomOn[i];
    sumOff += bloomOff[i];
  }
  check(
    'bloom-lifts-the-glint-halo',
    maxLift >= 2 && sumOn > sumOff,
    `max lift ${maxLift} levels; summed lift ${sumOn - sumOff} over ${bloomOn.length / 4} pixels`,
  );
  post.setBloom(true);
  await frames(2);
  check(
    'bloom-on-restores-merged-pass',
    mergedNames().join(',') === 'ChromaticAberrationEffect,BloomEffect,GrainEffect',
    mergedNames().join(','),
  );

  // 9. Dispose releases the chain, and the stage then draws without it.
  post.dispose();
  await frames(3);
  check('dispose-releases-the-chain', composer.passes.length === 0, `passes=${composer.passes.length}`);

  // 10. The whole run: no shader compile message, warning or error.
  check(
    'no-console-warning-or-error-in-run',
    problems.length === 0,
    `${problems.length} logged: ${problems.slice(0, 3).join(' | ')}`,
  );

  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
  console.log(`RESULT ${root.dataset.harness} (${passed} passed, ${failed.length} failed)`);
}

main().catch((err: unknown) => {
  const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(`harness threw: ${text}`);
  root.dataset.harness = 'fail:exception';
});
