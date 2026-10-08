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
import { gsap } from 'gsap';
import * as THREE from 'three';
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { initScroll, scrollState } from '../src/core/scroll';
import type { SectionId } from '../src/core/types';
import { createWorld, type GLBoot } from '../src/gl/boot';
import { addTick, PRIORITY, type Tick } from '../src/core/ticker';
import type { GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../src/gl/section-gl';
import {
  choreoRefreshThemeBlocks,
  choreoSnapshot,
  choreoThemeBlocks,
  initChoreo,
  type ChoreoSnapshot,
} from '../src/choreo/timeline';

/** One probe (a data-theme-block of the page) as the frame placed it, next to the DOM's own centre (D23.1). */
export interface ProbeState {
  id: string;
  section: SectionId | '';
  /** The centre the DOM reports, in CSS px. */
  domCentre: number;
  /** The centre theme-front computed at the frame, in CSS px. NaN when the module does not report the block. */
  centre: number;
  /** The front line theme-front used at the frame, in CSS px. */
  front: number;
  /** The data-theme attribute at the frame, or null. */
  theme: string | null;
  /** The boundary the module reports the block in, or null. */
  boundary: 1 | 2 | null;
}

/** The state of one choreography frame, read after the frame's choreography and draw. */
export interface ProbeFrame {
  frame: number;
  scrollY: number;
  stateY: number;
  p1: number;
  p2: number;
  front1: number;
  front2: number;
  current: SectionId | null;
  reduced: boolean;
  noGl: boolean;
  probes: ProbeState[];
}

/** One write to a data-theme attribute on the page, from a MutationObserver. */
export interface WriteRecord {
  frame: number;
  id: string;
  oldValue: string | null;
  newValue: string | null;
}

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

/** One sweep (D25.1): the lower section's top edge moves on screen from fromY to toY and back, at a fixed frame gap. */
export interface SweepOptions {
  /** 1 for the top of capabilities, 2 for the top of pricing. */
  boundary: 1 | 2;
  /** Wall-clock gap between two frames, in ms. */
  frameMs: number;
  /** Screen y of the lower section's top edge at the two ends of the sweep, in CSS px. */
  fromY: number;
  toY: number;
  /** Distance between two samples, in CSS px. */
  stepPx: number;
  /** The columns to read, as fractions of the canvas width. They sit where no DOM or block is needed: the background alone is read. */
  columns: number[];
}

/** One sample of a sweep. Each column holds the ink front's crossing in CSS px from the top, or null where there is none. */
export interface SweepSample {
  dir: 'down' | 'up';
  /** window.scrollY and scrollState.y (the choreography's scroll position) at the frame. */
  scrollY: number;
  stateY: number;
  /** Screen y of the lower section's top edge from the DOM, in CSS px. */
  dom: number;
  /** The mean line the choreography gave the front, in CSS px. */
  front: number;
  /** The front passed to the background (p and the wave in CSS px), or null when none was drawn. */
  bleed: { p: number; wave: number } | null;
  /** The lower section's computed padding-top, in CSS px. */
  padTop: number;
  uTime: number;
  reduced: boolean;
  cols: (number | null)[];
  /** The R value of the top row of each column (the upper ground), the median of five rows. */
  topR: number[];
  /** The shader's wave value per column, in [-1, 1], from the same noise at that column and uTime. */
  noise: number[];
  /** Blocks of the two boundary sections whose data-theme is not their own section's data-theme. */
  probesOff: number;
}

/** What the driver reads from the page. */
interface HarnessApi {
  readonly fake: boolean;
  readonly world: GLWorld;
  /**
   * Stops the page's own frame loop (gsap.ticker.sleep). After this, frames run only through sweep(), each one a manual
   * gsap.ticker.tick() at the gap the sweep asks for.
   */
  manual(): void;
  /** A scroll sweep of one boundary (see SweepOptions). Runs on the manual frames only. */
  sweep(opts: SweepOptions): Promise<SweepSample[]>;
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
  /** Adds or removes html.no-gl, as a context loss would (theme-front must then do nothing). */
  setNoGl(on: boolean): void;
  /** Per-frame records of every probe since the last clearProbes. A copy. */
  probeFrames(): ProbeFrame[];
  clearProbes(): void;
  /** Every data-theme write on the page (probes and sections) since the last clearProbes, in order. A copy. */
  writes(): WriteRecord[];
  /** Re-measures the text blocks on the next frame. */
  refreshThemeBlocks(): void;
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

// Per-frame probe record (D23.1). It runs after the frame's choreography (PRIORITY.state + 5), the draw (glRender) and
// the frame counter (glRender + 10), so frameCount - 1 is the frame whose choreography it reports.
const probeFrames: ProbeFrame[] = [];
addTick(() => {
  const snap = choreoSnapshot();
  const modelled = new Map((choreoThemeBlocks() ?? []).map((b) => [b.el, b] as const));
  const probes: ProbeState[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('[data-probe]')) {
    const m = modelled.get(el);
    const r = el.getBoundingClientRect();
    probes.push({
      id: el.dataset.probe ?? '',
      section: (el.closest('section')?.id ?? '') as SectionId | '',
      domCentre: r.top + r.height / 2,
      centre: m?.centre ?? Number.NaN,
      front: m?.front ?? Number.NaN,
      theme: el.getAttribute('data-theme'),
      boundary: m?.boundary ?? null,
    });
  }
  probeFrames.push({
    frame: frameCount - 1,
    scrollY: window.scrollY,
    stateY: scrollState.y,
    p1: snap?.p1 ?? Number.NaN,
    p2: snap?.p2 ?? Number.NaN,
    front1: snap?.front1 ?? Number.NaN,
    front2: snap?.front2 ?? Number.NaN,
    current: snap?.current ?? null,
    reduced: env.reducedMotion,
    noGl: root.classList.contains('no-gl'),
    probes,
  });
}, PRIORITY.glRender + 11);

// Every data-theme write on the page. A write that keeps the value is recorded too, so the driver can see one.
const writes: WriteRecord[] = [];
const writeObserver = new MutationObserver((records) => {
  for (const rec of records) {
    const el = rec.target as HTMLElement;
    writes.push({
      frame: frameCount - 1,
      id: el.dataset.probe ?? (el.id === '' ? el.tagName.toLowerCase() : `#${el.id}`),
      oldValue: rec.oldValue,
      newValue: el.getAttribute('data-theme'),
    });
  }
});

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

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function medianOf(xs: number[]): number {
  const sorted = [...xs].sort((p, q) => p - q);
  return sorted[Math.floor(sorted.length / 2)];
}

/** The R values of one full column, top row first. readPixels returns rows from the bottom. */
function columnTopFirst(buf: Uint8Array, H: number): number[] {
  const out: number[] = new Array<number>(H);
  for (let r = 0; r < H; r++) out[r] = buf[(H - 1 - r) * 4];
  return out;
}

/**
 * The continuous row (device px from the top) where a column crosses from paper to ink, or back, or null. Paper reads
 * about 241 and ink about 21 in display values, vignette and fibre included, so the mid value is 131 for both
 * boundaries. The rim band (34 over ink, 228 over paper) stays on its own side of it. A fixed mid keeps the crossing
 * exact when the front lies near the top or bottom of the canvas, where the column has no plateau to measure.
 */
function crossingOf(col: number[]): number | null {
  const mid = 131;
  for (let k = 0; k < col.length - 1; k++) {
    const a = col[k];
    const b = col[k + 1];
    if ((a > mid && b <= mid) || (a < mid && b >= mid)) return k + 0.5 + (a - mid) / (a - b);
  }
  return null;
}

// The shader's wave (background.frag.glsl bgFrontNoise, bgValueNoise, bgHash11), in double precision. It predicts the
// wave at a column so the front can be checked against the mean line.
function fract(v: number): number {
  return v - Math.floor(v);
}
function hash11(v: number): number {
  let p = fract(v * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
function valueNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return (hash11(i) + (hash11(i + 1) - hash11(i)) * u) * 2 - 1;
}
function frontNoise(x: number): number {
  const x2 = x * 2.03;
  return (valueNoise(x) + 0.5 * valueNoise(x2) + 0.25 * valueNoise(x2 * 2.03)) / 1.75;
}

/** Ramp from a to b, in steps of at most step, ending at b. */
function rampCount(a: number, b: number, step: number): number {
  return Math.max(1, Math.round(Math.abs(b - a) / step));
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
  writeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme'],
    attributeOldValue: true,
    subtree: true,
  });
  // ?norender skips the draws. The logic checks do not read pixels, and the frame rate on a loaded machine
  // is the limit on how long the driver has to wait. Every state still runs; only the frame is not drawn.
  if (params.has('norender')) boot.world.stage.setRenderHook(() => undefined);

  /** Reads the background alone (blocks and post are off for this draw) at the given device columns, top row first. */
  const readBackground = (columns: number[]): { cols: number[][]; uTime: number } => {
    const { renderer, scene, camera } = boot.world.stage;
    const bg = boot.world.background.mesh;
    const saved = scene.children.map((c) => c.visible);
    for (const c of scene.children) c.visible = c === bg;
    renderer.render(scene, camera);
    scene.children.forEach((c, i) => {
      c.visible = saved[i];
    });
    const gl = renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('readBackground: no WebGL2 context');
    const H = canvas.height;
    const buf = new Uint8Array(H * 4);
    const cols = columns.map((cx) => {
      gl.readPixels(cx, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return columnTopFirst(buf, H);
    });
    const material = bg.material;
    const uTime = material instanceof THREE.ShaderMaterial ? Number(material.uniforms.uTime.value) : Number.NaN;
    return { cols, uTime };
  };

  /** The next frame reads the background at these columns once it is drawn. Resolves inside that frame. */
  const queueReadback = (columns: number[]): Promise<{ cols: number[][]; uTime: number }> =>
    new Promise((resolve) => {
      const remove = addTick(() => {
        remove();
        resolve(readBackground(columns));
      }, PRIORITY.glRender + 5);
    });

  const sampleOf = (
    dir: 'down' | 'up',
    rb: { cols: number[][]; uTime: number },
    lower: HTMLElement,
    columns: number[],
    W: number,
    dpr: number,
  ): SweepSample => {
    const snap = choreoSnapshot();
    if (snap === null) throw new Error('sweep: no choreography is running');
    const cols = rb.cols.map((col) => {
      const c = crossingOf(col);
      return c === null ? null : c / dpr;
    });
    const noise = columns.map((cx) => frontNoise(2.2 * ((cx + 0.5) / W) + 0.4 * rb.uTime));
    const probesOff = [...document.querySelectorAll<HTMLElement>('[data-probe]')].filter((el) => {
      const sec = el.closest('section');
      if (sec === null || !['speed', 'capabilities', 'family', 'pricing'].includes(sec.id)) return false;
      return el.getAttribute('data-theme') !== sec.getAttribute('data-theme');
    }).length;
    return {
      dir,
      scrollY: window.scrollY,
      stateY: scrollState.y,
      dom: lower.getBoundingClientRect().top,
      front: lower.id === 'capabilities' ? snap.front1 : snap.front2,
      bleed: snap.bleed === null ? null : { p: snap.bleed.p, wave: snap.bleed.wave },
      padTop: Number.parseFloat(getComputedStyle(lower).paddingTop),
      uTime: rb.uTime,
      reduced: env.reducedMotion,
      cols,
      topR: rb.cols.map((col) => medianOf(col.slice(0, 5))),
      noise,
      probesOff,
    };
  };

  /**
   * Scrolls so the lower section's top edge is at fromY, then moves it to toY and back, one sample per stepPx. Each sample
   * is one frame at the sweep's gap after a state frame, so the scroll is in the state and the readback is of that frame.
   */
  async function sweep(opts: SweepOptions): Promise<SweepSample[]> {
    const lower = document.getElementById(opts.boundary === 1 ? 'capabilities' : 'pricing');
    if (lower === null) throw new Error(`sweep: no section for boundary ${opts.boundary}`);
    const W = boot.world.stage.canvas.width;
    const dpr = W / boot.world.stage.size.width;
    const columns = opts.columns.map((f) => Math.min(W - 1, Math.max(0, Math.floor(f * W))));
    const out: SweepSample[] = [];
    const ramp = async (from: number, to: number): Promise<void> => {
      const dir: 'down' | 'up' = to < from ? 'down' : 'up';
      const n = rampCount(from, to, opts.stepPx);
      for (let i = 1; i <= n; i += 1) {
        const sy = from + ((to - from) * i) / n;
        const docTop = lower.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: docTop - sy, behavior: 'instant' });
        await nextFrame();
        await delay(opts.frameMs);
        gsap.ticker.tick();
        await delay(opts.frameMs);
        const job = queueReadback(columns);
        gsap.ticker.tick();
        const rb = await job;
        out.push(sampleOf(dir, rb, lower, columns, W, dpr));
      }
    };
    await ramp(opts.fromY, opts.toY);
    await ramp(opts.toY, opts.fromY);
    return out;
  }

  window.choreoHarness = {
    fake,
    world: boot.world,
    manual: () => gsap.ticker.sleep(),
    sweep: (opts: SweepOptions) => sweep(opts),
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
    setNoGl: (on: boolean) => {
      root.classList.toggle('no-gl', on);
    },
    probeFrames: () => probeFrames.slice(),
    clearProbes: () => {
      probeFrames.length = 0;
      writes.length = 0;
    },
    writes: () => writes.slice(),
    refreshThemeBlocks: () => choreoRefreshThemeBlocks(),
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
  // Theme-front (D23.1): the ten probes in the two boundaries are measured, and the one outside them is not touched.
  const boundProbes = document.querySelectorAll('[data-probe]:not([data-probe="closing-a"])').length;
  check(
    'theme-front measures the boundary probes',
    (choreoThemeBlocks() ?? []).length === boundProbes,
    `${(choreoThemeBlocks() ?? []).length} of ${boundProbes}`,
  );
  const closingProbe = document.querySelector<HTMLElement>('[data-probe="closing-a"]');
  check(
    'theme-front leaves a block outside the boundaries alone',
    closingProbe !== null && !closingProbe.hasAttribute('data-theme'),
    `data-theme ${closingProbe?.getAttribute('data-theme') ?? 'absent'}`,
  );
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
