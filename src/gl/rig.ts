// The camera rig: the keyframe fits and the camera state that the choreography blends between
// (direction-3d.md section 10.6; architecture sections 6b and 8).
//
// cameraKey turns a keyframe name and a viewport size into a CameraKey. The rig blends two keys with
// ef.sym and applies the result to stage.camera. It takes the progress as given: ScrollTrigger's
// scrub (0.7) is the smoothing. The camera has no pointer parallax, because the hero tilt is on the
// block group.
import { ef } from '../core/ease';
import type { Tick } from '../core/ticker';
import { formationFor, type Pose } from './blocks/formations';
import type { CameraKey, KeyName } from './section-gl';
import type { Stage } from './stage';

/**
 * The numbers behind the keyframes. Lengths are in bu. cameraKey reads these values, so the page and
 * the documentation share one source. A fill is the share of the viewport that the extent covers.
 */
export const FIT = {
  /** Vertical field of view in degrees, for every keyframe. */
  fovDeg: 22,
  /** tan(11 deg), half of the vertical field of view. The visible width at distance z is 2 z tanHalfFov aspect. */
  tanHalfFov: Math.tan((11 * Math.PI) / 180),
  /** Desktop camera x as a multiple of the visible width, for the hero and closing keys. */
  desktopOffsetX: -0.22,
  /** Phone camera y for the hero key, which capabilities and code share. It places the stanza in the upper half. */
  phoneHeroY: -1.1,
  /**
   * Phone family camera x as a multiple of the visible width at the family key (D19.2). The camera moves
   * right, so each station centre sits 0.28 of the viewport width left of centre and the station labels fit
   * to the right of the vertical axis. Desktop family keeps x 0.
   */
  phoneFamilyOffsetX: 0.28,
  /**
   * Phone speed: the centre of the vertical race column sits at this fraction of the viewport width (D21.2). The
   * camera moves left by the rest, so the column reads at the right edge and the speed text fits to its left.
   * The height fit (0.80) is unchanged.
   */
  phoneSpeedColumnFrac: 0.86,
  /**
   * Extents of the fitted formations. stanza is 6 x 0.87 + 0.70 wide, race 16 x 0.95 + 0.70 wide,
   * rest 16 x 0.52 + 0.42 wide, column 16 x 0.27 + 0.22 tall, and axis is the family axis with margins.
   */
  extent: { stanza: 5.92, race: 15.9, rest: 8.74, column: 4.54, axis: 28 },
  /**
   * Fill fractions. heroPhone is the hero fit at phone aspect. Every other key keeps one fraction on
   * both aspects.
   */
  fill: { hero: 0.45, heroPhone: 0.84, speed: 0.8, pricing: 0.7, closing: 0.8, family: 0.9 },
} as const;

/** Visible width W(z) at distance z, in bu. */
function visibleWidth(z: number, aspect: number): number {
  return 2 * z * FIT.tanHalfFov * aspect;
}

/** Distance at which an extent w bu wide fills the fraction f of the viewport width. */
function widthFit(w: number, f: number, aspect: number): number {
  return w / (f * 2 * FIT.tanHalfFov * aspect);
}

/** Distance at which an extent h bu tall fills the fraction f of the viewport height. It has no aspect term. */
function heightFit(h: number, f: number): number {
  return h / (f * 2 * FIT.tanHalfFov);
}

/** The mean x of a formation's poses, in bu: the centre line of the formation. */
function centreX(poses: readonly Pose[]): number {
  let sum = 0;
  for (const pose of poses) sum += pose.p[0];
  return sum / poses.length;
}

/** The x of the vertical race column on a phone (formationFor('race', true)). The column is on the centre line, so x is 0. */
const RACE_COLUMN_X = centreX(formationFor('race', true));

/**
 * The camera keyframe for name in a viewport of size CSS px (direction-3d.md section 10.6). Desktop is
 * an aspect of 1 or wider. Phone is below 1, where the race turns vertical and fits by height (D15.1). On a
 * phone the family key also moves right (D19.2), and the speed key moves left so that the race column sits
 * at 86 percent of the width (D21.2).
 * The target is (x, y, 0) and the fov is always FIT.fovDeg. Pass out to write into an existing object
 * and allocate nothing.
 */
