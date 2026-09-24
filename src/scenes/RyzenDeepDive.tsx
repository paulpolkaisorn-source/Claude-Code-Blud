import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Box3D, BoxSpec, Cam, project } from "../components/Iso";
import { Label } from "../components/Label";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_IN_OUT, enter, SPRING_SNAP } from "../theme";

const T = content.ryzenDeepDive;

// World layout (units ~ px at scale 1). Substrate centered at origin, z up.
const CCD1 = { x: -105, y: -92 };
const CCD2 = { x: -105, y: 92 };
const IOD = { x: 105, y: 0 };

const SNAP_AT = 480;

// Small SMD capacitors along the substrate edges (static detail).
const CAPS: [number, number][] = [
  ...[-150, -110, -70, 70, 110, 150].map((v) => [v, 190] as [number, number]),
  ...[-150, -110, -70, 70, 110, 150].map((v) => [v, -190] as [number, number]),
  ...[-120, -60, 0, 60, 120].map((v) => [190, v] as [number, number]),
];

/** Pure render of the exploded CPU at frame `f`. */
export const RyzenArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  const snap = f >= SNAP_AT ? enter(f, SNAP_AT, SPRING_SNAP) : 0;
  const keep = 1 - snap;

  const appear = enter(f, 0);
  const lift = ease(f, [40, 110], [0, 1], EASE_IN_OUT) * keep;
  const explode = ease(f, [95, 150]) * keep;
  const ccdUp = (ease(f, [165, 195]) - ease(f, [238, 268])) * keep;
  const cacheDrop = ease(f, [190, 240]);
  const socket = ease(f, [270, 305]) * keep;
  const coresHot = 0.5 + 0.5 * Math.sin(f * 0.15);

  const cam: Cam = {
    yaw: -0.62 + ease(f, [0, 600], [0, 0.14], (t) => t),
    pitch: 0.98,
    scale: 1.12 * (0.9 + 0.1 * appear),
    cx: 960,
    cy: 610,
  };

  const exZ = 50 * explode;
  const ccdX = -70 * explode;
  const iodX = 70 * explode;

  const cacheZ = 10 + exZ + (1 - cacheDrop) * 440;
  const ccd1Z = 10 + exZ + 110 * ccdUp + 6 * cacheDrop;

  const chip = (x: number, y: number, z: number, w: number, d: number, extra?: Partial<BoxSpec>): BoxSpec => ({
    x, y, z, w, d, h: 8,
    top: "#1C1C20",
    side: "#0F0F12",
    stroke: COLORS.white,
    strokeOpacity: 0.45,
    ...extra,
  });

  const boxes: BoxSpec[] = [
    {
      x: 0, y: 0, z: -34, w: 470, d: 470, h: 18,
      top: "#121214", side: "#0B0B0D", stroke: COLORS.ryzen, strokeOpacity: 0.8,
      opacity: socket,
      grid: { cols: 16, rows: 16, color: COLORS.ryzen, opacity: 0.35, inset: 0.05 },
    },
    {
      x: 0, y: 0, z: 0, w: 420, d: 420, h: 10,
      top: "#16161A", side: "#0D0D10", stroke: COLORS.ryzen, strokeOpacity: 0.55,
    },
    ...CAPS.map(([cx, cy]) => ({
      x: cx, y: cy, z: 10, w: 16, d: 9, h: 7,
      top: "#6b6b70", side: "#3a3a3e", stroke: COLORS.white, strokeOpacity: 0.2,
    })),
    chip(IOD.x + iodX, IOD.y, 10 + exZ * 0.5, 150, 300, { grid: { cols: 3, rows: 6, color: COLORS.white, opacity: 0.18 } }),
    chip(CCD2.x + ccdX, CCD2.y, 10 + exZ, 140, 150, { stroke: COLORS.ryzen, strokeOpacity: 0.8, grid: { cols: 4, rows: 2, color: COLORS.ryzen, opacity: 0.55 + 0.3 * coresHot } }),
    {
      x: CCD1.x + ccdX, y: CCD1.y, z: cacheZ, w: 140, d: 150, h: 6,
      top: COLORS.ryzen, side: "#8A3A00", stroke: COLORS.ryzen, strokeOpacity: 1,
      opacity: ease(f, [188, 200]) * (0.9),
    },
    chip(CCD1.x + ccdX, CCD1.y, ccd1Z, 140, 150, { stroke: COLORS.ryzen, strokeOpacity: 0.8, grid: { cols: 4, rows: 2, color: COLORS.ryzen, opacity: 0.55 + 0.3 * coresHot } }),
    {
      x: 0, y: -320 * lift, z: 24 + 300 * lift, w: 400, d: 400, h: 14,
      top: "#2C2C31", side: "#1A1A1D", stroke: COLORS.white, strokeOpacity: 0.55,
      opacity: 1 - ease(lift, [0.55, 1], [0, 1], (t) => t),
    },
  ];

  // Keep painter's order right while the cache layer is still above the lifted die.
  const iCache = boxes.findIndex((b) => b.h === 6);
  if (cacheZ > ccd1Z) {
    [boxes[iCache], boxes[iCache + 1]] = [boxes[iCache + 1], boxes[iCache]];
  }

  // Anchors for leader lines, projected from world points so they track the parts.
  const pCores = project(cam, CCD2.x + ccdX - 70, CCD2.y + 40, 10 + exZ + 8);
  const pCache = project(cam, CCD1.x + ccdX + 70, CCD1.y - 30, cacheZ + 3);
  const pSocket = project(cam, -235, 150, -25);
  const pIo = project(cam, IOD.x + iodX + 75, IOD.y + 80, 10 + exZ * 0.5 + 8);

  const labelsOut = 1 - ease(f, [455, 478]);
  const lp = (start: number) => (labels ? ease(f, [start, start + 30], [0, 1], (t) => t) : 0);

  const headIn = ease(f, [10, 35]);

  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {boxes.map((b, i) => (
          <Box3D key={i} cam={cam} box={b} />
        ))}
      </svg>
      {labels ? (
        <>
          <div style={{ position: "absolute", left: 96, top: 80, fontFamily: FONTS.headline, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: COLORS.ryzen, textTransform: "uppercase", opacity: headIn * labelsOut }}>
            {T.heading}
          </div>
          <Label anchor={pCores} at={{ x: 520, y: 420 }} side="left" title={T.cores.title} progress={lp(130)} opacity={labelsOut} />
          <Label anchor={pCache} at={{ x: 1380, y: 250 }} side="right" title={T.cache.title} sub={T.cache.sub} progress={lp(225)} opacity={labelsOut} />
          <Label anchor={pSocket} at={{ x: 520, y: 820 }} side="left" title={T.socket.title} progress={lp(295)} opacity={labelsOut} />
          <Label anchor={pIo} at={{ x: 1380, y: 760 }} side="right" title={T.io.title} progress={lp(345)} opacity={labelsOut} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export const RyzenDeepDive: React.FC = () => {
  const frame = useCurrentFrame();
  return <RyzenArt f={frame} />;
};
