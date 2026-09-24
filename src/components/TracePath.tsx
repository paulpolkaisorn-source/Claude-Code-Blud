import React from "react";
import { polyLength, pointAt, Pt, toD } from "./paths";

/** A polyline that draws itself from 0 to `progress`, with a bright head. */
export const TracePath: React.FC<{
  pts: Pt[];
  progress: number;
  color: string;
  width?: number;
  opacity?: number;
  head?: boolean;
}> = ({ pts, progress, color, width = 3, opacity = 1, head = true }) => {
  if (progress <= 0) return null;
  const len = polyLength(pts);
  const [hx, hy] = pointAt(pts, progress);
  return (
    <g opacity={opacity}>
      <path
        d={toD(pts)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="miter"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - progress)}
      />
      {head && progress < 1 ? (
        <>
          <circle cx={hx} cy={hy} r={width * 5} fill={color} opacity={0.25} />
          <circle cx={hx} cy={hy} r={width * 1.6} fill="#FFFFFF" />
        </>
      ) : null}
    </g>
  );
};
