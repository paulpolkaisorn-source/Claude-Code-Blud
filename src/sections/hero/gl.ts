// The hero's 3D layer (design/direction-act1.md, hero, 3D layer; direction-3d.md sections 10.13 and 11.11).
// The stanza of 17 blocks opens while the hero scrolls, the camera holds the hero keyframe, and on a fine
// pointer the stanza tilts with the pointer. The choreography applies the rest of heroGL from its fields:
// the breath (breath), the depth of field (dof, null here) and the ink (ink, paper). This file imports from
// src/gl and the core modules only (architecture section 6b). No 2D code imports it.
import { ef } from '../../core/ease';
import { env } from '../../core/env';
import { pointer } from '../../core/pointer';
import { BLOCK_COUNT, FORMATIONS, formationFor, stanzaOpen, type Pose } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type { CameraKey, GLWorld, SectionGL, SectionGLHandle } from '../../gl/section-gl';

/**
 * The stanza at open progress k (direction-3d 11.11), written into out, which is returned. formationFor turns
 * only race and family, so the stanza is the same formation in portrait and landscape, and the same modulation
 * serves both. The check keeps that premise visible: a turned stanza would need its own modulation.
 */
function openPoses(portrait: boolean, k: number, out: Pose[]): Pose[] {
  if (formationFor('stanza', portrait) !== FORMATIONS.stanza) {
    throw new RangeError('hero: formationFor turns the stanza, so the modulation of direction-3d 11.11 needs a rework');
  }
  return stanzaOpen(k, out);
}

/**
 * The hero's exit pose: the stanza at open progress 1 (pitch 0.95, row offsets 1.13). The speed section starts its
 * race from it (direction-act1 speed, 3D layer). Writes into out, reusing its entries, and returns out.
 */
export function heroExitPoses(portrait: boolean, out: Pose[]): Pose[] {
  return openPoses(portrait, 1, out);
}

/**
 * The hero's handle on the shared world. It creates no objects of its own: the stanza is the shared blocks, and
 * the camera is the shared rig.
 */
function setup(world: GLWorld): SectionGLHandle {
  const { blocks, rig } = world;
  // The hero keyframe. cameraKey rewrites it only when the viewport size changes, because the aspect sets it.
  const hero: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: 22 };
  // The 17 poses of the open stanza, reused every frame. blocks.setPoses copies them.
  const open: Pose[] = [];
  let keyWidth = 0;
  let keyHeight = 0;
  let active = false;
  let disposed = false;

  /** Holds the camera on the hero keyframe: a blend from the key to itself (direction-act1 A7). */
  function holdCamera(size: { width: number; height: number }): void {
    if (size.width !== keyWidth || size.height !== keyHeight) {
      cameraKey('hero', size, hero);
      keyWidth = size.width;
      keyHeight = size.height;
    }
    rig.blend(hero, hero, 1);
  }

  /** Returns the shared group to rest for the next section: no tilt, no group offset and no lifts. */
  function tidy(): void {
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
  }

  return {
    update(progress, _tick, ctx) {
      if (disposed) return;
      holdCamera(ctx.size);
      // Reduced motion has no scroll mapping, so the stanza stays at its rest pose (direction-act1, hero).
      // Portrait takes the same modulation, because the stanza is unchanged there.
      const k = ef.sym(ctx.reducedMotion ? 0 : progress);
      blocks.setPoses(openPoses(ctx.portrait, k, open));
      // The pointer tilt is the hero's only 3D pointer response (direction-3d 10.13). It needs a fine pointer that
      // is not touch, and it is off under reduced motion. blocks.update damps it with T.half and caps it at 0.035 rad.
      const tilt = active && env.finePointer && !env.touch && !ctx.reducedMotion;
      blocks.setTilt(tilt ? pointer.sx : 0, tilt ? pointer.sy : 0);
    },
    setActive(on, ctx) {
      if (disposed) return;
      active = on;
      if (on) holdCamera(ctx.size);
      else tidy();
    },
    dispose() {
      if (disposed) return;
      if (active) tidy();
      active = false;
      disposed = true;
    },
  };
}

/**
 * The hero's GL layer. The stanza opens over the hero's 2 vh of scroll, the camera holds the hero keyframe, and the
 * stanza tilts with the pointer on a fine pointer. The hero has no entry move: the preloader has the same formation
 * and key, so ctx.prev is already in place.
 */
export const heroGL: SectionGL = {
  id: 'hero',
  formation: 'stanza',
  key: 'hero',
  ink: 0,
  dof: null,
  breath: { amplitude: 0.012, phase: 'rows' },
  setup,
};
