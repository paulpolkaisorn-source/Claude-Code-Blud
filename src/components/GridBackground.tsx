import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/** Near-black field with a faint grid and circuit texture that drifts slowly. */
export const GridBackground: React.FC<{ tint?: string }> = ({ tint }) => {
  const frame = useCurrentFrame();
  const dx = (frame * 0.35) % 80;
  const dy = (frame * 0.18) % 80;
  const cdx = (frame * 0.2) % 320;
  const cdy = (frame * 0.1) % 320;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <defs>
          <pattern
            id="grid"
            width={80}
            height={80}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${-dx} ${-dy})`}
          >
            <path d="M80 0 L0 0 0 80" fill="none" stroke={COLORS.grid} strokeWidth={1} />
          </pattern>
          <pattern
            id="circuit"
            width={320}
            height={320}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${-cdx} ${-cdy})`}
          >
            <g fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth={1.5}>
              <path d="M0 40 H120 L160 80 H320" />
              <path d="M40 320 V220 L80 180 V120" />
              <path d="M200 0 V60 L240 100 V200 L280 240 H320" />
              <path d="M0 260 H90 L130 300 V320" />
            </g>
            <g fill="rgba(255,255,255,0.06)">
              <circle cx={120} cy={40} r={3} />
              <circle cx={80} cy={120} r={3} />
              <circle cx={240} cy={200} r={3} />
              <circle cx={90} cy={260} r={3} />
            </g>
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.75} />
          </radialGradient>
          <radialGradient id="tint" cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor={tint ?? "#000"} stopOpacity={tint ? 0.08 : 0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#grid)" />
        <rect width={1920} height={1080} fill="url(#circuit)" />
        <rect width={1920} height={1080} fill="url(#tint)" />
        <rect width={1920} height={1080} fill="url(#vignette)" />
      </svg>
    </AbsoluteFill>
  );
};
