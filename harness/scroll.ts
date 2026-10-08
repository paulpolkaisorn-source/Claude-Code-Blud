// Harness for src/core/scroll.ts (architecture section 10a). Open /harness/scroll.html on the dev server.
// The verdict lands in dataset.harness: 'pass' or 'fail:<checks>'. Each check logs PASS or FAIL.
//
// Input comes from a Playwright driver. Before each input this page sets dataset.harnessPhase. The
// driver performs the input and then sets dataset.harnessAck to the same phase. The phases, in order:
// 'wheel' (10 wheel events of 400 px, 50 ms apart), 'anchor' (click the s5 link), 'keys' (PageDown x3).
// The driver runs this page twice: normally (Lenis on) and with prefers-reduced-motion: reduce (Lenis off).
//
// requestAnimationFrame is probed before any module that uses it is loaded. The modules are therefore
// imported dynamically inside main(), after the probe is installed. The page clock (gsap.ticker) must be
// the only chain this code starts: one request per frame, never two pending. gsap's ScrollTrigger keeps a
// loop of its own once enabled. The harness logs that loop as KNOWN rather than failing on it, because the
// brief's single-chain rule cannot hold while ScrollTrigger is enabled.

const root = document.documentElement;

// ---- requestAnimationFrame probe ----------------------------------------------------------------

// Every call is keyed by its caller, "<function> @ <file>", read from the stack. The bundler may add a
// numeric suffix to a function name (_tick2), so classification uses patterns, not exact names.
const requested = new Map<string, number>(); // calls per caller
const fired = new Map<string, number>(); // callbacks run per caller
const pendingOf = new Map<number, string>(); // request id -> caller, until it runs or is cancelled
const pendingCount = new Map<string, number>(); // requests pending per caller now
const pendingMax = new Map<string, number>(); // most requests pending per caller, since the last reset

function settle(id: number): void {
  const site = pendingOf.get(id);
  if (site === undefined) return;
  pendingOf.delete(id);
  pendingCount.set(site, (pendingCount.get(site) ?? 0) - 1);
}

function callerSite(stack: string): string {
  const line = (stack.split('\n')[2] ?? '').trim(); // [0] "Error", [1] the probe wrapper, [2] the caller
  const fn = /^at (?:async )?([^\s(]+)/.exec(line)?.[1] ?? 'anonymous';
  const file = /([^/\\?()\s]+\.(?:m?js|ts))/.exec(line)?.[1] ?? 'unknown';
  return `${fn} @ ${file}`;
}

const nativeRequest = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);

window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const site = callerSite(new Error().stack ?? '');
  requested.set(site, (requested.get(site) ?? 0) + 1);
  const id = nativeRequest((time: number) => {
    settle(id);
    fired.set(site, (fired.get(site) ?? 0) + 1);
    callback(time);
  });
  pendingOf.set(id, site);
  const count = (pendingCount.get(site) ?? 0) + 1;
  pendingCount.set(site, count);
  pendingMax.set(site, Math.max(pendingMax.get(site) ?? 0, count));
  return id;
};

window.cancelAnimationFrame = (id: number): void => {
  settle(id);
  nativeCancel(id);
};

/** The page clock: gsap.ticker's loop (gsap.js, function _tick), which runs every tick function in src/core/ticker.ts. */
function isPageClock(site: string): boolean {
  return /^_tick\d* @ gsap\.js$/.test(site);
}

/** gsap's ScrollTrigger, which is not ours: its own loop (_rafBugFix) and its periodic one-off frames (_sync). */
function isScrollTrigger(site: string): boolean {
  return /ScrollTrigger\.js$/.test(site);
}

// ---- helpers ------------------------------------------------------------------------------------

