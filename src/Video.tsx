import React from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence } from "remotion";
import { optionalAsset } from "./brand";
import { GridBackground } from "./components/GridBackground";
import { BetterTogether } from "./scenes/BetterTogether";
import { ColdOpen } from "./scenes/ColdOpen";
import { EndCard } from "./scenes/EndCard";
import { Montage } from "./scenes/Montage";
import { RadeonDeepDive } from "./scenes/RadeonDeepDive";
import { RyzenDeepDive } from "./scenes/RyzenDeepDive";
import { RyzenInUse } from "./scenes/RyzenInUse";
import { Title } from "./scenes/Title";
import { DURATION, FPS } from "./theme";

// Scene boundaries in frames; every one is a multiple of BEAT (15) and they sum to 3000.
export const SCENES = [
  { id: "cold-open", from: 0, duration: 240, C: ColdOpen },
  { id: "title", from: 240, duration: 300, C: Title },
  { id: "ryzen-deep-dive", from: 540, duration: 600, C: RyzenDeepDive },
  { id: "ryzen-in-use", from: 1140, duration: 300, C: RyzenInUse },
  { id: "radeon-deep-dive", from: 1440, duration: 660, C: RadeonDeepDive },
  { id: "better-together", from: 2100, duration: 450, C: BetterTogether },
  { id: "montage", from: 2550, duration: 300, C: Montage },
  { id: "end-card", from: 2850, duration: 150, C: EndCard },
] as const;

export const Video: React.FC = () => {
  const track = optionalAsset("audio/track.mp3");
  return (
    <AbsoluteFill>
      <GridBackground />
      {SCENES.map(({ id, from, duration, C }) => (
        <Sequence key={id} name={id} from={from} durationInFrames={duration}>
          <C />
        </Sequence>
      ))}
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
