// The preloader section's 2D layer (design/direction-act1.md, preloader; design/direction-3d.md section 11.2).
// Owner: motion-2d. The section's 3D blocks are in gl.ts (owned by the three-scene agent) and are not imported here.
//
// The layer is fixed to the viewport. It holds 17 footprints of the stanza at the rest pose, three row rules and a
// readout. From boot the footprints fade in at their HAIKU_OFFSETS entries, in stagger order. Each one fills when the
// real loader progress reaches its threshold, (position + 1) / 17. At loader:done the footprints hand off to the 3D
// blocks: each fades out as its block scales in, and the layer is removed 1.10 s later. Without WebGL, and under
// reduced motion, the whole layer fades out over T.half and is removed then. Footprints, rules and readout are placed
// with projection.ts (P1) and placed again on resize. The readout and the screen reader text show only real progress.
import './preloader.css';

import { gsap } from 'gsap';

import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { boundsOf, formationRects, viewportSize, type ScreenRect } from '../../core/projection';
import { HAIKU_OFFSETS, T } from '../../core/timing';
import type { SectionContext } from '../../main';

/** The block at each stagger position of the stanza (direction-3d 11.2). Position 0 is the kireji, block 4. */
const STANZA_ORDER: readonly number[] = [4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16];

/** Blocks in the stanza: rows of 5, 7 and 5. */
const BLOCK_COUNT = 17;

/** First and last block index of each row. Row A is blocks 0 to 4, row B 5 to 11 and row C 12 to 16. */
const ROW_BLOCKS = { a: [0, 4], b: [5, 11], c: [12, 16] } as const;

const ROW_NAMES: readonly RowName[] = ['a', 'b', 'c'];

/** Corner radius of a footprint as a share of its side (0.035 bu on 0.70 bu). */
const CORNER_SHARE = 0.05;

/** Seconds from loader:done to the end of the handoff. The last follower ends at T.micro + HAIKU_OFFSETS[16] + T.half, 1.10 s. */
const HANDOFF_END = T.micro + HAIKU_OFFSETS[BLOCK_COUNT - 1] + T.half;

type RowName = keyof typeof ROW_BLOCKS;

interface Parts {
  readonly layer: HTMLElement;
  readonly readout: HTMLElement;
  readonly readoutValue: HTMLElement;
  readonly announce: HTMLElement;
  readonly rules: Readonly<Record<RowName, HTMLElement>>;
  /** The footprint elements, indexed by block. */
  readonly byBlock: readonly HTMLElement[];
}

/** The integer the readout shows: floor(progress x 100), and 100 only when the progress is complete. */
function percentOf(progress: number): number {
  if (!(progress > 0)) return 0;
  if (progress >= 1) return 100;
  // The epsilon absorbs binary rounding (0.29 x 100 is 28.999...). It cannot carry a value past a whole number.
  return Math.min(99, Math.floor(progress * 100 + 1e-7));
}

/** The parts of the markup this section drives, or null when one of them is missing. */
function findParts(section: HTMLElement): Parts | null {
  const layer = section.querySelector<HTMLElement>('[data-layer]');
  const readout = section.querySelector<HTMLElement>('[data-readout]');
  const readoutValue = section.querySelector<HTMLElement>('[data-readout-value]');
  const announce = section.querySelector<HTMLElement>('[data-progress-sr]');
  const ruleA = section.querySelector<HTMLElement>('[data-rule="a"]');
  const ruleB = section.querySelector<HTMLElement>('[data-rule="b"]');
  const ruleC = section.querySelector<HTMLElement>('[data-rule="c"]');
  if (!layer || !readout || !readoutValue || !announce || !ruleA || !ruleB || !ruleC) return null;

  const found: (HTMLElement | null)[] = new Array<HTMLElement | null>(BLOCK_COUNT).fill(null);
  for (const el of layer.querySelectorAll<HTMLElement>('[data-block]')) {
    const block = Number(el.dataset.block);
    if (Number.isInteger(block) && block >= 0 && block < BLOCK_COUNT) found[block] = el;
  }
  const byBlock: HTMLElement[] = [];
  for (const el of found) {
    if (el === null) return null;
    byBlock.push(el);
  }
  return {
    layer,
    readout,
    readoutValue,
    announce,
    rules: { a: ruleA, b: ruleB, c: ruleC },
    byBlock,
  };
}

