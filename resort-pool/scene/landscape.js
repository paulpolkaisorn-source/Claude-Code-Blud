// Ground around the terrace (lawn, dunes, beach) and the ocean out to the horizon.
import * as THREE from 'three';
import { fbm } from './noise.js';
import { addBreakup } from './breakup.js';
import { makeGround, makeOceanNormal, makeFoamStrip } from './textures2.js';
import { TERRACE, GROUND_Y, SEA_Y } from './layout.js';

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const shoreX = (z) => 66 + 8 * Math.sin(z / 38) + 4 * Math.sin(z / 15 + 1);
export const sandX = (z) => 28 + 2.5 * Math.sin(z / 21 + 0.4);

// Terrain height: flat lawn, a gentle beach that meets the sea at shoreX(z), then seabed.
export function terrainH(x, z) {
  const xs = shoreX(z), x0 = sandX(z);
  let h = GROUND_Y;
  if (x > x0) {
    const t = Math.min(1, (x - x0) / (xs - x0));
    h = GROUND_Y + (SEA_Y - 0.05 - GROUND_Y) * t * (0.55 + 0.45 * t);
    if (x > xs) h = SEA_Y - 0.05 - (x - xs) * 0.07;
  }
  const far = Math.hypot(x, z * 0.8);
  if (x < xs - 30) h += 5.5 * sstep(70, 260, far) * (fbm(x / 140 + 3, z / 140, 3, 5) - 0.35);
  h += 0.28 * (fbm(x / 7, z / 7, 3, 9) - 0.5) * sstep(24, 34, x) * (1 - sstep(xs - 6, xs, x));
  return h;
}

const range = (a, b, step) => { const r = []; for (let v = a; v < b - 1e-6; v += step) r.push(v); return r; };

