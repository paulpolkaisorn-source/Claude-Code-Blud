// Boot order (architecture section 5). Director-owned: wiring only, no section logic lives here.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

import { env } from './core/env';
import { registerEases } from './core/ease';
import { initTicker } from './core/ticker';
import { initScroll } from './core/scroll';
import { initPointer } from './core/pointer';
import { fontsTask, registerTask, startLoading } from './core/loader';
import type { SectionId } from './core/types';

/** What every section's init function receives (architecture section 6). */
export interface SectionContext {
  el: HTMLElement;
  reducedMotion: boolean;
  gl: boolean;
}

type SectionInit = (ctx: SectionContext) => void;

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

// Each section folder has an entry module named after the folder (src/sections/<id>/<id>.ts) that
// exports one init function. gl.ts files are excluded here: they belong to the lazily loaded GL chunk.
const modules = import.meta.glob<Record<string, unknown>>(['./sections/*/*.ts', '!./sections/*/gl.ts'], {
  eager: true,
});

function sectionInit(id: SectionId): SectionInit | null {
  const mod = modules[`./sections/${id}/${id}.ts`];
  if (!mod) return null;
  for (const [name, value] of Object.entries(mod)) {
    if (name.startsWith('init') && typeof value === 'function') return value as SectionInit;
  }
  return null;
}

function boot(): void {
  registerEases();
  initTicker();
  initScroll();
  initPointer();

  // Loader tasks (act I preloader weights: fonts 2, GL chunk 5, shader compile 2, environment 1).
  registerTask('fonts', 2, fontsTask(['Bodoni Moda Variable', 'Geist Mono Variable']));
  if (env.gl) {
    // The GL chunk is loaded once; the compile and environment tasks wait for it, so every task
    // reports only what has really happened.
    const chunk = import('./gl/boot');
    let resolveBooted: (value: import('./gl/boot').GLBoot | null) => void = () => undefined;
    const booted = new Promise<import('./gl/boot').GLBoot | null>((resolve) => {
      resolveBooted = resolve;
    });
    registerTask('gl-chunk', 5, async (report) => {
      try {
        const mod = await chunk;
        report(0.5);
        const canvas = document.getElementById('gl');
        resolveBooted(canvas instanceof HTMLCanvasElement ? mod.createWorld(canvas) : null);
      } catch (error) {
        // No working WebGL after all: the static fallbacks take over (architecture section 8).
        document.documentElement.classList.add('no-gl');
        resolveBooted(null);
        throw error;
      }
    });
    registerTask('shader-compile', 2, async () => {
      const world = await booted;
      if (world) await world.compile();
    });
    registerTask('environment', 1, async () => {
      const world = await booted;
      if (world) await world.environment();
    });
  }

  for (const id of ORDER) {
    const el = document.getElementById(id);
    const init = sectionInit(id);
    if (el && init) init({ el, reducedMotion: env.reducedMotion, gl: env.gl });
  }

  void startLoading();
  document.documentElement.dataset.boot = 'ok';
}

boot();
