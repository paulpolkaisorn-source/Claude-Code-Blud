// The post-processing chain of the 3D layer (design/direction-3d.md sections 10.1 and 10.8).
//
// One composer with HalfFloat frame buffers, so every pass works in linear light. Render order:
//   1. RenderPass: blocks and background into the linear target.
//   2. Depth of field: its own EffectPass, present only while a focus is set (speed and code).
//   3. One merged EffectPass: chromatic aberration, bloom and grain. It is the last pass and renders
//      to the screen, so its output encode turns the linear result into sRGB after the grain.
//
// Order. Section 10.8 lists the depth of field after the bloom. The grain shares the merged pass
// with the bloom (the brief's single merged pass), and the grain has to be the last step, so the
// depth of field runs before the bloom and the aberration here. DepthOfFieldEffect reads the scene
// depth that the composer copies right after the RenderPass, so its place in the chain does not
// change what it reads.
//
// Depth of field focus. DepthOfFieldEffect 6.39.5 compares the view distance length(viewPosition)
// with focusDistance, in world units (calculateFocusDistance returns a world distance). The
// normalised depths of section 10.8 are not its input, so setDof takes the focus in bu.
import * as THREE from 'three';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  type Effect,
} from 'postprocessing';
import { T } from '../core/timing';
import { addTick, PRIORITY, type Tick } from '../core/ticker';
import { GRAIN_AMP_M0, GRAIN_AMP_M1, GRAIN_SEED_STATIC, GrainEffect } from './effects/grain';
import type { Stage } from './stage';

export interface Post {
  /** The composer. Its passes, in render order, are the chain described above. */
  readonly composer: EffectComposer;
  /** Scroll velocity in px/s, signed. The aberration uses its absolute value, damped with T.micro. */
  setVelocity(pxPerSecond: number): void;
  /** Block mix m in [0, 1]. Sets the grain amplitude: 0.028 at m = 0, 0.040 at m = 1. */
  setMix(m: number): void;
  /** Depth of field with a world focus distance in bu and a bokeh scale, or null to remove its pass. */
  setDof(cfg: { focus: number; bokeh: number } | null): void;
  /** Bloom on or off. Off rebuilds the merged pass without the bloom effect (quality watchdog step 2). */
  setBloom(on: boolean): void;
  /** Reduced motion: no aberration, grain seed fixed at 17, no depth-of-field pass. */
  setReducedMotion(rm: boolean): void;
  /** Removes the render hook and the resize listener, and disposes the composer and its passes. Later calls do nothing. */
  dispose(): void;
}

/** Bloom at the linear threshold of section 10.1. Only specular highlights on the blocks pass it. */
const BLOOM_OPTIONS = {
  luminanceThreshold: 0.96,
  luminanceSmoothing: 0.02,
  intensity: 0.12,
  radius: 0.2,
  mipmapBlur: true,
};

/** Chromatic aberration: 0.8 px at or above 3000 px/s, 0 px at or below 40 px/s, linear between. */
const ABERRATION_MAX_PX = 0.8;
const ABERRATION_FROM = 40;
const ABERRATION_SPAN = 2960;

/** Focus range of the depth of field in bu. Section 10.8 gives no range, so the library default of 2 bu is used. */
const DOF_FOCUS_RANGE = 2;

/** The seed counter wraps after this many frames, so the seed stays an exact integer in a float. */
const SEED_CYCLE = 65536;

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/** Chromatic aberration offset in px for a damped speed in px/s (section 10.8). */
export function aberrationPx(speed: number): number {
  return ABERRATION_MAX_PX * clamp01((speed - ABERRATION_FROM) / ABERRATION_SPAN);
}

/** Grain amplitude in display units for the block mix m (section 10.8). */
export function grainAmplitude(m: number): number {
  return GRAIN_AMP_M0 + (GRAIN_AMP_M1 - GRAIN_AMP_M0) * clamp01(m);
}

interface Chain {
  readonly pass: EffectPass;
  readonly aberration: ChromaticAberrationEffect;
  readonly bloom: BloomEffect | null;
  readonly grain: GrainEffect;
}

interface Dof {
  readonly pass: EffectPass;
  readonly effect: DepthOfFieldEffect;
}

/**
 * Builds the chain on stage and installs it as the stage's render hook. The caller keeps the stage's
 * size in step through the stage itself: the composer follows stage.onResize by itself.
 */
