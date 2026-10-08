// Screen projection for the 2D layer: act I rule A6, projection P1 (design/direction-act1.md), on the
// camera fits of design/direction-3d.md section 10.6 and the formations of section 11.
//
// Each 2D rectangle that follows a block (footprints, annotations, the hit test, the caliper and the
// ruler, the no-WebGL boxes and the family station labels) comes from here, so it sits where the 3D
// block is drawn. The projection is arithmetic only: there is no raycast, and this module does not
// import three, so 2D code can use it without the GL chunk. Its runtime imports are cameraKey
// (src/gl/rig.ts) and the formation data (src/gl/blocks/formations.ts), both pure math.
//
// Coordinates are CSS pixels in the viewport, with y pointing down. Each function that takes an out
// argument writes into it, reuses its entries, and allocates nothing when it is given.
import { BLOCK, FAMILY_STATION_X, formationFor, type Pose } from '../gl/blocks/formations';
import { cameraKey } from '../gl/rig';
import type { CameraKey, KeyName } from '../gl/section-gl';
import type { FormationId } from './types';

/** A rectangle in CSS pixels, viewport coordinates, with x0 <= x1 and y0 <= y1. */
export interface ScreenRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A size in CSS pixels. */
export interface Size {
  width: number;
  height: number;
}

/** A point in CSS pixels, viewport coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** Half the width and height of a block at scale 1, in bu (0.35). */
const HALF_SIDE = BLOCK.width / 2;

/** Half the depth of a block at scale 1, in bu (0.23). A footprint is taken on the front face, at z + 0.23 s. */
const HALF_DEPTH = BLOCK.depth / 2;

/** The four corners of a square, as signs of its half side: lower left, lower right, upper left, upper right. */
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/** The key that formationRects and stationCenters fill, so that they allocate nothing. */
const scratchKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: 22 };

/** The camera of the current call, expanded into the terms that project() reads. */
const view = {
  ox: 0,
  oy: 0,
  oz: 0, // camera position
  rx: 1,
  rz: 0, // screen right; its y component is always 0
  ux: 0,
  uy: 1,
  uz: 0, // screen up
  fx: 0,
  fy: 0,
  fz: -1, // unit view direction
  cx: 0,
  cy: 0, // screen centre, in px
  focal: 1, // focal length, in px: (height / 2) / tan(fov / 2)
};

/** The screen position that project() last computed. */
let projX = 0;
let projY = 0;

/** Expands key and size into view. Throws for a size that cannot be drawn or a view with no defined right axis. */
function loadView(key: CameraKey, size: Size): void {
  const { width, height } = size;
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new RangeError(`projection: ${width} x ${height} is not a usable viewport`);
  }
  view.ox = key.position[0];
  view.oy = key.position[1];
  view.oz = key.position[2];
  // The view direction runs from the camera to its target. Every page key looks straight down -z.
  let fx = key.target[0] - view.ox;
  let fy = key.target[1] - view.oy;
  let fz = key.target[2] - view.oz;
  const length = Math.hypot(fx, fy, fz);
  if (length > 0) {
    fx /= length;
    fy /= length;
    fz /= length;
  } else {
    fx = 0;
    fy = 0;
    fz = -1;
  }
  // Screen right is the view direction crossed with +y, normalised. It has no y component.
  const sideways = Math.hypot(fx, fz);
  if (sideways === 0) {
    throw new RangeError('projection: the view direction runs along the y axis');
  }
  view.rx = -fz / sideways;
  view.rz = fx / sideways;
  // Screen up is screen right crossed with the view direction. For the page's keys this is (0, 1, 0).
  view.ux = -view.rz * fy;
  view.uy = view.rz * fx - view.rx * fz;
  view.uz = view.rx * fy;
  view.fx = fx;
  view.fy = fy;
  view.fz = fz;
  view.cx = width / 2;
  view.cy = height / 2;
  // With the aspect folded in, the horizontal and vertical focal lengths are the same: (H / 2) / tan(fov / 2).
  view.focal = height / (2 * Math.tan((key.fov * Math.PI) / 360));
}

/**
 * Projects (x, y, z) through the loaded view into projX and projY, in CSS px. The point must lie in front
 * of the camera. A point behind the camera is not clipped, and its result has no meaning.
 */
function project(x: number, y: number, z: number): void {
  const dx = x - view.ox;
  const dy = y - view.oy;
  const dz = z - view.oz;
  const depth = dx * view.fx + dy * view.fy + dz * view.fz;
  const across = dx * view.rx + dz * view.rz;
  const upward = dx * view.ux + dy * view.uy + dz * view.uz;
  const scale = view.focal / depth;
  projX = view.cx + across * scale;
  projY = view.cy - upward * scale;
}

