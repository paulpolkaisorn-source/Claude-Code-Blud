import { sandMeta, createSand } from './sand.js';
import { crystalMeta, createCrystal } from './crystal.js';
import { slimeMeta, createSlime } from './slime.js';
import { bubbleMeta, createBubble } from './bubble.js';

// Station registry, in dock order. Each entry builds its station on demand.
export const STATION_DEFS = [
  { ...sandMeta, create: createSand },
  { ...crystalMeta, create: createCrystal },
  { ...slimeMeta, create: createSlime },
  { ...bubbleMeta, create: createBubble },
];
