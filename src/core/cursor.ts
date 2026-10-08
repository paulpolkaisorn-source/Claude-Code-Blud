// The custom cursor (design/direction.md heading 9, design/drafts/director-decisions.md D2.2, and the Pointer and
// Touch fields of design/direction-act1.md, -act2.md and -act3.md). Owner: interaction.
//
// Four forms: the datum (hero and family), the caliper (speed), the marker (capabilities) and the ruler (closing).
// The section under the viewport top decides the form, by the rule of the choreography (src/choreo/timeline.ts): the
// last section in page order whose top is at or above scrollY + 1, among the sections with a height. The forms show
// only with a fine pointer, without reduced motion, and while the last pointer kind is not touch. Over an a, button,
// [role="button"], input, textarea, pre, code or [data-cursor="native"] element the native pointer shows. Keyboard
// focus hides the forms until the next pointermove. While the preloader layer is up, the pointer is native.
//
// The section that owns a shown form gets data-cursor-form, and cursor.css sets cursor: none on that section only.
// Interactive descendants keep their own pointer.
//
// Geometry is projection P1 (src/core/projection.ts): arithmetic, no raycast, and no layout read in the tick. The
// section tops are measured on resize and font load. The race's block 01 edge and the column centres depend only on the
// viewport, so they are cached at the same moments. The hero's block rectangles are recomputed only when the hero
// progress changes, and only while the hero is under the viewport top.
//
// Touch has no custom cursor. A tap on a hero block still shows its two-digit label for T.breath, with a cut over
// T.flick in and out. That label is the one element this module adds while the custom cursor is off.
import './cursor.css';

import { BLOCK, BLOCK_COUNT, stanzaOpen, type Pose } from '../gl/blocks/formations';
import { cameraKey, FIT } from '../gl/rig';
import type { CameraKey } from '../gl/section-gl';
import { ef } from './ease';
import { env, onReducedMotionChange } from './env';
import { blockRects, formationRects, viewportSize, type ScreenRect, type Size } from './projection';
import { onPointerType, pointer } from './pointer';
import { scrollState } from './scroll';
import { addTick, PRIORITY, tickerTime, type Tick } from './ticker';
import { T } from './timing';
import type { SectionId } from './types';

/** Page order of the sections, as the choreography lists them. The preloader has no height in the flow. */
const ORDER: readonly SectionId[] = [
  'preloader',
  'hero',
  'speed',
  'capabilities',
  'code',
  'family',
  'pricing',
  'closing',
  'footer',
];

const HERO_INDEX = ORDER.indexOf('hero');

/** The forms. 'none' leaves the system cursor in charge. */
type Form = 'none' | 'datum' | 'label' | 'caliper' | 'marker' | 'ruler';

/** What a placed element adds after its translate: nothing, a scale along x, a half-height shift or the caliper value lift. */
type Tail = 'none' | 'scaleX' | 'halfY' | 'caliper';

/** Sizes in CSS px, from direction.md heading 9 and the act files (sp-1 5 px, sp-2 7 px, sp-3 12 px). */
const LABEL_OFFSET = 12;
const CALIPER_HEIGHT = 12;
const CALIPER_LIFT = 5;
const RULER_WIDTH = 12;
const RULER_LABEL_GAP = 13;
/** Half of the 7 px marker, rounded down, so its edges land on whole pixels. */
const MARKER_HALF = 3;

/** The speed race is complete at this share of the speed section (act I, A3 and the speed pointer rule). */
const SPEED_FULL = 0.25;

/** A touch that moves less than this many px is a tap. */
const TAP_SLOP = 10;

/** The section rule of the choreography: a top this close to the scroll position counts as passed. */
const PASSED_TOLERANCE = 1;

const OWNER_ATTR = 'data-cursor-form';
const FINE_QUERY = '(hover: hover) and (pointer: fine)';
const NATIVE_TARGET = 'a, button, [role="button"], input, textarea, pre, code, [data-cursor="native"]';
const MARKER_TARGET = '[data-cursor="marker"]';

/** Two-digit block labels, index + 1, built once. */
const LABELS: readonly string[] = Array.from({ length: BLOCK_COUNT }, (_, i) => String(i + 1).padStart(2, '0'));

