// Synthesizes an original 120 BPM soundtrack locked to the video's scene cuts.
// Output: public/audio/track.wav (then encoded to track.mp3 by `npm run soundtrack`).
// Deterministic: same input, same file. No samples, no external audio.
import { writeFileSync } from "node:fs";

const SR = 44100;
const FPS = 30;
const TOTAL_FRAMES = 4500;
const DUR = TOTAL_FRAMES / FPS;
const N = Math.round(DUR * SR);
const BEAT = 0.5; // 120 BPM
const L = new Float32Array(N);
const R = new Float32Array(N);

// Scene cuts in frames (mirror of src/Video.tsx).
const CUTS = [240, 540, 1140, 1440, 1800, 2100, 2760, 3150, 3600, 4050, 4290];
const sec = (f) => f / FPS;

let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const add = (t0, buf, gain = 1, pan = 0) => {
  const i0 = Math.round(t0 * SR);
  const gl = gain * Math.min(1, 1 - pan);
  const gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < buf.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    L[j] += buf[i] * gl;
    R[j] += buf[i] * gr;
  }
};

const kick = (() => {
  const len = Math.round(0.35 * SR);
  const b = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 45 + 110 * Math.exp(-t * 35);
    ph += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(ph) * Math.exp(-t * 9) + (i < 60 ? (rnd() * 2 - 1) * 0.3 * (1 - i / 60) : 0);
  }
  return b;
})();

const hat = (len = 0.045) => {
  const n = Math.round(len * SR);
  const b = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    b[i] = (w - prev) * Math.exp(-(i / SR) * 90);
    prev = w;
  }
  return b;
};
const HAT = hat();
const HAT_OPEN = hat(0.18);

const impact = (() => {
  const len = Math.round(1.6 * SR);
  const b = new Float32Array(len);
  let ph = 0;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (38 + 60 * Math.exp(-t * 6))) / SR;
    lp += 0.08 * ((rnd() * 2 - 1) - lp);
    b[i] = Math.sin(ph) * Math.exp(-t * 2.2) * 0.9 + lp * Math.exp(-t * 3) * 0.8;
  }
  return b;
})();

const riser = (dur) => {
  const len = Math.round(dur * SR);
  const b = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const a = 0.01 + 0.35 * p * p;
    lp += a * ((rnd() * 2 - 1) - lp);
    b[i] = lp * p * p * 0.9;
  }
  return b;
};

// Chord progression per bar (2 s): Am - F - C - G, roots and pad voicings.
const CHORDS = [
  { root: 55.0, pad: [220.0, 261.63, 329.63] },
  { root: 43.65, pad: [174.61, 220.0, 261.63] },
  { root: 65.41, pad: [196.0, 261.63, 329.63] },
  { root: 49.0, pad: [196.0, 246.94, 293.66] },
];
const chordAt = (t) => CHORDS[Math.floor(t / 2) % 4];

// Section intensity (0..1) for drums/bass, by time.
const inRange = (t, a, b) => t >= sec(a) && t < sec(b);
const drumsOn = (t) => t >= sec(240) && t < sec(4290);
const busy = (t) => inRange(t, 3600, 4050) || inRange(t, 4050, 4290);
const half = (t) => inRange(t, 1440, 1800) || inRange(t, 2760, 3150);

// Pad + bass rendered sample by sample.
{
  const padPh = [0, 0, 0, 0, 0, 0];
  let padLp = 0;
  let padLpR = 0;
  let bassPh = 0;
  let bassLp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ch = chordAt(t);
    // Pad: two detuned saws per note, slow low-pass that opens over the piece.
    let sL = 0;
    let sR = 0;
    for (let k = 0; k < 3; k++) {
      for (let d = 0; d < 2; d++) {
        const idx = k * 2 + d;
        const f = ch.pad[k] * (d === 0 ? 0.997 : 1.003);
        padPh[idx] = (padPh[idx] + f / SR) % 1;
        const saw = padPh[idx] * 2 - 1;
        if (d === 0) sL += saw;
        else sR += saw;
      }
    }
    const open = 0.02 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.4)) + (busy(t) ? 0.04 : 0);
    padLp += open * (sL / 3 - padLp);
    padLpR += open * (sR / 3 - padLpR);
    const fadeIn = Math.min(1, t / 6);
    const padGain = 0.16 * fadeIn * (t > sec(4290) ? Math.max(0.35, 1 - (t - sec(4290)) / 7) : 1);
    L[i] += padLp * padGain;
    R[i] += padLpR * padGain;

    // Bass: 8th-note pulse, filtered saw with a pluck envelope.
    if (drumsOn(t)) {
      const step = 0.25;
      const pos = t % step;
      const env = Math.exp(-pos * 14);
      bassPh = (bassPh + ch.root / SR) % 1;
      const saw = bassPh * 2 - 1;
      bassLp += (0.03 + env * 0.1) * (saw - bassLp);
      const g = (half(t) ? 0.18 : 0.3) * env;
      L[i] += bassLp * g;
      R[i] += bassLp * g;
    }
  }
}

// Drums on the beat grid.
for (let b = 0; b * BEAT < DUR; b++) {
  const t = b * BEAT;
  if (t < sec(240)) {
    // Cold open: a heartbeat that builds into the title.
    if (t >= 4 && b % 2 === 0) add(t, kick, 0.25 + 0.35 * ((t - 4) / 4));
    continue;
  }
  if (!drumsOn(t)) continue;
  if (half(t)) {
    if (b % 2 === 0) add(t, kick, 0.7);
  } else {
    add(t, kick, 0.85);
  }
  // Off-beat hats, 16ths in the montage/finale.
  add(t + BEAT / 2, b % 8 === 7 ? HAT_OPEN : HAT, 0.22, 0.25);
  if (busy(t)) {
    add(t + BEAT / 4, HAT, 0.12, -0.25);
    add(t + (3 * BEAT) / 4, HAT, 0.12, -0.25);
  }
  // Clap-ish noise on beats 2 and 4.
  if (b % 2 === 1 && !half(t)) add(t, hat(0.12), 0.28, 0);
}

// Scene-cut impacts and risers into the big moments.
for (const c of CUTS) add(sec(c), impact, c === 4290 ? 0.5 : 0.55);
add(sec(240) - 4, riser(4), 0.5);
add(sec(3600) - 4, riser(4), 0.55);
add(sec(4050) - 2, riser(2), 0.5);

// Master: soft clip, normalize to -1 dBFS, 16-bit stereo WAV.
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.2);
  R[i] = Math.tanh(R[i] * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2] ?? "public/audio/track.wav", buf);
console.log(`wrote ${DUR}s @ ${SR} Hz`);
