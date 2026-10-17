// 纸人：全片同一个角色（子杰）。圆头、简单的身体剪影、没有五官，
// 侧分的短发 + 朱红围巾是他的识别特征。所有姿势都由同一套关节参数驱动。
import React from "react";
import { PALETTE } from "../config";
import { Paper, darken } from "./paper";

export interface Pose {
  armF: [number, number]; // 近侧手臂：肩角、肘角（度，0 = 垂直向下，正 = 向前）
  armB: [number, number]; // 远侧手臂
  legF: [number, number]; // 近侧腿：髋角、膝角（膝角正 = 小腿向后弯）
  legB: [number, number];
  lean?: number; // 上身前倾（度）
  nod?: number; // 低头（度）
}

export const POSE = {
  stand: { armF: [6, 8], armB: [-6, 8], legF: [3, 0], legB: [-3, 0] } as Pose,
  sit: { armF: [30, 50], armB: [24, 50], legF: [88, 88], legB: [82, 84] } as Pose,
  armsUp: { armF: [168, 6], armB: [160, 6], legF: [4, 0], legB: [-4, 0] } as Pose,
};

/** 走路循环 */
export const walkPose = (phase: number, amp = 1): Pose => {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return {
    armF: [-22 * s * amp, 14 + 6 * Math.max(0, s)],
    armB: [22 * s * amp, 14 + 6 * Math.max(0, -s)],
    legF: [24 * s * amp, Math.max(0, -c) * 28 * amp],
    legB: [-24 * s * amp, Math.max(0, c) * 28 * amp],
    lean: 4 * amp,
  };
};

export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const l = (x: number, y: number) => x + (y - x) * t;
  const p2 = (x: [number, number], y: [number, number]): [number, number] => [l(x[0], y[0]), l(x[1], y[1])];
  return {
    armF: p2(a.armF, b.armF),
    armB: p2(a.armB, b.armB),
    legF: p2(a.legF, b.legF),
    legB: p2(a.legB, b.legB),
    lean: l(a.lean ?? 0, b.lean ?? 0),
    nod: l(a.nod ?? 0, b.nod ?? 0),
  };
};

// 骨架尺寸（以髋部为原点，y 向下）
const SH_Y = -78; // 肩
const HEAD_Y = -118;
const HEAD_R = 30;
const UPPER = 38;
const FORE = 36;
const THIGH = 44;
const SHIN = 44;

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number) => ({ x: Math.sin(rad(deg)), y: Math.cos(rad(deg)) });

/** 胶囊形（两段肢体）——全部同向绕行，便于在一个 path 里取并集 */
const capsule = (ax: number, ay: number, bx: number, by: number, r: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * r;
  const ny = (dx / L) * r;
  const f = (v: number) => v.toFixed(2);
  return `M${f(ax + nx)} ${f(ay + ny)} L${f(bx + nx)} ${f(by + ny)} A${r} ${r} 0 0 0 ${f(bx - nx)} ${f(by - ny)} L${f(ax - nx)} ${f(ay - ny)} A${r} ${r} 0 0 0 ${f(ax + nx)} ${f(ay + ny)} Z`;
};

const limb = (ox: number, oy: number, a1: number, a2: number, l1: number, l2: number, r: number, bendSign = 1) => {
  const d1 = dir(a1);
  const jx = ox + d1.x * l1;
  const jy = oy + d1.y * l1;
  const d2 = dir(a1 + a2 * bendSign);
  const ex = jx + d2.x * l2;
  const ey = jy + d2.y * l2;
  return { d: capsule(ox, oy, jx, jy, r) + capsule(jx, jy, ex, ey, r * 0.92), end: { x: ex, y: ey } };
};

export interface FigureProps {
  x: number;
  y: number; // stand=true 时为脚底所在地面，否则为髋部
  s?: number;
  pose?: Pose;
  facing?: 1 | -1;
  stand?: boolean;
  z?: number;
  body?: string;
  head?: string;
  hair?: string;
  scarf?: string | null;
  wind?: number; // 围巾尾巴摆动相位
  hairStyle?: 0 | 1 | 2;
  rotate?: number;
  /** 手里拿的东西：参数为两只手在场景坐标中的位置 */
  hands?: (h: { front: { x: number; y: number }; back: { x: number; y: number } }) => React.ReactNode;
}

const HAIR = [
  // 0：子杰——侧分短发，刘海扫向前方
  "M-31 -2 C-35 -28 -14 -40 6 -37 C27 -34 36 -18 31 -4 C26 -14 16 -21 4 -21 C-6 -20 -14 -13 -19 -9 C-23 -12 -27 -8 -31 -2 Z",
  // 1：圆蘑菇头（帮手）
  "M-32 6 C-36 -28 -16 -40 0 -40 C18 -40 36 -28 32 6 C24 -4 12 -10 0 -10 C-12 -10 -24 -4 -32 6 Z",
  // 2：小发髻（帮手）
  "M-30 0 C-32 -26 -14 -36 2 -36 C20 -36 32 -24 30 0 C20 -10 -18 -12 -30 0 Z M-6 -44 a12 12 0 1 0 0.1 0 Z",
];

