// Paper and ink background: one fullscreen triangle that paints the ground, the paper fibre and the
// ink-bleed front (design/direction-3d.md section 10.10; where the front sits is D25.1). The shader and its
// colour rules are in background.frag.glsl. This module owns the uniforms and the state that drives them.
import * as THREE from 'three';
import { env } from '../../core/env';
import type { Tick } from '../../core/ticker';
import type { Theme, Tier } from '../../core/types';
import type { Stage } from '../stage';
import fragmentShader from './background.frag.glsl?raw';
import vertexShader from './background.vert.glsl?raw';

/** One ink-bleed front. Boundary 1 is paper above the front and ink below; boundary 2 is ink above and paper below. */
export interface BleedArg {
  boundary: 1 | 2;
  /**
   * Places the front's mean line at (1.12 - 1.24 p) canvas heights from the top (background.frag.glsl). frontParam gives
   * the p for a screen y. Clamped to [0, 1]: outside that range the front lies off the canvas.
   */
  p: number;
  /** Amplitude of the wave in CSS px. Zero draws a straight front. Without it the wave is 0.06 of the canvas height. */
  wave?: number;
}

export interface Background {
  /** The fullscreen triangle, already added to stage.scene. renderOrder -1, no depth test or write. */
  readonly mesh: THREE.Mesh;
  /** Sets the theme the ground takes when no front is drawn. */
  setTheme(theme: 'paper' | 'ink'): void;
  /**
   * Draws an ink-bleed front, or removes it with null (the ground then takes the theme set by setTheme). Under reduced
   * motion the front is a plain cut at its mean line: no wave, no soft edge and no rim band (D25.1, D18.3).
   */
  setBleed(bleed: BleedArg | null): void;
  /** Reduced motion freezes uTime and turns each front into a plain cut, so the theme switches at the cut. */
  setReducedMotion(rm: boolean): void;
  /** Quality tier. It sets the fibre octaves: low 2, mid 3, high 4. The perf watchdog steps it down. */
  setQuality(tier: Tier): void;
  /** Advances uTime by tick.dt. Does nothing under reduced motion. */
  update(tick: Tick): void;
  /** Removes the mesh from the scene and frees its GPU objects. Calling it twice is safe. */
  dispose(): void;
}

/** The shader's front mapping (background.frag.glsl): the mean line sits at (FRONT_AT_0 - FRONT_SLOPE p) canvas heights. */
const FRONT_AT_0 = 1.12;
const FRONT_SLOPE = 1.24;
/** The wave amplitude when setBleed gets none, in canvas heights: the amplitude the shader drew before D25.1 capped it. */
const DEFAULT_WAVE_VH = 0.06;

/**
 * The p that puts the front's mean line at y CSS px from the top of a canvas height px tall. The inverse of the shader's
 * mapping, so setBleed({ boundary, p: frontParam(y, h) }) draws the mean line at y.
 */
export function frontParam(y: number, canvasHeight: number): number {
  return (FRONT_AT_0 - y / canvasHeight) / FRONT_SLOPE;
}

type BleedState = { boundary: 1 | 2; p: number; wave: number };

// Hex values from design/direction.md section 3. THREE.Color converts them to linear light.
const PAPER_HEX = '#F1ECE0';
const INK_HEX = '#151512';
const PAPER_DEEP_HEX = '#E4DCCB';
const INK_RAISED_HEX = '#22211D';

/** Fibre amplitude per theme, in sRGB units (0.018 paper, 0.010 ink). */
const FIBRE_AMP: Readonly<Record<Theme, number>> = { paper: 0.018, ink: 0.01 };
/** Vignette strength per theme (0.06 paper, 0.10 ink). */
const VIGNETTE: Readonly<Record<Theme, number>> = { paper: 0.06, ink: 0.1 };
/** Fibre octaves per quality tier. */
const FIBRE_OCTAVES: Readonly<Record<Tier, number>> = { low: 2, mid: 3, high: 4 };

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

/**
 * Builds the background for stage and adds it to stage.scene. The caller drives update() from the
 * page clock and keeps the stage's size in sync; the uniforms follow stage.onResize by themselves.
 */
