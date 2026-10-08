// audio.js — audio module. WebAudio graph: sfx + music buses -> master -> DynamicsCompressor -> destination.
// SFX voice pool (24 max, oldest stolen first, same-sound throttle 30 ms, finished voices disconnected).
// Auto-plays SFX from bus events. Music engine lives in music.js. Plain factory: createAudio(bus) -> A.
import { EV, DEFAULT_SETTINGS } from '../contracts.js';
import { createSynth, newVoice, releaseVoice, renderSfx, hasSfx } from './synth.js';
import { createMusic } from './music.js';

const MAX_VOICES = 24;
const SAME_SOUND_MS = 30;
const HIT_MS = 50;
const SHOT_SFX = { rivet: 'shot_rivet', pip: 'shot_pip', mortara: 'shot_mortara', lumen: 'shot_lumen' };
const GESTURES = ['pointerdown', 'keydown', 'touchend'];
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function createAudio(bus) {
  let ctx = null;
  let S = null;
  let masterG = null;
  let sfxG = null;
  let musicG = null;
  let music = null;
  const vol = { master: DEFAULT_SETTINGS.master, sfx: DEFAULT_SETTINGS.sfx, music: DEFAULT_SETTINGS.music };
  let wantMusic = null;           // music request, remembered until a context exists
  const voices = [];              // live SFX voices, oldest first; never more than MAX_VOICES
  const lastAt = Object.create(null);
  let plays = 0;
  let throttled = 0;
  let stolen = 0;
  let lastHitAt = -1e9;

  // Creates the AudioContext and graph once. Returns false when WebAudio is unavailable.
  function build() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return false;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    masterG = ctx.createGain();
    sfxG = ctx.createGain();
    musicG = ctx.createGain();
    masterG.gain.value = vol.master;
    sfxG.gain.value = vol.sfx;
    musicG.gain.value = vol.music;
    sfxG.connect(masterG);
    musicG.connect(masterG);
    masterG.connect(comp);
    comp.connect(ctx.destination);
    S = createSynth(ctx);
    music = createMusic(ctx, S, musicG);
    return true;
  }

  // Browsers only allow audio after a user gesture: any press or key drops the listeners once running.
  const hasWindow = typeof window !== 'undefined';
  const onGesture = () => unlock();
  if (hasWindow) for (const e of GESTURES) window.addEventListener(e, onGesture, { capture: true, passive: true });
  function detachGestures() {
    if (hasWindow) for (const e of GESTURES) window.removeEventListener(e, onGesture, { capture: true });
  }

  // Creates and resumes the AudioContext (idempotent) and starts any remembered music request.
  function unlock() {
    if (!ctx && !build()) return;
    if (ctx.state === 'running') {
      detachGestures();
    } else {
      ctx.resume().then(() => { if (ctx && ctx.state === 'running') detachGestures(); }, () => {});
    }
    if (wantMusic) music.set(wantMusic);
  }

  function setVolumes(v) {
    if (!v) return;
    if (isNum(v.master)) vol.master = clamp01(v.master);
    if (isNum(v.sfx)) vol.sfx = clamp01(v.sfx);
    if (isNum(v.music)) vol.music = clamp01(v.music);
    if (masterG) {
      masterG.gain.value = vol.master;
      sfxG.gain.value = vol.sfx;
      musicG.gain.value = vol.music;
    }
  }

  // Plays one SFX by name. Returns true when a voice started; silent no-op before unlock or when throttled.
  function play(name) {
    if (!ctx || !S || !hasSfx(name)) return false;
    const wall = performance.now();
    const last = lastAt[name];
    if (last !== undefined && wall - last < SAME_SOUND_MS) {
      throttled++;
      return false;
    }
    lastAt[name] = wall;
    const t = ctx.currentTime;
    for (let i = voices.length - 1; i >= 0; i--) {
      if (voices[i].end <= t) {
        releaseVoice(voices[i]);
        voices.splice(i, 1);
      }
    }
    if (voices.length >= MAX_VOICES) {
      const old = voices.shift();
      stolen++;
      const g = old.vg.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(1, t);
      g.linearRampToValueAtTime(0, t + 0.012);
      setTimeout(() => releaseVoice(old), 40);
    }
    const V = newVoice(S, sfxG, 1 + (Math.random() * 2 - 1) * 0.04);
    const start = t + 0.01;
    const dur = renderSfx(S, name, V, start);
    V.end = start + dur + 0.05;
    voices.push(V);
    plays++;
    return true;
  }

  // 'menu' | 'battle' | null. Remembered until unlock; null fades the music out.
  function setMusic(name) {
    wantMusic = name === 'menu' || name === 'battle' ? name : null;
    if (music) music.set(wantMusic);
  }

  // Bus wiring: game events -> SFX. Handlers tolerate missing payload fields.
  bus.on(EV.SHOT, (p) => {
    if (p && p.isSuper) {
      play('super');
    } else {
      const n = p && p.b ? SHOT_SFX[p.b.brawlerId] : undefined;
      if (n) play(n);
    }
  });
  bus.on(EV.HIT, () => {
    const w = performance.now();
    if (w - lastHitAt < HIT_MS) return;
    lastHitAt = w;
    play('hit');
  });
  bus.on(EV.HEAL, () => play('heal'));
  bus.on(EV.EXPLOSION, () => play('explosion'));
  bus.on(EV.CRYSTAL_PICKUP, () => play('crystal'));
  bus.on(EV.SUPER_READY, (p) => { if (p && p.b && p.b.isPlayer) play('super_ready'); });
  bus.on(EV.DEATH, () => play('death'));
  bus.on(EV.WALL_DESTROYED, () => play('wall_break'));
  bus.on(EV.DASH, () => play('dash'));
  bus.on(EV.RESPAWN, () => play('respawn'));
  bus.on(EV.COUNTDOWN, (p) => { if (p && p.seconds <= 5) play('countdown'); });
  bus.on(EV.MATCH_END, (p) => {
    const outcome = p && p.outcome;
    play(outcome === 'victory' || outcome === 'defeat' ? outcome : 'draw');
  });
  bus.on(EV.UI_CLICK, () => play('click'));
  bus.on(EV.UI_SETTINGS, (p) => setVolumes(p));

  // Debug/test snapshot (not part of the public contract).
  function stats() {
    return {
      state: ctx ? ctx.state : 'none',
      voices: voices.length,
      maxVoices: MAX_VOICES,
      plays,
      throttled,
      stolen,
      gains: {
        master: masterG ? masterG.gain.value : vol.master,
        sfx: sfxG ? sfxG.gain.value : vol.sfx,
        music: musicG ? musicG.gain.value : vol.music,
      },
      mode: music ? music.mode() : null,
      tracks: music ? music.count() : 0,
    };
  }

  return { unlock, setVolumes, music: setMusic, play, stats };
}
