// The footer section's 3D layer (design/direction-act3.md, footer: 3D layer, Scroll, Pointer, Touch, Keep-alive and
// Reduced motion; direction-act3 C3, C7, C8 and C13; direction-3d.md 10.6, 10.12 and 11.10).
//
// The footer holds the closing's column. Its formation and camera do not change: the 17 blocks stay in the column
// (direction-3d 11.10) and the camera stays on the closing keyframe (direction-act3 C7: desktop z 14.60 and x -2.00 at
// 1440 by 900, phone z 14.60 with x 0 and y 0). The footer has no progress (C3), so the hold is the same at every
// progress value.
//
// Entry. The closing exits in the column on the closing key, so the entry from ctx.prev is the identity. The act gives
// no entry window for the footer, so the handle sets the column and the closing key at once, from whatever state the
// blocks and the camera were in (a jump into the footer included). Far is 80 on desktop and 120 on phones (C8).
//
// Keep-alive. The footer has no breath of its own. Its breath is the closing's travelling wave (0.010 bu, phase 'wave',
// direction-3d 10.12). The choreography arms it when it commits the footer, and the closing requested the same mode, so
// blocks.setBreath keeps the wave running with no restart. blocks.update holds it still under reduced motion.
//
// Scroll and pointer. The footer is not scroll-linked, and it has no 3D pointer response. Its only pointer response is
// the native cursor and the 2D link hover, so this handle reads no pointer state and no DOM event.
//
// The block mix, the lights, the environment, the grain, the vignette and the background follow m = 0 (paper). The
// choreography sets them (src/choreo/timeline.ts), so this handle sets none of them. The footer has no depth of field
// (dof null), no smear and no lifts. Under reduced motion every entry and blend is complete at once, which is what the
// hold already does, so the handle has no reduced-motion branch of its own.
import type { Tick } from '../../core/ticker';
import { BLOCK_COUNT, formationFor } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type { CameraKey, GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../../gl/section-gl';

/** Far plane while this section is current (direction-act3 C8). */
const FAR_DESKTOP = 80;
const FAR_PHONE = 120;

/** Builds the footer handle: the column and the closing key, held. It owns no objects, so dispose frees nothing. */
function setup(world: GLWorld): SectionGLHandle {
  const { stage, blocks, rig } = world;
  const camera = stage.camera;

  // The closing key for the last viewport size. cameraKey reads the aspect, so it is rebuilt only when the size changes.
  let closing: CameraKey | null = null;
  let keyWidth = -1;
  let keyHeight = -1;
  let disposed = false;

  function closingKey(size: { width: number; height: number }): CameraKey {
    if (closing === null || size.width !== keyWidth || size.height !== keyHeight) {
      closing = cameraKey('closing', size, closing ?? undefined);
      keyWidth = size.width;
      keyHeight = size.height;
    }
    return closing;
  }

  function setFar(portrait: boolean): void {
    const far = portrait ? FAR_PHONE : FAR_DESKTOP;
    if (camera.far === far) return;
    camera.far = far;
    camera.updateProjectionMatrix();
  }

  /** Writes the column and the closing key for this viewport. Its values do not depend on progress. */
  function hold(ctx: SectionGLContext): void {
    const key = closingKey(ctx.size);
    blocks.setPoses(formationFor('column', ctx.portrait));
    rig.blend(key, key, 1);
    setFar(ctx.portrait);
  }

  /** Returns the block state that a pointer or an earlier section may have left: tilt, group offset and lifts at 0. */
  function tidy(): void {
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
  }

  const handle: SectionGLHandle = {
    update(_progress: number, _tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      hold(ctx);
    },

    setActive(on: boolean, ctx: SectionGLContext): void {
      if (disposed) return;
      tidy();
      if (on) hold(ctx);
    },

    dispose(): void {
      disposed = true;
    },
  };
  return handle;
}

/** The footer section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const footerGL: SectionGL = {
  id: 'footer',
  formation: 'column',
  key: 'closing',
  ink: 0,
  dof: null,
  breath: { amplitude: 0.01, phase: 'wave' },
  setup,
};
