// Harness for src/gl/lighting.ts (architecture section 10a). Open /harness/lighting.html on the dev server.
//   ?m=0 (default) or ?m=1: the page builds the real stage and lighting, puts a row of five rounded
//   blocks in front of the shadow catcher, applies the block mix the way the real page does (block
//   material and clear colour), and runs the checks at that mix. The page is left at that mix for the
//   screenshot.
//   ?dispose: the create and dispose check, with one block and no screenshot.
// dataset.harness is set to 'pass' or 'fail:<names>' once the checks have run. dataset.probes lists
// the screenshot pixels, and the driver decodes the saved PNG to compare them.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addTick, initTicker, PRIORITY } from '../src/core/ticker';
import { BLOCK, BLOCK_COUNT, FORMATIONS, formationFor, type FormationId, type Pose } from '../src/gl/blocks/formations';
import { createLighting, type Lighting } from '../src/gl/lighting';
import { createStage, type Stage } from '../src/gl/stage';

type Pixel = [number, number];

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const DISPOSE_MODE = params.has('dispose');
const requestedMix = Number(params.get('m') ?? '0');
const MIX = Number.isFinite(requestedMix) ? clamp01(requestedMix) : 0;

// Values from design/direction-3d.md (sections 10.3 and 10.4) and design/direction.md (section 3). The catcher
// (z -0.5), its opacity and the paper exposure follow design/drafts/director-decisions.md D22.3 and D22.4.
const PAPER = new THREE.Color(0xf1ece0);
const INK = new THREE.Color(0x151512);
const BLOCK_ANODIZED = new THREE.Color(0x2b2a26);
const BLOCK_STEEL = new THREE.Color(0xbdb7a9);
const CATCHER_Z = -0.5;
const CATCHER_SIZE = 30;
// A five-block row is 4.18 bu wide. This distance fits it to about 45 percent of a 1440 px width.
const CAMERA_Z = 14.89;

// Independent expectations for the values that follow m (the lighting module keeps its own copy).
const EXPECT_KEY: readonly [number, number] = [2.4, 1.7];
const EXPECT_OPACITY: readonly [number, number] = [0.12, 0.45];
const EXPECT_ENV: readonly [number, number] = [0.12, 0.3];
const EXPECT_FILL: readonly [number, number] = [1.6, 0.35];
const SHADOW_EXTENT = 14;
const SHADOW_RADIUS = 4;
/** Key light position and the unit direction its rays travel (from the light to the origin). */
const KEY_POS = new THREE.Vector3(-6, 9, 12);

// Console output is recorded, so a shader error or a warning fails the run.
const consoleIssues: string[] = [];
for (const level of ['warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    consoleIssues.push(args.map((a) => String(a)).join(' '));
    original(...args);
  };
}

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function near(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

/** The colour in sRGB, 0 to 255 per channel. */
function srgb255(c: THREE.Color): number[] {
  const rgb = { r: 0, g: 0, b: 0 };
  c.getRGB(rgb, THREE.SRGBColorSpace);
  return [rgb.r * 255, rgb.g * 255, rgb.b * 255];
}

/** Resolves after n frames of the page clock have run. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const off = addTick(() => {
      seen += 1;
      if (seen >= n) {
        off();
        resolve();
      }
    }, PRIORITY.glRender + 5);
  });
}

/** CSS pixel (counted from the top left) of a world point, with the stage camera. */
function screenPx(stage: Stage, world: THREE.Vector3): Pixel {
  stage.camera.updateMatrixWorld();
  const ndc = world.clone().project(stage.camera);
  return [Math.round(((ndc.x + 1) / 2) * stage.size.width), Math.round(((1 - ndc.y) / 2) * stage.size.height)];
}

function buildStage(): Stage | null {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) {
    check('harness page has the #gl canvas', false);
    return null;
  }
  try {
    const stage = createStage(canvas);
    check('createStage works in headless Chromium', true);
    return stage;
  } catch (err) {
    check('createStage works in headless Chromium', false, String(err));
    return null;
  }
}

