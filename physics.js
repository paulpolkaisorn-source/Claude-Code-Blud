// Woofer physics: a lumped-parameter (Thiele-Small style) driver model with the
// real nonlinearities that make a sub "bounce" the way it does in life.
//
// States (SI units):
//   x  cone position, m   (+ = outward, toward the listener)
//   v  cone velocity, m/s
//   i  voice-coil current, A
//   p  pressure inside the enclosure, Pa   (sealed / ported only)
//   U  volume velocity out of the port, m^3/s (ported only)
//
// Equations:
//   Le di/dt  = V(t) - Re i - Bl(x) v                      (electrical side)
//   Mms dv/dt = Bl(x) i - Rms v - Fsusp(x) - Fstop + Sd p  (mechanical side)
//   dp/dt     = (-Sd v - U) / Cab                          (air spring in the box)
//   Ma dU/dt  = p - Ra U - Rt |U| U                        (port air plug)
//
// Nonlinearities:
//   Bl(x)    falls off as the coil leaves the magnetic gap (past Xmax = 70 % of Bl)
//   Fsusp(x) spider + surround get stiffer the further they stretch
//   Fstop    hard end-stops: the former hits the top plate (inward) and the
//            spider/surround run out of travel (outward) -> the cone "bottoms out"
//            and bounces back off the stop

export const AIR_RHO = 1.2; // kg/m^3
export const AIR_C = 343; // m/s

// Approximate parameters of a high-excursion 18" competition subwoofer.
// (Estimated for a believable model, not official manufacturer specs.)
export const DRIVER = {
  Sd: 0.115, // m^2   effective cone area
  Mms: 0.4, // kg    moving mass (cone + coil + air load)
  Fs: 26, // Hz    free-air resonance
  Qms: 5, // -     mechanical Q (suspension losses)
  Re: 1.1, // ohm   DC resistance
  Le: 0.003, // H     voice-coil inductance
  Bl0: 17, // T*m   motor strength at rest
  Xmax: 0.03, // m     linear excursion: Bl drops to 70 % here
  xSusp: 0.055, // m   suspension progressive-stiffening scale
  xStopOut: 0.06, // m   outward mechanical limit
  xStopIn: -0.07, // m   inward mechanical limit (former -> top plate, from the model geometry)
  kStop: 4e5, // N/m   end-stop stiffness
  Znom: 1.0, // ohm   nominal impedance used to turn watts into volts
};
DRIVER.Kms = DRIVER.Mms * Math.pow(2 * Math.PI * DRIVER.Fs, 2);
DRIVER.Rms = (DRIVER.Mms * 2 * Math.PI * DRIVER.Fs) / DRIVER.Qms;
DRIVER.cStop = 0.6 * Math.sqrt(DRIVER.kStop * DRIVER.Mms); // damping ratio ~0.3 -> a real bounce, not a thud

export const ENCLOSURES = {
  free: { label: 'Free air (no box)', Vb: Infinity },
  sealed: { label: 'Sealed 120 L', Vb: 0.12 },
  ported: { label: 'Ported 170 L @ 32 Hz', Vb: 0.17, Fb: 32, Sp: 0.03, Qp: 7 },
};

export function bl(x, D = DRIVER) {
  const r = x / (D.Xmax / Math.sqrt(-Math.log(0.7)));
  return D.Bl0 * Math.exp(-r * r);
}

// Low-order progressive stiffening (x/xSusp)^2 keeps the force odd in x.
export function suspensionForce(x, D = DRIVER) {
  const r = x / D.xSusp;
  return D.Kms * x * (1 + r * r);
}

export class Woofer {
  constructor(driver = DRIVER) {
    this.D = driver;
    this.h = 1 / 48000; // fixed integration step, s
    this.setEnclosure('free');
    this.reset();
  }

  setEnclosure(key) {
    const D = this.D;
    const e = ENCLOSURES[key];
    this.encKey = key;
    this.enc = e;
    this.hasBox = Number.isFinite(e.Vb);
    this.hasPort = this.hasBox && !!e.Fb;
    if (this.hasBox) {
      this.Cab = e.Vb / (AIR_RHO * AIR_C * AIR_C);
      if (this.hasPort) {
        const wb = 2 * Math.PI * e.Fb;
        this.Ma = 1 / (wb * wb * this.Cab);
        this.Ra = (wb * this.Ma) / e.Qp;
        this.Rt = 700; // turbulence loss (Pa per (m^3/s)^2): port compression at high flow
      }
    }
    if (this.p !== undefined) {
      this.p = 0;
      this.U = 0;
    }
  }

