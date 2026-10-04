// Dynamic resolution scaling. Watches real frame times and nudges the internal render
// resolution so the game holds ~60 fps on whatever GPU the browser is actually using.
// When the scale is below 1 the canvas is upscaled (and sharpened where a post chain exists).

export const TARGET_FPS = 58;

export class DynamicRes {
  /**
   * mode: 'adaptive' | 'native' | '0.75' | '0.5'
   * apply(scale): called when the internal scale changes (scale in [min, 1])
   */
  constructor({ mode = 'adaptive', min = 0.5, apply }) {
    this.mode = mode;
    this.min = min;
    this.apply = apply;
    this.scale = 1;
    this.ema = 1 / 60;
    this.last = 0;
    this.sinceEval = 0;
    this.sinceChange = -1.5; // warm-up: ignore shader-compile hitches at start
    this.stable = 0;
    this.ceiling = 1;       // highest scale that did not cause a drop
    this.probing = false;
    this.probeFrom = 1;
    this.holdUntil = 0;
    this.fps = 60;
    if (mode === '0.75' || mode === '0.5') this.scale = parseFloat(mode);
  }

  /** Call once per rendered frame with the current time in ms (performance.now()). */
  tick(now) {
    if (!this.last) { this.last = now; return; }
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 1.5 && !this.prevLong) { this.prevLong = true; this.sinceChange = Math.min(this.sinceChange, 0); return; } // one-off stall (tab switch): ignore
    this.prevLong = dt > 1.5; // consecutive crawling frames are real: they must trigger a downscale
    const real = Math.min(dt, 4);
    if (dt > 0.25) dt = 0.25; // very slow frames still count, but one stall can't dominate the average
    this.ema += (dt - this.ema) * (dt > 0.1 ? 0.35 : 0.08); // react fast when the game is crawling
    this.fps = 1 / this.ema;
    if (this.mode !== 'adaptive') return;
    this.sinceEval += real;
    this.sinceChange += real;
    if (this.sinceChange < 0.8 || this.sinceEval < 0.4) return; // let a change settle
    this.sinceEval = 0;
    const target = 1 / TARGET_FPS;
    if (this.ema > target * 1.12) {
      // too slow: scale resolution by how far off we are (frame cost ~ pixels)
      this.stable = 0;
      const k = Math.max(0.72, Math.min(0.97, Math.sqrt(target / this.ema)));
      if (this.probing) { this.ceiling = Math.max(this.min, this.probeFrom); this.holdUntil = performance.now() + 20000; this.probing = false; }
      this.set(Math.max(this.min, this.scale * k));
    } else {
      this.stable += 0.4;
      // after ~4s of being comfortably fast, try a slightly higher resolution
      if (this.scale < this.ceiling - 0.005 && this.stable > 4 && performance.now() > this.holdUntil) {
        this.stable = 0;
        this.probing = true;
        this.probeFrom = this.scale;
        this.set(Math.min(this.ceiling, this.scale * 1.07));
      } else if (this.probing && this.stable > 2) {
        this.probing = false; // the probe held
      }
    }
  }

  set(scale) {
    scale = Math.round(scale * 100) / 100;
    if (scale === this.scale) return;
    this.scale = scale;
    this.sinceChange = 0;
    this.apply(scale);
  }
}
