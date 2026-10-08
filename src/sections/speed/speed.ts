// The speed section, the 2D layer of act I (design/direction-act1.md, speed; rules A1 to A13; director decisions D5,
// D15.1, D20.2, D21.1, D21.2, D21.7 and D22.10 in design/drafts/director-decisions.md).
//
// What this file does:
//   - The title "Fastest" is split into characters with SplitText and reassembled once, when its top crosses 80% of
//     the viewport height (heading 8, rule 15; D2.3). Each character starts displaced by (i - centre) x 0.06em in
//     text-3 and tweens to its set place and text-1 with settle over T.beat7, along the front profile of T.half. The
//     source note, the footnote and the support line settle from text-3 to text-2 over T.beat5, T.half after the reveal
//     starts.
//   - The race annotations (the dimension line, its 17 ticks and the "17" label) are placed on the blocks at the
//     section's progress s, the same raw progress the 3D layer reads (speed-layer.ts, D21.1). Lenis is the only
//     smoothing. The annotations are on screen while the race is, and they leave when the next section's entrance takes
//     the blocks.
//   - On a phone (portrait), the head and the example panel share the left band: from the margin to 12 px left of the
//     race column, at every phone width (D21.2).
//   - The example stream runs while the section is in view and pauses when it leaves (speed-stream.ts).
//   - The copy holds in a pin for the first 0.85 vh of scroll, while the race forms, and then scrolls away.
//
// Nothing here imports the GL chunk. The object layer takes the pure formation data and the projection, which is the
// bridge.
import './speed.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { SectionContext } from '../../main';
import { E } from '../../core/ease';
import { onReducedMotionChange } from '../../core/env';
import { scrollState } from '../../core/scroll';
import { addTick, PRIORITY } from '../../core/ticker';
import { T, weightedStagger } from '../../core/timing';
import { createSpeedLayer, type SpeedLayer } from './speed-layer';
import { createStream, type Stream } from './speed-stream';

/** The race reaches its end at this share of the section's progress (rule A3: u = s / 0.25). */
const RACE_SPAN = 0.25;

/** The title reveal starts when the title's top crosses this line of the viewport (heading 8, rule 5). */
const REVEAL_LINE = 'top 80%';

/** Each title character starts displaced by (i - centre) x this many em (heading 8, rule 15). */
const TITLE_SHIFT_EM = 0.06;

/** The head and the panel sit 12 px (sp-3) left of the race column in portrait. */
const HEAD_GAP = 12;

/** A section's top this close to the scroll position (px) counts as passed, as in the choreography (reduced motion). */
const PASSED_TOLERANCE = 1;

/** The elements this section drives. Null when the markup is incomplete. */
interface Parts {
  wrap: HTMLElement;
  head: HTMLElement;
  title: HTMLElement;
  titleText: HTMLElement;
  notes: HTMLElement[];
  panel: HTMLElement;
  tokens: HTMLElement[];
  art: HTMLElement;
  rowFallback: HTMLElement;
  colFallback: HTMLElement;
  dim: SVGSVGElement;
  dimLine: SVGLineElement;
  dimTicks: SVGPathElement;
  dimLabel: HTMLElement;
}

/** The elements of the section, or null when the markup is incomplete. */
function collect(el: HTMLElement): Parts | null {
  const wrap = el.querySelector<HTMLElement>('.speed-grid');
  const head = el.querySelector<HTMLElement>('.speed-head');
  const title = el.querySelector<HTMLElement>('.speed-title');
  const titleText = el.querySelector<HTMLElement>('.speed-title__text');
  const source = el.querySelector<HTMLElement>('.speed-source');
  const footnote = el.querySelector<HTMLElement>('.speed-footnote');
  const support = el.querySelector<HTMLElement>('.speed-support');
  const panel = el.querySelector<HTMLElement>('.speed-panel');
  const art = el.querySelector<HTMLElement>('.speed-art');
  const rowFallback = el.querySelector<HTMLElement>('.speed-fallback--row');
  const colFallback = el.querySelector<HTMLElement>('.speed-fallback--col');
  const dim = el.querySelector<SVGSVGElement>('.speed-dim');
  const dimLine = el.querySelector<SVGLineElement>('.speed-dim__line');
  const dimTicks = el.querySelector<SVGPathElement>('.speed-dim__ticks');
  const dimLabel = el.querySelector<HTMLElement>('.speed-dim-label');
  const tokens = Array.from(el.querySelectorAll<HTMLElement>('.speed-tok'));
  if (
    wrap === null ||
    head === null ||
    title === null ||
    titleText === null ||
    source === null ||
    footnote === null ||
    support === null ||
    panel === null ||
    art === null ||
    rowFallback === null ||
    colFallback === null ||
    dim === null ||
    dimLine === null ||
    dimTicks === null ||
    dimLabel === null ||
    tokens.length === 0
  ) {
    return null;
  }
  return {
    wrap,
    head,
    title,
    titleText,
    notes: [source, footnote, support],
    panel,
    tokens,
    art,
    rowFallback,
    colFallback,
    dim,
    dimLine,
    dimTicks,
    dimLabel,
  };
}

