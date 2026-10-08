// Harness for src/choreo/timeline.ts (architecture section 10a). Open /harness/choreo.html on the dev server.
//
// Default: the page boots the GL world as the page does, with the section layers boot collects. The checks at boot
// read the section heights, the bleed, the block mix and the current section.
// ?fake=1: the page passes nine SectionGL literals to a second initChoreo call, which replaces boot's. Each literal
// has a recording handle. Every update and setActive call is logged with its frame, its progress, whether the handle
// is current, ctx.prev and ctx.bleed. Every setBleed call of the background is logged with its frame. The driver
// reads the logs through window.choreoHarness to check the call order (D22.1, D22.11), the extra update(0) of an
// entering section that returns to 0, ctx.prev, the bleed values (D22.8) and the depth of field (D22.2).
// ?norender skips the draws. The logic does not read pixels.
//
// dataset.harness becomes 'pass' or 'fail:<checks>' once the page's own checks finish.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { initScroll } from '../src/core/scroll';
import type { SectionId } from '../src/core/types';
import { createWorld, type GLBoot } from '../src/gl/boot';
import { addTick, PRIORITY, type Tick } from '../src/core/ticker';
import type { GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import { choreoSnapshot, initChoreo, type ChoreoSnapshot } from '../src/choreo/timeline';

/** One call of a recording handle. */
export interface CallRecord {
  /** Frame of the page clock in which the call ran (frames run since the harness started). */
  frame: number;
  /** Order of the call in the run. */
  seq: number;
  id: SectionId;
  kind: 'update' | 'setActive';
  /** The progress passed to update, or null for setActive. */
  progress: number | null;
  /** Whether the handle is current during the call (true from setActive(true) until setActive(false)). */
  current: boolean;
  /** The id of ctx.prev, or null for the first section. */
  prev: SectionId | null;
  /** ctx.bleed.p1 and ctx.bleed.p2 during the call. */
  p1: number;
  p2: number;
}

/** One setBleed call of the background. */
export interface BleedRecord {
  frame: number;
  seq: number;
  /** The argument, or null when the bleed is removed. */
  bleed: { boundary: 1 | 2; p: number } | null;
}

/** What the driver reads from the page. */
interface HarnessApi {
  readonly fake: boolean;
  readonly world: GLWorld;
  snapshot(): ChoreoSnapshot | null;
  passCount(): number;
  /** The focus of the depth-of-field pass in bu, or null when the pass is not in the chain. */
  dofFocus(): number | null;
  /** The bokeh scale of the depth-of-field pass, or null when the pass is not in the chain. */
  dofBokeh(): number | null;
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
  /** A copy of the handle calls since the last clearLog, in order. */
  calls(): CallRecord[];
  /** A copy of the setBleed calls since the last clearLog, in order. */
  bleeds(): BleedRecord[];
  clearLog(): void;
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

// Simulated clock, read by the driver. Registered after the grab so each frame is counted once.
let simSeconds = 0;
let frameCount = 0;
addTick((t) => {
  simSeconds += t.dt;
  frameCount += 1;
}, PRIORITY.glRender + 10);

const callLog: CallRecord[] = [];
const bleedLog: BleedRecord[] = [];
let logSeq = 0;

/**
 * A handle that records its calls and sets nothing else. frameCount is the frame of the choreography's call: the
 * choreography runs at PRIORITY.state + 5, before the frame counter advances at PRIORITY.glRender + 10.
 */
function recorderFor(id: SectionId): () => SectionGLHandle {
  return (): SectionGLHandle => {
    let current = false;
    return {
      update(progress: number, _tick: Tick, ctx: SectionGLContext): void {
        callLog.push({
          frame: frameCount,
          seq: logSeq++,
          id,
          kind: 'update',
          progress,
          current,
          prev: ctx.prev?.id ?? null,
          p1: ctx.bleed.p1,
          p2: ctx.bleed.p2,
        });
      },
      setActive(active: boolean, ctx: SectionGLContext): void {
        current = active;
        callLog.push({
          frame: frameCount,
          seq: logSeq++,
          id,
          kind: 'setActive',
          progress: null,
          current,
          prev: ctx.prev?.id ?? null,
          p1: ctx.bleed.p1,
          p2: ctx.bleed.p2,
        });
      },
      dispose(): void {
        // The recorder holds nothing to release.
      },
    };
  };
}

const FAKE_SECTIONS: readonly SectionGL[] = [
  { id: 'preloader', formation: 'stanza', key: 'hero', ink: 0, dof: null, breath: null, setup: recorderFor('preloader') },
  {
    id: 'hero',
    formation: 'stanza',
    key: 'hero',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
    setup: recorderFor('hero'),
  },
  {
    id: 'speed',
    formation: 'race',
    key: 'speed',
    ink: 0,
    dof: { focus: 31.95, bokeh: 1.2 },
    breath: { amplitude: 0.012, phase: 'zero' },
    smear: true,
    setup: recorderFor('speed'),
  },
  {
    id: 'capabilities',
    formation: 'cap-0',
    exitFormation: 'cap-2',
    key: 'hero',
    ink: 1,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
    setup: recorderFor('capabilities'),
  },
  {
    id: 'code',
    formation: 'recede',
    key: 'hero',
    ink: 1,
    dof: { focus: 21.15, bokeh: 2.0 },
    breath: { amplitude: 0.012, phase: 'rows' },
    setup: recorderFor('code'),
  },
  {
    id: 'family',
    formation: 'family',
    key: 'family',
    ink: 1,
    dof: null,
    breath: { amplitude: 0.012, phase: 'rows' },
    setup: recorderFor('family'),
  },
  {
    id: 'pricing',
    formation: 'rest',
    key: 'pricing',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.01, phase: 'zero' },
    setup: recorderFor('pricing'),
  },
  {
    id: 'closing',
    formation: 'column',
    key: 'closing',
    ink: 0,
    dof: null,
    breath: { amplitude: 0.01, phase: 'wave' },
    setup: recorderFor('closing'),
  },
  {
    id: 'footer',
    formation: 'column',
    key: 'closing',
    ink: 0,
    dof: null,
    breath: null,
    setup: recorderFor('footer'),
  },
];

/** The depth-of-field effect of the chain, read from its pass (index 1 while the pass is present), or null. */
interface DofEffectLike {
  readonly cocMaterial: { focusDistance: number };
  readonly bokehScale?: number;
}
function depthOfField(world: GLWorld): DofEffectLike | null {
  const passes = world.post.composer.passes;
  if (passes.length < 3) return null;
  // EffectPass keeps its effects in a private field; the harness reads it, and the pass is the DoF pass at index 1.
  const effects = (passes[1] as unknown as { effects: DofEffectLike[] }).effects;
  return effects[0] ?? null;
}

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

  // Every setBleed call of the background is logged, then forwarded. The choreography calls it through the object,
  // so the wrapper receives every call.
  const background = boot.world.background;
  const setBleedNative = background.setBleed.bind(background);
  background.setBleed = (bleed): void => {
    bleedLog.push({
      frame: frameCount,
      seq: logSeq++,
      bleed: bleed === null ? null : { boundary: bleed.boundary, p: bleed.p },
    });
    setBleedNative(bleed);
  };

  // boot has already called initChoreo with the sections it collected. In fake mode this call replaces that one.
  if (fake) initChoreo(boot.world, FAKE_SECTIONS);
  // ?norender skips the draws. The logic checks do not read pixels, and the frame rate on a loaded machine
  // is the limit on how long the driver has to wait. Every state still runs; only the frame is not drawn.
  if (params.has('norender')) boot.world.stage.setRenderHook(() => undefined);

  window.choreoHarness = {
    fake,
    world: boot.world,
    snapshot: choreoSnapshot,
    passCount: () => boot.world.post.composer.passes.length,
    dofFocus: () => depthOfField(boot.world)?.cocMaterial.focusDistance ?? null,
    dofBokeh: () => depthOfField(boot.world)?.bokehScale ?? null,
    clock: () => ({ sim: simSeconds, frames: frameCount }),
    grab: () =>
      new Promise<string>((resolve) => {
        // After glRender in the same tick, so the drawing buffer still holds the frame just drawn.
        const remove = addTick(() => {
          remove();
          resolve(canvas.toDataURL('image/png'));
        }, PRIORITY.glRender + 5);
      }),
    calls: () => callLog.slice(),
    bleeds: () => bleedLog.slice(),
    clearLog: () => {
      callLog.length = 0;
      bleedLog.length = 0;
    },
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
