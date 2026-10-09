// Poolside furniture: sun loungers with striped cushions, parasols, side tables, towels.
// Everything repeated is instanced. Every parasol canopy stays clear of the pool volume.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { POOL } from '../pool-config.js';
import { WOOD, clearOfPool } from './layout.js';
import { makeStripes } from './textures.js';
import { merge, xform } from './geo.js';

const FL = POOL.deckY;
const CANOPY_R = 1.45;

function loungerGeometries() {
  const tilt = 0.66;                                   // backrest angle (rad)
  const frame = [], cushion = [];
  const bx = (w, h, d, x, y, z, rx = 0) => xform(new THREE.BoxGeometry(w, h, d), { pos: [x, y, z], rot: [rx, 0, 0] });
  for (const s of [-1, 1]) {
    frame.push(bx(0.04, 0.05, 1.95, s * 0.3, 0.24, 0.02));
    for (const z of [-0.85, 0.9]) frame.push(bx(0.04, 0.24, 0.04, s * 0.3, 0.12, z));
    // backrest side rails
    const len = 0.9;
    frame.push(xform(new THREE.BoxGeometry(0.035, 0.035, len), { pos: [s * 0.3, 0.27 + Math.sin(tilt) * len / 2, -0.15 - Math.cos(tilt) * len / 2], rot: [tilt, 0, 0] }));
  }
  frame.push(bx(0.6, 0.03, 0.04, 0, 0.26, 0.95), bx(0.6, 0.03, 0.04, 0, 0.26, -0.85));
  cushion.push(xform(new RoundedBoxGeometry(0.62, 0.075, 1.12, 3, 0.03), { pos: [0, 0.31, 0.43] }));
  const blen = 0.88;
  cushion.push(xform(new RoundedBoxGeometry(0.62, 0.075, blen, 3, 0.03), { pos: [0, 0.31 + Math.sin(tilt) * blen / 2 + 0.01, -0.15 - Math.cos(tilt) * blen / 2 - 0.01], rot: [tilt, 0, 0] }));
  return { frame: merge(frame), cushion: merge(cushion) };
}

function parasolGeometries() {
  const prof = [[0.0, 0.5], [0.22, 0.47], [0.6, 0.38], [1.0, 0.2], [CANOPY_R, 0.0]];
  const pts = prof.map(([r, y]) => new THREE.Vector2(r, y));
  const canopy = new THREE.LatheGeometry(pts, 16);
  xform(canopy, { pos: [0, 2.15, 0] });
  const valance = xform(new THREE.CylinderGeometry(CANOPY_R, CANOPY_R, 0.14, 16, 1, true), { pos: [0, 2.08, 0] });
  const pole = merge([xform(new THREE.CylinderGeometry(0.026, 0.026, 2.55, 10), { pos: [0, 1.27, 0] }), xform(new THREE.SphereGeometry(0.05, 8, 6), { pos: [0, 2.68, 0] })]);
  const base = xform(new THREE.CylinderGeometry(0.34, 0.4, 0.12, 20), { pos: [0, 0.06, 0] });
  return { canopy: merge([canopy, valance]), pole, base };
}

