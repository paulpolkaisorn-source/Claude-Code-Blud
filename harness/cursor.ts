// Harness for src/core/cursor.ts (architecture section 10a). Open /harness/cursor.html on the dev server (port 5231).
// The page boots the modules in the order of main.ts (ticker, scroll, pointer, cursor). It draws the 17 blocks as flat
// stand-ins at their projected footprints (projection P1), so the forms read against the object, and it checks the
// geometry the forms read: the hero footprint of the kireji, the race's block 01 edge and the column centres. The
// verdict lands in dataset.harness ('pass' or 'fail:<checks>') and the checks in dataset.harnessChecks.
// The input checks (mouse, touch, reduced motion, keyboard) run in a Playwright driver in the session scratchpad, which
// reads the form state from the cursor layer (data-form, the label text and the transforms).
import { initCursor } from '../src/core/cursor';
import { ef } from '../src/core/ease';
import { initPointer } from '../src/core/pointer';
import { blockRects, formationRects, viewportSize, type ScreenRect, type Size } from '../src/core/projection';
import { initScroll, scrollState } from '../src/core/scroll';
import { addTick, initTicker, PRIORITY, type Tick } from '../src/core/ticker';
import { stanzaOpen, type Pose } from '../src/gl/blocks/formations';
import { cameraKey, FIT } from '../src/gl/rig';
import type { CameraKey } from '../src/gl/section-gl';

const root = document.documentElement;
const SECTIONS = ['hero', 'speed', 'capabilities', 'code', 'family', 'pricing', 'closing', 'footer'] as const;
type Id = (typeof SECTIONS)[number];

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** What the driver reads: the geometry the forms depend on, computed fresh from the same projection. */
export interface HarnessGeometry {
  size: Size;
  scrollY: number;
  raceBlock0: Box;
  /** Screen centres of the 17 column blocks, top to bottom. */
  columnCentres: { x: number; y: number }[];
  /** The kireji footprint (block 05) at the current hero progress. */
  kireji: Box;
  heroTop: number;
  heroHeight: number;
}

