import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_OUT, enter, mix } from "../theme";

const T = content.radeonAi;
export const RADEON_AI_CUT = 195;

const CELL = 40;
const GAP = 6;
const N = 8;
const SIZE = N * CELL + (N - 1) * GAP;
const C = { x: 1000, y: 480 };
const A = { x: C.x - SIZE - 44, y: C.y };
const B = { x: C.x, y: C.y - SIZE - 44 };

const Matrix: React.FC<{ x: number; y: number; cell: (r: number, c: number) => number; color: string }> = ({ x, y, cell, color }) => (
  <g>
    {Array.from({ length: N * N }).map((_, i) => {
      const r = Math.floor(i / N);
      const c = i % N;
      const v = cell(r, c);
      return (
        <rect key={i} x={x + c * (CELL + GAP)} y={y + r * (CELL + GAP)} width={CELL} height={CELL}
          fill={color} fillOpacity={0.06 + v * 0.85} stroke={color} strokeOpacity={0.3 + v * 0.6} strokeWidth={1.5} />
      );
    })}
  </g>
);

const Title: React.FC<{ title: string; sub?: string; p: number }> = ({ title, sub, p }) => (
  <div style={{ position: "absolute", left: 96, top: 84, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ width: 48, height: 3, background: COLORS.radeon }} />
      <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 56, color: COLORS.white }}>{title}</div>
    </div>
    {sub ? <div style={{ marginLeft: 68, marginTop: 10, fontFamily: FONTS.label, fontSize: 28, color: COLORS.gray }}>{sub}</div> : null}
  </div>
);

const AccelBeat: React.FC<{ f: number; labels: boolean }> = ({ f, labels }) => {
  const inP = enter(f, 0);
  // A diagonal "tile" sweep: each output cell fires when the wave reaches it.
  const wave = ease(f, [15, 150], [0, 2.3], (t) => t);
  const cWave = (r: number, c: number) => {
    const d = (r + c) / (2 * (N - 1));
    const front = wave - d;
    return front < 0 ? 0 : Math.max(0.3, 1 - front * 3);
  };
  const row = Math.min(N - 1, Math.floor(((wave % 1.15) / 1.15) * N));
  const titleIn = labels ? ease(f, [5, 25], [0, 1], EASE_OUT) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.35 + 0.65 * inP, transform: `scale(${mix(1.08, 1, inP)})` }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <Matrix x={A.x} y={A.y} cell={(r) => (r === row ? 0.8 : 0.08)} color={COLORS.white} />
          <Matrix x={B.x} y={B.y} cell={(_, c) => (c === row ? 0.8 : 0.08)} color={COLORS.white} />
          <Matrix x={C.x} y={C.y} cell={cWave} color={COLORS.radeon} />
          {labels ? (<>
          <text x={A.x + SIZE / 2} y={A.y + SIZE + 50} textAnchor="middle" fontFamily={FONTS.headline} fontSize={34} fill={COLORS.gray}>A</text>
          <text x={B.x + SIZE + 40} y={B.y + SIZE / 2 + 12} fontFamily={FONTS.headline} fontSize={34} fill={COLORS.gray}>B</text>
          <text x={C.x + SIZE + 40} y={C.y + SIZE / 2 + 12} fontFamily={FONTS.headline} fontSize={34} fill={COLORS.radeon}>A × B</text>
          </>) : null}
        </svg>
      </AbsoluteFill>
      <Title title={T.accel.title} sub={T.accel.sub} p={titleIn} />
    </AbsoluteFill>
  );
};

const SoftwareBeat: React.FC<{ f: number }> = ({ f }) => {
  const l = f - RADEON_AI_CUT;
  const inP = enter(l, 0);
  const W = 1040;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: W,
          background: "linear-gradient(180deg,#141417,#0E0E10)",
          border: `1px solid ${COLORS.panelEdge}`,
          borderRadius: 18,
          padding: "44px 56px",
          boxSizing: "border-box",
          opacity: 0.35 + 0.65 * inP,
          transform: `perspective(2000px) rotateX(${(1 - inP) * 12}deg) translateY(${(1 - inP) * 60}px)`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(237,28,36,0.08)",
        }}
      >
        <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 46, color: COLORS.white, marginBottom: 30 }}>{T.software.title}</div>
        {T.software.toggles.map((name, i) => {
          const on = enter(l, 30 + i * 22);
          const rowIn = ease(l, [8 + i * 6, 24 + i * 6]);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)", opacity: rowIn }}>
              <div style={{ fontFamily: FONTS.label, fontWeight: 500, fontSize: 34, color: on > 0.5 ? COLORS.white : COLORS.gray }}>{name}</div>
              <div style={{ width: 92, height: 48, borderRadius: 24, background: on > 0.02 ? `rgba(237,28,36,${0.25 + 0.75 * on})` : "#26262b", position: "relative" }}>
                <div style={{ position: "absolute", top: 6, left: 6 + on * 44, width: 36, height: 36, borderRadius: 18, background: "#FFFFFF" }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const RadeonAIArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) =>
  f < RADEON_AI_CUT ? <AccelBeat f={f} labels={labels} /> : <SoftwareBeat f={f} />;

export const RadeonAI: React.FC = () => {
  const frame = useCurrentFrame();
  return <RadeonAIArt f={frame} />;
};
