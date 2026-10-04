// Geometry helpers. All model units are millimetres; the speaker axis is +Y
// (cone faces +Y). Angles use a "front view clock" convention: theta = 0 is
// 12 o'clock when looking at the cone, increasing clockwise, so the unit
// radial direction is (sin(theta), 0, -cos(theta)).

import * as THREE from 'three';

export const TAU = Math.PI * 2;
// Global level-of-detail multiplier for tessellation (tools use < 1 for speed).
export const LOD = { scale: 1 };
const seg = (n, exact) => (exact ? n : Math.max(6, Math.round(n * LOD.scale)));
export const DEG = Math.PI / 180;

export function radial(theta) {
  return new THREE.Vector3(Math.sin(theta), 0, -Math.cos(theta));
}

// Polyline with optional per-vertex fillets: pts = [[r, y, radius?], ...].
// radius > 0 rounds that corner with a true circular arc; radius === 0 keeps a
// hard edge (the vertex is emitted twice so normals split there).
export function fillet(pts, samplesPerArc = 8) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, rad = 0] = pts[i];
    const prev = pts[i - 1];
    const next = pts[i + 1];
    if (!prev || !next) {
      out.push([x, y]);
      continue;
    }
    if (rad <= 0) {
      out.push([x, y], [x, y]);
      continue;
    }
    let ax = x - prev[0], ay = y - prev[1];
    let bx = next[0] - x, by = next[1] - y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    ax /= la; ay /= la; bx /= lb; by /= lb;
    const cos = Math.min(1, Math.max(-1, ax * bx + ay * by));
    const turn = Math.acos(cos);
    if (turn < 1e-4) {
      out.push([x, y]);
      continue;
    }
    const tl = Math.min(rad * Math.tan(turn / 2), la * 0.5, lb * 0.5);
    const r = tl / Math.tan(turn / 2);
    const sx = x - ax * tl, sy = y - ay * tl;
    const ex = x + bx * tl, ey = y + by * tl;
    // centre lies along the inward normal of the incoming segment
    const cross = ax * by - ay * bx;
    const nx = cross > 0 ? -ay : ay;
    const ny = cross > 0 ? ax : -ax;
    const cx = sx + nx * r, cy = sy + ny * r;
    let a0 = Math.atan2(sy - cy, sx - cx);
    let a1 = Math.atan2(ey - cy, ex - cx);
    let da = a1 - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    for (let k = 0; k <= samplesPerArc; k++) {
      const a = a0 + (da * k) / samplesPerArc;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return out;
}

// Surface of revolution around +Y. `profile` is [[r, y], ...]; traverse it
// clockwise in the (r right, y up) plane so that normals face outward
// (a repeated point marks a hard edge). UV: u = turns (0..1 over the sweep),
// v = arc length along the profile in mm.
export function lathe(profile, opts = {}) {
  const { thetaStart = 0, thetaLength = TAU, flip = false, exact = false } = opts;
  const segments = seg(opts.segments ?? 128, exact);
  // per-point 2D normals, split at duplicated points
  const n = profile.length;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = profile[i + 1][0] - profile[i][0];
    const dy = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dr, dy);
    segN.push(l < 1e-9 ? null : [-dy / l, dr / l]);
  }
  const pts = []; // {r, y, nr, ny, s}
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) s += Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]);
    const before = i > 0 ? segN[i - 1] : null;
    const after = i < n - 1 ? segN[i] : null;
    let nr, ny;
    if (before && after) {
      nr = before[0] + after[0];
      ny = before[1] + after[1];
    } else if (after) {
      [nr, ny] = after;
    } else if (before) {
      [nr, ny] = before;
    } else {
      // duplicated point: take the neighbour segment on the side we belong to
      const isFirstOfPair = i < n - 1 && segN[i] === null;
      const ref = isFirstOfPair ? segN[i - 1] : segN[i];
      [nr, ny] = ref || [1, 0];
    }
    const l = Math.hypot(nr, ny) || 1;
    pts.push({ r: profile[i][0], y: profile[i][1], nr: (nr / l) * (flip ? -1 : 1), ny: (ny / l) * (flip ? -1 : 1), s });
  }
  // when a point is duplicated, each copy must use only its own side's segment
  for (let i = 0; i < n - 1; i++) {
    if (segN[i] === null) {
      const b = segN[i - 1], a = segN[i + 1];
      if (b) { pts[i].nr = b[0] * (flip ? -1 : 1); pts[i].ny = b[1] * (flip ? -1 : 1); }
      if (a) { pts[i + 1].nr = a[0] * (flip ? -1 : 1); pts[i + 1].ny = a[1] * (flip ? -1 : 1); }
    }
  }

  const cols = segments + 1;
  const pos = new Float32Array(n * cols * 3);
  const nor = new Float32Array(n * cols * 3);
  const uv = new Float32Array(n * cols * 2);
  for (let k = 0; k < cols; k++) {
    const u = k / segments;
    const th = thetaStart + u * thetaLength;
    const sx = Math.sin(th), cz = -Math.cos(th);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const idx = k * n + i;
      pos[idx * 3] = p.r * sx;
      pos[idx * 3 + 1] = p.y;
      pos[idx * 3 + 2] = p.r * cz;
      nor[idx * 3] = p.nr * sx;
      nor[idx * 3 + 1] = p.ny;
      nor[idx * 3 + 2] = p.nr * cz;
      uv[idx * 2] = (u * thetaLength) / TAU;
      uv[idx * 2 + 1] = p.s;
    }
  }
  const index = [];
  for (let k = 0; k < segments; k++) {
    for (let i = 0; i < n - 1; i++) {
      const a = k * n + i, b = k * n + i + 1, c = (k + 1) * n + i + 1, d = (k + 1) * n + i;
      if (pts[i].r < 1e-6 && pts[i + 1].r < 1e-6) continue;
      index.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  fixWinding(g);
  return g;
}

// Make triangle winding agree with the stored normals (front faces outward).
export function fixWinding(g) {
  const idx = g.index.array;
  const p = g.attributes.position.array;
  const nrm = g.attributes.normal.array;
  let agree = 0;
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    v0.fromArray(p, idx[t] * 3); v1.fromArray(p, idx[t + 1] * 3); v2.fromArray(p, idx[t + 2] * 3);
    e1.subVectors(v1, v0); e2.subVectors(v2, v0); fn.crossVectors(e1, e2);
    const len = fn.length();
    if (len < 1e-9) continue;
    const dot = fn.x * nrm[idx[t] * 3] + fn.y * nrm[idx[t] * 3 + 1] + fn.z * nrm[idx[t] * 3 + 2];
    agree += dot > 0 ? 1 : -1;
  }
  if (agree < 0) {
    for (let t = 0; t < idx.length; t += 3) {
      const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp;
    }
    g.index.needsUpdate = true;
  }
  return g;
}

