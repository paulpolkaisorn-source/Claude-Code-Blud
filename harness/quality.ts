// Harness for src/gl/quality.ts (architecture section 10a). Open /harness/quality.html?nogl on the dev
// server. The verdict lands in document.documentElement.dataset.harness: 'pass' or 'fail:<reason>'.
//
// No WebGL is used. The watchdog reads frame times from the page clock, so each scenario makes frames of
// a chosen length by busy-waiting inside a tick. What the watchdog does is read back through the real
// modules: env.ts (tier and DPR cap), bus.ts ('quality' events) and ticker.ts (the clock).
import { bus } from '../src/core/bus';
import { env, setTier } from '../src/core/env';
import { addTick, initTicker, PRIORITY, type Tick } from '../src/core/ticker';
import type { Tier } from '../src/core/types';
import { initQuality, type QualityOptions, type QualitySteps, type QualityWatchdog } from '../src/gl/quality';

const THRESHOLD_MS = 18.5;
const LADDER: readonly string[] = ['dofOff', 'bloomOff', 'dprCap:1.25', 'shadowMap:1024'];
// Tolerances for the scenario clock against the ticker clock: each is a few frames at most.
const GAP_MIN_S = 2.95; // 3 s hysteresis
const WARMUP_MIN_S = 1.95; // 2 s warm-up

interface Frame {
  t: number; // seconds from scenario start
  dt: number; // ms, as the ticker reported it
  hidden: boolean;
}
interface StepRec {
  name: string;
  t: number;
  dprCap: number; // env.dprCap when the step ran
  tier: Tier; // env.tier when the step ran
}
interface EventRec {
  t: number;
  tier: Tier;
}
interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
interface Run {
  scenario: Scenario;
  frames: Frame[];
  steps: StepRec[];
  events: EventRec[];
  level: number;
  tierAfter: Tier;
  dprCapAfter: number;
}
interface Scenario {
  id: string;
  title: string;
  expect: string;
  startTier: Tier;
  durationS: number;
  opts?: QualityOptions;
  /** stop() is called at this scenario time, and again at the end. */
  stopAtS?: number;
  /** Busy-wait in ms for the frame at scenario time e, in seconds. */
  load: (e: number) => number;
  setup?: () => void;
  teardown?: () => void;
  checks: (run: Run) => Check[];
}
interface Row {
  id: string;
  check: Check;
}

let recording = false;
let runStart = 0;
let load: (e: number) => number = () => 0;
let frames: Frame[] = [];
let steps: StepRec[] = [];
let events: EventRec[] = [];
let hiddenNow = false;
let s4Switched = false;
let k7 = 0;

function elapsedS(): number {
  return (performance.now() - runStart) / 1000;
}

function busyWait(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // spin on purpose: the frame has to be this long
  }
}

/** Resolves on the first tick at or after the given scenario time. */
function waitUntil(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    const off = addTick(() => {
      if (elapsedS() >= seconds) {
        off();
        resolve();
      }
    }, PRIORITY.glRender + 5);
  });
}

function record(name: string): void {
  steps.push({ name, t: elapsedS(), dprCap: env.dprCap, tier: env.tier });
}

const stepImpl: QualitySteps = {
  dofOff: () => record('dofOff'),
  bloomOff: () => record('bloomOff'),
  dprCap: (cap) => {
    env.dprCap = cap; // what stage.setDprCap does on the page
    record(`dprCap:${cap}`);
  },
  shadowMap: (size) => record(`shadowMap:${size}`),
};

