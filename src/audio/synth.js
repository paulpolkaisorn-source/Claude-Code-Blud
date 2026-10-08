// synth.js — WebAudio building blocks and the procedural SFX bank. Internal to the audio module.
// Sounds are oscillators and shared one-time noise buffers, shaped by exponential envelopes and optional
// biquad filters. A voice groups the nodes of one sound so they can be disconnected when it ends.

// Shared noise buffers, generated once per AudioContext: white, and brown (integrated) for rumble.
export function createSynth(ctx) {
  const len = Math.floor(ctx.sampleRate * 1.5);
  const white = ctx.createBuffer(1, len, ctx.sampleRate);
  const brown = ctx.createBuffer(1, len, ctx.sampleRate);
  const w = white.getChannelData(0);
  const b = brown.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const r = Math.random() * 2 - 1;
    w[i] = r;
    last = (last + 0.02 * r) / 1.02;
    b[i] = last * 3.5;
  }
  return { ctx, white, brown };
}

// Voice: { vg, out, p, nodes, end }. vg is the voice gain (faded out when stolen); p multiplies pitch.
export function newVoice(S, dest, p = 1) {
  const vg = S.ctx.createGain();
  vg.connect(dest);
  return { vg, out: vg, p, nodes: [vg], end: 0 };
}

// Disconnects every node of a finished voice so the graph releases it.
export function releaseVoice(V) {
  const n = V.nodes;
  for (let i = 0; i < n.length; i++) n[i].disconnect();
  n.length = 0;
}

// Attack to peak, optional hold that ends r seconds before the end, then exponential decay to silence at t+d.
function env(g, t, peak, a, d, r) {
  const p = g.gain;
  const pk = Math.max(peak, 0.0001);
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(pk, t + a);
  if (r > 0) p.setValueAtTime(pk, Math.max(t + a, t + d - r));
  p.exponentialRampToValueAtTime(0.0001, t + d);
}

// Biquad with an optional frequency sweep fa -> fb (Hz) over d seconds.
function filter(c, type, fa, fb, q, t, d) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(fa, t);
  if (fb !== undefined && fb !== fa) f.frequency.exponentialRampToValueAtTime(fb, t + d);
  f.Q.value = q;
  return f;
}

// Wires src -> [filter] -> g -> voice output, recording every node on the voice.
function chain(c, V, src, g, o, t, d) {
  V.nodes.push(src, g);
  if (o.ft) {
    const f = filter(c, o.ft, o.fa, o.fb, o.q || 1, t, d);
    V.nodes.push(f);
    src.connect(f);
    f.connect(g);
  } else {
    src.connect(g);
  }
  g.connect(V.out);
}

