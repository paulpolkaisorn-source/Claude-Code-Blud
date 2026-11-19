import React, { useId } from "react";
import { COLORS, mixHex } from "../theme";

/**
 * 2D neon renderer. Every emissive line follows the glow rule:
 * a white-hot core + a tinted tube body + a mid glow + a wide colored bloom.
 * All shapes of one SVG share two blur passes (wide + mid) for speed.
 */
export type NeonShape = {
  d: string;
  color: string;
  /** Tube diameter in px. */
  width: number;
  /** 0 = off (only glass visible), 1 = fully lit, >1 = overdriven. */
  intensity?: number;
  /** Draw the unlit glass body under the gas glow. */
  glass?: boolean;
  /** 0..1 draw-on progress via stroke-dashoffset. */
  progress?: number;
  /** Filled shape (dots, sparks) instead of stroke. */
  fill?: boolean;
  /** Extra opacity multiplier for the whole shape. */
  opacity?: number;
};

type Props = {
  width: number;
  height: number;
  shapes: NeonShape[];
  /** Bloom amount (animated per scene). 1 = default. */
  bloom?: number;
  /** Bloom radius in px at bloom = 1. */
  bloomRadius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Rendered under the neon layers (e.g. background structure). */
  under?: React.ReactNode;
  transform?: string;
};

const dashProps = (progress: number | undefined) =>
  progress === undefined || progress >= 1
    ? {}
    : {
        pathLength: 1,
        strokeDasharray: "1 1",
        strokeDashoffset: 1 - Math.max(0, progress),
      };

export const NeonSvg: React.FC<Props> = ({
  width,
  height,
  shapes,
  bloom = 1,
  bloomRadius = 16,
  style,
  children,
  under,
  transform,
}) => {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wideId = `nw${raw}`;
  const midId = `nm${raw}`;
  const visible = shapes.filter((s) => (s.progress ?? 1) > 0.0001);
  const lit = visible.filter((s) => (s.intensity ?? 1) > 0.001);

  const layer = (s: NeonShape, i: number, kind: "wide" | "mid" | "body" | "core") => {
    const I = (s.intensity ?? 1) * (s.opacity ?? 1);
    const dash = dashProps(s.progress);
    const cfg = {
      wide: { w: 5.2, col: s.color, op: Math.min(1, 0.55 * I * bloom) },
      mid: { w: 2.1, col: s.color, op: Math.min(1, 0.9 * I) },
      body: { w: 1.0, col: mixHex(s.color, COLORS.tubeWhite, 0.3), op: Math.min(1, I) },
      core: { w: 0.42, col: COLORS.tubeWhite, op: Math.min(1, Math.pow(Math.min(I, 1), 1.4)) },
    }[kind];
    if (s.fill) {
      const fillScale = { wide: 1, mid: 1, body: 1, core: 1 }[kind];
      return (
        <path
          key={`${kind}${i}`}
          d={s.d}
          fill={cfg.col}
          opacity={cfg.op * fillScale}
          stroke={kind === "wide" ? cfg.col : "none"}
          strokeWidth={kind === "wide" ? s.width * 2 : 0}
        />
      );
    }
    return (
      <path
        key={`${kind}${i}`}
        d={s.d}
        fill="none"
        stroke={cfg.col}
        strokeWidth={s.width * cfg.w}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={cfg.op}
        {...dash}
      />
    );
  };

  const r = bloomRadius * Math.max(0.2, bloom);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
      <defs>
        <filter id={wideId} filterUnits="userSpaceOnUse" x={-width * 0.25} y={-height * 0.25} width={width * 1.5} height={height * 1.5}>
          <feGaussianBlur stdDeviation={r} />
        </filter>
        <filter id={midId} filterUnits="userSpaceOnUse" x={-width * 0.25} y={-height * 0.25} width={width * 1.5} height={height * 1.5}>
          <feGaussianBlur stdDeviation={Math.max(1.5, r * 0.28)} />
        </filter>
      </defs>
      <g transform={transform}>
        {under}
        {/* Unlit glass bodies */}
        <g>
          {visible
            .filter((s) => s.glass && !s.fill)
            .map((s, i) => (
              <g key={`g${i}`} opacity={s.opacity ?? 1}>
                <path d={s.d} fill="none" stroke="#9DB2DA" strokeOpacity={0.16} strokeWidth={s.width * 1.9} strokeLinecap="round" strokeLinejoin="round" {...dashProps(s.progress)} />
                <path d={s.d} fill="none" stroke={COLORS.void} strokeOpacity={0.85} strokeWidth={s.width * 1.35} strokeLinecap="round" strokeLinejoin="round" {...dashProps(s.progress)} />
                <path d={s.d} fill="none" stroke={mixHex(s.color, "#6A3A30", 0.6)} strokeOpacity={0.35} strokeWidth={s.width * 0.55} strokeLinecap="round" strokeLinejoin="round" {...dashProps(s.progress)} />
              </g>
            ))}
        </g>
        <g filter={`url(#${wideId})`}>{lit.map((s, i) => layer(s, i, "wide"))}</g>
        <g filter={`url(#${midId})`}>{lit.map((s, i) => layer(s, i, "mid"))}</g>
        <g>{lit.map((s, i) => layer(s, i, "body"))}</g>
        <g>{lit.map((s, i) => layer(s, i, "core"))}</g>
        {children}
      </g>
    </svg>
  );
};

