import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, getStaticFiles, staticFile, useCurrentFrame } from "remotion";
import { GlitchSlice } from "./components/GlitchSlice";
import { Flash, Grain, Vignette, Whip } from "./components/Overlays";
import { useLayout } from "./layout";
import { S01_Ignition } from "./scenes/S01_Ignition";
import { S02_IntoAtom } from "./scenes/S02_IntoAtom";
import { S03_StarCollapse } from "./scenes/S03_StarCollapse";
import { S04_TitleSlam } from "./scenes/S04_TitleSlam";
import { S05_SpeedLane } from "./scenes/S05_SpeedLane";
import { S06_FeatureCards } from "./scenes/S06_FeatureCards";
import { S07_City } from "./scenes/S07_City";
import { S08_Montage } from "./scenes/S08_Montage";
import { S09_Implosion } from "./scenes/S09_Implosion";
import { S10_EndCard } from "./scenes/S10_EndCard";
import { MUSIC, SFX_CUES, SFX_FILES } from "./sfx";
import { COLORS, EASE_IN_SCENE, EASE_OUT_SCENE, ramp } from "./theme";
import { CUES, SCENES, TOTAL_FRAMES, type SceneDef } from "./timing";

type Key = keyof typeof SCENES;

const SCENE_COMPONENTS: Record<Key, React.FC> = {
  S01: S01_Ignition,
  S02: S02_IntoAtom,
  S03: S03_StarCollapse,
  S04: S04_TitleSlam,
  S05: S05_SpeedLane,
  S06: S06_FeatureCards,
  S07: S07_City,
  S08: S08_Montage,
  S09: S09_Implosion,
  S10: S10_EndCard,
};

/**
 * Transition devices between scenes (one per cut):
 *  90 zoom-through (S1/S2) | 240 match cut on shape (S2/S3) | 420 glitch slice 414-417
 *  600 2-frame white flash 598-599 | 780 glitch slice over the freeze 776-779
 *  1020 whip-pan 1005-1029 | 1260 zoom-through (S7/S8) | 1275-1425 montage devices (S8)
 *  1440 match cut on shape (star) | 1620 2-frame white flash 1618-1619 | 1799 cut to black
 */
const Devices: React.FC<{ k: Key; children: React.ReactNode }> = ({ k, children }) => {
  const frame = useCurrentFrame(); // local to the scene's Sequence
  const L = useLayout();
  const F = SCENES[k].from + frame;
  if (k === "S03" || k === "S05") {
    const start = k === "S03" ? CUES.glitchS3 : CUES.glitchS5;
    const on = F >= start && F < start + 4;
    return (
      <GlitchSlice amount={on ? 1 - (F - start) * 0.12 : 0} seed={F} width={L.width} height={L.height}>
        {children}
      </GlitchSlice>
    );
  }
  if (k === "S06") {
    const k2 = EASE_OUT_SCENE(ramp(F, CUES.whipS6, 1020));
    return (
      <Whip id="whip-s6" x={L.width * 0.75 * k2} blur={90 * Math.sin(Math.PI * Math.min(1, k2 * 0.95 + 0.05)) * (k2 > 0 ? 1 : 0)}>
        {children}
      </Whip>
    );
  }
  if (k === "S07") {
    const k2 = 1 - EASE_IN_SCENE(ramp(F, 1020, 1030));
    return (
      <Whip id="whip-s7" x={-L.width * 0.6 * k2} blur={90 * k2}>
        {children}
      </Whip>
    );
  }
  return <AbsoluteFill>{children}</AbsoluteFill>;
};

/** Global white flashes: 2 full frames, with a short bleed into the next shot. */
const flashAmount = (F: number) => {
  for (const at of [CUES.flashS4, CUES.flashS9]) {
    if (F === at || F === at + 1) return 1;
  }
  if (F === CUES.flashS4 + 2) return 0.35;
  if (F === CUES.flashS4 + 3) return 0.12;
  return 0;
};

const AudioLayer: React.FC = () => {
  const available = new Set(getStaticFiles().map((f) => f.name));
  return (
    <>
      {available.has(MUSIC.file) && (
        <Sequence from={0} durationInFrames={MUSIC.endFrame} name="music">
          <Html5Audio src={staticFile(MUSIC.file)} volume={MUSIC.volume} />
        </Sequence>
      )}
      {SFX_CUES.map((c, i) =>
        available.has(SFX_FILES[c.sfx]) ? (
          <Sequence key={i} from={c.frame} durationInFrames={Math.min(c.duration ?? 240, TOTAL_FRAMES - c.frame)} name={`sfx ${c.note}`}>
            <Html5Audio src={staticFile(SFX_FILES[c.sfx])} volume={c.volume} loop={c.loop} />
          </Sequence>
        ) : null,
      )}
    </>
  );
};

export const Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const blank = frame === 0 || frame === CUES.lastFrame;
  return (
    <AbsoluteFill style={{ background: COLORS.void }}>
      {(Object.keys(SCENES) as Key[]).map((key) => {
        const s: SceneDef = SCENES[key];
        const Comp = SCENE_COMPONENTS[key];
        return (
          <Sequence key={key} from={s.from} durationInFrames={s.duration} name={`${s.id} ${s.name}`}>
            <Devices k={key}>
              <Comp />
            </Devices>
          </Sequence>
        );
      })}
      {!blank && <Vignette />}
      <Flash amount={flashAmount(frame)} />
      {!blank && <Grain opacity={0.04} />}
      {/* frame 0 and the final frame are the only empty frames: cut to black */}
      {blank && <AbsoluteFill style={{ background: COLORS.void }} />}
      <AudioLayer />
    </AbsoluteFill>
  );
};
