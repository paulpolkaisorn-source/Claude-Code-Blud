import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

/** Floating specks in three depth layers; nearer layers drift faster and blur more. */
export const AmbientDust: React.FC<{ count?: number }> = ({ count = 70 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        {Array.from({ length: count }).map((_, i) => {
          const depth = 0.3 + random(`d${i}`) * 0.7;
          const speed = 0.25 + depth * 0.9;
          const x = (random(`x${i}`) * 2100 - frame * speed * 0.6) % 2100;
          const y = random(`y${i}`) * 1080 + Math.sin(frame * 0.01 + i) * 20 * depth;
          const warm = random(`c${i}`) < 0.5;
          const tw = 0.5 + 0.5 * Math.sin(frame * 0.05 + i * 1.7);
          return (
            <circle
              key={i}
              cx={x < -90 ? x + 2100 : x}
              cy={y}
              r={0.8 + depth * 2.2}
              fill={warm ? "#FF8A40" : "#FFFFFF"}
              opacity={(0.05 + depth * 0.18) * (0.6 + 0.4 * tw)}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
