// The family section's 2D layer (design/direction-act2.md, family; design/drafts/director-decisions.md D4,
// D16.4 and D19.2; design/direction.md headings 8, 9 and 13).
//
// This file owns the title reveal (SplitText, once, at the 80 per cent line), the dimension axis, the four
// station label blocks, the source notes and the box of the no-WebGL overlay. Every position that follows a
// 3D block comes from src/core/projection.ts, so the 2D parts sit where the blocks are drawn. The section
// imports nothing from src/gl. It talks to the 3D layer by one document event, 'hk:family-hover', with
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

export function initFamily(ctx: SectionContext): void {
  const section = ctx.el;
  const stage = section.querySelector<HTMLElement>('.family__stage');
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
    const titleBottom = title.getBoundingClientRect().bottom - stageTop;

    if (!narrow) {
      const axisY = oy - AXIS_OFFSET_BU * s;
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
      intro.classList.remove('is-spacer');
      place(fallback, {
        left: ox - AXIS_HALF_BU * s,
        top: oy - (OVERLAY_SHORT_BU / 2) * s,
        width: OVERLAY_LONG_BU * s,
        height: OVERLAY_SHORT_BU * s,
      });
      svg.setAttribute('viewBox', `-${AXIS_HALF_BU} -${OVERLAY_SHORT_BU / 2} ${OVERLAY_LONG_BU} ${OVERLAY_SHORT_BU}`);
      stanzas.removeAttribute('transform');
    } else {
      // Portrait: the family group turns by -pi/2, so the stations run down the screen, Slower at the top.
      const axisX = ox - AXIS_OFFSET_BU * s;
      // The axis starts below the title, so its hairline never runs through the title's letters. The +14 bu
      // tick at its top end moves with it, and is hidden while the axis is trimmed.
      const axisBottom = oy + AXIS_HALF_BU * s;
      const axisTop = Math.max(oy - AXIS_HALF_BU * s, titleBottom + gap);
      const trimmed = axisTop > oy - AXIS_HALF_BU * s;
      place(axisLine, { left: axisX, top: axisTop, width: 1, height: axisBottom - axisTop });
      TICK_BU.forEach((bu, k) => {
        place(ticks[k], { left: axisX - tickLen / 2, top: oy + bu * s - 0.5, width: tickLen, height: 1 });
        ticks[k].style.display = trimmed && k === TICK_BU.length - 1 ? 'none' : '';
      });
      axisLabels.forEach((label) => place(label, {}));
      place(axisTitle, {});
      place(notes, {});
      placeIntro(size.height, stage.offsetHeight, token(section, '--sp-5'), gap);
      const blockLeft = ox + (STANZA_HALF_BU + BLOCK_GAP_BU) * s;
      const blockWidth = size.width - edge - blockLeft;
      blocks.forEach((li) => place(li, { left: blockLeft, width: blockWidth }));
      // Each block is centred on its station, unless that would overlap the title or the block above it.
      // The heights are read after the width is set, because the text wraps inside that width.
      const heights = blocks.map((li) => li.offsetHeight);
      let floor = titleBottom + edge;
      blocks.forEach((li, i) => {
        const top = Math.max(pts[i].y - heights[i] / 2, floor);
        li.style.top = px(top);
        floor = top + heights[i] + gap;
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
