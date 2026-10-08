import { clamp } from '../utils/math.js';

const NOISE_SECONDS = 3;
const IR_SECONDS = 2.8;
export const BUS_NAMES = ['sand', 'crystal', 'slime', 'bubble', 'ambient'];

// Owns the AudioContext, the master chain, reverb and per-station buses.
// Everything is created lazily from a user gesture so the autoplay policy is respected.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buses = {};
    this.noise = null;
    this.volume = 0.8;
    this.muted = false;
    this.mix = { sand: 0.85, crystal: 0.8, slime: 0.85, bubble: 0.8, ambient: 0.6 };
    this.voiceCount = 0;
    this.maxVoices = 56;
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Call from a user gesture. Returns false if Web Audio is missing.
  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.build();
    }
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  build() {
    const c = this.ctx;

    // Master chain: buses -> high shelf (air) -> compressor (clip protection) -> master -> out.
    this.hs = c.createBiquadFilter();
    this.hs.type = 'highshelf';
    this.hs.frequency.value = 5200;
    this.hs.gain.value = 1.5;

    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 14;
    this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.008;
    this.comp.release.value = 0.22;

    this.master = c.createGain();
    this.master.gain.value = 0;
    this.hs.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(c.destination);

    // Procedural convolution reverb.
    this.reverbIn = c.createGain();
    this.convolver = c.createConvolver();
    this.convolver.buffer = this.makeImpulse(IR_SECONDS);
    this.reverbWet = c.createGain();
    this.reverbWet.gain.value = 0.9;
    this.reverbIn.connect(this.convolver);
    this.convolver.connect(this.reverbWet);
    this.reverbWet.connect(this.hs);

    this.noise = {
      white: this.makeNoise('white'),
      pink: this.makeNoise('pink'),
      brown: this.makeNoise('brown'),
    };

    const sends = { sand: 0.22, crystal: 0.75, slime: 0.18, bubble: 0.12, ambient: 0.5 };
    for (const name of BUS_NAMES) {
      const inp = c.createGain();
      const mix = c.createGain();
      const send = c.createGain();
      mix.gain.value = this.mixLevel(name);
      send.gain.value = sends[name];
      inp.connect(mix);
      mix.connect(this.hs);
      mix.connect(send);
      send.connect(this.reverbIn);
      this.buses[name] = { in: inp, mix, send };
    }

    this.applyMaster(0.05);
  }

  // Impulse response: early reflections plus a darkening exponential tail, all generated.
  makeImpulse(seconds) {
    const c = this.ctx;
    const sr = c.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = c.createBuffer(2, len, sr);
    const taps = [0.008, 0.013, 0.019, 0.027, 0.036, 0.047];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const tail = t / seconds;
        const alpha = 0.7 - 0.55 * tail;
        lp += alpha * ((Math.random() * 2 - 1) - lp);
        const env = Math.exp(-6.9 * tail) * (t < 0.002 ? t / 0.002 : 1);
        d[i] = lp * env * 0.9;
      }
      taps.forEach((tp, k) => {
        const idx = Math.floor((tp + (ch ? 0.0021 * (k % 2 ? 1 : -1) : 0)) * sr);
        if (idx < len) d[idx] += (Math.random() < 0.5 ? -1 : 1) * (0.9 - k * 0.12);
      });
    }
    return buf;
  }

  makeNoise(kind) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * NOISE_SECONDS);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = clamp(last * 3.5, -1, 1);
      }
    }
    return buf;
  }

  // A looping or one-shot noise source at a random offset (decorrelates repeats).
  noiseSource(kind = 'white', loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = loop;
    return s;
  }

  randomOffset() {
    return Math.random() * (NOISE_SECONDS - 0.5);
  }

  mixLevel(name) {
    const v = clamp(this.mix[name] ?? 0.7, 0, 1);
    return v * v * 0.9;
  }

  applyMaster(tc = 0.05) {
    if (!this.ctx) return;
    const v = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, tc);
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    this.applyMaster();
  }

  setMuted(m) {
    this.muted = !!m;
    this.applyMaster(0.08);
  }

  setMix(name, v) {
    this.mix[name] = clamp(v, 0, 1);
    if (this.buses[name]) {
      this.buses[name].mix.gain.setTargetAtTime(this.mixLevel(name), this.ctx.currentTime, 0.05);
    }
  }

  // Each voice registers itself; the cap keeps dense interaction from piling up nodes.
  canVoice() {
    return this.running && this.voiceCount < this.maxVoices;
  }

  trackVoice(node) {
    this.voiceCount++;
    node.onended = () => {
      this.voiceCount = Math.max(0, this.voiceCount - 1);
    };
  }

  panner(pan) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = clamp(pan, -0.9, 0.9);
    return p;
  }
}
