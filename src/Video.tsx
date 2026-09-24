import React from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence } from "remotion";
import { optionalAsset } from "./brand";
import { AmbientDust } from "./components/AmbientDust";
import { BeatFlash } from "./components/BeatFlash";
import { Camera } from "./components/Camera";
import { Glow } from "./components/Glow";
import { GridBackground } from "./components/GridBackground";
import { BetterTogether } from "./scenes/BetterTogether";
import { ColdOpen } from "./scenes/ColdOpen";
import { EndCard } from "./scenes/EndCard";
import { Finale } from "./scenes/Finale";
import { Montage } from "./scenes/Montage";
import { Platform } from "./scenes/Platform";
import { RadeonAI } from "./scenes/RadeonAI";
import { RadeonDeepDive } from "./scenes/RadeonDeepDive";
import { RyzenAI } from "./scenes/RyzenAI";
import { RyzenDeepDive } from "./scenes/RyzenDeepDive";
import { RyzenInUse } from "./scenes/RyzenInUse";
import { Title } from "./scenes/Title";
import { COLORS, DURATION, FPS } from "./theme";

type Cam = { push?: number; driftX?: number; driftY?: number; tilt?: number };
type Scene = {
  id: string;
  from: number;
  duration: number;
  C: React.FC;
  cam?: Cam;
  glow?: number;
  flash?: string;
};

// Scene boundaries in frames; every one is a multiple of BEAT (15) and they sum to DURATION.
export const SCENES: Scene[] = [
  { id: "cold-open", from: 0, duration: 240, C: ColdOpen, cam: { push: 0.06 }, glow: 0.9 },
  { id: "title", from: 240, duration: 300, C: Title, glow: 0.6, flash: COLORS.ryzen },
  { id: "ryzen-deep-dive", from: 540, duration: 600, C: RyzenDeepDive, cam: { push: 0.05, driftX: -40 }, glow: 0.35, flash: COLORS.ryzen },
  { id: "ryzen-in-use", from: 1140, duration: 300, C: RyzenInUse, cam: { push: 0.03, tilt: 3 }, flash: COLORS.ryzen },
  { id: "ryzen-ai", from: 1440, duration: 360, C: RyzenAI, cam: { push: 0.04, driftX: 30 }, glow: 0.4, flash: COLORS.ryzen },
  { id: "platform", from: 1800, duration: 300, C: Platform, cam: { push: 0.05, tilt: -4 }, glow: 0.45, flash: COLORS.ryzen },
  { id: "radeon-deep-dive", from: 2100, duration: 660, C: RadeonDeepDive, cam: { push: 0.03 }, glow: 0.5, flash: COLORS.radeon },
  { id: "radeon-ai", from: 2760, duration: 390, C: RadeonAI, cam: { push: 0.04, driftX: -30 }, glow: 0.45, flash: COLORS.radeon },
  { id: "better-together", from: 3150, duration: 450, C: BetterTogether, cam: { push: 0.05, driftY: -20 }, glow: 0.6, flash: "#FFFFFF" },
  { id: "montage", from: 3600, duration: 450, C: Montage, glow: 0.5 },
  { id: "finale", from: 4050, duration: 240, C: Finale, glow: 0.7, flash: "#FFFFFF" },
  { id: "end-card", from: 4290, duration: 210, C: EndCard },
];

export const Video: React.FC = () => {
  const track = optionalAsset("audio/track.mp3");
  return (
    <AbsoluteFill>
      <GridBackground />
      <AmbientDust />
      {SCENES.map(({ id, from, duration, C, cam, glow, flash }) => {
        const body = cam ? (
          <Camera {...cam}>
            <C />
          </Camera>
        ) : (
          <C />
        );
        return (
          <Sequence key={id} name={id} from={from} durationInFrames={duration}>
            {glow ? <Glow strength={glow}>{body}</Glow> : body}
            {flash ? <BeatFlash color={flash} /> : null}
          </Sequence>
        );
      })}
      {track ? (
        <Html5Audio
          src={track}
          volume={(f) =>
            interpolate(f, [0, FPS, DURATION - 2 * FPS, DURATION], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
