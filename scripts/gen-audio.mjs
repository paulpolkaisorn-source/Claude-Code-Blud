// Placeholder audio, synthesized in code (deterministic, seeded): a 120 BPM bed in
// public/audio/track.mp3 plus the SFX one-shots listed in src/sfx.ts.
// Replace any file with real audio of the same name; delete them all and the film renders silently.
// Usage: node scripts/gen-audio.mjs   (needs ffmpeg on PATH for the mp3 encode)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SR = 48000;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5 s
const OUT = path.resolve("public/audio");
fs.mkdirSync(OUT, { recursive: true });

// ---------- helpers ----------
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buf = (seconds) => [new Float32Array(Math.ceil(seconds * SR)), new Float32Array(Math.ceil(seconds * SR))];
const add = (dst, src, at, gain = 1, pan = 0) => {
  const off = Math.round(at * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < src.length && off + i < dst[0].length; i++) {
    if (off + i < 0) continue;
    dst[0][off + i] += src[i] * gl * Math.SQRT2;
    dst[1][off + i] += src[i] * gr * Math.SQRT2;
  }
};
const lowpass = (x, cutoff) => {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = typeof cutoff === "function" ? cutoff(i / SR) : cutoff;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (x[i] - y);
    out[i] = y;
  }
  return out;
};
const highpass = (x, cutoff) => {
  const lp = lowpass(x, cutoff);
  return x.map((v, i) => v - lp[i]);
};
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const writeWav = (file, [L, R]) => {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = peak > 0.89 ? 0.89 / peak : 1;
  const data = Buffer.alloc(L.length * 4);
  for (let i = 0; i < L.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
};
const toMp3 = (name, stereo) => {
  const wav = path.join(os.tmpdir(), `${name}.wav`);
  writeWav(wav, stereo);
  const mp3 = path.join(OUT, `${name}.mp3`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "256k", "-map_metadata", "-1", "-fflags", "+bitexact", mp3]);
  fs.unlinkSync(wav);
  console.log(`wrote ${path.relative(process.cwd(), mp3)}`);
};

// ---------- instruments ----------
const kick = () => {
  const n = Math.round(0.45 * SR);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 42 + 110 * Math.exp(-t * 28);
    ph += f / SR;
    x[i] = Math.tanh(2.2 * Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7.5)) + (i < 60 ? (1 - i / 60) * 0.6 : 0);
  }
  return x;
};
const hat = (rand, len = 0.05) => {
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (rand() * 2 - 1) * Math.exp((-i / SR) * 70);
  return highpass(x, 7000);
};
const clap = (rand) => {
  const n = Math.round(0.25 * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 90) : 0), 0) + Math.exp(-t * 18) * 0.5;
    x[i] = (rand() * 2 - 1) * bursts;
  }
  return highpass(lowpass(x, 3500), 900);
};
const bassNote = (midi, len) => {
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  const f = noteHz(midi);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 200) * Math.exp(-t * 3.5);
    x[i] = (saw(f * t) * 0.6 + Math.sin(2 * Math.PI * f * t)) * env;
  }
  return lowpass(x, (t) => 300 + 1500 * Math.exp(-t * 14));
};
const padChord = (midis, len, rand) => {
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  const voices = midis.flatMap((m) => [noteHz(m) * 0.997, noteHz(m) * 1.003]);
  const phases = voices.map(() => rand());
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 0.4);
    let s = 0;
    voices.forEach((f, v) => (s += saw(phases[v] + f * t)));
    x[i] = (s / voices.length) * env;
  }
  return lowpass(x, 1400);
};

