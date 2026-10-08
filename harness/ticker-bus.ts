// Harness for src/core/ticker.ts and src/core/bus.ts (architecture section 10a).
// Open /harness/ticker-bus.html on the dev server. The verdict lands in dataset.harness.
import { gsap } from 'gsap';
import { addTick, initTicker, PRIORITY, tickerTime, type Tick } from '../src/core/ticker';
import { bus } from '../src/core/bus';

interface Sample {
  frame: number;
  time: number;
  dt: number;
}

const DT_MAX = 0.05;
// Runs after every PRIORITY value, so a frames() promise resolves once the tick is otherwise complete.
const LAST = 1000;

let passed = 0;
const failed: string[] = [];
let finished = false;

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

function finish(result: string): void {
  if (finished) return;
  finished = true;
  document.documentElement.dataset.harness = result;
}

/** Resolves after n more ticks. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const off = addTick(() => {
      left -= 1;
      if (left === 0) {
        off();
        resolve();
      }
    }, LAST);
  });
}

/** Returns the first problem found in the recorded ticks, or null when every invariant holds. */
function tickProblem(records: readonly Sample[]): string | null {
  for (let i = 0; i < records.length; i += 1) {
    const r = records[i];
    if (!(r.dt >= 0 && r.dt <= DT_MAX)) return `dt ${r.dt} out of [0, ${DT_MAX}] at frame ${r.frame}`;
    if (i === 0) continue;
    const p = records[i - 1];
    if (r.frame !== p.frame + 1) return `frame jumped ${p.frame} -> ${r.frame}`;
    if (r.time < p.time) return `time went backwards at frame ${r.frame}`;
    if (r.time - p.time < r.dt - 1e-9) return `time advanced less than dt at frame ${r.frame}`;
  }
  return null;
}

