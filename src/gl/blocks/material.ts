// The block material (direction-3d 10.3 and 10.11): one MeshPhysicalMaterial shared by the 17 blocks.
// Per-instance colour comes from InstancedMesh.setColorAt. The kireji finish comes from the aFinish
// instance attribute, which blocks.ts creates. Both are read by the injected chunks in block.glsl.ts.
// This module draws no base colour: the caller writes instance colours for each m.
import * as THREE from 'three';
import { env, type Tier } from '../../core/env';
import {
  BLOCK_PROGRAM_KEY,
  FRAGMENT_CLEARCOAT,
  FRAGMENT_DECLARATIONS,
  FRAGMENT_ROUGHNESS,
  VERTEX_BEGIN_SMEAR_FINISH,
  VERTEX_DECLARATIONS,
  VERTEX_NORMAL_SMEAR,
} from './block.glsl';

export interface BlockMaterial {
  /** The shared material for the InstancedMesh. Its onBeforeCompile injects the kireji finish and the smear. */
  material: THREE.MeshPhysicalMaterial;
  /** Sets the block mix m, clamped to [0, 1]: 0 on paper, 1 on ink. Throws a RangeError when m is not finite. */
  setMix(m: number): void;
  /** Sets uSmear, clamped to [0, 1]. The caller damps it. Throws a RangeError when the value is not finite. */
  setSmear(strength: number): void;
  /** Sets the quality tier. 'low' drops clearcoat and anisotropy; 'mid' and 'high' keep them. */
  setQuality(q: 'low' | 'mid' | 'high'): void;
  /** Disposes the material and its micro-surface texture. The shared canvas stays for later materials. */
  dispose(): void;
}

// Values at m = 0 (paper) and m = 1 (ink), lerped linearly (10.3).
const METALNESS: readonly [number, number] = [0.35, 0.85];
const ROUGHNESS: readonly [number, number] = [0.42, 0.28];
const CLEARCOAT: readonly [number, number] = [0.25, 0];
const CLEARCOAT_ROUGHNESS = 0.2;
const ANISOTROPY = 0.5;
const ANISOTROPY_ROTATION = 0;
const BUMP_SCALE = 0.6;

/**
 * Lowest clearcoat weight on mid and high. three compiles the clearcoat layer only while the
 * clearcoat value is above zero, and the kireji needs that layer at every m. The other blocks get
 * this weight in place of the 0.00 of 10.3.
 */
const CLEARCOAT_FLOOR = 1e-4;

const ANISOTROPY_BY_TIER: Readonly<Record<Tier, number>> = { low: 1, mid: 2, high: 4 };

const MICRO_SIZE = 512;
const MICRO_SEED = 17;

let microSurface: HTMLCanvasElement | null = null;

