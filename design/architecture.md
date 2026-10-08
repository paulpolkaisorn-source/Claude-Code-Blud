# Architecture contract

Owner: director. Agents read this; they do not edit it. If an agent needs an interface change, it says so in its report.

## 1. Concept in one paragraph

The page is built on the haiku: 5-7-5, seventeen syllables, three lines, read in one breath. The 3D centerpiece is **seventeen small machined blocks**, one per syllable, set in three rows of 5, 7 and 5. They are small, exact and quick. Through the page they re-form to illustrate each section (they race, split into three capability groups, take their place in the family). At the close they come back **changed**: no longer three horizontal lines but **one vertical column of seventeen**, the way a haiku is traditionally written in Japanese, in one line. Three lines become one breath. The page is three acts with a 5 / 7 / 5 rhythm in grid, timing and scroll length.

## 2. Stack (pinned)

- vite 7.3.x (not 8), typescript 5.9.x (not 6/7: typescript-eslint support), eslint 9, ES2022 target
- three (0.18x), postprocessing (6.x, pmndrs)
- gsap 3.13+ with ScrollTrigger, SplitText, MorphSVGPlugin, DrawSVGPlugin, CustomEase (all in the public `gsap` package)
- lenis 1.3.x
- @playwright/test 1.56.1 (matches pre-installed Chromium 1194 at /opt/pw-browsers), @axe-core/playwright, lighthouse (dev only)
- eslint 9 flat config + typescript-eslint
- No Theatre.js, no Blender assets: every mesh is procedural (decision: keeps 3D assets near 0 MB and the camera paths are simple enough for code keyframes).

## 3. File map and ownership

```
index.html                         director   page shell; includes section partials via <!-- @include path -->
vite.config.ts                     perf       includes the html-include plugin (build/plugins/html-include.ts)
build/plugins/html-include.ts      perf
tsconfig.json, eslint.config.js    perf
package.json                       perf (scaffold), then director only. Agents that need a dependency ask in their report.
playwright.config.ts, tests/**     qa
scripts/**                         per brief (perf: measure-*.mjs, qa: shoot-*.mjs)

src/main.ts                        director   boot order and wiring only
src/styles/tokens.css              art-director (generated from design/direction.md)
src/styles/base.css                motion-2d (foundation task)  reset, typography, grid, themes, focus, utilities
src/styles/fonts.css               perf (font task)
public/fonts/*.woff2               perf (font task)

src/core/types.ts                  scroll-choreo   shared types: SectionId, FormationId, Tier, Theme (no runtime code)
src/core/env.ts                    perf
src/partials/head-env.html         perf       inline <script> in <head> that sets html classes before first paint
src/core/ease.ts                   motion-2d (foundation task)
src/core/timing.ts                 motion-2d (foundation task)
src/core/ticker.ts                 scroll-choreo
src/core/scroll.ts                 scroll-choreo
src/core/bus.ts                    scroll-choreo
src/core/loader.ts                 three-scene (foundation task)
src/core/pointer.ts                interaction
src/core/cursor.ts                 interaction

src/gl/stage.ts                    three-scene
src/gl/post.ts                     shader (post task)
src/gl/effects/*.ts                shader (one effect per task)
src/gl/background/*                shader (background task)
src/gl/blocks/formations.ts        three-scene (formations task)
src/gl/blocks/blocks.ts            three-scene (blocks task)
src/gl/blocks/material.ts + *.glsl shader (block material task)
src/gl/rig.ts                      three-scene (camera rig task)
src/gl/quality.ts                  perf
src/choreo/timeline.ts             scroll-choreo   maps scroll position to formation, camera key, background ink

src/sections/<id>/<id>.html        motion-2d for that section (markup + copy)
src/sections/<id>/<id>.css         motion-2d for that section
src/sections/<id>/<id>.ts          motion-2d for that section (2D motion; exports init function)
src/sections/<id>/*.svg.ts         motion-2d for that section (hand-built SVG as strings or in the html partial)
```

Section ids, in order: `preloader`, `hero`, `speed`, `capabilities`, `code`, `family`, `pricing`, `closing`, `footer`.

## 4. Acts, themes and scroll length

| Act | Sections | Theme | Scroll length (in viewport heights, desktop) |
|---|---|---|---|
| I (5) | hero, speed | paper | hero 2, speed 3 |
| II (7) | capabilities, code, family | ink | capabilities 3, code 2, family 2 |
| III (5) | pricing, closing, footer | paper | pricing 1.5, closing 2.5, footer 1 |

Lengths are targets for desktop, not hard rules; mobile may shorten. Each `<section>` carries `data-theme="paper|ink"` and `data-act="1|2|3"`. Text colors come from the theme. With WebGL on, section backgrounds are transparent and the background shader paints paper/ink with an ink-bleed transition at the act boundaries. With WebGL off or reduced motion, CSS paints the section backgrounds (`html.no-gl` or `html.reduced-motion` class) and the theme switch is a plain cut at the boundary.

## 5. Boot order (src/main.ts, director)

