// Hero stanza geometry for the 2D layer (design/direction-act1.md, hero; rules A6 and A7; direction-3d 11.2 and 11.11).
//
// The annotations and the no-WebGL stanza sit over the 3D blocks, so their rectangles come from the same poses and
// the same camera. The rest pose is FORMATIONS.stanza. The open pose is built from it here: each block keeps its
// rest position with x scaled by pitch / 0.87 and y scaled by lift / 1.05, which is the modulation of direction-3d
// 11.11 (pitch 0.87 + 0.08 k, rows A and C at +-(1.05 + 0.08 k)). The camera is the hero keyframe of A7. Both feed
// blockRects, the one placement function in projection.ts (P1, rule A6).
//
// Imports: formations.ts is pure data, and projection.ts is the bridge to the camera. Nothing else from src/gl
// is imported, and no three.js.
import { blockRects, type ScreenRect, type Size } from '../../core/projection';
import { FORMATIONS, type Pose } from '../../gl/blocks/formations';

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
 * k = 1 is pitch 0.95 with rows at 1.13). Each pose is derived from FORMATIONS.stanza. Writes into out, reusing
 * its entries, and returns out.
 */
export function stanzaPoses(k: number, out: Pose[]): Pose[] {
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
    pose.p[1] = rest[i].p[1] * scaleY;
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
 * The P1 footprints of the 17 blocks of the stanza at open progress k, in the viewport of size (rule A6). Writes
 * into out, reusing its entries, and returns the rectangles. Index i is block i, in haiku order.
 */
export function stanzaRects(k: number, size: Size, out: ScreenRect[]): ScreenRect[] {
  stanzaPoses(k, poseBuffer);
  return blockRects(poseBuffer, heroKey(size, keyBuffer), size, out);
}
