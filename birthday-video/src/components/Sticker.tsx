import React from "react";
import { config } from "../config";

const ink = config.colors.ink;

// 胶囊字块 / 贴纸：粗描边 + 不模糊的硬投影
export const Capsule: React.FC<{
  w: number;
  h: number;
  color: string;
  lines: readonly string[];
  font: number;
  radius?: number;
  border?: number;
  shadow?: number;
  textColor?: string;
  style?: React.CSSProperties;
}> = ({ w, h, color, lines, font, radius, border = 3, shadow = 4, textColor = ink, style }) => (
  <div
    style={{
      position: "absolute",
      left: -w / 2,
      top: -h / 2,
      width: w,
      height: h,
      boxSizing: "border-box",
      borderRadius: radius ?? h / 2,
      background: color,
      border: `${border}px solid ${ink}`,
      boxShadow: `${shadow}px ${shadow}px 0 ${ink}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: config.fonts.title,
      fontSize: font,
      lineHeight: 1.08,
      color: textColor,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
  </div>
);

// 以中心点定位的容器
export const At: React.FC<{
  x: number;
  y: number;
  rot?: number; // 弧度
  scale?: number;
  opacity?: number;
  z?: number;
  children: React.ReactNode;
}> = ({ x, y, rot = 0, scale = 1, opacity = 1, z, children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      transform: `translate(${x}px, ${y}px) rotate(${rot}rad) scale(${scale})`,
      opacity,
      zIndex: z,
    }}
  >
    {children}
  </div>
);
