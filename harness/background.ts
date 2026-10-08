// Harness for src/gl/background (design/direction-3d.md section 10.10). Open /harness/background.html
// on the dev server. The page draws the background through the real stage and runs its checks.
// For each screenshot it sets dataset.harnessShot and waits until a driver writes
// dataset.harnessShotAck, so the picture is taken in the state the page holds. The verdict lands in
// dataset.harness: 'pass', or 'fail:<check names>'. The colour pipeline is checked on a separate
// 256 x 1 render, read back pixel by pixel.
import * as THREE from 'three';
import { addTick, initTicker, PRIORITY } from '../src/core/ticker';
import type { Theme } from '../src/core/types';
import { createBackground, type Background } from '../src/gl/background/background';
import { createStage, type Stage } from '../src/gl/stage';

const LAST = 1000;
const root = document.documentElement;
const CAPTURE_MS = 15000;
const WAIT_MS = 15000;
const PAPER_RGB = [241, 236, 224];
const INK_RGB = [21, 21, 18];
const PAPER_HEX = '#F1ECE0';

type BleedState = { boundary: 1 | 2; p: number };
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Pending {
  rects: Rect[];
  out: Uint8Array[] | null;
}

const failed: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failed.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

// Every warning and error the page logs, including three's shader compile and link messages.
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

/** Resolves true once done() holds, checked on each tick, or false after ms milliseconds. */
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

/** Asks the driver for a screenshot of the state the page holds now, and waits until it is taken. */
async function capture(name: string): Promise<void> {
  await frames(3);
  root.dataset.harnessShot = name;
  const taken = await waitFor(() => root.dataset.harnessShotAck === name, CAPTURE_MS);
  if (!taken) console.log(`NOTE no driver took the screenshot "${name}"`);
}

function shaderOf(mesh: THREE.Mesh): THREE.ShaderMaterial {
  const material = mesh.material;
  if (!(material instanceof THREE.ShaderMaterial)) {
    throw new Error('the background mesh does not use a ShaderMaterial');
  }
  return material;
}

function uniformNumber(material: THREE.ShaderMaterial, name: string): number {
  const value: unknown = material.uniforms[name].value;
  return typeof value === 'number' ? value : Number.NaN;
}

/** Vignette factor at a device pixel centre, the same formula as the shader (display units). */
function vignetteFactor(px: number, py: number, w: number, h: number, strength: number): number {
  const cx = (px / w - 0.5) * (w / h);
  const cy = py / h - 0.5;
  const t = Math.min(1, Math.max(0, (Math.hypot(cx, cy) - 0.55) / 0.7));
  return 1 - strength * t * t * (3 - 2 * t);
}

function rgbText(buf: Uint8Array, i: number): string {
  return `${buf[i * 4]},${buf[i * 4 + 1]},${buf[i * 4 + 2]}`;
}

// A readback requested for the next draw of the main canvas. The render hook fills it in.
let pending: Pending | null = null;

