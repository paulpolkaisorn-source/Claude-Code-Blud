import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HudText, frameCode } from "../components/HUD";
import { COLORS, mixHex, ramp } from "../theme";
import { SCENES } from "../timing";
import { AtomStarStage } from "./AtomStarStage";

/** S3 | 240-420 | The outer ring snaps; 8 electrons draw the four-point star. */
export const S03_StarCollapse: React.FC = () => {
  const f = useCurrentFrame();
  const F = SCENES.S03.from + f;
  const hudColor = mixHex(COLORS.neon, COLORS.blue, ramp(F, 282, 352));
  return (
    <AbsoluteFill>
      <AtomStarStage F={F} />
      <HudText corner="tl" color={hudColor}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.55}>{`F ${frameCode(F)}`}</HudText>
    </AbsoluteFill>
  );
};