/** The five rounded blocks of row A, in front of the catcher. One shared material, as the page uses. */
function addBlocks(stage: Stage, count: number): THREE.MeshPhysicalMaterial {
  const geometry = new RoundedBoxGeometry(0.7, 0.7, 0.46, 3, 0.035);
  const material = new THREE.MeshPhysicalMaterial({
    color: BLOCK_ANODIZED,
    metalness: 0.35,
    roughness: 0.42,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
  });
  for (let k = 0; k < count; k += 1) {
    const box = new THREE.Mesh(geometry, material);
    box.name = `block-${k}`;
    box.position.set((k - 2) * 0.87, 0, 0);
    box.castShadow = true;
    stage.scene.add(box);
  }
  return material;
}

/** The look the page gives the blocks and the clear colour at mix m (direction-3d 10.3, 10.10). */
function applyLook(stage: Stage, material: THREE.MeshPhysicalMaterial, m: number): void {
  material.color.lerpColors(BLOCK_ANODIZED, BLOCK_STEEL, m);
  material.metalness = lerp(0.35, 0.85, m);
  material.roughness = lerp(0.42, 0.28, m);
  material.clearcoat = lerp(0.25, 0, m);
  stage.renderer.setClearColor(new THREE.Color().lerpColors(PAPER, INK, m), 1);
}

