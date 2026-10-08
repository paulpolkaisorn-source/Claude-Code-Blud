import { clamp } from '../utils/math.js';

// Quality presets. Each tier fully describes what the renderer may spend.
export const TIERS = [
  {
    name: 'Low',
    maxDpr: 1,
    bloom: 0,
    shadowMap: 512,
    dust: 320,
    transmission: false,
    grain: 0,
    aberration: 0,
    edgeBlur: 0.6,
    texSize: 256,
  },
  {
    name: 'High',
    maxDpr: 1.5,
    bloom: 0.32,
    shadowMap: 1024,
    dust: 900,
    transmission: true,
    grain: 0.035,
    aberration: 0.0007,
    edgeBlur: 1,
    texSize: 512,
  },
  {
    name: 'Ultra',
    maxDpr: 2,
    bloom: 0.42,
    shadowMap: 2048,
    dust: 1800,
    transmission: true,
    grain: 0.05,
    aberration: 0.0012,
    edgeBlur: 1.25,
    texSize: 512,
  },
];

const WINDOW = 120; // frames in the rolling window
const DOWN_RATIO = 1.6; // dropping below 1/1.6 of refresh cadence counts as struggling
const UP_RATIO = 1.12;

// Adaptive quality: a rolling frame-time window judged against the display's own cadence,
// so a 60 Hz, 120 Hz or 144 Hz screen all count as "smooth" at their native rate.
// Auto steps the pixel-density scale first, then the tier. Manual modes pin the tier.
export class QualityManager {
  constructor({ mode = 'auto', tier = 1, onChange }) {
    this.mode = mode;
    this.tier = mode === 'auto' ? tier : ['low', 'high', 'ultra'].indexOf(mode);
    this.resScale = 1;
    this.onChange = onChange;
    this.frames = new Float32Array(WINDOW);
    this.count = 0;
    this.head = 0;
    this.baseline = 0;
    this.calibrating = 0;
    this.calibrateSamples = [];
    this.struggleTime = 0;
    this.comfortTime = 0;
    this.cooldown = 0;
    this.fps = 0;
    this.avgMs = 0;
  }

  get settings() {
    return TIERS[this.tier];
  }

  get label() {
    return this.mode === 'auto' ? `Auto · ${TIERS[this.tier].name}` : TIERS[this.tier].name;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto') {
      this.tier = ['low', 'high', 'ultra'].indexOf(mode);
      this.resScale = 1;
    }
    this.notify();
  }

  // dtMs is the frame interval in milliseconds, measured by the render loop.
  update(dtMs, dtSec) {
    if (dtMs <= 0 || dtMs > 1000) return;
    this.frames[this.head] = dtMs;
    this.head = (this.head + 1) % WINDOW;
    this.count = Math.min(this.count + 1, WINDOW);

    // Calibrate the baseline (display cadence) over the first ~1.5 s of frames.
    if (this.baseline === 0) {
      this.calibrateSamples.push(dtMs);
      this.calibrating += dtSec;
      if (this.calibrating > 1.5 && this.calibrateSamples.length > 10) {
        const s = this.calibrateSamples.slice().sort((a, b) => a - b);
        this.baseline = s[Math.floor(s.length * 0.1)];
        this.calibrateSamples = null;
      }
      return;
    }

    if (this.count < WINDOW / 2) return;
    let sum = 0;
    for (let i = 0; i < this.count; i++) sum += this.frames[i];
    const avg = sum / this.count;
    this.avgMs = avg;
    this.fps = 1000 / avg;
    this.cooldown = Math.max(0, this.cooldown - dtSec);
    if (this.mode !== 'auto' || this.cooldown > 0) return;

    if (avg > this.baseline * DOWN_RATIO) {
      this.struggleTime += dtSec;
      this.comfortTime = 0;
      if (this.struggleTime > 1.2) {
        this.struggleTime = 0;
        this.stepDown();
      }
    } else if (avg < this.baseline * UP_RATIO) {
      this.comfortTime += dtSec;
      this.struggleTime = 0;
      if (this.comfortTime > 8) {
        this.comfortTime = 0;
        this.stepUp();
      }
    } else {
      this.struggleTime = 0;
      this.comfortTime = 0;
    }
  }

  stepDown() {
    if (this.resScale > 0.6) {
      this.resScale = clamp(this.resScale - 0.1, 0.6, 1);
    } else if (this.tier > 0) {
      this.tier--;
      this.resScale = 0.9;
    } else {
      return;
    }
    this.cooldown = 2.5;
    this.notify();
  }

  stepUp() {
    if (this.resScale < 1) {
      this.resScale = clamp(this.resScale + 0.1, 0.6, 1);
    } else if (this.tier < TIERS.length - 1) {
      this.tier++;
      this.resScale = 0.8;
    } else {
      return;
    }
    this.cooldown = 4;
    this.notify();
  }

  notify() {
    if (this.onChange) this.onChange(this);
  }
}
