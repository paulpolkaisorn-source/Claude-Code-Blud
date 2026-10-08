// The capabilities section's 3D layer (design/direction-act2.md section 12, capabilities: Sequence, 3D layer,
// Scroll, Pointer, Touch, Keyboard, Keep-alive and Reduced motion; act rules C2, C10, C11, C14 and C15;
// design/direction-3d.md sections 10.6, 10.10, 10.12 to 10.14 and 11.4 to 11.6; decisions D6, D15, D21 and D22 in
// design/drafts/director-decisions.md).
//
// Progress. The choreography passes the centre-line progress p of rule C2: p is 0 when the section top is at the
// vertical centre of the viewport and 1 when its bottom edge is there. Card k (indices 0, 1, 2 here) is active while
// p is in [k / 3, (k + 1) / 3). The formation follows p (Sequence): cap-0 up to p 0.2833, a blend from cap-0 to cap-1
// across p 0.2833 to 0.3833, cap-1 up to 0.6167, a blend from cap-1 to cap-2 across 0.6167 to 0.7167, and cap-2 above
// that. A blend moves each block on its own local progress q = scrubLocal(j, 17, t) with t = sym(u): the kireji takes
// anticipate on q and the other 16 take settle.
//
// Entry (act C2 and line 37 of act II; D22.8). The entry is driven by the bleed progress p1 in ctx.bleed. The choreography
// has already eased p1 with sym and smoothed it with T.beat7, so this handle uses it as given and applies no second sym.
// The 17 blocks move from the race (the speed section's exit formation) to cap-0, scrubbed by scrubLocal over t = p1. The
// camera moves from the speed key to the hero key linearly in p1. rig.blend applies ef.sym to the progress it receives,
// so the handle passes symArg(p1), the argument whose ef.sym is p1. On a phone the speed key is the height fit of D15.1
// with the sideways offset of D21.2 (z 51.12, x -3.30), so the entry starts there, not at the act's phone z 110.70,
// which predates D15.1. The entry never passes z 51.12, so the far plane stays at 80.
//
// After the section becomes current, the entry keeps running while p1 settles at 1. The bleed smoothing is slower than
// the scroll, so the camera and the blocks finish with the ink front, and nothing jumps at the activation. A card that
// is past the first band is drawn from its own formation, and the entry residue is absorbed in that band. Under reduced
// motion no entry is drawn: the section is set at once (C14).
//
// Timed activation (keyboard or tap, hk:cap-active). The formation runs to the card's cap formation in TIMED_TOTAL
// seconds. Block i starts at its own offset and lasts T.beat7 (the kireji lasts T.micro from offset 0). The kireji
// takes cut, the other 16 take settle from T.micro + HAIKU_OFFSETS[j], and the followers of the arriving active group
// take follow once. The card stays held until the page has landed on it (its timed move is done and p is in the
// card's range with no blend band) or until the reader's next wheel, touch or key input. A key input that caused the
// activation does not count. Held, the formation is the timed one and p does not drive it.
//
// Hover (hk:cap-hover). A hovered card's rows lift 0.2 bu toward the camera through blocks.setLift (fine pointer, not
// reduced motion). Touch has no hover lift. The hover event only records the card (D22.9); update() applies the lift.
//
// Breath. Only the active group breathes (blocks.setActiveGroup). The choreography applies the breath of the section
// (C15) when it commits the section, and resets the active group to null in the same call, so this layer asserts the
// group again on its first update.
//
// Writes. The shared world is written only from update() and setActive() (D22.9). No tick of this layer writes poses or
// the camera. The choreography calls the current section's update() every frame, so a timed move or a hold advances
// through the numbers that update() reads; the gsap tweens of this layer change only those numbers.
//
// Reduced motion (C14). Every entry and blend is complete. The active card follows p in discrete steps, and each change
// of card (also a keyboard or tap activation) runs the two-step canvas crossfade of act rule C14 over T.half each step.
// The hover lift and the timed move are off.
//
// Decisions in this file, each reported to the director:
// - The blocks take the same p1 as the camera. The earlier entry over p in [0, 1/6] (u = 6p) was chosen only because no
//   p1 reached this handle; D22.8 supplies it, so that reason is gone.
// - Open, outside this file: the choreography calls an entering section only while its centre-line progress is above
//   0 (src/choreo/timeline.ts, step (b)), that is from the centre line (section top at 0.5 vh) on. The bleed from the
//   bottom edge to the centre line (p1 from 0 to 0.5) therefore reaches this handle only from p1 = 0.5, and the camera
//   and the blocks start there. The fix belongs to the choreography and is in the report to the director.
// - The hold ends at the landing rule above, not at "scroll moves into another third". A release at a third's edge
//   would jump the formation by half a blend, because p at a third's edge is mid-band.
// - Timed moves run to TIMED_TOTAL = T.micro + HAIKU_OFFSETS[16] + T.beat7 (1.45 s), since each block lasts T.beat7 from its
//   own offset (act Sequence, step 2), not the whole move over T.beat7.
// - The hover lift is a blocks.setLift target, which blocks.ts damps with T.half. The act asks for T.beat5 with settle.
import { gsap } from 'gsap';
import { E, ef, registerEases } from '../../core/ease';
import { env } from '../../core/env';
import { HAIKU_OFFSETS, T, scrubLocal } from '../../core/timing';
import type { Tick } from '../../core/ticker';
import type { FormationId } from '../../core/types';
import type { BreathMode } from '../../gl/blocks/blocks';
import { BLOCK_COUNT, KIREJI, formationFor, lerpPose, staggerPosition, type Pose } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type {
  CameraKey,
  GLWorld,
  KeyName,
  SectionGL,
  SectionGLContext,
  SectionGLHandle,
} from '../../gl/section-gl';

