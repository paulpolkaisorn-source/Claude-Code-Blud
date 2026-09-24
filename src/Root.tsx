import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";
import { Video } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AmdRyzenRadeon"
      component={Video}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
