import { animate } from 'animejs';
import { saveSettings } from './settings.js';
import { clamp } from '../utils/math.js';

const RING_R = 25;
const RING_C = 2 * Math.PI * RING_R;

// The 2D layer: station dock, title, flow ring, settings panel, start screen, wipe and toast.
export class Hud {
  constructor({ app, settings, defs }) {
    this.app = app;
    this.settings = settings;
    this.defs = defs;
    const $ = (id) => document.getElementById(id);
    this.el = {
      nameEl: $('station-name'),
      hintEl: $('station-hint'),
      dock: $('dock'),
      flow: $('flow'),
      flowArc: $('flow-arc'),
      flowLabel: $('flow-label'),
      qLabel: $('quality-label'),
      settingsBtn: $('settings-btn'),
      panel: $('settings'),
      start: $('start'),
      startBtn: $('start-btn'),
      toast: $('toast'),
      wipe: $('wipe'),
      kbd: $('kbd-cursor'),
      timeEl: $('time-spent'),
      vol: $('vol'),
      volOut: $('vol-out'),
      mute: $('mute'),
      reduce: $('reduce'),
      flowTog: $('flow-toggle'),
      sheet: $('sheet'),
    };
    this.stickyToast = false;
    this.toastTimer = null;
    this.lastTimeText = '';
    this.buildDock();
    this.bindSettings();
    this.el.flowArc.style.strokeDasharray = `${RING_C}`;
    this.el.flowArc.style.strokeDashoffset = `${RING_C}`;
    this.lastFlowShown = -1;
  }

