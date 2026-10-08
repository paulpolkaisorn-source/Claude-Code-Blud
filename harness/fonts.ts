// Harness for src/styles/fonts.css, src/partials/head-fonts.html and src/partials/head-env.html
// (architecture section 10a). Open /harness/fonts.html on the dev server. Add ?nogl to take the
// static path in head-env. It uses the real loader (fontsTask, registerTask, startLoading), the
// real bus and the real env module. The verdict lands in document.documentElement.dataset.harness:
// 'pass' or 'fail:<reasons>'.
import headEnvHtml from '../src/partials/head-env.html?raw';
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { fontsTask, registerTask, startLoading } from '../src/core/loader';

const REAL_FAMILIES = ['Bodoni Moda Variable', 'Geist Mono Variable'] as const;
const BODONI_FALLBACKS = [
  'Bodoni Fallback Georgia',
  'Bodoni Fallback Times',
  'Bodoni Fallback Liberation',
  'Bodoni Fallback DejaVu',
] as const;
const WOFF2_FILES = ['/fonts/bodoni-moda-latin-opsz-normal.woff2', '/fonts/geist-mono-latin-wght-normal.woff2'] as const;

/** Brief limits: h1 width within 2 px at 1440 px, baseline and box height within 1 px. */
const WIDTH_LIMIT_PX = 2;
const BASELINE_LIMIT_PX = 1;
const CODE_LIMIT_PX = 2;
const HEAD_ENV_LIMIT_MS = 2;
const HEAD_ENV_RUNS = 100;
const HEAD_ENV_BATCHES = 15;
const HEAD_ENV_BYTES = 1024;

const root = document.documentElement;
const reasons: string[] = [];
const readout: string[] = [];

function note(line: string): void {
  readout.push(line);
  console.log(line);
}

function failWith(reason: string): void {
  reasons.push(reason);
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) throw new Error(`missing #${id}`);
  return el;
}

/** Width of the widest line of an element's text, from layout. */
function inkWidth(el: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
}

/** Distance from the top of the element's box to the baseline of its first line. */
function firstBaseline(el: HTMLElement): number {
  const marker = document.createElement('span');
  marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  el.prepend(marker);
  const offset = marker.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
  marker.remove();
  return offset;
}

/** Status of every FontFace registered under a family name, e.g. ['loaded'] or ['error']. */
function faceStatus(family: string): string[] {
  const statuses: string[] = [];
  document.fonts.forEach((face) => {
    if (face.family.replace(/^"(.*)"$/, '$1') === family) statuses.push(face.status);
  });
  return statuses;
}

function signed(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

function checkFonts(): void {
  for (const family of REAL_FAMILIES) {
    if (!faceStatus(family).includes('loaded')) failWith(`${family} did not load`);
  }
  if (!document.fonts.check('400 141.8px "Bodoni Moda Variable"')) failWith('document.fonts.check fails for Bodoni Moda Variable');
  if (!document.fonts.check('500 13px "Geist Mono Variable"')) failWith('document.fonts.check fails for Geist Mono Variable');
  note(`document.fonts.check: Bodoni Moda Variable ${document.fonts.check('400 141.8px "Bodoni Moda Variable"')}, Geist Mono Variable ${document.fonts.check('500 13px "Geist Mono Variable"')}`);

  const fallbackStatus = BODONI_FALLBACKS.map((name) => `${name} [${faceStatus(name).join(',') || 'not used'}]`);
  note(`fallback faces: ${fallbackStatus.join('; ')}`);
}

async function checkServedFiles(): Promise<void> {
  for (const file of WOFF2_FILES) {
    const res = await fetch(file, { method: 'HEAD' });
    if (!res.ok) failWith(`HEAD ${file} returned ${res.status}`);
    note(`HEAD ${file}: ${res.status}`);
  }
  // Each file is fetched once: the preload matches the @font-face request (same CORS mode).
  const fontFetches = performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.endsWith('.woff2') && (entry as PerformanceResourceTiming).initiatorType !== 'fetch');
  note(`woff2 GET requests for the page: ${fontFetches.length} (expected ${WOFF2_FILES.length})`);
  if (fontFetches.length !== WOFF2_FILES.length) failWith(`woff2 requested ${fontFetches.length} times, expected ${WOFF2_FILES.length}`);
}

