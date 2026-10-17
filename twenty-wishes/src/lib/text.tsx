// 文字：愿望逐字淡入（每个字轻微上浮）+ 朱红纸印章编号
import React from "react";
import { FONTS, TEXT, stampLabel } from "../config";
import { ease, pop, prog } from "./anim";
import { Paper, lighten } from "./paper";
import { hash } from "./rand";

/** 逐字淡入的一行字。f 为全片帧，start/end 为淡入开始与淡出结束 */
export const LineText: React.FC<{
  text: string;
  f: number;
  start: number;
  outAt?: number; // 淡出开始
  outDur?: number;
  step?: number; // 每字间隔（帧）
  charDur?: number;
  size?: number;
  y: number;
  color?: string;
  family?: string;
  weight?: number;
  spacing?: number;
  rise?: number;
}> = ({ text, f, start, outAt, outDur = 8, step = 1.1, charDur = 10, size = 52, y, color = TEXT.ink, family = FONTS.wish, weight = 500, spacing = 0.12, rise = 14 }) => {
  const out = outAt === undefined ? 1 : 1 - prog(f, outAt, outAt + outDur);
  if (f < start || out <= 0) return null;
  const chars = Array.from(text);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1920,
        top: y - size * 0.72,
        textAlign: "center",
        fontFamily: `"${family}"`,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.4,
        letterSpacing: `${spacing}em`,
        color,
        opacity: out,
        whiteSpace: "pre",
        textShadow: color === TEXT.ink ? "0 1px 0 rgba(255,250,240,0.55)" : "0 0 18px rgba(255,200,140,0.18)",
      }}
    >
      {chars.map((c, i) => {
        const t = prog(f, start + i * step, start + i * step + charDur);
        const e = ease.out(t);
        return (
          <span key={i} style={{ display: "inline-block", opacity: e, transform: `translateY(${((1 - e) * rise).toFixed(2)}px)` }}>
            {c === " " ? " " : c}
          </span>
        );
      })}
    </div>
  );
};

/** 愿望文字：画面上方约 12%，居中，52px，墨褐，字距略宽 */
export const WishText: React.FC<{ text: string; f: number; start: number; outAt: number; night?: boolean; slow?: number }> = ({
  text,
  f,
  start,
  outAt,
  night,
  slow = 1,
}) => (
  <LineText
    text={text}
    f={f}
    start={start}
    outAt={outAt}
    y={1080 * 0.12}
    size={Math.min(52, Math.floor(1380 / (Array.from(text).length * 1.12)))}
    step={1.05 * slow}
    charDur={9 + 3 * slow}
    color={night ? TEXT.onNight : TEXT.ink}
  />
);

/** 朱红纸印章：右上角「06 / 20」 */
export const Stamp: React.FC<{ n: number; f: number; at: number; outAt: number; night?: boolean }> = ({ n, f, at, outAt, night }) => {
  if (f < at) return null;
  const s = pop(f, at, { damping: 13, stiffness: 260, mass: 0.6 });
  const out = 1 - prog(f, outAt, outAt + 8);
  if (out <= 0) return null;
  const scale = 1.45 - 0.45 * s;
  const rot = (hash("stamp", n) - 0.5) * 7;
  const w = 168;
  const h = 70;
  const label = stampLabel(n);
  return (
    <svg
      width={w + 40}
      height={h + 40}
      viewBox={`-20 -20 ${w + 40} ${h + 40}`}
      style={{
        position: "absolute",
        right: 56,
        top: 52,
        overflow: "visible",
        opacity: Math.min(1, s * 1.6) * out,
        transform: `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <Paper color={TEXT.stamp} z={night ? 0.6 : 1} grad={0.12} filter="paper-fine">
        <rect x={0} y={0} width={w} height={h} rx={9} />
      </Paper>
      <rect x={7} y={7} width={w - 14} height={h - 14} rx={6} fill="none" stroke={lighten(TEXT.stamp, 0.55)} strokeWidth={2} opacity={0.75} filter="url(#paper-fine)" />
      <text
        x={w / 2}
        y={h / 2 + 12}
        textAnchor="middle"
        fontFamily={`"${FONTS.serif}"`}
        fontWeight={900}
        fontSize={33}
        letterSpacing={1}
        fill={TEXT.stampText}
        filter="url(#fiber)"
      >
        {label}
      </text>
    </svg>
  );
};

/** 剪纸文字（SVG 内使用）：带投影、毛边很细 */
export const CutText: React.FC<{
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
  z?: number;
  family?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}> = ({ x, y, text, size, color, z = 1, family = FONTS.serif, weight = 900, anchor = "middle", spacing = 0 }) => (
  <Paper color={color} z={z} filter="paper-fine" grad={0.08}>
    <text x={x} y={y} fontSize={size} fontFamily={`"${family}"`} fontWeight={weight} textAnchor={anchor} letterSpacing={spacing}>
      {text}
    </text>
  </Paper>
);
