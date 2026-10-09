// Shared pool contract. Every module reads pool geometry and the heightfield
// layout from here; nothing else hard-codes these numbers.
// Units: meters. Axes: +x along the pool length (shallow end at -x, deep end
// at +x), +z across it, +y up. The resting water surface is the plane y = 0.

export const POOL = Object.freeze({
  length: 16,          // interior extent along x
  width: 8,            // interior extent along z
  minX: -8, maxX: 8,
  minZ: -4, maxZ: 4,
  waterLevel: 0,       // y of the resting water surface
  deckY: 0.15,         // top of coping and deck
  shallowDepth: 1.1,   // depth below waterLevel at the shallow end
  deepDepth: 2.1,      // depth below waterLevel at the deep end
  slopeStartX: -1.5,   // floor is flat shallow for x <= slopeStartX
  slopeEndX: 2.5,      // floor is flat deep for x >= slopeEndX
  // Pool fixtures (steps, benches, lights) stay below this y inside the
  // interior rectangle, so floating bodies only ever collide with the walls.
  // Ladder rails are allowed within 0.25 m of a wall.
  fixtureMaxY: -0.25,
});

// Floor height (negative y) at a given x. Piecewise linear, constant in z.
export function floorY(x) {
  const { shallowDepth: s, deepDepth: d, slopeStartX: a, slopeEndX: b } = POOL;
  if (x <= a) return -s;
  if (x >= b) return -d;
  const t = (x - a) / (b - a);
  return -(s + (d - s) * t);
}

// Surface heightfield grid covering the pool interior. Cell-centered,
// row-major: index = i + j * HF.nx, i along x (0 at minX), j along z
// (0 at minZ). Values are surface offsets in meters relative to waterLevel.
export const HF = Object.freeze({ nx: 256, nz: 128 });
export const HF_DX = POOL.length / HF.nx;
export const HF_DZ = POOL.width / HF.nz;

export function hfIndex(i, j) {
  return i + j * HF.nx;
}

export function hfCellCenter(i, j) {
  return { x: POOL.minX + (i + 0.5) * HF_DX, z: POOL.minZ + (j + 0.5) * HF_DZ };
}

export function insidePool(x, z) {
  return x > POOL.minX && x < POOL.maxX && z > POOL.minZ && z < POOL.maxZ;
}

export const MODES = Object.freeze(['waves', 'spray', 'particles']);
export const BODY_TYPES = Object.freeze(['ball', 'ring', 'duck', 'mattress', 'cannonball']);