function checkMetrics(): void {
  const realH1 = byId('w-real');
  const fallbackH1 = byId('w-fallback');

  // Width of the 1440 px h1 (display-xxl), real and fallback.
  const wReal = inkWidth(realH1);
  const wFallback = inkWidth(fallbackH1);
  const dWidth = wFallback - wReal;
  note(`h1 width at 1440 px (141.8 px): real ${wReal.toFixed(2)} px, fallback ${wFallback.toFixed(2)} px, delta ${signed(dWidth)} px (limit ${WIDTH_LIMIT_PX})`);
  if (Math.abs(dWidth) > WIDTH_LIMIT_PX) failWith(`h1 width differs by ${dWidth.toFixed(2)} px`);

  // The stack must render as the first candidate that loaded, exactly as that face alone would.
  const chosen = BODONI_FALLBACKS.find((name) => faceStatus(name).includes('loaded'));
  if (chosen === undefined) {
    failWith('no Bodoni fallback face loaded');
  } else {
    const probe = document.createElement('h1');
    probe.className = 'display';
    probe.style.cssText = `position:absolute;visibility:hidden;font-family:"${chosen}";`;
    probe.innerHTML = 'Claude<br />Haiku&nbsp;5.5';
    document.body.append(probe);
    const wChosen = inkWidth(probe);
    probe.remove();
    note(`fallback stack renders as "${chosen}" here: alone it measures ${wChosen.toFixed(2)} px, stack ${wFallback.toFixed(2)} px`);
    if (Math.abs(wChosen - wFallback) > 0.5) failWith(`fallback stack does not render as ${chosen}`);
  }

  // First baseline and box height, real and fallback (line-height 0.92, two lines).
  const bReal = firstBaseline(realH1);
  const bFallback = firstBaseline(fallbackH1);
  const hReal = realH1.getBoundingClientRect().height;
  const hFallback = fallbackH1.getBoundingClientRect().height;
  note(`h1 first baseline: real ${bReal.toFixed(2)} px, fallback ${bFallback.toFixed(2)} px, delta ${signed(bFallback - bReal)} px (limit ${BASELINE_LIMIT_PX})`);
  note(`h1 box height: real ${hReal.toFixed(2)} px, fallback ${hFallback.toFixed(2)} px, delta ${signed(hFallback - hReal)} px (limit ${BASELINE_LIMIT_PX})`);
  if (Math.abs(bFallback - bReal) > BASELINE_LIMIT_PX) failWith(`h1 baseline differs by ${(bFallback - bReal).toFixed(2)} px`);
  if (Math.abs(hFallback - hReal) > BASELINE_LIMIT_PX) failWith(`h1 box height differs by ${(hFallback - hReal).toFixed(2)} px`);

  // The 232 px specimen, real and fallback.
  const sReal = inkWidth(byId('spec-real'));
  const sFallback = inkWidth(byId('spec-fallback'));
  note(`232 px specimen width: real ${sReal.toFixed(2)} px, fallback ${sFallback.toFixed(2)} px, delta ${signed(sFallback - sReal)} px (limit ${WIDTH_LIMIT_PX})`);
  if (Math.abs(sFallback - sReal) > WIDTH_LIMIT_PX) failWith(`232 px specimen width differs by ${(sFallback - sReal).toFixed(2)} px`);

  // The code line in Geist Mono, real and fallback.
  const cReal = inkWidth(byId('code-real'));
  const cFallback = inkWidth(byId('code-fallback'));
  note(`code line width: real ${cReal.toFixed(2)} px, fallback ${cFallback.toFixed(2)} px, delta ${signed(cFallback - cReal)} px (limit ${CODE_LIMIT_PX})`);
  if (Math.abs(cFallback - cReal) > CODE_LIMIT_PX) failWith(`code line width differs by ${(cFallback - cReal).toFixed(2)} px`);
}

