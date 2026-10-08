// Harness for the family section's 3D layer (src/sections/family/gl.ts; architecture section 10a). The world is
// the page's own (createWorld from src/gl/boot.ts: stage, lighting, background, post, rig, block material). The
// family handle is driven the way the choreography will drive it: a tick at PRIORITY.scroll calls
// update(p, tick, ctx) with p from window.__family.set, and the previous section is the code SectionGL literal
// (formation recede, key hero). The checks below run first, timed where the hover tweens and the dash need real
// time. The verdict goes to document.documentElement.dataset.harness. Playwright then drives the screenshot states
// through window.__family. The pointer offset that the code section leaves on the blocks (D23.7) is written before the
// family each frame while window.__family.pointer(x) has set it; current(on) gives the family the choreography's
// setActive, so the screenshots can reproduce the code-to-family handoff.
import * as THREE from 'three';
import { familyGL } from '../src/sections/family/gl';
import { createWorld } from '../src/gl/boot';
import { env } from '../src/core/env';
import { PRIORITY, addTick, initTicker, type Tick } from '../src/core/ticker';
import { cameraKey } from '../src/gl/rig';
import { initChoreo } from '../src/choreo/timeline';
import { BLOCK_COUNT, FAMILY_STATION_X, PORTRAIT_TURN, formationFor } from '../src/gl/blocks/formations';
import type { FormationId } from '../src/core/types';
import type { CameraKey, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { ef } from '../src/core/ease';
import { stationCenters } from '../src/core/projection';

interface Report {
  passes: string[];
  failures: string[];
  diagnostics: string[];
}

interface FamilyControls {
  set(s: number): void;
  hover(station: number | null, toggle?: boolean): void;
  /** The code section's pointer x offset, written each frame before the family runs (null for none). */
  pointer(x: number | null): void;
  /** The family's current state, set the way the choreography sets it: the code section's zeroing first when on. */
  current(on: boolean): void;
}

interface FamilyWindow extends Window {
  __family?: FamilyControls;
  __familyReport?: Report;
}

// SwiftShader notices that are environment noise, not defects: the GPU stall on ReadPixels, and the missing
// KHR_parallel_shader_compile extension that WebGLRenderer.compileAsync reports.
const ENVIRONMENT_NOTICES = ['GPU stall due to ReadPixels', 'KHR_parallel_shader_compile extension not supported'];
const PERIOD = 0.24;
const LIFT = 0.15;
/**
 * The pointer x offset the code section leaves at 1300 px of 1440 (0.2 bu x 0.806, pointer.sx of that position), and
 * two other values for the switch checks (D23.7).
 */
const CODE_X = 0.2 * (1300 / 1440 * 2 - 1);
const CODE_X_B = 0.1;
const CODE_X_C = -0.08;
/** Progress at which the entry completes (gl.ts REST_AT, direction-act2 family Sequence). */
const REST_P = 0.5;
/** Stations 0 to 2 carry a phantom outline; station 3 is the Haiku stanza. */
const SIBLINGS = 3;
const CAMERA_TOL = 1e-3;
const root = document.documentElement;
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

// Errors and warnings are recorded as well as shown, so the verdict counts them. The GPU stall notice is
// SwiftShader noise and is not counted.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    const text = args.map((a) => String(a)).join(' ');
    if (!ENVIRONMENT_NOTICES.some((n) => text.includes(n))) report.diagnostics.push(`${level}: ${text}`);
    original(...args);
  };
}
window.addEventListener('error', (e: ErrorEvent) => {
  report.diagnostics.push(`uncaught: ${e.message}`);
});

