// Harness for src/gl/stage.ts and src/core/loader.ts (architecture section 10a).
// Open /harness/stage-loader.html on the dev server, or on a production build of this page. The verdict
// lands in dataset.harness. One mode per page load:
//   (none)           stage checks, then the loader run. The tasks settle in the reverse of their
//                    registration order, and the failing task is the last to settle.
//   ?loader-stall    slow path: the frame loop is stopped while the last task settles at 7.5 s.
//   ?loader-timeout  the 8 s safety net: one task never settles and one settles after the timeout.
// The viewport check waits for an outside setViewportSize: the page sets dataset.harnessStep to
// 'await-viewport', and the Playwright driver resizes the viewport.
import * as THREE from 'three';
import { gsap } from 'gsap';
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

  // Weights 1, 2, 1. Registration order: rejecting, partial, quick. The settle order is the reverse: quick
  // at 100 ms, partial at 300 ms, and rejecting last at 500 ms, the failing task. Each task records its true
  // state just before it settles or reports, and the failing task records the frame of its settle.
  const truth = { rejecting: 0, partial: 0, quick: 0, lastSettleFrame: -1 };
  const trueProgress = (): number => (1 * truth.rejecting + 2 * truth.partial + 1 * truth.quick) / 4;

  registerTask('rejecting-task', 1, async () => {
    await sleep(500);
    truth.rejecting = 1;
    truth.lastSettleFrame = currentFrame;
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
  registerTask('quick-task', 1, async () => {
    await sleep(100);
    truth.quick = 1;
  });

  const events: { v: number; frame: number; truth: number }[] = [];
  const done: { events: number; frame: number }[] = [];
  bus.on('loader:progress', (v) => {
    events.push({ v, frame: currentFrame, truth: trueProgress() });
  });
  bus.on('loader:done', () => {
    done.push({ events: events.length, frame: currentFrame });
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
  // Every value but the last is a frame-driven event, at most one per frame. The last value is the final 1,
  // which goes out with loader:done when the load ends, so it may share a frame with the event before it.
  const frameEvents = events.slice(0, -1).map((e) => e.frame);
  check(
    'frame-driven loader:progress goes out at most once per frame',
    frameEvents.every((f, i) => i === 0 || f > frameEvents[i - 1]),
    `frames=${frameEvents.join(',')}`,
  );
  check(
    "'loader:done' fires exactly once, after the last progress event",
    done.length === 1 && done[0].events === events.length,
    `doneCount=${done.length} progressEvents=${events.length}`,
  );
  check(
    "'loader:done' fires in the frame of the last settle, with no frame in between",
    done.length === 1 && done[0].frame === truth.lastSettleFrame,
    `done frame=${done[0]?.frame} last settle frame=${truth.lastSettleFrame}`,
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

/**
 * Slow path: the frame loop is stopped while the last task settles. Every frame is a gsap tick, so with the
 * ticker asleep no frame runs at all. loader:done must come at the settle itself (7.5 s), not at the 8 s safety
 * timeout, and no timeout warning may appear. The failing task settles first; the last to settle succeeds.
 */
async function stallCheck(): Promise<void> {
  const seen = { lastSettleAt: -1 };
  let doneAt = -1;
  let doneCount = 0;
  const progressEvents: number[] = [];
  bus.on('loader:progress', (v) => {
    progressEvents.push(v);
  });
  bus.on('loader:done', () => {
    doneCount += 1;
    doneAt = performance.now();
  });

  registerTask('last-settler', 1, async () => {
    await sleep(7500);
    seen.lastSettleAt = performance.now();
  });
  registerTask('early-failer', 2, async () => {
    await sleep(1000);
    throw new Error('early-failer fails on purpose');
  });
  registerTask('middle', 1, async (report) => {
    report(0.5);
    await sleep(3000);
  });

  const startedAt = performance.now();
  const running = startLoading();
  // Stop the frame loop after startLoading: an addTick would wake the ticker again.
  gsap.ticker.sleep();
  const finishedInTime = await Promise.race([running.then(() => true), sleep(12000).then(() => false)]);
  gsap.ticker.wake();

  check('startLoading resolves while the frame loop is stopped', finishedInTime);
  check(
    'loader:done comes at the last settle, with no frame to wait for',
    doneCount === 1 && seen.lastSettleAt >= 0 && doneAt >= seen.lastSettleAt && doneAt - seen.lastSettleAt < 25,
    `doneCount=${doneCount} lastSettle=${Math.round(seen.lastSettleAt - startedAt)} ms done=${Math.round(doneAt - startedAt)} ms`,
  );
  check(
    'loader:done fires before the 8 s safety timeout',
    doneAt >= 0 && doneAt - startedAt < 7900,
    `done=${Math.round(doneAt - startedAt)} ms`,
  );
  check(
    'the final progress value (1) goes out before loader:done',
    progressEvents.length >= 1 && progressEvents[progressEvents.length - 1] === 1,
    `progress=${progressEvents.join(',')}`,
  );
  check('no timeout warning: the safety timeout did not fire', !warnings.some((w) => w.includes('still waiting')));
  const failWarnings = warnings.filter((w) => w.includes('early-failer')).length;
  check('the failing task is warned once, with its name', failWarnings === 1, `warnings=${failWarnings}`);
  check('loaderProgress() is 1 after the run', loaderProgress() === 1, `value=${loaderProgress()}`);
}

/**
 * Safety net: one task never settles, one settles at once, one settles after the timeout. loader:done must come
 * once, at 8 s, and the late settle must not emit it again. The timeout is warned in development only.
 */
async function timeoutCheck(): Promise<void> {
  registerTask('stuck-task', 1, (report) => {
    report(0.5);
    return new Promise<void>(() => undefined);
  });
  registerTask('quick-task', 1, async () => undefined);
  registerTask('late-task', 1, async () => {
    await sleep(8600);
  });
  const values: number[] = [];
  let doneCount = 0;
  let eventsAtDone = -1;
  bus.on('loader:progress', (v) => {
    values.push(v);
  });
  bus.on('loader:done', () => {
    doneCount += 1;
    eventsAtDone = values.length;
  });
  const t0 = performance.now();
  await startLoading();
  const elapsed = performance.now() - t0;
  check('loader:done fires at the 8 s safety timeout', elapsed >= 7900 && elapsed <= 9500, `elapsed=${Math.round(elapsed)} ms`);
  check("'loader:done' fires once on timeout", doneCount === 1, `count=${doneCount}`);
  // Weights 1, 1, 1: (0.5 + 1 + 0) / 3 at the timeout. It is not forced to 1.
  check(
    'progress is not forced to 1 on timeout',
    loaderProgress() === 0.5 && bus.last('loader:progress') === 0.5 && values[values.length - 1] === 0.5,
    `loaderProgress=${loaderProgress()} events=${values.join(',')}`,
  );
  if (import.meta.env.DEV) {
    check(
      'development: the timeout is warned with the pending task names',
      warnings.some((w) => w.includes('still waiting') && w.includes('stuck-task') && w.includes('late-task')),
    );
  } else {
    check('production: the timeout is silent (no "still waiting" warning)', !warnings.some((w) => w.includes('still waiting')));
  }
  await sleep(1500);
  check(
    "a task that settles after the timeout does not emit 'loader:done' or progress again",
    doneCount === 1 && values.length === eventsAtDone,
    `done=${doneCount} progress after done=${values.length - eventsAtDone}`,
  );
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  if (params.has('loader-timeout')) {
    await timeoutCheck();
  } else if (params.has('loader-stall')) {
    await stallCheck();
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
