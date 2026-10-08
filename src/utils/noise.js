// Seeded value noise + fractal sum. Used for procedural textures and organic motion.
const perm = new Uint8Array(512);
const vals = new Float32Array(256);
(function init(seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rnd();
  }
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
})(1337);

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function vnoise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const X = xi & 255;
  const Y = yi & 255;
  const a = vals[perm[perm[X] + Y] & 255];
  const b = vals[perm[perm[X + 1] + Y] & 255];
  const c = vals[perm[perm[X] + Y + 1] & 255];
  const d = vals[perm[perm[X + 1] + Y + 1] & 255];
  const u = fade(xf);
  const v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Fractal Brownian motion, returns roughly 0..1.
export function fbm2(x, y, octaves = 5) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise2(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// Cheap 1D smooth noise in -1..1, for wobble and drift.
export function noise1(t) {
  return vnoise2(t, 0.37) * 2 - 1;
}
