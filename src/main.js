// Hush — app shell: splash, hub, settings, HUD, and game lifecycle.

import { AudioEngine, Pad } from './audio.js';
import { GAMES } from './games/index.js';
import { safeStorage, clamp } from './util.js';
import { makeProfile, detectAuto, getGpuInfo, LABELS, DESCRIPTIONS, SCALE_MODES } from './gfx.js';

const $ = (sel) => document.querySelector(sel);
const store = safeStorage();

// ---------- settings ----------
const defaults = { volume: 0.8, muted: false, haptics: true, ambience: true, quality: 'auto', renderScale: 'adaptive' };
let saved = {};
try { saved = JSON.parse(store.getItem('hush:settings') || '{}'); } catch (_) { /* ignore */ }
const settings = { ...defaults, ...saved };
const persist = () => store.setItem('hush:settings', JSON.stringify(settings));
// older saves used 'high' / 'low' only; those names still exist in the new scale
let autoLevel = null;
const resolveLevel = () => {
  if (settings.quality === 'auto') return (autoLevel ??= detectAuto());
  return LABELS[settings.quality] ? settings.quality : 'high';
};
const resolveGfx = () => makeProfile(resolveLevel(), settings.renderScale);

const audio = new AudioEngine(settings);
window.__hush = { audio, settings }; // handy for debugging / tests

// ---------- screens ----------
const screens = { splash: $('#splash'), hub: $('#hub'), stage: $('#stage') };
let currentScreen = null;
function showScreen(name) {
  if (currentScreen === name) return;
  currentScreen = name;
  for (const [k, el] of Object.entries(screens)) {
    if (k === name) {
      el.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    } else if (!el.hidden) {
      el.classList.remove('show');
      setTimeout(() => { if (currentScreen !== k) el.hidden = true; }, 650);
    }
  }
}

// ---------- icons ----------
const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function refreshMuteButtons() {
  for (const b of [$('#btn-mute'), $('#btn-mute-hub')]) {
    b.innerHTML = settings.muted ? ICON_OFF : ICON_ON;
    b.setAttribute('aria-label', settings.muted ? 'Unmute' : 'Mute');
  }
}
function toggleMute() {
  settings.muted = !settings.muted;
  persist();
  audio.applyVolume();
  refreshMuteButtons();
}
$('#btn-mute').addEventListener('click', toggleMute);
$('#btn-mute-hub').addEventListener('click', toggleMute);
refreshMuteButtons();

// ---------- hub ----------
const grid = $('#grid');
GAMES.forEach((g, i) => {
  const card = document.createElement('button');
  card.className = 'card';
  card.type = 'button';
  card.dataset.kind = g.kind;
  card.style.setProperty('--i', i);
  card.style.setProperty('--accent', g.accent);
  card.innerHTML = `<div class="art">${g.art}<span class="badge">${g.kind}</span></div><div class="meta"><h3>${g.title}</h3><p>${g.tagline}</p></div>`;
  card.addEventListener('click', () => {
    audio.burst(hubBus ?? ensureHubBus(), { dur: 0.05, gain: 0.12, freq: 3200, q: 1.5 });
    location.hash = g.id;
  });
  grid.appendChild(card);
});
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    const f = chip.dataset.filter;
    grid.querySelectorAll('.card').forEach((card, i) => {
      const show = f === 'all' || card.dataset.kind === f;
      card.hidden = !show;
      if (show) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; card.style.setProperty('--i', i % 6); }
    });
  });
});

// Hub ambience
let hubBus = null;
let hubPad = null;
function ensureHubBus() {
  if (!hubBus) hubBus = audio.createBus({ gain: 1 });
  return hubBus;
}
const HUB_CHORDS = [
  [50, 57, 62, 64, 69],
  [48, 55, 60, 64, 67],
  [53, 57, 60, 64, 69],
  [45, 52, 57, 60, 64],
];
function startHubAmbience() {
  if (!audio.ready || hubPad || !settings.ambience) return;
  hubPad = new Pad(audio, ensureHubBus(), { chords: HUB_CHORDS, gain: 0.085, cutoff: 1400, period: 16 });
}
function stopHubAmbience() {
  hubPad?.stop(1.2);
  hubPad = null;
}

// ---------- HUD ----------
const hudEl = $('#hud');
const hintEl = $('#hud-hint');
const toolsEl = $('#hud-tools');
let hintTimer = 0;
let idleTimer = 0;

function wakeHud() {
  hudEl.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!hudEl.matches(':hover') && !hudEl.contains(document.activeElement)) hudEl.classList.add('idle');
    else wakeHud();
  }, 3600);
}
$('#game-root').addEventListener('pointerdown', wakeHud, true);
$('#game-root').addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || Math.abs(e.movementX) + Math.abs(e.movementY) > 6) wakeHud(); }, true);
hudEl.addEventListener('pointermove', wakeHud);
window.addEventListener('keydown', wakeHud);

