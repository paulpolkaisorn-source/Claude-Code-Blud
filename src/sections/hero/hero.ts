// The hero section, the 2D layer of act I (design/direction-act1.md, hero; rules A1 to A13; D20.2, D22.7).
//
// What this file does:
//   - The h1 letter-spacing settles from +0.02em to -0.02em from the first frame (T.beat7, settle).
//   - The h1 weight axis is scrubbed on the hero progress: 400 at s 0, 430 at s 0.25, 400 from s 0.5 (rule 16).
//   - The lede colour settles from text-3 to text-2, and the dimension line draws, both after loader:done.
//   - The row-end counts 05, 07, 05, and the dimension line with its 17 label, are placed by projection P1 (rule A6)
//     over the stanza-open poses at the current progress, with the idle breath of the 3D layer. They are placed every
//     frame while the pose changes (addTick, after the scroll state and before the GL frame), from the same scroll
//     position the choreography reads. The layer is fixed to the viewport, so it cannot drift from the canvas.
//   - When the hero ends (s reaches 1, the speed section entering), the layer fades out over T.half with E.fade, and
//     it fades back in when the hero is current again.
//   - Nothing of the object layer shows before loader:done. The no-WebGL stanza (html.no-gl) fades in over T.half at
//     loader:done with E.fade; under reduced motion it appears at loader:done with no fade (D22.7).
//   - On touch, a tap on a block shows its two-digit label for T.breath (A13, direction.md heading 9).
//   - The secondary link jumps to the speed section through scrollToTarget.
//
// What it does not do: the fine-pointer datum and its block labels belong to the cursor (src/core/cursor.ts), and
// the stanza, the camera and the tilt belong to the 3D layer (src/sections/hero/gl.ts). Nothing here imports src/gl
// except through stanza.ts, which takes the rest pose from formations.ts and the camera fit from projection.ts.
//
// Progress. The hero progress s is clamp((scroll - section top) / section height, 0, 1) with the section top and height
// measured in document coordinates, and the scroll is scrollState.y, the same value the choreography reads (rule A3).
// No scrub is applied, so the 2D and the 3D move together.
//
// The breath. The 3D layer adds the hero breath to each block's y while the hero is current (direction-act1 hero, 3D
// layer). This file keeps the same state for its own rows: armed when the hero becomes current, starting T.hold later,
// with the gain easing in and out over T.half (blocks.ts update). The offset per row is breathRowOffsets (stanza.ts).
import './hero.css';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E, ef } from '../../core/ease';
import { env, onReducedMotionChange } from '../../core/env';
import { boundsOf, viewportSize, type ScreenRect, type Size } from '../../core/projection';
import { pointer } from '../../core/pointer';
import { scrollState, scrollToTarget } from '../../core/scroll';
import { addTick, PRIORITY, type Tick } from '../../core/ticker';
import { T } from '../../core/timing';
import { breathRowOffsets, stanzaRects } from './stanza';

/** Pointer tilt of the stanza, per axis, in radians (blocks.ts TILT_RAD, direction-3d 10.13). */
const TILT_RAD = 0.035;

/** Row ranges of the stanza in haiku order: row A is blocks 0 to 4, row B 5 to 11, row C 12 to 16. */
const ROW_A: readonly [number, number] = [0, 4];
const ROW_B: readonly [number, number] = [5, 11];
const ROW_C: readonly [number, number] = [12, 16];

/** Dimension line: 19 px (sp-4) below row C, end ticks 5 px (sp-1) centred on the line, label 5 px (sp-1) below it. */
const DIM_DROP = 19;
const TICK_HALF = 2.5;
const LABEL_DROP = 5;

/** Row-end counts sit 12 px (sp-3) from the row edge in landscape from 768 px, and 5 px (sp-1) otherwise. */
const COUNT_GAP_WIDE = 12;
const COUNT_GAP_NARROW = 5;

/** A touch label sits 12 px (sp-3) right of the tap and 12 px below it. */
const TAP_OFFSET = 12;

/** The h1 weight axis (direction.md heading 8, rule 16): 400 at the ends of the first half of the progress, 430 at its middle. */
const WEIGHT_REST = 400;
const WEIGHT_PEAK = 430;
const WEIGHT_HALF_PROGRESS = 0.5;

/** The h1 letter-spacing at its first frame and at its settled value (display-xxl, direction.md heading 4). */
const LETTER_START = 0.02;
const LETTER_END = -0.02;

