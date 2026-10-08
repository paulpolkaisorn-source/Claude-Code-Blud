// The family section's 2D layer (design/direction-act2.md, family; design/drafts/director-decisions.md D4,
// D16.4, D19.2, D20.1, D22.6, D22.12, D23.1 and D23.8; design/direction.md headings 8, 9 and 13).
//
// Phone labels (D23.8): each label is centred on its station's projected y, and fitStack moves a label only as far as
// the title's clearance, the label above and the viewport bottom require. Block themes (D23.1): the head, intro, axis
// title, axis labels, stations and notes carry data-theme-block; theme-front.ts sets their theme.
//
// This file owns the title reveal (SplitText, once, at the 80 per cent line), the dimension axis, the four
// station label blocks, the source notes and the box of the no-WebGL overlay. Every position that follows a
// 3D block comes from src/core/projection.ts, so the 2D parts sit where the blocks are drawn. The stage is the
// viewport: its height is the height that projection.ts uses, and every position is in its coordinates, as if its
// top-left were the viewport origin. The family 3D reads the stage's rect (data-anchor="family-stations").
// The section imports nothing from src/gl. It talks to the 3D layer by one document event, 'hk:family-hover', with
// detail { station, toggle? }: station is 0 to 3 while a label is hovered (fine pointer) or tapped (touch),
// and null when the pointer leaves. A tap sends toggle: true, so the 3D layer can start and stop a run.
import './family.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { env, onReducedMotionChange } from '../../core/env';
import { stationCenters, viewportSize, type Point } from '../../core/projection';
import { T, weightedStagger } from '../../core/timing';

/** The document event the 3D layer listens for (D4). */
const HOVER_EVENT = 'hk:family-hover';

/** Stations sit 21 bu apart, from x -10.5 (Slower) to x +10.5 (Fastest). */
const STATION_SPAN_BU = 21;
/** The axis runs from -14 to +14 bu. It sits 2.3 bu above the stanza centre, or left of it on narrow layouts. */
const AXIS_HALF_BU = 14;
const AXIS_OFFSET_BU = 2.3;
/** The six ticks, in bu along the axis: the two ends and the four stations. */
const TICK_BU: readonly number[] = [-14, -10.5, -3.5, 3.5, 10.5, 14];
/** A station block is 6.4 bu wide, starts 3.2 bu left of its station and has its top 1.9 bu below the centre. */
const BLOCK_WIDTH_BU = 6.4;
const BLOCK_HALF_BU = 3.2;
const BLOCK_TOP_BU = 1.9;
/** On narrow layouts the stanza is 2.80 bu tall on screen, so it reaches 1.40 bu each side of its centre. */
const STANZA_HALF_BU = 1.4;
/** On narrow layouts a station block starts 0.5 bu to the right of the stanza's edge. */
const BLOCK_GAP_BU = 0.5;
/** The no-WebGL overlay spans 28 bu along the axis and 8 bu across it (narrow: 8 bu across, 28 bu tall). */
const OVERLAY_LONG_BU = 2 * AXIS_HALF_BU;
const OVERLAY_SHORT_BU = 8;
/** Title reveal: the trigger line, and the displacement of each character in em (direction.md heading 8, rule 15). */
const REVEAL_START = 'top 80%';
const DISPLACE_EM = 0.06;
/** A line with fewer characters than this starts all of its characters together. */
const STAGGER_MIN_CHARS = 5;
/** Number of stations: Slower, Moderate, Fast and Fastest. */
const STATION_COUNT = 4;
/** The knockout's vertical padding on an axis label (family.css, D22.6). The label's box rises this far above its text. */
const KNOCK_PAD_PX = 2;

/** A box in CSS pixels. A property that is not given is cleared, so a layout change leaves no stale value. */
interface Box {
  left?: number;
  top?: number;
  right?: number;
  width?: number;
  height?: number;
}

function px(value: number): string {
  return `${value}px`;
}

