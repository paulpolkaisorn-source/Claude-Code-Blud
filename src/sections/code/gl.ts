// The code section's 3D layer: the recede (direction-act2.md section 12, code; direction-3d.md sections
// 10.6, 10.12, 10.13 and 11.7). It imports the shared GL modules, the timing, ease and pointer modules,
// and nothing from the section's 2D code. The 2D layer and the choreography reach it only through the
// SectionGL object below.
//
// Entry and recede. Over p from 0 to 0.5 the 17 blocks move from the capabilities exit (cap-2, with its
// stair) to recede, the stanza at 0.62 of its size, set back to z -4. The formation time is t = sym(p / 0.5).
// Block i takes local progress scrubLocal(j, 17, t, { total 0.35, lead 0.10 }) at its stagger position j in
// the recede order. The kireji (block 4) eases on anticipate and the other 16 on settle (C10). The camera
// holds the hero keyframe (C6).
//
// Breath. Once the recede has arrived (p at least 0.5) the blocks breathe with the row phases of C15. Each
// block starts T.hold after the request, which blocks.ts applies.
//
// Pointer. On a fine pointer the group moves with the pointer, 0.2 bu on each axis, and blocks.ts damps it
// with T.half (C12, direction-3d 10.13). Reduced motion and touch get no pointer response.
//
// Depth of field. The section's dof value (focus 21.15 bu, bokeh 2.0 px) is read by the choreography, which
// calls post.setDof on section entry and exit. This handle does not set it.
import { ef } from '../../core/ease';
import { env } from '../../core/env';
import { pointer } from '../../core/pointer';
import type { Tick } from '../../core/ticker';
import { scrubLocal } from '../../core/timing';
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

/** The camera keyframe this section rests on (direction-3d 10.6, C6). */
const KEY: KeyName = 'hero';
/** The formation this section rests in (direction-3d 11.7). */
const FORMATION: FormationId = 'recede';
/** The progress at which the recede has arrived (C2 and the Sequence of section 12, code). */
const RECEDE_END = 0.5;
/** The scrub profile of a formation move (direction-3d 11.1 and architecture section 6). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** The pointer translation of the recede group, in bu per unit of pointer position (C12, 10.13). */
const POINTER_BU = 0.2;
/** The idle breath once the recede has arrived (direction-3d 10.12, C15). */
const BREATH: BreathMode = { amplitude: 0.012, phase: 'rows' };

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** The formation the entry starts from: the previous section's exit, or this section's own when there is none. */
function entryFormation(prev: SectionGL | null): FormationId {
  if (prev === null) return FORMATION;
  return prev.exitFormation ?? prev.formation;
}

/** Builds the handle over the shared world. The poses and camera keys are allocated here, not per frame. */
function setup(world: GLWorld): SectionGLHandle {
  const { blocks, rig } = world;
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  const order = staggerPosition(FORMATION);
  const keys = new Map<KeyName, CameraKey>();
  const keySize = { width: 0, height: 0 };

  let active = false;
  let disposed = false;
  let breathOn = false;

  /** The camera key by name for this canvas size. The cache is cleared when the size changes. */
  function keyFor(name: KeyName, size: { width: number; height: number }): CameraKey {
    if (size.width !== keySize.width || size.height !== keySize.height) {
      keys.clear();
      keySize.width = size.width;
      keySize.height = size.height;
    }
    const cached = keys.get(name);
    if (cached !== undefined) return cached;
    const key = cameraKey(name, size);
    keys.set(name, key);
    return key;
  }

  /** Starts or stops the breath. A request is made once per change, so the blocks arm the hold once. */
  function setBreath(on: boolean): void {
    if (on && !breathOn) {
      breathOn = true;
      blocks.setBreath(BREATH);
    } else if (!on) {
      breathOn = false;
      blocks.setBreath(null);
    }
  }

  return {
    update(progress: number, _tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      const s = clamp01(progress);
      const reduced = ctx.reducedMotion;

      // Entry and recede. Reduced motion completes the move at once, so u is 1.
      const u = reduced ? 1 : clamp01(s / RECEDE_END);
      const t = ef.sym(u);
      const from = formationFor(entryFormation(ctx.prev), ctx.portrait);
      const to = formationFor(FORMATION, ctx.portrait);
      for (let i = 0; i < BLOCK_COUNT; i += 1) {
        const local = scrubLocal(order[i], BLOCK_COUNT, t, SCRUB);
        const curve = i === KIREJI ? ef.anticipate(local) : ef.settle(local);
        lerpPose(from[i], to[i], curve, poses[i]);
      }
      blocks.setPoses(poses);

      // Camera. The hero key is held. A blend from the previous section's key, if it differs, runs over
      // the same window; rig.blend applies sym itself, so it takes the linear u.
      rig.blend(keyFor(ctx.prev?.key ?? KEY, ctx.size), keyFor(KEY, ctx.size), u);

      // Breath, from the arrival of the recede. Not in reduced motion.
      setBreath(active && !reduced && s >= RECEDE_END);

      // Pointer translation of the group, on a fine pointer only. blocks.ts damps it with T.half.
      const pointerOn = active && !reduced && env.finePointer && !env.touch;
      blocks.setGroupOffset(pointerOn ? pointer.sx * POINTER_BU : 0, pointerOn ? pointer.sy * POINTER_BU : 0, 0);
    },

    setActive(on: boolean, _ctx: SectionGLContext): void {
      if (disposed) return;
      active = on;
      // This section takes the whole stanza. No breath, smear, tilt, lift or group offset is left over from
      // the section before it: the capabilities section narrows the breath to its active group and lifts its
      // groups. The breath is armed again by update() once the recede has arrived.
      breathOn = false;
      blocks.setBreath(null);
      blocks.setActiveGroup(null);
      blocks.setSmear(0);
      blocks.setTilt(0, 0);
      for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
      blocks.setGroupOffset(0, 0, 0);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      active = false;
      breathOn = false;
      blocks.setBreath(null);
      blocks.setGroupOffset(0, 0, 0);
    },
  };
}

/** The code section's GL layer, found by src/gl/boot.ts. */
export const codeGL: SectionGL = {
  id: 'code',
  formation: FORMATION,
  key: KEY,
  ink: 1,
  dof: { focus: 21.15, bokeh: 2.0 },
  breath: BREATH,
  setup,
};
