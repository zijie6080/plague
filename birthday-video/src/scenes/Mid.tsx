// S1 字雨 · S2 我猜你的样子 · S3 但我知道你是什么样的人
import React from "react";
import { config } from "../config";
import { s1, s2, s3, s4, FPS } from "../timeline";
import { blocks, stickerLayout } from "../lib/layout";
import { blockState, blockColors } from "../lib/blockState";
import { Capsule, At } from "../components/Sticker";
import { PopText } from "../components/PopText";
import { ReviewCard } from "../components/ReviewCard";
import { Head, FlyingHat, WildExtras } from "../components/Props";
import { pop } from "../lib/anim";


export const Blocks: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {blocks.map((b) => {
      const st = blockState(b.id, frame);
      if (!st.visible || st.s <= 0.01) return null;
      return (
        <At key={b.id} x={st.x} y={st.y} rot={st.a} scale={st.s} z={st.z ?? 10}>
          <Capsule w={b.w} h={b.h} color={blockColors[b.id]} lines={b.lines} font={b.font} />
        </At>
      );
    })}
    <Head frame={frame} />
  </>
);

export const S1Texts: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < s1.title || frame > s1.titleOut + 12) return null;
  return (
    <>
      <PopText text={config.s1Title} start={s1.title} frame={frame} y={215} out={s1.titleOut} size={64} font={config.fonts.title} step={1.2} />
      <PopText text={config.s1Subtitle} start={s1.subtitle} frame={frame} y={318} out={s1.titleOut} size={44} step={1.4} color="#6b6472" />
    </>
  );
};

export const S2Layer: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < s2.rounds[0].assemble - 2 || frame > s2.afterOut + 12) return null;
  return (
    <>
      <WildExtras frame={frame} />
      <FlyingHat frame={frame} />
      {s2.rounds.map((r, i) => {
        const g = config.guesses[i];
        return (
          <React.Fragment key={i}>
            <PopText text={g.line} start={r.line} frame={frame} y={205} out={r.lineOut} size={70} step={2} />
            <ReviewCard
              frame={frame}
              no={g.no}
              verdict={g.verdict}
              opinion={g.opinion}
              inAt={r.cardIn}
              stampAt={r.stamp}
              opinionAt={r.opinion}
              outAt={r.cardOut}
              x={760}
              y={1340}
              rot={[3, -2.5, 4][i]}
              seed={11 + i * 5}
              stampRot={[-7, 6, -8][i]}
            />
          </React.Fragment>
        );
      })}
      <PopText text={config.s2After[0]} start={s2.after1} frame={frame} y={560} out={s2.afterOut} size={58} step={3} slow />
      <PopText text={config.s2After[1]} start={s2.after2} frame={frame} y={680} out={s2.afterOut} size={58} step={2} />
    </>
  );
};

// S3 贴纸，S4 关灯时掉下去
export const Stickers: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < s3.stickers[0] - 1 || frame > s4.switchOff + 40) return null;
  return (
    <>
      {stickerLayout.map((st, i) => {
        const at = s3.stickers[i];
        if (frame < at) return null;
        const p = pop(frame, at, 1.25);
        const slapScale = 1.45 - 0.45 * p;
        const rot = st.rot + (1 - p) * 14 * (i % 2 ? -1 : 1);
        // 一起弹一下
        const tb = frame - s3.bounce;
        const bounce = tb >= 0 && tb < 24 ? Math.sin(tb / 2.2) * Math.exp(-tb / 7) * 0.12 : 0;
        // 关灯：掉下去
        const tf = (frame - s4.switchOff - i * 2) / FPS;
        const fall = tf > 0 ? 2600 * tf * tf : 0;
        const fallRot = tf > 0 ? tf * (i % 2 ? 60 : -60) : 0;
        return (
          <At key={i} x={st.x} y={st.y + fall - bounce * 80} rot={((rot + fallRot) * Math.PI) / 180} scale={slapScale * (1 + bounce)} z={30}>
            <Capsule w={st.w} h={st.h} color={st.color} lines={[st.text]} font={st.font} radius={28} border={4} shadow={7} />
            {/* 贴纸高光 */}
            <div style={{ position: "absolute", left: -st.w / 2 + 18, top: -st.h / 2 + 10, width: 60, height: 14, borderRadius: 8, background: "rgba(255,255,255,0.6)", transform: "rotate(-8deg)" }} />
          </At>
        );
      })}
    </>
  );
};

export const S3Texts: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < s3.intro || frame > s4.switchOff + 12) return null;
  return (
    <>
      <PopText text={config.s3Intro} start={s3.intro} frame={frame} y={250} out={s3.introOut} size={66} step={2} />
      <PopText text={config.s3Outro} start={s3.outro} frame={frame} y={250} out={s4.switchOff} size={70} step={2.5} />
    </>
  );
};