function place(el: HTMLElement, box: Box): void {
  el.style.left = box.left === undefined ? '' : px(box.left);
  el.style.top = box.top === undefined ? '' : px(box.top);
  el.style.right = box.right === undefined ? '' : px(box.right);
  el.style.width = box.width === undefined ? '' : px(box.width);
  el.style.height = box.height === undefined ? '' : px(box.height);
}

/** A spacing token, read from the section so that its value stays in tokens.css. Zero if it is missing. */
function token(el: HTMLElement, name: string): number {
  const value = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(value) ? value : 0;
}

/** A 2D context for measuring text. It is made once; null where canvas is not available. */
let measureContext: CanvasRenderingContext2D | null | undefined;

/** The measuring context, set to el's font. Null where canvas is not available. */
function textContext(el: HTMLElement): CanvasRenderingContext2D | null {
  if (measureContext === undefined) measureContext = document.createElement('canvas').getContext('2d');
  if (measureContext === null || measureContext === undefined) return null;
  const cs = getComputedStyle(el);
  measureContext.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return measureContext;
}

/** The ascent and descent of el's font, in px. Null where canvas is not available. */
function fontMetrics(el: HTMLElement): { ascent: number; descent: number } | null {
  const ctx = textContext(el);
  if (ctx === null) return null;
  const m = ctx.measureText('Hg');
  return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent };
}

/**
 * The distance in px from the top of the first line box of el to its baseline. The content area of a line is the
 * font's ascent and descent, centred in the line height, so the baseline sits (line - (ascent + descent)) / 2 below
 * the line top, plus the ascent.
 */
function baselineInLine(el: HTMLElement): number {
  const line = parseFloat(getComputedStyle(el).lineHeight);
  const m = fontMetrics(el);
  if (m === null || !Number.isFinite(line)) return 0;
  return (line - (m.ascent + m.descent)) / 2 + m.ascent;
}

/**
 * The distance in px from the top of the title's box to the lowest ink of its text. The box holds each line at its
 * line height, so the last baseline sits (ascent - descent - line height) / 2 above the box bottom, with the ascent and
 * descent of the font. The lowest glyph of the text reaches its ink descent below that baseline. The axis must clear
 * this line by sp-4 (D22.12, the act II 2D fields). Without canvas, the box bottom is used.
 */
function titleInkBelowTop(title: HTMLElement): number {
  const box = title.getBoundingClientRect().height;
  const line = parseFloat(getComputedStyle(title).lineHeight);
  const m = fontMetrics(title);
  const ctx = m === null ? null : measureContext ?? null;
  if (m === null || ctx === null || !Number.isFinite(line)) return box;
  const ink = ctx.measureText(title.textContent ?? '').actualBoundingBoxDescent;
  return box + (m.ascent - m.descent - line) / 2 + ink;
}

/**
 * The right edge, in viewport px, of the last line of the title's text. Each character is measured through a range,
 * so the result holds while the title is split for its reveal. A character whose top lies below the current line
 * starts a new line, so the last line is the one that is reached last.
 */
function lastLineRight(title: HTMLElement): number {
  let lineTop = -Infinity;
  let right = -Infinity;
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i += 1) {
      if (text[i].trim() === '') continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      if (box.top > lineTop + 1) {
        lineTop = box.top;
        right = box.right;
      } else if (box.top >= lineTop - 1) {
        right = Math.max(right, box.right);
      }
    }
  }
  return right;
}

/**
 * The tops of a column of label blocks on a phone (D23.8). Block k is centred on centres[k] wherever the constraints
 * allow, and they are: the first top is at least floor (the title's clearance); each block starts at least gap below
 * the block above it, so no two overlap; and the last bottom is at most ceiling, so the column stays on screen.
 * The result is the least-squares fit of the tops to their centred positions under those constraints. Writing each top
 * as its offset plus the gaps above it turns the gap rule into "offsets never decrease", a monotone fit that
 * pool-adjacent-violators solves. The fit is then clipped to the range the floor and the ceiling leave, which keeps
 * it monotone, and a block moves only as far as the constraints need.
 */