  reset() {
    this.x = 0;
    this.v = 0;
    this.i = 0;
    this.p = 0;
    this.U = 0;
    this.t = 0;
    this.phase = 0;
    this.amp = 0; // smoothed drive amplitude, V peak
    this.a = 0; // last cone acceleration, m/s^2
    this.Vout = 0;
    this.stopHit = 0; // +1 outward / -1 inward on the step that hit a stop
    this.stopSpeed = 0; // impact speed of the latest stop hit, m/s
  }

  // derivative of the state vector s = [x, v, i, p, U] at drive voltage V
  _f(s, V, d) {
    const D = this.D;
    const x = s[0],
      v = s[1],
      i = s[2],
      p = s[3],
      U = s[4];
    const B = bl(x, D);
    let F = B * i - D.Rms * v - suspensionForce(x, D);
    if (x > D.xStopOut) F -= D.kStop * (x - D.xStopOut) + (v > 0 ? D.cStop * v : 0);
    else if (x < D.xStopIn) F -= D.kStop * (x - D.xStopIn) + (v < 0 ? D.cStop * v : 0);
    if (this.hasBox) F += D.Sd * p;
    d[0] = v;
    d[1] = F / D.Mms;
    d[2] = (V - D.Re * i - B * v) / D.Le;
    if (this.hasBox) {
      d[3] = (-D.Sd * v - U) / this.Cab;
      d[4] = this.hasPort ? (p - this.Ra * U - this.Rt * Math.abs(U) * U) / this.Ma : 0;
    } else {
      d[3] = 0;
      d[4] = 0;
    }
  }

  // Advance by `steps` fixed steps. `drive` = { freq Hz, volts peak (target), on }.
  // Returns nothing; read this.x etc. Calls onStep(this) after every step if given.
  advance(steps, drive, onStep) {
    const h = this.h;
    const D = this.D;
    const s = this._s || (this._s = new Float64Array(5));
    const k1 = this._k1 || (this._k1 = new Float64Array(5));
    const k2 = this._k2 || (this._k2 = new Float64Array(5));
    const k3 = this._k3 || (this._k3 = new Float64Array(5));
    const k4 = this._k4 || (this._k4 = new Float64Array(5));
    const tmp = this._tmp || (this._tmp = new Float64Array(5));
    const w = 2 * Math.PI * drive.freq;
    const target = drive.on ? drive.volts : 0;
    // amplitude slew: smooth like a real amp ramp, no click when the knob moves
    const slew = 1 - Math.exp(-h / 0.008);
    for (let n = 0; n < steps; n++) {
      this.amp += (target - this.amp) * slew;
      const ph0 = this.phase;
      const ph1 = ph0 + w * h * 0.5;
      const ph2 = ph0 + w * h;
      const V0 = this.amp * Math.sin(ph0);
      const V1 = this.amp * Math.sin(ph1);
      const V2 = this.amp * Math.sin(ph2);

      s[0] = this.x;
      s[1] = this.v;
      s[2] = this.i;
      s[3] = this.p;
      s[4] = this.U;
      this._f(s, V0, k1);
      for (let j = 0; j < 5; j++) tmp[j] = s[j] + 0.5 * h * k1[j];
      this._f(tmp, V1, k2);
      for (let j = 0; j < 5; j++) tmp[j] = s[j] + 0.5 * h * k2[j];
      this._f(tmp, V1, k3);
      for (let j = 0; j < 5; j++) tmp[j] = s[j] + h * k3[j];
      this._f(tmp, V2, k4);
      const vBefore = this.v;
      const xBefore = this.x;
      for (let j = 0; j < 5; j++) s[j] += (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      this.x = s[0];
      this.v = s[1];
      this.i = s[2];
      this.p = s[3];
      this.U = s[4];
      this.a = k1[1];
      this.Vout = V2;
      this.phase = ph2 % (2 * Math.PI);
      this.t += h;

      // detect the instant the cone enters a mechanical stop (for visuals/sound)
      this.stopHit = 0;
      if (this.x > D.xStopOut && xBefore <= D.xStopOut) {
        this.stopHit = 1;
        this.stopSpeed = Math.abs(vBefore);
      } else if (this.x < D.xStopIn && xBefore >= D.xStopIn) {
        this.stopHit = -1;
        this.stopSpeed = Math.abs(vBefore);
      }
      if (onStep) onStep(this);
    }
  }
}

export function wattsToPeakVolts(watts, D = DRIVER) {
  return Math.sqrt(2 * watts * D.Znom);
}
