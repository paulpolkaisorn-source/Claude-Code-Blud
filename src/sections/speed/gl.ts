// The speed section's 3D layer (design/direction-act1.md, speed: 3D layer, Pointer, Touch and Reduced motion;
// design/direction-3d.md sections 10.6, 10.8, 10.11 to 10.13 and 11.3; decisions D5, D15.1, D18, D21.2 and D22 in
// design/drafts/director-decisions.md).
//
// Race entry, scrubbed over the first quarter of the section's progress. With u = clamp(s / 0.25, 0, 1), the 17
// blocks move from the hero's exit pose (the stanza open at progress 1: pitch 0.95, row offsets 1.13) to the race
// (direction-3d 11.3; a column on a phone, D15.1). Block i takes its local progress from scrubLocal on its race
// stagger position (total 0.35, lead 0.10). The kireji, stagger position 0, takes ef.anticipate and the other sixteen
// take ef.settle. The camera blends from the previous section's key (the hero) to the speed key through rig.blend,
// which applies ef.sym. At u = 1 everything holds.
//
// The choreography draws the smear (smear: true) and sets the depth of field from dof. Two values here depend on the
// viewport or on u, so this layer sets them itself: the depth of field focus is the speed key's distance from the
// z = 0 plane (31.95 bu at 1440 by 900, 51.12 bu on a phone; direction-3d 10.8, D22.2), and the breath starts T.hold
// after u reaches 1 (act I speed, 3D layer), whatever the choreography requested when the section became current.
//
// Pointer and touch (act I speed; direction-3d 10.13; D22.10). At rest (u = 1, reduced motion off), one block at a
// time is lifted by LIFT_BU. The lifted block is the one under a fine pointer that is not touch (hover), or the one
// last tapped. A tap on a block lifts it, a tap on the lifted block drops it, and a tap on another block moves the
// lift there. On a landscape viewport the lift runs along y, through blocks.setLift, as before. On a portrait
// viewport (phones, D15.1) it runs along screen x, which is the pose's x after the portrait turn, so the block moves
// sideways across the column and not along it. Both lifts damp with T.half. Taps that start on the speed head (title,
// kicker and notes), on the example panel or on a control do not lift a block (act I speed, Touch).
//
// Hit tests use projection P1 on the race footprints without the lift (act rule A6), so a lifted block does not move
// its own hit area away from the pointer. They read the raw pointer position (pointer.clientX and pointer.clientY),
// not pointer.sx and pointer.sy: pointer.ts damps those with T.half, which would leave the hit point up to 0.35 s of
// pointer travel behind the cursor.
//
// Writes. The shared world is written only from update() and setActive() (D22.9). The touch listeners record a tap in
// this handle and nothing else; the next update() turns the record into the lift, the poses and the breath. Under
// reduced motion there are no lifts, no taps and no breath.
import type { BreathMode } from '../../gl/blocks/blocks';
import { BLOCK_COUNT, formationFor, lerpPose, staggerPosition, type Pose } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type { CameraKey, GLWorld, KeyName, SectionGL, SectionGLContext, SectionGLHandle } from '../../gl/section-gl';
import { ef } from '../../core/ease';
import { env } from '../../core/env';
import { pointer } from '../../core/pointer';
import { formationRects, type ScreenRect, type Size } from '../../core/projection';
import type { Tick } from '../../core/ticker';
import { T, scrubLocal } from '../../core/timing';
import { heroExitPoses } from '../hero/gl';

/** Section progress over which the race runs: u = clamp(s / 0.25, 0, 1), so the race is complete at 0.75 vh of scroll. */
const RACE_SPAN = 0.25;
/** Scrub profile of the race (architecture section 6, direction-3d 11.1). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** The race breath (direction-3d 10.12): amplitude in bu, phase 0 for all 17 blocks. */
const BREATH: BreathMode = { amplitude: 0.012, phase: 'zero' };
/** The lift of the hovered or tapped block, in bu: along y on a landscape viewport, along x on a phone (D22.10). */
const LIFT_BU = 0.15;
/** Depth of field bokeh scale in px (direction-3d 10.8). The focus is the speed key's z, set in update(). */
const DOF_BOKEH = 1.2;
/** Largest travel, in CSS px, between a touch down and its up that still counts as a tap. */
const TAP_SLOP_PX = 10;
/**
 * A touch that starts on one of these does not tap a block: controls, the speed head (title, kicker and notes) and the
 * example panel take no taps (act I speed, Touch).
 */
