// camera.js: camera rig. Exponential follow clamped to the arena, distance auto-fit to aspect, trauma shake.
// Fixed pitch 55 deg below horizontal, looking toward -z; the camera sits on the +z side of its look-at point.
// Pure math on a THREE.PerspectiveCamera (fov 40); no allocations per call.
import * as THREE from 'three';
import { GRID } from '../contracts.js';

export const CAM_PITCH = THREE.MathUtils.degToRad(55);
const SIN_P = Math.sin(CAM_PITCH);
const COS_P = Math.cos(CAM_PITCH);
const TAN_HALF_V = Math.tan(THREE.MathUtils.degToRad(40 / 2));
const FOLLOW_RATE = 7;      // 1/s, exponential damping constant
const MAX_SHAKE = 0.5;      // tiles of offset at full trauma (offset scales with trauma squared)

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function createCameraRig(camera) {
  let cols = GRID.cols, rows = GRID.rows;
  let tx = cols / 2, tz = rows / 2;   // look-at point on the ground (y = 0), damped toward the follow target
  let dist = 12;                      // camera-to-look-at distance, fitted to aspect
  let trauma = 0, decay = 1, time = 0;

  function apply() {
    const a = trauma * trauma * MAX_SHAKE;
    const ox = a * Math.sin(time * 41.3 + 0.7);
    const oy = a * 0.5 * Math.sin(time * 29.9 + 2.3);
    const oz = a * Math.sin(time * 36.7 + 4.1);
    // Shake translates camera and look-at together, so the view slides without rotating.
    camera.position.set(tx + ox, SIN_P * dist + oy, tz + COS_P * dist + oz);
    camera.lookAt(tx + ox, oy, tz + oz);
    camera.updateMatrixWorld();
  }

  return {
    get dist() { return dist; },
    setBounds(c, r) {
      cols = c;
      rows = r;
      tx = clamp(tx, 0, cols);
      tz = clamp(tz, 0, rows);
      apply();
    },
    // ~13 tiles across the look-at point in landscape, ~11 in portrait, blended between aspect 0.75 and 1.25.
    setAspect(aspect) {
      const t = clamp((aspect - 0.75) / 0.5, 0, 1);
      dist = (11 + 2 * t) / (2 * TAN_HALF_V * aspect);
      apply();
      return dist;
    },
    snap(x, z) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      tx = clamp(x, 0, cols);
      tz = clamp(z, 0, rows);
      apply();
    },
    follow(x, z, dt) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const k = 1 - Math.exp(-FOLLOW_RATE * (dt > 0 ? dt : 1 / 60));
      tx += (clamp(x, 0, cols) - tx) * k;
      tz += (clamp(z, 0, rows) - tz) * k;
      apply();
    },
    // Trauma adds up (capped at 1) and decays linearly to zero over `duration` seconds.
    shake(intensity, duration) {
      if (!(intensity > 0)) return;
      trauma = Math.min(1, trauma + clamp(intensity, 0, 1));
      decay = 1 / (duration > 0 ? Math.max(0.05, duration) : 0.3);
    },
    step(dt) {
      time += dt;
      if (trauma > 0) trauma = Math.max(0, trauma - decay * dt);
      apply();
    },
    apply,
  };
}
