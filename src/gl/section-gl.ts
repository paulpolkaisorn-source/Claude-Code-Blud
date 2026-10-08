// Types for each section's 3D layer (architecture section 6b). Types only, with no runtime code.
// Each src/sections/<id>/gl.ts exports one SectionGL. src/gl/boot.ts collects them in page order and
// src/choreo/timeline.ts drives them. 2D section code never imports this file.
import type { SectionId, FormationId } from '../core/types';
import type { Tick } from '../core/ticker';
import type { Stage } from './stage';
import type { Blocks, BreathMode } from './blocks/blocks';
import type { BlockMaterial } from './blocks/material';
import type { Lighting } from './lighting';
import type { Background } from './background/background';
import type { Post } from './post';
import type { Rig } from './rig';

/** One camera keyframe: where the camera sits, what it looks at, and its vertical field of view in degrees. */
export interface CameraKey {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** The camera keyframes of the page, by name (direction-3d.md section 10.6). */
export type KeyName = 'hero' | 'speed' | 'pricing' | 'closing' | 'family';

/** The shared GL objects, built once by src/gl/boot.ts. */
export interface GLWorld {
  stage: Stage;
  blocks: Blocks;
  material: BlockMaterial;
  lighting: Lighting;
  background: Background;
  post: Post;
  rig: Rig;
}

/** What the choreography passes to a section's handle on every call. */
export interface SectionGLContext {
  /** The section before this one in page order, or null for the first. Its exit pose is where entries start. */
  prev: SectionGL | null;
  /** Viewport aspect below 1 (phone layouts, D15). */
  portrait: boolean;
  /** prefers-reduced-motion: set states at once, no scrub (architecture section 8). */
  reducedMotion: boolean;
  /** Canvas size in CSS px. */
  size: { width: number; height: number };
  /**
   * Raw ink-bleed progress of the two act boundaries (direction-3d 10.10), before easing and
   * smoothing: p1 at the top of capabilities (paper to ink), p2 at the top of pricing (ink to paper).
   */
  bleed: { p1: number; p2: number };
}

/** What a section's GL layer returns to the choreography. */
export interface SectionGLHandle {
  /**
   * Called every frame while this section is current. progress is the act-file section progress
   * s = clamp(-top / height, 0, 1). The handle owns its entry move (formation and camera, from
   * ctx.prev's exit pose and key) and any section-specific motion, as its act file specifies.
   */
  update(progress: number, tick: Tick, ctx: SectionGLContext): void;
  /** Called when the section becomes current (true) or stops being current (false). */
  setActive(active: boolean, ctx: SectionGLContext): void;
  /** Releases what this handle created. The shared world stays. */
  dispose(): void;
}

/** The GL contract of one section. */
export interface SectionGL {
  id: SectionId;
  /** The formation this section rests in (src/gl/blocks/formations.ts). */
  formation: FormationId;
  /** The formation the section ends in, when it differs from formation (capabilities ends in cap-2). */
  exitFormation?: FormationId;
  /** The camera keyframe this section rests on. */
  key: KeyName;
  /** Background while the section is current: 0 for paper, 1 for ink (the block mix m, section 10.3). */
  ink: 0 | 1;
  /** Depth of field for this section, or null when the pass is removed from the chain. */
  dof: { focus: number; bokeh: number } | null;
  /** The idle breath while the section is current (direction-3d 10.12), or null for none. */
  breath: BreathMode | null;
  /** True when scroll velocity drives the block smear (speed only, direction-3d 10.11). */
  smear?: boolean;
  /** Builds the section's handle; may add extra objects such as the family phantom outlines. */
  setup?(world: GLWorld): SectionGLHandle;
}
