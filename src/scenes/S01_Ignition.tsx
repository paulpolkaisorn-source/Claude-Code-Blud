import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HudText, SafeTicks, frameCode } from "../components/HUD";
import { Electrodes, NeonSvg, circlePath, straightTube, type NeonShape } from "../components/NeonTube";
import { ignition } from "../flicker";
import { useLayout } from "../layout";
import { rnd, rndRange } from "../rand";
import { COLORS, EASE_OUT_SCENE, enter, ramp, withAlpha } from "../theme";
import { CUES } from "../timing";

/** S1 | 0-90 | A single neon tube flickers on (10, 22, 31), holds, then we zoom through its light. */
export const S01_Ignition: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  if (f === 0) return <AbsoluteFill style={{ background: COLORS.void }} />;

  const I = ignition(f);
  const d = 15 * L.unit; // tube diameter
  const half = L.vertical ? L.width * 0.4 : L.width * 0.31;
  const x1 = L.cx - half;
  const x2 = L.cx + half;
  const y = L.cy;

  // camera: slow 3% push, then zoom-through into the light (exit easing)
  const push = 1 + 0.03 * ramp(f, 1, CUES.zoomThroughS1);
  const zoomK = EASE_OUT_SCENE(ramp(f, CUES.zoomThroughS1, 90));
  const scale = push * (1 + 9 * zoomK);
  const wash = Math.pow(zoomK, 1.6);

  // dust motes drifting in the glow
  const dust: NeonShape[] = Array.from({ length: 70 }, (_, i) => {
    const bx = rndRange(`s1dx${i}`, x1 - 80 * L.unit, x2 + 80 * L.unit);
    const by = y + rndRange(`s1dy${i}`, -1, 1) * 220 * L.unit;
    const px = bx + Math.sin(f * 0.02 + i) * 14 * L.unit + f * 0.25 * L.unit;
    const py = by + Math.sin(f * 0.017 + i * 1.7) * 10 * L.unit - f * 0.12 * L.unit;
    const prox = Math.exp(-Math.abs(py - y) / (90 * L.unit));
    const r = (rnd(`s1dr${i}`) < 0.15 ? 2.6 : 1.1) * L.unit;
    const lit = 0.12 + 0.88 * Math.min(1, I);
    return { d: circlePath(px, py, r), color: COLORS.neon, width: r, fill: true, intensity: 0.9 * prox * lit + 0.05 };
  });

  const shapes: NeonShape[] = [...straightTube(x1, x2, y, d, COLORS.neon, I), ...dust];
  const bloom = 0.75 + 0.35 * Math.min(1, I) + 2.2 * zoomK;
  const hud = enter(f, 1, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.void, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${L.cx}px ${y}px` }}>
        {/* light spill on the wall behind the tube */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse ${half * 1.5}px ${260 * L.unit}px at ${L.cx}px ${y}px, ${withAlpha(COLORS.neon, 0.22 * Math.min(1, I))} 0%, ${withAlpha(COLORS.neon, 0.06 * Math.min(1, I))} 45%, rgba(0,0,0,0) 100%)`,
          }}
        />
        <NeonSvg width={L.width} height={L.height} shapes={shapes} bloom={bloom} bloomRadius={18 * L.unit}>
          <Electrodes x1={x1} x2={x2} y={y} diameter={d} lit={Math.min(1, I)} />
        </NeonSvg>
      </AbsoluteFill>
      {/* zoom-through: the tube's light fills the frame */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(COLORS.tubeWhite, wash)} 0%, ${withAlpha(COLORS.neon, wash * 0.95)} ${20 + 50 * wash}%, ${withAlpha(COLORS.neon, wash * 0.5)} 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: hud * (1 - zoomK) }}>
        <SafeTicks opacity={0.18} />
        <HudText corner="tl" color={COLORS.neon} opacity={0.55 + 0.4 * Math.min(1, I)}>
          {"Ne / 10"}
        </HudText>
        <HudText corner="tr" opacity={0.5}>{`F ${frameCode(f)}`}</HudText>
        <HudText corner="bl" opacity={0.4}>{`TUBE 01  ${(Math.min(1, I) * 100).toFixed(0).padStart(3, "0")}%`}</HudText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
