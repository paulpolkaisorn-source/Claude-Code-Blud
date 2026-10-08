// The family section's 3D layer (design/direction-act2.md, family; direction-3d.md 10.6, 10.12 to 10.14 and
// 11.8; decisions D4 and D15 in design/drafts/director-decisions.md).
//
// Entry, scrubbed over p 0 to 0.5: the 17 blocks move from the code exit (recede, hero key) to the family
// formation, and the camera moves from the hero key to the family key. Each block's local progress is
// scrubLocal on its family stagger position, with t = sym(p / 0.5): the kireji takes anticipate and the other
// sixteen take settle. The camera blend goes through the rig, which applies sym itself.
//
// Phantom outlines: the three sibling stations (Slower, Moderate, Fast) carry one LineSegments with one
// LineDashedMaterial. They are static and visible once p > 0 (under reduced motion, whenever the section is
// current). Hover runs a sibling's dash, one dash period per second. The Haiku station lifts the stanza 0.15 bu
// along its own up axis with follow. Touch uses the same events with toggle set.
//
// Decisions in this file, each reported to the director:
// - The hover run is continuous at 0.24 bu per second, as the brief and direction-3d 11.8 state. The act file's
//   family Pointer text describes a ping-pong of the same offset instead. The director reconciles the two.
// - The Haiku lift is written into the block poses, not through blocks.setLift. setLift damps every target with
//   T.half, which would stretch the T.beat5 follow curve and remove its overshoot. setLift is used only to
//   zero the block lifts when the section leaves.
// - The phone family camera x, +0.28 of the visible width at the family distance (act C6, decision D19.2), comes
//   from rig.cameraKey.
// - The camera far plane is 120 while the family is current on a phone (act A3). The desktop keeps 80.
// - The idle breath starts when the formation arrives (p 0.5), through blocks.setBreath.
// - Three segments per corner put no vertex at the 45 degree point, so each depth edge meets the chord between
//   the 30 and 60 degree vertices, 0.0012 bu inside the true arc.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { env } from '../../core/env';
import { E, ef, registerEases } from '../../core/ease';
import type { Tick } from '../../core/ticker';
import { T, scrubLocal } from '../../core/timing';
import type { FormationId } from '../../core/types';
import type { BreathMode } from '../../gl/blocks/blocks';
import {
  BLOCK_COUNT,
  FAMILY_STATION_X,
  KIREJI,
  PORTRAIT_TURN,
  formationFor,
  lerpPose,
  staggerPosition,
  type Pose,
} from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type {
  CameraKey,
  GLWorld,
  KeyName,
  SectionGL,
  SectionGLContext,
  SectionGLHandle,
} from '../../gl/section-gl';

/** Progress at which the formation and the camera rest (direction-act2, family Sequence). */
const REST_AT = 0.5;
/** Scrub profile of a formation transition (architecture section 6). */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** The idle breath of the family rows (C15, direction-3d 10.12). */
const BREATH: BreathMode = { amplitude: 0.012, phase: 'rows' };
/** Haiku station lift, in bu along the stanza's own up axis (direction-act2, family Pointer). */
const LIFT_BU = 0.15;
/** Stations 0 to 2 carry a phantom outline. */
const SIBLINGS = 3;
/** Station 3 is the Haiku label, which lifts the stanza. */
const HAIKU = 3;
/** One flag per station: the four labels. */
const STATIONS = 4;
/** Dash pattern of the phantom outlines, in bu (D4, direction-3d 11.8). */
const DASH = 0.17;
const GAP = 0.07;
const PERIOD = DASH + GAP;
/** Hover run speed: one dash period per second (direction-3d 11.8). */
const RUN_SPEED = PERIOD;
/** Phantom colour, rule-hair-ink as an sRGB hex. THREE.Color converts it to linear. */
const PHANTOM_HEX = 0x75705f;
/** Far plane of a phone family view (act A3). */
const FAR_PHONE = 120;
/** The event the 2D layer dispatches on document (D4). */
const HOVER_EVENT = 'hk:family-hover';
/** Phantom outline geometry (direction-3d 11.8). */
const HALF_W = 2.96;
const HALF_H = 1.4;
const RADIUS = 0.035;
const HALF_DEPTH = 0.23;
/** Segments per corner arc. Three gives 16 segments per loop and 36 per outline. */
const ARC_SEGMENTS = 3;
/** Vertices per outline: 36 segments, two vertices each. */
const VERTS_PER_OUTLINE = 72;

