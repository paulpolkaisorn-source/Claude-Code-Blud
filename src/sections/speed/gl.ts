// The speed section's 3D layer (design/direction-act1.md, speed: 3D layer, Scroll, Pointer, Touch and Reduced
// motion; design/direction-3d.md sections 10.6, 10.8, 10.11 to 10.13 and 11.3; decisions D5, D15.1 and D18 in
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
// viewport or on u, so this layer sets them itself: the depth of field focus is the speed key's z (31.95 bu at
// 1440 by 900, 51.12 bu on a phone, direction-3d 10.8), and the breath starts T.hold after u reaches 1 (act I
// speed, 3D layer), whatever the choreography requested when the section became current.
//
// Pointer and touch (act I speed; direction-3d 10.13). At rest (u = 1), with a fine pointer that is not touch, the
// block under the pointer lifts 0.15 bu on y through blocks.setLift and comes back when the pointer leaves. A tap on
// a block toggles its lift the same way. Reduced motion has no lifts and no pointer response.
//
// Hit tests use projection P1 on the race footprints without the lift (act rule A6), so a lifted block does not move
// its own hit area away from the pointer. They read the raw pointer position (pointer.clientX and pointer.clientY),
// not pointer.sx and pointer.sy: pointer.ts damps those with T.half, which would leave the hit point up to 0.35 s of
// pointer travel behind the cursor. blocks.setLift damps the lift itself with T.half, the 3D pointer damping of
// direction-3d 10.13, so the lift takes a little longer than the act's settle over T.beat5.
import type { BreathMode } from '../../gl/blocks/blocks';
import { BLOCK_COUNT, formationFor, lerpPose, staggerPosition, type Pose } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type { CameraKey, GLWorld, KeyName, SectionGL, SectionGLContext, SectionGLHandle } from '../../gl/section-gl';
import { ef } from '../../core/ease';
import { env } from '../../core/env';
import { pointer } from '../../core/pointer';
import { formationRects, type ScreenRect, type Size } from '../../core/projection';
import type { Tick } from '../../core/ticker';
import { scrubLocal } from '../../core/timing';
import { heroExitPoses } from '../hero/gl';

/** Section progress over which the race runs: u = clamp(s / 0.25, 0, 1), so the race is complete at 0.75 vh of scroll. */
const RACE_SPAN = 0.25;
/** Scrub profile of the race (architecture section 6, direction-3d 11.1). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** The race breath (direction-3d 10.12): amplitude in bu, phase 0 for all 17 blocks. */
const BREATH: BreathMode = { amplitude: 0.012, phase: 'zero' };
/** The lift of the block under the pointer or of a tapped block, in bu on y (direction-3d 10.13). */
const LIFT_BU = 0.15;
/** Depth of field bokeh scale in px (direction-3d 10.8). The focus is the speed key's z, set in update(). */
const DOF_BOKEH = 1.2;
/** Largest travel, in CSS px, between a touch down and its up that still counts as a tap. */
const TAP_SLOP_PX = 10;
/** A tap that starts on one of these belongs to the control, so it does not lift a block. */
const CONTROL = 'a, button, input, select, textarea, label, [contenteditable="true"]';
/** The race stagger position of each block: element i is the position k of block i (direction-3d 11.3). */
const RACE_POSITION = staggerPosition('race');

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** True when the event target is a control, so the tap belongs to the control and not to the blocks. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONTROL) !== null;
}

