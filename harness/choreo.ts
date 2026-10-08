// Harness for src/choreo/timeline.ts (architecture section 10a). Open /harness/choreo.html on the dev server.
//
// Default: the page boots the GL world as the page does. Boot collects the section layers and none exist
// yet, so the choreography runs with an empty list. It still drives the ink bleed, the block mix and the theme.
// ?fake=1: the page passes nine minimal SectionGL literals to a second initChoreo call, which replaces boot's.
// Their formations, keys, DoF, breath and smear follow direction-3d 10.6 to 10.12 and the act files. The
// capabilities literal has a spy handle that records its calls. The section elements carry the page's ids
// and heights (architecture section 4).
//
// dataset.harness becomes 'pass' or 'fail:<checks>' once the page's own checks finish. The Playwright driver
// reads window.choreoHarness to sample the choreography, the composer's pass count and the spy.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { initScroll } from '../src/core/scroll';
import type { SectionId } from '../src/core/types';
import { formationFor } from '../src/gl/blocks/formations';
import { createWorld, type GLBoot } from '../src/gl/boot';
import { addTick, PRIORITY } from '../src/core/ticker';
import { cameraKey } from '../src/gl/rig';
import type {
  CameraKey,
  GLWorld,
  SectionGL,
  SectionGLContext,
  SectionGLHandle,
} from '../src/gl/section-gl';
import { choreoSnapshot, initChoreo, type ChoreoSnapshot } from '../src/choreo/timeline';

/** What the spy handle of capabilities has seen. */
interface SpyLog {
  /** Each setActive value, in call order. */
  activations: boolean[];
  /** Number of update calls. */
  updates: number;
  /** Progress of the last update call (NaN before the first). */
  lastProgress: number;
  /** Id of ctx.prev on the last update call. */
  lastPrev: string | null;
  /** True between setActive(true) and setActive(false). */
  active: boolean;
}

/** What the driver reads from the page. */
interface HarnessApi {
  readonly fake: boolean;
  readonly world: GLWorld;
  readonly spy: SpyLog;
  snapshot(): ChoreoSnapshot | null;
  passCount(): number;
  /**
   * The canvas as a PNG data URL, read in the tick after the stage draws, so it holds the frame just drawn.
   * The page has no DOM content of its own, so this is the whole picture.
   */
  grab(): Promise<string>;
  /**
   * The simulated clock: the sum of the page clock's dt, which is clamped per frame (so a slow frame rate
   * slows the motion rather than skipping it), and the number of frames run.
   */
  clock(): { sim: number; frames: number };
}

declare global {
  interface Window {
    choreoHarness?: HarnessApi;
  }
}

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const fake = params.has('fake');

/** Page order and the heights of architecture section 4, in viewport heights. */
const ORDER: readonly SectionId[] = [
  'preloader',
  'hero',
  'speed',
  'capabilities',
  'code',
  'family',
  'pricing',
  'closing',
  'footer',
];
const SECTION_VH: Readonly<Record<SectionId, number>> = {
  preloader: 0,
  hero: 2,
  speed: 3,
  capabilities: 3,
  code: 2,
  family: 2,
  pricing: 1.5,
  closing: 2.5,
  footer: 1,
};

const spy: SpyLog = { activations: [], updates: 0, lastProgress: Number.NaN, lastPrev: null, active: false };
const spyKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: 22 };

/**
 * A handle that records its calls. While it is the current section it sets its own pose, as a section handle
 * would. Its updates before that (the entrance through the centre-line progress) only record.
 */
function capabilitiesSetup(world: GLWorld): SectionGLHandle {
  return {
    update(progress: number, _tick: unknown, ctx: SectionGLContext): void {
      spy.updates += 1;
      spy.lastProgress = progress;
      spy.lastPrev = ctx.prev?.id ?? null;
      if (!spy.active) return;
      world.blocks.setPoses(formationFor('cap-0', ctx.portrait));
      cameraKey('hero', ctx.size, spyKey);
      world.rig.blend(spyKey, spyKey, 1);
    },
    setActive(active: boolean): void {
      spy.active = active;
      spy.activations.push(active);
    },
    dispose(): void {
      // The spy holds nothing to release.
    },
  };
}