type Point2 = readonly [number, number];

interface Corner {
  sx: 1 | -1;
  sy: 1 | -1;
  /** Angle of the first arc vertex, in radians. The arc runs a quarter turn counter-clockwise from here. */
  start: number;
}

const CORNERS: readonly Corner[] = [
  { sx: 1, sy: 1, start: 0 },
  { sx: -1, sy: 1, start: Math.PI / 2 },
  { sx: -1, sy: -1, start: Math.PI },
  { sx: 1, sy: -1, start: (3 * Math.PI) / 2 },
];

/** The 16 vertices of one rounded loop, counter-clockwise: each corner's four arc vertices in turn. */
function loopPoints(): Point2[] {
  const out: Point2[] = [];
  for (const c of CORNERS) {
    const cx = c.sx * (HALF_W - RADIUS);
    const cy = c.sy * (HALF_H - RADIUS);
    for (let j = 0; j <= ARC_SEGMENTS; j += 1) {
      const a = c.start + (j * Math.PI) / (2 * ARC_SEGMENTS);
      out.push([cx + RADIUS * Math.cos(a), cy + RADIUS * Math.sin(a)]);
    }
  }
  return out;
}

/**
 * The four depth-edge points: each corner's 45 degree point. With three segments no arc vertex sits there, so
 * the point is the middle of the chord between the 30 and 60 degree vertices, which lies on the drawn loop.
 */
function depthPoints(): Point2[] {
  const halfStep = Math.PI / (2 * ARC_SEGMENTS) / 2;
  const r = RADIUS * Math.cos(halfStep);
  return CORNERS.map((c): Point2 => {
    const a = c.start + Math.PI / 4;
    return [c.sx * (HALF_W - RADIUS) + r * Math.cos(a), c.sy * (HALF_H - RADIUS) + r * Math.sin(a)];
  });
}

/**
 * The three phantom outlines as one geometry. Each outline is a front loop, a back loop and four depth edges:
 * 16 + 16 + 4 = 36 segments, 72 vertices. Segments are written in chain order, so the accumulated lineDistance
 * from computeLineDistances runs continuously along each loop.
 */
function buildOutlines(): THREE.BufferGeometry {
  const loop = loopPoints();
  const depth = depthPoints();
  const stations = FAMILY_STATION_X.slice(0, SIBLINGS);
  const values = new Float32Array(stations.length * VERTS_PER_OUTLINE * 3);
  let n = 0;
  const put = (x: number, y: number, z: number): void => {
    values[n] = x;
    values[n + 1] = y;
    values[n + 2] = z;
    n += 3;
  };
  for (const cx of stations) {
    for (const z of [HALF_DEPTH, -HALF_DEPTH]) {
      for (let i = 0; i < loop.length; i += 1) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        put(cx + a[0], a[1], z);
        put(cx + b[0], b[1], z);
      }
    }
    for (const d of depth) {
      put(cx + d[0], d[1], HALF_DEPTH);
      put(cx + d[0], d[1], -HALF_DEPTH);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(values, 3));
  return geometry;
}

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

interface HoverDetail {
  station: number | null;
  toggle: boolean;
}

/** Reads the event detail. Anything that is not a station (0 to 3) or null is ignored. */
function readDetail(event: Event): HoverDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return null;
  const { station, toggle } = detail as { station?: unknown; toggle?: unknown };
  const isToggle = toggle === true;
  if (station === null) return { station: null, toggle: isToggle };
  if (typeof station === 'number' && Number.isInteger(station) && station >= 0 && station < STATIONS) {
    return { station, toggle: isToggle };
  }
  return null;
}

