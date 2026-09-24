import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Slow virtual camera over a scene: push-in, lateral drift and a slight 3D tilt.
 * Linear over the scene's own duration, so holds keep moving gently.
 */
export const Camera: React.FC<{
  children: React.ReactNode;
  push?: number;
  driftX?: number;
  driftY?: number;
  tilt?: number;
}> = ({ children, push = 0.04, driftX = 0, driftY = 0, tilt = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const c = t - 0.5;
  return (
    <AbsoluteFill
      style={{
        transform: `perspective(2400px) translate(${driftX * c}px, ${driftY * c}px) scale(${1 + push * t}) rotateY(${tilt * c}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