const NO_TAP = 'a, button, input, select, textarea, label, [contenteditable="true"], .speed-head, .speed-panel';
/** The race stagger position of each block: element i is the position k of block i (direction-3d 11.3). */
const RACE_POSITION = staggerPosition('race');
/** A damped value this close to its target lands on it, as in blocks.ts. */
const SNAP = 1e-7;
/** The breath last requested of the shared blocks: not yet requested since activation, off, or on. */
const BREATH_UNSET = -1;
const BREATH_OFF = 0;
const BREATH_ON = 1;

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** One step of a value toward its target, with a = 1 - exp(-dt / T.half), so the gap shrinks the same at any frame rate. */
function damp(value: number, target: number, a: number): number {
  const next = value + (target - value) * a;
  return Math.abs(target - next) < SNAP ? target : next;
}

/** True when the event target takes no tap, so a touch that starts on it does not lift a block. */
function takesNoTap(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(NO_TAP) !== null;
}

/** Builds the speed handle on the shared world: the race entry, the camera, the breath, the lifts and the taps. */
function setup(world: GLWorld): SectionGLHandle {
  const { blocks, post, rig } = world;
  /** The hero's exit pose, where the race starts. It does not depend on the viewport, so it is read once. */
  const exit: readonly Pose[] = heroExitPoses(false, []);
  /** The 17 poses written each frame. blocks.setPoses copies them, so this array is reused. */
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  /** The P1 footprints of the race, reused by the hit tests. They never include a lift. */
  const rects: ScreenRect[] = [];
  /** The viewport of the last update, copied in place. */
  const size: Size = { width: 1, height: 1 };
  /** The camera keys of this viewport, by name, rebuilt when the size changes. */
  const keys = new Map<KeyName, CameraKey>();
  let keyWidth = -1;
  let keyHeight = -1;
  /** The y lift last passed to blocks.setLift for each block on a landscape viewport. 0 at rest. */
  const sentY = new Float64Array(BLOCK_COUNT);
  /** The damped sideways lift of each block on a portrait viewport. It is added to the block's pose x. */
  const liftX = new Float64Array(BLOCK_COUNT);
  /** The block under a fine pointer at rest, or -1. update() sets it. */
  let hovered = -1;
  /** The block lifted by a tap, or -1. The touch listener sets it, and update() draws it. */
  let tapped = -1;
  /** A touch that may become a tap: its pointer id, its start point and the block under it (-1 for none). */
  let pendingTap: { id: number; x: number; y: number; index: number } | null = null;
  let active = false;
  let disposed = false;
  /** True when the race is complete and reduced motion is off: the only state in which lifts and taps act. */
  let atRest = false;
  /** The breath state last requested of the shared blocks (BREATH_UNSET, BREATH_OFF or BREATH_ON). */
  let breathSent = BREATH_UNSET;
  /** The focus last given to the depth of field, or NaN when none has been given since the section was activated. */
  let focusSet = Number.NaN;

  /** The camera key of a name for the current size. The key is built once per size and then reused. */
  function keyOf(name: KeyName): CameraKey {
    if (size.width !== keyWidth || size.height !== keyHeight) {
      keys.clear();
      keyWidth = size.width;
      keyHeight = size.height;
    }
    const known = keys.get(name);
    if (known !== undefined) return known;
    const key = cameraKey(name, size);
    keys.set(name, key);
    return key;
  }

  /** The block whose race footprint, at the current camera, holds the point (x, y) in CSS px, or -1. */
  function blockAt(x: number, y: number): number {
    formationRects('race', 'speed', size, rects);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const r = rects[i];
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return i;
    }
    return -1;
  }

  /** Writes the 17 race poses for race progress u, from the previous section's exit pose, plus each block's sideways lift. */
  function writePoses(u: number, prev: SectionGL | null, portrait: boolean): void {
    const from: readonly Pose[] =
      prev === null || prev.id === 'hero' ? exit : formationFor(prev.exitFormation ?? prev.formation, portrait);
    const to = formationFor('race', portrait);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const k = RACE_POSITION[i];
      const q = scrubLocal(k, BLOCK_COUNT, u, SCRUB);
      const e = k === 0 ? ef.anticipate(q) : ef.settle(q);
      const pose = poses[i];
      lerpPose(from[i], to[i], e, pose);
      pose.p[0] += liftX[i];
    }
    blocks.setPoses(poses);
  }

  /** Leaves the shared world at rest for the next section: no lifts, no tilt, no group offset and no breath. */
  function tidy(): void {
    active = false;
    atRest = false;
    hovered = -1;
    tapped = -1;
    pendingTap = null;
    // The y lift goes back through blocks.setLift and damps out there. The sideways lift is part of the poses this layer
    // wrote last, and this layer no longer updates, so it comes out of those poses here. The next section writes its
    // own poses in the same frame.
    let shifted = false;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      if (liftX[i] !== 0) {
        poses[i].p[0] -= liftX[i];
        shifted = true;
      }
    }
    if (shifted) blocks.setPoses(poses);
    liftX.fill(0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      sentY[i] = 0;
      blocks.setLift(i, 0);
    }
    blocks.setBreath(null);
    breathSent = BREATH_OFF;
    focusSet = Number.NaN;
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
  }

  // The touch listeners only record a tap in this handle. update() draws it, so the shared world is written from
  // update() and setActive() alone (D22.9).
  function onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || !active || !atRest || takesNoTap(e.target)) {
      pendingTap = null;
      return;
    }
    pendingTap = { id: e.pointerId, x: e.clientX, y: e.clientY, index: blockAt(e.clientX, e.clientY) };
  }

  function onPointerUp(e: PointerEvent): void {
    const start = pendingTap;
    if (start === null || e.pointerId !== start.id) return;
    pendingTap = null;
    if (!active || !atRest || start.index < 0) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return;
    // A tap on the lifted block drops it. A tap on any other block moves the lift there.
    tapped = tapped === start.index ? -1 : start.index;
  }

  function onPointerCancel(e: PointerEvent): void {
    if (pendingTap !== null && e.pointerId === pendingTap.id) pendingTap = null;
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('pointercancel', onPointerCancel, { passive: true });

  return {
    update(progress: number, tick: Tick, ctx: SectionGLContext): void {
      if (disposed || !active) return;
      size.width = ctx.size.width;
      size.height = ctx.size.height;
      const rm = ctx.reducedMotion;
      const portrait = ctx.portrait;
      // Reduced motion completes the race at once (direction-act1 speed, reduced motion; the choreography cross-fades).
      const u = rm ? 1 : clamp01(progress / RACE_SPAN);
      const to = keyOf('speed');
      const from = keyOf(ctx.prev === null ? 'hero' : ctx.prev.key);
      const rest = u >= 1 && !rm;
      atRest = rest;

      // The hovered block: a fine pointer that is not touch, at rest. The raw pointer position is the hit point (see the
      // header). Off the rest state, neither a hover nor a tap lifts anything, and a tap is dropped.
      if (rest) {
        hovered =
          env.finePointer && !env.touch && pointer.inside && pointer.type !== 'touch'
            ? blockAt(pointer.clientX, pointer.clientY)
            : -1;
      } else {
        hovered = -1;
        tapped = -1;
      }

      // The lift (D22.10). Landscape: blocks.setLift on y, sent only when its value changes, because blocks damps it.
      // Portrait: the lift on x, damped here and added to the pose below. The axis that is not in use returns to rest.
      const a = tick.dt > 0 ? 1 - Math.exp(-tick.dt / T.half) : 0;
      for (let i = 0; i < BLOCK_COUNT; i += 1) {
        const want = i === hovered || i === tapped ? LIFT_BU : 0;
        const dy = portrait ? 0 : want;
        if (sentY[i] !== dy) {
          sentY[i] = dy;
          blocks.setLift(i, dy);
        }
        liftX[i] = damp(liftX[i], portrait ? want : 0, a);
      }

      writePoses(u, ctx.prev, portrait);
      rig.blend(from, to, u);

      // The depth of field focus is the speed key's distance (direction-3d 10.8, D22.2). The pass itself is removed under
      // reduced motion by the post stack.
      const focus = to.position[2];
      if (focus !== focusSet) {
        focusSet = focus;
        post.setDof({ focus, bokeh: DOF_BOKEH });
      }

      // The breath starts T.hold after the race completes (act I speed). It is requested only when its state changes, so
      // a section that enters after this one keeps the breath it asked for.
      const breathWanted = rest ? BREATH_ON : BREATH_OFF;
      if (breathSent !== breathWanted) {
        breathSent = breathWanted;
        blocks.setBreath(rest ? BREATH : null);
      }
    },

    setActive(on: boolean, _ctx: SectionGLContext): void {
      if (disposed) return;
      if (on) {
        active = true;
        atRest = false;
        hovered = -1;
        tapped = -1;
        pendingTap = null;
        breathSent = BREATH_UNSET;
        focusSet = Number.NaN;
        liftX.fill(0);
        for (let i = 0; i < BLOCK_COUNT; i += 1) {
          sentY[i] = 0;
          blocks.setLift(i, 0);
        }
        blocks.setTilt(0, 0);
        blocks.setGroupOffset(0, 0, 0);
        return;
      }
      tidy();
    },

    dispose(): void {
      if (disposed) return;
      if (active) tidy();
      disposed = true;
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}

/** The speed section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const speedGL: SectionGL = {
  id: 'speed',
  formation: 'race',
  key: 'speed',
  ink: 0,
  dof: { focus: 31.95, bokeh: DOF_BOKEH },
  breath: BREATH,
  smear: true,
  setup,
};
