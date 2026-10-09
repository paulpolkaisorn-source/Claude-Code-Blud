// Physically based swimming-pool water for the resort scene.
//
//  * Surface: linear dispersive wave field on the pool-config grid (spectral/DCT
//    solver, reflective walls, interference, viscous-like decay, volume
//    conserving), plus tileable procedural ripples, rain rings, foam.
//  * Rendering: Fresnel (F0 ~ 0.02) planar reflection, depth-aware refraction with
//    Beer-Lambert absorption, GGX sun glints (via MeshPhysicalMaterial),
//    sun caustics traced through the surface onto floor and walls.
//  * Bodies: rigid floating bodies (beach ball, ring, duck, mattress, cannonball)
//    with hydrostatic buoyancy, drag, added mass, collisions, two-way coupling.
//  * Spray: ballistic droplets (mode 'spray'); rain streaks; 'particles' mode renders
//    from externally supplied heights and routes disturbances to externalDisturb.
//
// Public contract: class PoolWater (see the member docs below). Extra members:
//   bodies, heights, sprayCount, stats(), quality, wind, rain, time, dispose(),
//   and the static PoolWater.QUALITY table (per-quality render budget).
//
// Integration notes
//  * Frame order: water.update(dt) -> [water.setExternalHeights(h) in 'particles' mode, any time
//    before beforeRender] -> water.beforeRender(renderer, scene, camera) -> renderer.render.
//  * beforeRender renders, besides the caller's final pass: a caustic map (fullscreen pass, only
//    while the sun is up; every 2nd frame on 'low'), a refraction pass (scene below the surface,
//    oblique-clipped, with depth) and, on 'medium'/'high', a planar reflection pass. It restores
//    renderer state exactly, hides the water/spray/rain objects while it renders, and reuses the
//    previous frame's shadow map for these extra passes.
//  * applyUnderwaterLighting(material) expects a MeshStandardMaterial (or subclass) used by pool
//    floor/walls/steps/ladders/bodies; below the surface it applies Beer-Lambert attenuation of
//    sun and sky light and sun caustics (looked up by world position). It leaves everything above
//    the water untouched and can be called before or after the first render.
//  * Assumes a PerspectiveCamera, a standard (non-logarithmic) depth buffer and the water at
//    y = POOL.waterLevel. The surface never casts shadows; it receives them.
//  * Bodies keep 0.25 m off the walls (ladder rails may sit there); they only know the walls
//    and the floor profile, not other fixtures.
import * as THREE from 'three';
import { POOL, HF, HF_DX, HF_DZ, MODES, BODY_TYPES, floorY } from './pool-config.js';

// ===========================================================================
// 1. Spectral wave solver (pure JS, no three.js)
//
// The surface is a linear, dispersive, damped water-wave field on the pool
// grid with reflective (Neumann) walls. Each cosine mode (m, n) of the cell
// centred grid is an exact damped oscillator with the gravity-wave dispersion
// relation  w^2 = (g k + (s/r) k^3) tanh(k H),  so ring waves spread the way
// real ripples do (long waves lead, short ripples trail), waves reflect off
// the walls and interfere, and the scheme is unconditionally stable (every
// step is an exact rotation of each mode, times a decay factor < 1). The
// (0,0) mode is removed every step, so the mean level never drifts (volume is
// conserved). Sources (pointer, bodies) are splatted in physical space and
// transformed once per step with a fast DCT built on a radix-2 FFT.
// ===========================================================================
const GRAV = 9.81;
const SIM_STEP = 1 / 60;          // fixed internal step (s)
const SIM_CAP = 0.45;             // soft limit on |surface offset| (m)

function makeFFT(n) {
  const half = n >> 1;
  const cos = new Float64Array(half), sin = new Float64Array(half);
  for (let i = 0; i < half; i++) { const a = 2 * Math.PI * i / n; cos[i] = Math.cos(a); sin[i] = Math.sin(a); }
  const bits = Math.round(Math.log2(n));
  if ((1 << bits) !== n) throw new Error('FFT size must be a power of two');
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    rev[i] = r;
  }
  // Makhoul reorder: v[t] = x[src[t]]
  const src = new Uint32Array(n);
  for (let t = 0; t < n; t++) src[t] = t < half ? 2 * t : 2 * (n - 1 - t) + 1;
  const gather = new Uint32Array(n);
  for (let t = 0; t < n; t++) gather[t] = src[rev[t]];
  const tc = new Float64Array(n), ts = new Float64Array(n);
  for (let k = 0; k < n; k++) { const a = Math.PI * k / (2 * n); tc[k] = Math.cos(a); ts[k] = Math.sin(a); }
  return { n, cos, sin, rev, src, gather, tc, ts };
}

// forward complex FFT, bit-reversed input -> natural output
function fftDIT(p, zr, zi) {
  const n = p.n, cs = p.cos, sn = p.sin;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0, tw = 0; j < half; j++, tw += step) {
        const wr = cs[tw], wi = -sn[tw];
        const a = i + j, b = a + half;
        const tr = zr[b] * wr - zi[b] * wi, ti = zr[b] * wi + zi[b] * wr;
        zr[b] = zr[a] - tr; zi[b] = zi[a] - ti;
        zr[a] += tr; zi[a] += ti;
      }
    }
  }
}
// inverse (e^{+i}) complex FFT, natural input -> bit-reversed output, unnormalised
function fftDIF(p, zr, zi) {
  const n = p.n, cs = p.cos, sn = p.sin;
  for (let len = n; len >= 2; len >>= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0, tw = 0; j < half; j++, tw += step) {
        const wr = cs[tw], wi = sn[tw];
        const a = i + j, b = a + half;
        const xr = zr[a] - zr[b], xi = zi[a] - zi[b];
        zr[a] += zr[b]; zi[a] += zi[b];
        zr[b] = xr * wr - xi * wi; zi[b] = xr * wi + xi * wr;
      }
    }
  }
}
// the same two transforms applied along the row index of an (n x np) complex plane
function fftRowsDIT(p, PR, PI, np) {
  const n = p.n, cs = p.cos, sn = p.sin;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0, tw = 0; j < half; j++, tw += step) {
        const wr = cs[tw], wi = -sn[tw];
        const ra = (i + j) * np, rb = ra + half * np;
        for (let q = 0; q < np; q++) {
          const br = PR[rb + q], bi = PI[rb + q];
          const tr = br * wr - bi * wi, ti = br * wi + bi * wr;
          const ar = PR[ra + q], ai = PI[ra + q];
          PR[rb + q] = ar - tr; PI[rb + q] = ai - ti;
          PR[ra + q] = ar + tr; PI[ra + q] = ai + ti;
        }
      }
    }
  }
}
function fftRowsDIF(p, PR, PI, np) {
  const n = p.n, cs = p.cos, sn = p.sin;
  for (let len = n; len >= 2; len >>= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0, tw = 0; j < half; j++, tw += step) {
        const wr = cs[tw], wi = sn[tw];
        const ra = (i + j) * np, rb = ra + half * np;
        for (let q = 0; q < np; q++) {
          const ar = PR[ra + q], ai = PI[ra + q], br = PR[rb + q], bi = PI[rb + q];
          const xr = ar - br, xi = ai - bi;
          PR[ra + q] = ar + br; PI[ra + q] = ai + bi;
          PR[rb + q] = xr * wr - xi * wi; PI[rb + q] = xr * wi + xi * wr;
        }
      }
    }
  }
}

/** 2-D DCT-II / DCT-III pair on an nx*nz cell-centred grid (index i + j*nx).
 *  forward(S, A): A holds the cosine-series coefficients, so that
 *  field(i,j) = sum_mn A[m + n*nx] cos(pi m (i+.5)/nx) cos(pi n (j+.5)/nz).
 *  inverse(A, H) evaluates that sum. */
class DCT2D {
  constructor(nx, nz) {
    this.nx = nx; this.nz = nz;
    this.px = makeFFT(nx); this.pz = makeFFT(nz);
    this.np = nx >> 1;
    this.zr = new Float64Array(nx); this.zi = new Float64Array(nx);
    this.PR = new Float64Array(nz * this.np); this.PI = new Float64Array(nz * this.np);
    this.T = new Float64Array(nx * nz);
    this.sx = new Float64Array(nx); this.sz = new Float64Array(nz);
    for (let m = 0; m < nx; m++) this.sx[m] = (2 / nx) * (m === 0 ? 0.5 : 1);
    for (let n = 0; n < nz; n++) this.sz[n] = (2 / nz) * (n === 0 ? 0.5 : 1);
  }

  forward(S, A) {
    const { nx, nz, np, PR, PI, pz, px, T, zr, zi } = this;
    const mask = nx - 1;
    for (let qq = 0; qq < (nz >> 1); qq++) {
      const r0 = 2 * qq * nx, r1 = r0 + nx;
      for (let t = 0; t < nx; t++) { const g = px.gather[t]; zr[t] = S[r0 + g]; zi[t] = S[r1 + g]; }
      fftDIT(px, zr, zi);
      for (let k = 0; k < nx; k++) {
        const kc = (nx - k) & mask;
        const a = zr[k], b = zi[k], c = zr[kc], d = zi[kc];
        const cc = px.tc[k], ss = px.ts[k];
        T[r0 + k] = cc * 0.5 * (a + c) + ss * 0.5 * (b - d);
        T[r1 + k] = cc * 0.5 * (b + d) - ss * 0.5 * (a - c);
      }
    }
    for (let t = 0; t < nz; t++) {
      const row = pz.gather[t] * nx, off = t * np;
      for (let q = 0; q < np; q++) { PR[off + q] = T[row + 2 * q]; PI[off + q] = T[row + 2 * q + 1]; }
    }
    fftRowsDIT(pz, PR, PI, np);
    const zmask = nz - 1;
    for (let k = 0; k < nz; k++) {
      const kc = (nz - k) & zmask;
      const cc = pz.tc[k], ss = pz.ts[k], o = k * np, oc = kc * np, ro = k * nx, szk = this.sz[k];
      for (let q = 0; q < np; q++) {
        const a = PR[o + q], b = PI[o + q], c = PR[oc + q], d = PI[oc + q];
        A[ro + 2 * q] = (cc * 0.5 * (a + c) + ss * 0.5 * (b - d)) * szk * this.sx[2 * q];
        A[ro + 2 * q + 1] = (cc * 0.5 * (b + d) - ss * 0.5 * (a - c)) * szk * this.sx[2 * q + 1];
      }
    }
  }

  inverse(A, H) {
    const { nx, nz, np, PR, PI, pz, px, T, zr, zi } = this;
    for (let k = 0; k < nz; k++) {
      const off = k * np;
      if (k === 0) {
        for (let q = 0; q < np; q++) { PR[off + q] = 2 * A[2 * q]; PI[off + q] = 2 * A[2 * q + 1]; }
      } else {
        const c = pz.tc[k], s = pz.ts[k], rowK = k * nx, rowC = (nz - k) * nx;
        for (let q = 0; q < np; q++) {
          const a1 = A[rowK + 2 * q], b1 = A[rowC + 2 * q];
          const a2 = A[rowK + 2 * q + 1], b2 = A[rowC + 2 * q + 1];
          const u1r = c * a1 + s * b1, u1i = s * a1 - c * b1;
          const u2r = c * a2 + s * b2, u2i = s * a2 - c * b2;
          PR[off + q] = u1r - u2i; PI[off + q] = u1i + u2r;
        }
      }
    }
    fftRowsDIF(pz, PR, PI, np);
    for (let t = 0; t < nz; t++) {
      const ro = pz.src[pz.rev[t]] * nx, off = t * np;
      for (let q = 0; q < np; q++) { T[ro + 2 * q] = 0.5 * PR[off + q]; T[ro + 2 * q + 1] = 0.5 * PI[off + q]; }
    }
    for (let qq = 0; qq < (nz >> 1); qq++) {
      const r0 = 2 * qq * nx, r1 = r0 + nx;
      zr[0] = 2 * T[r0]; zi[0] = 2 * T[r1];
      for (let k = 1; k < nx; k++) {
        const kc = nx - k, c = px.tc[k], s = px.ts[k];
        const a1 = T[r0 + k], b1 = T[r0 + kc], a2 = T[r1 + k], b2 = T[r1 + kc];
        const u1r = c * a1 + s * b1, u1i = s * a1 - c * b1;
        const u2r = c * a2 + s * b2, u2i = s * a2 - c * b2;
        zr[k] = u1r - u2i; zi[k] = u1i + u2r;
      }
      fftDIF(px, zr, zi);
      for (let t = 0; t < nx; t++) { const i = px.src[px.rev[t]]; H[r0 + i] = 0.5 * zr[t]; H[r1 + i] = 0.5 * zi[t]; }
    }
  }
}

const FOAM_TAU = 2.4;             // foam decay time constant (s)
const WIND_DIR = (() => { const x = 1, z = 0.32, l = Math.hypot(x, z); return { x: x / l, z: z / l }; })();

/** Mean water depth over the pool, integrated from the floor profile. */
function meanPoolDepth() {
  const M = 2048;
  let s = 0;
  for (let i = 0; i < M; i++) s += -floorY(POOL.minX + (i + 0.5) / M * POOL.length);
  return s / M;
}

class WaveSim {
  constructor() {
    const nx = HF.nx, nz = HF.nz, N = nx * nz;
    this.nx = nx; this.nz = nz; this.N = N;
    this.dct = new DCT2D(nx, nz);
    this.A = new Float32Array(N);        // cosine coefficients of the surface offset
    this.V = new Float32Array(N);        // cosine coefficients of its time derivative
    this.h = new Float32Array(N);        // surface offset (m)
    this.hPrev = new Float32Array(N);
    this.wv = new Float32Array(N);       // vertical surface speed (m/s)
    this.foam = new Float32Array(N);
    this.src = new Float32Array(N);      // pending displacement sources (m)
    this.coef = new Float32Array(N);
    this.tex = new Float32Array(N * 4);  // (h, dh/dx, dh/dz, foam) per cell
    this.srcDirty = false;
    this.awake = false;
    this.dirty = true;
    this.foamActive = false;
    this.maxAbs = 0;
    this.windAmp = 0; this.rainAmp = 0;
    this._rng = 0x2545f491;
    this.depth = meanPoolDepth();
    this._buildTables();
  }

  _buildTables() {
    const { nx, nz, N } = this;
    const H = SIM_STEP, Hd = this.depth;
    const T11 = this.T11 = new Float32Array(N);
    const T12 = this.T12 = new Float32Array(N);
    const T21 = this.T21 = new Float32Array(N);
    const fIdx = [], fWind = [], fRain = [];
    const SIGMA = 7.3e-5;                           // surface tension / density (m^3/s^2)
    for (let n = 0; n < nz; n++) {
      const kz = Math.PI * n / POOL.width;
      for (let m = 0; m < nx; m++) {
        const kx = Math.PI * m / POOL.length;
        const k = Math.hypot(kx, kz), idx = m + n * nx;
        if (k === 0) { T11[idx] = 0; T12[idx] = 0; T21[idx] = 0; continue; }   // mean level is pinned
        const w2 = (GRAV * k + SIGMA * k * k * k) * Math.tanh(k * Hd);
        const w = Math.sqrt(w2);
        const gamma = 0.08 + 0.0011 * k * k;      // slow decay of long waves, fast of short ripples
        const e = Math.exp(-gamma * H), c = Math.cos(w * H), s = Math.sin(w * H);
        T11[idx] = e * c; T12[idx] = e * s / w; T21[idx] = -e * w * s;
        // stochastic forcing lists (wind chop, rain patter)
        if (k > 1.2 && k < 46) {
          const ang = Math.atan2(kz, kx), phi = Math.atan2(WIND_DIR.z, WIND_DIR.x);
          const c1 = Math.cos(ang - phi), c2 = Math.cos(ang + phi);
          const dirW = 0.25 + 0.75 * Math.max(c1 * c1, c2 * c2);
          const ramp = Math.min(1, (k - 1.2) / 3) * Math.min(1, (46 - k) / 14);
          fIdx.push(idx);
          fWind.push(dirW * ramp * Math.pow(k, -0.15));
          fRain.push(ramp * Math.min(1, Math.max(0, (k - 6) / 10)));
        }
      }
    }
    this.fIdx = Int32Array.from(fIdx);
    this.fWind = Float32Array.from(fWind);
    this.fRain = Float32Array.from(fRain);
  }