export function initPreloader(ctx: SectionContext): void {
  const parts = findParts(ctx.el);
  if (parts === null) {
    console.error('[preloader] the markup is incomplete, so the preloader layer is not shown.');
    return;
  }
  const { layer, readout, readoutValue, announce, rules, byBlock } = parts;
  const reduced = ctx.reducedMotion;

  /** The footprint at each stagger position: position k is the block STANZA_ORDER[k]. */
  const byPosition: readonly HTMLElement[] = STANZA_ORDER.map((block) => byBlock[block]);
  const ruleEls: readonly HTMLElement[] = ROW_NAMES.map((row) => rules[row]);
  const rects: ScreenRect[] = [];
  const rowBox: ScreenRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** The appearance tween of each footprint and rule while it runs. */
  const appearing = new Map<HTMLElement, gsap.core.Tween>();

  let filled = 0;
  let quarter = 0;
  let loaderDone = false;
  let finished = false;
  let offProgress: () => void = () => undefined;
  let handoff: gsap.core.Timeline | null = null;

  /** Places footprints, rules and readout on the P1 rectangles of the rest-pose stanza (rule A6). */
  function layout(): void {
    const size = viewportSize();
    if (!(size.width > 0 && size.height > 0)) return;
    formationRects('stanza', 'hero', size, rects);
    for (let block = 0; block < BLOCK_COUNT; block += 1) {
      const rect = rects[block];
      const side = rect.x1 - rect.x0;
      const style = byBlock[block].style;
      style.left = `${rect.x0}px`;
      style.top = `${rect.y0}px`;
      style.width = `${side}px`;
      style.height = `${rect.y1 - rect.y0}px`;
      style.borderRadius = `${side * CORNER_SHARE}px`;
    }
    for (const row of ROW_NAMES) {
      const [from, to] = ROW_BLOCKS[row];
      boundsOf(rects, from, to, rowBox);
      const style = rules[row].style;
      style.left = `${rowBox.x0}px`;
      style.width = `${rowBox.x1 - rowBox.x0}px`;
      // A 1px rule covers [top, top + 1], so its top sits half a pixel above the row centre.
      style.top = `${(rowBox.y0 + rowBox.y1) / 2 - 0.5}px`;
      if (row === 'c') layer.style.setProperty('--rowc-bottom', `${rowBox.y1}px`);
    }
    readout.style.left = `${rects[ROW_BLOCKS.c[0]].x0}px`;
  }

  /** Fills every footprint whose threshold the progress has reached: stagger position k fills at (k + 1) / 17. */
  function fillTo(progress: number): void {
    while (filled < BLOCK_COUNT && progress >= (filled + 1) / BLOCK_COUNT) {
      byPosition[filled].classList.add('is-filled');
      filled += 1;
    }
  }

  /** A loader:progress value: fills, the readout and the screen reader text. */
  function onProgress(value: number): void {
    if (loaderDone || !Number.isFinite(value)) return;
    const progress = Math.min(1, Math.max(0, value));
    fillTo(progress);
    const percent = percentOf(progress);
    readoutValue.textContent = String(percent).padStart(3, '0');
    // The screen reader text speaks at each quarter, so it does not repeat on every frame.
    const next = Math.floor(percent / 25);
    if (next !== quarter) {
      quarter = next;
      announce.textContent = `Loading the page, ${percent} percent`;
    }
  }

  /** From boot: each footprint fades in at its HAIKU_OFFSETS entry, and the rules fade in from the start. */
  function startAppearance(): void {
    byPosition.forEach((el, k) => {
      appearing.set(
        el,
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: T.half, ease: E.fade, delay: HAIKU_OFFSETS[k] }),
      );
    });
    for (const el of ruleEls) {
      appearing.set(el, gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: T.half, ease: E.fade }));
    }
  }

  /** Ends an element's appearance tween, so that its handoff fade starts from the value it has reached. */
  function stopAppearing(el: HTMLElement): void {
    const tween = appearing.get(el);
    if (tween !== undefined) {
      tween.kill();
      appearing.delete(el);
    }
  }

  /**
   * loader:done with WebGL and motion. The rules fade out from t = 0. The kireji footprint (position 0) fades out
   * from t = 0. Each follower fades out from T.micro + HAIKU_OFFSETS[k], the start of its block's scale. The layer is
   * removed at HANDOFF_END.
   */
  function handOff(): void {
    const timeline = gsap.timeline();
    const fadeOut = (el: HTMLElement, at: number): void => {
      timeline.to(el, { opacity: 0, duration: T.half, ease: E.fade, onStart: () => stopAppearing(el) }, at);
    };
    for (const el of ruleEls) fadeOut(el, 0);
    byPosition.forEach((el, k) => fadeOut(el, k === 0 ? 0 : T.micro + HAIKU_OFFSETS[k]));
    timeline.call(finish, [], HANDOFF_END);
    handoff = timeline;
  }

  /** loader:done without WebGL, or under reduced motion. The whole layer fades out over T.half and is removed then. */
  function fadeLayer(): void {
    for (const tween of appearing.values()) tween.kill();
    appearing.clear();
    gsap.to(layer, { opacity: 0, duration: T.half, ease: E.fade, onComplete: finish });
  }

  /** Removes the layer and stops everything that drives it. It runs once, when the handoff or the fade ends. */
  function finish(): void {
    if (finished) return;
    finished = true;
    window.removeEventListener('resize', layout);
    handoff?.kill();
    handoff = null;
    for (const tween of appearing.values()) tween.kill();
    appearing.clear();
    layer.hidden = true;
  }

  function onDone(): void {
    loaderDone = true;
    offProgress();
    // The readout is removed with a cut at t = 0.
    readout.hidden = true;
    const glOn = ctx.gl && !document.documentElement.classList.contains('no-gl');
    if (reduced || !glOn) fadeLayer();
    else handOff();
  }

  layout();
  window.addEventListener('resize', layout);
  ctx.el.classList.add('is-live');

  if (reduced) {
    // Reduced motion: the footprints and rules are at rest from the first frame, with no fade.
    for (const el of [...byPosition, ...ruleEls]) el.style.opacity = '1';
  } else {
    startAppearance();
  }

  offProgress = bus.on('loader:progress', onProgress);
  bus.once('loader:done', onDone);
}
