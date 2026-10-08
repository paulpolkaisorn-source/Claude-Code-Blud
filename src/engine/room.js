import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { heightField, normalMapFromHeight, roughnessMapFromHeight, colorMapFromHeight, softDotTexture } from '../utils/textures.js';
import { patchRipples } from './shaders.js';
import { rand } from "../utils/math.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Station anchor positions along the desk (world X). Camera dollies between them.
export const STATION_X = [-4.8, -1.6, 1.6, 4.8];

export const PAD_COLORS = [0xc9a27a, 0x6f8aa8, 0x4f7a64, 0x9b7fa8];

// Builds the shared, always-present world: walnut desk, felt pads, lights, environment and dust.
export function buildRoom({ renderer, scene, rippleUniform, texSize, dustMax, shadowMap, reduced }) {
  const group = new THREE.Group();
  scene.add(group);

  scene.background = new THREE.Color(0x0e0a09);
  scene.fog = new THREE.FogExp2(0x0e0a09, 0.028);

  // Image-based light from a generated room (no downloaded HDR).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();

  // Lights: warm key with soft shadows, cool rim, faint hemisphere fill.
  const hemi = new THREE.HemisphereLight(0x3a2c26, 0x0a0706, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffd7a6, 2.1);
  key.position.set(-5.5, 9.5, 5.5);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMap, shadowMap);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0x8fb0e0, 0.7);
  rim.position.set(6, 5, -6);
  scene.add(rim);

  // Walnut desk.
  const deskSize = texSize;
  const wood = heightField(deskSize, { scale: 3, stretchX: 0.5, stretchY: 12, octaves: 5, seed: 3, warp: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({
    map: colorMapFromHeight(wood, deskSize, [0.13, 0.075, 0.05], [0.34, 0.2, 0.12], 0.04),
    normalMap: normalMapFromHeight(wood, deskSize, 1.4),
    roughnessMap: roughnessMapFromHeight(wood, deskSize, 0.55, 0.35),
    roughness: 1,
    metalness: 0,
  });
  patchRipples(woodMat, rippleUniform, [1.0, 0.8, 0.55], 0.22);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), woodMat);
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  group.add(desk);

  // Felt pads, one per station. Fine fabric grain from a shared height field.
  const felt = heightField(256, { scale: 60, stretchX: 1, stretchY: 1, octaves: 3, seed: 9 });
  const feltNormal = normalMapFromHeight(felt, 256, 0.8);
  const pads = [];
  STATION_X.forEach((x, i) => {
    const geo = new RoundedBoxGeometry(3.4, 0.035, 2.7, 3, 0.015);
    const mat = new THREE.MeshStandardMaterial({
      color: PAD_COLORS[i],
      roughness: 0.96,
      normalMap: feltNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.018, 0);
    m.receiveShadow = true;
    m.castShadow = true;
    group.add(m);
    pads.push({ mesh: m, geo, mat });
  });

  // Back wall in shadow, so the room reads as dim without a visible edge.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), wallMat);
  wall.position.set(0, 6, -8);
  wall.receiveShadow = true;
  group.add(wall);

  // Dust motes drifting in the lamp light.
  const dust = buildDust(dustMax, reduced);
  group.add(dust.points);

  return {
    group,
    key,
    desk,
    woodMat,
    pads,
    dust,
    dispose() {
      woodMat.map?.dispose();
      woodMat.normalMap?.dispose();
      woodMat.roughnessMap?.dispose();
      woodMat.dispose();
      desk.geometry.dispose();
      pads.forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
      feltNormal.dispose();
      wallMat.dispose();
      wall.geometry.dispose();
      dust.dispose();
      scene.remove(group);
      scene.environment = null;
      envTex.dispose();
      scene.remove(hemi, key, key.target, rim);
    },
  };
}

function buildDust(max, reduced) {
  const count = max;
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    base[i * 3] = rand(-8, 8);
    base[i * 3 + 1] = rand(0.3, 4.2);
    base[i * 3 + 2] = rand(-4.5, 4);
    phase[i] = rand(0, Math.PI * 2);
  }
  const pos = new Float32Array(count * 3);
  pos.set(base);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', attr);
  const tex = softDotTexture(64);
  const mat = new THREE.PointsMaterial({
    size: 0.05,
    map: tex,
    color: 0xffe2bd,
    transparent: true,
    opacity: reduced ? 0.25 : 0.45,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let active = count;
  const update = (t) => {
    const amp = reduced ? 0.03 : 0.18;
    for (let i = 0; i < active; i++) {
      const i3 = i * 3;
      const ph = phase[i];
      pos[i3] = base[i3] + Math.sin(t * 0.07 + ph) * amp;
      pos[i3 + 1] = base[i3 + 1] + Math.sin(t * 0.11 + ph * 1.7) * amp * 0.6;
      pos[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.05 + ph * 0.6) * amp;
    }
    attr.needsUpdate = true;
  };
  return {
    points,
    update,
    setCount(n) {
      active = Math.min(n, count);
      geo.setDrawRange(0, active);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}
