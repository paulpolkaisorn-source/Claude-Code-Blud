// Audio map. Music bed + SFX cues by frame (60 fps, 120 BPM grid).
// Files live in public/audio/. Missing files are skipped, so the film still
// renders silently. `npm run audio` regenerates the synthesized placeholders.
import { CUES } from "./timing";

export type SfxName = "buzz" | "hum" | "whoosh" | "subhit" | "riser";

export const SFX_FILES: Record<SfxName, string> = {
  buzz: "audio/sfx-buzz.mp3",
  hum: "audio/sfx-hum.mp3",
  whoosh: "audio/sfx-whoosh.mp3",
  subhit: "audio/sfx-subhit.mp3",
  riser: "audio/sfx-riser.mp3",
};

export const MUSIC = {
  file: "audio/track.mp3",
  bpm: 120,
  volume: 0.75,
  /** Music and hum stop with the final flicker. */
  endFrame: CUES.finalFlicker,
};

export type SfxCue = {
  frame: number;
  sfx: SfxName;
  volume: number;
  /** Frames to play (default: let the file play out, capped at the film end). */
  duration?: number;
  loop?: boolean;
  note: string;
};

const S4_NEON_FLICKERS = CUES.ignitionFlickers.map((f) => CUES.neonOn + f); // 480, 492, 501
const S10_NEON_FLICKERS = CUES.ignitionFlickers.map((f) => 1640 + f); // 1650, 1662, 1671

export const SFX_CUES: SfxCue[] = [
  // S1: tube flicker buzzes, then the hum once it holds
  ...CUES.ignitionFlickers.map((frame, i) => ({ frame, sfx: "buzz" as const, volume: [0.45, 0.35, 0.6][i], note: `S1 flicker ${i + 1}` })),
  { frame: 31, sfx: "hum", volume: 0.1, duration: 59, loop: true, note: "S1 tube hum" },
  // S4: sub-bass hit on the title slam, NEON flicker buzzes, white flash hit
  { frame: CUES.titleLetters, sfx: "subhit", volume: 0.9, note: "S4 title slam" },
  ...S4_NEON_FLICKERS.map((frame, i) => ({ frame, sfx: "buzz" as const, volume: [0.45, 0.35, 0.6][i], note: `S4 NEON flicker ${i + 1}` })),
  { frame: S4_NEON_FLICKERS[2], sfx: "hum", volume: 0.08, duration: 600 - S4_NEON_FLICKERS[2], loop: true, note: "S4 NEON hum" },
  { frame: CUES.flashS4, sfx: "subhit", volume: 0.85, note: "S4 white flash" },
  // S6 -> S7 whip-pan (whoosh peaks on the cut at 1020)
  { frame: CUES.whipS6, sfx: "whoosh", volume: 0.7, note: "S6 whip-pan out" },
  // S8 montage: whip-pan cuts get whooshes, white-flash cuts get sub hits
  { frame: 1290 - 16, sfx: "whoosh", volume: 0.55, note: "S8 whip into cut 03" },
  { frame: 1318, sfx: "subhit", volume: 0.7, note: "S8 white flash into cut 05" },
  { frame: 1335 - 16, sfx: "whoosh", volume: 0.55, note: "S8 whip into cut 06" },
  { frame: 1380 - 16, sfx: "whoosh", volume: 0.55, note: "S8 whip into cut 09" },
  { frame: 1408, sfx: "subhit", volume: 0.7, note: "S8 white flash into cut 11" },
  // S9: riser across the implosion, hit on the white flash
  { frame: CUES.riserStart, sfx: "riser", volume: 0.75, duration: CUES.flashS9 - CUES.riserStart, note: "S9 riser" },
  { frame: CUES.flashS9, sfx: "subhit", volume: 1.0, note: "S9 white flash" },
  // S10: hum under the end card until the final flicker, NEON buzzes, last flicker buzz
  { frame: 1620, sfx: "hum", volume: 0.12, duration: CUES.finalFlicker - 1620, loop: true, note: "S10 tube hum" },
  ...S10_NEON_FLICKERS.map((frame, i) => ({ frame, sfx: "buzz" as const, volume: [0.4, 0.3, 0.5][i], note: `S10 NEON flicker ${i + 1}` })),
  { frame: CUES.finalFlicker, sfx: "buzz", volume: 0.7, duration: 11, note: "S10 final flicker" },
];
