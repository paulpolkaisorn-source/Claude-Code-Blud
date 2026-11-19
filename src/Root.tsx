import React from "react";
import { Composition } from "remotion";
import { Teaser } from "./Teaser";
import { FPS, TOTAL_FRAMES } from "./timing";

// Both compositions share every scene; layouts reframe from the frame size.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Teaser" component={Teaser} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="TeaserVertical" component={Teaser} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
  </>
);
