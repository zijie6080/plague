// 场景注册表 + 场景视图（纸台底 + 透视舞台 + 场景内容）
import React from "react";
import { AbsoluteFill } from "remotion";
import { Board, NightShade, SceneContext, Stage } from "../lib/stage";
import { sceneById } from "../timeline";
import { W01 } from "./W01";
import { W02 } from "./W02";
import { W03 } from "./W03";
import { W04 } from "./W04";
import { W05 } from "./W05";
import { W06 } from "./W06";
import { W07 } from "./W07";
import { W08 } from "./W08";
import { W09 } from "./W09";
import { W10 } from "./W10";
import { W11 } from "./W11";
import { W12 } from "./W12";
import { W13, W14 } from "./W13";
import { W15 } from "./W15";
import { W16 } from "./W16";
import { W17 } from "./W17";
import { W18 } from "./W18";
import { W19 } from "./W19";
import { Prologue } from "./Prologue";
import { Finale } from "./Finale";

export const COMPONENTS: Record<string, React.FC> = {
  prologue: Prologue,
  w01: W01,
  w02: W02,
  w03: W03,
  w04: W04,
  w05: W05,
  w06: W06,
  w07: W07,
  w08: W08,
  w09: W09,
  w10: W10,
  w11: W11,
  w12: W12,
  w13: W13,
  w14: W14,
  w15: W15,
  w16: W16,
  w17: W17,
  w18: W18,
  w19: W19,
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
  const C = COMPONENTS[id];
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
