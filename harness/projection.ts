// Harness for src/core/projection.ts (design/direction-act1.md rule A6; direction-3d.md 10.16; architecture 10a).
// Open /harness/projection.html?key=hero (or speed, or family) on the dev server. The verdict lands in
// dataset.harness: 'pass', or 'fail:<reason>' where the reason names the failed checks. The checks use the
// fixed sizes 1440 x 900 and 375 x 812 whatever the page size. The plate draws one formation's rectangles
// as outlines on a page-sized canvas 2D, for the screenshot.
import * as THREE from 'three';
import {
  blockRects,
  boundsOf,
  formationRects,
  projectPoint,
  stationCenters,
  viewportSize,
  type Point,
  type ScreenRect,
  type Size,
} from '../src/core/projection';
import type { FormationId } from '../src/core/types';
import { FAMILY_STATION_X, FORMATIONS, KIREJI, formationFor, type Pose } from '../src/gl/blocks/formations';
import { cameraKey } from '../src/gl/rig';
import type { CameraKey, KeyName } from '../src/gl/section-gl';

type Plate = 'hero' | 'speed' | 'family';

const root = document.documentElement;
const DESK: Size = { width: 1440, height: 900 };
const PHONE: Size = { width: 375, height: 812 };
const SIZES: readonly Size[] = [DESK, PHONE];
const KEYS: readonly KeyName[] = ['hero', 'speed', 'pricing', 'closing', 'family'];
const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

/** Pixel tolerance for the act I px references, which the spec gives to one decimal. */
const PX_TOL = 0.5;
/** Tolerance for the act I percentages, in percentage points, which the spec gives to two decimals. */
const PCT_TOL = 0.01;

const INK = '#151512';
const PAPER = '#F1ECE0';
const TEXT3 = '#5E5A51';
const RULE = '#7D786A';
const SEAL = '#B5312A';
const SEAL_TEXT = '#9A2820';

const failed: string[] = [];
let passed = 0;
let total = 0;

function check(name: string, ok: boolean, detail = ''): void {
  total += 1;
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failed.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

function near(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) <= tol;
}

function pctOf(value: number, whole: number): number {
  return (value / whole) * 100;
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof RangeError;
  }
}

function sameRect(a: ScreenRect, b: ScreenRect): boolean {
  return a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1;
}

/**
 * A pinhole camera written in normalised device coordinates, separately from the page's formula. The
 * camera sits at key.position and looks down -z, so a point's depth is cz - z. Half the vertical field of
 * view is tan(fov / 2), and the horizontal half-extent is that times the aspect ratio.
 */
function pinhole(x: number, y: number, z: number, key: CameraKey, size: Size): Point {
  const halfTan = Math.tan((key.fov / 2) * (Math.PI / 180));
  const depth = key.position[2] - z;
  const ndcX = (x - key.position[0]) / (depth * halfTan * (size.width / size.height));
  const ndcY = (y - key.position[1]) / (depth * halfTan);
  return { x: ((ndcX + 1) / 2) * size.width, y: ((1 - ndcY) / 2) * size.height };
}

/** The same point through three.js's own PerspectiveCamera and Vector3.project, which is the renderer's maths. */
function viaThree(x: number, y: number, z: number, key: CameraKey, size: Size): Point {
  const camera = new THREE.PerspectiveCamera(key.fov, size.width / size.height, 0.5, 80);
  camera.position.set(key.position[0], key.position[1], key.position[2]);
  camera.lookAt(key.target[0], key.target[1], key.target[2]);
  camera.updateMatrixWorld(true);
  const ndc = new THREE.Vector3(x, y, z).project(camera);
  return { x: ((ndc.x + 1) / 2) * size.width, y: ((1 - ndc.y) / 2) * size.height };
}

/** The eight corners of a block at scale 1 centred on p: x and y at +-0.35, z at +-0.23 (direction-3d 10.2). */
function blockCorners(p: readonly [number, number, number]): [number, number, number][] {
  const corners: [number, number, number][] = [];
  for (const dz of [0.23, -0.23]) {
    for (const dy of [-0.35, 0.35]) {
      for (const dx of [-0.35, 0.35]) corners.push([p[0] + dx, p[1] + dy, p[2] + dz]);
    }
  }
  return corners;
}