/** Circle as a path (for sparks / dust in NeonSvg). */
export const circlePath = (x: number, y: number, r: number) =>
  `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

/**
 * A straight horizontal neon tube with electrode caps, built for S1 and S10.
 * Returns shapes for NeonSvg plus the electrode decoration.
 */
export const straightTube = (x1: number, x2: number, y: number, diameter: number, color: string, intensity: number): NeonShape[] => {
  const inset = diameter * 2.2; // dark electrode zone at each end
  return [
    { d: `M ${x1} ${y} L ${x2} ${y}`, color, width: diameter, intensity: 0, glass: true },
    { d: `M ${x1 + inset} ${y} L ${x2 - inset} ${y}`, color, width: diameter, intensity },
  ];
};

/** Electrode end caps + lead wires for a straight tube. */
export const Electrodes: React.FC<{ x1: number; x2: number; y: number; diameter: number; lit: number }> = ({ x1, x2, y, diameter, lit }) => {
  const capW = diameter * 2.6;
  const capH = diameter * 1.55;
  const cap = (x: number, dir: 1 | -1) => (
    <g key={x}>
      {/* lead wire */}
      <path
        d={`M ${x - dir * capW * 0.2} ${y} q ${-dir * diameter * 3} ${diameter * 0.2} ${-dir * diameter * 4} ${diameter * 4.5}`}
        fill="none"
        stroke="#3A4256"
        strokeWidth={diameter * 0.18}
        strokeLinecap="round"
      />
      <rect
        x={dir === 1 ? x - capW * 0.25 : x - capW * 0.75}
        y={y - capH / 2}
        width={capW}
        height={capH}
        rx={capH * 0.35}
        fill="#141A28"
        stroke="#4A5470"
        strokeWidth={diameter * 0.12}
      />
      <rect
        x={dir === 1 ? x - capW * 0.1 : x - capW * 0.6}
        y={y - capH * 0.32}
        width={capW * 0.7}
        height={capH * 0.16}
        rx={capH * 0.08}
        fill="#7C88A8"
        opacity={0.35 + 0.4 * lit}
      />
    </g>
  );
  return (
    <g>
      {cap(x1, 1)}
      {cap(x2, -1)}
    </g>
  );
};

// ---------- Bent-glass tube lettering ----------
// Single-stroke letterforms in cap-height units (y down, 0 = top, 1 = baseline).
// Round joins + round caps read as bent glass. Each letter is one or two tubes,
// with dark painted-out connectors between letters like a real sign.
type Glyph = { w: number; tubes: string[]; start: [number, number]; end: [number, number] };

const GLYPHS: Record<string, Glyph> = {
  N: { w: 0.7, tubes: ["M 0 1 L 0 0.02 L 0.7 0.98 L 0.7 0"], start: [0, 1], end: [0.7, 0] },
  E: {
    w: 0.6,
    tubes: ["M 0.6 0 L 0.06 0 Q 0 0 0 0.06 L 0 0.94 Q 0 1 0.06 1 L 0.6 1", "M 0.04 0.5 L 0.48 0.5"],
    start: [0.6, 0],
    end: [0.6, 1],
  },
  O: {
    w: 0.82,
    tubes: ["M 0.34 1 C 0.04 1 0 0.82 0 0.5 C 0 0.16 0.06 0 0.41 0 C 0.76 0 0.82 0.16 0.82 0.5 C 0.82 0.82 0.78 1 0.48 1"],
    start: [0.34, 1],
    end: [0.48, 1],
  },
};

const scalePath = (d: string, x: number, y: number, s: number) =>
  d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_, a: string, b: string) => `${x + parseFloat(a) * s} ${y + parseFloat(b) * s}`);

export const NEON_TRACK = 0.3; // letter gap in cap heights

export const neonWordWidth = (word: string) => {
  const letters = word.split("").filter((c) => GLYPHS[c]);
  return letters.reduce((acc, c) => acc + GLYPHS[c].w, 0) + NEON_TRACK * Math.max(0, letters.length - 1);
};

/**
 * Shapes for a tube-lettered word. intensityFor(i) gives each letter's lit level
 * (so letters can flicker independently). (x, y) is the top-left of the cap box.
 */
export const neonWordShapes = (
  word: string,
  x: number,
  y: number,
  capHeight: number,
  color: string,
  diameter: number,
  intensityFor: (letterIndex: number) => number,
): NeonShape[] => {
  const shapes: NeonShape[] = [];
  let cursor = 0;
  let prevEnd: [number, number] | null = null;
  word.split("").forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    const ox = x + cursor * capHeight;
    if (prevEnd) {
      // painted-out connector tube (glass only, never lit)
      const sx = prevEnd[0];
      const sy = prevEnd[1];
      const ex = ox + g.start[0] * capHeight;
      const ey = y + g.start[1] * capHeight;
      const top = Math.abs(sy - y) < capHeight * 0.05 && Math.abs(ey - y) < capHeight * 0.05;
      const bottom = Math.abs(sy - (y + capHeight)) < capHeight * 0.05 && Math.abs(ey - (y + capHeight)) < capHeight * 0.05;
      const routeY = top ? y - capHeight * 0.14 : bottom ? y + capHeight * 1.14 : null;
      shapes.push({
        d:
          routeY === null
            ? `M ${sx} ${sy} L ${ex} ${ey}`
            : `M ${sx} ${sy} Q ${sx} ${routeY} ${sx + (ex - sx) * 0.2} ${routeY} L ${ex - (ex - sx) * 0.2} ${routeY} Q ${ex} ${routeY} ${ex} ${ey}`,
        color,
        width: diameter * 0.75,
        intensity: 0,
        glass: true,
        opacity: 0.55,
      });
    }
    g.tubes.forEach((t) => {
      shapes.push({ d: scalePath(t, ox, y, capHeight), color, width: diameter, intensity: intensityFor(i), glass: true });
    });
    prevEnd = [ox + g.end[0] * capHeight, y + g.end[1] * capHeight];
    cursor += g.w + NEON_TRACK;
  });
  return shapes;
};
