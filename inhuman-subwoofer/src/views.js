import { PHOTO_VIEWS } from './photo-views.js';

// Camera presets (metres, world frame: cone faces +Z, 12 o'clock is +Y).
// The photo* presets reproduce the five reference photographs.
export const VIEWS = {
  hero: { label: 'Hero', fov: 22, position: [-1.05, 0.35, 1.45], target: [0, 0.0, 0.03], up: [0, 1, 0] },
  front: { label: 'Front', fov: 22, position: [0, 0, 2.0], target: [0, 0, 0], up: [0, 1, 0] },
  profile: { label: 'Profile', fov: 22, position: [2.05, 0.12, 0.02], target: [0, 0, 0], up: [0, 1, 0] },
  rear34: { label: 'Rear ¾', fov: 22, position: [1.2, 0.55, -1.35], target: [0, 0, -0.03], up: [0, 1, 0] },
  rear: { label: 'Rear', fov: 22, position: [0.25, 0.45, -1.95], target: [0, 0, -0.05], up: [0, 1, 0] },
  ...PHOTO_VIEWS,
};