/** The three capability cards, by index (card 1 is index 0). */
const CARDS = 3;
/** The formation each card rests in (direction-3d 11.4 to 11.6). */
const CARD_FORMATION: readonly FormationId[] = ['cap-0', 'cap-1', 'cap-2'];
/** The rows of each card: the active group, which is the only group that breathes (C15). */
const CARD_ROWS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16],
];
/** Half of a blend band in p, centred on each card boundary (Sequence). The band is 0.1 wide. */
const BAND = 0.05;
const BAND_WIDTH = 2 * BAND;
/** Scrub profile of every formation change (direction-3d 11.1, architecture section 6). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** Lift of a hovered card's group toward the camera, in bu (Pointer, direction-3d 10.13). */
const LIFT_BU = 0.2;
/** The idle breath of the active group (C15, direction-3d 10.12). */
const BREATH: BreathMode = { amplitude: 0.012, phase: 'rows' };
/** Events the 2D layer dispatches on document (the only coupling to 2D code). */
const ACTIVATE_EVENT = 'hk:cap-active';
const HOVER_EVENT = 'hk:cap-hover';
/** Bisection steps that invert ef.sym (the bracket halves each step, so 40 steps are below 1e-12). */
const SYM_ITERATIONS = 40;

/** The timed move of one card: per block, its start offset, its duration and its curve, in seconds. */
interface TimedPlan {
  readonly start: readonly number[];
  readonly duration: readonly number[];
  readonly ease: readonly ((t: number) => number)[];
  readonly total: number;
}

/**
 * The timed change into card c (Sequence, step 2). The kireji starts at 0 and cuts over T.micro. Each follower starts at
 * T.micro + HAIKU_OFFSETS[j], where j is its stagger position in the card's order, and settles over T.beat7. The
 * followers of the arriving active group take follow for their move, once per arrival (direction.md heading 8).
 */
function planFor(card: number): TimedPlan {
  const order = staggerPosition(CARD_FORMATION[card]);
  const arriving = new Set<number>(CARD_ROWS[card]);
  const start: number[] = [];
  const duration: number[] = [];
  const ease: ((t: number) => number)[] = [];
  let total = 0;
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    if (i === KIREJI) {
      start.push(0);
      duration.push(T.micro);
      ease.push(ef.cut);
    } else {
      start.push(T.micro + HAIKU_OFFSETS[order[i]]);
      duration.push(T.beat7);
      ease.push(arriving.has(i) ? ef.follow : ef.settle);
    }
    total = Math.max(total, start[i] + duration[i]);
  }
  return { start, duration, ease, total };
}

