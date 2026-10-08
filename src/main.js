// main.js — boot: create the long-lived modules, wire settings, start the game (Opus-owned glue).
import { bus, EV, SETTINGS_KEY, DEFAULT_SETTINGS, isMobile } from './contracts.js';
import { createRenderer } from './render/renderer.js';
import { createUI } from './ui/ui.js';
import { createInput } from './input/input.js';
import { createFX } from './fx/fx.js';
import { createAudio } from './audio/audio.js';
import { createGame } from './game.js';

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function bootError(err) {
  const el = document.getElementById('boot');
  if (!el) return;
  el.classList.remove('hide');
  el.innerHTML = '<div>BRAWL ARENA<div class="err"></div></div>';
  el.querySelector('.err').textContent = `Could not start the game.\n${err && err.message ? err.message : err}\n(WebGL2 and ES modules are required.)`;
}

function boot() {
  const canvas = document.getElementById('game');
  const params = new URLSearchParams(location.search);
  const mobile = params.has('mobile') || isMobile();
  if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 is not available in this browser.');

  const R = createRenderer(canvas, { mobile });
  const ui = createUI(document.getElementById('ui-root'), bus);
  const input = createInput({
    canvas, root: document.getElementById('input-layer'), bus, mobile,
    screenToGround: (sx, sy, out) => R.screenToGround(sx, sy, out),
  });
  const fx = createFX({
    scene: R.scene, bus, overlay: document.getElementById('fx-layer'),
    worldToScreen: (x, y, z, out) => R.worldToScreen(x, y, z, out),
  });
  const audio = createAudio(bus);

  const settings = loadSettings();
  const applySettings = (s) => {
    audio.setVolumes({ master: s.master, sfx: s.sfx, music: s.music });
    if (s.quality === 'auto') { R.setQuality('high'); R.autoQuality(true); }
    else { R.autoQuality(false); R.setQuality(s.quality === 'low' ? 'low' : 'high'); }
    fx.setQuality(s.quality === 'low' ? 'low' : 'high');
  };
  applySettings(settings);
  ui.setSettings(settings);
  bus.on(EV.UI_SETTINGS, (s) => {
    Object.assign(settings, s);
    applySettings(settings);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable: keep in memory */ }
  });
  bus.on(EV.QUALITY_CHANGE, ({ level }) => fx.setQuality(level));

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  const game = createGame({ R, ui, input, fx, audio, mobile });
  window.__BRAWL__ = {
    game, R, ui, input, fx, audio, bus, EV, settings, mobile,
    get state() { return game.state; },
    stats: () => R.stats(),
    ...game.debug,
  };
  game.start();
  document.getElementById('boot').classList.add('hide');
}

try { boot(); } catch (err) { console.error(err); bootError(err); }
