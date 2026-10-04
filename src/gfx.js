// Graphics quality profiles. Every game scales resolution, simulation density,
// particle counts and post-processing from one of these.
//
// NOTE: "ULTRA by RTX" is the top tier of *rasterized* rendering (supersampling, 8x MSAA,
// GTAO, 8K soft shadows, heavy simulation density). Browsers cannot do hardware ray tracing.

export const LEVELS = ['low', 'normal', 'high', 'extra', 'max', 'ultra'];
export const LABELS = { low: 'Low', normal: 'Normal', high: 'High', extra: 'Extra', max: 'Max', ultra: 'ULTRA by RTX' };
export const DESCRIPTIONS = {
  auto: 'Picks a level for your device (detects RTX / Apple / Radeon GPUs).',
  low: 'Battery saver: lowest resolution, fewest effects.',
  normal: 'Balanced for phones and older laptops.',
  high: 'Sharp, with bloom and glass transmission.',
  extra: 'Real soft shadows, 4x MSAA, denser simulations.',
  max: 'Adds ambient occlusion, 8x MSAA and 1.25x supersampling.',
  ultra: 'Everything maxed: 1.5x supersampling, GTAO, 8K shadows, 3x particles. Built for RTX-class GPUs (rasterized, not ray traced).',
};

export function makeProfile(id) {
  const level = Math.max(0, LEVELS.indexOf(id));
  const t = (arr) => arr[level];
  return {
    id: LEVELS[level],
    level,
    label: LABELS[LEVELS[level]],
    legacy: level >= 2 ? 'high' : 'low', // old two-state flag some code still reads
    dpr: t([1, 1.25, 1.75, 2, 2.5, 3]),          // max pixel ratio
    ss: t([1, 1, 1, 1, 1.25, 1.5]),              // supersample multiplier on top of devicePixelRatio
    pixels2D: t([1.1e6, 1.8e6, 2.6e6, 3.8e6, 5.5e6, 8.5e6]), // canvas pixel budget for 2D games
    antialias: level >= 1,
    msaa: t([0, 0, 4, 4, 8, 8]),                 // composer render-target samples
    bloom: level >= 2,
    bloomMul: t([0, 0, 1, 1.1, 1.25, 1.5]),
    ao: level >= 4,                              // GTAO
    aoMul: t([0, 0, 0, 0, 1, 1.6]),
    shadows: t([0, 0, 0, 2048, 4096, 8192]),     // shadow map size, 0 = off
    transmission: level >= 2,
    transmissionScale: t([0.5, 0.5, 0.75, 1, 1, 1.25]),
    detail: t([0.55, 0.75, 1, 1.3, 1.6, 1.9]),   // mesh / simulation density multiplier
    particles: t([0.35, 0.65, 1, 1.5, 2.2, 3]),  // particle count multiplier
    anisotropy: t([1, 2, 4, 8, 16, 16]),
  };
}

/** Best-effort GPU sniff for the Auto setting. Never returns ultra (it is opt-in). */
export function detectAuto() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const small = Math.min(screen.width, screen.height) < 520;
  const touch = navigator.maxTouchPoints > 0;
  let renderer = '';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (_) { /* ignore */ }
  if (/swiftshader|llvmpipe|software/i.test(renderer)) return 'low';
  if (/RTX\s?(20|30|40|50)|RX\s?(6[89]|7|9)\d{2}|Radeon Pro W|Apple M[3-9]/i.test(renderer)) return 'max';
  if (/RTX|GTX 1[0-9]{3}|RX\s?[56]\d{2}|Apple M[12]|Arc/i.test(renderer)) return 'extra';
  if (small || touch) return cores >= 8 && mem >= 6 ? 'high' : 'normal';
  if (cores >= 8 && mem >= 8) return 'extra';
  if (cores >= 6) return 'high';
  return 'normal';
}
