// Harness for src/gl/rig.ts (direction-3d.md sections 10.6 and 11.2; architecture section 10a).
// Open /harness/rig.html on the dev server. The verdict lands in dataset.harness: 'pass' or
// 'fail:<reason>'. The numeric checks cover the 1440 x 900 and 375 x 812 keys, the family station
// centres (D19.2) and the phone speed race column at 86 percent of the width (D21.2), whatever the page size.
// The live scene uses the page's own viewport: the 17 blocks of the stanza formation, drawn as plain
// boxes at the hero key through the shared ticker, the stage and the rig. window.rigHarness.showBlend(t)
// blends hero to speed at t and resolves once that frame is drawn, for the second screenshot.
import * as THREE from 'three';
import { ef } from '../src/core/ease';
import { formationRects, stationCenters } from '../src/core/projection';
import { addTick, initTicker, PRIORITY, type Tick } from '../src/core/ticker';
import { BLOCK, BLOCK_COUNT, FAMILY_STATION_X, FORMATIONS } from '../src/gl/blocks/formations';
import { cameraKey, createRig, FIT, type Rig } from '../src/gl/rig';
import type { CameraKey, KeyName } from '../src/gl/section-gl';
import { createStage, type Stage } from '../src/gl/stage';

declare global {
  interface Window {
    rigHarness: { showBlend(t: number): Promise<string> };
  }
}

const root = document.documentElement;
const failed: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failed.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

const KEYS: readonly KeyName[] = ['hero', 'speed', 'pricing', 'closing', 'family'];
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 375, height: 812 };
const PHONE_390 = { width: 390, height: 844 };
const TOL = 0.01;

const fmt = (v: number): string => v.toFixed(4);

interface Expected {
  z: number;
  x: number;
  y: number;
}

const TAN11 = Math.tan((11 * Math.PI) / 180);

/**
 * D21.2, computed here from the rule rather than from the rig: the phone speed camera x puts the race column centre
 * (x 0) at 86 percent of the width. The race height fit z is 15.9 / (0.80 x 2 tan 11 deg), and a screen fraction f at
 * distance z needs the camera at -(f - 0.5) x W(z), with W(z) = 2 z tan 11 deg x aspect.
 */
function phoneSpeedX(size: { width: number; height: number }): number {
  const z = 15.9 / (0.8 * 2 * TAN11);
  const aspect = size.width / size.height;
  return -(0.86 - 0.5) * 2 * z * TAN11 * aspect;
}

// Values from direction-3d.md section 10.6. The phone speed key is the D15.1 height fit with the D21.2 offset
// (x -3.30 at 375 x 812), and the phone family key carries the D19.2 offset of 0.28 W (4.02 bu at 375 x 812).
const EXPECTED: Readonly<Record<'desktop' | 'phone', Readonly<Record<KeyName, Expected>>>> = {
  desktop: {
    hero: { z: 21.15, x: -2.89, y: 0 },
    speed: { z: 31.95, x: 0, y: 0 },
    pricing: { z: 20.07, x: 0, y: 0 },
    closing: { z: 14.6, x: -2.0, y: 0 },
    family: { z: 50.02, x: 0, y: 0 },
  },
  phone: {
    hero: { z: 39.25, x: 0, y: -1.1 },
    speed: { z: 51.12, x: phoneSpeedX(PHONE), y: 0 },
    pricing: { z: 69.54, x: 0, y: 0 },
    closing: { z: 14.6, x: 0, y: 0 },
    family: { z: 80.03, x: 4.02, y: 0 },
  },
};

/** Every key at one viewport against the section 10.6 table: position, target and fov. */
function checkTable(label: 'desktop' | 'phone', size: { width: number; height: number }): void {
  for (const name of KEYS) {
    const k = cameraKey(name, size);
    const e = EXPECTED[label][name];
    const [px, py, pz] = k.position;
    const [tx, ty, tz] = k.target;
    const ok =
      Math.abs(pz - e.z) <= TOL &&
      Math.abs(px - e.x) <= TOL &&
      Math.abs(py - e.y) <= TOL &&
      tx === px &&
      ty === py &&
      tz === 0 &&
      k.fov === FIT.fovDeg;
    check(
      `${label} ${name}`,
      ok,
      `z ${fmt(pz)} (want ${e.z}) x ${fmt(px)} (want ${e.x}) y ${fmt(py)} (want ${e.y}) ` +
        `target (${fmt(tx)}, ${fmt(ty)}, ${tz}) fov ${k.fov}`,
    );
  }
}

/** The desktop x offset is -0.22 times the visible width at the actual aspect, not a fixed number. */
function checkOffsetFollowsAspect(): void {
  const size = { width: 1920, height: 1080 };
  for (const name of ['hero', 'closing'] as const) {
    const k = cameraKey(name, size);
    const z = k.position[2];
    const visible = 2 * z * Math.tan((11 * Math.PI) / 180) * (size.width / size.height);
    check(
      `offset ${name} at 1920x1080`,
      Math.abs(k.position[0] + 0.22 * visible) < 1e-9,
      `x ${fmt(k.position[0])} against -0.22 W(z) = ${fmt(-0.22 * visible)}`,
    );
  }
}