function median(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Frame dt in ms for visible frames whose scenario time is in [from, to). */
function dtIn(list: readonly Frame[], from: number, to: number): number[] {
  return list.filter((f) => !f.hidden && f.t >= from && f.t < to).map((f) => f.dt);
}

function fmt(x: number): string {
  return Number.isFinite(x) ? x.toFixed(1) : 'n/a';
}

function fmtSteps(list: readonly StepRec[]): string {
  return list.length === 0 ? 'none' : list.map((s) => `${s.name} at ${s.t.toFixed(2)} s`).join(', ');
}

function gapsText(list: readonly StepRec[]): string {
  const gaps = list.slice(1).map((s, i) => `${(s.t - list[i].t).toFixed(2)} s`);
  return gaps.length === 0 ? 'n/a' : gaps.join(', ');
}

function sameLadder(list: readonly StepRec[]): boolean {
  return list.length === LADDER.length && list.every((s, i) => s.name === LADDER[i]);
}

function gapsAtLeast(list: readonly StepRec[], minS: number): boolean {
  return list.every((s, i) => i === 0 || s.t - list[i - 1].t >= minS);
}

function check(name: string, ok: boolean, detail: string): Check {
  return { name, ok, detail };
}

// Scenario S1 is the brief's run. Its slow phase is 6 s of 25 ms frames; the first step falls at about 4 s.
const s1: Scenario = {
  id: 'S1',
  title: 'Brief run: 25 ms frames for 6 s, then 10 ms frames for 6 s',
  expect: 'Steps only after the 2 s warm-up, at least 3 s apart, in ladder order. None once the frames are fast again.',
  startTier: 'high',
  durationS: 12,
  load: (e) => (e < 6 ? 25 : 10),
  checks: (r) => {
    const slow = dtIn(r.frames, 2.5, 6);
    const fast = dtIn(r.frames, 7.5, 12);
    return [
      check('load: 25 ms phase measured above 18.5 ms (median)', median(slow) > THRESHOLD_MS, `median ${fmt(median(slow))} ms, ${slow.length} frames`),
      check('load: 10 ms phase measured below 18.5 ms (median)', median(fast) < THRESHOLD_MS, `median ${fmt(median(fast))} ms, ${fast.length} frames`),
      check('a step is taken during the slow phase', r.steps.length >= 1 && r.steps[0].t < 6, fmtSteps(r.steps)),
      check('no step in the first 2 s after init', r.steps.every((s) => s.t >= WARMUP_MIN_S), fmtSteps(r.steps)),
      check('steps follow the ladder order', r.steps.every((s, i) => s.name === LADDER[i]), fmtSteps(r.steps)),
      check('at least 2.95 s between steps', gapsAtLeast(r.steps, GAP_MIN_S), `gaps ${gapsText(r.steps)}`),
      check('no step after the slow phase (1 s allowed for the window to clear)', r.steps.every((s) => s.t <= 7), fmtSteps(r.steps)),
      check(
        'one quality event per step, and the first is mid',
        r.events.length === r.steps.length && (r.steps.length === 0 || r.events[0].tier === 'mid'),
        `events ${r.events.map((e) => e.tier).join(', ') || 'none'}`,
      ),
    ];
  },
};

const s2: Scenario = {
  id: 'S2',
  title: 'Fast frames: 12 ms for 6 s',
  expect: 'No step and no quality event. Level 0, tier and DPR cap unchanged.',
  startTier: 'high',
  durationS: 6,
  load: () => 12,
  checks: (r) => {
    const v = dtIn(r.frames, 2.5, 6);
    return [
      check('load: 12 ms phase measured below 18.5 ms (median)', median(v) < THRESHOLD_MS, `median ${fmt(median(v))} ms, ${v.length} frames`),
      check('no step is taken', r.steps.length === 0, fmtSteps(r.steps)),
      check('no quality event is emitted', r.events.length === 0, `${r.events.length} events`),
      check(
        'level() is 0; tier high and DPR cap 2 unchanged',
        r.level === 0 && r.tierAfter === 'high' && r.dprCapAfter === 2,
        `level ${r.level}, tier ${r.tierAfter}, cap ${r.dprCapAfter}`,
      ),
    ];
  },
};

const s3: Scenario = {
  id: 'S3',
  title: 'Full ladder: 25 ms frames for 16 s, then 12 ms frames for 3 s; start high',
  expect: 'All four steps in order, at least 3 s apart. Tiers mid, mid, low, low. DPR caps 1.75, 1.75, 1.25, 1.25. The fast phase restores nothing.',
  startTier: 'high',
  durationS: 19,
  load: (e) => (e < 16 ? 25 : 12),
  checks: (r) => {
    const caps = r.steps.map((s) => s.dprCap);
    const tiers = r.events.map((e) => e.tier);
    return [
      check('steps are the full ladder, in order', sameLadder(r.steps), fmtSteps(r.steps)),
      check(
        'at least 2.95 s between steps; first step at least 1.95 s after init',
        r.steps.length > 0 && r.steps[0].t >= WARMUP_MIN_S && gapsAtLeast(r.steps, GAP_MIN_S),
        `gaps ${gapsText(r.steps)}`,
      ),
      check('quality events are mid, mid, low, low', tiers.join() === 'mid,mid,low,low', `events ${tiers.join(', ')}`),
      check('DPR cap at each step is 1.75, 1.75, 1.25, 1.25', caps.join() === '1.75,1.75,1.25,1.25', `caps ${caps.join(', ')}`),
      check('level() is 4, and every step falls in the slow phase', r.level === 4 && r.steps.every((s) => s.t < 16), `level ${r.level}`),
      check(
        'after the fast phase: tier still low, DPR cap still 1.25',
        r.tierAfter === 'low' && r.dprCapAfter === 1.25,
        `tier ${r.tierAfter}, cap ${r.dprCapAfter}`,
      ),
    ];
  },
};

// Tab switch. The page reports itself hidden until 8 s. At 8 s it becomes visible, and the frame before
// that runs 300 ms long, so the first visible dt is at the clamp. Frames while hidden must not count.
const s4: Scenario = {
  id: 'S4',
  title: 'Tab hidden until 8 s, then a clamped frame, then 25 ms frames to 12 s',
  expect: 'Hidden frames do not count, so no step comes before a full window of visible frames (about 10 s).',
  startTier: 'high',
  durationS: 12,
  setup: () => {
    s4Switched = false;
    hiddenNow = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hiddenNow });
  },
  teardown: () => {
    Reflect.deleteProperty(document, 'hidden');
    hiddenNow = false;
  },
  load: (e) => {
    if (s4Switched || e < 8) return 25;
    s4Switched = true;
    hiddenNow = false;
    document.dispatchEvent(new Event('visibilitychange'));
    return 300; // this frame runs long, so the next frame's dt is at the clamp
  },
  checks: (r) => {
    const hidden = r.frames.filter((f) => f.hidden).length;
    const visible = dtIn(r.frames, 8.5, 12);
    return [
      check('hidden phase produced frames (the test ran)', hidden >= 100, `${hidden} hidden frames`),
      check('load: visible 25 ms frames measured above 18.5 ms (median)', median(visible) > THRESHOLD_MS, `median ${fmt(median(visible))} ms, ${visible.length} frames`),
      check('no step while hidden, or before a full window of visible frames (earliest 9.5 s)', r.steps.every((s) => s.t >= 9.5), fmtSteps(r.steps)),
      check('a step follows once the window of visible frames is full', r.steps.length >= 1, fmtSteps(r.steps)),
    ];
  },
};

