// Assembles the whole resort around the pool. Each module returns { group, colliders, update? }.
import { buildShell } from './shell.js';
import { buildTerrace } from './terrace.js';
import { buildLandscape } from './landscape.js';
import { buildVilla, buildPalapa } from './villa.js';
import { buildProps } from './props.js';
import { buildPlants } from './plants.js';
import { buildPalms } from './palms.js';

// [x, z, height m, seed]. Crowns stay well clear of the pool volume.
const PALMS = [
  [-17.4, -8.5, 8.4, 1], [-17.6, 0.6, 7.2, 2], [-17.2, 9.2, 8.8, 3], [-11.5, 12.2, 7.0, 4], [-1.5, 12.6, 8.2, 5], [10.5, 12.3, 7.6, 6],
  [17.2, 10.8, 8.6, 7], [17.6, -1.6, 7.4, 8], [17.8, -11.2, 9.0, 9],
  [-27, -6, 9.5, 10], [-28.5, 9, 8.0, 11], [-23, 21, 10.0, 12], [13, 25, 9.0, 13], [27, 22, 8.4, 14],
  [34, -14, 8.6, 15], [37, 6, 9.4, 16], [31, 18, 7.8, 17], [44, -3, 8.8, 18], [41, 20, 7.2, 19], [-6, -29, 9.0, 20],
];

export function buildWorld({ scene, water, renderer, onProgress = () => {} }) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const colliders = [], updaters = [], extras = {};
  const add = (mod, name) => {
    if (!mod) return;
    scene.add(mod.group);
    if (mod.colliders) colliders.push(...mod.colliders);
    if (mod.update) updaters.push(mod.update);
    extras[name] = mod;
    onProgress(name);
  };
  add(buildShell({ water, aniso }), 'shell');
  add(buildTerrace({ aniso }), 'terrace');
  add(buildLandscape({ aniso }), 'landscape');
  add(buildVilla({ aniso }), 'villa');
  add(buildPalapa({ aniso }), 'palapa');
  add(buildProps({ renderer }), 'props');
  add(buildPlants({ aniso }), 'plants');
  add(buildPalms({ aniso }, PALMS), 'palms');
  return {
    colliders, extras,
    update(t, dt, camera) { for (const u of updaters) u(t, dt, camera); },
  };
}
