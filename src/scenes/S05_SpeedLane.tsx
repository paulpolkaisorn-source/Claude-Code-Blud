import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CopyText } from "../components/CopyText";
import { HudText, frameCode } from "../components/HUD";
import { CameraRig, Stage3D } from "../components/Stage3D";
import { LightPacket, StreakTunnel, TunnelRings } from "../components/StreakTunnel";
import { DustField } from "../components/Atom";
import { copy } from "../copy";
import { fitFov, useLayout } from "../layout";
import { COLORS, EASE_IN_SCENE, EASE_OUT_SCENE, LAND_SPRING, ramp } from "../theme";
import { CUES, SCENES } from "../timing";

const FREEZE_LOCAL = CUES.streakFreeze - SCENES.S05.from; // 174

/** Speed ramp: fast in (burst out of the flash), hold, fast out, then a 6-frame freeze. */
export const speedAt = (t: number) => {
  const tt = Math.min(t, FREEZE_LOCAL - 1);
  if (tt < 24) return 0.9 + 1.9 * (1 - EASE_IN_SCENE(tt / 24));
  if (tt < 110) return 0.9 + 0.25 * ((tt - 24) / 86);
  return 1.15 + 4.6 * EASE_OUT_SCENE(Math.min(1, (tt - 110) / 64));
};

export const travelAt = (t: number) => {
  const end = Math.min(t, FREEZE_LOCAL);
  let sum = 0;
  for (let k = 0; k < end; k++) sum += speedAt(k);
  return sum;
};

/** S5 | 600-780 | Hyperspeed lane chasing a packet of light, tagline on screen, freeze on the last beat. */
export const S05_SpeedLane: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const F = SCENES.S05.from + f;
  const frozen = f >= FREEZE_LOCAL;
  const tf = frozen ? FREEZE_LOCAL : f; // motion time stops during the freeze
  const speed = speedAt(tf);
  const travel = travelAt(tf);
  const speedNorm = Math.min(1, (speed - 0.9) / 4.8);

  const fov = fitFov(56 + 16 * speedNorm, L.aspect, 92);
  const sway = Math.sin(tf * 0.045) * 0.25;
  const roll = Math.sin(tf * 0.03) * 0.03 + 0.07 * speedNorm * Math.sin(tf * 0.11);
  const ahead = -15 - 7 * EASE_OUT_SCENE(ramp(tf, 120, 174));

  const bloom = 1.15 + 1.3 * speedNorm + (f < 12 ? 1.5 * (1 - f / 12) : 0);
  const ca = 0.0006 + 0.007 * speedNorm;

  // tagline: words spring up from a mask on beat 21 (630)
  const tagStart = 630 - SCENES.S05.from;
  return (
    <AbsoluteFill>
      <Stage3D fx={{ bloom, threshold: 0.2, radius: 0.7, ca }} fov={fov} far={300}>
        <CameraRig position={[sway * 0.4, 0.15, 0]} lookAt={[sway, 0.35, -10]} fov={fov} roll={roll} />
        <StreakTunnel travel={travel} speed={speed} count={560} />
        <TunnelRings travel={travel * 0.9} color={COLORS.violet} intensity={0.45} />
        <DustField t={tf} count={120} radius={8} opacity={0.35} size={0.05} seed="s5dust" />
        <LightPacket position={[Math.sin(tf * 0.05) * 0.35, 0.7 + Math.sin(tf * 0.07) * 0.18, ahead]} t={tf} intensity={1 + 0.4 * speedNorm} />
      </Stage3D>
      {/* contrast backing for the copy line */}
      <AbsoluteFill
        style={{
          opacity: copy.tagline ? Math.min(1, Math.max(0, (tf - tagStart + 6) / 12)) : 0,
          background: `radial-gradient(ellipse ${L.vertical ? 60 : 42}% ${L.vertical ? 9 : 13}% at 50% ${(L.vertical ? 0.6 : 0.64) * 100 + 4}%, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.4) 55%, rgba(5,6,10,0) 100%)`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
        <div style={{ position: "absolute", top: L.height * (L.vertical ? 0.6 : 0.64), width: L.width, display: "flex", justifyContent: "center" }}>
          <CopyText
            text={copy.tagline}
            size={84 * L.unit}
            maxWidth={L.safe.w * (L.vertical ? 0.95 : 0.8)}
            glow={COLORS.blue}
            maxLines={L.vertical ? 2 : 1}
            letterStyle={(i) => {
              const s = spring({ frame: tf - tagStart - i * 3, fps, config: LAND_SPRING });
              const vis = tf - tagStart - i * 3 >= 0;
              return {
                opacity: vis ? Math.min(1, s * 1.4) : 0,
                transform: `translateY(${(1 - s) * 40 * L.unit}px)`,
                filter: `blur(${(1 - Math.min(1, s)) * 8 * L.unit}px)`,
              };
            }}
          />
        </div>
      </AbsoluteFill>
      <HudText corner="tl" color={COLORS.cyan}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.5}>{`F ${frameCode(F)}${frozen ? "  ‖" : ""}`}</HudText>
    </AbsoluteFill>
  );
};
