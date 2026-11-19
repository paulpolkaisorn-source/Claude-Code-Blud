import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Atom, DustField, Electron, OUTER_R, electronAngle, orbitTrail } from "../components/Atom";
import { City3D } from "../components/City";
import { GlassPanel } from "../components/GlassPanel";
import { GlitchSlice } from "../components/GlitchSlice";
import { HudText, frameCode } from "../components/HUD";
import { NeonSvg, neonWordShapes, neonWordWidth } from "../components/NeonTube";
import { Flash } from "../components/Overlays";
import { CameraRig, GlowSprite, Stage3D } from "../components/Stage3D";
import { StarMark2D } from "../components/StarMark";
import { LightPacket, StreakTunnel } from "../components/StreakTunnel";
import { hum } from "../flicker";
import { fitFov, useLayout } from "../layout";
import { COLORS, EASE_IN_SCENE, EASE_OUT_SCENE, FONTS, mixHex, ramp, withAlpha } from "../theme";
import { HALF_BEAT, MONTAGE_CUTS, SCENES } from "../timing";
import { implosionStarPx } from "./S09_Implosion";

/**
 * S8 | 1260-1440 | 12 cuts x 15 frames on the half-beat grid, remixing earlier elements.
 * Warm (orange) and cool (blue/violet) shots alternate so the cuts flash.
 */
type Device = "zoom" | "glitch" | "whip" | "flash" | "match";
type Shot = { kind: string; warm: boolean; in: Device };

export const SHOTS: Shot[] = [
  { kind: "electron", warm: true, in: "zoom" }, // in from S7's zoom-through
  { kind: "star", warm: false, in: "glitch" },
  { kind: "letterN", warm: true, in: "whip" },
  { kind: "tunnel", warm: false, in: "zoom" },
  { kind: "panel", warm: true, in: "flash" },
  { kind: "rooftop", warm: false, in: "whip" },
  { kind: "hud", warm: true, in: "glitch" },
  { kind: "electron", warm: false, in: "zoom" },
  { kind: "star", warm: true, in: "whip" },
  { kind: "letterO", warm: false, in: "glitch" },
  { kind: "tunnel", warm: true, in: "flash" },
  { kind: "starFinal", warm: false, in: "zoom" }, // match-cuts into S9's center star
];

const WARM = [COLORS.neon, COLORS.neon, mixHex(COLORS.neon, COLORS.tubeWhite, 0.3), "#FF7A3D"];
const COOL = [COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.violet];

// ---------- 3D shots ----------
const ElectronShot: React.FC<{ t: number; warm: boolean; F: number }> = ({ t, warm, F }) => {
  const L = useLayout();
  const color = warm ? COLORS.neon : COLORS.cyan;
  const tilt = { x: 1.25, z: warm ? 0.25 : -0.3 };
  const tt = F * 2.2; // faster orbit for the close-up
  return (
    <Stage3D fx={{ bloom: 1.6, threshold: 0.15, ca: 0.002 }} fov={fitFov(42, L.aspect)}>
      <CameraRig position={[2.5 - t * 0.02, 0.7, 2.4 - t * 0.01]} lookAt={[2.1, 0.2, 0]} />
      <DustField t={F} count={150} radius={6} opacity={0.45} size={0.04} seed={`mde${warm}`} />
      <Atom t={tt} innerTilt={{ x: 1.1, z: 0.4 }} outerTilt={tilt} color={color} trail={1.8} />
      {Array.from({ length: 8 }, (_, i) => (
        <Electron key={i} trail={orbitTrail(OUTER_R, tilt, electronAngle("outer", i, tt), 2.2, 40)} color={color} intensity={1.2} width={6} size={0.06} />
      ))}
    </Stage3D>
  );
};

const TunnelShot: React.FC<{ t: number; warm: boolean }> = ({ t, warm }) => {
  const L = useLayout();
  const palette = warm ? [...WARM, COLORS.tubeWhite] : [...COOL, COLORS.tubeWhite];
  const travel = 400 + t * 5.5;
  return (
    <Stage3D fx={{ bloom: 1.9, threshold: 0.2, ca: 0.006 }} fov={fitFov(70, L.aspect, 95)} far={300}>
      <CameraRig position={[0, 0, 0]} lookAt={[0.3, 0.2, -10]} roll={warm ? 0.12 : -0.12} />
      <StreakTunnel travel={travel} speed={5} count={500} palette={palette} seed={warm ? "mtw" : "mtc"} />
      <LightPacket position={[0.3, 0.5, -16]} t={t} color={warm ? COLORS.neon : COLORS.cyan} />
    </Stage3D>
  );
};