/** Builds the family handle: the phantom outlines, the entry and the station motion. */
function setup(world: GLWorld): SectionGLHandle {
  registerEases();
  const { stage, blocks, rig } = world;
  const camera = stage.camera;
  const defaultFar = camera.far;

  const geometry = buildOutlines();
  const material = new THREE.LineDashedMaterial({
    color: new THREE.Color(PHANTOM_HEX),
    dashSize: DASH,
    gapSize: GAP,
    scale: 1,
    depthWrite: false,
    transparent: false,
  });
  const outlines = new THREE.LineSegments(geometry, material);
  outlines.name = 'family-phantoms';
  outlines.frustumCulled = false;
  outlines.computeLineDistances();
  const attr = geometry.getAttribute('lineDistance');
  if (!(attr instanceof THREE.BufferAttribute)) throw new Error('family: computeLineDistances wrote no attribute');
  const values = attr.array as Float32Array;
  const base = Float32Array.from(values);

  const group = new THREE.Group();
  group.name = 'family-phantom-group';
  group.visible = false;
  group.add(outlines);
  stage.scene.add(group);
  // compile skips hidden objects, so the dashed program is built here rather than on the first frame it shows.
  group.visible = true;
  stage.renderer.compile(stage.scene, stage.camera);
  group.visible = false;

  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  /** Hover state per station: runs for 0 to 2, the lift for 3. */
  const flags = [false, false, false, false];
  /** Dash offset per outline, in bu, kept within one period. It holds when a run stops. */
  const runOffset = [0, 0, 0];
  /** The Haiku lift in bu, tweened with follow on the way in and settle on the way out. */
  const liftState = { value: 0 };
  let liftOn = false;
  let active = false;
  let disposed = false;
  let lastS = 0;
  let lastRm = false;
  let keyWidth = -1;
  let keyHeight = -1;
  const keys = new Map<string, CameraKey>();

  /** The camera key of a name for this viewport, cached until the size changes. */
  function keyFor(name: KeyName, size: { width: number; height: number }, portrait: boolean): CameraKey {
    if (size.width !== keyWidth || size.height !== keyHeight) {
      keys.clear();
      keyWidth = size.width;
      keyHeight = size.height;
    }
    const tag = `${name}:${portrait ? 'portrait' : 'landscape'}`;
    const cached = keys.get(tag);
    if (cached !== undefined) return cached;
    const key = cameraKey(name, size);
    keys.set(tag, key);
    return key;
  }

  function setFar(far: number): void {
    if (camera.far === far) return;
    camera.far = far;
    camera.updateProjectionMatrix();
  }

  /** Writes the 17 poses for progress s. lift is added along the stanza's up axis: y, or x on a phone. */
  function writePoses(s: number, prev: SectionGL | null, portrait: boolean, rm: boolean, lift: number): void {
    const u = rm ? 1 : clamp01(s / REST_AT);
    const t = ef.sym(u);
    const fromId: FormationId = prev === null ? 'family' : (prev.exitFormation ?? prev.formation);
    const from = formationFor(fromId, portrait);
    const to = formationFor('family', portrait);
    const order = staggerPosition('family');
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const q = scrubLocal(order[i], BLOCK_COUNT, t, SCRUB);
      const e = i === KIREJI ? ef.anticipate(q) : ef.settle(q);
      const pose = lerpPose(from[i], to[i], e, poses[i]);
      if (lift !== 0) {
        if (portrait) pose.p[0] += lift;
        else pose.p[1] += lift;
      }
    }
    blocks.setPoses(poses);
  }

  function writeRun(k: number): void {
    const offset = runOffset[k];
    const first = k * VERTS_PER_OUTLINE;
    for (let v = first; v < first + VERTS_PER_OUTLINE; v += 1) values[v] = base[v] + offset;
    attr.needsUpdate = true;
  }

  function advanceRuns(dt: number): void {
    if (!(dt > 0)) return;
    for (let k = 0; k < SIBLINGS; k += 1) {
      if (!flags[k]) continue;
      runOffset[k] = (runOffset[k] + RUN_SPEED * dt) % PERIOD;
      writeRun(k);
    }
  }

  function setLiftOn(on: boolean): void {
    if (on === liftOn) return;
    liftOn = on;
    if (on) gsap.to(liftState, { value: LIFT_BU, duration: T.beat5, ease: E.follow, overwrite: true });
    else gsap.to(liftState, { value: 0, duration: T.beat5, ease: E.settle, overwrite: true });
  }

  function snapLift(): void {
    gsap.killTweensOf(liftState);
    liftState.value = 0;
    liftOn = false;
  }

  function onHover(event: Event): void {
    if (disposed || env.reducedMotion || !(active || lastS > 0)) return;
    const detail = readDetail(event);
    if (detail === null) return;
    if (detail.station === null) flags.fill(false);
    else if (detail.toggle) flags[detail.station] = !flags[detail.station];
    else {
      flags.fill(false);
      flags[detail.station] = true;
    }
    setLiftOn(flags[HAIKU]);
  }

  const handle: SectionGLHandle = {
    update(progress: number, tick: Tick, ctx: SectionGLContext): void {
      if (disposed) return;
      const s = clamp01(progress);
      const rm = ctx.reducedMotion;
      const portrait = ctx.portrait;
      if (rm && (liftOn || flags.some(Boolean))) {
        flags.fill(false);
        snapLift();
      }
      if (active && !rm) advanceRuns(tick.dt);
      const lift = rm ? 0 : liftState.value;
      writePoses(s, ctx.prev, portrait, rm, lift);

      const from = keyFor(ctx.prev === null ? 'family' : ctx.prev.key, ctx.size, portrait);
      const to = keyFor('family', ctx.size, portrait);
      rig.blend(from, to, rm ? 1 : clamp01(s / REST_AT));

      group.visible = rm ? active : s > 0;
      group.rotation.z = portrait ? PORTRAIT_TURN : 0;
      setFar(active && portrait ? FAR_PHONE : defaultFar);

      // The choreography requests the breath when the section becomes current. It is written here every frame
      // while the section is current, so the rows start to breathe T.hold after arrival (C15), not at activation.
      if (active) blocks.setBreath(!rm && s >= REST_AT ? BREATH : null);
      lastS = s;
      lastRm = rm;
    },

    setActive(on: boolean, ctx: SectionGLContext): void {
      if (disposed) return;
      if (on) {
        active = true;
        flags.fill(false);
        snapLift();
        blocks.setActiveGroup(null);
        blocks.setTilt(0, 0);
        blocks.setGroupOffset(0, 0, 0);
        setFar(ctx.portrait ? FAR_PHONE : defaultFar);
        return;
      }
      active = false;
      flags.fill(false);
      const hadLift = liftState.value !== 0;
      snapLift();
      blocks.setBreath(null);
      group.visible = false;
      setFar(defaultFar);
      blocks.setTilt(0, 0);
      blocks.setGroupOffset(0, 0, 0);
      for (let i = 0; i < BLOCK_COUNT; i += 1) blocks.setLift(i, 0);
      // Only a lift that was on screen needs the poses written again, without it.
      if (hadLift) writePoses(lastS, ctx.prev, ctx.portrait, lastRm, 0);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      document.removeEventListener(HOVER_EVENT, onHover);
      snapLift();
      if (active) blocks.setBreath(null);
      active = false;
      stage.scene.remove(group);
      geometry.dispose();
      material.dispose();
      setFar(defaultFar);
    },
  };

  document.addEventListener(HOVER_EVENT, onHover);
  return handle;
}

/** The family section's GL layer (architecture section 6b). Its handle comes from setup(world). */
export const familyGL: SectionGL = {
  id: 'family',
  formation: 'family',
  key: 'family',
  ink: 1,
  dof: null,
  breath: BREATH,
  setup,
};
