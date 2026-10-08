// Asset loader (architecture sections 5 and 6). Registered tasks run concurrently. Progress is the
// weighted mean of what the tasks have really reported. It goes out on the bus at most once per
// frame, and its final value goes out just before 'loader:done'. 'loader:done' fires once: the moment
// the last task settles, or 8 s after startLoading if a task never settles. The completion check runs
// in the settle itself, not in a frame: the frame loop can be late or paused (a long synchronous GL
// step, a hidden tab), and the load must not wait for it.
import { bus } from './bus';
import { addTick, initTicker, PRIORITY } from './ticker';

/** Safety net: loader:done fires this long after startLoading even if a task never settles. */
const TIMEOUT_MS = 8000;

type Report = (p: number) => void;

interface Task {
  readonly name: string;
  readonly weight: number;
  readonly run: (report: Report) => Promise<void>;
  /** Latest report, clamped to [0, 1] and never lowered. It becomes 1 when the task settles. */
  p: number;
  settled: boolean;
}

const tasks: Task[] = [];
/** Registered tasks that have not settled yet. The load ends when this reaches 0. */
let unsettled = 0;
let started = false;
let finished = false;
let startPromise: Promise<void> | null = null;
let resolveStart: () => void = () => undefined;
let lastEmitted: number | undefined;
let removeFrameTick: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Weighted progress now. With nothing unsettled, including when no task was registered, it is 1. */
function currentProgress(): number {
  if (unsettled === 0) return 1;
  let sum = 0;
  let total = 0;
  for (const task of tasks) {
    sum += task.weight * task.p;
    total += task.weight;
  }
  return sum / total;
}

/** Sends the current progress on the bus when it has changed since the last send. */
function emitProgress(): void {
  const value = currentProgress();
  if (value !== lastEmitted) {
    lastEmitted = value;
    bus.emit('loader:progress', value);
  }
}

/** Ends the load, once. The current progress goes out first, so a listener sees it before loader:done. */
function finish(): void {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  removeFrameTick?.();
  removeFrameTick = null;
  emitProgress();
  bus.emit('loader:done');
  resolveStart();
}

function settle(task: Task, failed: boolean, reason: unknown): void {
  if (task.settled) return;
  task.settled = true;
  task.p = 1;
  unsettled -= 1;
  if (failed) {
    console.warn(`[loader] task "${task.name}" failed; the page continues without it`, reason);
  }
  // The last task to settle ends the load in this same turn of the event loop. Nothing waits for a frame.
  if (unsettled === 0) finish();
}

function runTask(task: Task): void {
  const report: Report = (p) => {
    if (task.settled || Number.isNaN(p)) return;
    const clamped = Math.min(1, Math.max(0, p));
    if (clamped > task.p) task.p = clamped;
  };
  let work: Promise<void>;
  try {
    // The run function starts now, synchronously, so its first report is already counted.
    work = Promise.resolve(task.run(report));
  } catch (err) {
    work = Promise.reject(err);
  }
  work.then(
    () => settle(task, false, undefined),
    (err: unknown) => settle(task, true, err),
  );
}

/** Runs once per frame. It sends the progress when it has changed. */
function onFrame(): void {
  if (finished) return;
  emitProgress();
}

function onTimeout(): void {
  if (finished) return;
  // The warning is for development only. A production load that times out ends silently, the same way.
  if (import.meta.env.DEV) {
    const waiting = tasks.filter((t) => !t.settled).map((t) => t.name);
    console.warn(
      `[loader] still waiting after ${TIMEOUT_MS / 1000} s for ${waiting.join(', ')}; emitting loader:done without them`,
    );
  }
  finish();
}

/**
 * Adds a task. Its run function starts when startLoading is called and gets a report function for
 * progress in [0, 1]. The task counts as done when its promise settles, fulfilled or rejected.
 * Throws a RangeError if weight is not a finite number above 0, and an Error if called after
 * startLoading.
 */
export function registerTask(
  name: string,
  weight: number,
  run: (report: (p: number) => void) => Promise<void>,
): void {
  if (started) {
    throw new Error(`registerTask("${name}") was called after startLoading(); register every task first`);
  }
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new RangeError(`registerTask("${name}"): weight must be a finite number above 0, got ${weight}`);
  }
  tasks.push({ name, weight, run, p: 0, settled: false });
  unsettled += 1;
}

/**
 * Runs every registered task concurrently and starts the progress clock. The returned promise
 * resolves together with loader:done, which fires once: as soon as all tasks have settled, or 8 s
 * after this call at the latest. Calling it again returns the same promise.
 */
export function startLoading(): Promise<void> {
  if (startPromise) return startPromise;
  started = true;
  // The progress clock is the shared ticker. initTicker is idempotent, so this is safe in any boot order.
  initTicker();
  startPromise = new Promise<void>((resolve) => {
    resolveStart = () => resolve();
  });
  timer = setTimeout(onTimeout, TIMEOUT_MS);
  removeFrameTick = addTick(onFrame, PRIORITY.state);
  for (const task of tasks) runTask(task);
  // A task settles in a later turn, never inside this loop, so only an empty task list can end the load here.
  if (unsettled === 0) finish();
  return startPromise;
}

/**
 * A task for web fonts. It waits for each family with document.fonts.load and reports k / n as
 * each one resolves. A family that fails to load is warned and counted as resolved, so the page
 * keeps its fallback face and the task still completes.
 */
export function fontsTask(families: readonly string[]): (report: (p: number) => void) => Promise<void> {
  return async (report) => {
    const n = families.length;
    let loaded = 0;
    await Promise.all(
      families.map(async (family) => {
        try {
          await document.fonts.load(`1em "${family.replace(/"/g, '\\"')}"`);
        } catch (err) {
          console.warn(`[loader] font "${family}" did not load; its fallback stays in use`, err);
        }
        loaded += 1;
        report(loaded / n);
      }),
    );
  };
}

/** Current weighted progress in [0, 1]. Before startLoading it is 0 while tasks are registered. */
export function loaderProgress(): number {
  return currentProgress();
}
