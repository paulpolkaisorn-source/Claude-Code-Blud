// The grain and dither effect (design/direction-3d.md section 10.8). The shader is grain.frag.glsl.
// It is the last step of the merged pass in post.ts, so the composer's output encode follows it.
import * as THREE from 'three';
import { BlendFunction, Effect } from 'postprocessing';
import grainFragment from './grain.frag.glsl?raw';

/** Grain amplitude in display (sRGB) units at block mix m = 0 (paper). Seven levels of 255. */
export const GRAIN_AMP_M0 = 0.028;
/** Grain amplitude in display units at block mix m = 1 (ink). */
export const GRAIN_AMP_M1 = 0.04;
/** The grain seed under reduced motion. It never changes while reduced motion is on. */
export const GRAIN_SEED_STATIC = 17;

/**
 * Zero-mean grain and triangular dither, added in display space as one monochrome value (the same on
 * red, green and blue, so it never shifts a hue). The effect uses NORMAL blending, so its output
 * replaces the colour it received. The input and output are linear light.
 */
export class GrainEffect extends Effect {
  private readonly amplitudeUniform: THREE.Uniform<number>;
  private readonly seedUniform: THREE.Uniform<number>;
  private readonly ditherUniform: THREE.Uniform<number>;
  private readonly sizeUniform: THREE.Uniform<THREE.Vector2>;

  constructor() {
    const amplitude = new THREE.Uniform(GRAIN_AMP_M0);
    const seed = new THREE.Uniform(GRAIN_SEED_STATIC);
    const dither = new THREE.Uniform(1);
    const size = new THREE.Uniform(new THREE.Vector2(1, 1));
    super('GrainEffect', grainFragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uAmp', amplitude],
        ['uSeed', seed],
        ['uDither', dither],
        ['uSize', size],
      ]),
    });
    this.amplitudeUniform = amplitude;
    this.seedUniform = seed;
    this.ditherUniform = dither;
    this.sizeUniform = size;
  }

  /** Grain amplitude in display units. Post sets it from the block mix m. */
  setAmplitude(amplitude: number): void {
    if (!Number.isFinite(amplitude) || amplitude < 0) {
      throw new RangeError(`GrainEffect: amplitude ${amplitude} must be a finite number of zero or more`);
    }
    this.amplitudeUniform.value = amplitude;
  }

  get amplitude(): number {
    return this.amplitudeUniform.value;
  }

  /** The per-frame seed. Any value is a valid seed; the hash uses it as an integer. */
  setSeed(seed: number): void {
    this.seedUniform.value = seed;
  }

  get seed(): number {
    return this.seedUniform.value;
  }

  /** Turns the triangular dither on or off. Production always dithers; the harness switches it off for its readback checks. */
  setDither(on: boolean): void {
    this.ditherUniform.value = on ? 1 : 0;
  }

  get dither(): boolean {
    return this.ditherUniform.value !== 0;
  }

  /** Receives the drawing-buffer size in device pixels, which the hash uses as its pixel grid. */
  override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this.sizeUniform.value.set(width, height);
  }
}