export function cameraKey(name: KeyName, size: { width: number; height: number }, out?: CameraKey): CameraKey {
  const { width, height } = size;
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new RangeError(`cameraKey: ${width} x ${height} is not a usable viewport`);
  }
  const aspect = width / height;
  const phone = aspect < 1;
  let z: number;
  let x = 0;
  let y = 0;
  switch (name) {
    case 'hero':
      if (phone) {
        z = widthFit(FIT.extent.stanza, FIT.fill.heroPhone, aspect);
        y = FIT.phoneHeroY;
      } else {
        z = widthFit(FIT.extent.stanza, FIT.fill.hero, aspect);
        x = FIT.desktopOffsetX * visibleWidth(z, aspect);
      }
      break;
    case 'speed':
      if (phone) {
        z = heightFit(FIT.extent.race, FIT.fill.speed);
        // A screen fraction f for the column centre xc at distance z needs the camera at xc - (f - 0.5) W(z), since
        // W(z) is the full width at the race plane. Desktop has no offset.
        x = RACE_COLUMN_X - (FIT.phoneSpeedColumnFrac - 0.5) * visibleWidth(z, aspect);
      } else {
        z = widthFit(FIT.extent.race, FIT.fill.speed, aspect);
      }
      break;
    case 'pricing':
      z = widthFit(FIT.extent.rest, FIT.fill.pricing, aspect);
      break;
    case 'closing':
      z = heightFit(FIT.extent.column, FIT.fill.closing);
      if (!phone) x = FIT.desktopOffsetX * visibleWidth(z, aspect);
      break;
    case 'family':
      if (phone) {
        z = heightFit(FIT.extent.axis, FIT.fill.family);
        x = FIT.phoneFamilyOffsetX * visibleWidth(z, aspect);
      } else {
        z = widthFit(FIT.extent.axis, FIT.fill.family, aspect);
      }
      break;
    default:
      throw new RangeError(`cameraKey: unknown keyframe ${String(name)}`);
  }
  const key: CameraKey = out ?? { position: [0, 0, 0], target: [0, 0, 0], fov: FIT.fovDeg };
  key.position[0] = x;
  key.position[1] = y;
  key.position[2] = z;
  key.target[0] = x;
  key.target[1] = y;
  key.target[2] = 0;
  key.fov = FIT.fovDeg;
  return key;
}

/** The camera rig. It blends between keyframes and applies the result to the stage camera. */
export interface Rig {
  /**
   * Sets the state to from + (to - from) x ef.sym(t) for position, target and fov. t is the scrubbed
   * progress; the ease clamps it to [0, 1]. The camera moves on the next update().
   */
  blend(from: CameraKey, to: CameraKey, t: number): void;
  /**
   * Applies the state to stage.camera when it has changed. The caller drives it from the page clock,
   * at PRIORITY.glUpdate, so the camera is set before the stage renders.
   */
  update(tick: Tick): void;
  /** Stops the rig. Later blend and update calls do nothing, and the camera keeps its last state. Safe to call twice. */
  dispose(): void;
}

/** Builds the rig for stage. Its state starts at the stage camera's position, target (0, 0, 0) and fov. */
export function createRig(stage: Stage): Rig {
  const camera = stage.camera;
  const state: CameraKey = {
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: [0, 0, 0],
    fov: camera.fov,
  };
  let dirty = true;
  let disposed = false;

  return {
    blend(from: CameraKey, to: CameraKey, t: number): void {
      if (disposed) return;
      const k = ef.sym(t);
      for (let i = 0; i < 3; i += 1) {
        state.position[i] = from.position[i] + (to.position[i] - from.position[i]) * k;
        state.target[i] = from.target[i] + (to.target[i] - from.target[i]) * k;
      }
      state.fov = from.fov + (to.fov - from.fov) * k;
      dirty = true;
    },
    update(_tick: Tick): void {
      if (disposed || !dirty) return;
      dirty = false;
      camera.position.set(state.position[0], state.position[1], state.position[2]);
      camera.lookAt(state.target[0], state.target[1], state.target[2]);
      if (camera.fov !== state.fov) {
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
      }
    },
    dispose(): void {
      disposed = true;
    },
  };
}
