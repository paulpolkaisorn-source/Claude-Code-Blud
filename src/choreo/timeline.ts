// Scroll choreography: maps the scroll position onto the GL world (architecture sections 6, 6b and 8;
// direction-3d 10.6, 10.10, 10.11 and 10.15; direction-act1 A3 to A5; direction-act2 C2 and C14;
// direction-act3 C3 and C5). src/gl/boot.ts calls initChoreo once with the world and the section layers
// in page order. Nothing else drives the world from scroll.
//
// Every frame, at PRIORITY.state + 5 (after the scroll state, before the GL update):
//   1. Geometry. Section tops and heights are cached. They are measured on init, on window resize, on
//      stage resize, when the fonts are ready, and when the document scroll height changes. No other
//      frame reads layout.
//   2. Ink bleed (D10, direction-3d 10.10, D25.1). Each boundary's raw position is eased with sym and smoothed with
//      T.beat7. The eased values go into ctx.bleed before any handle call (D22.8) and set the block mix m. They do not
//      place the ink front. Its mean line is the screen y of the lower section's top edge, computed each frame from
//      the cached geometry and scrollState.y with no easing, and its wave is capped by the lower section's top padding.
//      The background draws the front; with no front on screen, the ground takes the theme of the section it lies in.
//   2b. Text theme (D23.1, D25.1). theme-front sets data-theme on each data-theme-block from the same front lines: a
//      block takes the lower section's theme when its centre is below the boundary's front line, else the upper
//      section's. The geometry is cached (theme-front.ts), so no layout is read per frame.
//   3. Current section: the last section in page order with a height whose top has passed the scroll
//      position. A change applies at once, except under reduced motion, where it runs as a canvas switch
//      (direction-act1 A5): fade out over T.half, change at opacity 0, fade in over T.half. The depth of
//      field of the current section is set when it becomes current, and again on a resize while it is
//      current (D22.2).
//   4. Handles, in this order (D22.1, D22.11). (a) The current section's update(progress) every frame, with
//      no skip on unchanged progress. (c) The section that was entering on the last frame, if its progress is
//      now 0 and it is not current: one update(0), so its last write is its entry pose. (b) The next section in
//      page order, if it is entering (its progress is above 0, and capabilities also while p1 is above 0, D23.2): update(progress). Its write is the last of
//      the frame, so a current section never overwrites an entering one. (c) runs before (b), and the two never
//      name the same section in one frame. A section without a handle gets its formation and camera key set
//      directly while it is current.
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
import { frontParam } from '../gl/background/background';
import { formationFor } from '../gl/blocks/formations';
import { cameraKey } from '../gl/rig';
import type { CameraKey, GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../gl/section-gl';
import { createThemeFront, type ThemeBlockState } from './theme-front';

/** The state the harness and QA read. A copy, taken on request. */
export interface ChoreoSnapshot {
  /** The current section: the one whose handle or formation is applied. */
  current: SectionId | null;
  /** The progress passed to the current section on the last frame (see the header). */
  progress: number;
  /** The section that got the entering update on the last frame (the next section, while its progress is above 0), or null. */
  entering: SectionId | null;
  /** Raw boundary positions in [0, 1], before easing. */
  raw1: number;
  raw2: number;
  /** Eased, smoothed boundary progress. */
  p1: number;
  p2: number;
  /** Block mix m, in [0, 1]. */
  m: number;
  /** The front passed to the background (p and the wave in CSS px), or null when no front is drawn. */
  bleed: { boundary: 1 | 2; p: number; wave: number } | null;
  /** The theme side: ink when m is at least 0.5. */
  theme: Theme;
  /** Smear strength applied to the blocks, in [0, 1]. */
  smear: number;
  /** True while a reduced-motion canvas switch runs. */
  switching: boolean;
  /** The canvas opacity set by the switch, 1 when no switch sets it. */
  canvasOpacity: number;
  reducedMotion: boolean;
  /** Screen y of the front line of boundary 1 and boundary 2 at the last frame, CSS px (theme-front). */
  front1: number;
  front2: number;
  /** Scroll velocity in px/s, as the blocks and the post read it on the last frame (scroll.ts, wall clock). */
  velocity: number;
  /** The damped speed of the post's aberration, in px/s (post.dampedSpeed). */
  dampedSpeed: number;
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
 * The ink front's wave (D25.1): its amplitude is at most WAVE_VH of the canvas height (the amplitude the shader drew
 * before D25.1) and at most WAVE_PAD_SHARE of the lower section's top padding, which keeps it under the 60 % the act
 * allows, so no text block can sit on the other section's ground.
 */
const WAVE_VH = 0.06;
const WAVE_PAD_SHARE = 0.5;

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
  /** The computed padding-top, in CSS px, read once per layout (D25.1: it caps the wave of a front). */
  padTop: number;
}