/**
 * D19.2: the phone family camera moves right by 0.28 of the viewport width, so every station centre sits
 * that far left of the centre line. A station's height follows the pinhole model at the family distance z,
 * with a scale of H / (2 tan 11 deg z) px per bu: y = H / 2 + x x scale. The desktop stations stay centred.
 */
function checkStations(): void {
  const tan11 = Math.tan((11 * Math.PI) / 180);
  for (const size of [PHONE, PHONE_390]) {
    const { width, height } = size;
    const zPhone = cameraKey('family', size).position[2];
    const perBuPhone = height / (2 * tan11 * zPhone);
    const stations = stationCenters(size);
    const wantX = width / 2 - 0.28 * width;
    let worst = 0;
    stations.forEach((p, i) => {
      worst = Math.max(worst, Math.abs(p.x - wantX), Math.abs(p.y - (height / 2 + FAMILY_STATION_X[i] * perBuPhone)));
    });
    const leftOfCentre = stations.every((p) => p.x < width / 2);
    check(
      `stations ${width}x${height} left of centre by 0.28 W`,
      leftOfCentre && worst <= TOL,
      `x ${stations.map((p) => fmt(p.x)).join(' ')} (want ${fmt(wantX)} = ${width / 2} - 0.28 x ${width}) ` +
        `y ${stations.map((p) => fmt(p.y)).join(' ')} (worst error ${worst.toExponential(1)} px)`,
    );
  }

  const zDesk = cameraKey('family', DESKTOP).position[2];
  const perBuDesk = DESKTOP.height / (2 * tan11 * zDesk);
  const desk = stationCenters(DESKTOP);
  let deskWorst = 0;
  desk.forEach((p, i) => {
    deskWorst = Math.max(
      deskWorst,
      Math.abs(p.x - (DESKTOP.width / 2 + FAMILY_STATION_X[i] * perBuDesk)),
      Math.abs(p.y - DESKTOP.height / 2),
    );
  });
  check(
    'stations 1440x900 centred, unchanged',
    deskWorst <= TOL,
    `x ${desk.map((p) => fmt(p.x)).join(' ')} y ${desk.map((p) => fmt(p.y)).join(' ')} ` +
      `(worst error ${deskWorst.toExponential(1)} px)`,
  );
}

/**
 * D21.2: on a phone the centre of the vertical race column projects to 86 percent of the width, within 2 px, at the
 * phone sizes and at 768 x 1024 (portrait). Desktop keeps the column centred. The height fit is checked as well: the
 * column spans about 0.80 of the height (the blocks' front faces sit 0.23 bu nearer than the centre plane).
 */
function checkSpeedColumn(): void {
  for (const size of [PHONE, PHONE_390, { width: 768, height: 1024 }]) {
    const rects = formationRects('race', 'speed', size);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const r of rects) {
      x0 = Math.min(x0, r.x0);
      x1 = Math.max(x1, r.x1);
      y0 = Math.min(y0, r.y0);
      y1 = Math.max(y1, r.y1);
    }
    const centre = (x0 + x1) / 2;
    const want = 0.86 * size.width;
    const heightFrac = (y1 - y0) / size.height;
    check(
      `phone speed column centre at 86 percent of the width ${size.width}x${size.height}`,
      Math.abs(centre - want) <= 2 && heightFrac > 0.78 && heightFrac < 0.84,
      `centre ${fmt(centre)} px (want ${fmt(want)}, error ${fmt(centre - want)}), height ${fmt(heightFrac)} of H`,
    );
  }
  const desk = formationRects('race', 'speed', DESKTOP);
  let dx0 = Infinity;
  let dx1 = -Infinity;
  for (const r of desk) {
    dx0 = Math.min(dx0, r.x0);
    dx1 = Math.max(dx1, r.x1);
  }
  check(
    'desktop speed race stays centred (unchanged)',
    Math.abs((dx0 + dx1) / 2 - DESKTOP.width / 2) <= 0.5,
    `centre ${fmt((dx0 + dx1) / 2)} px`,
  );
}

