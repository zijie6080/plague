import React from "react";
import { config } from "../config";
import { pop, popOut } from "../lib/anim";

// 一行字逐字弹出（每个字带回弹和小跳），到 out 帧整体弹走
export const PopText: React.FC<{
  text: string;
  start: number;
  frame: number;
  y: number;
  out?: number;
  size?: number;
  font?: string;
  color?: string;
  step?: number; // 每字间隔帧
  weight?: number;
  slow?: boolean; // 慢慢出现（不弹）
  stroke?: string;
}> = ({ text, start, frame, y, out = 1e9, size = 62, font = config.fonts.body, color = config.colors.ink, step = 1.6, slow, stroke }) => {
  const chars = [...text];
  const o = popOut(frame, out, 10);
  if (frame < start || o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: y - size * 0.7,
        textAlign: "center",
        fontFamily: font,
        fontSize: size,
        color,
        whiteSpace: "nowrap",
        transform: `scale(${o})`,
        WebkitTextStroke: stroke,
      }}
    >
      {chars.map((c, i) => {
        const f0 = start + i * step;
        let sc: number;
        let dy: number;
        let op = 1;
        if (slow) {
          const t = Math.min(1, Math.max(0, (frame - f0) / 14));
          sc = 1;
          dy = (1 - t) * 14;
          op = t * t * (3 - 2 * t);
        } else {
          const p = pop(frame, f0, 1.15);
          sc = p;
          dy = (1 - Math.min(p, 1)) * 34;
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${dy}px) scale(${sc})`,
              opacity: op,
              minWidth: c === " " ? size * 0.3 : undefined,
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
};
