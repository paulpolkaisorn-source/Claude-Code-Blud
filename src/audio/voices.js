import { clamp, rand, midiToHz, PENTATONIC } from '../utils/math.js';

// Every sound is synthesised here from noise and oscillators. Each voice randomises
// pitch, timbre and level a little so repeated actions never sound identical, and
// every gain change is ramped so nothing clicks on start or stop.
export class Voices {
  constructor(engine) {
    this.e = engine;
    this.hissGain = null;
    this.slimeGain = null;
    this.slimeFilter = null;
    this.padGain = null;
    this.padFilter = null;
    this.padOscs = [];
    this.chordIndex = 0;
    this.chordTimer = null;
    this.ambientNodes = [];
    this.lastChimeMidi = -1;
  }

  get ctx() {
    return this.e.ctx;
  }

  // ---- Sand --------------------------------------------------------------

  // A cut: a band-limited body burst plus a train of tiny grain ticks, all from one gain envelope.
  crunch({ intensity = 0.5, pan = 0 }) {
    if (!this.e.canVoice()) return;
    const c = this.ctx;
    const t = c.currentTime + 0.004;
    const k = clamp(intensity, 0.05, 1);
    const dur = rand(0.05, 0.1) * (0.6 + 0.7 * k);

    const body = this.e.noiseSource('white');
    body.start(t, this.e.randomOffset(), dur + 0.05);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rand(1100, 3600) * (0.8 + 0.4 * k);
    bp.Q.value = rand(0.6, 1.3);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.55 * k * rand(0.7, 1.05), t + 0.004);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    body.connect(bp).connect(bg).connect(this.panOut(pan, 'sand'));
    this.e.trackVoice(body);

