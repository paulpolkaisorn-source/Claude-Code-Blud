import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { brandLogo } from "../brand";
import { ChipDie } from "../components/ChipDie";
import { GpuCard } from "../components/GpuCard";
import { content } from "../data/content";
import { COLORS, FONTS, ease, enter, mix } from "../theme";
import { DIE } from "./ColdOpen";

const LEFT = { cx: 330, cy: 440, size: 200 };
const GPU = { cx: 1190, cy: 440, w: 270, h: 150 };

export const Title: React.FC = () => {
  const f = useCurrentFrame();
  const move = enter(f, 0);
  const ryzenIn = enter(f, 22);
  const gpuDraw = ease(f, [55, 100]);
  const radeonIn = enter(f, 90);
  const link = ease(f, [120, 160]);
  const tagIn = ease(f, [150, 175]);
  const amdIn = ease(f, [165, 190]);
  const drift = ease(f, [0, 300], [1, 1.025], (t) => t);

  const cx = mix(DIE.cx, LEFT.cx, move);
  const cy = mix(DIE.cy, LEFT.cy, move);
  const size = mix(DIE.size, LEFT.size, move);

  const ryzenLogo = brandLogo("ryzen");
  const radeonLogo = brandLogo("radeon");
  const amdLogo = brandLogo("amd");

  const linkPath = `M${LEFT.cx},${LEFT.cy + LEFT.size / 2 + 20} V600 H${GPU.cx} V${GPU.cy + GPU.h / 2 + 18}`;
  const linkLen = 60 + (GPU.cx - LEFT.cx) + (600 - (GPU.cy + GPU.h / 2 + 18));

  const word: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONTS.headline,
    fontWeight: 700,
    fontSize: 104,
    letterSpacing: 4,
    lineHeight: 1,
  };

  return (
    <AbsoluteFill style={{ transform: `scale(${drift})` }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <g style={{ filter: `drop-shadow(0 0 6px ${COLORS.ryzen})` }}>
          <ChipDie cx={cx} cy={cy} size={size} fill={0.12} strokeWidth={mix(4, 3, move)} />
        </g>
        <g style={{ filter: `drop-shadow(0 0 6px ${COLORS.radeon})` }}>
          <GpuCard cx={GPU.cx} cy={GPU.cy} w={GPU.w} h={GPU.h} draw={gpuDraw} fans={2} fanAngle={f * 6} />
        </g>
        <path d={linkPath} fill="none" stroke={COLORS.white} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray={linkLen} strokeDashoffset={linkLen * (1 - link)} />
        <circle cx={LEFT.cx} cy={LEFT.cy + LEFT.size / 2 + 20} r={4 * link} fill={COLORS.ryzen} />
        <circle cx={GPU.cx} cy={GPU.cy + GPU.h / 2 + 18} r={4 * link} fill={COLORS.radeon} />
      </svg>

      {ryzenLogo ? (
        <Img src={ryzenLogo} style={{ position: "absolute", left: 480, top: LEFT.cy - 55, height: 110, opacity: ryzenIn, transform: `translateX(${(1 - ryzenIn) * -80}px)` }} />
      ) : (
        <div style={{ ...word, left: 480, top: LEFT.cy - 52, color: COLORS.ryzen, opacity: ryzenIn, transform: `translateX(${(1 - ryzenIn) * -80}px)` }}>
          {content.title.ryzen}
        </div>
      )}
      {radeonLogo ? (
        <Img src={radeonLogo} style={{ position: "absolute", left: 1375, top: GPU.cy - 55, height: 110, opacity: radeonIn, transform: `translateX(${(1 - radeonIn) * 80}px)` }} />
      ) : (
        <div style={{ ...word, left: 1375, top: GPU.cy - 52, color: COLORS.radeon, opacity: radeonIn, transform: `translateX(${(1 - radeonIn) * 80}px)` }}>
          {content.title.radeon}
        </div>
      )}

      {amdLogo ? (
        <Img src={amdLogo} style={{ position: "absolute", left: 960 - 100, top: 150, width: 200, height: 70, objectFit: "contain", opacity: amdIn }} />
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 720,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.label,
          fontWeight: 500,
          fontSize: 42,
          color: COLORS.white,
          opacity: tagIn,
          transform: `translateY(${(1 - tagIn) * 16}px)`,
        }}
      >
        {content.title.tagline}
      </div>
    </AbsoluteFill>
  );
};
