// Sky Lanterns — 3D (Three.js) with bloom. A calm night lake under a huge starry sky.
// Tap (or press and hold) to light a paper lantern and let it drift up into the stars.
//  - one real planar reflection (Reflector) of the sky, mountains and every lantern, rippled by a custom water shader
//  - every lantern, flame, halo and ring is instanced: a handful of draw calls for 150 lanterns
//  - all sound is synthesized: match strike, flame "fwoomp", paper crinkle, pentatonic bells, lake, wind, crickets

import { THREE, createStage, Sparkles } from '../three-base.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createLoop, track, rand, randInt, clamp, lerp, pick, midiToFreq, pentatonic, mulberry32 } from '../util.js';
import { Pad } from '../audio.js';

const GLYPHS = 6; // paper symbol variants in the atlas
const REF_Y = 0; // lake surface height
const MOON = new THREE.Vector3(-0.2025, 0.225, -0.953).normalize();

const sm01 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const srgb = (r, g, b) => { const c = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace); return [c.r, c.g, c.b]; };

// lantern paper tints (sRGB in, linear out)
const PAL = [
  [srgb(1.0, 0.76, 0.32), srgb(1.0, 0.62, 0.22), srgb(1.0, 0.84, 0.5)], // gold / amber
  [srgb(1.0, 0.46, 0.58), srgb(1.0, 0.58, 0.64), srgb(1.0, 0.4, 0.5)], // rose
  [srgb(0.74, 0.6, 1.0), srgb(0.62, 0.68, 1.0), srgb(0.88, 0.58, 0.96)], // lavender
];

// ---------------------------------------------------------------- GLSL
const NOISE_GLSL = /* glsl */ `
float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03+7.1; a *= 0.5; } return s; }
`;

const DOME_VS = /* glsl */ `
varying vec3 vDir;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = w.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const DOME_FS = /* glsl */ `
precision highp float;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uMoon; uniform float uTime;
varying vec3 vDir;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir);
  float t = max(d.y, 0.0);
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.2, t));
  col = mix(col, uTop, smoothstep(0.16, 0.9, t));
  col = mix(col, uHor * 0.55, smoothstep(0.0, -0.2, d.y));
  float mAz = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), normalize(vec3(uMoon.x, 0.0, uMoon.z))), 0.0);
  col += vec3(0.13, 0.08, 0.19) * pow(1.0 - t, 7.0) * (0.35 + 0.65 * mAz);
  #ifdef MILKY
  vec3 mn = normalize(vec3(0.62, 0.5, -0.6));
  float band = exp(-pow(dot(d, mn) * 3.4, 2.0));
  if (band > 0.03 && t > 0.03) {
    float cl = fbm(d * 5.0 + 3.0);
    float cl2 = fbm(d * 13.0 + 9.0);
    float lane = smoothstep(0.35, 0.7, fbm(d * 7.0 + 21.0));
    col += vec3(0.075, 0.095, 0.2) * band * (0.25 + cl * 1.0) * (1.0 - lane * 0.55) * smoothstep(0.03, 0.4, t);
    col += vec3(0.09, 0.085, 0.14) * band * band * cl2 * 0.9 * smoothstep(0.03, 0.4, t);
  }
  #endif
  #ifdef DUST
  vec3 sc = d * 480.0;
  vec3 ic = floor(sc);
  vec3 fc = fract(sc) - 0.5;
  float hh = h31(ic);
  vec3 off = vec3(h31(ic + 3.1), h31(ic + 7.7), h31(ic + 11.3)) - 0.5;
  float sd = length(fc - off * 0.6);
  float st = step(0.985, hh) * smoothstep(0.34, 0.0, sd) * smoothstep(0.02, 0.3, t);
  st *= 0.55 + 0.45 * sin(uTime * (1.0 + hh * 3.0) + hh * 80.0);
  col += vec3(0.6, 0.72, 1.0) * st * (0.35 + 0.8 * fract(hh * 91.7));
  #endif
  // the moon
  float md = dot(d, uMoon);
  float ang = acos(clamp(md, -1.0, 1.0));
  float R = 0.052;
  vec3 mT = normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)));
  vec3 mB = cross(mT, uMoon);
  vec2 mp = vec2(dot(d, mT), dot(d, mB)) / R;
  float mr = length(mp);
  float disc = 1.0 - smoothstep(0.965, 1.0, mr);
  if (mr < 1.02) {
    float limb = sqrt(max(1.0 - mr * mr, 0.0));
    float maria = fbm(vec3(mp * 1.9, 3.7));
    float crater = vnoise(vec3(mp * 7.0, 1.3));
    vec3 mcol = mix(vec3(0.5, 0.52, 0.6), vec3(1.0, 0.95, 0.82), smoothstep(0.34, 0.6, maria));
    mcol *= 0.82 + 0.3 * crater;
    mcol *= 0.5 + 0.65 * limb;
    col = mix(col, mcol * 0.95, disc);
  }
  float g1 = exp(-ang * ang / (0.012 * 0.012));
  float g2 = exp(-ang * ang / (0.07 * 0.07));
  float g3 = exp(-ang * ang / (0.26 * 0.26));
  col += vec3(1.0, 0.92, 0.75) * (g1 * 0.16 + g2 * 0.05) + vec3(0.42, 0.5, 0.9) * g3 * 0.03;
  float ring = exp(-pow((ang - 0.2) / 0.02, 2.0)) * 0.006;
  col += vec3(0.7, 0.75, 1.0) * ring;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const STAR_VS = /* glsl */ `
attribute float aSize; attribute vec3 aColor; attribute float aPh;
uniform float uTime; uniform float uPx;
varying vec3 vC; varying float vA;
void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  float tw = 0.62 + 0.38 * sin(uTime * (0.7 + aPh * 1.9) + aPh * 40.0);
  vec3 dir = normalize(position);
  vA = tw * smoothstep(0.0, 0.09, dir.y);
  vC = aColor;
  gl_PointSize = aSize * uPx;
}`;
const STAR_FS = /* glsl */ `
precision highp float;
uniform float uBoost;
varying vec3 vC; varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = exp(-r2 * 9.0) + 0.35 * exp(-r2 * 2.6);
  a *= vA;
  if (a < 0.01) discard;
  vec3 c = vC * a;
  #ifdef NO_COMPOSER
  c *= 1.5;
  #endif
  gl_FragColor = vec4(c, 1.0);
}`;