const PLANS: readonly TimedPlan[] = [0, 1, 2].map((card) => planFor(card));
/** The length of the timed move in seconds: the largest block end over the three cards. */
const TIMED_TOTAL = Math.max(...PLANS.map((plan) => plan.total));

/**
 * The centre-line progress range over which card c is the only formation on screen, with no blend band across it.
 * The hold of an activation ends inside this range (see the header).
 */
function pureRange(card: number): readonly [number, number] {
  const lo = card === 0 ? 0 : card / CARDS + BAND;
  const hi = card === CARDS - 1 ? 1 : (card + 1) / CARDS - BAND;
  return [lo, hi];
}

const PURE: readonly (readonly [number, number])[] = [0, 1, 2].map((card) => pureRange(card));

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** The card whose third holds p (C2): card k is active while p is in [k / 3, (k + 1) / 3). */
function cardOf(p: number): number {
  return Math.min(CARDS - 1, Math.floor(p * CARDS));
}

function makePoses(): Pose[] {
  return Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
}

function copyPoses(src: readonly Pose[], dst: Pose[]): void {
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const a = src[i];
    const b = dst[i];
    b.p[0] = a.p[0];
    b.p[1] = a.p[1];
    b.p[2] = a.p[2];
    b.r[0] = a.r[0];
    b.r[1] = a.r[1];
    b.r[2] = a.r[2];
    b.s = a.s;
  }
}

/**
 * The scrubbed blend from one formation to another at transition progress t (Sequence). order is the stagger
 * order of the formation being entered: block i has stagger position order[i]. The kireji takes anticipate on its
 * local progress and the others take settle. t is used as given; the caller applies any sym.
 */
function blendInto(from: readonly Pose[], to: readonly Pose[], t: number, order: readonly number[], out: Pose[]): void {
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const q = scrubLocal(order[i], BLOCK_COUNT, t, SCRUB);
    const e = i === KIREJI ? ef.anticipate(q) : ef.settle(q);
    lerpPose(from[i], to[i], e, out[i]);
  }
}

/**
 * The pose of every block at centre-line progress p. Card 1 is taken from c0: the entry pose while the bleed is still
 * settling, and cap-0 once it has settled. The blend band from card 1 to card 2 starts from the same c0, so the entry
 * residue is absorbed in that band and not cut.
 */
function drivenInto(p: number, c0: readonly Pose[], portrait: boolean, out: Pose[]): void {
  const c1 = formationFor('cap-1', portrait);
  const c2 = formationFor('cap-2', portrait);
  const b1 = 1 / CARDS;
  const b2 = 2 / CARDS;
  if (p < b1 - BAND) {
    copyPoses(c0, out);
  } else if (p <= b1 + BAND) {
    blendInto(c0, c1, ef.sym(clamp01((p - (b1 - BAND)) / BAND_WIDTH)), staggerPosition('cap-1'), out);
  } else if (p < b2 - BAND) {
    copyPoses(c1, out);
  } else if (p <= b2 + BAND) {
    blendInto(c1, c2, ef.sym(clamp01((p - (b2 - BAND)) / BAND_WIDTH)), staggerPosition('cap-2'), out);
  } else {
    copyPoses(c2, out);
  }
}

/** The timed move into card c, at elapsed seconds, from the poses it started from. */
function timedInto(from: readonly Pose[], card: number, elapsed: number, portrait: boolean, out: Pose[]): void {
  const to = formationFor(CARD_FORMATION[card], portrait);
  const plan = PLANS[card];
  for (let i = 0; i < BLOCK_COUNT; i += 1) {
    const tau = clamp01((elapsed - plan.start[i]) / plan.duration[i]);
    lerpPose(from[i], to[i], plan.ease[i](tau), out[i]);
  }
}

/** The index in a card-activation event, or null for anything that is not one of the three cards. */
function readCard(event: Event): number | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return null;
  const index: unknown = (detail as { index?: unknown }).index;
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < CARDS ? index : null;
}

