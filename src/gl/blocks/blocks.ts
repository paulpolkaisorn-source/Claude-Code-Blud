// The 17 machined blocks as one InstancedMesh, so they cost one draw call (direction-3d sections 10.2,
// 10.12, 10.13 and 10.16; architecture sections 6 and 10a). The class starts no loop: the caller registers
// update() at PRIORITY.glUpdate. Every setter records a state, and update() applies them all in one pass.
//
// Each frame, every block's instance matrix is composed once, from four layers in this order:
//   1. its formation pose (setTransition or setPoses), scaled by its entrance multiplier;
//   2. the idle breath, a vertical offset on y;
//   3. its lift, on y and z, damped with T.half.
// The group above the mesh carries the pointer tilt and the group offset, both damped with T.half. A
// block's matrix is written only when it differs from the last write, so the instance buffer is uploaded
// only when something moved.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ef } from '../../core/ease';
import type { Tick } from '../../core/ticker';
import { T, scrubLocal } from '../../core/timing';
import type { Stage } from '../stage';
import {
  BLOCK,
  BLOCK_COUNT,
  FORMATIONS,
  KIREJI,
  ROWS,
  formationFor,
  lerpPose,
  staggerPosition,
  type FormationId,
  type Pose,
} from './formations';
import type { BlockMaterial } from './material';

/** The phase pattern of the idle breath (direction-3d 10.12). */
export type BreathPhase = 'rows' | 'zero' | 'wave';

/** One breath request: the amplitude in bu on y, and the phase pattern. */
export interface BreathMode {
  amplitude: number;
  phase: BreathPhase;
}

/** Breath angular frequency: one cycle per T.breath. */
const BREATH_OMEGA = (2 * Math.PI) / T.breath;
/** Pointer tilt per unit of pointer position, capped at the same value on each axis (10.13). */
const TILT_RAD = 0.035;
/** Phase step per block index in the travelling wave: dy_k = A sin(omega t - 0.2 k) (10.12). */
const WAVE_STEP = 0.2;
/** Phase of rows A, B and C in the 'rows' pattern (10.12). */
const ROW_PHASE: readonly number[] = [0, 0.4 * Math.PI, 0.8 * Math.PI];
/** Row of each block: 0 is row A, 1 is row B, 2 is row C. */
const ROW_OF: readonly number[] = ROWS.flatMap((n, row) => Array.from({ length: n }, () => row));
/** Scrub profile of a formation transition (architecture section 6). */
const SCRUB = { total: 0.35, lead: 0.1 };
/**
 * The smallest scale a block is composed with. Three's instanced normal divides by the scale, so an exact
 * zero would give NaN normals on that block.
 */
const MIN_SCALE = 1e-4;
/** A damped value within this distance of its target lands on it, so a settled value stops changing. */
const SNAP = 1e-7;

// Block colours in linear working space (10.3). THREE.Color converts each hex from sRGB when it is made.
const ANODIZED = new THREE.Color(0x2b2a26); // block at m = 0
const STEEL = new THREE.Color(0xbdb7a9); // block at m = 1
const SEAL = new THREE.Color(0xb5312a); // kireji at m = 0
const SEAL_INK = new THREE.Color(0xe7735f); // kireji at m = 1

// Scratch values, reused by every call so that update() and projectRects() allocate nothing.
const scratchPosition = new THREE.Vector3();
const scratchScale = new THREE.Vector3();
const scratchEuler = new THREE.Euler();
const scratchQuaternion = new THREE.Quaternion();
const scratchBlock = new THREE.Matrix4();
const scratchWorld = new THREE.Matrix4();
const scratchCorner = new THREE.Vector3();
const scratchColour = new THREE.Color();

function requireFinite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`blocks: ${name} must be a finite number, got ${String(value)}`);
  }
  return value;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function checkIndex(i: number): number {
  if (!Number.isInteger(i) || i < 0 || i >= BLOCK_COUNT) {
    throw new RangeError(`blocks: block index ${String(i)} is outside 0 to ${BLOCK_COUNT - 1}`);
  }
  return i;
}

