import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../layout";
import { COLORS, FONTS, TYPE, withAlpha } from "../theme";

type Corner = "tl" | "tr" | "bl" | "br";

/** Small JetBrains Mono data text, pinned inside the title-safe area. */
export const HudText: React.FC<{
  corner: Corner;
  children: React.ReactNode;
  color?: string;
  opacity?: number;
  size?: number;
  offsetY?: number;
}> = ({ corner, children, color = COLORS.tubeWhite, opacity = 0.8, size, offsetY = 0 }) => {
  const L = useLayout();
  const fs = (size ?? TYPE.hudSize) * L.unit;
  const pos: React.CSSProperties = {
    position: "absolute",
    [corner[0] === "t" ? "top" : "bottom"]: L.safe.y + offsetY * L.unit,
    [corner[1] === "l" ? "left" : "right"]: L.safe.x,
    textAlign: corner[1] === "l" ? "left" : "right",
  };
  return (
    <div
      style={{
        ...pos,
        fontFamily: FONTS.mono,
        fontWeight: 500,
        fontSize: fs,
        letterSpacing: "0.08em",
        color,
        opacity,
        whiteSpace: "pre",
        textShadow: `0 0 ${8 * L.unit}px ${withAlpha(color, 0.6)}`,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </div>
  );
};

/** Registration ticks in the corners of the safe area. */
export const SafeTicks: React.FC<{ color?: string; opacity?: number }> = ({ color = COLORS.tubeWhite, opacity = 0.25 }) => {
  const L = useLayout();
  const len = 26 * L.unit;
  const { x, y, w, h } = L.safe;
  const d = [
    `M ${x} ${y + len} L ${x} ${y} L ${x + len} ${y}`,
    `M ${x + w - len} ${y} L ${x + w} ${y} L ${x + w} ${y + len}`,
    `M ${x} ${y + h - len} L ${x} ${y + h} L ${x + len} ${y + h}`,
    `M ${x + w - len} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + h - len}`,
  ].join(" ");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={L.width} height={L.height}>
        <path d={d} stroke={color} strokeWidth={1.5 * L.unit} fill="none" opacity={opacity} />
      </svg>
    </AbsoluteFill>
  );
};

/** Frame counter, zero padded. */
export const frameCode = (f: number) => String(Math.max(0, Math.floor(f))).padStart(4, "0");

/** SMPTE-style timecode at 60 fps. */
export const timecode = (f: number) => {
  const fr = Math.floor(f) % 60;
  const s = Math.floor(f / 60);
  return `00:00:${String(s).padStart(2, "0")}:${String(fr).padStart(2, "0")}`;
};
