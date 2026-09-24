import React from "react";
import { random } from "remotion";

/**
 * Particles flowing along horizontal lanes between x1 and x2.
 * `travel` is the accumulated distance (in lane lengths); feed it an integrated
 * speed so particles accelerate smoothly and deterministically.
 */
export const ParticleStream: React.FC<{
  x1: number;
  x2: number;
  lanes: number[];
  dir: 1 | -1;
  color: string;
  travel: number;
  perLane?: number;
  tail?: number;
  size?: number;
  seed?: string;
}> = ({ x1, x2, lanes, dir, color, travel, perLane = 6, tail = 30, size = 4, seed = "p" }) => {
  const span = x2 - x1;
  return (
    <g>
      {lanes.map((y, l) =>
        Array.from({ length: perLane }).map((_, k) => {
          const phase = random(`${seed}-${l}-${k}`);
          const rate = 0.85 + random(`${seed}-r-${l}-${k}`) * 0.3;
          const raw = phase + travel * rate;
          const pos = raw - Math.floor(raw);
          const x = dir > 0 ? x1 + pos * span : x2 - pos * span;
          const edge = Math.min(pos, 1 - pos);
          const alpha = Math.min(1, edge / 0.08);
          return (
            <g key={`${l}-${k}`} opacity={alpha}>
              <line x1={x} y1={y} x2={x - dir * tail} y2={y} stroke={color} strokeOpacity={0.45} strokeWidth={size * 0.8} strokeLinecap="round" />
              <circle cx={x} cy={y} r={size} fill={color} />
            </g>
          );
        }),
      )}
    </g>
  );
};
