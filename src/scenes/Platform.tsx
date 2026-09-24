import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label } from "../components/Label";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_OUT, enter } from "../theme";

const T = content.platform;
// Board sits left of center so the right-hand callout has room.
const OX = -110;
const BOARD = { x: 520 + OX, y: 170, w: 900, h: 760 };
const SOCKET = { x: 700 + OX, y: 290, s: 260 };
const DIMMS = [0, 1, 2, 3].map((i) => ({ x: 1100 + OX + i * 44, y: 230, w: 22, h: 420 }));
const SLOT = { x: 610 + OX, y: 780, w: 640, h: 30 };

/** A trace from the socket out to a target, drawn as an orthogonal polyline. */
const trace = (i: number, kind: "mem" | "pcie") => {
  if (kind === "mem") {
    const y = SOCKET.y + 40 + i * 24;
    const x2 = DIMMS[i % 4].x + 11;
    return { d: `M${SOCKET.x + SOCKET.s},${y} H${1040 + OX + i * 4} V${Math.min(620, 250 + i * 40)} H${x2}`, len: 420 };
  }
  const x = SOCKET.x + 40 + i * 24;
  return { d: `M${x},${SOCKET.y + SOCKET.s} V${700 + i * 6} H${SLOT.x + 60 + i * 60} V${SLOT.y}`, len: 520 };
};

export const PlatformArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  const boardIn = enter(f, 0);
  const socketIn = ease(f, [8, 30]);
  const traceP = ease(f, [25, 80]);
  const kick = labels ? ease(f, [5, 25], [0, 1], EASE_OUT) : 0;
  const lp = (s: number) => (labels ? ease(f, [s, s + 30], [0, 1], (t) => t) : 0);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${0.94 + 0.06 * boardIn})`, opacity: 0.4 + 0.6 * boardIn }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} rx={10} fill="#0F0F11" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          {Array.from({ length: 10 }).map((_, i) => (
            <circle key={i} cx={BOARD.x + 30 + (i % 2) * (BOARD.w - 60)} cy={BOARD.y + 30 + Math.floor(i / 2) * 175} r={7} fill="none" stroke="rgba(255,255,255,0.2)" />
          ))}
          {/* traces */}
          {Array.from({ length: 8 }).map((_, i) => {
            const m = trace(i, "mem");
            const p = trace(i, "pcie");
            const pulse = (f * 9 + i * 53) % 900;
            return (
              <g key={i}>
                <path d={m.d} fill="none" stroke={COLORS.ryzen} strokeOpacity={0.55} strokeWidth={2} strokeDasharray={m.len * 2} strokeDashoffset={m.len * 2 * (1 - traceP)} />
                <path d={p.d} fill="none" stroke={COLORS.radeon} strokeOpacity={0.5} strokeWidth={2} strokeDasharray={p.len * 2} strokeDashoffset={p.len * 2 * (1 - traceP)} />
                {traceP >= 1 ? (
                  <>
                    <path d={m.d} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray={`18 ${900 - 18}`} strokeDashoffset={-pulse} />
                    <path d={p.d} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray={`18 ${900 - 18}`} strokeDashoffset={-((pulse + 400) % 900)} />
                  </>
                ) : null}
              </g>
            );
          })}
          {/* socket with pad grid */}
          <g opacity={socketIn}>
            <rect x={SOCKET.x - 14} y={SOCKET.y - 14} width={SOCKET.s + 28} height={SOCKET.s + 28} fill="#141416" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
            <rect x={SOCKET.x} y={SOCKET.y} width={SOCKET.s} height={SOCKET.s} fill="#0B0B0C" stroke={COLORS.ryzen} strokeWidth={2} />
            {Array.from({ length: 196 }).map((_, i) => {
              const c = i % 14;
              const r = Math.floor(i / 14);
              const glow = Math.max(0, Math.sin(f * 0.1 - (c + r) * 0.35));
              return <circle key={i} cx={SOCKET.x + 17 + c * 17.4} cy={SOCKET.y + 17 + r * 17.4} r={3.2} fill={COLORS.ryzen} opacity={0.25 + glow * 0.6} />;
            })}
          </g>
          {/* DIMM slots and DDR5 sticks dropping in */}
          {DIMMS.map((d, i) => {
            const drop = enter(f, 45 + i * 8);
            return (
              <g key={i}>
                <rect x={d.x} y={d.y} width={d.w} height={d.h} fill="#0A0A0B" stroke="rgba(255,255,255,0.25)" />
                <g transform={`translate(0 ${(1 - drop) * -500})`} opacity={drop}>
                  <rect x={d.x + 3} y={d.y - 30} width={d.w - 6} height={d.h + 20} fill="#1e1e22" stroke={COLORS.ryzen} strokeOpacity={0.8} />
                  {Array.from({ length: 8 }).map((_, k) => (
                    <rect key={k} x={d.x + 6} y={d.y - 10 + k * 50} width={d.w - 12} height={32} fill={COLORS.ryzen} fillOpacity={0.35} />
                  ))}
                </g>
              </g>
            );
          })}
          {/* PCIe x16 slot */}
          <rect x={SLOT.x} y={SLOT.y} width={SLOT.w} height={SLOT.h} fill="#0A0A0B" stroke={COLORS.radeon} strokeWidth={2} />
          {Array.from({ length: 40 }).map((_, i) => (
            <line key={i} x1={SLOT.x + 12 + i * 15.5} x2={SLOT.x + 12 + i * 15.5} y1={SLOT.y + 8} y2={SLOT.y + SLOT.h - 8} stroke={COLORS.radeon} strokeOpacity={0.5} />
          ))}
        </svg>
      </AbsoluteFill>
      {labels ? (
        <>
          <div style={{ position: "absolute", left: 96, top: 84, display: "flex", alignItems: "center", gap: 20, opacity: kick }}>
            <div style={{ width: 48, height: 3, background: COLORS.ryzen }} />
            <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 56, color: COLORS.white }}>{T.kicker}</div>
          </div>
          <Label anchor={{ x: SOCKET.x - 14, y: SOCKET.y + 130 }} at={{ x: 360, y: 420 }} side="left" title={T.socket.title} progress={lp(40)} />
          <Label anchor={{ x: DIMMS[3].x + 22, y: 440 }} at={{ x: 1390, y: 440 }} side="right" title={T.memory.title} sub={T.memory.sub} progress={lp(90)} />
          <Label anchor={{ x: SLOT.x, y: SLOT.y + 15 }} at={{ x: 360, y: 795 }} side="left" title={T.pcie.title} progress={lp(140)} color={COLORS.radeon} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export const Platform: React.FC = () => {
  const frame = useCurrentFrame();
  return <PlatformArt f={frame} />;
};

