import React from "react";
import { Composition } from "remotion";
import { Texture, TexKind } from "./Textures";
import { Video, SceneStill } from "./Video";
import { FPS, TOTAL_FRAMES } from "./timeline";

const TEX: TexKind[] = ["warm", "night", "nightLit", "table", "sheet"];

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TwentyWishes" component={Video} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition
      id="SceneStill"
      component={SceneStill}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{ test: "paper" }}
    />
    {TEX.map((k) => (
      <Composition key={k} id={`tex-${k}`} component={Texture} width={1920} height={1080} fps={FPS} durationInFrames={1} defaultProps={{ kind: k }} />
    ))}
  </>
);
