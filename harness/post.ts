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
import { T } from '../src/core/timing';
import { addTick, initTicker } from '../src/core/ticker';
import { GRAIN_AMP_M0, GRAIN_AMP_M1, GRAIN_SEED_STATIC, GrainEffect } from '../src/gl/effects/grain';
import { aberrationPx as aberrationForSpeed, createPost, dampSpeed, type Post } from '../src/gl/post';
import { createStage, type Stage } from '../src/gl/stage';

const root = document.documentElement;
const LAST = 1000;
const WAIT_MS = 60000;
const PAPER_HEX = '#F1ECE0';
const PAPER_RGB = [241, 236, 224] as const;
/** Paper differences R - G and G - B: a monochrome grain keeps both on every pixel. */
const PAPER_RG = PAPER_RGB[0] - PAPER_RGB[1];
const PAPER_GB = PAPER_RGB[1] - PAPER_RGB[2];
/** Depth of the black edge of step 5b: between the paper (z -8) and row B (z -5). */
const EDGE_Z = -7.5;
/** Pixels of the one-pixel edge row read in step 5b. */
const EDGE_N = 24;
/** Normalised device x of the step 5b edge: 15% of the screen width from the left. */
const EDGE_NDC_X = -0.7;
/** How long a driver may take to save one screenshot (SwiftShader with the depth of field pass is slow). */
const SHOT_WAIT_MS = 240000;
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
  const taken = await waitFor(() => root.dataset.harnessShotAck === name, SHOT_WAIT_MS);
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

/**
 * Hue of an RGBA patch of paper against the paper's own differences. dRG = (R - G) - 5 and dGB = (G - B) - 12
 * per pixel. count is the pixels with either one off, maxDev the largest move in levels, std the spread of all
 * the moves. A monochrome grain moves nothing; the residue is the 8-bit rounding of the HalfFloat input.
 */
function hueMoves(buf: Uint8Array, n: number): { count: number; maxDev: number; std: number } {
  let count = 0;
  let maxDev = 0;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const dRG = buf[i * 4] - buf[i * 4 + 1] - PAPER_RG;
    const dGB = buf[i * 4 + 1] - buf[i * 4 + 2] - PAPER_GB;
    if (dRG !== 0 || dGB !== 0) count += 1;
    for (const d of [dRG, dGB]) {
      maxDev = Math.max(maxDev, Math.abs(d));
      sum += d;
      sumSq += d * d;
    }
  }
  const mean = sum / (2 * n);
  return { count, maxDev, std: Math.sqrt(Math.max(0, sumSq / (2 * n) - mean * mean)) };
}

/** sRGB transfer curve (IEC 61966-2-1): display value in [0, 1] to linear light. */
function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * Sub-pixel position of a black-to-paper step in one channel of a one-pixel row that starts on the black
 * side: the number of pixels before the step. The aberration mixes in linear light, so the display values are
 * linearised before they are summed. A sharp step at pixel boundary k gives exactly k.
 */
function stepAt(row: Uint8Array, n: number, channel: number, paper: number): number {
  const paperLinear = toLinear(paper / 255);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += toLinear(row[i * 4 + channel] / 255) / paperLinear;
  return n - sum;
}

/** Index of the first pixel of a one-pixel row where a channel is over half its paper value, or -1. */
function firstOverHalf(row: Uint8Array, n: number, channel: number, paper: number): number {
  for (let i = 0; i < n; i++) {
    if (row[i * 4 + channel] > paper / 2) return i;
  }
  return -1;
}