  buildDock() {
    const dock = this.el.dock;
    dock.innerHTML = '';
    this.defs.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'station-btn';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', `${i + 1}. ${d.name}`);
      b.innerHTML = `<span class="glyph glyph-${d.id}" aria-hidden="true"></span><span class="label">${i + 1} · ${shortName(d.id)}</span>`;
      b.addEventListener('click', () => this.app.goTo(i));
      dock.appendChild(b);
    });
  }

  setStation(i, def) {
    this.el.nameEl.textContent = def.name;
    this.el.hintEl.textContent = def.hint;
    this.el.dock.querySelectorAll('.station-btn').forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    this.el.sheet.classList.toggle('show', def.id === 'bubble');
  }

  setQualityLabel(label) {
    this.el.qLabel.textContent = label;
    this.el.panel.querySelectorAll('[data-q]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.q === this.app.quality.mode));
    });
  }

  message(text, { sticky = false } = {}) {
    clearTimeout(this.toastTimer);
    this.stickyToast = sticky;
    this.el.toast.textContent = text;
    this.el.toast.classList.toggle('show', !!text);
    if (text && !sticky) {
      this.toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), 2400);
    }
  }

  // Dark curtain across the stage. onMid swaps stations under cover; onDone runs after it clears.
  wipe(onMid, onDone) {
    const el = this.el.wipe;
    const reduce = this.app.reduce;
    animate(el, {
      translateX: ['-101%', '0%'],
      duration: reduce ? 160 : 380,
      ease: 'inCubic',
      onComplete: () => {
        onMid();
        animate(el, {
          translateX: ['0%', '101%'],
          duration: reduce ? 160 : 540,
          ease: 'outCubic',
          onComplete: () => {
            el.style.transform = 'translateX(-101%)';
            onDone();
          },
        });
      },
    });
  }

  // Flow meter: glows as rhythm builds, eased in the render loop.
  updateFlow(level, quality) {
    const on = this.settings.flowMeter;
    this.el.flow.classList.toggle('off', !on);
    if (!on) return;
    this.el.flowArc.style.strokeDashoffset = (RING_C * (1 - clamp(level, 0, 1))).toFixed(2);
    this.el.flow.style.setProperty('--flow', clamp(level, 0, 1).toFixed(3));
    const label = level > 0.6 ? 'In flow' : level > 0.2 ? 'Warming' : 'Still';
    if (label !== this.el.flowLabel.textContent) this.el.flowLabel.textContent = label;
    this.updateTime();
  }

  updateTime() {
    const secs = Math.floor(this.settings.timeSpent || 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const text = `${h}h ${String(m).padStart(2, '0')}m`;
    if (text !== this.lastTimeText) {
      this.lastTimeText = text;
      this.el.timeEl.textContent = text;
    }
  }

  // Virtual cursor for keyboard play, shown only once arrow keys are used.
  updateCursor(kbd, w, h) {
    const el = this.el.kbd;
    el.classList.toggle('show', kbd.visible && this.app.started);
    if (!kbd.visible) return;
    el.style.transform = `translate(${(kbd.nx * w).toFixed(1)}px, ${(kbd.ny * h).toFixed(1)}px)`;
    el.classList.toggle('down', kbd.down);
  }

  persist() {
    saveSettings(this.settings);
  }

  showStart() {
    this.el.start.classList.remove('hidden');
  }

  hideStart() {
    const el = this.el.start;
    const reduce = this.app.reduce;
    animate(el, {
      opacity: [1, 0],
      duration: reduce ? 150 : 900,
      ease: 'outQuad',
      onComplete: () => el.classList.add('hidden'),
    });
  }

  togglePanel(open) {
    const p = this.el.panel;
    const btn = this.el.settingsBtn;
    if (open) {
      p.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      animate(p, { opacity: [0, 1], translateY: [12, 0], duration: this.app.reduce ? 0 : 320, ease: 'outCubic' });
      this.el.panel.querySelector('button, input')?.focus({ preventScroll: true });
    } else {
      btn.setAttribute('aria-expanded', 'false');
      animate(p, {
        opacity: [1, 0],
        translateY: [0, 12],
        duration: this.app.reduce ? 0 : 220,
        ease: 'inQuad',
        onComplete: () => {
          p.hidden = true;
        },
      });
      btn.focus({ preventScroll: true });
    }
  }

  bindSettings() {
    const s = this.settings;
    const app = this.app;
    const e = this.el;

    e.settingsBtn.addEventListener('click', () => this.togglePanel(e.panel.hidden));
    e.panel.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.togglePanel(false);
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !e.panel.hidden) this.togglePanel(false);
    });

    e.panel.querySelectorAll('[data-q]').forEach((b) => {
      b.addEventListener('click', () => {
        const mode = b.dataset.q;
        s.quality = mode;
        app.quality.setMode(mode);
        this.persist();
      });
    });

    e.vol.value = String(s.volume);
    e.volOut.textContent = `${Math.round(s.volume * 100)}%`;
    e.vol.addEventListener('input', () => {
      s.volume = parseFloat(e.vol.value);
      e.volOut.textContent = `${Math.round(s.volume * 100)}%`;
      app.audio.setVolume(s.volume);
      this.persist();
    });

    const syncMute = () => {
      e.mute.setAttribute('aria-pressed', String(s.muted));
      e.mute.textContent = s.muted ? 'Unmute' : 'Mute';
    };
    syncMute();
    e.mute.addEventListener('click', () => {
      s.muted = !s.muted;
      app.audio.setMuted(s.muted);
      syncMute();
      this.persist();
    });

    e.panel.querySelectorAll('[data-mix]').forEach((input) => {
      const key = input.dataset.mix;
      input.value = String(s.mix[key]);
      input.addEventListener('input', () => {
        s.mix[key] = parseFloat(input.value);
        app.audio.setMix(key, s.mix[key]);
        this.persist();
      });
    });

    e.reduce.checked = s.reduceEffects;
    e.reduce.addEventListener('change', () => {
      s.reduceEffects = e.reduce.checked;
      app.applyQuality();
      this.persist();
    });

    e.flowTog.checked = s.flowMeter;
    e.flowTog.addEventListener('change', () => {
      s.flowMeter = e.flowTog.checked;
      this.persist();
    });

    e.startBtn.addEventListener("click", () => {
      app.begin();
      this.hideStart();
    }, { once: true });
    this.updateTime();
  }
}

function shortName(id) {
  return { sand: 'Sand', crystal: 'Glass', slime: 'Slime', bubble: 'Bubbles' }[id] || id;
}
