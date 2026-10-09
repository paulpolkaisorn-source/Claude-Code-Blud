// Shared layout of the resort around the pool (meters, same axes as pool-config.js).
import { POOL } from '../pool-config.js';
import { COPING_W } from './shell.js';

export const TERRACE = { minX: -19, maxX: 19, minZ: -13.2, maxZ: 13, bottom: -0.5 };
export const GROUND_Y = -0.42;
export const SEA_Y = -2.7;
export const WOOD = { minX: -6.5, maxX: 7.5, minZ: 6.2, maxZ: 11.8, rise: 0.05 };
export const VILLA = { minX: -17, maxX: 17, minZ: -23, maxZ: -13.2 };
// Pool plus coping, the area nothing may overhang (props must stay clear of the pool volume).
export const KEEP_OUT = { minX: POOL.minX - COPING_W, maxX: POOL.maxX + COPING_W, minZ: POOL.minZ - COPING_W, maxZ: POOL.maxZ + COPING_W };

export function clearOfPool(x, z, radius = 0) {
  return x < KEEP_OUT.minX - radius || x > KEEP_OUT.maxX + radius || z < KEEP_OUT.minZ - radius || z > KEEP_OUT.maxZ + radius;
}
