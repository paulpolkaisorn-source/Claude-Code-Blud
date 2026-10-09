// Drifting fair-weather cumulus on a distant layer, drawn over the Sky with the same far-plane trick.
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uCover;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float dens(vec2 uv) {
  float base = fbm(uv * 0.55 + vec2(uTime * 0.004, uTime * 0.0015));
  float det = fbm(uv * 2.4 - vec2(uTime * 0.006, 0.0));
  return smoothstep(uCover, uCover + 0.2, base * 0.82 + det * 0.3);
}
void main() {
  vec3 d = normalize(vDir);
  if (d.y < 0.01) discard;
  vec2 uv = d.xz / (d.y + 0.16) * 1.35;
  float c = dens(uv);
  if (c < 0.01) discard;
  vec2 toSun = normalize(uSunDir.xz + 1e-4) * 0.05;
  float c2 = dens(uv + toSun / (d.y + 0.2));
  float lit = clamp(0.55 + (c - c2) * 3.4 + (1.0 - c) * 0.45, 0.0, 1.0);
  float sunFace = pow(max(dot(d, normalize(uSunDir)), 0.0), 6.0);
  vec3 col = mix(uShade, uLit, lit) + uLit * sunFace * 0.35 * (1.0 - c * 0.6);
  float a = smoothstep(0.0, 0.7, c) * smoothstep(0.01, 0.22, d.y);
  gl_FragColor = vec4(col, a * 0.97);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Clouds {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uLit: { value: new THREE.Color(1, 1, 1) },
      uShade: { value: new THREE.Color(0.5, 0.55, 0.62) }, uCover: { value: 0.56 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    this.mesh.scale.setScalar(9000);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -1; this.mesh.name = 'clouds';
  }

  setSun(dir, sunColor, zenith, k) {
    this.uniforms.uSunDir.value.copy(dir);
    const e = Math.max(0.12, Math.min(1, dir.y * 1.6));
    this.uniforms.uLit.value.copy(sunColor).multiplyScalar(1.1 * e + 0.12).lerp(zenith, 0.12);
    this.uniforms.uShade.value.copy(zenith).multiplyScalar(1.1).lerp(new THREE.Color(0.2, 0.24, 0.32), 0.4).multiplyScalar(0.5 + 0.5 * k);
  }

  update(t, camera) {
    this.uniforms.uTime.value = t;
    this.mesh.position.copy(camera.position);
  }
}
