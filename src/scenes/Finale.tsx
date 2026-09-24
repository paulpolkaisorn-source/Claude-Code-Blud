import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { ChipDie } from "../components/ChipDie";
import { GpuCard } from "../components/GpuCard";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_IN, enter, mix } from "../theme";

const T = content.finale;

/** Horizontal light streaks rushing past, speeding up toward the end. */
const Streaks: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 40 }).map((_, i) => {
      const y = 80 + random(`sy${i}`) * 920;
      const speed = 18 + random(`sp${i}`) * 30;
      const len = 80 + random(`sl${i}`) * 260;
      const x = ((random(`sx${i}`) * 2400 + f * speed * (1 + f / 120)) % 2400) - 300;
      const warm = i % 2 === 0;
      return <line key={i} x1={x} x2={x + len} y1={y} y2={y} stroke={warm ? COLORS.ryzen : COLORS.radeon} strokeOpacity={0.15 + random(`so${i}`) * 0.35} strokeWidth={1 + random(`sw${i}`) * 2} strokeLinecap="round" />;
    })}
  </g>
);

export const FinaleArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  const meet = enter(f, 0);
  const t1 = labels ? enter(f, 30) : 0;
  const t2 = labels ? ease(f, [75, 100]) : 0;
  const sweep = ease(f, [40, 110], [-40, 140], (t) => t);
  const outro = ease(f, [200, 239], [1, 1.12], EASE_IN);
  const orbit = f * 0.9;
  const word = (color: string): React.CSSProperties => ({
    backgroundImage: `linear-gradient(100deg, ${color} ${sweep - 12}%, #FFFFFF ${sweep}%, ${color} ${sweep + 12}%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  });
  return (
    <AbsoluteFill style={{ transform: `scale(${outro})` }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <Streaks f={f} />
      </svg>
      <AbsoluteFill style={{ perspective: 1800 }}>
        <AbsoluteFill style={{ transform: `rotateY(${Math.sin(orbit * 0.02) * 10}deg)`, transformStyle: "preserve-3d" }}>
          <svg width="100%" height="100%" viewBox="0 0 1920 1080">
            <g style={{ filter: `drop-shadow(0 0 12px ${COLORS.ryzen})` }}>
              <ChipDie cx={mix(-200, 760, meet)} cy={380} size={220} fill={0.15} strokeWidth={4} />
            </g>
            <g style={{ filter: `drop-shadow(0 0 12px ${COLORS.radeon})` }}>
              <GpuCard cx={mix(2200, 1180, meet)} cy={380} w={330} h={170} fans={2} fanAngle={f * 30} strokeWidth={4} solid />
            </g>
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
      <div style={{ position: "absolute", width: "100%", top: 590, textAlign: "center", fontFamily: FONTS.headline, fontWeight: 700, fontSize: 128, letterSpacing: 4, opacity: t1, transform: `translateY(${(1 - t1) * 40}px)` }}>
        <span style={word(COLORS.ryzen)}>{T.ryzen}</span>
        <span style={{ color: COLORS.white }}>{T.plus}</span>
        <span style={word(COLORS.radeon)}>{T.radeon}</span>
      </div>
      <div style={{ position: "absolute", width: "100%", top: 780, textAlign: "center", fontFamily: FONTS.label, fontWeight: 500, fontSize: 42, color: COLORS.gray, opacity: t2 }}>
        {T.line2}
      </div>
    </AbsoluteFill>
  );
};

export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  return <FinaleArt f={frame} />;
};