1. `env` is evaluated synchronously (classes `reduced-motion`, `no-gl`, `touch` set on `<html>` by an inline script in index.html before first paint so CSS never flashes).
2. Fonts start loading (preload links in index.html). The hero h1 is visible at first paint with the fallback face adjusted with `size-adjust` so the swap causes no layout shift.
3. `initTicker()` then `initScroll()`.
4. `initPreloader()` starts. `loader` runs registered tasks: fonts, the GL chunk (`import('./gl/boot')`), shader compile (`renderer.compileAsync`), env map generation. Progress is real: weighted completed tasks plus byte progress where measurable.
5. On `loader:done`, the preloader hands off to the hero (the progress hairlines become the three rows of blocks in place; no overlay cut).
6. Section `init*` functions run in page order. Each receives the `SectionContext` below.
7. `initCursor()`, `initPointer()` after first frame.

## 6. Module contracts

```ts
// src/core/env.ts
export type Tier = 'low' | 'mid' | 'high';
export interface Env {
  reducedMotion: boolean;   // matchMedia('(prefers-reduced-motion: reduce)')
  gl: boolean;              // WebGL2 context can be created
  touch: boolean;           // matchMedia('(hover: none) and (pointer: coarse)')
  finePointer: boolean;     // matchMedia('(hover: hover) and (pointer: fine)')
  dprCap: number;           // 1.5 low, 1.75 mid, 2 high
  tier: Tier;               // initial guess from hardwareConcurrency, deviceMemory, screen size, touch; adjusted later by quality.ts
}
export const env: Env;
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void;

// src/core/ticker.ts  (the ONLY RAF loop on the page = gsap.ticker)
export interface Tick { time: number; dt: number; frame: number } // seconds; dt clamped to [0, 1/20]
export type TickFn = (t: Tick) => void;
export const PRIORITY = { input: 0, scroll: 10, state: 20, glUpdate: 30, glRender: 40 } as const;
export function initTicker(): void;                       // gsap.ticker.lagSmoothing(0); adds one gsap.ticker listener. gsap.ticker is the only application loop; ScrollTrigger's internal empty rAF callback (gsap 3.15 Safari workaround) is accepted.
export function addTick(fn: TickFn, priority?: number): () => void;   // returns remove fn; stable order within a priority

// src/core/bus.ts  (typed event bus)
export interface Events {
  'loader:progress': number;         // 0..1
  'loader:done': void;
  'section:enter': SectionId;
  'section:leave': SectionId;
  'theme': 'paper' | 'ink';
  'quality': Tier;
  'formation': FormationId;
}
export const bus: { on<K extends keyof Events>(k: K, fn: (v: Events[K]) => void): () => void; emit<K extends keyof Events>(k: K, v: Events[K]): void };

// src/core/scroll.ts
export function initScroll(): void;                  // Lenis (unless reduced motion) synced to ticker at PRIORITY.scroll; ScrollTrigger.update on scroll
export const scrollState: { y: number; velocity: number; direction: 1 | -1; progress: number }; // velocity in px/s, smoothed
export function scrollToTarget(target: string | HTMLElement): void; // Lenis or native, honours reduced motion, moves focus for a11y

// src/core/ease.ts
export const E: Record<EaseName, string>;            // gsap ease names registered with CustomEase
export const ef: Record<EaseName, (t: number) => number>; // same curves as functions for GL math
export function registerEases(): void;

// src/core/timing.ts
export const T: { /* the 5-7-5 duration scale from direction.md, seconds */ };
export function weightedStagger(count: number, opts: { total: number; lead?: number; weight?: 'front' | 'back' | 'center' }): number[]; // non-uniform offsets in seconds

// src/core/pointer.ts
export const pointer: { x: number; y: number; sx: number; sy: number; vx: number; vy: number; inside: boolean }; // x,y in [-1,1] (y up); s* damped; v* per second
export function initPointer(): void;

// src/core/loader.ts
export function registerTask(name: string, weight: number, run: (report: (p: number) => void) => Promise<void>): void;
export function startLoading(): Promise<void>;      // emits 'loader:progress' and 'loader:done'; never reports progress ahead of reality; resolves on failure too (logs once, page still works)

// src/gl/stage.ts
export interface Stage {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; canvas: HTMLCanvasElement;
  size: { width: number; height: number; dpr: number };
  onResize(fn: (s: Stage['size']) => void): () => void;
  setRenderHook(fn: () => void): void;   // post.ts installs the composer render here; default renderer.render
}
export function createStage(canvas: HTMLCanvasElement): Stage; // throws if no WebGL2; caller checks env.gl first

// src/gl/blocks/formations.ts
export type { FormationId } from '../../core/types';   // FormationId lives in src/core/types.ts
export interface Pose { p: [number, number, number]; r: [number, number, number]; s: number }   // uniform scale (D15.3)
export const BLOCK_COUNT = 17;
export const ROWS = [5, 7, 5] as const;
export const FORMATIONS: Record<FormationId, Pose[]>;   // each array has exactly 17 poses, index i is the same block everywhere

// src/gl/blocks/blocks.ts
export class Blocks {
  constructor(stage: Stage, material: THREE.Material);
  readonly mesh: THREE.InstancedMesh;           // ONE draw call for all 17
  setTransition(from: FormationId, to: FormationId, t: number): void; // t 0..1, applies per-block delays from the stagger profile
  setVelocity(v: number): void;                 // feeds the smear uniform
  update(tick: Tick): void;                     // idle micro-motion and pointer tilt (damped)
}

// src/choreo/timeline.ts  (scroll-choreo)
export function initChoreo(ctx: { stage: Stage | null; blocks: Blocks | null; rig: Rig | null; background: Background | null }): void;
// Creates the ScrollTriggers that drive formations, camera keys and background ink per section. Emits 'theme' and 'formation'.
```

