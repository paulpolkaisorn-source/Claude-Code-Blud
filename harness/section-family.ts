// Harness for the family section's 2D layer (architecture section 10a). Open /harness/section-family.html on the
// dev server. Flags: ?nogl adds html.no-gl (the static overlay shows). The page boots the same modules as main.ts,
// emits loader:done after its first tick, runs its checks on the next tick and writes the result to
// document.documentElement.dataset.harness ('pass' or 'fail:<names>') and dataset.harnessChecks (JSON).

import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { bus } from '../src/core/bus';
import { addTick, initTicker } from '../src/core/ticker';
import { initScroll } from '../src/core/scroll';
import { initHover } from '../src/core/hover';
import { initFamily } from '../src/sections/family/family';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

registerEases();
initTicker();
initScroll();
initHover();

const el = document.getElementById('family');
if (el === null) throw new Error('harness: #family is missing');

initFamily({ el, reducedMotion: env.reducedMotion, gl: false });

/** The checks that depend on this page's own layout. They run once the first layout pass has happened. */
function runChecks(): void {
  const checks: Check[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };

  const section = el as HTMLElement;
  const title = section.querySelector<HTMLElement>('.family__title');
  record('title is an h2 with id family-title', title?.tagName === 'H2' && title.id === 'family-title', String(title?.tagName));

  const stations = Array.from(section.querySelectorAll<HTMLElement>('.family__station'));
  record('four station blocks', stations.length === 4, String(stations.length));
  const boxes = stations.map((li) => li.getBoundingClientRect());
  record(
    'station blocks have size and sit inside the viewport',
    boxes.every((b) => b.width > 0 && b.height > 0 && b.left >= 0 && b.right <= window.innerWidth + 0.5),
    boxes.map((b) => `${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)}x${Math.round(b.height)}`).join(' | '),
  );

  const layout = section.querySelector<HTMLElement>('.family__stage')?.dataset.layout ?? '';
  record('stage has a layout class', layout === 'wide' || layout === 'narrow', layout);
  record('section is placed', section.classList.contains('is-placed'), String(section.className));

  const chars = section.querySelectorAll('.family__char').length;
  if (env.reducedMotion) {
    record('reduced motion: title is not split', chars === 0 && title?.getAttribute('aria-label') === null, `chars ${chars}`);
  } else {
    record('title is split into characters (until the reveal)', chars > 0 || title?.getAttribute('aria-label') !== null, `chars ${chars}`);
  }

  const svg = section.querySelector('.family__svg');
  record('overlay svg present and aria-hidden', svg !== null && section.querySelector('.family__fallback')?.getAttribute('aria-hidden') === 'true', '');

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