interface Slot {
  readonly index: number;
  readonly section: SectionGL;
  readonly geo: Geo;
  readonly rule: ProgressRule;
  handle: SectionGLHandle | null;
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** A CSS length in px as a number, 0 when it does not parse. */
function pxOf(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
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

/** Screen y of a boundary's front line, the top edge of its lower section (D25.1), in CSS px. NaN for a missing section. */
function frontScreenY(geo: Geo, scrollY: number): number {
  return geo.found ? geo.top - scrollY : Number.NaN;
}

interface ActiveInstance {
  dispose(): void;
  snapshot(): ChoreoSnapshot;
  themeBlocks(): ThemeBlockState[];
  refreshThemeBlocks(): void;
}

let activeInstance: ActiveInstance | null = null;

/** The state of the active choreography, or null when none runs. */
export function choreoSnapshot(): ChoreoSnapshot | null {
  return activeInstance === null ? null : activeInstance.snapshot();
}

/** The text blocks of the active choreography as the last frame placed them (theme-front), or null when none runs. */
export function choreoThemeBlocks(): ThemeBlockState[] | null {
  return activeInstance === null ? null : activeInstance.themeBlocks();
}

/** Re-measures the text blocks on the next frame, after a layout change the module cannot see. No-op without a choreography. */
export function choreoRefreshThemeBlocks(): void {
  activeInstance?.refreshThemeBlocks();
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
    const created: Geo = { id, found: false, top: 0, height: 0, padTop: 0 };
    geos.set(id, created);
    return created;
  };
  const slots: Slot[] = sections.map((section, index) => ({
    index,
    section,
    geo: geoOf(section.id),
    rule: RULE[section.id],
    handle: null,
  }));
  /** Each section's progress on the current frame, by index. Allocated once. */
  const progressAt = new Float64Array(slots.length);
  const boundary1 = geoOf(BOUNDARY_1);
  const boundary2 = geoOf(BOUNDARY_2);
  for (const slot of slots) {
    slot.handle = slot.section.setup?.(world) ?? null;
  }
  /** Text theme per block, following the ink front (D23.1). Driven from frame(); it starts no loop of its own. */
  const themeFront = createThemeFront();

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
        geo.padTop = 0;
      } else {
        const rect = el.getBoundingClientRect();
        geo.top = rect.top + window.scrollY;
        geo.height = rect.height;
        geo.padTop = pxOf(getComputedStyle(el).paddingTop);
      }
    }
    cachedHeight = document.documentElement.scrollHeight;
    geoDirty = false;
    themeFront.invalidate();
  }

  // The context handed to handles. Its objects are reused; only prev changes per call.
  const ctx: SectionGLContext = {
    prev: null,
    portrait: false,
    reducedMotion: env.reducedMotion,
    size: { width: 1, height: 1 },
    bleed: { p1: 0, p2: 0 },
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

  // Depth of field (D22.2). The section whose value is set (-1 for none) and the size it was set at. The key and the
  // arguments are reused: post copies the arguments, so one object serves every call.
  const dofKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: 22 };
  const dofArg = { focus: 1, bokeh: 0 };
  let dofIndex = -1;
  let dofW = 0;
  let dofH = 0;

  function setSwitchOpacity(value: number): void {
    canvas.style.opacity = value >= 1 ? '' : value.toFixed(4);
  }

  /**
   * Sets the depth of field of section index (D22.2). Focus is the distance from the camera to the z = 0 plane at the
   * section's key and the current size, in bu, which is the unit setDof takes (post.ts). Bokeh is the section's value.
   * A section without depth of field, or no section, removes the pass. Nothing allocates here.
   */
  function applyDof(index: number): void {
    const section = index >= 0 ? slots[index].section : null;
    const dof = section?.dof ?? null;
    if (section === null || dof === null) {
      world.post.setDof(null);
      dofIndex = -1;
      return;
    }
    const w = ctx.size.width;
    const h = ctx.size.height;
    if (!(w > 0 && h > 0)) return;
    cameraKey(section.key, ctx.size, dofKey);
    dofArg.focus = dofKey.position[2];
    dofArg.bokeh = dof.bokeh;
    world.post.setDof(dofArg);
    dofIndex = index;
    dofW = w;
    dofH = h;
  }

  function commit(next: number): void {
    const old = shown >= 0 ? slots[shown] : null;
    const incoming = next >= 0 ? slots[next] : null;
    const oldHandle = old?.handle ?? null;
    if (old !== null && oldHandle !== null) oldHandle.setActive(false, fillCtx(old.index));
    shown = next;
    const newHandle = incoming?.handle ?? null;
    if (incoming !== null && newHandle !== null) newHandle.setActive(true, fillCtx(incoming.index));
    applyDof(next);
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

  /**
   * A section is entering while its own progress is above 0. Capabilities also enters while the bleed p1 is above 0
   * (D23.2): its centre-line progress is still 0 while the front crosses the lower half of the screen, and its handle
   * reads p1 itself.
   */
  function entering(index: number): boolean {
    return progressAt[index] > 0 || (slots[index].section.id === BOUNDARY_1 && p1 > 0);
  }

  let primed = false;
  let mix = Number.NaN;
  let bleedOn = false;
  const bleedArg: { boundary: 1 | 2; p: number; wave: number } = { boundary: 1, p: 0, wave: 0 };
  let bgTheme: Theme | null = null; // last theme set on the background
  let eventTheme: Theme | null = null; // last theme emitted on the bus
  let smear = 0;
  let smearMs = -1; // performance.now() at the last smear step, or -1 before the first (D24.4)
  /** The index of the section that got the entering update on the last frame, or -1. */
  let enteredIndex = -1;

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
    // The eased values are the bleed every handle receives this frame (D22.8). They are written before any handle call.
    ctx.bleed.p1 = p1;
    ctx.bleed.p2 = p2;

    // The ink front on screen (D25.1). Each mean line is the screen y of its lower section's top edge, from the cached
    // geometry and the scroll position: no easing and no smoothing. NaN for a missing section.
    const front1 = frontScreenY(boundary1, y);
    const front2 = frontScreenY(boundary2, y);
    const H = ctx.size.height;
    const pf1 = frontParam(front1, H);
    const pf2 = frontParam(front2, H);
    // A front is drawn while its mean line can reach the canvas, which is p inside [0, 1]. The two boundaries are seven
    // viewport heights apart (capabilities, code and family), so at most one of them is drawn at a time.
    let board: 0 | 1 | 2 = 0;
    if (pf1 > 0 && pf1 < 1) board = 1;
    else if (pf2 > 0 && pf2 < 1) board = 2;

    // The ground at the screen centre: ink between boundary 1 and boundary 2, paper elsewhere. With no front drawn it is the
    // ground of the whole screen, and it is the theme the bus carries.
    const centre = H / 2;
    const side: Theme = front1 < centre && centre <= front2 ? 'ink' : 'paper';
    if (board !== 0) {
      // The wave is capped by the lower section's top padding (D25.1). Reduced motion turns it into a plain cut in the background.
      const lowerPad = board === 1 ? boundary1.padTop : boundary2.padTop;
      const wave = Math.min(WAVE_VH * H, WAVE_PAD_SHARE * lowerPad);
      const fp = board === 1 ? pf1 : pf2;
      if (!bleedOn || bleedArg.boundary !== board || bleedArg.p !== fp || bleedArg.wave !== wave) {
        bleedArg.boundary = board;
        bleedArg.p = fp;
        bleedArg.wave = wave;
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

    // Block mix: 0 before boundary 1, p1 inside it, 1 between, 1 - p2 inside boundary 2, 0 after. The eased values set it,
    // so the 3D keeps them (D25.1).
    const m = Math.min(p1, 1 - p2);
    if (m !== mix) {
      mix = m;
      world.blocks.setMix(m);
      world.lighting.setMix(m);
      world.post.setMix(m);
    }
    // Text theme per block, against the same front lines the background draws (D23.1, D25.1).
    themeFront.update(front1, front2, y);

    // Current section, then the handles (D22.1, D22.11). The current section is updated every frame. A section that
    // was entering on the last frame gets one update(0) once its progress is back at 0. The next section in page order
    // gets update(progress) every frame while its progress is above 0, so its write is the last of the frame. That
    // covers the entrances that begin before a section is current: capabilities while speed is current, pricing (w_p)
    // and closing (w_c) from the bottom of the viewport.
    syncCurrent(indexAt(y), t.time);
    const cur = shown;
    if (
      cur >= 0 &&
      slots[cur].section.dof !== null &&
      (dofIndex !== cur || dofW !== ctx.size.width || dofH !== ctx.size.height)
    ) {
      applyDof(cur);
    }
    for (let i = 0; i < slots.length; i += 1) {
      progressAt[i] = progressOf(slots[i].rule, (slots[i].geo.top - y) / vh, slots[i].geo.height / vh);
    }

    let progress = 0;
    if (cur >= 0) {
      progress = progressAt[cur];
      const slot = slots[cur];
      if (slot.handle !== null) {
        slot.handle.update(progress, t, fillCtx(cur));
      } else if (directIndex !== cur || directW !== ctx.size.width || directH !== ctx.size.height) {
        if (ctx.size.width > 0 && ctx.size.height > 0) applyDirect(cur, ctx.size.width, ctx.size.height);
      }
    }

    // (c) before (b): a section that was entering on the last frame, no longer entering and not current, gets one update(0).
    const left = enteredIndex >= 0 && enteredIndex !== cur && !entering(enteredIndex) ? enteredIndex : -1;
    if (left >= 0) slots[left].handle?.update(0, t, fillCtx(left));

    // (b) the next section in page order, while it is entering. Its write is the last of the frame.
    enteredIndex = -1;
    const next = cur + 1;
    if (next < slots.length && entering(next)) {
      enteredIndex = next;
      slots[next].handle?.update(progressAt[next], t, fillCtx(next));
    }

    // Smear from the scroll velocity, on the speed section only (direction-3d 10.11). The damping runs on the wall clock,
    // like the post's (D24.4): the page clock clamps dt, so a slow frame would stretch the smear.
    const smearWanted = !reduced && shown >= 0 && slots[shown].section.smear === true;
    const smearTarget = smearWanted ? clamp01(Math.abs(scrollState.velocity) / SMEAR_FULL_SPEED) : 0;
    const nowMs = performance.now();
    const dtWall = smearMs < 0 ? 0 : (nowMs - smearMs) / 1000;
    smearMs = nowMs;
    smear += (smearTarget - smear) * (1 - Math.exp(-dtWall / T.micro));
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
      entering: enteredIndex >= 0 ? slots[enteredIndex].section.id : null,
      raw1: lastRaw1,
      raw2: lastRaw2,
      p1,
      p2,
      m: lastM,
      bleed: bleedOn ? { boundary: bleedArg.boundary, p: bleedArg.p, wave: bleedArg.wave } : null,
      theme: lastSide,
      smear,
      switching: phase !== 'idle',
      canvasOpacity: canvas.style.opacity === '' ? 1 : Number(canvas.style.opacity),
      reducedMotion: reduced,
      front1: themeFront.frontOf(1),
      front2: themeFront.frontOf(2),
      velocity: scrollState.velocity,
      dampedSpeed: world.post.dampedSpeed,
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
    dofIndex = -1;
    world.blocks.setBreath(null);
    world.blocks.setActiveGroup(null);
    world.blocks.setSmear(0);
    themeFront.dispose();
    shown = -1;
    if (activeInstance === instance) activeInstance = null;
  }

  const instance: ActiveInstance = {
    dispose,
    snapshot,
    themeBlocks: () => themeFront.blocks(),
    refreshThemeBlocks: () => themeFront.invalidate(),
  };
  activeInstance = instance;
  return { dispose };
}
