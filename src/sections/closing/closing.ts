// Closing section, 2D layer (design/direction-act3.md, closing; design/drafts/director-decisions.md D7).
// Everything here is scroll-linked: the text layer's thresholds (C15), the dimension line's draw (C3, write progress
// w_c) and the haiku's colour turn-on (C3, reading progress s). Each one is armed on loader:done. The column itself is
// the 3D layer in src/sections/closing/gl.ts. This file reads the column's footprint through projection.ts and never
// imports from src/gl.
import './closing.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { boundsOf, formationRects, viewportSize } from '../../core/projection';
import { scrollToTarget } from '../../core/scroll';
import { T } from '../../core/timing';

/** The write runs over the first SPAN of the entrance: w_c is 0 at the viewport bottom and 1 at 1 - SPAN (C3). */
const SPAN = 0.6;

/** The write progress where the text layer appears on desktop: w_c at the section top at 86% (C15). */
const LAYER_ON_DESKTOP_PCT = 86;
const DRAW_START_DESKTOP = (1 - LAYER_ON_DESKTOP_PCT / 100) / SPAN;

/** The write is complete when the section top reaches this height (C3). */
const WRITE_END_PCT = Math.round((1 - SPAN) * 100);

/** scrubLocal parameters for the haiku colour (C3, sequence 5). The lead takes 0.10 of the reading progress. */
const COLOUR_LEAD = 0.1;
const COLOUR_TOTAL = T.half;

/** Desktop is a landscape viewport at least 768 px wide. Everything else is the phone (C15, C9). */
const DESKTOP_QUERY = '(min-aspect-ratio: 1/1) and (min-width: 768px)';
const PHONE_QUERY = 'not all and (min-aspect-ratio: 1/1), (max-width: 767px)';

/** The gap between the column and the dimension line, and the label gap, are set in CSS from the tokens (sp-4, sp-2). */

interface Parts {
  el: HTMLElement;
  layer: HTMLElement;
  haiku: HTMLElement;
  dimLine: HTMLElement;
  source: HTMLAnchorElement;
}

/** The section's elements, or null when the markup is incomplete (the section then stays static). */
function collect(el: HTMLElement): Parts | null {
  const layer = el.querySelector<HTMLElement>('.closing__layer');
  const haiku = el.querySelector<HTMLElement>('.closing__haiku');
  const dimLine = el.querySelector<HTMLElement>('.closing__dim-line');
  const source = el.querySelector<HTMLAnchorElement>('.closing__source');
  if (layer === null || haiku === null || dimLine === null || source === null) return null;
  return { el, layer, haiku, dimLine, source };
}

/**
 * Writes the column's footprint (projection P1, closing keyframe, block 00 to block 16) as custom properties on the
 * text layer. The dimension line, its label and the phone haiku position all follow from these values in CSS.
 */
function placeLayer(p: Parts): void {
  const size = viewportSize();
  if (!(size.width > 0 && size.height > 0)) return;
  const box = boundsOf(formationRects('column', 'closing', size));
  const style = p.layer.style;
  style.setProperty('--col-left', `${box.x0}px`);
  style.setProperty('--col-right', `${box.x1}px`);
  style.setProperty('--col-top', `${box.y0}px`);
  style.setProperty('--col-height', `${box.y1 - box.y0}px`);
  style.setProperty('--col-mid', `${(box.y0 + box.y1) / 2}px`);
}

/**
 * Wraps each visible character of the haiku in a span, in reading order, and returns the spans. The text itself stays
 * in the markup; spaces and the line breaks are left as they are.
 */