/** The viewport size in CSS px. The canvas is fixed to the viewport, so this is the canvas size too. */
export function viewportSize(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * The screen position of the point (x, y, z), seen by the camera of key in a viewport of size. The
 * projection is perspective with the key's vertical field of view. Writes into out when it is given.
 */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  key: CameraKey,
  size: Size,
  out?: Point,
): Point {
  loadView(key, size);
  project(x, y, z);
  if (out === undefined) return { x: projX, y: projY };
  out.x = projX;
  out.y = projY;
  return out;
}

/**
 * The P1 footprints of a list of poses, seen through key (rule A6). Block i gets the rectangle through
 * the four projected corners of its front face, which sits at z + 0.23 s, with corners at x +- 0.35 s and
 * y +- 0.35 s. Rotations are ignored, because the portrait turn is already in the poses. Writes into out
 * when it is given, reusing its entries, and returns out. The result has one rectangle for each pose.
 */
export function blockRects(
  poses: readonly Pose[],
  key: CameraKey,
  size: Size,
  out?: ScreenRect[],
): ScreenRect[] {
  loadView(key, size);
  const rects = out ?? [];
  rects.length = poses.length;
  for (let i = 0; i < poses.length; i += 1) {
    const pose = poses[i];
    const front = pose.p[2] + HALF_DEPTH * pose.s;
    const half = HALF_SIDE * pose.s;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let c = 0; c < CORNERS.length; c += 1) {
      const corner = CORNERS[c];
      project(pose.p[0] + corner[0] * half, pose.p[1] + corner[1] * half, front);
      x0 = Math.min(x0, projX);
      x1 = Math.max(x1, projX);
      y0 = Math.min(y0, projY);
      y1 = Math.max(y1, projY);
    }
    let rect: ScreenRect | undefined = rects[i];
    if (rect === undefined) {
      rect = { x0, y0, x1, y1 };
      rects[i] = rect;
    } else {
      rect.x0 = x0;
      rect.y0 = y0;
      rect.x1 = x1;
      rect.y1 = y1;
    }
  }
  return rects;
}

/**
 * The P1 footprints of a formation, seen through the camera that cameraKey gives keyName for size. A
 * portrait viewport (width below height) takes the turned poses of race and family (formationFor).
 * Writes into out when it is given, and allocates nothing then.
 */
export function formationRects(id: FormationId, keyName: KeyName, size: Size, out?: ScreenRect[]): ScreenRect[] {
  const key = cameraKey(keyName, size, scratchKey);
  return blockRects(formationFor(id, size.width < size.height), key, size, out);
}

/**
 * The union of the rectangles from index from to index to, both inclusive. With no range, it covers all
 * of them. The stanza rows are boundsOf(rects, 0, 4), boundsOf(rects, 5, 11) and boundsOf(rects, 12, 16).
 * Throws a RangeError when the range is empty or lies outside rects. Writes into out when it is given.
 */
export function boundsOf(
  rects: readonly ScreenRect[],
  from = 0,
  to = rects.length - 1,
  out?: ScreenRect,
): ScreenRect {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to >= rects.length || from > to) {
    throw new RangeError(`boundsOf: ${from} to ${to} is not a range of ${rects.length} rectangles`);
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = from; i <= to; i += 1) {
    const rect = rects[i];
    x0 = Math.min(x0, rect.x0);
    y0 = Math.min(y0, rect.y0);
    x1 = Math.max(x1, rect.x1);
    y1 = Math.max(y1, rect.y1);
  }
  if (out === undefined) return { x0, y0, x1, y1 };
  out.x0 = x0;
  out.y0 = y0;
  out.x1 = x1;
  out.y1 = y1;
  return out;
}

/**
 * The centres of the four family stations (Slower, Moderate, Fast, Fastest), projected with the family
 * key at z 0. In landscape the stations run left to right. In portrait the family axis turns by -pi/2
 * about z, so station x becomes y = -x and the stations run from top to bottom (section 11.8). Writes into
 * out when it is given, reusing its entries.
 */
export function stationCenters(size: Size, out?: Point[]): Point[] {
  const key = cameraKey('family', size, scratchKey);
  loadView(key, size);
  const portrait = size.width < size.height;
  const points = out ?? [];
  points.length = FAMILY_STATION_X.length;
  for (let i = 0; i < FAMILY_STATION_X.length; i += 1) {
    const x = FAMILY_STATION_X[i];
    project(portrait ? 0 : x, portrait ? -x : 0, 0);
    let point: Point | undefined = points[i];
    if (point === undefined) {
      point = { x: projX, y: projY };
      points[i] = point;
    } else {
      point.x = projX;
      point.y = projY;
    }
  }
  return points;
}
