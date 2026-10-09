// Multiplies a material's albedo by smooth world-space noise so repeating textures on large
// surfaces (deck, lawn, decking) never show their tile period. Not used on underwater materials.
export function addBreakup(material, { scale = 0.2, amount = 0.12 } = {}) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uBU = { value: [scale, amount] };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBUPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBUPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBUPos; uniform vec2 uBU;
float buHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float buNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(buHash(i), buHash(i + vec2(1.0, 0.0)), f.x), mix(buHash(i + vec2(0.0, 1.0)), buHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 q = vBUPos.xz * uBU.x;
  float n = buNoise(q) * 0.55 + buNoise(q * 2.7 + 7.0) * 0.3 + buNoise(q * 7.0 + 3.0) * 0.15;
  diffuseColor.rgb *= 1.0 - uBU.y + 2.0 * uBU.y * n; }`);
  };
  material.customProgramCacheKey = () => 'breakup' + scale + '_' + amount;
  return material;
}
