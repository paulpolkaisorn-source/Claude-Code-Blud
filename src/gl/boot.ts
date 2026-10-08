// GL boot: builds the shared world once, wires the quality watchdog and the reduced-motion switch,
// collects every section's GL layer in page order, and hands them to the choreography.
// Director-owned integration (architecture sections 5 and 6b). This module is the GL chunk's entry.
import { env, onReducedMotionChange } from '../core/env';
import { addTick, PRIORITY } from '../core/ticker';
import type { SectionId } from '../core/types';
import { createStage } from './stage';
import { createLighting } from './lighting';
import { createBackground } from './background/background';
import { createBlockMaterial } from './blocks/material';
import { Blocks } from './blocks/blocks';
import { createPost } from './post';
import { createRig } from './rig';
import { initQuality } from './quality';
import type { GLWorld, SectionGL } from './section-gl';

/** What main.ts gets back from the GL chunk: the world plus the two loader steps that follow the chunk load. */
export interface GLBoot {
  world: GLWorld;
  /** Section GL layers in page order (sections without a gl.ts are skipped). */
  sections: readonly SectionGL[];
  /** Compiles every shader program off the critical path, then renders one frame and marks html.gl-ready. */
  compile(): Promise<void>;
  /** The procedural environment is generated inside createLighting; this resolves once it is in place. */
  environment(): Promise<void>;
}

/** The choreography module's entry, loaded when present (src/choreo/timeline.ts). */
type ChoreoInit = (world: GLWorld, sections: readonly SectionGL[]) => void;

const ORDER: readonly SectionId[] = [
  'preloader',
  'hero',
  'speed',
  'capabilities',
  'code',
  'family',
  'pricing',
  'closing',
  'footer',
];

// Each section folder may hold a gl.ts that exports one SectionGL object.
const sectionModules = import.meta.glob<Record<string, unknown>>('../sections/*/gl.ts', { eager: true });
const choreoModules = import.meta.glob<Record<string, unknown>>('../choreo/timeline.ts', { eager: true });

function isSectionGL(value: unknown): value is SectionGL {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SectionGL>;
  return typeof v.id === 'string' && typeof v.formation === 'string' && typeof v.key === 'string';
}

function collectSections(): SectionGL[] {
  const out: SectionGL[] = [];
  for (const id of ORDER) {
    const mod = sectionModules[`../sections/${id}/gl.ts`];
    if (!mod) continue;
    const found = Object.values(mod).find(isSectionGL);
    if (found && found.id === id) out.push(found);
  }
  return out;
}

function choreoInit(): ChoreoInit | null {
  const mod = choreoModules['../choreo/timeline.ts'];
  const init = mod?.initChoreo;
  return typeof init === 'function' ? (init as ChoreoInit) : null;
}

export function createWorld(canvas: HTMLCanvasElement): GLBoot {
  const stage = createStage(canvas);
  const lighting = createLighting(stage);
  const background = createBackground(stage);
  const material = createBlockMaterial();
  const blocks = new Blocks(stage, material);
  const post = createPost(stage);
  const rig = createRig(stage);

  // Quality steps are one-way (direction-3d 10.9): once the watchdog drops depth of field, no section
  // may bring it back, so the section-facing setDof is guarded here.
  let dofAllowed = true;
  const rawSetDof = post.setDof.bind(post);
  post.setDof = (cfg) => rawSetDof(dofAllowed ? cfg : null);

  const applyTier = (): void => {
    material.setQuality(env.tier);
    background.setQuality(env.tier);
  };
  applyTier();

  initQuality({
    dofOff: () => {
      dofAllowed = false;
      rawSetDof(null);
    },
    bloomOff: () => post.setBloom(false),
    dprCap: (cap) => stage.setDprCap(cap),
    shadowMap: (size) => lighting.setShadowMapSize(size),
  });

  const applyReducedMotion = (rm: boolean): void => {
    blocks.setReducedMotion(rm);
    background.setReducedMotion(rm);
    post.setReducedMotion(rm);
  };
  applyReducedMotion(env.reducedMotion);
  onReducedMotionChange(applyReducedMotion);

  // Per-frame updates of the shared objects, before the stage renders at PRIORITY.glRender.
  addTick((tick) => {
    background.update(tick);
    blocks.update(tick);
    rig.update(tick);
  }, PRIORITY.glUpdate);

  const world: GLWorld = { stage, blocks, material, lighting, background, post, rig };
  const sections = collectSections();
  choreoInit()?.(world, sections);

  return {
    world,
    sections,
    async compile() {
      const { renderer, scene, camera } = stage;
      // compileAsync needs KHR_parallel_shader_compile; without it three.js warns and falls back to a
      // blocking compile anyway, so take the blocking path directly and keep the console clean.
      if (renderer.extensions.has('KHR_parallel_shader_compile')) {
        await renderer.compileAsync(scene, camera);
      } else {
        renderer.compile(scene, camera);
      }
      // One rendered frame with every program ready, then the CSS backgrounds hand over (D18).
      // Waits on the page clock (after glRender) rather than a separate requestAnimationFrame.
      await new Promise<void>((resolve) => {
        const remove = addTick(() => {
          remove();
          resolve();
        }, PRIORITY.glRender + 1);
      });
      document.documentElement.classList.add('gl-ready');
    },
    async environment() {
      // createLighting renders the RoomEnvironment through PMREM synchronously; nothing is pending.
      if (!stage.scene.environment) throw new Error('environment map missing after createLighting');
    },
  };
}
