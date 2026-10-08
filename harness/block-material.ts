// Harness for src/gl/blocks/material.ts (architecture section 10a). It draws the 17 stanza blocks with
// the real stage, a RoomEnvironment through PMREM and the key light, at the desktop hero camera
// (direction-3d 10.4 to 10.6). Three states, three frames each: m 0 (paper), m 1 (ink), and m 1 with
// uSmear 1. The canvas snapshots go to window.__blockShots for the Playwright driver. The verdict goes
// to document.documentElement.dataset.harness.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { initTicker } from '../src/core/ticker';
import { createBlockMaterial, microSurfaceCanvas, type BlockMaterial } from '../src/gl/blocks/material';
import { createStage } from '../src/gl/stage';

type CompiledShader = Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0];

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
}

const root = document.documentElement;
const FRAMES = 3;
const COUNT = 17;
const KIREJI = 4;
const ROWS = [5, 7, 5];
const PITCH = 0.87;
const ROW_PITCH = 1.05;
const HERO_CAMERA = { x: -2.89, z: 21.15 }; // direction-3d 10.6, desktop hero keyframe
const MICRO_SIZE = 512;
const COLOR = {
  paper: 0xf1ece0,
  ink: 0x151512,
  anodized: 0x2b2a26,
  seal: 0xb5312a,
  steel: 0xbdb7a9,
  sealInk: 0xe7735f,
};

const report: Report = { passes: [], failures: [], diagnostics: [] };

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    report.passes.push(name);
    console.log(`PASS ${name}${suffix}`);
  } else {
    report.failures.push(`${name}${suffix}`);
    console.log(`FAIL ${name}${suffix}`);
  }
}

// Errors and warnings are recorded as well as shown, so the verdict can count them.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    report.diagnostics.push(`${level}: ${args.map((a) => String(a)).join(' ')}`);
    original(...args);
  };
}

