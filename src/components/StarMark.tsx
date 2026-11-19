import React from "react";
import { COLORS, mixHex } from "../theme";
import { NeonSvg, circlePath, type NeonShape } from "./NeonTube";

/**
 * Original four-point star mark for this fan concept (not an official logo).
 * Four separate curved neon tubes meet at the tips with small glass gaps,
 * around a nucleus dot (the neon atom). Outline only, never a filled shape.
 *
 * Geometry is in unit space, y up: tips at (0, 1), (A, 0), (0, -1), (-A, 0).
 */
export const STAR_ASPECT = 0.74; // horizontal tip reach vs vertical
const K = 0.1; // control point pull toward center (smaller = more concave)
const GAP = 0.04; // trimmed parameter at each tip (glass gap)
export const STAR_DOT = 0.075;

export type P2 = { x: number; y: number };

const TIPS: P2[] = [
  { x: 0, y: 1 },
  { x: STAR_ASPECT, y: 0 },
  { x: 0, y: -1 },
  { x: -STAR_ASPECT, y: 0 },
];
const CTRL: P2[] = [
  { x: K, y: K },
  { x: K, y: -K },
  { x: -K, y: -K },
  { x: -K, y: K },
];

const quad = (a: P2, c: P2, b: P2, t: number): P2 => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
};

/** Point on stroke i (0..3) at parameter t (0..1, already includes gap trimming). */
export const starPoint = (i: number, t: number): P2 => {
  const tt = GAP + (1 - 2 * GAP) * t;
  return quad(TIPS[i], CTRL[i], TIPS[(i + 1) % 4], tt);
};

/** Sampled points for stroke i from its midpoint outward toward one tip. dir -1 = toward start tip, +1 = toward end tip. */
export const starHalf = (i: number, dir: -1 | 1, progress: number, samples = 24): P2[] => {
  const pts: P2[] = [];
  const p = Math.max(0, Math.min(1, progress));
  for (let s = 0; s <= samples; s++) {
    const k = (s / samples) * p;
    pts.push(starPoint(i, 0.5 + dir * 0.5 * k));
  }
  return pts;
};

/** Full stroke samples. */
export const starStroke = (i: number, samples = 48): P2[] => Array.from({ length: samples + 1 }, (_, s) => starPoint(i, s / samples));

/** Brand gradient across the mark: Gemini blue (top-left) to electric violet (bottom-right), cyan near tips. */
export const starColorAt = (p: P2, coolMix: number): string => {
  const g = Math.max(0, Math.min(1, (p.x / STAR_ASPECT) * 0.35 - p.y * 0.5 + 0.5));
  const cool = mixHex(COLORS.blue, COLORS.violet, g);
  const tipness = Math.max(0, Math.hypot(p.x / STAR_ASPECT, p.y) - 0.82) / 0.18;
  const cooled = mixHex(cool, COLORS.cyan, Math.min(1, tipness) * 0.55);
  return mixHex(COLORS.neon, cooled, coolMix);
};

export type StarOpts = {
  cx: number;
  cy: number;
  /** Half height in px (tip to center). */
  size: number;
  rotation?: number; // degrees
  /** 0 = neon orange, 1 = blue/violet brand gradient. */
  coolMix?: number;
  /** Draw-on progress 0..1 (strokes grow from their midpoints to the tips). */
  progress?: number;
  intensity?: number;
  /** Tube diameter in px. */
  stroke?: number;
  dot?: boolean;
  segments?: number;
  /** Optional solid color override (montage remixes). */
  solid?: string;
};

/** Neon shapes for the star, to merge into any NeonSvg. */
export const starShapes = (o: StarOpts): NeonShape[] => {
  const { cx, cy, size, rotation = 0, coolMix = 1, progress = 1, intensity = 1, stroke = size * 0.05, dot = true, segments = 6, solid } = o;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toScreen = (p: P2) => ({ x: cx + (p.x * cos - p.y * sin) * size, y: cy - (p.x * sin + p.y * cos) * size });
  const shapes: NeonShape[] = [];
  for (let i = 0; i < 4; i++) {
    for (const dir of [-1, 1] as const) {
      const pts = starHalf(i, dir, progress, segments * 4);
      for (let s = 0; s < segments; s++) {
        const seg = pts.slice(s * 4, s * 4 + 5);
        if (seg.length < 2) continue;
        const scr = seg.map(toScreen);
        const d = `M ${scr[0].x} ${scr[0].y} ` + scr.slice(1).map((q) => `L ${q.x} ${q.y}`).join(" ");
        const mid = seg[Math.floor(seg.length / 2)];
        shapes.push({ d, color: solid ?? starColorAt(mid, coolMix), width: stroke, intensity });
      }
    }
  }
  if (dot) {
    const c = toScreen({ x: 0, y: 0 });
    const dotScale = Math.min(1, progress * 1.5);
    shapes.push({
      d: circlePath(c.x, c.y, size * STAR_DOT * dotScale + 0.01),
      color: solid ?? mixHex(COLORS.neon, COLORS.cyan, coolMix * 0.7),
      width: stroke,
      intensity,
      fill: true,
    });
  }
  return shapes;
};

/** Standalone 2D star mark. */
export const StarMark2D: React.FC<StarOpts & { width: number; height: number; bloom?: number; bloomRadius?: number }> = ({ width, height, bloom = 1, bloomRadius, ...o }) => (
  <NeonSvg width={width} height={height} shapes={starShapes(o)} bloom={bloom} bloomRadius={bloomRadius ?? o.size * 0.12} />
);