async function sceneCheck(stage: Stage): Promise<void> {
  const { renderer, scene, camera } = stage;
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);
  const material = addBlocks(stage, 5);
  applyLook(stage, material, MIX);
  const lighting: Lighting = createLighting(stage);
  await frames(3);

  // Structure and renderer state.
  check('the lighting group is in the stage scene', scene.children.includes(lighting.group));
  check('the catcher is a child of the lighting group', lighting.catcher.parent === lighting.group);
  check(
    'renderer.shadowMap.type is PCFShadowMap',
    renderer.shadowMap.enabled && renderer.shadowMap.type === THREE.PCFShadowMap,
    `enabled=${renderer.shadowMap.enabled} type=${renderer.shadowMap.type}`,
  );
  check('scene.environment is a Texture', scene.environment instanceof THREE.Texture, `environment=${String(scene.environment)}`);

  const key = lighting.group.getObjectByName('key');
  const rim = lighting.group.getObjectByName('rim');
  const fill = lighting.group.getObjectByName('fill');
  const catcherMaterial = lighting.catcher.material;
  if (
    !(key instanceof THREE.DirectionalLight) ||
    !(rim instanceof THREE.SpotLight) ||
    !(fill instanceof THREE.HemisphereLight) ||
    !(catcherMaterial instanceof THREE.ShadowMaterial)
  ) {
    check('the group holds the key, rim and fill lights and a ShadowMaterial catcher', false);
    return;
  }

  // Key light (direction-3d 10.4).
  const cam = key.shadow.camera;
  check(
    'key: DirectionalLight #FFF4E2 at (-6, 9, 12), target at the origin, casts shadows',
    key.color.getHex(THREE.SRGBColorSpace) === 0xfff4e2 &&
      key.position.equals(KEY_POS) &&
      key.target.position.lengthSq() === 0 &&
      key.castShadow,
  );
  check(
    'key shadow: map 2048, camera -14..14 with near 1 and far 40, bias -0.0004, normalBias 0.02, PCF radius 4',
    key.shadow.mapSize.x === 2048 &&
      key.shadow.mapSize.y === 2048 &&
      cam.left === -SHADOW_EXTENT &&
      cam.right === SHADOW_EXTENT &&
      cam.top === SHADOW_EXTENT &&
      cam.bottom === -SHADOW_EXTENT &&
      cam.near === 1 &&
      cam.far === 40 &&
      key.shadow.bias === -0.0004 &&
      key.shadow.normalBias === 0.02 &&
      key.shadow.radius === SHADOW_RADIUS,
    `map=${key.shadow.mapSize.x} camera=${cam.left},${cam.right},${cam.top},${cam.bottom} near=${cam.near} far=${cam.far} bias=${key.shadow.bias} normalBias=${key.shadow.normalBias} radius=${key.shadow.radius}`,
  );

  // Rim spot (direction-3d 10.4): 36 cd, no shadow.
  check(
    'rim: SpotLight #F4EEDF 36 cd at (7, 5, -5), angle 0.45, penumbra 0.8, decay 2, no shadow',
    rim.color.getHex(THREE.SRGBColorSpace) === 0xf4eedf &&
      rim.intensity === 36 &&
      rim.position.equals(new THREE.Vector3(7, 5, -5)) &&
      near(rim.angle, 0.45) &&
      near(rim.penumbra, 0.8) &&
      rim.decay === 2 &&
      !rim.castShadow &&
      rim.target.position.lengthSq() === 0,
  );

  // Fill hemisphere (direction-3d 10.4, with the paper end of D22.3). Its intensity is lerped by m.
  check(
    'fill: HemisphereLight sky #F4EEDF and ground #151512',
    fill.color.getHex(THREE.SRGBColorSpace) === 0xf4eedf && fill.groundColor.getHex(THREE.SRGBColorSpace) === 0x151512,
  );

  // Shadow catcher (direction-3d 10.4 with D22.4: z -0.5, 30 by 30 bu).
  const catcherGeometry = lighting.catcher.geometry;
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(lighting.catcher.quaternion);
  check(
    'catcher: ShadowMaterial plane 30 x 30 at z -0.5, facing +z, depthWrite off, receiveShadow, after the background',
    catcherGeometry instanceof THREE.PlaneGeometry &&
      catcherGeometry.parameters.width === CATCHER_SIZE &&
      catcherGeometry.parameters.height === CATCHER_SIZE &&
      near(lighting.catcher.position.z, CATCHER_Z) &&
      near(lighting.catcher.position.x, 0) &&
      near(lighting.catcher.position.y, 0) &&
      near(normal.z, 1) &&
      catcherMaterial.depthWrite === false &&
      lighting.catcher.receiveShadow &&
      lighting.catcher.renderOrder > -1,
    `renderOrder=${lighting.catcher.renderOrder} normal=${normal.toArray().map((v) => v.toFixed(3)).join(',')}`,
  );

  // Mix mapping: each value lerps from its m = 0 value to its m = 1 value, with m clamped to [0, 1].
  const expectAt = (m: number): { k: number; o: number; e: number; f: number } => ({
    k: lerp(EXPECT_KEY[0], EXPECT_KEY[1], m),
    o: lerp(EXPECT_OPACITY[0], EXPECT_OPACITY[1], m),
    e: lerp(EXPECT_ENV[0], EXPECT_ENV[1], m),
    f: lerp(EXPECT_FILL[0], EXPECT_FILL[1], m),
  });
  const mixCases: [number, number][] = [
    [0, 0],
    [1, 1],
    [0.5, 0.5],
    [2, 1],
    [-1, 0],
  ];
  let mixOk = true;
  const mixDetail: string[] = [];
  for (const [input, clamped] of mixCases) {
    lighting.setMix(input);
    const want = expectAt(clamped);
    const got = { k: key.intensity, o: catcherMaterial.opacity, e: scene.environmentIntensity, f: fill.intensity };
    const ok = near(got.k, want.k) && near(got.o, want.o) && near(got.e, want.e) && near(got.f, want.f);
    mixOk = mixOk && ok;
    mixDetail.push(
      `m=${input}: key ${got.k.toFixed(3)} opacity ${got.o.toFixed(3)} env ${got.e.toFixed(3)} fill ${got.f.toFixed(3)}`,
    );
  }
  check(
    'setMix lerps key 2.4 to 1.7, catcher 0.12 to 0.45, environment 0.12 to 0.30, fill 1.6 to 0.35, clamped to [0, 1]',
    mixOk,
    mixDetail.join('; '),
  );
  let nanRejected = false;
  try {
    lighting.setMix(Number.NaN);
  } catch (err) {
    nanRejected = err instanceof RangeError;
  }
  check('setMix rejects NaN with a RangeError', nanRejected);
  lighting.setMix(MIX);
  const final = expectAt(MIX);
  check(
    `the page is left at m = ${MIX}`,
    near(key.intensity, final.k) &&
      near(catcherMaterial.opacity, final.o) &&
      near(scene.environmentIntensity, final.e) &&
      near(fill.intensity, final.f),
  );

  // Shadow map size: 2048, then 1024 with the old map disposed, then 2048 again.
  await frames(2);
  const mapA = key.shadow.map;
  check('the first frame builds a 2048 shadow map', mapA !== null && mapA.width === 2048, `width=${mapA?.width}`);
  let oldMapDisposed = false;
  mapA?.addEventListener('dispose', () => {
    oldMapDisposed = true;
  });
  lighting.setShadowMapSize(1024);
  check(
    'setShadowMapSize(1024) disposes the old map and sets mapSize 1024',
    oldMapDisposed && key.shadow.map === null && key.shadow.mapSize.x === 1024 && key.shadow.mapSize.y === 1024,
    `disposed=${oldMapDisposed} map=${String(key.shadow.map)} mapSize=${key.shadow.mapSize.x}`,
  );
  await frames(2);
  const mapB = key.shadow.map;
  check('the next frame builds a 1024 shadow map', mapB !== null && mapB.width === 1024 && mapB !== mapA, `width=${mapB?.width}`);
  lighting.setShadowMapSize(2048);
  await frames(2);
  check('setShadowMapSize(2048) builds a 2048 shadow map again', key.shadow.map?.width === 2048, `width=${key.shadow.map?.width}`);

  // Screenshot probes. The driver decodes the saved PNG outside this page, so the page makes no GL
  // readback. It compares three pixels: the viewport corner and a lit point of the catcher show the
  // clear colour, and a point where the key light's ray to the catcher crosses the centre block is
  // darkened by the catcher opacity.
  const clearRGB = srgb255(new THREE.Color().lerpColors(PAPER, INK, MIX));
  const opacity = lerp(EXPECT_OPACITY[0], EXPECT_OPACITY[1], MIX);
  const probes = [
    { name: 'corner', px: [3, stage.size.height - 4], want: clearRGB },
    { name: 'lit', px: screenPx(stage, new THREE.Vector3(-3.0, 2.5, CATCHER_Z)), want: clearRGB },
    {
      name: 'shadow',
      px: screenPx(stage, new THREE.Vector3(0.45, -0.68, CATCHER_Z)),
      want: clearRGB.map((v) => v * (1 - opacity)),
    },
  ];
  root.dataset.probes = JSON.stringify(probes);
  checkShadowCoverage(key);

  await frames(2);
  check('the page raised no console.warn or console.error', consoleIssues.length === 0, consoleIssues.join(' | ').slice(0, 400));
}