/** The four arms of the datum: horizontal left and right, then vertical up and down. */
const DATUM_ARMS: readonly string[] = [
  'cursor-arm cursor-arm--h cursor-arm--l',
  'cursor-arm cursor-arm--h cursor-arm--r',
  'cursor-arm cursor-arm--v cursor-arm--u',
  'cursor-arm cursor-arm--v cursor-arm--d',
];

/** An element whose transform this module writes. A write happens only when the rounded values change. */
interface Placed {
  readonly el: HTMLElement;
  readonly tail: Tail;
  x: number;
  y: number;
  s: number;
}

function placed(el: HTMLElement, tail: Tail = 'none'): Placed {
  return { el, tail, x: Number.NaN, y: Number.NaN, s: Number.NaN };
}

/** Moves an element to (x, y) in viewport px. s is the scale of the 'scaleX' tail. */
function moveTo(p: Placed, x: number, y: number, s = 0): void {
  if (x === p.x && y === p.y && s === p.s) return;
  p.x = x;
  p.y = y;
  p.s = s;
  let text = `translate3d(${x}px, ${y}px, 0)`;
  if (p.tail === 'scaleX') text += ` scaleX(${s})`;
  else if (p.tail === 'halfY') text += ' translateY(-50%)';
  else if (p.tail === 'caliper') text += ` translate(-50%, calc(-100% - ${CALIPER_LIFT}px))`;
  p.el.style.transform = text;
}

