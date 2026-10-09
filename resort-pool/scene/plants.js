// Clipped hedges, planters, shrubs and potted plants.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { POOL } from '../pool-config.js';
import { TERRACE, GROUND_Y } from './layout.js';
import { makeFoliage, makeThatch } from './textures2.js';
import { makeStone, setAniso } from './textures.js';
import { mulberry32, fbm } from './noise.js';
import { merge, xform, scaleUV, metricBox } from './geo.js';
import { terrainH } from './landscape.js';

const FL = POOL.deckY;

function blob(rnd, rx, ry, rz, x, y, z) {
  const g = new THREE.SphereGeometry(1, 18, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i), ny = p.getY(i), nz = p.getZ(i);
    const d = 1 + 0.28 * (fbm(nx * 2 + x, ny * 2 + y * 0.3, 3, 3) - 0.5) + 0.12 * (fbm(nz * 3 + z, nx * 3, 2, 4) - 0.5);
    p.setXYZ(i, nx * d * rx, ny * d * ry, nz * d * rz);
  }
  g.computeVertexNormals();
  scaleUV(g, 3, 2);
  return xform(g, { pos: [x, y, z], rot: [0, rnd() * 6.28, 0] });
}

export function buildPlants({ aniso = 8 }) {
  const group = new THREE.Group(); group.name = 'plants';
  const colliders = [];
  const rnd = mulberry32(77);
  const fol = makeFoliage({ seed: 6 }); setAniso(fol, aniso);
  const fol2 = makeFoliage({ seed: 16, hue: -10, count: 4200 }); setAniso(fol2, aniso);
  const hedgeMat = new THREE.MeshStandardMaterial({ map: fol.map, normalMap: fol.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.78, envMapIntensity: 0.5 });
  const bushMat = new THREE.MeshStandardMaterial({ map: fol2.map, normalMap: fol2.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.75, envMapIntensity: 0.5 });
  const stone = makeStone({ seed: 41, base: [214, 200, 176], tintVar: 0.04 }); setAniso(stone, aniso);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone.map, roughnessMap: stone.rough, roughness: 1, normalMap: stone.normal, envMapIntensity: 0.4 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0xb4623c, roughness: 0.8, envMapIntensity: 0.3 });

  const hedges = [], bushes = [], planters = [], pots = [], blades = [];
  const hedge = (cx, cz, w, h, d, y0 = FL, collide = true) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.14, h * 0.2, d * 0.3));
    scaleUV(g, Math.max(w, d), h);
    hedges.push(xform(g, { pos: [cx, y0 + h / 2, cz] }));
    if (collide) colliders.push(new THREE.Box3(new THREE.Vector3(cx - w / 2, y0 - 1, cz - d / 2), new THREE.Vector3(cx + w / 2, y0 + h, cz + d / 2)));
  };
  const T = TERRACE;
  // tall hedge walls on the west and south edges of the terrace, low ones along the villa and sea sides
  hedge(T.minX + 0.6, 0, 1.0, 1.9, 24.6, FL);
  for (const [a, b] of [[-17.5, -9], [-5, 4], [8, 17.5]]) hedge((a + b) / 2, T.maxZ - 0.6, b - a, 1.5, 1.0, FL);
  // villa-front planters between the pillars, each with a clipped hedge and a few shrubs
  for (let i = 0; i < 8; i++) {
    const x = -14 + i * 4;
    planters.push(xform(metricBox(3.3, 0.5, 0.8), { pos: [x, FL + 0.25, -12.55] }));
    hedge(x, -12.55, 3.0, 0.55, 0.62, FL + 0.5, false);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 1.65, -1, -12.95), new THREE.Vector3(x + 1.65, FL + 1.1, -12.15)));
    if (i % 2 === 0) bushes.push(blob(rnd, 0.55, 0.42, 0.5, x + (rnd() - 0.5) * 1.2, FL + 1.05, -12.55));
  }
  // flowering shrubs and clumps on the lawn, giving depth beyond the terrace
  const clumps = [[-21.5, -10], [-22, 2], [-21, 12], [-14, 16.5], [-4, 17], [6, 16.5], [14, 16.5], [21.5, 15], [-23, -20], [-30, 8], [-27, -3], [24, -15], [23, 8], [20.5, -22], [-20, -26], [10, -28]];
  for (const [x, z] of clumps) {
    const n = 2 + ((rnd() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const s = 0.8 + rnd() * 1.1, px = x + (rnd() - 0.5) * 3, pz = z + (rnd() - 0.5) * 3;
      bushes.push(blob(rnd, s * 1.1, s * 0.8, s, px, terrainH(px, pz) + s * 0.55, pz));
    }
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 1.9, -2, z - 1.9), new THREE.Vector3(x + 1.9, 1.5, z + 1.9)));
  }
  // potted plants at corners of the terrace and around the palapa / sun deck
  const potSpots = [[-18, -12], [18, -12.4], [-6.9, 11.6], [7.9, 11.6], [-6.9, 5.6], [8.3, 5.6], [9.4, -10], [17.9, 1.2], [-10, -12.2], [10, -12.2]];
  const lathe = new THREE.LatheGeometry([[0.2, 0], [0.34, 0.06], [0.44, 0.7], [0.5, 0.74], [0.5, 0.8], [0.42, 0.78], [0.0, 0.76]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
  for (const [x, z] of potSpots) {
    const s = 0.8 + rnd() * 0.35;
    pots.push(xform(lathe.clone(), { pos: [x, FL, z], scale: [s, s, s] }));
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.5 * s, -1, z - 0.5 * s), new THREE.Vector3(x + 0.5 * s, FL + 1.4, z + 0.5 * s)));
    if (rnd() < 0.5) bushes.push(blob(rnd, 0.62 * s, 0.5 * s, 0.62 * s, x, FL + 0.95 * s, z));
    else for (let k = 0; k < 16; k++) {                       // spiky agave-like rosette
      const a = (k / 16) * Math.PI * 2 + rnd() * 0.4, tilt = 0.5 + rnd() * 0.5, len = (0.75 + rnd() * 0.4) * s;
      const c = new THREE.ConeGeometry(0.07 * s, len, 5); c.translate(0, len / 2, 0);
      const cg = xform(c, { pos: [x, FL + 0.74 * s, z], rot: [0, -a, tilt] });
      const cc = []; for (let i = 0; i < cg.attributes.position.count; i++) cc.push(0.22 + rnd() * 0.05, 0.36 + rnd() * 0.08, 0.2);
      cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      blades.push(cg);
    }
  }
  const mk = (list, mat, name, cast = true) => {
    if (!list.length) return;
    const m = new THREE.Mesh(merge(list), mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; group.add(m);
  };
  mk(hedges, hedgeMat, 'hedges'); mk(bushes, bushMat, 'shrubs'); mk(planters, stoneMat, 'planters'); mk(pots, potMat, 'pots');
  if (blades.length) {
    const bm = new THREE.Mesh(merge(blades), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })); bm.name = 'agave'; bm.castShadow = true; group.add(bm);
  }
  void makeThatch; void GROUND_Y;
  return { group, colliders };
}
