// Harness for src/gl/blocks/formations.ts (architecture section 10a). Open /harness/formations.html on the
// dev server. The checks run on load and the verdict lands in document.documentElement.dataset.harness.
// The scene draws the nine desktop formations in a 3 x 3 grid. Each formation keeps its section 11 poses
// and is centred in its own cell. With ?portrait it draws race and family as they turn on a phone.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { FormationId } from '../src/core/types';
import {
  BLOCK,
  BLOCK_COUNT,
  FAMILY_STATION_X,
  FORMATIONS,
  KIREJI,
  STAGGER_ORDER,
  formationFor,
  lerpPose,
  stanzaOpen,
  staggerPosition,
  type Pose,
} from '../src/gl/blocks/formations';

const IDS: readonly FormationId[] = ['stanza', 'race', 'cap-0', 'cap-1', 'cap-2', 'recede', 'family', 'rest', 'column'];
const FIELDS = ['x', 'y', 'z', 'scale', 'rotX', 'rotY', 'rotZ'] as const;
const TOL = 1e-4;

/**
 * Section 11 of design/direction-3d.md, copied as printed: per block x, y, z, scale, rotX, rotY, rotZ.
 * Every row is the printed row, copied from the tables by script.
 */
const FIXTURES: Readonly<Record<FormationId, readonly (readonly number[])[]>> = {
  stanza: [
    [-1.7400, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-2.6100, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-1.7400, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [2.6100, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-1.7400, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
  ],
  race: [
    [-7.6000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-6.6500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-5.7000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-4.7500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-3.8000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-2.8500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-1.9000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.9500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.9500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.9000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [2.8500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [3.8000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [4.7500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [5.7000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [6.6500, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [7.6000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
  ],
  'cap-0': [
    [-1.7400, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-2.3490, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.0000, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [2.3490, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [-0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.0000, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
  ],
  'cap-1': [
    [-1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.0000, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-2.6100, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-1.7400, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [2.6100, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [-0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.0000, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
  ],
  'cap-2': [
    [-1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.0000, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [0.7830, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [1.5660, 1.0500, -1.4000, 0.9000, 0.0000, 0.3500, 0.0000],
    [-2.3490, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [-1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [-0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.0000, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [0.7830, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [1.5660, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [2.3490, -1.0500, -1.4000, 0.9000, 0.0000, -0.3500, 0.0000],
    [-1.7400, 0.0000, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [-0.8700, 0.1700, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.3400, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [0.8700, 0.5100, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
    [1.7400, 0.6800, 0.9000, 1.0000, 0.0000, 0.0000, 0.0000],
  ],
  recede: [
    [-1.0788, 0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-0.5394, 0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.5394, 0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [1.0788, 0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-1.6182, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-1.0788, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-0.5394, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.5394, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [1.0788, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [1.6182, 0.0000, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-1.0788, -0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [-0.5394, -0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.0000, -0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [0.5394, -0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
    [1.0788, -0.6510, -4.0000, 0.6200, 0.0000, 0.0000, 0.0000],
  ],
  family: [
    [8.7600, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [9.6300, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [10.5000, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [11.3700, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [12.2400, 1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [7.8900, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [8.7600, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [9.6300, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [10.5000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [11.3700, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [12.2400, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [13.1100, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [8.7600, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [9.6300, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [10.5000, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [11.3700, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
    [12.2400, -1.0500, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000],
  ],
  rest: [
    [-4.1600, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-3.6400, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-3.1200, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-2.6000, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-2.0800, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-1.5600, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-1.0400, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [-0.5200, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [0.5200, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [1.0400, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [1.5600, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [2.0800, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [2.6000, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [3.1200, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [3.6400, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
    [4.1600, -1.4500, 0.0000, 0.6000, 0.0000, 0.0000, 0.0000],
  ],
  column: [
    [0.0000, 2.1600, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 1.8900, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 1.6200, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 1.3500, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 1.0800, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.8100, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.5400, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.2700, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -0.2700, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -0.5400, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -0.8100, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.0800, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.3500, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.6200, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -1.8900, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
    [0.0000, -2.1600, 0.0000, 0.3143, 0.0000, 0.0000, 0.0000],
  ],
};

/** Stagger orders as printed in section 11: the block index at each stagger position. */
const EXPECTED_ORDER: Readonly<Record<FormationId, readonly number[]>> = {
  stanza: [4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16],
  race: [4, 3, 2, 1, 0, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5],
  'cap-0': [4, 3, 2, 1, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  'cap-1': [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 12, 13, 14, 15, 16],
  'cap-2': [4, 12, 13, 14, 15, 16, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11],
  recede: [4, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  family: [4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16],
  rest: [4, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  column: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
};

const LABEL: Readonly<Record<FormationId, string>> = {
  stanza: 'stanza 11.2',
  race: 'race 11.3',
  'cap-0': 'cap-0 11.4',
  'cap-1': 'cap-1 11.5',
  'cap-2': 'cap-2 11.6',
  recede: 'recede 11.7',
  family: 'family 11.8',
  rest: 'rest 11.9',
  column: 'column 11.10',
};

const root = document.documentElement;
const failures: string[] = [];
let checks = 0;

function check(name: string, ok: boolean, detail = ''): void {
  checks += 1;
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    console.log(`PASS ${name}${suffix}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

/** Largest absolute difference between two poses, over position, rotation and scale. */
function poseDiff(a: Pose, b: Pose): number {
  let d = Math.abs(a.s - b.s);
  for (let k = 0; k < 3; k++) {
    d = Math.max(d, Math.abs(a.p[k] - b.p[k]), Math.abs(a.r[k] - b.r[k]));
  }
  return d;
}

// 1. Counts and shapes.
for (const id of IDS) {
  const list = FORMATIONS[id];
  check(`${id}: 17 poses`, list.length === BLOCK_COUNT, `length ${list.length}`);
  const shapeOk = list.every(
    (q) =>
      q.p.length === 3 &&
      q.r.length === 3 &&
      Number.isFinite(q.s) &&
      q.s > 0 &&
      [...q.p, ...q.r].every((v) => Number.isFinite(v)),
  );
  check(`${id}: pose shape`, shapeOk);
}

// 2. Fixtures: every printed row, to 1e-4.
for (const id of IDS) {
  const rows = FIXTURES[id];
  const list = FORMATIONS[id];
  let worst = 0;
  let where = '';
  rows.forEach((row, i) => {
    const q = list[i];
    if (q === undefined) {
      worst = Infinity;
      where = `row ${i} missing`;
      return;
    }
    const got = [q.p[0], q.p[1], q.p[2], q.s, q.r[0], q.r[1], q.r[2]];
    got.forEach((v, f) => {
      const d = Math.abs(v - row[f]);
      if (d > worst) {
        worst = d;
        where = `row ${i} ${FIELDS[f]}`;
      }
    });
  });
  check(
    `${id}: matches the section 11 table to 1e-4`,
    rows.length === BLOCK_COUNT && worst <= TOL,
    `max |diff| ${worst.toExponential(2)} at ${where}`,
  );
}

// 3. Stagger orders: permutations, equal to the printed orders, with a consistent inverse.
for (const id of IDS) {
  const order = STAGGER_ORDER[id];
  const sorted = [...order].sort((a, b) => a - b);
  check(
    `${id}: stagger order is a permutation of 0..16`,
    order.length === BLOCK_COUNT && sorted.every((v, k) => v === k),
  );
  const expected = EXPECTED_ORDER[id];
  check(
    `${id}: stagger order matches section 11`,
    order.length === expected.length && order.every((v, k) => v === expected[k]),
  );
  const position = staggerPosition(id);
  check(
    `${id}: staggerPosition inverts the order`,
    position.length === BLOCK_COUNT && order.every((block, k) => position[block] === k),
  );
}

// 4. Spacing: no two block centres closer than BLOCK.width * max(scale) (section 11.13, rule 1).
for (const id of IDS) {
  const list = FORMATIONS[id];
  let minRatio = Infinity;
  let pair = '';
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
      const ratio = d / (BLOCK.width * Math.max(a.s, b.s));
      if (ratio < minRatio) {
        minRatio = ratio;
        pair = `${i}-${j}`;
      }
    }
  }
  check(
    `${id}: block centres at least one block apart`,
    minRatio >= 1 - 1e-9,
    `min ratio ${minRatio.toFixed(4)} at ${pair}`,
  );
}

// 5. Portrait race: one vertical line from +7.6 to -7.6, index 0 on top.
const raceP = formationFor('race', true);
const raceY = raceP.map((q) => q.p[1]);
const raceSpan = Math.abs(raceY[0] - 7.6) < 1e-9 && Math.abs(raceY[BLOCK_COUNT - 1] + 7.6) < 1e-9;
const raceDown = raceY.every((y, k) => k === 0 || y < raceY[k - 1]);
const raceOnAxis = raceP.every((q) => Math.abs(q.p[0]) < 1e-12 && q.p[2] === 0 && q.r[2] === 0 && q.s === 1);
check(
  'portrait race: y from +7.6 to -7.6, index 0 on top',
  raceSpan && raceDown && raceOnAxis,
  `y0 ${raceY[0].toFixed(4)}, y16 ${raceY[BLOCK_COUNT - 1].toFixed(4)}`,
);

// 6. Portrait family: stations top to bottom, the Haiku stanza at the bottom station, three columns.
const famP = formationFor('family', true);
const stationY = FAMILY_STATION_X.map((x) => -x);
const stationsDown = stationY.every((y, k) => k === 0 || y < stationY[k - 1]);
check('portrait family: station centres run top to bottom', stationsDown, `y ${stationY.join(', ')}`);

const meanY = famP.reduce((sum, q) => sum + q.p[1], 0) / BLOCK_COUNT;
check(
  'portrait family: the Haiku stanza sits at the Fastest station (bottom)',
  Math.abs(meanY - stationY[stationY.length - 1]) < 1e-9 && famP.every((q) => q.r[2] === 0),
  `mean y ${meanY.toFixed(4)}`,
);

const onColumn = (from: number, to: number, x: number): boolean =>
  famP.slice(from, to).every((q) => Math.abs(q.p[0] - x) < 1e-9);
const rowTopDown = (from: number, to: number): boolean =>
  famP.slice(from, to).every((q, k, a) => k === 0 || q.p[1] < a[k - 1].p[1]);
check(
  'portrait family: three columns of 5, 7 and 5, each read top to bottom',
  onColumn(0, 5, 1.05) &&
    onColumn(5, 12, 0) &&
    onColumn(12, BLOCK_COUNT, -1.05) &&
    rowTopDown(0, 5) &&
    rowTopDown(5, 12) &&
    rowTopDown(12, BLOCK_COUNT),
);

// 7. formationFor: desktop is the table, portrait is cached, only race and family change.
check(
  'formationFor: desktop returns FORMATIONS[id]',
  IDS.every((id) => formationFor(id, false) === FORMATIONS[id]),
);
check(
  'formationFor: portrait results are cached (same array on every call)',
  formationFor('race', true) === formationFor('race', true) &&
    formationFor('family', true) === formationFor('family', true),
);
check(
  'formationFor: only race and family differ in portrait',
  IDS.filter((id) => id !== 'race' && id !== 'family').every((id) => formationFor(id, true) === FORMATIONS[id]) &&
    formationFor('race', true) !== FORMATIONS.race &&
    formationFor('family', true) !== FORMATIONS.family,
);
check(
  'shared formations are frozen, poses and arrays included',
  IDS.every(
    (id) =>
      Object.isFrozen(FORMATIONS[id]) &&
      FORMATIONS[id].every((q) => Object.isFrozen(q) && Object.isFrozen(q.p) && Object.isFrozen(q.r)),
  ),
);

// 8. stanzaOpen: the rest pose at s 0, written in place, and the open values at s 1.
const open: Pose[] = [];
stanzaOpen(0, open);
const firstRefs = open.slice();
const restDiff = FORMATIONS.stanza.reduce((m, q, i) => Math.max(m, poseDiff(q, open[i])), 0);
check(
  'stanzaOpen(0) equals the stanza rest pose',
  open.length === BLOCK_COUNT && restDiff <= 1e-9,
  `max diff ${restDiff.toExponential(2)}`,
);
const returned = stanzaOpen(1, open);
check(
  'stanzaOpen writes into the array it is given and returns it',
  returned === open && open.length === BLOCK_COUNT && open.every((q, i) => q === firstRefs[i]),
);
const opened =
  Math.abs(open[0].p[0] + 1.9) < 1e-9 &&
  Math.abs(open[0].p[1] - 1.13) < 1e-9 &&
  Math.abs(open[5].p[0] + 2.85) < 1e-9 &&
  open[5].p[1] === 0 &&
  Math.abs(open[12].p[1] + 1.13) < 1e-9;
check('stanzaOpen(1): pitch 0.95, rows A and C at +-1.13', opened, `index 0 at x ${open[0].p[0].toFixed(4)}`);

// 9. lerpPose: exact at both ends, linear between, writes into out.
const la = FORMATIONS.stanza[0];
const lb = FORMATIONS.race[0];
const at0: Pose = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
const at1: Pose = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
const mid: Pose = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
const got0 = lerpPose(la, lb, 0, at0);
const got1 = lerpPose(la, lb, 1, at1);
const gotMid = lerpPose(la, lb, 0.5, mid);
const endsExact = poseDiff(at0, la) < 1e-12 && poseDiff(at1, lb) < 1e-12;
const midLinear =
  Math.abs(mid.p[0] - (la.p[0] + lb.p[0]) / 2) < 1e-12 &&
  Math.abs(mid.p[1] - (la.p[1] + lb.p[1]) / 2) < 1e-12 &&
  Math.abs(mid.s - (la.s + lb.s) / 2) < 1e-12;
check(
  'lerpPose: exact at t 0 and 1, linear at t 0.5, writes into out',
  endsExact && midLinear && got0 === at0 && got1 === at1 && gotMid === mid,
);

// The scene. A failure here is recorded with the checks above, and the verdict still lands.
let sceneError = '';
const portraitView = new URLSearchParams(window.location.search).has('portrait');
const CELL_W = 18;
const CELL_H = 6.2;
const FRAME_W = portraitView ? 26 : 56;
const FRAME_H = portraitView ? 19 : 19.5;

interface Cell {
  id: FormationId;
  portrait: boolean;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const cells: Cell[] = portraitView
  ? [
      { id: 'race', portrait: true, cx: -6, cy: 0, w: 12, h: 18 },
      { id: 'family', portrait: true, cx: 6, cy: 0, w: 12, h: 18 },
    ]
  : IDS.map((id, n) => ({
      id,
      portrait: false,
      cx: ((n % 3) - 1) * CELL_W,
      cy: (1 - Math.floor(n / 3)) * CELL_H,
      w: CELL_W,
      h: CELL_H,
    }));

/** Centre of a formation's footprint, from each block's centre and half size. */
function footprintCentre(list: readonly Pose[]): { x: number; y: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const q of list) {
    const hw = (BLOCK.width * q.s) / 2;
    const hh = (BLOCK.height * q.s) / 2;
    minX = Math.min(minX, q.p[0] - hw);
    maxX = Math.max(maxX, q.p[0] + hw);
    minY = Math.min(minY, q.p[1] - hh);
    maxY = Math.max(maxY, q.p[1] + hh);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

try {
  const canvas = document.getElementById('gl');
  const labelLayer = document.getElementById('labels');
  const statusLine = document.getElementById('status');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #gl is missing');
  if (!(labelLayer instanceof HTMLDivElement)) throw new Error('#labels is missing');
  if (!(statusLine instanceof HTMLDivElement)) throw new Error('#status is missing');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf1ece0, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(0, 0, 200);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-6, 9, 12);
  scene.add(key, key.target);

  const geometry = new RoundedBoxGeometry(BLOCK.width, BLOCK.height, BLOCK.depth, BLOCK.segments, BLOCK.radius);
  const grey = new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.6, metalness: 0 });
  const seal = new THREE.MeshStandardMaterial({ color: 0xb5312a, roughness: 0.6, metalness: 0 });

  for (const cell of cells) {
    const list = formationFor(cell.id, cell.portrait);
    const centre = footprintCentre(list);
    const group = new THREE.Group();
    group.position.set(cell.cx - centre.x, cell.cy - centre.y, 0);
    list.forEach((q, i) => {
      const mesh = new THREE.Mesh(geometry, i === KIREJI ? seal : grey);
      mesh.position.set(q.p[0], q.p[1], q.p[2]);
      mesh.rotation.set(q.r[0], q.r[1], q.r[2]);
      mesh.scale.setScalar(q.s);
      group.add(mesh);
    });
    scene.add(group);
  }

  const layout = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const aspect = window.innerWidth / window.innerHeight;
    const halfH = Math.max(FRAME_H / 2, FRAME_W / 2 / aspect);
    const halfW = halfH * aspect;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    labelLayer.replaceChildren();
    for (const cell of cells) {
      const anchor = new THREE.Vector3(cell.cx - cell.w / 2 + 0.3, cell.cy + cell.h / 2 - 0.2, 0).project(camera);
      const el = document.createElement('div');
      el.className = 'label';
      el.textContent = cell.portrait ? `${LABEL[cell.id]} portrait` : LABEL[cell.id];
      el.style.left = `${((anchor.x + 1) / 2) * window.innerWidth}px`;
      el.style.top = `${((1 - anchor.y) / 2) * window.innerHeight}px`;
      labelLayer.append(el);
    }
    renderer.render(scene, camera);
  };

  layout();
  window.addEventListener('resize', layout, { passive: true });
} catch (err) {
  sceneError = err instanceof Error ? err.message : String(err);
  console.log(`FAIL scene :: ${sceneError}`);
}

if (sceneError !== '') failures.push(`scene: ${sceneError}`);
const verdict = failures.length === 0 ? 'pass' : `fail:${failures.join('; ')}`;
const statusLine = document.getElementById('status');
if (statusLine instanceof HTMLDivElement) {
  statusLine.textContent =
    `formations harness: ${checks} checks, ${failures.length} failing. ` +
    (portraitView ? 'Portrait view: race and family turned.' : '3 x 3 grid, each formation centred in its cell.');
}
console.log(`harness verdict: ${verdict}`);
root.dataset.harness = verdict;
