import React from "react";
import { COLORS } from "../theme";

/**
 * GPU die as a grid of compute units. `wave` (0..1.3) sweeps a red front
 * from left to right; units behind the front stay softly lit.
 */
export const GpuDie: React.FC<{
  cx: number;
  cy: number;
  cols?: number;
  rows?: number;
  cell?: number;
  gap?: number;
  wave: number;
  color?: string;
}> = ({ cx, cy, cols = 16, rows = 8, cell = 56, gap = 12, wave, color = COLORS.radeon }) => {
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const pad = 28;
  return (
    <g>
      <rect
        x={x0 - pad}
        y={y0 - pad}
        width={w + pad * 2}
        height={h + pad * 2}
        fill="#0E0B0C"
        stroke={color}
        strokeOpacity={0.6}
        strokeWidth={2}
      />
      {Array.from({ length: cols * rows }).map((_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        // Diagonal-ish wave front, measured 0..1 across the die.
        const d = (c / (cols - 1)) * 0.85 + (Math.abs(r - (rows - 1) / 2) / rows) * 0.3;
        const front = wave - d;
        const peak = Math.max(0, 1 - Math.abs(front) / 0.12);
        const trail = front > 0 ? 0.35 : 0;
        const lit = Math.min(1, Math.max(peak, trail));
        return (
          <g key={i}>
            <rect
              x={x0 + c * (cell + gap)}
              y={y0 + r * (cell + gap)}
              width={cell}
              height={cell}
              fill={color}
              fillOpacity={0.06 + lit * 0.85}
              stroke={color}
              strokeOpacity={0.35 + lit * 0.65}
              strokeWidth={1.5}
            />
            <rect
              x={x0 + c * (cell + gap) + cell * 0.2}
              y={y0 + r * (cell + gap) + cell * 0.2}
              width={cell * 0.6}
              height={cell * 0.6}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.05 + peak * 0.5}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
};
