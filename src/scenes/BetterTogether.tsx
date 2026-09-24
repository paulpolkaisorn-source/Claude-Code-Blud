import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ChipDie } from "../components/ChipDie";
import { GpuDie } from "../components/GpuDie";
import { ParticleStream } from "../components/ParticleStream";
import { content } from "../data/content";
import { COLORS, FONTS, ease, enter } from "../theme";

const T = content.betterTogether;
const DUR = 450;
const CPU = { cx: 400, cy: 470, size: 300 };
const GPU = { cx: 1520, cy: 470 };
const LANE_X1 = 600;
const LANE_X2 = 1270;
const LANES = Array.from({ length: 8 }).map((_, i) => 470 - 105 + i * 30);

// Speed ramps linearly; travel is its integral so motion stays smooth.
const V0 = 0.006;
const V1 = 0.035;
export const travelAt = (f: number) => V0 * f + ((V1 - V0) * f * f) / (2 * DUR);

export const BetterTogetherArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  const cpuIn = 0.3 + 0.7 * enter(f, 0);
  const gpuIn = 0.3 + 0.7 * enter(f, 0);
  const laneDraw = ease(f, [20, 60]);
  const streamIn = ease(f, [45, 70]);
  const samIn = labels ? ease(f, [90, 115]) : 0;
  const nameIn = labels ? ease(f, [25, 45]) : 0;
  const travel = travelAt(f);
  const counter = String(Math.floor(travel * 1200)).padStart(6, "0");
  const len = LANE_X2 - LANE_X1;
  const name: React.CSSProperties = { position: "absolute", top: 690, width: 400, textAlign: "center", fontFamily: FONTS.headline, fontWeight: 700, fontSize: 48, opacity: nameIn };
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <g opacity={cpuIn} style={{ filter: `drop-shadow(0 0 6px ${COLORS.ryzen})` }}>
          <ChipDie cx={CPU.cx - (1 - cpuIn) * 80} cy={CPU.cy} size={CPU.size} fill={0.1} />
        </g>
        <g opacity={gpuIn} transform={`translate(${GPU.cx + (1 - gpuIn) * 80} ${GPU.cy}) scale(0.4)`}>
          <GpuDie cx={0} cy={0} cols={12} rows={10} cell={46} gap={10} wave={0.3 + ((travel * 0.6) % 1.4)} />
        </g>
        {LANES.map((y, i) => (
          <line key={i} x1={LANE_X1} x2={LANE_X1 + len * laneDraw} y1={y} y2={y} stroke={COLORS.white} strokeOpacity={0.22} strokeWidth={2} />
        ))}
        <g opacity={streamIn}>
          <ParticleStream x1={LANE_X1} x2={LANE_X2} lanes={LANES.filter((_, i) => i % 2 === 0)} dir={1} color={COLORS.ryzen} travel={travel} perLane={4} tail={20 + travel * 6} seed="o" />
          <ParticleStream x1={LANE_X1} x2={LANE_X2} lanes={LANES.filter((_, i) => i % 2 === 1)} dir={-1} color={COLORS.radeon} travel={travel} perLane={4} tail={20 + travel * 6} seed="r" />
        </g>
      </svg>
      <div style={{ ...name, left: CPU.cx - 200, color: COLORS.ryzen }}>{T.cpu}</div>
      <div style={{ ...name, left: GPU.cx - 200, color: COLORS.radeon }}>{T.gpu}</div>
      <div style={{ position: "absolute", left: LANE_X1, width: len, top: 300, textAlign: "center", fontFamily: FONTS.label, fontWeight: 600, fontSize: 22, letterSpacing: 8, color: COLORS.gray, opacity: labels ? laneDraw : 0 }}>
        {T.lanes}
      </div>
      <div style={{ position: "absolute", right: 96, top: 72, textAlign: "right", opacity: labels ? streamIn : 0 }}>
        <div style={{ fontFamily: FONTS.label, fontWeight: 500, fontSize: 20, letterSpacing: 6, color: COLORS.gray }}>{T.counterLabel}</div>
        <div style={{ fontFamily: FONTS.headline, fontWeight: 500, fontSize: 52, color: COLORS.white, fontVariantNumeric: "tabular-nums" }}>{counter}</div>
      </div>
      <div style={{ position: "absolute", left: 0, width: "100%", top: 830, textAlign: "center", opacity: samIn, transform: `translateY(${(1 - samIn) * 16}px)` }}>
        <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 52, color: COLORS.white }}>{T.sam.title}</div>
        <div style={{ fontFamily: FONTS.label, fontWeight: 400, fontSize: 30, color: COLORS.gray, marginTop: 10 }}>{T.sam.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

export const BetterTogether: React.FC = () => {
  const frame = useCurrentFrame();
  return <BetterTogetherArt f={frame} />;
};
