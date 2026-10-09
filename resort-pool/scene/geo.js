// Geometry helpers: a tiny indexed-mesh builder and a box whose UVs are in meters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.i = []; }
  // v: 4 corner points, uv: 4 uv pairs, n: intended normal. Winding is corrected to match n.
  quad(v, uv, n) {
    const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
    const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
    const dot = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2];
    const o = dot >= 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
    const base = this.p.length / 3;
    for (let k = 0; k < 4; k++) {
      const q = v[o[k]], t = uv[o[k]];
      this.p.push(q[0], q[1], q[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(t[0], t[1]);
    }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Quad with per-vertex normals (used by swept profiles).
  quadN(v, uv, ns) {
    const am = [0, 0, 0];
    for (const n of ns) { am[0] += n[0]; am[1] += n[1]; am[2] += n[2]; }
    const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
    const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
    const dot = (ay * bz - az * by) * am[0] + (az * bx - ax * bz) * am[1] + (ax * by - ay * bx) * am[2];
    const o = dot >= 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
    const base = this.p.length / 3;
    for (let k = 0; k < 4; k++) {
      const q = v[o[k]], t = uv[o[k]], n = ns[o[k]];
      this.p.push(q[0], q[1], q[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(t[0], t[1]);
    }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  get empty() { return this.p.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i);
    return g;
  }
}

// BoxGeometry whose UVs run in meters on every face (so repeat = 1 / patch size works).
export function metricBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const face = Math.floor(i / 4);
    const x = pos.getX(i) + w / 2, y = pos.getY(i) + h / 2, z = pos.getZ(i) + d / 2;
    if (face < 2) uv.setXY(i, z, y); else if (face < 4) uv.setXY(i, x, z); else uv.setXY(i, x, y);
  }
  return g;
}

export function scaleUV(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

// Merge geometries after forcing a common attribute set (position, normal, uv; non-indexed or indexed).
export function merge(list) {
  const out = list.map((g) => {
    const c = g.index ? g : g.clone();
    for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) c.deleteAttribute(k);
    if (!c.attributes.uv) c.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    return c;
  });
  return mergeGeometries(out, false);
}

export function xform(g, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
  return g.applyMatrix4(m);
}
