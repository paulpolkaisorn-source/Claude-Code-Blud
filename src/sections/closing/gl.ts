// The closing section's 3D layer (design/direction-act3.md, closing: Sequence 1 to 3 and 6, the 3D layer, Scroll,
// Keep-alive and Reduced motion; direction-3d.md 10.6, 10.12, 11.9 and 11.10; design/drafts/director-decisions.md D7,
// D15 and D18).
//
// Entry, scrubbed over w_c = clamp((1 - topVh) / 0.6, 0, 1), which the choreography passes as progress (act C3). At
// w_c 0 the 17 blocks hold the rest formation that pricing leaves (direction-3d 11.9) and the camera holds the pricing
// key. Block i moves to the column (11.10) over its local progress scrubLocal(i, 17, w_c, { total 0.35, lead 0.10 }),
// with settle, so the column is written from index 0 at the top down to index 16 at the bottom. No block leads: the
// kireji keeps its own slot in that order (act C4). Position and scale share the local progress. The camera moves from
// the pricing key to the closing key through rig.blend, which applies ef.sym to w_c. The write completes at topVh 0.4.
// Far is 80 on desktop and 120 on phones (act C8).
//
// Keep-alive. The travelling wave is the breath { amplitude 0.010, phase 'wave' }. The choreography arms it when the
// section becomes current, and blocks.setBreath starts it T.hold later, so this handle keeps no breath state.
//
// Held state. While this section is not current, the choreography calls its handle only when w_c changes. Meanwhile
// pricing's handle is current and writes its rest formation and pricing camera every frame (src/sections/pricing/gl.ts),
// so the column would be lost at any scroll stop inside the entry. This handle re-applies its last written state at
// PRIORITY.state + 6, after the choreography (PRIORITY.state + 5) and before the GL update (PRIORITY.glUpdate). It does
// nothing while the section is current (update runs then) or while its progress is 0.
//
// Reduced motion. The entry is complete when the section top crosses 80 % of the viewport height (act Reduced motion),
// which is w_c = (1 - 0.8) / 0.6 = 1/3. Before that the rest state holds. There is no write animation and no wave,
// because blocks.setReducedMotion zeroes the breath. The canvas switch of act C5 belongs to the choreography.
//
// This handle sets no mix, light, grain, depth of field or ink bleed (the choreography does), and no pointer response.
// The ruler is 2D: it reads the column with projection.formationRects, so it needs no GL state.
import { ef } from '../../core/ease';
import { PRIORITY, addTick, type Tick } from '../../core/ticker';
import { scrubLocal } from '../../core/timing';
import type { FormationId } from '../../core/types';
import { BLOCK_COUNT, formationFor, lerpPose, staggerPosition, type Pose } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type {
  CameraKey,
  GLWorld,
  KeyName,
  SectionGL,
  SectionGLContext,
  SectionGLHandle,
} from '../../gl/section-gl';

/** Local progress of the write: total 0.35 and lead 0.10 (direction-act3 C4 and Sequence 1). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;

/** Entrance span of the closing in viewport heights (direction-act3 C3). */
const CLOSING_SPAN = 0.6;

/** Reduced motion completes the entry where the section top crosses 80 % of the viewport height (act Reduced motion). */
const REDUCED_AT = (1 - 0.8) / CLOSING_SPAN;

/** Far plane while this section is current or entering (direction-act3 C8). */
const FAR_DESKTOP = 80;
const FAR_PHONE = 120;

/** After the choreography's frame (PRIORITY.state + 5) and before the GL update (PRIORITY.glUpdate). */
const HOLD_PRIORITY = PRIORITY.state + 6;

/** The state last written: entry progress, the previous section's formation and key, and the viewport. */
interface Held {
  eff: number;
  fromId: FormationId;
  fromKey: KeyName;
  portrait: boolean;
  width: number;
  height: number;
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** Builds the closing handle: the write of the column, the camera blend and the held state. */
function setup(world: GLWorld): SectionGLHandle {
  const { stage, blocks, rig } = world;
  const camera = stage.camera;

  // Preallocated: the 17 poses are rewritten in place, and each camera key is built once per viewport size.
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  const order = staggerPosition('column');
  const keys = new Map<KeyName, CameraKey>();
  const sizeScratch = { width: 1, height: 1 };
  let keyWidth = -1;
  let keyHeight = -1;
  let active = false;
  let disposed = false;
  const held: Held = { eff: 0, fromId: 'rest', fromKey: 'pricing', portrait: false, width: 1, height: 1 };

  /** The camera key of a name for this viewport, cached until the size changes. */
  function keyOf(name: KeyName, width: number, height: number): CameraKey {
    if (width !== keyWidth || height !== keyHeight) {
      keys.clear();
      keyWidth = width;
      keyHeight = height;
    }
    const known = keys.get(name);
    if (known !== undefined) return known;
    sizeScratch.width = width;
    sizeScratch.height = height;
    const key = cameraKey(name, sizeScratch);
    keys.set(name, key);
    return key;
  }

  function setFar(portrait: boolean): void {
    const far = portrait ? FAR_PHONE : FAR_DESKTOP;
    if (camera.far === far) return;
    camera.far = far;
    camera.updateProjectionMatrix();
  }

  /** Writes the 17 poses and the camera for the state h: from the previous formation to the column, from its key to the closing key. */
  function write(h: Held): void {
    const from = formationFor(h.fromId, h.portrait);
    const to = formationFor('column', h.portrait);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const local = scrubLocal(order[i], BLOCK_COUNT, h.eff, SCRUB);
      lerpPose(from[i], to[i], ef.settle(local), poses[i]);
    }
    blocks.setPoses(poses);
    rig.blend(keyOf(h.fromKey, h.width, h.height), keyOf('closing', h.width, h.height), h.eff);
    setFar(h.portrait);
  }

  /** Returns the block state that a pointer or an earlier section may have left: tilt, group offset and lifts at 0. */
  function tidy(): void {
    blocks.setTilt(0, 0);
    blocks.setGroupOffset(0, 0, 0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
  }

  const removeHold = addTick(() => {
    if (disposed || active || held.eff <= 0) return;
    write(held);
  }, HOLD_PRIORITY);

  const handle: SectionGLHandle = {
    update(progress: number, _tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      if (!(ctx.size.width > 0 && ctx.size.height > 0)) return;
      const w = clamp01(progress);
      held.eff = ctx.reducedMotion ? (w >= REDUCED_AT ? 1 : 0) : w;
      held.fromId = ctx.prev === null ? 'rest' : (ctx.prev.exitFormation ?? ctx.prev.formation);
      held.fromKey = ctx.prev === null ? 'pricing' : ctx.prev.key;
      held.portrait = ctx.portrait;
      held.width = ctx.size.width;
      held.height = ctx.size.height;
      write(held);
    },

    setActive(on: boolean, ctx: SectionGLContext): void {
      if (disposed) return;
      active = on;
      tidy();
      if (on) setFar(ctx.portrait);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      removeHold();
    },
  };
  return handle;
}

/** The closing section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const closingGL: SectionGL = {
  id: 'closing',
  formation: 'column',
  key: 'closing',
  ink: 0,
  dof: null,
  breath: { amplitude: 0.01, phase: 'wave' },
  setup,
};
