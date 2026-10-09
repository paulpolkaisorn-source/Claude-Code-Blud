// Self-contained FLIP/PIC kernel on a MAC grid. No imports and no outside references:
// fluid.js ships FlipSim.toString() into a Blob Web Worker, and the same class runs on
// the main thread as the fallback. Grid: x fastest, then y, then z (cell c = i + nx*(j + ny*k)).
export class FlipSim {
  constructor(cfg) {
    const h = cfg.h, nx = cfg.nx, ny = cfg.ny, nz = cfg.nz;
    this.cfg = cfg;
    this.h = h; this.invh = 1 / h; this.nx = nx; this.ny = ny; this.nz = nz;
    this.minX = cfg.minX; this.minZ = cfg.minZ; this.y0 = cfg.y0;
    this.maxX = cfg.minX + nx * h; this.maxZ = cfg.minZ + nz * h; this.yTop = cfg.y0 + ny * h;
    this.waterLevel = cfg.waterLevel;
    this.hfNx = cfg.hfNx; this.hfNz = cfg.hfNz;
    this.g = 9.81; this.dtSim = 1 / 60;
    this.flipRatio = cfg.flipRatio ?? 0.7;
    this.damping = cfg.damping ?? 0.4;        // 1/s on particles inside dense water
    this.densityGain = cfg.densityGain ?? 4;   // 1/s target expansion per unit of compression
    this.ppc = cfg.ppc ?? 5.8;                 // particles per bulk cell
    this.impulseGain = cfg.impulseGain ?? 3.2;
    this.lowDamp = cfg.lowDamp ?? 1.5; this.lowDampV = cfg.lowDampV ?? 0.06;
    this.maxSpray = cfg.maxSpray ?? 4096;
    this.nc = nx * ny * nz;
    const nc = this.nc;
    this.uN = (nx + 1) * ny * nz; this.vN = nx * (ny + 1) * nz; this.wN = nx * ny * (nz + 1);
    this.F = [new Float32Array(this.uN), new Float32Array(this.vN), new Float32Array(this.wN)];
    this.F0 = [new Float32Array(this.uN), new Float32Array(this.vN), new Float32Array(this.wN)];
    this.Wt = [new Float32Array(this.uN), new Float32Array(this.vN), new Float32Array(this.wN)];
    this.dF = [new Float32Array(this.uN), new Float32Array(this.vN), new Float32Array(this.wN)];
    this.Ok = [new Uint8Array(this.uN), new Uint8Array(this.vN), new Uint8Array(this.wN)];
    this.SX = [nx + 1, nx, nx, nx]; this.SY = [ny, ny + 1, ny, ny]; this.SZ = [nz, nz, nz + 1, nz];
    this.OX = [0, 0.5, 0.5, 0.5]; this.OY = [0.5, 0, 0.5, 0.5]; this.OZ = [0.5, 0.5, 0, 0.5];
    this.cell = new Uint8Array(nc);   // 0 air, 1 fluid, 2 solid
    this.solid = new Uint8Array(nc);
    this.cnt = new Int32Array(nc);
    this.dens = new Float32Array(nc);
    this.norm = new Float32Array(nc); // fraction of the splat kernel that fits inside the domain
    this.pp = new Float64Array(nc); this.rr = new Float64Array(nc); this.zz = new Float64Array(nc);
    this.ss = new Float64Array(nc); this.qq = new Float64Array(nc); this.tt = new Float64Array(nc);
    this.pre = new Float64Array(nc); this.diag = new Float64Array(nc);
    this.Ax = new Float32Array(nc); this.Ay = new Float32Array(nc); this.Az = new Float32Array(nc);
    this.nbp = new Int32Array(3 * nc); this.nbm = new Int32Array(3 * nc);
    this.theta = new Float32Array(nc).fill(1);
    this.flist = new Int32Array(nc);
    this.cgTol = cfg.cgTol ?? 4e-4; this.cgMax = cfg.cgMax ?? 80; this.iters = 0;
    this.pushStiffness = cfg.pushStiffness ?? 0; this.separateEvery = cfg.separateEvery ?? 4;
    this.nSprayAll = 0; this.lastMs = 0; this.rawDrift = 0;
    this.nf = 0;
    this.kfloor = new Int32Array(nx); this.floorTop = new Float32Array(nx);
    for (let i = 0; i < nx; i++) {
      let k = Math.ceil((cfg.floorAtCol[i] - this.y0) * this.invh - 0.5);
      k = Math.max(0, Math.min(ny - 1, k));
      this.kfloor[i] = k; this.floorTop[i] = this.y0 + k * h;
    }
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      this.solid[i + nx * (j + ny * k)] = j < this.kfloor[i] ? 1 : 0;
    }
    this.norm.fill(1); // mirror images make the splat kernel complete at walls
    this.invRef = new Float32Array(nc).fill(1);
    this.deadband = cfg.deadband ?? 1.12;
    // coarse surface (absolute y per column) and HF resampling tables
    this.surf = new Float32Array(nx * nz);
    this.ref = new Float32Array(nx * nz);
    this.coarse = new Float32Array(nx * nz);
    this.heights = new Float32Array(cfg.hfNx * cfg.hfNz);
    this.tmpRow = new Float32Array(cfg.hfNx * nz);
    this.tmpCoarse = new Float32Array(nx * nz);
    this.smoothSide = cfg.smoothSide ?? 0.125; this.heightTau = cfg.heightTau ?? 0.07; this.firstH2 = true;
    this.buildResampleTables();
    this.drift = 0; this.simTime = 0; this.acc = 0; this.stepCount = 0;
    this.impulses = [];
    this.nSpray = 0;
    this.settleSteps = cfg.settleSteps ?? 90;
    this.seed();
    this.settleAndCalibrate();
  }

  rand() { // mulberry32
    let t = (this.rs = (this.rs + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Jittered lattice filling the pool up to waterLevel. Particle count is fixed afterwards.
  seed() {
    this.rs = 12345;
    const { h, nx, nz, minX, minZ, floorTop, waterLevel } = this;
    const s = h / Math.cbrt(this.ppc);
    const na = Math.floor((nx * h) / s), nb = Math.floor((this.nz * h) / s);
    const px = [], py = [], pz = [];
    for (let a = 0; a < na; a++) {
      const x0 = minX + (a + 0.5) * (nx * h / na);
      const col = Math.min(nx - 1, Math.max(0, ((x0 - minX) * this.invh) | 0));
      const ft = floorTop[col];
      for (let c = 0; c < nb; c++) {
        const z0 = minZ + (c + 0.5) * (nz * h / nb);
        for (let d = 0; ; d++) {
          const yy = waterLevel - (d + 0.5) * s;
          if (yy < ft + 0.2 * s) break;
          const jit = (this.cfg.jitter ?? 0.06) * s;
          let x = x0 + (this.rand() - 0.5) * 2 * jit, z = z0 + (this.rand() - 0.5) * 2 * jit;
          let y = yy + (this.rand() - 0.5) * 2 * jit;
          x = Math.min(this.maxX - 0.02, Math.max(minX + 0.02, x));
          z = Math.min(this.maxZ - 0.02, Math.max(minZ + 0.02, z));
          const cc = Math.min(nx - 1, Math.max(0, ((x - minX) * this.invh) | 0));
          y = Math.min(waterLevel - 0.01, Math.max(floorTop[cc] + 0.02, y));
          px.push(x); py.push(y); pz.push(z);
        }
      }
    }
    const n = px.length;
    this.n = n;
    this.px = Float32Array.from(px); this.py = Float32Array.from(py); this.pz = Float32Array.from(pz);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n); this.vz = new Float32Array(n);
    this.sprayIdx = new Int32Array(n);
    // rest volume per particle
    let vol = 0;
    for (let i = 0; i < nx; i++) vol += (waterLevel - floorTop[i]) * h * h * nz;
    this.restVolume = vol; this.vp = vol / n;
    this.hashInit();
    this.pp.fill(0); this.drift = 0; this.firstHeights = true; this.firstH2 = true; this.stepCount = 0;
    this.classify(); this.splatDensity();
    // calibrate rest density on interior cells (all 26 neighbours fluid)
    let sum = 0, m = 0;
    const ny = this.ny, cell = this.cell;
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const c = i + nx * (j + ny * k);
      let all = true;
      for (let dk = -1; dk <= 1 && all; dk++) for (let dj = -1; dj <= 1 && all; dj++) for (let di = -1; di <= 1; di++) {
        if (cell[c + di + nx * (dj + ny * dk)] !== 1) { all = false; break; }
      }
      if (all) { sum += this.dens[c]; m++; }
    }
    this.rho0 = m > 0 ? sum / m : n / Math.max(1, this.nf);
    this.invRef.fill(1 / this.rho0);
    this.simTime = 0; this.acc = 0; this.impulses.length = 0;
  }

  // Let the freshly seeded lattice relax with heavy damping, remember that state as "rest"
  // (positions and the reconstructed surface) so later resets are instant and flat.
  settleAndCalibrate() {
    const keep = [this.damping, this.lowDamp, this.flipRatio];
    this.damping = 3; this.lowDamp = 6; this.flipRatio = 0.5;
    for (let i = 0; i < this.settleSteps; i++) this.step();
    [this.damping, this.lowDamp, this.flipRatio] = keep;
    this.vx.fill(0); this.vy.fill(0); this.vz.fill(0);
    this.classify(); this.p2g(false); this.buildSurface();
    this.ref.set(this.surf);
    for (let c = 0; c < this.nc; c++) this.invRef[c] = 1 / Math.max(this.dens[c], 0.9 * this.rho0);
    this.rest = { px: this.px.slice(), py: this.py.slice(), pz: this.pz.slice() };
    this.restoreRest();
  }

  restoreRest() {
    const r = this.rest;
    this.px.set(r.px); this.py.set(r.py); this.pz.set(r.pz);
    this.vx.fill(0); this.vy.fill(0); this.vz.fill(0);
    this.pp.fill(0); this.drift = 0; this.firstHeights = true; this.firstH2 = true;
    this.simTime = 0; this.acc = 0; this.stepCount = 0; this.impulses.length = 0;
    this.heights.fill(0);
    this.classify(); this.p2g(false); this.buildSurface(); this.collectSpray(); this.buildHeights(0);
  }

  reset() { this.restoreRest(); }

  // ---- uniform hash for particle separation -------------------------------------------------
  hashInit() {
    this.hs = 0.8 * this.h / Math.cbrt(this.ppc);       // minimum separation distance
    this.hx = Math.ceil((this.maxX - this.minX) / this.hs) + 2;
    this.hy = Math.ceil((this.yTop - this.y0) / this.hs) + 2;
    this.hz = Math.ceil((this.maxZ - this.minZ) / this.hs) + 2;
    this.hCount = new Int32Array(this.hx * this.hy * this.hz + 1);
    this.hKey = new Int32Array(this.n);
    this.hOrder = new Int32Array(this.n);
  }

  // ---- grid classification and particle -> grid transfer -------------------------------------
  classify() {
    const { nx, ny, nz, cnt, cell, solid, invh, minX, y0, minZ, flist } = this;
    cnt.fill(0);
    const n = this.n, px = this.px, py = this.py, pz = this.pz, yTop = this.yTop;
    for (let p = 0; p < n; p++) {
      const y = py[p];
      if (y >= yTop) continue;
      let i = ((px[p] - minX) * invh) | 0, j = ((y - y0) * invh) | 0, k = ((pz[p] - minZ) * invh) | 0;
      if (i < 0) i = 0; else if (i >= nx) i = nx - 1;
      if (j < 0) j = 0; else if (j >= ny) j = ny - 1;
      if (k < 0) k = 0; else if (k >= nz) k = nz - 1;
      cnt[i + nx * (j + ny * k)]++;
    }
    let nf = 0;
    for (let c = 0; c < this.nc; c++) {
      if (solid[c]) cell[c] = 2;
      else if (cnt[c] > 0) { cell[c] = 1; flist[nf++] = c; } else cell[c] = 0;
    }
    this.nf = nf;
  }

  splatDensity() { this.p2g(false); }

  // Tent-kernel splat: velocities onto the three face grids and counts onto cell centres.
  // The same weights drive the density used for surface, drift and compression correction.
  p2g(withVel) {
    this.dens.fill(0);
    this.splatDens();
    if (!withVel) return;
    const { F, Wt, SX, SY, SZ, OX, OY, OZ } = this;
    const V = [this.vx, this.vy, this.vz];
    for (let c = 0; c < 3; c++) {
      F[c].fill(0); Wt[c].fill(0);
      this.splatComp(F[c], Wt[c], V[c], SX[c], SY[c], SZ[c], OX[c], OY[c], OZ[c]);
    }
  }

  // Density at cell centres with mirror images across the side walls and the floor, so cells
  // next to a wall see the same density as the bulk (no truncated kernel).
  splatDens() {
    const { invh, minX, y0, minZ, px, py, pz, yTop, n, dens, nx, ny, nz, h, floorTop } = this;
    const sxy = nx * ny, mx = nx - 1.0001, my = ny - 1.0001, mz = nz - 1.0001;
    const Lx = nx * h, Lz = nz * h;
    for (let p = 0; p < n; p++) {
      const yy = py[p];
      if (yy >= yTop) continue;
      const x = px[p], z = pz[p];
      const gx = (x - minX) * invh, gz = (z - minZ) * invh;
      const fx = gx - 0.5, fy = (yy - y0) * invh - 0.5, fz = gz - 0.5;
      if (fx >= 0 && fx <= mx && fy >= 0 && fy <= my && fz >= 0 && fz <= mz) {
        const i0 = fx | 0, j0 = fy | 0, k0 = fz | 0;
        const tx = fx - i0, ty = fy - j0, tz = fz - k0;
        const a = 1 - tx, b = 1 - ty, c = 1 - tz;
        const base = i0 + nx * (j0 + ny * k0);
        dens[base] += a * b * c; dens[base + 1] += tx * b * c; dens[base + nx] += a * ty * c; dens[base + nx + 1] += tx * ty * c;
        dens[base + sxy] += a * b * tz; dens[base + sxy + 1] += tx * b * tz; dens[base + sxy + nx] += a * ty * tz; dens[base + sxy + nx + 1] += tx * ty * tz;
      } else this.splatSlow(fx, fy, fz);
      const wl = gx < 1, wr = gx > nx - 1, wn = gz < 1, wf = gz > nz - 1;
      let col = gx | 0; if (col >= nx) col = nx - 1; else if (col < 0) col = 0;
      const ft = floorTop[col], wb = yy - ft < h;
      if (wl || wr || wn || wf || wb) {
        const xs = wl ? -gx - 0.5 : wr ? 2 * nx - gx - 0.5 : NaN;
        const zs = wn ? -gz - 0.5 : wf ? 2 * nz - gz - 0.5 : NaN;
        const ys = wb ? (2 * ft - yy - y0) * invh - 0.5 : NaN;
        if (xs === xs) this.splatSlow(xs, fy, fz);
        if (zs === zs) this.splatSlow(fx, fy, zs);
        if (ys === ys) this.splatSlow(fx, ys, fz);
        if (xs === xs && zs === zs) this.splatSlow(xs, fy, zs);
        if (xs === xs && ys === ys) this.splatSlow(xs, ys, fz);
        if (zs === zs && ys === ys) this.splatSlow(fx, ys, zs);
        if (xs === xs && zs === zs && ys === ys) this.splatSlow(xs, ys, zs);
      }
    }
  }

  splatSlow(fx, fy, fz) {
    const { nx, ny, nz, dens } = this;
    const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
    const tx = fx - i0, ty = fy - j0, tz = fz - k0;
    for (let c = 0; c < 8; c++) {
      const i = i0 + (c & 1), j = j0 + ((c >> 1) & 1), k = k0 + (c >> 2);
      if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) continue;
      dens[i + nx * (j + ny * k)] += ((c & 1) ? tx : 1 - tx) * ((c & 2) ? ty : 1 - ty) * ((c & 4) ? tz : 1 - tz);
    }
  }

  splatComp(arr, wa, vel, sx, sy, sz, ox, oy, oz) {
    const { invh, minX, y0, minZ, px, py, pz, yTop, n } = this;
    const sxy = sx * sy, mx = sx - 1.0001, my = sy - 1.0001, mz = sz - 1.0001;
    for (let p = 0; p < n; p++) {
      const yy = py[p];
      if (yy >= yTop) continue;
      let fx = (px[p] - minX) * invh - ox, fy = (yy - y0) * invh - oy, fz = (pz[p] - minZ) * invh - oz;
      if (fx < 0) fx = 0; else if (fx > mx) fx = mx;
      if (fy < 0) fy = 0; else if (fy > my) fy = my;
      if (fz < 0) fz = 0; else if (fz > mz) fz = mz;
      const i0 = fx | 0, j0 = fy | 0, k0 = fz | 0;
      const tx = fx - i0, ty = fy - j0, tz = fz - k0;
      const a = 1 - tx, b = 1 - ty, c = 1 - tz, val = vel[p];
      const base = i0 + sx * (j0 + sy * k0);
      const w0 = a * b * c, w1 = tx * b * c, w2 = a * ty * c, w3 = tx * ty * c;
      const w4 = a * b * tz, w5 = tx * b * tz, w6 = a * ty * tz, w7 = tx * ty * tz;
      arr[base] += w0 * val; arr[base + 1] += w1 * val; arr[base + sx] += w2 * val; arr[base + sx + 1] += w3 * val;
      arr[base + sxy] += w4 * val; arr[base + sxy + 1] += w5 * val; arr[base + sxy + sx] += w6 * val; arr[base + sxy + sx + 1] += w7 * val;
      wa[base] += w0; wa[base + 1] += w1; wa[base + sx] += w2; wa[base + sx + 1] += w3;
      wa[base + sxy] += w4; wa[base + sxy + 1] += w5; wa[base + sxy + sx] += w6; wa[base + sxy + sx + 1] += w7;
    }
  }

  // Normalise face velocities, zero solid-adjacent faces, flag faces next to water or walls.
  finishGrid() {
    const { nx, ny, nz, F, Wt, Ok, cell } = this;
    for (let comp = 0; comp < 3; comp++) {
      const arr = F[comp], wa = Wt[comp];
      for (let f = 0; f < arr.length; f++) arr[f] = wa[f] > 1e-7 ? arr[f] / wa[f] : 0;
    }
    let f = 0;
    const u = F[0], ou = Ok[0], v = F[1], ov = Ok[1], w = F[2], ow = Ok[2];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
      const row = nx * (j + ny * k);
      for (let i = 0; i <= nx; i++, f++) {
        const L = i > 0 ? cell[row + i - 1] : 2, R = i < nx ? cell[row + i] : 2;
        if (L === 2 || R === 2) { u[f] = 0; ou[f] = 1; } else ou[f] = (L === 1 || R === 1) ? 1 : 0;
      }
    }
    f = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++, f++) {
      const D = j > 0 ? cell[i + nx * (j - 1 + ny * k)] : 2, U = j < ny ? cell[i + nx * (j + ny * k)] : 2;
      if (D === 2 || U === 2) { v[f] = 0; ov[f] = 1; } else ov[f] = (D === 1 || U === 1) ? 1 : 0;
    }
    f = 0;
    for (let k = 0; k <= nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, f++) {
      const B = k > 0 ? cell[i + nx * (j + ny * (k - 1))] : 2, T = k < nz ? cell[i + nx * (j + ny * k)] : 2;
      if (B === 2 || T === 2) { w[f] = 0; ow[f] = 1; } else ow[f] = (B === 1 || T === 1) ? 1 : 0;
    }
  }

  // Gravity acts on the grid (after the pre-force snapshot) so FLIP deltas stay consistent at walls.
  addGravity(dt) {
    const v = this.F[1], ov = this.Ok[1], cell = this.cell, nx = this.nx, ny = this.ny, nz = this.nz, gdt = this.g * dt;
    let f = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++, f++) {
      if (!ov[f]) continue;
      const D = j > 0 ? cell[i + nx * (j - 1 + ny * k)] : 2, U = j < ny ? cell[i + nx * (j + ny * k)] : 2;
      if (D !== 2 && U !== 2) v[f] -= gdt;
    }
  }

  // Downward impulses (rain, bodies, pointer) applied as a grid body force, so FLIP carries them.
  applyImpulses() {
    const imps = this.impulses;
    if (!imps.length) return;
    const { nx, ny, h, minX, minZ, y0, cell, surf } = this;
    const v = this.F[1], ov = this.Ok[1];
    const nz = this.nz;
    for (let q = 0; q < imps.length; q++) {
      const im = imps[q], x = im[0], z = im[1], r = im[2], s = im[3];
      const sig = Math.max(0.55 * h, 0.6 * r), R = 2.6 * sig;
      const V = Math.min(4, this.impulseGain * s * 3.5 / Math.max(0.4, r));
      const i0 = Math.max(0, Math.floor((x - R - minX) / h)), i1 = Math.min(nx - 1, Math.floor((x + R - minX) / h));
      const k0 = Math.max(0, Math.floor((z - R - minZ) / h)), k1 = Math.min(nz - 1, Math.floor((z + R - minZ) / h));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        const dx = minX + (i + 0.5) * h - x, dz = minZ + (k + 0.5) * h - z, d2 = dx * dx + dz * dz;
        if (d2 > R * R) continue;
        const wxy = Math.exp(-d2 / (2 * sig * sig)), top = surf[i + nx * k];
        for (let j = 1; j < ny; j++) {
          const c = i + nx * (j + ny * k), f = i + nx * (j + (ny + 1) * k);
          if (!ov[f] || cell[c] === 2 || cell[c - nx] === 2) continue;
          const depth = top - (y0 + j * h);
          if (depth < -0.5 * h) continue;
          v[f] -= V * wxy * Math.exp(-Math.max(0, depth) / 0.55);
        }
      }
    }
    imps.length = 0;
  }

  // ---- pressure projection: MIC(0)-preconditioned CG, free surface = Dirichlet p = 0 in air ---
  solvePressure(dt) {
    const { nx, ny, nz, h, cell, flist, nf, dens, norm, diag, pre, nbp, nbm, Ax, Ay, Az } = this;
    const u = this.F[0], v = this.F[1], w = this.F[2];
    const nxy = nx * ny, nc = this.nc;
    const P = this.pp, R = this.rr, Z = this.zz, S = this.ss, Q = this.qq, T = this.tt;
    const scale = h / dt, kc = this.densityGain, inv = 1 / this.rho0;
    for (let c = 0; c < nc; c++) if (cell[c] !== 1) P[c] = 0;
    for (let q = 0; q < nf; q++) {
      const c = flist[q];
      const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / nxy) | 0;
      const cl = i > 0 ? cell[c - 1] : 2, cr = i < nx - 1 ? cell[c + 1] : 2;
      const cd = j > 0 ? cell[c - nx] : 2, cu = j < ny - 1 ? cell[c + nx] : 2;
      const cb = k > 0 ? cell[c - nxy] : 2, cf = k < nz - 1 ? cell[c + nxy] : 2;
      diag[c] = (cl !== 2) + (cr !== 2) + (cd !== 2) + (cu !== 2) + (cb !== 2) + (cf !== 2);
      let th = 1;
      if (cu === 0) { // ghost-fluid free surface: pressure is zero at the reconstructed surface
        th = (this.surf[i + nx * k] - (this.y0 + (j + 0.5) * h)) / h;
        th = th < 0.15 ? 0.15 : th > 1 ? 1 : th;
        diag[c] += 1 / th - 1;
      }
      this.theta[c] = th;
      const q3 = q * 3;
      nbm[q3] = cl === 1 ? c - 1 : -1; nbm[q3 + 1] = cd === 1 ? c - nx : -1; nbm[q3 + 2] = cb === 1 ? c - nxy : -1;
      nbp[q3] = cr === 1 ? c + 1 : -1; nbp[q3 + 1] = cu === 1 ? c + nx : -1; nbp[q3 + 2] = cf === 1 ? c + nxy : -1;
      Ax[c] = cr === 1 ? 1 : 0; Ay[c] = cu === 1 ? 1 : 0; Az[c] = cf === 1 ? 1 : 0;
      const fu = i + (nx + 1) * (j + ny * k), fv = i + nx * (j + (ny + 1) * k);
      const div = u[fu + 1] - u[fu] + v[fv + nx] - v[fv] + w[c + nxy] - w[c];
      let comp = dens[c] * this.invRef[c] - this.deadband;
      comp = comp < 0 ? 0 : (comp > 0.5 ? 0.5 : comp);
      R[c] = -scale * (div - h * kc * comp);
    }
    for (let q = 0; q < nf; q++) { // r = b - A p
      const c = flist[q], q3 = q * 3;
      let a = diag[c] * P[c];
      for (let t = 0; t < 3; t++) {
        if (nbp[q3 + t] >= 0) a -= P[nbp[q3 + t]];
        if (nbm[q3 + t] >= 0) a -= P[nbm[q3 + t]];
      }
      R[c] -= a;
    }
    const tau = 0.97, sigma = 0.25;
    for (let q = 0; q < nf; q++) {
      const c = flist[q], q3 = q * 3;
      let e = diag[c];
      const im = nbm[q3], jm = nbm[q3 + 1], km = nbm[q3 + 2];
      if (im >= 0) { const pm = pre[im]; e -= pm * pm * (1 + tau * (Ay[im] + Az[im])); }
      if (jm >= 0) { const pm = pre[jm]; e -= pm * pm * (1 + tau * (Ax[jm] + Az[jm])); }
      if (km >= 0) { const pm = pre[km]; e -= pm * pm * (1 + tau * (Ax[km] + Ay[km])); }
      if (e < sigma * diag[c]) e = diag[c];
      pre[c] = 1 / Math.sqrt(e);
    }
    const applyM = () => {
      for (let q = 0; q < nf; q++) {
        const c = flist[q], q3 = q * 3;
        let t = R[c];
        const im = nbm[q3], jm = nbm[q3 + 1], km = nbm[q3 + 2];
        if (im >= 0) t += pre[im] * T[im];
        if (jm >= 0) t += pre[jm] * T[jm];
        if (km >= 0) t += pre[km] * T[km];
        T[c] = t * pre[c];
      }
      for (let q = nf - 1; q >= 0; q--) {
        const c = flist[q], q3 = q * 3;
        let t = T[c];
        const ip = nbp[q3], jp = nbp[q3 + 1], kp = nbp[q3 + 2];
        if (ip >= 0) t += pre[c] * Z[ip];
        if (jp >= 0) t += pre[c] * Z[jp];
        if (kp >= 0) t += pre[c] * Z[kp];
        Z[c] = t * pre[c];
      }
    };
    applyM();
    let sig = 0;
    for (let q = 0; q < nf; q++) { const c = flist[q]; S[c] = Z[c]; sig += Z[c] * R[c]; }
    let it = 0;
    const tol = this.cgTol, maxIter = this.cgMax;
    if (sig > 0) for (; it < maxIter; it++) {
      let sq = 0;
      for (let q = 0; q < nf; q++) {
        const c = flist[q], q3 = q * 3;
        let a = diag[c] * S[c];
        for (let t = 0; t < 3; t++) {
          if (nbp[q3 + t] >= 0) a -= S[nbp[q3 + t]];
          if (nbm[q3 + t] >= 0) a -= S[nbm[q3 + t]];
        }
        Q[c] = a; sq += S[c] * a;
      }
      if (!(sq > 0)) break;
      const alpha = sig / sq;
      let mr = 0;
      for (let q = 0; q < nf; q++) {
        const c = flist[q];
        P[c] += alpha * S[c]; R[c] -= alpha * Q[c];
        const ar = R[c] < 0 ? -R[c] : R[c];
        if (ar > mr) mr = ar;
      }
      if (mr < tol) { it++; break; }
      applyM();
      let sn = 0;
      for (let q = 0; q < nf; q++) { const c = flist[q]; sn += Z[c] * R[c]; }
      const beta = sn / sig; sig = sn;
      for (let q = 0; q < nf; q++) { const c = flist[q]; S[c] = Z[c] + beta * S[c]; }
    }
    this.iters = it;
  }

  updateVelocities(dt) {
    const { nx, ny, nz, cell } = this;
    const sc = dt / this.h, P = this.pp, nxy = nx * ny;
    const u = this.F[0], v = this.F[1], w = this.F[2];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {
      const c = i + nx * (j + ny * k), a = cell[c - 1], b = cell[c];
      if (a !== 2 && b !== 2 && (a === 1 || b === 1)) u[i + (nx + 1) * (j + ny * k)] -= sc * (P[c] - P[c - 1]);
    }
    for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = i + nx * (j + ny * k), a = cell[c - nx], b = cell[c];
      if (a !== 2 && b !== 2 && (a === 1 || b === 1)) {
        const dp = (b === 0 && a === 1) ? -P[c - nx] / this.theta[c - nx] : P[c] - P[c - nx];
        v[i + nx * (j + (ny + 1) * k)] -= sc * dp;
      }
    }
    for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = i + nx * (j + ny * k), a = cell[c - nxy], b = cell[c];
      if (a !== 2 && b !== 2 && (a === 1 || b === 1)) w[c] -= sc * (P[c] - P[c - nxy]);
    }
  }

  // ---- grid -> particle (FLIP/PIC blend) -----------------------------------------------------
  g2p(dt) {
    const { F, F0, Ok, SX, SY, SZ, OX, OY, OZ, dF } = this;
    const V = [this.vx, this.vy, this.vz];
    for (let comp = 0; comp < 3; comp++) {
      const a = F[comp], b = F0[comp], d = dF[comp];
      for (let f = 0; f < a.length; f++) d[f] = a[f] - b[f];
      this.gatherComp(a, d, Ok[comp], V[comp], SX[comp], SY[comp], SZ[comp], OX[comp], OY[comp], OZ[comp]);
    }
    this.dampParticles(dt);
  }

  gatherComp(arr, da, ok, vel, sx, sy, sz, ox, oy, oz) {
    const { invh, minX, y0, minZ, px, py, pz, yTop, n } = this;
    const sxy = sx * sy, mx = sx - 1.0001, my = sy - 1.0001, mz = sz - 1.0001, alpha = this.flipRatio;
    for (let p = 0; p < n; p++) {
      const yy = py[p];
      if (yy >= yTop) continue;
      let fx = (px[p] - minX) * invh - ox, fy = (yy - y0) * invh - oy, fz = (pz[p] - minZ) * invh - oz;
      if (fx < 0) fx = 0; else if (fx > mx) fx = mx;
      if (fy < 0) fy = 0; else if (fy > my) fy = my;
      if (fz < 0) fz = 0; else if (fz > mz) fz = mz;
      const i0 = fx | 0, j0 = fy | 0, k0 = fz | 0;
      const tx = fx - i0, ty = fy - j0, tz = fz - k0;
      const a = 1 - tx, b = 1 - ty, c = 1 - tz;
      const i0b = i0 + sx * (j0 + sy * k0);
      const i1 = i0b + 1, i2 = i0b + sx, i3 = i2 + 1, i4 = i0b + sxy, i5 = i4 + 1, i6 = i4 + sx, i7 = i6 + 1;
      let sw = 0, sv = 0, sd = 0, w;
      if (ok[i0b]) { w = a * b * c; sw += w; sv += w * arr[i0b]; sd += w * da[i0b]; }
      if (ok[i1]) { w = tx * b * c; sw += w; sv += w * arr[i1]; sd += w * da[i1]; }
      if (ok[i2]) { w = a * ty * c; sw += w; sv += w * arr[i2]; sd += w * da[i2]; }
      if (ok[i3]) { w = tx * ty * c; sw += w; sv += w * arr[i3]; sd += w * da[i3]; }
      if (ok[i4]) { w = a * b * tz; sw += w; sv += w * arr[i4]; sd += w * da[i4]; }
      if (ok[i5]) { w = tx * b * tz; sw += w; sv += w * arr[i5]; sd += w * da[i5]; }
      if (ok[i6]) { w = a * ty * tz; sw += w; sv += w * arr[i6]; sd += w * da[i6]; }
      if (ok[i7]) { w = tx * ty * tz; sw += w; sv += w * arr[i7]; sd += w * da[i7]; }
      if (sw > 1e-6) vel[p] = (1 - alpha) * (sv / sw) + alpha * (vel[p] + sd / sw);
    }
  }

  // Linear drag inside dense water plus extra drag on slow motion: removes particle noise but
  // leaves splashes free.
  dampParticles(dt) {
    const { invh, minX, y0, minZ, px, py, pz, yTop, n, dens, norm, nx, ny, nz, vx, vy, vz } = this;
    const damp = Math.max(0, 1 - this.damping * dt), thr = 0.6 * this.rho0;
    const lowDamp = this.lowDamp * dt, lowV2 = 2 / (this.lowDampV * this.lowDampV);
    for (let p = 0; p < n; p++) {
      const yy = py[p];
      if (yy >= yTop) continue;
      let ci = ((px[p] - minX) * invh) | 0, cj = ((yy - y0) * invh) | 0, ck = ((pz[p] - minZ) * invh) | 0;
      if (ci >= nx) ci = nx - 1; if (cj >= ny) cj = ny - 1; if (ck >= nz) ck = nz - 1;
      if (ci < 0) ci = 0; if (cj < 0) cj = 0; if (ck < 0) ck = 0;
      const cc = ci + nx * (cj + ny * ck);
      if (dens[cc] > thr * norm[cc]) {
        const v2 = vx[p] * vx[p] + vy[p] * vy[p] + vz[p] * vz[p];
        const k = damp * (1 - lowDamp / (1 + v2 * lowV2));
        vx[p] *= k; vy[p] *= k; vz[p] *= k;
      }
    }
  }

  // ---- particle motion ------------------------------------------------------------------------
  integrate(dt) {
    const { g, minX, maxX, minZ, maxZ, invh, nx, floorTop } = this;
    const eps = 0.01 * this.h;
    const n = this.n, px = this.px, py = this.py, pz = this.pz, vx = this.vx, vy = this.vy, vz = this.vz;
    for (let p = 0; p < n; p++) {
      const x = px[p], y = py[p], z = pz[p];
      let ux = vx[p], uy = vy[p], uz = vz[p];
      if (y >= this.yTop) uy -= g * dt;   // airborne beyond the grid: ballistic
      const sp2 = ux * ux + uy * uy + uz * uz;
      if (sp2 > 144) { const s = 12 / Math.sqrt(sp2); ux *= s; uy *= s; uz *= s; }
      let xn = x + ux * dt;
      if (xn < minX + eps) { xn = minX + eps; if (ux < 0) ux = 0; } else if (xn > maxX - eps) { xn = maxX - eps; if (ux > 0) ux = 0; }
      let col = ((xn - minX) * invh) | 0;
      if (col >= nx) col = nx - 1; else if (col < 0) col = 0;
      if (y < floorTop[col] + eps - 1e-6) { // blocked by a taller floor column
        xn = x; ux = 0;
        col = ((x - minX) * invh) | 0;
        if (col >= nx) col = nx - 1; else if (col < 0) col = 0;
      }
      let zn = z + uz * dt;
      if (zn < minZ + eps) { zn = minZ + eps; if (uz < 0) uz = 0; } else if (zn > maxZ - eps) { zn = maxZ - eps; if (uz > 0) uz = 0; }
      let yn = y + uy * dt;
      const ft = floorTop[col] + eps;
      if (yn < ft) { yn = ft; if (uy < 0) uy = 0; }
      px[p] = xn; py[p] = yn; pz[p] = zn; vx[p] = ux; vy[p] = uy; vz[p] = uz;
    }
  }

  // Push particles that are closer than hs apart (keeps density even, limits volume drift).
  separate() {
    const { hs, hx, hy, hz, hCount, hKey, hOrder, minX, y0, minZ, n, px, py, pz } = this;
    const inv = 1 / hs, M = hx * hy * hz, hs2 = hs * hs, k = this.pushStiffness;
    hCount.fill(0);
    for (let p = 0; p < n; p++) {
      let i = 1 + (((px[p] - minX) * inv) | 0), j = 1 + (((py[p] - y0) * inv) | 0), kk = 1 + (((pz[p] - minZ) * inv) | 0);
      if (i < 1) i = 1; else if (i > hx - 2) i = hx - 2;
      if (j < 1) j = 1; else if (j > hy - 2) j = hy - 2;
      if (kk < 1) kk = 1; else if (kk > hz - 2) kk = hz - 2;
      const key = i + hx * (j + hy * kk);
      hKey[p] = key; hCount[key]++;
    }
    for (let c = 1; c < M; c++) hCount[c] += hCount[c - 1];
    hCount[M] = n;
    for (let p = n - 1; p >= 0; p--) hOrder[--hCount[hKey[p]]] = p;
    const eps = 0.01 * this.h, floorTop = this.floorTop, invh = this.invh, nx = this.nx;
    for (let p = 0; p < n; p++) {
      const key = hKey[p];
      for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) {
        const k0 = key + hx * (dj + hy * dk);
        const t0 = hCount[k0 - 1], t1 = hCount[k0 + 2];
        for (let t = t0; t < t1; t++) {
          const q = hOrder[t];
          if (q <= p) continue;
          const dx = px[p] - px[q], dy = py[p] - py[q], dz = pz[p] - pz[q];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= hs2 || d2 < 1e-12) continue;
          const d = Math.sqrt(d2), f = k * (hs - d) / d;
          px[p] += dx * f; py[p] += dy * f; pz[p] += dz * f;
          px[q] -= dx * f; py[q] -= dy * f; pz[q] -= dz * f;
        }
      }
    }
    for (let p = 0; p < n; p++) {
      let x = px[p], z = pz[p], y = py[p];
      if (x < minX + eps) x = minX + eps; else if (x > this.maxX - eps) x = this.maxX - eps;
      if (z < minZ + eps) z = minZ + eps; else if (z > this.maxZ - eps) z = this.maxZ - eps;
      let col = ((x - minX) * invh) | 0;
      if (col >= nx) col = nx - 1; else if (col < 0) col = 0;
      if (y < floorTop[col] + eps) y = floorTop[col] + eps;
      px[p] = x; pz[p] = z; py[p] = y;
    }
  }

  // Reorder particles along the uniform hash so neighbours are adjacent in memory.
  sortParticles() {
    const { hs, hx, hy, hz, hCount, hKey, hOrder, minX, y0, minZ, n } = this;
    const inv = 1 / hs, M = hx * hy * hz;
    hCount.fill(0);
    for (let p = 0; p < n; p++) {
      let i = 1 + (((this.px[p] - minX) * inv) | 0), j = 1 + (((this.py[p] - y0) * inv) | 0), k = 1 + (((this.pz[p] - minZ) * inv) | 0);
      if (i < 1) i = 1; else if (i > hx - 2) i = hx - 2;
      if (j < 1) j = 1; else if (j > hy - 2) j = hy - 2;
      if (k < 1) k = 1; else if (k > hz - 2) k = hz - 2;
      hKey[p] = i + hx * (j + hy * k); hCount[hKey[p]]++;
    }
    for (let c = 1; c < M; c++) hCount[c] += hCount[c - 1];
    hCount[M] = n;
    for (let p = n - 1; p >= 0; p--) hOrder[--hCount[hKey[p]]] = p;
    const names = ['px', 'py', 'pz', 'vx', 'vy', 'vz'];
    if (!this.sortTmp) this.sortTmp = new Float32Array(n);
    const tmp = this.sortTmp;
    for (const nm of names) {
      const a = this[nm];
      for (let t = 0; t < n; t++) tmp[t] = a[hOrder[t]];
      a.set(tmp);
    }
  }

  // ---- one fixed step ---------------------------------------------------------------------------
  step() {
    const dt = this.dtSim;
    this.integrate(dt);
    if (this.stepCount % 8 === 0) this.sortParticles();
    if (this.pushStiffness > 0 && this.stepCount % this.separateEvery === 0) this.separate();
    this.classify();
    this.p2g(true);
    this.finishGrid();
    this.buildSurface();
    for (let c = 0; c < 3; c++) this.F0[c].set(this.F[c]);
    this.addGravity(dt);
    this.applyImpulses();
    this.solvePressure(dt);
    this.updateVelocities(dt);
    this.g2p(dt);
    this.stepCount++; this.simTime += dt;
  }

  // Run as many fixed steps as the requested time and wall-clock budget allow. Unconsumed time
  // stays in this.acc (the caller decides how much backlog to keep).
  advance(dt, budgetMs) {
    this.acc += dt;
    const t0 = performance.now();
    let steps = 0;
    while (this.acc >= this.dtSim) {
      this.step(); this.acc -= this.dtSim; steps++;
      if (performance.now() - t0 > budgetMs) break;
    }
    if (steps) {
      this.collectSpray(); this.buildHeights(steps * this.dtSim);
    }
    this.lastMs = performance.now() - t0;
    return steps;
  }

  disturb(x, z, r, s) {
    if (this.impulses.length < 600) this.impulses.push([x, z, r, s]);
  }

  // ---- free surface from the splatted density ---------------------------------------------------
  // Per column: walk up from the floor while density >= half the rest density, then place the
  // surface inside the straddling cell pair by inverting the tent-kernel step response.
  buildSurface() {
    const { nx, ny, nz, h, y0, dens, kfloor, norm, surf } = this;
    const inv = 1 / this.rho0;
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const kf = kfloor[i];
      let j = kf, c = i + nx * (kf + ny * k), d1 = 0;
      while (j < ny) {
        const d = dens[c] * inv / norm[c];
        if (d < 0.5) break;
        d1 = d; j++; c += nx;
      }
      let s;
      if (j === kf) s = y0 + kf * h;
      else if (j >= ny) s = y0 + ny * h;
      else {
        const dlo = d1 > 1 ? 1 : d1;
        let d2 = dens[c] * inv / norm[c]; if (d2 < 0) d2 = 0;
        s = y0 + (j - 0.5) * h + 0.5 * h * (1 - Math.sqrt(2 * (1 - dlo)) + Math.sqrt(2 * d2));
      }
      surf[i + nx * k] = s;
    }
  }

  surfAt(x, z) {
    const nx = this.nx, nz = this.nz;
    let fx = (x - this.minX) * this.invh - 0.5, fz = (z - this.minZ) * this.invh - 0.5;
    if (fx < 0) fx = 0; else if (fx > nx - 1.001) fx = nx - 1.001;
    if (fz < 0) fz = 0; else if (fz > nz - 1.001) fz = nz - 1.001;
    const i = fx | 0, k = fz | 0, tx = fx - i, tz = fz - k, s = this.surf;
    const a = s[i + nx * k], b = s[i + 1 + nx * k], c = s[i + nx * (k + 1)], d = s[i + 1 + nx * (k + 1)];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  // Particles clearly above the reconstructed surface are airborne spray.
  collectSpray() {
    const n = this.n, px = this.px, py = this.py, pz = this.pz, idx = this.sprayIdx;
    const margin = 0.09 + 0.25 * this.h;
    let m = 0;
    for (let p = 0; p < n; p++) {
      const y = py[p];
      if (y >= this.yTop || y > this.surfAt(px[p], pz[p]) + margin) idx[m++] = p;
    }
    this.nSprayAll = m;
    this.nSpray = Math.min(m, this.maxSpray);
  }

  buildHeights(dtE) {
    const { nx, nz, h, surf, ref, coarse, hfNx, hfNz } = this;
    let dv = 0;
    for (let c = 0; c < nx * nz; c++) dv += surf[c] - ref[c];
    dv *= h * h;
    const expected = (this.n - this.nSprayAll) * this.vp - this.restVolume;
    let drift = (dv - expected) / (nx * nz * h * h);
    drift = drift < -0.2 ? -0.2 : drift > 0.2 ? 0.2 : drift;
    this.rawDrift = drift;
    if (this.firstHeights) { this.drift = drift; this.firstHeights = false; }
    else this.drift += (drift - this.drift) * (1 - Math.exp(-dtE / 0.5));
    const tc = this.tmpCoarse, sw = this.smoothSide, sc0 = 1 - 2 * sw;
    for (let c = 0; c < nx * nz; c++) coarse[c] = surf[c] - ref[c] - this.drift;
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const r = k * nx;
      tc[r + i] = sw * coarse[r + (i > 0 ? i - 1 : 0)] + sc0 * coarse[r + i] + sw * coarse[r + (i < nx - 1 ? i + 1 : nx - 1)];
    }
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      coarse[i + nx * k] = sw * tc[i + nx * (k > 0 ? k - 1 : 0)] + sc0 * tc[i + nx * k] + sw * tc[i + nx * (k < nz - 1 ? k + 1 : nz - 1)];
    }
    const beta = this.firstH2 ? 1 : 1 - Math.exp(-dtE / this.heightTau);
    this.firstH2 = false;
    const { rxI, rxW, rzI, rzW, tmpRow, heights } = this;
    for (let k = 0; k < nz; k++) for (let a = 0; a < hfNx; a++) {
      const o = a * 4, r = k * nx;
      tmpRow[a + hfNx * k] = rxW[o] * coarse[r + rxI[o]] + rxW[o + 1] * coarse[r + rxI[o + 1]] +
        rxW[o + 2] * coarse[r + rxI[o + 2]] + rxW[o + 3] * coarse[r + rxI[o + 3]];
    }
    for (let b = 0; b < hfNz; b++) {
      const o = b * 4, r0 = rzI[o] * hfNx, r1 = rzI[o + 1] * hfNx, r2 = rzI[o + 2] * hfNx, r3 = rzI[o + 3] * hfNx;
      const w0 = rzW[o], w1 = rzW[o + 1], w2 = rzW[o + 2], w3 = rzW[o + 3];
      for (let a = 0; a < hfNx; a++) {
        let v = w0 * tmpRow[r0 + a] + w1 * tmpRow[r1 + a] + w2 * tmpRow[r2 + a] + w3 * tmpRow[r3 + a];
        v = v < -0.9 ? -0.9 : v > 0.9 ? 0.9 : v;
        const hi = a + hfNx * b;
        heights[hi] += (v - heights[hi]) * beta;
      }
    }
  }

  // Catmull-Rom tables: coarse (cell-centred) columns -> HF cell centres, separable.
  buildResampleTables() {
    const mk = (nHF, nCoarse, len, origin) => {
      const I = new Int32Array(nHF * 4), W = new Float32Array(nHF * 4);
      for (let a = 0; a < nHF; a++) {
        const x = origin + (a + 0.5) * (len / nHF);
        const fx = (x - origin) * this.invh - 0.5;
        const i0 = Math.floor(fx), t = fx - i0, t2 = t * t, t3 = t2 * t;
        const w = [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
        for (let q = 0; q < 4; q++) {
          I[a * 4 + q] = Math.min(nCoarse - 1, Math.max(0, i0 - 1 + q));
          W[a * 4 + q] = w[q];
        }
      }
      return [I, W];
    };
    [this.rxI, this.rxW] = mk(this.hfNx, this.nx, this.nx * this.h, 0);
    [this.rzI, this.rzW] = mk(this.hfNz, this.nz, this.nz * this.h, 0);
    this.firstHeights = true;
  }

  packSpray(out) {
    const m = this.nSpray, idx = this.sprayIdx, px = this.px, py = this.py, pz = this.pz;
    for (let t = 0; t < m; t++) { const p = idx[t]; out[3 * t] = px[p]; out[3 * t + 1] = py[p]; out[3 * t + 2] = pz[p]; }
    return m;
  }

  packAll(out) {
    const n = this.n, px = this.px, py = this.py, pz = this.pz;
    for (let p = 0; p < n; p++) { out[3 * p] = px[p]; out[3 * p + 1] = py[p]; out[3 * p + 2] = pz[p]; }
    return n;
  }
}
