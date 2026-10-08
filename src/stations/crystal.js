import * as THREE from 'three';
import { STATION_X } from '../engine/room.js';
import { rand, expDamp, clamp } from '../utils/math.js';
import { Spring1D } from '../utils/spring.js';

export const crystalMeta = {
  id: 'crystal',
  name: 'Glass Crystals',
  hint: 'Tap a crystal to ring it. Each one sits on a note of a pentatonic scale.',
  cursor: { nx: 0.5, ny: 0.5 },
};

const PALETTE = [0xbfe9ff, 0xd9c6ff, 0xffe2c4, 0xb9ffe9, 0xffd0e0, 0xc9e0ff, 0xf5f0c8];

// Layout of the cluster, in station-local X and Z. Height and radius vary a little per shard.
const LAYOUT = [
  { x: 0.0, z: 0.0, h: 1.25, r: 0.2 },
  { x: -0.42, z: 0.18, h: 0.85, r: 0.17 },
  { x: 0.4, z: 0.2, h: 0.95, r: 0.18 },
  { x: -0.2, z: -0.42, h: 1.0, r: 0.19 },
  { x: 0.24, z: -0.38, h: 0.7, r: 0.15 },
  { x: -0.62, z: -0.2, h: 0.55, r: 0.13 },
  { x: 0.6, z: -0.12, h: 0.62, r: 0.14 },
];

// Crystal station: a cluster of faceted glass shards. Tapping a shard rings its tuned chime,
// kicks its spring, lights its core and sends a ripple across the desk.
export function createCrystal(app) {
  const x0 = STATION_X[1];
  const group = new THREE.Group();
  group.position.set(x0, 0, 0);
  const transmissive = app.quality.settings.transmission;

  const shards = [];
  const meshes = [];
  const geometries = [];
  const materials = [];
  LAYOUT.forEach((L, i) => {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(L.r, 0),
      new THREE.Vector2(L.r, L.h * 0.72),
      new THREE.Vector2(L.r * 0.45, L.h * 0.9),
      new THREE.Vector2(0, L.h),
    ];
    const geo = new THREE.LatheGeometry(pts, 6);
    geo.computeVertexNormals();
    geometries.push(geo);
    const color = new THREE.Color(PALETTE[i % PALETTE.length]);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.04,
      ior: 1.45,
      thickness: 0.6,
      iridescence: 0.7,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      attenuationColor: color,
      attenuationDistance: 0.45,
      emissive: color,
      emissiveIntensity: 0.05,
      flatShading: true,
    });
    applyTransmission(mat, transmissive);
    materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(L.x, 0.035, L.z);
    mesh.rotation.y = rand(0, Math.PI * 2);
    mesh.rotation.z = rand(-0.05, 0.05);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.index = i;
    group.add(mesh);
    meshes.push(mesh);
    shards.push({
      mesh,
      mat,
      wob: new Spring1D({ stiffness: 220, damping: 9 }),
      glow: 0,
      worldX: x0 + L.x,
      worldZ: L.z,
      baseY: 0.035,
    });
  });

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  function tap(idx, p, degreeOffset = 0) {
    const s = shards[idx];
    s.wob.v -= 2.4;
    s.glow = 1;
    const vel = clamp(0.6 + rand(-0.1, 0.1), 0.2, 1);
    app.voices.chime({ degree: idx + degreeOffset, vel, pan: p.pan });
    app.ripple(s.worldX, s.worldZ, 1);
    app.bloomPulse(0.1);
    app.flow(0.35);
    app.haptic(10);
  }

  const station = {
    group,
    cursorStart: crystalMeta.cursor,
    enter() {},
    exit() {},
    pointerDown(p) {
      app.camera.updateMatrixWorld();
      raycaster.setFromCamera(p.ndc, app.camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        const idx = hits[0].object.userData.index;
        // Occasionally bend the tap up an octave so repeated taps never feel mechanical.
        tap(idx, p, Math.random() < 0.2 ? 5 : 0);
        return;
      }
      // Missing a shard still ripples the desk, with a quiet tick.
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        app.ripple(hit.x, hit.z, 0.6);
        app.voices.chime({ degree: Math.floor(rand(0, 7)), vel: 0.22, pan: p.pan });
        app.flow(0.1);
      }
    },
    pointerMove() {},
    pointerUp() {},
    setQuality(t) {
      for (const m of materials) applyTransmission(m, t.transmission);
    },
    resize() {},
    step() {},
    frame(dt, time) {
      shards.forEach((s, i) => {
        s.wob.step(dt);
        const k = 1 + s.wob.x * 0.14;
        s.mesh.scale.set(1 + (k - 1) * 0.4, k, 1 + (k - 1) * 0.4);
        s.mesh.rotation.z = Math.sin(time * 0.35 + i * 1.7) * 0.012;
        s.glow = expDamp(s.glow, 0, 3.2, dt);
        s.mat.emissiveIntensity = 0.05 + s.glow * 0.8;
      });
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      group.clear();
    },
  };
  return station;
}

function applyTransmission(mat, on) {
  mat.transmission = on ? 0.92 : 0;
  mat.transparent = !on;
  mat.opacity = on ? 1 : 0.86;
  mat.needsUpdate = true;
}
