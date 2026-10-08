// Harness for src/gl/stage.ts and src/core/loader.ts (architecture section 10a).
// Open /harness/stage-loader.html on the dev server. The verdict lands in dataset.harness.
// The viewport check waits for an outside setViewportSize: the page sets dataset.harnessStep to
// 'await-viewport', and the Playwright driver resizes the viewport. ?loader-timeout runs the 8 s
// safety check on its own page load.
import * as THREE from 'three';
import { env } from '../src/core/env';
import { bus } from '../src/core/bus';
import { addTick, initTicker, PRIORITY, type Tick } from '../src/core/ticker';
import { createStage, type Stage } from '../src/gl/stage';
import { fontsTask, loaderProgress, registerTask, startLoading } from '../src/core/loader';

const LAST = 1000;
const root = document.documentElement;

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

// Warnings are recorded as well as shown, so the checks can count them.
const warnings: string[] = [];
const realWarn = console.warn.bind(console);
console.warn = (...args: unknown[]): void => {
  warnings.push(args.map((a) => String(a)).join(' '));
  realWarn(...args);
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Resolves true as soon as step() returns true (checked once a frame), or false after maxFrames frames. */
function waitFrames(maxFrames: number, step: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    let seen = 0;
    const off = addTick(() => {
      seen += 1;
      if (step()) {
        off();
        resolve(true);
      } else if (seen >= maxFrames) {
        off();
        resolve(false);
      }
    }, LAST);
  });
}

initTicker();
let currentFrame = -1;
addTick((t: Tick) => {
  currentFrame = t.frame;
}, PRIORITY.input);

/** Reads the centre pixel of the drawing buffer. Call it right after a draw, inside the same tick. */
function readCentre(renderer: THREE.WebGLRenderer): number[] | null {
  const gl = renderer.getContext();
  if (!(gl instanceof WebGL2RenderingContext)) return null;
  const px = new Uint8Array(4);
  gl.readPixels(
    Math.floor(gl.drawingBufferWidth / 2),
    Math.floor(gl.drawingBufferHeight / 2),
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    px,
  );
  return [px[0], px[1], px[2], px[3]];
}

function tryCreateStage(canvas: HTMLCanvasElement): Stage | null {
  try {
    const stage = createStage(canvas);
    check('createStage works in headless Chromium', true);
    return stage;
  } catch (err) {
    check('createStage works in headless Chromium', false, String(err));
    return null;
  }
}

