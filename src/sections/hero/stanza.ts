// Hero stanza geometry for the 2D layer (design/direction-act1.md, hero; rules A6 and A7; direction-3d 11.2, 11.11 and
// 10.12).
//
// The annotations and the no-WebGL stanza sit over the 3D blocks, so their rectangles come from the same poses and
// the same camera. The rest pose is FORMATIONS.stanza. The open pose is built from it here: each block keeps its
// rest position with x scaled by pitch / 0.87 and y scaled by lift / 1.05, which is the modulation of direction-3d
// 11.11 (pitch 0.87 + 0.08 k, rows A and C at +-(1.05 + 0.08 k)). The idle breath of the hero (direction-3d 10.12) is
// the same row offset the 3D adds on y, so it is passed in per row by the caller. The camera is the hero keyframe of
// A7. Both feed blockRects, the one placement function in projection.ts (P1, rule A6).
//
// Imports: formations.ts and timing.ts are pure data, and projection.ts is the bridge to the camera. Nothing else from
// src/gl is imported, and no three.js.
import { blockRects, type ScreenRect, type Size } from '../../core/projection';
import { T } from '../../core/timing';
import { FORMATIONS, ROWS, type Pose } from '../../gl/blocks/formations';

/** A camera for projection: the fields of CameraKey (src/gl/section-gl.ts), written out so that no GL type is imported. */
export interface HeroKey {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** Vertical field of view of every keyframe, in degrees (direction-3d 10.6). */
const FOV_DEG = 22;
/** tan(11 deg), half the vertical field of view in radians (rule A6). */
const TAN_HALF_FOV = Math.tan((11 * Math.PI) / 180);
/** Width of the stanza at rest, in bu: six pitches of 0.87 and one block of 0.70 (direction-3d 10.6). */
const STANZA_WIDTH = 5.92;
/** Desktop fill: the stanza spans 0.90 of the visible width, which is 2 x 0.45 (rule A7). */
const DESKTOP_SPAN = 0.9;
/** Phone fill: the stanza spans 1.68 of the visible width, which is 2 x 0.84 (rule A7). */
const PHONE_SPAN = 1.68;
/** Desktop camera x, as a share of the visible width (A7 gives -2.894 at every desktop aspect). */
const DESKTOP_OFFSET_X = -0.22;
/** Phone camera y: it places the stanza in the upper half (A7). */
const PHONE_Y = -1.1;

/** Rest pitch and rest lift of the stanza, in bu (direction-3d 11.2). */
const REST_PITCH = 0.87;
const REST_LIFT = 1.05;
/** Growth of the pitch and the lift over the open, in bu per unit of k (direction-3d 11.11). */
const OPEN_STEP = 0.08;

/**
 * The idle breath of the hero, as the 3D layer applies it (heroGL.breath, direction-act1 hero 3D layer): amplitude in
 * bu on y, and the rows pattern of direction-3d 10.12 (row phases 0, 0.4 pi and 0.8 pi, one cycle per T.breath).
 */
export const HERO_BREATH_AMPLITUDE = 0.012;
const BREATH_OMEGA = (2 * Math.PI) / T.breath;
const ROW_PHASE: readonly number[] = [0, 0.4 * Math.PI, 0.8 * Math.PI];

/** Row of each block: 0 is row A, 1 is row B, 2 is row C (the rows of formations.ts, ROWS 5, 7, 5). */
const ROW_OF: readonly number[] = ROWS.flatMap((n, row) => Array.from({ length: n }, () => row));

function blankKey(): HeroKey {
  return { position: [0, 0, 0], target: [0, 0, 0], fov: FOV_DEG };
}

const keyBuffer: HeroKey = blankKey();
const poseBuffer: Pose[] = [];

/**
 * The hero keyframe for a viewport (rule A7). Desktop is an aspect of 1 or wider, phone is below 1. The
 * numbers are the ones of cameraKey('hero') in src/gl/rig.ts, so the 2D rectangles sit on the 3D blocks.
 * Writes into out and returns it.
 */
export function heroKey(size: Size, out: HeroKey = blankKey()): HeroKey {
  const aspect = size.width / size.height;
  let x = 0;
  let y = 0;
  let z: number;
  if (aspect >= 1) {
    z = STANZA_WIDTH / (DESKTOP_SPAN * TAN_HALF_FOV * aspect);
    x = DESKTOP_OFFSET_X * 2 * z * TAN_HALF_FOV * aspect;
  } else {
    z = STANZA_WIDTH / (PHONE_SPAN * TAN_HALF_FOV * aspect);
    y = PHONE_Y;
  }
  out.position[0] = x;
  out.position[1] = y;
  out.position[2] = z;
  out.target[0] = x;
  out.target[1] = y;
  out.target[2] = 0;
  out.fov = FOV_DEG;
  return out;
}

/**
 * The 17 poses of the stanza at open progress k, where k is ef.sym of the hero progress (k = 0 is the rest pose,
 * k = 1 is pitch 0.95 with rows at 1.13). Each pose is derived from FORMATIONS.stanza. rowDy, when given, is the
 * breath offset of rows A, B and C in bu, added on y to every block of the row. Writes into out, reusing its entries,
 * and returns out.
 */
export function stanzaPoses(k: number, out: Pose[], rowDy?: readonly number[]): Pose[] {
  const rest = FORMATIONS.stanza;
  const scaleX = (REST_PITCH + OPEN_STEP * k) / REST_PITCH;
  const scaleY = (REST_LIFT + OPEN_STEP * k) / REST_LIFT;
  for (let i = 0; i < rest.length; i += 1) {
    let pose = out[i];
    if (pose === undefined) {
      pose = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
      out[i] = pose;
    }
    pose.p[0] = rest[i].p[0] * scaleX;
    pose.p[1] = rest[i].p[1] * scaleY + (rowDy === undefined ? 0 : rowDy[ROW_OF[i]]);
    pose.p[2] = rest[i].p[2];
    pose.r[0] = 0;
    pose.r[1] = 0;
    pose.r[2] = 0;
    pose.s = 1;
  }
  out.length = rest.length;
  return out;
}

/**
 * The breath offsets of rows A, B and C at the page-clock time (seconds) for a breath gain in [0, 1], in bu on y.
 * This is the same term the 3D layer adds to each block (blocks.ts compose): amplitude x gain x sin(omega t + phase).
 * Writes into out, reusing its entries, and returns out.
 */
export function breathRowOffsets(time: number, gain: number, out: number[]): number[] {
  for (let row = 0; row < 3; row += 1) {
    out[row] = HERO_BREATH_AMPLITUDE * gain * Math.sin(BREATH_OMEGA * time + ROW_PHASE[row]);
  }
  out.length = 3;
  return out;
}

/** Half the side of a block and the offset of its front face, in bu (BLOCK.width / 2 and BLOCK.depth / 2). */
const HALF_SIDE = 0.35;
const FRONT_OFFSET = 0.23;

/** The four corners of a square, as signs of its half side: lower left, lower right, upper left, upper right. */
const CORNER_SIGNS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * The P1 footprints of the blocks with the group tilt applied: the front face corners are turned by the group rotation
 * R = Rx(tiltX) Ry(tiltY) (three.js Euler XYZ with z 0, the order the 3D layer uses), then projected through the hero
 * camera, which looks straight down -z at (x, y, 0). Writes into out, reusing its entries, and returns out.
 */
function tiltedRects(poses: readonly Pose[], key: HeroKey, size: Size, out: ScreenRect[], tiltX: number, tiltY: number): ScreenRect[] {
  const focal = size.height / (2 * Math.tan((key.fov * Math.PI) / 360));
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const ox = key.position[0];
  const oy = key.position[1];
  const oz = key.position[2];
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const cosY = Math.cos(tiltY);
  const sinY = Math.sin(tiltY);
  out.length = poses.length;
  for (let i = 0; i < poses.length; i += 1) {
    const q = poses[i];
    const half = HALF_SIDE * q.s;
    const front = q.p[2] + FRONT_OFFSET * q.s;
    let rect = out[i];
    if (rect === undefined) {
      rect = blankRect();
      out[i] = rect;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let c = 0; c < CORNER_SIGNS.length; c += 1) {
      const [a, b] = CORNER_SIGNS[c];
      const x = q.p[0] + a * half;
      const y = q.p[1] + b * half;
      // Ry first, then Rx: the vector is turned by Rx(tiltX) Ry(tiltY).
      const x1r = x * cosY + front * sinY;
      const zr = -x * sinY + front * cosY;
      const yr = y * cosX - zr * sinX;
      const zt = y * sinX + zr * cosX;
      const depth = oz - zt;
      const sx = halfW + ((x1r - ox) * focal) / depth;
      const sy = halfH - ((yr - oy) * focal) / depth;
      if (sx < x0) x0 = sx;
      if (sx > x1) x1 = sx;
      if (sy < y0) y0 = sy;
      if (sy > y1) y1 = sy;
    }
    rect.x0 = x0;
    rect.y0 = y0;
    rect.x1 = x1;
    rect.y1 = y1;
  }
  return out;
}

/**
 * The P1 footprints of the 17 blocks of the stanza at open progress k, in the viewport of size (rule A6). rowDy is the
 * breath offset per row, as stanzaPoses takes it, and tiltX and tiltY are the group tilt in radians (rotX and rotY of
 * direction-act1 hero, pointer only; 0 when the stanza is level). Writes into out, reusing its entries, and returns the
 * rectangles. Index i is block i, in haiku order.
 */
export function stanzaRects(
  k: number,
  size: Size,
  out: ScreenRect[],
  rowDy?: readonly number[],
  tiltX = 0,
  tiltY = 0,
): ScreenRect[] {
  stanzaPoses(k, poseBuffer, rowDy);
  const key = heroKey(size, keyBuffer);
  if (tiltX === 0 && tiltY === 0) return blockRects(poseBuffer, key, size, out);
  return tiltedRects(poseBuffer, key, size, out, tiltX, tiltY);
}

function blankRect(): ScreenRect {
  return { x0: 0, y0: 0, x1: 0, y1: 0 };
}