### 6b. Per-section 3D layer (the "one 3D owner per section" rule)

Each section's 3D or shader layer lives next to its 2D code, in its own file, owned by that section's three-scene or shader agent:

```
src/sections/<id>/gl.ts      three-scene or shader agent for <id>   imports from src/gl/** only; never imported by src/sections/<id>/<id>.ts
```

```ts
// src/gl/section-gl.ts  (three-scene, GL foundation task)
import type { SectionId, FormationId } from '../core/types';
export interface CameraKey { position: [number, number, number]; target: [number, number, number]; fov: number }
export interface GLWorld { stage: Stage; blocks: Blocks; lighting: Lighting; background: Background; post: Post; rig: Rig }
export interface SectionGLHandle { update(progress: number, tick: Tick): void; setActive(active: boolean): void; dispose(): void }
export interface SectionGL {
  id: SectionId;
  formation: FormationId;                       // the formation this section rests in
  ink: 0 | 1;                                   // background theme while the section is current
  camera(size: { width: number; height: number }): CameraKey;   // fit formulas from direction.md section 10
  dof: { focus: number; bokeh: number } | null; // null = DoF pass removed
  setup?(world: GLWorld): SectionGLHandle;      // extra objects (e.g. family phantom outlines); optional
}
export const SECTION_GL: readonly SectionGL[] // assembled by src/gl/boot.ts from src/sections/*/gl.ts, in page order
```

`src/choreo/timeline.ts` reads `SECTION_GL` and the section elements, and drives: formation transitions at section boundaries (scrubbed with `scrubLocal` and `ef.sym`), camera keys (interpolated with `ef.sym`), the ink-bleed front, DoF on/off, and each handle's `update(progress)`. `src/gl/boot.ts` (director) wires it all and registers the loader tasks.

```ts
// Section contract — every src/sections/<id>/<id>.ts exports exactly one init function
export interface SectionContext {
  el: HTMLElement;              // the <section id="<id>">
  reducedMotion: boolean;
  gl: boolean;
}
export function initHero(ctx: SectionContext): void;   // initSpeed, initCapabilities, ...
```

Sections never import from `src/gl/**`. 2D and 3D talk only through `bus` and `scrollState`. That keeps each section buildable and testable without WebGL.

## 7. Layering

- `<canvas id="gl">` is `position: fixed; inset: 0; z-index: 0; pointer-events: none; aria-hidden="true"`.
- `<main>` is `position: relative; z-index: 1`.
- Cursor layer `z-index: 50`, `pointer-events: none`.
- Skip link above all.

## 8. Reduced motion and no-WebGL contracts

- Reduced motion: no Lenis (native scroll), no scrubbed tweens, no parallax, no pointer tilt, no velocity effects, no custom cursor. Sections crossfade in (opacity only, T.beat5) when 20% visible. WebGL still renders, but each section's formation is set instantly behind a canvas opacity crossfade. Every text element is visible without JS.
- No WebGL: `html.no-gl`. The canvas is removed. A designed static version replaces each 3D moment: an inline SVG of the 17 blocks in that section's formation (front elevation, flat ink on paper), drawn by the section's motion-2d owner in its html partial inside `<div class="gl-fallback" aria-hidden="true">`, only displayed under `html.no-gl`.
- No JS: all copy readable, all links work, sections stacked with CSS backgrounds.

## 9. Performance budgets

- JS under 350 KB gzipped total (excluding fonts). GL code is a separate dynamic chunk.
- 3D assets: none expected (procedural). Fonts under 120 KB total woff2.
- One InstancedMesh for blocks, one fullscreen quad for the background, composer passes merged into as few EffectPasses as possible. Target under 15 draw calls per frame.
- DPR capped by tier. Quality watchdog steps down when the median frame time over 60 frames exceeds 18.5 ms, with 3 s hysteresis.

## 10a. Harness pages

Agents verify modules in isolation with harness pages: `harness/<task>.html` plus `harness/<task>.ts`, owned by the agent that writes them. Vite serves any HTML under the root in dev, so `http://127.0.0.1:<port>/harness/<task>.html` loads real modules. Harness pages are never part of the production build (the build input is index.html only). Each harness sets `document.documentElement.dataset.harness = 'pass'` or `'fail:<reason>'` when its checks finish, so a Playwright script can read the result.

## 10. Dev servers and ports

Each agent task is assigned its own port in its brief (5180-5199). The director uses 5173 (dev) and 4173 (preview). Screenshots go to `qa/shots/<pass>/<section>-<width>.png`.