/** xorshift32 (10.3): x ^= x << 13; x ^= x >>> 17; x ^= x << 5; r = x / 2^32. */
function xorshift32(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

/**
 * The 512 by 512 micro-surface canvas, drawn once. Each pixel row is one 1 px line with brightness
 * 0.85 + 0.15 r, where r is the next xorshift32 value. It serves as roughnessMap and bumpMap.
 */
export function microSurfaceCanvas(): HTMLCanvasElement {
  if (microSurface !== null) return microSurface;
  const canvas = document.createElement('canvas');
  canvas.width = MICRO_SIZE;
  canvas.height = MICRO_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('block material: no 2D context for the micro-surface canvas');
  const image = ctx.createImageData(MICRO_SIZE, MICRO_SIZE);
  const px = image.data;
  const random = xorshift32(MICRO_SEED);
  for (let y = 0; y < MICRO_SIZE; y += 1) {
    const level = Math.round((0.85 + 0.15 * random()) * 255);
    for (let x = 0; x < MICRO_SIZE; x += 1) {
      const i = (y * MICRO_SIZE + x) * 4;
      px[i] = level;
      px[i + 1] = level;
      px[i + 2] = level;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  microSurface = canvas;
  return canvas;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function unitInterval(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`block material: ${name} must be a finite number, got ${String(value)}`);
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Inserts chunk right after the single occurrence of marker. Throws when the marker is missing or
 * appears twice, so a three upgrade that renames a chunk fails at the first compile.
 */
function insertAfter(source: string, marker: string, chunk: string): string {
  const at = source.indexOf(marker);
  if (at === -1 || source.indexOf(marker, at + marker.length) !== -1) {
    throw new Error(`block material: expected exactly one ${marker} in the three shader`);
  }
  return source.replace(marker, () => `${marker}\n${chunk}`);
}

function injectVertex(source: string): string {
  let out = insertAfter(source, '#include <common>', VERTEX_DECLARATIONS);
  out = insertAfter(out, '#include <beginnormal_vertex>', VERTEX_NORMAL_SMEAR);
  return insertAfter(out, '#include <begin_vertex>', VERTEX_BEGIN_SMEAR_FINISH);
}

function injectFragment(source: string): string {
  let out = insertAfter(source, '#include <common>', FRAGMENT_DECLARATIONS);
  out = insertAfter(out, '#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS);
  return insertAfter(out, '#include <lights_physical_fragment>', FRAGMENT_CLEARCOAT);
}

/**
 * Builds one block material. It starts at the quality tier that env.ts guessed for this device. The
 * caller moves it with setQuality (quality.ts does this once the watchdog runs).
 */
export function createBlockMaterial(): BlockMaterial {
  // Uniform objects are created before any compile. onBeforeCompile hands this same object to the
  // shader, so writing smear.value is what the next frame draws.
  const smear = { value: 0 };

  const map = new THREE.CanvasTexture(microSurfaceCanvas());
  map.colorSpace = THREE.NoColorSpace; // data, not colour
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughnessMap: map,
    bumpMap: map,
    bumpScale: BUMP_SCALE,
    anisotropyRotation: ANISOTROPY_ROTATION,
  });

  let quality: Tier = env.tier;
  let mix = 0;

  /** Writes the values that depend on the mix m and the quality tier. */
  function applyValues(): void {
    const low = quality === 'low';
    material.metalness = lerp(METALNESS[0], METALNESS[1], mix);
    material.roughness = lerp(ROUGHNESS[0], ROUGHNESS[1], mix);
    material.clearcoat = low ? 0 : Math.max(lerp(CLEARCOAT[0], CLEARCOAT[1], mix), CLEARCOAT_FLOOR);
    material.clearcoatRoughness = CLEARCOAT_ROUGHNESS;
    material.anisotropy = low ? 0 : ANISOTROPY;
    material.anisotropyRotation = ANISOTROPY_ROTATION;
  }

  material.customProgramCacheKey = (): string => BLOCK_PROGRAM_KEY;
  material.onBeforeCompile = (parameters): void => {
    parameters.uniforms.uSmear = smear;
    parameters.vertexShader = injectVertex(parameters.vertexShader);
    parameters.fragmentShader = injectFragment(parameters.fragmentShader);
    material.userData.shader = parameters;
  };

  map.anisotropy = ANISOTROPY_BY_TIER[quality];
  applyValues();

  return {
    material,

    setMix(m: number): void {
      mix = unitInterval(m, 'mix');
      applyValues();
    },

    setSmear(strength: number): void {
      smear.value = unitInterval(strength, 'smear strength');
    },

    setQuality(q: 'low' | 'mid' | 'high'): void {
      if (q !== 'low' && q !== 'mid' && q !== 'high') {
        throw new RangeError(`block material: unknown quality ${String(q)}`);
      }
      if (q === quality) return;
      quality = q;
      map.anisotropy = ANISOTROPY_BY_TIER[q];
      map.needsUpdate = true;
      // The clearcoat and anisotropy switches change the compiled program, so the material is marked.
      material.needsUpdate = true;
      applyValues();
    },

    dispose(): void {
      material.dispose();
      map.dispose();
    },
  };
}
