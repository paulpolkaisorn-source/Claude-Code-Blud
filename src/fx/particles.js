// particles.js — pooled GPU particles and the ring pool. Each pool is one draw call.
// Simulation state is one Float32Array per pool; removal is swap-remove (copyWithin). No per-frame allocation.
import * as THREE from 'three';

export const CAP_HIGH = 2000;      // additive pool (sparks, glow, muzzle, trails), high quality
export const CAP_LOW = 700;        // additive pool, low quality
export const DUST_CAP_HIGH = 900;  // normal-blended pool (dust, smoke, debris, confetti), high quality
export const DUST_CAP_LOW = 300;   // same pool, low quality
export const RING_MAX = 8;

const STRIDE = 16; // px py pz | vx vy vz | r g b a0 | s0 s1 | age life drag grav

let rs = 0x2545f491;
// Deterministic xorshift32 in [0, 1): reproducible runs, no Math.random churn in hot paths.
export function rand() {
  rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5;
  return (rs >>> 0) / 4294967296;
}

const POINT_VERT = `
attribute float aSize;
attribute vec4 aColor;
uniform float uPx;
varying vec4 vColor;
void main() {
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uPx, 1.0, 60.0);
}`;

const POINT_FRAG = `
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float a = 1.0 - r2;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a * a);
}`;