const PanelShot: React.FC<{ t: number }> = ({ t }) => {
  const L = useLayout();
  const trace = EASE_OUT_SCENE(ramp(t, 0, 14));
  return (
    <Stage3D fx={{ bloom: 1.5, threshold: 0.25, ca: 0.002 }} fov={fitFov(40, L.aspect)}>
      {/* grazing angle along the panel's top edge while the edge light races around it */}
      <CameraRig position={[-3.4 + t * 0.04, 1.75, 1.7]} lookAt={[-1.0, 0.75, 0]} roll={-0.08} />
      <DustField t={t} count={120} radius={5} opacity={0.35} size={0.03} seed="mpd" />
      {Array.from({ length: 9 }, (_, i) => (
        <GlowSprite key={i} position={[-4 + i * 1.3, -1 + (i % 3) * 1.2, -4 - (i % 4)]} scale={0.5 + (i % 3) * 0.35} color={i % 3 === 0 ? COLORS.tubeWhite : COLORS.neon} opacity={0.3} intensity={1.2} />
      ))}
      <GlassPanel w={4.6} h={2.6} position={[0, 0, 0]} rotation={[0, 0.25, 0]} trace={trace} color={COLORS.neon} t={t * 6} opacity={0.6} headScale={0.32} sheen={0.04} />
    </Stage3D>
  );
};

const RooftopShot: React.FC<{ t: number }> = ({ t }) => {
  const L = useLayout();
  const z = -10 - t * 1.3;
  return (
    <Stage3D fx={{ bloom: 1.6, threshold: 0.2, ca: 0.002 }} fov={fitFov(55, L.aspect)} far={200}>
      <fog attach="fog" args={[COLORS.void, 15, 70]} />
      <CameraRig position={[4.5, 13.5, z]} rotation={[-0.42, 0.22, 0.05]} />
      <City3D heightK={() => 1} width={L.width} height={L.height} tint={(c) => (c === COLORS.neon ? COLORS.violet : c)} edgeBoost={1.2} />
    </Stage3D>
  );
};

// ---------- 2D shots ----------
const StarShot: React.FC<{ t: number; warm: boolean; final?: boolean }> = ({ t, warm, final }) => {
  const L = useLayout();
  const target = implosionStarPx(L);
  const spin = final ? -140 * (1 - EASE_IN_SCENE(ramp(t, 0, 15))) : (warm ? 1 : -1) * (40 + 220 * EASE_IN_SCENE(ramp(t, 0, 15)));
  const size = final ? target : Math.min(L.width, L.height) * 0.3;
  return (
    <AbsoluteFill style={{ background: COLORS.void }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${withAlpha(warm ? COLORS.neon : COLORS.violet, 0.18)} 0%, rgba(0,0,0,0) 55%)` }} />
      <StarMark2D width={L.width} height={L.height} cx={L.cx} cy={L.cy} size={size} rotation={spin} coolMix={warm ? 0 : 1} stroke={size * 0.045} bloom={1.3} />
    </AbsoluteFill>
  );
};

const LetterShot: React.FC<{ t: number; letter: "N" | "O"; warm: boolean; F: number }> = ({ t, letter, warm, F }) => {
  const L = useLayout();
  const capH = Math.min(L.width, L.height) * 0.62;
  const w = neonWordWidth(letter) * capH;
  const color = warm ? COLORS.neon : COLORS.violet;
  // stutters on, then hums
  const I = t < 2 ? 0.2 : t < 4 ? 1 : t < 5 ? 0.35 : hum(F, 11);
  const scale = 1.12 - 0.08 * EASE_IN_SCENE(ramp(t, 0, 15));
  const shapes = neonWordShapes(letter, L.cx - w / 2, L.cy - capH / 2, capH, color, 26 * L.unit, () => I);
  return (
    <AbsoluteFill style={{ background: COLORS.void, transform: `scale(${scale})` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${withAlpha(color, 0.2 * Math.min(1, I))} 0%, rgba(0,0,0,0) 70%)` }} />
      <NeonSvg width={L.width} height={L.height} shapes={shapes} bloom={1.4} bloomRadius={30 * L.unit} />
    </AbsoluteFill>
  );
};

