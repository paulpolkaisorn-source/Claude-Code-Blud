// Pricing section, 2D layer (design/direction-act3.md, pricing; design/drafts/director-decisions.md D2.1, D2.3,
// D2.6, D18, D19 and D23.1). Entrances start on loader:done and on each group's trigger line (its top at 80% of the
// viewport). Nothing starts on a timer. Reduced motion keeps the final states (the CSS defaults): no split, no
// rule drawing, no colour settle. The text theme with WebGL is per block (src/choreo/theme-front.ts marks each
// data-theme-block); this file only sets the section's theme without WebGL. The 3D layer is
// src/sections/pricing/gl.ts. This file reaches it through projection.ts, and never imports from src/gl.
import './pricing.css';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { boundsOf, formationRects, viewportSize } from '../../core/projection';
import { T, weightedStagger } from '../../core/timing';
import type { Theme } from '../../core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The header rule is 2 px and each body rule is 1 px (act III, pricing step 5). */
const HEAD_RULE_PX = 2;
const ROW_RULE_PX = 1;

/** Each title character starts (i - centre) x 0.06em from its set position (heading 8, rule 15). */
const TITLE_SHIFT_EM = 0.06;

/**
 * Body rules and prices (C14). The first body rule starts T.micro after the table trigger, and the rest follow the
 * five-item front profile with total 0.25 s: 0.17, 0.295, 0.347, 0.387 and 0.42 s.
 */
const ROW_STARTS: readonly number[] = weightedStagger(5, { total: 0.25, weight: 'front' }).map(
  (offset) => T.micro + offset,
);

/** The statements start with the fifth body rule, at 0.42 s (act III, pricing step 6). */
const STATEMENT_START = ROW_STARTS[ROW_STARTS.length - 1];

/** The two availability items take the first two offsets of the five-item profile: 0 and 0.125 s. */
const AVAILABILITY_STARTS: readonly number[] = weightedStagger(2, { total: 0.125, weight: 'front' });

interface Parts {
  el: HTMLElement;
  title: HTMLElement;
  main: HTMLElement;
  tail: HTMLElement;
  wrap: HTMLElement;
  headRow: HTMLElement;
  bodyRows: HTMLElement[];
  panel: HTMLElement;
  avail: HTMLElement;
  items: HTMLElement[];
  savings: HTMLElement;
  comparison: HTMLElement;
  context: HTMLElement;
  band: SVGSVGElement | null;
}

interface Rule {
  svg: SVGSVGElement;
  path: SVGPathElement;
}

/** The section's elements, or null when the markup is incomplete (the section then stays static). */
function collect(el: HTMLElement): Parts | null {
  const one = <N extends Element>(selector: string): N | null => el.querySelector<N>(selector);
  const title = one<HTMLElement>('.pricing__title');
  const main = one<HTMLElement>('.pricing__title-main');
  const tail = one<HTMLElement>('.pricing__title-tail');
  const wrap = one<HTMLElement>('.pricing__table-wrap');
  const headRow = one<HTMLElement>('.pricing__table thead tr');
  const panel = one<HTMLElement>('.pricing__table-panel');
  const avail = one<HTMLElement>('.pricing__avail');
  const savings = one<HTMLElement>('.pricing__statement--savings');
  const comparison = one<HTMLElement>('.pricing__statement--comparison');
  const context = one<HTMLElement>('.pricing__statement--context');
  const bodyRows = Array.from(el.querySelectorAll<HTMLElement>('.pricing__table tbody tr'));
  const items = Array.from(el.querySelectorAll<HTMLElement>('.pricing__avail-item'));
  if (
    title === null ||
    main === null ||
    tail === null ||
    wrap === null ||
    headRow === null ||
    panel === null ||
    avail === null ||
    savings === null ||
    comparison === null ||
    context === null ||
    bodyRows.length === 0 ||
    items.length === 0
  ) {
    return null;
  }
  return {
    el,
    title,
    main,
    tail,
    wrap,
    headRow,
    bodyRows,
    panel,
    avail,
    items,
    savings,
    comparison,
    context,
    band: el.querySelector<SVGSVGElement>('.gl-fallback__band'),
  };
}

function glActive(gl: boolean): boolean {
  return gl && !document.documentElement.classList.contains('no-gl');
}

function applyTheme(el: HTMLElement, theme: Theme): void {
  if (el.dataset.theme !== theme) el.dataset.theme = theme;
}

/**
 * The section's own theme (act III C11, D23.1). With WebGL the section does not change: the choreography's theme front
 * sets data-theme on each text block, and the section keeps its paper value from the HTML, which is the theme of the
 * ground below the boundary. Without WebGL the same switch is a plain cut at p2 = 0.5, read from the scroll position
 * (the top of the section, from the viewport bottom to the viewport top). Reduced motion keeps the paper theme from the
 * start, so no theme flip runs.
 */
function bindTheme(el: HTMLElement, gl: boolean, reduced: boolean): void {
  if (reduced) {
    applyTheme(el, 'paper');
    return;
  }
  const byScroll = (self: ScrollTrigger): void => {
    if (!glActive(gl)) applyTheme(el, self.progress < 0.5 ? 'ink' : 'paper');
  };
  ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'top top', onRefresh: byScroll, onUpdate: byScroll });
}

/**
 * The no-WebGL band sits on the P1 rectangle of the rest formation (projection.ts). The rectangle is the union of
 * the 17 block footprints in the pricing camera, in viewport pixels, so the band is measured on load and on resize.
 */
