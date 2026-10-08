// Harness for src/styles/base.css (architecture section 10a). Open /harness/base.html on the dev server.
// The page runs the checks that depend on its own layout, writes them to dataset.harnessChecks (JSON) and
// sets dataset.harness to 'pass' or 'fail:<failed check names>'. The Playwright driver in the session
// scratchpad sets the viewport, hovers, presses Tab and takes the screenshots.
// Flags: ?nogl adds html.no-gl (the static fallback shows). ?gl=ready adds html.gl-ready (sections go transparent).

import { initHover } from '../src/core/hover';

const root = document.documentElement;
const flags = new URLSearchParams(window.location.search);
if (flags.has('nogl')) root.classList.add('no-gl');
if (flags.get('gl') === 'ready') root.classList.add('gl-ready');

// Direction-aware hover: writes data-enter on the links, buttons and rows below (decision D2.1).
initHover();

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

function need<T extends Element>(id: string): T {
  const el = document.querySelector<T>(`#${id}`);
  if (el === null) throw new Error(`missing #${id}`);
  return el;
}

function query<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (el === null) throw new Error(`missing ${selector}`);
  return el;
}

// The canvas stands in for the GL layer: a flat 2 x 2 fill that base.css stretches to the viewport.
// It is visible only where a section is transparent (html.gl-ready), which the ?gl=ready run checks.
const canvas = need<HTMLCanvasElement>('gl');
const ctx = canvas.getContext('2d');
if (ctx !== null) {
  canvas.width = 2;
  canvas.height = 2;
  ctx.fillStyle = '#b9d3cc';
  ctx.fillRect(0, 0, 2, 2);
}

// Column guides: seventeen coloured columns over the grid. Harness only.
const guides = query<HTMLElement>('.guides');
for (let i = 0; i < 17; i++) {
  const cell = document.createElement('i');
  cell.style.background = `hsla(${i * 21}, 70%, 50%, 0.16)`;
  guides.append(cell);
}

// Static stanza for the fallback, in the object's geometry: block 0.70 bu, pitch 0.87 bu within a row and
// 1.05 bu between rows. Block index 4 (block 05) is the kireji.
const SVG_NS = 'http://www.w3.org/2000/svg';
const ROWS = [5, 7, 5];
const BLOCK = 0.7;
const PITCH_IN_ROW = 0.87;
const PITCH_BETWEEN_ROWS = 1.05;
const STANZA_WIDTH = 5.92;

function buildStanza(svg: SVGSVGElement): void {
  let index = 0;
  ROWS.forEach((count, row) => {
    const rowWidth = (count - 1) * PITCH_IN_ROW + BLOCK;
    const x0 = (STANZA_WIDTH - rowWidth) / 2;
    for (let k = 0; k < count; k++) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', (x0 + k * PITCH_IN_ROW).toFixed(3));
      rect.setAttribute('y', (row * PITCH_BETWEEN_ROWS).toFixed(3));
      rect.setAttribute('width', String(BLOCK));
      rect.setAttribute('height', String(BLOCK));
      rect.setAttribute('rx', '0.035');
      rect.setAttribute('class', index === 4 ? 'block block--seal' : 'block');
      svg.append(rect);
      index += 1;
    }
  });
}
buildStanza(need<SVGSVGElement>('stanza'));

/** The computed width of a probe set to the value, so a custom property resolves to px as the page uses it. */
function resolvedWidth(value: string): string {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.width = value;
  document.body.append(probe);
  const width = getComputedStyle(probe).width;
  probe.remove();
  return width;
}

