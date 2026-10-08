// ui.js - createUI(root, bus) -> U. Screen navigation, settings, fake matchmaking and all button wiring.
// Every button emits EV.UI_CLICK plus its own EV.UI_*. Menu/select/settings/pause/results navigation is local;
// the caller drives the match flow: U.matchmaking() after UI_START or UI_AGAIN, U.show('hud') after UI_MATCH_READY,
// U.showResults(r) when the match ends.
import { EV, BRAWLERS, BOT_NAMES, TEAM_COLORS, PLAYER_COLOR, SETTINGS_KEY, DEFAULT_SETTINGS } from '../contracts.js';
import { createHUD } from './hud.js';
import { buildScreens, markCard, markMap, markQuality, setSliderUI, mmBuild, mmFill, fillResults, hex, SX } from './screens.js';

const MODE_LABEL = { crystal: 'CRYSTAL RUSH 3v3', training: 'TRAINING 1v1' };
const MAP_IDS = ['canyon', 'lagoons', 'random'];
const QUALITY = ['auto', 'high', 'low'];
const SLIDERS = ['master', 'sfx', 'music'];
const MM_FILL_END = 0.7; // bots finish filling this fraction of the matchmaking time
const MM_TICK_MS = 50;   // matchmaking is UI timing, so it ticks on timers, not on the render loop

const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);

function ensureCss() {
  if (document.querySelector('link[href$="styles/ui.css"], style[data-ui-css]')) return;   // linked, or inlined by the standalone build
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../../styles/ui.css', import.meta.url).href;
  document.head.appendChild(link);
}

function sanitize(dst, src) {
  if (!src || typeof src !== 'object') return dst;
  for (const k of SLIDERS) {
    const v = Number(src[k]);
    if (Number.isFinite(v)) dst[k] = clamp01(v);
  }
  if (QUALITY.indexOf(src.quality) >= 0) dst.quality = src.quality;
  return dst;
}

function loadSettings() {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) sanitize(s, JSON.parse(raw));
  } catch (e) {
    // Storage blocked or corrupt: keep defaults.
  }
  return s;
}

function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) {
    // Storage blocked: settings still apply for this session.
  }
}