function splitHaiku(haiku: HTMLElement): HTMLElement[] {
  const chars: HTMLElement[] = [];
  for (const node of Array.from(haiku.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const fragment = document.createDocumentFragment();
    for (const ch of Array.from(node.textContent ?? '')) {
      if (/\s/.test(ch)) {
        fragment.append(ch);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'closing__char';
      span.textContent = ch;
      fragment.append(span);
      chars.push(span);
    }
    node.replaceWith(fragment);
  }
  return chars;
}

/**
 * The haiku colour turn-on as one timeline of length 1, whose progress is the reading progress s (C3). Character 0 is
 * the lead: its local progress is s / lead. Character i >= 1 starts at o = lead + total sqrt((i - 1) / (N - 2)) and its
 * local progress is (s - o) / (1 - o). That is scrubLocal of timing.ts, and each tween applies settle to its local
 * progress, so each character's mix is settle(q). Scrubbed with the per-block scrub, T.micro.
 */
function colourTimeline(chars: readonly HTMLElement[]): ReturnType<typeof gsap.timeline> {
  const count = chars.length;
  const timeline = gsap.timeline({ paused: true });
  chars.forEach((char, i) => {
    if (i === 0) {
      timeline.to(char, { '--mix': 1, duration: COLOUR_LEAD, ease: E.settle }, 0);
      return;
    }
    const start = COLOUR_LEAD + COLOUR_TOTAL * Math.sqrt((i - 1) / Math.max(1, count - 2));
    timeline.to(char, { '--mix': 1, duration: 1 - start, ease: E.settle }, start);
  });
  return timeline;
}

/** Sets the layer's visibility state. Written only when it changes. */
function setLayerOn(layer: HTMLElement, on: boolean): void {
  if (layer.classList.contains('is-on') !== on) layer.classList.toggle('is-on', on);
}

/**
 * The breakpoint-dependent triggers. The text layer appears when the section top reaches 86% of the viewport height on
 * desktop, and at the viewport top on phone (C15). It hides when the section bottom passes the viewport top. The
 * dimension line draws from the write progress w_c, which starts at DRAW_START_DESKTOP on desktop and at 0 on phone (C3).
 * gsap.matchMedia reverts these triggers when the breakpoint changes.
 */
function armMode(p: Parts, desktop: boolean, reduced: boolean): void {
  // The phone start has a 1 px tolerance, so the layer is on at the section top itself (ScrollTrigger reports a
  // trigger exactly at its start as inactive). The offset moves the viewport line down by 1 px, so the trigger
  // passes it 1 px before the section top. The layer's visibility is a class, so the text never fades (rule 6).
  ScrollTrigger.create({
    trigger: p.el,
    start: desktop ? `top ${LAYER_ON_DESKTOP_PCT}%` : 'top top+=1',
    end: 'bottom top',
    onRefresh: (self) => setLayerOn(p.layer, self.isActive),
    onToggle: (self) => setLayerOn(p.layer, self.isActive),
  });
  // Reduced motion and the no-WebGL column (hidden dimension line, static in the fallback) do not draw.
  if (reduced || document.documentElement.classList.contains('no-gl')) return;

  const start = desktop ? DRAW_START_DESKTOP : 0;
  const bottomTick = p.el.querySelector<HTMLElement>('.closing__dim-tick--bottom');
  gsap.set(p.dimLine, { scaleY: 0 });
  // The bottom tick is the end of the line, so it appears (a hard cut) when the line is complete.
  if (bottomTick !== null) gsap.set(bottomTick, { opacity: 0 });
  const draw = gsap.timeline({ paused: true });
  draw.to(p.dimLine, { scaleY: 1, duration: 1 - start, ease: E.settle }, start);
  if (bottomTick !== null) draw.set(bottomTick, { opacity: 1 }, 1);
  ScrollTrigger.create({
    trigger: p.el,
    start: 'top bottom',
    end: `top ${WRITE_END_PCT}%`,
    scrub: T.micro,
    animation: draw,
  });
}

/** Arms the scroll-linked layer. Runs once, on loader:done. */
function arm(p: Parts, reduced: boolean, chars: readonly HTMLElement[]): void {
  if (!reduced && chars.length > 0) {
    gsap.set(chars, { '--mix': 0 });
    ScrollTrigger.create({
      trigger: p.el,
      start: 'top top',
      end: 'bottom top',
      scrub: T.micro,
      animation: colourTimeline(chars),
    });
  }
  const media = gsap.matchMedia();
  media.add(DESKTOP_QUERY, () => armMode(p, true, reduced));
  media.add(PHONE_QUERY, () => armMode(p, false, reduced));
}

/** Starts the closing section's 2D layer. Its only export. */
export function initClosing(ctx: SectionContext): void {
  const parts = collect(ctx.el);
  if (parts === null) return;
  gsap.registerPlugin(ScrollTrigger);
  placeLayer(parts);
  window.addEventListener('resize', () => placeLayer(parts));

  // The secondary link is a same-page jump to the footer's sources list. Modified clicks keep the browser's behaviour.
  parts.source.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    scrollToTarget('sources');
  });

  // Reduced motion: no per-character turn-on, and the line stays at full length. The layer still appears at its thresholds.
  const chars = ctx.reducedMotion ? [] : splitHaiku(parts.haiku);
  bus.once('loader:done', () => arm(parts, ctx.reducedMotion, chars));
}
