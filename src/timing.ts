// Timing grid: 120 BPM at 60 fps.
// 1 beat = 30 frames, 1 bar = 4 beats = 120 frames, half beat = 15 frames.

export const FPS = 60;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 30
export const HALF_BEAT = BEAT / 2; // 15
export const BAR = BEAT * 4; // 120
export const TOTAL_FRAMES = 1800; // exactly 30.0 s

/** Frame number of beat n (0-based). beat(8) = 240. */
export const beat = (n: number) => Math.round(n * BEAT);
/** Frame number of bar n (0-based). bar(2) = 240. */
export const bar = (n: number) => Math.round(n * BAR);
/** Frame number of half beat n (0-based). halfBeat(3) = 45. */
export const halfBeat = (n: number) => Math.round(n * HALF_BEAT);

export const isOnBeat = (frame: number) => frame % BEAT === 0;
export const isOnHalfBeat = (frame: number) => frame % HALF_BEAT === 0;

/** Seconds to frames at the project frame rate. */
export const sec = (s: number) => Math.round(s * FPS);

export type SceneDef = {
  id: string;
  name: string;
  from: number;
  duration: number;
};

// Master edit. Every scene boundary sits on the beat grid (multiples of 30).
export const SCENES = {
  S01: { id: "S01", name: "Ignition", from: beat(0), duration: beat(3) }, // 0-90
  S02: { id: "S02", name: "Into the atom", from: beat(3), duration: beat(5) }, // 90-240
  S03: { id: "S03", name: "Collapse into the star", from: beat(8), duration: beat(6) }, // 240-420
  S04: { id: "S04", name: "Title slam", from: beat(14), duration: beat(6) }, // 420-600
  S05: { id: "S05", name: "Speed lane", from: beat(20), duration: beat(6) }, // 600-780
  S06: { id: "S06", name: "Feature cards", from: beat(26), duration: beat(8) }, // 780-1020
  S07: { id: "S07", name: "2D to 3D city", from: beat(34), duration: beat(8) }, // 1020-1260
  S08: { id: "S08", name: "Montage", from: beat(42), duration: beat(6) }, // 1260-1440
  S09: { id: "S09", name: "Implosion", from: beat(48), duration: beat(6) }, // 1440-1620
  S10: { id: "S10", name: "End card", from: beat(54), duration: beat(6) }, // 1620-1800
} as const satisfies Record<string, SceneDef>;

export const SCENE_LIST: SceneDef[] = Object.values(SCENES);

// Key event frames referenced by more than one file (visuals + SFX).
export const CUES = {
  ignitionFlickers: [10, 22, 31],
  zoomThroughS1: 72, // S1 starts pushing into the tube light
  ringSnap: 240,
  glitchS3: 414, // 4-frame glitch slice, 414-417
  titleLetters: 420, // first letter of GEMINI 4, then every 3 frames
  neonOn: 470, // NEON ignition pattern origin: first flicker on the beat at 480, catches at 501
  flashS4: 598, // 2-frame white flash 598-599
  streakFreeze: 774, // 6-frame freeze 774-779
  glitchS5: 776, // glitch slice across the freeze, 776-779
  panelArrivals: [780, 860, 940],
  whipS6: 1005, // whip-pan out 1005-1019, lands on 1020
  extrude: 1080,
  montageStart: 1260,
  riserStart: 1440,
  flashS9: 1618, // 2-frame white flash 1618-1619
  finalFlicker: 1788,
  lastFrame: TOTAL_FRAMES - 1,
} as const;

// Montage: 12 cuts x 15 frames, every cut on a half beat.
export const MONTAGE_CUTS = Array.from({ length: 12 }, (_, i) => SCENES.S08.from + i * HALF_BEAT);
