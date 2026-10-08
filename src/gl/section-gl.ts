// Types for each section's 3D layer (architecture section 6b). Types only, with no runtime code.
// Each src/sections/<id>/gl.ts exports one SectionGL. src/gl/boot.ts collects them in page order.
// Sections never import this file: the 2D code talks to the GL side only through bus and scrollState.
import type { SectionId, FormationId } from '../core/types';
import type { Tick } from '../core/ticker';
import type { Stage } from './stage';

/** One camera keyframe: where the camera sits, what it looks at, and its vertical field of view in degrees. */
export interface CameraKey {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** The camera keyframes of the page, by name (direction-3d.md section 10.6). */
export type KeyName = 'hero' | 'speed' | 'pricing' | 'closing' | 'family';

/** What a section's GL layer returns to the choreography. */
export interface SectionGLHandle {
  /** Advances the section's objects. progress is the section's scroll progress in [0, 1]. */
  update(progress: number, tick: Tick): void;
  /** True while the section is the current one in view. */
  setActive(active: boolean): void;
  /** Releases what this handle created. The shared stage and the shared objects stay. */
  dispose(): void;
}

/**
 * The shared GL objects a section may use. The fields are placeholders until the classes are final;
 * the director narrows each one to its class at integration.
 */
export interface GLWorld {
  stage: Stage;
  blocks: unknown;
  lighting: unknown;
  background: unknown;
  post: unknown;
  rig: unknown;
}

/** The GL contract of one section. */
export interface SectionGL {
  id: SectionId;
  /** The formation this section rests in (src/gl/blocks/formations.ts). */
  formation: FormationId;
  /** The camera keyframe this section uses. */
  key: KeyName;
  /** Background ink while the section is current: 0 for paper, 1 for ink (the block mix m, section 10.3). */
  ink: 0 | 1;
  /** Depth of field for this section, or null when the pass is removed from the chain. */
  dof: { focus: number; bokeh: number } | null;
  /** Adds the section's extra objects, such as the family phantom outlines. Optional. */
  setup?(world: GLWorld): SectionGLHandle;
}
