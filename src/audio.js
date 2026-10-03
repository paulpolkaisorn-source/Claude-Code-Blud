// Procedural audio engine. Every sound in Hush is synthesized live with the
// Web Audio API: noise shaping, filtered bursts, pitch-swept oscillators and
// inharmonic additive "glass" partials, all sent through a shared convolution reverb.

import { clamp, rand, midiToFreq } from './util.js';

const AC = window.AudioContext || window.webkitAudioContext;

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.noise = {};
    this.activeVoices = 0;
  }

  get ready() {
    return !!this.ctx;
  }

  get supported() {
    return !!AC;
  }

  /** Must be called from a user gesture the first time. */
  async unlock() {
    if (!AC) return false;
    if (!this.ctx) this._build();
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch (_) { /* ignore */ }
    }
    return this.ctx.state === 'running';
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  _build() {
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
    this.master = ctx.createGain();
    this.master.gain.value = 0;

    // Gentle bus compressor + safety limiter so layered sounds never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.master.connect(comp);
    comp.connect(limiter);
    limiter.connect(ctx.destination);
    limiter.connect(this.analyser);

    this._buildNoise();
    this._buildReverb();
    this.applyVolume(true);
  }

  applyVolume(immediate = false) {
    if (!this.ctx) return;
    const s = this.settings;
    const v = s.muted ? 0 : Math.pow(clamp(s.volume, 0, 1), 1.8) * 0.9;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    if (immediate) this.master.gain.setValueAtTime(v, now);
    else this.master.gain.setTargetAtTime(v, now, 0.05);
  }

  /** Peak level of the master output, 0..1 (for tests and meters). */
  meter() {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    return peak;
  }

  _buildNoise() {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 6);
    const make = (fill) => {
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      fill(b.getChannelData(0));
      return b;
    };
    this.noise.white = make((d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    });
    this.noise.pink = make((d) => {
      // Paul Kellet's refined pink-noise filter.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < d.length; i++) {
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
    });
    this.noise.brown = make((d) => {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    });
    // Make the loop seamless: crossfade the last 50ms into the start.
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (const k of Object.keys(this.noise)) {
      const d = this.noise[k].getChannelData(0);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        d[i] = d[i] * t + d[d.length - fade + i] * (1 - t);
      }
    }
  }

  _buildReverb() {
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const seconds = 3.4;
    const len = Math.floor(sr * seconds);
    const ir = ctx.createBuffer(2, len, sr);
    const pre = Math.floor(sr * 0.018);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let y = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        const decay = Math.exp(-t * 2.15);
        // Highs die faster than lows, like a real room.
        const damp = 0.12 + 0.86 * Math.min(1, t / 2.2);
        y += ((Math.random() * 2 - 1) - y) * (1 - damp);
        // Soft early-reflection cluster.
        const early = i - pre < sr * 0.08 && Math.random() < 0.012 ? (Math.random() * 2 - 1) * 1.6 : 0;
        d[i] = (y * 1.7 + early) * decay;
      }
    }
    this.reverbIn = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 180;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 8000;
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverbIn.connect(hp);
    hp.connect(lp);
    lp.connect(conv);
    conv.connect(wet);
    wet.connect(this.master);
  }

  /** A fadeable mixing bus: dry path + reverb send, both fade together. One per game / ambience. */
  createBus({ gain = 1 } = {}) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    const sendOut = ctx.createGain();
    out.gain.value = 0;
    sendOut.gain.value = 0;
    out.gain.setTargetAtTime(gain, ctx.currentTime, 0.08);
    sendOut.gain.setTargetAtTime(gain, ctx.currentTime, 0.08);
    out.connect(this.master);
    sendOut.connect(this.reverbIn);
    const dry = ctx.createGain();
    dry.connect(out);
    const send = ctx.createGain();
    send.connect(sendOut);
    const fade = (to, tc = 0.2) => {
      out.gain.setTargetAtTime(to, ctx.currentTime, tc);
      sendOut.gain.setTargetAtTime(to, ctx.currentTime, tc);
    };
    return {
      dry,
      send,
      fade,
      dispose: (tc = 0.12) => {
        fade(0, tc);
        setTimeout(() => {
          try { out.disconnect(); sendOut.disconnect(); } catch (_) { /* ignore */ }
        }, tc * 6000 + 300);
      },
    };
  }

  /** Returns an input GainNode that feeds the bus with pan + reverb send applied. */
  route(bus, { pan = 0, send = 0.2, gain = 1 } = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = gain;
    let tail = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      g.panner = p;
      tail = p;
    }
    tail.connect(bus.dry);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      tail.connect(s);
      s.connect(bus.send);
    }
    return g;
  }

  /** Pitch-swept oscillator with an exponential envelope. */
  tone(bus, o) {
    const ctx = this.ctx;
    if (!ctx) return;
    const {
      freq = 440, freqEnd, dur = 0.3, type = 'sine', gain = 0.3, attack = 0.003,
      pan = 0, send = 0.2, delay = 0, sweepTime, detune = 0,
    } = o;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + (sweepTime || dur));
    if (detune) osc.detune.value = detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    osc.connect(env);
    env.connect(this.route(bus, { pan, send }));
    osc.start(t0);
    osc.stop(t0 + attack + dur + 0.05);
  }

  /** Filtered noise burst. filter: {type,freq,freqEnd,q} */
  burst(bus, o) {
    const ctx = this.ctx;
    if (!ctx) return;
    const {
      kind = 'white', dur = 0.05, attack = 0.001, gain = 0.4, pan = 0, send = 0.15, delay = 0,
      type = 'bandpass', freq = 2000, freqEnd, q = 1, curve = 'exp',
    } = o;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise[kind];
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    f.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    if (curve === 'exp') env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    else env.gain.linearRampToValueAtTime(0, t0 + attack + dur);
    src.connect(f);
    f.connect(env);
    env.connect(this.route(bus, { pan, send }));
    src.start(t0, Math.random() * (this.noise[kind].duration - 1));
    src.stop(t0 + attack + dur + 0.05);
  }

  /**
   * Glass / crystal bell: inharmonic partials with individual decays plus a
   * detuned fundamental for slow beating shimmer.
   */
  bell(bus, o) {
    const ctx = this.ctx;
    if (!ctx) return;
    const {
      freq = 440, gain = 0.25, pan = 0, send = 0.45, decay = 4, vel = 0.7, delay = 0,
      partials = [[1, 1, 1], [2.76, 0.32, 0.55], [5.4, 0.14, 0.3], [8.93, 0.06, 0.16]],
    } = o;
    const t0 = ctx.currentTime + delay;
    const dest = this.route(bus, { pan, send });
    partials.forEach(([ratio, amp, dec], i) => {
      const f = freq * ratio;
      if (f > 14000) return;
      const voices = i === 0 ? [0, 1.1] : [0];
      for (const beat of voices) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f + beat * (freq / 440);
        const env = ctx.createGain();
        // Harder strikes excite upper partials more.
        const a = gain * amp * (i === 0 ? 1 : 0.35 + vel * 0.9) * (i === 0 && beat ? 0.5 : 1);
        const d = decay * dec;
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(a * vel, t0 + 0.002);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        osc.connect(env);
        env.connect(dest);
        osc.start(t0);
        osc.stop(t0 + d + 0.05);
      }
    });
    // Tiny strike transient.
    this.burst(bus, { kind: 'white', dur: 0.012, gain: 0.09 * vel, type: 'highpass', freq: 5000, pan, send: 0.1, delay });
  }

  /** Soft water-bubble style blip: sine glide upward then fade. */
  bubble(bus, { freq = 600, gain = 0.25, pan = 0, send = 0.4, delay = 0, dur = 0.22, rise = 1.7 } = {}) {
    this.tone(bus, { freq: freq * 0.7, freqEnd: freq * rise, sweepTime: 0.035, dur, gain, pan, send, delay, attack: 0.004 });
    this.tone(bus, { freq: freq * 1.4, freqEnd: freq * rise * 1.4, sweepTime: 0.035, dur: dur * 0.5, gain: gain * 0.25, pan, send, delay, attack: 0.004 });
  }

  /** Continuous filtered noise. Returns NoiseLoop with .set() / .stop(). */
  loop(bus, opts) {
    return new NoiseLoop(this, bus, opts);
  }

  haptic(ms = 8) {
    if (this.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (_) { /* ignore */ }
    }
  }
}

