// Paper and ink background: one fullscreen triangle that paints the ground, the paper fibre and the
// ink-bleed front (design/direction-3d.md section 10.10). The shader and its colour rules are in
// background.frag.glsl. This module owns the uniforms and the state that drives them.
import * as THREE from 'three';
import { env } from '../../core/env';
import type { Tick } from '../../core/ticker';
import type { Theme, Tier } from '../../core/types';
import type { Stage } from '../stage';
import fragmentShader from './background.frag.glsl?raw';
import vertexShader from './background.vert.glsl?raw';

export interface Background {
  /** The fullscreen triangle, already added to stage.scene. renderOrder -1, no depth test or write. */
  readonly mesh: THREE.Mesh;
  /** Sets the theme the ground takes when no bleed is active. */
  setTheme(theme: 'paper' | 'ink'): void;
  /** Draws the ink-bleed front at progress p (0..1), or removes it with null. */
  setBleed(bleed: { boundary: 1 | 2; p: number } | null): void;
  /** Reduced motion freezes uTime and ignores any bleed, so the theme switches at the cut. */
  setReducedMotion(rm: boolean): void;
  /** Quality tier. It sets the fibre octaves: low 2, mid 3, high 4. The perf watchdog steps it down. */
  setQuality(tier: Tier): void;
  /** Advances uTime by tick.dt. Does nothing under reduced motion. */
  update(tick: Tick): void;
  /** Removes the mesh from the scene and frees its GPU objects. Calling it twice is safe. */
  dispose(): void;
}

type BleedState = { boundary: 1 | 2; p: number };

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

  /** Writes every uniform that depends on the theme, the bleed and reduced motion. */
  function sync(): void {
    uniforms.uBase.value = theme === 'ink' ? 1 : 0;
    const active = reduced ? null : bleed;
    if (active === null) {
      uniforms.uBleedActive.value = 0;
      uniforms.uFibreAmp.value.set(FIBRE_AMP[theme], FIBRE_AMP[theme]);
      uniforms.uVignette.value.set(VIGNETTE[theme], VIGNETTE[theme]);
      return;
    }
    // Boundary 1: paper above the front, ink below. Boundary 2: ink above, paper below.
    const below: Theme = active.boundary === 1 ? 'ink' : 'paper';
    const above: Theme = below === 'ink' ? 'paper' : 'ink';
    uniforms.uBleedActive.value = 1;
    uniforms.uBleedDir.value = active.boundary;
    uniforms.uBleedP.value = active.p;
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
    setBleed(next: BleedState | null): void {
      if (next !== null && next.boundary !== 1 && next.boundary !== 2) {
        throw new RangeError(`setBleed: boundary must be 1 or 2, got ${String(next.boundary)}`);
      }
      bleed = next === null ? null : { boundary: next.boundary, p: clamp01(next.p) };
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
