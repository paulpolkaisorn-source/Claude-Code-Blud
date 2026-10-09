// CONTRACT STUB. The water worker replaces this file with the real
// implementation; the class name, constructor and every public member below
// keep exactly these signatures.
import * as THREE from 'three';
import { POOL } from './pool-config.js';

export class PoolWater {
  /**
   * Adds its own meshes to `scene`. `sun` is the scene's key light; its
   * direction (position - target) can change at runtime (time of day).
   * @param {{renderer: THREE.WebGLRenderer, scene: THREE.Scene,
   *          camera: THREE.PerspectiveCamera, sun: THREE.DirectionalLight}} o
   */
  constructor({ renderer, scene, camera, sun }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;
    this.mode = 'waves';
    // Called instead of the internal sim in 'particles' mode, for pointer
    // ripples, rain and body/water interaction: (x, z, radius, strength) => void
    this.externalDisturb = null;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(POOL.length, POOL.width).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2a8fbf, transparent: true, opacity: 0.6 })
    );
    this.mesh.position.y = POOL.waterLevel;
    scene.add(this.mesh);
  }

  /** 'waves' | 'spray' | 'particles' */
  setMode(mode) { this.mode = mode; }

  /** Advance simulation and bodies. dt in seconds (caller clamps to <= 1/30). */
  update(dt, time) {}

  /** Call once per frame right before the final renderer.render(scene, camera).
   *  Renders any reflection/refraction targets and restores renderer state. */
  beforeRender(renderer, scene, camera) {}

  /** Push the surface at (x, z). strength ~ peak displacement in meters
   *  (0.02 gentle ripple .. 0.3 big splash); positive pushes water down. */
  disturb(x, z, radius, strength) {}

  /** Drop a floating body into the pool. type: one of BODY_TYPES. Returns id. */
  spawnBody(type) { return -1; }
  clearBodies() {}

  /** Pointer interaction with bodies. grab returns true if a body was hit. */
  grab(raycaster) { return false; }
  dragTo(point) {}      // THREE.Vector3 target for the grabbed body
  release() {}

  setRain(amount) {}    // 0..1
  setWind(amount) {}    // 0..1
  setQuality(level) {}  // 'low' | 'medium' | 'high'

  /** Patch a MeshStandardMaterial (via onBeforeCompile) so fragments under the
   *  water get caustics and depth absorption. Call before its first render. */
  applyUnderwaterLighting(material) { return material; }

  /** Float32Array(HF.nx * HF.nz) in pool-config layout, or null to resume the
   *  internal sim. Called every frame in 'particles' mode; re-upload each call. */
  setExternalHeights(heights) {}

  /** Surface height (y) at world (x, z). */
  heightAt(x, z) { return POOL.waterLevel; }

  /** Flatten the water and stop all motion. Bodies stay. */
  reset() {}
}
