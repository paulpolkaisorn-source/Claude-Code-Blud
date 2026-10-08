// Harness for the family section's 2D layer (architecture section 10a). Open /harness/section-family.html on the
// dev server. Flags: ?nogl adds html.no-gl (the static overlay shows). The page boots the same modules as main.ts,
// emits loader:done after its first tick, runs its checks on the next tick and writes the result to
// document.documentElement.dataset.harness ('pass' or 'fail:<names>') and dataset.harnessChecks (JSON).
//
// The page is at scroll 0 when the checks run, and every check is relative to the stage, so they hold at any scroll.

import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { bus } from '../src/core/bus';
import { viewportSize } from '../src/core/projection';
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

/** The lowest ink of the title's text, in viewport px (D22.12): the box, the last baseline and the ink descent. */
function titleInkBottom(title: HTMLElement): number {
  const box = title.getBoundingClientRect();
  const cs = getComputedStyle(title);
  const line = parseFloat(cs.lineHeight);
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx === null) return box.bottom;
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const metrics = ctx.measureText('Hg');
  const ink = ctx.measureText(title.textContent ?? '').actualBoundingBoxDescent;
  return box.top + box.height + (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent - line) / 2 + ink;
}

/** The words on the title's last line, from the character boxes of its text. */
function lastLineWords(title: HTMLElement): number {
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let lineTop = -Infinity;
  let text = '';
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const value = node.textContent ?? '';
    for (let i = 0; i < value.length; i += 1) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      if (box.top > lineTop + 1) {
        lineTop = box.top;
        text = '';
      }
      text += value[i];
    }
  }
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

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

  const stage = section.querySelector<HTMLElement>('.family__stage');
  const layout = stage?.dataset.layout ?? '';
  record('stage has a layout class', layout === 'wide' || layout === 'narrow', layout);
  record('stage carries data-anchor family-stations', stage?.getAttribute('data-anchor') === 'family-stations', String(stage?.getAttribute('data-anchor')));
  const viewport = viewportSize();
  const stageHeight = stage?.getBoundingClientRect().height ?? 0;
  record(
    'stage height is the projection viewport height',
    Math.abs(stageHeight - viewport.height) < 0.5,
    `stage ${stageHeight} vs viewport ${viewport.height}`,
  );
  record('section is placed', section.classList.contains('is-placed'), String(section.className));

  if (title !== null) {
    const axisTops = Array.from(section.querySelectorAll<HTMLElement>('.family__axis-line, .family__tick, .family__axis-label'))
      .filter((node) => getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0)
      .map((node) => node.getBoundingClientRect().top);
    const axisTop = Math.min(...axisTops);
    const inkBottom = titleInkBottom(title);
    const sp4 = parseFloat(getComputedStyle(section).getPropertyValue('--sp-4'));
    record(
      'title clears the axis, ticks and labels by sp-4 (lowest ink)',
      axisTop - inkBottom >= sp4 - 0.5,
      `gap ${(axisTop - inkBottom).toFixed(2)} px, sp-4 ${sp4} px`,
    );
    const words = lastLineWords(title);
    record('title has no widow (last line has two words or more)', words >= 2, `last line ${words} words`);
  }

  const name = section.querySelector<HTMLElement>('.family__name');
  if (name !== null) {
    const style = getComputedStyle(name);
    record(
      'station labels carry the knockout (background and 2 px 4 px padding)',
      style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.paddingTop === '2px' && style.paddingLeft === '4px',
      `${style.backgroundColor} ${style.padding}`,
    );
  }

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
    // The fonts decide the measured lines. The checks wait for them, so no fallback metrics are measured.
    void document.fonts.ready.then(runChecks);
    stop();
  }
});
