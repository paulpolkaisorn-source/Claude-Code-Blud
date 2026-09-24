import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, spring, staticFile } from "remotion";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 4500;

// 120 BPM at 30 fps: one beat every 15 frames. Every scene cut sits on this grid.
export const BEAT = 15;

export const COLORS = {
  bg: "#0A0A0B",
  white: "#FFFFFF",
  gray: "#8A8A8F",
  ryzen: "#FF6A00",
  radeon: "#ED1C24",
  grid: "rgba(255,255,255,0.045)",
  panel: "#111113",
  panelEdge: "rgba(255,255,255,0.10)",
};

// Space Grotesk and Inter (Google Fonts, OFL) are bundled in public/fonts so renders
// never depend on network access. Both are variable fonts covering all weights used.
export const FONTS = {
  headline: "Space Grotesk",
  label: "Inter",
};

loadFont({
  family: FONTS.headline,
  url: staticFile("fonts/SpaceGrotesk-latin.woff2"),
  weight: "300 700",
});
loadFont({
  family: FONTS.label,
  url: staticFile("fonts/Inter-latin.woff2"),
  weight: "100 900",
});

// Fast ease-out for entrances, gentle in-out for drifts.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.in(Easing.cubic);
export const EASE_IN_OUT = Easing.inOut(Easing.cubic);

// High damping: settles fast, never wobbles.
export const SPRING_SMOOTH = { damping: 200, stiffness: 140, mass: 0.9 };
export const SPRING_SNAP = { damping: 200, stiffness: 420, mass: 0.6 };

/** Clamped interpolate from frame range to value range, ease-out by default. */
export const ease = (
  frame: number,
  range: [number, number],
  out: [number, number] = [0, 1],
  easing: (t: number) => number = EASE_OUT,
) =>
  interpolate(frame, range, out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Spring 0 -> 1 starting at `delay`. */
export const enter = (
  frame: number,
  delay = 0,
  config: typeof SPRING_SMOOTH = SPRING_SMOOTH,
) => spring({ frame: frame - delay, fps: FPS, config });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