/** Stanza positions (direction-3d 11.2): rows of 5, 7 and 5 at pitch 0.87, row pitch 1.05. */
function stanzaPositions(): Array<[number, number]> {
  const rowY = [ROW_PITCH, 0, -ROW_PITCH];
  const out: Array<[number, number]> = [];
  ROWS.forEach((n, row) => {
    for (let k = 0; k < n; k += 1) out.push([(k - (n - 1) / 2) * PITCH, rowY[row]]);
  });
  return out;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function compiledShader(block: BlockMaterial): CompiledShader {
  const shader = block.material.userData.shader as CompiledShader | undefined;
  if (shader === undefined) throw new Error('onBeforeCompile did not store the compiled shader');
  return shader;
}

function main(): void {
  initTicker();
  const element = document.getElementById('gl');
  if (!(element instanceof HTMLCanvasElement)) throw new Error('the #gl canvas is missing');
  const canvas: HTMLCanvasElement = element;
  const stage = createStage(canvas);
  const { renderer, scene, camera } = stage;
  check('createStage builds a WebGL2 renderer', renderer.getContext() instanceof WebGL2RenderingContext);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff4e2, 2.4);
  key.position.set(-6, 9, 12);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);

  const geometry = new RoundedBoxGeometry(0.7, 0.7, 0.46, 3, 0.035);
  const finish = new Float32Array(COUNT);
  finish[KIREJI] = 1;
  geometry.setAttribute('aFinish', new THREE.InstancedBufferAttribute(finish, 1));

  const block = createBlockMaterial();
  const mesh = new THREE.InstancedMesh(geometry, block.material, COUNT);
  const matrix = new THREE.Matrix4();
  stanzaPositions().forEach(([x, y], i) => {
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  const tint = new THREE.Color();
  function paint(ink: boolean): void {
    for (let i = 0; i < COUNT; i += 1) {
      const kireji = i === KIREJI;
      let hex: number;
      if (ink) hex = kireji ? COLOR.sealInk : COLOR.steel;
      else hex = kireji ? COLOR.seal : COLOR.anodized;
      tint.setHex(hex);
      mesh.setColorAt(i, tint);
    }
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }

  /** One look: paper or ink, with the key light, environment and clear colour the direction gives at that m (10.4, 10.5). */
  function look(ink: boolean, smear: number): void {
    const m = ink ? 1 : 0;
    block.setMix(m);
    block.setSmear(smear);
    paint(ink);
    key.intensity = 2.4 + (1.7 - 2.4) * m;
    scene.environmentIntensity = 0.55 + (0.3 - 0.55) * m;
    renderer.setClearColor(ink ? COLOR.ink : COLOR.paper, 1);
  }

  /** Renders FRAMES frames in one task and returns the canvas as a PNG data URL. */
  function frames(): string {
    for (let i = 0; i < FRAMES; i += 1) renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  }

  camera.position.set(HERO_CAMERA.x, 0, HERO_CAMERA.z);
  camera.lookAt(HERO_CAMERA.x, 0, 0);

  // State 1: m 0, paper.
  block.setQuality('high');
  look(false, 0);
  const shotM0 = frames();
  const programs = renderer.info.programs?.length ?? 0;
  check('the block program compiles (renderer.info.programs >= 1)', programs >= 1, `programs=${programs}`);
  const shader = compiledShader(block);
  check(
    'onBeforeCompile injects the kireji finish and the smear stretch',
    shader.vertexShader.includes('vFinish = aFinish;') &&
      shader.vertexShader.includes('transformed.y *= 1.0 + 0.35 * uSmear;') &&
      shader.fragmentShader.includes('roughnessFactor = mix( roughnessFactor, 0.36, vFinish );') &&
      shader.fragmentShader.includes('material.clearcoat = mix( material.clearcoat, 0.5, vFinish );'),
  );
  const mat = block.material;
  check(
    'm 0 values: metalness 0.35, roughness 0.42, clearcoat 0.25, clearcoat roughness 0.2, anisotropy 0.5 at rotation 0',
    near(mat.metalness, 0.35) &&
      near(mat.roughness, 0.42) &&
      near(mat.clearcoat, 0.25) &&
      near(mat.clearcoatRoughness, 0.2) &&
      near(mat.anisotropy, 0.5) &&
      near(mat.anisotropyRotation, 0),
  );

  // State 2: m 1, ink.
  look(true, 0);
  const shotM1 = frames();
  check(
    'm 1 values: metalness 0.85, roughness 0.28, clearcoat at the 1e-4 floor, clearcoat roughness 0.2, anisotropy 0.5',
    near(mat.metalness, 0.85) &&
      near(mat.roughness, 0.28) &&
      mat.clearcoat > 0 &&
      mat.clearcoat <= 1e-4 &&
      near(mat.clearcoatRoughness, 0.2) &&
      near(mat.anisotropy, 0.5),
  );

  // State 3: m 1 with uSmear 1.
  look(true, 1);
  const shotSmear = frames();
  check(
    'uSmear reaches the shader uniform (1 at full smear)',
    shader.uniforms.uSmear.value === 1,
    `uSmear=${String(shader.uniforms.uSmear.value)}`,
  );
  check('the smear frame differs from the m 1 frame', shotSmear !== shotM1);

  // Instance attribute: the kireji flag is on index 4 only.
  const finishAttr = geometry.getAttribute('aFinish');
  check(
    'aFinish is 1 on index 4 and 0 elsewhere',
    finishAttr.count === COUNT && finishAttr.getX(KIREJI) === 1 && finishAttr.getX(0) === 0 && finishAttr.getX(16) === 0,
  );

  // Micro-surface: size, texture settings, and the xorshift32 rows against an independent BigInt run.
  const micro = microSurfaceCanvas();
  check('micro-surface canvas is 512 by 512', micro.width === MICRO_SIZE && micro.height === MICRO_SIZE);
  const map = mat.roughnessMap;
  check(
    'roughnessMap and bumpMap are the micro-surface: data colour space, repeat wrapping, bump scale 0.6',
    map !== null &&
      mat.bumpMap === map &&
      map.colorSpace === THREE.NoColorSpace &&
      map.wrapS === THREE.RepeatWrapping &&
      map.wrapT === THREE.RepeatWrapping &&
      near(mat.bumpScale, 0.6),
  );
  check('texture anisotropy is 4 at high', map !== null && map.anisotropy === 4, `anisotropy=${String(map?.anisotropy)}`);
  const ctx = micro.getContext('2d');
  const data = ctx !== null ? ctx.getImageData(0, 0, MICRO_SIZE, MICRO_SIZE).data : new Uint8ClampedArray(0);
  let mismatched = 0;
  let state = 17n;
  const MASK = 0xffffffffn;
  for (let y = 0; y < MICRO_SIZE; y += 1) {
    state ^= (state << 13n) & MASK;
    state ^= state >> 17n;
    state ^= (state << 5n) & MASK;
    const expected = Math.round((0.85 + (0.15 * Number(state)) / 4294967296) * 255);
    const first = (y * MICRO_SIZE) * 4;
    const last = (y * MICRO_SIZE + (MICRO_SIZE - 1)) * 4;
    if (Math.abs(data[first] - expected) > 1 || Math.abs(data[last] - expected) > 1) mismatched += 1;
  }
  check(
    'micro-surface rows match xorshift32 (seed 17), computed independently with BigInt',
    data.length === MICRO_SIZE * MICRO_SIZE * 4 && mismatched === 0,
    `mismatched rows=${mismatched}`,
  );

  // Quality tiers: each one compiles and sets the values the direction gives.
  const diagnosticsBefore = report.diagnostics.length;
  block.setQuality('low');
  frames();
  check(
    'low: clearcoat and anisotropy off, texture anisotropy 1, program compiles',
    mat.clearcoat === 0 && mat.anisotropy === 0 && map !== null && map.anisotropy === 1,
  );
  block.setQuality('mid');
  frames();
  check(
    'mid: clearcoat and anisotropy on, texture anisotropy 2, program compiles',
    mat.clearcoat > 0 && near(mat.anisotropy, 0.5) && map !== null && map.anisotropy === 2,
  );
  check('low and mid compile without shader diagnostics', report.diagnostics.length === diagnosticsBefore);

  // A geometry without aFinish: WebGL supplies 0 for the attribute, so the block still draws.
  block.setQuality('high');
  const bare = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.7, 0.46, 3, 0.035), mat);
  scene.add(bare);
  renderer.render(scene, camera);
  check('a geometry without aFinish compiles and draws', renderer.info.render.calls >= 1 && report.diagnostics.length === diagnosticsBefore, `calls=${renderer.info.render.calls}`);
  scene.remove(bare);
  bare.geometry.dispose();

  // Leave the scene in the smear state for the page screenshot.
  look(true, 1);
  frames();

  check('no THREE shader errors or warnings were logged', report.diagnostics.length === 0, report.diagnostics.join(' | '));

  const win = window as Window & {
    __blockShots?: Record<string, string>;
    __blockReport?: Report;
    __blockDebug?: { scene: THREE.Scene; key: THREE.DirectionalLight; look: (ink: boolean, smear: number) => void };
  };
  win.__blockShots = { m0: shotM0, m1: shotM1, smear: shotSmear };
  win.__blockReport = report;
  // For the Playwright driver's lighting probes only. The verdict does not use it.
  win.__blockDebug = { scene, key, look };
}

try {
  main();
} catch (err) {
  const reason = err instanceof Error ? err.message : String(err);
  check('the harness ran to the end', false, reason);
}
root.dataset.harness = report.failures.length === 0 ? 'pass' : `fail:${report.failures.join('; ')}`;