  reset() {
    this.A.fill(0); this.V.fill(0); this.h.fill(0); this.hPrev.fill(0); this.wv.fill(0);
    this.foam.fill(0); this.src.fill(0); this.tex.fill(0);
    this.srcDirty = false; this.awake = false; this.dirty = true; this.foamActive = false; this.maxAbs = 0;
  }

  setForcing(wind, rain) {
    // wind chop grows ~ wind^2 (about 5 mm rms at full wind); rain adds a fine patter
    this.windAmp = wind > 0.01 ? 0.00066 * wind * wind : 0;
    this.rainAmp = rain > 0.01 ? 0.00010 * rain : 0;
  }

  /** Add a smooth bump of surface displacement (peak in m, + = up) to the pending sources. */
  splat(x, z, R, peak) {
    if (!(R > 0) || !isFinite(peak) || peak === 0) return;
    const { nx, nz, src } = this;
    // very small footprints would fall between cell centres: widen and keep the volume
    const Rm = Math.max(R, 1.5 * HF_DX);
    const sc = (R * R) / (Rm * Rm);
    const pk = peak * (R < Rm ? sc : 1);
    const i0 = Math.max(0, Math.floor((x - Rm - POOL.minX) / HF_DX - 0.5));
    const i1 = Math.min(nx - 1, Math.ceil((x + Rm - POOL.minX) / HF_DX - 0.5));
    const j0 = Math.max(0, Math.floor((z - Rm - POOL.minZ) / HF_DZ - 0.5));
    const j1 = Math.min(nz - 1, Math.ceil((z + Rm - POOL.minZ) / HF_DZ - 0.5));
    const invR = 1 / Rm;
    for (let j = j0; j <= j1; j++) {
      const dz = POOL.minZ + (j + 0.5) * HF_DZ - z;
      for (let i = i0; i <= i1; i++) {
        const dx = POOL.minX + (i + 0.5) * HF_DX - x;
        const r = Math.sqrt(dx * dx + dz * dz) * invR;
        if (r < 1) {
          const idx = i + j * nx;
          let v = src[idx] + pk * 0.5 * (1 + Math.cos(Math.PI * r));
          src[idx] = v > 0.4 ? 0.4 : (v < -0.4 ? -0.4 : v);
        }
      }
    }
    this.srcDirty = true;
  }

  addFoam(x, z, R, amount) {
    const { nx, nz, foam } = this;
    const i0 = Math.max(0, Math.floor((x - R - POOL.minX) / HF_DX - 0.5));
    const i1 = Math.min(nx - 1, Math.ceil((x + R - POOL.minX) / HF_DX - 0.5));
    const j0 = Math.max(0, Math.floor((z - R - POOL.minZ) / HF_DZ - 0.5));
    const j1 = Math.min(nz - 1, Math.ceil((z + R - POOL.minZ) / HF_DZ - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = POOL.minX + (i + 0.5) * HF_DX - x, dz = POOL.minZ + (j + 0.5) * HF_DZ - z;
      const r = Math.sqrt(dx * dx + dz * dz) / R;
      if (r < 1) {
        const idx = i + j * nx;
        const v = foam[idx] + amount * (1 - r * r);
        foam[idx] = v > 1 ? 1 : v;
      }
    }
    this.foamActive = true; this.dirty = true;
  }

  _force() {
    const { V, fIdx, fWind, fRain } = this;
    const aw = this.windAmp, ar = this.rainAmp;
    let s = this._rng;
    for (let j = 0, n = fIdx.length; j < n; j++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r = ((s >>> 0) * (2 / 4294967296)) - 1;
      V[fIdx[j]] += (aw * fWind[j] + ar * fRain[j]) * r;
    }
    this._rng = s >>> 0;
  }

  beginFrame() { this.hPrev.set(this.h); }

  /** One fixed step. Returns true when the surface changed. */
  advance() {
    const N = this.N, A = this.A, V = this.V;
    if (this.srcDirty) {
      const C = this.coef;
      this.dct.forward(this.src, C);
      for (let i = 0; i < N; i++) A[i] += C[i];
      this.src.fill(0);
      this.srcDirty = false;
      this.awake = true;
    }
    const forcing = this.windAmp > 0 || this.rainAmp > 0;
    if (forcing) { this._force(); this.awake = true; }
    if (!this.awake) return false;
    const T11 = this.T11, T12 = this.T12, T21 = this.T21;
    for (let i = 0; i < N; i++) {
      const a = A[i], v = V[i], c = T11[i];
      A[i] = c * a + T12[i] * v;
      V[i] = T21[i] * a + c * v;
    }
    const h = this.h;
    this.dct.inverse(A, h);
    let mx = 0;
    for (let i = 0; i < N; i++) { const x = Math.abs(h[i]); if (!(x <= mx)) mx = x; }
    if (!(mx < 1e3)) { this.reset(); return false; }           // NaN / runaway guard
    if (mx > SIM_CAP) {                                         // soft energy limiter
      const s = SIM_CAP / mx;
      for (let i = 0; i < N; i++) { A[i] *= s; V[i] *= s; h[i] *= s; }
      mx = SIM_CAP;
    }
    this.maxAbs = mx;
    this.dirty = true;
    if (!forcing && mx < 2e-6) { A.fill(0); V.fill(0); h.fill(0); this.awake = false; this.maxAbs = 0; }
    return true;
  }

  /** Slopes, vertical speed, foam decay and the packed upload array. */
  pack(dtFrame) {
    if (!this.dirty && !this.foamActive) return false;
    const { nx, nz, h, tex, foam, hPrev, wv } = this;
    const ix2 = 0.5 / HF_DX, iz2 = 0.5 / HF_DZ, ix1 = 1 / HF_DX, iz1 = 1 / HF_DZ;
    const fd = Math.exp(-dtFrame / FOAM_TAU);
    const invDt = dtFrame > 1e-5 ? 1 / dtFrame : 0;
    let fm = 0;
    for (let j = 0; j < nz; j++) {
      const jm = j > 0 ? -nx : 0, jp = j < nz - 1 ? nx : 0, sz = (j > 0 && j < nz - 1) ? iz2 : iz1;
      for (let i = 0; i < nx; i++) {
        const idx = j * nx + i;
        const im = i > 0 ? -1 : 0, ip = i < nx - 1 ? 1 : 0, sx = (i > 0 && i < nx - 1) ? ix2 : ix1;
        const hc = h[idx], o = idx << 2;
        tex[o] = hc;
        tex[o + 1] = (h[idx + ip] - h[idx + im]) * sx;
        tex[o + 2] = (h[idx + jp] - h[idx + jm]) * sz;
        const f = foam[idx] * fd;
        foam[idx] = f; tex[o + 3] = f;
        if (f > fm) fm = f;
        wv[idx] = (hc - hPrev[idx]) * invDt;
      }
    }
    this.foamActive = fm > 0.003;
    if (!this.foamActive) foam.fill(0);
    this.dirty = false;
    return true;
  }

  /** Bilinear lookup of height, slope and vertical speed at world (x, z). */
  sample(x, z, out) {
    const nx = this.nx, nz = this.nz;
    let fx = (x - POOL.minX) / HF_DX - 0.5, fz = (z - POOL.minZ) / HF_DZ - 0.5;
    if (fx < 0) fx = 0; else if (fx > nx - 1) fx = nx - 1;
    if (fz < 0) fz = 0; else if (fz > nz - 1) fz = nz - 1;
    const i0 = fx | 0, j0 = fz | 0;
    const i1 = i0 + 1 < nx ? i0 + 1 : i0, j1 = j0 + 1 < nz ? j0 + 1 : j0;
    const tx = fx - i0, tz = fz - j0;
    const t = this.tex, w = this.wv;
    const a = (j0 * nx + i0), b = (j0 * nx + i1), c = (j1 * nx + i0), d = (j1 * nx + i1);
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz), w01 = (1 - tx) * tz, w11 = tx * tz;
    out.h = t[a * 4] * w00 + t[b * 4] * w10 + t[c * 4] * w01 + t[d * 4] * w11;
    out.gx = t[a * 4 + 1] * w00 + t[b * 4 + 1] * w10 + t[c * 4 + 1] * w01 + t[d * 4 + 1] * w11;
    out.gz = t[a * 4 + 2] * w00 + t[b * 4 + 2] * w10 + t[c * 4 + 2] * w01 + t[d * 4 + 2] * w11;
    out.w = w[a] * w00 + w[b] * w10 + w[c] * w01 + w[d] * w11;
    return out;
  }

  /** Replace the surface with externally computed heights (particles mode). */
  loadExternal(arr) {
    const h = this.h, N = this.N;
    this.hPrev.set(h);
    if (arr.length >= N) {
      for (let i = 0; i < N; i++) {
        const v = arr[i];
        h[i] = v > 1 ? 1 : (v < -1 ? -1 : (v === v ? v : 0));
      }
    }
    this.dirty = true;
  }

  stats() {
    const h = this.h, N = this.N;
    let sum = 0, mx = 0, nan = 0;
    for (let i = 0; i < N; i++) { const v = h[i]; if (v !== v) nan++; sum += v; const a = Math.abs(v); if (a > mx) mx = a; }
    return { mean: sum / N, maxAbs: mx, nan };
  }
}

// ===========================================================================
// 2. Floating bodies: procedural meshes and their physical descriptions
//
// Every body is a rigid body whose origin is its centre of mass. Buoyancy is
// evaluated on "samples": small volume elements (sphere, tube slice or slab)
// whose submerged fraction follows the exact geometric fraction of that
// shape, so a body's draft matches its mesh. A sample's kind decides the
// fraction-vs-depth curve (sphere cap, circle segment, flat slab).
// ===========================================================================
const RHO_W = 1000, RHO_AIR = 1.2;
const K_SPHERE = 0, K_CYL = 1, K_SLAB = 2;

/** Submerged volume fraction of a sample at relative depth t in [0,1] (0 = just touching). */
function immersion(kind, t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (kind === K_SPHERE) return t * t * (3 - 2 * t);
  if (kind === K_CYL) { const u = 1 - 2 * t; return (Math.acos(u) - u * Math.sqrt(1 - u * u)) / Math.PI; }
  return t;
}
/** d(fraction)/dt (the waterplane area per unit volume, times 2*ry). */
function immersionSlope(kind, t) {
  if (t <= 0 || t >= 1) return 0;
  if (kind === K_SPHERE) return 6 * t * (1 - t);
  if (kind === K_CYL) { const u = 1 - 2 * t; return 4 * Math.sqrt(Math.max(0, 1 - u * u)) / Math.PI; }
  return 1;
}

function toNonIndexedColored(geo, colorFn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const c = colorFn(cx, cy, cz);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

function ellipsoidMesh(mat, a, b, c, x, y, z, seg = 40) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), mat);
  m.scale.set(a, b, c); m.position.set(x, y, z);
  return shadowed(m);
}

function bodyBeachBall() {
  const R = 0.22, group = new THREE.Group();
  const panel = ['#e8352b', '#ffffff', '#1f6fe0', '#ffffff', '#ffc41f', '#ffffff'].map(h => new THREE.Color(h));
  const white = new THREE.Color('#fbfbf8');
  const geo = toNonIndexedColored(new THREE.SphereGeometry(R, 72, 40), (x, y, z) => {
    if (Math.abs(y) / R > 0.94) return white;
    const lon = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
    return panel[Math.min(5, Math.floor(lon * 6))];
  });
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.25 });
  group.add(shadowed(new THREE.Mesh(geo, mat)));
  const valve = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.012, 20),
    new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.5 })));
  valve.position.y = R - 0.003; group.add(valve);
  const V = 4 / 3 * Math.PI * R ** 3, m = 1.4;
  return {
    group, mass: m, inertia: [2 / 3 * m * R * R, 2 / 3 * m * R * R, 2 / 3 * m * R * R],
    samples: [{ x: 0, y: 0, z: 0, vol: V, ry: R, kind: K_SPHERE, area: Math.PI * R * R, fr: R * 0.8 }],
    colliders: [{ x: 0, y: 0, z: 0, r: R }],
    cd: 0.47, ca: 0.5, zeta: 0.22, radius: R, spawnY: 1.7, rr: 0.0,
  };
}

function bodyRingFloat() {
  const R = 0.46, r = 0.115, N = 16, group = new THREE.Group();
  const red = new THREE.Color('#ff5a4d'), white = new THREE.Color('#fff6ee');
  const tg = new THREE.TorusGeometry(R, r, 28, 96); tg.rotateX(Math.PI / 2);
  const geo = toNonIndexedColored(tg, (x, y, z) => ((Math.floor((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * 12)) & 1) ? white : red);
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  group.add(shadowed(new THREE.Mesh(geo, mat)));
  const Vi = 2 * Math.PI * Math.PI * R * r * r / N, m = 3.5;
  const samples = [], colliders = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    samples.push({ x: R * Math.cos(a), y: 0, z: R * Math.sin(a), vol: Vi, ry: r, kind: K_CYL, area: 2 * r * (2 * Math.PI * R / N) * 0.5, areaV: 2 * r * (2 * Math.PI * R / N), fr: r * 1.3 });
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    colliders.push({ x: R * Math.cos(a), y: 0, z: R * Math.sin(a), r: r });
  }
  return {
    group, mass: m, inertia: [m * (0.5 * R * R + 0.625 * r * r), m * (R * R + 0.75 * r * r), m * (0.5 * R * R + 0.625 * r * r)],
    samples, colliders, cd: 1.0, ca: 0.8, zeta: 0.28, radius: R + r, spawnY: 1.6, rr: 0.0,
  };
}

function bodyDuck() {
  const group = new THREE.Group();
  const yellow = new THREE.MeshPhysicalMaterial({ color: 0xffcf1c, roughness: 0.3, clearcoat: 0.65, clearcoatRoughness: 0.18 });
  const yellow2 = new THREE.MeshPhysicalMaterial({ color: 0xf5b800, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, roughness: 0.35, clearcoat: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.2, metalness: 0.2 });
  const a = 0.25, b = 0.17, c = 0.18;
  group.add(ellipsoidMesh(yellow, a, b, c, 0, 0.0, 0, 48));
  const tail = ellipsoidMesh(yellow, 0.1, 0.055, 0.06, -0.255, 0.09, 0); tail.rotation.z = 0.55; group.add(tail);
  group.add(ellipsoidMesh(yellow, 0.118, 0.12, 0.108, 0.16, 0.245, 0, 40));
  group.add(ellipsoidMesh(orange, 0.078, 0.03, 0.062, 0.28, 0.225, 0));
  group.add(ellipsoidMesh(orange, 0.062, 0.018, 0.05, 0.272, 0.197, 0));
  group.add(ellipsoidMesh(black, 0.02, 0.02, 0.02, 0.225, 0.285, 0.072, 16));
  group.add(ellipsoidMesh(black, 0.02, 0.02, 0.02, 0.225, 0.285, -0.072, 16));
  for (const s of [1, -1]) { const w = ellipsoidMesh(yellow2, 0.13, 0.065, 0.022, -0.02, 0.03, s * 0.168, 28); w.rotation.y = -s * 0.12; w.rotation.z = -0.1; group.add(w); }
  // hull as vertical columns over the elliptical footprint: each column's immersion is linear in
  // depth, and the lateral spread gives the duck real roll and pitch stiffness
  const m = 1.8, sl = [], NX = 7, NZ = 5, dxs = 2 * a / NX, dzs = 2 * c / NZ;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = -a + (i + 0.5) * dxs, z = -c + (j + 0.5) * dzs, q = 1 - (x / a) ** 2 - (z / c) ** 2;
    if (q <= 0.02) continue;
    const yh = b * Math.sqrt(q);
    sl.push({ x, y: 0, z, vol: 2 * yh * dxs * dzs, ry: yh, kind: K_SLAB, area: yh * (dxs + dzs), areaV: dxs * dzs, fr: 0.1 });
  }
  sl.push({ x: 0.16, y: 0.245, z: 0, vol: 4 / 3 * Math.PI * 0.118 * 0.12 * 0.108, ry: 0.12, kind: K_SPHERE, area: 0.04, fr: 0.1 });
  return {
    group, mass: m, inertia: [m / 5 * (b * b + c * c), m / 5 * (a * a + c * c), m / 5 * (a * a + b * b)],
    samples: sl,
    colliders: [{ x: -0.11, y: 0, z: 0, r: 0.16 }, { x: 0.07, y: 0, z: 0, r: 0.16 }, { x: 0.17, y: 0.22, z: 0, r: 0.1 }],
    cd: 0.8, ca: 0.6, zeta: 0.25, radius: 0.34, spawnY: 1.6, rr: 0.0,
  };
}

