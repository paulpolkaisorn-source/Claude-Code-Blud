// Small deterministic noise helpers shared by the procedural textures and props.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(ix, iy, seed = 0) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Value noise in [0,1]. px/py (integers, lattice cells) make it tile with that period.
export function vnoise(x, y, seed = 0, px = 0, py = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let ax = x0, bx = x0 + 1, ay = y0, by = y0 + 1;
  if (px) { ax = ((ax % px) + px) % px; bx = ((bx % px) + px) % px; }
  if (py) { ay = ((ay % py) + py) % py; by = ((by % py) + py) % py; }
  const a = hash2(ax, ay, seed), b = hash2(bx, ay, seed), c = hash2(ax, by, seed), d = hash2(bx, by, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 4, seed = 0, px = 0, py = 0) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * vnoise(x * f, y * f, seed + o * 31, px * f, py * f);
    n += amp; amp *= 0.5; f *= 2;
  }
  return s / n;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
