export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth01 = (t) => t * t * (3 - 2 * t);
export const expDamp = (current, target, lambda, dt) => target + (current - target) * Math.exp(-lambda * dt);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const randSign = () => (Math.random() < 0.5 ? -1 : 1);

// Equal-tempered frequency helper (A4 = 440).
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Pentatonic (major) scale degrees in semitones over a root, used by the crystal chimes.
export const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
