import * as THREE from "three";
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Final display-space pass: light chromatic aberration, a cheap peripheral softening that
// stands in for depth of field (not a real bokeh), a gentle vignette and film grain.
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.03 },
    uAberration: { value: 0.0008 },
    uVignette: { value: 0.45 },
    uEdgeBlur: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uEdgeBlur;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * uAberration * (1.0 + 4.0 * r2);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;

      float blur = uEdgeBlur * r2 * 0.0035;
      vec3 soft = (col * 2.0
        + texture2D(tDiffuse, vUv + vec2(blur, 0.0)).rgb
        + texture2D(tDiffuse, vUv - vec2(blur, 0.0)).rgb
        + texture2D(tDiffuse, vUv + vec2(0.0, blur)).rgb
        + texture2D(tDiffuse, vUv - vec2(0.0, blur)).rgb) / 6.0;
      col = mix(col, soft, smoothstep(0.05, 0.45, r2));

      float vig = smoothstep(0.22, 0.8, length(c) * 1.35);
      col *= 1.0 - vig * uVignette;

      float g = hash(gl_FragCoord.xy + fract(uTime * 0.37) * 512.0) - 0.5;
      col += g * uGrain;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export function createFinishPass() {
  return new ShaderPass(FinishShader);
}