function bodyMattress() {
  const L = 1.9, T = 0.16, W = 0.8, rad = 0.075, group = new THREE.Group();
  const g = new THREE.BoxGeometry(L, T, W, 96, 4, 40);
  const pos = g.attributes.position, nor = g.attributes.normal, col = new Float32Array(pos.count * 3);
  const hx = L / 2 - rad, hy = Math.max(T / 2 - rad, 0.001), hz = W / 2 - rad;
  const pitch = 0.2375;
  const base = new THREE.Color('#ff6d8d'), seam = new THREE.Color('#fff2f5'), under = new THREE.Color('#e04a73'), pillow = new THREE.Color('#ff9bb3');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const qx = Math.max(-hx, Math.min(hx, px)), qy = Math.max(-hy, Math.min(hy, py)), qz = Math.max(-hz, Math.min(hz, pz));
    let nx = px - qx, ny = py - qy, nz = pz - qz;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-6) { nx /= len; ny /= len; nz /= len; px = qx + nx * rad; py = qy + ny * rad; pz = qz + nz * rad; }
    else { nx = nor.getX(i); ny = nor.getY(i); nz = nor.getZ(i); }
    // air chambers: gentle ribs across the length, a raised pillow at one end
    const phase = (px + L / 2) / pitch, fr = phase - Math.floor(phase);
    const rib = Math.sin(Math.PI * fr);
    const edge = Math.min(1, Math.max(0, (hz - Math.abs(pz) + 0.05) / 0.12)) * Math.min(1, Math.max(0, (hx - Math.abs(px) + 0.05) / 0.12));
    let bump = 0;
    if (ny > 0.2) {
      bump = 0.016 * Math.pow(rib, 0.7) * edge;
      if (px < -L / 2 + 0.3) bump += 0.03 * edge * Math.min(1, (px + L / 2 - 0.03) / 0.1) * Math.max(0, 1 - Math.abs(pz) / (W / 2));
      py += bump;
      const dr = (Math.PI / pitch) * 0.016 * Math.pow(Math.max(rib, 1e-3), -0.3) * 0.7 * Math.cos(Math.PI * fr) * edge;
      nx -= dr * ny; const l2 = Math.hypot(nx, ny, nz); nx /= l2; ny /= l2; nz /= l2;
    }
    pos.setXYZ(i, px, py, pz); nor.setXYZ(i, nx, ny, nz);
    if (ny < -0.2) tmp.copy(under);
    else if (ny > 0.2) {
      tmp.copy(base);
      if (rib < 0.1 || (px < -L / 2 + 0.3 && px > -L / 2 + 0.28)) tmp.lerp(seam, 0.85);
      if (px < -L / 2 + 0.3) tmp.lerp(pillow, 0.7);
      if (Math.abs(pz) > hz - 0.02 + 0.04 && ny > 0.2) tmp.lerp(seam, 0.6);
    } else tmp.copy(seam).lerp(base, 0.5);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.2 });
  group.add(shadowed(new THREE.Mesh(g, mat)));
  const m = 6.0, samples = [], gx = 8, gz = 4;
  for (let i = 0; i < gx; i++) for (let j = 0; j < gz; j++) {
    samples.push({ x: -L / 2 + (i + 0.5) * L / gx, y: 0, z: -W / 2 + (j + 0.5) * W / gz, vol: L * W * T / (gx * gz), ry: T / 2, kind: K_SLAB, area: T * 0.22 * 0.5, areaV: L * W / (gx * gz), fr: 0.13 });
  }
  const colliders = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) colliders.push({ x: -L / 2 + 0.11 + i * (L - 0.22) / 9, y: 0, z: -W / 2 + 0.11 + j * (W - 0.22) / 3, r: 0.09 });
  return {
    group, mass: m, inertia: [m / 12 * (T * T + W * W), m / 12 * (L * L + W * W), m / 12 * (L * L + T * T)],
    samples, colliders, cd: 1.1, ca: 1.0, zeta: 0.35, radius: Math.hypot(L, W) / 2, spawnY: 1.3, rr: 0.0,
  };
}

function bodyCannonball() {
  const R = 0.09, group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.85, roughness: 0.42 });
  // cast-iron grain from a tiny procedural roughness texture (skipped if no canvas is available)
  try {
    const cv = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(128, 128);
    cv.width = cv.height = 128;
    const cx = cv.getContext('2d'), id = cx.createImageData(128, 128);
    let s = 12345;
    for (let i = 0; i < 128 * 128; i++) { s = (s * 1664525 + 1013904223) >>> 0; const v = 150 + ((s >>> 24) % 90); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    cx.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2); tex.colorSpace = THREE.NoColorSpace;
    mat.roughnessMap = tex; mat.bumpMap = tex; mat.bumpScale = 0.6;
  } catch (e) { /* plain metal */ }
  group.add(shadowed(new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), mat)));
  const seam = shadowed(new THREE.Mesh(new THREE.TorusGeometry(R * 0.999, 0.0035, 8, 64), new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.8, roughness: 0.6 })));
  group.add(seam);
  const V = 4 / 3 * Math.PI * R ** 3, m = 22;
  return {
    group, mass: m, inertia: [0.4 * m * R * R, 0.4 * m * R * R, 0.4 * m * R * R],
    samples: [{ x: 0, y: 0, z: 0, vol: V, ry: R, kind: K_SPHERE, area: Math.PI * R * R, fr: R }],
    colliders: [{ x: 0, y: 0, z: 0, r: R }],
    cd: 0.47, ca: 0.5, zeta: 0.2, radius: R, spawnY: 3.2, rr: 0.32,
  };
}

const BODY_BUILDERS = {
  ball: bodyBeachBall, ring: bodyRingFloat, duck: bodyDuck, mattress: bodyMattress, cannonball: bodyCannonball,
};

// ===========================================================================
// 3. Rigid-body physics for the floating bodies
// ===========================================================================
class Body {
  constructor(id, type, def) {
    this.id = id; this.type = type; this.def = def; this.mesh = def.group;
    this.mass = def.mass;
    this.x = 0; this.y = 0; this.z = 0;
    this.qx = 0; this.qy = 0; this.qz = 0; this.qw = 1;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.wx = 0; this.wy = 0; this.wz = 0;
    this.samples = def.samples.map(s => Object.assign({
      areaV: s.area, prevV: 0, prevX: 0, prevZ: 0, vsub: 0, wx: 0, wz: 0, frac: 0, dfr: 0,
    }, s));
    this.colliders = def.colliders;
    this.vTotal = 0;
    for (const s of this.samples) this.vTotal += s.vol;
    this.mEff = this.mass; this.kst = 0; this.cRadF = 0;
    this.wet = 0; this.prevWet = 0; this.prevVy = 0;
    this.floorContact = false;
    this.extAcc = 0; this.extT = 0;
    this.asleep = false; this.sleepT = 0;
    this.surfaceY = POOL.waterLevel;           // ambient water height at the body (updated every step)
    this.iw = new Float64Array(9);
    this.rot = { r00: 1, r01: 0, r02: 0, r10: 0, r11: 1, r12: 0, r20: 0, r21: 0, r22: 1 };
    this.radius = def.radius;
    this.age = 0;
    // ambient-surface ring (body frame, xz offsets), 8 points just outside the planform
    let ex = 0.05, ez = 0.05, fr = 0.1;
    for (const c of def.colliders) { ex = Math.max(ex, Math.abs(c.x) + c.r); ez = Math.max(ez, Math.abs(c.z) + c.r); }
    for (const sm of def.samples) fr = Math.max(fr, sm.fr);
    const mg = Math.max(0.22, fr + 0.06);
    this.ring = [];
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; this.ring.push((ex + mg) * Math.cos(a), (ez + mg) * Math.sin(a)); }
  }
  /** World y of the lowest point of the collision shape. */
  get bottomY() {
    const { qx, qy, qz, qw } = this;
    const r10 = 2 * (qx * qy + qw * qz), r11 = 1 - 2 * (qx * qx + qz * qz), r12 = 2 * (qy * qz - qw * qx);
    let m = Infinity;
    for (const c of this.colliders) { const y = this.y + r10 * c.x + r11 * c.y + r12 * c.z - c.r; if (y < m) m = y; }
    return m;
  }
  /** Depth of the lowest point below the local water surface (0 when the body is clear of the water). */
  get draft() { return Math.max(0, this.surfaceY - this.bottomY); }
  /** The mesh's live position / orientation (kept in sync every update). */
  get position() { return this.mesh.position; }
  get quaternion() { return this.mesh.quaternion; }
  setQuat(x, y, z, w) {
    const l = Math.hypot(x, y, z, w) || 1;
    this.qx = x / l; this.qy = y / l; this.qz = z / l; this.qw = w / l;
  }
  syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.quaternion.set(this.qx, this.qy, this.qz, this.qw);
  }
  /** Refresh the world-space inverse inertia tensor (row-major 3x3). */
  updateInertia() {
    const { qx, qy, qz, qw } = this;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz), r01 = 2 * (xy - wz), r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz), r11 = 1 - 2 * (xx + zz), r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy), r21 = 2 * (yz + wx), r22 = 1 - 2 * (xx + yy);
    const s = this.mass / this.mEff;          // added mass also resists rotation
    const a = s / this.def.inertia[0], b = s / this.def.inertia[1], c = s / this.def.inertia[2];
    const m = this.iw;
    m[0] = r00 * r00 * a + r01 * r01 * b + r02 * r02 * c; m[1] = r00 * r10 * a + r01 * r11 * b + r02 * r12 * c; m[2] = r00 * r20 * a + r01 * r21 * b + r02 * r22 * c;
    m[3] = m[1]; m[4] = r10 * r10 * a + r11 * r11 * b + r12 * r12 * c; m[5] = r10 * r20 * a + r11 * r21 * b + r12 * r22 * c;
    m[6] = m[2]; m[7] = m[5]; m[8] = r20 * r20 * a + r21 * r21 * b + r22 * r22 * c;
    const R = this.rot;
    R.r00 = r00; R.r01 = r01; R.r02 = r02; R.r10 = r10; R.r11 = r11; R.r12 = r12; R.r20 = r20; R.r21 = r21; R.r22 = r22;
    return R;
  }
}

const WALL_GAP = 0.25;                       // floats stay this far off the walls (ladder rails may sit within 0.25 m)
const COUPLING_GAIN = 0.3;                   // how much of the displaced volume shows up as surface motion
const GRAB_FREQ = 13;                       // rad/s of the pointer spring
const SUBSTEP = 1 / 180;

class BodySystem {
  constructor(owner) {
    this.owner = owner;
    this.bodies = [];
    this.nextId = 1;
    this.grabbed = null;
    this._surf = { h: 0, gx: 0, gz: 0, w: 0 };
    this._tmp = { h: 0, gx: 0, gz: 0, w: 0 };
    this._amb = { h: 0, gx: 0, gz: 0, w: 0 };
    this._R1 = { r00: 1, r01: 0, r02: 0, r10: 0, r11: 1, r12: 0, r20: 0, r21: 0, r22: 1 };
    this._R2 = Object.assign({}, this._R1);
    this.maxBodies = 18;
  }

  spawn(type) {
    const builder = BODY_BUILDERS[type];
    if (!builder) return -1;
    const o = this.owner;
    const def = builder();
    const b = new Body(this.nextId++, type, def);
    // pick a spot away from the walls and from other bodies
    const margin = 1.3 + def.radius * 0.5;
    let px = 0, pz = 0;
    for (let tries = 0; tries < 24; tries++) {
      px = POOL.minX + margin + Math.random() * (POOL.length - 2 * margin);
      pz = POOL.minZ + margin + Math.random() * (POOL.width - 2 * margin);
      let ok = true;
      for (const q of this.bodies) if (Math.hypot(q.x - px, q.z - pz) < q.radius + def.radius + 0.5) { ok = false; break; }
      if (ok) break;
    }
    b.x = px; b.y = POOL.waterLevel + def.spawnY; b.z = pz;
    const yaw = Math.random() * Math.PI * 2;
    const E = new THREE.Euler(0, yaw, 0);
    if (type === 'ring') E.set((Math.random() - 0.5) * 0.5, yaw, (Math.random() - 0.5) * 0.5);
    else if (type === 'mattress') E.set((Math.random() - 0.5) * 0.25, yaw, (Math.random() - 0.5) * 0.25);
    else if (type === 'duck') E.set((Math.random() - 0.5) * 0.3, yaw, (Math.random() - 0.5) * 0.3);
    else E.set(Math.random() * 6, yaw, Math.random() * 6);
    const q = new THREE.Quaternion().setFromEuler(E);
    b.setQuat(q.x, q.y, q.z, q.w);
    b.vx = (Math.random() - 0.5) * 0.8; b.vz = (Math.random() - 0.5) * 0.8;
    b.wx = (Math.random() - 0.5) * 1.5; b.wy = (Math.random() - 0.5) * 2; b.wz = (Math.random() - 0.5) * 1.5;
    b.syncMesh();
    this.bodies.push(b);
    o.scene.add(b.mesh);
    const seen = new Set();
    b.mesh.traverse(m => { if (m.isMesh && !seen.has(m.material)) { seen.add(m.material); o.applyUnderwaterLighting(m.material); } });
    // initialise the coupling memory at the spawn pose
    for (const s of b.samples) { s.prevX = b.x; s.prevZ = b.z; s.prevV = 0; }
    while (this.bodies.length > this.maxBodies) this._dispose(this.bodies.shift());
    return b.id;
  }