    const grains = this.e.noiseSource('white');
    grains.start(t, this.e.randomOffset(), 0.3);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = rand(2600, 6500);
    const gg = c.createGain();
    gg.gain.setValueAtTime(0.0001, t);
    const n = Math.min(12, Math.round(2 + k * 10));
    for (let i = 0; i < n; i++) {
      const tk = t + rand(0, dur);
      const amp = 0.35 * k * rand(0.3, 1);
      gg.gain.setValueAtTime(amp, tk);
      gg.gain.exponentialRampToValueAtTime(0.0001, tk + rand(0.003, 0.009));
    }
    grains.connect(hp).connect(gg).connect(this.panOut(pan, 'sand'));
    grains.stop(t + dur + 0.05);
  }

  // Continuous soft hiss, its level follows cutting speed. Started on station enter.
  startHiss() {
    if (!this.ctx || this.hissGain) return;
    const c = this.ctx;
    const src = this.e.noiseSource('pink', true);
    src.start(0, this.e.randomOffset());
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3400;
    bp.Q.value = 0.45;
    this.hissGain = c.createGain();
    this.hissGain.gain.value = 0;
    src.connect(bp).connect(this.hissGain).connect(this.e.buses.sand.in);
    this.hissSrc = src;
  }

  setHiss(level) {
    if (!this.hissGain) return;
    this.hissGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.09, this.ctx.currentTime, 0.09);
  }

  stopHiss() {
    if (!this.hissGain) return;
    const t = this.ctx.currentTime;
    this.hissGain.gain.setTargetAtTime(0, t, 0.05);
    const src = this.hissSrc;
    this.hissSrc = null;
    const g = this.hissGain;
    this.hissGain = null;
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
        g.disconnect();
      } catch (_) {
        /* already stopped */
      }
    }, 400);
  }

  // ---- Crystal -----------------------------------------------------------

  // Tuned, inharmonic bell with long decay. Degree picks a pentatonic note from a base octave.
  chime({ degree = 0, vel = 0.6, pan = 0 }) {
    if (!this.e.canVoice()) return;
    const c = this.ctx;
    const t = c.currentTime + 0.003;
    const oct = Math.floor(degree / PENTATONIC.length);
    const idx = ((degree % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length;
    const midi = 57 + PENTATONIC[idx] + oct * 12 + (Math.random() < 0.15 ? 12 : 0);
    const base = midiToHz(midi) * (1 + rand(-0.0025, 0.0025));
    const out = this.panOut(pan, 'crystal');
    const partials = [
      { r: 1.0, a: 0.5, d: rand(2.8, 3.6) },
      { r: 2.0, a: 0.2, d: rand(1.8, 2.4) },
      { r: 2.76, a: 0.11, d: rand(1.2, 1.6) },
      { r: 5.4, a: 0.045, d: rand(0.7, 1.0) },
    ];
    let last = null;
    for (const p of partials) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * p.r * (1 + rand(-0.0015, 0.0015));
      const g = c.createGain();
      const peak = p.a * clamp(vel, 0.1, 1) * 0.42;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.0025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + p.d + 0.05);
      last = o;
    }
    // A tiny transient so the strike reads as touch, not pure tone.
    const tick = this.e.noiseSource('white');
    tick.start(t, this.e.randomOffset(), 0.02);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const tg = c.createGain();
    tg.gain.setValueAtTime(0.06 * clamp(vel, 0.1, 1), t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    tick.connect(hp).connect(tg).connect(out);
    tick.stop(t + 0.02);

    this.e.trackVoice(last);
    this.lastChimeMidi = midi;
  }

  // ---- Slime -------------------------------------------------------------

  // Wet squelch: a sweeping band-passed brown-noise burst plus a falling sine blip.
  squelch({ pitch = 170, intensity = 0.5, pan = 0 }) {
    if (!this.e.canVoice()) return;
    const c = this.ctx;
    const t = c.currentTime + 0.003;
    const k = clamp(intensity, 0.05, 1);
    const dur = rand(0.16, 0.24);
    const out = this.panOut(pan, 'slime');

    const src = this.e.noiseSource('brown');
    src.start(t, this.e.randomOffset(), dur + 0.05);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = rand(1.0, 1.8);
    bp.frequency.setValueAtTime(pitch * rand(1.8, 2.4), t);
    bp.frequency.exponentialRampToValueAtTime(pitch * rand(0.8, 1.0), t + dur * 0.9);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * k, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(out);
    this.e.trackVoice(src);

    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(pitch * rand(1.6, 1.9), t);
    o.frequency.exponentialRampToValueAtTime(pitch * rand(0.65, 0.8), t + 0.09);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.22 * k, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.15);
  }

  startSlime() {
    if (!this.ctx || this.slimeGain) return;
    const c = this.ctx;
    const src = this.e.noiseSource('brown', true);
    src.start(0, this.e.randomOffset());
    this.slimeFilter = c.createBiquadFilter();
    this.slimeFilter.type = 'bandpass';
    this.slimeFilter.frequency.value = 240;
    this.slimeFilter.Q.value = 2.5;
    this.slimeGain = c.createGain();
    this.slimeGain.gain.value = 0;
    src.connect(this.slimeFilter).connect(this.slimeGain).connect(this.e.buses.slime.in);
    this.slimeSrc = src;
  }

  // Stretch level (0..1) and pitch (Hz) of the continuous slime drag tone.
  setSlime(level, pitch) {
    if (!this.slimeGain) return;
    const t = this.ctx.currentTime;
    this.slimeGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.16, t, 0.04);
    this.slimeFilter.frequency.setTargetAtTime(clamp(pitch, 90, 1400), t, 0.05);
  }

  stopSlime() {
    if (!this.slimeGain) return;
    this.slimeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    const src = this.slimeSrc;
    const g = this.slimeGain;
    this.slimeSrc = null;
    this.slimeGain = null;
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
        g.disconnect();
      } catch (_) {
        /* already stopped */
      }
    }, 400);
  }

  // ---- Bubble wrap -------------------------------------------------------

  // Three timbres chosen at random: a crisp pop, a soft thock, or a short crackle.
  pop({ pan = 0, vel = 1 }) {
    if (!this.e.canVoice()) return;
    const r = Math.random();
    if (r < 0.6) this.popCrisp(pan, vel);
    else if (r < 0.85) this.popThock(pan, vel);
    else this.popCrackle(pan, vel);
  }

  popCrisp(pan, vel) {
    const c = this.ctx;
    const t = c.currentTime + 0.002;
    const v = clamp(vel, 0.2, 1) * rand(0.8, 1);
    const src = this.e.noiseSource('white');
    src.start(t, this.e.randomOffset(), 0.05);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rand(1300, 3800);
    bp.Q.value = rand(4, 9);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.9 * v, t + 0.0012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.012, 0.03));
    src.connect(bp).connect(g).connect(this.panOut(pan, 'bubble'));
    this.e.trackVoice(src);

    const o = c.createOscillator();
    o.type = 'sine';
    const f = rand(900, 1700);
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.14 * v, t + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(og).connect(this.panOut(pan, 'bubble'));
    o.start(t);
    o.stop(t + 0.05);
  }

  popThock(pan, vel) {
    const c = this.ctx;
    const t = c.currentTime + 0.002;
    const v = clamp(vel, 0.2, 1) * rand(0.8, 1);
    const f = rand(150, 260);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.7 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.05, 0.09));
    o.connect(g).connect(this.panOut(pan, 'bubble'));
    o.start(t);
    o.stop(t + 0.12);
    const src = this.e.noiseSource('white');
    src.start(t, this.e.randomOffset(), 0.04);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = rand(500, 800);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.12 * v, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(lp).connect(ng).connect(this.panOut(pan, 'bubble'));
    this.e.trackVoice(src);
  }

  popCrackle(pan, vel) {
    const c = this.ctx;
    const t0 = c.currentTime + 0.002;
    const v = clamp(vel, 0.2, 1) * rand(0.7, 0.95);
    const src = this.e.noiseSource('white');
    src.start(t0, this.e.randomOffset(), 0.2);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = rand(1800, 3200);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    let t = t0;
    const ticks = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < ticks; i++) {
      t += rand(0.006, 0.016);
      g.gain.setValueAtTime(0.5 * v * rand(0.5, 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004);
    }
    src.connect(hp).connect(g).connect(this.panOut(pan, 'bubble'));
    src.stop(t + 0.02);
    this.e.trackVoice(src);
  }

  // ---- Ambient -----------------------------------------------------------

  // Room tone (very quiet brown noise with slow breathing) and a soft pad whose chords drift.
  startAmbient() {
    if (!this.ctx || this.padOscs.length) return;
    const c = this.ctx;
    const out = this.e.buses.ambient.in;

    const room = this.e.noiseSource('brown', true);
    room.start(0, this.e.randomOffset());
    const roomLp = c.createBiquadFilter();
    roomLp.type = 'lowpass';
    roomLp.frequency.value = 260;
    const roomGain = c.createGain();
    roomGain.gain.value = 0.035;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = c.createGain();
    lfoAmt.gain.value = 0.012;
    lfo.connect(lfoAmt).connect(roomGain.gain);
    room.connect(roomLp).connect(roomGain).connect(out);
    lfo.start();
    this.ambientNodes.push(room, lfo);

    this.padFilter = c.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 520;
    this.padFilter.Q.value = 0.4;
    this.padGain = c.createGain();
    this.padGain.gain.value = 0.012;
    this.padFilter.connect(this.padGain).connect(out);
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.detune.value = (i - 1.5) * 6;
      const dl = c.createOscillator();
      dl.frequency.value = rand(0.05, 0.12);
      const dla = c.createGain();
      dla.gain.value = 4;
      dl.connect(dla).connect(o.detune);
      o.connect(this.padFilter);
      o.start();
      dl.start();
      this.padOscs.push(o);
      this.ambientNodes.push(dl);
    }
    this.setChord(0, true);
    this.scheduleChord();
  }

  setChord(index, instant = false) {
    const chords = [
      [50, 57, 62, 66],
      [48, 55, 60, 64],
      [52, 59, 62, 67],
      [45, 52, 57, 64],
    ];
    const chord = chords[index % chords.length];
    const t = this.ctx.currentTime;
    this.padOscs.forEach((o, i) => {
      const f = midiToHz(chord[i]) * 0.5;
      if (instant) o.frequency.value = f;
      else o.frequency.setTargetAtTime(f, t, 1.6);
    });
  }

  scheduleChord() {
    clearTimeout(this.chordTimer);
    this.chordTimer = setTimeout(() => {
      if (!this.ctx) return;
      this.chordIndex = (this.chordIndex + 1) % 4;
      this.setChord(this.chordIndex);
      this.scheduleChord();
    }, rand(9000, 13000));
  }

  // activity 0..1 from the flow meter: opens the pad and warms it.
  setActivity(level) {
    if (!this.padGain) return;
    const t = this.ctx.currentTime;
    const l = clamp(level, 0, 1);
    this.padGain.gain.setTargetAtTime(0.012 + 0.03 * l, t, 0.8);
    this.padFilter.frequency.setTargetAtTime(480 + 1400 * l, t, 0.8);
  }

  stopAmbient() {
    clearTimeout(this.chordTimer);
    this.chordTimer = null;
  }

  // Routes a voice through its own stereo panner and into the station bus.
  panOut(pan, bus) {
    const p = this.e.panner(pan);
    p.connect(this.e.buses[bus].in);
    return p;
  }
}
