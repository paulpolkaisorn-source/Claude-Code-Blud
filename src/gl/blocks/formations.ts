// Formations of the 17 machined blocks (direction-3d.md section 11; architecture section 6).
//
// Every pose is generated here from the formulas of section 11. The printed tables in that file are
// the reference, and harness/formations.html checks the generated values against them to 1e-4.
// Units are scene units (bu). Index i is the same block in every formation: row A is 0 to 4 (five
// blocks, top), row B is 5 to 11 (seven blocks, middle) and row C is 12 to 16 (five blocks, bottom).
// Index 4 is the kireji.
//
// Lookups return shared, frozen values, so no call allocates. stanzaOpen is the one function that
// writes, and it writes into the array its caller passes in.
import type { FormationId } from '../../core/types';

export type { FormationId } from '../../core/types';

/** Block size in bu (section 10.2). Width and height run along x and y, depth along z. */
export const BLOCK = { width: 0.7, height: 0.7, depth: 0.46, radius: 0.035, segments: 3 } as const;

/** One block for each syllable of the 5-7-5 haiku. */
export const BLOCK_COUNT = 17;

/** Blocks per row, from row A (top) to row C (bottom). */
export const ROWS = [5, 7, 5] as const;

/** Index of the kireji, block 05: the last block of the first line. */
export const KIREJI = 4;

/** x of the four family stations, Slower to Fastest (section 11.8). The Haiku stanza is at the last one. */
export const FAMILY_STATION_X = [-10.5, -3.5, 3.5, 10.5] as const;

/** Rotation about z, in radians, that turns a formation to portrait (section 11.8). It maps (x, y) to (y, -x). */
export const PORTRAIT_TURN = -Math.PI / 2;

/**
 * Where one block sits in a formation. p is the centre in bu. r is [rotX, rotY, rotZ] in radians, where
 * rotY is the yaw. s is the uniform scale (D15.3): the block is BLOCK.width * s wide and high and
 * BLOCK.depth * s deep.
 */
export interface Pose {
  p: [number, number, number];
  r: [number, number, number];
  s: number;
}

/** Row of each block: 0 is row A, 1 is row B, 2 is row C. */
const ROW_OF: readonly number[] = ROWS.flatMap((n, row) => Array.from({ length: n }, () => row));

/** Place k of each block within its row, counted from the left (section 11.1). */
const K_OF: readonly number[] = ROWS.flatMap((n) => Array.from({ length: n }, (_, k) => k));

/** The integers from a to b inclusive. */
function span(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}

/** x of block i in a row with pitch p: (k - (n - 1) / 2) * p, centred on the row centre (section 11.1). */
function rowX(i: number, pitch: number): number {
  const n = ROWS[ROW_OF[i]];
  return (K_OF[i] - (n - 1) / 2) * pitch;
}

/** A block with no roll. yaw is rotY. */
function pose(x: number, y: number, z: number, s: number, yaw: number): Pose {
  return { p: [x, y, z], r: [0, yaw, 0], s };
}

/** The placement shared by the blocks of one row. */
interface RowSpec {
  y: number;
  z: number;
  s: number;
  pitch: number;
  yaw: number;
}

/** Builds a 17-block formation whose rows A, B and C take the three specs in turn. */
function byRow(rows: readonly RowSpec[]): Pose[] {
  return Array.from({ length: BLOCK_COUNT }, (_, i) => {
    const row = rows[ROW_OF[i]];
    return pose(rowX(i, row.pitch), row.y, row.z, row.s, row.yaw);
  });
}

const STANZA_PITCH = 0.87;
const STANZA_LIFT = 1.05;

/** The stanza, the hero rest pose (section 11.2). Rows A and C stand 1.05 above and below the centre row. */
function stanza(): Pose[] {
  return byRow([
    { y: STANZA_LIFT, z: 0, s: 1, pitch: STANZA_PITCH, yaw: 0 },
    { y: 0, z: 0, s: 1, pitch: STANZA_PITCH, yaw: 0 },
    { y: -STANZA_LIFT, z: 0, s: 1, pitch: STANZA_PITCH, yaw: 0 },
  ]);
}

/** Race (section 11.3): one line of 17 at pitch 0.95, centred on x 0. */
function race(): Pose[] {
  return Array.from({ length: BLOCK_COUNT }, (_, i) => pose((i - (BLOCK_COUNT - 1) / 2) * 0.95, 0, 0, 1, 0));
}

/**
 * Capability rows (section 11.4). The active row comes forward to z 0.90 at full size. The two rows
 * behind it stand at z -1.40 and are scaled to 0.90. The row above the active line has yaw +0.35 and
 * the row below it has yaw -0.35 (the mirrored yaws of section 11.4).
 */
