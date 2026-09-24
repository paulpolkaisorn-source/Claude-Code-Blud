import React from "react";

/** Minimal 2.5D projection: yaw around the vertical axis, then look down by `pitch`. */
export type Cam = { yaw: number; pitch: number; scale: number; cx: number; cy: number };

export const project = (cam: Cam, x: number, y: number, z: number) => {
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const xr = x * c - y * s;
  const yr = x * s + y * c;
  return {
    x: cam.cx + xr * cam.scale,
    y: cam.cy + (yr * Math.sin(cam.pitch) - z * Math.cos(cam.pitch)) * cam.scale,
  };
};

export type BoxSpec = {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  top: string;
  side: string;
  stroke: string;
  strokeOpacity?: number;
  opacity?: number;
  topOverlay?: React.ReactNode;
};

/** Extruded box drawn as polygons: visible side faces first, then the top. */
export const Box3D: React.FC<{ cam: Cam; box: BoxSpec }> = ({ cam, box }) => {
  const { x, y, z, w, d, h } = box;
  if ((box.opacity ?? 1) <= 0) return null;
  const P = (px: number, py: number, pz: number) => project(cam, px, py, pz);
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = y - d / 2;
  const y1 = y + d / 2;
  const poly = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  // Outward normals rotated into view space; positive "toward viewer" component => visible.
  const faces = [
    { vis: c, pts: [P(x0, y1, z), P(x1, y1, z), P(x1, y1, z + h), P(x0, y1, z + h)] },
    { vis: -c, pts: [P(x0, y0, z), P(x1, y0, z), P(x1, y0, z + h), P(x0, y0, z + h)] },
    { vis: s, pts: [P(x1, y0, z), P(x1, y1, z), P(x1, y1, z + h), P(x1, y0, z + h)] },
    { vis: -s, pts: [P(x0, y0, z), P(x0, y1, z), P(x0, y1, z + h), P(x0, y0, z + h)] },
  ].filter((f) => f.vis > 0);
  const top = [P(x0, y0, z + h), P(x1, y0, z + h), P(x1, y1, z + h), P(x0, y1, z + h)];
  const so = box.strokeOpacity ?? 0.7;
  return (
    <g opacity={box.opacity ?? 1}>
      {faces.map((f, i) => (
        <polygon key={i} points={poly(f.pts)} fill={box.side} stroke={box.stroke} strokeOpacity={so} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      <polygon points={poly(top)} fill={box.top} stroke={box.stroke} strokeOpacity={so} strokeWidth={1.5} strokeLinejoin="round" />
      {box.topOverlay}
    </g>
  );
};
