import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * Cheap bloom: renders children once sharp and once blurred + screened on top.
 * Children must be deterministic (pure functions of frame), which all scenes are.
 */
export const Glow: React.FC<{ children: React.ReactNode; radius?: number; strength?: number }> = ({
  children,
  radius = 18,
  strength = 0.8,
}) => (
  <AbsoluteFill>
    <AbsoluteFill>{children}</AbsoluteFill>
    <AbsoluteFill style={{ filter: `blur(${radius}px) saturate(1.3)`, opacity: strength, mixBlendMode: "screen" }}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);