const s5: Scenario = {
  id: 'S5',
  title: 'stop(): 25 ms frames for 6 s, stop() at 3 s',
  expect: 'Without the stop, the first step would fall near 3.5 s. After stop() at 3 s no step follows, and a second stop() does nothing.',
  startTier: 'high',
  durationS: 6,
  stopAtS: 3,
  load: () => 25,
  checks: (r) => {
    const v = dtIn(r.frames, 2.5, 3);
    return [
      check('load: 25 ms frames measured above 18.5 ms (median) before the stop', median(v) > THRESHOLD_MS, `median ${fmt(median(v))} ms, ${v.length} frames`),
      check('no step after stop()', r.steps.length === 0, fmtSteps(r.steps)),
      check('no quality event after stop()', r.events.length === 0, `${r.events.length} events`),
      check('level() is 0 and the tier is unchanged', r.level === 0 && r.tierAfter === 'high', `level ${r.level}, tier ${r.tierAfter}`),
    ];
  },
};

const s6: Scenario = {
  id: 'S6',
  title: 'Options: warmupS 0.5, hysteresisS 1; 25 ms frames for 5 s',
  expect: 'The first step comes after 0.5 s of warm-up and a full window of 60 frames, about 2 s rather than the default 3.5 s. Gaps are at least 1 s.',
  startTier: 'high',
  durationS: 5,
  opts: { warmupS: 0.5, hysteresisS: 1 },
  load: () => 25,
  checks: (r) => [
    check('at least one step is taken', r.steps.length >= 1, fmtSteps(r.steps)),
    check(
      'first step after 0.45 s and before 3.5 s',
      r.steps.length >= 1 && r.steps[0].t >= 0.45 && r.steps[0].t < 3.5,
      fmtSteps(r.steps),
    ),
    check('at least 0.95 s between steps', gapsAtLeast(r.steps, 0.95), `gaps ${gapsText(r.steps)}`),
  ],
};

