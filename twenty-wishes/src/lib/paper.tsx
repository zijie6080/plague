// 纸张质感核心：SVG 滤镜 + 纸层组件。
//
// 滤镜做法沿用 paper_sample.html：
//   低频 feTurbulence + feDisplacementMap  → 剪刀剪出来的毛边
//   高频 feTurbulence + feDiffuseLighting  → 纸张纤维，arithmetic 合成进颜色
// 正式版增强：
//   - 投影单独成层，偏移/模糊/浓度随“离纸面的高度” z 与弹起程度 lift 连续变化
//   - 每层纸带纵向渐变（上亮下暗）
//   - 光源统一在左上：纤维光照 azimuth=225°，投影向右下
import React, { createContext, useContext } from "react";
import { getInputProps } from "remotion";

// 调试开关（渲染脚本 --debug=nofilter,noshadow）
const DEBUG = String((getInputProps() as { debug?: string }).debug ?? "");
import { BASE } from "../config";

/* ---------------- 颜色工具 ---------------- */
const hex2rgb = (h: string) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const rgb2hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, t: number) => {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
export const lighten = (c: string, t: number) => mix(c, "#FFFFFF", t);
export const darken = (c: string, t: number) => mix(c, "#1A0E08", t);

/* ---------------- 光照 / 弹起上下文 ---------------- */
// lift：0 = 平躺在纸面上（无投影），1 = 完全立起
export const LiftContext = createContext(1);
// 全局投影强度（夜景里投影更深一些、更短一些）
export const ShadeContext = createContext({ alpha: 1, reach: 1 });

/** 光源在左上：投影方向固定为右下 */
export const SHADOW_DIR = { x: 0.62, y: 0.78 };

export const shadowFor = (z: number, lift = 1, reach = 1) => {
  const d = (3.5 + z * 7) * lift * reach;
  return {
    dx: d * SHADOW_DIR.x,
    dy: d * SHADOW_DIR.y,
    blur: (1.2 + z * 2.6) * (0.35 + 0.65 * lift),
    alpha: (0.42 - z * 0.03) * (0.25 + 0.75 * lift),
  };
};

/* ---------------- 全局滤镜定义 ---------------- */
// 渲染时 Chromium 使用 angle（GPU 路径），Skia 的噪声与光照滤镜在 GPU 上计算，
// 实时 feTurbulence 足够快，因此不需要预先栅格化噪声。

/** 纸片滤镜（与 paper_sample.html 相同的做法）：fine 用高频噪声 → 毛边更细；edgeScale 为毛边幅度 */
const LiveFilter: React.FC<{ id: string; edgeScale: number; fine?: boolean; region?: React.SVGProps<SVGFilterElement>; noEdge?: boolean }> = ({ id, edgeScale, fine, region, noEdge }) => (
  <filter id={id} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB" {...region}>
    {!noEdge && (
      <>
        <feTurbulence type="fractalNoise" baseFrequency={fine ? "0.05 0.07" : "0.018 0.03"} numOctaves={2} seed={fine ? 23 : 11} result="edge" />
        <feDisplacementMap in="SourceGraphic" in2="edge" scale={edgeScale} xChannelSelector="R" yChannelSelector="G" result="cut" />
      </>
    )}
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.55" numOctaves={3} seed={4} result="fiber" />
    <feDiffuseLighting in="fiber" surfaceScale={1.5} diffuseConstant={1.08} lightingColor="#ffffff" result="lit">
      <feDistantLight azimuth={225} elevation={58} />
    </feDiffuseLighting>
    <feComposite in={noEdge ? "SourceGraphic" : "cut"} in2="lit" operator="arithmetic" k1={0.6} k2={0.46} k3={0} k4={0} result="tex" />
    <feComposite in="tex" in2={noEdge ? "SourceGraphic" : "cut"} operator="in" />
  </filter>
);

const PaperFilter = LiveFilter;

export const PaperDefs: React.FC = () => {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        {/* 标准纸片：明显的剪刀毛边 + 纤维 */}
        <PaperFilter id="paper" edgeScale={7} />
        {/* 小件 / 细节：毛边更细 */}
        <PaperFilter id="paper-fine" edgeScale={3} fine region={{ x: "-10%", y: "-10%", width: "120%", height: "120%" }} />
        {/* 纸条 / 线：滤镜区域放大，避免细长形状被裁 */}
        <PaperFilter id="paper-line" edgeScale={3} fine region={{ filterUnits: "userSpaceOnUse", x: -400, y: -400, width: 2720, height: 1880 }} />
        {/* 只有纤维、不变形（文字、需要精确边缘的小件） */}
        <PaperFilter id="fiber" edgeScale={0} noEdge region={{ x: "-4%", y: "-4%", width: "108%", height: "108%" }} />
        {/* 镂空：在孔洞内侧画内阴影（光在左上 → 阴影落在孔的左上内沿） */}
        <filter id="cutout" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={41} result="edge" />
          <feDisplacementMap in="SourceGraphic" in2="edge" scale={2.5} xChannelSelector="R" yChannelSelector="G" result="cut" />
          <feFlood floodColor={BASE.shadow} floodOpacity={0.75} />
          <feComposite in2="cut" operator="out" />
          <feOffset dx={4} dy={5} />
          <feGaussianBlur stdDeviation={3} />
          <feComposite in2="cut" operator="in" result="inner" />
          <feMerge>
            <feMergeNode in="cut" />
            <feMergeNode in="inner" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

/* ---------------- 纸层组件 ---------------- */
export type PaperFilter = "paper" | "paper-fine" | "paper-line" | "fiber" | "none";

const gradId = (c: string, g: number) => `pg-${c.replace("#", "")}-${Math.round(g * 100)}`;

export interface PaperProps {
  color: string;
  z?: number; // 离纸面的高度（0~5），决定投影远近与虚实
  filter?: PaperFilter;
  grad?: number; // 纵向渐变强度（0 = 纯色）
  line?: number; // 设置后按“纸条”描边绘制，值为线宽
  opacity?: number;
  shadow?: boolean;
  transform?: string;
  children: React.ReactNode;
}

/** 一层纸：先画随高度变化的柔和投影，再画带渐变与纤维、毛边的纸面 */
export const Paper: React.FC<PaperProps> = ({
  color,
  z = 1,
  filter = "paper",
  grad = 0.1,
  line,
  opacity = 1,
  shadow = true,
  transform,
  children,
}) => {
  const lift = useContext(LiftContext);
  const shade = useContext(ShadeContext);
  const sh = shadowFor(z, lift, shade.reach);
  const id = gradId(color, grad);
  const fill = grad > 0 ? `url(#${id})` : color;
  const paint = line
    ? { fill: "none", stroke: fill, strokeWidth: line, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    : { fill };
  const shadowPaint = line
    ? { fill: "none", stroke: BASE.shadow, strokeWidth: line, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    : { fill: BASE.shadow };
  return (
    <g transform={transform} opacity={opacity}>
      {grad > 0 && (
        <defs>
          <linearGradient id={id} x1={0} x2={0} y1={0} y2={line ? 1080 : 1} gradientUnits={line ? "userSpaceOnUse" : "objectBoundingBox"}>
            <stop offset="0" stopColor={lighten(color, grad * 0.9)} />
            <stop offset="1" stopColor={darken(color, grad)} />
          </linearGradient>
        </defs>
      )}
      {shadow && sh.alpha > 0.005 && !DEBUG.includes("noshadow") && (
        <g
          transform={`translate(${sh.dx.toFixed(2)} ${sh.dy.toFixed(2)})`}
          opacity={Math.min(1, sh.alpha * shade.alpha)}
          style={{ filter: `blur(${sh.blur.toFixed(2)}px)` }}
          {...shadowPaint}
        >
          {children}
        </g>
      )}
      <g filter={filter === "none" || DEBUG.includes("nofilter") ? undefined : `url(#${filter})`} {...paint}>
        {children}
      </g>
    </g>
  );
};

/** 薄雾：层与层之间半透明的暖白雾带 */
export const Mist: React.FC<{ y: number; h: number; opacity?: number; color?: string; x?: number; w?: number }> = ({
  y,
  h,
  opacity = 0.5,
  color = BASE.paper,
  x = -100,
  w = 2120,
}) => {
  const id = `mist-${Math.round(y)}-${Math.round(h)}-${color.replace("#", "")}`;
  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.55" stopColor={color} stopOpacity={0.85} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
    </g>
  );
};