const WATER_VS = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv; varying vec3 vWorld;
void main(){
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WATER_FS = /* glsl */ `
precision highp float;
uniform vec3 color; uniform sampler2D tDiffuse;
uniform float uTime; uniform float uWind; uniform float uBlur;
uniform vec3 uHaze; uniform vec3 uDeep; uniform vec3 uMoon;
uniform vec4 uRings[6];
varying vec4 vUv; varying vec3 vWorld;
${NOISE_GLSL}
vec2 waveGrad(vec2 p, float t, float lod){
  vec2 g = vec2(0.0);
  g += vec2( 0.92, 0.38) * cos(dot(p, vec2( 0.92, 0.38)) * 1.7 + t * 0.9) * 1.7 * 0.60;
  g += vec2(-0.55, 0.83) * cos(dot(p, vec2(-0.55, 0.83)) * 2.9 + t * 1.1) * 2.9 * 0.34;
  g += vec2( 0.31,-0.95) * cos(dot(p, vec2( 0.31,-0.95)) * 4.7 + t * 1.5) * 4.7 * 0.22 * lod;
  g += vec2(-0.97,-0.22) * cos(dot(p, vec2(-0.97,-0.22)) * 7.9 + t * 1.9) * 7.9 * 0.12 * lod;
  g += vec2( 0.71, 0.71) * cos(dot(p, vec2( 0.71, 0.71)) * 13.0 + t * 2.3) * 13.0 * 0.055 * lod;
  return g;
}
void main(){
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  float lod = 1.0 - smoothstep(12.0, 70.0, dist);
  vec2 g = waveGrad(vWorld.xz, uTime, lod) * (0.22 + 0.78 * uWind);
  for (int i = 0; i < 6; i++) {
    vec4 r = uRings[i];
    float age = uTime - r.z;
    if (r.w > 0.0 && age > 0.0 && age < 8.0) {
      vec2 dv = vWorld.xz - r.xy;
      float d = length(dv);
      float w = d - age * 1.35;
      float env = exp(-w * w * 1.6) * exp(-age * 0.5) * r.w;
      g += dv / max(d, 0.001) * cos(w * 7.0) * env * 5.0;
    }
  }
  float s = 0.014 / (1.0 + dist * 0.1);
  vec4 uvp = vUv;
  uvp.xy += vec2(g.x + g.y * 0.25, g.y * 0.4) * s * uvp.w;
  vec3 refl = vec3(0.0);
  float ws = 0.0;
  float bl = uBlur * (0.4 + 0.6 * smoothstep(4.0, 30.0, dist));
  for (int i = -BLUR_TAPS; i <= BLUR_TAPS; i++) {
    float fi = float(i);
    float wt = exp(-fi * fi * 0.28);
    vec4 q = uvp;
    q.y += fi * bl * uvp.w;
    refl += texture2D(tDiffuse, q.xy / q.w).rgb * wt;
    ws += wt;
  }
  refl /= ws;
  vec3 N = normalize(vec3(-g.x * 0.07, 1.0, -g.y * 0.07));
  float cosv = clamp(dot(N, V), 0.0, 1.0);
  float fres = mix(0.2, 1.0, pow(1.0 - cosv, 3.0));
  vec3 col = mix(uDeep, refl, fres);
  // tiny moon glints riding the ripples
  vec3 R = reflect(-V, N);
  float gl = pow(max(dot(R, uMoon), 0.0), 900.0) * 4.0 * lod;
  col += vec3(1.0, 0.92, 0.75) * gl * (0.5 + uWind);
  // soft mist lying on the far water
  float fogA = smoothstep(34.0, 190.0, dist);
  float mist = 0.7 + 0.3 * vnoise(vec3(vWorld.xz * 0.05 + uTime * 0.01, 1.0));
  col = mix(col, uHaze, fogA * 0.78 * mist);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const BODY_VS = /* glsl */ `
attribute vec3 aColor; attribute vec4 aMisc;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec4 vMisc;
void main(){
  vUv = uv; vCol = aColor; vMisc = aMisc;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const BODY_FS = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform float uRows;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec4 vMisc;
void main(){
  float v = vUv.y;
  vec2 auv = vec2(vUv.x, 1.0 - (vMisc.x + 1.0 - clamp(v, 0.004, 0.996)) / uRows);
  vec3 paper = texture2D(uMap, auv).rgb;
  vec3 N = normalize(vN);
  vec3 Vn = normalize(vV);
  float light = vMisc.y;
  float hot = exp(-pow((v - 0.2) * 3.2, 2.0));
  vec3 col;
  if (gl_FrontFacing) {
    float ndv = abs(dot(N, Vn));
    float rim = pow(1.0 - ndv, 2.2);
    float zone = mix(1.25, 0.5, smoothstep(0.12, 1.0, v)) * (0.78 + 0.35 * smoothstep(0.0, 0.18, v));
    float I = (zone + hot * 0.65) * light;
    col = vCol * paper * I * 0.95;
    col = mix(col, col * vCol * 1.9, rim * 0.55);
    col *= 1.0 + rim * 0.35;
    col += vec3(1.0, 0.84, 0.55) * hot * 0.22 * light * paper.r;
    col += paper * vec3(0.045, 0.055, 0.1) * (1.0 - light);
  } else {
    // the glowing inner wall, glimpsed through the open bottom
    col = vCol * (0.9 + hot * 2.4) * light * 1.7 + vec3(1.0, 0.8, 0.5) * hot * 0.5 * light;
  }
  gl_FragColor = vec4(col, vMisc.z);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const RING_VS = /* glsl */ `
attribute vec3 aColor; attribute vec4 aMisc;
varying float vL; varying float vA; varying vec3 vC;
void main(){
  vL = aMisc.y; vA = aMisc.z; vC = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const RING_FS = /* glsl */ `
precision highp float;
varying float vL; varying float vA; varying vec3 vC;
void main(){
  vec3 col = vec3(0.34, 0.19, 0.07) * (0.18 + 1.9 * vL) + vC * 0.3 * vL;
  gl_FragColor = vec4(col, vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const GLOW_VS = /* glsl */ `
attribute vec3 aPos; attribute vec2 aSize; attribute vec4 aCol; attribute vec3 aKind;
varying vec2 vP; varying vec4 vCol; varying vec3 vKind;
void main(){
  vec4 mv = viewMatrix * vec4(aPos, 1.0);
  mv.z += aKind.y;
  mv.xy += position.xy * aSize;
  vP = position.xy; vCol = aCol; vKind = aKind;
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FS = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vP; varying vec4 vCol; varying vec3 vKind;
void main(){
  float r2 = dot(vP, vP);
  float a;
  vec3 c = vCol.rgb;
  if (vKind.x < 0.5) {
    float r = sqrt(r2);
    a = exp(-r2 * 7.5) * 0.85 + exp(-r2 * 2.4) * 0.34;
    a *= 1.0 - smoothstep(0.72, 1.0, r);
  } else if (vKind.x < 1.5) {
    float y = vP.y * 0.5 + 0.5;
    float sway = sin(uTime * 12.0 + vKind.z * 6.0 + y * 5.0) * 0.1 * y + sin(uTime * 7.3 + vKind.z * 3.1) * 0.06 * y;
    float x = vP.x - sway;
    float w = pow(max(1.0 - y, 0.0), 0.75) * (0.3 + 0.7 * smoothstep(0.0, 0.3, y));
    float d = abs(x) / max(w * 0.8, 0.03);
    float body = smoothstep(1.0, 0.25, d) * smoothstep(1.0, 0.82, y) * smoothstep(0.0, 0.06, y);
    float core = smoothstep(0.6, 0.0, d) * smoothstep(0.68, 0.05, y);
    c = mix(c, vec3(1.0, 0.95, 0.8), core * 0.85);
    a = body * 0.95 + core * 0.7;
  } else {
    a = exp(-r2 * 2.6) * (1.0 - smoothstep(0.55, 1.0, sqrt(r2)));
  }
  a *= vCol.a;
  if (a < 0.002) discard;
  vec3 o = c * a;
  #ifdef NO_COMPOSER
  if (vKind.x < 1.5) o *= 1.7;
  #endif
  gl_FragColor = vec4(o, 1.0);
}`;

const REED_VS = /* glsl */ `
attribute float aBend; attribute float aPh;
uniform float uTime; uniform float uWind;
varying float vB;
void main(){
  vec3 p = position;
  float sw = sin(uTime * (1.1 + aPh * 0.6) + aPh * 20.0 + p.x * 0.5) * (0.03 + uWind * 0.1) * aBend * aBend;
  p.x += sw; p.z += sw * 0.4;
  vB = aBend;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const REED_FS = /* glsl */ `
precision highp float;
uniform vec3 uBase; uniform vec3 uTip;
varying float vB;
void main(){
  vec3 col = mix(uBase, uTip, pow(vB, 1.5));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- textures
function makeAtlas(scale, anisotropy) {
  const W = Math.round(512 * scale), H = Math.round(256 * scale);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H * GLYPHS;
  const g = c.getContext('2d');
  const rnd = mulberry32(7);
  for (let row = 0; row < GLYPHS; row++) {
    g.save();
    g.translate(0, row * H);
    g.scale(scale, scale);
    const w = 512, h = 256;
    // warm rice paper
    g.fillStyle = '#f3ece0';
    g.fillRect(0, 0, w, h);
    // fibres
    for (let i = 0; i < 520; i++) {
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(140,110,80,0.10)';
      g.lineWidth = 0.6 + rnd() * 0.8;
      const x = rnd() * w, y = rnd() * h, a = rnd() * 6.28, l = 3 + rnd() * 9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    // bamboo ribs
    for (let k = 0; k < 8; k++) {
      const x = (k / 8) * w;
      const gr = g.createLinearGradient(x - 3, 0, x + 3, 0);
      gr.addColorStop(0, 'rgba(110,70,40,0)');
      gr.addColorStop(0.5, 'rgba(110,70,40,0.42)');
      gr.addColorStop(1, 'rgba(110,70,40,0)');
      g.fillStyle = gr;
      g.fillRect(x - 3, 0, 6, h);
    }
    // hems at the top and bottom edge
    g.fillStyle = 'rgba(150,80,30,0.38)';
    g.fillRect(0, h * 0.945, w, h * 0.055);
    g.fillRect(0, 0, w, h * 0.04);
    g.fillStyle = 'rgba(150,80,30,0.2)';
    g.fillRect(0, h * 0.905, w, h * 0.012);
    g.fillRect(0, h * 0.06, w, h * 0.01);
    // the wish, twice (front and back)
    for (const cx of [w * 0.25, w * 0.75]) drawGlyph(g, row, cx, h * 0.5, 54, rnd);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

function drawGlyph(g, id, cx, cy, S, rnd) {
  g.save();
  g.translate(cx, cy);
  g.scale(0.8, 1);
  g.strokeStyle = 'rgba(104,32,14,0.92)';
  g.fillStyle = 'rgba(104,32,14,0.92)';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = S * 0.095;
  const j = () => (rnd() - 0.5) * S * 0.07;
  g.beginPath();
  if (id === 0) { // heart
    g.moveTo(j(), S * 0.62);
    g.bezierCurveTo(-S * 1.05, S * 0.05 + j(), -S * 0.6, -S * 0.78, j(), -S * 0.3);
    g.bezierCurveTo(S * 0.6, -S * 0.78, S * 1.05, S * 0.05 + j(), j(), S * 0.62);
    g.stroke();
  } else if (id === 1) { // crescent + star
    g.arc(-S * 0.12, 0, S * 0.7, 0.62, Math.PI * 2 - 0.62);
    g.stroke();
    g.beginPath();
    g.arc(S * 0.14, 0, S * 0.5, Math.PI * 2 - 0.95, 0.95, true);
    g.stroke();
    g.lineWidth = S * 0.07;
    g.beginPath();
    const sx = S * 0.52, sy = -S * 0.42;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a) * S * 0.2, sy + Math.sin(a) * S * 0.2);
    }
    g.stroke();
  } else if (id === 2) { // lotus
    for (const [ax, tilt] of [[-1, -0.8], [1, 0.8], [-0.55, -0.42], [0.55, 0.42], [0, 0]]) {
      g.beginPath();
      g.save();
      g.translate(0, S * 0.55);
      g.rotate(tilt + j() * 0.01);
      g.moveTo(0, 0);
      g.quadraticCurveTo(-S * 0.3, -S * 0.55, j(), -S * 1.05);
      g.quadraticCurveTo(S * 0.3, -S * 0.55, 0, 0);
      g.stroke();
      g.restore();
    }
    g.beginPath();
    g.moveTo(-S * 0.7, S * 0.68);
    g.quadraticCurveTo(0, S * 0.85, S * 0.7, S * 0.68);
    g.stroke();
  } else if (id === 3) { // swallow / crane in flight
    g.moveTo(-S * 0.95, -S * 0.15);
    g.quadraticCurveTo(-S * 0.45, -S * 0.7, 0, S * 0.05);
    g.quadraticCurveTo(S * 0.45, -S * 0.7, S * 0.95, -S * 0.15);
    g.stroke();
    g.beginPath();
    g.moveTo(0, S * 0.05);
    g.quadraticCurveTo(-S * 0.1, S * 0.45, -S * 0.28, S * 0.75);
    g.moveTo(0, S * 0.05);
    g.quadraticCurveTo(S * 0.12, S * 0.4, S * 0.3, S * 0.7);
    g.stroke();
  } else if (id === 4) { // spiral
    for (let a = 0; a < Math.PI * 5; a += 0.2) {
      const r = S * (0.06 + a * 0.052);
      const x = Math.cos(a) * r + j() * 0.2, y = Math.sin(a) * r;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  } else { // sun
    g.arc(0, 0, S * 0.3, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.2;
      g.moveTo(Math.cos(a) * S * 0.52, Math.sin(a) * S * 0.52);
      g.lineTo(Math.cos(a) * S * (0.78 + (k % 2) * 0.22), Math.sin(a) * S * (0.78 + (k % 2) * 0.22));
    }
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- geometry helpers
function makeNoise1(seed) {
  const r = mulberry32(seed);
  const T = new Float32Array(256);
  for (let i = 0; i < 256; i++) T[i] = r();
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = T[i & 255], b = T[(i + 1) & 255];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

function ridgeGeometry({ z, width, cols, hMin, hMax, freq, seed, trees = false, haze, color, topLift = 1.12 }) {
  const n1 = makeNoise1(seed);
  const n2 = makeNoise1(seed + 91);
  const fbm = (x, nn) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { s += a * nn(x * f + o * 17.3); a *= 0.5; f *= 2.03; } return s / 0.9375; };
  const pos = new Float32Array((cols + 1) * 3 * 3);
  const col = new Float32Array((cols + 1) * 3 * 3);
  const idx = [];
  const cTop = new THREE.Color(color).multiplyScalar(topLift);
  const cMid = new THREE.Color(color).lerp(new THREE.Color(haze), 0.28);
  const cLow = new THREE.Color(haze);
  for (let i = 0; i <= cols; i++) {
    const x = -width + (i / cols) * width * 2;
    let h;
    if (trees) {
      const tri = Math.abs(((x * 0.85 + n1(x * 0.3) * 5) % 1 + 1) % 1 - 0.5) * 2;
      h = hMin + (hMax - hMin) * (0.15 + 0.85 * fbm(x * freq, n1)) * (0.45 + 0.55 * tri);
    } else {
      const f = fbm(x * freq, n1);
      const ridge = 1 - Math.abs(2 * fbm(x * freq * 0.8 + 11, n2) - 1);
      h = hMin + (hMax - hMin) * Math.pow(clamp(0.38 * f + 0.8 * ridge * ridge, 0, 1), 1.1);
    }
    const ys = [-1.5, h * 0.3, h];
    const cs = [cLow, cMid, cTop];
    for (let r = 0; r < 3; r++) {
      const k = (i * 3 + r) * 3;
      pos[k] = x; pos[k + 1] = ys[r]; pos[k + 2] = z;
      col[k] = cs[r].r; col[k + 1] = cs[r].g; col[k + 2] = cs[r].b;
    }
    if (i < cols) {
      const a = i * 3, b = (i + 1) * 3;
      idx.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

function reedGeometry(count, seed) {
  const r = mulberry32(seed);
  const SEG = 6;
  const pos = [], bend = [], ph = [], idx = [];
  const clumps = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) clumps.push({ x: side * (4.4 + k * 1.3 + r() * 0.8), z: 2.4 + r() * 4.2, h: 0.7 + r() * 0.9 + k * 0.1 });
  }
  for (let b = 0; b < count; b++) {
    const cl = clumps[b % clumps.length];
    const x0 = cl.x + (r() + r() + r() - 1.5) * 0.85;
    const z0 = cl.z + (r() - 0.5) * 1.2;
    const H = cl.h * (0.6 + r() * 1.1);
    const yaw = r() * Math.PI, a = r() * Math.PI * 2;
    const lean = (0.1 + r() * 0.55) * H;
    const w0 = 0.04 + r() * 0.04;
    const phs = r();
    const base = pos.length / 3;
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const off = lean * t * t;
      const cx = x0 + Math.cos(a) * off, cz = z0 + Math.sin(a) * off;
      const w = w0 * Math.pow(1 - t, 0.85) + 0.0006;
      pos.push(cx - Math.cos(yaw) * w, H * t, cz - Math.sin(yaw) * w, cx + Math.cos(yaw) * w, H * t, cz + Math.sin(yaw) * w);
      bend.push(t, t);
      ph.push(phs, phs);
      if (s < SEG) { const q = base + s * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aBend', new THREE.Float32BufferAttribute(bend, 1));
  geo.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
  geo.setIndex(idx);
  return geo;
}

function lanternBodyGeometry(segs) {
  const pts = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const body = lerp(0.3, 0.56, sm01(t / 0.5)) * (1 + 0.03 * Math.sin(t * 9));
    let r = body;
    if (t > 0.7) { const u = (t - 0.7) / 0.3; r = body * Math.pow(Math.max(0, 1 - u * u), 0.55); }
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), t * 1.25));
  }
  const geo = new THREE.LatheGeometry(pts, segs);
  return geo;
}

function lanternRingGeometry() {
  const parts = [];
  const ring = new THREE.TorusGeometry(0.305, 0.017, 6, 28);
  ring.rotateX(Math.PI / 2);
  parts.push(ring);
  for (const a of [0, Math.PI / 2]) {
    const bar = new THREE.CylinderGeometry(0.009, 0.009, 0.61, 4);
    bar.rotateZ(Math.PI / 2);
    bar.rotateY(a);
    parts.push(bar);
  }
  const cell = new THREE.CylinderGeometry(0.055, 0.06, 0.05, 8);
  cell.translate(0, 0.03, 0);
  parts.push(cell);
  return mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); q.deleteAttribute('normal'); return q; }));
}

// ---------------------------------------------------------------- the game
export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const lv = gfx.level;
  const maxL = [24, 40, 64, 90, 120, 150][lv];
  const starCount = Math.round(300 + 420 * gfx.particles);
  const sparkPool = Math.round(520 * gfx.particles);
  const flyPool = Math.round(44 * gfx.particles);
  const bodySegs = [14, 18, 24, 32, 40, 48][lv];
  const reflScale = [0.42, 0.55, 0.72, 0.9, 1, 1][lv];
  const reflSamples = [0, 0, 2, 4, 4, 4][lv];
  const blurTaps = lv <= 0 ? 1 : lv <= 2 ? 2 : 3;
  const reedBlades = Math.round(54 * gfx.detail);
  const ridgeCols = Math.round(160 * gfx.detail);

  const stage = createStage(root, {
    fov: 50,
    near: 0.1,
    far: 900,
    gfx,
    exposure: 1.05,
    environment: false,
    bloom: { strength: 0.6, radius: 0.8, threshold: 0.85 },
  });
  const { scene, camera, renderer } = stage;
  const noBloom = !stage.composer;
  const defs = noBloom ? { NO_COMPOSER: '' } : {};

  // ---------- sky ----------
  const domeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color('#02030f') },
      uMid: { value: new THREE.Color('#080c30') },
      uHor: { value: new THREE.Color('#1e1c4c') },
      uMoon: { value: MOON },
      uTime: { value: 0 },
    },
    defines: { ...(lv >= 1 ? { MILKY: '', DUST: '' } : {}) },
    vertexShader: DOME_VS,
    fragmentShader: DOME_FS,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), domeMat);
  dome.renderOrder = -100;
  dome.frustumCulled = false;
  scene.add(dome);

  // bright stars (points, twinkling)
  const starGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(starCount * 3), sz = new Float32Array(starCount), co = new Float32Array(starCount * 3), ph = new Float32Array(starCount);
    const mn = new THREE.Vector3(0.62, 0.5, -0.6).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < starCount; i++) {
      do {
        const a = rand(0, Math.PI * 2);
        const y = Math.pow(Math.random(), 0.8);
        const rr = Math.sqrt(1 - y * y);
        v.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
        if (Math.random() < 0.3) { v.addScaledVector(mn, -v.dot(mn) * 0.85).normalize(); }
      } while (v.y < 0.02);
      p[i * 3] = v.x * 450; p[i * 3 + 1] = v.y * 450; p[i * 3 + 2] = v.z * 450;
      const big = Math.random();
      sz[i] = big > 0.985 ? rand(5, 7) : big > 0.9 ? rand(3, 4.2) : rand(1.6, 2.8);
      const inten = big > 0.985 ? 1.8 : big > 0.9 ? 1.1 : rand(0.4, 0.85);
      const warm = Math.random();
      const cr = warm < 0.2 ? 1.0 : warm < 0.35 ? 0.78 : 0.82;
      const cg = warm < 0.2 ? 0.88 : warm < 0.35 ? 0.86 : 0.9;
      const cb = warm < 0.2 ? 0.7 : 1.0;
      co[i * 3] = cr * inten; co[i * 3 + 1] = cg * inten; co[i * 3 + 2] = cb * inten;
      ph[i] = Math.random();
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(co, 3));
    starGeo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  }
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: stage.pixelRatio }, uBoost: { value: 1 } },
    defines: defs,
    vertexShader: STAR_VS,
    fragmentShader: STAR_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -50;
  scene.add(stars);

  // ---------- mountains and far shore ----------
  const hazeColor = new THREE.Color('#1c1b48');
  const ridgeGeos = [];
  const layers = [
    { z: -160, hMin: 7, hMax: 24, freq: 0.016, color: '#232658', topLift: 1.25 },
    { z: -118, hMin: 4, hMax: 15, freq: 0.021, color: '#181b47', topLift: 1.2 },
    { z: -84, hMin: 2.6, hMax: 9.5, freq: 0.03, color: '#101236', topLift: 1.15 },
    { z: -60, hMin: 1.5, hMax: 5.6, freq: 0.045, color: '#090b25', topLift: 1.12 },
    { z: -42, hMin: 0.5, hMax: 3.2, freq: 0.07, color: '#04061a', topLift: 1.0, trees: true },
  ];
  layers.forEach((l, i) => {
    const width = Math.abs(l.z) * 1.9 + 60;
    const cols = l.trees ? Math.round(560 * Math.min(1.3, gfx.detail)) : ridgeCols * (i < 2 ? 2 : 3);
    const geo = ridgeGeometry({ ...l, width, cols, seed: 11 + i * 7, haze: l.trees ? '#0d1033' : hazeColor.getStyle() });
    ridgeGeos.push(geo);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
    m.renderOrder = -10 + i;
    m.frustumCulled = false;
    scene.add(m);
  });

  // ---------- water (real planar reflection, rippled) ----------
  const waterUniforms = {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTime: { value: 0 },
    uWind: { value: 0.4 },
    uBlur: { value: 0.0045 * (lv >= 3 ? 1.2 : 1) },
    uHaze: { value: new THREE.Color('#1c1b48') },
    uDeep: { value: new THREE.Color('#01040c') },
    uMoon: { value: MOON },
    uRings: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -100, 0)) },
  };
  const water = new Reflector(new THREE.PlaneGeometry(1400, 1400), {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.002,
    multisample: reflSamples,
    shader: {
      name: 'LakeShader',
      uniforms: waterUniforms,
      vertexShader: WATER_VS,
      fragmentShader: WATER_FS.replace(/BLUR_TAPS/g, String(blurTaps)),
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = REF_Y;
  water.renderOrder = 0;
  scene.add(water);
  const waterRT = water.getRenderTarget();
  const wu = water.material.uniforms; // cloned by Reflector
  // Reflector fills color/tDiffuse/textureMatrix on its clone; mirror the rest from our table
  for (const k of Object.keys(waterUniforms)) if (!['color', 'tDiffuse', 'textureMatrix'].includes(k)) wu[k] = waterUniforms[k];
  const rings = waterUniforms.uRings.value;
  let ringIdx = 0;
  function addRing(x, z, amp = 1) {
    rings[ringIdx].set(x, z, clock, amp);
    ringIdx = (ringIdx + 1) % rings.length;
  }

  // ---------- reeds on the shore ----------
  const reedGeo = reedGeometry(reedBlades, 5);
  const reedMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWind: { value: 0.4 }, uBase: { value: new THREE.Color('#020309') }, uTip: { value: new THREE.Color('#161e3c') } },
    vertexShader: REED_VS,
    fragmentShader: REED_FS,
    side: THREE.DoubleSide,
  });
  const reeds = new THREE.Mesh(reedGeo, reedMat);
  reeds.frustumCulled = false;
  scene.add(reeds);

  // ---------- lanterns (instanced) ----------
  const atlas = makeAtlas(lv < 2 ? 0.5 : 1, Math.min(gfx.anisotropy, renderer.capabilities.getMaxAnisotropy()));
  const bodyGeo = lanternBodyGeometry(bodySegs);
  const ringGeo = lanternRingGeometry();
  const colArr = new Float32Array(maxL * 3);
  const miscArr = new Float32Array(maxL * 4);
  const colAttr = new THREE.InstancedBufferAttribute(colArr, 3).setUsage(THREE.DynamicDrawUsage);
  const miscAttr = new THREE.InstancedBufferAttribute(miscArr, 4).setUsage(THREE.DynamicDrawUsage);
  bodyGeo.setAttribute('aColor', colAttr);
  bodyGeo.setAttribute('aMisc', miscAttr);
  ringGeo.setAttribute('aColor', colAttr);
  ringGeo.setAttribute('aMisc', miscAttr);
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: atlas }, uRows: { value: GLYPHS } },
    vertexShader: BODY_VS,
    fragmentShader: BODY_FS,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const ringMat = new THREE.ShaderMaterial({ vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true });
  const bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, maxL);
  const ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, maxL);
  for (const m of [bodyMesh, ringMesh]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }
  bodyMesh.renderOrder = 3;
  ringMesh.renderOrder = 3;

  // glow batch: halos, flames and mist, one draw call
  const mists = [];
  const mistCount = Math.round(11 + 5 * Math.min(1.5, gfx.detail));
  {
    const zs = [-150, -135, -108, -95, -72, -66, -52, -48];
    for (let i = 0; i < mistCount; i++) {
      const z = zs[i % zs.length] + rand(-6, 6);
      const d = Math.abs(z) + 10;
      mists.push({ x: rand(-d * 0.9, d * 0.9), y: rand(1.5, 7) + Math.abs(z) * 0.035, z, sx: rand(24, 54) * (d / 90 + 0.5), sy: rand(2.6, 6) * (d / 90 + 0.5), a: rand(0.09, 0.2), tint: i % 3, sp: rand(0.2, 0.6) });
    }
  }
  const glowCap = mistCount + maxL * 3 + 16;
  const gPos = new Float32Array(glowCap * 3), gSize = new Float32Array(glowCap * 2), gCol = new Float32Array(glowCap * 4), gKind = new Float32Array(glowCap * 3);
  const glowGeo = new THREE.InstancedBufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  glowGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const gAttrs = [
    new THREE.InstancedBufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage),
    new THREE.InstancedBufferAttribute(gSize, 2).setUsage(THREE.DynamicDrawUsage),
    new THREE.InstancedBufferAttribute(gCol, 4).setUsage(THREE.DynamicDrawUsage),
    new THREE.InstancedBufferAttribute(gKind, 3).setUsage(THREE.DynamicDrawUsage),
  ];
  glowGeo.setAttribute('aPos', gAttrs[0]);
  glowGeo.setAttribute('aSize', gAttrs[1]);
  glowGeo.setAttribute('aCol', gAttrs[2]);
  glowGeo.setAttribute('aKind', gAttrs[3]);
  glowGeo.instanceCount = 0;
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    defines: defs,
    vertexShader: GLOW_VS,
    fragmentShader: GLOW_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.frustumCulled = false;
  glowMesh.renderOrder = 4;
  scene.add(glowMesh);
  let gN = 0;
  function pushGlow(x, y, z, sx, sy, r, g, b, a, kind, push, ph) {
    if (gN >= glowCap || a <= 0.001) return;
    const i = gN++;
    gPos[i * 3] = x; gPos[i * 3 + 1] = y; gPos[i * 3 + 2] = z;
    gSize[i * 2] = sx; gSize[i * 2 + 1] = sy;
    gCol[i * 4] = r; gCol[i * 4 + 1] = g; gCol[i * 4 + 2] = b; gCol[i * 4 + 3] = a;
    gKind[i * 3] = kind; gKind[i * 3 + 1] = push; gKind[i * 3 + 2] = ph;
  }

  // embers falling from lanterns, fireflies
  const sparks = new Sparkles(sparkPool, { size: 0.12, gravity: -0.5, drag: 0.7 });
  sparks.points.renderOrder = 5;
  scene.add(sparks.points);
  const flies = new Sparkles(flyPool, { size: 0.11, drag: 0.08 });
  flies.points.renderOrder = 5;
  scene.add(flies.points);
  const fireflyColor = new THREE.Color(1.0, 0.95, 0.4);
  const emberColor = new THREE.Color();
  const sparkRate = clamp((sparkPool / (maxL * 2.2)) * 0.6, 1.1, 3.0);
  let flyClock = 0;

  // ---------- state ----------
  let clock = 0;
  const lanterns = [];
  const holds = new Map();
  const timers = [];
  const wind = { x: 0, z: -0.3, speed: 0.5, target: 'breeze', side: 1, angle: Math.PI / 2 - 0.5 };
  let palette = 3;
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';

  const WIND_SPEED = { calm: 0.12, breeze: 0.75, gusty: 1.45 };
  function updateWind(dt) {
    const t = clock;
    let ang, spd;
    if (wind.target === 'calm') { ang = Math.PI / 2 - wind.side * 0.3; spd = WIND_SPEED.calm; }
    else if (wind.target === 'breeze') { ang = Math.PI / 2 - wind.side * 0.85 + Math.sin(t * 0.07) * 0.15; spd = WIND_SPEED.breeze * (1 + 0.15 * Math.sin(t * 0.3)); }
    else { ang = Math.PI / 2 - wind.side * 0.6 + Math.sin(t * 0.11) * 0.5; spd = WIND_SPEED.gusty * (1 + 0.45 * Math.sin(t * 0.37) + 0.25 * Math.sin(t * 0.93 + 1)); }
    wind.angle = lerp(wind.angle, ang, 1 - Math.exp(-0.8 * dt));
    wind.speed = lerp(wind.speed, spd, 1 - Math.exp(-0.8 * dt));
    wind.x = Math.cos(wind.angle) * wind.speed;
    wind.z = -Math.sin(wind.angle) * wind.speed;
  }

  function pickColor() {
    let g = palette;
    if (g === 3) { const r = Math.random(); g = r < 0.54 ? 0 : r < 0.8 ? 1 : (lv >= 1 ? 2 : 0); }
    return pick(PAL[g]);
  }

  function addLantern(x, z, o = {}) {
    if (lanterns.length >= maxL) {
      const k = lanterns.findIndex((l) => !l.held);
      if (k < 0) return null;
      lanterns.splice(k, 1);
    }
    const L = {
      x, y: o.y ?? 0.1, z, vx: 0, vy: 0, vz: 0,
      heat: o.heat ?? 0, lit: !!o.lit, held: !!o.held, rel: o.held ? -1 : (o.rel ?? 0), age: 0,
      life: rand(40, 52), ph: rand(0, 6.28), yaw: rand(0, 6.28), spin: rand(-0.3, 0.3), size: rand(0.9, 1.12) * 0.92, buoy: rand(0.85, 1.15),
      c: o.color || pickColor(), row: randInt(0, GLYPHS - 1), acc: rand(0, 1), tx: x, tz: z, pid: o.pid ?? null, tilt: 0,
    };
    lanterns.push(L);
    return L;
  }

  function stepLantern(L, dt) {
    L.age += dt;
    const fade = clamp((L.life - L.age) / 7, 0, 1);
    L.fade = fade;
    if (L.held) {
      L.x = lerp(L.x, L.tx, 1 - Math.exp(-10 * dt));
      L.z = lerp(L.z, L.tz, 1 - Math.exp(-10 * dt));
      L.y = 0.1 + Math.sin(clock * 2 + L.ph) * 0.012;
      if (L.lit) L.heat = Math.min(1, L.heat + dt / 1.15);
      L.yaw += L.spin * 0.4 * dt;
      L.tilt = lerp(L.tilt, 0, 1 - Math.exp(-4 * dt));
      return;
    }
    if (L.lit) L.heat = Math.min(1, L.heat + dt / 1.35);
    L.rel += dt;
    const h = sm01(L.heat);
    const lift = h * h * (0.22 + 0.95 * sm01(L.rel / 8)) * L.buoy;
    L.vy += (lift - L.vy) * (1 - Math.exp(-dt * 0.9));
    const hAbove = sm01(L.y / 5);
    const gust = 0.78 + 0.22 * Math.sin(clock * 0.8 + L.ph * 2) ;
    const wx = wind.x * (0.15 + 0.85 * hAbove) * gust;
    const wz = wind.z * (0.15 + 0.85 * hAbove) * gust;
    L.vx += (wx - L.vx) * (1 - Math.exp(-dt * 0.45));
    L.vz += (wz - L.vz) * (1 - Math.exp(-dt * 0.45));
    L.x += (L.vx + Math.sin(L.age * 0.55 + L.ph) * 0.2 * hAbove) * dt;
    L.z += (L.vz + Math.cos(L.age * 0.43 + L.ph * 1.7) * 0.12 * hAbove) * dt;
    L.y += L.vy * dt;
    L.yaw += (L.spin + 0.05 * Math.sin(L.age * 0.3 + L.ph)) * dt;
    L.tilt = lerp(L.tilt, (L.vx * 0.06 + Math.sin(L.age * 0.5 + L.ph) * 0.05), 1 - Math.exp(-2 * dt));
  }

  // ---------- audio ----------
  const recent = [];
  let windLoop = null, lapLoop = null, crackle = null, pad = null;
  const padLevel = 0.05;
  if (audio.ready) {
    windLoop = audio.loop(bus, { kind: 'pink', filter: 'bandpass', freq: 420, q: 0.7, gain: 0.01, send: 0.5 });
    lapLoop = audio.loop(bus, { kind: 'brown', filter: 'lowpass', freq: 240, q: 0.5, gain: 0.04, send: 0.4 });
    crackle = audio.loop(bus, { kind: 'white', filter: 'highpass', freq: 4200, q: 0.5, gain: 0, send: 0.2 });
    pad = new Pad(audio, bus, {
      chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 1200,
      period: 20,
      wave: 'triangle',
    });
  }
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('hush:ambience', onAmb);

  // view geometry (set by layout)
  const cam = { fov: 50, z: 11, y: 1.7, pitch: 7, aspect: 1.6 };
  const halfW = (z) => (cam.z - z) * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect;
  const spanX = () => clamp(halfW(-8) * 0.9, 5, 15);
  const noteFor = (x) => midiToFreq(pentatonic(Math.round((clamp(x / spanX(), -1, 1) * 0.5 + 0.5) * 9), 62));
  const panFor = (x) => clamp((x / spanX()) * 0.85, -0.9, 0.9);

  function sndStrike(x) {
    if (!audio.ready) return;
    const pan = panFor(x);
    audio.burst(bus, { kind: 'white', dur: 0.17, attack: 0.012, gain: 0.05, type: 'bandpass', freq: 4300, freqEnd: 1900, q: 1.0, pan, send: 0.25 });
    audio.burst(bus, { kind: 'white', dur: 0.012, attack: 0.001, gain: 0.04, type: 'highpass', freq: 3600, pan, send: 0.2, delay: 0.05 });
    audio.burst(bus, { kind: 'white', dur: 0.01, attack: 0.001, gain: 0.03, type: 'highpass', freq: 4200, pan, send: 0.2, delay: 0.11 });
  }
  function sndFwoomp(x, g = 1) {
    if (!audio.ready) return;
    const pan = panFor(x);
    audio.burst(bus, { kind: 'brown', dur: 0.6, attack: 0.13, gain: 0.2 * g, type: 'lowpass', freq: 130, freqEnd: 1100, q: 0.7, pan, send: 0.35 });
    audio.burst(bus, { kind: 'pink', dur: 0.55, attack: 0.11, gain: 0.04 * g, type: 'bandpass', freq: 500, freqEnd: 1900, q: 0.8, pan, send: 0.4 });
    audio.tone(bus, { freq: 58, freqEnd: 92, sweepTime: 0.4, dur: 0.5, gain: 0.05 * g, attack: 0.09, pan, send: 0.2 });
  }
  function sndLaunch(x, g = 1, noteShift = 0) {
    if (!audio.ready) return;
    const now = performance.now();
    while (recent.length && now - recent[0] > 1500) recent.shift();
    if (recent.length > (lv >= 2 ? 14 : 8)) return;
    recent.push(now);
    const pan = panFor(x);
    const f = noteFor(x) * Math.pow(2, noteShift / 12);
    audio.bell(bus, { freq: f, gain: 0.11 * g, pan, send: 0.62, decay: 5.4, vel: 0.62 });
    audio.tone(bus, { freq: f * 0.5, freqEnd: f, sweepTime: 0.55, dur: 1.2, gain: 0.03 * g, attack: 0.3, pan, send: 0.7 });
    audio.tone(bus, { freq: f * 2, dur: 2.4, gain: 0.011 * g, attack: 0.012, pan, send: 0.8, delay: 0.05 });
    for (let k = 0; k < 5; k++) {
      audio.burst(bus, { kind: 'white', dur: 0.025, attack: 0.002, gain: 0.02 * g * rand(0.6, 1), type: 'bandpass', freq: rand(2500, 5500), q: 1.2, pan, send: 0.2, delay: 0.02 + k * rand(0.04, 0.09) });
    }
    audio.burst(bus, { kind: 'pink', dur: 1.0, attack: 0.3, gain: 0.045 * g, type: 'bandpass', freq: 300, freqEnd: 800, q: 0.8, pan, send: 0.45 });
    audio.haptic?.(6);
  }
  function cricket() {
    if (!audio.ready) return;
    const pan = rand(-0.9, 0.9);
    const base = rand(4200, 5000);
    const chirps = Math.random() < 0.5 ? 3 : 4;
    for (let c = 0; c < chirps; c++) {
      audio.tone(bus, { freq: base, freqEnd: base * 1.03, dur: 0.028, attack: 0.004, gain: 0.01, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
      audio.tone(bus, { freq: base * 0.5, dur: 0.028, attack: 0.004, gain: 0.005, pan, send: 0.35, type: 'sine', delay: c * 0.062 });
    }
  }
  function fishPlop(x, z) {
    if (!audio.ready) return;
    const f = midiToFreq(pentatonic(randInt(5, 11), 62));
    audio.bubble(bus, { freq: f, gain: 0.07, pan: panFor(x), send: 0.6, dur: 0.3, rise: 1.8 });
    audio.burst(bus, { kind: 'white', dur: 0.05, gain: 0.03, type: 'bandpass', freq: 1800, q: 0.9, pan: panFor(x), send: 0.3 });
  }

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function groundPoint(px, py) {
    ndc.set((px / stage.width) * 2 - 1, -(py / stage.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    let z = -9999;
    if (d.y < -0.004) z = o.z + d.z * (-o.y / d.y);
    if (!(z > -34)) z = -15; // tapped the sky: launch from mid lake
    z = clamp(z, -30, 4.2);
    let x = o.x;
    if (Math.abs(d.z) > 1e-3) x = o.x + d.x * ((z - o.z) / d.z);
    const hw = halfW(z) * 1.02;
    return [clamp(x, -hw, hw), z];
  }

  function releaseLantern(L, g = 1) {
    L.held = false;
    L.rel = 0;
    if (!L.lit) { L.lit = true; L.heat = Math.max(L.heat, 0.06); sndFwoomp(L.x, 0.7); }
    sndLaunch(L.x, g);
    addRing(L.x, L.z, 1);
    emberPuff(L, 9);
    L.pid = null;
  }

  function emberPuff(L, n) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, 6.28);
      mixEmber(L);
      sparks.spawn(L.x + Math.cos(a) * 0.12, L.y + 0.1, L.z + Math.sin(a) * 0.12, Math.cos(a) * rand(0.1, 0.5), rand(0.3, 1.1), Math.sin(a) * rand(0.1, 0.5), emberColor, rand(0.7, 1.3), rand(1.2, 2.4));
    }
  }
  function mixEmber(L) {
    emberColor.setRGB(lerp(1.5, L.c[0] * 1.6, 0.4), lerp(0.7, L.c[1] * 1.6, 0.4), lerp(0.25, L.c[2] * 1.6, 0.4));
  }

  const tracker = track(root, {
    down(p) {
      audio.unlock?.();
      if (holds.size >= 4) return;
      const [x, z] = groundPoint(p.x, p.y);
      const L = addLantern(x, z, { held: true, pid: p.id });
      if (!L) return;
      const h = { L, t0: clock, lit: false, x, z };
      holds.set(p.id, h);
      sndStrike(x);
      timers.push({ at: clock + 0.38, fn: () => { if (holds.get(p.id) === h && !h.lit) lightHeld(h); } });
    },
    move(p) {
      const h = holds.get(p.id);
      if (!h) return;
      const [x, z] = groundPoint(p.x, p.y);
      h.L.tx = x; h.L.tz = z; h.x = x; h.z = z;
    },
    up(p) {
      const h = holds.get(p.id);
      if (!h) return;
      holds.delete(p.id);
      const dur = clock - h.t0;
      if (!h.lit) { h.lit = true; h.L.lit = true; h.L.heat = Math.max(h.L.heat, 0.05); sndFwoomp(h.x, 0.6); }
      releaseLantern(h.L, 0.8 + 0.3 * clamp(dur / 0.9, 0, 1));
      h.L.lit = true;
    },
  });
  function lightHeld(h) {
    h.lit = true;
    h.L.lit = true;
    h.L.heat = Math.max(h.L.heat, 0.04);
    sndFwoomp(h.x, 1);
    addRing(h.x, h.z, 0.6);
    emberPuff(h.L, 8);
  }

  // ---------- release a festival ----------
  function releaseFestival(n = 12) {
    audio.unlock?.();
    const span = spanX();
    const base = clock;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = clamp(lerp(-span, span, t) + rand(-0.6, 0.6), -halfW(-6) * 0.95, halfW(-6) * 0.95);
      const z = rand(-14, -1.5);
      const delay = i * 0.17 + rand(0, 0.07);
      const crescendo = 0.5 + 0.55 * t;
      timers.push({
        at: base + delay,
        fn: () => {
          const L = addLantern(x, z, { lit: true, heat: 0.25 });
          if (!L) return;
          L.rel = 0;
          sndLaunch(x, crescendo * 0.85);
          addRing(x, z, 0.8);
          emberPuff(L, 5);
          if (i === n - 1 && audio.ready) {
            // a soft low chord blooms as the last one lifts
            for (const [m, gg] of [[50, 0.07], [57, 0.05], [62, 0.045]]) audio.bell(bus, { freq: midiToFreq(m), gain: gg, pan: 0, send: 0.8, decay: 7, vel: 0.5, delay: 0.1 });
          }
        },
      });
    }
  }

  // ---------- HUD ----------
  const windSeg = hud.segmented({
    label: 'Wind',
    options: [{ id: 'calm', label: 'Calm' }, { id: 'breeze', label: 'Breeze' }, { id: 'gusty', label: 'Gusty' }],
    value: 'breeze',
    onChange: (id) => {
      audio.unlock?.();
      wind.target = id;
      wind.side = Math.random() < 0.5 ? -1 : 1;
      if (audio.ready) audio.burst(bus, { kind: 'pink', dur: 2.2, attack: 0.9, gain: id === 'calm' ? 0.03 : 0.07, type: 'bandpass', freq: 240, freqEnd: 800, q: 0.8, curve: 'lin', send: 0.5, pan: wind.side * 0.3 });
    },
  });
  void windSeg;
  hud.button({ label: 'Release 12', title: 'Let a festival of lanterns rise together', onClick: () => releaseFestival(12) });
  hud.swatches({
    colors: ['#ffc14d', '#ff7b9c', '#a98cff', 'conic-gradient(#ffc14d, #ff7b9c, #a98cff, #ffc14d)'],
    value: 3,
    onChange: (i) => { palette = i; },
  });
  hud.setHint('Tap the lake to light a lantern. Hold to let its flame grow, then let go.');
  let lastStat = -1;

  // ---------- layout / camera ----------
  const camTarget = new THREE.Vector3();
  const ptr = { x: 0, y: 0 };
  const onPtr = (e) => {
    const r = root.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  root.addEventListener('pointermove', onPtr);
  const sway = { x: 0, y: 0 };
  let tilt = 0;

  function layout() {
    const w = stage.width, h = stage.height;
    const aspect = w / Math.max(1, h);
    const t = clamp((1.3 - aspect) / (1.3 - 0.5), 0, 1);
    cam.aspect = aspect;
    cam.fov = lerp(50, 68, t);
    cam.z = lerp(11, 13.5, t);
    cam.pitch = lerp(7.5, 12.5, t);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    const rw = Math.max(64, Math.round(w * stage.pixelRatio * reflScale));
    const rh = Math.max(64, Math.round(h * stage.pixelRatio * reflScale));
    waterRT.setSize(rw, rh);
    reeds.scale.x = clamp(halfW(5) / 7.5, 0.3, 1.5);
    starMat.uniforms.uPx.value = stage.pixelRatio;
  }
  layout();
  stage.onResize = layout;

  // seed a few lanterns already aloft so the sky is alive
  {
    const n = Math.min(maxL - 2, 6 + (lv >= 2 ? 3 : 0));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const L = addLantern(lerp(-1, 1, t) * halfW(-8) * 0.8 + rand(-1, 1), rand(-24, -7), { lit: true, heat: 1 });
      L.rel = 0;
      const secs = rand(4, 26);
      for (let s = 0; s < secs; s += 0.1) { clock += 0; stepLantern(L, 0.1); }
    }
  }

  // ---------- frame ----------
  let cricketClock = rand(1, 3);
  let flickClock = 0;
  let fishClock = rand(6, 12);
  let autoClock = rand(14, 22);
  let lapT = 0;
  const fl = (t, ph) => 0.88 + 0.07 * Math.sin(t * 9.1 + ph) + 0.05 * Math.sin(t * 23.7 + ph * 2.3) + 0.03 * Math.sin(t * 3.3 + ph * 0.7);

  const loop = createLoop((dt, time) => {
    clock = time;
    updateWind(dt);
    const windAmt = clamp(wind.speed / 1.6, 0, 1);

    // timers (staggered festival, lit flames)
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= clock) { const t = timers.splice(i, 1)[0]; t.fn(); }
    }

    // lanterns
    for (let i = lanterns.length - 1; i >= 0; i--) {
      const L = lanterns[i];
      stepLantern(L, dt);
      if (L.age > L.life) { if (L.held) { holds.delete(L.pid); } lanterns.splice(i, 1); }
    }
    const n = lanterns.length;
    gN = 0;
    // mist
    for (const m of mists) {
      m.x += (wind.x * 0.4 + m.sp * 0.3) * dt;
      const lim = Math.abs(m.z) * 1.1 + 50;
      if (m.x > lim) m.x = -lim;
      if (m.x < -lim) m.x = lim;
      const tint = m.tint === 0 ? [0.2, 0.24, 0.52] : m.tint === 1 ? [0.3, 0.22, 0.5] : [0.16, 0.26, 0.5];
      pushGlow(m.x, m.y, m.z, m.sx, m.sy, tint[0], tint[1], tint[2], m.a, 2, 0, 0);
    }
    let flying = 0;
    for (let i = 0; i < n; i++) {
      const L = lanterns[i];
      const hs = sm01(L.heat);
      const altitude = sm01(L.y / 48);
      const s = L.size * (0.2 + 0.8 * hs) * (1 - 0.4 * altitude);
      const fade = L.fade ?? 1;
      const light = Math.pow(L.heat, 0.8) * fl(clock, L.ph) * (1 - 0.5 * altitude) * (0.35 + 0.65 * fade) + (L.lit ? 0 : 0.0);
      if (!L.held) flying++;
      dummy.position.set(L.x, L.y, L.z);
      dummy.rotation.set(L.tilt * 0.8, L.yaw, L.tilt);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      ringMesh.setMatrixAt(i, dummy.matrix);
      colArr[i * 3] = L.c[0]; colArr[i * 3 + 1] = L.c[1]; colArr[i * 3 + 2] = L.c[2];
      miscArr[i * 4] = L.row; miscArr[i * 4 + 1] = light; miscArr[i * 4 + 2] = fade; miscArr[i * 4 + 3] = L.ph;
      // glow: wide halo around the paper, flame in the mouth, warm pool below
      const boost = noBloom ? 1.5 : 1;
      const a = light * fade;
      pushGlow(L.x, L.y + 0.5 * s, L.z, 1.55 * s, 1.75 * s, lerp(L.c[0], 1, 0.3), lerp(L.c[1], 0.7, 0.3), lerp(L.c[2], 0.4, 0.3), 0.3 * a * boost, 0, 0.5 * s, 0);
      pushGlow(L.x, L.y + 0.04 * s, L.z, 0.2 * s, 0.34 * s, 1.5, 0.78, 0.3, 1.2 * clamp(L.heat * 3, 0, 1) * a, 1, 0.12 * s, L.ph);
      pushGlow(L.x, L.y - 0.04 * s, L.z, 0.62 * s, 0.62 * s, 1.0, 0.6, 0.25, 0.4 * a * boost, 0, 0.1 * s, 0);
      // falling embers
      if (!L.held && L.heat > 0.4 && L.y < 34) {
        L.acc += dt * sparkRate * L.heat * (1 - altitude) * fade;
        while (L.acc >= 1) {
          L.acc -= 1;
          mixEmber(L);
          sparks.spawn(L.x + rand(-0.12, 0.12) * s, L.y + 0.02, L.z + rand(-0.12, 0.12) * s, L.vx * 0.3 + rand(-0.06, 0.06), rand(-0.1, 0.08), L.vz * 0.3 + rand(-0.06, 0.06), emberColor, rand(0.5, 1.0) * (0.5 + 0.5 * s), rand(1.4, 2.8));
        }
      }
    }
    // growing match flames at held points
    for (const h of holds.values()) {
      const dur = clock - h.t0;
      const p = clamp(dur / 0.6, 0, 1);
      const lit = h.lit ? 1 : 0;
      pushGlow(h.L.x, 0.1, h.L.z, 0.16 + 0.1 * p, 0.28 + 0.2 * p + lit * 0.12, 1.5, 0.78, 0.3, 0.8, 1, 0.1, 3);
      pushGlow(h.L.x, 0.18, h.L.z, 0.5 + 0.9 * p, 0.5 + 0.9 * p, 1.0, 0.6, 0.2, (0.18 + 0.5 * p) * (noBloom ? 1.5 : 1) * (1 - h.L.heat * 0.4), 0, 0.1, 0);
    }
    bodyMesh.count = n;
    ringMesh.count = n;
    bodyMesh.instanceMatrix.needsUpdate = true;
    ringMesh.instanceMatrix.needsUpdate = true;
    colAttr.needsUpdate = true;
    miscAttr.needsUpdate = true;
    glowGeo.instanceCount = gN;
    for (const a of gAttrs) a.needsUpdate = true;
    glowMat.uniforms.uTime.value = clock;
    if (n !== lastStat) { lastStat = n; hud.setStat?.(n > 0 ? `${n} aloft` : ''); }

    // uniforms
    domeMat.uniforms.uTime.value = clock;
    starMat.uniforms.uTime.value = clock;
    waterUniforms.uTime.value = clock;
    waterUniforms.uWind.value = lerp(waterUniforms.uWind.value, 0.2 + 0.8 * windAmt, 1 - Math.exp(-dt));
    reedMat.uniforms.uTime.value = clock;
    reedMat.uniforms.uWind.value = waterUniforms.uWind.value;

    // ambient life: fireflies, fish, crickets, occasional quiet auto lantern
    flyClock -= dt;
    if (flyClock <= 0) {
      flyClock = rand(0.12, 0.45);
      const hw = halfW(0) * 0.9;
      flies.spawn(rand(-hw, hw), rand(0.4, 3.2), rand(-16, 6), rand(-0.1, 0.1) + wind.x * 0.1, rand(-0.03, 0.08), rand(-0.1, 0.1), fireflyColor, rand(0.5, 1.2), rand(5, 9));
    }
    sparks.update(dt, stage.height * stage.pixelRatio, camera.fov);
    flies.update(dt, stage.height * stage.pixelRatio, camera.fov);
    fishClock -= dt;
    if (fishClock <= 0) {
      fishClock = rand(9, 20);
      const x = rand(-halfW(-8) * 0.6, halfW(-8) * 0.6), z = rand(-16, -3);
      addRing(x, z, 0.5);
      fishPlop(x, z);
    }
    autoClock -= dt;
    if (autoClock <= 0) {
      autoClock = rand(16, 28);
      if (lanterns.length < 5 && holds.size === 0) {
        const x = rand(-halfW(-8) * 0.7, halfW(-8) * 0.7), z = rand(-16, -4);
        const L = addLantern(x, z, { lit: true, heat: 0.4 });
        if (L) { L.rel = 0; sndLaunch(x, 0.45); addRing(x, z, 0.7); emberPuff(L, 5); }
      }
    }
    if (audio.ready) {
      lapT += dt;
      windLoop?.set({ gain: 0.01 + 0.04 * windAmt * (0.65 + 0.35 * Math.sin(lapT * 0.5) * Math.sin(lapT * 0.21 + 1)), freq: 330 + 300 * windAmt + 150 * Math.sin(lapT * 0.23) }, 0.5);
      lapLoop?.set({ gain: 0.04 + 0.022 * Math.sin(lapT * 0.4) * Math.sin(lapT * 0.17) + windAmt * 0.012, freq: 220 + 80 * Math.sin(lapT * 0.3) }, 0.5);
      flickClock -= dt;
      if (flickClock <= 0) {
        flickClock = 0.09;
        let hold = 0;
        for (const h of holds.values()) hold = Math.max(hold, clamp((clock - h.t0) / 0.6, 0, 1));
        crackle?.set({ gain: (0.0016 * Math.min(1, Math.sqrt(flying) / 3) + 0.004 * hold) * (0.3 + Math.random() * 1.1) }, 0.05);
      }
      cricketClock -= dt;
      if (cricketClock <= 0) { cricket(); cricketClock = rand(1.6, 4.8); }
    }

    // camera: slow sway, pointer parallax, gentle lift of the gaze while many are flying
    tilt = lerp(tilt, clamp(flying / 18, 0, 1), 1 - Math.exp(-0.5 * dt));
    sway.x = lerp(sway.x, ptr.x * 0.6 + Math.sin(clock * 0.13) * 0.35, 1 - Math.exp(-1.6 * dt));
    sway.y = lerp(sway.y, ptr.y * 0.18 + Math.sin(clock * 0.09) * 0.08, 1 - Math.exp(-1.6 * dt));
    camera.position.set(sway.x, cam.y - sway.y, cam.z);
    const pitch = ((cam.pitch + tilt * 4.5 - ptr.y * 1.2) * Math.PI) / 180;
    camTarget.set(sway.x * 0.15 - ptr.x * 0.6, camera.position.y + Math.tan(pitch) * 40, -40 + cam.z);
    camera.lookAt(camTarget);
    stage.render();
  });

  return {
    destroy() {
      loop.stop();
      tracker.dispose();
      window.removeEventListener('hush:ambience', onAmb);
      root.removeEventListener('pointermove', onPtr);
      timers.length = 0;
      holds.clear();
      windLoop?.stop(0.3);
      lapLoop?.stop(0.3);
      crackle?.stop(0.2);
      pad?.stop(0.6);
      atlas.dispose();
      bodyGeo.dispose();
      ringGeo.dispose();
      glowGeo.dispose();
      reedGeo.dispose();
      starGeo.dispose();
      ridgeGeos.forEach((g) => g.dispose());
      bodyMesh.dispose();
      ringMesh.dispose();
      water.dispose();
      sparks.geo.dispose();
      sparks.material.dispose();
      flies.geo.dispose();
      flies.material.dispose();
      stage.dispose();
    },
  };
}
