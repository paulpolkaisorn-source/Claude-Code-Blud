// Procedural palm trees: ringed, leaning trunks and crowns of arching pinnate fronds with real
// leaflet geometry (no alpha cards). All palms merge into two meshes (trunks, crowns).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { makeBark } from './textures2.js';
import { setAniso } from './textures.js';
import { merge } from './geo.js';
import { terrainH } from './landscape.js';

const UP = new THREE.Vector3(0, 1, 0);

function trunkGeometry(rnd, x, y0, z, h, lean) {
  const rings = 16, seg = 12, pos = [], nor = [], uv = [], idx = [];
  const lx = lean[0], lz = lean[1];
  const centre = (t) => new THREE.Vector3(x + lx * h * Math.pow(t, 1.7), y0 + h * t, z + lz * h * Math.pow(t, 1.7));
  let s = 0, prev = centre(0);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, c = centre(t), tn = centre(Math.min(1, t + 0.01)).sub(centre(Math.max(0, t - 0.01))).normalize();
    const u = new THREE.Vector3().crossVectors(tn, UP).normalize();
    if (u.lengthSq() < 0.5) u.set(1, 0, 0);
    const v = new THREE.Vector3().crossVectors(tn, u).normalize();
    s += c.distanceTo(prev); prev = c;
    const r = 0.15 - 0.03 * t + 0.16 * Math.exp(-t * 11) + 0.012 * Math.sin(t * 20 + 1);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const nx = u.x * ca + v.x * sa, ny = u.y * ca + v.y * sa, nz = u.z * ca + v.z * sa;
      pos.push(c.x + nx * r, c.y + ny * r, c.z + nz * r); nor.push(nx, ny, nz); uv.push(j / seg, s / 1.8);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { geo: g, top: centre(1), tangent: centre(1).sub(centre(0.97)).normalize() };
}

