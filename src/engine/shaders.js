import * as THREE from 'three';

// Shared light-ripple uniform: up to 6 expanding rings, each vec4(x, z, age 0..1, strength).
export const RIPPLE_COUNT = 6;
export function makeRippleUniform() {
  return { value: Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4(0, 0, 1, 0)) };
}

// Adds expanding light rings across a horizontal surface (emissive, so bloom picks them up).
export function patchRipples(material, rippleUniform, tint = [1.0, 0.82, 0.6], gain = 0.35) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRipples = rippleUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRippleWP;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n vRippleWP = (modelMatrix * vec4(transformed, 1.0)).xz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec4 uRipples[${RIPPLE_COUNT}];
varying vec2 vRippleWP;`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
 vec3 rippleAcc = vec3(0.0);
 for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
   vec4 r = uRipples[i];
   if (r.w <= 0.0) continue;
   float front = r.z * 3.2;
   float d = distance(vRippleWP, r.xy);
   float ring = exp(-pow((d - front) / 0.14, 2.0));
   float fade = (1.0 - r.z) * smoothstep(0.0, 0.08, r.z);
   rippleAcc += vec3(${tint.join(',')}) * ring * fade * r.w;
 }
 totalEmissiveRadiance += rippleAcc * ${gain.toFixed(3)};`
      );
  };
  material.customProgramCacheKey = () => 'ripple-' + tint.join('-');
  return material;
}

// Sand cuts: each cut is a wire-slot segment at depth uSegZ[i], spanning x from uSegX0[i]
// to uSegX1[i]. Fragments inside a jagged band around that slot are discarded.
export const SLIT_MAX = 8;
export function makeSlitUniforms() {
  return {
    uSegZ: { value: new Array(SLIT_MAX).fill(0) },
    uSegX0: { value: new Array(SLIT_MAX).fill(0) },
    uSegX1: { value: new Array(SLIT_MAX).fill(0) },
    uSegN: { value: 0 },
  };
}

export function patchSlits(material, u) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uSegZ[${SLIT_MAX}];
uniform float uSegX0[${SLIT_MAX}];
uniform float uSegX1[${SLIT_MAX}];
uniform int uSegN;
varying vec3 vLocal;`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
 for (int i = 0; i < ${SLIT_MAX}; i++) {
   if (i >= uSegN) break;
   float jag = 0.012 + 0.007 * sin(vLocal.x * 38.0 + float(i) * 2.1) * sin(vLocal.y * 27.0 + float(i));
   float x0 = min(uSegX0[i], uSegX1[i]) - 0.01;
   float x1 = max(uSegX0[i], uSegX1[i]) + 0.01;
   if (abs(vLocal.z - uSegZ[i]) < jag && vLocal.x > x0 && vLocal.x < x1) discard;
 }`
      );
  };
  material.customProgramCacheKey = () => 'slits-v2';
  return material;
}

// Slime: wobble, pokes and a grab-and-stretch pull, all in the vertex shader; plus fake
// subsurface rim glow in the fragment shader.
export function makeSlimeUniforms() {
  return {
    uTime: { value: 0 },
    uBreath: { value: 1 },
    uGrab: { value: new THREE.Vector3() },
    uGrabAmt: { value: 0 },
    uGrabFall: { value: 4 },
    uPokePos: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
    uPokeAmt: { value: [0, 0, 0, 0] },
    uSSS: { value: new THREE.Color(0.35, 0.95, 0.7) },
  };
}

export function patchSlime(material, u) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform float uBreath;
uniform vec3 uGrab;
uniform float uGrabAmt;
uniform float uGrabFall;
uniform vec3 uPokePos[4];
uniform float uPokeAmt[4];`
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 p = position;
 float wob = sin(p.x * 3.1 + uTime * 1.7) * 0.5 + sin(p.y * 2.7 - uTime * 1.3) * 0.5 + sin(p.z * 3.7 + uTime * 1.1) * 0.5;
 p += normalize(position) * wob * 0.03 * uBreath;
 for (int i = 0; i < 4; i++) {
   if (uPokeAmt[i] <= 0.0) continue;
   vec3 pp = uPokePos[i];
   float f = exp(-dot(p - pp, p - pp) * 9.0);
   p -= normalize(pp + vec3(0.0, 0.0001, 0.0)) * f * uPokeAmt[i] * 0.35;
 }
 float pull = exp(-dot(p - uGrab, p - uGrab) * uGrabFall) * uGrabAmt;
 p = mix(p, uGrab, pull * 0.85);
 vec3 transformed = p;`
      );
  };
  material.customProgramCacheKey = () => 'slime';
  return material;
}

export function patchSlimeSSS(material) {
  material.onBeforeCompile = ((prev) => (shader) => {
    prev(shader);
    shader.uniforms.uSSS = shader.uniforms.uSSS || { value: new THREE.Color(0.35, 0.95, 0.7) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSSS;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
 float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
 totalEmissiveRadiance += uSSS * (0.05 + 0.45 * rim);`
      );
  })(material.onBeforeCompile);
  material.customProgramCacheKey = () => 'slime-sss';
  return material;
}
