// Scroll choreography: maps the scroll position onto the GL world (architecture sections 6, 6b and 8;
// direction-3d 10.6, 10.10, 10.11 and 10.15; direction-act1 A3 to A5; direction-act2 C2 and C14;
// direction-act3 C3 and C5). src/gl/boot.ts calls initChoreo once with the world and the section layers
// in page order. Nothing else drives the world from scroll.
//
// Every frame, at PRIORITY.state + 5 (after the scroll state, before the GL update):
//   1. Geometry. Section tops and heights are cached. They are measured on init, on window resize, on
//      stage resize, when the fonts are ready, and when the document scroll height changes. No other
//      frame reads layout.
//   2. Ink bleed (D10, direction-3d 10.10). Each boundary's raw position is eased with sym and smoothed
//      with T.beat7. The bleed, the block mix m and the theme follow from the two values.
//   3. Current section: the last section in page order with a height whose top has passed the scroll
//      position. A change applies at once, except under reduced motion, where it runs as a canvas switch
//      (direction-act1 A5): fade out over T.half, change at opacity 0, fade in over T.half.
//   4. Handles. The current section's handle gets its progress every frame. Another section's handle gets
//      it when that progress changes, because some entrances start before their section is current (pricing
//      and closing enter from the bottom of the viewport). A section without a handle gets its formation and
//      camera key set directly while it is current.
//   5. Smear from the scroll velocity (direction-3d 10.11), and the post velocity (direction-3d 10.8).
//
// Progress. A handle receives the value its act file defines for its section. Hero and speed use the
// reading progress of act I A3. Capabilities, code and family use the centre-line progress of act II C2,
// which replaces A3 for act II. Pricing and closing receive their entrance progress w_p and w_c (act III
// C3). The footer and the preloader have no progress and receive 0.
//
// Only one choreography drives the world. A later initChoreo call disposes the earlier one, so a harness
// can replace the call boot makes with its own section list.
import { bus } from '../core/bus';
import { ef } from '../core/ease';
import { env, onReducedMotionChange } from '../core/env';
import { scrollState } from '../core/scroll';
import { addTick, PRIORITY, type Tick } from '../core/ticker';
import { T } from '../core/timing';
import type { SectionId, Theme } from '../core/types';
import { formationFor } from '../gl/blocks/formations';
import { cameraKey } from '../gl/rig';
import type { CameraKey, GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../gl/section-gl';

/** The state the harness and QA read. A copy, taken on request. */
export interface ChoreoSnapshot {
  /** The current section: the one whose handle or formation is applied. */
  current: SectionId | null;
  /** The progress passed to the current section on the last frame (see the header). */
  progress: number;
  /** Raw boundary positions in [0, 1], before easing. */
  raw1: number;
  raw2: number;
  /** Eased, smoothed boundary progress. */
  p1: number;
  p2: number;
  /** Block mix m, in [0, 1]. */
  m: number;
  /** The bleed passed to the background, or null when the background shows a cut or a settled theme. */
  bleed: { boundary: 1 | 2; p: number } | null;
  /** The theme side: ink when m is at least 0.5. */
  theme: Theme;
  /** Smear strength applied to the blocks, in [0, 1]. */
  smear: number;
  /** True while a reduced-motion canvas switch runs. */
  switching: boolean;
  /** The canvas opacity set by the switch, 1 when no switch sets it. */
  canvasOpacity: number;
  reducedMotion: boolean;
}

type ProgressRule = 'none' | 'reading' | 'centre' | 'pricing' | 'closing';

/** Which progress each section's handle receives (see the header). */
const RULE: Readonly<Record<SectionId, ProgressRule>> = {
  preloader: 'none',
  hero: 'reading',
  speed: 'reading',
  capabilities: 'centre',
  code: 'centre',
  family: 'centre',
  pricing: 'pricing',
  closing: 'closing',
  footer: 'none',
};

/** Entrance spans in viewport heights (direction-act3 C3). */
const PRICING_SPAN = 0.4;
const CLOSING_SPAN = 0.6;

/** The ink-bleed boundaries (direction-3d 10.10): boundary 1 is the top of capabilities, boundary 2 the top of pricing. */
const BOUNDARY_1: SectionId = 'capabilities';
const BOUNDARY_2: SectionId = 'pricing';

/** A bleed or smear value this close to its target is taken as arrived. */
const ARRIVE = 1e-3;
/**
 * Outside its window a bleed is drawn only while its front can reach the viewport. The front lies at
 * 1.12 - 1.24 p plus at most 0.06 of noise, with a soft edge of 0.012 (direction-3d 10.10). Beyond these
 * values the whole viewport lies on one side of the front, so the background shows the same colours
 * with or without it.
 */
const FRONT_LOW = 0.02;
const FRONT_HIGH = 0.98;

/** Smear strength reaches 1 at this scroll speed, in px/s (direction-3d 10.11). */
const SMEAR_FULL_SPEED = 2400;
/** A section's top this close to the scroll position (px) counts as passed. */
const PASSED_TOLERANCE = 1;

interface Geo {
  readonly id: SectionId;
  /** The element exists in the document. */
  found: boolean;
  /** Document y of the top edge, in CSS px. */
  top: number;
  /** Height, in CSS px. */
  height: number;
}

interface Slot {
  readonly index: number;
  readonly section: SectionGL;
  readonly geo: Geo;
  readonly rule: ProgressRule;
  handle: SectionGLHandle | null;
  /** The progress last passed to the handle while the section was not current. */
  sent: number;
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** Progress of a section from its top and height in viewport heights (topVh, heightVh). */
function progressOf(rule: ProgressRule, topVh: number, heightVh: number): number {
  switch (rule) {
    case 'reading':
      return heightVh > 0 ? clamp01(-topVh / heightVh) : 0;
    case 'centre':
      return heightVh > 0 ? clamp01((0.5 - topVh) / heightVh) : 0;
    case 'pricing':
      return clamp01((1 - topVh) / PRICING_SPAN);
    case 'closing':
      return clamp01((1 - topVh) / CLOSING_SPAN);
    case 'none':
      return 0;
  }
}

/** Raw boundary position in [0, 1]: 0 before the bleed window, 1 after it. A missing section gives the fallback. */
function boundaryRaw(geo: Geo, scrollY: number, vh: number, fallback: number): number {
  if (!geo.found) return fallback;
  return clamp01(1 - (geo.top - scrollY) / vh);
}

/**
 * One frame of the eased boundary progress. Under reduced motion it is a plain cut at raw 0.5 (D18.3).
 * Otherwise it is sym of the raw position, smoothed toward that target with T.beat7 (k is the frame's
 * smoothing factor). The first frame takes the target directly.
 */
function easeBoundary(p: number, raw: number, k: number, fresh: boolean, reduced: boolean): number {
  if (reduced) return raw >= 0.5 ? 1 : 0;
  const target = ef.sym(raw);
  if (fresh) return target;
  const next = p + (target - p) * k;
  return Math.abs(next - target) < ARRIVE ? target : next;
}

/** True while a boundary's front can reach the viewport, outside its window (see FRONT_LOW). */
function frontShows(p: number): boolean {
  return p > FRONT_LOW && p < FRONT_HIGH;
}

let activeInstance: { dispose(): void; snapshot(): ChoreoSnapshot } | null = null;

/** The state of the active choreography, or null when none runs. */
export function choreoSnapshot(): ChoreoSnapshot | null {
  return activeInstance === null ? null : activeInstance.snapshot();
}

/**
 * Starts the choreography for world. sections holds the section GL layers in page order (boot collects
 * them). Returns the handle that stops it. A later call disposes this one first.
 */
export function initChoreo(world: GLWorld, sections: readonly SectionGL[]): { dispose(): void } {
  activeInstance?.dispose();

  const stage = world.stage;
  const canvas = stage.canvas;
  const geos = new Map<SectionId, Geo>();
  const geoOf = (id: SectionId): Geo => {
    const known = geos.get(id);
    if (known !== undefined) return known;
    const created: Geo = { id, found: false, top: 0, height: 0 };
    geos.set(id, created);
    return created;
  };
  const slots: Slot[] = sections.map((section, index) => ({
    index,
    section,
    geo: geoOf(section.id),
    rule: RULE[section.id],
    handle: null,
    sent: 0,
  }));
  const boundary1 = geoOf(BOUNDARY_1);
  const boundary2 = geoOf(BOUNDARY_2);
  for (const slot of slots) {
    slot.handle = slot.section.setup?.(world) ?? null;
  }

  // Geometry. cachedHeight is the document scroll height at the last measure.
  let cachedHeight = -1;
  let geoDirty = true;

  function measure(): void {
    for (const geo of geos.values()) {
      const el = document.getElementById(geo.id);
      geo.found = el !== null;
      if (el === null) {
        geo.top = 0;
        geo.height = 0;
      } else {
        const rect = el.getBoundingClientRect();
        geo.top = rect.top + window.scrollY;
        geo.height = rect.height;
      }
    }
    cachedHeight = document.documentElement.scrollHeight;
    geoDirty = false;
  }

  // The context handed to handles. Its objects are reused; only prev changes per call.
  const ctx: SectionGLContext = {
    prev: null,
    portrait: false,
    reducedMotion: env.reducedMotion,
    size: { width: 1, height: 1 },
  };
  let reduced = env.reducedMotion;
  let disposed = false;

  function refreshCtx(): void {
    const size = stage.size;
    ctx.size.width = size.width;
    ctx.size.height = size.height;
    ctx.portrait = size.width < size.height;
    ctx.reducedMotion = reduced;
  }

  function fillCtx(index: number): SectionGLContext {
    ctx.prev = index > 0 ? slots[index - 1].section : null;
    return ctx;
  }

  // Current section and the reduced-motion canvas switch.
  let shown = -1; // index of the committed current section, -1 for none
  type Switch = 'idle' | 'out' | 'in';
  let phase: Switch = 'idle';
  let phaseStart = 0;

  let directIndex = -1; // section whose formation and key were set directly, -1 when none
  let directW = 0;
  let directH = 0;
  const directKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: 22 };

  function setSwitchOpacity(value: number): void {
    canvas.style.opacity = value >= 1 ? '' : value.toFixed(4);
  }

  function commit(next: number): void {
    const old = shown >= 0 ? slots[shown] : null;
    const incoming = next >= 0 ? slots[next] : null;
    const oldHandle = old?.handle ?? null;
    if (old !== null && oldHandle !== null) oldHandle.setActive(false, fillCtx(old.index));
    shown = next;
    const newHandle = incoming?.handle ?? null;
    if (incoming !== null && newHandle !== null) newHandle.setActive(true, fillCtx(incoming.index));
    world.post.setDof(incoming?.section.dof ?? null);
    world.blocks.setBreath(incoming?.section.breath ?? null);
    world.blocks.setActiveGroup(null);
    if (old !== null) bus.emit('section:leave', old.section.id);
    if (incoming !== null) {
      bus.emit('section:enter', incoming.section.id);
      bus.emit('formation', incoming.section.formation);
    }
    directIndex = -1;
  }

  /** The last section in page order with a height whose top has passed y, else the first with a height. */
  function indexAt(y: number): number {
    let first = -1;
    let last = -1;
    for (let i = 0; i < slots.length; i += 1) {
      const geo = slots[i].geo;
      if (!(geo.height > 0)) continue;
      if (first < 0) first = i;
      if (geo.top <= y + PASSED_TOLERANCE) last = i;
    }
    return last >= 0 ? last : first;
  }

  /** Applies the wanted section now, or, under reduced motion, through the two-step canvas switch. */
  function syncCurrent(want: number, now: number): void {
    if (!reduced || shown < 0) {
      if (want !== shown) commit(want);
      return;
    }
    if (phase === 'idle') {
      if (want === shown) return;
      phase = 'out';
      phaseStart = now;
    }
    const k = clamp01((now - phaseStart) / T.half);
    if (phase === 'out') {
      if (k < 1) {
        setSwitchOpacity(1 - ef.fade(k));
        return;
      }
      if (want !== shown) commit(want);
      phase = 'in';
      phaseStart = now;
      setSwitchOpacity(0);
      return;
    }
    if (k < 1) {
      setSwitchOpacity(ef.fade(k));
      return;
    }
    phase = 'idle';
    setSwitchOpacity(1);
  }

  function applyDirect(index: number, w: number, h: number): void {
    const section = slots[index].section;
    world.blocks.setPoses(formationFor(section.formation, w < h));
    cameraKey(section.key, { width: w, height: h }, directKey);
    world.rig.blend(directKey, directKey, 1);
    directIndex = index;
    directW = w;
    directH = h;
  }

  // Ink bleed, mix and theme state.
  let p1 = 0;
  let p2 = 0;
  let primed = false;
  let mix = Number.NaN;
  let bleedOn = false;
  const bleedArg: { boundary: 1 | 2; p: number } = { boundary: 1, p: 0 };
  let bgTheme: Theme | null = null; // last theme set on the background
  let eventTheme: Theme | null = null; // last theme emitted on the bus
  let smear = 0;

  // Values of the last frame, for the snapshot.
  let lastProgress = 0;
  let lastRaw1 = 0;
  let lastRaw2 = 0;
  let lastM = 0;
  let lastSide: Theme = 'paper';

  function frame(t: Tick): void {
    if (disposed) return;
    if (geoDirty || document.documentElement.scrollHeight !== cachedHeight) measure();

    const y = scrollState.y;
    const vh = Math.max(1, window.innerHeight);
    refreshCtx();

    // Boundaries. A boundary missing from the page counts as never in its window.
    const raw1 = boundaryRaw(boundary1, y, vh, 0);
    const raw2 = boundaryRaw(boundary2, y, vh, 1);
    const fresh = !primed;
    primed = true;
    const k = 1 - Math.exp(-t.dt / T.beat7);
    p1 = easeBoundary(p1, raw1, k, fresh, reduced);
    p2 = easeBoundary(p2, raw2, k, fresh, reduced);

    // The bleed: the boundary whose window holds the scroll position, else one whose front is still moving on screen.
    let board: 0 | 1 | 2 = 0;
    if (!reduced) {
      if (raw1 > 0 && raw1 < 1) board = 1;
      else if (raw2 > 0 && raw2 < 1) board = 2;
      else if (frontShows(p1)) board = 1;
      else if (frontShows(p2)) board = 2;
    }
    const bp = board === 2 ? p2 : p1;

    // Block mix: 0 before boundary 1, p1 inside it, 1 between, 1 - p2 inside boundary 2, 0 after.
    const m = Math.min(p1, 1 - p2);
    const side: Theme = m >= 0.5 ? 'ink' : 'paper';
    if (board !== 0) {
      if (!bleedOn || bleedArg.boundary !== board || bleedArg.p !== bp) {
        bleedArg.boundary = board;
        bleedArg.p = bp;
        world.background.setBleed(bleedArg);
      }
      bleedOn = true;
    } else {
      if (bleedOn) {
        world.background.setBleed(null);
        bleedOn = false;
      }
      if (bgTheme !== side) {
        world.background.setTheme(side);
        bgTheme = side;
      }
    }
    if (side !== eventTheme) {
      eventTheme = side;
      bus.emit('theme', side);
    }
    if (m !== mix) {
      mix = m;
      world.blocks.setMix(m);
      world.lighting.setMix(m);
      world.post.setMix(m);
    }

    // Current section, then the handles. The current section's handle gets its progress every frame.
    // Another section's handle gets it only when the progress changes. That drives the entrances that
    // begin before a section is current: pricing (w_p) and closing (w_c) from the bottom of the
    // viewport, and capabilities (its centre-line progress) while speed is current.
    syncCurrent(indexAt(y), t.time);
    let progress = 0;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      const pr = progressOf(slot.rule, (slot.geo.top - y) / vh, slot.geo.height / vh);
      if (i === shown) {
        progress = pr;
        slot.sent = pr;
        if (slot.handle !== null) {
          slot.handle.update(pr, t, fillCtx(i));
        } else if (directIndex !== i || directW !== ctx.size.width || directH !== ctx.size.height) {
          if (ctx.size.width > 0 && ctx.size.height > 0) applyDirect(i, ctx.size.width, ctx.size.height);
        }
      } else if (slot.handle !== null && pr !== slot.sent) {
        slot.sent = pr;
        slot.handle.update(pr, t, fillCtx(i));
      }
    }

    // Smear from the scroll velocity, on the speed section only (direction-3d 10.11).
    const smearWanted = !reduced && shown >= 0 && slots[shown].section.smear === true;
    const smearTarget = smearWanted ? clamp01(Math.abs(scrollState.velocity) / SMEAR_FULL_SPEED) : 0;
    smear += (smearTarget - smear) * (1 - Math.exp(-t.dt / T.micro));
    if (Math.abs(smearTarget - smear) < ARRIVE) smear = smearTarget;
    world.blocks.setSmear(smear);
    world.post.setVelocity(scrollState.velocity);

    lastProgress = progress;
    lastRaw1 = raw1;
    lastRaw2 = raw2;
    lastM = m;
    lastSide = side;
  }

  function snapshot(): ChoreoSnapshot {
    return {
      current: shown >= 0 ? slots[shown].section.id : null,
      progress: lastProgress,
      raw1: lastRaw1,
      raw2: lastRaw2,
      p1,
      p2,
      m: lastM,
      bleed: bleedOn ? { boundary: bleedArg.boundary, p: bleedArg.p } : null,
      theme: lastSide,
      smear,
      switching: phase !== 'idle',
      canvasOpacity: canvas.style.opacity === '' ? 1 : Number(canvas.style.opacity),
      reducedMotion: reduced,
    };
  }

  // Subscriptions. Each has a matching removal in dispose().
  measure();
  const removeTick = addTick(frame, PRIORITY.state + 5);
  const removeStageResize = stage.onResize(() => {
    if (!disposed) measure();
  });
  const onWindowResize = (): void => {
    geoDirty = true;
  };
  window.addEventListener('resize', onWindowResize, { passive: true });
  if (typeof document.fonts !== 'undefined') {
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
  }
  const removeReduced = onReducedMotionChange((value) => {
    reduced = value;
    if (!value) {
      // Leaving reduced motion ends any switch in progress; the next frame applies the section at once.
      phase = 'idle';
      setSwitchOpacity(1);
    }
  });

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    removeTick();
    removeStageResize();
    window.removeEventListener('resize', onWindowResize);
    removeReduced();
    if (shown >= 0) {
      const handle = slots[shown].handle;
      if (handle !== null) handle.setActive(false, fillCtx(shown));
    }
    for (const slot of slots) {
      slot.handle?.dispose();
      slot.handle = null;
    }
    phase = 'idle';
    setSwitchOpacity(1);
    world.background.setBleed(null);
    world.post.setDof(null);
    world.blocks.setBreath(null);
    world.blocks.setActiveGroup(null);
    world.blocks.setSmear(0);
    shown = -1;
    if (activeInstance === instance) activeInstance = null;
  }

  const instance = { dispose, snapshot };
  activeInstance = instance;
  return { dispose };
}