async function runTickerChecks(): Promise<void> {
  const records: Sample[] = [];
  // Registered before initTicker, so it sees every tick from frame 0.
  addTick((t: Tick) => {
    records.push({ frame: t.frame, time: t.time, dt: t.dt });
  }, PRIORITY.input);

  let earlyCalls = 0;
  addTick(() => {
    earlyCalls += 1;
  }, PRIORITY.state);

  check('tickerTime() is 0 before initTicker', tickerTime() === 0, `value=${tickerTime()}`);

  const realAdd = gsap.ticker.add.bind(gsap.ticker);
  let gsapListeners = 0;
  gsap.ticker.add = (callback, once, prioritize) => {
    gsapListeners += 1;
    return realAdd(callback, once, prioritize);
  };
  initTicker();
  initTicker();
  initTicker();
  gsap.ticker.add = realAdd;
  check('initTicker called 3 times adds exactly one gsap.ticker listener', gsapListeners === 1, `gsap.ticker.add calls=${gsapListeners}`);

  await frames(3);
  const first = records[0];
  check(
    'first tick is frame 0 with time 0 and dt 0',
    first.frame === 0 && first.time === 0 && first.dt === 0,
    `frame=${first.frame} time=${first.time} dt=${first.dt}`,
  );
  check(
    'addTick before initTicker: fn runs once per tick, no double calls',
    earlyCalls === records.length,
    `early=${earlyCalls} ticks=${records.length}`,
  );

  // Priority order: five fns registered out of order.
  const seq: string[] = [];
  const named = (name: string): (() => void) => () => {
    seq.push(name);
  };
  const orderOffs = [
    addTick(named('glRender'), PRIORITY.glRender),
    addTick(named('input'), PRIORITY.input),
    addTick(named('state'), PRIORITY.state),
    addTick(named('glUpdate'), PRIORITY.glUpdate),
    addTick(named('scroll'), PRIORITY.scroll),
  ];
  await frames(1);
  check('priority order: 5 fns registered out of order run input,scroll,state,glUpdate,glRender', seq.join() === 'input,scroll,state,glUpdate,glRender', seq.join());
  orderOffs.forEach((off) => off());

  // Stable order within a priority: equal priorities keep insertion order; default priority is state.
  seq.length = 0;
  const stableOffs = [
    addTick(named('a'), PRIORITY.state),
    addTick(named('d'), PRIORITY.scroll),
    addTick(named('b'), PRIORITY.state),
    addTick(named('c'), PRIORITY.state),
    addTick(named('e'), PRIORITY.state),
    addTick(named('f')),
  ];
  await frames(1);
  check('stable insertion order within a priority (default priority = state)', seq.join() === 'd,a,b,c,e,f', seq.join());
  stableOffs.forEach((off) => off());

  // Add during a tick: the new fn first runs on the following tick, even at an earlier priority.
  let adderTick = -1;
  let spawnedTick = -1;
  let spawnedCalls = 0;
  let adderArmed = true;
  let offSpawned: () => void = () => {};
  const offAdder = addTick((t) => {
    if (!adderArmed) return;
    adderArmed = false;
    adderTick = t.frame;
    offSpawned = addTick((u) => {
      spawnedCalls += 1;
      if (spawnedTick === -1) spawnedTick = u.frame;
    }, PRIORITY.scroll);
  }, PRIORITY.state);
  await frames(2);
  offAdder();
  offSpawned();
  check(
    'fn added mid-tick first runs on the next tick',
    spawnedTick === adderTick + 1 && spawnedCalls >= 1,
    `added in frame ${adderTick}, first ran in frame ${spawnedTick}, calls=${spawnedCalls}`,
  );

  // Remove during a tick: the victim is not called after its removal tick; the killer removes itself.
  let victimCalls = 0;
  const offVictim = addTick(() => {
    victimCalls += 1;
  }, PRIORITY.glRender);
  let killerCalls = 0;
  const offKiller = addTick(() => {
    killerCalls += 1;
    offVictim();
    offKiller();
  }, PRIORITY.glUpdate);
  await frames(1);
  const atRemoval = victimCalls;
  await frames(3);
  check(
    'removed mid-tick: victim not called on later ticks',
    victimCalls === atRemoval,
    `calls in removal tick=${atRemoval}, final=${victimCalls}`,
  );
  check('removed mid-tick: victim runs at most once in the removal tick', atRemoval <= 1, `calls=${atRemoval}`);
  check('self-removal: killer ran exactly once', killerCalls === 1, `killer calls=${killerCalls}`);

  // A throwing fn: later fns keep running, the error is reported once, and the thrower keeps being called.
  let thrownCalls = 0;
  let survivorCalls = 0;
  function harnessThrower(): void {
    thrownCalls += 1;
    throw new Error('harness: deliberate tick error');
  }
  const offThrower = addTick(harnessThrower, 5);
  const offSurvivor = addTick(() => {
    survivorCalls += 1;
  }, 6);
  const realError = console.error;
  const errorArgs: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    errorArgs.push(args);
    realError(...args);
  };
  await frames(4);
  console.error = realError;
  offThrower();
  offSurvivor();
  const reports = errorArgs.filter((args) => String(args[0]).includes('harnessThrower')).length;
  check(
    'throwing fn does not stop later fns',
    survivorCalls === 4 && thrownCalls === 4,
    `survivor=${survivorCalls} thrower=${thrownCalls}`,
  );
  check('throwing fn is reported with console.error exactly once', reports === 1, `reports=${reports}`);

  // A 300 ms frame: the next dt is clamped to 0.05, while time keeps counting wall-clock seconds.
  let busyTick = -1;
  let busyArmed = true;
  const offBusy = addTick((t) => {
    if (!busyArmed) return;
    busyArmed = false;
    busyTick = t.frame;
    const end = performance.now() + 300;
    while (performance.now() < end) {
      // spin for 300 ms
    }
  }, 95);
  await frames(3);
  offBusy();
  const beforeBusy = records.find((r) => r.frame === busyTick);
  const afterBusy = records.find((r) => r.frame === busyTick + 1);
  check(
    'dt is clamped to 0.05 on the tick after a 300 ms frame',
    afterBusy !== undefined && afterBusy.dt === DT_MAX,
    `dt=${afterBusy?.dt}`,
  );
  check(
    'time still advances by the full 300 ms across that frame',
    beforeBusy !== undefined && afterBusy !== undefined && afterBusy.time - beforeBusy.time > 0.25,
    `gap=${(afterBusy?.time ?? 0) - (beforeBusy?.time ?? 0)}`,
  );

  const problem = tickProblem(records);
  check('tick invariants hold for every tick (dt in [0, 0.05], frames consecutive, time monotonic)', problem === null, problem ?? `${records.length} ticks`);
  const latest = records[records.length - 1];
  check('tickerTime() equals the latest tick time', Math.abs(tickerTime() - latest.time) < 1e-9, `tickerTime=${tickerTime()} latest=${latest.time}`);
}

