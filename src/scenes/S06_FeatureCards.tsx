import React, { useMemo } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { DustField } from "../components/Atom";
import { GlassPanel, PanelText, type CssCam } from "../components/GlassPanel";
import { HudText, frameCode } from "../components/HUD";
import { CameraRig, GlowSprite, Stage3D, hdr } from "../components/Stage3D";
import { copy } from "../copy";
import { useLayout } from "../layout";
import { rnd, rndRange } from "../rand";
import { COLORS, EASE_INOUT, ramp } from "../theme";
import { CUES, SCENES } from "../timing";

type V3 = [number, number, number];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const FEATURES = [copy.feature1, copy.feature2, copy.feature3];
const EDGE = [COLORS.blue, COLORS.violet, COLORS.cyan];

/** Opaque emissive orbs behind the glass: the frosted transmission blurs them into bokeh. */
const Bokeh: React.FC<{ t: number }> = ({ t }) => {
  const orbs = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        x: rndRange(`bx${i}`, -13, 13),
        y: rndRange(`by${i}`, -7.5, 7.5),
        z: rndRange(`bz${i}`, -18, -5),
        r: rndRange(`br${i}`, 0.12, 0.55),
        c: [COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.violet, COLORS.neon][Math.floor(rnd(`bc${i}`) * 5)],
        k: rndRange(`bk${i}`, 0.8, 2.6),
        ph: rnd(`bp${i}`) * 6.28,
      })),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  return (
    <group>
      {orbs.map((o, i) => {
        const p: [number, number, number] = [o.x + Math.sin(t * 0.01 + o.ph) * 0.4, o.y + Math.cos(t * 0.008 + o.ph) * 0.3, o.z];
        return (
          <group key={i}>
            <mesh geometry={geo} position={p} scale={o.r * 0.35}>
              <meshBasicMaterial color={hdr(o.c, o.k)} toneMapped={false} />
            </mesh>
            <GlowSprite position={p} scale={o.r * 5} color={o.c} opacity={0.22} intensity={1} />
          </group>
        );
      })}
      <GlowSprite position={[0, -1, -20]} scale={[40, 18]} color={COLORS.violet} opacity={0.25} intensity={1} />
    </group>
  );
};

/** S6 | 780-1020 | Three frosted-glass panels flip in (80 frames apart), each traced by a neon edge light. */
export const S06_FeatureCards: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const F = SCENES.S06.from + f;

  const pw = L.vertical ? 3.9 : 4.6;
  const ph = L.vertical ? 2.5 : 2.6;
  const depth = 0.12;
  const fov = L.vertical ? 44 : 36;
  const cam: CssCam = {
    cx: Math.sin(F * 0.013) * 0.18,
    cy: Math.cos(F * 0.011) * 0.1,
    cz: 11 - 0.32 * EASE_INOUT(ramp(F, 780, 1020)), // ~3% push
    fov,
    width: L.width,
    height: L.height,
  };

  const CENTER: V3 = [0, 0, 0];
  const IN: V3 = L.vertical ? [1.6, -3.6, -2] : [5.6, -0.2, -2];
  const PREV1: V3 = L.vertical ? [0, 3.45, -2.6] : [-5.4, 0.12, -2.6];
  const PREV2: V3 = L.vertical ? [0, 6.6, -6] : [-9.4, 0.25, -6.2];
  const rotIn: V3 = [0, -1.95, 0];
  const rotPrev1: V3 = L.vertical ? [0.42, 0, 0] : [0, 0.5, 0];
  const rotPrev2: V3 = L.vertical ? [0.6, 0, 0] : [0, 0.68, 0];

  const panels = CUES.panelArrivals.map((A, i) => {
    const local = F - A;
    if (local < 0) return null;
    const sIn = spring({ frame: local, fps, config: { damping: 14, stiffness: 120, mass: 1.1 } });
    const next1 = CUES.panelArrivals[i + 1];
    const next2 = CUES.panelArrivals[i + 2];
    const m1 = next1 !== undefined && F >= next1 ? spring({ frame: F - next1, fps, config: { damping: 18, stiffness: 90 } }) : 0;
    const m2 = next2 !== undefined && F >= next2 ? spring({ frame: F - next2, fps, config: { damping: 18, stiffness: 90 } }) : 0;
    let pos = lerp3(IN, CENTER, sIn);
    let rot = lerp3(rotIn, [0, 0, 0], sIn);
    pos = lerp3(pos, PREV1, m1);
    rot = lerp3(rot, rotPrev1, m1);
    pos = lerp3(pos, PREV2, m2);
    rot = lerp3(rot, rotPrev2, m2);
    const trace = EASE_INOUT(ramp(F, A + 4, A + 44));
    const glow = 1 - 0.55 * m1 - 0.25 * m2;
    const textIn = ramp(F, A + 16, A + 26);
    const textOut = next1 !== undefined ? 1 - ramp(F, next1, next1 + 6) : 1;
    return { i, pos, rot, trace, glow, textOpacity: Math.min(textIn, textOut) };
  });

  const bloom = 1.05 + 0.35 * Math.exp(-((F - 780) % 80) / 14);
  return (
    <AbsoluteFill>
      <Stage3D fx={{ bloom, threshold: 0.32, radius: 0.7, ca: 0.0008 }} fov={fov}>
        <CameraRig position={[cam.cx, cam.cy, cam.cz]} lookAt={[cam.cx, cam.cy, cam.cz - 10]} fov={fov} />
        <ambientLight intensity={0.6} />
        <pointLight position={[-4, 3, 4]} intensity={30} color={COLORS.blue} />
        <pointLight position={[5, -2, 3]} intensity={24} color={COLORS.violet} />
        <Bokeh t={F} />
        <DustField t={F} count={140} radius={10} opacity={0.3} size={0.05} seed="s6dust" />
        {panels.map((p) =>
          p ? <GlassPanel key={p.i} w={pw} h={ph} depth={depth} position={p.pos} rotation={p.rot} trace={p.trace} color={EDGE[p.i]} glow={p.glow} t={F} /> : null,
        )}
      </Stage3D>
      {panels.map((p) =>
        p ? (
          <PanelText key={p.i} cam={cam} w={pw} h={ph} depth={depth} position={p.pos} rotation={p.rot} text={FEATURES[p.i]} opacity={p.textOpacity} index={p.i} unit={L.unit} />
        ) : null,
      )}
      <HudText corner="tl" color={COLORS.blue}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.5}>{`F ${frameCode(F)}`}</HudText>
    </AbsoluteFill>
  );
};