function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

/** Starts the speed section's 2D layer. Called by main.ts in page order with the section element. */
export function initSpeed(ctx: SectionContext): void {
  const el = ctx.el;
  const found = collect(el);
  if (found === null) {
    console.error('[speed] the section markup is incomplete, so the 2D layer is not started');
    return;
  }
  const parts: Parts = found;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  let reduced = ctx.reducedMotion;
  const root = document.documentElement;
  const computed = getComputedStyle(el);
  const colours = {
    text1: computed.getPropertyValue('--text-1').trim(),
    text2: computed.getPropertyValue('--text-2').trim(),
    text3: computed.getPropertyValue('--text-3').trim(),
  };

  const layer: SpeedLayer = createSpeedLayer({
    art: parts.art,
    rowFallback: parts.rowFallback,
    colFallback: parts.colFallback,
    dim: parts.dim,
    dimLine: parts.dimLine,
    dimTicks: parts.dimTicks,
    dimLabel: parts.dimLabel,
  });

  // The title. It is split once, when the motion is on. Reduced motion keeps it as plain text (heading 8, rule 17).
  let chars: HTMLElement[] = [];
  let split: SplitText | null = null;
  if (!reduced) {
    split = SplitText.create(parts.titleText, { type: 'chars', aria: 'none', tag: 'span' });
    chars = split.chars.filter((c): c is HTMLElement => c instanceof HTMLElement);
    for (const c of chars) c.setAttribute('aria-hidden', 'true');
  }
  let revealed = false;

  /** The displaced start of each character, in px at the current font size, until the reveal has started. */
  function placeTitleStart(): void {
    if (reduced || revealed) return;
    const size = parseFloat(getComputedStyle(parts.titleText).fontSize);
    const centre = (chars.length - 1) / 2;
    chars.forEach((c, i) => {
      gsap.set(c, { x: (i - centre) * TITLE_SHIFT_EM * size, color: colours.text3 });
    });
  }

  // The reveal, once. Characters run on the front profile over T.half, each for T.beat7 with settle. The notes settle
  // T.half after the reveal starts.
  let reveal: gsap.core.Timeline | null = null;
  if (!reduced) {
    const offsets = weightedStagger(chars.length, { total: T.half, weight: 'front' });
    reveal = gsap.timeline({ paused: true });
    chars.forEach((c, i) => {
      reveal?.to(c, { x: 0, color: colours.text1, duration: T.beat7, ease: E.settle }, offsets[i]);
    });
    gsap.set(parts.notes, { color: colours.text3 });
    reveal.to(parts.notes, { color: colours.text2, duration: T.beat5, ease: E.settle }, T.half);
    ScrollTrigger.create({
      trigger: parts.title,
      start: REVEAL_LINE,
      once: true,
      onEnter: () => {
        revealed = true;
        reveal?.play();
      },
    });
  }

  // The example stream. It is a keep-alive: it runs only while the section is in view (speed-stream.ts).
  let stream: Stream | null = null;
  if (!reduced) {
    gsap.set(parts.tokens, { visibility: 'hidden' });
    stream = createStream(parts.tokens, { entry: colours.text3, settled: colours.text1 });
  }

  /** The section below this one: its entrance takes the blocks from the race (the centre-line rule of act II). */
  const below = el.nextElementSibling instanceof HTMLElement ? el.nextElementSibling : null;
  /** Document geometry of this section and of the one below, measured again when the layout changes. */
  let top = 0;
  let height = 0;
  let belowTop = Number.POSITIVE_INFINITY;
  let measuredScrollHeight = -1;
  let measureDirty = true;
  /** True while the section is in view (its ScrollTrigger is active). */
  let inView = false;

  function measure(): void {
    const rect = el.getBoundingClientRect();
    top = rect.top + window.scrollY;
    height = rect.height;
    belowTop = below === null ? Number.POSITIVE_INFINITY : below.getBoundingClientRect().top + window.scrollY;
    measuredScrollHeight = root.scrollHeight;
    measureDirty = false;
  }

  /** True while the GL draws the race: WebGL is on, and the fallback is not shown (html.no-gl). */
  function glDrawing(): boolean {
    return ctx.gl && !root.classList.contains('no-gl');
  }

  /**
   * One frame of the race annotations. The progress s is the one the choreography hands the 3D race, read from the same
   * smoothed scroll position (scrollState, D21.1). This tick runs at PRIORITY.state, before the choreography at
   * PRIORITY.state + 5, so both read the same scroll value in the same frame.
   */
  function frame(): void {
    if (measureDirty || root.scrollHeight !== measuredScrollHeight) measure();
    const drawing = glDrawing();
    const y = scrollState.y;
    const s = height > 0 ? clamp01((y - top) / height) : 0;
    // The race is complete from the first frame in reduced motion and without WebGL: the canvas switch or the static
    // fallback shows the rest pose (act I speed).
    layer.follow(drawing && !reduced ? clamp01(s / RACE_SPAN) : 1);
    // The annotations are shown while the race is on screen. With WebGL and motion, the race holds while this section
    // is current, and it leaves when the next section's entrance takes the blocks: once that section's top is inside
    // the centre line of the viewport (choreography rule C2). With reduced motion, the race is on screen from the
    // moment this section is current until the next one is (the canvas switches at that point). Without WebGL, the
    // static fallback stays on screen with the section, and so do the annotations.
    const vh = Math.max(1, window.innerHeight);
    const gap = belowTop - y;
    let visible = inView;
    if (drawing && reduced) visible = visible && y >= top - PASSED_TOLERANCE && gap > PASSED_TOLERANCE;
    else if (drawing) visible = visible && gap >= vh / 2;
    layer.show(visible);
  }

  /** Places the head, the panel and the object layer for the viewport. */
  function layout(): void {
    layer.layout();
    measureDirty = true;
    if (layer.isLandscape()) {
      el.style.removeProperty('--speed-head-w');
      el.style.removeProperty('--speed-panel-w');
    } else {
      // Portrait (D21.2): the head and the example panel share the left band, from the margin to 12 px left of the race
      // column, at every phone width. The column's edge comes from its rest footprint (formationRects, rule A6).
      const wrapRect = parts.wrap.getBoundingClientRect();
      const margin = parseFloat(getComputedStyle(parts.wrap).paddingLeft) || 0;
      const band = `${Math.max(0, layer.raceLeft() - HEAD_GAP - (wrapRect.left + margin))}px`;
      el.style.setProperty('--speed-head-w', band);
      el.style.setProperty('--speed-panel-w', band);
    }
    placeTitleStart();
    frame();
  }

  // The section's trigger: it tells the object layer and the stream whether the section is in view. ScrollTrigger leaves
  // isActive unset until it has reported a state, so the flag is read as a strict boolean.
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      inView = self.isActive === true;
      if (inView) stream?.play();
      else stream?.pause();
    },
    onRefresh: (self) => {
      inView = self.isActive === true;
      layout();
      if (inView) stream?.play();
      else stream?.pause();
    },
  });

  layout();
  window.addEventListener('resize', layout, { passive: true });
  // The annotations are placed on every frame (PRIORITY.state, before the choreography at PRIORITY.state + 5).
  addTick(frame, PRIORITY.state);

  /** Reduced motion, from the first frame or set at run time: every state at once, and no loop (heading 8, rule 17). */
  function finalise(): void {
    reveal?.kill();
    reveal = null;
    stream?.finish();
    stream = null;
    if (split !== null) {
      for (const c of chars) gsap.set(c, { clearProps: 'all' });
      split.revert();
      split = null;
      chars = [];
    }
    gsap.set(parts.notes, { clearProps: 'color' });
    gsap.set(parts.tokens, { clearProps: 'all' });
  }

  onReducedMotionChange((next) => {
    if (!next || reduced) return;
    reduced = true;
    finalise();
    layout();
  });
}
