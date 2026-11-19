import React from "react";
import { useLayout } from "../layout";
import { COLORS, FONTS, TYPE, withAlpha } from "../theme";

/**
 * A copy line from copy.ts. Empty string = layer hidden (scene still plays).
 * Font size shrinks to keep the line inside the given width (title-safe).
 */
export const fitFontSize = (text: string, maxWidth: number, base: number, charWidth = 0.56, maxLines = 1) => {
  const chars = Math.max(1, text.length);
  const perLine = Math.ceil(chars / maxLines);
  return Math.min(base, maxWidth / (perLine * charWidth));
};

export const CopyText: React.FC<{
  text: string;
  size: number;
  maxWidth: number;
  color?: string;
  glow?: string;
  glowAmount?: number;
  weight?: 500 | 700;
  style?: React.CSSProperties;
  maxLines?: number;
  uppercase?: boolean;
  letterStyle?: (i: number) => React.CSSProperties | undefined;
}> = ({ text, size, maxWidth, color = COLORS.tubeWhite, glow = COLORS.blue, glowAmount = 1, weight = 700, style, maxLines = 2, uppercase = false, letterStyle }) => {
  const L = useLayout();
  if (!text || text.trim() === "") return null;
  const fs = fitFontSize(text, maxWidth, size, 0.56, maxLines);
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: weight,
        fontSize: fs,
        lineHeight: 1.08,
        letterSpacing: TYPE.titleTracking,
        color,
        maxWidth,
        textAlign: "center",
        textTransform: uppercase ? "uppercase" : "none",
        textShadow:
          glowAmount > 0
            ? `0 0 ${4 * L.unit}px ${withAlpha(COLORS.tubeWhite, 0.5 * glowAmount)}, 0 0 ${18 * L.unit}px ${withAlpha(glow, 0.75 * glowAmount)}, 0 0 ${48 * L.unit}px ${withAlpha(glow, 0.45 * glowAmount)}`
            : undefined,
        ...style,
      }}
    >
      {letterStyle
        ? words.map((w, i) => (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...letterStyle(i) }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))
        : text}
    </div>
  );
};