function crownGeometry(rnd, top, count) {
  const P = [], C = [];
  const col = new THREE.Color();
  const push = (a, b, c, ca, cb, cc) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); C.push(...ca, ...cb, ...cc); };
  const frond = (azim, elev, len, droop, tint, dead) => {
    const pts = [], tans = [];
    const steps = 22; let ang = elev; const p = top.clone().add(new THREE.Vector3(0, 0.12, 0));
    const hz = new THREE.Vector3(Math.cos(azim), 0, Math.sin(azim));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const e = elev - droop * Math.pow(u, 1.45);
      const tn = new THREE.Vector3().copy(hz).multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e));
      pts.push(p.clone()); tans.push(tn);
      p.addScaledVector(tn, len / steps); ang = e;
    }
    void ang;
    const side = new THREE.Vector3().crossVectors(hz, UP).normalize();
    // rachis ribbon
    for (let i = 0; i < steps; i++) {
      const a = pts[i], b = pts[i + 1], w = 0.028 * (1 - 0.7 * i / steps);
      const ca = dead ? [0.2, 0.14, 0.07] : [0.16, 0.3, 0.07];
      const aL = a.clone().addScaledVector(side, w), aR = a.clone().addScaledVector(side, -w), bL = b.clone().addScaledVector(side, w), bR = b.clone().addScaledVector(side, -w);
      push(aL, aR, bL, ca, ca, ca); push(aR, bR, bL, ca, ca, ca);
    }
    // leaflets
    const pairs = dead ? 16 : 28;
    for (let k = 0; k < pairs; k++) {
      const u = 0.12 + 0.86 * (k / (pairs - 1));
      const si = Math.min(steps - 1, Math.floor(u * steps)), f = u * steps - si;
      const base = pts[si].clone().lerp(pts[si + 1], f), tn = tans[si].clone().lerp(tans[si + 1], f).normalize();
      const lenL = len * 0.27 * (1 - Math.pow(Math.abs(2 * (u - 0.12) / 0.86 - 1), 1.7) * 0.82) * (0.9 + 0.2 * rnd()) * (dead ? 0.6 : 1);
      for (const sd of [-1, 1]) {
        const beta = 0.55 + 0.35 * rnd() + 0.5 * u * droop * 0.5;
        const dir = new THREE.Vector3().copy(side).multiplyScalar(sd * Math.cos(beta) * 0.9).addScaledVector(UP, -Math.sin(beta) * 0.85).addScaledVector(tn, 0.42 + 0.2 * u).normalize();
        const tip = base.clone().addScaledVector(dir, lenL);
        tip.y -= lenL * 0.12;                                    // tips sag
        const mid = base.clone().addScaledVector(dir, lenL * 0.42);
        const wv = new THREE.Vector3().crossVectors(dir, tn).normalize().multiplyScalar(0.034 + 0.02 * lenL);
        const nl = new THREE.Vector3().crossVectors(wv, dir).normalize().multiplyScalar(-0.018);
        const m1 = mid.clone().add(wv).add(nl), m2 = mid.clone().sub(wv).add(nl);
        const g0 = dead ? 0.18 : 0.55 + 0.2 * rnd();
        col.setRGB(tint[0] * 0.55, tint[1] * 0.55, tint[2] * 0.55); const cb = [col.r, col.g, col.b];
        col.setRGB(tint[0] * (0.8 + g0 * 0.3), tint[1] * (0.8 + g0 * 0.3), tint[2] * (0.8 + g0 * 0.3)); const cm = [col.r, col.g, col.b];
        col.setRGB(tint[0] * 1.15, tint[1] * 1.2, tint[2] * 1.1); const ct = [col.r, col.g, col.b];
        push(base, m1, tip, cb, cm, ct); push(base, tip, m2, cb, ct, cm);
      }
    }
  };
  const tints = [[0.1, 0.27, 0.05], [0.13, 0.31, 0.06], [0.17, 0.32, 0.07], [0.2, 0.33, 0.08]];
  for (let f = 0; f < count; f++) {
    const upper = f < 4;
    const elev = upper ? 1.15 + 0.35 * rnd() : (0.1 + 0.85 * rnd());
    const droop = upper ? 0.5 + 0.3 * rnd() : 0.8 + 0.9 * rnd();
    frond((f / count) * Math.PI * 2 + rnd() * 0.5, elev, 2.7 + 1.0 * rnd() + (upper ? -0.3 : 0), droop, tints[(rnd() * 4) | 0], false);
  }
  for (let f = 0; f < 3; f++) frond(rnd() * 6.28, -0.2 - 0.4 * rnd(), 2.0 + 0.5 * rnd(), 0.9, [0.34, 0.25, 0.1], true);
  // coconuts
  const nuts = [];
  for (let k = 0; k < 6; k++) {
    const a = rnd() * 6.28, sp = new THREE.SphereGeometry(0.1, 8, 6);
    sp.translate(top.x + Math.cos(a) * 0.2, top.y - 0.05 - rnd() * 0.12, top.z + Math.sin(a) * 0.2);
    nuts.push(sp);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.computeVertexNormals();
  const ng = merge(nuts);
  const nc = []; for (let i = 0; i < ng.attributes.position.count; i++) nc.push(0.2, 0.28, 0.08);
  ng.setAttribute('color', new THREE.Float32BufferAttribute(nc, 3));
  const flat = ng.toNonIndexed(); flat.deleteAttribute('uv');
  const crown = merge([geo, flat].map((g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }));
  return crown;
}

// spec: [x, z, height, seed]
export function buildPalms({ aniso = 8 }, specs) {
  const group = new THREE.Group(); group.name = 'palms';
  const colliders = [], trunks = [], crowns = [];
  const bark = makeBark(); setAniso(bark, aniso);
  const trunkMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95, envMapIntensity: 0.3 });
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.55 });
  for (const [x, z, h, seed] of specs) {
    const rnd = mulberry32(seed * 7919 + 13);
    const y0 = terrainH(x, z) - 0.05;
    const a = rnd() * 6.28, lm = (0.05 + 0.1 * rnd());
    const tr = trunkGeometry(rnd, x, y0, z, h, [Math.cos(a) * lm, Math.sin(a) * lm]);
    trunks.push(tr.geo);
    crowns.push(crownGeometry(rnd, tr.top, 15));
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.45, -2, z - 0.45), new THREE.Vector3(x + 0.45, 3, z + 0.45)),
      new THREE.Box3(new THREE.Vector3(tr.top.x - 2.6, tr.top.y - 1.4, tr.top.z - 2.6), new THREE.Vector3(tr.top.x + 2.6, tr.top.y + 1.6, tr.top.z + 2.6)));
  }
  const tm = new THREE.Mesh(merge(trunks), trunkMat); tm.castShadow = true; tm.receiveShadow = true; tm.name = 'palm-trunks'; group.add(tm);
  const cm = new THREE.Mesh(merge(crowns), leafMat); cm.castShadow = true; cm.receiveShadow = true; cm.name = 'palm-crowns'; group.add(cm);
  return { group, colliders };
}