async function mainCheck(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) {
    check('harness page has the #gl canvas', false);
    return;
  }
  const stage = tryCreateStage(canvas);
  if (stage === null) return;

  const { renderer, scene, camera } = stage;
  const gl = renderer.getContext();
  check('the stage renders through WebGL2', gl instanceof WebGL2RenderingContext);

  // A red test cube: one mesh, one draw call.
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0xff0000 })));

  // 1. The default render hook draws.
  await waitFrames(3, () => false);
  const calls = renderer.info.render.calls;
  check('after 3 frames renderer.info.render.calls >= 1', calls >= 1, `calls=${calls} frame=${currentFrame}`);

  // 2. A centre pixel read inside the render hook, right after the draw.
  const probe: { pixel: number[] | null; calls: number } = { pixel: null, calls: 0 };
  stage.setRenderHook(() => {
    renderer.render(scene, camera);
    probe.calls += 1;
    if (probe.pixel === null) probe.pixel = readCentre(renderer);
  });
  await waitFrames(10, () => probe.pixel !== null);
  const px = probe.pixel;
  check(
    'centre pixel is red: the cube is drawn through the stage',
    px !== null && px[0] > 200 && px[1] < 60 && px[2] < 60,
    `rgba=${px === null ? 'none' : px.join(',')}`,
  );

  // 3. Resize: applied within 2 frames, pixel ratio within the cap.
  const resizes: Stage['size'][] = [];
  stage.onResize((s) => {
    resizes.push(s);
  });
  const startW = window.innerWidth;
  const startH = window.innerHeight;
  let changeFrame = -1;
  let matchFrame = -1;
  root.dataset.harnessStep = 'await-viewport';
  const resized = await waitFrames(900, () => {
    if (changeFrame < 0 && (window.innerWidth !== startW || window.innerHeight !== startH)) {
      changeFrame = currentFrame;
    }
    if (
      changeFrame >= 0 &&
      stage.size.width === window.innerWidth &&
      stage.size.height === window.innerHeight
    ) {
      matchFrame = currentFrame;
      return true;
    }
    return false;
  });
  root.dataset.harnessStep = 'resized';
  const after = { ...stage.size };
  check(
    'stage.size follows setViewportSize within 2 frames',
    resized && changeFrame >= 0 && matchFrame - changeFrame <= 2,
    `viewport ${startW}x${startH} -> ${window.innerWidth}x${window.innerHeight}; changed at frame ${changeFrame}, applied at frame ${matchFrame}`,
  );
  const pixelRatio = renderer.getPixelRatio();
  check(
    'renderer pixel ratio is min(devicePixelRatio, env.dprCap), never above env.dprCap',
    pixelRatio <= env.dprCap && pixelRatio === Math.min(window.devicePixelRatio || 1, env.dprCap),
    `pixelRatio=${pixelRatio} devicePixelRatio=${window.devicePixelRatio} dprCap=${env.dprCap}`,
  );
  check(
    'drawing buffer and camera aspect follow the new size',
    canvas.width === Math.floor(after.width * after.dpr) &&
      canvas.height === Math.floor(after.height * after.dpr) &&
      Math.abs(camera.aspect - after.width / after.height) < 1e-9,
    `canvas=${canvas.width}x${canvas.height} aspect=${camera.aspect.toFixed(4)}`,
  );
  const lastResize = resizes[resizes.length - 1];
  check(
    'onResize listeners receive the applied size',
    lastResize !== undefined && lastResize.width === after.width && lastResize.height === after.height,
    `calls=${resizes.length}`,
  );

  // 4. Loader: a standalone fonts task first, then the three-task run.
  const fontReports: number[] = [];
  await fontsTask(['Haiku Harness Missing Face', 'serif'])((p) => {
    fontReports.push(p);
  });
  check(
    'fontsTask reports k / n as each family resolves',
    fontReports.length === 2 && fontReports.includes(0.5) && fontReports.includes(1),
    `reports=${fontReports.join(',')}`,
  );

  let zeroWeightRejected = false;
  try {
    registerTask('zero-weight-task', 0, async () => undefined);
  } catch (err) {
    zeroWeightRejected = err instanceof RangeError;
  }
  check('registerTask rejects a zero weight', zeroWeightRejected);

  // Weights 1, 2, 1. Each task records its true state in truth just before it settles or reports.
  const truth = { rejecting: 0, partial: 0, slow: 0 };
  const trueProgress = (): number => (1 * truth.rejecting + 2 * truth.partial + 1 * truth.slow) / 4;

  registerTask('rejecting-task', 1, async () => {
    await sleep(150);
    truth.rejecting = 1;
    throw new Error('rejecting-task fails on purpose');
  });
  registerTask('partial-task', 2, async (report) => {
    report(0.5);
    truth.partial = 0.5;
    await sleep(100);
    report(0.3); // below the 0.5 already reported: ignored
    report(Number.NaN); // not a number: ignored
    await sleep(200);
    truth.partial = 1;
  });
  registerTask('slow-task', 1, async () => {
    await sleep(600);
    truth.slow = 1;
  });

  const events: { v: number; frame: number; truth: number }[] = [];
  const doneAt: number[] = [];
  bus.on('loader:progress', (v) => {
    events.push({ v, frame: currentFrame, truth: trueProgress() });
  });
  bus.on('loader:done', () => {
    doneAt.push(events.length);
  });

  const running = startLoading();
  check('loaderProgress() counts the synchronous report (0.25)', loaderProgress() === 0.25, `value=${loaderProgress()}`);

  let lateRejected = false;
  try {
    registerTask('late-task', 1, async () => undefined);
  } catch (err) {
    lateRejected = err instanceof Error;
  }
  check('registerTask after startLoading throws synchronously', lateRejected);

  const finishedInTime = await Promise.race([running.then(() => true), sleep(15000).then(() => false)]);
  check('startLoading resolves once every task has settled', finishedInTime);

  const values = events.map((e) => e.v);
  check(
    'loader:progress never decreases',
    values.every((v, i) => i === 0 || v >= values[i - 1]),
    `values=${values.map((v) => v.toFixed(4)).join(' ')}`,
  );
  check(
    'loader:progress never exceeds the true weighted value',
    events.every((e) => e.v <= e.truth + 1e-9),
    events.map((e) => `${e.v.toFixed(3)}<=${e.truth.toFixed(3)}`).join(' '),
  );
  check(
    'loader:progress shows intermediate values and ends at exactly 1',
    values.some((v) => v > 0 && v < 1) && values[values.length - 1] === 1 && bus.last('loader:progress') === 1,
  );
  const frames = events.map((e) => e.frame);
  check(
    'at most one loader:progress per frame',
    frames.every((f, i) => i === 0 || f > frames[i - 1]),
    `frames=${frames.join(',')}`,
  );
  check(
    "'loader:done' fires exactly once, after the last progress event",
    doneAt.length === 1 && doneAt[0] === events.length,
    `doneCount=${doneAt.length} progressEvents=${events.length}`,
  );
  check('loaderProgress() is 1 after the run', loaderProgress() === 1, `value=${loaderProgress()}`);
  const rejectWarnings = warnings.filter((w) => w.includes('rejecting-task')).length;
  check('the rejected task is warned once, with its name', rejectWarnings === 1, `warnings=${rejectWarnings}`);

  // 5. Context loss through WEBGL_lose_context.
  const lose = gl instanceof WebGL2RenderingContext ? gl.getExtension('WEBGL_lose_context') : null;
  check('WEBGL_lose_context is available for the simulation', lose !== null);
  lose?.loseContext();
  const noGl = await waitFrames(120, () => root.classList.contains('no-gl'));
  check("context loss adds 'no-gl' to <html>", noGl && root.classList.contains('no-gl'));
  const atLoss = probe.calls;
  await waitFrames(5, () => false);
  check('no frames are drawn after context loss', probe.calls === atLoss, `hook calls ${atLoss} -> ${probe.calls}`);
  const lossWarnings = warnings.filter((w) => w.includes('context lost')).length;
  check('context loss warns once', lossWarnings === 1, `warnings=${lossWarnings}`);

  let disposeOk = true;
  try {
    stage.dispose();
  } catch (err) {
    disposeOk = false;
    console.log('dispose threw', err);
  }
  check('dispose() runs without throwing', disposeOk);
}