interface HarnessWindow {
  __cursorHarness?: {
    geometry(): HarnessGeometry;
    stop: () => void;
  };
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

function need<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (el === null) throw new Error(`missing ${selector}`);
  return el;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---- Boot, in the order of main.ts -----------------------------------------------------------

initTicker();
initScroll();
initPointer();
const stop = initCursor();

// ---- The flat stand-in for the blocks -----------------------------------------------------------

const stage = need<HTMLElement>('#stage');
const blockEls: HTMLElement[] = [];
for (let i = 0; i < 17; i += 1) {
  const el = document.createElement('i');
  if (i === 4) el.classList.add('kireji');
  stage.append(el);
  blockEls.push(el);
}

/** Section tops and heights in document px, measured on resize and font load (the same rule as the page). */
const tops = new Map<Id, number>();
const heights = new Map<Id, number>();
let dirty = true;
let size: Size = { width: 1, height: 1 };
const heroKey: CameraKey = { position: [0, 0, 0], target: [0, 0, 0], fov: FIT.fovDeg };
const openPoses: Pose[] = [];
const rects: ScreenRect[] = [];
let stageKey = '';

function measure(): void {
  dirty = false;
  const scrollY = window.scrollY;
  for (const id of SECTIONS) {
    const el = document.getElementById(id);
    if (el === null) continue;
    const rect = el.getBoundingClientRect();
    tops.set(id, rect.top + scrollY);
    heights.set(id, rect.height);
  }
  size = viewportSize();
  cameraKey('hero', size, heroKey);
}

/** The last section, in page order, whose top has passed the scroll position (choreography rule). */
function sectionAt(y: number): Id | null {
  let found: Id | null = null;
  for (const id of SECTIONS) {
    const h = heights.get(id) ?? 0;
    if (!(h > 0)) continue;
    if ((tops.get(id) ?? 0) <= y + 1) found = id;
  }
  return found;
}

function paint(list: readonly ScreenRect[] | null): void {
  for (let i = 0; i < blockEls.length; i += 1) {
    const el = blockEls[i];
    const r = list === null ? undefined : list[i];
    if (r === undefined) {
      el.classList.add('is-off');
      continue;
    }
    el.classList.remove('is-off');
    el.style.left = `${r.x0}px`;
    el.style.top = `${r.y0}px`;
    el.style.width = `${r.x1 - r.x0}px`;
    el.style.height = `${r.y1 - r.y0}px`;
  }
}

function stageFrame(_t: Tick): void {
  if (dirty) measure();
  const y = scrollState.y;
  const id = sectionAt(y);
  let key: string = id ?? 'none';
  if (id === 'hero') {
    const h = heights.get('hero') ?? 1;
    const q = clamp((y - (tops.get('hero') ?? 0)) / h, 0, 1);
    key = `hero:${q.toFixed(4)}`;
    if (key !== stageKey) {
      stanzaOpen(ef.sym(q), openPoses);
      paint(blockRects(openPoses, heroKey, size, rects));
    }
  } else if (key !== stageKey) {
    if (id === 'speed') paint(formationRects('race', 'speed', size, rects));
    else if (id === 'closing') paint(formationRects('column', 'closing', size, rects));
    else if (id === 'family') paint(formationRects('family', 'family', size, rects));
    else paint(null);
  }
  if (key !== stageKey) {
    stageKey = key;
    const el = id === null ? null : document.getElementById(id);
    stage.dataset.theme = el?.dataset.theme === 'ink' ? 'ink' : 'paper';
  }
}

addTick(stageFrame, PRIORITY.state);

// ---- Geometry the driver reads --------------------------------------------------------------------

function boxOf(r: ScreenRect): Box {
  return { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
}

function geometry(): HarnessGeometry {
  const vp = viewportSize();
  const scrollY = window.scrollY;
  const heroEl = need<HTMLElement>('#hero');
  const heroTop = heroEl.getBoundingClientRect().top + scrollY;
  const heroHeight = heroEl.getBoundingClientRect().height;
  const q = clamp((scrollY - heroTop) / heroHeight, 0, 1);
  const open = stanzaOpen(ef.sym(q), []);
  const kireji = blockRects(open, cameraKey('hero', vp), vp)[4];
  const race = formationRects('race', 'speed', vp)[0];
  const column = formationRects('column', 'closing', vp).map((r) => ({
    x: (r.x0 + r.x1) / 2,
    y: (r.y0 + r.y1) / 2,
  }));
  return {
    size: vp,
    scrollY,
    raceBlock0: boxOf(race),
    columnCentres: column,
    kireji: boxOf(kireji),
    heroTop,
    heroHeight,
  };
}

// ---- Checks ----------------------------------------------------------------------------------------

function runChecks(): void {
  const vp = viewportSize();
  const layer = need<HTMLElement>('#cursor');
  record('initCursor returns a stop function', typeof stop === 'function', typeof stop);
  record('cursor layer is the fixed z-index 50 layer', getComputedStyle(layer).zIndex === '50', getComputedStyle(layer).zIndex);
  record('no custom form before a pointer event', !layer.hasAttribute('data-form'), layer.getAttribute('data-form') ?? '');

  measure();
  const g = geometry();
  const column = g.columnCentres;
  record('column has 17 centres, top to bottom', column.length === 17, `${column.length}`);
  let ordered = true;
  for (let i = 1; i < column.length; i += 1) ordered = ordered && column[i].y > column[i - 1].y;
  record('column centres increase down the page', ordered, '');

  if (vp.width === 1440 && vp.height === 900) {
    // Act I reference values at 1440 by 900 (direction-act1.md A6 and the speed pointer rule).
    const k = g.kireji;
    const kiOk =
      Math.abs(k.x0 - 1194.1) < 0.6 &&
      Math.abs(k.x1 - 1271.6) < 0.6 &&
      Math.abs(k.y0 - 295.1) < 0.6 &&
      Math.abs(k.y1 - 372.5) < 0.6;
    if (g.scrollY === 0) {
      record(
        'kireji footprint matches the act I reference rect at scroll 0',
        kiOk,
        `x ${k.x0.toFixed(2)}-${k.x1.toFixed(2)} y ${k.y0.toFixed(2)}-${k.y1.toFixed(2)}`,
      );
    }
    record(
      'race block 01 left edge is at 139.8 px',
      Math.abs(g.raceBlock0.x0 - 139.8) < 0.2,
      g.raceBlock0.x0.toFixed(3),
    );
  }

  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  root.dataset.harnessChecks = JSON.stringify(checks);
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
}

(window as unknown as HarnessWindow).__cursorHarness = { geometry, stop };

window.addEventListener('resize', () => {
  dirty = true;
});

void document.fonts.ready.then(() => {
  dirty = true;
  // Two frames, so the page clock has measured the sections and painted the stand-ins before the checks read them.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        runChecks();
      } catch (error) {
        root.dataset.harness = `fail:exception ${error instanceof Error ? error.message : String(error)}`;
      }
    });
  });
});