export function createPost(stage: Stage): Post {
  const { renderer, scene, camera } = stage;
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));
  composer.setSize(stage.size.width, stage.size.height);

  let bloomOn = true;
  let reduced = false;
  let disposed = false;
  let mix = 0;
  let requested = 0; // |v| as last set, px/s
  let damped = 0; // |v| damped with T.micro, px/s
  let frameDt = 0; // seconds, from the last tick
  let seed = 0; // per-frame counter, 1 to SEED_CYCLE
  let dofRequest: { focus: number; bokeh: number } | null = null;
  let dof: Dof | null = null;
  const drawingSize = new THREE.Vector2();

  function buildChain(): Chain {
    const aberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: false,
      modulationOffset: 0.15,
    });
    const bloom = bloomOn ? new BloomEffect(BLOOM_OPTIONS) : null;
    const grain = new GrainEffect();
    const effects: Effect[] = bloom === null ? [aberration, grain] : [aberration, bloom, grain];
    return { pass: new EffectPass(camera, ...effects), aberration, bloom, grain };
  }

  let chain = buildChain();
  composer.addPass(chain.pass);

  /** The seed of this frame: the counter, or the fixed reduced-motion seed. */
  function currentSeed(): number {
    return reduced || seed === 0 ? GRAIN_SEED_STATIC : seed;
  }

  /** Writes the aberration offset in uv: the px value divided by the drawing-buffer width. */
  function writeAberration(c: Chain): void {
    const width = Math.max(1, renderer.getDrawingBufferSize(drawingSize).x);
    c.aberration.offset.set(aberrationPx(damped) / width, 0);
  }

  function applyChainState(c: Chain): void {
    c.grain.setAmplitude(grainAmplitude(mix));
    c.grain.setSeed(currentSeed());
    writeAberration(c);
  }

  /** Adds, updates or removes the depth-of-field pass so that it matches the request and reduced motion. */
  function syncDof(): void {
    const request = reduced ? null : dofRequest;
    if (request === null) {
      if (dof !== null) {
        composer.removePass(dof.pass);
        dof.pass.dispose();
        dof = null;
      }
      return;
    }
    if (dof === null) {
      const effect = new DepthOfFieldEffect(camera, {
        focusDistance: request.focus,
        focusRange: DOF_FOCUS_RANGE,
        bokehScale: request.bokeh,
      });
      const pass = new EffectPass(camera, effect);
      // Index 1 is directly after the RenderPass, before the merged pass.
      composer.addPass(pass, 1);
      dof = { pass, effect };
      return;
    }
    dof.effect.cocMaterial.focusDistance = request.focus;
    dof.effect.bokehScale = request.bokeh;
  }

  // Runs once per frame at glUpdate, before the stage draws the composer at glRender. It damps the
  // speed for the aberration and advances the grain seed.
  const removeTick = addTick((t: Tick) => {
    frameDt = t.dt;
    if (reduced) damped = 0;
    else damped += (requested - damped) * (1 - Math.exp(-t.dt / T.micro));
    seed = (seed % SEED_CYCLE) + 1;
    chain.grain.setSeed(currentSeed());
    writeAberration(chain);
  }, PRIORITY.glUpdate);

  stage.setRenderHook(() => {
    composer.render(frameDt);
  });

  const removeResize = stage.onResize((size) => {
    composer.setSize(size.width, size.height);
  });

  return {
    composer,

    setVelocity(pxPerSecond: number): void {
      if (disposed) return;
      requested = Number.isFinite(pxPerSecond) ? Math.abs(pxPerSecond) : 0;
    },

    setMix(m: number): void {
      if (disposed) return;
      mix = clamp01(m);
      chain.grain.setAmplitude(grainAmplitude(mix));
    },

    setDof(cfg: { focus: number; bokeh: number } | null): void {
      if (disposed) return;
      if (cfg === null) {
        dofRequest = null;
      } else {
        if (!Number.isFinite(cfg.focus) || cfg.focus <= 0) {
          throw new RangeError(`setDof: focus ${cfg.focus} must be a positive distance in bu`);
        }
        if (!Number.isFinite(cfg.bokeh) || cfg.bokeh < 0) {
          throw new RangeError(`setDof: bokeh ${cfg.bokeh} must be zero or more`);
        }
        dofRequest = { focus: cfg.focus, bokeh: cfg.bokeh };
      }
      syncDof();
    },

    setBloom(on: boolean): void {
      if (disposed || on === bloomOn) return;
      bloomOn = on;
      const old = chain;
      composer.removePass(old.pass);
      // The old pass owns its effects, so disposing it frees the old bloom targets as well.
      old.pass.dispose();
      chain = buildChain();
      composer.addPass(chain.pass);
      applyChainState(chain);
    },

    setReducedMotion(rm: boolean): void {
      if (disposed) return;
      reduced = rm;
      if (rm) damped = 0;
      chain.grain.setSeed(currentSeed());
      writeAberration(chain);
      syncDof();
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      removeTick();
      removeResize();
      dof = null;
      stage.setRenderHook(() => {
        renderer.render(scene, camera);
      });
      renderer.autoClear = true;
      composer.dispose();
    },
  };
}