export const PaperFigure: React.FC<FigureProps> = ({
  x,
  y,
  s = 1,
  pose = POSE.stand,
  facing = 1,
  stand = true,
  z = 2,
  body = PALETTE.ink,
  head = PALETTE.cream,
  hair = PALETTE.ink,
  scarf = PALETTE.vermilion,
  wind = 0,
  hairStyle = 0,
  rotate = 0,
  hands,
}) => {
  const lean = pose.lean ?? 0;
  const nod = pose.nod ?? 0;
  const legF = limb(7, -4, pose.legF[0], -pose.legF[1], THIGH, SHIN, 9.5);
  const legB = limb(-7, -4, pose.legB[0], -pose.legB[1], THIGH, SHIN, 9.5);
  const footY = Math.max(legF.end.y, legB.end.y) + 7;
  const oy = stand ? y - footY * s : y;

  // 镜像（facing=-1）放在滤镜里面做：SVG 负缩放下 Chromium 的光照滤镜会失效，投影方向也会反
  const T = `scale(${s * facing} ${s}) rotate(${rotate})`;
  const upper = `rotate(${lean} 0 0)`;
  const headT = `rotate(${nod} 0 ${SH_Y - 6})`;
  const L = (node: React.ReactNode, ...inner: string[]) => (
    <g transform={T}>{inner.reduceRight<React.ReactNode>((n, t) => <g transform={t}>{n}</g>, node)}</g>
  );

  const armF = limb(10, SH_Y + 6, pose.armF[0], pose.armF[1], UPPER, FORE, 7.5);
  const armB = limb(-8, SH_Y + 6, pose.armB[0], pose.armB[1], UPPER, FORE, 7.5);
  const torso = "M-21 -84 C-23 -60 -27 -28 -26 -4 C-14 2 14 2 26 -4 C27 -28 23 -60 21 -84 C12 -90 -12 -90 -21 -84 Z";
  const foot = (e: { x: number; y: number }) => `M${e.x - 7} ${e.y + 3} a10 7 0 1 0 22 0 a10 7 0 1 0 -22 0 Z`;

  // 围巾：领口一圈 + 往后飘的尾巴
  const w1 = Math.sin(wind) * 6;
  const w2 = Math.sin(wind + 1.3) * 8;
  const scarfBand = "M-23 -88 C-12 -80 12 -80 23 -88 L22 -76 C12 -70 -12 -70 -22 -76 Z";
  const scarfTail = `M-16 -82 C-30 ${-80 + w1 * 0.3} -42 ${-74 + w1} -54 ${-68 + w2} L-52 ${-58 + w2} C-40 ${-62 + w1} -28 -68 -14 -72 Z`;

  // 局部坐标 → 场景坐标（用于手里拿的东西）
  const toScene = (pt: { x: number; y: number }) => {
    const rl = (lean * Math.PI) / 180;
    const px = pt.x * Math.cos(rl) - pt.y * Math.sin(rl);
    const py = pt.x * Math.sin(rl) + pt.y * Math.cos(rl);
    const rr = (rotate * Math.PI) / 180;
    const qx = px * Math.cos(rr) - py * Math.sin(rr);
    const qy = px * Math.sin(rr) + py * Math.cos(rr);
    return { x: x + qx * s * facing, y: oy + qy * s };
  };

  return (
    <g transform={`translate(${x} ${oy})`}>
      {/* 远侧肢体：颜色略深，离纸面更低 */}
      <Paper color={darken(body, 0.18)} z={z - 0.4} grad={0.06} filter="paper-fine">
        {L(<path d={armB.d} />, upper)}
        {L(<path d={legB.d + foot(legB.end)} />)}
      </Paper>
      {scarf && (
        <Paper color={darken(scarf, 0.12)} z={z - 0.2} grad={0.08} filter="paper-fine">
          {L(<path d={scarfTail} />, upper)}
        </Paper>
      )}
      <Paper color={body} z={z} grad={0.1} filter="paper-fine">
        {L(<path d={legF.d + foot(legF.end)} />)}
        {L(<path d={torso} />, upper)}
      </Paper>
      {/* 头 */}
      <Paper color={head} z={z + 0.3} grad={0.1} filter="paper-fine">
        {L(<circle cx={2} cy={HEAD_Y} r={HEAD_R} />, upper, headT)}
      </Paper>
      <Paper color={hair} z={z + 0.5} grad={0.1} filter="paper-fine">
        {L(<path d={HAIR[hairStyle]} transform={`translate(2 ${HEAD_Y})`} />, upper, headT)}
      </Paper>
      {scarf && (
        <Paper color={scarf} z={z + 0.4} grad={0.1} filter="paper-fine">
          {L(<path d={scarfBand} />, upper)}
        </Paper>
      )}
      <Paper color={body} z={z + 0.6} grad={0.1} filter="paper-fine">
        {L(<path d={armF.d} />, upper)}
      </Paper>
      {hands && <g transform={`translate(${-x} ${-oy})`}>{hands({ front: toScene(armF.end), back: toScene(armB.end) })}</g>}
    </g>
  );
};

/** 只有头像（第 2 个愿望的卡片用）：同样的发型、同样的轮廓 */
export const PaperHead: React.FC<{ x: number; y: number; s?: number; z?: number }> = ({ x, y, s = 1, z = 1.5 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Paper color={PALETTE.ink} z={z} grad={0.1} filter="paper-fine">
      <path d="M-46 70 C-44 46 -30 36 0 36 C30 36 44 46 46 70 Z" />
    </Paper>
    <Paper color={PALETTE.vermilion} z={z + 0.2} grad={0.1} filter="paper-fine">
      <path d="M-25 30 C-12 39 12 39 25 30 L24 44 C12 51 -12 51 -24 44 Z" />
    </Paper>
    <Paper color={PALETTE.cream} z={z + 0.3} grad={0.1} filter="paper-fine">
      <circle cx={2} cy={0} r={HEAD_R} />
    </Paper>
    <Paper color={PALETTE.ink} z={z + 0.5} grad={0.1} filter="paper-fine">
      <path d={HAIR[0]} transform="translate(2 0)" />
    </Paper>
  </g>
);

export const FIGURE_HIP = 88; // 站立时髋部离地高度（scale=1）
export const FIGURE_HEIGHT = 236;
