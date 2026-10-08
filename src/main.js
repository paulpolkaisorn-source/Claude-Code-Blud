import { App } from './engine/app.js';
import { Hud } from './ui/hud.js';
import { loadSettings } from './ui/settings.js';
import { STATION_DEFS } from './stations/index.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) {
    return false;
  }
}

function showUnsupported() {
  document.getElementById('start')?.classList.add('hidden');
  document.getElementById('nogl').hidden = false;
}

function boot() {
  if (!webglAvailable()) {
    showUnsupported();
    return;
  }
  const settings = loadSettings();
  const app = new App({
    canvas: document.getElementById('gl'),
    stage: document.getElementById('stage'),
    sheetHost: document.getElementById('sheet'),
    settings,
    ui: null,
    stationDefs: STATION_DEFS,
  });
  const hud = new Hud({ app, settings, defs: STATION_DEFS });
  app.ui = hud;
  try {
    app.init();
  } catch (err) {
    console.error(err);
    showUnsupported();
    return;
  }
  hud.showStart();
  window.velvetHours = { app };
}

boot();
