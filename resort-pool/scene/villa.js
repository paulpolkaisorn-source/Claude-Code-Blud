// Resort villa (two storeys, covered veranda, hip roof) and a thatched palapa bar.
import * as THREE from 'three';
import { POOL } from '../pool-config.js';
import { VILLA, TERRACE } from './layout.js';
import { makePlaster, makeWood, setAniso, retile } from './textures.js';
import { makeRoof, makeThatch } from './textures2.js';
import { metricBox, merge, xform } from './geo.js';

const FL = POOL.deckY;

function boxAt(w, h, d, x, y, z) { return xform(metricBox(w, h, d), { pos: [x, y, z] }); }

// Hip roof with flat-shaded faces; UVs run along the slope in meters.
function hipRoof({ x0, x1, z0, z1, y, h, inset }) {
  const zc = (z0 + z1) / 2, r1 = [x0 + inset, y + h, zc], r2 = [x1 - inset, y + h, zc];
  const P = []; const U = [];
  const tri = (a, b, c, ua, ub, uc) => { P.push(...a, ...b, ...c); U.push(...ua, ...ub, ...uc); };
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1];
  const sl = Math.hypot(h, zc - z0), sx = Math.hypot(h, inset);
  // front (+z) and back (-z) slopes as two triangles each
  tri(D, C, r2, [x0, 0], [x1, 0], [x1 - inset, sl]); tri(D, r2, r1, [x0, 0], [x1 - inset, sl], [x0 + inset, sl]);
  tri(B, A, r1, [x1, 0], [x0, 0], [x0 + inset, sl]); tri(B, r1, r2, [x1, 0], [x0 + inset, sl], [x1 - inset, sl]);
  tri(A, D, r1, [z0, 0], [z1, 0], [zc, sx]); tri(C, B, r2, [z1, 0], [z0, 0], [zc, sx]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.computeVertexNormals();
  return g;
}