/** One exponential step toward target. a = 1 - exp(-dt / tau), so the gap shrinks the same way at any frame rate. */
function damp(value: number, target: number, a: number): number {
  const next = value + (target - value) * a;
  return Math.abs(target - next) < SNAP ? target : next;
}

/** Breath phase of block i under a pattern (10.12). */
function phaseOf(mode: BreathPhase, i: number): number {
  if (mode === 'rows') return ROW_PHASE[ROW_OF[i]];
  if (mode === 'wave') return -WAVE_STEP * i;
  return 0;
}

function clonePose(src: Pose): Pose {
  return { p: [src.p[0], src.p[1], src.p[2]], r: [src.r[0], src.r[1], src.r[2]], s: src.s };
}

function copyPose(src: Pose, dst: Pose): void {
  dst.p[0] = src.p[0];
  dst.p[1] = src.p[1];
  dst.p[2] = src.p[2];
  dst.r[0] = src.r[0];
  dst.r[1] = src.r[1];
  dst.r[2] = src.r[2];
  dst.s = src.s;
}

/** The 17 blocks of one stage. The material is owned by the caller; dispose() does not touch it. */
export class Blocks {
  /** The formation group: the pointer tilt and the group offset. stage.scene holds it. */
  readonly group: THREE.Group;
  /** The 17 blocks: one InstancedMesh and one draw call. */
  readonly mesh: THREE.InstancedMesh;

  private readonly stage: Stage;
  private readonly mat: BlockMaterial;
  private readonly geometry: RoundedBoxGeometry;

  /** The poses in effect, one per block. setTransition and setPoses write them. */
  private readonly poses: Pose[];
  /** Per-block scale multiplier for the preloader handoff. 1 is the full block. */
  private readonly entrance = new Float64Array(BLOCK_COUNT).fill(1);

  /** Lift targets and the damped lift values, on y and z, per block. */
  private readonly liftTargetY = new Float64Array(BLOCK_COUNT);
  private readonly liftTargetZ = new Float64Array(BLOCK_COUNT);
  private readonly liftY = new Float64Array(BLOCK_COUNT);
  private readonly liftZ = new Float64Array(BLOCK_COUNT);

  private breath: BreathMode | null = null;
  /** The amplitude of the last breath request. It stays after the breath stops, so the offset eases out. */
  private breathAmplitude = 0;
  /** Set by a breath request from rest. The next update reads the clock and starts the hold. */
  private breathArmed = false;
  /** Tick time at which breathing may start: the request time plus T.hold. */
  private breathStart = 0;
  /** The blocks allowed to breathe, or null for all of them. */
  private active: Uint8Array | null = null;
  /** Per-block breath gain in [0, 1]. It eases to 1 while the block breathes and to 0 while it holds still. */
  private readonly breathGain = new Float64Array(BLOCK_COUNT);
  /** Per-block breath phase, eased toward the phase of the current pattern. */
  private readonly breathPhase = new Float64Array(BLOCK_COUNT);

  private tiltTargetX = 0;
  private tiltTargetY = 0;
  private tiltX = 0;
  private tiltY = 0;
  private readonly offsetTarget = new Float64Array(3);
  private readonly offset = new Float64Array(3);

  private mix = NaN;
  private smear = 0;
  private reduced = false;
  private disposed = false;

  /** The matrix last written to each block, in float64. A block is written again only when its matrix differs. */
  private readonly written = new Float64Array(BLOCK_COUNT * 16);

