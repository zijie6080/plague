// 立体书舞台：PopUp（以底边为轴弹起）、Card3D（任意轴）、Board（纸台底）
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { clamp, ease, lerp, pop, prog } from "./anim";
import { LiftContext, ShadeContext } from "./paper";

export const W = 1920;
export const H = 1080;

/** 场景上下文：本地帧（相对动作开始），以及“依次倒下”转场的开始帧 */
export interface SceneCtx {
  f: number;
  foldOut: number | null;
  night: boolean;
}
export const SceneContext = createContext<SceneCtx>({ f: 0, foldOut: null, night: false });
export const useScene = () => useContext(SceneContext);

/** 舞台：提供透视，镜头略高于纸面向下看 */
export const Stage: React.FC<{ children: React.ReactNode; perspective?: number; originY?: number }> = ({
  children,
  perspective = 2300,
  originY = 300,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: W,
      height: H,
      perspective,
      perspectiveOrigin: `${W / 2}px ${originY}px`,
    }}
  >
    {children}
  </div>
);

export const FLAT_ANGLE = 88;

/** 计算一张弹起纸片当前的倾角：弹起 spring + 可选的“依次倒下” */
export const popAngle = (
  f: number,
  at: number,
  foldOut: number | null,
  order: number,
  cfg?: { damping?: number; stiffness?: number; mass?: number },
) => {
  const s = pop(f, at, cfg);
  let a = FLAT_ANGLE * (1 - s);
  if (foldOut !== null) {
    const t0 = foldOut + order * 1.6;
    const p = prog(f, t0, t0 + 9);
    a = lerp(a, 90, ease.in(p));
  }
  return a;
};

export interface PopUpProps {
  /** 纸片包围盒（场景坐标），底边即转轴 */
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  order?: number;
  spring?: { damping?: number; stiffness?: number; mass?: number };
  /** 额外的 2D 变换（立起之后的位移/晃动），作用于整张纸片 */
  extra?: string;
  /** 转轴相对位置，默认底边中点 */
  origin?: string;
  opacity?: number;
  children: React.ReactNode;
}

/** 立体书弹起：纸片以底边为轴，从平躺（rotateX≈88°）立起到 0°，带轻微回弹 */
export const PopUp: React.FC<PopUpProps> = ({ x, y, w, h, at, order = 0, spring, extra = "", origin, opacity = 1, children }) => {
  const { f, foldOut } = useScene();
  const angle = popAngle(f, at, foldOut, order, spring);
  if (angle >= 89.6) return null;
  const lift = clamp(1 - angle / FLAT_ANGLE, 0, 1.15);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: origin ?? "50% 100%",
        transform: `${extra} rotateX(${angle.toFixed(3)}deg)`,
        opacity,
      }}
    >
      <LiftContext.Provider value={lift}>
        <svg
          width={w}
          height={h}
          viewBox={`${x} ${y} ${w} ${h}`}
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        >
          {children}
        </svg>
      </LiftContext.Provider>
    </div>
  );
};

/** 任意 3D 变换的纸卡（翻牌、合页等），内容仍用场景坐标 */
export const Card3D: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  transform: string;
  origin?: string;
  lift?: number;
  backface?: boolean;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, transform, origin = "50% 50%", lift = 1, backface = true, opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transformOrigin: origin,
      transform,
      backfaceVisibility: backface ? "visible" : "hidden",
      opacity,
    }}
  >
    <LiftContext.Provider value={lift}>
      <svg width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {children}
      </svg>
    </LiftContext.Provider>
  </div>
);

/** 平铺在纸面上的 SVG 层（不弹起），可被“依次倒下”转场带走 */
export const Flat: React.FC<{ children: React.ReactNode; order?: number; style?: React.CSSProperties }> = ({ children, order = 0, style }) => {
  const { f, foldOut } = useScene();
  let o = 1;
  if (foldOut !== null) o = 1 - prog(f, foldOut + order * 1.6, foldOut + order * 1.6 + 8);
  if (o <= 0) return null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o, ...style }}>
      {children}
    </svg>
  );
};

/** 纸台底：暖白纸（或深蓝卡纸），全程带纸纤维 */
export const Board: React.FC<{ night?: boolean; edge?: boolean }> = ({ night, edge }) => (
  <AbsoluteFill style={{ boxShadow: edge ? "0 24px 60px rgba(42,26,18,0.35), 0 4px 10px rgba(42,26,18,0.25)" : undefined }}>
    <Img src={staticFile(night ? "tex/paper_night.png" : "tex/paper_warm.png")} style={{ width: W, height: H, display: "block" }} />
  </AbsoluteFill>
);

/** 夜景投影：更短、略浓 */
export const NightShade: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ShadeContext.Provider value={{ alpha: 1.35, reach: 0.8 }}>{children}</ShadeContext.Provider>
);

/** 带裁切的子舞台：内部纸片仍使用场景坐标，但只在 (x,y,w,h) 区域内可见 */
export const ClipStage: React.FC<{ x: number; y: number; w: number; h: number; radius?: number; children: React.ReactNode; perspective?: number; originY?: number }> = ({
  x,
  y,
  w,
  h,
  radius = 0,
  children,
  perspective = 2300,
  originY = 300,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", borderRadius: radius }}>
    <div
      style={{
        position: "absolute",
        left: -x,
        top: -y,
        width: W,
        height: H,
        perspective,
        perspectiveOrigin: `${W / 2}px ${originY}px`,
      }}
    >
      {children}
    </div>
  </div>
);

/** 双面纸卡：用 flip（度）表示翻转角。只画一面，过了 90° 换成背面并把角度折回 (-90°,0°]，
 *  这样任何时候都没有镜像变换——镜像（rotateY(180°)、scaleX(-1)、SVG 负缩放）会让 Chromium
 *  的光照滤镜失效、纸面发黑。pre 为翻转之前的其它变换（例如弹起的 rotateX）。 */
export const FlipCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  flip: number;
  pre?: string;
  axis?: "Y" | "X";
  origin?: string;
  front: React.ReactNode;
  back: React.ReactNode;
  lift?: number;
  opacity?: number;
}> = ({ x, y, w, h, flip, pre = "", axis = "Y", origin = "50% 50%", front, back, lift = 1, opacity = 1 }) => {
  const t = ((flip % 360) + 360) % 360;
  const showFront = t <= 90 || t >= 270;
  const ang = showFront ? (t <= 90 ? t : t - 360) : t - 180;
  const shade = Math.abs(Math.sin((ang * Math.PI) / 180)) * 0.28;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transformOrigin: origin, transform: `${pre} rotate${axis}(${ang.toFixed(3)}deg)`, opacity }}>
      <LiftContext.Provider value={lift}>
        <svg width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {showFront ? front : back}
          {shade > 0.01 && <rect x={x} y={y} width={w} height={h} fill={`rgba(40,22,12,${shade.toFixed(3)})`} style={{ mixBlendMode: "multiply" }} rx={12} />}
        </svg>
      </LiftContext.Provider>
    </div>
  );
};

/** 非弹起元素在“依次倒下”转场里的退场：返回 0..1 的不透明度 */
export const useExit = (order = 0) => {
  const { f, foldOut } = useScene();
  if (foldOut === null) return 1;
  const t0 = foldOut + order * 1.6;
  return 1 - prog(f, t0, t0 + 8);
};
