// Text theme follows the ink front, block by block (D23.1, D25.1). With WebGL, every element marked data-theme-block
// inside the two sections of an ink-bleed boundary takes the theme of the ground under its centre: the lower section's
// theme when the centre is below the boundary's front line on screen, the upper section's theme otherwise. Outside a
// bleed window the front is off screen, and the blocks of each section keep their own theme.
//
// The front line is the screen y of the lower section's top edge (D25.1). The choreography passes it every frame, from
// the cached geometry and the scroll position: it is the same value the background draws as the mean line of its front,
// with no easing. Every block of the lower section lies below that edge and every block of the upper section above it,
// so each block resolves to its own section's theme by construction.
//
// Geometry is cached. The document top and height of each block are read when the module is invalidated: on resize,
// on font load, on a ScrollTrigger refresh and when the choreography re-measures its sections. Nothing is read per
// frame: a frame adds the scroll position to the cache. A block inside a sticky stage (speed, hero) is placed by the
// sticky rule from its stage's natural geometry, so its screen y is right at every scroll position.
//
// Without GL (html.no-gl) the module does nothing. The first frame it sees the class restores the attributes it set,
// and no frame writes after that. Only the choreography calls update(), so this module starts no loop of its own.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SectionId, Theme } from '../core/types';

/** The attribute that marks a text block for this module. The 2D owners put it on each text block. */
export const THEME_BLOCK_ATTR = 'data-theme-block';

interface Boundary {
  readonly upper: SectionId;
  readonly lower: SectionId;
  /** The theme of the ground above the front, and of the blocks whose centre is above it. */
  readonly upperTheme: Theme;
  /** The theme of the ground below the front, and of the blocks whose centre is below it. */
  readonly lowerTheme: Theme;
}

/**
 * Boundary 1 is the top of capabilities: paper above the front, ink below. Boundary 2 is the top of pricing: ink above,
 * paper below. These are the sides background.ts sync() and the shader draw (boundary 1 puts ink below the front).
 */
const BOUNDARIES: readonly [Boundary, Boundary] = [
  { upper: 'speed', lower: 'capabilities', upperTheme: 'paper', lowerTheme: 'ink' },
  { upper: 'family', lower: 'pricing', upperTheme: 'ink', lowerTheme: 'paper' },
];

/** The sticky geometry of a stage that holds blocks, in document CSS px. */
interface Stage {
  /** The top the stage has without its sticky offset. */
  readonly natural: number;
  /** The sticky top: the stage sticks at scrollY + stickyTop. -Infinity when it has none. */
  readonly stickyTop: number;
  /** The largest top the stage can take: its containing block's content bottom less its height. */
  readonly limit: number;
}

interface Entry {
  readonly el: HTMLElement;
  readonly section: SectionId;
  /** 0 for boundary 1, 1 for boundary 2: the index into BOUNDARIES. */
  readonly boundary: 0 | 1;
  /** The sticky stage the block sits in (or is), or null. */
  readonly stage: Stage | null;
  /** The natural document top of the block, and its height. */
  readonly top: number;
  readonly height: number;
  /** The block's natural top minus its stage's natural top (0 without a stage). */
  readonly offset: number;
  /** The centre on screen (CSS px) and the theme set, from the last update. */
  centre: number;
  theme: Theme;
}

/** A block as the last update placed it. */
export interface ThemeBlockState {
  readonly el: HTMLElement;
  readonly section: SectionId;
  /** The boundary the block belongs to: 1 for speed and capabilities, 2 for family and pricing. */
  readonly boundary: 1 | 2;
  /** Screen y of the block's centre, in CSS px. */
  readonly centre: number;
  /** Screen y of the boundary's front line, in CSS px. */
  readonly front: number;
  /** The theme the block takes. */
  readonly theme: Theme;
}

export interface ThemeFront {
  /**
   * One frame. front1 and front2 are the screen y of each boundary's front line in CSS px (the top edge of its lower
   * section, D25.1), and scrollY the scroll position the block centres are measured from. NaN marks a missing section,
   * and its blocks take the upper theme. Writes data-theme on a block only when its theme changes.
   */
  update(front1: number, front2: number, scrollY: number): void;
  /** Marks the cached geometry stale. It is measured again at the next update. */
  invalidate(): void;
  /** The blocks as the last update placed them. A copy. */
  blocks(): ThemeBlockState[];
  /** Screen y of a boundary's front line at the last update, in CSS px. */
  frontOf(boundary: 1 | 2): number;
  /** Removes the listeners and restores the attributes the module set. The module does nothing afterwards. */
  dispose(): void;
}

function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/** The nearest ancestor of el (or el itself) that is position: sticky, searching no further than section. */
function stickyAncestor(el: HTMLElement, section: HTMLElement): HTMLElement | null {
  for (let node: HTMLElement | null = el; node !== null; node = node.parentElement) {
    if (getComputedStyle(node).position === 'sticky') return node;
    if (node === section) break;
  }
  return null;
}