function checkHeadEnv(): void {
  const match = /<script>([\s\S]*?)<\/script>/.exec(headEnvHtml);
  if (match === null) {
    failWith('head-env.html has no inline script');
    return;
  }
  const body = match[1];

  // D13.2: the script must not create a WebGL context.
  if (/getContext\s*\(/.test(body)) failWith('head-env.html still calls getContext');

  // no-gl only when WebGL2 is missing or ?nogl is present.
  const expectNoGl = typeof WebGL2RenderingContext === 'undefined' || location.search.includes('nogl');
  if (root.classList.contains('no-gl') !== expectNoGl) {
    failWith(`html.no-gl is ${root.classList.contains('no-gl')}, expected ${expectNoGl}`);
  }
  if (root.classList.contains('no-js') || !root.classList.contains('js')) failWith('js and no-js classes are wrong');
  if (env.gl !== !expectNoGl) failWith(`env.gl is ${env.gl}, expected ${!expectNoGl}`);

  const bytes = new TextEncoder().encode(headEnvHtml).length;
  if (bytes >= HEAD_ENV_BYTES) failWith(`head-env.html is ${bytes} bytes, limit ${HEAD_ENV_BYTES}`);

  // The first run is the one that ran before first paint, and its User Timing entry says how long it took.
  const first = performance.getEntriesByName('head-env', 'measure')[0];
  const firstMs = first === undefined ? Number.NaN : first.duration;

  // Warm timing. The clock here steps by 0.1 ms, so each batch runs the script HEAD_ENV_RUNS times
  // and divides the batch total. The median of HEAD_ENV_BATCHES batches is reported.
  const run = new Function(body) as () => void;
  const perRun: number[] = [];
  for (let b = 0; b < HEAD_ENV_BATCHES; b += 1) {
    const t0 = performance.now();
    for (let i = 0; i < HEAD_ENV_RUNS; i += 1) run();
    perRun.push((performance.now() - t0) / HEAD_ENV_RUNS);
  }
  perRun.sort((a, b) => a - b);
  const median = perRun[Math.floor(perRun.length / 2)];
  note(`head-env: ${bytes} bytes; first run ${firstMs.toFixed(3)} ms; warm median ${median.toFixed(4)} ms per run (${HEAD_ENV_BATCHES} batches of ${HEAD_ENV_RUNS}; limit ${HEAD_ENV_LIMIT_MS} ms)`);
  if (!(median < HEAD_ENV_LIMIT_MS)) failWith(`head-env median ${median.toFixed(3)} ms`);
  if (Number.isNaN(firstMs)) {
    note('head-env: no User Timing entry for the first run; the re-run median stands');
  } else if (!(firstMs < HEAD_ENV_LIMIT_MS)) {
    failWith(`head-env first run ${firstMs.toFixed(3)} ms`);
  }
  note(`env: gl ${env.gl}, tier ${env.tier}, reducedMotion ${env.reducedMotion}, touch ${env.touch}`);
}

function finish(): void {
  const verdict = reasons.length === 0 ? 'pass' : `fail:${reasons.join('; ')}`;
  root.dataset.harness = verdict;
  byId('readout').textContent = `${readout.join('\n')}\nverdict: ${verdict}`;
  console.log(`harness: ${verdict}`);
}

async function main(): Promise<void> {
  bus.on('loader:done', () => note('loader:done emitted by the real loader'));
  registerTask('fonts', 2, fontsTask([...REAL_FAMILIES]));
  await startLoading();
  await document.fonts.ready;
  checkFonts();
  await checkServedFiles();
  checkMetrics();
  checkHeadEnv();
  finish();
}

main().catch((err: unknown) => {
  failWith(`exception: ${err instanceof Error ? err.message : String(err)}`);
  finish();
});