  _dispose(b) {
    if (this.grabbed && this.grabbed.body === b) this.grabbed = null;
    this.owner.scene.remove(b.mesh);
    b.mesh.traverse(m => {
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mt of mats) {
          for (const k of ['map', 'roughnessMap', 'bumpMap', 'normalMap']) if (mt[k]) mt[k].dispose();
          mt.dispose();
        }
      }
    });
  }

  clear() {
    for (const b of this.bodies) this._dispose(b);
    this.bodies.length = 0;
    this.grabbed = null;
  }

  stopMotion() {
    for (const b of this.bodies) { b.vx = b.vy = b.vz = 0; b.wx = b.wy = b.wz = 0; b.asleep = false; b.sleepT = 0; }
  }

  // ---- pointer interaction -------------------------------------------------
  grab(raycaster) {
    let best = null, bestD = Infinity, bestP = null;
    for (const b of this.bodies) {
      b.mesh.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(b.mesh, true);
      if (hits.length && hits[0].distance < bestD) { best = b; bestD = hits[0].distance; bestP = hits[0].point; }
    }
    if (!best) return false;
    const rot = this._rot(best, this._R1);
    const dx = bestP.x - best.x, dy = bestP.y - best.y, dz = bestP.z - best.z;
    // world -> body frame (R^T)
    this.grabbed = {
      body: best,
      lx: rot.r00 * dx + rot.r10 * dy + rot.r20 * dz,
      ly: rot.r01 * dx + rot.r11 * dy + rot.r21 * dz,
      lz: rot.r02 * dx + rot.r12 * dy + rot.r22 * dz,
      tx: bestP.x, ty: bestP.y, tz: bestP.z,
    };
    return true;
  }
  dragTo(p) {
    const g = this.grabbed;
    if (!g || !p) return;
    if (isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) { g.tx = p.x; g.ty = p.y; g.tz = p.z; }
  }
  release() { this.grabbed = null; }

  _rot(b, out) {
    const { qx, qy, qz, qw } = b;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    out.r00 = 1 - 2 * (yy + zz); out.r01 = 2 * (xy - wz); out.r02 = 2 * (xz + wy);
    out.r10 = 2 * (xy + wz); out.r11 = 1 - 2 * (xx + zz); out.r12 = 2 * (yz - wx);
    out.r20 = 2 * (xz - wy); out.r21 = 2 * (yz + wx); out.r22 = 1 - 2 * (xx + yy);
    return out;
  }

  // ---- ambient surface ---------------------------------------------------
  // A body responds to the *incident* surface (waves from the pointer, wind, rain
  // and other bodies). Its own radiated field is already represented by added
  // mass and wave-radiation damping, so sensing the dent it digs under itself
  // would double count and feed back. The surface is therefore read on a ring
  // just outside the footprint and fitted with a plane (height, slope, speed).
  _ambient(b, rot, A) {
    const sim = this.owner.sim, t = this._tmp, ring = b.ring;
    let sh = 0, sw = 0, sxx = 0, sxz = 0, szz = 0, sdx = 0, sdz = 0, shx = 0, shz = 0;
    for (let k = 0; k < ring.length; k += 2) {
      const dx = rot.r00 * ring[k] + rot.r02 * ring[k + 1], dz = rot.r20 * ring[k] + rot.r22 * ring[k + 1];
      sim.sample(b.x + dx, b.z + dz, t);
      sh += t.h; sw += t.w; shx += t.h * dx; shz += t.h * dz;
      sxx += dx * dx; sxz += dx * dz; szz += dz * dz; sdx += dx; sdz += dz;
    }
    const n = ring.length / 2;
    const mh = sh / n;
    const det = sxx * szz - sxz * sxz;
    let gx = 0, gz = 0;
    if (det > 1e-9) {
      const bx = shx - mh * sdx, bz = shz - mh * sdz;
      gx = (bx * szz - bz * sxz) / det; gz = (bz * sxx - bx * sxz) / det;
    }
    A.h = mh; A.gx = gx; A.gz = gz; A.w = sw / n;
    return A;
  }

  // ---- dynamics ------------------------------------------------------------
  _substep(b, h) {
    const gb0 = this.grabbed;
    if (b.asleep) {
      if (gb0 && gb0.body === b) { b.asleep = false; b.sleepT = 0; } else return;
    }
    const def = b.def, m = b.mass, o = this.owner, S = this._surf;
    const rot = this._rot(b, this._R1);
    const { r00, r01, r02, r10, r11, r12, r20, r21, r22 } = rot;
    let Fx = 0, Fy = -m * GRAV, Fz = 0, Tx = 0, Ty = 0, Tz = 0, Vsub = 0, kst = 0;
    const wvx = o._windVel.x, wvz = o._windVel.z, level = POOL.waterLevel;
    const cRadF = b.cRadF;
    const amb = this._ambient(b, rot, this._amb);
    b.surfaceY = level + amb.h;
    for (let i = 0, n = b.samples.length; i < n; i++) {
      const s = b.samples[i];
      const ox = r00 * s.x + r01 * s.y + r02 * s.z, oy = r10 * s.x + r11 * s.y + r12 * s.z, oz = r20 * s.x + r21 * s.y + r22 * s.z;
      const px = b.x + ox, py = b.y + oy, pz = b.z + oz;
      S.h = amb.h + amb.gx * (px - b.x) + amb.gz * (pz - b.z); S.gx = amb.gx; S.gz = amb.gz; S.w = amb.w;
      const depth = level + S.h - py;
      const t = 0.5 + depth / (2 * s.ry);
      const frac = immersion(s.kind, t);
      const dk = s.vol * immersionSlope(s.kind, t) / (2 * s.ry);     // waterplane area of the sample
      s.frac = frac; s.wx = px; s.wz = pz;
      const vs = s.vol * frac;
      s.vsub = vs; Vsub += vs; kst += dk;
      const vpx = b.vx + (b.wy * oz - b.wz * oy), vpy = b.vy + (b.wz * ox - b.wx * oz), vpz = b.vz + (b.wx * oy - b.wy * ox);
      let fx = 0, fy = 0, fz = 0;
      if (frac > 0) {
        // buoyancy acts along the local surface normal (hydrostatic pressure on a sloped surface)
        const fb = RHO_W * GRAV * vs;
        let gx = S.gx, gz = S.gz;
        const gl = Math.hypot(gx, gz);
        if (gl > 0.6) { gx *= 0.6 / gl; gz *= 0.6 / gl; }
        fx = -gx * fb; fy = fb; fz = -gz * fb;
        // drag relative to the water (vertical water speed follows the surface)
        const urx = vpx, ury = vpy - S.w * frac, urz = vpz;
        const sp = Math.sqrt(urx * urx + ury * ury + urz * urz);
        const q = 0.5 * RHO_W * def.cd * frac * sp, lin = 25 * s.fr * frac;
        fx -= (q * s.area + lin) * urx; fz -= (q * s.area + lin) * urz;
        fy -= (q * s.areaV + lin) * ury;
        fy -= cRadF * dk * ury;                         // wave radiation damping on heave / pitch / roll
      }
      if (frac < 1) {                                   // wind on the dry part
        const rx = wvx - vpx, rz = wvz - vpz;
        const c = 0.5 * RHO_AIR * 0.7 * s.area * (1 - frac) * Math.sqrt(rx * rx + rz * rz);
        fx += c * rx; fz += c * rz;
      }
      Fx += fx; Fy += fy; Fz += fz;
      Tx += oy * fz - oz * fy; Ty += oz * fx - ox * fz; Tz += ox * fy - oy * fx;
    }
    const gb = this.grabbed;
    if (gb && gb.body === b) {
      const ox = r00 * gb.lx + r01 * gb.ly + r02 * gb.lz, oy = r10 * gb.lx + r11 * gb.ly + r12 * gb.lz, oz = r20 * gb.lx + r21 * gb.ly + r22 * gb.lz;
      const vpx = b.vx + (b.wy * oz - b.wz * oy), vpy = b.vy + (b.wz * ox - b.wx * oz), vpz = b.vz + (b.wx * oy - b.wy * ox);
      // The pointer target lies on the water plane: follow it horizontally, and only lift (never push the
      // grab point down to the plane), so a carried float stays buoyant at the surface.
      const k = GRAB_FREQ * GRAB_FREQ, d = 2 * 0.85 * GRAB_FREQ;
      const ey = gb.ty - (b.y + oy);
      let ax = k * (gb.tx - (b.x + ox)) - d * vpx, az = k * (gb.tz - (b.z + oz)) - d * vpz;
      let ay = ey > 0 ? k * ey - d * vpy : 0;
      const al = Math.sqrt(ax * ax + ay * ay + az * az), amax = 90;
      if (al > amax) { const s = amax / al; ax *= s; ay *= s; az *= s; }
      const fm = b.mEff;                                 // spring acts on the effective (wet) mass
      const fx = ax * fm, fy = ay * fm, fz = az * fm;
      Fx += fx; Fy += fy; Fz += fz;
      Tx += oy * fz - oz * fy; Ty += oz * fx - ox * fz; Tz += ox * fy - oy * fx;
    }
    const mEff = m + def.ca * RHO_W * Vsub;
    b.mEff = mEff; b.kst = kst; b.vsub = Vsub;
    b.cRadF = kst > 1e-5 ? 2 * def.zeta * Math.sqrt(RHO_W * GRAV * mEff / kst) : 0;
    const im = h / mEff;
    b.vx += Fx * im; b.vy += Fy * im; b.vz += Fz * im;
    // angular: alpha = Iw^-1 * torque with the current world inverse inertia
    b.updateInertia();
    const I = b.iw;
    b.wx += (I[0] * Tx + I[1] * Ty + I[2] * Tz) * h;
    b.wy += (I[3] * Tx + I[4] * Ty + I[5] * Tz) * h;
    b.wz += (I[6] * Tx + I[7] * Ty + I[8] * Tz) * h;
    const wet = Math.min(1, Vsub / b.vTotal);
    const ad = Math.exp(-(0.25 + 3.0 * wet) * h);
    b.wx *= ad; b.wy *= ad; b.wz *= ad;
    let sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
    if (sp > 14) { const s = 14 / sp; b.vx *= s; b.vy *= s; b.vz *= s; }
    sp = Math.sqrt(b.wx * b.wx + b.wy * b.wy + b.wz * b.wz);
    if (sp > 30) { const s = 30 / sp; b.wx *= s; b.wy *= s; b.wz *= s; }
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    const hw = 0.5 * h, qx = b.qx, qy = b.qy, qz = b.qz, qw = b.qw;
    b.setQuat(
      qx + hw * (b.wx * qw + b.wy * qz - b.wz * qy),
      qy + hw * (b.wy * qw + b.wz * qx - b.wx * qz),
      qz + hw * (b.wz * qw + b.wx * qy - b.wy * qx),
      qw + hw * (-b.wx * qx - b.wy * qy - b.wz * qz));
    b.wet = wet;
  }

  /** Impulse between body b and a static plane (normal n, contact lever r). */
  _planeContact(b, rx, ry, rz, nx, ny, nz, pen, e0, mu) {
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const vcx = b.vx + (b.wy * rz - b.wz * ry), vcy = b.vy + (b.wz * rx - b.wx * rz), vcz = b.vz + (b.wx * ry - b.wy * rx);
    const vn = vcx * nx + vcy * ny + vcz * nz;
    if (vn >= 0) return 0;
    const I = b.iw, im = 1 / b.mEff;
    // k = 1/m + n . ((I^-1 (r x n)) x r)
    const cx = ry * nz - rz * ny, cy = rz * nx - rx * nz, cz = rx * ny - ry * nx;
    const ix = I[0] * cx + I[1] * cy + I[2] * cz, iy = I[3] * cx + I[4] * cy + I[5] * cz, iz = I[6] * cx + I[7] * cy + I[8] * cz;
    const k = im + nx * (iy * rz - iz * ry) + ny * (iz * rx - ix * rz) + nz * (ix * ry - iy * rx);
    const e = vn < -1.2 ? e0 : 0;
    const j = -(1 + e) * vn / k;
    b.vx += nx * j * im; b.vy += ny * j * im; b.vz += nz * j * im;
    b.wx += I[0] * (cx * j) + I[1] * (cy * j) + I[2] * (cz * j);
    b.wy += I[3] * (cx * j) + I[4] * (cy * j) + I[5] * (cz * j);
    b.wz += I[6] * (cx * j) + I[7] * (cy * j) + I[8] * (cz * j);
    // Coulomb friction on the tangential contact velocity
    const tx0 = vcx - nx * vn, ty0 = vcy - ny * vn, tz0 = vcz - nz * vn;
    const tl = Math.sqrt(tx0 * tx0 + ty0 * ty0 + tz0 * tz0);
    if (tl > 1e-5) {
      const tx = tx0 / tl, ty = ty0 / tl, tz = tz0 / tl;
      const c2x = ry * tz - rz * ty, c2y = rz * tx - rx * tz, c2z = rx * ty - ry * tx;
      const jx = I[0] * c2x + I[1] * c2y + I[2] * c2z, jy = I[3] * c2x + I[4] * c2y + I[5] * c2z, jz = I[6] * c2x + I[7] * c2y + I[8] * c2z;
      const kt = im + tx * (jy * rz - jz * ry) + ty * (jz * rx - jx * rz) + tz * (jx * ry - jy * rx);
      let jt = -tl / kt;
      const jm = mu * j;
      if (jt < -jm) jt = -jm;
      b.vx += tx * jt * im; b.vy += ty * jt * im; b.vz += tz * jt * im;
      b.wx += I[0] * (c2x * jt) + I[1] * (c2y * jt) + I[2] * (c2z * jt);
      b.wy += I[3] * (c2x * jt) + I[4] * (c2y * jt) + I[5] * (c2z * jt);
      b.wz += I[6] * (c2x * jt) + I[7] * (c2y * jt) + I[8] * (c2z * jt);
    }
    return -vn;
  }

  _collideStatic(b, h) {
    const rot = this._rot(b, this._R1);
    const { r00, r01, r02, r10, r11, r12, r20, r21, r22 } = rot;
    b.updateInertia();
    let floorHit = false;
    const wg = b.def.rr > 0 ? 0.04 : WALL_GAP;          // heavy sunken balls sit below the rails
    for (const c of b.colliders) {
      const rx = r00 * c.x + r01 * c.y + r02 * c.z, ry = r10 * c.x + r11 * c.y + r12 * c.z, rz = r20 * c.x + r21 * c.y + r22 * c.z;
      const cx = b.x + rx, cy = b.y + ry, cz = b.z + rz, r = c.r;
      let pen;
      if ((pen = POOL.minX + wg + r - cx) > 0) this._planeContact(b, rx, ry, rz, 1, 0, 0, pen, 0.25, 0.3);
      if ((pen = cx - (POOL.maxX - wg - r)) > 0) this._planeContact(b, rx, ry, rz, -1, 0, 0, pen, 0.25, 0.3);
      if ((pen = POOL.minZ + wg + r - cz) > 0) this._planeContact(b, rx, ry, rz, 0, 0, 1, pen, 0.25, 0.3);
      if ((pen = cz - (POOL.maxZ - wg - r)) > 0) this._planeContact(b, rx, ry, rz, 0, 0, -1, pen, 0.25, 0.3);
      // sloped floor: plane through (x, floorY(x)) with normal (-f', 1, 0)/|.|
      const fx = Math.min(POOL.maxX, Math.max(POOL.minX, cx));
      const f0 = floorY(fx), slope = (floorY(fx + 0.02) - floorY(fx - 0.02)) / 0.04;
      const inv = 1 / Math.sqrt(1 + slope * slope);
      const dist = (cy - f0) * inv;
      if ((pen = r - dist) > 0) {
        const nx = -slope * inv, ny = inv;
        const e = b.def.rr > 0 ? 0.1 : 0.25;
        if (this._planeContact(b, rx, ry, rz, nx, ny, 0, pen, e, 0.5) >= 0 && pen > -0.002) floorHit = true;
      }
    }
    b.floorContact = floorHit;
    if (floorHit && b.def.rr > 0) {
      // rolling resistance of a heavy ball on the (soft, algae-slick) floor
      const k = Math.exp(-(2.5 + 14 * b.def.rr) * h);
      b.wx *= k; b.wy *= k; b.wz *= k;
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      if (sp < 0.08 && Math.hypot(b.wx, b.wy, b.wz) < 0.6 && !(this.grabbed && this.grabbed.body === b)) {
        b.sleepT += h;
        if (b.sleepT > 0.35) { b.vx = b.vy = b.vz = 0; b.wx = b.wy = b.wz = 0; b.asleep = true; }
      } else b.sleepT = 0;
    } else b.sleepT = 0;
  }

  _collidePairs() {
    const B = this.bodies;
    for (let a = 0; a < B.length; a++) {
      for (let c = a + 1; c < B.length; c++) {
        const A = B[a], D = B[c];
        const dx0 = D.x - A.x, dy0 = D.y - A.y, dz0 = D.z - A.z, rr = A.radius + D.radius;
        if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > rr * rr) continue;
        const ra = this._rot(A, this._R1), rb = this._rot(D, this._R2);
        A.updateInertia(); D.updateInertia();
        for (const ca of A.colliders) {
          const arx = ra.r00 * ca.x + ra.r01 * ca.y + ra.r02 * ca.z, ary = ra.r10 * ca.x + ra.r11 * ca.y + ra.r12 * ca.z, arz = ra.r20 * ca.x + ra.r21 * ca.y + ra.r22 * ca.z;
          for (const cb of D.colliders) {
            const brx = rb.r00 * cb.x + rb.r01 * cb.y + rb.r02 * cb.z, bry = rb.r10 * cb.x + rb.r11 * cb.y + rb.r12 * cb.z, brz = rb.r20 * cb.x + rb.r21 * cb.y + rb.r22 * cb.z;
            let nx = (D.x + brx) - (A.x + arx), ny = (D.y + bry) - (A.y + ary), nz = (D.z + brz) - (A.z + arz);
            const d = Math.sqrt(nx * nx + ny * ny + nz * nz), pen = ca.r + cb.r - d;
            if (pen <= 0) continue;
            if (d > 1e-6) { nx /= d; ny /= d; nz /= d; } else { nx = 0; ny = 1; nz = 0; }
            A.asleep = false; D.asleep = false; A.sleepT = 0; D.sleepT = 0;
            const imA = 1 / A.mEff, imB = 1 / D.mEff, wA = imA / (imA + imB), wB = 1 - wA;
            A.x -= nx * pen * wA; A.y -= ny * pen * wA; A.z -= nz * pen * wA;
            D.x += nx * pen * wB; D.y += ny * pen * wB; D.z += nz * pen * wB;
            const vax = A.vx + (A.wy * arz - A.wz * ary), vay = A.vy + (A.wz * arx - A.wx * arz), vaz = A.vz + (A.wx * ary - A.wy * arx);
            const vbx = D.vx + (D.wy * brz - D.wz * bry), vby = D.vy + (D.wz * brx - D.wx * brz), vbz = D.vz + (D.wx * bry - D.wy * brx);
            const vn = (vbx - vax) * nx + (vby - vay) * ny + (vbz - vaz) * nz;
            if (vn >= 0) continue;
            const Ia = A.iw, Ib = D.iw;
            const cax = ary * nz - arz * ny, cay = arz * nx - arx * nz, caz = arx * ny - ary * nx;
            const cbx = bry * nz - brz * ny, cby = brz * nx - brx * nz, cbz = brx * ny - bry * nx;
            const iax = Ia[0] * cax + Ia[1] * cay + Ia[2] * caz, iay = Ia[3] * cax + Ia[4] * cay + Ia[5] * caz, iaz = Ia[6] * cax + Ia[7] * cay + Ia[8] * caz;
            const ibx = Ib[0] * cbx + Ib[1] * cby + Ib[2] * cbz, iby = Ib[3] * cbx + Ib[4] * cby + Ib[5] * cbz, ibz = Ib[6] * cbx + Ib[7] * cby + Ib[8] * cbz;
            const k = imA + imB + nx * (iay * arz - iaz * ary) + ny * (iaz * arx - iax * arz) + nz * (iax * ary - iay * arx)
              + nx * (iby * brz - ibz * bry) + ny * (ibz * brx - ibx * brz) + nz * (ibx * bry - iby * brx);
            const j = -(1 + (vn < -0.8 ? 0.3 : 0)) * vn / k;
            A.vx -= nx * j * imA; A.vy -= ny * j * imA; A.vz -= nz * j * imA;
            D.vx += nx * j * imB; D.vy += ny * j * imB; D.vz += nz * j * imB;
            A.wx -= iax * j; A.wy -= iay * j; A.wz -= iaz * j;
            D.wx += ibx * j; D.wy += iby * j; D.wz += ibz * j;
          }
        }
      }
    }
  }

  /** Advance all bodies by dt (s) and push their displacement into the water. */
  step(dt) {
    const B = this.bodies;
    if (!B.length) return;
    const n = Math.min(8, Math.max(1, Math.ceil(dt / SUBSTEP)));
    const h = dt / n;
    for (const b of B) { b.prevWet = b.wet; b.prevVy = b.vy; }
    for (let s = 0; s < n; s++) {
      for (const b of B) this._substep(b, h);
      for (const b of B) this._collideStatic(b, h);
      if (B.length > 1) this._collidePairs();
    }
    for (const b of B) {
      // numerical safety net: a body never leaves the world box or becomes non-finite
      if (!(isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz + b.wx + b.wy + b.wz + b.qw))) this._respawn(b);
      if (b.y > 8) { b.y = 8; b.vy = Math.min(0, b.vy); }
      b.age += dt;
      b.syncMesh();
      this._couple(b, dt);
    }
  }

  _respawn(b) {
    b.x = 0; b.y = POOL.waterLevel + 1.0; b.z = 0;
    b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0; b.setQuat(0, 0, 0, 1);
  }

  /** Two-way coupling: displaced volume into the surface, splash, foam and spray. */
  _couple(b, dt) {
    const o = this.owner;
    const ext = o.mode === 'particles';
    let dvNet = 0, cx = 0, cz = 0, cw = 0;
    for (const s of b.samples) {
      const cur = s.vsub, dv = cur - s.prevV;
      const ddx = s.wx - s.prevX, ddz = s.wz - s.prevZ;
      if (cur > 0 || s.prevV > 0) {
        if (ext) {
          dvNet += dv; cx += s.wx * (cur + 1e-6); cz += s.wz * (cur + 1e-6); cw += cur + 1e-6;
          s.prevV = cur; s.prevX = s.wx; s.prevZ = s.wz;
        } else if (Math.abs(dv) > 3e-6 || ddx * ddx + ddz * ddz > 2.5e-5) {
          // volume -> displacement over a footprint a bit wider than the sample;
          // gain < 1 and a per-frame clamp keep the wake plausible and bounded
          const fr = s.fr * 1.3, area = 0.934 * fr * fr, g = COUPLING_GAIN / area;
          const pk0 = Math.min(0.05, s.prevV * g), pk1 = Math.min(0.05, cur * g);
          o.sim.splat(s.prevX, s.prevZ, fr, pk0);
          o.sim.splat(s.wx, s.wz, fr, -pk1);
          s.prevV = cur; s.prevX = s.wx; s.prevZ = s.wz;
        }
      } else { s.prevV = 0; s.prevX = s.wx; s.prevZ = s.wz; }
    }
    if (ext) {
      b.extT += dt; b.extAcc += dvNet;
      if (b.extT > 0.05 && Math.abs(b.extAcc) > 1e-4 && cw > 0) {
        const R = Math.max(0.12, b.radius * 0.7);
        const strength = Math.max(-0.3, Math.min(0.3, b.extAcc / (Math.PI * R * R)));
        o._disturbExternal(cx / cw, cz / cw, R, strength);
        b.extAcc = 0; b.extT = 0;
      } else if (b.extT > 0.05) { b.extT = 0; b.extAcc = 0; }
    }
    // foam along the waterline of a body that is ploughing through the surface
    if (!ext && b.wet > 0.01 && b.wet < 0.97) {
      const sp = Math.hypot(b.vx, b.vz) + 0.5 * Math.abs(b.vy);
      if (sp > 0.35) {
        const amt = Math.min(1.0, 1.1 * (sp - 0.35)) * dt;
        for (const s of b.samples) if (s.frac > 0.02 && s.frac < 0.98) o.sim.addFoam(s.wx, s.wz, s.fr * 0.9, amt * (1 - Math.abs(2 * s.frac - 1) * 0.5));
      }
    }
    // water entry: a cavity proportional to the impact energy, foam and a crown of spray
    if (b.wet > 0.03 && b.prevWet <= 0.03) {
      const vimp = Math.max(-b.prevVy, -b.vy, 0);
      if (vimp > 1.0) {
        const E = 0.5 * b.mEff * vimp * vimp;
        const rc = Math.max(0.16, Math.min(0.7, b.radius * 1.25 + 0.08));
        const strength = Math.min(0.3, 0.5 * Math.sqrt(2 * E / (RHO_W * GRAV * Math.PI * rc * rc)));
        o._impact(b.x, b.z, rc, strength, E, vimp);
      }
    }
    // fast motion through the surface throws a little water
    if (b.wet > 0.02 && b.wet < 0.95 && o.mode === 'spray') {
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 1.1) o.spray.wake(b, sp, dt);
    }
  }
}

