// Harness for the footer section's 2D layer (architecture section 10a). The partial sits between two 100vh spacers, with
// no WebGL. The boot runs the same order as src/main.ts, then emits loader:done after the first tick, which lets the
// entrance start. The DOM checks below set document.documentElement.dataset.harness to 'pass' or 'fail:<reason>'.
import { bus } from '../src/core/bus';
import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { PRIORITY, addTick, initTicker } from '../src/core/ticker';
import { initFooter } from '../src/sections/footer/footer';

registerEases();
initTicker();
initScroll();
initHover();

const failures: string[] = [];
const footer = document.getElementById('footer');
if (footer instanceof HTMLElement) {
  initFooter({ el: footer, reducedMotion: env.reducedMotion, gl: false });

  const headings = footer.querySelectorAll('h2');
  if (headings.length !== 1 || headings[0].id !== 'footer-title') failures.push('title-h2');
  // The title joins its words with no-break spaces (U+00A0), so they are read as plain spaces for the check.
  if (headings[0]?.textContent?.replace(/\u00a0/g, ' ') !== 'Claude Haiku 5.5') failures.push('title-text');

  const sources = document.querySelectorAll<HTMLAnchorElement>('#sources a');
  if (sources.length !== 20) failures.push(`sources-count-${sources.length}`);
  sources.forEach((link) => {
    if (!link.href.startsWith('https://') || link.textContent !== link.getAttribute('href')) {
      failures.push('source-link');
    }
  });

  const disclaimer = footer.querySelector('.footer__disclaimer');
  if (disclaimer?.textContent !== 'Unofficial fan and showcase page. Not affiliated with Anthropic.') {
    failures.push('disclaimer');
  }
  if (footer.querySelectorAll('.titleblock__value').length !== 5) failures.push('title-values');

  // The drawing's unit is lowercase (D23.5): the SVG text's unit span resets the uppercase label style.
  const unit = footer.querySelector<SVGTSpanElement>('.footer__dimension-label .footer__unit');
  if (unit?.textContent !== 'bu' || getComputedStyle(unit).textTransform !== 'none') failures.push('footer-unit-case');

  // Pointer events (D24.5). The footer box and its non-interactive wrappers pass pointer events through; links, buttons
  // and text keep them. The panel keeps them only where it is opaque (portrait), and there it covers the probe.
  const pointerOf = (el: Element | null): string => (el === null ? 'missing' : getComputedStyle(el).pointerEvents);
  const portrait = !window.matchMedia('(min-aspect-ratio: 1/1)').matches;
  const panel = footer.querySelector('.footer__panel');
  const grid = footer.querySelector<HTMLElement>('.footer__grid');
  const probe = document.getElementById('cta-probe');
  if (pointerOf(footer) !== 'none') failures.push('pe-footer');
  if (pointerOf(grid) !== 'none' || pointerOf(footer.querySelector('.footer__title')) !== 'none') failures.push('pe-wrap');
  if (pointerOf(panel) !== (portrait ? 'auto' : 'none')) failures.push('pe-panel');
  if (pointerOf(document.getElementById('footer-title')) !== 'auto') failures.push('pe-title');
  if (pointerOf(footer.querySelector('.footer__disclaimer')) !== 'auto') failures.push('pe-text');
  if (pointerOf(footer.querySelector('#sources a')) !== 'auto') failures.push('pe-link');
  if (grid !== null && probe !== null) {
    // Hit test on the grid's top-left padding, where no text sits: the probe takes it on landscape, the panel on portrait.
    window.scrollTo(0, footer.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5);
    const box = grid.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + 2, box.top + 2);
    if (hit !== (portrait ? panel : probe)) failures.push('pe-hit');
    window.scrollTo(0, 0);
  } else {
    failures.push('pe-probe');
  }
} else {
  failures.push('no-footer');
}
document.documentElement.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.join(',')}`;

const off = addTick(() => {
  off();
  bus.emit('loader:done');
}, PRIORITY.input);
