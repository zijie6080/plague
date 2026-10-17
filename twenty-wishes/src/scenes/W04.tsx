// 4. 愿你的评论区，都在吵“这是真的吗”。
// 纸对话气泡一个接一个快速弹起、层层叠叠，越来越多，挤满画面。
import React from "react";
import { BASE, FONTS, SCENE_TEXT } from "../config";
import { clamp, lerp, pop, wobble } from "../lib/anim";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P } from "./common";

const B = beatsOf("w04");
const T = SCENE_TEXT.w4Bubbles;

// [出现帧, cx, cy, 文字序号, 尾巴方向, 角度]
const BUBBLES: [number, number, number, number, -1 | 1, number][] = [
  [B.first, 520, 430, 0, -1, -4],
  [8, 1390, 390, 1, 1, 3],
  [13, 920, 560, 2, -1, 2],
  [17, 360, 690, 3, -1, -3],
  [21, 1520, 650, 4, 1, -2],
  [24, 1150, 820, 0, 1, 4],
  [27, 640, 850, 1, -1, -5],
  [30, 1660, 860, 3, 1, 3],
  [33, 300, 880, 2, -1, 2],
  [35, 1200, 330, 4, 1, -3],
  [37, 760, 330, 3, -1, 3],
  [40, 1480, 520, 0, 1, 5],
  [B.full, 420, 540, 1, -1, -2],
];
const COLORS = [P.cream, P.sakura, lighten(P.fogBlue, 0.25), lighten(P.sage, 0.3), P.lilac, lighten(P.apricot, 0.3), BASE.white];

const Bubble: React.FC<{ f: number; at: number; cx: number; cy: number; text: string; tail: -1 | 1; rot: number; i: number; size?: number; big?: boolean }> = ({
  f,
  at,
  cx,
  cy,
  text,
  tail,
  rot,
  i,
  size = 40,
  big,
}) => {
  if (f < at) return null;
  const s = pop(f, at, { damping: big ? 9 : 10, stiffness: big ? 200 : 280, mass: 0.6 });
  const n = Array.from(text).length;
  const w = n * size * 1.04 + (big ? 110 : 70);
  const h = size * (big ? 2.4 : 2.2);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const col = big ? P.vermilion : COLORS[i % COLORS.length];
  const tx = cx + tail * (w * 0.28);
  const tailPath = `M${tx - 22 * tail} ${y + h - 4} L${tx + 18 * tail} ${y + h + 38} L${tx + 26 * tail} ${y + h - 4} Z`;
  const bob = Math.sin(f * 0.25 + i * 1.7) * 2.5;
  const r = lerp(rot * 4, rot, clamp(s));
  return (
    <LiftContext.Provider value={clamp(s, 0, 1.2)}>
      <g transform={`translate(${cx} ${cy + bob}) rotate(${r.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`}>
        <Paper color={col} z={1.3 + i * 0.13} grad={0.1}>
          <rect x={x} y={y} width={w} height={h} rx={h / 2} />
          <path d={tailPath} />
        </Paper>
        <Paper color={big ? BASE.white : darken(P.ink, 0)} z={1.4 + i * 0.13} filter="fiber" grad={0}>
          <text x={cx} y={cy + size * 0.36} textAnchor="middle" fontFamily={`"${FONTS.wish}"`} fontWeight={500} fontSize={size} letterSpacing={2}>
            {text}
          </text>
        </Paper>
      </g>
    </LiftContext.Provider>
  );
};

export const W04: React.FC = () => {
  const { f } = useScene();
  const shake = wobble(f, B.last, 6, 2.2, 0.3);
  return (
    <>
      <Ground y={950} color={P.lilac} back={P.cream} at={-3} seed={4} order={0} amp={12} />
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", transform: `translateX(${shake}px)` }}>
        {BUBBLES.map(([at, cx, cy, ti, tail, rot], i) => (
          <Bubble key={i} f={f} at={at} cx={cx} cy={cy} text={T[ti]} tail={tail} rot={rot} i={i} />
        ))}
        <Bubble f={f} at={B.last} cx={960} cy={640} text={T[4]} tail={-1} rot={-2} i={BUBBLES.length} size={78} big />
      </svg>
    </>
  );
};