// ===========================================================================
// 4. Splash spray (ballistic droplets) and rain streaks
// ===========================================================================
const SPRAY_VERT = /* glsl */`
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.2), 2.0, 64.0);
  vAlpha = aAlpha;
}`;
const SPRAY_FRAG = /* glsl */`
uniform vec3 uAmbient;
uniform vec3 uSunColor;
uniform vec3 uSunDirView;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  // soft translucent droplet: wrapped diffuse from the sun, a bright rim when backlit, sky fill
  float wrap = clamp(dot(n, uSunDirView) * 0.5 + 0.5, 0.0, 1.0);
  float rim = pow(1.0 - n.z, 2.0) * pow(clamp(-dot(vec3(0.0, 0.0, 1.0), uSunDirView) * 0.5 + 0.5, 0.0, 1.0), 2.0);
  vec3 col = uAmbient * (0.55 + 0.45 * n.y) + uSunColor * (0.55 * wrap + 1.4 * rim);
  float a = (1.0 - r2); a = a * (0.35 + 0.65 * a) * 0.85 * vAlpha;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Spray {
  constructor(owner, max = 3600) {
    this.owner = owner;
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.uniforms = {
      uScale: { value: 600 }, uAmbient: { value: new THREE.Color(0.5, 0.55, 0.6) },
      uSunColor: { value: new THREE.Color(1, 0.95, 0.85) }, uSunDirView: { value: new THREE.Vector3(0, 1, 0) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: SPRAY_VERT, fragmentShader: SPRAY_FRAG,
      transparent: true, depthWrite: false, depthTest: true,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.points.castShadow = false; this.points.receiveShadow = false;
    this.points.visible = false;
    this._wakeAcc = 0;
  }

  get count() { return this.n; }

  clear() { this.n = 0; this.points.geometry.setDrawRange(0, 0); this.points.visible = false; }

  emit(x, y, z, vx, vy, vz, size, life) {
    if (this.n >= this.max) return;
    const i = this.n++, j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
    this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.size[i] = size; this.age[i] = 0; this.life[i] = life; this.alpha[i] = 0.9;
  }

  /** A crown of droplets thrown out of a splash of the given radius. */
  burst(x, z, radius, speed, count) {
    if (this.owner.mode !== 'spray') return;
    const level = POOL.waterLevel + this.owner.heightAt(x, z);
    count = Math.min(count | 0, 700);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r0 = radius * (0.25 + 0.75 * Math.random());
      const sp = speed * (0.15 + 0.85 * Math.random());
      const up = speed * (0.45 + 0.9 * Math.random());
      this.emit(x + Math.cos(a) * r0, level + 0.03, z + Math.sin(a) * r0,
        Math.cos(a) * sp * 0.55, up, Math.sin(a) * sp * 0.55,
        0.018 + Math.random() * 0.034, 1.2 + Math.random() * 1.6);
    }
  }

  /** Spray thrown by a body ploughing through the surface. */
  wake(b, speed, dt) {
    this._wakeAcc += Math.min(140, 55 * (speed - 1.1)) * dt;
    while (this._wakeAcc >= 1) {
      this._wakeAcc -= 1;
      const cand = b.samples[(Math.random() * b.samples.length) | 0];
      if (cand.frac <= 0.02 || cand.frac >= 0.98) continue;
      this.emit(cand.wx, POOL.waterLevel + this.owner.heightAt(cand.wx, cand.wz) + 0.02, cand.wz,
        b.vx * 0.35 + (Math.random() - 0.5) * 0.9, 0.7 + Math.random() * 1.5, b.vz * 0.35 + (Math.random() - 0.5) * 0.9,
        0.014 + Math.random() * 0.026, 0.8 + Math.random());
    }
  }

  update(dt) {
    const o = this.owner, n0 = this.n;
    if (n0 === 0) { if (this.points.visible) this.points.visible = false; return; }
    const pos = this.pos, vel = this.vel, drag = Math.exp(-0.35 * dt);
    let i = 0;
    while (i < this.n) {
      const j = i * 3;
      vel[j + 1] -= GRAV * dt;
      vel[j] *= drag; vel[j + 2] *= drag;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      this.age[i] += dt;
      const x = pos[j], y = pos[j + 1], z = pos[j + 2];
      let dead = this.age[i] > this.life[i];
      if (!dead && vel[j + 1] < 0) {
        const inside = x > POOL.minX && x < POOL.maxX && z > POOL.minZ && z < POOL.maxZ;
        if (inside) {
          if (y < POOL.waterLevel + o.heightAt(x, z)) { o._dropletLands(x, z, this.size[i]); dead = true; }
        } else if (y < POOL.deckY) dead = true;
      }
      if (dead) {
        const l = (this.n - 1), lj = l * 3;
        pos[j] = pos[lj]; pos[j + 1] = pos[lj + 1]; pos[j + 2] = pos[lj + 2];
        vel[j] = vel[lj]; vel[j + 1] = vel[lj + 1]; vel[j + 2] = vel[lj + 2];
        this.age[i] = this.age[l]; this.life[i] = this.life[l]; this.size[i] = this.size[l];
        this.n--;
      } else {
        const f = this.age[i] / this.life[i];
        this.alpha[i] = f < 0.8 ? 0.9 : 0.9 * (1 - f) / 0.2;
        i++;
      }
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    this.points.visible = this.n > 0;
  }
}

// ---------------------------------------------------------------------------
const RAIN_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uVel;
uniform float uStreak;
uniform float uWidth;
uniform float uPx;
uniform float uYmin;
varying float vFade;
void main() {
  vec3 p = aSeed.xyz * uBox + uVel * (uTime + aSeed.w * 7.0);
  vec2 rel = mod(p.xz - uCam.xz + uBox.xz * 0.5, uBox.xz) - uBox.xz * 0.5;
  vec3 pw = vec3(uCam.x + rel.x, uYmin + mod(p.y - uYmin, uBox.y), uCam.z + rel.y);
  vec3 dir = normalize(uVel);
  vec3 pos = mix(pw - uVel * uStreak, pw, position.y);
  vec3 toCam = normalize(uCam - pos);
  vec3 side = cross(dir, toCam);
  float sl = length(side);
  side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
  float dist = length(uCam - pos);
  float wBase = uWidth * (0.6 + 0.4 * aSeed.w);
  float wPix = dist * uPx * 1.25;                 // never thinner than ~1.25 px on screen
  float w = max(wBase, wPix);
  pos += side * position.x * w;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  vFade = (0.25 + 0.75 * position.y) * (1.0 - smoothstep(uBox.x * 0.2, uBox.x * 0.5, dist)) * (0.55 + 0.45 * aSeed.w) * clamp(wBase / w * 2.0, 0.35, 1.0);
}`;
const RAIN_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uAlpha;
varying float vFade;
void main() {
  gl_FragColor = vec4(uColor, uAlpha * vFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Rain {
  constructor(max = 9000) {
    this.max = max;
    const base = new THREE.InstancedBufferGeometry();
    base.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0]), 3));
    base.setIndex([0, 1, 2, 2, 1, 3]);
    const seeds = new Float32Array(max * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    base.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    base.instanceCount = 0;
    this.uniforms = {
      uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(24, 12, 24) },
      uVel: { value: new THREE.Vector3(0, -9, 0) }, uStreak: { value: 0.05 }, uWidth: { value: 0.0045 }, uPx: { value: 0.0015 },
      uYmin: { value: -0.5 }, uColor: { value: new THREE.Color(0.8, 0.85, 0.95) }, uAlpha: { value: 0.2 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(base, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.visible = false;
  }
  set(amount, wind) {
    const a = Math.max(0, Math.min(1, amount));
    this.mesh.geometry.instanceCount = Math.floor(this.max * Math.pow(a, 0.85));
    this.mesh.visible = a > 0.005;
    this.uniforms.uAlpha.value = 0.26 + 0.34 * a;
    this.uniforms.uVel.value.set(wind * 4.5, -9.0, wind * 1.4);
  }
}

// ===========================================================================
// 5. Procedural tileable ripple-slope maps (no external textures)
//    Spectral synthesis: random phases with a k^-2.5 amplitude spectrum, then
//    exact spectral derivatives give the x / z surface slope of each tile.
// ===========================================================================
function fft2dInPlace(re, im, n, plan, inverse) {
  // rows
  const zr = new Float64Array(n), zi = new Float64Array(n);
  const sgn = inverse ? -1 : 1;                  // inverse via conjugation
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < n; a++) {
      for (let t = 0; t < n; t++) {
        const s = plan.rev[t];
        const idx = pass === 0 ? a * n + s : s * n + a;
        zr[t] = re[idx]; zi[t] = sgn * im[idx];
      }
      fftDIT(plan, zr, zi);
      for (let t = 0; t < n; t++) {
        const idx = pass === 0 ? a * n + t : t * n + a;
        re[idx] = zr[t]; im[idx] = sgn * zi[t];
      }
    }
  }
}