  constructor(stage: Stage, mat: BlockMaterial) {
    this.stage = stage;
    this.mat = mat;

    this.geometry = new RoundedBoxGeometry(BLOCK.width, BLOCK.height, BLOCK.depth, BLOCK.segments, BLOCK.radius);
    // The kireji flag, one value per instance. Without this attribute the shader reads 0 on every block.
    const finish = new Float32Array(BLOCK_COUNT);
    finish[KIREJI] = 1;
    this.geometry.setAttribute('aFinish', new THREE.InstancedBufferAttribute(finish, 1));

    this.mesh = new THREE.InstancedMesh(this.geometry, mat.material, BLOCK_COUNT);
    this.mesh.name = 'blocks';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;

    this.group = new THREE.Group();
    this.group.name = 'blocks-formation';
    this.group.add(this.mesh);
    stage.scene.add(this.group);

    this.poses = FORMATIONS.stanza.map(clonePose);
    this.setMix(0);
    this.written.fill(NaN);
    if (this.refresh(0)) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Scrubbed transition from one formation to another. Block i moves over its own span of t: its local
   * progress comes from scrubLocal at its stagger position in the target formation, eased with sym. t = 0
   * gives the from formation exactly and t = 1 the to formation exactly. portrait selects the turned race
   * and family poses (D15.1 and 11.8).
   */
  setTransition(from: FormationId, to: FormationId, t: number, portrait: boolean): void {
    const u = clamp(requireFinite(t, 'transition progress'), 0, 1);
    const start = formationFor(from, portrait);
    const end = formationFor(to, portrait);
    const order = staggerPosition(to);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const local = scrubLocal(order[i], BLOCK_COUNT, u, SCRUB);
      lerpPose(start[i], end[i], ef.sym(local), this.poses[i]);
    }
  }

  /** Sets the poses directly, with no transition. The hero stanza-open modulation and reduced motion use it. */
  setPoses(poses: readonly Pose[]): void {
    if (poses.length !== BLOCK_COUNT) {
      throw new RangeError(`blocks: setPoses needs ${BLOCK_COUNT} poses, got ${poses.length}`);
    }
    for (let i = 0; i < BLOCK_COUNT; i += 1) copyPose(poses[i], this.poses[i]);
  }

  /** Scales block i in place by k, from 0 to 1, for the preloader handoff. Its position does not change. */
  setEntrance(i: number, k: number): void {
    this.entrance[checkIndex(i)] = clamp(requireFinite(k, 'entrance'), 0, 1);
  }