/**
 * D22.4 coverage. Every block of every formation, in landscape and in portrait, must sit inside the key's shadow camera
 * (so it casts a shadow at all), and each shadow it casts must land inside the catcher. A shadow lands on the same light
 * ray as its caster, so a caster inside the frustum gives a shadow inside the frustum. The ratios below are the largest
 * |ndc| (1 is the frustum edge) and the largest |landing| over the catcher half-size (1 is the catcher edge).
 */
function checkShadowCoverage(key: THREE.DirectionalLight): void {
  key.shadow.updateMatrices(key);
  const cam = key.shadow.camera;
  cam.updateMatrixWorld();
  const view = cam.matrixWorldInverse;
  const proj = cam.projectionMatrix;
  const dir = new THREE.Vector3().subVectors(key.target.position, KEY_POS).normalize();
  const sets: [string, readonly Pose[]][] = (Object.keys(FORMATIONS) as FormationId[]).map((id) => [id, FORMATIONS[id]]);
  sets.push(['race (portrait)', formationFor('race', true)], ['family (portrait)', formationFor('family', true)]);
  const half = CATCHER_SIZE / 2;
  const corner = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const parts: string[] = [];
  let worstNdc = 0;
  let worstLand = 0;
  let depthOk = true;
  for (const [name, poses] of sets) {
    let ndcMax = 0;
    let landMax = 0;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const pose: Pose = poses[i];
      euler.set(pose.r[0], pose.r[1], pose.r[2]);
      quat.setFromEuler(euler);
      pos.set(pose.p[0], pose.p[1], pose.p[2]);
      scl.set(pose.s, pose.s, pose.s);
      matrix.compose(pos, quat, scl);
      for (let c = 0; c < 8; c += 1) {
        corner
          .set(
            (c & 1) !== 0 ? BLOCK.width / 2 : -BLOCK.width / 2,
            (c & 2) !== 0 ? BLOCK.height / 2 : -BLOCK.height / 2,
            (c & 4) !== 0 ? BLOCK.depth / 2 : -BLOCK.depth / 2,
          )
          .applyMatrix4(matrix);
        ndc.copy(corner).applyMatrix4(view).applyMatrix4(proj);
        ndcMax = Math.max(ndcMax, Math.abs(ndc.x), Math.abs(ndc.y));
        if (!(Math.abs(ndc.z) <= 1)) depthOk = false;
        if (corner.z > CATCHER_Z) {
          const t = (CATCHER_Z - corner.z) / dir.z;
          const lx = corner.x + t * dir.x;
          const ly = corner.y + t * dir.y;
          landMax = Math.max(landMax, Math.abs(lx) / half, Math.abs(ly) / half);
        }
      }
    }
    worstNdc = Math.max(worstNdc, ndcMax);
    worstLand = Math.max(worstLand, landMax);
    parts.push(`${name} ndc ${ndcMax.toFixed(2)} land ${landMax.toFixed(2)}`);
  }
  const ok = worstNdc <= 1 && worstLand <= 1 && depthOk;
  check(
    `shadow camera ±${SHADOW_EXTENT} holds every block of every formation, and the catcher holds every shadow`,
    ok,
    `worst ndc ${worstNdc.toFixed(3)}, worst landing ${worstLand.toFixed(3)}, depth ${depthOk ? 'in range' : 'OUT'}; ${parts.join('; ')}`,
  );
}