const CAP_ACTIVE: RowSpec = { y: 0, z: 0.9, s: 1, pitch: 0.87, yaw: 0 };
const CAP_UP: RowSpec = { y: 1.05, z: -1.4, s: 0.9, pitch: 0.783, yaw: 0.35 };
const CAP_DOWN: RowSpec = { y: -1.05, z: -1.4, s: 0.9, pitch: 0.783, yaw: -0.35 };

/** cap-2 stair (section 11.6): block 12 + m is raised 0.17 m above the active line. */
const STAIR_FIRST = ROWS[0] + ROWS[1];
const STAIR_STEP = 0.17;

/** cap-2: the active row is row C, with the stair. */
function cap2(): Pose[] {
  const poses = byRow([CAP_UP, CAP_DOWN, CAP_ACTIVE]);
  for (let i = STAIR_FIRST; i < BLOCK_COUNT; i++) {
    poses[i].p[1] += (i - STAIR_FIRST) * STAIR_STEP;
  }
  return poses;
}

const RECEDE_SCALE = 0.62;
const RECEDE_Z = -4;

/** Recede (section 11.7): the stanza at 0.62 of its size, set back to z -4. */
function recede(stanzaPoses: readonly Pose[]): Pose[] {
  return stanzaPoses.map((q): Pose =>
    pose(RECEDE_SCALE * q.p[0], RECEDE_SCALE * q.p[1], RECEDE_Z, RECEDE_SCALE, 0),
  );
}

/** Family (section 11.8): the stanza moved to the Fastest station, at full size and unrotated. */
function family(stanzaPoses: readonly Pose[]): Pose[] {
  return stanzaPoses.map((q): Pose => pose(q.p[0] + FAMILY_STATION_X[3], q.p[1], q.p[2], 1, 0));
}

/** Rest (section 11.9): one line of 17 at pitch 0.52 and scale 0.60, centred on x 0 under the pricing copy. */
function rest(): Pose[] {
  return Array.from({ length: BLOCK_COUNT }, (_, i) => pose((i - (BLOCK_COUNT - 1) / 2) * 0.52, -1.45, 0, 0.6, 0));
}

/** Column block size in bu (section 11.10): 0.22 bu across, so the column scale is 0.22 / 0.70. */
const COLUMN_BLOCK_BU = 0.22;

/** Column (section 11.10): one vertical line at pitch 0.27. Index 0 is the top block, at y +2.16. */
function column(): Pose[] {
  return Array.from({ length: BLOCK_COUNT }, (_, i) =>
    pose(0, ((BLOCK_COUNT - 1) / 2 - i) * 0.27, 0, COLUMN_BLOCK_BU / BLOCK.width, 0),
  );
}

/** Freezes a formation, its poses and their arrays, so a shared value cannot change by accident. */
function frozen(list: Pose[]): readonly Pose[] {
  for (const q of list) {
    Object.freeze(q.p);
    Object.freeze(q.r);
    Object.freeze(q);
  }
  return Object.freeze(list);
}

const STANZA_POSES = stanza();

/** The nine desktop formations. Each has 17 poses, and index i is the same block in every formation. */
export const FORMATIONS: Readonly<Record<FormationId, readonly Pose[]>> = {
  stanza: frozen(STANZA_POSES),
  race: frozen(race()),
  'cap-0': frozen(byRow([CAP_ACTIVE, CAP_UP, CAP_DOWN])),
  'cap-1': frozen(byRow([CAP_UP, CAP_ACTIVE, CAP_DOWN])),
  'cap-2': frozen(cap2()),
  recede: frozen(recede(STANZA_POSES)),
  family: frozen(family(STANZA_POSES)),
  rest: frozen(rest()),
  column: frozen(column()),
};

/**
 * The stagger order of each formation (section 11.1). Entry k is the block that receives stagger
 * position k, so block STAGGER_ORDER[id][k] takes the offset HAIKU_OFFSETS[k] from timing.ts. Each
 * order is a permutation of 0 to 16.
 */
export const STAGGER_ORDER: Readonly<Record<FormationId, readonly number[]>> = {
  stanza: Object.freeze([4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16]),
  race: Object.freeze([4, 3, 2, 1, 0, ...span(5, 16).reverse()]),
  'cap-0': Object.freeze([4, 3, 2, 1, 0, ...span(5, 16)]),
  'cap-1': Object.freeze([4, ...span(5, 11), ...span(0, 3), ...span(12, 16)]),
  'cap-2': Object.freeze([4, ...span(12, 16), ...span(0, 3), ...span(5, 11)]),
  recede: Object.freeze([4, ...span(0, 3), ...span(5, 16)]),
  family: Object.freeze([4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16]),
  rest: Object.freeze([4, ...span(0, 3), ...span(5, 16)]),
  column: Object.freeze(span(0, 16)),
};

