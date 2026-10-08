// Lights, the shadow catcher and the procedural environment (direction-3d sections 10.4 and 10.5, with the
// integration changes of design/drafts/director-decisions.md D22.3 and D22.4).
// createLighting adds one group to stage.scene: the key light (the only shadow caster), the rim spot,
// the fill hemisphere and the shadow catcher plane. The environment is RoomEnvironment, baked once
// through PMREM. setMix moves the four values that follow the block mix m (key, environment, fill and the
// catcher opacity). This module starts no loop: the stage draws on the shared ticker.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Stage } from './stage';

export interface Lighting {
  /** Key, rim and fill lights with their targets, and the shadow catcher. createLighting adds it to stage.scene. */
  readonly group: THREE.Group;
  /** The ShadowMaterial plane at z -0.5 that receives the key light's shadow. A child of group. */
  readonly catcher: THREE.Mesh;
  /** Sets the block mix m, clamped to [0, 1]: 0 on paper, 1 on ink. Throws a RangeError when m is not finite. */
  setMix(m: number): void;
  /** Sets the key shadow map to 1024 or 2048 pixels a side. The old map is disposed; the new one is built on the next frame. */
  setShadowMapSize(size: 1024 | 2048): void;
  /** Removes the group from the scene, clears the environment and frees what this module allocated. */
  dispose(): void;
}

// Exposure, paper end (D22.3). Tuned on the integrated page at hero s = 0, 1440 x 900, m = 0: 5 x 5 means of
// the composed pixels at the true front-face centres, read once the preloader handoff has finished. The targets
// are the anodised #34332F within 8 per channel (blocks 01 and 09) and the kireji #A9372E within 10 (block 05).
//   Before (environment 0.55, fill 0.35, key 2.4), at the projectRects centres: #62615D, #DE5049, #504F4B.
//   Final (environment 0.12, fill 1.6 at m = 0, key 2.4): #3A3934, #A1302A, #32302B.
//   Worst channel error: block 01 6.3 (limit 8), block 05 7.6 (limit 10), block 09 3.5 (limit 8).
// Why these values (measured with the other lights held):
//   - With the environment at 0 the anodised blocks read about #211F19 and blocks 01 and 09 are the same. The
//     environment supplies most of the anodised brightness and causes the spread between blocks 01 and 09, so it
//     falls from 0.55 to 0.12 to pull the anodised blocks down.
//   - With the environment at 0 the kireji still reads about #7A2018. The fill moves the kireji about 8 per unit
//     and the anodised blocks 1.5 to 4 per unit, so the fill is raised to 1.6 to bring the kireji back to its target.
//   - Environment and key alone did not hold both targets. At environment 0.12 and key 2.4 the kireji is short
//     (block 05 red 152 against 169). Raising the key to about 2.85 would bring the kireji in, but by the measured
//     slopes it puts block 01 about 8 off, on the limit.
//   - The key is unchanged at 2.4. Measured at fill 1.6 and environment 0.12, key 2.2 to 2.6 moves the kireji by 3
//     and block 01 by 1.5 per channel.
//   - The ink ends are the direction-3d values and are unchanged: key 1.7, environment 0.30, fill 0.35. Fill and
//     environment lerp by m, so m = 1 gives exactly those values.
// The paper ground is unlit (background.ts, toneMapped false), so none of these values changes #F1ECE0.
// Shadow (D22.4): the catcher sits at z -0.5 with opacity 0.12 (m = 0) and 0.45 (m = 1), and the key uses PCF
// shadows with radius 4.

// Values from design/direction-3d.md, sections 10.4 and 10.5, with the exposure of the comment above.
const KEY_COLOR = 0xfff4e2;
const KEY_POSITION: readonly [number, number, number] = [-6, 9, 12];
const KEY_INTENSITY: readonly [number, number] = [2.4, 1.7]; // m = 0, m = 1
const SHADOW_MAP_SIZE = 2048;
// The shadow camera spans -14 to 14 on each side (direction-3d 10.4). At 8 the family formation (light-space x 12.4)
// and the portrait family (light-space y -11.5) were outside the map, so their shadows were cut.
const SHADOW_EXTENT = 14;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 40;
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.02;
// PCF blur in map texels (D22.4): a soft contact shadow, not an offset drop shadow.
const SHADOW_RADIUS = 4;

const RIM_COLOR = 0xf4eedf;
const RIM_POSITION: readonly [number, number, number] = [7, 5, -5];
const RIM_INTENSITY = 36; // candela
const RIM_ANGLE = 0.45;
const RIM_PENUMBRA = 0.8;
const RIM_DECAY = 2;

const FILL_SKY = 0xf4eedf;
const FILL_GROUND = 0x151512;
const FILL_INTENSITY: readonly [number, number] = [1.6, 0.35]; // m = 0, m = 1

// The catcher is 30 by 30 bu (direction-3d 10.4 had 24 by 16). The family's shadows land about 14 bu out, at x 14
// on the desktop and at y -14 in portrait, and a plane edge cuts a shadow as hard as a frustum edge does.
const CATCHER_SIZE = 30;
const CATCHER_Z = -0.5;
const CATCHER_OPACITY: readonly [number, number] = [0.12, 0.45]; // m = 0, m = 1
// The background quad is drawn first with renderOrder -1; the catcher is drawn after it.
const CATCHER_RENDER_ORDER = 1;

const ENV_SIGMA = 0.04;
const ENV_INTENSITY: readonly [number, number] = [0.12, 0.3]; // m = 0, m = 1

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
  key.shadow.radius = SHADOW_RADIUS;

  const rim = new THREE.SpotLight(RIM_COLOR, RIM_INTENSITY, 0, RIM_ANGLE, RIM_PENUMBRA, RIM_DECAY);
  rim.name = 'rim';
  rim.position.set(...RIM_POSITION);
  rim.target.position.set(0, 0, 0);
  rim.castShadow = false;

  const fill = new THREE.HemisphereLight(FILL_SKY, FILL_GROUND, FILL_INTENSITY[0]);
  fill.name = 'fill';

  const catcherMaterial = new THREE.ShadowMaterial({ opacity: CATCHER_OPACITY[0] });
  catcherMaterial.depthWrite = false;
  const catcherGeometry = new THREE.PlaneGeometry(CATCHER_SIZE, CATCHER_SIZE);
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
    fill.intensity = lerp(FILL_INTENSITY[0], FILL_INTENSITY[1], t);
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