/** The hovered card, -1 for none (index null), or undefined for a detail that is neither. */
function readHover(event: Event): number | undefined {
  if (!(event instanceof CustomEvent)) return undefined;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return undefined;
  const index: unknown = (detail as { index?: unknown }).index;
  if (index === null) return -1;
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < CARDS ? index : undefined;
}

/**
 * The t for which ef.sym(t) = v (bisection on the monotone curve). rig.blend applies ef.sym to its progress, and the
 * bleed progress is already eased (D22.8), so the entry passes symArg(p1) and the camera moves linearly in p1.
 */
function symArg(v: number): number {
  if (!(v > 0)) return 0;
  if (v >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < SYM_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2;
    if (ef.sym(mid) < v) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Builds the capabilities handle on the shared world: the entry, the card formations, the timed moves and the hover lift. */
function setup(world: GLWorld): SectionGLHandle {
  registerEases();
  const { stage, blocks, rig } = world;
  const canvas = stage.canvas;

  /** The poses last written to the blocks. A timed move starts from them. */
  const shown = makePoses();
  /** The formation poses of p, the timed move, the timed move's starting poses and the entry pose, reused each frame. */
  const driven = makePoses();
  const timed = makePoses();
  const timedFrom = makePoses();
  const entry = makePoses();
  copyPoses(formationFor('cap-0', false), shown);

  /** The viewport and the camera keys of it. The keys are built once per size. */
  const size = { width: 1, height: 1 };
  const keys = new Map<KeyName, CameraKey>();
  function keyOf(name: KeyName): CameraKey {
    const known = keys.get(name);
    if (known !== undefined) return known;
    const key = cameraKey(name, size);
    keys.set(name, key);
    return key;
  }

  /** The values of the last call: the section before this one, the orientation and reduced motion. */
  let prev: SectionGL | null = null;
  let portrait = false;
  let reduced = false;

  let active = false;
  let disposed = false;
  /** The bleed progress the entry was last written at, or NaN when it must be written again. */
  let lastE = Number.NaN;
  /** True when the next write must happen whatever the state is. */
  let forceWrite = true;
  /** The card whose rows the blocks last treated as the active group, or -1. */
  let groupShown = -1;
  /** The card held by an activation, or -1. */
  let held = -1;
  /** performance.now() at the latest activation. Input with an earlier timestamp is the activating input. */
  let activatedAt = Number.NEGATIVE_INFINITY;
  /** Weight of the timed move in the written pose: 1 while held, eased to 0 on an input release. */
  const hold = { w: 0 };
  /** Seconds of the timed move, as a fraction of TIMED_TOTAL, from 0 to 1 over TIMED_TOTAL. */
  const clock = { v: 0 };
  /** The card whose timed move is in effect, or -1 when none. */
  let timedCard = -1;
  let timedDone = true;
  /** The card the pointer hovers, as the last hover event reported it, and the card whose lift is applied. */
  let hoverWant = -1;
  let hoverCard = -1;
  /** Reduced motion: the card on screen, the crossfade phase and its start time (tick time). */
  let shownCard = -1;
  let swPhase: 'idle' | 'out' | 'in' = 'idle';
  let swStart = 0;

  function setOpacity(value: number): void {
    canvas.style.opacity = value >= 1 ? '' : value.toFixed(4);
  }

  /** Reads the context of a call. A new size rebuilds the keys; a change of reduced motion drops the timed state. */
  function remember(ctx: SectionGLContext): void {
    prev = ctx.prev;
    portrait = ctx.portrait;
    if (ctx.size.width !== size.width || ctx.size.height !== size.height) {
      size.width = ctx.size.width;
      size.height = ctx.size.height;
      keys.clear();
      forceWrite = true;
    }
    if (ctx.reducedMotion !== reduced) {
      reduced = ctx.reducedMotion;
      resetState();
    }
  }

  /** Drops the timed move, the hold, the crossfade and the group, so the next write starts clean. Writes nothing. */
  function resetState(): void {
    gsap.killTweensOf(hold);
    gsap.killTweensOf(clock);
    held = -1;
    hold.w = 0;
    timedCard = -1;
    timedDone = true;
    if (swPhase !== 'idle') setOpacity(1);
    swPhase = 'idle';
    shownCard = -1;
    groupShown = -1;
    lastE = Number.NaN;
    forceWrite = true;
  }

  function setGroup(card: number): void {
    if (card === groupShown) return;
    groupShown = card;
    blocks.setActiveGroup(CARD_ROWS[card]);
  }

  function setCardLift(card: number, dz: number): void {
    for (const i of CARD_ROWS[card]) blocks.setLift(i, 0, dz);
  }

  function clearLifts(): void {
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
    hoverCard = -1;
    hoverWant = -1;
  }

  /** Applies the hover lift to the card the last hover event named. Called from update() only (D22.9). */
  function applyHover(): void {
    if (hoverWant === hoverCard) return;
    if (hoverCard >= 0) setCardLift(hoverCard, 0);
    hoverCard = hoverWant;
    if (hoverCard >= 0) setCardLift(hoverCard, LIFT_BU);
  }

  /** The entry pose at bleed progress e: the race (or the previous section's exit formation) to cap-0, scrubbed with t = e. */
  function entryInto(e: number, out: Pose[]): void {
    const to = formationFor('cap-0', portrait);
    const from = prev === null ? to : formationFor(prev.exitFormation ?? prev.formation, portrait);
    blendInto(from, to, e, staggerPosition('cap-0'), out);
  }

  /** The camera at bleed progress e: from the previous section's key to the hero key, linear in e (D22.8). */
  function writeCamera(e: number): void {
    if (e >= 1) {
      rig.blend(keyOf('hero'), keyOf('hero'), 1);
      return;
    }
    rig.blend(keyOf(prev === null ? 'hero' : prev.key), keyOf('hero'), symArg(e));
  }

  /** The timed move into card c, from the poses on screen now. */
  function startTimed(card: number): void {
    resetHoldTweens();
    copyPoses(shown, timedFrom);
    held = card;
    hold.w = 1;
    timedCard = card;
    timedDone = false;
    clock.v = 0;
    gsap.to(clock, {
      v: 1,
      duration: TIMED_TOTAL,
      ease: 'none',
      onComplete: () => {
        timedDone = true;
        forceWrite = true;
      },
    });
    forceWrite = true;
  }

  function resetHoldTweens(): void {
    gsap.killTweensOf(hold);
    gsap.killTweensOf(clock);
  }

  /** The page has landed on the held card with its move done: p now drives the same formation, so the hold is dropped at once. */
  function releaseAtLanding(): void {
    held = -1;
    gsap.killTweensOf(hold);
    hold.w = 0;
    timedCard = -1;
    forceWrite = true;
  }

  /** The reader's input ends the hold. The timed weight fades out over T.micro, so the formation does not jump. */
  function releaseByInput(): void {
    held = -1;
    if (reduced) return;
    gsap.killTweensOf(hold);
    gsap.to(hold, {
      w: 0,
      duration: T.micro,
      ease: E.settle,
      onComplete: () => {
        timedCard = -1;
        forceWrite = true;
      },
    });
    forceWrite = true;
  }

  /** Not current: the entry at the bleed progress p1, written when p1 has moved (D22.8). */
  function updateEntry(e: number): void {
    if (forceWrite || e !== lastE) {
      entryInto(e, shown);
      blocks.setPoses(shown);
      lastE = e;
      forceWrite = false;
    }
    writeCamera(e);
  }

  /**
   * Current, not reduced motion: the formation from p, over the entry residue while p1 has not settled, with the held
   * timed move and the group of the card on screen. Written every frame, because the bleed still moves after the
   * section becomes current.
   */
  function updateActive(p: number, e: number): void {
    if (held >= 0 && timedDone && p >= PURE[held][0] && p <= PURE[held][1]) releaseAtLanding();
    setGroup(held >= 0 ? held : cardOf(p));
    applyHover();
    let c0: readonly Pose[] = formationFor('cap-0', portrait);
    if (e < 1) {
      entryInto(e, entry);
      c0 = entry;
    }
    drivenInto(p, c0, portrait, driven);
    if (timedCard >= 0 && hold.w > 0) {
      timedInto(timedFrom, timedCard, clock.v * TIMED_TOTAL, portrait, timed);
      for (let i = 0; i < BLOCK_COUNT; i += 1) lerpPose(driven[i], timed[i], hold.w, shown[i]);
    } else {
      copyPoses(driven, shown);
    }
    blocks.setPoses(shown);
    forceWrite = false;
    writeCamera(e);
  }

  /**
   * Active, reduced motion: the card on screen follows p in discrete steps. Each change of card runs the two-step
   * crossfade of C14 over T.half: the canvas fades out, the formation changes at opacity 0, and the canvas fades in.
   */
  function updateReduced(p: number, now: number): void {
    if (held >= 0 && cardOf(p) === held) held = -1;
    const desired = held >= 0 ? held : cardOf(p);
    setGroup(desired);
    if (hoverCard >= 0) {
      hoverWant = -1;
      applyHover();
    }
    rig.blend(keyOf('hero'), keyOf('hero'), 1);
    if (shownCard < 0) {
      blocks.setPoses(formationFor(CARD_FORMATION[desired], portrait));
      shownCard = desired;
      return;
    }
    if (swPhase === 'idle' && desired !== shownCard) {
      swPhase = 'out';
      swStart = now;
    }
    if (swPhase === 'out') {
      const k = clamp01((now - swStart) / T.half);
      if (k < 1) {
        setOpacity(1 - ef.fade(k));
        return;
      }
      blocks.setPoses(formationFor(CARD_FORMATION[desired], portrait));
      shownCard = desired;
      swPhase = 'in';
      swStart = now;
      setOpacity(0);
      return;
    }
    if (swPhase === 'in') {
      const k = clamp01((now - swStart) / T.half);
      if (k < 1) {
        setOpacity(ef.fade(k));
        return;
      }
      swPhase = 'idle';
      setOpacity(1);
    }
  }

  function onActivate(event: Event): void {
    const card = readCard(event);
    if (card === null) return;
    activatedAt = performance.now();
    if (disposed || !active) return;
    if (reduced) {
      held = card;
      forceWrite = true;
      return;
    }
    startTimed(card);
  }

  /** Records the hovered card. The lift itself is applied by update() (D22.9). */
  function onHover(event: Event): void {
    if (disposed || !active || reduced || !env.finePointer) return;
    const card = readHover(event);
    if (card !== undefined) hoverWant = card;
  }

  /** Wheel, touch and key input end a hold. Input older than the activation is the one that caused it, so it does not count. */
  function onInput(event: Event): void {
    if (disposed || !active || held < 0) return;
    if (event.timeStamp <= activatedAt) return;
    releaseByInput();
  }

  function deactivate(): void {
    active = false;
    resetState();
    clearLifts();
  }

  document.addEventListener(ACTIVATE_EVENT, onActivate);
  document.addEventListener(HOVER_EVENT, onHover);
  window.addEventListener('wheel', onInput, { passive: true });
  window.addEventListener('touchstart', onInput, { passive: true });
  window.addEventListener('keydown', onInput);

  return {
    update(progress: number, tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      remember(ctx);
      const p = clamp01(progress);
      const e = clamp01(ctx.bleed.p1);
      if (reduced) {
        if (active) updateReduced(p, tick.time);
        return;
      }
      if (active) updateActive(p, e);
      else updateEntry(e);
    },

    setActive(on: boolean, ctx: SectionGLContext): void {
      if (disposed) return;
      remember(ctx);
      if (on) {
        active = true;
        resetState();
        clearLifts();
        blocks.setTilt(0, 0);
        blocks.setGroupOffset(0, 0, 0);
        return;
      }
      deactivate();
    },

    dispose(): void {
      if (disposed) return;
      if (active) deactivate();
      resetState();
      disposed = true;
      document.removeEventListener(ACTIVATE_EVENT, onActivate);
      document.removeEventListener(HOVER_EVENT, onHover);
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('touchstart', onInput);
      window.removeEventListener('keydown', onInput);
    },
  };
}

/** The capabilities section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const capabilitiesGL: SectionGL = {
  id: 'capabilities',
  formation: 'cap-0',
  exitFormation: 'cap-2',
  key: 'hero',
  ink: 1,
  dof: null,
  breath: BREATH,
  setup,
};