/** Creates the module. It is idle until its first update, and it measures on that update. */
export function createThemeFront(): ThemeFront {
  /** The blocks in the order they were found. Rebuilt by each measure. */
  let entries: Entry[] = [];
  /** The attribute each block carried before the module first wrote it, so dispose and no-GL can restore it. */
  const original = new WeakMap<HTMLElement, string | null>();
  /** The screen y of each boundary's front at the last update, CSS px. */
  const fronts: [number, number] = [Number.NaN, Number.NaN];
  let dirty = true;
  let written = false;
  let disposed = false;

  /**
   * Reads every block's natural geometry. Sticky stages are switched to position: relative for the reads. With top
   * auto a relative box stays at its flow position, which is the sticky element's natural position, and it stays a
   * containing block, so absolutely positioned blocks inside it keep their place. (position: static would hand them
   * to the next positioned ancestor, which measured 306 px off in the harness.) The inline position is restored at
   * the end. Runs only when the module is dirty.
   */
  function measure(): void {
    const scrollY = window.scrollY;
    const found: { el: HTMLElement; section: SectionId; boundary: 0 | 1; stageEl: HTMLElement | null }[] = [];
    BOUNDARIES.forEach((bd, index) => {
      const boundary = index as 0 | 1;
      for (const id of [bd.upper, bd.lower]) {
        const section = document.getElementById(id);
        if (!(section instanceof HTMLElement)) continue;
        for (const el of section.querySelectorAll<HTMLElement>(`[${THEME_BLOCK_ATTR}]`)) {
          if (el.getClientRects().length === 0) continue; // not rendered: nothing to place
          if (!original.has(el)) original.set(el, el.getAttribute('data-theme'));
          found.push({ el, section: id, boundary, stageEl: stickyAncestor(el, section) });
        }
      }
    });

    const stageEls: HTMLElement[] = [];
    for (const f of found) {
      if (f.stageEl !== null && !stageEls.includes(f.stageEl)) stageEls.push(f.stageEl);
    }
    const stickyTops = new Map<HTMLElement, number>();
    for (const st of stageEls) stickyTops.set(st, parsePx(getComputedStyle(st).top));
    const inline = stageEls.map((st) => ({
      st,
      value: st.style.getPropertyValue('position'),
      priority: st.style.getPropertyPriority('position'),
    }));

    for (const st of stageEls) st.style.setProperty('position', 'relative', 'important');
    const stages = new Map<HTMLElement, Stage>();
    for (const st of stageEls) {
      const rect = st.getBoundingClientRect();
      let limit = Number.POSITIVE_INFINITY;
      const parent = st.parentElement;
      if (parent !== null) {
        const pr = parent.getBoundingClientRect();
        const cs = getComputedStyle(parent);
        const contentBottom = pr.bottom - parsePx(cs.borderBottomWidth) - parsePx(cs.paddingBottom);
        limit = contentBottom + scrollY - rect.height;
      }
      stages.set(st, {
        natural: rect.top + scrollY,
        stickyTop: stickyTops.get(st) ?? Number.NEGATIVE_INFINITY,
        limit,
      });
    }

    const next: Entry[] = [];
    for (const f of found) {
      const rect = f.el.getBoundingClientRect();
      const top = rect.top + scrollY;
      const stage = f.stageEl === null ? null : (stages.get(f.stageEl) ?? null);
      next.push({
        el: f.el,
        section: f.section,
        boundary: f.boundary,
        stage,
        top,
        height: rect.height,
        offset: stage === null ? 0 : top - stage.natural,
        centre: 0,
        theme: BOUNDARIES[f.boundary].upperTheme,
      });
    }

    for (const { st, value, priority } of inline) {
      if (value === '') st.style.removeProperty('position');
      else st.style.setProperty('position', value, priority);
    }
    entries = next;
    dirty = false;
  }

  /** Puts every block back to the attribute it had before the module wrote it. */
  function restore(): void {
    if (!written) return;
    for (const e of entries) {
      const value = original.get(e.el) ?? null;
      if (value === null) e.el.removeAttribute('data-theme');
      else e.el.setAttribute('data-theme', value);
    }
    written = false;
    dirty = true;
  }

  function update(front1: number, front2: number, scrollY: number): void {
    if (disposed) return;
    if (document.documentElement.classList.contains('no-gl')) {
      restore();
      return;
    }
    if (dirty) measure();
    fronts[0] = front1;
    fronts[1] = front2;
    for (const e of entries) {
      const stage = e.stage;
      const top =
        stage === null
          ? e.top
          : Math.min(Math.max(scrollY + stage.stickyTop, stage.natural), stage.limit) + e.offset;
      const centre = top + e.height / 2 - scrollY;
      const bd = BOUNDARIES[e.boundary];
      const theme: Theme = centre > fronts[e.boundary] ? bd.lowerTheme : bd.upperTheme;
      e.centre = centre;
      e.theme = theme;
      if (e.el.dataset.theme !== theme) e.el.dataset.theme = theme;
      written = true;
    }
  }

  const onChange = (): void => {
    dirty = true;
  };
  window.addEventListener('resize', onChange, { passive: true });
  const fontSet = typeof document.fonts === 'undefined' ? null : document.fonts;
  fontSet?.addEventListener('loadingdone', onChange);
  void fontSet?.ready.then(onChange);
  ScrollTrigger.addEventListener('refresh', onChange);

  return {
    update,
    invalidate: onChange,
    blocks(): ThemeBlockState[] {
      return entries.map((e) => ({
        el: e.el,
        section: e.section,
        boundary: (e.boundary + 1) as 1 | 2,
        centre: e.centre,
        front: fronts[e.boundary],
        theme: e.theme,
      }));
    },
    frontOf(boundary: 1 | 2): number {
      return fronts[boundary - 1];
    },
    dispose(): void {
      if (disposed) return;
      restore();
      disposed = true;
      window.removeEventListener('resize', onChange);
      fontSet?.removeEventListener('loadingdone', onChange);
      ScrollTrigger.removeEventListener('refresh', onChange);
      entries = [];
    },
  };
}
