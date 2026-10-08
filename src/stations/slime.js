import * as THREE from 'three';
import { STATION_X } from '../engine/room.js';
import { patchSlime, patchSlimeSSS, makeSlimeUniforms } from '../engine/shaders.js';
import { contactShadowTexture } from '../utils/textures.js';
import { clamp, rand, expDamp } from '../utils/math.js';
import { Spring1D } from '../utils/spring.js';

export const slimeMeta = {
  id: 'slime',
  name: 'Slime Stretch',
  hint: 'Poke it to make it wobble. Press and drag on it to stretch it, and listen to the squelch.',
  cursor: { nx: 0.5, ny: 0.5 },
};

const RADIUS = 0.6;
const PAD_TOP = 0.035;
const POKE_SLOTS = 4;

// Slime: a vertex-shader soft body (wobble, pokes, grab-stretch) driven by spring physics.
// Stretch speed sets the squelch pitch and the level of the continuous drag tone.
export function createSlime(app) {
  const x0 = STATION_X[2];
  const group = new THREE.Group();
  group.position.set(x0, PAD_TOP, 0);
  const transmissive = app.quality.settings.transmission;

  const uniforms = makeSlimeUniforms();
  const geo = new THREE.SphereGeometry(RADIUS, 96, 64);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x58d6a6,
    roughness: 0.22,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    ior: 1.36,
    thickness: 0.9,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xbef7dd),
    sheenRoughness: 0.4,
    attenuationColor: new THREE.Color(0x2fbf8c),
    attenuationDistance: 0.6,
    transmission: transmissive ? 0.35 : 0,
    transparent: !transmissive,
    opacity: transmissive ? 1 : 0.94,
  });
  patchSlimeSSS(patchSlime(mat, uniforms));
  const blob = new THREE.Mesh(geo, mat);
  blob.position.y = RADIUS * 0.95;
  blob.castShadow = true;
  blob.receiveShadow = true;
  group.add(blob);

  // Soft contact shadow under the blob so it sits on the felt.
  const shadowTex = contactShadowTexture(128);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false });
  const shadowGeo = new THREE.PlaneGeometry(RADIUS * 2.9, RADIUS * 2.9);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.002;
  group.add(shadow);

  // Physics: the grabbed surface point is a damped spring following the pointer.
  const gx = new Spring1D({ stiffness: 150, damping: 9 });
  const gy = new Spring1D({ stiffness: 150, damping: 9 });
  const gz = new Spring1D({ stiffness: 150, damping: 9 });
  const grabAmt = new Spring1D({ stiffness: 70, damping: 11 });
  const squash = new Spring1D({ stiffness: 170, damping: 10 });
  const pokes = Array.from({ length: POKE_SLOTS }, () => new Spring1D({ stiffness: 90, damping: 5 }));
  let pokeNext = 0;
  let grabbed = false;
  let grabZ = 0;
  let plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let squelchCool = 0;
  let speed = 0;
  let drag = 0;

  const raycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  // Shader space is the blob's own space: its centre sits above the group origin.
  const blobCentre = new THREE.Vector3(0, RADIUS * 0.95, 0);

  // Hit on the blob, in group space. Returns null when the ray misses.
  function hitBlob(p) {
    app.camera.updateMatrixWorld();
    raycaster.setFromCamera(p.ndc, app.camera);
    const hits = raycaster.intersectObject(blob, false);
    if (!hits.length) return null;
    return group.worldToLocal(hits[0].point.clone()).sub(blobCentre);
  }

  function setGrabTarget(local) {
    gx.target = local.x;
    gy.target = local.y;
    gz.target = local.z;
  }

  const station = {
    group,
    cursorStart: slimeMeta.cursor,
    enter() {
      app.voices.startSlime();
    },
    exit() {
      app.voices.stopSlime();
    },
    pointerDown(p) {
      const local = hitBlob(p);
      if (!local) return;
      const surf = local.clone().normalize().multiplyScalar(RADIUS);
      // Poke: the nearest slot springs in at the surface point.
      const slot = pokeNext;
      pokeNext = (pokeNext + 1) % POKE_SLOTS;
      uniforms.uPokePos.value[slot].copy(surf);
      pokes[slot].x = 1;
      pokes[slot].v = 0;
      pokes[slot].target = 0;
      // Grab: the surface point under the finger, which then follows the pointer.
      grabbed = true;
      grabZ = group.position.z + local.z;
      plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -grabZ);
      gx.x = local.x;
      gy.x = local.y;
      gz.x = local.z;
      gx.v = gy.v = gz.v = 0;
      setGrabTarget(local);
      squash.v -= 3.4;
      drag = 0;
      app.voices.squelch({ pitch: 150 + rand(-12, 12), intensity: 0.7, pan: p.pan });
      app.flow(0.25);
      app.haptic(10);
      app.shake(0.006);
    },
    pointerMove(p, isDown) {
      if (!grabbed || !isDown) return;
      app.camera.updateMatrixWorld();
      raycaster.setFromCamera(p.ndc, app.camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const local = group.worldToLocal(hit.clone()).sub(blobCentre);
      // Stretch limit keeps the blob from tearing off the desk.
      tmp.copy(local);
      if (tmp.length() > RADIUS * 1.9) tmp.setLength(RADIUS * 1.9);
      setGrabTarget(tmp);
      app.flow(Math.min(0.08, speed * 0.02));
    },
    pointerUp() {
      if (!grabbed) return;
      grabbed = false;
      grabAmt.target = 0;
      squash.v += 1.6;
      app.voices.setSlime(0, 200);
      app.haptic(6);
    },
    setQuality(t) {
      mat.transmission = t.transmission ? 0.35 : 0;
      mat.transparent = !t.transmission;
      mat.opacity = t.transmission ? 1 : 0.94;
      mat.needsUpdate = true;
    },
    resize() {},
    step(h) {
      grabAmt.target = grabbed ? 1 : 0;
      grabAmt.step(h);
      gx.step(h);
      gy.step(h);
      gz.step(h);
      squash.step(h);
      for (const s of pokes) s.step(h);
      speed = Math.hypot(gx.v, gy.v, gz.v) * grabAmt.x;
    },
    frame(dt, time) {
      uniforms.uTime.value = time;
      uniforms.uBreath.value = 1 + 0.3 * Math.sin(time * 1.1) * (1 - Math.min(grabAmt.x, 1) * 0.6);
      uniforms.uGrab.value.set(gx.x, gy.x, gz.x);
      uniforms.uGrabAmt.value = clamp(grabAmt.x, 0, 1);
      for (let i = 0; i < POKE_SLOTS; i++) {
        uniforms.uPokeAmt.value[i] = clamp(pokes[i].x, 0, 1.4);
      }
      const sq = clamp(squash.x, -0.6, 1.2);
      blob.scale.set(1 + 0.1 * sq, 1 - 0.16 * sq, 1 + 0.1 * sq);
      blob.position.y = RADIUS * 0.95 - 0.04 * sq;
      shadow.scale.setScalar(1 + 0.12 * sq);

      // Squelch and drag tone follow the speed of the stretch.
      squelchCool -= dt;
      if (grabbed) {
        drag = expDamp(drag, clamp(speed / 2.4, 0, 1), 8, dt);
        app.voices.setSlime(drag, 180 + 520 * drag);
        if (speed > 0.55 && squelchCool <= 0) {
          squelchCool = rand(0.16, 0.26);
          app.voices.squelch({
            pitch: 120 + 230 * clamp(speed / 2.2, 0, 1) * rand(0.9, 1.12),
            intensity: clamp(speed / 2.2, 0.2, 1),
            pan: 0,
          });
          app.shake(clamp(speed * 0.0025, 0, 0.01));
        }
      } else {
        drag = expDamp(drag, 0, 6, dt);
        app.voices.setSlime(drag, 200);
      }
    },
    dispose() {
      app.voices.stopSlime();
      geo.dispose();
      mat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      group.clear();
    },
  };
  return station;
}