/** World x of the screen point with normalised device x ndcX, on the plane at depth z, for the camera as it stands. */
function worldXAt(cam: THREE.PerspectiveCamera, ndcX: number, z: number): number {
  cam.updateMatrixWorld();
  const origin = cam.position.clone();
  const dir = new THREE.Vector3(ndcX, 0, 0.5).unproject(cam).sub(origin).normalize();
  return origin.x + (dir.x * (z - origin.z)) / dir.z;
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

  // The high-contrast edge of step 5b: black to the left of a line at 15% of the screen width, in front of the
  // paper and behind row B. It lies outside row B and the depth-of-field rectangle, and its top band is clear.
  const edgeX = worldXAt(camera, EDGE_NDC_X, EDGE_Z);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ color: '#000000' }));
  edge.position.set(edgeX - 30, 0, EDGE_Z);
  scene.add(edge);

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

  // 1b. The zero rule and the damping as pure functions (post.ts aberrationPx and dampSpeed).
  check(
    'aberration-exactly-zero-at-or-below-40',
    aberrationForSpeed(0) === 0 && aberrationForSpeed(39.9) === 0 && aberrationForSpeed(40) === 0 && aberrationForSpeed(Number.NaN) === 0,
    `40 -> ${aberrationForSpeed(40)}, NaN -> ${aberrationForSpeed(Number.NaN)}`,
  );
  check(
    'aberration-0.8px-at-3000',
    Math.abs(aberrationForSpeed(3000) - 0.8) < 1e-12,
    `${aberrationForSpeed(3000)}`,
  );
  const oneTau = dampSpeed(3000, 0, T.micro);
  check(
    'damping-is-exponential-with-T.micro',
    Math.abs(oneTau - 3000 * Math.exp(-1)) < 1e-9,
    `after one T.micro: ${oneTau.toFixed(6)} against ${(3000 * Math.exp(-1)).toFixed(6)}`,
  );
  check(
    'damping-snaps-to-exact-zero-under-0.5',
    dampSpeed(40, 0, 2) === 0 && dampSpeed(0, 0, 0.1) === 0 && dampSpeed(500, 500, 0.3) === 500,
    `40 after 2 s -> ${dampSpeed(40, 0, 2)}`,
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
    { x: W - 60, y: 60, w: 1, h: 1 },
    { x: W - 60, y: H - 60, w: 1, h: 1 },
  ]);
  const paperOff = (await readRects([{ x: W - 104, y: 40, w: 64, h: 64 }]))[0];
  const hueOff = hueMoves(paperOff, 64 * 64);
  check(
    'paper-hue-exact-with-grain-off',
    hueOff.count === 0,
    `${hueOff.count} of 4096 pixels off the paper's R-G 5 and G-B 12`,
  );
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
  const grainPatch0 = (await readRects([{ x: W - 104, y: 40, w: 64, h: 64 }]))[0];
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
  // Monochrome: the grain and the dither add one value to R, G and B, so the paper's hue survives. The readback
  // keeps it to 8-bit rounding (within one level, spread well under 0.35 levels). Per-channel dither would give a
  // spread of about 0.6 levels from the dither alone.
  const hue0 = hueMoves(grainPatch0, 64 * 64);
  check(
    'grain-monochrome-m0-hue-kept',
    hue0.maxDev <= 1 && hue0.std < 0.35,
    `${hue0.count} of 4096 pixels off by a level; largest move ${hue0.maxDev}; spread ${hue0.std.toFixed(3)} levels`,
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
  const grainPatch1 = (await readRects([{ x: W - 104, y: 40, w: 64, h: 64 }]))[0];
  const s1 = patchStats(grainPatch1, 64, 64);
  check(
    'grain-m1-std',
    s1.std > 5.3 && s1.std < 6.5 && Math.abs(s1.mean - PAPER_RGB[0]) < 0.5,
    `mean=${s1.mean.toFixed(2)} std=${s1.std.toFixed(2)} (predicted std 5.9)`,
  );
  const hue1 = hueMoves(grainPatch1, 64 * 64);
  check(
    'grain-monochrome-m1-hue-kept',
    hue1.maxDev <= 1 && hue1.std < 0.35,
    `${hue1.count} of 4096 pixels off by a level; largest move ${hue1.maxDev}; spread ${hue1.std.toFixed(3)} levels`,
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

  // 5b. Edge alignment (D22.5). A still frame of a high-contrast vertical edge: black on its left, paper on its
  //     right, on the top band where no block is. Grain and dither are off, so the step is the only signal in the
  //     row. At rest the red, green and blue steps sit on one pixel column. At 800 px/s red and blue split by twice
  //     the offset, with green in the middle.
  grainNow().setAmplitude(0);
  grainNow().setDither(false);
  const edgeScreen = new THREE.Vector3(edgeX, 0, EDGE_Z).project(camera);
  const edgeCol = Math.round(((edgeScreen.x + 1) / 2) * W);
  const edgeRowGL = H - 1 - Math.round(H * 0.12);
  const edgeRect: Rect = { x: edgeCol - EDGE_N / 2, y: edgeRowGL, w: EDGE_N, h: 1 };
  check(
    'edge-row-clear-of-blocks',
    rows.every((g) => {
      const r = deviceRect(g, 0);
      return edgeRowGL < r.y || edgeRowGL >= r.y + r.h;
    }),
    `edge row ${edgeRowGL} (GL y), column ${edgeCol}`,
  );
  post.setVelocity(0);
  const restAt = await waitFor(
    () => aberrationNow().offset.x === 0 && aberrationNow().offset.y === 0 && post.dampedSpeed === 0,
    WAIT_MS,
  );
  check(
    'edge-rest-offset-exactly-zero',
    restAt,
    `offset=(${aberrationNow().offset.x}, ${aberrationNow().offset.y}) damped=${post.dampedSpeed}`,
  );
  const restRow = (await readRects([edgeRect]))[0];
  const restFirst = PAPER_RGB.map((p, c) => firstOverHalf(restRow, EDGE_N, c, p));
  const restStep = PAPER_RGB.map((p, c) => stepAt(restRow, EDGE_N, c, p));
  const last = (EDGE_N - 1) * 4;
  check(
    'edge-rest-same-pixel-column',
    restFirst[0] === restFirst[1] && restFirst[1] === restFirst[2] && restFirst[0] > 0,
    `first pixel over half paper: R ${restFirst[0]} G ${restFirst[1]} B ${restFirst[2]}; black side ${rgbText(restRow.subarray(0, 4))}; paper side ${rgbText(restRow.subarray(last, last + 4))}`,
  );
  check(
    'edge-rest-steps-coincide',
    Math.abs(restStep[0] - restStep[1]) < 0.02 && Math.abs(restStep[1] - restStep[2]) < 0.02,
    `step R ${restStep[0].toFixed(3)} G ${restStep[1].toFixed(3)} B ${restStep[2].toFixed(3)} px`,
  );
  await capture('edge-rest');

  const splitPx = aberrationForSpeed(800);
  post.setVelocity(800);
  const splitAt = await waitFor(() => Math.abs(aberrationPx() - splitPx) < 0.002, WAIT_MS);
  check(
    'edge-800px-s-offset',
    splitAt,
    `offset ${aberrationPx().toFixed(4)} px against ${splitPx.toFixed(4)}; damped ${post.dampedSpeed.toFixed(1)} px/s`,
  );
  const splitRow = (await readRects([edgeRect]))[0];
  const splitStep = PAPER_RGB.map((p, c) => stepAt(splitRow, EDGE_N, c, p));
  const redMinusBlue = splitStep[0] - splitStep[2];
  check(
    'edge-800px-s-red-blue-split-by-twice-offset',
    Math.abs(Math.abs(redMinusBlue) - 2 * splitPx) < 0.04 &&
      Math.abs(splitStep[1] - (splitStep[0] + splitStep[2]) / 2) < 0.03,
    `step R ${splitStep[0].toFixed(3)} G ${splitStep[1].toFixed(3)} B ${splitStep[2].toFixed(3)}; R minus B ${redMinusBlue.toFixed(3)} against 2 x ${splitPx.toFixed(3)}`,
  );
  await capture('edge-velocity');

  // Rest again: the offset log, wall clock, one line per frame until it has been exactly zero for 1.5 s.
  post.setVelocity(0);
  const stoppedAt = performance.now();
  let zeroAfterMs = -1;
  for (let frame = 0; frame < 60; frame++) {
    await frames(1);
    const ms = performance.now() - stoppedAt;
    const px = aberrationPx();
    const off = aberrationNow().offset;
    console.log(
      `CA-DECAY t=${(ms / 1000).toFixed(2)} s damped=${post.dampedSpeed.toFixed(3)} px=${px.toFixed(6)} offset=(${off.x}, ${off.y})`,
    );
    if (px === 0 && zeroAfterMs < 0) zeroAfterMs = ms;
    if (zeroAfterMs >= 0 && ms - zeroAfterMs > 1500) break;
  }
  check(
    'aberration-exactly-zero-after-damping',
    zeroAfterMs >= 0 && aberrationNow().offset.x === 0 && aberrationNow().offset.y === 0,
    `exact zero from ${(zeroAfterMs / 1000).toFixed(2)} s after the stop (wall clock)`,
  );
  const afterRow = (await readRects([edgeRect]))[0];
  const afterStep = PAPER_RGB.map((p, c) => stepAt(afterRow, EDGE_N, c, p));
  check(
    'edge-after-damping-steps-coincide',
    Math.abs(afterStep[0] - afterStep[1]) < 0.02 && Math.abs(afterStep[1] - afterStep[2]) < 0.02,
    `step R ${afterStep[0].toFixed(3)} G ${afterStep[1].toFixed(3)} B ${afterStep[2].toFixed(3)} px`,
  );
  await capture('edge-rest-after');
  grainNow().setAmplitude(GRAIN_AMP_M0);
  grainNow().setDither(true);

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
