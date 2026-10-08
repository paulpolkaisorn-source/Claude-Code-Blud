// Harness for the closing section's 2D layer (architecture section 10a). Open /harness/section-closing.html on the dev
// server. Flags: ?nogl adds html.no-gl (the in-flow layout and the static column show). The page boots the same modules as
// main.ts, emits loader:done after its first tick, runs its checks on the next tick and writes the result to
// document.documentElement.dataset.harness ('pass' or 'fail:<names>') and dataset.harnessChecks (JSON).

import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { bus } from '../src/core/bus';
import { addTick, initTicker } from '../src/core/ticker';
import { initScroll } from '../src/core/scroll';
import { initHover } from '../src/core/hover';
import { boundsOf, formationRects, viewportSize } from '../src/core/projection';
import { initClosing } from '../src/sections/closing/closing';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

registerEases();
initTicker();
initScroll();
initHover();

const el = document.getElementById('closing');
if (el === null) throw new Error('harness: #closing is missing');

initClosing({ el, reducedMotion: env.reducedMotion, gl: false });

/** Visible characters of the haiku (spaces excluded): 22 + 24 + 15. */
const HAIKU_CHARS = 61;

/** The checks that depend on this page's own layout. They run once the first layout pass has happened. */
function runChecks(): void {
  const checks: Check[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };

  const section = el as HTMLElement;
  const title = section.querySelector<HTMLElement>('#closing-title');
  record('h2 closing-title reads In one breath', title?.tagName === 'H2' && title.textContent === 'In one breath', String(title?.textContent));

  const haiku = section.querySelector<HTMLElement>('.closing__haiku');
  const text = haiku?.textContent ?? '';
  const a = text.indexOf('Small task, done with care');
  const b = text.indexOf('Each word set in its own place');
  const c = text.indexOf('In a single breath');
  record('haiku lines are present in reading order', a === 0 && a < b && b < c && c > 0, text);
  record('haiku is a p with lang en', haiku?.tagName === 'P' && haiku.getAttribute('lang') === 'en', String(haiku?.tagName));

  const chars = section.querySelectorAll('.closing__char').length;
  const expected = env.reducedMotion ? 0 : HAIKU_CHARS;
  record(env.reducedMotion ? 'reduced motion: no per-character spans' : 'haiku split into 61 visible characters', chars === expected, String(chars));

  const cta = section.querySelector<HTMLAnchorElement>('.closing__cta .btn');
  record(
    'primary CTA reads Read the docs and links to the Haiku 5.5 overview',
    cta?.textContent === 'Read the docs' && cta.getAttribute('href') === 'https://platform.claude.com/docs/en/models/haiku-5-5/overview',
    String(cta?.getAttribute('href')),
  );
  const source = section.querySelector<HTMLAnchorElement>('.closing__source');
  record('secondary link reads View sources and targets #sources', source?.textContent === 'View sources' && source.getAttribute('href') === '#sources', String(source?.getAttribute('href')));

  const layer = section.querySelector<HTMLElement>('.closing__layer');
  const fixed = layer !== null && getComputedStyle(layer).position === 'fixed';
  const root = document.documentElement.classList;
  const expectFixed = root.contains('js') && !root.contains('no-gl');
  record('text layer is fixed only with JS and WebGL', fixed === expectFixed, `fixed ${fixed}, expected ${expectFixed}`);

  if (fixed) {
    const box = boundsOf(formationRects('column', 'closing', viewportSize()));
    const line = section.querySelector<HTMLElement>('.closing__dim-line')?.getBoundingClientRect();
    const label = section.querySelector<HTMLElement>('.closing__dim-label')?.getBoundingClientRect();
    record(
      'dimension line sits 19 px right of the column (P1)',
      line !== undefined && Math.abs(line.left - (box.x1 + 19)) <= 1,
      `line ${line?.left}, expected ${box.x1 + 19}`,
    );
    record(
      'dimension label sits 7 px right of the line',
      line !== undefined && label !== undefined && Math.abs(label.left - (line.left + 7)) <= 1,
      `label ${label?.left}`,
    );
  } else {
    const blocks = section.querySelectorAll('.closing__column-svg rect').length;
    record('no-WebGL column has 17 blocks', blocks === 17, String(blocks));
  }

  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  document.documentElement.dataset.harnessChecks = JSON.stringify(checks);
  document.documentElement.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
}

let ticks = 0;
const stop = addTick(() => {
  ticks += 1;
  if (ticks === 1) {
    bus.emit('loader:done');
    return;
  }
  if (ticks === 2) {
    runChecks();
    stop();
  }
});
