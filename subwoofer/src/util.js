import * as THREE from 'three';
import { toCreasedNormals, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** Deterministic PRNG so the model (and exported GLB) is identical on every build. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Sample a polyline described by [[r,z],...] with a Catmull-Rom spline, returning `n` points.
 */
export function splineProfile(points, n, tension = 0.5) {
  const v = points.map(([r, z]) => new THREE.Vector2(r, z));
  const curve = new THREE.SplineCurve(v);
  return curve.getSpacedPoints(n).map((p) => [p.x, p.y]);
}

/**
 * Surface of revolution around the Z axis. Profile is [[r,z],...]; the outward normal is on the
 * LEFT of the direction of travel (inner->outer on a front-facing surface gives +Z).
 * uvMode: 'cyl' (u = angle, v = arc length in inches), 'planar' (front projection, 0..1 over +-uvR)
 */
export function latheZ(profile, { segments = 128, crease = 35, uvMode = 'cyl', uvR = 8, phi0 = 0, phiLen = TAU, vScale = 1, vZ = null } = {}) {
  const rings = profile.length;
  const cols = segments + 1;
  const pos = new Float32Array(rings * cols * 3);
  const uv = new Float32Array(rings * cols * 2);
  const arc = [0];
  for (let i = 1; i < rings; i++) {
    arc.push(arc[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
  }
  for (let i = 0; i < rings; i++) {
    const [r, z] = profile[i];
    for (let j = 0; j < cols; j++) {
      const a = phi0 + (phiLen * j) / segments;
      const k = i * cols + j;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      if (uvMode === 'planar') {
        uv[k * 2] = x / (2 * uvR) + 0.5;
        uv[k * 2 + 1] = y / (2 * uvR) + 0.5;
      } else {
        uv[k * 2] = j / segments;
        uv[k * 2 + 1] = vZ ? (z - vZ[1]) / (vZ[0] - vZ[1]) : arc[i] * vScale;
      }
    }
  }
  const idx = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const A = i * cols + j;
      const B = A + 1;
      const C = A + cols;
      const D = C + 1;
      // skip degenerate rows (zero length)
      if (arc[i + 1] - arc[i] < 1e-9) continue;
      idx.push(A, C, B, B, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return finishGeometry(g, crease);
}

/** Convert to creased smooth normals and re-index to keep files small. */
export function finishGeometry(g, crease = 35) {
  let out = g.index ? g : g;
  out = toCreasedNormals(out, crease * DEG);
  out.deleteAttribute('uv1');
  out = mergeVertices(out, 1e-5);
  const nrm = out.attributes.normal;
  for (let i = 0; i < nrm.count; i++) {
    const l = Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i)) || 1;
    nrm.setXYZ(i, nrm.getX(i) / l, nrm.getY(i) / l, nrm.getZ(i) / l);
  }
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** Merge several geometries (must all have position/normal/uv, indexed or not). */
export function mergeGeos(list) {
  const nonIdx = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = nonIdx.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of nonIdx) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const out = mergeVertices(m, 1e-5);
  const nrm = out.attributes.normal;
  for (let i = 0; i < nrm.count; i++) {
    const l = Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i)) || 1;
    nrm.setXYZ(i, nrm.getX(i) / l, nrm.getY(i) / l, nrm.getZ(i) / l);
  }
  return out;
}

/**
 * Parametric grid surface. posFn(u,v) -> THREE.Vector3 for u,v in [0,1].
 * Triangle winding follows (du x dv).
 */
export function gridSurface(nu, nv, posFn, { uvFn = null, crease = 40, flip = false } = {}) {
  const cols = nu + 1;
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const v = j / nv;
      const p = posFn(u, v);
      const k = j * cols + i;
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      if (uvFn) {
        const t = uvFn(u, v, p);
        uv[k * 2] = t[0];
        uv[k * 2 + 1] = t[1];
      } else {
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
      }
    }
  }
  const idx = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const A = j * cols + i;
      const B = A + 1;
      const C = A + cols;
      const D = C + 1;
      if (flip) idx.push(A, B, C, B, D, C);
      else idx.push(A, C, B, B, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return finishGeometry(g, crease);
}

/** Rewrite UVs as a front-on planar projection: u = x/(2R)+.5, v = y/(2R)+.5 */
export function planarUV(g, R, cx = 0, cy = 0) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - cx) / (2 * R) + 0.5;
    uv[i * 2 + 1] = (p.getY(i) - cy) / (2 * R) + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Annulus / disc with optional holes, extruded along +Z from z0 to z0+depth. */
export function ringShape(rOut, rIn, holes = []) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, 0, TAU, false);
  if (rIn > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, rIn, 0, TAU, true);
    s.holes.push(h);
  }
  for (const { x, y, r } of holes) {
    const h = new THREE.Path();
    h.absarc(x, y, r, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}

export function extrudeZ(shape, depth, { z0 = 0, bevel = 0, bevelSegs = 2, curveSegs = 96, crease = 30 } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
    steps: 1,
  });
  g.translate(0, 0, z0 + bevel);
  return finishGeometry(g, crease);
}

/** Cylinder along Z. */
export function cylZ(r, h, { z0 = 0, seg = 32, rTop = r } = {}) {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1);
  g.rotateX(Math.PI / 2); // Y axis -> Z axis
  g.translate(0, 0, z0 + h / 2);
  return g;
}

export function mesh(geo, mat, name) {
  const m = new THREE.Mesh(geo, mat);
  if (name) m.name = name;
  return m;
}

export function cyl(p0, p1, r, seg = 16, rEnd = r) {
  const a = new THREE.Vector3(...p0);
  const b = new THREE.Vector3(...p1);
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(rEnd, r, len, seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