function fitStack(
  centres: readonly number[],
  heights: readonly number[],
  gap: number,
  floor: number,
  ceiling: number,
): number[] {
  const n = centres.length;
  const offsets: number[] = [];
  let run = 0;
  for (let k = 0; k < n; k += 1) {
    offsets.push(run);
    run += heights[k] + gap;
  }
  const pools: { mean: number; count: number }[] = [];
  for (let k = 0; k < n; k += 1) {
    pools.push({ mean: centres[k] - heights[k] / 2 - offsets[k], count: 1 });
    while (pools.length > 1 && pools[pools.length - 2].mean > pools[pools.length - 1].mean) {
      const last = pools.pop();
      const before = pools[pools.length - 1];
      if (last === undefined) break;
      const count = before.count + last.count;
      before.mean = (before.mean * before.count + last.mean * last.count) / count;
      before.count = count;
    }
  }
  // The largest offset that the ceiling allows the last block. The offsets are monotone, so it bounds every block.
  const upper = ceiling - heights[n - 1] - offsets[n - 1];
  const tops: number[] = [];
  for (const pool of pools) {
    // The floor wins over the ceiling, because the title's clearance is the stronger rule.
    const offset = Math.max(Math.min(pool.mean, upper), floor);
    for (let j = 0; j < pool.count; j += 1) {
      tops.push(offset + offsets[tops.length]);
    }
  }
  return tops;
}