export function buildLandscape({ aniso = 8 }) {
  const group = new THREE.Group(); group.name = 'landscape';
  const T = TERRACE;
  const xs = [...range(-700, -60, 40), ...range(-60, -19, 8.2), -19, ...range(19, 100, 4), ...range(100, 400, 25), ...range(400, 701, 60)];
  const zs = [...range(-700, -60, 40), ...range(-60, -24, 6), ...range(-24, T.minZ, 4.1), T.minZ, ...range(T.minZ, T.maxZ, 3.5), T.maxZ,
    ...range(T.maxZ, 40, 5.4), ...range(40, 100, 12), ...range(100, 701, 40)];
  // insert the terrace x corner on the +x side too
  if (!xs.includes(19)) xs.push(19);
  xs.sort((a, b) => a - b);
  const pos = [], col = [], uv = [], idx = [];
  const nxv = xs.length, nzv = zs.length;
  const lawn = new THREE.Color(0.2, 0.34, 0.1), sand = new THREE.Color(0.8, 0.68, 0.48), wet = new THREE.Color(0.46, 0.4, 0.3), c = new THREE.Color();
  for (let j = 0; j < nzv; j++) for (let i = 0; i < nxv; i++) {
    const x = xs[i], z = zs[j], h = terrainH(x, z);
    pos.push(x, h, z); uv.push(x, z);
    const s = sstep(sandX(z) - 1.5, sandX(z) + 5, x + 3 * (fbm(x / 6, z / 6, 2, 3) - 0.5));
    c.copy(lawn).lerp(sand, s);
    const wetT = sstep(shoreX(z) - 7, shoreX(z) + 1, x);
    c.lerp(wet, wetT * 0.8);
    const patch = 0.88 + 0.24 * fbm(x / 30, z / 30, 3, 2);
    col.push(c.r * patch, c.g * patch, c.b * patch);
  }
  const inside = (x0, x1, z0, z1) => x0 >= T.minX - 1e-3 && x1 <= T.maxX + 1e-3 && z0 >= T.minZ - 1e-3 && z1 <= T.maxZ + 1e-3;
  for (let j = 0; j < nzv - 1; j++) for (let i = 0; i < nxv - 1; i++) {
    if (inside(xs[i], xs[i + 1], zs[j], zs[j + 1])) continue;
    const a = i + j * nxv, b = a + 1, d = a + nxv, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const gt = makeGround();
  gt.map.anisotropy = gt.normal.anisotropy = aniso;
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: gt.map, normalMap: gt.normal, normalScale: new THREE.Vector2(0.6, 0.6), vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.4,
  }));
  addBreakup(ground.material, { scale: 0.045, amount: 0.14 });
  ground.receiveShadow = true; ground.name = 'ground';
  group.add(ground);

  // ---- sea: depth-tinted, depth-faded, rippled by a scrolling normal map ---------------------------
  const sx = [...range(-30, 150, 4), ...range(150, 700, 40), ...range(700, 6001, 700)];
  const sz = [...range(-6000, -700, 700), ...range(-700, -200, 50), ...range(-200, 200, 10), ...range(200, 700, 50), ...range(700, 6001, 700)];
  const sp = [], sc = [], si = [];
  const shallow = new THREE.Color(0.1, 0.62, 0.62), deep = new THREE.Color(0.01, 0.16, 0.32);
  for (let j = 0; j < sz.length; j++) for (let i = 0; i < sx.length; i++) {
    const x = sx[i], z = sz[j];
    sp.push(x, SEA_Y, z);
    const d = Math.max(0, x - shoreX(z));
    const t = sstep(0, 55, d), tt = sstep(0, 160, d);
    c.copy(shallow).lerp(deep, tt);
    const alpha = 0.18 + 0.82 * sstep(0, 26, d) ;
    sc.push(c.r, c.g, c.b, d <= 0 ? 0.0 : Math.min(1, alpha + 0 * t));
  }
  for (let j = 0; j < sz.length - 1; j++) for (let i = 0; i < sx.length - 1; i++) {
    const a = i + j * sx.length, b = a + 1, d = a + sx.length, e = d + 1;
    si.push(a, d, b, b, d, e);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 4));
  const suv = []; for (let q = 0; q < sp.length; q += 3) suv.push(sp[q], sp[q + 2]);
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(suv, 2));
  sg.setIndex(si); sg.computeVertexNormals();
  const waveN = makeOceanNormal();
  waveN.repeat.set(1 / 9, 1 / 9);
  waveN.anisotropy = 16;
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, roughness: 0.07, metalness: 0, normalMap: waveN,
    normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 1.0,
  });
  const sea = new THREE.Mesh(sg, seaMat); sea.name = 'sea'; sea.renderOrder = 1;
  group.add(sea);

  // ---- foam line breathing in and out with the swash ----------------------------------------------
  const foamTex = makeFoamStrip();
  foamTex.repeat.set(24, 1);
  const foamGeo = new THREE.BufferGeometry();
  const fp = [], fu = [], fi = [], zsN = 90, z0 = -360, z1 = 360;
  for (let k = 0; k <= zsN; k++) {
    const z = z0 + (k / zsN) * (z1 - z0), x = shoreX(z);
    fp.push(x - 2.2, SEA_Y + 0.02, z, x + 2.6, SEA_Y + 0.02, z);
    fu.push(k / zsN, 0, k / zsN, 1);
    if (k < zsN) { const a = k * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  foamGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2));
  foamGeo.setIndex(fi);
  const foamMat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.9 });
  const foam = new THREE.Mesh(foamGeo, foamMat); foam.renderOrder = 2; foam.name = 'foam';
  group.add(foam);

  const update = (t) => {
    waveN.offset.set(t * 0.0035, t * 0.0022);
    foam.position.x = Math.sin(t * 0.7) * 1.1;
    foamMat.opacity = 0.55 + 0.35 * Math.sin(t * 0.7 + 1.2);
  };
  return { group, colliders: [], update };
}
