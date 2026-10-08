// Harness for src/core/env.ts and src/partials/head-env.html (architecture section 10a).
// Open /harness/env.html on the dev server. The verdict lands in dataset.harness: 'pass' or 'fail:<checks>'.
// Switches: ?nogl (the QA switch that head-env reads) and ?expect=reduced (the driver runs with reduced motion).
// The driver flips the emulated prefers-reduced-motion twice: once when dataset.harnessPhase is 'rm-1',
// and again when it is 'rm-2'.
import {
  env,
  onReducedMotionChange,
  pickTier,
  setTier,
  type DeviceSignals,
  type Tier,
} from '../src/core/env';

const DPR_OF: Readonly<Record<Tier, number>> = { low: 1.5, mid: 1.75, high: 2 };
const root = document.documentElement;
const expectReduced = new URLSearchParams(location.search).get('expect') === 'reduced';
const expectNoGl = location.search.includes('nogl');

let passed = 0;
const failed: string[] = [];

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

function finish(): void {
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
  console.log(`harness: ${passed} passed, ${failed.length} failed`);
}

/** Creates a WebGL2 context on a detached canvas, releases it, and reports whether one was created. */
function probeWebGL2(): boolean {
  const ctx = document.createElement('canvas').getContext('webgl2');
  if (!ctx) return false;
  ctx.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

/** Resolves true once pred() holds, or false after ms milliseconds. */
async function waitUntil(pred: () => boolean, ms: number): Promise<boolean> {
  const start = performance.now();
  while (!pred()) {
    if (performance.now() - start > ms) return false;
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  return true;
}

const CASES: ReadonlyArray<readonly [DeviceSignals, Tier]> = [
  [{ cores: 2, mem: 8, shortSide: 900, touch: false }, 'low'],
  [{ cores: 4, mem: 16, shortSide: 1080, touch: false }, 'low'],
  [{ cores: 8, mem: 4, shortSide: 900, touch: false }, 'low'],
  [{ cores: 8, mem: 8, shortSide: 390, touch: true }, 'low'],
  [{ cores: 8, mem: 8, shortSide: 800, touch: true }, 'mid'],
  [{ cores: 8, mem: 8, shortSide: 1080, touch: false }, 'high'],
  [{ cores: 6, mem: 8, shortSide: 1080, touch: false }, 'mid'],
  [{ cores: 8, mem: 6, shortSide: 1080, touch: false }, 'mid'],
];

async function run(): Promise<void> {
  console.log(`env at boot ${JSON.stringify(env)} class="${root.className}"`);

  // 1. Classes set by head-env.
  check(
    "html has 'js' and not 'no-js'",
    root.classList.contains('js') && !root.classList.contains('no-js'),
    `class="${root.className}"`,
  );

  // 2. Head-script timing, read from the User Timing measure that head-env writes.
  const [headEntry] = performance.getEntriesByName('head-env', 'measure');
  check('head-env wrote its timing measure', headEntry !== undefined);
  if (headEntry !== undefined) {
    console.log(`head-env inline script: ${headEntry.duration.toFixed(2)} ms`);
    check('head-env script under 15 ms', headEntry.duration < 15, `${headEntry.duration.toFixed(2)} ms`);
  }

  // 3. env reads the head classes (the single source of truth).
  check('env.gl mirrors the no-gl class', env.gl === !root.classList.contains('no-gl'));
  check(
    'env.reducedMotion mirrors the reduced-motion class',
    env.reducedMotion === root.classList.contains('reduced-motion'),
  );
  check('env.touch mirrors the touch class', env.touch === root.classList.contains('touch'));

  // 4. env agrees with the media queries, and the run mode is what the driver asked for.
  check(
    'env.reducedMotion matches the media query',
    env.reducedMotion === matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  check('env.touch matches the media query', env.touch === matchMedia('(hover: none) and (pointer: coarse)').matches);
  check(
    'env.finePointer matches the media query',
    env.finePointer === matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  check(
    expectReduced ? 'reduced run: env.reducedMotion is true' : 'default run: env.reducedMotion is false',
    env.reducedMotion === expectReduced,
  );

  // 5. WebGL2. ?nogl must give gl=false. Otherwise env.gl must equal what a probe finds.
  if (expectNoGl) {
    check('?nogl: no-gl class set and env.gl false', root.classList.contains('no-gl') && env.gl === false, `env.gl=${env.gl}`);
  } else {
    const probe = probeWebGL2();
    if (!probe) console.log('FINDING WebGL2 is unavailable in this browser. env.gl=false is the correct answer.');
    check('env.gl equals WebGL2 availability', env.gl === probe, `env.gl=${env.gl} probe=${probe}`);
  }

  // 6. Tier heuristic (pure function), DPR cap, and setTier.
  const wrong = CASES.filter(([s, want]) => pickTier(s) !== want).map(([s, want]) => `${JSON.stringify(s)} wants ${want}`);
  check('pickTier matches the heuristic table', wrong.length === 0, wrong.length === 0 ? `${CASES.length} cases` : wrong.join(' | '));
  check('env.dprCap matches env.tier', env.dprCap === DPR_OF[env.tier], `tier=${env.tier} dprCap=${env.dprCap}`);

  const bootTier = env.tier;
  setTier('low');
  const low = env.tier === 'low' && env.dprCap === 1.5;
  setTier('high');
  const high = env.tier === 'high' && env.dprCap === 2;
  setTier('mid');
  const mid = env.tier === 'mid' && env.dprCap === 1.75;
  setTier(bootTier);
  check('setTier sets tier and dprCap for low, high and mid', low && high && mid);
  check('setTier restores the boot tier', env.tier === bootTier && env.dprCap === DPR_OF[bootTier]);

  // 7. Runtime prefers-reduced-motion change. Two subscribers; the second one leaves after flip 1.
  const boot = env.reducedMotion;
  const seenA: boolean[] = [];
  const seenB: boolean[] = [];
  const offA = onReducedMotionChange((r) => {
    seenA.push(r);
  });
  const offB: () => void = onReducedMotionChange((r) => {
    seenB.push(r);
    offB();
  });

  root.dataset.harnessPhase = 'rm-1';
  if (await waitUntil(() => seenA.length >= 1, 15000)) {
    check('flip 1 reached the subscriber with the opposite value', seenA[0] === !boot, `boot=${boot} seen=${seenA[0]}`);
    check('flip 1 updated env.reducedMotion', env.reducedMotion === !boot);
    check('flip 1 updated the reduced-motion class', root.classList.contains('reduced-motion') === !boot);
    check('second subscriber received flip 1', seenB.length === 1 && seenB[0] === !boot);

    root.dataset.harnessPhase = 'rm-2';
    if (await waitUntil(() => seenA.length >= 2, 15000)) {
      check('flip 2 restored the boot value', seenA[1] === boot && env.reducedMotion === boot);
      check('flip 2 restored the reduced-motion class', root.classList.contains('reduced-motion') === boot);
      check('unsubscribed callback stayed silent after leaving', seenB.length === 1);
    } else {
      check('flip 2 delivered to the subscriber', false, `seen=${JSON.stringify(seenA)}`);
    }
  } else {
    check('flip 1 delivered to the subscriber', false, `seen=${JSON.stringify(seenA)}`);
  }
  offA();
}

run()
  .catch((err: unknown) => {
    failed.push('exception');
    console.log(`FAIL exception :: ${String(err)}`);
  })
  .finally(finish);