/** Builds the speed handle on the shared world: the race entry, the camera, the breath, the lifts and the taps. */
function setup(world: GLWorld): SectionGLHandle {
  const { blocks, post, rig } = world;
  /** The hero's exit pose, where the race starts. It does not depend on the viewport, so it is read once. */
  const exit: readonly Pose[] = heroExitPoses(false, []);
  /** The 17 poses written each frame. blocks.setPoses copies them, so this array is reused. */
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  /** The P1 footprints of the race, reused by the hit tests. */
  const rects: ScreenRect[] = [];
  /** The viewport of the last update, copied in place. */
  const size: Size = { width: 1, height: 1 };
  /** The camera keys of this viewport, by name, rebuilt when the size changes. */
  const keys = new Map<KeyName, CameraKey>();
  let keyWidth = -1;
  let keyHeight = -1;
  /** The lift last sent to blocks.setLift for each block: 1 when lifted, 0 at rest. */
  const lifted = new Uint8Array(BLOCK_COUNT);
  /** Blocks lifted by a tap. A second tap on the same block lowers it. */
  const tapped = new Uint8Array(BLOCK_COUNT);
  /** The block under the pointer, or -1. */
  let hovered = -1;
  /** A touch that may become a tap: its pointer id, its start point and the block under it (-1 for none). */
  let pendingTap: { id: number; x: number; y: number; index: number } | null = null;
  let active = false;
  let disposed = false;
  /** True when the race is complete and reduced motion is off: the only state in which lifts and taps act. */
  let atRest = false;
  /** True while this layer has requested the breath from blocks. */
  let breathOn = false;
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

  /** Sends block i its lift: lifted while a tap holds it or the pointer is on it. */
  function refreshLift(i: number): void {
    const want: 0 | 1 = tapped[i] === 1 || hovered === i ? 1 : 0;
    if (lifted[i] === want) return;
    lifted[i] = want;
    blocks.setLift(i, want === 1 ? LIFT_BU : 0);
  }

  /** Drops every lift this layer holds: the hover and the taps. */
  function clearLifts(): void {
    hovered = -1;
    tapped.fill(0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) refreshLift(i);
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

  /** Writes the 17 race poses for race progress u, starting from the previous section's exit pose. */
  function writePoses(u: number, prev: SectionGL | null, portrait: boolean): void {
    const from: readonly Pose[] =
      prev === null || prev.id === 'hero' ? exit : formationFor(prev.exitFormation ?? prev.formation, portrait);
    const to = formationFor('race', portrait);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const k = RACE_POSITION[i];
      const q = scrubLocal(k, BLOCK_COUNT, u, SCRUB);
      const e = k === 0 ? ef.anticipate(q) : ef.settle(q);
      lerpPose(from[i], to[i], e, poses[i]);
    }
    blocks.setPoses(poses);
  }

  /** Leaves the shared world at rest for the next section: no lifts, no tilt, no group offset and no breath. */
  function tidy(): void {
    active = false;
    atRest = false;
    pendingTap = null;
    clearLifts();
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0);
    lifted.fill(0);
    blocks.setBreath(null);
    breathOn = false;
    focusSet = Number.NaN;
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || !atRest || isControl(e.target)) {
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
    tapped[start.index] = tapped[start.index] === 1 ? 0 : 1;
    refreshLift(start.index);
  }

  function onPointerCancel(e: PointerEvent): void {
    if (pendingTap !== null && e.pointerId === pendingTap.id) pendingTap = null;
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('pointercancel', onPointerCancel, { passive: true });

  return {
    update(progress: number, _tick: Tick, ctx: SectionGLContext): void {
      if (disposed || !active) return;
      size.width = ctx.size.width;
      size.height = ctx.size.height;
      const rm = ctx.reducedMotion;
      // Reduced motion completes the race at once (direction-act1 speed, reduced motion; the choreography cross-fades).
      const u = rm ? 1 : clamp01(progress / RACE_SPAN);
      const to = keyOf('speed');
      const from = keyOf(ctx.prev === null ? 'hero' : ctx.prev.key);
      writePoses(u, ctx.prev, ctx.portrait);
      rig.blend(from, to, u);

      // The depth of field focus is the speed key's distance (direction-3d 10.8). The pass itself is removed under reduced
      // motion by the post stack.
      const focus = to.position[2];
      if (focus !== focusSet) {
        focusSet = focus;
        post.setDof({ focus, bokeh: DOF_BOKEH });
      }

      // The breath starts T.hold after the race completes (act I speed). Until then it is held off.
      const rest = u >= 1 && !rm;
      if (!rest) {
        blocks.setBreath(null);
        breathOn = false;
      } else if (!breathOn) {
        blocks.setBreath(BREATH);
        breathOn = true;
      }

      atRest = rest;
      if (!rest) {
        if (hovered >= 0 || tapped.includes(1)) clearLifts();
        return;
      }
      // Hover: a fine pointer that is not touch, at rest. The raw pointer position is the hit point (see the header).
      const hover =
        env.finePointer && !env.touch && pointer.inside && pointer.type !== 'touch'
          ? blockAt(pointer.clientX, pointer.clientY)
          : -1;
      if (hover !== hovered) {
        const previous = hovered;
        hovered = hover;
        if (previous >= 0) refreshLift(previous);
        if (hover >= 0) refreshLift(hover);
      }
    },

    setActive(on: boolean, _ctx: SectionGLContext): void {
      if (disposed) return;
      if (on) {
        active = true;
        atRest = false;
        breathOn = false;
        focusSet = Number.NaN;
        pendingTap = null;
        blocks.setTilt(0, 0);
        blocks.setGroupOffset(0, 0, 0);
        clearLifts();
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
