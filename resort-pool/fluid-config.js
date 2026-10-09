// Simulation grid for the particle fluid, derived from pool-config.js (no numbers duplicated).
import { POOL, HF, floorY } from './pool-config.js';

export function makeSimConfig(overrides = {}) {
  const h = POOL.length / 48;                       // ~0.333 m cells
  const nx = Math.round(POOL.length / h), nz = Math.round(POOL.width / h);
  const below = Math.ceil(POOL.deepDepth / h - 1e-6); // cell rows under the rest surface
  const above = 3;                                   // headroom for splashes
  const ny = below + above;
  const y0 = POOL.waterLevel - below * h;
  const floorAtCol = new Float32Array(nx);
  for (let i = 0; i < nx; i++) floorAtCol[i] = floorY(POOL.minX + (i + 0.5) * h);
  return {
    h, nx, ny, nz, minX: POOL.minX, minZ: POOL.minZ, y0, waterLevel: POOL.waterLevel,
    floorAtCol, hfNx: HF.nx, hfNz: HF.nz, ...overrides,
  };
}
