import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label } from "../components/Label";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_OUT, enter, mix } from "../theme";

const T = content.ryzenAi;
export const RYZEN_AI_CUT = 165;

// Neural net layout inside the NPU block.
const NPU = { x: 730, y: 270, w: 420, h: 540 };
const LAYERS = [4, 6, 6, 3];
const nodePos = (l: number, i: number) => {
  const n = LAYERS[l];
  return {
    x: NPU.x + 60 + (l * (NPU.w - 120)) / (LAYERS.length - 1),
    y: NPU.y + 90 + ((i + 0.5) * (NPU.h - 150)) / n,
  };
};

/** Activation at layer position `lp` (0..1) for a wave that loops every 40 frames. */
const act = (f: number, lp: number) => {
  const phase = ((f / 40) % 1) * 1.4 - 0.2;
  return Math.max(0, 1 - Math.abs(phase - lp) / 0.22);
};

const Laptop: React.FC<{ f: number }> = ({ f }) => {
  const open = enter(f, 10);
  const lidAngle = mix(-88, 6, open);
  const screenOn = ease(f, [55, 85]);
  const zoom = ease(f, [120, RYZEN_AI_CUT], [1, 2.6], (t) => t * t * t);
  const W = 880;
  const H = 540;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 2200 }}>
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          transformStyle: "preserve-3d",
          transform: `translateY(40px) rotateX(-16deg) rotateY(${mix(-24, -8, open)}deg) scale(${zoom})`,
        }}
      >
        {/* base (keyboard deck), hinged at the lid's bottom edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: H,
            width: W,
            height: H * 0.7,
            transformOrigin: "top center",
            transform: "rotateX(90deg)",
            background: "linear-gradient(180deg,#1b1b1f,#101013)",
            border: `2px solid ${COLORS.panelEdge}`,
            borderRadius: 10,
          }}
        >
          <div style={{ position: "absolute", left: 60, right: 60, top: 40, height: H * 0.34, display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 6 }}>
            {Array.from({ length: 56 }).map((_, i) => (
              <div key={i} style={{ background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3 }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: W / 2 - 130, width: 260, bottom: 24, height: 90, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
        </div>
        {/* lid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "bottom center",
            transform: `rotateX(${lidAngle}deg)`,
            background: "#141417",
            border: `2px solid rgba(255,255,255,0.14)`,
            borderRadius: 14,
            padding: 22,
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", height: "100%", background: "#060607", borderRadius: 6, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, opacity: screenOn, background: `radial-gradient(circle at 50% 55%, rgba(255,106,0,0.35), transparent 60%)` }} />
            <svg width="100%" height="100%" viewBox="0 0 836 496" style={{ position: "absolute", opacity: screenOn }}>
              <rect x={318} y={148} width={200} height={200} fill="none" stroke={COLORS.ryzen} strokeWidth={3} />
              <rect x={330} y={160} width={80} height={80} fill={COLORS.ryzen} fillOpacity={0.25} />
              <rect x={330} y={252} width={80} height={84} fill={COLORS.radeon} fillOpacity={0.3} />
              <rect x={422} y={160} width={84} height={176} fill="#FFFFFF" fillOpacity={0.12 + 0.2 * act(f, 0.5)} />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Block: React.FC<{ x: number; y: number; w: number; h: number; color: string; label: string; p: number }> = ({ x, y, w, h, color, label, p }) => (
  <g opacity={p}>
    <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.07} stroke={color} strokeWidth={2} />
    <text x={x + 16} y={y + 36} fontFamily={FONTS.headline} fontWeight={700} fontSize={26} fill={color} letterSpacing={3}>
      {label}
    </text>
  </g>
);

const ChipView: React.FC<{ f: number; labels: boolean }> = ({ f, labels }) => {
  const l = f - RYZEN_AI_CUT;
  const s = mix(1.25, 1, enter(l, 0));
  const cpuP = ease(l, [0, 12], [0.4, 1]);
  const gpuP = ease(l, [4, 16], [0.3, 1]);
  const npuP = ease(l, [8, 20], [0.3, 1]);
  const netP = ease(l, [20, 40]);
  const tagIn = labels ? ease(l, [95, 120]) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <rect x={260} y={240} width={920} height={600} fill="#0E0E10" stroke={COLORS.ryzen} strokeOpacity={0.7} strokeWidth={3} />
          <Block x={290} y={270} w={410} h={290} color={COLORS.ryzen} label={T.blocks.cpu} p={cpuP} />
          <g opacity={cpuP}>
            {Array.from({ length: 8 }).map((_, i) => {
              const cx = 318 + (i % 4) * 94;
              const cy = 330 + Math.floor(i / 4) * 106;
              const on = 0.25 + 0.5 * Math.max(0, Math.sin(f * 0.12 + i * 0.9));
              return <rect key={i} x={cx} y={cy} width={76} height={90} fill={COLORS.ryzen} fillOpacity={on * 0.5} stroke={COLORS.ryzen} strokeOpacity={0.7} />;
            })}
          </g>
          <Block x={290} y={590} w={410} h={220} color={COLORS.radeon} label={T.blocks.gpu} p={gpuP} />
          <g opacity={gpuP}>
            {Array.from({ length: 24 }).map((_, i) => {
              const c = i % 8;
              const r = Math.floor(i / 8);
              const on = Math.max(0, Math.sin(f * 0.15 - c * 0.6));
              return <rect key={i} x={310 + c * 48} y={650 + r * 50} width={38} height={40} fill={COLORS.radeon} fillOpacity={0.12 + on * 0.6} />;
            })}
          </g>
          <Block x={NPU.x} y={NPU.y} w={NPU.w} h={NPU.h} color={COLORS.white} label={T.blocks.npu} p={npuP} />
          <g opacity={netP}>
            {LAYERS.slice(0, -1).map((n, l1) =>
              Array.from({ length: n }).map((_, i) =>
                Array.from({ length: LAYERS[l1 + 1] }).map((__, j) => {
                  const a = nodePos(l1, i);
                  const b = nodePos(l1 + 1, j);
                  const e = act(f, (l1 + 0.5) / (LAYERS.length - 1));
                  return <line key={`${l1}-${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e > 0.3 ? COLORS.ryzen : COLORS.white} strokeOpacity={0.08 + e * 0.5} strokeWidth={1 + e} />;
                }),
              ),
            )}
            {LAYERS.map((n, l1) =>
              Array.from({ length: n }).map((_, i) => {
                const p = nodePos(l1, i);
                const e = act(f, l1 / (LAYERS.length - 1));
                return (
                  <g key={`n${l1}-${i}`}>
                    <circle cx={p.x} cy={p.y} r={16 + e * 8} fill={COLORS.ryzen} opacity={e * 0.25} />
                    <circle cx={p.x} cy={p.y} r={10} fill={e > 0.2 ? COLORS.ryzen : "#1c1c20"} stroke={COLORS.white} strokeOpacity={0.6} strokeWidth={1.5} />
                  </g>
                );
              }),
            )}
          </g>
        </svg>
      </AbsoluteFill>
      {labels ? (
        <Label anchor={{ x: NPU.x + NPU.w, y: 420 }} at={{ x: 1300, y: 420 }} side="right" title={T.npu.title} sub={T.npu.sub} progress={ease(l, [35, 65], [0, 1], (t) => t)} />
      ) : null}
      <div style={{ position: "absolute", width: "100%", top: 900, textAlign: "center", fontFamily: FONTS.label, fontWeight: 500, fontSize: 40, color: COLORS.white, opacity: tagIn, transform: `translateY(${(1 - tagIn) * 16}px)` }}>
        {T.tagline}
      </div>
    </AbsoluteFill>
  );
};

export const RyzenAIArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  const kick = labels ? ease(f, [5, 25], [0, 1], EASE_OUT) : 0;
  return (
    <AbsoluteFill>
      {f < RYZEN_AI_CUT ? <Laptop f={f} /> : <ChipView f={f} labels={labels} />}
      <div style={{ position: "absolute", left: 96, top: 84, display: "flex", alignItems: "center", gap: 20, opacity: kick }}>
        <div style={{ width: 48, height: 3, background: COLORS.ryzen }} />
        <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 56, color: COLORS.white }}>{T.kicker}</div>
      </div>
    </AbsoluteFill>
  );
};

export const RyzenAI: React.FC = () => {
  const frame = useCurrentFrame();
  return <RyzenAIArt f={frame} />;
};