const HudShot: React.FC<{ t: number; F: number }> = ({ t, F }) => {
  const L = useLayout();
  const big = Math.min(L.width * 0.16, L.height * 0.3);
  const n = Math.floor((F * 7919) % 100000);
  const rows = [0, 1, 2, 3, 4];
  return (
    <AbsoluteFill style={{ background: COLORS.void, alignItems: "center", justifyContent: "center", fontFamily: FONTS.mono, color: COLORS.neon }}>
      <div
        style={{
          fontSize: big,
          fontWeight: 500,
          letterSpacing: "0.02em",
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 ${10 * L.unit}px ${withAlpha(COLORS.neon, 0.9)}, 0 0 ${40 * L.unit}px ${withAlpha(COLORS.neon, 0.6)}`,
          transform: `scale(${1 + 0.04 * t / 15})`,
        }}
      >
        {String(n).padStart(5, "0")}
      </div>
      <div style={{ position: "absolute", left: L.safe.x, top: L.safe.y + 40 * L.unit, fontSize: 18 * L.unit, lineHeight: 1.7, opacity: 0.75 }}>
        {rows.map((r) => (
          <div key={r}>{`${frameCode(F - r * 3)}  ${(((F + r * 37) * 13) % 997).toString().padStart(3, "0")}`}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- cut devices ----------
const ShotFrame: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
  const t = useCurrentFrame(); // 0..14 within this shot
  const L = useLayout();
  const me = SHOTS[index];
  const next = SHOTS[index + 1];
  let tx = 0;
  let blur = 0;
  let scale = 1;
  let bright = 1;
  // incoming device (first frames)
  if (me.in === "whip" && t < 4) {
    const k = 1 - EASE_IN_SCENE(t / 4);
    tx += L.width * 0.35 * k;
    blur += 50 * k;
  }
  if (me.in === "zoom" && t < 5) {
    const k = 1 - EASE_IN_SCENE(t / 5);
    scale *= 1 + 0.45 * k;
    bright += 0.8 * k;
  }
  // outgoing device (last frames), mirrored from the next shot's entry
  if (next) {
    const out = HALF_BEAT - 1 - t; // 0 on the last frame
    if (next.in === "whip" && out < 4) {
      const k = EASE_OUT_SCENE(1 - out / 4);
      tx -= L.width * 0.35 * k;
      blur += 50 * k;
    }
    if (next.in === "zoom" && out < 4) {
      const k = EASE_OUT_SCENE(1 - out / 4);
      scale *= 1 + 0.9 * k;
      bright += 1.2 * k;
    }
  }
  const glitchIn = me.in === "glitch" && t < 2 ? 1 - t * 0.3 : 0;
  const glitchOut = next?.in === "glitch" && t >= HALF_BEAT - 2 ? 0.8 : 0;
  const flashOut = next?.in === "flash" && t >= HALF_BEAT - 2 ? 1 : 0;
  const filter = [blur > 0.5 ? `blur(${blur * 0.25}px)` : "", bright !== 1 ? `brightness(${bright})` : ""].join(" ").trim();
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: COLORS.void }}>
      <GlitchSlice amount={Math.max(glitchIn, glitchOut)} seed={index * 10 + t} width={L.width} height={L.height}>
        <AbsoluteFill style={{ transform: `translateX(${tx}px) scale(${scale})`, filter: filter || undefined }}>{children}</AbsoluteFill>
      </GlitchSlice>
      <Flash amount={flashOut} />
    </AbsoluteFill>
  );
};

const ShotContent: React.FC<{ index: number }> = ({ index }) => {
  const t = useCurrentFrame();
  const F = MONTAGE_CUTS[index] + t;
  const s = SHOTS[index];
  switch (s.kind) {
    case "electron":
      return <ElectronShot t={t} warm={s.warm} F={F} />;
    case "star":
      return <StarShot t={t} warm={s.warm} />;
    case "starFinal":
      return <StarShot t={t} warm={false} final />;
    case "letterN":
      return <LetterShot t={t} letter="N" warm={s.warm} F={F} />;
    case "letterO":
      return <LetterShot t={t} letter="O" warm={s.warm} F={F} />;
    case "tunnel":
      return <TunnelShot t={t} warm={s.warm} />;
    case "panel":
      return <PanelShot t={t} />;
    case "rooftop":
      return <RooftopShot t={t} />;
    case "hud":
      return <HudShot t={t} F={F} />;
    default:
      return null;
  }
};

export const S08_Montage: React.FC = () => {
  const f = useCurrentFrame();
  const F = SCENES.S08.from + f;
  const cut = Math.min(11, Math.floor(f / HALF_BEAT));
  return (
    <AbsoluteFill style={{ background: COLORS.void }}>
      {SHOTS.map((_, i) => (
        <Sequence key={i} from={i * HALF_BEAT} durationInFrames={HALF_BEAT} name={`cut ${String(i + 1).padStart(2, "0")} ${SHOTS[i].kind}`}>
          <ShotFrame index={i}>
            <ShotContent index={i} />
          </ShotFrame>
        </Sequence>
      ))}
      <HudText corner="tl" color={SHOTS[cut].warm ? COLORS.neon : COLORS.blue}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.6}>{`F ${frameCode(F)}`}</HudText>
      <HudText corner="bl" opacity={0.6}>{`CUT ${String(cut + 1).padStart(2, "0")}/12`}</HudText>
    </AbsoluteFill>
  );
};
