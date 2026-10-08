// Smooth scroll (Lenis) and ScrollTrigger wiring. Architecture sections 6, 8 and 10.
//
// Lenis runs unless the user prefers reduced motion. Its frames come from the page clock in
// ticker.ts at PRIORITY.scroll, so this module starts no requestAnimationFrame loop of its own.
// scrollState is refreshed once Lenis has moved in the same tick, at PRIORITY.scroll + 1.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ef } from './ease';
import { env, onReducedMotionChange } from './env';
import { PRIORITY, addTick, initTicker, type Tick } from './ticker';
import { T } from './timing';

export interface ScrollState {
  /** Scroll position in px: Lenis's smoothed position while Lenis runs, window.scrollY otherwise. */
  y: number;
  /** Scroll velocity in px/s, smoothed with a 0.1 s time constant. Positive is down. */
  velocity: number;
  /** Direction of the last movement larger than 0.5 px: 1 is down, -1 is up. */
  direction: 1 | -1;
  /** y over the scrollable distance, in [0, 1]. */
  progress: number;
}

/** Updated once per tick. Mutated in place, so nothing allocates per frame. */
export const scrollState: ScrollState = { y: 0, velocity: 0, direction: 1, progress: 0 };

const VELOCITY_TAU = 0.1; // seconds
const DIRECTION_EPSILON = 0.5; // px

/** Elements that take focus without a tabindex. Any other target gets tabindex="-1" before it is focused. */
const NATURALLY_FOCUSABLE =
  'a[href],area[href],button,input,select,textarea,iframe,summary,[contenteditable],[tabindex]';

let lenis: Lenis | null = null;
let initialized = false;
let prevY = 0;

function currentScroll(): number {
  return lenis ? lenis.scroll : window.scrollY;
}

/** Hands the page clock to Lenis. Lenis runs with autoRaf off, so this is its only frame source. */
function driveLenis(t: Tick): void {
  lenis?.raf(t.time * 1000);
}

/** Runs after Lenis in the same tick: reads the position and updates scrollState. */
function updateScrollState(t: Tick): void {
  const y = currentScroll();
  const delta = y - prevY;
  prevY = y;
  if (t.dt > 0) {
    const blend = 1 - Math.exp(-t.dt / VELOCITY_TAU);
    scrollState.velocity += (delta / t.dt - scrollState.velocity) * blend;
  }
  if (delta > DIRECTION_EPSILON) scrollState.direction = 1;
  else if (delta < -DIRECTION_EPSILON) scrollState.direction = -1;
  scrollState.y = y;
  const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollState.progress = Math.min(1, Math.max(0, y / span));
}

function onLenisScroll(): void {
  ScrollTrigger.update();
}

function enableLenis(): void {
  if (lenis) return;
  const instance = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
  instance.on('scroll', onLenisScroll);
  lenis = instance;
}

function disableLenis(): void {
  if (!lenis) return;
  lenis.destroy();
  lenis = null;
}

/**
 * Resolves a scroll target. '#top' and 'top' mean the page top. Anything else is a selector, or a
 * bare id when the selector finds nothing. Returns null when no element matches.
 */
function resolveTarget(target: string | HTMLElement): HTMLElement | 'top' | null {
  if (typeof target !== 'string') return target;
  if (target === '#top' || target === 'top') return 'top';
  let found: Element | null = null;
  try {
    found = document.querySelector(target);
  } catch {
    found = null; // not a valid selector: fall through to the id lookup
  }
  found ??= document.getElementById(target.replace(/^#/, ''));
  return found instanceof HTMLElement ? found : null;
}

/** Document-space top of an element, measured the way Lenis measures it (scroll-margin and scroll-padding applied). */
function documentTop(el: HTMLElement): number {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop);
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return (
    el.getBoundingClientRect().top +
    window.scrollY -
    (Number.isNaN(margin) ? 0 : margin) -
    (Number.isNaN(padding) ? 0 : padding)
  );
}

/** Moves focus to the target without scrolling, for keyboard and assistive technology users. */
function moveFocus(el: HTMLElement | null): void {
  const node = el ?? document.getElementById('top') ?? document.body;
  if (!node.matches(NATURALLY_FOCUSABLE)) node.setAttribute('tabindex', '-1');
  node.focus({ preventScroll: true });
}

/** The id an in-page link points at, percent-decoded. An empty string means the page top. */
function anchorId(link: HTMLAnchorElement): string {
  const hash = (link.getAttribute('href') ?? '').slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/** One delegated listener for every same-page anchor, including links added after init. */
function onDocumentClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="#"]');
  if (!(link instanceof HTMLAnchorElement)) return;
  if (link.target !== '' && link.target !== '_self') return;
  const id = anchorId(link);
  let dest: HTMLElement | 'top';
  if (id === '' || id === 'top') {
    dest = 'top';
  } else {
    const el = document.getElementById(id);
    if (!el) return; // no such element: leave the link to the browser
    dest = el;
  }
  event.preventDefault();
  scrollToTarget(dest);
  history.replaceState(history.state, '', link.hash || location.pathname + location.search);
}

/**
 * Starts smooth scroll and ScrollTrigger. Idempotent. Call it after initTicker; it starts the
 * ticker itself if nothing has yet (initTicker is idempotent too).
 *
 * ScrollTrigger keeps a requestAnimationFrame loop of its own once it is enabled (_rafBugFix in
 * gsap 3.15). That loop belongs to gsap and cannot be stopped without disabling ScrollTrigger, so
 * the page runs the page clock plus that loop. This module starts no further loop.
 */
export function initScroll(): void {
  if (initialized) return;
  initialized = true;
  initTicker();
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (!env.reducedMotion) enableLenis();
  prevY = currentScroll();
  scrollState.y = prevY;
  addTick(driveLenis, PRIORITY.scroll);
  addTick(updateScrollState, PRIORITY.scroll + 1);
  document.addEventListener('click', onDocumentClick);
  onReducedMotionChange((reduced) => {
    if (reduced) disableLenis();
    else enableLenis();
    ScrollTrigger.refresh();
  });
}

/**
 * Scrolls to a selector, an element, or the page top ('#top' or 'top'). With Lenis the move takes
 * T.settle with the ef.sym curve. Without Lenis (reduced motion) it is an instant jump. Focus moves
 * to the target once it has landed. A target that matches nothing does nothing.
 */
export function scrollToTarget(target: string | HTMLElement, opts: { offset?: number } = {}): void {
  const offset = opts.offset ?? 0;
  const dest = resolveTarget(target);
  if (dest === null) return;
  const el = dest === 'top' ? null : dest;
  if (lenis) {
    lenis.scrollTo(el ?? 0, {
      offset,
      duration: T.settle,
      easing: ef.sym,
      onComplete: () => moveFocus(el),
    });
    return;
  }
  // 'instant', not 'auto': 'auto' follows a CSS scroll-behavior: smooth and would not be instant.
  window.scrollTo({ top: (el ? documentTop(el) : 0) + offset, behavior: 'instant' });
  moveFocus(el);
}

/** Re-measures after a layout change: Lenis's dimensions and ScrollTrigger's positions. */
export function refreshScroll(): void {
  lenis?.resize();
  ScrollTrigger.refresh();
}

/** The Lenis instance, or null while reduced motion is on (native scroll). */
export function getLenis(): Lenis | null {
  return lenis;
}