export class NoiseLoop {
  constructor(engine, bus, { kind = 'pink', filter = 'bandpass', freq = 1000, q = 1, gain = 0, pan = 0, send = 0.15 } = {}) {
    const ctx = engine.ctx;
    this.ctx = ctx;
    this.src = ctx.createBufferSource();
    this.src.buffer = engine.noise[kind];
    this.src.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = filter;
    this.filter.frequency.value = freq;
    this.filter.Q.value = q;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.out = engine.route(bus, { pan, send });
    this.src.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.out);
    this.src.start(0, rand(0, engine.noise[kind].duration - 0.1));
    this.stopped = false;
    this.set({ gain }, 0.02);
  }

  set({ gain, freq, q, pan } = {}, tc = 0.04) {
    if (this.stopped) return;
    const now = this.ctx.currentTime;
    if (pan !== undefined && this.out.panner) this.out.panner.pan.setTargetAtTime(clamp(pan, -1, 1), now, 0.05);
    if (gain !== undefined) this.gain.gain.setTargetAtTime(Math.max(0, gain), now, tc);
    if (freq !== undefined) this.filter.frequency.setTargetAtTime(Math.max(20, freq), now, tc);
    if (q !== undefined) this.filter.Q.setTargetAtTime(q, now, tc);
  }

  stop(fade = 0.25) {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0, now, fade / 3);
    try { this.src.stop(now + fade + 0.2); } catch (_) { /* ignore */ }
  }
}

