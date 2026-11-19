import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, staticFile, type SpringConfig } from "remotion";

// ---------- Palette ----------
export const COLORS = {
  void: "#05060A", // background, never pure #000
  neon: "#FF4D2E", // true neon gas color: tube + atom
  blue: "#4C8DFF", // Gemini blue
  violet: "#9B5CFF", // electric violet
  cyan: "#3FF2FF", // cyan spark
  tubeWhite: "#FFF3EC", // hot center of every glowing line
} as const;

export type PaletteKey = keyof typeof COLORS;

/** sRGB triplet (0-1). For three.js colors use new THREE.Color(hex), which converts to linear. */
export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const mixHex = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = Math.min(1, Math.max(0, t));
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(ar + (br - ar) * k)}${to(ag + (bg - ag) * k)}${to(ab + (bb - ab) * k)}`;
};

export const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
};

// ---------- Type ----------
// Space Grotesk (display) + JetBrains Mono (HUD), from the Google Fonts catalog in
// @remotion/google-fonts. `npm run fonts` downloads the exact files into public/fonts so
// renders are offline and byte-identical (the render browser runs with --no-proxy-server).
export const FONTS = {
  display: "Space Grotesk",
  mono: "JetBrains Mono",
};
loadFont({ family: FONTS.display, url: staticFile("fonts/SpaceGrotesk-latin.woff2"), weight: "300 700", format: "woff2" });
loadFont({ family: FONTS.mono, url: staticFile("fonts/JetBrainsMono-latin.woff2"), weight: "100 800", format: "woff2" });

export const TYPE = {
  titleTracking: "-0.02em",
  hudSize: 18, // px at 1080p
};

// ---------- Motion ----------
/** Entrances: cubic-bezier(0.16, 1, 0.3, 1) */
export const EASE_IN_SCENE = Easing.bezier(0.16, 1, 0.3, 1);
/** Exits: cubic-bezier(0.7, 0, 0.84, 0) */
export const EASE_OUT_SCENE = Easing.bezier(0.7, 0, 0.84, 0);
/** Symmetric speed ramp used for camera moves (fast in, hold, fast out handled per shot). */
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Type that lands. */
export const LAND_SPRING: Partial<SpringConfig> = { damping: 14, stiffness: 180, mass: 1 };

/** Entrance tween helper, clamped. */
export const enter = (frame: number, start: number, dur: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + dur], [from, to], {
    easing: EASE_IN_SCENE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Exit tween helper, clamped. */
export const exit = (frame: number, start: number, dur: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + dur], [from, to], {
    easing: EASE_OUT_SCENE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Linear ramp 0..1 between two frames, clamped. */
export const ramp = (frame: number, a: number, b: number) => clamp01((frame - a) / (b - a));
