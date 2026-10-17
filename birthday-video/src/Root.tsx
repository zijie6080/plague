import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { config } from "./config";
import { DURATION } from "./timeline";

export const Root: React.FC = () => (
  <Composition
    id="YanshouTongguo"
    component={Main}
    durationInFrames={DURATION}
    fps={config.fps}
    width={config.width}
    height={config.height}
    defaultProps={{ withAudio: true }}
  />
);