/** Slowly evolving ambient pad: crossfades between chords forever. */
export class Pad {
  constructor(engine, bus, { chords, gain = 0.05, cutoff = 1100, period = 18, wave = 'sine' } = {}) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.chords = chords;
    this.period = period;
    this.wave = wave;
    this.i = 0;
    this.voices = [];
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.setTargetAtTime(gain, ctx.currentTime, 2.5);
    this.level = gain;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = cutoff;
    this.lp.Q.value = 0.4;
    this.master.connect(this.lp);
    this.lp.connect(engine.route(bus, { send: 0.55 }));
    this._next();
    this.timer = setInterval(() => this._next(), period * 1000);
  }

  setLevel(g) {
    this.level = g;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 1.2);
  }

  _next() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const fadeIn = this.period * 0.45;
    const old = this.voices;
    this.voices = [];
    for (const v of old) {
      v.env.gain.cancelScheduledValues(now);
      v.env.gain.setTargetAtTime(0, now, fadeIn / 3);
      v.oscs.forEach((o) => o.stop(now + fadeIn * 2.5));
    }
    const chord = this.chords[this.i++ % this.chords.length];
    for (const note of chord) {
      const f = midiToFreq(note);
      const env = ctx.createGain();
      env.gain.value = 0;
      env.gain.setTargetAtTime(1 / chord.length, now, fadeIn / 3);
      // Slow tremolo so the pad breathes.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(0.05, 0.14);
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.28 / chord.length;
      lfo.connect(lfoGain);
      lfoGain.connect(env.gain);
      const oscs = [lfo];
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = this.wave;
        o.frequency.value = f;
        o.detune.value = det + rand(-2, 2);
        o.connect(env);
        o.start(now);
        oscs.push(o);
      }
      lfo.start(now);
      env.connect(this.master);
      this.voices.push({ env, oscs });
    }
  }

  stop(fade = 1.5) {
    clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, fade / 3);
    for (const v of this.voices) v.oscs.forEach((o) => { try { o.stop(now + fade + 0.5); } catch (_) { /* ignore */ } });
    this.voices = [];
  }
}
