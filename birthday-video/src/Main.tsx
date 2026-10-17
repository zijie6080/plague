import React, { useEffect, useState } from "react";
import { AbsoluteFill, Html5Audio, continueRender, delayRender, staticFile, useCurrentFrame, getStaticFiles } from "remotion";
import { config } from "./config";
import { scenes, s4, s6 } from "./timeline";
import { S0Intro } from "./scenes/S0Intro";
import { Blocks, S1Texts, S2Layer, Stickers, S3Texts } from "./scenes/Mid";
import { S4Cake } from "./scenes/S4Cake";
import { Fireworks } from "./components/Fireworks";
import { S6Ending } from "./scenes/S6Ending";

const FONTS: [string, string][] = [
  [config.fonts.title, "fonts/SmileySans.woff2"],
  [config.fonts.body, "fonts/WenKai.woff2"],
  [config.fonts.card, "fonts/NotoSerifSC-Bold.woff2"],
];

function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      FONTS.map(async ([family, file]) => {
        const face = new FontFace(family, `url(${staticFile(file)})`);
        await face.load();
        document.fonts.add(face);
      }),
    )
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error("font load failed", e);
        continueRender(handle);
      });
  }, [handle]);
}

export const Main: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  useFonts();
  const frame = useCurrentFrame();
  const dark = frame >= s4.switchOff && frame < s6.lightsOn;
  const audio = getStaticFiles().some((f) => f.name === "audio/score.wav");
  return (
    <AbsoluteFill style={{ background: dark ? config.colors.night : config.colors.cream, overflow: "hidden" }}>
      {!dark && (
        <AbsoluteFill
          style={{
            backgroundImage: `url(${staticFile("grain.png")})`,
            backgroundSize: `${config.width}px ${config.height}px`,
            opacity: 0.55,
            mixBlendMode: "multiply",
          }}
        />
      )}
      {frame < scenes.s1.from + 10 && <S0Intro frame={frame} />}
      {frame >= scenes.s1.from && frame < scenes.s4.from + 2 && (
        <>
          <S1Texts frame={frame} />
          <Blocks frame={frame} />
          <S2Layer frame={frame} />
          <S3Texts frame={frame} />
        </>
      )}
      <Stickers frame={frame} />
      <S4Cake frame={frame} />
      {frame >= scenes.s5.from && frame < s6.lightsOn + 2 && <Fireworks frame={frame} />}
      <S6Ending frame={frame} />
      {withAudio && audio && <Html5Audio src={staticFile("audio/score.wav")} />}
    </AbsoluteFill>
  );
};