const FAKE_SECTIONS: readonly SectionGL[] = [
  { id: 'preloader', formation: 'stanza', key: 'hero', ink: 0, dof: null, breath: null },
  {
    id: 'hero',
    formation: 'stanza',
    key: 'hero',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
  },
  {
    id: 'speed',
    formation: 'race',
    key: 'speed',
    ink: 0,
    dof: { focus: 31.95, bokeh: 1.2 },
    breath: { amplitude: 0.012, phase: 'zero' },
    smear: true,
  },
  {
    id: 'capabilities',
    formation: 'cap-0',
    exitFormation: 'cap-2',
    key: 'hero',
    ink: 1,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
    setup: capabilitiesSetup,
  },
  {
    id: 'code',
    formation: 'recede',
    key: 'hero',
    ink: 1,
    dof: { focus: 21.15, bokeh: 2.0 },
    breath: { amplitude: 0.012, phase: 'rows' },
  },
  {
    id: 'family',
    formation: 'family',
    key: 'family',
    ink: 1,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
  },
  {
    id: 'pricing',
    formation: 'rest',
    key: 'pricing',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.01, phase: 'zero' },
  },
  {
    id: 'closing',
    formation: 'column',
    key: 'closing',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.01, phase: 'wave' },
  },
  { id: 'footer', formation: 'column', key: 'closing', ink: 0, dof: null, breath: null },
];

// Simulated clock, read by the driver. Registered after the grab so each frame is counted once.
let simSeconds = 0;
let frameCount = 0;
addTick((t) => {
  simSeconds += t.dt;
  frameCount += 1;
}, PRIORITY.glRender + 10);

const failed: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const suffix = detail === '' ? '' : ` :: ${detail}`;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${suffix}`);
  } else {
    failed.push(name);
    console.log(`FAIL ${name}${suffix}`);
  }
}

/** Resolves after n animation frames. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let seen = 0;
    const step = (): void => {
      seen += 1;
      if (seen >= n) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function main(): Promise<void> {
  root.dataset.harness = 'running';
  const canvas = document.getElementById('gl');
  if (!(canvas instanceof HTMLCanvasElement)) {
    root.dataset.harness = 'fail:no-canvas';
    return;
  }
  if (!env.gl) {
    root.dataset.harness = 'fail:no-webgl';
    return;
  }

  // The page clock and smooth scroll start as in main.ts, before the GL chunk boots.
  initScroll();
  const boot: GLBoot = createWorld(canvas);
  await boot.compile();
  bus.emit('loader:done');

  // boot has already called initChoreo with the sections it collected. In fake mode this call replaces that one.
  if (fake) initChoreo(boot.world, FAKE_SECTIONS);
  // ?norender skips the draws. The logic checks do not read pixels, and the frame rate on a loaded machine
  // is the limit on how long the driver has to wait. Every state still runs; only the frame is not drawn.
  if (params.has('norender')) boot.world.stage.setRenderHook(() => undefined);

  window.choreoHarness = {
    fake,
    world: boot.world,
    spy,
    snapshot: choreoSnapshot,
    passCount: () => boot.world.post.composer.passes.length,
    clock: () => ({ sim: simSeconds, frames: frameCount }),
    grab: () =>
      new Promise<string>((resolve) => {
        // After glRender in the same tick, so the drawing buffer still holds the frame just drawn.
        const remove = addTick(() => {
          remove();
          resolve(canvas.toDataURL('image/png'));
        }, PRIORITY.glRender + 5);
      }),
  };

  await frames(3);

  const vh = window.innerHeight;
  for (const id of ORDER) {
    const el = document.getElementById(id);
    const height = el === null ? Number.NaN : el.getBoundingClientRect().height;
    const want = SECTION_VH[id] * vh;
    check(`${id} height`, Math.abs(height - want) <= 1, `${height.toFixed(1)} px, want ${want.toFixed(1)} px`);
  }

  const snap = choreoSnapshot();
  check('choreography is running', snap !== null);
  if (snap !== null) {
    check('bleed is off at the top', snap.bleed === null, `bleed ${JSON.stringify(snap.bleed)}`);
    check('mix is 0 on paper', snap.m === 0, `m ${snap.m}`);
  }
  if (fake) {
    check('fake: hero is current at the top', snap?.current === 'hero', `current ${snap?.current ?? 'none'}`);
    check(
      'fake: no depth of field at the top',
      boot.world.post.composer.passes.length === 2,
      `${boot.world.post.composer.passes.length} passes`,
    );
  } else {
    // Boot passes whatever section layers exist. With none, nothing is current. With layers, the first one with height is.
    const firstWithHeight = boot.sections.find((layer) => layer.id !== 'preloader')?.id ?? null;
    check(
      'default: current is the first section with height among boot sections',
      snap?.current === firstWithHeight,
      `current ${snap?.current ?? 'none'}, boot sections ${boot.sections.map((layer) => layer.id).join(',') || 'none'}`,
    );
  }

  const verdict = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
  root.dataset.harness = verdict;
  console.log(`harness ${verdict} (${passed} passed, ${failed.length} failed)`);
}

void main().catch((err: unknown) => {
  console.log('FAIL harness threw', err);
  root.dataset.harness = 'fail:threw';
});
