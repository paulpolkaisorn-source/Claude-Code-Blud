// The timed card graphics of the capabilities section and the effort stair (design/direction-act2.md, capabilities:
// card graphics, Sequence (Stair), Keep-alive and Reduced motion; decision D6). Every duration is a T value, every
// curve an E ease, and every stagger comes from weightedStagger.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { E } from '../../core/ease';
import { T, weightedStagger } from '../../core/timing';

/** The total spread of the five field fills, in seconds, after activation (cap-0, D6). */
const FILL_TOTAL = 1.4;
/** Bar A (Haiku 5.5) starts with the last field fill. Bar B (Haiku 4.5) follows one micro step later. */
const BAR_A_START = 1.4;

/** cap-0. A controller for the computer-use form sequence. */
export interface Cap0Graphic {
  /** Plays the sequence from its first frame. */
  play(): void;
  /** Puts the graphic back to its first frame, with the fields as carets and nothing drawn. */
  reset(): void;
  /** Puts the graphic in its final state at once: every field a bar, both OSWorld bars drawn. */
  finish(): void;
}

/**
 * Builds the cap-0 timeline on the given SVG. Each field morphs from its caret to its bar with cut over T.micro, from
 * its stagger offset. The cursor segments draw with settle over T.half, each from the offset of the field it leaves.
 * Bar A draws with cut over T.micro from 1.40 s, and bar B draws with settle over T.beat5 from 1.57 s.
 */
export function createCap0(svg: SVGSVGElement): Cap0Graphic {
  gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);
  const fields = Array.from(svg.querySelectorAll<SVGPathElement>('.cap0__field'));
  const cursors = Array.from(svg.querySelectorAll<SVGPathElement>('.cap0__cursor'));
  const barA = svg.querySelector<SVGPathElement>('.cap0__bar-a');
  const barB = svg.querySelector<SVGPathElement>('.cap0__bar-b');
  const offsets = weightedStagger(fields.length, { total: FILL_TOTAL, weight: 'front' });

  const timeline = gsap.timeline({ paused: true });
  fields.forEach((field, i) => {
    const vars: gsap.TweenVars = {
      morphSVG: field.dataset.bar ?? field,
      duration: T.micro,
      ease: E.cut,
      onStart: () => field.classList.add('is-bar'),
    };
    timeline.to(field, vars, offsets[i]);
  });
  cursors.forEach((cursor, i) => {
    timeline.fromTo(cursor, { drawSVG: '0%' }, { drawSVG: '100%', duration: T.half, ease: E.settle }, offsets[i]);
  });
  if (barA !== null) {
    timeline.fromTo(barA, { drawSVG: '0%' }, { drawSVG: '100%', duration: T.micro, ease: E.cut }, BAR_A_START);
  }
  if (barB !== null) {
    timeline.fromTo(
      barB,
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: T.beat5, ease: E.settle },
      BAR_A_START + T.micro,
    );
  }

  const setBars = (on: boolean): void => {
    for (const field of fields) field.classList.toggle('is-bar', on);
  };

  return {
    play(): void {
      setBars(false);
      timeline.restart();
    },
    reset(): void {
      timeline.pause(0);
      setBars(false);
    },
    finish(): void {
      timeline.progress(1).pause();
      setBars(true);
    },
  };
}

/** cap-1. A controller for the conveyor, which loops while its section is in view. */
export interface Cap1Graphic {
  /** Runs the loop while running is true, and pauses it otherwise. The loop keeps its place when paused. */
  setRunning(running: boolean): void;
  /** Reduced motion: the loop stops and the seven items rest on their lanes inside the bins. */
  setStatic(): void;
  /** Leaves reduced motion: the loop is built again, paused at its start until setRunning(true). */
  setAnimated(): void;
}