async function disposeCheck(stage: Stage): Promise<void> {
  const { renderer, scene } = stage;
  addBlocks(stage, 1);
  await frames(3);
  const before = { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  const lighting = createLighting(stage);
  await frames(3);
  const built = { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  const key = lighting.group.getObjectByName('key');
  const keyLight = key instanceof THREE.DirectionalLight ? key : null;
  check(
    'a built lighting holds a shadow map and an environment Texture',
    keyLight !== null && keyLight.shadow.map !== null && scene.environment instanceof THREE.Texture,
  );
  check(
    'building the lighting allocates textures and geometries',
    built.textures > before.textures && built.geometries > before.geometries,
    `before=${before.textures}/${before.geometries} built=${built.textures}/${built.geometries}`,
  );
  lighting.dispose();
  await frames(3);
  const after = { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  check('dispose removes the lighting group from the scene', !scene.children.includes(lighting.group));
  check(
    'dispose clears scene.environment and resets environmentIntensity to 1',
    scene.environment === null && scene.environmentIntensity === 1,
  );
  check('dispose frees the key shadow map', keyLight !== null && keyLight.shadow.map === null);
  check(
    'dispose returns the texture count to its baseline',
    after.textures === before.textures,
    `before=${before.textures} after=${after.textures}`,
  );
  check(
    'dispose returns the geometry count to its baseline',
    after.geometries === before.geometries,
    `before=${before.geometries} after=${after.geometries}`,
  );
  let afterOk = true;
  try {
    lighting.setMix(0.5);
    lighting.setShadowMapSize(1024);
    lighting.dispose();
  } catch {
    afterOk = false;
  }
  check('calls after dispose are harmless', afterOk);
  await frames(2);
  check('the page raised no console.warn or console.error', consoleIssues.length === 0, consoleIssues.join(' | ').slice(0, 400));
}

async function main(): Promise<void> {
  initTicker();
  const stage = buildStage();
  if (stage === null) return;
  if (!(stage.renderer.getContext() instanceof WebGL2RenderingContext)) {
    check('the renderer has a WebGL2 context', false);
    return;
  }
  if (DISPOSE_MODE) {
    await disposeCheck(stage);
  } else {
    await sceneCheck(stage);
  }
}

main()
  .catch((err: unknown) => {
    failures.push('exception');
    console.log('FAIL exception', err);
  })
  .finally(() => {
    console.log(`RESULT ${passed} passed, ${failures.length} failed`);
    root.dataset.harness = failures.length === 0 ? 'pass' : `fail:${failures.join(',')}`;
  });
