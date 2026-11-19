import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { City2D, City3D, type Building, type PlanView } from "../components/City";
import { HudText, frameCode } from "../components/HUD";
import { CameraRig, GlowSprite, Stage3D } from "../components/Stage3D";
import { DustField } from "../components/Atom";
import { useLayout } from "../layout";
import { COLORS, EASE_INOUT, EASE_OUT_SCENE, LAND_SPRING, ramp, withAlpha } from "../theme";
import { CUES, SCENES } from "../timing";

const deg = (d: number) => (d * Math.PI) / 180;

/** Plan scale (px per world unit) for the flat 2D phase. */
export const planScale = (vertical: boolean, width: number) => (vertical ? width / 20 : width / 32);

/** S7 | 1020-1260 | Flat circuit-city line art extrudes into 3D light-buildings; the camera dives down the avenue. */
export const S07_City: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const F = SCENES.S07.from + f;

  const s0 = planScale(L.vertical, L.width);
  const pushK = 1 + 0.025 * ramp(F, 1020, CUES.extrude) + 0.02 * ramp(F, CUES.extrude, 1100);
  const view: PlanView = { cx: L.cx, cy: L.cy, zc: 0, s: s0 * pushK, width: L.width, height: L.height };

  // ---- 3D camera, matched to the plan at the handoff ----
  const fov0 = L.vertical ? 46 : 30;
  const h0 = L.height / 2 / (s0 * Math.tan(deg(fov0) / 2));
  const tilt = EASE_INOUT(ramp(F, 1100, 1172));
  const dive = EASE_OUT_SCENE(ramp(F, 1172, 1258));
  let height = h0 / pushK;
  let pitch = -90;
  let z = 0;
  let fov = fov0;
  if (F >= 1100) {
    const hTilt = EASE_INOUT(ramp(F, 1100, 1166));
    height = h0 / pushK + (4.2 - h0 / pushK) * hTilt;
    pitch = -90 + 72 * tilt;
    z = 14 * tilt;
    fov = fov0 + (58 - fov0) * tilt;
  }
  if (F >= 1172) {
    z = 14 - 84 * dive;
    height = 4.2 - 2.4 * dive;
    pitch = -18 + 14 * dive;
    fov = 58 + 16 * dive;
  }
  const x = Math.sin(F * 0.02) * 0.12 * tilt;
  const roll = Math.sin(F * 0.05) * 0.035 * dive;

  const heightK = (b: Building) => {
    const start = CUES.extrude + b.delay * 0.5;
    if (F < start) return 0;
    return spring({ frame: F - start, fps, config: LAND_SPRING });
  };

  const show3D = F >= CUES.extrude - 4;
  const planOpacity = 1 - ramp(F, CUES.extrude, CUES.extrude + 12);
  const flare = ramp(F, 1228, 1260);
  const bloom = 1.15 + 0.5 * tilt + 0.6 * dive + 2.4 * Math.pow(flare, 2);
  const wash = Math.pow(ramp(F, 1247, 1260), 1.5);

  return (
    <AbsoluteFill style={{ background: COLORS.void }}>
      {show3D && (
        <Stage3D fx={{ bloom, threshold: 0.2, radius: 0.72, ca: 0.0006 + 0.004 * dive }} fov={fov} far={260}>
          <fog attach="fog" args={[COLORS.void, 30, 105]} />
          <CameraRig position={[x, height, z]} rotation={[deg(pitch), 0, roll]} fov={fov} />
          <City3D heightK={heightK} width={L.width} height={L.height} />
          <DustField t={F} count={180} radius={20} opacity={0.3} size={0.06} seed="s7dust" />
          {/* vanishing-point light at the end of the avenue: the zoom-through target */}
          <GlowSprite position={[0, 2.2, -100]} scale={18 + 70 * flare} color={COLORS.cyan} opacity={0.35 + 0.65 * flare} intensity={1.6 + 2 * flare} />
        </Stage3D>
      )}
      {planOpacity > 0.001 && (
        <AbsoluteFill style={{ opacity: planOpacity }}>
          {!show3D && <AbsoluteFill style={{ background: COLORS.void }} />}
          {/* draw-on starts 14 frames "early" so the whip-pan lands on lines already glowing */}
          <City2D view={view} t={F - SCENES.S07.from + 14} bloom={0.9} />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          opacity: wash,
          background: `radial-gradient(circle at 50% 45%, ${withAlpha(COLORS.tubeWhite, 1)} 0%, ${withAlpha(COLORS.cyan, 0.9)} 45%, ${withAlpha(COLORS.blue, 0.75)} 100%)`,
        }}
      />
      <HudText corner="tl" color={COLORS.cyan}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.5}>{`F ${frameCode(F)}`}</HudText>
      <HudText corner="bl" opacity={0.55} color={F < CUES.extrude ? COLORS.blue : COLORS.cyan}>
        {F < CUES.extrude ? "PLAN  2D" : "EXTRUDE  3D"}
      </HudText>
    </AbsoluteFill>
  );
};
