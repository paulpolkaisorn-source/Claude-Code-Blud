// music.js — procedural background music. A 16th-note lookahead scheduler (25 ms timer, 0.1 s ahead) plays
// 4-bar chord loops with synth kick/snare/hat, bass, chord stabs, and a simple lead. Original patterns.
// Internal to the audio module: createMusic(ctx, S, dest) -> { set(name|null), mode(), count() }.
import { newVoice, tone, noise, releaseVoice } from './synth.js';

const FADE = 0.6;     // crossfade length (s) on switch and on stop
const AHEAD = 0.1;    // lookahead window (s)
const TICK_MS = 25;   // scheduler timer period

const HZ = new Float64Array(128);
for (let i = 0; i < 128; i++) HZ[i] = 440 * Math.pow(2, (i - 69) / 12);

// 'x' = hit, anything else = rest. Each string is one bar of 16 sixteenth notes.
const pat = (s) => Uint8Array.from(s, (ch) => (ch === 'x' ? 1 : 0));
// Lead strings: digit d = chord[d % 3] + 12 * floor(d / 3), then one octave up; '.' = rest.
const leadBars = (arr) => arr.map((s) => Int8Array.from(s, (ch) => (ch === '.' ? -1 : ch.charCodeAt(0) - 48)));

const MOODS = {
  menu: {
    bpm: 100,
    chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], // Dm, Bb, Gm, A
    kick: pat('x.........x.....'),
    snare: pat('........x.......'),
    hat: pat('..x...x...x...x.'),
    bass: pat('x.....x.x.......'),
    stab: pat('x.......x.......'),
    stabWave: 'triangle',
    lead: leadBars(['2...1...0...1...', '4...2...1...0...', '0...1...2...1...', '2...3...2...0...']),
    wave: 'triangle',
    vol: { kick: 0.55, snare: 0.22, hat: 0.035, bass: 0.2, stab: 0.04, lead: 0.05 },
    gate: { bass: 0.3, lead: 0.45, stab: 0.3 },
  },
  battle: {
    bpm: 128,
    chords: [[52, 55, 59], [48, 52, 55], [43, 47, 50], [50, 54, 57]], // Em, C, G, D
    kick: pat('x...x...x...x...'),
    snare: pat('....x.......x...'),
    hat: pat('x.x.x.x.x.x.x.x.'),
    bass: pat('x.x.x.x.x.x.x.x.'),
    stab: pat('..x...x...x...x.'),
    stabWave: 'sawtooth',
    lead: leadBars(['0.2.4.2.1.0.2.1.', '4.3.2.1.0.1.2.3.', '2.4.4.2.1.0.1.2.', '0.1.2.4.2.1.0.2.']),
    wave: 'square',
    vol: { kick: 0.8, snare: 0.4, hat: 0.06, bass: 0.16, stab: 0.05, lead: 0.05 },
    gate: { bass: 0.18, lead: 0.2, stab: 0.1 },
  },
};

function makeTrack(ctx, dest, name, t) {
  const def = MOODS[name];
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + FADE);
  gain.connect(dest);
  return { name, def, gain, spb: 60 / def.bpm / 4, next: t + 0.05, step: 0, live: [], active: true, stopAt: 0 };
}

// Schedules one sixteenth step of a track at audio time t. All nodes of the step go on one voice (ends after 0.6 s).
function scheduleStep(S, tr, t, step) {
  const m = tr.def;
  const s = step & 15;
  const bar = (step >> 4) & 3;
  const chord = m.chords[bar];
  const v = m.vol;
  const gt = m.gate;
  const V = newVoice(S, tr.gain, 1);

  if (m.kick[s]) tone(S, V, { type: 'sine', f0: 150, f1: 42, t, d: 0.18, g: v.kick, a: 0.002 });
  if (m.snare[s]) {
    noise(S, V, { t, d: 0.14, g: v.snare, a: 0.002, ft: 'bandpass', fa: 1800, fb: 1400, q: 0.8 });
    tone(S, V, { type: 'triangle', f0: 190, f1: 150, t, d: 0.09, g: v.snare * 0.6, a: 0.002 });
  }
  if (m.hat[s]) noise(S, V, { t, d: 0.035, g: v.hat, a: 0.001, ft: 'highpass', fa: 7000, fb: 7000, q: 0.7 });
  if (m.bass[s]) {
    tone(S, V, { type: 'sawtooth', f0: HZ[chord[0] - 12], t, d: gt.bass, g: v.bass, a: 0.004, r: 0.04, ft: 'lowpass', fa: 700, fb: 220, q: 0.8 });
  }
  if (m.stab[s]) {
    for (let k = 0; k < 3; k++) {
      tone(S, V, { type: m.stabWave, f0: HZ[chord[k]], t, d: gt.stab, g: v.stab, a: 0.004, ft: 'lowpass', fa: 1800, fb: 1200, q: 0.7 });
    }
  }
  const L = m.lead[bar][s];
  if (L >= 0) {
    const midi = chord[L % 3] + 12 * ((L / 3) | 0) + 12;
    tone(S, V, { type: m.wave, f0: HZ[midi], t, d: gt.lead, g: v.lead, a: 0.006, r: 0.08, ft: 'lowpass', fa: 2600, fb: 2000, q: 0.7 });
  }
  V.end = t + 0.6;
  tr.live.push(V);
}

function releaseAll(tr) {
  const L = tr.live;
  for (let k = 0; k < L.length; k++) releaseVoice(L[k]);
  L.length = 0;
}

export function createMusic(ctx, S, dest) {
  const tracks = [];   // the active track plus any track still fading out
  let cur = null;      // the active track, or null for silence
  let timer = 0;

  function tick() {
    const t = ctx.currentTime;
    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i];
      if (tr.active) {
        if (tr.next < t - 0.05) tr.next = t + 0.02; // resync after a stall (background tab, suspended context)
        while (tr.next < t + AHEAD) {
          scheduleStep(S, tr, tr.next, tr.step);
          tr.step++;
          tr.next += tr.spb;
        }
      }
      const L = tr.live;
      for (let k = L.length - 1; k >= 0; k--) {
        if (L[k].end < t) {
          releaseVoice(L[k]);
          L.splice(k, 1);
        }
      }
    }
    for (let i = tracks.length - 1; i >= 0; i--) {
      const tr = tracks[i];
      if (!tr.active && t >= tr.stopAt) {
        releaseAll(tr);
        tr.gain.disconnect();
        tracks.splice(i, 1);
      }
    }
    if (tracks.length === 0 && timer) {
      clearInterval(timer);
      timer = 0;
    }
  }

  // name: 'menu' | 'battle' | anything else (= silence). Same mood is a no-op; the old track fades out over FADE.
  function set(name) {
    const key = name === 'menu' || name === 'battle' ? name : null;
    if (key === (cur ? cur.name : null)) return;
    const t = ctx.currentTime;
    if (cur) {
      const g = cur.gain.gain;
      cur.active = false;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + FADE);
      cur.stopAt = t + FADE + 0.1;
      cur = null;
    }
    if (key) {
      cur = makeTrack(ctx, dest, key, t);
      tracks.push(cur);
    }
    if (!timer) timer = setInterval(tick, TICK_MS);
  }

  return {
    set,
    mode: () => (cur ? cur.name : null),
    count: () => tracks.length,
  };
}
