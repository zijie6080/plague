// 合成器：按 timeline 决定每一帧画哪些场景、用哪种转场，再叠加光尘、暖光、文字与印章。
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { WISHES } from "./config";
import { loadFonts } from "./lib/fonts";
import { DustCanvas } from "./lib/canvas";
import { WarmLight } from "./lib/overlays";
import { PaperDefs } from "./lib/paper";
import { Stamp, WishText } from "./lib/text";
import { CoverSheet, PageFlip, PanBoards } from "./lib/transitions";
import { SceneView } from "./scenes/registry";
import { SCENES, SceneTiming, TEXT_IN_DELAY, TEXT_OUT_LEAD } from "./timeline";

loadFonts();

const sceneAt = (frame: number) => {
  const i = SCENES.findIndex((s) => frame >= s.start && frame < s.end);
  return i < 0 ? SCENES.length - 1 : i;
};

const local = (s: SceneTiming, frame: number) => frame - s.action;

/** 每个场景的光尘强度 */
const DUST: Record<string, number> = { prologue: 0.9, w15: 0.5, w19: 0.8, finale: 0 };

const Composite: React.FC<{ frame: number }> = ({ frame }) => {
  const i = sceneAt(frame);
  const cur = SCENES[i];
  const prev = i > 0 ? SCENES[i - 1] : null;
  const tf = frame - cur.start;
  const k = cur.tIn.kind;
  const inTrans = prev && tf < cur.tIn.dur && (k === "flip" || k === "fold" || k === "pan" || k === "cover");
  const curNode = <SceneView id={cur.id} f={local(cur, frame)} />;
  if (!inTrans || !prev) return curNode;
  const p = tf / cur.tIn.dur;
  const prevF = local(prev, frame);
  if (k === "fold") {
    // 当前场景的纸片依次倒下，下一个场景的纸片依次弹起（同一张纸台）
    return (
      <AbsoluteFill>
        <SceneView id={cur.id} f={local(cur, frame)} contentOnly={false} />
        <SceneView id={prev.id} f={prevF} foldOut={prev.dur - prev.tIn.dur} contentOnly />
      </AbsoluteFill>
    );
  }
  const prevNode = <SceneView id={prev.id} f={prevF} />;
  if (k === "flip") return <PageFlip p={p} front={prevNode} under={curNode} />;
  if (k === "pan") return <PanBoards p={p} from={prevNode} to={curNode} />;
  return <CoverSheet p={p} from={prevNode} to={curNode} seed={i} label={cur.no ? String(cur.no).padStart(2, "0") : undefined} />;
};

const Texts: React.FC<{ frame: number }> = ({ frame }) => {
  const s = SCENES[sceneAt(frame)];
  if (s.no === null || s.no > WISHES.length) return null;
  const start = s.action + TEXT_IN_DELAY;
  const outAt = s.end - TEXT_OUT_LEAD;
  const slow = s.no >= 15 ? 1.7 : s.no >= 9 ? 1.3 : 1;
  return (
    <>
      <WishText text={WISHES[s.no - 1]} f={frame} start={start} outAt={outAt} night={s.night} slow={slow} />
      <Stamp n={s.no} f={frame} at={s.action + 2} outAt={outAt} night={s.night} />
    </>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const s = SCENES[sceneAt(frame)];
  const dust = DUST[s.id] ?? 0.55;
  return (
    <AbsoluteFill style={{ background: "#D9C9B0", overflow: "hidden" }}>
      <PaperDefs />
      <Img src={staticFile("tex/table.png")} style={{ position: "absolute", width: 1920, height: 1080, opacity: 0 }} />
      <Composite frame={frame} />
      {dust > 0 && <DustCanvas f={frame} intensity={dust * (s.night ? 0.6 : 1)} seed={3} />}
      <Texts frame={frame} />
      {s.id === "finale" ? <FinaleLight frame={frame} /> : <WarmLight night={s.night} />}
    </AbsoluteFill>
  );
};

/** 第二十页：合书时从夜景光过渡到白天的暖光 */
const FinaleLight: React.FC<{ frame: number }> = ({ frame }) => {
  const fin = SCENES[SCENES.length - 1];
  const t = Math.min(1, Math.max(0, (frame - fin.action - fin.beats.close) / 30));
  return (
    <>
      {t < 1 && <WarmLight night strength={1 - t} />}
      {t > 0 && <WarmLight strength={t} />}
    </>
  );
};

/** 调试用：渲染单个场景（不经过转场合成），test 为场景 id */
export const SceneStill: React.FC<{ test: string }> = ({ test }) => {
  const frame = useCurrentFrame();
  const s = SCENES.find((x) => x.id === test) ?? SCENES[0];
  return (
    <AbsoluteFill style={{ background: "#D9C9B0" }}>
      <PaperDefs />
      <SceneView id={s.id} f={frame - s.action} />
      <WarmLight night={s.night} />
    </AbsoluteFill>
  );
};
