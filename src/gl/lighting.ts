// Lights, the shadow catcher and the procedural environment (direction-3d sections 10.4 and 10.5).
// createLighting adds one group to stage.scene: the key light (the only shadow caster), the rim spot,
// the fill hemisphere and the shadow catcher plane. The environment is RoomEnvironment, baked once
// through PMREM. setMix moves the three values that follow the block mix m. This module starts no
// loop: the stage draws on the shared ticker.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Stage } from './stage';

export interface Lighting {
  /** Key, rim and fill lights with their targets, and the shadow catcher. createLighting adds it to stage.scene. */
  readonly group: THREE.Group;
  /** The ShadowMaterial plane at z -0.9 that receives the key light's shadow. A child of group. */
  readonly catcher: THREE.Mesh;
  /** Sets the block mix m, clamped to [0, 1]: 0 on paper, 1 on ink. Throws a RangeError when m is not finite. */
  setMix(m: number): void;
  /** Sets the key shadow map to 1024 or 2048 pixels a side. The old map is disposed; the new one is built on the next frame. */
  setShadowMapSize(size: 1024 | 2048): void;
  /** Removes the group from the scene, clears the environment and frees what this module allocated. */
  dispose(): void;
}

// Values from design/direction-3d.md, sections 10.4 and 10.5.
const KEY_COLOR = 0xfff4e2;
const KEY_POSITION: readonly [number, number, number] = [-6, 9, 12];
const KEY_INTENSITY: readonly [number, number] = [2.4, 1.7]; // m = 0, m = 1
const SHADOW_MAP_SIZE = 2048;
const SHADOW_EXTENT = 8; // the shadow camera spans -8 to 8 on each side
const SHADOW_NEAR = 1;
const SHADOW_FAR = 40;
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.02;

const RIM_COLOR = 0xf4eedf;
const RIM_POSITION: readonly [number, number, number] = [7, 5, -5];
const RIM_INTENSITY = 36; // candela
const RIM_ANGLE = 0.45;
const RIM_PENUMBRA = 0.8;
const RIM_DECAY = 2;

const FILL_SKY = 0xf4eedf;
const FILL_GROUND = 0x151512;
const FILL_INTENSITY = 0.35;

const CATCHER_WIDTH = 24;
const CATCHER_HEIGHT = 16;
const CATCHER_Z = -0.9;
const CATCHER_OPACITY: readonly [number, number] = [0.14, 0.5]; // m = 0, m = 1
// The background quad is drawn first with renderOrder -1; the catcher is drawn after it.
const CATCHER_RENDER_ORDER = 1;

const ENV_SIGMA = 0.04;
const ENV_INTENSITY: readonly [number, number] = [0.55, 0.3]; // m = 0, m = 1

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clampMix(m: number): number {
  if (!Number.isFinite(m)) throw new RangeError(`setMix: ${String(m)} is not a finite number`);
  return Math.min(1, Math.max(0, m));
}

/**
 * Builds the lights, the shadow catcher and the environment on stage. Call it once, after
 * createStage. It switches the renderer to PCF shadows and assigns scene.environment.
 */
export function createLighting(stage: Stage): Lighting {
  const { renderer, scene } = stage;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const group = new THREE.Group();
  group.name = 'lighting';

  const key = new THREE.DirectionalLight(KEY_COLOR, KEY_INTENSITY[0]);
  key.name = 'key';
  key.position.set(...KEY_POSITION);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  const shadowCamera = key.shadow.camera;
  shadowCamera.left = -SHADOW_EXTENT;
  shadowCamera.right = SHADOW_EXTENT;
  shadowCamera.top = SHADOW_EXTENT;
  shadowCamera.bottom = -SHADOW_EXTENT;
  shadowCamera.near = SHADOW_NEAR;
  shadowCamera.far = SHADOW_FAR;
  shadowCamera.updateProjectionMatrix();
  key.shadow.bias = SHADOW_BIAS;
  key.shadow.normalBias = SHADOW_NORMAL_BIAS;

  const rim = new THREE.SpotLight(RIM_COLOR, RIM_INTENSITY, 0, RIM_ANGLE, RIM_PENUMBRA, RIM_DECAY);
  rim.name = 'rim';
  rim.position.set(...RIM_POSITION);
  rim.target.position.set(0, 0, 0);
  rim.castShadow = false;

  const fill = new THREE.HemisphereLight(FILL_SKY, FILL_GROUND, FILL_INTENSITY);
  fill.name = 'fill';

  const catcherMaterial = new THREE.ShadowMaterial({ opacity: CATCHER_OPACITY[0] });
  catcherMaterial.depthWrite = false;
  const catcherGeometry = new THREE.PlaneGeometry(CATCHER_WIDTH, CATCHER_HEIGHT);
  const catcher = new THREE.Mesh(catcherGeometry, catcherMaterial);
  catcher.name = 'shadow-catcher';
  catcher.position.set(0, 0, CATCHER_Z);
  catcher.receiveShadow = true;
  catcher.renderOrder = CATCHER_RENDER_ORDER;

  group.add(key, key.target, rim, rim.target, fill, catcher);
  scene.add(group);

  // One PMREM bake of the room. The generator and the room are freed here; the baked target stays
  // until dispose().
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(room, ENV_SIGMA);
  const envTexture = envTarget.texture;
  scene.environment = envTexture;
  pmrem.dispose();
  room.dispose();

  let disposed = false;

  function setMix(m: number): void {
    const t = clampMix(m);
    if (disposed) return;
    key.intensity = lerp(KEY_INTENSITY[0], KEY_INTENSITY[1], t);
    catcherMaterial.opacity = lerp(CATCHER_OPACITY[0], CATCHER_OPACITY[1], t);
    scene.environmentIntensity = lerp(ENV_INTENSITY[0], ENV_INTENSITY[1], t);
  }

  function setShadowMapSize(size: 1024 | 2048): void {
    const requested: number = size;
    if (requested !== 1024 && requested !== 2048) {
      throw new RangeError(`setShadowMapSize: ${String(size)} is not 1024 or 2048`);
    }
    if (disposed || key.shadow.mapSize.x === requested) return;
    key.shadow.map?.dispose();
    key.shadow.map = null;
    key.shadow.mapSize.set(requested, requested);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    scene.remove(group);
    if (scene.environment === envTexture) scene.environment = null;
    scene.environmentIntensity = 1;
    key.shadow.map?.dispose();
    key.shadow.map = null;
    envTarget.dispose();
    catcherGeometry.dispose();
    catcherMaterial.dispose();
  }

  const lighting: Lighting = { group, catcher, setMix, setShadowMapSize, dispose };
  setMix(0);
  return lighting;
}
