import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HudText, frameCode } from "../components/HUD";
import { COLORS, EASE_IN_SCENE, enter, ramp, withAlpha } from "../theme";
import { SCENES } from "../timing";
import { AtomStarStage } from "./AtomStarStage";

/** S2 | 90-240 | Zoom-through into the tube's light, arriving inside a 3D neon atom. */
export const S02_IntoAtom: React.FC = () => {
  const f = useCurrentFrame();
  const F = SCENES.S02.from + f;
  const hud = enter(f, 30, 20);
  return (
    <AbsoluteFill>
      <AtomStarStage F={F} />
      {/* zoom-through arrival: we come out of the tube's light (matches the end of S1) */}
      <AbsoluteFill
        style={{
          opacity: 1 - EASE_IN_SCENE(ramp(f, 0, 16)),
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(COLORS.tubeWhite, 1)} 0%, ${withAlpha(COLORS.neon, 0.95)} 70%, ${withAlpha(COLORS.neon, 0.5)} 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: hud }}>
        <HudText corner="tl" color={COLORS.neon}>{"Ne / 10"}</HudText>
        <HudText corner="tl" offsetY={28} opacity={0.5}>{"1s2 2s2 2p6"}</HudText>
        <HudText corner="tr" opacity={0.55}>{`F ${frameCode(F)}`}</HudText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
