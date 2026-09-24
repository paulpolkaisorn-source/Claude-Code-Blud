import React from "react";
import { COLORS } from "../theme";

/** Generic graphics card silhouette (not any specific product). */
export const GpuCard: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  draw?: number;
  fans?: number;
  fanAngle?: number;
  solid?: boolean;
  color?: string;
  strokeWidth?: number;
}> = ({ cx, cy, w, h, draw = 1, fans = 2, fanAngle = 0, solid = false, color = COLORS.radeon, strokeWidth = 3 }) => {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const perim = 2 * (w + h);
  const fanR = Math.min(h * 0.36, (w * 0.8) / fans / 2.2);
  const bracketW = w * 0.035;
  const fanArea = w - bracketW * 2;
  return (
    <g>
      {solid ? (
        <rect x={x0} y={y0} width={w} height={h} rx={h * 0.06} fill="#141013" />
      ) : null}
      <rect
        x={x0}
        y={y0}
        width={w}
        height={h}
        rx={h * 0.06}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={perim}
        strokeDashoffset={perim * (1 - draw)}
      />
      <g opacity={Math.max(0, draw * 1.4 - 0.4)}>
        {/* bracket */}
        <rect
          x={x0 - bracketW}
          y={y0 - h * 0.05}
          width={bracketW}
          height={h * 1.1}
          fill="none"
          stroke={COLORS.gray}
          strokeWidth={strokeWidth * 0.7}
        />
        {/* PCIe fingers */}
        <rect
          x={x0 + w * 0.12}
          y={y0 + h}
          width={w * 0.45}
          height={h * 0.07}
          fill={color}
          fillOpacity={0.35}
          stroke={color}
          strokeWidth={strokeWidth * 0.6}
        />
        {Array.from({ length: fans }).map((_, i) => {
          const fx = x0 + bracketW + (fanArea / fans) * (i + 0.5);
          const fy = cy;
          return (
            <g key={i}>
              <circle cx={fx} cy={fy} r={fanR} fill="none" stroke={color} strokeWidth={strokeWidth * 0.8} />
              <g transform={`rotate(${fanAngle + i * 17} ${fx} ${fy})`}>
                {Array.from({ length: 9 }).map((__, b) => (
                  <path
                    key={b}
                    transform={`rotate(${b * 40} ${fx} ${fy})`}
                    d={`M${fx},${fy - fanR * 0.2} Q${fx + fanR * 0.35},${fy - fanR * 0.55} ${fx + fanR * 0.12},${fy - fanR * 0.9}`}
                    fill="none"
                    stroke={COLORS.white}
                    strokeOpacity={0.55}
                    strokeWidth={strokeWidth * 0.6}
                  />
                ))}
              </g>
              <circle cx={fx} cy={fy} r={fanR * 0.2} fill={COLORS.bg} stroke={color} strokeWidth={strokeWidth * 0.6} />
            </g>
          );
        })}
      </g>
    </g>
  );
};
