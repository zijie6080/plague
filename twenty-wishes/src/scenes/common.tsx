// 场景通用纸件：前景地面、背板、云、星星等
import React from "react";
import { PALETTE } from "../config";
import { Paper, lighten } from "../lib/paper";
import { fbm1 } from "../lib/rand";
import { PopUp } from "../lib/stage";

/** 波浪形顶边的路径 */
export const wavyTop = (x0: number, x1: number, y: number, amp: number, seed: number, bottom = 1150, freq = 0.004) => {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 16) {
    const yy = y + fbm1(x * freq, seed) * amp + fbm1(x * freq * 6, seed + 3) * amp * 0.12;
    pts.push(`${pts.length ? "L" : "M"}${x} ${yy.toFixed(1)}`);
  }
  return `${pts.join(" ")} L${x1} ${bottom} L${x0} ${bottom} Z`;
};

/** 前景地面：盖住弹起纸片的转轴。back 为后面一层更浅的地面，叠出层次 */
export const Ground: React.FC<{ y: number; color: string; at: number; amp?: number; seed?: number; z?: number; order?: number; freq?: number; back?: string | null }> = ({
  y,
  color,
  at,
  amp = 26,
  seed = 1,
  z = 3,
  order = 0,
  freq,
  back,
}) => {
  const b = back === undefined ? lighten(color, 0.32) : back;
  return (
    <>
      {b && (
        <PopUp x={-80} y={y - 40 - amp * 1.3} w={2080} h={1150 - (y - 40 - amp * 1.3)} at={at - 1} order={order + 1}>
          <Paper color={b} z={z - 1}>
            <path d={wavyTop(-80, 2000, y - 36, amp * 0.8, seed + 17, 1150, (freq ?? 0.004) * 1.4)} />
          </Paper>
        </PopUp>
      )}
      <PopUp x={-80} y={y - amp * 1.3} w={2080} h={1150 - (y - amp * 1.3)} at={at} order={order}>
        <Paper color={color} z={z}>
          <path d={wavyTop(-80, 2000, y, amp, seed, 1150, freq)} />
        </Paper>
      </PopUp>
    </>
  );
};

/** 圆角背板 */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; color: string; at: number; r?: number; z?: number; order?: number; arch?: boolean }> = ({
  x,
  y,
  w,
  h,
  color,
  at,
  r = 36,
  z = 0.6,
  order = 6,
  arch,
}) => (
  <PopUp x={x} y={y} w={w} h={h} at={at} order={order}>
    <Paper color={color} z={z} grad={0.07}>
      {arch ? (
        <path d={`M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`} />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={r} />
      )}
    </Paper>
  </PopUp>
);

/** 云朵剪纸 */
export const cloudPath = (cx: number, cy: number, s: number) =>
  `M${cx - 90 * s} ${cy + 20 * s} C${cx - 110 * s} ${cy - 10 * s} ${cx - 70 * s} ${cy - 34 * s} ${cx - 44 * s} ${cy - 22 * s} C${cx - 36 * s} ${cy - 58 * s} ${cx + 18 * s} ${cy - 64 * s} ${cx + 32 * s} ${cy - 30 * s} C${cx + 60 * s} ${cy - 46 * s} ${cx + 104 * s} ${cy - 20 * s} ${cx + 92 * s} ${cy + 20 * s} Z`;

/** 五角星 */
export const starPath = (cx: number, cy: number, R: number, r = R * 0.45, rot = -90) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

/** 勾 */
export const checkPath = (cx: number, cy: number, s: number) =>
  `M${cx - 70 * s} ${cy - 4 * s} L${cx - 38 * s} ${cy - 34 * s} L${cx - 8 * s} ${cy - 6 * s} L${cx + 64 * s} ${cy - 82 * s} L${cx + 96 * s} ${cy - 50 * s} L${cx - 8 * s} ${cy + 56 * s} Z`;

export const P = PALETTE;
