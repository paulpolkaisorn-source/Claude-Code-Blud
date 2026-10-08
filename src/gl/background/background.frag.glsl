// Paper and ink background with the ink-bleed front (design/direction-3d.md section 10.10).
//
// Colour space. Uniform colours are linear, because THREE.Color converts the hex values. The fibre,
// the vignette and the dither are defined in display (sRGB) units, as the brief states them. The
// shader therefore encodes the base colours to sRGB, adds those terms, decodes the result to linear
// light and writes it through linearToOutputTexel, a prefix function of ShaderMaterial. Into the
// composer's linear HalfFloat target that conversion is the identity, so the composer receives
// linear light and the output pass does the one sRGB encode. On the canvas (no composer, the
// harness) the value is encoded to sRGB on the way out.
//
// Dither. A triangular value in (-1, 1) / 255 is added in display space, before the decode. The
// final encode therefore lands within one 8-bit level of the intended colour. The vignette and the
// fibre are slow gradients, which would band at 8 bits without it. It is fixed per pixel, so the
// still background does not shimmer.
//
// Quality. uFibreOctaves (2, 3 or 4) sets how many fibre octaves are summed. The sum is divided by
// the amplitude of the octaves used, so the fibre amplitude does not change with quality.

uniform vec3 uResolution;    // x, y: size in CSS px; z: device pixel ratio
uniform float uTime;         // seconds; advanced by update(), frozen under reduced motion
uniform vec3 uPaper;         // linear
uniform vec3 uInk;           // linear
uniform vec3 uPaperDeep;     // linear: rim colour over paper
uniform vec3 uInkRaised;     // linear: rim colour over ink
uniform float uBase;         // 0 paper, 1 ink: the theme when no bleed is active
uniform float uBleedActive;  // 0 or 1
uniform float uBleedP;       // front position: the mean line at (1.12 - 1.24 p) canvas heights from the top (D25.1)
uniform float uBleedDir;     // 1: paper above, ink below (boundary 1); 2: ink above, paper below (boundary 2)
uniform float uWavePx;       // wave amplitude in CSS px; 0 is a straight front
uniform float uHardEdge;     // 1: a plain cut at the front (reduced motion): no soft edge and no rim band
uniform vec2 uFibreAmp;      // fibre amplitude in sRGB units: (above the front, below the front)
uniform vec2 uVignette;      // vignette strength: (above the front, below the front)
uniform float uFibreOctaves; // 2, 3 or 4

layout(location = 0) out highp vec4 bgColor;

// 12 degrees. The streaks rise to the right in CSS coordinates (y down).
const float FIBRE_COS = 0.9781476;
const float FIBRE_SIN = 0.2079117;

// Exact sRGB transfer for values in [0, 1].
vec3 bgEncodeSRGB(vec3 c) {
  vec3 x = max(c, vec3(0.0));
  return mix(x * 12.92, 1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), x));
}

vec3 bgDecodeSRGB(vec3 s) {
  vec3 x = max(s, vec3(0.0));
  return mix(x / 12.92, pow((x + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), x));
}

// Hash in [0, 1). Built from fract and multiply only, so it stays exact on mobile GPUs, where
// sin of a large argument does not.
float bgHash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float bgHash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

// Unit gradient for a lattice cell.
vec2 bgGradient(vec2 cell) {
  float a = bgHash21(cell) * 6.2831853;
  return vec2(cos(a), sin(a));
}