export function buildProps({ renderer }) {
  const group = new THREE.Group(); group.name = 'props';
  const colliders = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const lg = loungerGeometries(), pg = parasolGeometries();
  const aqua = makeStripes({ a: [247, 244, 237], b: [62, 154, 168], stripes: 6, seed: 4 }); aqua.anisotropy = aniso;
  const sand = makeStripes({ a: [247, 244, 237], b: [214, 188, 142], stripes: 6, seed: 7 }); sand.anisotropy = aniso;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.7 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: aqua, roughness: 0.92, envMapIntensity: 0.4 });
  const aquaCanopy = new THREE.MeshStandardMaterial({ map: aqua, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.35 });
  const sandCanopy = new THREE.MeshStandardMaterial({ map: sand, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.35 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, metalness: 0.4, roughness: 0.35 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.85 });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const place = (list, x, y, z, ry) => { m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), one); list.push(m4.clone()); };

  // loungers: [x, z, heading]; heading 0 keeps the head toward -z
  const L = [], loungers = [];
  const rowA = [-13.6, -11.2, -3.6, -1.2, 5.2, 7.6];               // villa side, facing the water
  for (const x of rowA) loungers.push([x, -7.5, 0]);
  const rowB = [-5.4, -3.0, 0.2, 2.6, 5.4];                          // wood sun deck
  for (const x of rowB) loungers.push([x, 8.6, Math.PI]);
  loungers.push([13.4, 0.8, Math.PI / 2], [13.4, 2.9, Math.PI / 2]);
  for (const [x, z, h] of loungers) {
    place(L, x, FL + (z > WOOD.minZ && x > WOOD.minX && x < WOOD.maxX && z < WOOD.maxZ ? WOOD.rise : 0), z, h);
    const hx = Math.abs(Math.cos(h)) > 0.5 ? 1.05 : 0.38, hz = Math.abs(Math.cos(h)) > 0.5 ? 0.38 : 1.05;
    colliders.push(new THREE.Box3(new THREE.Vector3(x - hx, -1, z - hz), new THREE.Vector3(x + hx, FL + 0.95, z + hz)));
  }
  const frameMesh = new THREE.InstancedMesh(lg.frame, frameMat, L.length), cushMesh = new THREE.InstancedMesh(lg.cushion, cushionMat, L.length);
  L.forEach((m, i) => { frameMesh.setMatrixAt(i, m); cushMesh.setMatrixAt(i, m); });
  for (const m of [frameMesh, cushMesh]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
  frameMesh.name = 'loungers'; cushMesh.name = 'lounger-cushions';

  // parasols between lounger pairs: [x, z, palette]
  const parasols = [[-12.4, -7.5, 0], [-2.4, -7.5, 1], [6.4, -7.5, 0], [-4.2, 8.6, 1], [1.4, 8.6, 0], [13.4, 1.85, 1]];
  const pA = [], pB = [], poles = [], bases = [];
  for (const [x, z, pal] of parasols) {
    if (!clearOfPool(x, z, CANOPY_R + 0.1)) throw new Error('parasol canopy would overhang the pool');
    const y = FL + (z > WOOD.minZ && x > WOOD.minX && x < WOOD.maxX && z < WOOD.maxZ ? WOOD.rise : 0);
    place(pal ? pB : pA, x, y, z, Math.random() * 6.28);
    place(poles, x, y, z, 0); place(bases, x, y, z, 0);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - CANOPY_R, y + 1.95, z - CANOPY_R), new THREE.Vector3(x + CANOPY_R, y + 2.75, z + CANOPY_R)),
      new THREE.Box3(new THREE.Vector3(x - 0.3, -1, z - 0.3), new THREE.Vector3(x + 0.3, y + 2.0, z + 0.3)));
  }
  const mk = (geo, mat, list, name) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((mm, i) => m.setMatrixAt(i, mm));
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.name = name; group.add(m);
  };
  mk(pg.canopy, aquaCanopy, pA, 'parasol-aqua'); mk(pg.canopy, sandCanopy, pB, 'parasol-sand');
  mk(pg.pole, poleMat, poles, 'parasol-poles'); mk(pg.base, baseMat, bases, 'parasol-bases');

  // side tables with a drink each, between lounger pairs
  const tableTop = new THREE.CylinderGeometry(0.3, 0.3, 0.035, 24), tableStem = new THREE.CylinderGeometry(0.035, 0.05, 0.43, 10);
  const cup = new THREE.CylinderGeometry(0.038, 0.03, 0.12, 12);
  const topMat = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.5 }), cupMat = new THREE.MeshStandardMaterial({ color: 0xf08a3c, roughness: 0.3, emissive: 0x3a1204, emissiveIntensity: 0.4 });
  const T1 = [], T2 = [], T3 = [];
  for (const [x, z] of [[-12.4, -7.5], [-2.4, -7.5], [6.4, -7.5], [-4.2, 8.6], [1.4, 8.6]]) {
    const y = FL + (z > WOOD.minZ ? WOOD.rise : 0);
    place(T1, x, y + 0.43, z, 0); place(T2, x, y + 0.215, z, 0); place(T3, x + 0.14, y + 0.5, z + 0.08, 0);
  }
  mk(tableTop, topMat, T1, 'side-tables'); mk(tableStem, poleMat, T2, 'side-table-stems'); mk(cup, cupMat, T3, 'drinks');

  // towels: rolled and folded, on the cushions
  const towelA = makeStripes({ a: [250, 248, 244], b: [64, 150, 166], stripes: 4, seed: 9, weave: true }); towelA.anisotropy = aniso;
  const towelMat = new THREE.MeshStandardMaterial({ map: towelA, roughness: 1 });
  const roll = new THREE.CylinderGeometry(0.075, 0.075, 0.5, 14).rotateZ(Math.PI / 2);
  const fold = new RoundedBoxGeometry(0.46, 0.05, 0.3, 2, 0.02);
  const TR = [], TF = [];
  for (let i = 0; i < loungers.length; i += 2) {
    const [x, z, h] = loungers[i];
    const y = FL + (z > WOOD.minZ && x > WOOD.minX && x < WOOD.maxX && z < WOOD.maxZ ? WOOD.rise : 0);
    const ca = Math.cos(h), sa = Math.sin(h);
    const loc = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
    const [rx, rz] = loc(0, 0.3);
    place(TR, rx, y + 0.42, rz, h);
    const [fx, fz] = loc(0, 0.75);
    place(TF, fx, y + 0.375, fz, h);
  }
  mk(roll, towelMat, TR, 'rolled-towels'); mk(fold, towelMat, TF, 'folded-towels');
  return { group, colliders };
}
