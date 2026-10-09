// Pool shell: mosaic floor and walls, waterline band, entry steps, stainless ladder, niche lights,
// rounded stone coping. Every dimension comes from pool-config.js.
// Fixture rule (POOL.fixtureMaxY): inside the interior rectangle nothing rises above that height
// except ladder rails within 0.25 m of a wall.
import * as THREE from 'three';
import { POOL, floorY } from '../pool-config.js';
import { GeoBuilder } from './geo.js';
import { makeTile, makeStone, setAniso } from './textures.js';

export const COPING_W = 0.38;
const BAND_LO = -0.2;          // darker waterline tile band: BAND_LO .. WALL_TOP
const WALL_TOP = 0.04;         // coping sits on top of the wall from here up to deckY

export function buildShell({ water, aniso = 8 }) {
  const { minX, maxX, minZ, maxZ, deckY } = POOL;
  const group = new THREE.Group(); group.name = 'pool-shell';
  const uw = new Set();                       // materials that need underwater lighting
  const mk = (mat) => { uw.add(mat); return mat; };

  // ---- materials ----------------------------------------------------------------------------
  const tile = makeTile({ seed: 3 });
  setAniso(tile, aniso);
  const tileMat = mk(new THREE.MeshStandardMaterial({
    map: tile.map, roughnessMap: tile.rough, roughness: 1, normalMap: tile.normal,
    normalScale: new THREE.Vector2(0.9, 0.9), metalness: 0, envMapIntensity: 0.6,
  }));
  const band = makeTile({ seed: 9, N: 512, T: 8, patch: 0.5, palette: [[20, 66, 104, 3], [26, 80, 120, 3], [16, 54, 92, 2], [38, 100, 138, 1]], grout: [150, 164, 170], gloss: 0.12 });
  setAniso(band, aniso);
  const bandMat = mk(new THREE.MeshStandardMaterial({
    map: band.map, roughnessMap: band.rough, roughness: 1, normalMap: band.normal, metalness: 0, envMapIntensity: 0.7,
  }));
  const stepMat = mk(tileMat.clone());
  stepMat.color = new THREE.Color(0xe9f6f6);
  const steel = mk(new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }));
  const plastic = mk(new THREE.MeshStandardMaterial({ color: 0xf1f3f2, metalness: 0, roughness: 0.4 }));
  const lens = mk(new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c8, emissiveIntensity: 0.9, roughness: 0.2 }));
  const grate = mk(new THREE.MeshStandardMaterial({ color: 0x2a3338, metalness: 0.4, roughness: 0.55 }));

  // ---- floor and walls (inside faces) -----------------------------------------------------------
  const gTile = new GeoBuilder(), gBand = new GeoBuilder();
  const xs = [minX, POOL.slopeStartX, POOL.slopeEndX, maxX];
  let s = 0;
  const W = maxZ - minZ;
  for (let k = 0; k < 3; k++) {
    const xa = xs[k], xb = xs[k + 1], ya = floorY(xa), yb = floorY(xb);
    const len = Math.hypot(xb - xa, yb - ya);
    gTile.quad([[xa, ya, minZ], [xb, yb, minZ], [xb, yb, maxZ], [xa, ya, maxZ]],
      [[s, 0], [s + len, 0], [s + len, W], [s, W]], [-(yb - ya) / len, (xb - xa) / len, 0]);
    s += len;
    // south (z = minZ, faces +z) and north (z = maxZ, faces -z) walls below the band
    for (const [z, nz] of [[minZ, 1], [maxZ, -1]]) {
      gTile.quad([[xa, ya, z], [xb, yb, z], [xb, BAND_LO, z], [xa, BAND_LO, z]], [[xa, ya], [xb, yb], [xb, BAND_LO], [xa, BAND_LO]], [0, 0, nz]);
    }
  }
  for (const [z, nz] of [[minZ, 1], [maxZ, -1]]) {
    gBand.quad([[minX, BAND_LO, z], [maxX, BAND_LO, z], [maxX, WALL_TOP, z], [minX, WALL_TOP, z]],
      [[minX, BAND_LO], [maxX, BAND_LO], [maxX, WALL_TOP], [minX, WALL_TOP]], [0, 0, nz]);
  }
  for (const [x, nx] of [[minX, 1], [maxX, -1]]) { // end walls
    const yb = floorY(x);
    gTile.quad([[x, yb, minZ], [x, yb, maxZ], [x, BAND_LO, maxZ], [x, BAND_LO, minZ]], [[minZ, yb], [maxZ, yb], [maxZ, BAND_LO], [minZ, BAND_LO]], [nx, 0, 0]);
    gBand.quad([[x, BAND_LO, minZ], [x, BAND_LO, maxZ], [x, WALL_TOP, maxZ], [x, WALL_TOP, minZ]],
      [[minZ, BAND_LO], [maxZ, BAND_LO], [maxZ, WALL_TOP], [minZ, WALL_TOP]], [nx, 0, 0]);
  }

  // ---- entry steps in the shallow end (tops stay below fixtureMaxY) --------------------------------
  const gStep = new GeoBuilder(), gNose = new GeoBuilder();
  const tops = [-0.30, -0.57, -0.84], ends = [minX + 0.46, minX + 0.84, minX + 1.22], zA = 0.9, bot = floorY(minX);
  for (let i = 0; i < 3; i++) {
    const x0 = i === 0 ? minX : ends[i - 1], x1 = ends[i], top = tops[i];
    if (top > POOL.fixtureMaxY) throw new Error('step too high');
    gStep.quad([[x0, top, zA], [x1 - 0.06, top, zA], [x1 - 0.06, top, maxZ], [x0, top, maxZ]], [[x0, zA], [x1 - 0.06, zA], [x1 - 0.06, maxZ], [x0, maxZ]], [0, 1, 0]);
    gNose.quad([[x1 - 0.06, top, zA], [x1, top, zA], [x1, top, maxZ], [x1 - 0.06, top, maxZ]], [[x1 - 0.06, zA], [x1, zA], [x1, maxZ], [x1 - 0.06, maxZ]], [0, 1, 0]);
    const yLow = i < 2 ? tops[i + 1] : bot;
    gStep.quad([[x1, yLow, zA], [x1, top, zA], [x1, top, maxZ], [x1, yLow, maxZ]], [[zA, yLow], [zA, top], [maxZ, top], [maxZ, yLow]], [1, 0, 0]);
    gStep.quad([[x0, bot, zA], [x1, bot, zA], [x1, top, zA], [x0, top, zA]], [[x0, bot], [x1, bot], [x1, top], [x0, top]], [0, 0, -1]);
  }

  const addMesh = (g, mat, name) => {
    if (g.empty) return null;
    const m = new THREE.Mesh(g.build(), mat); m.name = name; m.receiveShadow = true; group.add(m); return m;
  };
  addMesh(gTile, tileMat, 'pool-tile'); addMesh(gBand, bandMat, 'pool-band');
  addMesh(gStep, stepMat, 'pool-steps'); addMesh(gNose, bandMat, 'pool-nosing');

  // ---- stainless ladder at the deep end (rails hug the end wall, within 0.25 m of it) -----------------
  const zc = -2.6, half = 0.28, xr = maxX - 0.08;
  const railPath = (z) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(xr, -1.45, z), new THREE.Vector3(xr, -0.2, z), new THREE.Vector3(xr, 0.5, z),
    new THREE.Vector3(xr + 0.04, 0.78, z), new THREE.Vector3(xr + 0.2, 0.93, z), new THREE.Vector3(xr + 0.42, 0.78, z),
    new THREE.Vector3(xr + 0.5, 0.5, z), new THREE.Vector3(xr + 0.5, deckY + 0.01, z),
  ], false, 'catmullrom', 0.3);
  for (const z of [zc - half, zc + half]) {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railPath(z), 60, 0.026, 10, false), steel);
    rail.castShadow = true; rail.name = 'ladder-rail'; group.add(rail);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 20), steel);
    flange.position.set(xr + 0.5, deckY + 0.007, z); group.add(flange);
    const wallPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16).rotateZ(Math.PI / 2), steel);
    wallPlate.position.set(maxX - 0.006, -1.45, z); group.add(wallPlate);
  }
  for (const y of [-0.42, -0.8, -1.18]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.022, half * 2), steel);
    t.position.set(xr - 0.02, y, zc); t.name = 'ladder-tread'; group.add(t);
  }

  // ---- niche lights, return jets, drains -----------------------------------------------------------------
  const bez = new THREE.TorusGeometry(0.115, 0.014, 8, 28);
  for (const x of [-4.5, 0.5, 5.0]) {
    const bz = new THREE.Mesh(bez, steel); bz.position.set(x, -0.95, maxZ - 0.012); group.add(bz);
    const ln = new THREE.Mesh(new THREE.CircleGeometry(0.105, 24), lens); ln.position.set(x, -0.95, maxZ - 0.016); ln.rotation.y = Math.PI; group.add(ln);
  }
  const jet = new THREE.CircleGeometry(0.05, 18);
  for (const x of [-6.2, -2.4, 1.6, 5.4]) {
    const j = new THREE.Mesh(jet, plastic); j.position.set(x, -0.55, minZ + 0.006); group.add(j);
  }
  for (const x of [5.5, 6.9]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32).rotateX(-Math.PI / 2), grate);
    d.position.set(x, floorY(x) + 0.004, 0); group.add(d);
  }

  // ---- rounded stone coping swept around the rectangle ------------------------------------------------------
  const stone = makeStone({ seed: 31, W: 960, H: 320, pw: 480, ph: 320, bond: 0, base: [240, 232, 216], tintVar: 0.035, patch: [1.2, 0.4], joint: 3, rough: 0.7, pits: 0.0006 });
  setAniso(stone, aniso);
  const copingMat = new THREE.MeshStandardMaterial({ map: stone.map, roughnessMap: stone.rough, roughness: 1, normalMap: stone.normal, metalness: 0, envMapIntensity: 0.5 });
  const R = 0.055, prof = [[0, WALL_TOP, -1, 0], [0, deckY - R - 0.0, -1, 0]];
  for (let a = 1; a <= 7; a++) { const t = a / 7 * Math.PI / 2; prof.push([R - R * Math.cos(t), deckY - R + R * Math.sin(t), -Math.cos(t), Math.sin(t)]); }
  prof.push([COPING_W, deckY, 0, 1], [COPING_W, deckY, 1, 0], [COPING_W, deckY - 0.06, 1, 0]);
  let L = 0; const arc = [0];
  for (let k = 1; k < prof.length; k++) { L += Math.hypot(prof[k][0] - prof[k - 1][0], prof[k][1] - prof[k - 1][1]); arc.push(L); }
  const gC = new GeoBuilder();
  const sides = [ // [function(d) -> [A, B] in xz, outward unit vector, along-axis index]
    (d) => [[minX - d, minZ - d], [maxX + d, minZ - d], [0, -1], 0],
    (d) => [[minX - d, maxZ + d], [maxX + d, maxZ + d], [0, 1], 0],
    (d) => [[minX - d, minZ - d], [minX - d, maxZ + d], [-1, 0], 1],
    (d) => [[maxX + d, minZ - d], [maxX + d, maxZ + d], [1, 0], 1],
  ];
  for (const side of sides) {
    for (let k = 1; k < prof.length; k++) {
      const p0 = prof[k - 1], p1 = prof[k];
      if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 1e-6) continue;
      const [A0, B0, o, ax] = side(p0[0]), [A1, B1] = side(p1[0]);
      const v0 = arc[k - 1] / L * 0.4, v1 = arc[k] / L * 0.4;
      const n0 = [o[0] * p0[2], p0[3], o[1] * p0[2]], n1 = [o[0] * p1[2], p1[3], o[1] * p1[2]];
      gC.quadN([[A0[0], p0[1], A0[1]], [B0[0], p0[1], B0[1]], [B1[0], p1[1], B1[1]], [A1[0], p1[1], A1[1]]],
        [[A0[ax], v0], [B0[ax], v0], [B1[ax], v1], [A1[ax], v1]], [n0, n0, n1, n1]);
    }
  }
  const coping = new THREE.Mesh(gC.build(), copingMat); coping.name = 'coping'; coping.receiveShadow = true; coping.castShadow = false;
  group.add(coping);

  // pass every underwater material through the water module before its first render
  for (const m of uw) water.applyUnderwaterLighting(m);
  return { group, underwater: uw, copingMat };
}