export function buildVilla({ aniso = 8 }) {
  const group = new THREE.Group(); group.name = 'villa';
  const colliders = [];
  const V = VILLA, front = V.maxZ;
  const plaster = makePlaster({ seed: 8 }); setAniso(plaster, aniso);
  const plasterMat = new THREE.MeshStandardMaterial({ map: plaster.map, normalMap: plaster.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.92, envMapIntensity: 0.4 });
  const teak = makeWood({ seed: 23, base: [118, 78, 46] }); setAniso(teak, aniso);
  const woodMat = new THREE.MeshStandardMaterial({ map: teak.map, roughnessMap: teak.rough, roughness: 1, normalMap: teak.normal, envMapIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x181410, roughness: 0.95 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3135, metalness: 0.7, roughness: 0.4, envMapIntensity: 0.9 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x24444c, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2 });
  const roof = makeRoof(); setAniso(roof, aniso);
  const roofMat = new THREE.MeshStandardMaterial({ map: roof.map, normalMap: roof.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.82, envMapIntensity: 0.4, side: THREE.DoubleSide });
  const P = { plaster: [], wood: [], frame: [], glass: [], dark: [] };

  const gfH = 3.2, upY = FL + gfH + 0.15, upH = 3.0, gz = front, ox = 2.4;   // ground floor height, upper floor base/height, overhang
  // interior mass behind the glass and the end piers
  P.dark.push(boxAt(33.2, gfH, V.maxZ - V.minZ - 0.1, 0, FL + gfH / 2, (V.minZ + V.maxZ) / 2 - 0.05 - 0.1 + 0.1));
  P.plaster.push(boxAt(0.4, gfH, V.maxZ - V.minZ, V.minX + 0.2, FL + gfH / 2, (V.minZ + V.maxZ) / 2));
  P.plaster.push(boxAt(0.4, gfH, V.maxZ - V.minZ, V.maxX - 0.2, FL + gfH / 2, (V.minZ + V.maxZ) / 2));
  // upper box overhanging the veranda
  const uz1 = front + ox;
  P.plaster.push(boxAt(V.maxX - V.minX, upH + 0.15, uz1 - V.minZ, 0, FL + gfH + (upH + 0.15) / 2, (V.minZ + uz1) / 2));
  // veranda pillars
  for (let i = 0; i < 9; i++) P.plaster.push(boxAt(0.36, gfH, 0.36, -16 + i * 4, FL + gfH / 2, front + ox - 0.45));
  // ground floor glazing: panels with mullions
  const glassZ = gz + 0.02;
  for (let i = 0; i < 8; i++) {
    const cx = -14 + i * 4;
    const gm = new THREE.PlaneGeometry(3.7, gfH - 0.25); xform(gm, { pos: [cx, FL + gfH / 2, glassZ] }); P.glass.push(gm);
    P.frame.push(boxAt(0.07, gfH - 0.2, 0.08, cx - 1.9, FL + gfH / 2, glassZ), boxAt(0.07, gfH - 0.2, 0.08, cx + 1.9, FL + gfH / 2, glassZ),
      boxAt(0.05, gfH - 0.2, 0.06, cx, FL + gfH / 2, glassZ + 0.01),
      boxAt(3.85, 0.07, 0.08, cx, FL + 2.45, glassZ), boxAt(3.85, 0.1, 0.08, cx, FL + 0.08, glassZ), boxAt(3.85, 0.1, 0.08, cx, FL + gfH - 0.1, glassZ));
  }
  // upper floor: window bays with louvred shutters
  const wy = upY + 0.45, wh = 1.95;
  for (let i = 0; i < 6; i++) {
    const cx = -13.5 + i * 5.4;
    const gm = new THREE.PlaneGeometry(2.3, wh); xform(gm, { pos: [cx, wy + wh / 2, uz1 + 0.02] }); P.glass.push(gm);
    P.frame.push(boxAt(2.45, 0.07, 0.1, cx, wy + wh + 0.02, uz1 + 0.04), boxAt(2.45, 0.07, 0.1, cx, wy, uz1 + 0.04),
      boxAt(0.07, wh, 0.1, cx - 1.2, wy + wh / 2, uz1 + 0.04), boxAt(0.07, wh, 0.1, cx + 1.2, wy + wh / 2, uz1 + 0.04), boxAt(0.05, wh, 0.08, cx, wy + wh / 2, uz1 + 0.04));
    P.plaster.push(boxAt(2.7, 0.1, 0.36, cx, wy - 0.07, uz1 + 0.12));                          // sill
    for (const s of [-1, 1]) for (let k = 0; k < 14; k++) {                                    // shutter slats
      P.wood.push(boxAt(0.62, 0.05, 0.05, cx + s * 1.62, wy + 0.1 + k * 0.145, uz1 + 0.07));
    }
    for (const s of [-1, 1]) P.wood.push(boxAt(0.05, wh, 0.07, cx + s * 1.97, wy + wh / 2, uz1 + 0.07), boxAt(0.05, wh, 0.07, cx + s * 1.3, wy + wh / 2, uz1 + 0.07));
  }
  // cornice band under the roof
  P.plaster.push(boxAt(V.maxX - V.minX + 0.5, 0.28, uz1 - V.minZ + 0.5, 0, upY + upH - 0.1, (V.minZ + uz1) / 2));
  const merged = {};
  const meshes = [[P.plaster, plasterMat, 'villa-plaster'], [P.wood, woodMat, 'villa-wood'], [P.frame, frameMat, 'villa-frames'], [P.glass, glassMat, 'villa-glass'], [P.dark, dark, 'villa-interior']];
  for (const [list, mat, name] of meshes) {
    if (!list.length) continue;
    const m = new THREE.Mesh(merge(list), mat); m.name = name; m.castShadow = true; m.receiveShadow = true; group.add(m); merged[name] = m;
  }
  merged['villa-glass'].castShadow = false;
  // roof
  const ry = upY + upH + 0.05;
  const rg = hipRoof({ x0: V.minX - 1.3, x1: V.maxX + 1.3, z0: V.minZ - 1.3, z1: uz1 + 1.3, y: ry, h: 2.3, inset: 8.5 });
  const roofMesh = new THREE.Mesh(rg, roofMat); roofMesh.castShadow = true; roofMesh.receiveShadow = true; roofMesh.name = 'villa-roof'; group.add(roofMesh);

  colliders.push(
    new THREE.Box3(new THREE.Vector3(V.minX - 0.1, -2, V.minZ - 0.1), new THREE.Vector3(V.maxX + 0.1, FL + gfH + 0.1, front + 0.05)),
    new THREE.Box3(new THREE.Vector3(V.minX - 0.1, FL + gfH, V.minZ - 0.1), new THREE.Vector3(V.maxX + 0.1, 12, uz1 + 0.1)),
    new THREE.Box3(new THREE.Vector3(V.minX - 1.4, ry - 0.2, V.minZ - 1.4), new THREE.Vector3(V.maxX + 1.4, 12, uz1 + 1.4)),
  );
  for (let i = 0; i < 9; i++) colliders.push(new THREE.Box3(new THREE.Vector3(-16.2 + i * 4, -1, front + ox - 0.65), new THREE.Vector3(-15.8 + i * 4, FL + gfH, front + ox - 0.25)));
  void TERRACE;
  return { group, colliders };
}

