// Harness for the pricing section's 2D layer (architecture section 10a). The page is the section partial between two
// 100vh spacers, with no WebGL: the boot runs the same order as src/main.ts, then emits loader:done after the first
// tick, which starts the entrances. Playwright drives the scroll states and reads the console.
import { bus } from '../src/core/bus';
import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { PRIORITY, addTick, initTicker } from '../src/core/ticker';
import { initPricing } from '../src/sections/pricing/pricing';

registerEases();
initTicker();
initScroll();
initHover();

const section = document.getElementById('pricing');
if (section instanceof HTMLElement) {
  initPricing({ el: section, reducedMotion: env.reducedMotion, gl: false });
}

const off = addTick(() => {
  off();
  bus.emit('loader:done');
}, PRIORITY.input);