// Oscillator note. o: { type, f0, f1?, t, d, g, a?, r?, ft?, fa?, fb?, q? }  (f0/f1 in Hz, pitch-scaled by V.p)
export function tone(S, V, o) {
  const c = S.ctx;
  const t = o.t;
  const d = o.d;
  const osc = c.createOscillator();
  osc.type = o.type;
  const f1 = o.f1 === undefined ? o.f0 : o.f1;
  osc.frequency.setValueAtTime(o.f0 * V.p, t);
  if (f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(f1 * V.p, t + d);
  const g = c.createGain();
  env(g, t, o.g, o.a === undefined ? 0.003 : o.a, d, o.r || 0);
  chain(c, V, osc, g, o, t, d);
  osc.start(t);
  osc.stop(t + d + 0.03);
}

// Filtered noise burst. o: { t, d, g, a?, r?, brown?, ft?, fa?, fb?, q? }
export function noise(S, V, o) {
  const c = S.ctx;
  const t = o.t;
  const d = o.d;
  const src = c.createBufferSource();
  src.buffer = o.brown ? S.brown : S.white;
  src.loop = true;
  const g = c.createGain();
  env(g, t, o.g, o.a === undefined ? 0.002 : o.a, d, o.r || 0);
  chain(c, V, src, g, o, t, d);
  src.start(t, Math.random() * 0.8);
  src.stop(t + d + 0.03);
}

// ---- SFX bank. Each entry schedules one sound into voice V at time t and returns its length (s). ----
const SFX = {
  shot_rivet(S, V, t) {
    noise(S, V, { t, d: 0.1, g: 0.7, a: 0.002, ft: 'lowpass', fa: 2800, fb: 400, q: 1.2 });
    tone(S, V, { type: 'sawtooth', f0: 200, f1: 55, t, d: 0.16, g: 0.32, a: 0.002, ft: 'lowpass', fa: 900, fb: 160, q: 1.5 });
    return 0.16;
  },
  shot_pip(S, V, t) {
    tone(S, V, { type: 'sawtooth', f0: 1500, f1: 240, t, d: 0.22, g: 0.2, a: 0.003, ft: 'lowpass', fa: 4000, fb: 900, q: 3 });
    tone(S, V, { type: 'sine', f0: 3000, f1: 600, t, d: 0.12, g: 0.06, a: 0.002 });
    return 0.22;
  },
  shot_mortara(S, V, t) {
    tone(S, V, { type: 'sine', f0: 230, f1: 60, t, d: 0.24, g: 0.85, a: 0.003 });
    noise(S, V, { t, d: 0.03, g: 0.35, a: 0.001, ft: 'highpass', fa: 1200, fb: 1200, q: 0.7 });
    return 0.24;
  },
  shot_lumen(S, V, t) {
    tone(S, V, { type: 'triangle', f0: 620, f1: 1150, t, d: 0.3, g: 0.22, a: 0.02 });
    tone(S, V, { type: 'sine', f0: 930, f1: 1725, t: t + 0.03, d: 0.27, g: 0.1, a: 0.03 });
    noise(S, V, { t, d: 0.22, g: 0.05, a: 0.04, ft: 'highpass', fa: 6000, fb: 6000, q: 0.7 });
    return 0.3;
  },
  hit(S, V, t) {
    tone(S, V, { type: 'square', f0: 340, f1: 170, t, d: 0.08, g: 0.16, a: 0.002, ft: 'lowpass', fa: 2400, fb: 600, q: 1 });
    noise(S, V, { t, d: 0.05, g: 0.25, a: 0.001, ft: 'bandpass', fa: 2000, fb: 1200, q: 1 });
    return 0.08;
  },
  heal(S, V, t) {
    const n = [523, 659, 784, 1047];
    for (let i = 0; i < 4; i++) tone(S, V, { type: 'sine', f0: n[i], t: t + i * 0.055, d: 0.22, g: 0.18, a: 0.006 });
    return 0.385;
  },
  explosion(S, V, t) {
    noise(S, V, { t, d: 0.75, g: 0.9, a: 0.004, ft: 'lowpass', fa: 2200, fb: 90, q: 0.9 });
    tone(S, V, { type: 'sine', f0: 95, f1: 34, t, d: 0.6, g: 0.7, a: 0.004, ft: 'lowpass', fa: 300, fb: 80, q: 0.7 });
    noise(S, V, { t, d: 0.12, g: 0.3, a: 0.002, ft: 'bandpass', fa: 900, fb: 500, q: 0.6 });
    return 0.75;
  },
  crystal(S, V, t) {
    const n = [1047, 1319, 1568, 2093];
    for (let i = 0; i < 4; i++) {
      const tt = t + i * 0.07;
      tone(S, V, { type: 'sine', f0: n[i], t: tt, d: 0.5, g: 0.22, a: 0.002 });
      tone(S, V, { type: 'sine', f0: n[i] * 2.76, t: tt, d: 0.22, g: 0.05, a: 0.002 });
    }
    return 0.72;
  },
  super_ready(S, V, t) {
    const n = [660, 880, 1320, 1760];
    for (let i = 0; i < 4; i++) {
      const tt = t + i * 0.085;
      tone(S, V, { type: 'triangle', f0: n[i], t: tt, d: 0.45, g: 0.2, a: 0.004 });
      tone(S, V, { type: 'sine', f0: n[i] * 2, t: tt, d: 0.3, g: 0.06, a: 0.004 });
    }
    return 0.72;
  },
  super(S, V, t) {
    noise(S, V, { t, d: 0.35, g: 0.5, a: 0.04, ft: 'bandpass', fa: 300, fb: 3000, q: 1.2 });
    noise(S, V, { brown: true, t: t + 0.3, d: 0.6, g: 0.9, a: 0.01, ft: 'lowpass', fa: 1500, fb: 80, q: 0.8 });
    tone(S, V, { type: 'sine', f0: 140, f1: 28, t: t + 0.3, d: 0.6, g: 0.9, a: 0.005 });
    return 0.9;
  },
  death(S, V, t) {
    tone(S, V, { type: 'sawtooth', f0: 440, f1: 90, t, d: 0.7, g: 0.22, a: 0.01, ft: 'lowpass', fa: 2200, fb: 300, q: 1.2 });
    tone(S, V, { type: 'triangle', f0: 220, f1: 60, t, d: 0.7, g: 0.2, a: 0.02 });
    return 0.7;
  },
  click(S, V, t) {
    tone(S, V, { type: 'square', f0: 1800, f1: 1200, t, d: 0.02, g: 0.1, a: 0.001, ft: 'lowpass', fa: 4000, fb: 2000, q: 1 });
    return 0.02;
  },
  countdown(S, V, t) {
    tone(S, V, { type: 'sine', f0: 880, t, d: 0.14, g: 0.32, a: 0.004 });
    tone(S, V, { type: 'square', f0: 1760, t, d: 0.03, g: 0.03, a: 0.002, ft: 'lowpass', fa: 3000, fb: 3000, q: 1 });
    return 0.14;
  },
  victory(S, V, t) {
    const n = [523, 659, 784];
    for (let i = 0; i < 3; i++) {
      tone(S, V, { type: 'square', f0: n[i], t: t + i * 0.12, d: 0.12, g: 0.12, a: 0.004, ft: 'lowpass', fa: 2600, fb: 2000, q: 0.7 });
    }
    const c = [1047, 1319, 1568];
    for (let i = 0; i < 3; i++) {
      tone(S, V, { type: 'square', f0: c[i], t: t + 0.36, d: 0.7, g: 0.1, a: 0.006, ft: 'lowpass', fa: 2600, fb: 1400, q: 0.7 });
    }
    tone(S, V, { type: 'triangle', f0: 262, t: t + 0.36, d: 0.7, g: 0.25, a: 0.01 });
    return 1.06;
  },
  defeat(S, V, t) {
    const n = [392, 330, 294, 196];
    for (let i = 0; i < 4; i++) {
      tone(S, V, { type: 'triangle', f0: n[i], f1: n[i] * 0.96, t: t + i * 0.2, d: 0.3, g: 0.22, a: 0.01, ft: 'lowpass', fa: 1600, fb: 500, q: 0.8 });
    }
    return 0.9;
  },
  draw(S, V, t) {
    tone(S, V, { type: 'triangle', f0: 440, t, d: 0.28, g: 0.18, a: 0.01 });
    tone(S, V, { type: 'triangle', f0: 392, t: t + 0.24, d: 0.42, g: 0.18, a: 0.01 });
    return 0.66;
  },
  wall_break(S, V, t) {
    noise(S, V, { t, d: 0.28, g: 0.8, a: 0.002, ft: 'bandpass', fa: 1400, fb: 500, q: 1.4 });
    tone(S, V, { type: 'square', f0: 160, f1: 55, t, d: 0.26, g: 0.2, a: 0.002, ft: 'lowpass', fa: 900, fb: 200, q: 1 });
    noise(S, V, { t: t + 0.08, d: 0.1, g: 0.4, a: 0.002, ft: 'highpass', fa: 3000, fb: 3000, q: 0.7 });
    return 0.28;
  },
  dash(S, V, t) {
    noise(S, V, { t, d: 0.26, g: 0.45, a: 0.03, ft: 'bandpass', fa: 400, fb: 2400, q: 1.3 });
    tone(S, V, { type: 'sine', f0: 500, f1: 1000, t, d: 0.22, g: 0.05, a: 0.02 });
    return 0.26;
  },
  respawn(S, V, t) {
    tone(S, V, { type: 'sine', f0: 300, f1: 900, t, d: 0.36, g: 0.25, a: 0.02 });
    tone(S, V, { type: 'triangle', f0: 600, f1: 1800, t: t + 0.04, d: 0.3, g: 0.09, a: 0.02 });
    return 0.36;
  },
};

const BANK = new Map(Object.entries(SFX));
export const SFX_NAMES = Object.keys(SFX);
export function hasSfx(name) { return BANK.has(name); }

// Schedules the named sound into voice V starting at time t. Returns its length in seconds (0 if unknown).
export function renderSfx(S, name, V, t) {
  const f = BANK.get(name);
  return f ? f(S, V, t) : 0;
}