function clamp01(v: number): number {
  return Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Resolves after n page-clock ticks, once the frame for each has been drawn (after PRIORITY.glRender). */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const remove = addTick(() => {
      seen += 1;
      if (seen >= n) {
        remove();
        resolve();
      }
    }, PRIORITY.glRender + 2);
  });
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas#gl is missing');
  initTicker();
  const boot = createWorld(canvas);
  const world = boot.world;
  // The page choreography (src/choreo/timeline.ts) is live inside boot and would drive its own handles. This harness
  // drives the family handle itself, so it replaces that choreography with an empty section list, then disposes it.
  initChoreo(world, []).dispose();
  const { stage, blocks, lighting, background, post } = world;
  const camera = stage.camera;
  const scene = stage.scene;

  // The code section's exit, as a SectionGL literal (code has no gl.ts yet): recede formation, hero key.
  const CODE: SectionGL = {
    id: 'code',
    formation: 'recede',
    key: 'hero',
    ink: 1,
    dof: { focus: 21.15, bokeh: 2 },
    breath: { amplitude: 0.012, phase: 'rows' },
  };
  const drive = { s: 0, on: false };
  const size = (): { width: number; height: number } => ({ width: stage.size.width, height: stage.size.height });
  const ctxNow = (): SectionGLContext => {
    const s = size();
    return { prev: CODE, portrait: s.width < s.height, reducedMotion: env.reducedMotion, size: s, bleed: { p1: 1, p2: 0 } };
  };

  const setup = familyGL.setup;
  if (setup === undefined) throw new Error('familyGL has no setup');
  const handle: SectionGLHandle = setup(world);
  // The stand-in for the 2D stage. The page relation of the 'centre' progress is R = 1 - 2 s, where R is the stage top in
  // viewport heights (the stage sits half a viewport below a 2 vh section top).
  const anchorEl = document.querySelector<HTMLElement>('[data-anchor="family-stations"]');
  if (anchorEl === null) throw new Error('harness: the anchor stand-in is missing');
  const placeAnchor = (): void => {
    anchorEl.style.top = `${(1 - 2 * drive.s) * window.innerHeight}px`;
  };
  // The code section's pointer x offset (D23.7). While it is set, it is written before the family runs each frame, as the
  // choreography orders the current section before an entering one (D22.1). Reduced motion gets none (D23.9).
  let codeX: number | null = null;
  addTick((tick: Tick) => {
    if (!drive.on) return;
    placeAnchor();
    if (codeX !== null && !env.reducedMotion) blocks.setGroupOffset(codeX, 0, 0);
    handle.update(drive.s, tick, ctxNow());
  }, PRIORITY.scroll);

  // The ink state the choreography sets for an ink section.
  blocks.setMix(1);
  lighting.setMix(1);
  post.setMix(1);
  background.setTheme('ink');
  post.setDof(null);

  drive.on = true;
  handle.setActive(true, ctxNow());
  await boot.compile();

  const portrait = stage.size.width < stage.size.height;
  const rm = env.reducedMotion;
  const tol = rm ? 1e-3 : 0.0125;
  const scratch = new THREE.Matrix4();
  const aAxis = portrait ? 0 : 1;

  function blockPos(i: number): [number, number, number] {
    blocks.mesh.getMatrixAt(i, scratch);
    const e = scratch.elements;
    return [e[12], e[13], e[14]];
  }

  function formationError(id: FormationId): number {
    const target = formationFor(id, portrait);
    let worst = 0;
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const got = blockPos(i);
      const want = target[i].p;
      for (let c = 0; c < 3; c += 1) worst = Math.max(worst, Math.abs(got[c] - want[c]));
    }
    return worst;
  }

  function expectedKey(name: 'hero' | 'family'): CameraKey {
    return cameraKey(name, size());
  }

  function groupsNamed(name: string): number {
    return scene.children.filter((o) => o.name === name).length;
  }

  const line = scene.getObjectByName('family-phantoms');
  const group = scene.getObjectByName('family-phantom-group');
  check('one phantom group is in the scene (no other choreography builds handles)', groupsNamed('family-phantom-group') === 1, `groups=${groupsNamed('family-phantom-group')}`);
  const phantoms = line instanceof THREE.LineSegments ? line : null;
  const distAttr = phantoms?.geometry.getAttribute('lineDistance');
  const distance = distAttr instanceof THREE.BufferAttribute ? (distAttr.array as Float32Array) : null;
  const positions = phantoms?.geometry.getAttribute('position');
  const material = phantoms?.material;

  check('boot collects the family SectionGL object', boot.sections.includes(familyGL));
  check('one group in the scene holds the phantom outlines', group !== undefined && phantoms !== null);
  if (phantoms === null || group === undefined || distance === null || positions === undefined) {
    check('the phantom outlines exist to be checked', false);
  } else {
    // Snapshot before any run: the offset is zero until a hover starts one.
    const base = Float32Array.from(distance);
    const verts = 72;

    check('the phantoms are one LineSegments with 216 vertices (36 segments per outline)', positions.count === 216, `count=${positions.count}`);
    check('the lineDistance attribute matches the vertex count', distance.length === 216, `length=${distance.length}`);
    check(
      'the material is a LineDashedMaterial, dash 0.17 and gap 0.07, transparent for the fade, no depth write',
      material instanceof THREE.LineDashedMaterial &&
        Math.abs(material.dashSize - 0.17) < 1e-9 &&
        Math.abs(material.gapSize - 0.07) < 1e-9 &&
        material.transparent === true &&
        material.depthWrite === false,
    );
    check(
      'the phantom colour is #75705F',
      material instanceof THREE.LineDashedMaterial && material.color.getHex() === 0x75705f,
      material instanceof THREE.LineDashedMaterial ? `hex=${material.color.getHexString()}` : 'no dashed material',
    );

    // Outline 0 (Slower, x -10.5) spans x -13.46 to -7.54; outline 2 (Fast, x +3.5) spans 0.54 to 6.46.
    const bounds = (first: number): number[] => {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let v = first; v < first + verts; v += 1) {
        for (let c = 0; c < 3; c += 1) {
          const value = positions.getComponent(v, c);
          b[c] = Math.min(b[c], value);
          b[c + 3] = Math.max(b[c + 3], value);
        }
      }
      return b;
    };
    const b0 = bounds(0);
    const b2 = bounds(2 * verts);
    const nearly = (a: number, b: number): boolean => Math.abs(a - b) < 1e-4;
    check(
      'outline 0 spans x -13.46 to -7.54, y +-1.40, z +-0.23',
      nearly(b0[0], -13.46) && nearly(b0[3], -7.54) && nearly(b0[1], -1.4) && nearly(b0[4], 1.4) && nearly(b0[2], -0.23) && nearly(b0[5], 0.23),
      `bounds=${b0.map((v) => v.toFixed(4)).join(',')}`,
    );
    check(
      'outline 2 spans x 0.54 to 6.46',
      nearly(b2[0], 0.54) && nearly(b2[3], 6.46),
      `bounds=${b2.map((v) => v.toFixed(4)).join(',')}`,
    );

    // The front loop is one chain: each segment starts where the previous one ended, and the loop is ~17.377 bu.
    let chained = true;
    for (let k = 1; k < 16; k += 1) {
      if (distance[2 * k] !== distance[2 * k - 1]) chained = false;
    }
    check('the front loop lineDistance runs continuously along its 16 segments', chained);
    check(
      'the front loop length is the outline perimeter (17.377 bu)',
      Math.abs(distance[31] - 17.377) < 0.01,
      `length=${distance[31].toFixed(4)}`,
    );

    // Fade and carry (D23.7). Opacity is e x 1 and the x offset is the read x x (1 - e), with e from sym(p / 0.5).
    // Under reduced motion e is 1 at every progress and no pointer offset is written.
    const wantOpacity = (s: number): number => (rm ? 1 : ef.sym(clamp01(s / REST_P)));
    const wantX = (s: number): number => (rm ? 0 : CODE_X * (1 - ef.sym(clamp01(s / REST_P))));

    // Entry start: p 0 is the recede formation and the hero key, and the phantom group stays hidden. The code section's
    // pointer offset is set first, so the entry start reads it (D23.7).
    codeX = CODE_X;
    drive.s = 0;
    await frames(4);
    // Under reduced motion every entry is complete at once (C14), so p 0 already holds the family formation and key.
    const startId: FormationId = rm ? 'family' : 'recede';
    const startError = formationError(startId);
    check(
      rm ? 'reduced motion: p 0 already holds the family formation' : 'p 0 holds the recede formation',
      startError <= tol,
      `maxError=${startError.toFixed(5)}`,
    );
    const startCam = expectedKey(rm ? 'family' : 'hero');
    const cam0 = camera.position;
    check(
      rm ? 'reduced motion: p 0 already holds the family camera key' : 'p 0 holds the hero camera key',
      Math.abs(cam0.x - startCam.position[0]) < CAMERA_TOL &&
        Math.abs(cam0.y - startCam.position[1]) < CAMERA_TOL &&
        Math.abs(cam0.z - startCam.position[2]) < CAMERA_TOL,
      `camera=${cam0.x.toFixed(3)},${cam0.y.toFixed(3)},${cam0.z.toFixed(3)}`,
    );
    check(
      rm ? 'reduced motion shows the phantoms at p 0 (static, section current)' : 'the phantoms are hidden at p 0',
      group.visible === rm,
      `visible=${group.visible}`,
    );
    check(
      rm ? 'reduced motion: the phantoms are opaque at p 0' : 'the phantoms have opacity 0 at the entry start (e 0)',
      Math.abs(material.opacity - wantOpacity(0)) < 1e-9,
      `opacity=${material.opacity}`,
    );
    check(
      rm ? 'reduced motion: no pointer offset at p 0' : 'the entry start reads the code pointer offset (x = read x)',
      Math.abs(blocks.groupOffset[0] - wantX(0)) < 1e-9 &&
        Math.abs(blocks.group.position.x - wantX(0)) < 1e-9 &&
        Math.abs(group.position.x - wantX(0)) < 1e-9,
      `target=${blocks.groupOffset[0].toFixed(5)} blocks=${blocks.group.position.x.toFixed(5)} phantoms=${group.position.x.toFixed(5)} want=${wantX(0).toFixed(5)}`,
    );

    // Mid-entry: the kireji leads, so its share of the way is larger than block 0's (its stagger position is 0).
    drive.s = 0.25;
    await frames(4);
    const recede = formationFor('recede', portrait);
    const family = formationFor('family', portrait);
    const share = (i: number): number => {
      const got = blockPos(i);
      const from = recede[i].p;
      const to = family[i].p;
      const span = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      const moved = Math.hypot(got[0] - from[0], got[1] - from[1], got[2] - from[2]);
      return span === 0 ? 1 : moved / span;
    };
    const kireji = share(4);
    const outer = share(0);
    if (!rm) {
      check('mid-entry: the kireji (block 4) leads block 0', kireji > outer, `kireji=${kireji.toFixed(3)} block0=${outer.toFixed(3)}`);
    } else {
      check('reduced motion: mid-entry is already at rest', formationError('family') <= 1e-3);
    }
    check(
      'mid-entry: the group is visible',
      group.visible === true,
      `visible=${group.visible}`,
    );
    check(
      'mid-entry: the phantom opacity is e (0.5 at p 0.25)',
      Math.abs(material.opacity - wantOpacity(0.25)) < 1e-6 && (rm || Math.abs(material.opacity - 0.5) < 1e-6),
      `opacity=${material.opacity.toFixed(5)} want=${wantOpacity(0.25).toFixed(5)}`,
    );
    check(
      'mid-entry: the blocks and the phantoms carry x = read x x (1 - e)',
      Math.abs(blocks.groupOffset[0] - wantX(0.25)) < 1e-9 &&
        Math.abs(blocks.group.position.x - wantX(0.25)) < 1e-9 &&
        Math.abs(group.position.x - wantX(0.25)) < 1e-9,
      `target=${blocks.groupOffset[0].toFixed(5)} blocks=${blocks.group.position.x.toFixed(5)} phantoms=${group.position.x.toFixed(5)} want=${wantX(0.25).toFixed(5)}`,
    );

    // Rest: p 0.5 holds the family formation and the family camera key (phone x at +0.28 W(z)).
    drive.s = 0.5;
    await frames(6);
    const restError = formationError('family');
    check('p 0.5 holds the family formation', restError <= tol, `maxError=${restError.toFixed(5)}`);
    const famCam = expectedKey('family');
    const cam = camera.position;
    // Decision D19.2 (act C6, A4), checked against the formula rather than the rig: x 0.28 of the visible width on a phone.
    const specX = portrait ? 0.28 * 2 * cam.z * Math.tan((11 * Math.PI) / 180) * (stage.size.width / stage.size.height) : 0;
    check(
      'p 0.5: camera x is 0 on desktop and 0.28 of the visible width on a phone (D19.2)',
      Math.abs(cam.x - specX) < CAMERA_TOL,
      `x=${cam.x.toFixed(4)} want=${specX.toFixed(4)}`,
    );
    check(
      'p 0.5 holds the family camera key',
      Math.abs(cam.x - famCam.position[0]) < CAMERA_TOL &&
        Math.abs(cam.y - famCam.position[1]) < CAMERA_TOL &&
        Math.abs(cam.z - famCam.position[2]) < CAMERA_TOL,
      `camera=${cam.x.toFixed(3)},${cam.y.toFixed(3)},${cam.z.toFixed(3)} want=${famCam.position.map((v) => v.toFixed(3)).join(',')}`,
    );
    check(
      'the phantom group is visible at rest',
      group.visible === true && Math.abs(group.rotation.z - (portrait ? PORTRAIT_TURN : 0)) < 1e-9,
      `rotZ=${group.rotation.z.toFixed(4)}`,
    );

    // DOM anchor (D20.1, D22.12). The offset is -dy / pxPerBu x e, with dy the stage top as layout reports it (layout
    // rounds it to 1/64 px, so the check reads it back rather than using (1 - 2 s) H), pxPerBu from the camera the rig
    // applied, and e the entry completion (1 at every progress under reduced motion).
    const anchorOffset = (s: number): number => {
      const top = anchorEl.getBoundingClientRect().top;
      const e = rm ? 1 : ef.sym(clamp01(s / 0.5));
      const pxPerBu = window.innerHeight / (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360));
      return (-top * e) / pxPerBu;
    };
    for (const [s, label] of [
      [0, 'p 0'],
      [0.25, 'p 0.25'],
      [0.4, 'p 0.4'],
      [0.5, 'p 0.5'],
      [0.6, 'p 0.6'],
    ] as const) {
      drive.s = s;
      await frames(4);
      const want = anchorOffset(s);
      check(
        `anchor at ${label}: the phantom group sits at -dy/pxPerBu x e`,
        Math.abs(group.position.y - want) < 1e-4,
        `got=${group.position.y.toFixed(5)} want=${want.toFixed(5)}`,
      );
      check(
        `anchor at ${label}: blocks.groupOffset holds the same y and the carried x`,
        Math.abs(blocks.groupOffset[1] - want) < 1e-4 &&
          Math.abs(blocks.groupOffset[0] - wantX(s)) < 1e-9 &&
          blocks.groupOffset[2] === 0,
        `got=${blocks.groupOffset[0].toFixed(5)},${blocks.groupOffset[1].toFixed(5)} want=${wantX(s).toFixed(5)},${want.toFixed(5)}`,
      );
      check(
        `anchor at ${label}: the phantoms carry the same x and their opacity is e`,
        Math.abs(group.position.x - wantX(s)) < 1e-9 && Math.abs(material.opacity - wantOpacity(s)) < 1e-6,
        `x=${group.position.x.toFixed(5)} opacity=${material.opacity.toFixed(5)} want=${wantX(s).toFixed(5)},${wantOpacity(s).toFixed(5)}`,
      );
      if (!rm) {
        check(
          `anchor at ${label}: the blocks group moves to the same y and x`,
          Math.abs(blocks.group.position.y - want) < 1e-4 && Math.abs(blocks.group.position.x - wantX(s)) < 1e-9,
          `got=${blocks.group.position.x.toFixed(5)},${blocks.group.position.y.toFixed(5)} want=${wantX(s).toFixed(5)},${want.toFixed(5)}`,
        );
      }
    }

    // Station alignment past the entry (e = 1): each sibling outline centre and the Haiku stanza centre sit on the
    // station centres of the 2D layer, which are the label anchors (projection.ts stationCenters), shifted by the
    // stage top. Under reduced motion the blocks are held at 0 by blocks.ts, so only the outlines are checked there.
    const size2 = size();
    const pts = stationCenters(size2);
    const toScreen = (v: THREE.Vector3): { x: number; y: number } => {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * size2.width, y: (0.5 - p.y * 0.5) * size2.height };
    };
    for (const s of [0.5, 0.6] as const) {
      drive.s = s;
      await frames(6);
      const top = (1 - 2 * s) * size2.height;
      camera.updateMatrixWorld(true);
      group.updateMatrixWorld(true);
      for (let i = 0; i < SIBLINGS; i += 1) {
        const got = toScreen(new THREE.Vector3(FAMILY_STATION_X[i], 0, 0).applyMatrix4(group.matrixWorld));
        const dx = got.x - pts[i].x;
        const dy = got.y - (top + pts[i].y);
        check(
          `station ${i} outline centre sits on its label anchor at s ${s}`,
          Math.hypot(dx, dy) < 0.5,
          `dx=${dx.toFixed(3)} dy=${dy.toFixed(3)} px`,
        );
      }
      if (!rm) {
        const rects = new Float32Array(BLOCK_COUNT * 4);
        blocks.projectRects(camera, size2, rects);
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let i = 0; i < BLOCK_COUNT; i += 1) {
          x0 = Math.min(x0, rects[4 * i]);
          y0 = Math.min(y0, rects[4 * i + 1]);
          x1 = Math.max(x1, rects[4 * i + 2]);
          y1 = Math.max(y1, rects[4 * i + 3]);
        }
        const dx = (x0 + x1) / 2 - pts[3].x;
        const dy = (y0 + y1) / 2 - (top + pts[3].y);
        check(
          `station 3 stanza centre sits on its label anchor at s ${s}`,
          Math.hypot(dx, dy) < 1,
          `dx=${dx.toFixed(3)} dy=${dy.toFixed(3)} px`,
        );
      }
    }
    drive.s = 0.5;
    await frames(4);

    // Portrait: far 120 while the family is current; desktop keeps 80.
    const farNow = camera.far;
    check(
      portrait ? 'phone: the far plane is 120 while the family is current' : 'desktop: the far plane stays 80',
      farNow === (portrait ? 120 : 80),
      `far=${farNow}`,
    );

    // Breath (not reduced motion): block 0 moves on y once the hold has passed; reduced motion holds still.
    const samples: number[] = [];
    const remove = addTick(() => {
      // The breath moves world y in every layout (the blocks API), so the sample is y even on a phone.
      samples.push(blockPos(0)[1]);
    }, PRIORITY.glRender + 2);
    await frames(14);
    remove();
    const lo = Math.min(...samples);
    const hi = Math.max(...samples);
    if (rm) {
      check('reduced motion: no breath, block 0 holds still', hi - lo < 1e-6, `range=${(hi - lo).toExponential(2)}`);
    } else {
      check('the rows breathe once at rest (block 0 moves)', hi - lo > 0.008, `range=${(hi - lo).toFixed(4)} n=${samples.length}`);
    }

    // Haiku lift (fine pointer, and tap with toggle): the stanza moves 0.15 bu up its own axis, then back.
    const rest0 = blockPos(0)[aAxis];
    document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station: 3, toggle: false } }));
    await frames(6);
    const lifted = blockPos(0)[aAxis];
    if (rm) {
      check('reduced motion: station 3 does not lift', Math.abs(lifted - rest0) < 1e-6, `delta=${(lifted - rest0).toFixed(5)}`);
    } else {
      check(
        'station 3 lifts the stanza 0.15 bu along its up axis',
        Math.abs(lifted - rest0 - LIFT) < 0.03,
        `delta=${(lifted - rest0).toFixed(4)}`,
      );
    }
    document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station: null } }));
    await frames(6);
    const back = blockPos(0)[aAxis];
    check(
      'a null event returns the lift to rest',
      Math.abs(back - rest0) < 0.03,
      `delta=${(back - rest0).toFixed(4)}`,
    );

    // Dash run (fine pointer): station 0 runs outline 0 only, and stopping holds the offset.
    document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station: 0 } }));
    await frames(8);
    const running = Float32Array.from(distance);
    const offsetOf = (first: number): number => running[first] - base[first];
    if (rm) {
      check('reduced motion: station 0 runs no dash', running.every((v, i) => Math.abs(v - base[i]) < 1e-7));
    } else {
      const off0 = offsetOf(0);
      let uniform = true;
      for (let v = 0; v < verts; v += 1) {
        if (Math.abs(offsetOf(v) - off0) > 1e-5) uniform = false;
      }
      check('station 0 runs outline 0 (its vertices move together)', off0 > 1e-3 && uniform, `offset=${off0.toFixed(4)}`);
      check('the run offset stays within one dash period', off0 >= 0 && off0 < PERIOD, `offset=${off0.toFixed(4)}`);
      let others = true;
      for (let v = verts; v < 3 * verts; v += 1) {
        if (Math.abs(running[v] - base[v]) > 1e-7) others = false;
      }
      check('station 0 leaves outlines 1 and 2 still', others);
    }
    document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station: null } }));
    await frames(2);
    const held = Float32Array.from(distance);
    await frames(3);
    const held2 = Float32Array.from(distance);
    let same = true;
    for (let v = 0; v < held.length; v += 1) {
      if (Math.abs(held[v] - held2[v]) > 1e-7) same = false;
    }
    check('a null event stops the run and the offset holds', same);

    // The carry through the switches (D23.7). An entry that starts while the code section is current reads the code
    // offset on its first frame. A switch to the family as current keeps the value, although the code section's
    // setActive has zeroed the offset just before the family's setActive. A switch back to the code section makes the
    // next entry frame read the offset again. Reduced motion has no pointer offset, so it is skipped there.
    if (!rm) {
      const carried = (read: number, s: number): number => read * (1 - ef.sym(clamp01(s / REST_P)));
      handle.setActive(false, ctxNow());
      codeX = CODE_X_B;
      drive.s = 0;
      await frames(3);
      check(
        'an entry that starts while the code section is current reads its offset (p 0)',
        Math.abs(blocks.groupOffset[0] - CODE_X_B) < 1e-9,
        `target=${blocks.groupOffset[0].toFixed(5)} want=${CODE_X_B}`,
      );
      drive.s = 0.25;
      await frames(3);
      check(
        'the entry holds the value it read: x = read x (1 - e) at p 0.25 while the family is not current',
        Math.abs(blocks.groupOffset[0] - carried(CODE_X_B, 0.25)) < 1e-9,
        `target=${blocks.groupOffset[0].toFixed(5)} want=${carried(CODE_X_B, 0.25).toFixed(5)}`,
      );
      // The switch to the family as current, in the choreography's order: the code section's setActive zeroes the offset
      // (its setActive writes 0), then the family's setActive clears it, and the family's update writes the carried value.
      codeX = null;
      blocks.setGroupOffset(0, 0, 0);
      handle.setActive(true, ctxNow());
      drive.s = 0.3;
      await frames(3);
      check(
        'a switch to current keeps the carried value (setActive does not drop it): x = read x (1 - e) at p 0.3',
        Math.abs(blocks.groupOffset[0] - carried(CODE_X_B, 0.3)) < 1e-9 && Math.abs(group.position.x - carried(CODE_X_B, 0.3)) < 1e-9,
        `target=${blocks.groupOffset[0].toFixed(5)} phantoms=${group.position.x.toFixed(5)} want=${carried(CODE_X_B, 0.3).toFixed(5)}`,
      );
      // Scrolling back up: the family stops being current, the code section takes the offset back, and the next entry
      // frame reads it again.
      handle.setActive(false, ctxNow());
      codeX = CODE_X_C;
      drive.s = 0.25;
      await frames(3);
      check(
        'after the family stops being current, the next entry frame reads the code offset again',
        Math.abs(blocks.groupOffset[0] - carried(CODE_X_C, 0.25)) < 1e-9,
        `target=${blocks.groupOffset[0].toFixed(5)} want=${carried(CODE_X_C, 0.25).toFixed(5)}`,
      );
      drive.s = 0;
      await frames(3);
      check(
        'p 0 holds the offset read on the way back (x = read x)',
        Math.abs(blocks.groupOffset[0] - CODE_X_C) < 1e-9 && Math.abs(group.position.x - CODE_X_C) < 1e-9,
        `target=${blocks.groupOffset[0].toFixed(5)} phantoms=${group.position.x.toFixed(5)}`,
      );
      codeX = null;
      handle.setActive(true, ctxNow());
      drive.s = 0.5;
      await frames(4);
      check(
        'at rest the carried offset is gone: x 0 on the blocks and the phantoms',
        blocks.groupOffset[0] === 0 && Math.abs(blocks.group.position.x) < 1e-9 && group.position.x === 0,
        `target=${blocks.groupOffset[0]} blocks=${blocks.group.position.x} phantoms=${group.position.x}`,
      );
    }
    codeX = null;

    // Events after the section leaves are ignored, and setActive(false) tidies the world.
    handle.setActive(false, ctxNow());
    check(
      'setActive(false) zeroes the anchor offset at once (phantoms and blocks target, x and y)',
      group.position.x === 0 && group.position.y === 0 && blocks.groupOffset[0] === 0 && blocks.groupOffset[1] === 0,
      `group=${group.position.x},${group.position.y} target=${blocks.groupOffset[0]},${blocks.groupOffset[1]}`,
    );
    drive.on = false;
    await wait(50);
    check('setActive(false) hides the phantoms', group.visible === false);
    check('setActive(false) restores the default far plane', camera.far === 80, `far=${camera.far}`);
    drive.on = true;
    handle.setActive(true, ctxNow());
    drive.s = 0.5;
    await frames(4);
    check('setActive(true) again shows the phantoms at rest', group.visible === true);
    check(
      portrait ? 'phone: the far plane returns to 120' : 'desktop: the far plane is 80',
      camera.far === (portrait ? 120 : 80),
      `far=${camera.far}`,
    );
  }

  // Dispose: a second handle adds its own group, and dispose removes exactly that group and its listener.
  const extra = setup(world);
  check('a second handle adds one more phantom group', groupsNamed('family-phantom-group') === 2, `groups=${groupsNamed('family-phantom-group')}`);
  extra.dispose();
  check('dispose removes its group and leaves the first', groupsNamed('family-phantom-group') === 1, `groups=${groupsNamed('family-phantom-group')}`);
  document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station: 3 } }));
  extra.update(0.5, { time: 0, dt: 0.016, frame: 0 }, ctxNow());
  check('a disposed handle ignores update and events', groupsNamed('family-phantom-group') === 1);

  const win = window as FamilyWindow;
  win.__family = {
    set(s: number): void {
      drive.s = clamp01(s);
    },
    hover(station: number | null, toggle = false): void {
      document.dispatchEvent(new CustomEvent('hk:family-hover', { detail: { station, toggle } }));
    },
    pointer(x: number | null): void {
      codeX = x;
    },
    current(on: boolean): void {
      handle.setActive(on, ctxNow());
    },
  };
  win.__familyReport = report;
  drive.s = 0.5;
  drive.on = true;
  handle.setActive(true, ctxNow());
  await frames(2);
}

main()
  .catch((err: unknown) => {
    const reason = err instanceof Error ? err.message : String(err);
    report.failures.push(`harness: ${reason}`);
    console.log(`FAIL harness :: ${reason}`);
  })
  .finally(() => {
    const problems = [...report.failures, ...report.diagnostics];
    root.dataset.harness = problems.length === 0 ? 'pass' : `fail:${problems.join('; ')}`;
    console.log(`verdict ${root.dataset.harness.slice(0, 200)}`);
  });
