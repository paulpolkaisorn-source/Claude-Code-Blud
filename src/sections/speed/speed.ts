// The speed section, the 2D layer of act I (design/direction-act1.md, speed; rules A1 to A13; director decisions D5,
// D15.1 and D16.1).
//
// What this file does:
//   - The title "Fastest" is split into characters with SplitText and reassembled once, when its top crosses 80% of the
//     viewport height (heading 8, rule 15; D2.3). Each character starts displaced by (i - centre) x 0.06em in text-3 and
//     tweens to its set place and text-1 with settle over T.beat7, along the front profile of T.half. The source note,
//     the footnote and the support line settle from text-3 to text-2 over T.beat5, T.half after the reveal starts.
//   - The race dimension line, its 17 ticks and the "17" label are drawn with settle(u) as the race forms. u is the speed
//     progress over 0.25 of the section, scrubbed with 0.7 (rule A4). The layer is placed by projection P1 (speed-layer.ts).
//   - The example stream runs while the section is in view and pauses when it leaves (speed-stream.ts).
//   - The copy holds in a pin for the first 0.85 vh of scroll, while the race forms, and then scrolls away.
//
// What it does not do: the race, its camera, the smear and the caliper belong to the 3D layer and the cursor. Nothing
// here imports src/gl. The object layer takes its rectangles from projection.ts, which is the bridge.
import './speed.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { SectionContext } from '../../main';
import { E } from '../../core/ease';
import { onReducedMotionChange } from '../../core/env';
import { T, weightedStagger } from '../../core/timing';
import { createSpeedLayer, type SpeedLayer } from './speed-layer';
import { createStream, type Stream } from './speed-stream';

/** The race reaches its end at this share of the section's scroll (rule A3: u = s / 0.25). */
const RACE_SPAN = 0.25;

/** The title reveal starts when the title's top crosses this line of the viewport (heading 8, rule 5). */
const REVEAL_LINE = 'top 80%';

/** Each title character starts displaced by (i - centre) x this many em (heading 8, rule 15). */
const TITLE_SHIFT_EM = 0.06;

/** The head sits 12 px (sp-3) left of the race column in portrait. */
const HEAD_GAP = 12;

/** From this width, the example panel in portrait is the width of the head (the left band), not the full width. */
const PANEL_BAND_MIN = 600;

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

  // The race. Scrubbed on the section progress: a timeline whose first 0.25 is the settle of u, so the line draws with
  // settle(u) and lags the scroll by the same 0.7 as the 3D formation (rule A4). Reduced motion sets the end state.
  const settleProgress = { value: 0 };
  let race: gsap.core.Timeline | null = null;
  function buildRace(): void {
    race?.kill();
    race = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: () => `+=${el.offsetHeight}`,
        scrub: 0.7,
      },
    });
    race.to(settleProgress, {
      value: 1,
      duration: RACE_SPAN,
      ease: E.settle,
      onUpdate: () => layer.paint(settleProgress.value),
    });
    // A callback at the end of the section keeps the timeline the length of the scroll, so the race span is 0.25 of it.
    race.add(() => undefined, 1);
  }
  if (!reduced) buildRace();

  // The example stream. It is a keep-alive: it runs only while the section is in view (speed-stream.ts).
  let stream: Stream | null = null;
  if (!reduced) {
    gsap.set(parts.tokens, { visibility: 'hidden' });
    stream = createStream(parts.tokens, { entry: colours.text3, settled: colours.text1 });
  }

  /** Places the object layer, and in portrait the head and the panel beside the race column. */
  function layout(): void {
    layer.layout();
    if (layer.isLandscape()) {
      el.style.removeProperty('--speed-head-w');
      el.style.removeProperty('--speed-panel-w');
    } else {
      const margin = parseFloat(getComputedStyle(parts.wrap).paddingLeft) || 0;
      const headWidth = Math.max(0, layer.raceLeft() - HEAD_GAP - margin);
      el.style.setProperty('--speed-head-w', `${headWidth}px`);
      if (window.innerWidth >= PANEL_BAND_MIN) {
        el.style.setProperty('--speed-panel-w', `${headWidth}px`);
      } else {
        el.style.removeProperty('--speed-panel-w');
      }
    }
    placeTitleStart();
    layer.paint(reduced ? 1 : settleProgress.value);
  }

  // The section's own trigger: it shows the object layer and runs the stream while the section is in view.
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      layer.show(self.isActive);
      if (self.isActive) stream?.play();
      else stream?.pause();
    },
    onRefresh: (self) => {
      layout();
      layer.show(self.isActive);
      if (self.isActive) stream?.play();
      else stream?.pause();
    },
  });

  layout();
  window.addEventListener('resize', layout, { passive: true });

  /** Reduced motion, from the first frame or set at run time: every state at once, and no loop (heading 8, rule 17). */
  function finalise(): void {
    race?.kill();
    race = null;
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
    settleProgress.value = 1;
    layer.paint(1);
  }

  onReducedMotionChange((next) => {
    if (!next || reduced) return;
    reduced = true;
    finalise();
    layout();
  });
}