export function initFamily(ctx: SectionContext): void {
  const section = ctx.el;
  const stage = section.querySelector<HTMLElement>('.family__stage');
  const head = section.querySelector<HTMLElement>('.family__head');
  const title = section.querySelector<HTMLElement>('.family__title');
  const axisTitle = section.querySelector<HTMLElement>('.family__axis-title');
  const axisLine = section.querySelector<HTMLElement>('.family__axis-line');
  const ticks = Array.from(section.querySelectorAll<HTMLElement>('.family__tick'));
  const axisLabels = Array.from(section.querySelectorAll<HTMLElement>('.family__axis-label'));
  const blocks = Array.from(section.querySelectorAll<HTMLElement>('.family__station'));
  const notes = section.querySelector<HTMLElement>('.family__notes');
  const intro = section.querySelector<HTMLElement>('.family__intro');
  const fallback = section.querySelector<HTMLElement>('.family__fallback');
  const svg = section.querySelector<SVGSVGElement>('.family__svg');
  const stanzas = section.querySelector<SVGGElement>('.family__stanzas');
  if (
    stage === null ||
    head === null ||
    title === null ||
    axisTitle === null ||
    axisLine === null ||
    notes === null ||
    intro === null ||
    fallback === null ||
    svg === null ||
    stanzas === null ||
    ticks.length !== TICK_BU.length ||
    axisLabels.length !== STATION_COUNT ||
    blocks.length !== STATION_COUNT
  ) {
    return;
  }
  const points: Point[] = [];

  /** Places the stations, ticks, labels, notes and overlay box for the current viewport. */
  const layout = (): void => {
    const size = viewportSize();
    const narrow = size.width / size.height < 1; // C3: an aspect below 1.0 is the narrow class
    stage.dataset.layout = narrow ? 'narrow' : 'wide';
    // D22.12: the stage is the viewport, in the height that projection.ts uses (svh and innerHeight can differ).
    stage.style.height = px(size.height);
    const pts = stationCenters(size, points);
    // The world origin lies midway between the Slower and Fastest stations, in either orientation.
    const ox = (pts[0].x + pts[3].x) / 2;
    const oy = (pts[0].y + pts[3].y) / 2;
    const s = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y) / STATION_SPAN_BU; // px per bu
    // One device pixel, expressed in bu, so the overlay's hairlines stay 1 px at every size.
    stage.style.setProperty('--fam-px', String(1 / s));
    const tickLen = token(section, '--sp-3');
    const gap = token(section, '--sp-3');
    const small = token(section, '--sp-2');
    const edge = token(section, '--sp-4');

    const stageTop = stage.getBoundingClientRect().top;
    // The lowest ink of the title, from the top of its box. Every part of the axis clears it by the edge (sp-4).
    const titleInk = titleInkBelowTop(title);

    if (!narrow) {
      intro.classList.remove('is-spacer');
      // The head keeps the CSS rest top (12 per cent of the stage) unless its lowest line would come within the edge
      // of the axis labels. Then the head moves up by the difference. The label's text is 12 px above the tick, and
      // its knockout box rises 2 px above the text, so the box top is the edge that the title clears.
      const axisY = oy - AXIS_OFFSET_BU * s;
      const labelLine = parseFloat(getComputedStyle(axisLabels[0]).lineHeight);
      const labelTop = axisY - tickLen / 2 - gap - labelLine - KNOCK_PAD_PX;
      head.style.top = '';
      const restTop = parseFloat(getComputedStyle(head).top);
      const headInk = Math.max(titleInk, intro.offsetHeight);
      const headTop = Math.min(restTop, labelTop - edge - headInk);
      head.style.top = headTop < restTop ? px(headTop) : '';

      const axisLeft = ox - AXIS_HALF_BU * s;
      place(axisLine, { left: axisLeft, top: axisY, width: OVERLAY_LONG_BU * s, height: 1 });
      TICK_BU.forEach((bu, k) => {
        place(ticks[k], { left: ox + bu * s - 0.5, top: axisY - tickLen / 2, width: 1, height: tickLen });
        ticks[k].style.display = '';
      });
      axisLabels.forEach((label, i) => {
        place(label, { left: pts[i].x, top: axisY - tickLen / 2 - gap });
      });
      place(axisTitle, { left: axisLeft, top: axisY + small });
      blocks.forEach((li, i) => {
        place(li, {
          left: pts[i].x - BLOCK_HALF_BU * s,
          top: pts[i].y + BLOCK_TOP_BU * s,
          width: BLOCK_WIDTH_BU * s,
        });
      });
      place(notes, { left: axisLeft });
      notes.style.top = '';
      place(fallback, {
        left: ox - AXIS_HALF_BU * s,
        top: oy - (OVERLAY_SHORT_BU / 2) * s,
        width: OVERLAY_LONG_BU * s,
        height: OVERLAY_SHORT_BU * s,
      });
      svg.setAttribute('viewBox', `-${AXIS_HALF_BU} -${OVERLAY_SHORT_BU / 2} ${OVERLAY_LONG_BU} ${OVERLAY_SHORT_BU}`);
      stanzas.removeAttribute('transform');
    } else {
      // Portrait: the family group turns by -pi/2, so the stations run down the screen, Slower at the top. The head
      // is in the flow here, so its rest position is the title's own top.
      head.style.top = '';
      const axisX = ox - AXIS_OFFSET_BU * s;
      const axisBottom = oy + AXIS_HALF_BU * s;
      // The axis starts one edge below the title's lowest ink. Its top end is the -14 bu tick, which is hidden while the
      // axis is trimmed, so no tick is drawn into the title. The first station tick is checked by the same measure.
      const inkBottom = title.getBoundingClientRect().top - stageTop + titleInk;
      const axisNaturalTop = oy - AXIS_HALF_BU * s;
      const axisTop = Math.max(axisNaturalTop, inkBottom + edge);
      const trimmed = axisTop > axisNaturalTop;
      place(axisLine, { left: axisX, top: axisTop, width: 1, height: axisBottom - axisTop });
      TICK_BU.forEach((bu, k) => {
        place(ticks[k], { left: axisX - tickLen / 2, top: oy + bu * s - 0.5, width: tickLen, height: 1 });
        ticks[k].style.display = trimmed && k === 0 ? 'none' : '';
      });
      axisLabels.forEach((label) => place(label, {}));
      // The axis title sits at the right margin, on the baseline of the title's last line, so that the two share a row.
      // It wraps inside the space that the last line leaves free, and the rows below the title stay clear for the axis
      // and the Fastest block.
      const titleBox = title.getBoundingClientRect();
      const titleLine = parseFloat(getComputedStyle(title).lineHeight);
      const titleLines = Math.max(1, Math.round(titleBox.height / titleLine));
      const lastBaseline = titleBox.top - stageTop + (titleLines - 1) * titleLine + baselineInLine(title);
      const stageBox = stage.getBoundingClientRect();
      const freeWidth = Math.max(0, stageBox.width - 2 * edge - (lastLineRight(title) - stageBox.left));
      const labelLine = parseFloat(getComputedStyle(axisTitle).lineHeight);
      place(axisTitle, { right: edge, top: 0, width: freeWidth });
      const labelLines = Math.max(1, Math.round(axisTitle.getBoundingClientRect().height / labelLine));
      place(axisTitle, {
        right: edge,
        top: lastBaseline - (labelLines - 1) * labelLine - baselineInLine(axisTitle),
        width: freeWidth,
      });
      place(notes, {});
      placeIntro(size.height, stage.offsetHeight, token(section, '--sp-5'), gap);
      const blockLeft = ox + (STANZA_HALF_BU + BLOCK_GAP_BU) * s;
      const blockWidth = size.width - edge - blockLeft;
      blocks.forEach((li) => place(li, { left: blockLeft, width: blockWidth }));
      // Each block sits on its own station (D23.8): centred on the station's projected y. The title's clearance (sp-4
      // below its lowest ink) and the block above it can push a block down, and the bottom of the viewport can stop
      // it, so fitStack moves the column by the least amount that those constraints need. The heights are read after
      // the width is set, because the text wraps inside that width.
      const heights = blocks.map((li) => li.offsetHeight);
      const tops = fitStack(
        pts.map((p) => p.y),
        heights,
        gap,
        inkBottom + edge,
        size.height - edge,
      );
      blocks.forEach((li, i) => {
        li.style.top = px(tops[i]);
      });
      place(fallback, {
        left: ox - (OVERLAY_SHORT_BU / 2) * s,
        top: oy - AXIS_HALF_BU * s,
        width: OVERLAY_SHORT_BU * s,
        height: OVERLAY_LONG_BU * s,
      });
      svg.setAttribute('viewBox', `-${OVERLAY_SHORT_BU / 2} -${AXIS_HALF_BU} ${OVERLAY_SHORT_BU} ${OVERLAY_LONG_BU}`);
      // (x, y) to (-y, x) in the overlay's own axes: the -pi/2 turn of the 3D group, with y pointing down.
      stanzas.setAttribute('transform', 'matrix(0 1 -1 0 0 0)');
    }
    section.classList.add('is-placed');
  };

  /**
   * Narrow only. The intro is drawn in the spacer above the notes when the spacer has room for it. The room is the
   * part of the 2 vh section below the block that lies above its last 0.18 vh, which direction.md heading 8, rule 13
   * keeps free of text: 2 vh less 1.5 vh less 0.18 vh, that is 0.32 vh. Otherwise the intro stays visually hidden
   * and is read by assistive technology only.
   */
  const placeIntro = (viewportHeight: number, stageHeight: number, offset: number, gap: number): void => {
    const room = 0.32 * viewportHeight;
    intro.classList.remove('is-spacer');
    notes.style.top = '';
    const notesHeight = notes.offsetHeight;
    intro.classList.add('is-spacer');
    const introHeight = intro.offsetHeight;
    if (offset + introHeight + gap + notesHeight <= room) {
      notes.style.top = px(stageHeight + offset + introHeight + gap);
    } else {
      intro.classList.remove('is-spacer');
    }
  };

  // ---------- Title reveal (direction.md heading 8, rule 15; D2.3) ----------

  let split: SplitText | null = null;
  let reveal: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;
  let revealed = false;

  /**
   * One paused timeline for the current split. Each line is staggered with the front profile over T.half, and each
   * character settles to its place and its token colour over T.beat7. A line with fewer than five characters starts
   * all of its characters together. The pre-reveal state is set here: each character is displaced away from the
   * line centre and is in text-3. Opacity is never changed.
   */
  const buildReveal = (lines: readonly Element[]): gsap.core.Timeline => {
    const ink = getComputedStyle(title).color;
    const grey = getComputedStyle(section).getPropertyValue('--text-3').trim();
    const timeline = gsap.timeline({ paused: true });
    for (const line of lines) {
      const chars = Array.from(line.querySelectorAll<HTMLElement>('.family__char'));
      const n = chars.length;
      const offsets =
        n < STAGGER_MIN_CHARS ? chars.map(() => 0) : weightedStagger(n, { total: T.half, weight: 'front' });
      const centre = (n - 1) / 2;
      chars.forEach((char, i) => {
        const em = parseFloat(getComputedStyle(char).fontSize);
        gsap.set(char, { x: (i - centre) * DISPLACE_EM * em, color: grey });
        timeline.to(
          char,
          { x: 0, color: ink, duration: T.beat7, ease: E.settle, clearProps: 'transform,color' },
          offsets[i],
        );
      });
    }
    return timeline;
  };

  const splitTitle = (): void => {
    if (split !== null || revealed) return;
    split = SplitText.create(title, {
      type: 'lines,words,chars',
      tag: 'span',
      linesClass: 'family__line',
      wordsClass: 'family__word',
      charsClass: 'family__char',
      autoSplit: true,
      onSplit: (self: SplitText) => {
        // The parent keeps the full title as its name, and SplitText hides the characters from assistive technology.
        title.setAttribute('aria-label', (title.textContent ?? '').replace(/\u00a0/g, ' ').trim());
        reveal?.kill();
        reveal = buildReveal(self.lines);
      },
    });
  };

  /** After the reveal the split is removed, so the title is plain text again and no state is left behind. */
  const settleTitle = (): void => {
    split?.kill();
    split?.revert();
    split = null;
    reveal = null;
  };

  const playReveal = (): void => {
    if (revealed || reveal === null) return;
    revealed = true;
    reveal.eventCallback('onComplete', settleTitle);
    reveal.play();
  };

  const armReveal = (): void => {
    if (trigger !== null) return;
    trigger = ScrollTrigger.create({
      trigger: title,
      start: REVEAL_START,
      once: true,
      onEnter: playReveal,
    });
  };

  const mountTitle = (): void => {
    if (env.reducedMotion || revealed) return;
    splitTitle();
    armReveal();
  };

  /** Reduced motion: the title is static, with no split and no trigger. */
  const unmountTitle = (): void => {
    if (revealed) return;
    trigger?.kill();
    trigger = null;
    reveal?.kill();
    reveal = null;
    if (split !== null) {
      split.kill();
      split.revert();
      split = null;
    }
  };

  // ---------- Station hover and tap (D4) ----------

  const emit = (station: number | null, toggle: boolean): void => {
    const detail = toggle ? { station, toggle: true } : { station };
    document.dispatchEvent(new CustomEvent(HOVER_EVENT, { detail }));
  };

  blocks.forEach((li, station) => {
    // Fine pointer: the run or the lift starts on enter and stops on leave. Touch: a tap toggles it.
    li.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch' || !env.finePointer || env.reducedMotion) return;
      emit(station, false);
    });
    li.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      emit(null, false);
    });
    li.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'touch' || env.reducedMotion) return;
      emit(station, true);
    });
  });

  bus.on('section:leave', (id) => {
    if (id === 'family') emit(null, false);
  });

  onReducedMotionChange((reduced) => {
    if (reduced) {
      emit(null, false);
      unmountTitle();
    } else {
      mountTitle();
    }
  });

  // ---------- Start ----------

  gsap.registerPlugin(ScrollTrigger, SplitText);
  layout();
  mountTitle();
  window.addEventListener('resize', layout, { passive: true });
  bus.once('loader:done', layout);
  void document.fonts.ready.then(layout);
}