/** Reads rectangles of the main canvas right after its draw. Times out with a failed check. */
async function readMain(rects: Rect[]): Promise<Uint8Array[]> {
  const job: Pending = { rects, out: null };
  pending = job;
  const done = await waitFor(() => job.out !== null, WAIT_MS);
  pending = null;
  if (!done || job.out === null) {
    check('main canvas readback completes', false, 'no frame drew within the wait');
    return rects.map((r) => new Uint8Array(r.w * r.h * 4));
  }
  return job.out;
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) {
    check('harness page has the #gl canvas', false);
    return;
  }
  const stage: Stage = createStage(canvas);
  const { renderer, scene, camera } = stage;
  const gl = renderer.getContext();
  check('the stage renders through WebGL2', gl instanceof WebGL2RenderingContext);
  if (!(gl instanceof WebGL2RenderingContext)) return;

  const bg: Background = createBackground(stage);
  addTick((t) => bg.update(t), PRIORITY.glUpdate);
  stage.setRenderHook(() => {
    renderer.render(scene, camera);
    const job = pending;
    if (job !== null && job.out === null) {
      // finish() first: a readPixels that waits on pending GPU work makes Chromium log a
      // "GPU stall" performance warning. The wait is the same either way, and it is taken here.
      gl.finish();
      job.out = job.rects.map((r) => {
        const buf = new Uint8Array(r.w * r.h * 4);
        gl.readPixels(r.x, r.y, r.w, r.h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        return buf;
      });
    }
  });

  const W = canvas.width;
  const H = canvas.height;
  const mat = shaderOf(bg.mesh);

  // 1. Structure.
  check(
    'mesh is in stage.scene, drawn first and skips depth',
    scene.children.includes(bg.mesh) &&
      bg.mesh.renderOrder === -1 &&
      mat.depthTest === false &&
      mat.depthWrite === false &&
      bg.mesh.frustumCulled === false,
    `renderOrder=${bg.mesh.renderOrder} depthTest=${String(mat.depthTest)} depthWrite=${String(mat.depthWrite)} frustumCulled=${String(bg.mesh.frustumCulled)}`,
  );
  const positions = bg.mesh.geometry.getAttribute('position');
  check(
    'fullscreen triangle: three vertices, no index',
    positions.count === 3 && bg.mesh.geometry.getIndex() === null,
    `count=${positions.count}`,
  );
  check('ShaderMaterial uses GLSL 3.00', mat.glslVersion === THREE.GLSL3, `glslVersion=${String(mat.glslVersion)}`);
  const rs = mat.uniforms.uResolution.value as THREE.Vector3;
  check(
    'uResolution carries the CSS size and the dpr',
    rs.x === stage.size.width && rs.y === stage.size.height && rs.z === stage.size.dpr,
    `uResolution=${rs.x},${rs.y},${rs.z} canvas=${W}x${H}`,
  );

  // 2. Compile: the first frames must draw with no shader warning or error.
  bg.setTheme('paper');
  bg.setBleed(null);
  await frames(3);
  const programs = renderer.info.programs?.length ?? 0;
  check(
    'shaders compile and link with no warning or error (first frames)',
    problems.length === 0 && programs >= 1,
    `programs=${programs} messages=${problems.length} ${problems.join(' | ')}`,
  );

  // 3. Screenshots, in the states the brief names. The driver takes each one.
  const shots: { name: string; theme: Theme; bleed: BleedState | null }[] = [
    { name: 'paper', theme: 'paper', bleed: null },
    { name: 'ink', theme: 'ink', bleed: null },
    { name: 'b1-p025', theme: 'paper', bleed: { boundary: 1, p: 0.25 } },
    { name: 'b1-p050', theme: 'paper', bleed: { boundary: 1, p: 0.5 } },
    { name: 'b1-p075', theme: 'paper', bleed: { boundary: 1, p: 0.75 } },
    { name: 'b2-p050', theme: 'ink', bleed: { boundary: 2, p: 0.5 } },
    { name: 'paper-crop', theme: 'paper', bleed: null },
  ];
  for (const shot of shots) {
    bg.setTheme(shot.theme);
    bg.setBleed(shot.bleed);
    await capture(shot.name);
  }
  // Diagnostic only: the fibre at about 3.3 times its nominal amplitude, to show its direction.
  bg.setTheme('paper');
  bg.setBleed(null);
  mat.uniforms.uFibreAmp.value.set(0.06, 0.06);
  await capture('fibre-diagnostic');
  bg.setTheme('paper');

  // 4. Pixels on the main canvas. Y is measured from the top of the viewport, as in the shader.
  const rowAt = (Y: number): number => Math.min(H - 1, Math.max(0, Math.round(H * (1 - Y))));
  const midX = Math.floor(W / 2);

  // Paper and ink with no fibre: the base colour and the vignette at a corner.
  bg.setTheme('paper');
  bg.setBleed(null);
  mat.uniforms.uFibreAmp.value.set(0, 0);
  const plain = await readMain([
    { x: midX, y: Math.floor(H / 2), w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
  ]);
  const paperCentre = plain[0];
  const paperCorner = plain[1];
  const paperCornerExpect = PAPER_RGB.map((v) => v * vignetteFactor(0.5, 0.5, W, H, 0.06));
  check(
    'paper, no fibre: centre pixel is the paper base within one level',
    PAPER_RGB.every((v, c) => Math.abs(paperCentre[c] - v) <= 1),
    `rgb=${rgbText(paperCentre, 0)} expect=${PAPER_RGB.join(',')}`,
  );
  check(
    'paper, no fibre: corner is darkened by the vignette formula (0.06 at radius 1.25)',
    PAPER_RGB.every((_, c) => Math.abs(paperCorner[c] - paperCornerExpect[c]) <= 1.5),
    `rgb=${rgbText(paperCorner, 0)} expect=${paperCornerExpect.map((v) => v.toFixed(2)).join(',')}`,
  );

  bg.setTheme('ink');
  bg.setBleed(null);
  mat.uniforms.uFibreAmp.value.set(0, 0);
  const inkPlain = await readMain([
    { x: midX, y: Math.floor(H / 2), w: 1, h: 1 },
    { x: 0, y: 0, w: 1, h: 1 },
  ]);
  const inkCorner = inkPlain[1];
  const inkCornerExpect = INK_RGB.map((v) => v * vignetteFactor(0.5, 0.5, W, H, 0.1));
  check(
    'ink, no fibre: centre pixel is the ink base within one level',
    INK_RGB.every((v, c) => Math.abs(inkPlain[0][c] - v) <= 1),
    `rgb=${rgbText(inkPlain[0], 0)} expect=${INK_RGB.join(',')}`,
  );
  check(
    'ink, no fibre: corner is darkened by the vignette formula (0.10 at radius 1.25)',
    INK_RGB.every((_, c) => Math.abs(inkCorner[c] - inkCornerExpect[c]) <= 1.5),
    `rgb=${rgbText(inkCorner, 0)} expect=${inkCornerExpect.map((v) => v.toFixed(2)).join(',')}`,
  );

  // The ink-bleed front, with the nominal fibre. Each case samples points above and below the front.
  const frontCases: { label: string; bleed: BleedState; samples: [number, Theme][] }[] = [
    { label: 'boundary 1, p 0', bleed: { boundary: 1, p: 0 }, samples: [[0.98, 'paper']] },
    { label: 'boundary 1, p 0.25', bleed: { boundary: 1, p: 0.25 }, samples: [[0.5, 'paper'], [0.95, 'ink']] },
    { label: 'boundary 1, p 0.5', bleed: { boundary: 1, p: 0.5 }, samples: [[0.02, 'paper'], [0.98, 'ink']] },
    { label: 'boundary 1, p 0.75', bleed: { boundary: 1, p: 0.75 }, samples: [[0.05, 'paper'], [0.5, 'ink']] },
    { label: 'boundary 1, p 1', bleed: { boundary: 1, p: 1 }, samples: [[0.02, 'ink']] },
    { label: 'boundary 2, p 0', bleed: { boundary: 2, p: 0 }, samples: [[0.02, 'ink']] },
    { label: 'boundary 2, p 0.5', bleed: { boundary: 2, p: 0.5 }, samples: [[0.02, 'ink'], [0.98, 'paper']] },
    { label: 'boundary 2, p 1', bleed: { boundary: 2, p: 1 }, samples: [[0.98, 'paper']] },
  ];
  for (const fc of frontCases) {
    bg.setTheme(fc.bleed.boundary === 1 ? 'paper' : 'ink');
    bg.setBleed(fc.bleed);
    const reads = await readMain(fc.samples.map(([Y]) => ({ x: midX, y: rowAt(Y), w: 1, h: 1 })));
    const detail = fc.samples
      .map(([Y, side], i) => `Y=${Y} want ${side} got ${rgbText(reads[i], 0)}`)
      .join('; ');
    const ok = fc.samples.every(([, side], i) => (side === 'paper' ? reads[i][0] > 200 : reads[i][0] < 60));
    check(`front: ${fc.label} puts each side in the right theme`, ok, detail);
  }

  // The rim band: mid colour just below the front, ink-raised over ink and paper-deep over paper.
  bg.setTheme('paper');
  bg.setBleed({ boundary: 1, p: 0.5 });
  const rimInk = await readMain([{ x: midX, y: 0, w: 1, h: H }]);
  let inkRimPixels = 0;
  for (let i = 0; i < H; i++) {
    const r = rimInk[0][i * 4];
    if (r >= 28 && r <= 40) inkRimPixels += 1;
  }
  check(
    'rim band over ink is ink-raised (34,33,29) just below the front',
    inkRimPixels >= 5,
    `pixels with R in 28..40 on the centre column: ${inkRimPixels} (a 0.010 vh band is about 9 px)`,
  );
  bg.setTheme('ink');
  bg.setBleed({ boundary: 2, p: 0.5 });
  const rimPaper = await readMain([{ x: midX, y: 0, w: 1, h: H }]);
  let paperRimPixels = 0;
  for (let i = 0; i < H; i++) {
    const r = rimPaper[0][i * 4];
    if (r >= 222 && r <= 234) paperRimPixels += 1;
  }
  check(
    'rim band over paper is paper-deep (228,220,203) just below the front',
    paperRimPixels >= 5,
    `pixels with R in 222..234 on the centre column: ${paperRimPixels} (a 0.010 vh band is about 9 px)`,
  );

  // Paper fibre, nominal: the colour near the centre varies, but stays close to the base.
  bg.setTheme('paper');
  bg.setBleed(null);
  const fibreSample = await readMain([{ x: midX - 1, y: Math.floor(H / 2), w: 1, h: 1 }]);
  check(
    'fibre is restored to the nominal amplitude for the paper theme',
    mat.uniforms.uFibreAmp.value.x === 0.018 && mat.uniforms.uFibreAmp.value.y === 0.018,
    `uFibreAmp=${String(mat.uniforms.uFibreAmp.value.x)},${String(mat.uniforms.uFibreAmp.value.y)} sample=${rgbText(fibreSample[0], 0)}`,
  );

  // 5. Reduced motion: the bleed is ignored and uTime is frozen. Then both come back.
  bg.setTheme('paper');
  bg.setBleed({ boundary: 1, p: 0.5 });
  bg.setReducedMotion(true);
  const frozenFrom = uniformNumber(mat, 'uTime');
  await frames(4);
  const frozenTo = uniformNumber(mat, 'uTime');
  check(
    'reduced motion: uTime is frozen over 4 frames',
    frozenFrom === frozenTo,
    `uTime ${frozenFrom} -> ${frozenTo}`,
  );
  check(
    'reduced motion: the bleed is ignored (uBleedActive 0)',
    uniformNumber(mat, 'uBleedActive') === 0,
    `uBleedActive=${uniformNumber(mat, 'uBleedActive')}`,
  );
  bg.setReducedMotion(false);
  await frames(4);
  const resumedTo = uniformNumber(mat, 'uTime');
  check(
    'reduced motion off: uTime runs again and the bleed comes back',
    resumedTo > frozenTo && uniformNumber(mat, 'uBleedActive') === 1,
    `uTime ${frozenTo} -> ${resumedTo}, uBleedActive=${uniformNumber(mat, 'uBleedActive')}`,
  );
  bg.setBleed(null);

  // 6. Quality: the fibre octave count follows the tier.
  bg.setQuality('low');
  const lowOct = uniformNumber(mat, 'uFibreOctaves');
  bg.setQuality('mid');
  const midOct = uniformNumber(mat, 'uFibreOctaves');
  bg.setQuality('high');
  const highOct = uniformNumber(mat, 'uFibreOctaves');
  check(
    'setQuality sets the fibre octaves (low 2, mid 3, high 4)',
    lowOct === 2 && midOct === 3 && highOct === 4,
    `low=${lowOct} mid=${midOct} high=${highOct}`,
  );

  // 7. Colour pipeline on a 256 x 1 render with its own renderer. Fibre and vignette are switched
  // off where the test is about the base colour: the vignette at a 256:1 aspect is not a useful
  // reading, so the strip checks the base and the dither, then the fibre alone.
  stripChecks();

  // 8. Dispose.
  bg.dispose();
  bg.dispose();
  check('dispose removes the mesh and runs twice without error', !scene.children.includes(bg.mesh));

  check('no console warning or error during the run', problems.length === 0, problems.slice(0, 4).join(' | '));
}

interface StripStats {
  maxDev: number[];
  minR: number;
  maxR: number;
}

function stripStats(buf: Uint8Array, base: number[]): StripStats {
  const maxDev = [0, 0, 0];
  let minR = 255;
  let maxR = 0;
  for (let i = 0; i < buf.length / 4; i++) {
    for (let c = 0; c < 3; c++) {
      maxDev[c] = Math.max(maxDev[c], Math.abs(buf[i * 4 + c] - base[c]));
    }
    minR = Math.min(minR, buf[i * 4]);
    maxR = Math.max(maxR, buf[i * 4]);
  }
  return { maxDev, minR, maxR };
}

function stripChecks(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(256, 1, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 256, 0.5, 80);
  const gl = renderer.getContext();
  if (!(gl instanceof WebGL2RenderingContext)) {
    check('strip renderer has a WebGL2 context', false);
    return;
  }
  const stripStage: Stage = {
    renderer,
    scene,
    camera,
    canvas,
    size: { width: 256, height: 1, dpr: 1 },
    onResize: () => () => undefined,
    setRenderHook: () => undefined,
    setDprCap: () => undefined,
    dispose: () => undefined,
  };
  const strip = createBackground(stripStage);
  const material = shaderOf(strip.mesh);

  const readStrip = (): Uint8Array => {
    renderer.render(scene, camera);
    const buf = new Uint8Array(256 * 4);
    gl.finish();
    gl.readPixels(0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return buf;
  };

  strip.setTheme('paper');
  strip.setBleed(null);
  material.uniforms.uFibreAmp.value.set(0, 0);
  material.uniforms.uVignette.value.set(0, 0);
  const paperPlain = stripStats(readStrip(), PAPER_RGB);
  check(
    'strip, paper, no fibre: every pixel within 3 of (241,236,224)',
    paperPlain.maxDev.every((d) => d <= 3),
    `max deviation per channel=${paperPlain.maxDev.join(',')}`,
  );
  check(
    'strip, paper, no fibre: dither stays within one 8-bit level',
    paperPlain.maxDev.every((d) => d <= 1),
    `max deviation per channel=${paperPlain.maxDev.join(',')}`,
  );

  strip.setTheme('ink');
  strip.setBleed(null);
  material.uniforms.uFibreAmp.value.set(0, 0);
  material.uniforms.uVignette.value.set(0, 0);
  const inkPlain = stripStats(readStrip(), INK_RGB);
  check(
    'strip, ink, no fibre: every pixel within 3 of (21,21,18)',
    inkPlain.maxDev.every((d) => d <= 3),
    `max deviation per channel=${inkPlain.maxDev.join(',')}`,
  );
  check(
    'strip, ink, no fibre: dither stays within one 8-bit level',
    inkPlain.maxDev.every((d) => d <= 1),
    `max deviation per channel=${inkPlain.maxDev.join(',')}`,
  );

  // Nominal fibre. A fibre of amplitude a (sRGB) moves a level by at most a x 255, plus the dither
  // and the rounding, so the deviation is at most 6 for paper (4.59 + 1 + 0.5) and 4 for ink.
  strip.setTheme('paper');
  strip.setBleed(null);
  material.uniforms.uVignette.value.set(0, 0);
  const paperFibre = stripStats(readStrip(), PAPER_RGB);
  check(
    'strip, paper, nominal fibre: deviation within 6 levels and the fibre varies',
    paperFibre.maxDev.every((d) => d <= 6) && paperFibre.maxR - paperFibre.minR >= 1,
    `max deviation=${paperFibre.maxDev.join(',')} R range=${paperFibre.minR}..${paperFibre.maxR}`,
  );

  strip.setTheme('ink');
  strip.setBleed(null);
  material.uniforms.uVignette.value.set(0, 0);
  const inkFibre = stripStats(readStrip(), INK_RGB);
  check(
    'strip, ink, nominal fibre: deviation within 4 levels and the fibre varies',
    inkFibre.maxDev.every((d) => d <= 4) && inkFibre.maxR - inkFibre.minR >= 1,
    `max deviation=${inkFibre.maxDev.join(',')} R range=${inkFibre.minR}..${inkFibre.maxR}`,
  );

  // The composer draws into a linear target. The same shader there must keep linear light, so the
  // composer and its output pass do the one sRGB encode. Compared with THREE.Color's own value.
  const target = new THREE.WebGLRenderTarget(256, 1, { type: THREE.FloatType });
  strip.setTheme('paper');
  strip.setBleed(null);
  material.uniforms.uFibreAmp.value.set(0, 0);
  material.uniforms.uVignette.value.set(0, 0);
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  const linear = new Float32Array(256 * 4);
  renderer.readRenderTargetPixels(target, 0, 0, 256, 1, linear);
  let sumR = 0;
  for (let i = 0; i < 256; i++) sumR += linear[i * 4];
  const meanR = sumR / 256;
  const expectR = new THREE.Color(PAPER_HEX).r;
  check(
    'float target (composer path): the paper base is linear light',
    Math.abs(meanR - expectR) < 0.005,
    `mean R=${meanR.toFixed(5)} THREE.Color linear R=${expectR.toFixed(5)}`,
  );
  target.dispose();

  strip.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}

initTicker();

main()
  .catch((err: unknown) => {
    failed.push('exception');
    console.log('FAIL exception', err);
  })
  .finally(() => {
    console.log(`RESULT ${passed} passed, ${failed.length} failed`);
    root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
  });