/** The blend and the projection rules, run synchronously so no frame interleaves with the checks. */
function checkBlend(rig: Rig, stage: Stage, size: { width: number; height: number }): void {
  const camera = stage.camera;
  const tick: Tick = { time: 0, dt: 0, frame: 0 };
  const hero = cameraKey('hero', size);
  const speed = cameraKey('speed', size);
  const at = (): number[] => [camera.position.x, camera.position.y, camera.position.z];
  const near = (got: readonly number[], want: readonly number[], eps: number): boolean =>
    got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) <= eps);

  let projections = 0;
  const realProjection = camera.updateProjectionMatrix.bind(camera);
  camera.updateProjectionMatrix = (): void => {
    projections += 1;
    realProjection();
  };

  const step = (from: CameraKey, to: CameraKey, t: number): number[] => {
    rig.blend(from, to, t);
    rig.update(tick);
    return at();
  };

  check('blend t=0 is the from key', near(step(hero, speed, 0), hero.position, 1e-9));
  check('blend t=1 is the to key', near(step(hero, speed, 1), speed.position, 1e-9));
  check('blend clamps t above 1', near(step(hero, speed, 2), speed.position, 1e-9));
  check('blend clamps t below 0', near(step(hero, speed, -1), hero.position, 1e-9));

  const mid = [0, 1, 2].map((i) => (hero.position[i] + speed.position[i]) / 2);
  check('blend t=0.5 is the midpoint', near(step(hero, speed, 0.5), mid, 1e-9), `sym(0.5) = ${fmt(ef.sym(0.5))}`);

  const q = ef.sym(0.25);
  const want = [0, 1, 2].map((i) => hero.position[i] + (speed.position[i] - hero.position[i]) * q);
  check('blend t=0.25 follows ef.sym', near(step(hero, speed, 0.25), want, 1e-9), `sym(0.25) = ${fmt(q)}`);
  check('ef.sym is not linear at 0.25', Math.abs(q - 0.25) > 0.05, `sym(0.25) = ${fmt(q)}`);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  check(
    'camera looks down -z at a blended key',
    Math.abs(dir.x) < 1e-9 && Math.abs(dir.y) < 1e-9 && Math.abs(dir.z + 1) < 1e-9,
    `direction (${fmt(dir.x)}, ${fmt(dir.y)}, ${fmt(dir.z)})`,
  );
  check('no projection rebuild while fov is unchanged', projections === 0, `rebuilds ${projections}`);

  const wide: CameraKey = { position: speed.position, target: speed.target, fov: 30 };
  rig.blend(speed, wide, 1);
  rig.update(tick);
  check('fov change rebuilds the projection once', camera.fov === 30 && projections === 1, `fov ${camera.fov}, rebuilds ${projections}`);
  rig.blend(wide, wide, 0.3);
  rig.update(tick);
  check('same fov again does not rebuild', projections === 1, `rebuilds ${projections}`);

  rig.blend(hero, hero, 0);
  rig.update(tick);
  const element5 = camera.projectionMatrix.elements[5];
  const want5 = 1 / Math.tan((11 * Math.PI) / 180);
  check(
    'fov back to 22 rebuilds and the projection matches tan(11 deg)',
    camera.fov === 22 && projections === 2 && Math.abs(element5 - want5) < 1e-9,
    `fov ${camera.fov}, rebuilds ${projections}, element[5] ${fmt(element5)} (want ${fmt(want5)})`,
  );

  const stopped = createRig(stage);
  stopped.dispose();
  const before = at();
  stopped.blend(speed, speed, 1);
  stopped.update(tick);
  check('disposed rig leaves the camera alone', near(at(), before, 0));

  camera.updateProjectionMatrix = realProjection;
  rig.blend(hero, hero, 0);
  rig.update(tick);
}

/** The stanza of section 11.2 as 17 plain boxes: one InstancedMesh, so one draw call. */
function buildStanza(): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(BLOCK.width, BLOCK.height, BLOCK.depth);
  const material = new THREE.MeshNormalMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, BLOCK_COUNT);
  mesh.name = 'stanza';
  const dummy = new THREE.Object3D();
  FORMATIONS.stanza.forEach((pose, i) => {
    dummy.position.set(pose.p[0], pose.p[1], pose.p[2]);
    dummy.rotation.set(pose.r[0], pose.r[1], pose.r[2]);
    dummy.scale.setScalar(pose.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** Resolves once n frames have been drawn: the callback runs after the stage's render tick. */
function framesAfterRender(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const stop = addTick(() => {
      seen += 1;
      if (seen === n) {
        stop();
        resolve();
      }
    }, PRIORITY.glRender + 1);
  });
}

async function main(): Promise<void> {
  initTicker();
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('no #gl canvas on the page');
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  checkTable('desktop', DESKTOP);
  checkTable('phone', PHONE);
  checkOffsetFollowsAspect();
  checkStations();
  checkSpeedColumn();

  const stage = createStage(canvas);
  const rig = createRig(stage);
  addTick(rig.update, PRIORITY.glUpdate);
  checkBlend(rig, stage, viewport);

  const hero = cameraKey('hero', viewport);
  const speed = cameraKey('speed', viewport);
  stage.scene.add(buildStanza());
  rig.blend(hero, hero, 0);
  await framesAfterRender(3);

  const info = stage.renderer.info.render;
  check(
    'stanza drawn at the hero key',
    info.calls === 1 && info.triangles === BLOCK_COUNT * 12,
    `draw calls ${info.calls}, triangles ${info.triangles} (want 1 and ${BLOCK_COUNT * 12})`,
  );

  window.rigHarness = {
    async showBlend(t: number): Promise<string> {
      rig.blend(hero, speed, t);
      await framesAfterRender(3);
      const p = stage.camera.position;
      return `t=${t} camera (${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}) fov ${stage.camera.fov}`;
    },
  };

  console.log(`SUMMARY ${passed} passed, ${failed.length} failed`);
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.log(`FAIL harness :: ${reason}`);
  root.dataset.harness = `fail:exception ${reason}`;
});