/** The inverse of a stagger order: element i is the stagger position of block i. */
function inverse(order: readonly number[]): readonly number[] {
  const position = new Array<number>(BLOCK_COUNT).fill(-1);
  order.forEach((block, k) => {
    position[block] = k;
  });
  return Object.freeze(position);
}

const STAGGER_POSITION: Readonly<Record<FormationId, readonly number[]>> = {
  stanza: inverse(STAGGER_ORDER.stanza),
  race: inverse(STAGGER_ORDER.race),
  'cap-0': inverse(STAGGER_ORDER['cap-0']),
  'cap-1': inverse(STAGGER_ORDER['cap-1']),
  'cap-2': inverse(STAGGER_ORDER['cap-2']),
  recede: inverse(STAGGER_ORDER.recede),
  family: inverse(STAGGER_ORDER.family),
  rest: inverse(STAGGER_ORDER.rest),
  column: inverse(STAGGER_ORDER.column),
};

/**
 * The stagger position of each block of a formation: element i is the position k with
 * STAGGER_ORDER[id][k] === i. Block i takes the offset HAIKU_OFFSETS[staggerPosition(id)[i]].
 */
export function staggerPosition(id: FormationId): readonly number[] {
  return STAGGER_POSITION[id];
}

/**
 * A quarter turn about z for the portrait view (section 11.8, D15.1): position (x, y) becomes (y, -x).
 * Race and family have rotX and rotY of 0. Each block is also counter-rotated by the same quarter turn,
 * so it keeps its upright orientation on screen. Blocks are square in x and y, so the net rotation is
 * zero, and r[2] is 0 for every block.
 */
function turned(src: readonly Pose[]): Pose[] {
  return src.map((q): Pose => ({ p: [q.p[1], -q.p[0], q.p[2]], r: [q.r[0], q.r[1], 0], s: q.s }));
}

/** The portrait versions of the two formations that turn. Every other formation is the same in portrait. */
const PORTRAIT: Readonly<Partial<Record<FormationId, readonly Pose[]>>> = {
  race: frozen(turned(FORMATIONS.race)),
  family: frozen(turned(FORMATIONS.family)),
};

/**
 * The poses of a formation for the current viewport. Desktop (portrait false) returns FORMATIONS[id].
 * Portrait (aspect below 1) returns the turned poses of race and family, and FORMATIONS[id] for the rest.
 * Every result is cached, so no call allocates.
 */
export function formationFor(id: FormationId, portrait: boolean): readonly Pose[] {
  if (portrait) {
    const turnedPoses = PORTRAIT[id];
    if (turnedPoses !== undefined) return turnedPoses;
  }
  return FORMATIONS[id];
}

/** Vertical sign of each stanza row in the open pose: row A up, row B level, row C down. */
const ROW_SIGN: readonly number[] = [1, 0, -1];

/**
 * The stanza while the hero opens (section 11.11). s is the progress after easing, in [0, 1]. The
 * pitch grows from 0.87 to 0.95, and rows A and C move out to 1.05 + 0.08 s from the centre row.
 * Writes the 17 poses into out, reusing the entries it already holds, and returns out. A new pose is
 * made only where out is too short.
 */
export function stanzaOpen(s: number, out: Pose[]): Pose[] {
  const pitch = STANZA_PITCH + 0.08 * s;
  const lift = STANZA_LIFT + 0.08 * s;
  for (let i = 0; i < BLOCK_COUNT; i++) {
    let q: Pose | undefined = out[i];
    if (q === undefined) {
      q = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
      out[i] = q;
    }
    q.p[0] = rowX(i, pitch);
    q.p[1] = ROW_SIGN[ROW_OF[i]] * lift;
    q.p[2] = 0;
    q.r[0] = 0;
    q.r[1] = 0;
    q.r[2] = 0;
    q.s = 1;
  }
  out.length = BLOCK_COUNT;
  return out;
}

/**
 * A linear blend of two poses in position, rotation and scale. t is not clamped. Writes into out and
 * returns it. out may be a or b.
 */
export function lerpPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  const u = 1 - t;
  for (let i = 0; i < 3; i++) {
    out.p[i] = u * a.p[i] + t * b.p[i];
    out.r[i] = u * a.r[i] + t * b.r[i];
  }
  out.s = u * a.s + t * b.s;
  return out;
}
