import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS, ease, EASE_OUT } from "../theme";

/**
 * Callout with a thin leader line. `progress` 0..1: first half draws the line,
 * second half brings in the text. `side` is where the text sits relative to the elbow.
 */
export const Label: React.FC<{
  anchor: { x: number; y: number };
  at: { x: number; y: number };
  side: "left" | "right";
  title: string;
  sub?: string;
  progress: number;
  color?: string;
  opacity?: number;
}> = ({ anchor, at, side, title, sub, progress, color = COLORS.ryzen, opacity = 1 }) => {
  const dir = side === "right" ? 1 : -1;
  const elbowX = at.x - dir * 70;
  const lineP = ease(progress, [0, 0.55], [0, 1], EASE_OUT);
  const textP = ease(progress, [0.4, 1], [0, 1], EASE_OUT);
  const seg1 = Math.hypot(elbowX - anchor.x, at.y - anchor.y);
  const seg2 = Math.abs(at.x - elbowX);
  const len = seg1 + seg2;
  if (progress <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <circle cx={anchor.x} cy={anchor.y} r={5 * lineP} fill={color} />
        <circle cx={anchor.x} cy={anchor.y} r={14 * lineP} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
        <path
          d={`M${anchor.x},${anchor.y} L${elbowX},${at.y} L${at.x},${at.y}`}
          fill="none"
          stroke={COLORS.white}
          strokeOpacity={0.6}
          strokeWidth={1.5}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - lineP)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: at.y - 26,
          ...(side === "right" ? { left: at.x + 18 } : { right: 1920 - at.x + 18 }),
          textAlign: side === "right" ? "left" : "right",
          opacity: textP,
          transform: `translateX(${dir * (1 - textP) * 24}px)`,
          maxWidth: 440,
        }}
      >
        <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 40, color: COLORS.white, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {title}
        </div>
        {sub ? (
          <div style={{ fontFamily: FONTS.label, fontWeight: 400, fontSize: 24, color: COLORS.gray, marginTop: 8, lineHeight: 1.35 }}>
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