// 2D gradient noise scaled to about [-1, 1]. The raw range is +-1/sqrt(2) for unit gradients.
float bgGradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n00 = dot(bgGradient(i), f);
  float n10 = dot(bgGradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float n01 = dot(bgGradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float n11 = dot(bgGradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return sqrt(2.0) * mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

// Paper fibre in [-1, 1]. fBm of gradient noise sampled in CSS px: one cycle per 160 px across the
// streak and 8 times that along it (1280 px), with the lattice turned 12 degrees. Lacunarity 2.03,
// gain 0.5. The sum is divided by the amplitude of the octaves used.
float bgFibre(vec2 px, float octaves) {
  vec2 q = vec2(dot(px, vec2(FIBRE_COS, -FIBRE_SIN)) / 1280.0, dot(px, vec2(FIBRE_SIN, FIBRE_COS)) / 160.0);
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= octaves) break;
    sum += amp * bgGradientNoise(q * freq + float(i) * vec2(17.31, 9.73));
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return clamp(sum / norm, -1.0, 1.0);
}

// Value noise in [-1, 1]: quintic interpolation between hashed lattice values.
float bgValueNoise(float x) {
  float i = floor(x);
  float f = x - i;
  float u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(bgHash11(i), bgHash11(i + 1.0), u) * 2.0 - 1.0;
}

// Ink-bleed front shape: fBm with 3 octaves, lacunarity 2.03, gain 0.5, divided by the amplitude
// sum 1.75, so it stays in [-1, 1].
float bgFrontNoise(float x) {
  float x2 = x * 2.03;
  return (bgValueNoise(x) + 0.5 * bgValueNoise(x2) + 0.25 * bgValueNoise(x2 * 2.03)) / 1.75;
}

// One theme's display colour at this pixel: the sRGB base plus its fibre, darkened by its vignette.
vec3 bgSide(vec3 base, float amp, float strength, float fibre, float shape) {
  return (base + amp * fibre) * (1.0 - strength * shape);
}

void main() {
  float dpr = uResolution.z;
  vec2 cssSize = uResolution.xy;
  vec2 devSize = cssSize * dpr;
  vec2 uv = gl_FragCoord.xy / devSize;          // 0..1 from the bottom left
  float x = uv.x;                               // viewport widths from the left
  float y = 1.0 - uv.y;                         // viewport heights from the top

  vec2 px = vec2(gl_FragCoord.x, devSize.y - gl_FragCoord.y) / dpr;   // CSS px, y down
  float fibre = bgFibre(px, uFibreOctaves);

  // Vignette in aspect-corrected units: 1 is one viewport height.
  vec2 centred = (uv - 0.5) * vec2(cssSize.x / cssSize.y, 1.0);
  float shape = smoothstep(0.55, 1.25, length(centred));

  vec3 sPaper = bgEncodeSRGB(uPaper);
  vec3 sInk = bgEncodeSRGB(uInk);

  vec3 colour;
  if (uBleedActive > 0.5) {
    // Boundary 1 puts ink below the front; boundary 2 puts paper below it.
    float newIsInk = uBleedDir < 1.5 ? 1.0 : 0.0;
    float oldIsInk = 1.0 - newIsInk;
    vec3 aboveCol = bgSide(mix(sPaper, sInk, oldIsInk), uFibreAmp.x, uVignette.x, fibre, shape);
    vec3 belowCol = bgSide(mix(sPaper, sInk, newIsInk), uFibreAmp.y, uVignette.y, fibre, shape);
    vec3 rimCol = bgSide(mix(bgEncodeSRGB(uPaperDeep), bgEncodeSRGB(uInkRaised), newIsInk), uFibreAmp.y, uVignette.y, fibre, shape);

    // The mean line in viewport heights from the top: 1.12 - 1.24 p. The choreography sets p so that the mean line sits on
    // the DOM boundary (D25.1). The wave is fBm along x, uWavePx in CSS px at its amplitude.
    float waveVh = uWavePx / max(cssSize.y, 1.0);
    float front = (1.12 - 1.24 * uBleedP) + waveVh * bgFrontNoise(2.2 * x + 0.4 * uTime);
    // The edge softens from the old theme into the mid-colour band (edge softness 0.012, centred on the front). The band
    // runs 0.010 below the edge, then the new theme takes over. A plain cut (uHardEdge 1) has neither.
    float d = y - front;                                                           // positive below the front
    float edge = mix(smoothstep(-0.006, 0.006, d), step(0.0, d), uHardEdge);
    float band = (1.0 - smoothstep(0.008, 0.012, d)) * (1.0 - uHardEdge);         // 1 across 0..0.010, soft outer edge
    colour = mix(aboveCol, mix(belowCol, rimCol, band), edge);
  } else {
    colour = bgSide(mix(sPaper, sInk, uBase), uFibreAmp.x, uVignette.x, fibre, shape);
  }

  // Triangular dither, +-1/255, in display space (see the header).
  float dither = bgHash21(gl_FragCoord.xy) + bgHash21(gl_FragCoord.xy + vec2(31.7, 11.3)) - 1.0;
  colour += dither / 255.0;

  bgColor = linearToOutputTexel(vec4(bgDecodeSRGB(colour), 1.0));
}