// Thatched palapa with a small bar, on the sea side of the terrace.
export function buildPalapa({ aniso = 8, cx = 14.4, cz = -6.8 }) {
  const group = new THREE.Group(); group.name = 'palapa';
  group.position.set(cx, FL, cz);
  const thatch = makeThatch(); setAniso(thatch, aniso);
  const roofTex = { map: retile(thatch.map, 8, 2.4), normal: retile(thatch.normal, 8, 2.4) };
  const thatchMat = new THREE.MeshStandardMaterial({ map: roofTex.map, normalMap: roofTex.normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  const teak = makeWood({ seed: 29, base: [120, 80, 48] }); setAniso(teak, aniso);
  const woodMat = new THREE.MeshStandardMaterial({ map: teak.map, roughnessMap: teak.rough, roughness: 1, normalMap: teak.normal, envMapIntensity: 0.4 });
  const R = 3.4, H = 2.5, postH = 2.55;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(R, H, 32, 1, true), thatchMat);
  cone.position.y = postH + H / 2; cone.castShadow = true; cone.receiveShadow = true; group.add(cone);
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.04, 0.3, 32, 1, true), thatchMat);
  eave.position.y = postH + 0.03; eave.castShadow = true; group.add(eave);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 12), thatchMat); cap.position.y = postH + H + 0.2; group.add(cap);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, postH, 12), woodMat);
    post.position.set(Math.cos(a) * 2.75, postH / 2, Math.sin(a) * 2.75); post.castShadow = true; post.receiveShadow = true; group.add(post);
  }
  const counter = new THREE.Mesh(metricBox(2.5, 1.02, 0.62), woodMat); counter.position.set(0, 0.51, 0.1); counter.castShadow = true; counter.receiveShadow = true; group.add(counter);
  const top = new THREE.Mesh(metricBox(2.7, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0xe9e0cf, roughness: 0.5 })); top.position.set(0, 1.05, 0.1); top.castShadow = true; group.add(top);
  const stoolMat = new THREE.MeshStandardMaterial({ color: 0xcdb892, roughness: 0.8 });
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.07, 16), stoolMat); s.position.set(-0.95 + k * 0.63, 0.7, 0.78); s.castShadow = true; group.add(s);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.66, 8), woodMat); leg.position.set(-0.95 + k * 0.63, 0.35, 0.78); group.add(leg);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0xffd48a, emissiveIntensity: 0.5, roughness: 0.6 });
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), lampMat); l.position.set(-0.8 + k * 0.8, 2.15, 0.1); group.add(l); }
  const colliders = [new THREE.Box3(new THREE.Vector3(cx - R, FL + postH - 0.4, cz - R), new THREE.Vector3(cx + R, FL + postH + H + 1, cz + R)),
    new THREE.Box3(new THREE.Vector3(cx - 1.4, -1, cz - 0.35), new THREE.Vector3(cx + 1.4, FL + 1.1, cz + 0.55))];
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; colliders.push(new THREE.Box3(new THREE.Vector3(cx + Math.cos(a) * 2.75 - 0.15, -1, cz + Math.sin(a) * 2.75 - 0.15), new THREE.Vector3(cx + Math.cos(a) * 2.75 + 0.15, FL + postH, cz + Math.sin(a) * 2.75 + 0.15))); }
  return { group, colliders };
}
