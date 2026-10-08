// Damped pointer state for parallax and the custom cursor (architecture sections 6 and 8).
// Listeners only store the latest raw position and kind. One tick at PRIORITY.input turns them into
// the targets x and y, the damped sx and sy, and the velocities vx and vy. The tick allocates nothing.
import { env, onReducedMotionChange } from './env';
import { addTick, PRIORITY, type Tick } from './ticker';
import { T } from './timing';

/** The kinds of input the page tells apart. */
export type PointerKind = 'mouse' | 'pen' | 'touch';

export interface PointerState {
  /** Target across the viewport, in [-1, 1]: left edge -1, right edge +1. */
  x: number;
  /** Target up the viewport, in [-1, 1]: top edge +1, bottom edge -1. */
  y: number;
  /** x damped toward the target with time constant T.half. */
  sx: number;
  /** y damped toward the target with time constant T.half. */
  sy: number;
  /** Velocity of x in normalised units per second, smoothed with a 0.1 s time constant. */
  vx: number;
  /** Velocity of y in normalised units per second, smoothed with a 0.1 s time constant. */
  vy: number;
  /** A mouse or pen is over the page. Touch does not change it. */
  inside: boolean;
  /** Viewport position of the latest pointer event, in CSS px. */
  clientX: number;
  clientY: number;
  /** Kind of the latest pointer event. 'none' until the first one arrives. */
  type: PointerKind | 'none';
}

/** The page-wide pointer state. Read it in tick functions. Only this module writes it. */
export const pointer: PointerState = {
  x: 0,
  y: 0,
  sx: 0,
  sy: 0,
  vx: 0,
  vy: 0,
  inside: false,
  clientX: 0,
  clientY: 0,
  type: 'none',
};

/**
 * Time constant of the velocity filter, in seconds. The brief sets 0.1 s. That is not a step of the
 * T scale, so it stays a local constant.
 */
const VELOCITY_TAU = 0.1;

let installed = false;
/** While true, x, y, sx, sy, vx and vy are held at 0. */
let reduced = false;
let viewW = 1;
let viewH = 1;
let viewStale = true;
/** Whether the pointer was inside as of the previous tick. */
let wasInside = false;
/** The kind last announced to onPointerType listeners. */
let announced: PointerState['type'] = 'none';

const typeListeners = new Set<(type: PointerKind) => void>();

function kindOf(e: PointerEvent): PointerKind {
  if (e.pointerType === 'touch') return 'touch';
  if (e.pointerType === 'pen') return 'pen';
  return 'mouse';
}

function clampUnit(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

/** Reads the viewport size used to normalise client coordinates. Runs once per resize, in a tick. */
function readViewport(): void {
  const root = document.documentElement;
  viewW = root.clientWidth || window.innerWidth || 1;
  viewH = root.clientHeight || window.innerHeight || 1;
  viewStale = false;
}

function holdAtZero(): void {
  pointer.x = 0;
  pointer.y = 0;
  pointer.sx = 0;
  pointer.sy = 0;
  pointer.vx = 0;
  pointer.vy = 0;
}

/** pointermove and pointerdown: store the raw position and kind. The tick does the rest. */
function onPointerEvent(e: PointerEvent): void {
  const kind = kindOf(e);
  pointer.clientX = e.clientX;
  pointer.clientY = e.clientY;
  pointer.type = kind;
  if (kind !== 'touch') pointer.inside = true;
}

/** pointerleave on the root element. A finger lifting also reports it, so touch is ignored here. */
function onRootLeave(e: PointerEvent): void {
  if (kindOf(e) !== 'touch') pointer.inside = false;
}

function onWindowBlur(): void {
  pointer.inside = false;
}

function onResize(): void {
  viewStale = true;
}

function announceType(): void {
  const kind = pointer.type;
  if (kind === announced) return;
  announced = kind;
  if (kind === 'none') return;
  for (const listener of [...typeListeners]) {
    try {
      listener(kind);
    } catch (err) {
      console.error('[pointer] onPointerType listener threw', err);
    }
  }
}

function update(t: Tick): void {
  if (viewStale) readViewport();
  const dt = t.dt;

  if (reduced) {
    holdAtZero();
    // x was held at 0, so the first frame back counts as an entry (see below).
    wasInside = false;
    announceType();
    return;
  }

  const prevX = pointer.x;
  const prevY = pointer.y;
  const entered = pointer.inside && !wasInside;
  wasInside = pointer.inside;

  if (pointer.inside) {
    // Touch moves the raw position but not the target: there is no parallax on touch.
    if (pointer.type !== 'touch') {
      pointer.x = clampUnit((pointer.clientX / viewW) * 2 - 1);
      pointer.y = clampUnit(1 - (pointer.clientY / viewH) * 2);
    }
  } else {
    // Outside the page the target eases back to 0, with the same exponential damping as sx and sy.
    const keep = Math.exp(-dt / T.half);
    pointer.x *= keep;
    pointer.y *= keep;
  }

  if (dt > 0) {
    const follow = 1 - Math.exp(-dt / T.half);
    const smooth = 1 - Math.exp(-dt / VELOCITY_TAU);
    // Entering the page is a jump in position, not movement, so it does not count as velocity.
    const rawVx = entered ? 0 : (pointer.x - prevX) / dt;
    const rawVy = entered ? 0 : (pointer.y - prevY) / dt;
    pointer.vx += (rawVx - pointer.vx) * smooth;
    pointer.vy += (rawVy - pointer.vy) * smooth;
    pointer.sx += (pointer.x - pointer.sx) * follow;
    pointer.sy += (pointer.y - pointer.sy) * follow;
  }

  announceType();
}

/**
 * Starts tracking the pointer. Idempotent. Call after initTicker (architecture section 5). Adds
 * passive listeners on window and on the root element, one tick at PRIORITY.input, and a
 * reduced-motion subscription.
 */
export function initPointer(): void {
  if (installed) return;
  installed = true;
  readViewport();
  reduced = env.reducedMotion;

  const passive: AddEventListenerOptions = { passive: true };
  window.addEventListener('pointermove', onPointerEvent, passive);
  window.addEventListener('pointerdown', onPointerEvent, passive);
  window.addEventListener('blur', onWindowBlur, passive);
  window.addEventListener('resize', onResize, passive);
  document.documentElement.addEventListener('pointerleave', onRootLeave, passive);

  onReducedMotionChange((on) => {
    reduced = on;
    if (on) holdAtZero();
  });

  addTick(update, PRIORITY.input);
}

/**
 * Calls cb each time the pointer kind changes (mouse, pen or touch). It is not called on subscribe:
 * read pointer.type for the current kind. Returns the unsubscribe function.
 */
export function onPointerType(cb: (type: PointerKind) => void): () => void {
  const entry = (type: PointerKind): void => cb(type);
  typeListeners.add(entry);
  return (): void => {
    typeListeners.delete(entry);
  };
}
