// toon.js — shared cel-shading helpers (Opus-owned; read-only for workers).
// toonMat(): MeshToonMaterial with a shared 3-step gradient. addOutline(): inverted-hull outline child.
// mergeColored(): bake several primitives into ONE vertex-colored, flat-shaded geometry (1 draw call).
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OUTLINE_COLOR } from '../contracts.js';

export const gradientMap = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const matCache = new Map();
// opts: { emissive, emissiveIntensity, transparent, opacity, vertexColors, unique }  (unique:true => never cached)
export function toonMat(color = 0xffffff, opts = {}) {
  const key = opts.unique ? null : `${color}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 1}|${!!opts.transparent}|${opts.opacity ?? 1}|${!!opts.vertexColors}`;
  if (key && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color, gradientMap,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    vertexColors: !!opts.vertexColors,
  });
  if (key) matCache.set(key, m);
  return m;
}

const outlineMats = new Map();
export function outlineMaterial(thickness = 0.04, color = OUTLINE_COLOR) {
  const key = `${thickness}|${color}`;
  let m = outlineMats.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n transformed += normalize(normal) * ${thickness.toFixed(4)};`,
    );
  };
  m.customProgramCacheKey = () => `outline-${key}`;
  outlineMats.set(key, m);
  return m;
}

const outlineGeoCache = new WeakMap();
// Smooth-normal copy of a geometry so the extruded hull has no cracks at hard edges.
export function outlineGeometry(geo) {
  let g = outlineGeoCache.get(geo);
  if (g) return g;
  g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  outlineGeoCache.set(geo, g);
  return g;
}

// Adds the outline as a child of `mesh` (follows its transform/visibility). Returns the outline mesh.
export function addOutline(mesh, thickness = 0.04, color = OUTLINE_COLOR) {
  const o = new THREE.Mesh(outlineGeometry(mesh.geometry), outlineMaterial(thickness, color));
  o.name = 'outline';
  o.castShadow = false;
  o.receiveShadow = false;
  o.raycast = () => {};
  mesh.add(o);
  return o;
}

// Outline for an InstancedMesh: shares the instanceMatrix attribute. Add the result to the same parent and
// keep `outline.count = src.count` whenever you change the source count.
export function addInstancedOutline(src, thickness = 0.04, color = OUTLINE_COLOR) {
  const o = new THREE.InstancedMesh(outlineGeometry(src.geometry), outlineMaterial(thickness, color), src.instanceMatrix.count);
  o.instanceMatrix = src.instanceMatrix;
  o.count = src.count;
  o.name = 'outline';
  o.castShadow = false;
  o.receiveShadow = false;
  o.frustumCulled = src.frustumCulled;
  o.raycast = () => {};
  return o;
}

// parts: [{ geo: BufferGeometry, color: hex, matrix?: Matrix4 }] -> one flat-shaded geometry with a `color` attribute.
// Use with toonMat(0xffffff, { vertexColors: true }).
const _c = new THREE.Color();
export function mergeColored(parts) {
  const list = parts.map(({ geo, color, matrix }) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    g.computeVertexNormals();
    _c.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mergeGeometries(list, false);
}
