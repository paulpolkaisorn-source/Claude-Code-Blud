import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CopyText, fitFontSize } from "../components/CopyText";
import { SafeTicks } from "../components/HUD";
import { NeonSvg, neonWordShapes, neonWordWidth } from "../components/NeonTube";
import { starShapes } from "../components/StarMark";
import { copy } from "../copy";
import { finalFlicker, hum, ignition } from "../flicker";
import { useLayout } from "../layout";
import { COLORS, EASE_IN_SCENE, FONTS, LAND_SPRING, TYPE, enter, mixHex, ramp, withAlpha } from "../theme";
import { CUES, SCENES } from "../timing";

export const DISCLAIMER = "Fan concept. Not affiliated with Google.";

/** S10 | 1620-1800 | Out of the white: star mark, GEMINI 4 NEON lockup, availability, fan-concept line. */
export const S10_EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const F = SCENES.S10.from + f;

  // every light hums, then does one last flicker at 1788 before the cut to black
  const last = finalFlicker(F - CUES.finalFlicker);
  const hm = hum(F, 21);
  const lights = hm * last;

  const whiteOut = 1 - EASE_IN_SCENE(ramp(F, 1620, 1636));
  const starSettle = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } });

  // ---- layout ----
  const starSize = (L.vertical ? 150 : 118) * L.unit;
  const starY = L.vertical ? L.cy - 360 * L.unit : L.cy - 175 * L.unit;
  const titleSize = L.vertical ? fitFontSize("GEMINI 4", L.safe.w * 0.8, 132 * L.unit, 0.64) : 96 * L.unit;
  const capH = titleSize * 0.72; // match Space Grotesk cap height
  const neonW = neonWordWidth("NEON") * capH;
  const titleW = titleSize * 0.6 * 8 * 0.98; // approx advance width of "GEMINI 4"
  const gap = titleSize * 0.38;
  const lockY = L.vertical ? L.cy - 40 * L.unit : L.cy + 30 * L.unit;
  const totalW = titleW + gap + neonW;
  const titleX = L.vertical ? L.cx - titleW / 2 : L.cx - totalW / 2;
  const neonX = L.vertical ? L.cx - neonW / 2 : titleX + titleW + gap;
  const neonY = L.vertical ? lockY + titleSize * 1.18 : lockY + titleSize * 0.14;

  const titleIn = spring({ frame: F - 1632, fps, config: LAND_SPRING });
  const neonI = ignition(F - 1640, 5) * last;
  const availIn = enter(F, 1680, 18);
  const discIn = enter(F, 1695, 18);
  const availY = L.vertical ? neonY + capH + 120 * L.unit : lockY + titleSize + 70 * L.unit;

  const shapes = [
    ...starShapes({ cx: L.cx, cy: starY, size: starSize * (1 + 0.25 * (1 - starSettle)), rotation: 0, coolMix: 1, stroke: starSize * 0.05, intensity: lights }),
    ...neonWordShapes("NEON", neonX, neonY, capH, COLORS.neon, Math.max(5, capH * 0.085), () => neonI),
  ];
  const textGlow = Math.max(0.12, lights) * Math.min(1, titleIn * 1.3);

  return (
    <AbsoluteFill style={{ background: COLORS.void, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${(starY / L.height) * 100}%, ${withAlpha(COLORS.violet, 0.2 * lights)} 0%, rgba(0,0,0,0) 40%), radial-gradient(ellipse 40% 22% at ${((neonX + neonW / 2) / L.width) * 100}% ${((neonY + capH / 2) / L.height) * 100}%, ${withAlpha(COLORS.neon, 0.18 * Math.min(1, neonI))} 0%, rgba(0,0,0,0) 80%)`,
        }}
      />
      <SafeTicks opacity={0.12 * last} />
      <NeonSvg width={L.width} height={L.height} shapes={shapes} bloom={0.95 + 0.25 * (lights - 1) * 6} bloomRadius={14 * L.unit} />
      {/* GEMINI 4 */}
      <div
        style={{
          position: "absolute",
          left: titleX,
          top: lockY,
          width: titleW,
          textAlign: "center",
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: titleSize,
          lineHeight: 1,
          letterSpacing: TYPE.titleTracking,
          whiteSpace: "nowrap",
          color: mixHex(COLORS.void, COLORS.tubeWhite, 0.25 + 0.75 * Math.min(1, Math.max(0.15, last))),
          opacity: Math.min(1, titleIn * 1.4),
          transform: `translateY(${(1 - titleIn) * 24 * L.unit}px)`,
          textShadow: `0 0 ${3 * L.unit}px ${withAlpha(COLORS.tubeWhite, 0.6 * textGlow)}, 0 0 ${24 * L.unit}px ${withAlpha(COLORS.blue, 0.85 * textGlow)}, 0 0 ${60 * L.unit}px ${withAlpha(COLORS.violet, 0.45 * textGlow)}`,
        }}
      >
        GEMINI 4
      </div>
      {/* availability (copy.ts); hidden when empty */}
      <div style={{ position: "absolute", top: availY, left: 0, width: L.width, display: "flex", justifyContent: "center", opacity: availIn }}>
        <CopyText text={copy.availability} size={(L.vertical ? 44 : 38) * L.unit} maxWidth={L.safe.w * 0.85} weight={500} glowAmount={0.4} maxLines={2} color={withAlpha(COLORS.tubeWhite, 0.9)} />
      </div>
      {/* required fan-concept line */}
      <div
        style={{
          position: "absolute",
          bottom: L.safe.y + 6 * L.unit,
          left: 0,
          width: L.width,
          textAlign: "center",
          fontFamily: FONTS.mono,
          fontWeight: 500,
          fontSize: 20 * L.unit,
          letterSpacing: "0.04em",
          color: withAlpha(COLORS.tubeWhite, 0.78),
          opacity: discIn,
        }}
      >
        {DISCLAIMER}
      </div>
      {whiteOut > 0.001 && <AbsoluteFill style={{ background: COLORS.tubeWhite, opacity: whiteOut }} />}
    </AbsoluteFill>
  );
};
