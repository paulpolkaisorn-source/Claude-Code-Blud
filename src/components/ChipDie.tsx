import React from "react";
import { COLORS } from "../theme";

/**
 * Flat processor die outline (not a logo). Outline draws with `draw`,
 * inner core grid fades with `detail`, `fill` lights the die body.
 */
export const ChipDie: React.FC<{
  cx: number;
  cy: number;
  size: number;
  draw?: number;
  detail?: number;
  fill?: number;
  color?: string;
  strokeWidth?: number;
}> = ({ cx, cy, size, draw = 1, detail = 1, fill = 0.1, color = COLORS.ryzen, strokeWidth = 3 }) => {
  const h = size / 2;
  const perim = size * 4;
  const pins = 9;
  const pinLen = size * 0.07;
  const inner = size * 0.72;
  const cell = inner / 4;
  return (
    <g>
      <rect
        x={cx - h}
        y={cy - h}
        width={size}
        height={size}
        fill={color}
        fillOpacity={fill}
        stroke="none"
      />
      <path
        d={`M${cx - h},${cy} V${cy - h} H${cx + h} V${cy + h} H${cx - h} Z`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={perim}
        strokeDashoffset={perim * (1 - draw)}
      />
      <g opacity={detail}>
        {Array.from({ length: pins }).map((_, i) => {
          const o = -h + ((i + 1) * size) / (pins + 1);
          return (
            <g key={i} stroke={color} strokeWidth={strokeWidth * 0.7} opacity={0.7}>
              <line x1={cx + o} y1={cy - h} x2={cx + o} y2={cy - h - pinLen} />
              <line x1={cx + o} y1={cy + h} x2={cx + o} y2={cy + h + pinLen} />
              <line x1={cx - h} y1={cy + o} x2={cx - h - pinLen} y2={cy + o} />
              <line x1={cx + h} y1={cy + o} x2={cx + h + pinLen} y2={cy + o} />
            </g>
          );
        })}
        {Array.from({ length: 8 }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return (
            <rect
              key={i}
              x={cx - inner / 2 + col * cell + cell * 0.12}
              y={cy - inner / 2 + row * cell * 1.6 + cell * 0.12}
              width={cell * 0.76}
              height={cell * 1.36}
              fill="none"
              stroke={color}
              strokeOpacity={0.55}
              strokeWidth={strokeWidth * 0.5}
            />
          );
        })}
        <rect
          x={cx - inner / 2 + cell * 0.12}
          y={cy - inner / 2 + cell * 3.3}
          width={inner - cell * 0.24}
          height={cell * 0.55}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={strokeWidth * 0.5}
        />
      </g>
    </g>
  );
};