/** The front-face rectangle of a pose, built from projectPoint alone. It is the harness's own reading of P1. */
function frontBox(pose: Pose, key: CameraKey, size: Size): ScreenRect {
  const front = pose.p[2] + 0.23 * pose.s;
  const half = 0.35 * pose.s;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const dx of [-half, half]) {
    for (const dy of [-half, half]) {
      const p = projectPoint(pose.p[0] + dx, pose.p[1] + dy, front, key, size);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
  }
  return { x0, y0, x1, y1 };
}

/** The union of a range, written out the long way for comparison with boundsOf. */
function unionOf(rects: readonly ScreenRect[], from: number, to: number): ScreenRect {
  const slice = rects.slice(from, to + 1);
  return {
    x0: Math.min(...slice.map((r) => r.x0)),
    y0: Math.min(...slice.map((r) => r.y0)),
    x1: Math.max(...slice.map((r) => r.x1)),
    y1: Math.max(...slice.map((r) => r.y1)),
  };
}

function runChecks(): void {
  // Viewport
  const vp = viewportSize();
  check(
    'viewport-size',
    vp.width === window.innerWidth && vp.height === window.innerHeight,
    `${vp.width} x ${vp.height}`,
  );

  // Reference values, 1440 x 900, hero key (rule A6 and the preloader 2D layer)
  const desk = formationRects('stanza', 'hero', DESK);
  const kireji = desk[KIREJI];
  check('kireji-x0', near(kireji.x0, 1194.1, PX_TOL), kireji.x0.toFixed(3));
  check('kireji-x1', near(kireji.x1, 1271.6, PX_TOL), kireji.x1.toFixed(3));
  check('kireji-y0', near(kireji.y0, 295.1, PX_TOL), kireji.y0.toFixed(3));
  check('kireji-y1', near(kireji.y1, 372.5, PX_TOL), kireji.y1.toFixed(3));

  const rowA = boundsOf(desk, 0, 4);
  const rowB = boundsOf(desk, 5, 11);
  const stanza = boundsOf(desk);
  const pct = (v: number, whole: number): string => `${pctOf(v, whole).toFixed(4)}%`;
  check('row-B-left-49.49', near(pctOf(rowB.x0, DESK.width), 49.49, PCT_TOL), pct(rowB.x0, DESK.width));
  check('row-B-right-94.99', near(pctOf(rowB.x1, DESK.width), 94.99, PCT_TOL), pct(rowB.x1, DESK.width));
  check('row-A-left-56.18', near(pctOf(rowA.x0, DESK.width), 56.18, PCT_TOL), pct(rowA.x0, DESK.width));
  check('row-A-right-88.30', near(pctOf(rowA.x1, DESK.width), 88.3, PCT_TOL), pct(rowA.x1, DESK.width));
  check('stanza-top-32.79', near(pctOf(stanza.y0, DESK.height), 32.79, PCT_TOL), pct(stanza.y0, DESK.height));
  check('stanza-bottom-67.21', near(pctOf(stanza.y1, DESK.height), 67.21, PCT_TOL), pct(stanza.y1, DESK.height));

  // Reference values, 375 x 812, hero no-WebGL fallback
  const phone = boundsOf(formationRects('stanza', 'hero', PHONE));
  check('phone-stanza-left-7.75', near(pctOf(phone.x0, PHONE.width), 7.75, PCT_TOL), pct(phone.x0, PHONE.width));
  check(
    'phone-stanza-width-84.50',
    near(pctOf(phone.x1 - phone.x0, PHONE.width), 84.5, PCT_TOL),
    pct(phone.x1 - phone.x0, PHONE.width),
  );
  // Vertical centres: the desktop stanza is centred at 50%, and the phone stanza sits in the upper half
  // (camera y -1.10), centred at 42.75% of the height.
  const deskCentre = (stanza.y0 + stanza.y1) / 2;
  const phoneCentre = (phone.y0 + phone.y1) / 2;
  check('stanza-centre-1440-50', near(pctOf(deskCentre, DESK.height), 50, PCT_TOL), pct(deskCentre, DESK.height));
  check(
    'phone-stanza-centre-42.75',
    near(pctOf(phoneCentre, PHONE.height), 42.75, PCT_TOL),
    pct(phoneCentre, PHONE.height),
  );

  // The eight corners of block 2 at z +-0.23, for every key at both sizes, against a pinhole written in NDC
  // and against three.js's own camera. Block 2 is index 2 in the code's numbering (the middle of row A), and
  // index 1 is block 02 in the 1-based numbering of direction-3d 10.2, so both are checked.
  const corners = [...blockCorners(FORMATIONS.stanza[1].p), ...blockCorners(FORMATIONS.stanza[2].p)];
  for (const size of SIZES) {
    let worstPinhole = 0;
    let worstThree = 0;
    for (const name of KEYS) {
      const key = cameraKey(name, size);
      for (const [x, y, z] of corners) {
        const got = projectPoint(x, y, z, key, size);
        const ph = pinhole(x, y, z, key, size);
        const th = viaThree(x, y, z, key, size);
        worstPinhole = Math.max(worstPinhole, Math.abs(got.x - ph.x), Math.abs(got.y - ph.y));
        worstThree = Math.max(worstThree, Math.abs(got.x - th.x), Math.abs(got.y - th.y));
      }
    }
    check(`block-corners-pinhole-${size.width}`, worstPinhole < 1e-6, `worst ${worstPinhole.toExponential(2)} px`);
    check(`block-corners-three-${size.width}`, worstThree < 0.01, `worst ${worstThree.toExponential(2)} px`);
  }

  // A camera that is not straight down: the general view must agree with three.js too.
  const oblique: CameraKey = { position: [3, -2, 20], target: [1, 0.5, 0], fov: 22 };
  let worstOblique = 0;
  for (const size of SIZES) {
    for (const [x, y, z] of corners) {
      const got = projectPoint(x, y, z, oblique, size);
      const th = viaThree(x, y, z, oblique, size);
      worstOblique = Math.max(worstOblique, Math.abs(got.x - th.x), Math.abs(got.y - th.y));
    }
  }
  check('oblique-key-three', worstOblique < 0.01, `worst ${worstOblique.toExponential(2)} px`);

  // Every formation, key and size: formationRects is blockRects of the front faces, and each rectangle is
  // the bounding box of its front face projected by projectPoint.
  let worstBox = 0;
  let mismatched = 0;
  let inexact = 0;
  let rectCount = 0;
  for (const size of SIZES) {
    for (const name of KEYS) {
      const key = cameraKey(name, size);
      for (const id of FORMATION_IDS) {
        const poses = formationFor(id, size.width < size.height);
        const got = formationRects(id, name, size);
        const direct = blockRects(poses, key, size);
        if (got.length !== poses.length) mismatched += 1;
        for (let i = 0; i < poses.length; i += 1) {
          const box = frontBox(poses[i], key, size);
          const r = got[i];
          worstBox = Math.max(
            worstBox,
            Math.abs(r.x0 - box.x0),
            Math.abs(r.y0 - box.y0),
            Math.abs(r.x1 - box.x1),
            Math.abs(r.y1 - box.y1),
          );
          if (!sameRect(r, direct[i])) inexact += 1;
          rectCount += 1;
        }
      }
    }
  }
  check(
    'rects-are-front-face-boxes',
    worstBox < 1e-9 && mismatched === 0 && inexact === 0,
    `${rectCount} rectangles, worst ${worstBox.toExponential(2)} px, ${inexact} inexact`,
  );

  // Portrait race: index 0 at the top, the line vertical and centred on x.
  const raceP = formationRects('race', 'speed', PHONE);
  const raceCentreX = raceP.map((r) => (r.x0 + r.x1) / 2);
  const raceCentreY = raceP.map((r) => (r.y0 + r.y1) / 2);
  const raceVertical =
    raceCentreY.every((y, i) => i === 0 || y > raceCentreY[i - 1]) &&
    raceCentreX.every((x) => near(x, raceCentreX[0], 0.01));
  check('race-portrait-vertical', raceVertical, `top ${raceCentreY[0].toFixed(1)}, bottom ${raceCentreY[16].toFixed(1)}`);

  // Landscape race: index 0 at the left, the line horizontal and centred on y.
  const raceD = formationRects('race', 'speed', DESK);
  const raceDCentreX = raceD.map((r) => (r.x0 + r.x1) / 2);
  const raceDCentreY = raceD.map((r) => (r.y0 + r.y1) / 2);
  const raceHorizontal =
    raceDCentreX.every((x, i) => i === 0 || x > raceDCentreX[i - 1]) &&
    raceDCentreY.every((y) => near(y, raceDCentreY[0], 0.01));
  check('race-landscape-horizontal', raceHorizontal, `left ${raceDCentreX[0].toFixed(1)}, right ${raceDCentreX[16].toFixed(1)}`);

  // Act I speed references at 1440 x 900: the race box of the no-WebGL fallback, block 01's left edge (the
  // caliper's origin), and the race's bottom edge (the dimension line sits 19 px below it). The phone race
  // is vertical and centred on the screen's middle, at 406 px.
  const raceBox = boundsOf(raceD);
  check('race-desk-left-9.71', near(pctOf(raceBox.x0, DESK.width), 9.71, PCT_TOL), pct(raceBox.x0, DESK.width));
  check(
    'race-desk-width-80.58',
    near(pctOf(raceBox.x1 - raceBox.x0, DESK.width), 80.58, PCT_TOL),
    pct(raceBox.x1 - raceBox.x0, DESK.width),
  );
  const raceDeskCentre = (raceBox.y0 + raceBox.y1) / 2;
  check('race-desk-centre-50', near(pctOf(raceDeskCentre, DESK.height), 50, PCT_TOL), pct(raceDeskCentre, DESK.height));
  check('race-desk-block01-left-139.8', near(raceD[0].x0, 139.8, PX_TOL), raceD[0].x0.toFixed(3));
  check('race-desk-bottom-475.5', near(raceBox.y1, 475.5, PX_TOL), raceBox.y1.toFixed(3));
  const racePhoneBox = boundsOf(raceP);
  const racePhoneCentre = (racePhoneBox.y0 + racePhoneBox.y1) / 2;
  check('race-phone-centre-406', near(racePhoneCentre, 406, PX_TOL), racePhoneCentre.toFixed(3));

  // Family stations: left to right on the desktop, top to bottom on the phone (section 11.8).
  const stationsD = stationCenters(DESK);
  const stationsP = stationCenters(PHONE);
  check(
    'stations-landscape-left-to-right',
    stationsD.every((p, i) => i === 0 || p.x > stationsD[i - 1].x) &&
      stationsD.every((p) => near(p.y, stationsD[0].y, 0.01)),
    stationsD.map((p) => p.x.toFixed(1)).join(' '),
  );
  check(
    'stations-portrait-top-to-bottom',
    stationsP.every((p, i) => i === 0 || p.y > stationsP[i - 1].y) &&
      stationsP.every((p) => near(p.x, stationsP[0].x, 0.01)),
    stationsP.map((p) => p.y.toFixed(1)).join(' '),
  );
  const familyD = cameraKey('family', DESK);
  const familyP = cameraKey('family', PHONE);
  let worstStation = 0;
  FAMILY_STATION_X.forEach((x, i) => {
    const d = projectPoint(x, 0, 0, familyD, DESK);
    const p = projectPoint(0, -x, 0, familyP, PHONE);
    worstStation = Math.max(
      worstStation,
      Math.abs(stationsD[i].x - d.x),
      Math.abs(stationsD[i].y - d.y),
      Math.abs(stationsP[i].x - p.x),
      Math.abs(stationsP[i].y - p.y),
    );
  });
  check('stations-match-projectPoint', worstStation < 1e-9, `worst ${worstStation.toExponential(2)} px`);

  // The portrait family axis turns: stanza row A (y +1.05) lands right of row B and row C lands left.
  const famP = formationRects('family', 'family', PHONE);
  const famRowA = boundsOf(famP, 0, 4);
  const famRowB = boundsOf(famP, 5, 11);
  const famRowC = boundsOf(famP, 12, 16);
  const cxOf = (b: ScreenRect): number => (b.x0 + b.x1) / 2;
  check(
    'family-portrait-rows-are-columns',
    cxOf(famRowA) > cxOf(famRowB) && cxOf(famRowB) > cxOf(famRowC),
    `A ${cxOf(famRowA).toFixed(1)}, B ${cxOf(famRowB).toFixed(1)}, C ${cxOf(famRowC).toFixed(1)}`,
  );

  // boundsOf: unions of the rows and of the whole formation, and a RangeError for a range that does not fit.
  check(
    'boundsOf-unions',
    sameRect(boundsOf(desk, 5, 11), unionOf(desk, 5, 11)) &&
      sameRect(boundsOf(desk, 0, 4), unionOf(desk, 0, 4)) &&
      sameRect(boundsOf(desk), unionOf(desk, 0, 16)),
  );
  check(
    'boundsOf-range-errors',
    throws(() => boundsOf(desk, 5, 4)) &&
      throws(() => boundsOf(desk, 0, 17)) &&
      throws(() => boundsOf(desk, -1, 3)) &&
      throws(() => boundsOf([])),
  );

  // Errors for unusable input.
  check('projectPoint-zero-width-throws', throws(() => projectPoint(0, 0, 0, familyD, { width: 0, height: 900 })));
  const alongY: CameraKey = { position: [0, 0, 5], target: [0, 5, 5], fov: 22 };
  check('view-along-y-throws', throws(() => projectPoint(0, 0, 0, alongY, DESK)));

  // Out parameters: the same objects come back, so a steady-state frame allocates nothing.
  const hero = cameraKey('hero', DESK);
  const pointOut: Point = { x: 0, y: 0 };
  check('projectPoint-out-identity', projectPoint(1, 2, 0, hero, DESK, pointOut) === pointOut);

  const rectOut: ScreenRect[] = [];
  const first = blockRects(FORMATIONS.stanza, hero, DESK, rectOut);
  const kept = first[0];
  blockRects(FORMATIONS.stanza, hero, DESK, rectOut);
  const trimmed = blockRects(FORMATIONS.stanza.slice(0, 5), hero, DESK, rectOut);
  check(
    'blockRects-out-reuse',
    first === rectOut && rectOut[0] === kept && trimmed === rectOut && rectOut.length === 5,
  );

  const formationOut: ScreenRect[] = [];
  const formed = formationRects('race', 'speed', DESK, formationOut);
  const formedFirst = formed[0];
  formationRects('race', 'speed', DESK, formationOut);
  check('formationRects-out-reuse', formed === formationOut && formationOut[0] === formedFirst);

  const stationOut: Point[] = [];
  const stations = stationCenters(DESK, stationOut);
  const stationFirst = stations[0];
  stationCenters(DESK, stationOut);
  check(
    'stationCenters-out-reuse',
    stations === stationOut && stationOut[0] === stationFirst && stationOut.length === 4,
  );

  const boundsOut: ScreenRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  check('boundsOf-out-identity', boundsOf(desk, 0, 4, boundsOut) === boundsOut && sameRect(boundsOut, rowA));
}

