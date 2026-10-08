// Semi-implicit damped spring. Fixed-step friendly; call step(dt) from the physics loop.
export class Spring1D {
  constructor({ stiffness = 180, damping = 14, mass = 1, value = 0, target = 0 } = {}) {
    this.k = stiffness;
    this.c = damping;
    this.m = mass;
    this.x = value;
    this.v = 0;
    this.target = target;
  }
  step(dt) {
    const a = (-this.k * (this.x - this.target) - this.c * this.v) / this.m;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
  settled(eps = 1e-4) {
    return Math.abs(this.x - this.target) < eps && Math.abs(this.v) < eps;
  }
}

// Fixed-timestep accumulator: calls fn(stepSeconds) in discrete steps.
export class FixedStep {
  constructor(stepSeconds = 1 / 120, maxSteps = 8) {
    this.h = stepSeconds;
    this.max = maxSteps;
    this.acc = 0;
  }
  run(dt, fn) {
    this.acc += Math.min(dt, 0.1);
    let n = 0;
    while (this.acc >= this.h && n < this.max) {
      fn(this.h);
      this.acc -= this.h;
      n++;
    }
    if (n === this.max) this.acc = 0;
  }
}
