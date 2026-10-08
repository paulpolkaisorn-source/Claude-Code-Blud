// The pricing section's 3D layer (design/direction-act3.md, pricing: Sequence 1 and 2, the 3D layer, Keep-alive and
// Reduced motion; direction-3d.md 10.6, 10.12 and 11.9; D15.1 and D19 in design/drafts/director-decisions.md).
//
// Entry, scrubbed over w_p = clamp((1 - topVh) / 0.4, 0, 1), which the choreography passes as progress (act C3).
// At w_p 0 the 17 blocks hold the previous section's exit pose (the family formation) and the camera holds its key.
// Over w_p 0 to 1 each block moves to the rest formation (direction-3d 11.9). Its local progress is scrubLocal on its
// rest stagger position, so the kireji (position 0) leads and the other sixteen follow: the kireji eases with cut and
// the followers with settle. Position and scale share that local progress. Rotation stays at 0 for every block (D15.1):
// the portrait formations are square blocks with rotZ 0, and a quarter turn would turn the anodising marks at the
// start of the entry. The camera moves from the previous key to the pricing key with sym, through rig.blend.
//
// Phantom outlines. The family section owns them (src/sections/family/gl.ts: one LineSegments named 'family-phantoms').
// This handle sets their end state only: opacity 1 - sym(w_p), hidden once that reaches 0. It gives them back their
// family state when it stops being current.
//
// Keep-alive. The choreography arms this section's breath (amplitude 0.010, phase zero) when the section becomes
// current, and blocks.setBreath starts it T.hold later. The handle keeps no breath state of its own.
//
// Family anchor (D22.14, D23.10). The family's DOM anchor carries into this section and fades out with the entry. The
// family writes its group offset (blocks.groupOffset) and the y of its phantom group ('family-phantom-group') earlier in
// each frame, while it is the section before this one. update() reads both, multiplies them by 1 - cut(w_p) and writes
// them back at once. The fade is front-loaded (cut, not sym), so the blocks come back into view early in the entry, and
// they sit on the world origin at w_p 1.
// setActive resets the offsets only at eff 1, at once, so it never fights that fade.
//
// Reduced motion. The entry is complete once w_p reaches 0.5, the point where the section top crosses 80 % of the
// viewport (act, Reduced motion). Before that the previous state holds. The canvas fade of act C5 belongs to the
// choreography, which runs its canvas switch only at a section commit.
//
// The block mix, the light, the environment, the grain and the background ink follow m = 1 - p2. The choreography sets
// them (src/choreo/timeline.ts), so this handle sets none of them. There is no depth of field, no smear and no pointer
// response. Far is 80 on desktop and 120 on phones (act C8).
import * as THREE from 'three';
import { ef } from '../../core/ease';
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

/** Local progress of the entry: total 0.35 and lead 0.10 (direction-act3 C4; architecture section 6). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;

/** The rest breath: 0.010 bu on y, phase zero for all 17 blocks (direction-act3 Keep-alive; direction-3d 10.12). */
const BREATH: BreathMode = { amplitude: 0.01, phase: 'zero' };

/** Far plane while this section is current (direction-act3 C8). */
const FAR_DESKTOP = 80;
const FAR_PHONE = 120;

/** Reduced motion completes the entry at this progress, where the section top crosses 80 % of the viewport. */
const REDUCED_AT = 0.5;

/** Name of the family section's phantom outlines (src/sections/family/gl.ts). */
const OUTLINES = 'family-phantoms';

/** Name of the family section's phantom group, whose y is the family's DOM anchor offset (src/sections/family/gl.ts). */
const PHANTOM_GROUP = 'family-phantom-group';

