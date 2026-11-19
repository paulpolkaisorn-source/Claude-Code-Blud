import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HudText, SafeTicks, frameCode } from "../components/HUD";
import { NeonSvg, neonWordShapes, neonWordWidth } from "../components/NeonTube";
import { starShapes } from "../components/StarMark";
import { fitFontSize } from "../components/CopyText";
import { ignition } from "../flicker";
import { useLayout } from "../layout";
import { rnd } from "../rand";
import { COLORS, EASE_OUT_SCENE, FONTS, LAND_SPRING, TYPE, enter, mixHex, ramp, withAlpha } from "../theme";
import { CUES, SCENES } from "../timing";

const TITLE = "GEMINI 4";
const LETTER_STEP = 3; // frames per letter

/** Landing frame (absolute) of each visible character, spaces skipped. */
const landingFrames = (() => {
  const out: (number | null)[] = [];
  let k = 0;
  for (const ch of TITLE) {
    if (ch === " ") out.push(null);
    else out.push(CUES.titleLetters + LETTER_STEP * k++);
  }
  return out;
})();

/** Camera shake: 2 px per landing, decaying over 6 frames. */
const shakeAt = (F: number) => {
  let x = 0;
  let y = 0;
  landingFrames.forEach((lf, i) => {
    if (lf === null || F < lf) return;
    const age = F - lf;
    if (age >= 6) return;
    const a = 2 * (1 - age / 6);
    const sx = (rnd(`shx${i}-${age}`) * 2 - 1) * a;
    const sy = (rnd(`shy${i}-${age}`) * 2 - 1) * a;
    x += sx;
    y += sy;
  });
  return { x, y };
};

/** S4 | 420-600 | GEMINI 4 slams in letter by letter; NEON lights up as bent glass tubes. */
export const S04_TitleSlam: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const F = SCENES.S04.from + f;

  const shake = shakeAt(F);
  const push = 1 + 0.03 * ramp(F, 420, 600);

  // ---- title metrics ----
  const titleSize = fitFontSize(TITLE, L.safe.w * (L.vertical ? 0.92 : 0.62), 210 * L.unit, 0.64, 1);
  const capH = (L.vertical ? 150 : 140) * L.unit;
  const neonW = neonWordWidth("NEON") * capH;
  const gap = 70 * L.unit;
  const blockH = titleSize * 0.78 + gap + capH;
  const titleTop = L.cy - blockH / 2 - titleSize * 0.11;
  const neonTop = L.cy + blockH / 2 - capH;

  // ---- NEON ignition (same pattern as S1) ----
  const neonLocal = F - CUES.neonOn;
  const I = ignition(neonLocal, 3);
  const neonLit = Math.min(1, I);
  const preFlash = EASE_OUT_SCENE(ramp(F, 584, 598));
  const neonShapes = neonWordShapes("NEON", L.cx - neonW / 2, neonTop, capH, COLORS.neon, 14 * L.unit, () => I * (1 + 0.6 * preFlash));

  // faint star watermark carried over from S3
  const star = starShapes({ cx: L.cx, cy: L.cy, size: Math.min(L.width, L.height) * 0.62, rotation: -3 + f * 0.04, coolMix: 1, stroke: 3 * L.unit, dot: false, intensity: 0.2 * (1 - 0.6 * neonLit) });

  const bloom = 0.8 + 0.5 * neonLit + 2.5 * preFlash;
  const allLanded = F >= (landingFrames[landingFrames.length - 1] ?? 0) + 4;
  const titleGlowBeat = allLanded ? Math.exp(-((F - 450) % 30) / 8) * (F >= 450 ? 1 : 0) : 0;

  return (
    <AbsoluteFill style={{ background: COLORS.void, overflow: "hidden" }}>
      {/* cool ambient + warm spill from the NEON tubes */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 42%, ${withAlpha(COLORS.violet, 0.16)} 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse 45% 30% at 50% ${(neonTop / L.height) * 100 + 8}%, ${withAlpha(COLORS.neon, 0.24 * neonLit)} 0%, rgba(0,0,0,0) 75%)`,
        }}
      />
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) scale(${push})` }}>
        <NeonSvg width={L.width} height={L.height} shapes={[...star, ...neonShapes]} bloom={bloom} bloomRadius={16 * L.unit} />
        {/* GEMINI 4: letter-by-letter slam, 3 frames apart */}
        <div
          style={{
            position: "absolute",
            top: titleTop,
            left: 0,
            width: L.width,
            display: "flex",
            justifyContent: "center",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: titleSize,
            letterSpacing: TYPE.titleTracking,
            lineHeight: 1,
            color: COLORS.tubeWhite,
            whiteSpace: "pre",
          }}
        >
          {TITLE.split("").map((ch, i) => {
            const lf = landingFrames[i];
            if (lf === null) return <span key={i}>{" "}</span>;
            const local = F - lf;
            const s = local < 0 ? 0 : spring({ frame: local, fps, config: LAND_SPRING });
            const visible = local >= 0;
            const hit = visible ? Math.exp(-local / 5) : 0;
            const warm = neonLit * 0.55;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: visible ? Math.min(1, 0.4 + local * 0.35) : 0,
                  transform: `translateY(${(1 - s) * -0.22 * titleSize}px) scale(${1 + (1 - s) * 0.85})`,
                  filter: `blur(${(1 - Math.min(1, s)) * 6 * L.unit}px)`,
                  textShadow: [
                    `0 0 ${3 * L.unit}px ${withAlpha(COLORS.tubeWhite, 0.7)}`,
                    `0 0 ${(22 + 40 * hit + 14 * titleGlowBeat) * L.unit}px ${withAlpha(mixHex(COLORS.blue, COLORS.violet, i / 7), 0.85)}`,
                    `0 0 ${(70 + 60 * hit) * L.unit}px ${withAlpha(COLORS.violet, 0.4 + 0.3 * hit)}`,
                    `0 ${18 * L.unit}px ${40 * L.unit}px ${withAlpha(COLORS.neon, warm)}`,
                  ].join(", "),
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: enter(f, 0, 10) }}>
        <SafeTicks opacity={0.15} />
        <HudText corner="tl" color={COLORS.blue}>{"Ne / 10"}</HudText>
        <HudText corner="tr" opacity={0.5}>{`F ${frameCode(F)}`}</HudText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
