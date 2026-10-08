// Settings and the "time spent" counter, kept in localStorage. Every access is guarded:
// private windows and blocked storage simply fall back to defaults.
const KEY = 'velvet-hours:v1';

export const DEFAULT_SETTINGS = {
  quality: 'auto',
  volume: 0.8,
  muted: false,
  mix: { sand: 0.85, crystal: 0.8, slime: 0.85, bubble: 0.8, ambient: 0.6 },
  reduceEffects: false,
  flowMeter: true,
  timeSpent: 0,
  station: 0,
};

export function loadSettings() {
  const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return base;
    const merged = { ...base, ...saved, mix: { ...base.mix, ...(saved.mix || {}) } };
    if (!['auto', 'low', 'high', 'ultra'].includes(merged.quality)) merged.quality = 'auto';
    merged.volume = Math.min(1, Math.max(0, Number(merged.volume) || 0));
    merged.timeSpent = Math.max(0, Number(merged.timeSpent) || 0);
    return merged;
  } catch (_) {
    return base;
  }
}

export function saveSettings(s) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch (_) {
    /* storage unavailable: settings live for this session only */
  }
}
