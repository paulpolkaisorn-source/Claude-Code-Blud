// Harness for the preloader section's 2D layer (architecture section 10a). Open /harness/section-preloader.html.
// Default: the loader finishes on its own. After the first tick it emits loader:progress 1, then loader:done, as the
// real loader does when its last task settles. ?hold: nothing is emitted, and the Playwright driver calls
// window.harness.progress(p) and window.harness.done(). ?nogl makes head-env set no-gl, so env.gl is false.
// Reduced motion comes from the browser's preference. The harness records performance.now() at loader:done and at
// the first frame on which the layer is hidden, so the driver can check the handoff length.
import { registerEases } from '../src/core/ease';
import { addTick, initTicker } from '../src/core/ticker';
import { initScroll } from '../src/core/scroll';
import { initHover } from '../src/core/hover';
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { initPreloader } from '../src/sections/preloader/preloader';

interface HarnessApi {
  progress(value: number): void;
  done(): void;
  timings(): { doneAt: number | null; hiddenAt: number | null };
}

registerEases();
initTicker();
initScroll();
initHover();

const section = document.getElementById('preloader');
const layer = section?.querySelector<HTMLElement>('[data-layer]') ?? null;
if (!section || !layer) throw new Error('harness: #preloader or its layer is missing');

const flags = new URLSearchParams(window.location.search);

let doneAt: number | null = null;
let hiddenAt: number | null = null;

bus.once('loader:done', () => {
  doneAt = performance.now();
});

addTick(() => {
  if (doneAt !== null && hiddenAt === null && layer.hidden) hiddenAt = performance.now();
});

initPreloader({ el: section, reducedMotion: env.reducedMotion, gl: env.gl });

if (!flags.has('hold')) {
  const removeFirst = addTick(() => {
    removeFirst();
    bus.emit('loader:progress', 1);
    bus.emit('loader:done');
  });
}

const api: HarnessApi = {
  progress: (value: number): void => {
    bus.emit('loader:progress', value);
  },
  done: (): void => {
    bus.emit('loader:done');
  },
  timings: () => ({ doneAt, hiddenAt }),
};
(window as unknown as { harness: HarnessApi }).harness = api;

document.documentElement.dataset.harness = 'ready';
