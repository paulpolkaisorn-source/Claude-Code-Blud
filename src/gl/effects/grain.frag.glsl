// Grain and dither, the last step of the post chain (design/direction-3d.md section 10.8).
//
// The input is linear light. The effect works in display (sRGB) space, where the grain amplitude is
// defined: it encodes the colour, adds zero-mean grain and triangular dither, clamps to the display
// range and decodes back to linear light. The final pass then encodes its output, so the screen
// receives encode(input) + grain + dither, and nothing else changes the colour.
//
// Hash. Jarzynski and Olano's pcg2d (Hash Functions for GPU Rendering, JCGT 2020): an integer hash
// with no sine and no fract(sin) lattice. It runs on the device pixel floor(uv * uSize) and on the
// per-frame seed, so every device pixel draws its own sample, and the pattern neither repeats in
// space nor carries from one frame to the next. The sample is per device pixel, so the result is the
// same kind of noise at 1x and at 2x DPR.
//
// Monochrome. The grain and the dither are one value, added to red, green and blue alike. The noise
// therefore moves luminance only: it never shifts the hue of a pixel, so it cannot read as coloured
// noise. A coloured pixel keeps its channel differences exactly (the harness checks R - G and G - B
// on the paper). Two hash lanes are used: lane 0 for the grain, lane 1 for the dither.
//
// Uniforms. uAmp is the grain amplitude in display units (0.028 at m = 0, 0.040 at m = 1, set by
// post.ts). uSeed is the per-frame seed (17 under reduced motion). uDither is 1 for the dither and 0
// to switch it off, which the harness does for its readback checks. uSize is the drawing-buffer size
// in device pixels, set through setSize.

uniform float uAmp;
uniform float uSeed;
uniform float uDither;
uniform vec2 uSize;

// IEC 61966-2-1 transfer curves, applied per channel. Input below zero is clamped to zero first.
vec3 grainEncode(const in vec3 lin) {
  vec3 c = max(lin, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 grainDecode(const in vec3 disp) {
  vec3 c = max(disp, vec3(0.0));
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

// pcg2d: two 32-bit words from two 32-bit words, two rounds of a multiply-add and an xor-shift.
uvec2 grainPcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> 16u);
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> 16u);
  return v;
}

// Two independent 32-bit words for a device pixel, the frame seed and a lane. Lane 0 gives the
// grain; lane 1 gives the dither.
uvec2 grainLane(const in uvec2 pixel, const in uint seed, const in uint lane) {
  return grainPcg2d(pixel + uvec2(seed * 0x9E3779B9u + lane * 0x27D4EB2Du, seed ^ (lane * 0x165667B1u)));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  uvec2 pixel = uvec2(floor(uv * uSize));
  uint seed = uint(uSeed);
  float unit = 1.0 / 4294967296.0;

  // Zero-mean grain: uniform in [-uAmp, uAmp).
  float grain = (float(grainLane(pixel, seed, 0u).x) * unit - 0.5) * 2.0 * uAmp;

  // Triangular dither of plus or minus 1/255: the sum of two independent uniforms in [0, 1), minus one,
  // which has zero mean and a triangular density on (-1, 1).
  uvec2 d = grainLane(pixel, seed, 1u);
  float tri = (float(d.x) + float(d.y)) * unit - 1.0;

  // The same value on red, green and blue: the noise changes luminance and never the hue.
  vec3 disp = grainEncode(inputColor.rgb);
  disp = clamp(disp + vec3(grain + tri * (uDither / 255.0)), 0.0, 1.0);
  outputColor = vec4(grainDecode(disp), inputColor.a);
}