function makeHud() {
  const api = {
    setHint(text, ms = 7000) {
      clearTimeout(hintTimer);
      hintEl.textContent = text;
      hintEl.classList.toggle('show', !!text);
      if (text && ms) hintTimer = setTimeout(() => hintEl.classList.remove('show'), ms);
    },
    setStat(text) { $('#hud-stat').textContent = text ?? ''; },
    segmented({ label, options, value, onChange }) {
      const el = document.createElement('div');
      el.className = 'seg';
      el.setAttribute('role', 'group');
      if (label) {
        const l = document.createElement('span');
        l.className = 'seg-label';
        l.textContent = label;
        el.appendChild(l);
      }
      const btns = new Map();
      const set = (id) => btns.forEach((b, k) => { b.classList.toggle('on', k === id); b.setAttribute('aria-pressed', k === id); });
      for (const o of options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.label;
        b.addEventListener('click', () => { set(o.id); onChange(o.id); });
        btns.set(o.id, b);
        el.appendChild(b);
      }
      set(value);
      toolsEl.appendChild(el);
      return { el, set };
    },
    button({ label, onClick, title }) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn';
      b.textContent = label;
      if (title) b.title = title;
      b.addEventListener('click', onClick);
      toolsEl.appendChild(b);
      return b;
    },
    swatches({ colors, value = 0, onChange }) {
      const el = document.createElement('div');
      el.className = 'swatches';
      const btns = colors.map((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.style.background = c;
        b.style.color = c;
        b.setAttribute('aria-label', `Color ${i + 1}`);
        b.addEventListener('click', () => { set(i); onChange(i); });
        el.appendChild(b);
        return b;
      });
      const set = (i) => btns.forEach((b, k) => b.classList.toggle('on', k === i));
      set(value);
      toolsEl.appendChild(el);
      return { el, set };
    },
    clear() {
      toolsEl.innerHTML = '';
      hintEl.classList.remove('show');
      hintEl.textContent = '';
      $('#hud-stat').textContent = '';
      clearTimeout(hintTimer);
    },
  };
  return api;
}
const hud = makeHud();

// ---------- game lifecycle ----------
let current = null;
let openToken = 0;

async function openGame(id) {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) return goHub();
  const token = ++openToken;
  fpsWarned = false;
  fpsStart = 0;
  await closeGame();
  stopHubAmbience();
  await audio.unlock();
  $('#hud-title').textContent = meta.title;
  hud.clear();
  const loading = $('#loading');
  loading.hidden = false;
  showScreen('stage');
  wakeHud();
  let mod;
  try {
    mod = await meta.load();
  } catch (err) {
    console.error(err);
    loading.hidden = true;
    hud.setHint('Could not load this game.', 4000);
    return;
  }
  if (token !== openToken) return;
  const root = $('#game-root');
  const bus = audio.ready ? audio.createBus({ gain: 1 }) : null;
  const gfx = resolveGfx();
  const env = { audio, bus, settings, root, hud, gfx, quality: gfx.legacy, meta };
  try {
    const instance = await mod.create(env);
    if (token !== openToken) { instance?.destroy?.(); bus?.dispose(); return; }
    current = { instance, bus, meta };
  } catch (err) {
    console.error(err);
    hud.setHint('This game needs WebGL or Canvas support that your browser is missing.', 8000);
  }
  loading.hidden = true;
}

async function closeGame() {
  if (!current) return;
  const { instance, bus } = current;
  current = null;
  try { instance?.destroy?.(); } catch (err) { console.error(err); }
  bus?.dispose(0.15);
  $('#game-root').innerHTML = '';
  hud.clear();
}

function goHub() {
  openToken++;
  closeGame();
  showScreen('hub');
  startHubAmbience();
}

// ---------- routing ----------
function route() {
  if (currentScreen === 'splash' || currentScreen === null) return;
  const id = location.hash.replace('#', '');
  if (id) openGame(id);
  else goHub();
}
window.addEventListener('hashchange', route);
$('#btn-back').addEventListener('click', () => {
  if (location.hash) history.length > 1 ? history.back() : (location.hash = '');
  else goHub();
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#settings').hidden) closeSettings();
  else if (currentScreen === 'stage') $('#btn-back').click();
});

// ---------- fullscreen ----------
$('#btn-full').addEventListener('click', () => {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen?.();
  else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el).catch?.(() => {});
});
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $('#btn-full').hidden = true;

