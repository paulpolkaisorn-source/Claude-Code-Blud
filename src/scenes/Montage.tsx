import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { BEAT, ease } from "../theme";
import { BetterTogetherArt } from "./BetterTogether";
import { ColdOpenArt } from "./ColdOpen";
import { PlatformArt } from "./Platform";
import { RadeonAIArt } from "./RadeonAI";
import { RadeonArt } from "./RadeonDeepDive";
import { RyzenAIArt } from "./RyzenAI";
import { RyzenArt } from "./RyzenDeepDive";

export const MONTAGE_FRAMES = 450;

// Each motif maps the 15-frame cut onto a compressed slice of the original motion
// (start frame + speed), so every cut is a fast re-render, never a slow replay.
const MOTIFS: ((l: number) => React.ReactNode)[] = [
  (l) => <ColdOpenArt f={70 + l * 10} />, // tracing light line
  (l) => <RyzenArt f={60 + l * 6.5} labels={false} />, // chip exploding
  (l) => <RadeonArt f={240 + l * 5.5} labels={false} />, // compute unit wave
  (l) => <RyzenArt f={185 + l * 5} labels={false} />, // cache landing
  (l) => <RadeonArt f={338 + l * 5.5} labels={false} />, // ray bounce
  (l) => <PlatformArt f={20 + l * 6} labels={false} />, // traces racing to memory/PCIe
  (l) => <RadeonArt f={462 + l * 6.5} labels={false} />, // upscale sweep
  (l) => <RyzenAIArt f={20 + l * 8} labels={false} />, // laptop lid opening
  (l) => <RadeonAIArt f={20 + l * 9} labels={false} />, // AI matrix wave
  (l) => <BetterTogetherArt f={300 + l * 10} labels={false} />, // particle stream
];

const Cut: React.FC<{ index: number }> = ({ index }) => {
  const l = useCurrentFrame();
  const punch = ease(l, [0, 8], [1.08, 1]);
  const flash = ease(l, [0, 5], [0.08, 0]);
  // Alternate a subtle roll so consecutive cuts don't feel identical.
  const roll = (index % 2 === 0 ? 1 : -1) * ease(l, [0, 14], [1.2, 0]);
  return (
    <AbsoluteFill style={{ transform: `scale(${punch}) rotate(${roll}deg)` }}>
      {MOTIFS[index % MOTIFS.length](l)}
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash }} />
    </AbsoluteFill>
  );
};

export const Montage: React.FC = () => {
  const cuts = MONTAGE_FRAMES / BEAT;
  return (
    <AbsoluteFill>
      {Array.from({ length: cuts }).map((_, i) => (
        <Sequence key={i} from={i * BEAT} durationInFrames={BEAT} layout="none">
          <AbsoluteFill>
            <Cut index={i} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