// ---------- music bed: track.mp3 ----------
const buildTrack = () => {
  const rand = mulberry32(120);
  const total = 30;
  const mix = buf(total);
  const K = kick();
  const prog = [
    [45, 57, 60, 64], // Am
    [41, 53, 57, 60], // F
    [48, 55, 60, 64], // C
    [43, 55, 59, 62], // G
  ];
  // structure (beats): 0-7 intro, 8-13 S3 kick enters, 14-19 S4 slam, 20-41 groove, 42-47 montage, 48-53 build, 54-59 end chord
  for (let b = 0; b < 60; b++) {
    const t = b * BEAT;
    const bar = Math.floor(b / 4);
    const chord = prog[bar % 4];
    if (b >= 8 && b < 54 && !(b >= 48 && b % 2 === 1)) add(mix, K, t, 0.9);
    if (b >= 14 && b < 48 && b % 2 === 1) add(mix, clap(rand), t, 0.35, 0.1);
    // hats: 8ths from beat 4, 16ths in the speed lane and the montage
    const sixteenths = (b >= 20 && b < 26) || (b >= 42 && b < 48);
    if (b >= 4 && b < 54) {
      const steps = sixteenths ? 4 : 2;
      for (let s = 0; s < steps; s++) {
        if (steps === 2 && s === 0 && b < 14) continue;
        add(mix, hat(rand, s === steps - 1 ? 0.08 : 0.04), t + (s * BEAT) / steps, s % 2 ? 0.16 : 0.1, s % 2 ? 0.35 : -0.35);
      }
    }
    // bass: 8th-note pulses from the speed lane on
    if (b >= 20 && b < 48) {
      add(mix, bassNote(chord[0] - 12 + 12, BEAT * 0.48), t, 0.32);
      add(mix, bassNote(chord[0] - 12 + 12, BEAT * 0.48), t + BEAT / 2, 0.22);
    } else if (b >= 8 && b < 20 && b % 2 === 0) {
      add(mix, bassNote(chord[0], BEAT * 1.6), t, 0.3);
    }
    // pad: one chord per bar
    if (b % 4 === 0 && b < 54) add(mix, padChord(chord.slice(1), BEAT * 4 + 0.3, rand), t, b < 8 ? 0.12 + b * 0.012 : 0.16, 0);
  }
  // end chord rings from the white flash (beat 54) and is cut with the final flicker (frame 1788 = 29.8 s)
  add(mix, padChord([57, 60, 64, 69], 2.8, rand), 54 * BEAT, 0.22);
  add(mix, bassNote(33, 2.8), 54 * BEAT, 0.3);
  const cut = Math.round(29.8 * SR);
  for (let i = cut; i < mix[0].length; i++) {
    mix[0][i] = 0;
    mix[1][i] = 0;
  }
  return mix;
};

// ---------- SFX ----------
const buzz = () => {
  const rand = mulberry32(7);
  const len = 0.32;
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  let gate = 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 480 === 0) gate = rand() < 0.75 ? 1 : 0.15;
    const tone = Math.sign(Math.sin(2 * Math.PI * 120 * t)) * 0.35 + saw(240 * t) * 0.25 + Math.sin(2 * Math.PI * 360 * t) * 0.15;
    const crackle = rand() < 0.02 ? (rand() * 2 - 1) * 0.9 : 0;
    x[i] = (tone * gate + crackle + (rand() * 2 - 1) * 0.08) * Math.exp(-t * 6);
  }
  const y = lowpass(x, 5000);
  return [y, y.slice()];
};
const hum = () => {
  const len = 4;
  const n = len * SR;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // 4 s holds an integer number of 120 Hz cycles, so the loop is seamless
    x[i] = Math.sin(2 * Math.PI * 120 * t) * 0.5 + Math.sin(2 * Math.PI * 240 * t) * 0.18 + Math.sin(2 * Math.PI * 360 * t) * 0.08 + Math.sin(2 * Math.PI * 600 * t) * 0.03;
  }
  return [x, x.slice()];
};
const whoosh = () => {
  const rand = mulberry32(11);
  const len = 0.55;
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 2;
    x[i] = (rand() * 2 - 1) * env;
  }
  const y = highpass(lowpass(x, (t) => 600 + 5000 * Math.sin(Math.PI * Math.min(1, t / len))), 250);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i / n; // pans left -> right like the camera whip
    L[i] = y[i] * Math.cos((p * Math.PI) / 2);
    R[i] = y[i] * Math.sin((p * Math.PI) / 2);
  }
  return [L, R];
};
const subhit = () => {
  const len = 1.6;
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  let ph = 0;
  const rand = mulberry32(3);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 34 + 70 * Math.exp(-t * 9);
    ph += f / SR;
    x[i] = Math.tanh(1.8 * Math.sin(2 * Math.PI * ph)) * Math.exp(-t * 2.4) + (i < 400 ? (rand() * 2 - 1) * (1 - i / 400) * 0.8 : 0);
  }
  return [x, x.slice()];
};
const riser = () => {
  const rand = mulberry32(5);
  const len = 3.0;
  const n = Math.round(len * SR);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / len;
    ph += (80 + 900 * p * p) / SR;
    x[i] = ((rand() * 2 - 1) * 0.6 + saw(ph) * 0.5 + saw(ph * 1.5) * 0.3) * (0.05 + 0.95 * p * p);
  }
  const y = lowpass(x, (t) => 300 + 9000 * (t / len) ** 2);
  return [y, y.slice()];
};

toMp3("track", buildTrack());
toMp3("sfx-buzz", buzz());
toMp3("sfx-hum", hum());
toMp3("sfx-whoosh", whoosh());
toMp3("sfx-subhit", subhit());
toMp3("sfx-riser", riser());