  /**
   * The block mix m: 0 on paper, 1 on ink. The block colour lerps in linear space from #2B2A26 to #BDB7A9,
   * and the kireji (index 4) from #B5312A to #E7735F. The material's mix follows.
   */
  setMix(m: number): void {
    const value = clamp(requireFinite(m, 'mix'), 0, 1);
    if (value === this.mix) return;
    this.mix = value;
    this.mat.setMix(value);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      if (i === KIREJI) scratchColour.copy(SEAL).lerp(SEAL_INK, value);
      else scratchColour.copy(ANODIZED).lerp(STEEL, value);
      this.mesh.setColorAt(i, scratchColour);
    }
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
  }

  /** The smear strength, 0 to 1, for the speed section (10.11). Reduced motion holds it at 0. */
  setSmear(strength: number): void {
    this.smear = requireFinite(strength, 'smear strength');
    this.mat.setSmear(this.reduced ? 0 : this.smear);
  }

  /**
   * The idle breath, or null to stop it. Breathing starts T.hold after a request made from rest, and eases
   * in and out with T.half. A change of pattern while breathing eases the phases instead of jumping.
   */
  setBreath(mode: BreathMode | null): void {
    if (mode === null) {
      this.breath = null;
      this.breathArmed = false;
      return;
    }
    requireFinite(mode.amplitude, 'breath amplitude');
    if (mode.amplitude < 0) throw new RangeError(`blocks: breath amplitude ${mode.amplitude} is negative`);
    if (mode.phase !== 'rows' && mode.phase !== 'zero' && mode.phase !== 'wave') {
      throw new RangeError(`blocks: unknown breath phase ${String(mode.phase)}`);
    }
    if (this.breath === null) this.breathArmed = true;
    this.breath = { amplitude: mode.amplitude, phase: mode.phase };
    this.breathAmplitude = mode.amplitude;
  }

  /** The blocks that breathe, by index. null lets every block breathe. The others hold still. */
  setActiveGroup(indices: readonly number[] | null): void {
    if (indices === null) {
      this.active = null;
      return;
    }
    const mask = new Uint8Array(BLOCK_COUNT);
    for (const i of indices) mask[checkIndex(i)] = 1;
    this.active = mask;
  }

  /**
   * Pointer tilt targets, each from -1 to 1. rotX = -sy x 0.035 and rotY = sx x 0.035, capped at 0.035 on
   * each axis. The group turns to the damped values.
   */
  setTilt(sx: number, sy: number): void {
    this.tiltTargetX = clamp(-requireFinite(sy, 'tilt y') * TILT_RAD, -TILT_RAD, TILT_RAD);
    this.tiltTargetY = clamp(requireFinite(sx, 'tilt x') * TILT_RAD, -TILT_RAD, TILT_RAD);
  }

  /** The group offset target in bu, for the code section's pointer translation. Damped with T.half. */
  setGroupOffset(x: number, y: number, z: number): void {
    this.offsetTarget[0] = requireFinite(x, 'group offset x');
    this.offsetTarget[1] = requireFinite(y, 'group offset y');
    this.offsetTarget[2] = requireFinite(z, 'group offset z');
  }

  /** The lift target of block i in bu on y, and on z (dz defaults to 0). Damped with T.half. */
  setLift(i: number, dy: number, dz = 0): void {
    const b = checkIndex(i);
    this.liftTargetY[b] = requireFinite(dy, 'lift dy');
    this.liftTargetZ[b] = requireFinite(dz, 'lift dz');
  }

  /**
   * Reduced motion holds the breath, tilt, lifts, group offset and smear at 0. It snaps them to 0 at once,
   * with no damping, and keeps them there until it is switched off.
   */
  setReducedMotion(rm: boolean): void {
    const wasReduced = this.reduced;
    this.reduced = rm;
    if (rm) {
      this.tiltX = 0;
      this.tiltY = 0;
      this.offset.fill(0);
      this.liftY.fill(0);
      this.liftZ.fill(0);
      this.breathGain.fill(0);
      this.mat.setSmear(0);
    } else {
      // Leaving reduced motion restarts a breath that is still requested, after the hold, as from rest.
      if (wasReduced && this.breath !== null) this.breathArmed = true;
      this.mat.setSmear(this.smear);
    }
  }

  /**
   * Applies every state for this frame. Call it at PRIORITY.glUpdate, once per frame. It allocates nothing.
   * Each block's matrix is composed once. Only the blocks whose matrix changed are written, and the instance
   * buffer is marked for upload only when at least one changed.
   */
  update(tick: Tick): void {
    if (this.disposed) return;
    const now = tick.time;
    const dt = tick.dt > 0 ? tick.dt : 0;
    const a = dt > 0 ? 1 - Math.exp(-dt / T.half) : 0;
    const rm = this.reduced;
    const mode = this.breath;

    if (this.breathArmed) {
      this.breathArmed = false;
      this.breathStart = now + T.hold;
      if (mode !== null) {
        for (let i = 0; i < BLOCK_COUNT; i += 1) this.breathPhase[i] = phaseOf(mode.phase, i);
      }
    }

    this.tiltX = damp(this.tiltX, rm ? 0 : this.tiltTargetX, a);
    this.tiltY = damp(this.tiltY, rm ? 0 : this.tiltTargetY, a);
    for (let c = 0; c < 3; c += 1) {
      this.offset[c] = damp(this.offset[c], rm ? 0 : this.offsetTarget[c], a);
    }
    this.group.rotation.set(this.tiltX, this.tiltY, 0);
    this.group.position.set(this.offset[0], this.offset[1], this.offset[2]);

    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      this.liftY[i] = damp(this.liftY[i], rm ? 0 : this.liftTargetY[i], a);
      this.liftZ[i] = damp(this.liftZ[i], rm ? 0 : this.liftTargetZ[i], a);
    }

    const breathing = mode !== null && !rm && now >= this.breathStart;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const on = breathing && (this.active === null || this.active[i] === 1);
      this.breathGain[i] = damp(this.breathGain[i], on ? 1 : 0, a);
      if (on && mode !== null) this.breathPhase[i] = damp(this.breathPhase[i], phaseOf(mode.phase, i), a);
    }

    if (this.refresh(now)) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * The screen rectangles of the 17 blocks, in CSS px: out holds minX, minY, maxX, maxY for block 0, then
   * block 1, and so on (68 floats). Each rectangle bounds the eight projected corners of a block, taken with
   * the camera and with the formation, lifts, breath, tilt and offset as the last update() drew them. Nothing
   * is raycast.
   */
  projectRects(camera: THREE.Camera, viewport: { width: number; height: number }, out: Float32Array): void {
    if (out.length < BLOCK_COUNT * 4) {
      throw new RangeError(`blocks: projectRects needs an array of ${BLOCK_COUNT * 4} floats`);
    }
    camera.updateMatrixWorld();
    this.group.updateWorldMatrix(true, false);
    const world = this.group.matrixWorld;
    const hw = BLOCK.width / 2;
    const hh = BLOCK.height / 2;
    const hd = BLOCK.depth / 2;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      scratchBlock.fromArray(this.written, i * 16);
      scratchWorld.multiplyMatrices(world, scratchBlock);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let c = 0; c < 8; c += 1) {
        scratchCorner.set((c & 1) !== 0 ? hw : -hw, (c & 2) !== 0 ? hh : -hh, (c & 4) !== 0 ? hd : -hd);
        scratchCorner.applyMatrix4(scratchWorld).project(camera);
        const x = (scratchCorner.x * 0.5 + 0.5) * viewport.width;
        const y = (0.5 - scratchCorner.y * 0.5) * viewport.height;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const o = i * 4;
      out[o] = minX;
      out[o + 1] = minY;
      out[o + 2] = maxX;
      out[o + 3] = maxY;
    }
  }

  /** Removes the group from stage.scene and frees the geometry and the instance buffers. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.group.remove(this.mesh);
    this.stage.scene.remove(this.group);
    this.mesh.dispose();
    this.geometry.dispose();
  }

  /** Composes every block once and writes the ones that changed. Returns true when any did. */
  private refresh(now: number): boolean {
    let changed = false;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      this.compose(i, now);
      if (this.commit(i)) changed = true;
    }
    return changed;
  }

  /** Composes block i into scratchBlock: its pose, then the breath and lift offsets, then its entrance scale. */
  private compose(i: number, now: number): void {
    const pose = this.poses[i];
    let dy = this.liftY[i];
    const gain = this.breathGain[i];
    if (gain > 0) {
      dy += this.breathAmplitude * gain * Math.sin(BREATH_OMEGA * now + this.breathPhase[i]);
    }
    scratchPosition.set(pose.p[0], pose.p[1] + dy, pose.p[2] + this.liftZ[i]);
    scratchEuler.set(pose.r[0], pose.r[1], pose.r[2]);
    scratchQuaternion.setFromEuler(scratchEuler);
    const s = pose.s * Math.max(this.entrance[i], MIN_SCALE);
    scratchScale.set(s, s, s);
    scratchBlock.compose(scratchPosition, scratchQuaternion, scratchScale);
  }

  /** Writes scratchBlock to the instance matrix of block i if it differs from the last write. */
  private commit(i: number): boolean {
    const e = scratchBlock.elements;
    const base = i * 16;
    let differs = false;
    for (let k = 0; k < 16; k += 1) {
      if (this.written[base + k] !== e[k]) {
        differs = true;
        break;
      }
    }
    if (!differs) return false;
    for (let k = 0; k < 16; k += 1) this.written[base + k] = e[k];
    this.mesh.setMatrixAt(i, scratchBlock);
    return true;
  }
}