const s6b: Scenario = {
  id: 'S6b',
  title: 'Options: thresholdMs 40; 25 ms frames for 6 s',
  expect: 'The median of 25 ms frames is 25 ms, below the 40 ms threshold, so no step is taken.',
  startTier: 'high',
  durationS: 6,
  opts: { thresholdMs: 40 },
  load: () => 25,
  checks: (r) => {
    const v = dtIn(r.frames, 2.5, 6);
    return [
      check('load: median of the 25 ms phase is between 25 and 40 ms', median(v) >= 25 && median(v) < 40, `median ${fmt(median(v))} ms, ${v.length} frames`),
      check('no step is taken', r.steps.length === 0, fmtSteps(r.steps)),
    ];
  },
};

// One frame in three is long (50 ms, the ticker's clamp), the other two are short. Measured through the
// ticker, that gives a median near 17 ms and a mean near 27 ms. A mean-based rule would step; a median does not.
const s7: Scenario = {
  id: 'S7',
  title: 'Median, not mean: every third frame at 50 ms, the others at 8 ms, for 9 s',
  expect: 'The mean is above 18.5 ms and the median is below it, so no step is taken.',
  startTier: 'high',
  durationS: 9,
  setup: () => {
    k7 = 0;
  },
  load: () => {
    const n = k7;
    k7 += 1;
    return n % 3 === 0 ? 50 : 8;
  },
  checks: (r) => {
    const v = dtIn(r.frames, 2.5, 9);
    return [
      check(
        'load: mean above 18.5 ms and median below it',
        mean(v) > THRESHOLD_MS && median(v) < THRESHOLD_MS,
        `mean ${fmt(mean(v))} ms, median ${fmt(median(v))} ms, ${v.length} frames`,
      ),
      check('no step is taken', r.steps.length === 0, fmtSteps(r.steps)),
    ];
  },
};

// Low start: the ladder still completes, the tier is never raised, and the DPR cap ends at 1.25.
const s8: Scenario = {
  id: 'S8',
  title: 'Low start: 25 ms frames for 16 s; start low',
  expect: 'The ladder still completes. The tier stays low and is never raised. The DPR cap ends at 1.25.',
  startTier: 'low',
  durationS: 16,
  load: () => 25,
  checks: (r) => {
    const tiers = r.events.map((e) => e.tier);
    const caps = r.steps.map((s) => s.dprCap);
    return [
      check('steps are the full ladder, in order', sameLadder(r.steps), fmtSteps(r.steps)),
      check('quality events are low, low, low, low', tiers.join() === 'low,low,low,low', `events ${tiers.join(', ')}`),
      check('DPR cap at each step is 1.5, 1.5, 1.25, 1.25', caps.join() === '1.5,1.5,1.25,1.25', `caps ${caps.join(', ')}`),
      check('final tier low and DPR cap 1.25', r.tierAfter === 'low' && r.dprCapAfter === 1.25, `tier ${r.tierAfter}, cap ${r.dprCapAfter}`),
    ];
  },
};

