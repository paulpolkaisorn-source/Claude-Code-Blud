// Harness for the capabilities section's 2D layer (architecture section 10a). Open /harness/section-capabilities.html on
// the dev server. ?nogl adds html.no-gl, so the static elevations show. The page boots the same modules as main.ts,
// emits loader:done after its first tick, runs its checks on the next tick and writes the result to
// document.documentElement.dataset.harness ('pass' or 'fail:<names>') and dataset.harnessChecks (JSON).

import { bus } from '../src/core/bus';
import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { addTick, initTicker } from '../src/core/ticker';
import { initCapabilities } from '../src/sections/capabilities/capabilities';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

registerEases();
initTicker();
initScroll();
initHover();

const el = document.getElementById('capabilities');
if (!(el instanceof HTMLElement)) throw new Error('harness: #capabilities is missing');
const section: HTMLElement = el;

initCapabilities({ el: section, reducedMotion: env.reducedMotion, gl: false });

/** The checks that depend on this page's own markup and state. They run once the first layout pass has happened. */
function runChecks(): void {
  const checks: Check[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };

  const title = section.querySelector<HTMLElement>('h2#capabilities-title');
  record('title is the section h2', title !== null && section.getAttribute('aria-labelledby') === 'capabilities-title', String(title?.tagName));

  const cards = Array.from(section.querySelectorAll<HTMLElement>('.cap-card'));
  record('three cards', cards.length === 3, String(cards.length));
  const buttons = cards.map((card) => card.querySelector<HTMLButtonElement>('.cap-card__button'));
  const pressed = buttons.filter((b) => b?.getAttribute('aria-pressed') === 'true').length;
  record('exactly one card is pressed', pressed === 1, `pressed ${pressed}`);
  const stops = buttons.map((b) => b?.tabIndex ?? -2);
  record('roving tabindex: one stop at 0, the others -1', stops.filter((t) => t === 0).length === 1 && stops.filter((t) => t === -1).length === 2, stops.join(','));

  const boxes = cards.map((card) => card.getBoundingClientRect());
  record('cards have size', boxes.every((b) => b.width > 0 && b.height > 0), boxes.map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`).join(' | '));

  const fallback = section.querySelectorAll('.cap__fallback svg rect');
  record('no-WebGL elevations hold 17 squares each', fallback.length === 51, String(fallback.length));
  const aria = Array.from(section.querySelectorAll<HTMLElement>('.gl-fallback')).every((f) => f.getAttribute('aria-hidden') === 'true');
  record('fallbacks are aria-hidden', aria, '');
  record('section carries the marker cursor', section.dataset.cursor === 'marker', String(section.dataset.cursor));

  const chars = section.querySelectorAll('.cap__char').length;
  if (env.reducedMotion) {
    record('reduced motion: title is not split', chars === 0 && title?.getAttribute('aria-label') === null, `chars ${chars}`);
  } else {
    record('title is split into characters until the reveal', chars > 0 || title?.getAttribute('aria-label') !== null, `chars ${chars}`);
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