/**
 * Portrait only: the h1 box starts no higher than the dimension label's bottom less the space above the cap height
 * of the display face (about 8 px at 56 px, direction-act1 A9). Its value is published as --hero-clear.
 */
const HEADLINE_CAP = 8;
/** The line box of the label, used when the label cannot be measured yet (13 px at line-height 1.3, rounded). */
const LABEL_LINE = 16;

/** A breath gain this close to its target is taken as arrived (blocks.ts SNAP). */
const BREATH_SNAP = 1e-7;

interface Parts {
  title: HTMLElement;
  lede: HTMLElement;
  link: HTMLAnchorElement;
  art: HTMLElement;
  fallback: HTMLElement;
  marks: HTMLElement;
  dim: SVGSVGElement;
  dimLine: SVGPathElement;
  dimTicks: SVGPathElement;
  dimLabel: HTMLElement;
  counts: HTMLElement[];
  tap: HTMLElement;
}

function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

function blankRect(): ScreenRect {
  return { x0: 0, y0: 0, x1: 0, y1: 0 };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** One exponential step toward target with factor a, snapped to the target when the gap is negligible (blocks.ts damp). */
function damp(value: number, target: number, a: number): number {
  const next = value + (target - value) * a;
  return Math.abs(target - next) < BREATH_SNAP ? target : next;
}

/** True while the document is in the no-WebGL state (head-env, boot, or a context lost later). */
function noGlNow(gl: boolean): boolean {
  return !gl || document.documentElement.classList.contains('no-gl');
}

/** The elements this section drives. Null when the markup is incomplete. */
function collect(el: HTMLElement): Parts | null {
  const title = el.querySelector<HTMLElement>('.hero-title');
  const lede = el.querySelector<HTMLElement>('.hero-lede');
  const link = el.querySelector<HTMLAnchorElement>('.hero-link');
  const art = el.querySelector<HTMLElement>('.hero-art');
  const fallback = el.querySelector<HTMLElement>('.hero-fallback');
  const marks = el.querySelector<HTMLElement>('.hero-marks');
  const dim = el.querySelector<SVGSVGElement>('.hero-dim');
  const dimLine = el.querySelector<SVGPathElement>('.hero-dim__line');
  const dimTicks = el.querySelector<SVGPathElement>('.hero-dim__ticks');
  const dimLabel = el.querySelector<HTMLElement>('.hero-dim-label');
  const tap = el.querySelector<HTMLElement>('.hero-tap');
  const counts = Array.from(el.querySelectorAll<HTMLElement>('.hero-count'));
  if (
    title === null ||
    lede === null ||
    link === null ||
    art === null ||
    fallback === null ||
    marks === null ||
    dim === null ||
    dimLine === null ||
    dimTicks === null ||
    dimLabel === null ||
    tap === null ||
    counts.length !== 3
  ) {
    return null;
  }
  return { title, lede, link, art, fallback, marks, dim, dimLine, dimTicks, dimLabel, counts, tap };
}

/** Starts the hero's 2D layer. Called by main.ts in page order with the section element. */
export function initHero(ctx: SectionContext): void {
  const el = ctx.el;
  const parts = collect(el);
  if (parts === null) {
    console.error('[hero] the section markup is incomplete, so the 2D layer is not started');
    return;
  }
  const { title, lede, link, art, fallback, marks, dim, dimLine, dimTicks, dimLabel, counts, tap } = parts;
  const gl = ctx.gl;
  let reduced = ctx.reducedMotion;
  // The object layer is hidden in the markup, so that its annotations never show unplaced (no JavaScript, no CSS).
  art.hidden = false;

  gsap.registerPlugin(DrawSVGPlugin);

  // Tweens of the entrance. They are killed when reduced motion turns on, and every state is set at once.
  const entrance: { kill(): void }[] = [];
  let revealTween: { kill(): void } | null = null;
  let artTween: { kill(): void } | null = null;

  // Geometry of the section in document coordinates, and the viewport size. Measured on layout, never per frame.
  let size: Size = viewportSize();
  let sectionTop = 0;
  let sectionHeight = 0;
  const restRects: ScreenRect[] = [];
  const openRects: ScreenRect[] = [];
  const boxRect = blankRect();
  const rowRects: ScreenRect[] = [blankRect(), blankRect(), blankRect()];
  // The breath offset per row that the placed rectangles include, and the one for this frame (written in place).
  const rowDy: number[] = [0, 0, 0];
  const rowDyNow: number[] = [0, 0, 0];
  let lastK = Number.NaN;
  let lastWeight = '';
  let tapTimer: { kill(): void } | null = null;

  // The object layer. revealed is set by loader:done. artOn is the shown state of the layer (the hero is current).
  let revealed = false;
  let artOn: boolean | null = null;
  // The breath state of the hero rows, mirrored from blocks.ts (see the header).
  let breathGain = 0;
  let breathArmed = false;
  let breathStart = 0;
  let heroWasCurrent = false;
  let lastTime = 0;
  // The damped group tilt, mirrored from blocks.ts, and the tilt the placed rectangles include.
  let tiltX = 0;
  let tiltY = 0;
  let tiltAppliedX = 0;
  let tiltAppliedY = 0;

  /** Places the row-end counts, the dimension line and its label from the 17 footprints (A6). */
  function place(rects: readonly ScreenRect[]): void {
    const landscape = size.width >= size.height;
    const gap = landscape && size.width >= 768 ? COUNT_GAP_WIDE : COUNT_GAP_NARROW;
    const a = boundsOf(rects, ROW_A[0], ROW_A[1], rowRects[0]);
    const b = boundsOf(rects, ROW_B[0], ROW_B[1], rowRects[1]);
    const c = boundsOf(rects, ROW_C[0], ROW_C[1], rowRects[2]);
    const rows = [a, b, c];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const centre = (row.y0 + row.y1) / 2;
      counts[i].style.transform = `translate(${row.x1 + gap}px, ${centre}px) translateY(-50%)`;
    }
    const y = c.y1 + DIM_DROP;
    const x0 = b.x0;
    const x1 = b.x1;
    dimLine.setAttribute('d', `M${x0} ${y}H${x1}`);
    dimTicks.setAttribute(
      'd',
      `M${x0} ${y - TICK_HALF}V${y + TICK_HALF}M${x1} ${y - TICK_HALF}V${y + TICK_HALF}`,
    );
    dimLabel.style.transform = `translate(${(x0 + x1) / 2}px, ${y + LABEL_DROP}px) translateX(-50%)`;
  }

  /** The weight axis of the h1 (rule 16). Reduced motion keeps the rest weight. */
  function setWeight(s: number): void {
    if (reduced) return;
    const u = clamp01(s / WEIGHT_HALF_PROGRESS);
    const wght = WEIGHT_REST + (WEIGHT_PEAK - WEIGHT_REST) * (1 - Math.abs(2 * ef.sym(u) - 1));
    const next = wght === WEIGHT_REST ? '' : `"wght" ${wght.toFixed(3)}`;
    if (next !== lastWeight) {
      title.style.fontVariationSettings = next;
      lastWeight = next;
    }
  }

  function hideTap(): void {
    tap.classList.remove('is-on');
    tapTimer?.kill();
    tapTimer = null;
  }

  /** The label of a touched block. It shows at once (a cut) and hides after T.breath. */
  function showTap(index: number, x: number, y: number): void {
    tap.textContent = String(index + 1).padStart(2, '0');
    tap.style.transform = `translate(${x + TAP_OFFSET}px, ${y + TAP_OFFSET}px)`;
    tap.classList.add('is-on');
    tapTimer?.kill();
    tapTimer = gsap.delayedCall(T.breath, hideTap);
  }

  /** The block under a point, by the placed footprints, or -1. */
  function blockAt(x: number, y: number): number {
    for (let i = 0; i < openRects.length; i += 1) {
      const r = openRects[i];
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return i;
    }
    return -1;
  }

  /** Touch only: a tap on a block shows its label. Taps on the link and the button are left to them. */
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    if (artOn !== true || !revealed) {
      hideTap();
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest('a, button') !== null) return;
    const index = blockAt(event.clientX, event.clientY);
    if (index < 0) {
      hideTap();
      return;
    }
    showTap(index, event.clientX, event.clientY);
  }

  /** Shows or hides the object layer (the hero is current). A change is a T.half fade with E.fade, or a cut when instant. */
  function syncArt(on: boolean, instant: boolean): void {
    if (on === artOn) return;
    artOn = on;
    artTween?.kill();
    artTween = null;
    if (!on) hideTap();
    if (instant) {
      gsap.set(art, { autoAlpha: on ? 1 : 0 });
      return;
    }
    artTween = gsap.to(art, { autoAlpha: on ? 1 : 0, duration: T.half, ease: E.fade, overwrite: true });
  }

  /**
   * loader:done. The object layer may show from here on. Without WebGL the static stanza and its annotations fade in
   * over T.half with E.fade, and under reduced motion they appear with no fade (D22.7). With WebGL they are visible at
   * t = 0 (direction-act1 hero), so they show at once.
   */
  function reveal(): void {
    revealed = true;
    const fade = !reduced && noGlNow(gl);
    revealTween?.kill();
    revealTween = null;
    if (fade) {
      revealTween = gsap.to([fallback, marks], { opacity: 1, duration: T.half, ease: E.fade, overwrite: true });
    } else {
      gsap.set([fallback, marks], { opacity: 1 });
    }
  }

  /** The viewport size, the no-WebGL box over the rest stanza, the section geometry and the placement at the current time. */
  function layout(): void {
    size = viewportSize();
    const el0 = el.getBoundingClientRect();
    sectionTop = el0.top + window.scrollY;
    sectionHeight = el0.height;
    stanzaRects(0, size, restRects);
    const box = boundsOf(restRects, 0, restRects.length - 1, boxRect);
    fallback.style.left = `${box.x0}px`;
    fallback.style.top = `${box.y0}px`;
    fallback.style.width = `${box.x1 - box.x0}px`;
    fallback.style.height = `${box.y1 - box.y0}px`;
    // The h1 keeps clear of the dimension label at the rest pose (portrait, A9). Landscape ignores the value.
    const rowC = boundsOf(restRects, ROW_C[0], ROW_C[1], rowRects[2]);
    const labelLine = dimLabel.getBoundingClientRect().height || LABEL_LINE;
    const clear = rowC.y1 + DIM_DROP + LABEL_DROP + labelLine - HEADLINE_CAP;
    el.style.setProperty('--hero-clear', `${clear.toFixed(2)}px`);
    dim.setAttribute('width', String(size.width));
    dim.setAttribute('height', String(size.height));
    dim.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    lastK = Number.NaN;
    rowDy[0] = Number.NaN;
    update(lastTime, 0);
  }

  /**
   * The hero progress from the scroll position: clamp((y - top) / height). This is the value the choreography computes
   * from the same scrollState.y (rule A3), with the section geometry measured here.
   */
  function progressAt(y: number): number {
    if (!(sectionHeight > 0)) return 0;
    return clamp01((y - sectionTop) / sectionHeight);
  }

  /**
   * One frame of the hero's 2D layer, at the page clock time (seconds) with dt (seconds since the last frame). It sets
   * the h1 weight, the object layer's shown state, the breath gain, and the placement of the annotations for the
   * pose at the current progress, with the breath rows of this frame. It writes only what changed.
   */
  function update(time: number, dt: number): void {
    lastTime = time;
    const s = progressAt(scrollState.y);
    setWeight(s);
    const current = s < 1;
    syncArt(current, artOn === null || !revealed);

    // The breath of the hero rows, as blocks.ts runs it: armed when the hero becomes current, then T.hold, then easing
    // in with T.half. Reduced motion and the no-WebGL stanza have no breath.
    if (current && !heroWasCurrent) breathArmed = true;
    heroWasCurrent = current;
    if (current && breathArmed) {
      breathArmed = false;
      breathStart = time + T.hold;
    }
    const wanted = current && gl && !reduced && time >= breathStart ? 1 : 0;
    const a = dt > 0 ? 1 - Math.exp(-dt / T.half) : 0;
    let gain = breathGain + (wanted - breathGain) * a;
    if (Math.abs(wanted - gain) < BREATH_SNAP) gain = wanted;
    breathGain = reduced ? 0 : gain;

    // The group tilt, as blocks.ts damps it: the pointer turns the stanza while the hero is current, on a fine pointer
    // that is not touch, and not under reduced motion (direction-3d 10.13, direction-act1 hero pointer). Reduced motion
    // holds it at 0 at once.
    const tilting = current && env.finePointer && !env.touch && !reduced;
    const tiltTargetX = tilting ? clamp(-pointer.sy * TILT_RAD, -TILT_RAD, TILT_RAD) : 0;
    const tiltTargetY = tilting ? clamp(pointer.sx * TILT_RAD, -TILT_RAD, TILT_RAD) : 0;
    tiltX = reduced ? 0 : damp(tiltX, tiltTargetX, a);
    tiltY = reduced ? 0 : damp(tiltY, tiltTargetY, a);

    // The pose: the stanza at ef.sym of the progress (rule A3, direction-act1 hero). Reduced motion and no WebGL keep
    // the rest pose (k 0), exactly as the 3D layer does.
    const k = gl && !reduced ? ef.sym(s) : 0;
    breathRowOffsets(time, breathGain, rowDyNow);
    if (
      k !== lastK ||
      rowDyNow[0] !== rowDy[0] ||
      rowDyNow[1] !== rowDy[1] ||
      rowDyNow[2] !== rowDy[2] ||
      tiltX !== tiltAppliedX ||
      tiltY !== tiltAppliedY
    ) {
      lastK = k;
      rowDy[0] = rowDyNow[0];
      rowDy[1] = rowDyNow[1];
      rowDy[2] = rowDyNow[2];
      tiltAppliedX = tiltX;
      tiltAppliedY = tiltY;
      stanzaRects(k, size, openRects, rowDy, tiltX, tiltY);
      place(openRects);
    }
  }

  /** The per-frame update, after the scroll state (PRIORITY.scroll + 1) and before the GL frame (PRIORITY.glUpdate). */
  function frame(tick: Tick): void {
    update(tick.time, tick.dt);
  }

  /** Reduced motion: every entrance is stopped and every state is at its final value. */
  function finalise(): void {
    for (const tween of entrance.splice(0)) tween.kill();
    revealTween?.kill();
    revealTween = null;
    gsap.set([fallback, marks], { opacity: revealed ? 1 : 0 });
    title.style.letterSpacing = '';
    title.style.fontVariationSettings = '';
    lastWeight = '';
    lede.style.color = '';
    clearDash();
  }

  /** The h1 settles its letter-spacing from its first frame. Reduced motion has the token value at once. */
  function startSettle(): void {
    const spacing = { em: LETTER_START };
    entrance.push(
      gsap.to(spacing, {
        em: LETTER_END,
        duration: T.beat7,
        ease: E.settle,
        onUpdate: () => {
          title.style.letterSpacing = `${spacing.em}em`;
        },
      }),
    );
  }

  /** The dimension line is drawn with no dash left behind, so that a later change of its length shows in full. */
  function clearDash(): void {
    dimLine.style.strokeDasharray = '';
    dimLine.style.strokeDashoffset = '';
  }

  /** After loader:done: the lede settles to text-2 at T.beat5, and the dimension line draws from T.half. */
  function startEntrance(): void {
    if (reduced) return;
    const from = getComputedStyle(el).getPropertyValue('--text-3').trim();
    const to = getComputedStyle(el).getPropertyValue('--text-2').trim();
    entrance.push(
      gsap.fromTo(
        lede,
        { color: from },
        { color: to, duration: T.beat5, delay: T.beat5, ease: E.settle },
      ),
    );
    entrance.push(
      gsap.to(dimLine, {
        drawSVG: '100%',
        duration: T.beat5,
        delay: T.half,
        ease: E.settle,
        onComplete: clearDash,
      }),
    );
  }

  // The scroll link. The delegated handler in scroll.ts would do the same, but the jump is named here (direction-act1 hero).
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    scrollToTarget('speed');
  });
  document.addEventListener('pointerdown', onPointerDown, { passive: true });

  // The children of the object layer wait for loader:done. The layer itself is shown from boot, so that the
  // placement is visible the moment the children are revealed.
  gsap.set([fallback, marks], { opacity: 0 });
  layout();
  if (!reduced) {
    // The first frame after boot: the h1 settles. The rest of the entrance waits for loader:done.
    startSettle();
    gsap.set(dimLine, { drawSVG: '0%' });
  }
  bus.once('loader:done', () => {
    reveal();
    startEntrance();
  });

  addTick(frame, PRIORITY.scroll + 2);
  // The section height changes with its copy on phone landscape, and the viewport changes with the window.
  window.addEventListener('resize', layout, { passive: true });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => layout()).observe(el);
  }
  if (typeof document.fonts !== 'undefined') {
    void document.fonts.ready.then(layout);
  }

  onReducedMotionChange((value) => {
    reduced = value;
    if (value) finalise();
    lastK = Number.NaN;
    rowDy[0] = Number.NaN;
    update(lastTime, 0);
  });
}