function makeRippleSlopeMaps(n = 256) {
  const plan = makeFFT(n);
  let seed = 0x1badf00d;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) + 0.5) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
  const out = new Float32Array(n * n * 4);
  for (let layer = 0; layer < 2; layer++) {
    const hr = new Float64Array(n * n), hi = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const kx = x < n / 2 ? x : x - n, ky = y < n / 2 ? y : y - n;
      const q = Math.hypot(kx, ky);
      const qmax = n * 0.30;
      if (q < 1.5 || q > qmax) continue;
      const taper = Math.min(1, (q - 1.5) / 3) * Math.min(1, (qmax - q) / (n * 0.08));
      const a = Math.pow(q, -2.5) * taper;      // slope energy per octave falls ~1/k (weak capillary ripples)
      hr[y * n + x] = gauss() * a; hi[y * n + x] = gauss() * a;
    }
    // gradient spectra: i*k*H  (k in rad per tile)
    const gxr = new Float64Array(n * n), gxi = new Float64Array(n * n), gyr = new Float64Array(n * n), gyi = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const kx = (x < n / 2 ? x : x - n), ky = (y < n / 2 ? y : y - n), i = y * n + x;
      gxr[i] = -kx * hi[i]; gxi[i] = kx * hr[i];
      gyr[i] = -ky * hi[i]; gyi[i] = ky * hr[i];
    }
    fft2dInPlace(gxr, gxi, n, plan, true);
    fft2dInPlace(gyr, gyi, n, plan, true);
    let s2 = 0;
    for (let i = 0; i < n * n; i++) s2 += gxr[i] * gxr[i] + gyr[i] * gyr[i];
    const norm = 1 / Math.sqrt(s2 / (n * n));      // unit RMS slope magnitude
    for (let i = 0; i < n * n; i++) {
      out[i * 4 + layer * 2] = gxr[i] * norm;
      out[i * 4 + layer * 2 + 1] = gyr[i] * norm;
    }
  }
  return out;
}

/** Half-float conversion of a Float32Array (round to nearest, flush tiny values). */
const _f32 = new Float32Array(1), _u32 = new Uint32Array(_f32.buffer);
function toHalfBits(v) {
  _f32[0] = v;
  const x = _u32[0], sign = (x >>> 16) & 0x8000;
  let e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) return sign;                          // underflow -> 0
  if (e >= 31) return sign | 0x7bff;                // clamp to max finite half (65504)
  const r = m + 0x1000;                              // round to nearest
  if (r & 0x800000) { e++; return e >= 31 ? sign | 0x7bff : sign | (e << 10); }
  return sign | (e << 10) | (r >>> 13);
}

// ===========================================================================
// 6. Shader sources
// ===========================================================================
// slope (dh/dx, dh/dz) of the wind ripples: three scrolling octaves of a tileable map.
// `sample` is the texture expression with UV standing for the lookup coordinate.
const detailFn = (name, sample) => {
  const S = (uv) => sample.replace('UV', uv);
  return `vec2 ${name}(vec2 p) {
  float t = uDet.x, w = uDet.y;
  vec2 wd = vec2(0.953, 0.305), wn = vec2(-0.305, 0.953);
  vec4 a = ${S('p * 0.32 + wd * t * (0.040 + 0.10 * w)')};
  vec4 b = ${S('p * 0.88 + wd * t * (0.070 + 0.16 * w) + wn * t * 0.020 + vec2(0.37, 0.11)')};
  vec4 c = ${S('p * 2.45 - wd * t * (0.060 + 0.12 * w) + wn * t * 0.050 + vec2(0.71, 0.53)')};
  float A1 = 0.012 + 0.040 * w, A2 = 0.030 + 0.070 * w, A3 = 0.032 + 0.085 * w;
  return a.rg * A1 + b.ba * A2 + c.rg * A3;
}`;
};
const GLSL_DETAIL = /* glsl */`
uniform sampler2D uDetail;
uniform vec4 uDet;            // x time, y wind, z rain, w planar-reflection mix
uniform float uDetLod;        // mip level of the ripples used for refraction (soft)
uniform float uCausLod;       // mip level of the ripples used for the caustic map
uniform float uRippleGain;
${detailFn('detailSlope', 'texture2D(uDetail, UV)')}
${detailFn('detailSlopeSoft', 'textureLod(uDetail, UV, uDetLod)')}
${detailFn('detailSlopeCaus', 'textureLod(uDetail, UV, uCausLod)')}
`;

const GLSL_RAIN_RINGS = /* glsl */`
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// expanding capillary rings from drops, as surface slope
vec2 rainSlope(vec2 p) {
  float amt = uDet.z;
  if (amt < 0.01) return vec2(0.0);
  vec2 s = vec2(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float cell = layer == 0 ? 0.30 : 0.18;
    vec2 q = p / cell + float(layer) * 17.3;
    vec2 id = floor(q), f = fract(q);
    float h1 = hash12(id), h2 = hash12(id + 7.7);
    float period = 0.45 + 0.55 * h1;
    float u = uDet.x / period + h2;
    float n = floor(u), age = fract(u) * period;
    float hn = hash12(id + n * 3.17);
    if (hn < amt * 0.85) {
      vec2 c = 0.2 + 0.6 * vec2(hash12(id + n * 1.3 + 2.0), hash12(id + n * 2.1 + 5.0));
      vec2 d = (f - c) * cell;
      float r = length(d);
      float R = 0.045 + 0.30 * age;
      float wd = 0.006 + 0.018 * age;
      float x = (r - R) / wd;
      float amp = 0.55 * exp(-age * 5.0) * smoothstep(0.0, 0.015, age);
      s += (d / max(r, 1e-4)) * amp * x * exp(-x * x);
    }
  }
  return s;
}
`;

// ---------------------------------------------------------------- water surface
const WATER_VERT_PARS = /* glsl */`
uniform sampler2D uHeightTex;
uniform vec4 uPool;           // minX, minZ, sizeX, sizeZ
varying vec3 vWPos;
varying vec2 vPoolUv;
`;
const WATER_BEGIN_VERTEX = /* glsl */`
vec3 transformed = vec3( position );
{
  vec4 wp0 = modelMatrix * vec4( transformed, 1.0 );
  vPoolUv = clamp( ( wp0.xz - uPool.xy ) / uPool.zw, 0.0, 1.0 );
  transformed.y += texture2D( uHeightTex, vPoolUv ).r;
}
`;
const WATER_FRAG_PARS = /* glsl */`
varying vec3 vWPos;
varying vec2 vPoolUv;
uniform sampler2D uHeightTex;
uniform sampler2D uRefrTex;
uniform sampler2D uRefrDepth;
uniform sampler2D uReflTex;
uniform mat4 uInvVP;
uniform mat4 uVP;
uniform mat4 uReflMat;
uniform vec3 uAbsorb;
uniform vec3 uScatter;
uniform float uReflDistort;
uniform float uIter;          // refraction refinement steps (quality)
${GLSL_DETAIL}
${GLSL_RAIN_RINGS}
vec3 reconstructPos(vec2 uv, float depth) {
  vec4 p = uInvVP * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
vec3 fallbackSky(vec3 d) {
  float t = clamp(d.y, 0.0, 1.0);
  return mix(vec3(0.62, 0.72, 0.85), vec3(0.18, 0.36, 0.78), pow(t, 0.6));
}
`;
const WATER_NORMAL = /* glsl */`
float faceDirection = 1.0;
vec4 simS = texture2D( uHeightTex, vPoolUv );
vec2 rainS = rainSlope( vWPos.xz );
vec2 waterSlope = simS.gb + detailSlope( vWPos.xz ) + rainS;
vec3 nW = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) );
vec2 softSlope = simS.gb + detailSlopeSoft( vWPos.xz ) * uRippleGain + rainS;
vec3 nSoft = normalize( vec3( -softSlope.x, 1.0, -softSlope.y ) );
vec3 normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
vec3 nonPerturbedNormal = normal;
`;
const WATER_COMPOSE = /* glsl */`
vec3 Vw = normalize( cameraPosition - vWPos );
float NdV = clamp( dot( nW, Vw ), 0.0, 1.0 );
float Fw = 0.0204 + 0.9796 * pow( 1.0 - NdV, 5.0 );
vec3 refrCol = vec3( 0.0 );
float thick = 8.0;
{
  vec3 Rw = refract( -Vw, nSoft, 0.7502 );
  vec4 c0 = uVP * vec4( vWPos, 1.0 );
  vec2 uv0 = c0.xy / c0.w * 0.5 + 0.5;          // screen position, independent of the target size
  float d0 = textureLod( uRefrDepth, uv0, 0.0 ).x;
  vec3 S = reconstructPos( uv0, d0 );
  if ( d0 < 0.99999 && S.y < vWPos.y - 0.004 ) {
    vec2 uvR = uv0;
    for ( int i = 0; i < 3; i ++ ) {
      if ( float( i ) >= uIter ) break;
      float t = ( S.y - vWPos.y ) / min( Rw.y, -0.05 );
      vec3 Hr = vWPos + Rw * t;
      vec4 cp = uVP * vec4( Hr, 1.0 );
      vec2 uv1 = clamp( cp.xy / cp.w * 0.5 + 0.5, vec2( 0.002 ), vec2( 0.998 ) );
      float d1 = textureLod( uRefrDepth, uv1, 0.0 ).x;
      vec3 S1 = reconstructPos( uv1, d1 );
      if ( d1 < 0.99999 && S1.y < vWPos.y - 0.004 ) { S = S1; uvR = uv1; } else break;
    }
    // fade the distortion out toward the screen edges, where the lookup would leave the image
    uvR = mix( uv0, uvR, smoothstep( 0.0, 0.05, min( min( uvR.x, uvR.y ), min( 1.0 - uvR.x, 1.0 - uvR.y ) ) ) );
    refrCol = textureLod( uRefrTex, uvR, 0.0 ).rgb;
    thick = length( S - vWPos );
  }
}
vec3 Tw = exp( -uAbsorb * thick );
float scat = 1.0 - exp( -thick * 0.30 );
float foamN = 0.5 + 0.5 * texture2D( uDetail, vWPos.xz * 1.7 + vec2( 0.13, 0.41 ) ).b;
float foam = clamp( simS.a * ( 0.55 + 0.9 * foamN ) * 1.4, 0.0, 1.0 );
diffuseColor.rgb = mix( uScatter * scat, vec3( 0.9 ), foam );
vec3 transmitted = refrCol * Tw * ( 1.0 - foam );
totalEmissiveRadiance += transmitted * ( 1.0 - Fw );
roughnessFactor = clamp( mix( roughnessFactor, 0.55, foam ) + 0.02 * smoothstep( 20.0, 120.0, length( cameraPosition - vWPos ) ), 0.0, 1.0 );
`;
const WATER_REFLECT = /* glsl */`
{
  vec4 rc = uReflMat * vec4( vWPos, 1.0 );
  vec2 ruv = rc.xy / rc.w + nW.xz * uReflDistort;
  vec3 planar = min( texture2D( uReflTex, ruv ).rgb, vec3( 80.0 ) );
  #ifdef USE_ENVMAP
    radiance = mix( radiance, planar, uDet.w );
  #else
    radiance = mix( fallbackSky( reflect( -Vw, nW ) ), planar, uDet.w );
  #endif
}
`;

// ------------------------------------------------- underwater lighting of pool materials
const UW_VERT_PARS = /* glsl */`
varying vec3 vUwPos;
`;
const UW_VERT_POS = /* glsl */`
{
  vec4 uwp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    uwp = instanceMatrix * uwp;
  #endif
  vUwPos = ( modelMatrix * uwp ).xyz;
}
`;
const UW_FRAG_PARS = /* glsl */`
varying vec3 vUwPos;
uniform sampler2D uHeightTex;
uniform sampler2D uCausticTex;
uniform vec4 uPool;
uniform vec4 uCausticMap;     // minU, minV, sizeU, sizeV
uniform vec3 uSunRefr;        // refracted sun ray (pointing down)
uniform vec3 uAbsorb;
uniform vec3 uGlow;
uniform float uCausticOn;
uniform float uWaterLevel;
uniform float uCausticPow;
`;
const UW_FRAG_APPLY = /* glsl */`
{
  vec2 puv = ( vUwPos.xz - uPool.xy ) / uPool.zw;
  float inPool = step( 0.0, puv.x ) * step( puv.x, 1.0 ) * step( 0.0, puv.y ) * step( puv.y, 1.0 );
  float surfY = uWaterLevel + texture2D( uHeightTex, clamp( puv, 0.0, 1.0 ) ).r;
  float depthW = surfY - vUwPos.y;
  float uw = inPool * smoothstep( -0.004, 0.03, depthW );
  float dd = max( depthW, 0.0 );
  float cosr = max( -uSunRefr.y, 0.25 );
  vec3 Tsun = exp( -uAbsorb * dd / cosr );
  vec3 Tamb = exp( -uAbsorb * dd * 1.5 );
  vec2 cu = vUwPos.xz - ( ( vUwPos.y - uWaterLevel ) / uSunRefr.y ) * uSunRefr.xz;
  vec2 cm = ( cu - uCausticMap.xy ) / uCausticMap.zw;
  float cin = step( 0.0, cm.x ) * step( cm.x, 1.0 ) * step( 0.0, cm.y ) * step( cm.y, 1.0 );
  float cval = pow( max( texture2D( uCausticTex, clamp( cm, 0.0, 1.0 ), 0.6 ).r, 0.0 ), uCausticPow );
  float rim = smoothstep( 0.0, 0.03, min( min( cm.x, 1.0 - cm.x ), min( cm.y, 1.0 - cm.y ) ) );
  float caus = mix( 1.0, cval * cin * rim, uCausticOn );
  vec3 sunMul = Tsun * caus;
  reflectedLight.directDiffuse *= mix( vec3( 1.0 ), sunMul, uw );
  reflectedLight.directSpecular *= mix( vec3( 1.0 ), sunMul, uw );
  reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), Tamb, uw );
  reflectedLight.indirectSpecular *= mix( vec3( 1.0 ), Tamb, uw );
  reflectedLight.indirectDiffuse += material.diffuseColor * uGlow * ( 1.0 - Tamb ) * uw;
}
`;

// ------------------------------------------------------------------- caustic map pass
// The map is indexed by where the light lands, in flat-ray-projected coordinates (so a floor or wall
// point looks it up by its own position). For every texel the surface point that sends light there is
// found by fixed-point iteration of the exact refraction trace, and the intensity is the inverse
// Jacobian of the trace at that point (|det| < 1 focuses, > 1 spreads), evaluated at texel resolution.
const CAUSTIC_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const CAUSTIC_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uHeightTex;
uniform vec4 uPool;
uniform vec4 uFloor;          // shallow depth, deep depth, slopeStartX, slopeEndX
uniform vec4 uMap;            // minU, minV, sizeU, sizeV
uniform vec3 uToSun;
uniform float uEps;
${GLSL_DETAIL}
varying vec2 vUv;