function runChecks(): void {
  const width = window.innerWidth;
  const gl = root.classList.contains('gl-ready');
  const noGl = root.classList.contains('no-gl');

  // Type and tokens.
  const body = getComputedStyle(document.body);
  record(
    'body font family is Bodoni Moda Variable',
    body.fontFamily.startsWith('"Bodoni Moda Variable"'),
    body.fontFamily,
  );
  record('body background is paper #F1ECE0', body.backgroundColor === 'rgb(241, 236, 224)', body.backgroundColor);
  // clamp(31px, 3.4722vw, 81px) is 49.9997px at 1440; layout rounds to 1/64 px, so compare within 0.05px.
  const margin = resolvedWidth('var(--margin)');
  const marginPx = parseFloat(margin);
  if (width === 1440) record('--margin at 1440 is 50px', Math.abs(marginPx - 50) < 0.05, margin);
  if (width === 375) record('--margin at 375 is 19px', Math.abs(marginPx - 19) < 0.05, margin);

  // Grid: seventeen tracks from 768 px, one below.
  const tracks = getComputedStyle(need<HTMLElement>('grid')).gridTemplateColumns.split(' ').length;
  const wantTracks = width >= 768 ? 17 : 1;
  record(`grid has ${wantTracks} column track(s) at ${width}px`, tracks === wantTracks, `${tracks} tracks`);
  if (width >= 1024) {
    const b = getComputedStyle(need<HTMLElement>('group-b'));
    record(
      'g-b spans columns 6 to 12',
      b.gridColumnStart === '6' && b.gridColumnEnd === '13',
      `${b.gridColumnStart} / ${b.gridColumnEnd}`,
    );
  }
  if (width >= 768) {
    const probe = getComputedStyle(need<HTMLElement>('col-probe'));
    record(
      '.col with --from 2 and --to 9 spans columns 2 to 9',
      probe.gridColumnStart === '2' && probe.gridColumnEnd === '10',
      `${probe.gridColumnStart} / ${probe.gridColumnEnd}`,
    );
  }

  // Themes and layers.
  const paper = getComputedStyle(need<HTMLElement>('paper-pair'));
  const ink = getComputedStyle(need<HTMLElement>('ink-pair'));
  if (gl) {
    record(
      'sections are transparent under html.gl-ready',
      paper.backgroundColor === 'rgba(0, 0, 0, 0)' && ink.backgroundColor === 'rgba(0, 0, 0, 0)',
      `${paper.backgroundColor} / ${ink.backgroundColor}`,
    );
  } else {
    record('paper section background is paper', paper.backgroundColor === 'rgb(241, 236, 224)', paper.backgroundColor);
    record('ink section background is ink #151512', ink.backgroundColor === 'rgb(21, 21, 18)', ink.backgroundColor);
  }
  const inkHeading = getComputedStyle(query<HTMLElement>('#ink-pair .t-heading'));
  record('ink section text is text-1-ink #F1ECE0', inkHeading.color === 'rgb(241, 236, 224)', inkHeading.color);

  const canvasStyle = getComputedStyle(canvas);
  if (noGl) {
    record('canvas hidden under html.no-gl', canvasStyle.display === 'none', canvasStyle.display);
  } else {
    record(
      'canvas is fixed at z-index 0',
      canvasStyle.position === 'fixed' && canvasStyle.zIndex === '0',
      `${canvasStyle.position} z ${canvasStyle.zIndex}`,
    );
    record('main sits above the canvas at z-index 1', getComputedStyle(query<HTMLElement>('main')).zIndex === '1', '');
  }
  const fallback = getComputedStyle(query<HTMLElement>('.gl-fallback'));
  record(
    noGl ? 'static fallback shown under html.no-gl' : 'static fallback hidden with WebGL',
    fallback.display === (noGl ? 'block' : 'none'),
    fallback.display,
  );

  // Buttons and labels.
  const primary = getComputedStyle(need<HTMLElement>('btn-primary'));
  const secondary = getComputedStyle(need<HTMLElement>('btn-secondary'));
  record(
    'primary button: fill text-1, label bg',
    primary.backgroundColor === 'rgb(21, 21, 18)' && primary.color === 'rgb(241, 236, 224)',
    `${primary.backgroundColor} / ${primary.color}`,
  );
  record(
    'buttons are at least 44px high',
    primary.minHeight === '44px' && secondary.minHeight === '44px',
    `${primary.minHeight} / ${secondary.minHeight}`,
  );
  record(
    'secondary button: 1px rule-strong border',
    secondary.borderTopColor === 'rgb(58, 56, 49)' && secondary.borderTopWidth === '1px',
    `${secondary.borderTopColor} ${secondary.borderTopWidth}`,
  );
  const label = getComputedStyle(query<HTMLElement>('.t-label'));
  record(
    'label: Geist Mono, uppercase, nowrap',
    label.fontFamily.startsWith('"Geist Mono Variable"') &&
      label.textTransform === 'uppercase' &&
      label.whiteSpace === 'nowrap',
    `${label.fontFamily} | ${label.textTransform} | ${label.whiteSpace}`,
  );
  const code = getComputedStyle(need<HTMLElement>('code-sample'));
  record(
    'code: never wraps, scrolls in x, tab size 2',
    code.whiteSpace === 'pre' && code.overflowX === 'auto' && code.tabSize === '2',
    `${code.whiteSpace} | ${code.overflowX} | ${code.tabSize}`,
  );

  // No horizontal page scroll at any width.
  const scrollWidth = document.documentElement.scrollWidth;
  record(`no horizontal page scroll at ${width}px`, scrollWidth <= width, `scrollWidth ${scrollWidth}`);

  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  root.dataset.harnessChecks = JSON.stringify(checks);
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
}

void document.fonts.ready.then(() => {
  try {
    runChecks();
  } catch (error) {
    root.dataset.harness = `fail:exception ${error instanceof Error ? error.message : String(error)}`;
  }
});
