// 场景注册表 + 场景视图（纸台底 + 透视舞台 + 场景内容）
import React from "react";
import { AbsoluteFill } from "remotion";
import { Board, NightShade, SceneContext, Stage } from "../lib/stage";
import { sceneById } from "../timeline";
import { W06 } from "./W06";
import { W15 } from "./W15";
import { Prologue } from "./Prologue";
import { Finale } from "./Finale";

const Placeholder: React.FC = () => null;

export const COMPONENTS: Record<string, React.FC> = {
  prologue: Prologue,
  w06: W06,
  w15: W15,
  finale: Finale,
};

/** 自己画纸台/镜头的场景（序、第二十页） */
const OWN_BOARD = new Set(["prologue", "finale"]);

export const SceneView: React.FC<{ id: string; f: number; foldOut?: number | null; contentOnly?: boolean }> = ({
  id,
  f,
  foldOut = null,
  contentOnly = false,
}) => {
  const spec = sceneById(id);
  const C = COMPONENTS[id] ?? Placeholder;
  const night = !!spec.night;
  const content = (
    <SceneContext.Provider value={{ f, foldOut, night }}>
      <Stage>{night ? <NightShade><C /></NightShade> : <C />}</Stage>
    </SceneContext.Provider>
  );
  return (
    <AbsoluteFill>
      {!contentOnly && !OWN_BOARD.has(id) && <Board night={night} />}
      {content}
    </AbsoluteFill>
  );
};