function make(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** The elements of the custom forms, built while the cursor is active. */
interface Refs {
  readonly forms: HTMLElement;
  readonly els: Readonly<Record<Exclude<Form, 'none'>, HTMLElement>>;
  readonly datum: Placed;
  readonly label: Placed;
  readonly caliperTick: Placed;
  readonly caliperDim: Placed;
  readonly caliperValue: Placed;
  readonly marker: Placed;
  readonly rulerTick: Placed;
  readonly rulerLabel: Placed;
}

function buildForms(layer: HTMLElement): Refs {
  const forms = make('div', 'cursor-forms');

  const datum = make('div', 'cursor-form cursor-datum');
  for (const arm of DATUM_ARMS) datum.append(make('i', arm));

  const label = make('div', 'cursor-form cursor-text cursor-block-label');

  const caliper = make('div', 'cursor-form cursor-caliper');
  const caliperTick = make('i', 'cursor-caliper-tick');
  const caliperDim = make('i', 'cursor-caliper-dim');
  const caliperValue = make('span', 'cursor-text cursor-caliper-value');
  caliper.append(caliperTick, caliperDim, caliperValue);

  const marker = make('div', 'cursor-form cursor-marker');

  const ruler = make('div', 'cursor-form cursor-ruler');
  const rulerTick = make('i', 'cursor-ruler-tick');
  const rulerLabel = make('span', 'cursor-text cursor-ruler-label');
  ruler.append(rulerTick, rulerLabel);

  forms.append(datum, label, caliper, marker, ruler);
  layer.append(forms);

  return {
    forms,
    els: { datum, label, caliper, marker, ruler },
    datum: placed(datum),
    label: placed(label),
    caliperTick: placed(caliperTick),
    caliperDim: placed(caliperDim, 'scaleX'),
    caliperValue: placed(caliperValue, 'caliper'),
    marker: placed(marker),
    rulerTick: placed(rulerTick),
    rulerLabel: placed(rulerLabel, 'halfY'),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** True when the element is a keyboard-visible focus target. Read defensively: an old browser has no :focus-visible. */
function isFocusVisible(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  try {
    return node.matches(':focus-visible');
  } catch {
    return false;
  }
}

function makeLayer(): HTMLElement {
  const layer = make('div', 'cursor-layer');
  layer.id = 'cursor';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  return layer;
}

let teardown: (() => void) | null = null;

/**
 * Starts the custom cursor and the block label of touch taps. Idempotent: a second call returns the same stop function.
 * Call after initTicker, initPointer and initScroll. The stop function removes the forms, the listeners and the tick.
 */
export function initCursor(): () => void {
  if (teardown === null) teardown = start();
  return teardown;
}

function start(): () => void {
  const layer = document.getElementById('cursor') ?? makeLayer();
  const fineQuery = window.matchMedia(FINE_QUERY);
  let fine = fineQuery.matches;
  let reduced = env.reducedMotion;
  let active = false;
  let refs: Refs | null = null;

  // Geometry, in document px for the tops and viewport px for the rectangles. Refreshed by measure().
  let dirty = true;
  const tops: number[] = ORDER.map(() => 0);
  const heights: number[] = ORDER.map(() => 0);
  const sectionEls: (HTMLElement | null)[] = ORDER.map(() => null);
  let size: Size = { width: 1, height: 1 };
  const heroKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: FIT.fovDeg };
  const openPoses: Pose[] = [];
  const heroRects: ScreenRect[] = [];
  let heroQ = -1;
  const raceRects: ScreenRect[] = [];
  const columnRects: ScreenRect[] = [];
  const columnY: number[] = [];
  let raceLeft = 0;
  let pxPerBu = 1;

  // The pointer: the damped position, and what lies under it.
  let cx = 0;
  let cy = 0;
  let snapPending = true;
  let wasInside = false;
  let keyboardHidden = false;
  let overNative = false;
  let overMarker = false;
  let lastTarget: EventTarget | null = null;

  // The shown form and the state of each form.
  let form: Form = 'none';
  let owner: HTMLElement | null = null;
  let ownerForm: Form = 'none';
  let labelShown = -1;
  let caliperShown = -1;
  let ruleIndex = -1;
  let ruleShown = -1;
  let ruleFromY = 0;
  let ruleY = 0;
  let ruleStart = 0;
  let ruleSnapping = false;

  // Touch: the pending down point, and the one tap label.
  let touchDown: { x: number; y: number; id: number } | null = null;
  let tapEl: HTMLElement | null = null;
  let tapPlaced: Placed | null = null;
  let tapIndex = -1;
  let tapHideAt = 0;
  let tapRemoveAt = -1;

  const preloaderSection = document.getElementById('preloader');
  const preloaderLayer = preloaderSection?.querySelector<HTMLElement>('[data-layer]') ?? null;

  /** True while the preloader layer is on screen, so the page is native (direction-act1 preloader). */
  function preloaderUp(): boolean {
    return (
      preloaderSection !== null &&
      preloaderLayer !== null &&
      !preloaderLayer.hidden &&
      preloaderSection.classList.contains('is-live')
    );
  }

  /** Reads the section tops, the hero, the race and the column. Runs on resize and font load, never per frame. */
  function measure(): void {
    dirty = false;
    heroQ = -1;
    const scrollY = window.scrollY;
    for (let i = 0; i < ORDER.length; i += 1) {
      const el = document.getElementById(ORDER[i]);
      sectionEls[i] = el;
      if (el === null) {
        tops[i] = 0;
        heights[i] = 0;
      } else {
        const rect = el.getBoundingClientRect();
        tops[i] = rect.top + scrollY;
        heights[i] = rect.height;
      }
    }
    size = viewportSize();
    if (!(size.width > 0 && size.height > 0)) return;
    cameraKey('hero', size, heroKey);
    formationRects('race', 'speed', size, raceRects);
    raceLeft = raceRects[0].x0;
    pxPerBu = (raceRects[0].x1 - raceRects[0].x0) / BLOCK.width;
    formationRects('column', 'closing', size, columnRects);
    columnY.length = 0;
    for (const rect of columnRects) columnY.push((rect.y0 + rect.y1) / 2);
  }

  /** The section under the viewport top: the last one with a height whose top has passed y, else the first with one. */
  function sectionIndexAt(y: number): number {
    let first = -1;
    let last = -1;
    for (let i = 0; i < ORDER.length; i += 1) {
      if (!(heights[i] > 0)) continue;
      if (first < 0) first = i;
      if (tops[i] <= y + PASSED_TOLERANCE) last = i;
    }
    return last >= 0 ? last : first;
  }

  /** The hero block under (px, py) when the hero is at scroll position y, or -1. Hero progress is act I, A3. */
  function heroBlockAt(px: number, py: number, y: number): number {
    if (!(size.width > 0 && size.height > 0)) return -1;
    const h = heights[HERO_INDEX];
    const q = h > 0 ? clamp((y - tops[HERO_INDEX]) / h, 0, 1) : 0;
    if (q !== heroQ) {
      stanzaOpen(ef.sym(q), openPoses);
      blockRects(openPoses, heroKey, size, heroRects);
      heroQ = q;
    }
    for (let i = 0; i < heroRects.length; i += 1) {
      const r = heroRects[i];
      if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return i;
    }
    return -1;
  }

  /** The column block whose centre lies nearest to py. */
  function nearestColumn(py: number): number {
    let best = 0;
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < columnY.length; i += 1) {
      const d = Math.abs(columnY[i] - py);
      if (d < gap) {
        gap = d;
        best = i;
      }
    }
    return best;
  }

  /** Records what the last pointer target is. Runs only when the target changes. */
  function retarget(node: EventTarget | null): void {
    if (node === lastTarget) return;
    lastTarget = node;
    const el = node instanceof Element ? node : null;
    overNative = el !== null && el.closest(NATIVE_TARGET) !== null;
    overMarker = el !== null && el.closest(MARKER_TARGET) !== null;
  }

  /** Owner and theme. The section that shows a form carries data-cursor-form and sets the layer's theme. */
  function applyOwner(el: HTMLElement | null, next: Form): void {
    if (el !== owner) {
      owner?.removeAttribute(OWNER_ATTR);
      owner = el;
      ownerForm = 'none';
      if (el !== null) layer.dataset.theme = el.dataset.theme === 'ink' ? 'ink' : 'paper';
    }
    if (owner !== null && next !== ownerForm) {
      ownerForm = next;
      owner.setAttribute(OWNER_ATTR, next);
    }
  }

  /** Shows one form with a cut, and resets the ruler when it leaves. Changes run only when the form changes. */
  function showForm(next: Form): void {
    if (refs !== null) {
      const els = refs.els;
      els.datum.classList.toggle('is-on', next === 'datum');
      els.label.classList.toggle('is-on', next === 'label');
      els.caliper.classList.toggle('is-on', next === 'caliper');
      els.marker.classList.toggle('is-on', next === 'marker');
      els.ruler.classList.toggle('is-on', next === 'ruler');
    }
    if (form === 'ruler' && next !== 'ruler') {
      ruleIndex = -1;
      ruleSnapping = false;
    }
    form = next;
    if (next === 'none') layer.removeAttribute('data-form');
    else layer.setAttribute('data-form', next);
  }

  /** The label of a touch tap: shown at the tap point for T.breath. Its removal waits for the cut out. */
  function showTap(block: number, x: number, y: number, now: number): void {
    if (tapEl === null || tapPlaced === null) {
      tapEl = make('div', 'cursor-form cursor-text cursor-tap');
      tapPlaced = placed(tapEl);
      layer.append(tapEl);
      // A style flush before is-on is added, so the cut in over T.flick runs. It happens once per tap, not per frame.
      void tapEl.offsetWidth;
    }
    if (block !== tapIndex) {
      tapEl.textContent = LABELS[block];
      tapIndex = block;
    }
    moveTo(tapPlaced, Math.round(x) + LABEL_OFFSET, Math.round(y) + LABEL_OFFSET);
    tapEl.classList.add('is-on');
    tapRemoveAt = -1;
    tapHideAt = now + T.breath;
  }

  /** Cuts the tap label out. It is removed T.flick later, in expireTap. */
  function hideTap(now: number): void {
    if (tapEl === null || tapIndex < 0) return;
    tapEl.classList.remove('is-on');
    tapIndex = -1;
    tapRemoveAt = now + T.flick;
  }

  /** Hides the tap label when its display time has run out, and removes it once it has faded. */
  function expireTap(now: number): void {
    if (tapIndex >= 0 && now >= tapHideAt) hideTap(now);
    if (tapIndex < 0 && tapRemoveAt >= 0 && now >= tapRemoveAt) {
      tapEl?.remove();
      tapEl = null;
      tapPlaced = null;
      tapRemoveAt = -1;
    }
  }

  /** A tap on a hero block shows its label. A tap anywhere else, or on a link or button, hides it. */
  function tapAt(x: number, y: number, target: EventTarget | null): void {
    if (dirty) measure();
    const now = tickerTime();
    const scrollY = scrollState.y;
    const index = sectionIndexAt(scrollY);
    const onHero = index >= 0 && ORDER[index] === 'hero';
    const native = target instanceof Element && target.closest(NATIVE_TARGET) !== null;
    const block = onHero && !native && !preloaderUp() ? heroBlockAt(x, y, scrollY) : -1;
    if (block >= 0) showTap(block, x, y, now);
    else hideTap(now);
  }

  /** Builds the forms when the cursor turns on, and empties the layer when it turns off. */
  function setActive(on: boolean): void {
    if (on === active) return;
    active = on;
    if (on) {
      refs = buildForms(layer);
      snapPending = true;
      wasInside = false;
      return;
    }
    applyOwner(null, 'none');
    refs?.forms.remove();
    refs = null;
    form = 'none';
    layer.removeAttribute('data-form');
    labelShown = -1;
    caliperShown = -1;
    ruleIndex = -1;
    ruleShown = -1;
    ruleSnapping = false;
  }

  /** Turns the cursor on only with a fine pointer, without reduced motion and while touch is not the last pointer. */
  function refresh(): void {
    setActive(fine && !reduced && pointer.type !== 'touch');
  }

  /** One frame at PRIORITY.input + 1: the form for the section and pointer, and its transforms. */
  function frame(t: Tick): void {
    if (dirty) measure();
    expireTap(t.time);
    refresh();
    const current = refs;
    if (!active || current === null) return;

    const y = scrollState.y;
    const index = sectionIndexAt(y);
    const section: SectionId | null = index >= 0 ? ORDER[index] : null;
    const sectionEl = index >= 0 ? sectionEls[index] : null;
    const px = pointer.clientX;
    const py = pointer.clientY;
    const inside = pointer.inside;

    // Position: taken at once on entry, then damped toward the pointer with T.micro (frame-rate independent).
    if (snapPending || (inside && !wasInside)) {
      cx = px;
      cy = py;
      snapPending = false;
    } else if (inside) {
      const k = 1 - Math.exp(-t.dt / T.micro);
      cx += (px - cx) * k;
      cy += (py - cy) * k;
    }
    wasInside = inside;

    const live = inside && !keyboardHidden && !overNative && !preloaderUp();
    let next: Form = 'none';
    let block = -1;
    if (live && section !== null) {
      switch (section) {
        case 'hero':
          block = heroBlockAt(px, py, y);
          next = block >= 0 ? 'label' : 'datum';
          break;
        case 'speed':
          // The caliper needs a horizontal race (not portrait) and a complete race (u = 1).
          next =
            size.width >= size.height && y - tops[index] >= SPEED_FULL * heights[index] ? 'caliper' : 'none';
          break;
        case 'capabilities':
          next = overMarker ? 'marker' : 'none';
          break;
        case 'family':
          next = 'datum';
          break;
        case 'closing':
          next = columnY.length > 0 ? 'ruler' : 'none';
          break;
        default:
          next = 'none';
      }
    }

    if (next !== form) showForm(next);
    applyOwner(next === 'none' ? null : sectionEl, next);
    if (next === 'none') return;

    switch (next) {
      case 'datum':
        moveTo(current.datum, Math.round(cx), Math.round(cy));
        break;

      case 'label':
        if (block !== labelShown) {
          current.label.el.textContent = LABELS[block];
          labelShown = block;
        }
        moveTo(current.label, Math.round(cx) + LABEL_OFFSET, Math.round(cy) + LABEL_OFFSET);
        break;

      case 'caliper': {
        // Value: the pointer x in bu from the left edge of block 01 (rect0.x0), to two decimals, clamped to the race.
        const x0 = raceLeft;
        const iy = Math.round(cy);
        const value = clamp((cx - x0) / pxPerBu, 0, FIT.extent.race);
        const hundredths = Math.round(value * 100);
        moveTo(current.caliperTick, Math.round(cx), iy - CALIPER_HEIGHT / 2);
        moveTo(current.caliperDim, Math.round(Math.min(x0, cx)), iy, Math.abs(cx - x0));
        moveTo(current.caliperValue, Math.round((x0 + cx) / 2), iy);
        if (hundredths !== caliperShown) {
          caliperShown = hundredths;
          current.caliperValue.el.textContent = `${(hundredths / 100).toFixed(2)} bu`;
        }
        break;
      }

      case 'marker':
        moveTo(current.marker, Math.round(cx) - MARKER_HALF, Math.round(cy) - MARKER_HALF);
        break;

      case 'ruler': {
        // The tick snaps to the nearest column centre with a cut over T.micro. Its x is the damped pointer x.
        const column = nearestColumn(py);
        if (column !== ruleIndex) {
          if (ruleIndex >= 0) {
            ruleFromY = ruleY;
            ruleStart = t.time;
            ruleSnapping = true;
          }
          ruleIndex = column;
        }
        const target = columnY[ruleIndex];
        if (ruleSnapping) {
          const k = (t.time - ruleStart) / T.micro;
          if (k >= 1) {
            ruleSnapping = false;
            ruleY = target;
          } else {
            ruleY = ruleFromY + (target - ruleFromY) * ef.cut(k);
          }
        } else {
          ruleY = target;
        }
        if (ruleIndex !== ruleShown) {
          ruleShown = ruleIndex;
          current.rulerLabel.el.textContent = LABELS[ruleIndex];
        }
        moveTo(current.rulerTick, Math.round(cx) - RULER_WIDTH / 2, Math.round(ruleY));
        moveTo(current.rulerLabel, Math.round(cx) + RULER_LABEL_GAP, Math.round(ruleY));
        break;
      }

      default:
        break;
    }
  }

  // Listeners. All passive; none of them reads layout.
  const passive: AddEventListenerOptions = { passive: true };

  const onPointerMove = (e: PointerEvent): void => {
    keyboardHidden = false;
    retarget(e.target);
  };
  const onPointerOver = (e: PointerEvent): void => {
    // Browsers send pointerover when the element under a still pointer changes, for example after a scroll.
    retarget(e.target);
  };
  const onFocusIn = (e: FocusEvent): void => {
    if (isFocusVisible(e.target)) keyboardHidden = true;
  };
  const onPointerDown = (e: PointerEvent): void => {
    touchDown = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  };
  const onPointerUp = (e: PointerEvent): void => {
    const down = touchDown;
    touchDown = null;
    if (down === null || e.pointerId !== down.id) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP) return;
    tapAt(e.clientX, e.clientY, e.target);
  };
  const onPointerCancel = (): void => {
    touchDown = null;
  };
  const onResize = (): void => {
    dirty = true;
  };
  const onFonts = (): void => {
    dirty = true;
  };
  const onFineChange = (): void => {
    fine = fineQuery.matches;
    refresh();
  };

  window.addEventListener('pointermove', onPointerMove, passive);
  window.addEventListener('pointerover', onPointerOver, passive);
  window.addEventListener('focusin', onFocusIn, passive);
  window.addEventListener('pointerdown', onPointerDown, passive);
  window.addEventListener('pointerup', onPointerUp, passive);
  window.addEventListener('pointercancel', onPointerCancel, passive);
  window.addEventListener('resize', onResize, passive);
  fineQuery.addEventListener('change', onFineChange);
  void document.fonts?.ready.then(onFonts);
  document.fonts?.addEventListener('loadingdone', onFonts);

  const offReduced = onReducedMotionChange((on) => {
    reduced = on;
    refresh();
  });
  const offPointerType = onPointerType(() => {
    refresh();
  });
  const stopTick = addTick(frame, PRIORITY.input + 1);
  refresh();

  return (): void => {
    stopTick();
    offReduced();
    offPointerType();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerover', onPointerOver);
    window.removeEventListener('focusin', onFocusIn);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('resize', onResize);
    fineQuery.removeEventListener('change', onFineChange);
    document.fonts?.removeEventListener('loadingdone', onFonts);
    setActive(false);
    tapEl?.remove();
    tapEl = null;
    tapPlaced = null;
    delete layer.dataset.theme;
    teardown = null;
  };
}