// Build an indexed grid surface from a function f(i, j) -> [x, y, z]
// (rows i along the path, cols j around a closed or open loop).
export function gridSurface(rows, cols, f, { closedCols = false, closedRows = false } = {}) {
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const v = f(i, j);
      const k = i * cols + j;
      pos[k * 3] = v[0]; pos[k * 3 + 1] = v[1]; pos[k * 3 + 2] = v[2];
      uv[k * 2] = j / (cols - (closedCols ? 0 : 1));
      uv[k * 2 + 1] = i / (rows - 1);
    }
  }
  const index = [];
  const rmax = closedRows ? rows : rows - 1;
  const cmax = closedCols ? cols : cols - 1;
  for (let i = 0; i < rmax; i++) {
    for (let j = 0; j < cmax; j++) {
      const a = i * cols + j;
      const b = i * cols + ((j + 1) % cols);
      const c = ((i + 1) % rows) * cols + ((j + 1) % cols);
      const d = ((i + 1) % rows) * cols + j;
      index.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// Rounded rectangle / trapezoid loop sampled as [a, n] pairs. Corners listed
// clockwise; each gets the same fillet radius.
export function roundedLoop(corners, radius, samples = 6) {
  const pts = [];
  const m = corners.length;
  for (let i = 0; i < m; i++) {
    const p = corners[i];
    const prev = corners[(i - 1 + m) % m];
    const next = corners[(i + 1) % m];
    const tri = fillet([prev, [p[0], p[1], radius], next], samples);
    // drop the neighbour endpoints, keep only the arc
    for (let k = 1; k < tri.length - 1; k++) pts.push(tri[k]);
  }
  return pts;
}

// Disc / annulus-sector shape in the XZ plane, extruded along +Y, returned as
// geometry whose front cap faces +Y. Shape coordinates map to front-view
// screen coordinates (x right, y up).
export function extrudeShapeY(shape, depth, bevel = 0, { curveSegments = 96, bevelSegments = 4 } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
  });
  // ExtrudeGeometry extrudes along +Z; rotate so +Z -> +Y and shape +Y -> -Z
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.max.y, 0); // front cap at y = 0
  return g;
}

// Circle as an explicit polygon (ExtrudeGeometry would otherwise tessellate
// every hole with 2 * curveSegments points).
export function circlePoly(cx, cy, r, n = 32, path = new THREE.Path()) {
  const m = seg(n);
  path.moveTo(cx + r, cy);
  for (let i = 1; i < m; i++) path.lineTo(cx + r * Math.cos((i / m) * TAU), cy + r * Math.sin((i / m) * TAU));
  path.closePath();
  return path;
}

// Position + orient an object so that its local +Y points along `normal`.
export function placeAlong(obj, position, normal) {
  obj.position.copy(position);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
  return obj;
}