interface Outlines {
  line: THREE.LineSegments;
  material: THREE.LineDashedMaterial;
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** Builds the pricing handle: the entry poses, the camera blend and the end state of the family's outlines. */
function setup(world: GLWorld): SectionGLHandle {
  const { stage, blocks, rig } = world;
  const camera = stage.camera;
  const scene = stage.scene;

  // Preallocated: the 17 poses are rewritten each call, and the camera keys are rebuilt only when the size changes.
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  const keys = new Map<KeyName, CameraKey>();
  let keyWidth = -1;
  let keyHeight = -1;
  let outlines: Outlines | null = null;
  let phantomGroup: THREE.Object3D | null = null;
  /** The eff of the last update(). setActive reads it to decide whether the anchor offsets may be reset (D22.14). */
  let lastEff = 0;
  let disposed = false;

  /** The camera key of a name for this viewport, cached until the size changes. */
  function keyOf(name: KeyName, size: { width: number; height: number }): CameraKey {
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

  /** The family's phantom outlines, found by name and cached while the object stays in the scene. */
  function findOutlines(): Outlines | null {
    if (outlines !== null && outlines.line.parent !== null) return outlines;
    outlines = null;
    const found = scene.getObjectByName(OUTLINES);
    if (found instanceof THREE.LineSegments && found.material instanceof THREE.LineDashedMaterial) {
      outlines = { line: found, material: found.material };
    }
    return outlines;
  }

  /**
   * The family's phantom group, found by name. Cached once found, and looked up again only while it is missing or has
   * left the scene (D22.14).
   */
  function findPhantomGroup(): THREE.Object3D | null {
    if (phantomGroup === null || phantomGroup.parent === null) {
      phantomGroup = scene.getObjectByName(PHANTOM_GROUP) ?? null;
    }
    return phantomGroup;
  }

  /**
   * Fades the family's DOM anchor out over the entry (D22.14, D23.10). The family has written its group offset and the y of
   * its phantom group earlier in this frame, so both are read here, multiplied by 1 - cut(eff) and written back at once.
   * The cut curve is front-loaded: the offset is 0.32 of its value at eff 0.1 and 0.10 at eff 0.25. At eff 1 both are
   * exactly 0. The offset is written immediately, so blocks.update adds no damping to the fade.
   */
  function fadeAnchor(eff: number): void {
    const k = 1 - ef.cut(eff);
    const [x, y, z] = blocks.groupOffset;
    blocks.setGroupOffset(x * k, y * k, z * k, true);
    const phantoms = findPhantomGroup();
    if (phantoms !== null) phantoms.position.y *= k;
  }

  /** Writes the 17 poses at entry progress eff, from the previous exit formation to the rest formation. */
  function writePoses(eff: number, from: readonly Pose[], portrait: boolean): void {
    const to = formationFor('rest', portrait);
    const order = staggerPosition('rest');
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const local = scrubLocal(order[i], BLOCK_COUNT, eff, SCRUB);
      const e = i === KIREJI ? ef.cut(local) : ef.settle(local);
      lerpPose(from[i], to[i], e, poses[i]);
    }
    blocks.setPoses(poses);
  }

  /** The end state of the phantom outlines at entry progress eff: opacity 1 - sym(eff), hidden at opacity 0. */
  function writeOutlines(eff: number): void {
    const found = findOutlines();
    if (found === null) return;
    if (eff >= 1) {
      found.line.visible = false;
      return;
    }
    const opacity = 1 - ef.sym(eff);
    found.line.visible = true;
    found.material.opacity = opacity;
    found.material.transparent = opacity < 1;
  }

  /** Gives the outlines back their family state: visible and opaque. */
  function restoreOutlines(): void {
    const found = findOutlines();
    if (found === null) return;
    found.line.visible = true;
    found.material.opacity = 1;
    found.material.transparent = false;
  }

  function setFar(portrait: boolean): void {
    const far = portrait ? FAR_PHONE : FAR_DESKTOP;
    if (camera.far === far) return;
    camera.far = far;
    camera.updateProjectionMatrix();
  }

  /**
   * Returns the block state that a pointer or an earlier section may have left: tilt and lifts at 0. The anchor offsets
   * (blocks.groupOffset and the phantom group's y) are reset only at eff 1, and then at once (D22.14). Before that,
   * update() carries them through the fade, so a reset here cannot fight it.
   */
  function tidy(eff: number): void {
    blocks.setTilt(0, 0);
    for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0, 0);
    if (eff < 1) return;
    blocks.setGroupOffset(0, 0, 0, true);
    const phantoms = findPhantomGroup();
    if (phantoms !== null) phantoms.position.y = 0;
  }

  const handle: SectionGLHandle = {
    update(progress: number, _tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      const w = clamp01(progress);
      const eff = ctx.reducedMotion ? (w >= REDUCED_AT ? 1 : 0) : w;
      lastEff = eff;
      const prev = ctx.prev;
      const fromId: FormationId = prev === null ? 'family' : (prev.exitFormation ?? prev.formation);
      const fromKey: KeyName = prev === null ? 'family' : prev.key;
      writePoses(eff, formationFor(fromId, ctx.portrait), ctx.portrait);
      rig.blend(keyOf(fromKey, ctx.size), keyOf('pricing', ctx.size), eff);
      setFar(ctx.portrait);
      writeOutlines(eff);
      fadeAnchor(eff);
    },

    setActive(on: boolean, ctx: SectionGLContext): void {
      if (disposed) return;
      tidy(lastEff);
      if (on) {
        setFar(ctx.portrait);
      } else {
        restoreOutlines();
      }
    },

    dispose(): void {
      if (disposed) return;
      restoreOutlines();
      disposed = true;
    },
  };
  return handle;
}

/** The pricing section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const pricingGL: SectionGL = {
  id: 'pricing',
  formation: 'rest',
  key: 'pricing',
  ink: 0,
  dof: null,
  breath: BREATH,
  setup,
};
