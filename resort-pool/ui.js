// Control card wiring. The app passes callbacks; this module owns only DOM state.
import { BODY_TYPES, MODES } from './pool-config.js';

const $ = (id) => document.getElementById(id);
const NOTES = {
  waves: 'Surface waves with floating bodies that bob and drift.',
  spray: 'Waves plus splash spray thrown up by impacts and rain.',
  particles: 'A true 3D particle fluid (FLIP). Heavier on the processor.',
};

export function bindUI(api) {
  const panel = $('panel'), body = $('panelBody'), toggle = $('panelToggle');
  const setOpen = (open) => {
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Hide controls' : 'Show controls');
  };
  toggle.addEventListener('click', () => setOpen(body.hidden));
  const narrow = window.matchMedia('(max-width: 640px)');
  setOpen(!narrow.matches);

  for (const m of MODES) {
    $('mode-' + m).addEventListener('change', (e) => { if (e.target.checked) api.setMode(m); });
  }
  $('show-particles').addEventListener('change', (e) => api.showParticles(e.target.checked));
  for (const t of BODY_TYPES) $('drop-' + t).addEventListener('click', () => api.spawn(t));
  $('clear-bodies').addEventListener('click', () => api.clearBodies());
  $('reset-water').addEventListener('click', () => api.resetWater());

  const slider = (id, fmt, fn) => {
    const el = $(id), out = $(id + '-out');
    const upd = () => { out.textContent = fmt(+el.value); fn(+el.value); };
    el.addEventListener('input', upd);
    out.textContent = fmt(+el.value);
    return el;
  };
  slider('rain', (v) => Math.round(v * 100) + '%', api.setRain);
  slider('wind', (v) => Math.round(v * 100) + '%', api.setWind);
  const clock = (h) => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return String(mm === 60 ? hh + 1 : hh).padStart(2, '0') + ':' + String(mm === 60 ? 0 : mm).padStart(2, '0');
  };
  slider('tod', clock, api.setHour);

  for (const q of ['low', 'medium', 'high']) {
    $('q-' + q).addEventListener('change', (e) => { if (e.target.checked) api.setQuality(q); });
  }
  const cams = { terrace: 'cam-terrace', deep: 'cam-deep', low: 'cam-low', sundeck: 'cam-sundeck', aerial: 'cam-aerial' };
  for (const k in cams) $(cams[k]).addEventListener('click', () => api.camera(k));

  return {
    setModeUI(m) {
      $('mode-' + m).checked = true;
      $('modeNote').textContent = NOTES[m];
      $('showParticlesRow').hidden = m !== 'particles';
    },
    setQualityUI(q) { $('q-' + q).checked = true; },
    setFps(text) { $('fps').textContent = text; },
    setNote(text) { $('modeNote').textContent = text; },
    clock,
    panel,
  };
}
