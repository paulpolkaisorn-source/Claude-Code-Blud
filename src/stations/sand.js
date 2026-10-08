import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { heightField, normalMapFromHeight, roughnessMapFromHeight, colorMapFromHeight } from '../utils/textures.js';
import { patchSlits, makeSlitUniforms, SLIT_MAX } from '../engine/shaders.js';
import { STATION_X } from '../engine/room.js';
import { clamp, rand, expDamp } from '../utils/math.js';
import { Spring1D } from '../utils/spring.js';

export const sandMeta = {
  id: 'sand',
  name: 'Kinetic Sand',
  hint: 'Press and drag across the block to slice it. Let go and the grains settle.',
  cursor: { nx: 0.5, ny: 0.5 },
};

const BLOCK = { w: 2.2, h: 0.85, d: 1.25 };
const PAD_TOP = 0.035;
const BLOCK_Y = PAD_TOP + BLOCK.h / 2;
const TOP_Y = PAD_TOP + BLOCK.h;
const HALF_W = BLOCK.w / 2;
const GRAVITY = 9.8;
const GRAIN_R = 0.011;

// Kinetic sand: a sand block you slice with a wire-cutter. Each cut is a slot in the material
// (a shader discard), grains spill from the slot and fall with fixed-step physics, and the
// cutting speed drives the crunch density, pitch-free grain ticks, hiss level and camera shake.
export function createSand(app) {
  const x0 = STATION_X[0];
  const group = new THREE.Group();
  group.position.set(x0, 0, 0);
  const tier = app.quality.tier;
  const tex = app.quality.settings.texSize;
  const grainMax = [520, 900, 1400][tier];

  const height = heightField(tex, { scale: 58, stretchX: 1, stretchY: 1, octaves: 4, seed: 5 });
  const map = colorMapFromHeight(height, tex, [0.72, 0.52, 0.32], [0.92, 0.77, 0.56], 0.06);
  const normalMap = normalMapFromHeight(height, tex, 2.6);
  const roughnessMap = roughnessMapFromHeight(height, tex, 0.88, 0.2);

  const slits = makeSlitUniforms();
  const blockMat = patchSlits(
    new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, side: THREE.DoubleSide }),
    slits
  );
  const blockGeo = new RoundedBoxGeometry(BLOCK.w, BLOCK.h, BLOCK.d, 5, 0.08);
  const block = new THREE.Mesh(blockGeo, blockMat);
  block.position.y = BLOCK_Y;
  block.castShadow = true;
  block.receiveShadow = true;
  group.add(block);

  // Wire cutter: a steel capsule lying along X.
  const wireGeo = new THREE.CapsuleGeometry(0.016, 0.52, 4, 10);
  wireGeo.rotateZ(Math.PI / 2);
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, metalness: 1, roughness: 0.2 });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.castShadow = true;
  group.add(wire);

  // Grain pool: one instanced mesh, physics in step().
  const grainGeo = new THREE.SphereGeometry(GRAIN_R, 5, 4);
  const grainMat = new THREE.MeshStandardMaterial({ roughness: 0.92, color: 0xffffff });
  const grains = new THREE.InstancedMesh(grainGeo, grainMat, grainMax);
  grains.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grains.receiveShadow = true;
  const gPos = new Float32Array(grainMax * 3);
  const gVel = new Float32Array(grainMax * 3);
  const gLife = new Float32Array(grainMax);
  const tint = new THREE.Color();
  for (let i = 0; i < grainMax; i++) {
    tint.setRGB(0.85 + rand(-0.08, 0.08), 0.68 + rand(-0.08, 0.08), 0.46 + rand(-0.06, 0.06));
    grains.setColorAt(i, tint);
  }
  grains.instanceColor.needsUpdate = true;
  group.add(grains);
  let nextGrain = 0;
  const dummy = new THREE.Object3D();
  const quatIdentity = new THREE.Quaternion();

  const tipX = new Spring1D({ stiffness: 260, damping: 26 });
  const tipZ = new Spring1D({ stiffness: 260, damping: 26 });
  const tipY = new Spring1D({ stiffness: 200, damping: 20, value: TOP_Y + 0.22, target: TOP_Y + 0.22 });
  const squish = new Spring1D({ stiffness: 160, damping: 9 });

  const segments = []; // { z, x0, x1 }, last one may be open
  let openSeg = null;
  let cutting = false;
  let speedSm = 0;
  let lastX = 0;
  let lastT = 0;
  let crunchAcc = 0;
  let emitAcc = 0;
  let lastPan = 0;
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BLOCK_Y);
  const hit = new THREE.Vector3();

  function localFromPointer(p) {
    app.camera.updateMatrixWorld();
    raycaster.setFromCamera(p.ndc, app.camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return {
      x: clamp(hit.x - x0, -HALF_W + 0.04, HALF_W - 0.04),
      z: clamp(hit.z, -BLOCK.d / 2 + 0.08, BLOCK.d / 2 - 0.08),
      over: Math.abs(hit.x - x0) <= HALF_W + 0.15,
    };
  }

  function spawnGrain(x, y, z, vx, vy, vz) {
    const i = nextGrain;
    nextGrain = (nextGrain + 1) % grainMax;
    gPos[i * 3] = x;
    gPos[i * 3 + 1] = y;
    gPos[i * 3 + 2] = z;
    gVel[i * 3] = vx;
    gVel[i * 3 + 1] = vy;
    gVel[i * 3 + 2] = vz;
    gLife[i] = rand(3, 5);
  }

  function burst(x, z, count, power) {
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(0.3, 1) * power;
      spawnGrain(
        x + rand(-0.05, 0.05),
        TOP_Y - 0.02,
        z + rand(-0.05, 0.05),
        Math.cos(a) * s * 0.6,
        rand(0.6, 1.6) * power,
        Math.sin(a) * s * 0.6
      );
    }
  }

  function syncSegments() {
    const z = slits.uSegZ.value;
    const a = slits.uSegX0.value;
    const b = slits.uSegX1.value;
    for (let i = 0; i < SLIT_MAX; i++) {
      const s = segments[i];
      z[i] = s ? s.z : 0;
      a[i] = s ? s.x0 : 0;
      b[i] = s ? s.x1 : 0;
    }
    slits.uSegN.value = segments.length;
  }

  function pushSegment(seg) {
    if (segments.length >= SLIT_MAX) segments.shift();
    segments.push(seg);
  }

  function startCut(l, p) {
    cutting = true;
    openSeg = { z: l.z, x0: l.x, x1: l.x };
    pushSegment(openSeg);
    lastX = l.x;
    lastT = p.time;
    crunchAcc = 0;
    emitAcc = 0;
    lastPan = p.pan;
    app.voices.crunch({ intensity: 0.3, pan: p.pan });
    app.haptic(6);
    app.shake(0.004);
  }

  const station = {
    group,
    cursorStart: sandMeta.cursor,
    enter() {
      app.voices.startHiss();
    },
    exit() {
      app.voices.stopHiss();
    },
    pointerDown(p) {
      const l = localFromPointer(p);
      if (!l || !l.over) return;
      startCut(l, p);
    },
    pointerMove(p) {
      const l = localFromPointer(p);
      if (!l) return;
      if (!cutting) {
        tipX.target = l.x;
        tipZ.target = l.z;
        tipY.target = TOP_Y + 0.22;
        return;
      }
      const dt = Math.max((p.time - lastT) / 1000, 0.008);
      const dx = l.x - lastX;
      lastX = l.x;
      lastT = p.time;
      openSeg.x1 = l.x;
      openSeg.z = l.z;
      const speed = Math.abs(dx) / dt;
      speedSm = expDamp(speedSm, speed, 10, dt);
      const level = clamp(speedSm / 2.2, 0, 1);
      lastPan = p.pan;

      tipX.target = l.x;
      tipZ.target = l.z;
      tipY.target = TOP_Y - 0.1;

      crunchAcc += Math.abs(dx);
      if (crunchAcc > 0.045) {
        crunchAcc = 0;
        app.voices.crunch({ intensity: clamp(0.15 + level * 0.95, 0.1, 1), pan: p.pan });
      }
      app.voices.setHiss(level);

      emitAcc += Math.abs(dx) * 70;
      while (emitAcc >= 1 && emitAcc < 40) {
        emitAcc -= 1;
        spawnGrain(
          l.x + rand(-0.02, 0.02),
          TOP_Y - 0.06,
          l.z + rand(-0.03, 0.03),
          rand(-0.4, 0.4),
          rand(0.4, 1.2) * (0.5 + level),
          rand(-0.3, 0.3)
        );
      }
      if (emitAcc >= 40) emitAcc = 0;
      app.shake(clamp(speedSm * 0.0035, 0, 0.018));
      app.flow(Math.min(0.12, Math.abs(dx) * 0.6));
      app.haptic(4);
    },
    pointerUp() {
      if (!cutting) return;
      cutting = false;
      tipY.target = TOP_Y + 0.22;
      const span = Math.abs(openSeg.x1 - openSeg.x0);
      if (span > BLOCK.w * 0.85) {
        squish.v += 2.2;
        burst(openSeg.x0, openSeg.z, 46, 1.2);
        app.voices.crunch({ intensity: 1, pan: lastPan });
        app.bloomPulse(0.06);
        app.haptic(18);
      } else if (span < 0.05) {
        burst(openSeg.x0, openSeg.z, 6, 0.4);
        app.voices.crunch({ intensity: 0.25, pan: lastPan });
      } else {
        burst(openSeg.x1, openSeg.z, 14, 0.7);
      }
      openSeg = null;
      app.voices.setHiss(0);
    },
    setQuality() {},
    resize() {},
    step(h) {
      tipX.step(h);
      tipZ.step(h);
      tipY.step(h);
      squish.step(h);
      for (let i = 0; i < grainMax; i++) {
        if (gLife[i] <= 0) continue;
        const k = i * 3;
        gLife[i] -= h;
        gVel[k + 1] -= GRAVITY * h;
        gPos[k] += gVel[k] * h;
        gPos[k + 1] += gVel[k + 1] * h;
        gPos[k + 2] += gVel[k + 2] * h;
        const floor = PAD_TOP + GRAIN_R;
        if (gPos[k + 1] < floor) {
          gPos[k + 1] = floor;
          gVel[k + 1] *= -0.22;
          gVel[k] *= 0.6;
          gVel[k + 2] *= 0.6;
          if (Math.abs(gVel[k + 1]) < 0.05) gVel[k + 1] = 0;
        }
      }
    },
    frame(dt) {
      if (!cutting) speedSm = expDamp(speedSm, 0, 8, dt);
      if (!cutting) app.voices.setHiss(0);
      syncSegments();
      wire.position.x = tipX.x;
      wire.position.y = tipY.x;
      wire.position.z = tipZ.x;
      block.scale.y = 1 - 0.018 * clamp(squish.x, -1, 1);
      block.scale.x = 1 + 0.006 * clamp(squish.x, -1, 1);

      for (let i = 0; i < grainMax; i++) {
        if (gLife[i] > 0) {
          dummy.position.set(gPos[i * 3], gPos[i * 3 + 1], gPos[i * 3 + 2]);
          dummy.scale.setScalar(1);
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
        }
        dummy.quaternion.copy(quatIdentity);
        dummy.updateMatrix();
        grains.setMatrixAt(i, dummy.matrix);
      }
      grains.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      app.voices.stopHiss();
      blockGeo.dispose();
      blockMat.dispose();
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      grainGeo.dispose();
      grainMat.dispose();
      grains.dispose();
      group.clear();
    },
  };
  return station;
}