// maxCap sizes the buffers once; setCap() only limits how many may be alive.
// additive: AdditiveBlending (glow) when true, NormalBlending (dust, smoke) when false.
export function createParticlePool(maxCap, additive) {
  const data = new Float32Array(maxCap * STRIDE);
  const pos = new Float32Array(maxCap * 3);
  const col = new Float32Array(maxCap * 4);
  const siz = new Float32Array(maxCap);
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aCol = new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  const aSiz = new THREE.BufferAttribute(siz, 1).setUsage(THREE.DynamicDrawUsage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', aPos);
  geo.setAttribute('aColor', aCol);
  geo.setAttribute('aSize', aSiz);
  const mat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: { uPx: { value: 40 } },
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  let n = 0;
  let cap = maxCap;

  return {
    points,
    floats: data.length + pos.length + col.length + siz.length,
    get count() { return n; },
    get cap() { return cap; },
    setCap(c) { cap = Math.max(0, Math.min(c, maxCap)); if (n > cap) n = cap; },
    clear() { n = 0; geo.setDrawRange(0, 0); points.visible = false; },
    // Returns false when the pool is full (the particle is dropped).
    add(x, y, z, vx, vy, vz, r, g, b, a, s0, s1, life, drag, grav) {
      if (n >= cap) return false;
      const o = n * STRIDE;
      data[o] = x; data[o + 1] = y; data[o + 2] = z;
      data[o + 3] = vx; data[o + 4] = vy; data[o + 5] = vz;
      data[o + 6] = r; data[o + 7] = g; data[o + 8] = b; data[o + 9] = a;
      data[o + 10] = s0; data[o + 11] = s1;
      data[o + 12] = 0; data[o + 13] = life; data[o + 14] = drag; data[o + 15] = grav;
      n++;
      return true;
    },
    // px = device pixels per world tile at the focus; sizes are authored in tiles.
    update(dt, px) {
      mat.uniforms.uPx.value = px;
      let i = 0;
      while (i < n) {
        const o = i * STRIDE;
        const life = data[o + 13];
        const age = data[o + 12] + dt;
        if (age >= life) { // dead: move the last live particle into this slot and re-check it
          n--;
          const s = n * STRIDE;
          data.copyWithin(o, s, s + STRIDE);
          continue;
        }
        const damp = Math.max(0, 1 - data[o + 14] * dt);
        const vx = data[o + 3] * damp;
        const vy = data[o + 4] * damp + data[o + 15] * dt;
        const vz = data[o + 5] * damp;
        const x = data[o] + vx * dt, y = data[o + 1] + vy * dt, z = data[o + 2] + vz * dt;
        data[o] = x; data[o + 1] = y; data[o + 2] = z;
        data[o + 3] = vx; data[o + 4] = vy; data[o + 5] = vz; data[o + 12] = age;
        const t = age / life;
        const p = i * 3, c = i * 4;
        pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
        col[c] = data[o + 6]; col[c + 1] = data[o + 7]; col[c + 2] = data[o + 8];
        col[c + 3] = data[o + 9] * (1 - t);
        siz[i] = data[o + 10] + (data[o + 11] - data[o + 10]) * t;
        i++;
      }
      geo.setDrawRange(0, n);
      points.visible = n > 0;
      if (n > 0) { aPos.needsUpdate = true; aCol.needsUpdate = true; aSiz.needsUpdate = true; }
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

const RING_VERT = `
attribute vec3 aCenter;
attribute vec4 aSpawn;
attribute vec4 aColor;
uniform float uTime;
varying vec2 vLocal;
varying float vR;
varying float vW;
varying float vA;
varying vec4 vCol;
void main() {
  float age = uTime - aSpawn.x;
  float t = clamp(age / max(aSpawn.y, 0.0001), 0.0, 1.0);
  float ease = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);
  vR = aSpawn.z * (0.15 + 0.85 * ease);
  vW = aSpawn.w * (1.0 - 0.6 * t);
  vA = (age >= 0.0 && age < aSpawn.y) ? (1.0 - t) : 0.0;
  float q = aSpawn.z + aSpawn.w;
  vLocal = position.xz * q;
  vCol = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aCenter.x + vLocal.x, aCenter.y, aCenter.z + vLocal.y, 1.0);
}`;

const RING_FRAG = `
varying vec2 vLocal;
varying float vR;
varying float vW;
varying float vA;
varying vec4 vCol;
void main() {
  float e = abs(length(vLocal) - vR) / max(vW, 0.0001);
  float band = 1.0 - smoothstep(0.0, 1.0, e);
  float a = band * band * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol.rgb * vCol.a, a);
}`;

// RING_MAX expanding rings in one Mesh (one draw call). Spawn writes four vertices; the GPU animates the rest.
export function createRingPool() {
  const V = RING_MAX * 4;
  const cornerArr = new Float32Array(V * 3); // corner on x/z in [-1, 1], used as `position`
  const ctrArr = new Float32Array(V * 3);
  const spArr = new Float32Array(V * 4);     // spawnTime, life, radius, width
  const colArr = new Float32Array(V * 4);    // r, g, b, intensity
  const index = new Uint16Array(RING_MAX * 6);
  const corners = [-1, -1, 1, -1, 1, 1, -1, 1];
  for (let k = 0; k < RING_MAX; k++) {
    const b = k * 4;
    for (let v = 0; v < 4; v++) {
      cornerArr[(b + v) * 3] = corners[v * 2];
      cornerArr[(b + v) * 3 + 2] = corners[v * 2 + 1];
    }
    index.set([b, b + 2, b + 1, b, b + 3, b + 2], k * 6); // upward winding: FrontSide, drawn once
  }
  const aCenter = new THREE.BufferAttribute(ctrArr, 3).setUsage(THREE.DynamicDrawUsage);
  const aSpawn = new THREE.BufferAttribute(spArr, 4).setUsage(THREE.DynamicDrawUsage);
  const aColor = new THREE.BufferAttribute(colArr, 4).setUsage(THREE.DynamicDrawUsage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cornerArr, 3));
  geo.setAttribute('aCenter', aCenter);
  geo.setAttribute('aSpawn', aSpawn);
  geo.setAttribute('aColor', aColor);
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;

  const slotStart = new Float64Array(RING_MAX).fill(-1e9);
  const slotLife = new Float64Array(RING_MAX);
  let time = 0;

  function activeCount() {
    let c = 0;
    for (let k = 0; k < RING_MAX; k++) if (time - slotStart[k] < slotLife[k]) c++;
    return c;
  }

  return {
    mesh,
    floats: cornerArr.length + ctrArr.length + spArr.length + colArr.length,
    // Takes a free slot, else recycles the oldest ring. Returns the slot index.
    add(x, y, z, radius, life, width, color, intensity) {
      let pick = -1, oldest = 0, oldestStart = Infinity;
      for (let k = 0; k < RING_MAX; k++) {
        if (time - slotStart[k] >= slotLife[k]) { pick = k; break; }
        if (slotStart[k] < oldestStart) { oldestStart = slotStart[k]; oldest = k; }
      }
      if (pick < 0) pick = oldest;
      slotStart[pick] = time;
      slotLife[pick] = life;
      const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, bl = (color & 255) / 255;
      for (let v = 0; v < 4; v++) {
        const i = pick * 4 + v;
        ctrArr[i * 3] = x; ctrArr[i * 3 + 1] = y; ctrArr[i * 3 + 2] = z;
        spArr[i * 4] = time; spArr[i * 4 + 1] = life; spArr[i * 4 + 2] = radius; spArr[i * 4 + 3] = width;
        colArr[i * 4] = r; colArr[i * 4 + 1] = g; colArr[i * 4 + 2] = bl; colArr[i * 4 + 3] = intensity;
      }
      aCenter.needsUpdate = true; aSpawn.needsUpdate = true; aColor.needsUpdate = true;
      return pick;
    },
    update(dt) {
      time += dt;
      mat.uniforms.uTime.value = time;
      mesh.visible = activeCount() > 0;
    },
    active: activeCount,
    clear() { slotLife.fill(0); mesh.visible = false; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
