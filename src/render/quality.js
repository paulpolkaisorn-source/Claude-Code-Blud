// quality.js: quality presets, the pixel-ratio policy, and the FPS watchdog behind autoQuality.
// Pure logic: no THREE import, no allocations per frame.

export const QUALITY_PRESETS = {
  high: { shadows: true, bloom: true },
  low: { shadows: false, bloom: false },
};

// Pixel ratio for a preset. Low renders at 1; high uses devicePixelRatio capped at 2 (1.5 on mobile).
export function pixelRatioFor(level, dpr, mobile) {
  if (level === 'low') return 1;
  const cap = mobile ? 1.5 : 2;
  const d = dpr > 0 ? dpr : 1;
  return d < cap ? d : cap;
}

// FPS watchdog. Frame times are averaged over windows of `windowSec`. frame(sec) returns true exactly once:
// when the fps stays below `threshold` for `sustain` seconds while enabled, after which it disarms itself.
// Frames longer than 1 s (hidden tab, debugger pause) are not samples.
export function createAutoQuality({ threshold = 45, sustain = 3, windowSec = 0.5 } = {}) {
  let enabled = false;
  let winT = 0, winN = 0, lowT = 0, fps = 0;
  return {
    get enabled() { return enabled; },
    get fps() { return fps; },
    set(on) { enabled = !!on; winT = 0; winN = 0; lowT = 0; },
    frame(sec) {
      if (!(sec > 0) || sec > 1) { winT = 0; winN = 0; return false; }
      winT += sec;
      winN++;
      if (winT < windowSec) return false;
      fps = winN / winT;
      lowT = fps < threshold ? lowT + winT : 0;
      winT = 0;
      winN = 0;
      if (enabled && lowT >= sustain) { enabled = false; lowT = 0; return true; }
      return false;
    },
  };
}
