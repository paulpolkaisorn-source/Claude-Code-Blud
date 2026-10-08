import * as THREE from 'three';
import { fbm2 } from './noise.js';

// Builds a Float32 height field of size*size, values roughly 0..1.
// stretchX/stretchY make streaks (wood grain) or fine grains (sand) cheaply.
export function heightField(size, { scale = 4, stretchX = 1, stretchY = 1, octaves = 5, seed = 0, warp = 0 } = {}) {
  const h = new Float32Array(size * size);
  const ox = seed * 13.1;
  const oy = seed * 7.7;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let px = u * scale * stretchX + ox;
      let py = v * scale * stretchY + oy;
      if (warp) {
        px += fbm2(u * 3 + oy, v * 3, 3) * warp;
        py += fbm2(u * 3, v * 3 + ox, 3) * warp;
      }
      h[y * size + x] = fbm2(px, py, octaves);
    }
  }
  return h;
}

// Tileable normal map from a height field (wrap-around differences). Returns RGBA DataTexture.
export function normalMapFromHeight(h, size, strength = 2) {
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Grayscale roughness map (green channel read by three.js). base..base+range.
export function roughnessMapFromHeight(h, size, base = 0.5, range = 0.3) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const r = Math.max(0, Math.min(1, base + (h[i] - 0.5) * range)) * 255;
    data[i * 4] = 255;
    data[i * 4 + 1] = r;
    data[i * 4 + 2] = r;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Colour map blended between two sRGB colours (arrays of 0..1 floats) by height.
export function colorMapFromHeight(h, size, colA, colB, jitter = 0) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const t = Math.max(0, Math.min(1, h[i] + (Math.random() - 0.5) * jitter));
    for (let c = 0; c < 3; c++) {
      data[i * 4 + c] = (colA[c] + (colB[c] - colA[c]) * t) * 255;
    }
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Soft round sprite used by dust motes and sand grains.
export function softDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft dark radial decal, used for contact shadows under the slime.
export function contactShadowTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.9)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