export function createUI(root, bus) {
  ensureCss();
  const wrap = document.createElement('div');
  wrap.className = 'ui-root';
  wrap.style.setProperty('--t0', hex(TEAM_COLORS[0]));
  wrap.style.setProperty('--t1', hex(TEAM_COLORS[1]));
  wrap.style.setProperty('--me', hex(PLAYER_COLOR));
  root.appendChild(wrap);
  const R = buildScreens(wrap);
  const hud = createHUD(wrap);

  const settings = loadSettings();
  let cur = '';
  let prev = 'menu';
  let mode = 'crystal';
  let brawlerId = 'rivet';
  let mapId = 'canyon';
  let mm = null; // matchmaking state while the timer runs

  function setModeLabels() {
    for (const el of wrap.querySelectorAll('.mode-lbl')) el.textContent = MODE_LABEL[mode];
  }

  function show(name) {
    if (name !== 'hud' && !R.screens[name]) return;
    if (name === cur) return;
    if (name === 'settings') prev = cur;
    if (cur === 'matchmaking') stopMM();
    cur = name;
    for (const k in R.screens) R.screens[k].classList.toggle('active', k === name);
    wrap.dataset.screen = name;
    wrap.classList.toggle('in-match', name === 'hud' || name === 'pause' || (name === 'settings' && prev === 'pause'));
  }

  function setSelected(id) {
    if (!BRAWLERS[id]) return;
    brawlerId = id;
    markCard(R, id);
    R.previewName.textContent = BRAWLERS[id].name;
  }

  function setMap(id) {
    if (MAP_IDS.indexOf(id) < 0) return;
    mapId = id;
    markMap(R, id);
  }

  function play(m) {
    mode = m;
    setModeLabels();
    bus.emit(EV.UI_PLAY, { mode: m });
    show('select');
  }

  function select(id) {
    if (!BRAWLERS[id]) return;
    setSelected(id);
    bus.emit(EV.UI_SELECT, { brawlerId: id });
  }

  function persistAndEmit() {
    saveSettings(settings);
    bus.emit(EV.UI_SETTINGS, { master: settings.master, sfx: settings.sfx, music: settings.music, quality: settings.quality });
  }

  function pickQuality(q) {
    if (QUALITY.indexOf(q) < 0) return;
    settings.quality = q;
    markQuality(R, q);
    persistAndEmit();
  }

  function onClick(e) {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn || !wrap.contains(btn)) return;
    bus.emit(EV.UI_CLICK, {});
    switch (btn.dataset.act) {
      case 'play-crystal': return play('crystal');
      case 'play-training': return play('training');
      case 'open-settings': return show('settings');
      case 'back-menu': return show('menu');
      case 'select': return select(btn.dataset.brawler);
      case 'map': return setMap(btn.dataset.map);
      case 'start': return bus.emit(EV.UI_START, { brawlerId, mode, mapId });
      case 'hud-pause': bus.emit(EV.UI_PAUSE, {}); return show('pause');
      case 'resume': bus.emit(EV.UI_RESUME, {}); return show('hud');
      case 'pause-settings': return show('settings');
      case 'quit': bus.emit(EV.UI_QUIT, {}); return show('menu');
      case 'settings-back': return show(prev === 'pause' ? 'pause' : 'menu');
      case 'quality': return pickQuality(btn.dataset.q);
      case 'again': return bus.emit(EV.UI_AGAIN, {});
      case 'results-menu': bus.emit(EV.UI_MENU, {}); return show('menu');
      default: return;
    }
  }

  function onInput(e) {
    const t = e.target;
    const key = t && t.dataset ? t.dataset.set : undefined;
    if (SLIDERS.indexOf(key) < 0) return;
    settings[key] = clamp01(Number(t.value));
    setSliderUI(R, key, settings[key]);
    persistAndEmit();
  }

  // ---- fake matchmaking: slot 0 is the player; bots fill slots, then the countdown emits UI_MATCH_READY ----
  function stopMM() {
    if (mm) {
      clearTimeout(mm.timer);
      mm = null;
    }
  }

  function mmTick() {
    if (!mm) return;
    const el = (performance.now() - mm.t0) / 1000;
    const total = mm.secs;
    while (mm.next < mm.n && el >= (total * MM_FILL_END * mm.next) / (mm.n - 1)) {
      mmFill(R, mm.next, mm.list ? mm.list[mm.next].name : BOT_NAMES[mm.next] || 'Player');
      mm.next++;
    }
    const remain = total - el;
    const sec = remain > 0 ? Math.ceil(remain) : 0;
    if (sec !== mm.cnt) { mm.cnt = sec; R.mm.count.textContent = sec; }
    const q = total > 0 ? Math.round(clamp01(el / total) * 100) : 100;
    if (q !== mm.bar) { mm.bar = q; R.mm.fill.style.transform = SX[q]; }
    if (remain <= 0) {
      mm = null;
      bus.emit(EV.UI_MATCH_READY, {});
      return;
    }
    mm.timer = setTimeout(mmTick, MM_TICK_MS);
  }

  function matchmaking(seconds, players) {
    stopMM();
    const list = Array.isArray(players) ? players : null;   // [{ name, ... }] roster, or a plain player count
    const n = Math.max(2, Math.min(8, list ? list.length : players | 0));
    hud.reset();
    show('matchmaking');
    setModeLabels();
    mmBuild(R, n);
    mmFill(R, 0, list ? list[0].name : 'YOU');
    const secs = seconds > 0 ? seconds : 0;
    R.mm.count.textContent = Math.ceil(secs);
    R.mm.fill.style.transform = SX[0];
    mm = { t0: performance.now(), secs, n, next: 1, cnt: -1, bar: -1, timer: 0, list };
    mm.timer = setTimeout(mmTick, 0);
  }

  function showResults(r) {
    stopMM();
    fillResults(R, r || {});
    show('results');
  }

  function setSettings(s) {
    sanitize(settings, s);
    for (const k of SLIDERS) setSliderUI(R, k, settings[k]);
    markQuality(R, settings.quality);
  }

  function getSettings() {
    return { master: settings.master, sfx: settings.sfx, music: settings.music, quality: settings.quality };
  }

  wrap.addEventListener('click', onClick);
  wrap.addEventListener('input', onInput);

  for (const k of SLIDERS) setSliderUI(R, k, settings[k]);
  markQuality(R, settings.quality);
  setModeLabels();
  setSelected(brawlerId);
  markMap(R, mapId);
  show('menu');

  return {
    show,
    previewCanvas: R.previewCanvas,
    setSelected,
    matchmaking,
    hud,
    showResults,
    setSettings,
    getSettings,
  };
}