function runBusChecks(): void {
  check('bus.last() is undefined before any emit', bus.last('formation') === undefined);

  const progress: number[] = [];
  const offProgress = bus.on('loader:progress', (v) => {
    progress.push(v);
  });
  bus.emit('loader:progress', 0.25);
  bus.emit('loader:progress', 1);
  check('on() receives every emit in order', JSON.stringify(progress) === '[0.25,1]', JSON.stringify(progress));
  check('last() returns the most recent value', bus.last('loader:progress') === 1, `last=${bus.last('loader:progress')}`);
  offProgress();
  bus.emit('loader:progress', 0.5);
  check('unsubscribe stops delivery; last() still tracks the emit', progress.length === 2 && bus.last('loader:progress') === 0.5, `calls=${progress.length} last=${bus.last('loader:progress')}`);

  let onceHits = 0;
  bus.once('theme', () => {
    onceHits += 1;
  });
  bus.emit('theme', 'ink');
  bus.emit('theme', 'paper');
  check('once() fires for the next emit only', onceHits === 1 && bus.last('theme') === 'paper', `hits=${onceHits} last=${bus.last('theme')}`);

  let doneHits = 0;
  bus.on('loader:done', () => {
    doneHits += 1;
  });
  bus.emit('loader:done');
  check('void event emitted with no argument reaches the listener', doneHits === 1, `hits=${doneHits}`);

  // A listener added during an emit first runs on the next emit.
  const seen: string[] = [];
  let offLate: () => void = () => {};
  bus.once('section:enter', () => {
    seen.push('adder');
    offLate = bus.on('section:enter', () => {
      seen.push('late');
    });
  });
  bus.emit('section:enter', 'hero');
  const afterFirst = seen.join();
  bus.emit('section:enter', 'speed');
  offLate();
  check('listener added during emit is not called in that emit', afterFirst === 'adder', `after first emit=${afterFirst}`);
  check('listener added during emit runs on the next emit', seen.join() === 'adder,late', seen.join());

  // A throwing listener is logged and the others still run.
  const realError = console.error;
  const errorArgs: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    errorArgs.push(args);
    realError(...args);
  };
  let survivors = 0;
  const offThrowing = bus.on('formation', () => {
    throw new Error('harness: deliberate bus error');
  });
  const offSurvivor = bus.on('formation', () => {
    survivors += 1;
  });
  bus.emit('formation', 'stanza');
  console.error = realError;
  offThrowing();
  offSurvivor();
  check(
    'throwing listener is console.error-ed and does not stop others',
    survivors === 1 && errorArgs.length === 1 && String(errorArgs[0][0]).startsWith('[bus]'),
    `survivors=${survivors} errors=${errorArgs.length}`,
  );
  check('bus.last() tracks formation', bus.last('formation') === 'stanza');
}

/**
 * Compile-time checks only; never called. tsc fails if a @ts-expect-error line stops producing its error.
 */
export function typeOnlyChecks(): void {
  bus.emit('loader:done');
  bus.emit('section:enter', 'hero');
  const progressNow: number | undefined = bus.last('loader:progress');
  void progressNow;
  // @ts-expect-error: a number event needs its payload
  bus.emit('loader:progress');
  // @ts-expect-error: 'purple' is not a Theme
  bus.emit('theme', 'purple');
}

const watchdog = window.setTimeout(() => finish('fail:timeout after 20 s'), 20000);

async function main(): Promise<void> {
  await runTickerChecks();
  runBusChecks();
  window.clearTimeout(watchdog);
  console.log(`[harness] ${passed} checks passed, ${failed.length} failed`);
  finish(failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`);
}

main().catch((err: unknown) => {
  window.clearTimeout(watchdog);
  console.log(`[harness] uncaught: ${String(err)}`);
  finish(`fail:exception ${String(err)}`);
});