function placeBand(p: Parts): void {
  const size = viewportSize();
  if (p.band === null || !(size.width > 0 && size.height > 0)) return;
  const box = boundsOf(formationRects('rest', 'pricing', size));
  p.band.style.marginLeft = `${box.x0}px`;
  p.band.style.top = `${box.y0}px`;
  p.band.style.width = `${box.x1 - box.x0}px`;
  p.band.style.height = `${box.y1 - box.y0}px`;
}

function makeRule(head: boolean): Rule {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  const path = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
  const px = head ? HEAD_RULE_PX : ROW_RULE_PX;
  svg.setAttribute('class', head ? 'pricing__rule pricing__rule--head' : 'pricing__rule');
  svg.setAttribute('viewBox', `0 0 1000 ${px}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  path.setAttribute('d', `M0 ${px / 2}H1000`);
  svg.append(path);
  return { svg, path };
}

/** Puts each drawn rule on the bottom edge of its row, measured in the table wrapper. */
function placeRules(p: Parts, head: Rule, rows: Rule[]): void {
  const origin = p.wrap.getBoundingClientRect().top;
  head.svg.style.top = `${p.headRow.getBoundingClientRect().bottom - origin - HEAD_RULE_PX}px`;
  p.bodyRows.forEach((row, k) => {
    rows[k].svg.style.top = `${row.getBoundingClientRect().bottom - origin - ROW_RULE_PX}px`;
  });
}

/**
 * Sets every start state (before anything is on screen) and returns the arm function. Arm runs once, on loader:done:
 * it places the drawn rules and creates the three triggers, each of which plays its timeline once.
 */
function prepareMotion(p: Parts): () => void {
  // Title: the display word is split into characters, which are aria-hidden. The h2 keeps the full name in its
  // aria-label (heading 8, rule 15). Each character starts displaced in x and in text-3.
  const split = SplitText.create(p.main, { type: 'chars', charsClass: 'pricing__char', aria: 'hidden' });
  const chars = split.chars as HTMLElement[];
  const centre = (chars.length - 1) / 2;
  chars.forEach((c, i) => gsap.set(c, { x: `${(i - centre) * TITLE_SHIFT_EM}em`, '--mix': 0 }));
  gsap.set(p.tail, { '--mix': 0 });

  // Table rules: the drawn rules replace the CSS borders. The CSS borders stay for no JavaScript and reduced motion.
  p.wrap.classList.add('is-drawing');
  const head = makeRule(true);
  const rows = p.bodyRows.map(() => makeRule(false));
  p.wrap.append(head.svg, ...rows.map((r) => r.svg));
  gsap.set(head.path, { drawSVG: '0% 0%' });
  rows.forEach((r) => gsap.set(r.path, { drawSVG: '0% 0%' }));
  const cellsOf = (row: HTMLElement): HTMLElement[] => Array.from(row.querySelectorAll<HTMLElement>('td'));
  p.bodyRows.forEach((row) => gsap.set(cellsOf(row), { '--mix': 0 }));
  gsap.set([p.savings, p.comparison, p.context], { '--mix': 0 });
  gsap.set(p.items, { '--mix': 0 });

  // Timelines. Each one is paused until its trigger calls play(), and each trigger is set to play once.
  const titleTl = gsap.timeline({ paused: true });
  const titleStarts = weightedStagger(chars.length, { total: T.half, weight: 'front' });
  chars.forEach((c, i) => titleTl.to(c, { x: 0, '--mix': 1, duration: T.beat7, ease: E.settle }, titleStarts[i]));
  titleTl.to(p.tail, { '--mix': 1, duration: T.beat5, ease: E.settle }, 0);

  const tableTl = gsap.timeline({ paused: true });
  tableTl.to(head.path, { drawSVG: '0% 100%', duration: T.beat5, ease: E.cut }, 0);
  rows.forEach((r, k) => {
    tableTl.to(r.path, { drawSVG: '0% 100%', duration: T.beat5, ease: E.settle }, ROW_STARTS[k]);
    tableTl.to(cellsOf(p.bodyRows[k]), { '--mix': 1, duration: T.beat5, ease: E.settle }, ROW_STARTS[k]);
  });
  tableTl.to([p.savings, p.comparison], { '--mix': 1, duration: T.beat5, ease: E.settle }, STATEMENT_START);
  tableTl.to(p.context, { '--mix': 1, duration: T.beat5, ease: E.settle }, STATEMENT_START);

  const availTl = gsap.timeline({ paused: true });
  p.items.forEach((item, k) => {
    availTl.to(item, { '--mix': 1, duration: T.beat5, ease: E.settle }, AVAILABILITY_STARTS[k]);
  });

  return (): void => {
    placeRules(p, head, rows);
    ScrollTrigger.addEventListener('refresh', () => placeRules(p, head, rows));
    ScrollTrigger.create({
      trigger: p.title,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        titleTl.play();
      },
    });
    ScrollTrigger.create({
      trigger: p.panel,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        tableTl.play();
      },
    });
    ScrollTrigger.create({
      trigger: p.avail,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        availTl.play();
      },
    });
  };
}

/** Starts the pricing section's 2D layer. Its only export. */
export function initPricing(ctx: SectionContext): void {
  const parts = collect(ctx.el);
  if (parts === null) return;
  gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger, SplitText);
  bindTheme(ctx.el, ctx.gl, ctx.reducedMotion);
  placeBand(parts);
  window.addEventListener('resize', () => placeBand(parts));
  if (ctx.reducedMotion) return;
  const arm = prepareMotion(parts);
  bus.once('loader:done', () => arm());
}