/** Safety net: one task never settles and one settles at once. loader:done must come at 8 s, unforced. */
async function timeoutCheck(): Promise<void> {
  registerTask('stuck-task', 1, (report) => {
    report(0.5);
    return new Promise<void>(() => undefined);
  });
  registerTask('quick-task', 1, async () => undefined);
  const values: number[] = [];
  let doneCount = 0;
  bus.on('loader:progress', (v) => {
    values.push(v);
  });
  bus.on('loader:done', () => {
    doneCount += 1;
  });
  const t0 = performance.now();
  await startLoading();
  const elapsed = performance.now() - t0;
  check('loader:done fires at the 8 s safety timeout', elapsed >= 7900 && elapsed <= 9500, `elapsed=${Math.round(elapsed)} ms`);
  check("'loader:done' fires once on timeout", doneCount === 1, `count=${doneCount}`);
  check(
    'progress is not forced to 1 on timeout',
    loaderProgress() === 0.75 && bus.last('loader:progress') === 0.75 && values[values.length - 1] === 0.75,
    `loaderProgress=${loaderProgress()} events=${values.join(',')}`,
  );
  check('the timeout is warned with the pending task name', warnings.some((w) => w.includes('stuck-task')));
}

async function main(): Promise<void> {
  if (new URLSearchParams(location.search).has('loader-timeout')) {
    await timeoutCheck();
  } else {
    await mainCheck();
  }
}

main()
  .catch((err: unknown) => {
    failed.push('exception');
    console.log('FAIL exception', err);
  })
  .finally(() => {
    console.log(`RESULT ${passed} passed, ${failed.length} failed`);
    root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
  });