/** Lane of each item: item j goes to lane LANES[j] (summary, classification, routing). */
const LANES: readonly number[] = [0, 1, 2, 0, 1, 2, 0];
/** Lane centre lines, in SVG units. */
const LANE_Y: readonly number[] = [26, 80, 134];
/** The belt centre line, the spine x and the bin entrance x, in SVG units. */
const BELT_Y = 12;
const SPINE_X = 48;
const BIN_X = 64;
/** An item is 14 units square, so its rectangle is offset by half of that from its centre. */
const HALF_ITEM = 7;
/** Reduced motion: the first item of each lane rests at this centre x, and the next ones 18 units further on. */
const REST_X0 = 84;
const REST_STEP = 18;
/** The centre x an item starts from, outside the drawing on the left. */
const START_X = -8;

/**
 * Builds the cap-1 conveyor on the given SVG. Items are released one at a time at weightedStagger(7, total 2.10,
 * front). Each item moves along the belt with settle over T.beat7, then along the spine and into its bin by arc length
 * with settle over T.beat5, and disappears at the bin entrance. The loop lasts 3.30 s.
 */
export function createCap1(svg: SVGSVGElement): Cap1Graphic {
  gsap.registerPlugin(MorphSVGPlugin);
  const items = Array.from(svg.querySelectorAll<SVGRectElement>('.cap1__item'));
  const release = weightedStagger(items.length, { total: 2.1, weight: 'front' });
  let timeline: gsap.core.Timeline | null = null;
  let running = false;

  const place = (item: SVGRectElement, cx: number, cy: number): void => {
    item.setAttribute('x', String(cx - HALF_ITEM));
    item.setAttribute('y', String(cy - HALF_ITEM));
  };

  const build = (): gsap.core.Timeline => {
    const tl = gsap.timeline({ paused: true, repeat: -1 });
    items.forEach((item, j) => {
      const at = release[j];
      const laneY = LANE_Y[LANES[j]];
      const drop = laneY - BELT_Y;
      const run = drop + (BIN_X - SPINE_X);
      const along = { t: 0 };
      const onAlong = (): void => {
        const d = along.t * run;
        if (d <= drop) place(item, SPINE_X, BELT_Y + d);
        else place(item, SPINE_X + (d - drop), laneY);
      };
      tl.set(item, { opacity: 1 }, at);
      tl.call(() => place(item, START_X, BELT_Y), [], at);
      tl.fromTo(
        item,
        { attr: { x: START_X - HALF_ITEM } },
        { attr: { x: SPINE_X - HALF_ITEM }, duration: T.beat7, ease: E.settle },
        at,
      );
      tl.to(along, { t: 1, duration: T.beat5, ease: E.settle, onUpdate: onAlong }, at + T.beat7);
      tl.set(item, { opacity: 0 }, at + T.beat7 + T.beat5);
    });
    return tl;
  };

  const placeStatic = (): void => {
    const seen = [0, 0, 0];
    items.forEach((item, j) => {
      const lane = LANES[j];
      const k = seen[lane];
      seen[lane] += 1;
      gsap.set(item, { opacity: 1 });
      place(item, REST_X0 + REST_STEP * k, LANE_Y[lane]);
    });
  };

  return {
    setRunning(on: boolean): void {
      running = on;
      if (timeline === null) return;
      if (running) timeline.play();
      else timeline.pause();
    },
    setStatic(): void {
      timeline?.kill();
      timeline = null;
      running = false;
      placeStatic();
    },
    setAnimated(): void {
      if (timeline === null) {
        for (const item of items) gsap.set(item, { opacity: 0 });
        timeline = build();
      }
      if (running) timeline.play();
    },
  };
}

/**
 * The effort stair step at centre-line progress p (Sequence, Stair): L = clamp((p − 2/3) × 3, 0, 1), and the active
 * step is min(4, floor(5 × L)). Step 0 is Low and step 4 is Max.
 */
export function stairStep(p: number): number {
  const l = Math.min(1, Math.max(0, (p - 2 / 3) * 3));
  return Math.min(4, Math.floor(5 * l));
}

/** Sets the active step on the stair's squares and labels. Fills change at once, with no transition. */
export function applyStair(step: number, squares: readonly Element[], labels: readonly Element[]): void {
  squares.forEach((square, i) => square.classList.toggle('is-on', i === step));
  labels.forEach((label, i) => label.classList.toggle('is-on', i === step));
}