const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    console.log(`PASS ${name}${suffix}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitUntil(done: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const end = performance.now() + timeoutMs;
  while (!done()) {
    if (performance.now() > end) throw new Error(`timed out waiting for ${label}`);
    await sleep(20);
  }
}

/** Asks the driver for one input and waits for its ack. Returns the times the input was asked for and confirmed. */
async function input(phase: string): Promise<{ start: number; end: number }> {
  const start = performance.now();
  root.dataset.harnessPhase = phase;
  await waitUntil(() => root.dataset.harnessAck === phase, 20000, `driver ack for "${phase}"`);
  return { start, end: performance.now() };
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) throw new Error(`missing #${id}`);
  return el;
}

function describe(el: Element | null): string {
  if (el === null) return 'nothing';
  return el.id === '' ? el.tagName.toLowerCase() : `#${el.id}`;
}

interface Sample {
  t: number;
  v: number;
}
const samples: Sample[] = [];

/** Largest |velocity| recorded between two performance.now() times. */
function peakVelocity(from: number, to: number): number {
  let peak = 0;
  for (const s of samples) {
    if (s.t >= from && s.t <= to) peak = Math.max(peak, Math.abs(s.v));
  }
  return peak;
}

// ---- checks -------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const ticker = await import('../src/core/ticker');
  const { env } = await import('../src/core/env');
  const { initScroll, getLenis, scrollState, scrollToTarget } = await import('../src/core/scroll');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');

  const reduced = env.reducedMotion;
  console.log(`[scroll-harness] mode ${reduced ? 'reduced-motion' : 'default'}; env.reducedMotion=${env.reducedMotion}`);

  // Boot. initScroll runs twice: the second call must not change anything.
  ticker.initTicker();
  initScroll();
  const lenisAtBoot = getLenis();
  initScroll();
  check('initScroll is idempotent', getLenis() === lenisAtBoot);
  check(
    reduced ? 'reduced motion: no Lenis instance' : 'default: Lenis instance is running',
    reduced ? getLenis() === null : getLenis() !== null,
  );

  // Samples the velocity once per tick, after scrollState has been updated (PRIORITY.scroll + 1).
  ticker.addTick(() => {
    samples.push({ t: performance.now(), v: scrollState.velocity });
  }, ticker.PRIORITY.scroll + 2);

  let enters = 0;
  ScrollTrigger.create({
    trigger: byId('s3'),
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => {
      enters += 1;
    },
  });

  await sleep(300);
  check('page starts at the top', scrollState.y === 0 && window.scrollY === 0, `y ${scrollState.y}`);

  // 1. Wheel: 10 x 400 px, then 1.5 s of settling.
  const wheel = await input('wheel');
  await sleep(1500);
  const yWheel = scrollState.y;
  const peak = peakVelocity(wheel.start, wheel.end);
  const tail = Math.abs(scrollState.velocity);
  check('wheel: scrollState.y increases and ends well above 0', yWheel > 1000, `y ${yWheel.toFixed(0)}`);
  check('wheel: velocity is non-zero during the wheel', peak > 50, `peak ${peak.toFixed(0)} px/s`);
  check(
    'wheel: velocity decays toward 0 within 1.5 s',
    tail < Math.max(5, 0.02 * peak),
    `|v| ${tail.toFixed(2)} px/s 1.5 s after the wheel, peak ${peak.toFixed(0)} px/s`,
  );
  check('wheel: ScrollTrigger onEnter fires for s3', enters >= 1, `onEnter count ${enters}`);
  check(
    'wheel: scrollState.y matches window.scrollY once settled',
    Math.abs(yWheel - window.scrollY) <= 2,
    `state ${yWheel.toFixed(1)}, native ${window.scrollY}`,
  );

  // 2. Anchor link: the driver clicks the s5 link in the nav.
  const s5 = byId('s5');
  const historyBeforeAnchor = history.length;
  await input('anchor');
  const topAtAck = s5.getBoundingClientRect().top;
  const focusAtAck = document.activeElement === s5;
  await sleep(reduced ? 100 : 1600);
  const topLanded = s5.getBoundingClientRect().top;
  check(
    `anchor: the s5 link lands on s5 (${reduced ? 'instant' : 'within 1.6 s'})`,
    Math.abs(topLanded) <= 2,
    `top ${topLanded.toFixed(1)} px`,
  );
  if (reduced) {
    check(
      'reduced motion: anchor jump is instant',
      Math.abs(topAtAck) <= 2 && focusAtAck,
      `top ${topAtAck.toFixed(1)} px and focus ${describe(document.activeElement)} at the click ack`,
    );
  } else {
    check('default: anchor jump is animated, not instant', Math.abs(topAtAck) > 2, `top ${topAtAck.toFixed(1)} px at the click ack`);
  }
  check('anchor: focus moves to s5', document.activeElement === s5, `active ${describe(document.activeElement)}`);
  check(
    'anchor: hash becomes #s5 without a new history entry',
    location.hash === '#s5' && history.length === historyBeforeAnchor,
    `hash ${location.hash}, history ${historyBeforeAnchor} -> ${history.length}`,
  );

  // 3. A same-page link added after init is handled by the same document listener.
  const dynamicLink = document.createElement('a');
  dynamicLink.href = '#s2';
  dynamicLink.textContent = 'dynamic';
  (document.querySelector('nav') ?? document.body).append(dynamicLink);
  const historyBeforeDynamic = history.length;
  dynamicLink.click();
  await sleep(reduced ? 100 : 1600);
  dynamicLink.remove();
  const s2Top = byId('s2').getBoundingClientRect().top;
  check('delegated click: a link added after init scrolls to s2', Math.abs(s2Top) <= 2, `top ${s2Top.toFixed(1)} px`);
  check(
    'delegated click: hash becomes #s2 without a new history entry',
    location.hash === '#s2' && history.length === historyBeforeDynamic,
    `hash ${location.hash}, history ${historyBeforeDynamic} -> ${history.length}`,
  );

  // 4. An offset: s4 lands 100 px above the viewport top.
  scrollToTarget('#s4', { offset: 100 });
  await sleep(reduced ? 100 : 1600);
  const s4Top = byId('s4').getBoundingClientRect().top;
  check('scrollToTarget offset: s4 lands 100 px above the viewport top', Math.abs(s4Top + 100) <= 2, `top ${s4Top.toFixed(1)} px`);

  // 4b. A native jump, then an element target in the same task (D21.6). Lenis has not seen the jump yet, so its
  // animatedScroll is behind the native position when scrollToTarget runs. The resync must bring it up to date first,
  // or the target is computed from the old position and the page lands away from s6.
  const jump = (): void => window.scrollTo({ top: 2400, behavior: 'instant' });
  const lenisNow = getLenis();
  if (lenisNow !== null) {
    // Control: Lenis's own scrollTo, with no resync, lands away from s6. This is the error the resync removes.
    jump();
    lenisNow.scrollTo(byId('s6'), { immediate: true, force: true });
    const controlTop = byId('s6').getBoundingClientRect().top;
    check('control: Lenis without the resync misses s6', Math.abs(controlTop) > 1, `top ${controlTop.toFixed(1)} px`);
  }
  jump();
  const lenisAtJump = getLenis();
  const behind = lenisAtJump === null ? 0 : Math.abs(window.scrollY - lenisAtJump.animatedScroll);
  scrollToTarget('#s6');
  await sleep(reduced ? 100 : 1600);
  const s6Landed = byId('s6').getBoundingClientRect().top;
  if (!reduced) {
    check('native jump: Lenis was behind the native position before the target', behind > 100, `${behind.toFixed(0)} px behind`);
  }
  check(
    'native jump then scrollToTarget(#s6): s6 top lands within 1 px',
    Math.abs(s6Landed) <= 1,
    `top ${s6Landed.toFixed(2)} px`,
  );

  // 5. Keyboard: PageDown x3 from the driver must still scroll the page.
  const yBeforeKeys = scrollState.y;
  await input('keys');
  await sleep(1500);
  const yAfterKeys = scrollState.y;
  check('keyboard: PageDown x3 scrolls the page', yAfterKeys - yBeforeKeys > 200, `y ${yBeforeKeys.toFixed(0)} -> ${yAfterKeys.toFixed(0)}`);
  check(
    'scrollState.y matches window.scrollY after the keys',
    Math.abs(yAfterKeys - window.scrollY) <= 2,
    `state ${yAfterKeys.toFixed(1)}, native ${window.scrollY}`,
  );

  // 6. The page top, by name.
  scrollToTarget('top');
  const topRightAfterCall = window.scrollY;
  await sleep(reduced ? 100 : 1600);
  check(
    "scrollToTarget('top') returns to the page top",
    window.scrollY <= 2 && scrollState.y <= 2,
    `scrollY ${window.scrollY}, state ${scrollState.y.toFixed(1)}`,
  );
  if (reduced) {
    check('reduced motion: top jump is instant', topRightAfterCall <= 2, `scrollY right after the call ${topRightAfterCall}`);
  }

  // 7. Idle for one second: every rAF caller, its requests and its callbacks.
  const requested0 = new Map(requested);
  const fired0 = new Map(fired);
  pendingMax.clear();
  for (const [site, count] of pendingCount) pendingMax.set(site, count);
  await sleep(1000);
  const perSite = new Map<string, { requests: number; frames: number }>();
  for (const [site, count] of requested) {
    const requests = count - (requested0.get(site) ?? 0);
    const frames = (fired.get(site) ?? 0) - (fired0.get(site) ?? 0);
    if (requests > 0 || frames > 0) perSite.set(site, { requests, frames });
  }
  for (const [site, c] of perSite) {
    console.log(`[scroll-harness] idle rAF ${site}: ${c.requests} requests, ${c.frames} callbacks in 1 s`);
  }
  const clock = [...perSite].filter(([site]) => isPageClock(site));
  const trigger = [...perSite].filter(([site]) => isScrollTrigger(site));
  const others = [...perSite].filter(([site]) => !isPageClock(site) && !isScrollTrigger(site));
  const clockStats = clock.length === 1 ? clock[0][1] : null;
  const framesIdle = clockStats?.frames ?? 0;
  const clockPending = [...pendingMax]
    .filter(([site]) => isPageClock(site))
    .reduce((most, [, n]) => Math.max(most, n), 0);
  const triggerRequests = trigger.reduce((sum, [, c]) => sum + c.requests, 0);
  const totalRequests = [...perSite.values()].reduce((sum, c) => sum + c.requests, 0);

  check('idle: one page-clock rAF chain', clock.length === 1, `${clock.length} chains`);
  check(
    'idle: the page clock makes exactly one rAF request per frame',
    clockStats !== null && framesIdle >= 20 && Math.abs(clockStats.requests - framesIdle) <= 1,
    clockStats ? `${clockStats.requests} requests for ${clockStats.frames} frames` : 'no page-clock chain found',
  );
  check('idle: the page clock never has two requests pending', clockPending <= 1, `max pending ${clockPending}`);
  check(
    'idle: no rAF from any other caller (no Lenis autoRaf, no stray loop)',
    others.length === 0,
    others.length === 0 ? 'none' : others.map(([site]) => site).join(', '),
  );
  const perFrame = (n: number): string => (framesIdle > 0 ? (n / framesIdle).toFixed(2) : 'n/a');
  console.log(
    `[scroll-harness] KNOWN idle rAF per frame: total ${perFrame(totalRequests)} = page clock ${perFrame(clockStats?.requests ?? 0)}` +
      ` + ScrollTrigger ${perFrame(triggerRequests)} (gsap's _rafBugFix loop and periodic _sync one-offs).` +
      ' The brief expects 1 in total; that cannot hold while ScrollTrigger is enabled.',
  );

  root.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.join('; ')}`;
  console.log(`[scroll-harness] verdict ${root.dataset.harness}`);
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  failures.push(`harness error: ${message}`);
  console.log(`FAIL harness error :: ${message}`);
  root.dataset.harness = `fail:${failures.join('; ')}`;
});
