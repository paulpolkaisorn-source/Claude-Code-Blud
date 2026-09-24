import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/** A 6-frame light hit at a hard cut, tinted to the scene's accent. */
export const BeatFlash: React.FC<{ color?: string; strength?: number }> = ({ color = "#FFFFFF", strength = 0.14 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [strength, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
        opacity: o,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};