const SCENARIOS: readonly Scenario[] = [s1, s2, s3, s4, s5, s6, s6b, s7, s8];

async function runScenario(sc: Scenario): Promise<Run> {
  setTier(sc.startTier);
  frames = [];
  steps = [];
  events = [];
  load = sc.load;
  sc.setup?.();
  runStart = performance.now();
  recording = true;
  const offQuality = bus.on('quality', (tier) => {
    events.push({ t: elapsedS(), tier });
  });
  const wd: QualityWatchdog = initQuality(stepImpl, sc.opts);
  if (sc.stopAtS !== undefined) {
    await waitUntil(sc.stopAtS);
    wd.stop();
  }
  await waitUntil(sc.durationS);
  wd.stop();
  recording = false;
  offQuality();
  sc.teardown?.();
  return {
    scenario: sc,
    frames,
    steps,
    events,
    level: wd.level(),
    tierAfter: env.tier,
    dprCapAfter: env.dprCap,
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    return '&quot;';
  });
}

function plotFigure(run: Run): string {
  const sc = run.scenario;
  const W = 960;
  const H = 170;
  const L = 40;
  const R = 64;
  const TOP = 26;
  const BOT = 24;
  const bottom = H - BOT;
  const span = sc.durationS;
  const warm = sc.opts?.warmupS ?? 2;
  const px = (t: number): number => L + (Math.min(Math.max(t, 0), span) / span) * (W - L - R);
  const py = (ms: number): number => TOP + (1 - Math.min(Math.max(ms, 0), 50) / 50) * (bottom - TOP);
  const out: string[] = [];

  out.push(`<rect class="warm" x="${px(0)}" y="${TOP}" width="${px(warm) - px(0)}" height="${bottom - TOP}"/>`);
  let i = 0;
  while (i < run.frames.length) {
    if (!run.frames[i].hidden) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < run.frames.length && run.frames[j + 1].hidden) j += 1;
    const x0 = px(run.frames[i].t);
    const x1 = px(run.frames[j].t);
    out.push(`<rect class="hidden" x="${x0}" y="${TOP}" width="${Math.max(1, x1 - x0)}" height="${bottom - TOP}"/>`);
    i = j + 1;
  }
  for (const ms of [0, 25, 50]) {
    out.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${py(ms)}" y2="${py(ms)}"/>`);
    out.push(`<text x="${L - 6}" y="${py(ms) + 4}" text-anchor="end">${ms}</text>`);
  }
  out.push(
    `<line class="threshold" x1="${L}" x2="${W - R}" y1="${py(THRESHOLD_MS)}" y2="${py(THRESHOLD_MS)}"/>` +
      `<text class="thr" x="${W - R + 6}" y="${py(THRESHOLD_MS) + 4}" text-anchor="start">18.5 ms</text>`,
  );
  for (let s = 0; s <= span; s += 2) {
    out.push(`<text x="${px(s)}" y="${H - 6}" text-anchor="middle">${s} s</text>`);
  }
  const pts = run.frames.map((f) => `${px(f.t).toFixed(1)},${py(f.dt).toFixed(1)}`).join(' ');
  out.push(`<polyline class="trace" points="${pts}"/>`);
  if (sc.stopAtS !== undefined) {
    const x = px(sc.stopAtS);
    out.push(`<line class="stop" x1="${x}" x2="${x}" y1="${TOP}" y2="${bottom}"/>`);
    out.push(`<text class="stoplabel" x="${x + 4}" y="${TOP + 12}">stop()</text>`);
  }
  run.steps.forEach((s, k) => {
    const x = px(s.t);
    const tier = run.events[k]?.tier ?? '';
    out.push(`<line class="step" x1="${x}" x2="${x}" y1="${TOP}" y2="${bottom}"/>`);
    out.push(`<text class="steplabel" x="${x + 4}" y="${TOP + 12}">${k + 1} ${esc(s.name)}</text>`);
    out.push(`<text class="steplabel" x="${x + 4}" y="${TOP + 25}">tier ${esc(tier)}</text>`);
  });

  const stepText = run.steps.length === 0 ? 'no steps' : `${run.steps.length} step${run.steps.length === 1 ? '' : 's'}`;
  return (
    `<figure>` +
    `<figcaption><strong>${sc.id}</strong> ${esc(sc.title)}<br>` +
    `<span class="expect">expect: ${esc(sc.expect)}</span><br>` +
    `<span class="label">${run.frames.length} frames, ${stepText}, level ${run.level}, tier ${esc(run.tierAfter)}, DPR cap ${run.dprCapAfter}</span></figcaption>` +
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sc.id)} frame times and steps">${out.join('')}</svg>` +
    `</figure>`
  );
}