vec3 hitPool(vec3 P, vec3 r) {
  float s = uFloor.x, d = uFloor.y, a = uFloor.z, b = uFloor.w;
  float k = (d - s) / (b - a);
  float t1 = (-s - P.y) / r.y;
  float t2 = (-d - P.y) / r.y;
  float t3 = (-s - P.y - k * (P.x - a)) / (r.y + k * r.x);
  float x1 = P.x + r.x * t1, x2 = P.x + r.x * t2;
  float tF = (x1 <= a) ? t1 : ((x2 >= b) ? t2 : t3);
  float tW = 1.0e5;
  if (r.x > 1.0e-5) tW = min(tW, (uPool.x + uPool.z - P.x) / r.x);
  else if (r.x < -1.0e-5) tW = min(tW, (uPool.x - P.x) / r.x);
  if (r.z > 1.0e-5) tW = min(tW, (uPool.y + uPool.w - P.z) / r.z);
  else if (r.z < -1.0e-5) tW = min(tW, (uPool.y - P.z) / r.z);
  return P + r * min(tF, tW);
}
// where the ray entering at surface point xz ends up, in the flat-ray-projected coordinates
vec2 mapU(vec2 xz, vec3 L, vec3 r0) {
  vec4 hs = texture2D(uHeightTex, clamp((xz - uPool.xy) / uPool.zw, 0.0, 1.0));
  vec2 slope = hs.gb + detailSlopeCaus(xz) * uRippleGain;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 r = refract(L, n, 0.7502);
  vec3 hit = hitPool(vec3(xz.x, hs.r, xz.y), r);
  return hit.xz - (hit.y / r0.y) * r0.xz;
}
void main() {
  vec2 u = uMap.xy + vUv * uMap.zw;                  // where the light lands (flat-ray coordinates)
  vec3 L = -uToSun;
  vec3 r0 = refract(L, vec3(0.0, 1.0, 0.0), 0.7502);
  // approximate the surface point whose ray lands at u (two fixed-point steps)
  vec2 x = u;
  x = u - (mapU(x, L, r0) - x);
  x = u - (mapU(x, L, r0) - x);
  float e = uEps;
  vec2 m0 = mapU(x, L, r0), mx = mapU(x + vec2(e, 0.0), L, r0), mz = mapU(x + vec2(0.0, e), L, r0);
  vec2 a = (mx - m0) / e, b = (mz - m0) / e;
  float det = abs(a.x * b.y - a.y * b.x);
  float I = min(1.0 / max(det, 0.10), 9.0);
  // light only enters through the water surface: dark outside the pool outline (soft edge)
  vec2 q = (x - uPool.xy) / uPool.zw;
  float inside = smoothstep(0.0, 0.004, q.x) * smoothstep(0.0, 0.004, 1.0 - q.x) * smoothstep(0.0, 0.008, q.y) * smoothstep(0.0, 0.008, 1.0 - q.y);
  I *= inside;
  if (!(I == I)) I = 0.0;
  gl_FragColor = vec4(I, I, I, 1.0);
}`;

// ===========================================================================
// 7. PoolWater
// ===========================================================================
const QUALITY = {
  low:    { refr: 0.40, refl: 0.0,  tpm: 26, every: 2, iter: 1 },
  medium: { refr: 0.50, refl: 0.50, tpm: 48, every: 1, iter: 2 },
  high:   { refr: 0.75, refl: 0.75, tpm: 72, every: 1, iter: 3 },
};
const CAUSTIC_MARGIN = 1.0;           // m of map beyond the pool outline
const WATER_IOR = 1.333;

function refractDown(toSun, out) {
  // refraction of the incoming sun ray (-toSun) at a flat water surface
  const eta = 1 / WATER_IOR, cosi = Math.max(0, toSun.y);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  const c = eta * cosi - Math.sqrt(Math.max(0, k));
  return out.set(-toSun.x * eta, -toSun.y * eta + c, -toSun.z * eta);
}

const _clipPlane = new THREE.Plane(), _clipVec = new THREE.Vector4(), _clipQ = new THREE.Vector4();
/** Replace the near plane by an arbitrary plane (Lengyel oblique clipping). */
function obliqueClip(cam, planeNormal, planePoint) {
  _clipPlane.setFromNormalAndCoplanarPoint(planeNormal, planePoint).applyMatrix4(cam.matrixWorldInverse);
  const clip = _clipVec.set(_clipPlane.normal.x, _clipPlane.normal.y, _clipPlane.normal.z, _clipPlane.constant);
  const P = cam.projectionMatrix.elements;
  const q = _clipQ.set((Math.sign(clip.x) + P[8]) / P[0], (Math.sign(clip.y) + P[9]) / P[5], -1.0, (1.0 + P[10]) / P[14]);
  clip.multiplyScalar(2.0 / clip.dot(q));
  P[2] = clip.x; P[6] = clip.y; P[10] = clip.z + 1.0 - 0.003; P[14] = clip.w;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

export class PoolWater {
  /**
   * Adds its own meshes to `scene`. `sun` is the scene's key light; its
   * direction (position - target) can change at runtime (time of day).
   * @param {{renderer: THREE.WebGLRenderer, scene: THREE.Scene,
   *          camera: THREE.PerspectiveCamera, sun: THREE.DirectionalLight}} o
   */
  constructor({ renderer, scene, camera, sun }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;
    this.mode = 'waves';
    // Called instead of the internal sim in 'particles' mode, for pointer
    // ripples, rain and body/water interaction: (x, z, radius, strength) => void
    this.externalDisturb = null;

    this.quality = 'medium';
    this.wind = 0.3;
    this.rain = 0;
    this.sim = new WaveSim();
    this._time = 0; this._acc = 0; this._frame = 0;
    this._windVel = { x: 0, z: 0 };
    this._detached = false;
    this._dropAcc = 0;
    this._targetKey = ''; this._causticSkip = 0;
    this._dbs = new THREE.Vector2();
    this._toSun = new THREE.Vector3(0.3, 0.8, 0.2).normalize();
    this._sunRefr = new THREE.Vector3(0, -1, 0);
    this._sunUp = true;
    this._tmpA = new THREE.Vector3(); this._tmpB = new THREE.Vector3();
    this._mirror = new THREE.PerspectiveCamera();
    this._refrCam = new THREE.PerspectiveCamera();
    this._st = { clearColor: new THREE.Color(), viewport: new THREE.Vector4(), scissor: new THREE.Vector4(), vis: [true, true, true] };
    this._m4 = new THREE.Matrix4(); this._rot = new THREE.Matrix4();
    this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._v3 = new THREE.Vector3(); this._v4 = new THREE.Vector3();
    this._clipPoint = new THREE.Vector3(0, POOL.waterLevel + 0.03, 0);
    this._mirrorPoint = new THREE.Vector3(0, POOL.waterLevel, 0);
    this._down = new THREE.Vector3(0, -1, 0); this._up = new THREE.Vector3(0, 1, 0);
    this._ext = renderer.extensions;
    this._hasColorBuffer = this._ext.has('EXT_color_buffer_float') || this._ext.has('EXT_color_buffer_half_float');
    this._floatLinear = this._ext.has('OES_texture_float_linear');

    this._buildTextures();
    this._buildUniforms();
    this._buildSurface();
    this._buildCausticPass();

    this.spray = new Spray(this);
    this.spray.points.name = 'PoolWaterSpray';
    scene.add(this.spray.points);
    this.rainFx = new Rain();
    this.rainFx.mesh.name = 'PoolWaterRain';
    scene.add(this.rainFx.mesh);
    this._bodies = new BodySystem(this);
    this.setWind(this.wind);
    this.setRain(0);
    this._updateSun();
  }

  // ---- diagnostics / extras -------------------------------------------------
  /** Live list of bodies: {id, type, mesh, position, x, y, z (centre of mass), vx, vy, vz, bottomY, surfaceY, draft, ...} */
  get bodies() { return this._bodies.bodies; }
  /** Surface offsets (m) on the pool-config grid (read-only view of the live array). */
  get heights() { return this.sim.h; }
  /** Number of live spray droplets. */
  get sprayCount() { return this.spray.n; }
  stats() { const s = this.sim.stats(); s.sprayCount = this.spray.n; s.bodies = this._bodies.bodies.length; return s; }

  // ---- resources ----------------------------------------------------------
  _buildTextures() {
    const { nx, nz, N } = this.sim;
    this._half = !this._floatLinear;
    if (this._half) this._texHalf = new Uint16Array(N * 4);
    const t = new THREE.DataTexture(this._half ? this._texHalf : this.sim.tex, nx, nz, THREE.RGBAFormat,
      this._half ? THREE.HalfFloatType : THREE.FloatType);
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true;
    this.heightTex = t;

    const f = makeRippleSlopeMaps(256), h = new Uint16Array(f.length);
    for (let i = 0; i < f.length; i++) h[i] = toHalfBits(f[i]);
    const d = new THREE.DataTexture(h, 256, 256, THREE.RGBAFormat, THREE.HalfFloatType);
    d.wrapS = d.wrapT = THREE.RepeatWrapping; d.magFilter = THREE.LinearFilter;
    d.generateMipmaps = this._hasColorBuffer;
    d.minFilter = this._hasColorBuffer ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    d.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    d.flipY = false; d.needsUpdate = true;
    this.detailTex = d;

    const w = new THREE.DataTexture(new Uint16Array([0x3c00, 0x3c00, 0x3c00, 0x3c00]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    w.needsUpdate = true;
    this._whiteTex = w;
  }

  _buildUniforms() {
    const V4 = (a, b, c, d) => new THREE.Vector4(a, b, c, d);
    const M = CAUSTIC_MARGIN;
    this.U = {
      uHeightTex: { value: this.heightTex },
      uPool: { value: V4(POOL.minX, POOL.minZ, POOL.length, POOL.width) },
      uDet: { value: V4(0, this.wind, 0, 0) },
      uDetail: { value: this.detailTex },
      uRefrTex: { value: null }, uRefrDepth: { value: null }, uReflTex: { value: null },
      uInvVP: { value: new THREE.Matrix4() }, uVP: { value: new THREE.Matrix4() }, uReflMat: { value: new THREE.Matrix4() },
      uAbsorb: { value: new THREE.Vector3(0.50, 0.135, 0.07) },
      uScatter: { value: new THREE.Vector3(0.020, 0.115, 0.145) },
      uReflDistort: { value: 0.03 }, uIter: { value: 2 },
      uCausticTex: { value: this._whiteTex },
      uCausticMap: { value: V4(POOL.minX - M, POOL.minZ - M, POOL.length + 2 * M, POOL.width + 2 * M) },
      uSunRefr: { value: this._sunRefr },
      uCausticOn: { value: 0 }, uCausticPow: { value: 1.25 },
      uDetLod: { value: 5.0 }, uCausLod: { value: 5.5 }, uRippleGain: { value: 1.0 },
      uWaterLevel: { value: POOL.waterLevel },
      uGlow: { value: new THREE.Vector3(0.012, 0.045, 0.055) },
    };
  }

  _buildSurface() {
    const geo = new THREE.PlaneGeometry(POOL.length + 0.04, POOL.width + 0.04, HF.nx, HF.nz).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x000000, roughness: 0.06, metalness: 0, ior: WATER_IOR, specularIntensity: 1, envMapIntensity: 1,
    });
    const U = this.U;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + WATER_VERT_PARS)
        .replace('#include <begin_vertex>', WATER_BEGIN_VERTEX)
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + WATER_FRAG_PARS)
        .replace('#include <normal_fragment_begin>', WATER_NORMAL)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + WATER_COMPOSE)
        .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n' + WATER_REFLECT);
    };
    mat.customProgramCacheKey = () => 'poolwater-surface-v1';
    this.material = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = POOL.waterLevel;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;          // the surface never casts shadows
    this.mesh.receiveShadow = true;
    this.mesh.name = 'PoolWaterSurface';
    // Pointer picking: intersect the rest plane analytically (the displaced surface is only a few
    // centimetres off it) instead of testing 65k triangles; uv is the normalised pool position.
    const plane = { t: 0 }, hitP = new THREE.Vector3();
    this.mesh.raycast = (raycaster, intersects) => {
      const ray = raycaster.ray;
      if (Math.abs(ray.direction.y) < 1e-9) return;
      plane.t = (POOL.waterLevel - ray.origin.y) / ray.direction.y;
      if (plane.t < raycaster.near || plane.t > raycaster.far) return;
      ray.at(plane.t, hitP);
      if (hitP.x < POOL.minX || hitP.x > POOL.maxX || hitP.z < POOL.minZ || hitP.z > POOL.maxZ) return;
      intersects.push({ distance: plane.t, point: hitP.clone(), object: this.mesh, face: null, faceIndex: 0,
        uv: new THREE.Vector2((hitP.x - POOL.minX) / POOL.length, (hitP.z - POOL.minZ) / POOL.width) });
    };
    this.scene.add(this.mesh);
  }

  _buildCausticPass() {
    this._cScene = new THREE.Scene();
    this._cCam = new THREE.Camera();
    const U = this.U;
    this._cUniforms = {
      uHeightTex: U.uHeightTex, uPool: U.uPool, uDet: U.uDet, uDetail: U.uDetail, uMap: U.uCausticMap,
      uToSun: { value: this._toSun },
      uFloor: { value: new THREE.Vector4(-floorY(POOL.minX), -floorY(POOL.maxX), POOL.slopeStartX, POOL.slopeEndX) },
      uDetLod: U.uDetLod, uCausLod: U.uCausLod, uRippleGain: U.uRippleGain,
      uEps: { value: 0.01 },
    };
    this._cMat = new THREE.ShaderMaterial({
      uniforms: this._cUniforms, vertexShader: CAUSTIC_VERT, fragmentShader: CAUSTIC_FRAG,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    this._cMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._cMat);
    this._cMesh.frustumCulled = false;
    this._cScene.add(this._cMesh);
  }

  _ensureTargets(renderer) {
    renderer.getDrawingBufferSize(this._dbs);
    const q = QUALITY[this.quality];
    this.U.uIter.value = q.iter;
    const key = `${this._dbs.x}x${this._dbs.y}:${this.quality}`;
    if (key === this._targetKey) return;
    this._targetKey = key;
    for (const k of ['_refrRT', '_reflRT', '_causticRT']) if (this[k]) { this[k].dispose(); this[k].depthTexture?.dispose(); this[k] = null; }
    const W = Math.max(2, this._dbs.x | 0), H = Math.max(2, this._dbs.y | 0);
    const dim = (v) => Math.max(16, Math.min(2048, v | 0));
    const rt = (w, h, opts) => new THREE.WebGLRenderTarget(dim(w), dim(h), opts);
    const hdr = this._hasColorBuffer ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this._refrRT = rt(W * q.refr, H * q.refr, {
      type: hdr, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: true, depthTexture: new THREE.DepthTexture(dim(W * q.refr), dim(H * q.refr)),
    });
    if (q.refl > 0) {
      this._reflRT = rt(W * q.refl, H * q.refl, {
        type: hdr, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        generateMipmaps: false, depthBuffer: true,
      });
    }
    if (this._hasColorBuffer) {
      const M = CAUSTIC_MARGIN, cw = Math.round((POOL.length + 2 * M) * q.tpm / 8) * 8, ch = Math.round((POOL.width + 2 * M) * q.tpm / 8) * 8;
      this._causticRT = new THREE.WebGLRenderTarget(cw, ch, {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
        generateMipmaps: true, depthBuffer: false,
      });
      this._causticRT.texture.wrapS = this._causticRT.texture.wrapT = THREE.ClampToEdgeWrapping;
      this._cUniforms.uEps.value = 0.45 / q.tpm;
    }
    this.U.uRefrTex.value = this._refrRT.texture;
    this.U.uRefrDepth.value = this._refrRT.depthTexture;
    this.U.uReflTex.value = this._reflRT ? this._reflRT.texture : null;
    this.U.uCausticOn.value = 0;
    this.U.uCausticTex.value = this._whiteTex;
    this._causticSkip = 0;
  }

  // ---- sun --------------------------------------------------------------------
  _updateSun() {
    const sun = this.sun, a = this._tmpA, b = this._tmpB;
    if (sun) {
      sun.getWorldPosition(a);
      if (sun.target) sun.target.getWorldPosition(b); else b.set(0, 0, 0);
      a.sub(b);
      if (a.lengthSq() > 1e-8) this._toSun.copy(a).normalize();
    }
    const up = this._toSun.y;
    this._sunUp = up > 0.02;
    refractDown(this._sunUp ? this._toSun : a.set(0, 1, 0), this._sunRefr);
    // sky / sun brightness for the particle and rain sprites
    const lum = THREE.MathUtils.clamp(up * 2.0, 0.04, 1.0);
    const sc = sun && sun.color ? sun.color : new THREE.Color(1, 1, 1), si = sun ? Math.min(sun.intensity, 8) : 3;
    this.spray.uniforms.uSunColor.value.copy(sc).multiplyScalar(this._sunUp ? 1.7 * si / 3 * lum : 0);
    this.spray.uniforms.uAmbient.value.setRGB(0.5, 0.6, 0.72).multiplyScalar(0.7 + 2.6 * lum);
    this.rainFx.uniforms.uColor.value.setRGB(0.78, 0.84, 0.95).multiplyScalar(0.12 + 0.9 * lum * Math.min(1.4, si / 3 + 0.4));
    this.U.uGlow.value.set(0.012, 0.045, 0.055).multiplyScalar(0.25 + 0.75 * lum * Math.min(1.5, si / 3 + 0.3));
  }

  // ---- render passes ------------------------------------------------------------
  /** Call once per frame right before the final renderer.render(scene, camera).
   *  Renders any reflection/refraction targets and restores renderer state. */
  beforeRender(renderer, scene, camera) {
    renderer = renderer || this.renderer; scene = scene || this.scene; camera = camera || this.camera;
    this._ensureTargets(renderer);
    camera.updateMatrixWorld();
    this._updateSun();
    camera.getWorldPosition(this.rainFx.uniforms.uCam.value);     // rain follows the camera
    this.rainFx.uniforms.uPx.value = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov || 50) / 2) / Math.max(1, this._dbs.y);
    const st = this._saveState(renderer, scene);
    try {
      renderer.xr.enabled = false;
      renderer.autoClear = true; renderer.autoClearColor = true; renderer.autoClearDepth = true; renderer.autoClearStencil = true;
      this.mesh.visible = false; this.spray.points.visible = false; this.rainFx.mesh.visible = false;
      // reuse last frame's shadow map in the extra passes (unless it does not exist yet, e.g. right
      // after the caller re-created it for a quality change)
      const sh = this.sun && this.sun.castShadow && this.sun.shadow;
      if (this._frame > 0 && !(sh && !sh.map)) renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = false;
      if (this._sunUp && this._causticRT) this._renderCaustics(renderer);
      else this.U.uCausticOn.value = 0;                 // no direct sun: no caustic modulation
      this._renderRefraction(renderer, scene, camera);
      if (this._reflRT) this._renderReflection(renderer, scene, camera);
    } finally {
      this._restoreState(renderer, scene, st);
    }
    this.U.uDet.value.w = this._reflRT && this._reflOk ? 1 : 0;
    this._frame++;
  }

  _saveState(renderer, scene) {
    const st = this._st;
    st.target = renderer.getRenderTarget(); st.face = renderer.getActiveCubeFace(); st.mip = renderer.getActiveMipmapLevel();
    st.autoClear = renderer.autoClear; st.acColor = renderer.autoClearColor; st.acDepth = renderer.autoClearDepth; st.acStencil = renderer.autoClearStencil;
    renderer.getClearColor(st.clearColor); st.clearAlpha = renderer.getClearAlpha();
    renderer.getViewport(st.viewport); renderer.getScissor(st.scissor); st.scissorTest = renderer.getScissorTest();
    st.shadowAuto = renderer.shadowMap.autoUpdate; st.shadowNeeds = renderer.shadowMap.needsUpdate;
    st.xr = renderer.xr.enabled; st.background = scene.background;
    st.vis[0] = this.mesh.visible; st.vis[1] = this.spray.points.visible; st.vis[2] = this.rainFx.mesh.visible;
    return st;
  }

  _restoreState(renderer, scene, st) {
    renderer.setRenderTarget(st.target, st.face, st.mip);
    renderer.autoClear = st.autoClear; renderer.autoClearColor = st.acColor; renderer.autoClearDepth = st.acDepth; renderer.autoClearStencil = st.acStencil;
    renderer.setClearColor(st.clearColor, st.clearAlpha);
    renderer.setViewport(st.viewport);
    renderer.setScissor(st.scissor);
    renderer.setScissorTest(st.scissorTest);
    renderer.shadowMap.autoUpdate = st.shadowAuto;
    renderer.shadowMap.needsUpdate = st.shadowNeeds;
    renderer.xr.enabled = st.xr;
    scene.background = st.background;
    this.mesh.visible = st.vis[0]; this.spray.points.visible = st.vis[1]; this.rainFx.mesh.visible = st.vis[2];
  }

  _renderCaustics(renderer) {
    if (this._causticSkip > 0) { this._causticSkip--; return; }
    this._causticSkip = QUALITY[this.quality].every - 1;
    renderer.setRenderTarget(this._causticRT);
    renderer.setClearColor(0x000000, 0);
    renderer.state.buffers.depth.setMask(true);
    renderer.render(this._cScene, this._cCam);
    this.U.uCausticTex.value = this._causticRT.texture;
    this.U.uCausticOn.value = 1;
  }

  _renderRefraction(renderer, scene, camera) {
    const cam = this._refrCam;
    cam.copy(camera, false);
    cam.matrixWorldAutoUpdate = false;
    cam.matrixWorld.copy(camera.matrixWorld);
    cam.matrixWorldInverse.copy(camera.matrixWorldInverse);
    cam.projectionMatrix.copy(camera.projectionMatrix);
    cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    // keep only what is below the surface (the underwater world and the wet part of bodies)
    const camY = this._tmpA.setFromMatrixPosition(camera.matrixWorld).y;
    if (camY > POOL.waterLevel + 0.08) obliqueClip(cam, this._down, this._clipPoint);
    const vp = this._m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.U.uVP.value.copy(vp);
    this.U.uInvVP.value.copy(vp).invert();
    renderer.setRenderTarget(this._refrRT);
    renderer.setClearColor(0x000000, 0);
    renderer.state.buffers.depth.setMask(true);
    const bg = scene.background;
    scene.background = null;
    renderer.render(scene, cam);
    scene.background = bg;
  }

  _renderReflection(renderer, scene, camera) {
    const level = POOL.waterLevel, n = this._up, rp = this._mirrorPoint;
    const camPos = this._v1.setFromMatrixPosition(camera.matrixWorld);
    this._reflOk = false;
    if (camPos.y <= level + 0.02) return;
    const view = this._v2.subVectors(rp, camPos);
    view.reflect(n).negate().add(rp);
    const rot = this._rot.extractRotation(camera.matrixWorld);
    const lookAt = this._v3.set(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = this._v4.subVectors(rp, lookAt).reflect(n).negate().add(rp);
    const vc = this._mirror;
    vc.position.copy(view);
    vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(n);
    vc.lookAt(target);
    vc.near = camera.near; vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    vc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    const tm = this.U.uReflMat.value;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(vc.projectionMatrix);
    tm.multiply(vc.matrixWorldInverse);
    obliqueClip(vc, n, rp);
    renderer.setRenderTarget(this._reflRT);
    renderer.setClearColor(0x000000, 1);
    renderer.state.buffers.depth.setMask(true);
    renderer.render(scene, vc);
    this._reflOk = true;
  }

  // ---- public API: simulation -------------------------------------------------
  /** 'waves' | 'spray' | 'particles' */
  setMode(mode) {
    if (!MODES.includes(mode) || mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    if (mode === 'particles' || prev === 'particles') {
      this.sim.reset(); this._acc = 0; this._detached = false;
      this._uploadHeights();
    }
    if (prev === 'spray') this.spray.clear();
  }

  _routeExternal() { return this.mode === 'particles' && !this._detached; }

  /** Advance simulation and bodies. dt in seconds (caller clamps to <= 1/30). */
  update(dt, time) {
    dt = dt > 0 ? Math.min(dt, 1 / 20) : 0;
    this._lastDt = dt > 0 ? dt : this._lastDt;
    this._time += dt;
    const sim = this.sim, ext = this._routeExternal();
    if (!ext) sim.beginFrame();
    this._bodies.step(dt);
    if (this.mode === 'spray') this.spray.update(dt);
    else if (this.spray.n) this.spray.clear();
    if (!ext) {
      this._acc += dt;
      let n = 0;
      while (this._acc >= SIM_STEP && n < 3) { sim.advance(); this._acc -= SIM_STEP; n++; }
      if (this._acc > SIM_STEP) this._acc = SIM_STEP;
    } else if (this.rain > 0.02) {
      // the particle fluid does not know about rain: hand it a sparse stream of drops
      this._dropAcc += dt * this.rain * 40;
      let k = Math.min(6, this._dropAcc | 0);
      this._dropAcc -= (this._dropAcc | 0);
      while (k-- > 0) {
        this._disturbExternal(POOL.minX + 0.3 + Math.random() * (POOL.length - 0.6), POOL.minZ + 0.3 + Math.random() * (POOL.width - 0.6),
          0.04 + Math.random() * 0.03, 0.0012 + Math.random() * 0.0025);
      }
    }
    if (sim.pack(dt)) this._uploadHeights();
    this.U.uDet.value.x = this._time; this.U.uDet.value.y = this.wind; this.U.uDet.value.z = this.rain;
    this.rainFx.uniforms.uTime.value = this._time;
    this.time = this._time;
  }

  _uploadHeights() {
    if (this._half) {
      const t = this.sim.tex, h = this._texHalf;
      for (let i = 0; i < t.length; i++) h[i] = toHalfBits(t[i]);
    }
    this.heightTex.needsUpdate = true;
  }

  _disturbExternal(x, z, r, s) { if (typeof this.externalDisturb === 'function') this.externalDisturb(x, z, r, s); }

  /** Push the surface at (x, z). strength ~ peak displacement in meters
   *  (0.02 gentle ripple .. 0.3 big splash); positive pushes water down. */
  disturb(x, z, radius, strength) {
    if (!isFinite(x) || !isFinite(z) || !isFinite(radius) || !isFinite(strength)) return;
    if (this._routeExternal()) { this._disturbExternal(x, z, radius, strength); return; }
    const s = THREE.MathUtils.clamp(strength, -0.5, 0.5), r = Math.max(0.03, radius);
    this.sim.splat(x, z, r, -s);
    if (s > 0.09) this.sim.addFoam(x, z, r * 0.9, Math.min(1, s * 2.2));
    if (s > 0.035 && this.mode === 'spray') this.spray.burst(x, z, r, 0.8 + 6.5 * s, Math.min(400, 6000 * s * s + 2));
  }

  // body entering the water: cavity, foam, crown of spray
  _impact(x, z, rc, strength, E, v) {
    if (this._routeExternal()) { this._disturbExternal(x, z, rc, strength); return; }
    this.sim.splat(x, z, rc, -strength);
    this.sim.addFoam(x, z, rc * 1.15, Math.min(1, 0.35 + strength * 3));
    if (this.mode === 'spray') this.spray.burst(x, z, rc, 1.0 + 0.45 * v, Math.min(700, 14 + E * 1.4));
  }

  // a spray droplet falling back in leaves a small ripple
  _dropletLands(x, z, size) {
    this.sim.splat(x, z, 0.06, -0.0010 * (size / 0.02));
  }

  // ---- bodies -------------------------------------------------------------------
  /** Drop a floating body into the pool. type: one of BODY_TYPES. Returns id. */
  spawnBody(type) {
    if (!BODY_TYPES.includes(type)) return -1;
    return this._bodies.spawn(type);
  }
  clearBodies() { this._bodies.clear(); }

  /** Pointer interaction with bodies. grab returns true if a body was hit. */
  grab(raycaster) { return !!raycaster && this._bodies.grab(raycaster); }
  dragTo(point) { this._bodies.dragTo(point); }      // THREE.Vector3 target for the grabbed body
  release() { this._bodies.release(); }

  // ---- weather ---------------------------------------------------------------------
  setRain(amount) {          // 0..1
    this.rain = THREE.MathUtils.clamp(+amount || 0, 0, 1);
    this.sim.setForcing(this.wind, this.rain);
    this.rainFx.set(this.rain, this.wind);
  }
  setWind(amount) {          // 0..1
    this.wind = THREE.MathUtils.clamp(+amount || 0, 0, 1);
    this._windVel.x = WIND_DIR.x * this.wind * 8; this._windVel.z = WIND_DIR.z * this.wind * 8;
    this.sim.setForcing(this.wind, this.rain);
    this.rainFx.set(this.rain, this.wind);
  }
  setQuality(level) {        // 'low' | 'medium' | 'high'
    if (!QUALITY[level] || level === this.quality) return;
    this.quality = level;
    this._targetKey = '';    // targets are rebuilt at the next beforeRender
  }

  /** Patch a MeshStandardMaterial (via onBeforeCompile) so fragments under the
   *  water get caustics and depth absorption. Call before its first render. */
  applyUnderwaterLighting(material) {
    if (!material || !material.isMeshStandardMaterial) return material;
    material.userData = material.userData || {};
    if (material.userData.poolUnderwater) return material;
    material.userData.poolUnderwater = true;
    const U = this.U, prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
    material.onBeforeCompile = (shader, renderer) => {
      if (typeof prev === 'function') prev.call(material, shader, renderer);
      for (const k of ['uHeightTex', 'uCausticTex', 'uPool', 'uCausticMap', 'uSunRefr', 'uAbsorb', 'uGlow', 'uCausticOn', 'uWaterLevel', 'uCausticPow']) shader.uniforms[k] = U[k];
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + UW_VERT_PARS)
        .replace('#include <project_vertex>', '#include <project_vertex>\n' + UW_VERT_POS);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + UW_FRAG_PARS)
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + UW_FRAG_APPLY);
    };
    material.customProgramCacheKey = () => 'poolwater-uw-v1|' + (typeof prevKey === 'function' ? prevKey.call(material) : '');
    material.needsUpdate = true;
    return material;
  }

  /** Float32Array(HF.nx * HF.nz) in pool-config layout, or null to resume the
   *  internal sim. Called every frame in 'particles' mode; re-upload each call. */
  setExternalHeights(heights) {
    if (heights == null) {
      this._detached = true;
      this.sim.reset(); this._acc = 0;
      this._uploadHeights();
      return;
    }
    this._detached = false;
    if (this.mode !== 'particles' || !heights.length || heights.length < this.sim.N) return;
    this.sim.loadExternal(heights);
    // pack and upload now: callers typically feed the heights after update() and before beforeRender()
    if (this.sim.pack(this._lastDt || SIM_STEP)) this._uploadHeights();
  }

  /** Surface height (y) at world (x, z). */
  heightAt(x, z) {
    if (!isFinite(x) || !isFinite(z)) return POOL.waterLevel;
    this.sim.sample(x, z, this._hs || (this._hs = { h: 0, gx: 0, gz: 0, w: 0 }));
    return POOL.waterLevel + this._hs.h;
  }

  /** Flatten the water and stop all motion. Bodies stay. */
  reset() {
    this.sim.reset(); this._acc = 0;
    this.spray.clear();
    this._bodies.stopMotion();
    this._uploadHeights();
  }

  /** Release GPU resources and remove everything this module added to the scene. */
  dispose() {
    this._bodies.clear();
    this.scene.remove(this.mesh, this.spray.points, this.rainFx.mesh);
    this.mesh.geometry.dispose(); this.material.dispose();
    this.spray.points.geometry.dispose(); this.spray.material.dispose();
    this.rainFx.mesh.geometry.dispose(); this.rainFx.material.dispose();
    for (const k of ['_refrRT', '_reflRT', '_causticRT']) if (this[k]) { this[k].dispose(); this[k].depthTexture?.dispose(); this[k] = null; }
    this.heightTex.dispose(); this.detailTex.dispose(); this._whiteTex.dispose();
    this._cMesh.geometry.dispose(); this._cMat.dispose();
  }
}

/** Per-quality rendering budget (exposed for tuning/tests): {refr, refl, tpm, grid, every}. */
PoolWater.QUALITY = QUALITY;