export function createBackground(stage: Stage): Background {
  const uniforms = {
    uResolution: { value: new THREE.Vector3(stage.size.width, stage.size.height, stage.size.dpr) },
    uTime: { value: 0 },
    uPaper: { value: new THREE.Color(PAPER_HEX) },
    uInk: { value: new THREE.Color(INK_HEX) },
    uPaperDeep: { value: new THREE.Color(PAPER_DEEP_HEX) },
    uInkRaised: { value: new THREE.Color(INK_RAISED_HEX) },
    uBase: { value: 0 },
    uBleedActive: { value: 0 },
    uBleedP: { value: 0 },
    uBleedDir: { value: 1 },
    uWavePx: { value: 0 },
    uHardEdge: { value: 0 },
    uFibreAmp: { value: new THREE.Vector2(FIBRE_AMP.paper, FIBRE_AMP.paper) },
    uVignette: { value: new THREE.Vector2(VIGNETTE.paper, VIGNETTE.paper) },
    uFibreOctaves: { value: FIBRE_OCTAVES[env.tier] },
  };

  // ShaderMaterial with GLSL 3.00. Three.js does not declare gl_FragColor for GLSL3, so the shader
  // declares its own output, and linearToOutputTexel comes from the prefix.
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  // One triangle that covers the clip square: (-1, -1), (3, -1), (-1, 3).
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  stage.scene.add(mesh);

  let theme: Theme = 'paper';
  let bleed: BleedState | null = null;
  let reduced = false;
  let disposed = false;

  /** Writes every uniform that depends on the theme, the front and reduced motion. */
  function sync(): void {
    uniforms.uBase.value = theme === 'ink' ? 1 : 0;
    if (bleed === null) {
      uniforms.uBleedActive.value = 0;
      uniforms.uFibreAmp.value.set(FIBRE_AMP[theme], FIBRE_AMP[theme]);
      uniforms.uVignette.value.set(VIGNETTE[theme], VIGNETTE[theme]);
      return;
    }
    // Boundary 1: paper above the front, ink below. Boundary 2: ink above, paper below.
    const below: Theme = bleed.boundary === 1 ? 'ink' : 'paper';
    const above: Theme = below === 'ink' ? 'paper' : 'ink';
    uniforms.uBleedActive.value = 1;
    uniforms.uBleedDir.value = bleed.boundary;
    uniforms.uBleedP.value = bleed.p;
    // Reduced motion: a plain cut at the mean line (D25.1). Normal motion: the wave and the soft edge with its rim.
    uniforms.uWavePx.value = reduced ? 0 : bleed.wave;
    uniforms.uHardEdge.value = reduced ? 1 : 0;
    uniforms.uFibreAmp.value.set(FIBRE_AMP[above], FIBRE_AMP[below]);
    uniforms.uVignette.value.set(VIGNETTE[above], VIGNETTE[below]);
  }

  const removeResize = stage.onResize((size) => {
    uniforms.uResolution.value.set(size.width, size.height, size.dpr);
  });
  sync();

  return {
    mesh,
    setTheme(next: Theme): void {
      theme = next;
      sync();
    },
    setBleed(next: BleedArg | null): void {
      if (next === null) {
        bleed = null;
        sync();
        return;
      }
      if (next.boundary !== 1 && next.boundary !== 2) {
        throw new RangeError(`setBleed: boundary must be 1 or 2, got ${String(next.boundary)}`);
      }
      const wave = next.wave ?? DEFAULT_WAVE_VH * uniforms.uResolution.value.y;
      if (!Number.isFinite(wave) || wave < 0) {
        throw new RangeError(`setBleed: wave must be zero or more CSS px, got ${String(next.wave)}`);
      }
      bleed = { boundary: next.boundary, p: clamp01(next.p), wave };
      sync();
    },
    setReducedMotion(rm: boolean): void {
      reduced = rm;
      sync();
    },
    setQuality(tier: Tier): void {
      uniforms.uFibreOctaves.value = FIBRE_OCTAVES[tier];
    },
    update(tick: Tick): void {
      if (!reduced) uniforms.uTime.value += tick.dt;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      removeResize();
      stage.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