function render(runs: readonly Run[], rows: readonly Row[]): void {
  const root = document.getElementById('report');
  if (!root) return;
  const body = rows
    .map(
      (row) =>
        `<tr class="${row.check.ok ? 'pass' : 'fail'}"><td>${row.id}</td><td>${esc(row.check.name)}</td>` +
        `<td>${row.check.ok ? 'PASS' : 'FAIL'}</td><td>${esc(row.check.detail)}</td></tr>`,
    )
    .join('');
  root.innerHTML =
    `<table><thead><tr><th>scenario</th><th>check</th><th>result</th><th>measured</th></tr></thead>` +
    `<tbody>${body}</tbody></table>` +
    runs.map(plotFigure).join('');
}

function setVerdict(text: string): void {
  const el = document.getElementById('verdict');
  if (el) el.textContent = text;
}

function finish(result: string): void {
  if (document.documentElement.dataset.harness !== undefined) return;
  document.documentElement.dataset.harness = result;
  setVerdict(result);
}

async function main(): Promise<void> {
  initTicker();
  // Recorder: first in every frame, so it sees the same dt the watchdog sees.
  addTick((t: Tick): void => {
    if (!recording) return;
    frames.push({ t: elapsedS(), dt: t.dt * 1000, hidden: document.hidden });
  }, PRIORITY.input);
  // Load: the busy-wait that makes the frame long, after the watchdog has read its dt.
  addTick((): void => {
    if (!recording) return;
    const ms = load(elapsedS());
    if (ms > 0) busyWait(ms);
  }, PRIORITY.glRender);

  const runs: Run[] = [];
  const rows: Row[] = [];
  for (const sc of SCENARIOS) {
    setVerdict(`running ${sc.id}: ${sc.title}`);
    const run = await runScenario(sc);
    runs.push(run);
    for (const c of sc.checks(run)) {
      rows.push({ id: sc.id, check: c });
      console.log(`${c.ok ? 'PASS' : 'FAIL'} [${sc.id}] ${c.name} :: ${c.detail}`);
    }
  }
  const failed = rows.filter((row) => !row.check.ok);
  render(runs, rows);
  console.log(`[harness] ${rows.length - failed.length} checks passed, ${failed.length} failed`);
  finish(failed.length === 0 ? 'pass' : `fail:${failed.map((row) => `${row.id} ${row.check.name}`).join('; ')}`);
}

const guard = window.setTimeout(() => finish('fail:timeout after 300 s'), 300_000);
main()
  .catch((err: unknown) => {
    recording = false;
    load = () => 0;
    console.log(`[harness] uncaught: ${String(err)}`);
    finish(`fail:exception ${String(err)}`);
  })
  .finally(() => {
    window.clearTimeout(guard);
  });
