// Footer section, 2D layer (design/direction-act3.md, footer; design/drafts/director-decisions.md D2.1 and D8).
//
// The footer has one entrance. When its top crosses 80% of the viewport height, and loader:done has fired, the outer
// rule of the title block draws over T.settle. The four cell values then settle from text-3 to their token colour, and
// the inner rules draw, all on the five-item front profile of act III C14. Reduced motion keeps the final states (the
// CSS defaults), with no drawing and no colour settle. The footer is not scroll-linked and runs no loop. Its only
// programmatic move is Back to top, through scrollToTarget. It never imports from src/gl; it reads no 3D state.
import './footer.css';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { scrollToTarget } from '../../core/scroll';
import { T, weightedStagger } from '../../core/timing';

/**
 * Start of each cell in write order (TITLE, SCALE, SHEET, REV, DATE): T.micro plus the front profile of five items with
 * total 0.25 s, which gives 0.17, 0.295, 0.347, 0.387 and 0.42 s (act III, footer sequence 2 and C14).
 */
const CELL_STARTS: readonly number[] = weightedStagger(5, { total: 0.25, weight: 'front' }).map(
  (offset) => T.micro + offset,
);

/** Inner rules and the cell each one starts with (act III, footer sequence 3). The row rule is the phone rule. */
const RULES: readonly { selector: string; start: number }[] = [
  { selector: '.titleblock__rule--title', start: CELL_STARTS[0] },
  { selector: '.titleblock__rule--scale', start: CELL_STARTS[1] },
  { selector: '.titleblock__rule--sheet', start: CELL_STARTS[2] },
  { selector: '.titleblock__rule--rev', start: CELL_STARTS[3] },
  { selector: '.titleblock__rule--rows', start: CELL_STARTS[2] },
];

type Timeline = ReturnType<typeof gsap.timeline>;

interface Parts {
  section: HTMLElement;
  block: HTMLElement;
  frame: SVGSVGElement | null;
  framePath: SVGPathElement | null;
  values: HTMLElement[];
  rules: { path: SVGPathElement; start: number }[];
}

/** The section's animated parts, or null when the markup is incomplete (the page then stays in its final state). */
function collect(section: HTMLElement): Parts | null {
  const block = section.querySelector<HTMLElement>('.footer__title');
  const frame = section.querySelector<SVGSVGElement>('.titleblock__frame');
  const framePath = frame?.querySelector<SVGPathElement>('path') ?? null;
  const values = Array.from(section.querySelectorAll<HTMLElement>('.titleblock__value'));
  if (block === null || values.length !== CELL_STARTS.length) return null;
  const rules: { path: SVGPathElement; start: number }[] = [];
  for (const rule of RULES) {
    const path = section.querySelector<SVGPathElement>(`${rule.selector} path`);
    if (path !== null) rules.push({ path, start: rule.start });
  }
  return { section, block, frame: frame ?? null, framePath, values, rules };
}

/**
 * Sizes the outer rule to the title block in CSS pixels, so that its 2 px stroke is 2 px at every width. The path is
 * inset by 1 px, so the stroke lies inside the block.
 */
function fitFrame(parts: Parts): void {
  const { frame, framePath, block } = parts;
  if (frame === null || framePath === null) return;
  const box = block.getBoundingClientRect();
  if (!(box.width > 2 && box.height > 2)) return;
  frame.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  framePath.setAttribute('d', `M1 1H${box.width - 1}V${box.height - 1}H1Z`);
}

/**
 * Keeps the outer rule matched to the block as it resizes. Once the rule has drawn, its dash is set again for the new
 * length, so the rule stays whole.
 */
function observeFrame(parts: Parts, timeline: Timeline | null): void {
  const observer = new ResizeObserver(() => {
    fitFrame(parts);
    if (parts.framePath !== null && timeline !== null && timeline.progress() === 1) {
      gsap.set(parts.framePath, { drawSVG: '0% 100%' });
    }
  });
  observer.observe(parts.block);
}

/**
 * Initialises the footer's 2D layer. Idempotent in effect: it runs once, from src/main.ts, with the section element.
 * It sets its start states, creates one timeline and one scroll trigger (played once), and binds Back to top.
 */
export function initFooter(ctx: SectionContext): void {
  gsap.registerPlugin(DrawSVGPlugin);

  const top = ctx.el.querySelector<HTMLAnchorElement>('.footer__top');
  top?.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToTarget('#top');
  });

  const parts = collect(ctx.el);
  if (parts === null) return;
  fitFrame(parts);

  if (ctx.reducedMotion) {
    observeFrame(parts, null);
    return;
  }

  const { framePath, values, rules, section } = parts;

  // Start states: cell values in text-3, every drawn rule at zero length. Text is never hidden, only coloured.
  gsap.set(values, { '--mix': 0 });
  gsap.set(
    rules.map((rule) => rule.path),
    { drawSVG: '0% 0%' },
  );
  if (framePath !== null) gsap.set(framePath, { drawSVG: '0% 0%' });

  // Outer rule first, from 0 s, over T.settle (act III, footer sequence 1). Then the cells and inner rules.
  const timeline = gsap.timeline({ paused: true });
  if (framePath !== null) {
    timeline.to(framePath, { drawSVG: '0% 100%', duration: T.settle, ease: E.settle }, 0);
  }
  values.forEach((value, i) => {
    timeline.to(value, { '--mix': 1, duration: T.beat5, ease: E.settle }, CELL_STARTS[i]);
  });
  rules.forEach((rule) => {
    timeline.to(rule.path, { drawSVG: '0% 100%', duration: T.beat5, ease: E.settle }, rule.start);
  });

  // The entrance needs both the trigger line and loader:done. Whichever comes second starts it, once.
  let loaded = false;
  let waiting = false;
  bus.once('loader:done', () => {
    loaded = true;
    if (waiting) timeline.play();
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'top 80%',
    end: 'max',
    once: true,
    onEnter: () => {
      if (loaded) timeline.play();
      else waiting = true;
    },
  });

  observeFrame(parts, timeline);
}