function plateChoice(): Plate {
  const value = new URLSearchParams(window.location.search).get('key');
  return value === 'speed' || value === 'family' ? value : 'hero';
}

function plateElement(): HTMLCanvasElement {
  const element = document.getElementById('plate');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('missing #plate canvas');
  return element;
}

function outline(ctx: CanvasRenderingContext2D, rects: readonly ScreenRect[], colour: string): void {
  ctx.strokeStyle = colour;
  for (const r of rects) ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
}

function dashedBox(ctx: CanvasRenderingContext2D, b: ScreenRect, colour: string): void {
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = colour;
  ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.restore();
}

function drawPlate(which: Plate): void {
  const size = viewportSize();
  const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const canvas = plateElement();
  canvas.width = Math.round(size.width * dpr);
  canvas.height = Math.round(size.height * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2D context');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.lineWidth = 1;
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'alphabetic';

  if (which === 'hero') {
    const rects = formationRects('stanza', 'hero', size);
    outline(ctx, rects, INK);
    ctx.lineWidth = 2;
    outline(ctx, [rects[KIREJI]], SEAL);
    ctx.lineWidth = 1;
    const rows: [string, number, number][] = [
      ['A', 0, 4],
      ['B', 5, 11],
      ['C', 12, 16],
    ];
    for (const [name, from, to] of rows) {
      const b = boundsOf(rects, from, to);
      dashedBox(ctx, b, TEXT3);
      ctx.fillStyle = TEXT3;
      const label = `${name}  ${pctOf(b.x0, size.width).toFixed(2)}% to ${pctOf(b.x1, size.width).toFixed(2)}%`;
      if (b.x0 >= 170) {
        // Room on the left: the label sits beside its row.
        ctx.textAlign = 'right';
        ctx.fillText(label, b.x0 - 8, (b.y0 + b.y1) / 2 + 4);
      } else {
        // A phone's stanza starts near the left edge, so the label sits above its row.
        ctx.textAlign = 'left';
        ctx.fillText(label, b.x0, b.y0 - 6);
      }
    }
    ctx.textAlign = 'left';
    // The eight corners of block 2: solid on the front face (z +0.23), hollow on the back face (z -0.23).
    const key = cameraKey('hero', size);
    for (const [x, y, z] of blockCorners(FORMATIONS.stanza[2].p)) {
      const p = projectPoint(x, y, z, key, size);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      if (z > 0) {
        ctx.fillStyle = SEAL_TEXT;
        ctx.fill();
      } else {
        ctx.strokeStyle = RULE;
        ctx.stroke();
      }
    }
  } else if (which === 'speed') {
    const rects = formationRects('race', 'speed', size);
    outline(ctx, rects, INK);
    ctx.lineWidth = 2;
    outline(ctx, [rects[KIREJI]], SEAL);
    ctx.lineWidth = 1;
    const all = boundsOf(rects);
    dashedBox(ctx, all, TEXT3);
    ctx.fillStyle = TEXT3;
    ctx.fillText(
      `race  x ${all.x0.toFixed(1)} to ${all.x1.toFixed(1)}  y ${all.y0.toFixed(1)} to ${all.y1.toFixed(1)}`,
      all.x0,
      all.y1 + 18,
    );
  } else {
    outline(ctx, formationRects('family', 'family', size), INK);
    const names = ['Slower', 'Moderate', 'Fast', 'Fastest'];
    stationCenters(size).forEach((p, i) => {
      ctx.strokeStyle = SEAL_TEXT;
      ctx.beginPath();
      ctx.moveTo(p.x - 6, p.y);
      ctx.lineTo(p.x + 6, p.y);
      ctx.moveTo(p.x, p.y - 6);
      ctx.lineTo(p.x, p.y + 6);
      ctx.stroke();
      ctx.fillStyle = TEXT3;
      ctx.textAlign = 'center';
      ctx.fillText(names[i], p.x, p.y + 26);
    });
    ctx.textAlign = 'left';
  }

  const verdict = failed.length === 0 ? 'pass' : 'FAIL';
  ctx.fillStyle = INK;
  ctx.fillText(`projection harness  ${size.width} x ${size.height}  key ${which}`, 12, 20);
  ctx.fillText(`${passed} of ${total} checks ${verdict}`, 12, 36);
}

function main(): void {
  const which = plateChoice();
  try {
    runChecks();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failed.push('exception');
    console.log(`FAIL exception :: ${reason}`);
  }
  try {
    drawPlate(which);
    window.addEventListener('resize', () => drawPlate(which));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failed.push('plate');
    console.log(`FAIL plate :: ${reason}`);
  }
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
  console.log(`RESULT ${root.dataset.harness} (${passed} of ${total} checks)`);
}

main();
