import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { content } from "../data/content";
import { COLORS, FONTS, ease, enter } from "../theme";

const PANEL_W = 572;
const PANEL_H = 600;
const GAP = 40;
const LEFT0 = (1920 - (PANEL_W * 3 + GAP * 2)) / 2;
const TOP = 150;

const Bars: React.FC<{ f: number; seed: number; color: string }> = ({ f, seed, color }) => (
  <g>
    {Array.from({ length: 14 }).map((_, i) => {
      const v = 0.25 + 0.75 * Math.abs(Math.sin(f * (0.09 + random(`b${seed}${i}`) * 0.08) + i * 0.7 + seed));
      const h = 70 * v;
      return <rect key={i} x={30 + i * 37} y={PANEL_H - 30 - h} width={24} height={h} fill={color} fillOpacity={0.35 + v * 0.5} />;
    })}
  </g>
);

/** Abstract fast geometry: a rushing floor grid and shards flying past. */
const PlayArt: React.FC<{ f: number }> = ({ f }) => {
  const horizon = 230;
  const cx = PANEL_W / 2;
  return (
    <g>
      {Array.from({ length: 12 }).map((_, i) => {
        const t = ((i / 12 + f * 0.035) % 1);
        const y = horizon + Math.pow(t, 2.2) * (PANEL_H - horizon);
        return <line key={`h${i}`} x1={0} x2={PANEL_W} y1={y} y2={y} stroke={COLORS.ryzen} strokeOpacity={0.15 + t * 0.6} strokeWidth={1 + t * 2} />;
      })}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = (i - 5) * 150;
        return <line key={`v${i}`} x1={cx} y1={horizon} x2={cx + x} y2={PANEL_H} stroke={COLORS.ryzen} strokeOpacity={0.35} strokeWidth={1.5} />;
      })}
      {Array.from({ length: 9 }).map((_, i) => {
        const t = ((random(`s${i}`) + f * 0.03) % 1);
        const ang = random(`a${i}`) * Math.PI * 2;
        const r = Math.pow(t, 2) * 420;
        const x = cx + Math.cos(ang) * r;
        const y = horizon - 20 + Math.sin(ang) * r * 0.6;
        const s = 6 + t * 36;
        return (
          <polygon
            key={`s${i}`}
            points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.6} ${x - s * 0.8},${y + s * 0.6}`}
            fill="none"
            stroke={COLORS.white}
            strokeOpacity={t * 0.8}
            strokeWidth={2}
            transform={`rotate(${f * 6 + i * 40} ${x} ${y})`}
          />
        );
      })}
    </g>
  );
};

/** Video timeline with clips on tracks and a scrubbing playhead. */
const CreateArt: React.FC<{ f: number }> = ({ f }) => {
  const tracks = 4;
  const playX = 40 + (0.5 + 0.45 * Math.sin(f * 0.07)) * (PANEL_W - 80);
  const hue = (playX / PANEL_W) * 60;
  return (
    <g>
      <rect x={40} y={40} width={PANEL_W - 80} height={220} fill={`hsl(${20 + hue * 0.2}, 90%, ${14 + hue * 0.2}%)`} stroke={COLORS.panelEdge} />
      <circle cx={100 + playX * 0.6} cy={150} r={46} fill={COLORS.ryzen} fillOpacity={0.8} />
      <rect x={40} y={210} width={PANEL_W - 80} height={50} fill="#000" fillOpacity={0.4} />
      {Array.from({ length: tracks }).map((_, t) =>
        Array.from({ length: 5 }).map((__, c) => {
          const w = 50 + random(`cw${t}${c}`) * 70;
          const x = 40 + c * 100 + random(`cx${t}${c}`) * 20;
          return (
            <rect key={`${t}-${c}`} x={x} y={300 + t * 48} width={Math.min(w, PANEL_W - 40 - x)} height={36} rx={4}
              fill={t === 0 ? COLORS.ryzen : COLORS.white} fillOpacity={t === 0 ? 0.55 : 0.12 + t * 0.04} />
          );
        }),
      )}
      <line x1={playX} x2={playX} y1={285} y2={500} stroke={COLORS.white} strokeWidth={2} />
      <polygon points={`${playX - 8},280 ${playX + 8},280 ${playX},292`} fill={COLORS.white} />
    </g>
  );
};

/** Code editor: line-number gutter and token rows scrolling upward. */
const BuildArt: React.FC<{ f: number }> = ({ f }) => {
  const lineH = 30;
  const scroll = f * 2.2;
  const first = Math.floor(scroll / lineH);
  return (
    <g>
      <defs>
        <clipPath id="codeClip">
          <rect x={0} y={30} width={PANEL_W} height={450} />
        </clipPath>
      </defs>
      <g clipPath="url(#codeClip)">
        {Array.from({ length: 19 }).map((_, k) => {
          const n = first + k;
          const y = 40 + k * lineH - (scroll % lineH);
          const indent = Math.floor(random(`in${n % 40}`) * 3) * 28;
          const toks = 1 + Math.floor(random(`tk${n % 40}`) * 4);
          let x = 80 + indent;
          return (
            <g key={n}>
              <text x={56} y={y + 16} textAnchor="end" fontFamily={FONTS.label} fontSize={16} fill={COLORS.gray} fillOpacity={0.6}>
                {n + 1}
              </text>
              {Array.from({ length: toks }).map((__, j) => {
                const w = 30 + random(`tw${n % 40}${j}`) * 90;
                const r = random(`tc${n % 40}${j}`);
                const el = (
                  <rect key={j} x={x} y={y + 4} width={w} height={14} rx={3}
                    fill={r < 0.3 ? COLORS.ryzen : r < 0.55 ? COLORS.white : COLORS.gray} fillOpacity={r < 0.3 ? 0.8 : 0.45} />
                );
                x += w + 12;
                return x < PANEL_W - 20 ? el : null;
              })}
            </g>
          );
        })}
      </g>
    </g>
  );
};

const ARTS = [PlayArt, CreateArt, BuildArt];

export const RyzenInUseArt: React.FC<{ f: number }> = ({ f }) => {
  return (
    <AbsoluteFill>
      {content.ryzenInUse.panels.map((word, i) => {
        const inP = enter(f, i * 30);
        const labelIn = ease(f, [i * 30 + 12, i * 30 + 32]);
        const Art = ARTS[i];
        const left = LEFT0 + i * (PANEL_W + GAP);
        return (
          <div key={word} style={{ position: "absolute", left, top: TOP, width: PANEL_W, opacity: i === 0 ? 0.3 + 0.7 * inP : inP, transform: `translateY(${(1 - inP) * 140}px)` }}>
            <div style={{ width: PANEL_W, height: PANEL_H, background: COLORS.panel, border: `1px solid ${COLORS.panelEdge}`, overflow: "hidden", position: "relative" }}>
              <svg width={PANEL_W} height={PANEL_H} viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}>
                <Art f={f} />
                <Bars f={f} seed={i} color={COLORS.ryzen} />
              </svg>
            </div>
            <div style={{ marginTop: 36, fontFamily: FONTS.headline, fontWeight: 700, fontSize: 72, color: COLORS.white, opacity: labelIn, letterSpacing: 1 }}>
              {word}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const RyzenInUse: React.FC = () => {
  const frame = useCurrentFrame();
  return <RyzenInUseArt f={frame} />;
};