// ---------- settings modal ----------
const modal = $('#settings');
const volume = $('#set-volume');
const ambience = $('#set-ambience');
const haptics = $('#set-haptics');
const quality = $('#set-quality');
const qualityDesc = $('#quality-desc');
const scaleSel = $('#set-scale');
for (const [k, label] of Object.entries(SCALE_MODES)) scaleSel.add(new Option(label, k));
const gpuInfoEl = $('#gpu-info');
const describeGpu = () => {
  const g = getGpuInfo();
  const note = g.kind === 'integrated'
    ? ' This looks like integrated graphics. On a laptop with an NVIDIA/AMD GPU, set Windows Settings > System > Display > Graphics > your browser > High performance, then restart the browser.'
    : g.kind === 'software' ? ' Software rendering detected: enable hardware acceleration in your browser settings.' : '';
  return `Rendering on: ${g.name}.${note}`;
};
const refreshQualityUI = () => {
  const key = quality.value;
  qualityDesc.textContent = key === 'auto' ? `${DESCRIPTIONS.auto} Currently: ${LABELS[resolveLevel()]}.` : DESCRIPTIONS[key];
  gpuInfoEl.textContent = describeGpu();
  $('#gfx-label').textContent = settings.quality === 'auto' ? `Auto · ${LABELS[resolveLevel()]}` : LABELS[settings.quality];
};
let qualityAtOpen = '';
let scaleAtOpen = '';
function openSettings() {
  qualityAtOpen = settings.quality;
  scaleAtOpen = settings.renderScale;
  volume.value = settings.volume;
  ambience.checked = settings.ambience;
  haptics.checked = settings.haptics;
  quality.value = LABELS[settings.quality] || settings.quality === 'auto' ? settings.quality : 'high';
  scaleSel.value = SCALE_MODES[settings.renderScale] ? settings.renderScale : 'adaptive';
  refreshQualityUI();
  modal.hidden = false;
  volume.focus();
}
function closeSettings() {
  modal.hidden = true;
  if (currentScreen === 'stage') {
    // graphics changes need a fresh renderer: restart the current game
    if ((settings.quality !== qualityAtOpen || settings.renderScale !== scaleAtOpen) && current) openGame(current.meta.id);
    else $('#btn-gfx').focus();
  } else {
    $('#btn-settings').focus();
  }
}
$('#btn-settings').addEventListener('click', openSettings);
$('#btn-gfx').addEventListener('click', openSettings);
$('#settings-close').addEventListener('click', closeSettings);
modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeSettings(); });
volume.addEventListener('input', () => {
  settings.volume = clamp(parseFloat(volume.value), 0, 1);
  if (settings.volume > 0 && settings.muted) { settings.muted = false; refreshMuteButtons(); }
  audio.applyVolume();
  persist();
});
volume.addEventListener('change', () => {
  if (audio.ready) audio.bell(ensureHubBus(), { freq: 784, gain: 0.12, decay: 1.4, vel: 0.5 });
});
ambience.addEventListener('change', () => {
  settings.ambience = ambience.checked;
  persist();
  if (settings.ambience) { if (currentScreen === 'hub') startHubAmbience(); } else stopHubAmbience();
  window.dispatchEvent(new CustomEvent('hush:ambience', { detail: settings.ambience }));
});
haptics.addEventListener('change', () => { settings.haptics = haptics.checked; persist(); });
quality.addEventListener('change', () => { settings.quality = quality.value; persist(); refreshQualityUI(); });
scaleSel.addEventListener('change', () => { settings.renderScale = scaleSel.value; persist(); });

// ---------- performance watchdog ----------
// Shows live fps next to the graphics level, and if a game stays under ~30 fps explains why / what to do.
let fpsFrames = 0;
let fpsStart = 0;
let fpsWarned = false;
let slowSeconds = 0;
function fpsTick(now) {
  requestAnimationFrame(fpsTick);
  if (currentScreen !== 'stage' || document.hidden || !current) { fpsFrames = 0; fpsStart = 0; slowSeconds = 0; return; }
  if (!fpsStart) { fpsStart = now; fpsFrames = 0; return; }
  fpsFrames++;
  const el = now - fpsStart;
  if (el >= 1000) {
    const fps = Math.round((fpsFrames * 1000) / el);
    const base = settings.quality === 'auto' ? `Auto · ${LABELS[resolveLevel()]}` : LABELS[settings.quality];
    $('#gfx-label').textContent = `${base} · ${fps} fps`;
    slowSeconds = fps < 30 ? slowSeconds + 1 : Math.max(0, slowSeconds - 1);
    if (slowSeconds >= 8 && !fpsWarned) {
      fpsWarned = true;
      const g = getGpuInfo();
      hud.setHint(g.kind === 'discrete'
        ? `Running at ~${fps} fps. Lower the graphics level or resolution scaling (top-right button).`
        : `Running at ~${fps} fps on ${g.name}. If this machine has a faster GPU, set your browser to use it (Windows Settings > Display > Graphics > High performance). Otherwise lower the graphics level.`, 12000);
      wakeHud();
    }
    fpsStart = now;
    fpsFrames = 0;
  }
}
requestAnimationFrame(fpsTick);

// ---------- boot ----------
refreshQualityUI();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else audio.resume();
});

$('#begin').addEventListener('click', async () => {
  await audio.unlock();
  const id = location.hash.replace('#', '');
  if (id && GAMES.some((g) => g.id === id)) {
    openGame(id);
  } else {
    showScreen('hub');
    startHubAmbience();
  }
  if (audio.ready) audio.bell(ensureHubBus(), { freq: 523.25, gain: 0.14, decay: 2.2, vel: 0.5 });
});

showScreen('splash');
$('#begin').focus({ preventScroll: true });
