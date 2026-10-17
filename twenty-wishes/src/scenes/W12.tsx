// 12. 愿你凭六十分把握出发的事，最后都变成一百分。
// 一条纸做的山路，纸人从山脚「60」的路牌出发，经过「80」，最后到达山顶「100」的小旗旁边。
import React from "react";
import { BASE, FONTS, SCENE_TEXT } from "../config";
import { clamp, ease, pop, prog } from "../lib/anim";
import { PaperFigure, walkPose, POSE, blendPose } from "../lib/figure";
import { LiftContext, Mist, Paper, darken, lighten } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, cloudPath } from "./common";

const B = beatsOf("w12");
// 山路折线（山脚 → 山顶）
const PATH: [number, number][] = [
  [330, 868],
  [700, 830],
  [930, 760],
  [820, 690],
  [1040, 620],
  [1230, 530],
  [1150, 455],
  [1330, 380],
  [1420, 350],
];
const SEG = PATH.slice(1).map((p, i) => Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]));
const TOTAL = SEG.reduce((a, b) => a + b, 0);

const along = (d: number) => {
  let r = Math.max(0, Math.min(TOTAL, d));
  for (let i = 0; i < SEG.length; i++) {
    if (r <= SEG[i] || i === SEG.length - 1) {
      const t = SEG[i] ? r / SEG[i] : 0;
      const a = PATH[i];
      const b = PATH[i + 1];
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dir: b[0] >= a[0] ? 1 : -1 };
    }
    r -= SEG[i];
  }
  return { x: PATH[PATH.length - 1][0], y: PATH[PATH.length - 1][1], dir: 1 };
};

const Sign: React.FC<{ x: number; y: number; label: string; s?: number }> = ({ x, y, label, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Paper color={darken(P.apricot, 0.45)} z={2} filter="paper-fine" grad={0.08}>
      <rect x={-6} y={-120} width={12} height={120} rx={3} />
    </Paper>
    <Paper color={P.cream} z={2.2} grad={0.1} filter="paper-fine">
      <path d="M-58 -150 L46 -150 L66 -126 L46 -102 L-58 -102 Z" />
    </Paper>
    <Paper color={P.ink} z={2.4} filter="fiber" grad={0}>
      <text x={-6} y={-112} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={38}>
        {label}
      </text>
    </Paper>
  </g>
);

export const W12: React.FC = () => {
  const { f } = useScene();
  // 走路：越往上越慢一点
  const w = prog(f, B.walk, B.summit);
  const d = TOTAL * (0.15 * w + 0.85 * ease.soft(w));
  const pos = along(d);
  const arrived = f >= B.summit;
  const sc = 0.62 - 0.2 * (1 - pos.y / 868) * 1.6;
  const pose = arrived ? blendPose(walkPose(0, 0), POSE.armsUp, clamp(prog(f, B.summit, B.summit + 6)) * (1 - prog(f, B.summit + 14, B.summit + 22) * 0.6)) : walkPose(d * 0.09, 1);
  const flagPop = pop(f, B.summit, { damping: 9, stiffness: 200 });
  const wave = Math.sin(f * 0.35) * (arrived ? 1 : 0.4);
  const p80 = pop(f, B.pass80 - 2, { damping: 10, stiffness: 220 });
  const pathD = PATH.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");

  return (
    <>
      <PopUp x={1300} y={300} w={500} h={200} at={-1} order={7}>
        <Paper color={BASE.white} z={0.8} grad={0.05}>
          <path d={cloudPath(1640, 400, 0.9)} />
        </Paper>
      </PopUp>
      {/* 远山 */}
      <PopUp x={-60} y={430} w={2040} h={540} at={0} order={6}>
        <Paper color={P.lilac} z={0.8} grad={0.1}>
          <path d="M-60 980 L-60 640 C120 560 260 520 420 590 C560 650 640 560 760 520 C820 500 900 540 980 600 L1600 600 C1700 540 1800 500 1980 560 L1980 980 Z" />
        </Paper>
        <Mist y={620} h={260} opacity={0.65} />
      </PopUp>
      {/* 大山 + 山路 */}
      <PopUp x={150} y={300} w={1800} h={680} at={2} order={4}>
        <Paper color={P.sage} z={1.6} grad={0.14}>
          <path d="M150 980 C360 900 560 860 760 780 C960 700 1180 520 1340 380 C1380 340 1430 320 1470 340 C1560 400 1700 560 1950 700 L1950 980 Z" />
        </Paper>
        <Paper color={lighten(P.sage, 0.3)} z={1.7} grad={0.06} filter="paper-fine">
          <path d="M1340 380 C1380 340 1430 320 1470 340 C1500 360 1520 380 1540 404 C1500 396 1470 420 1440 400 C1410 382 1380 410 1340 380 Z" />
        </Paper>
        <Paper color={P.cream} z={1.9} line={30} filter="paper-line" grad={0.04}>
          <path d={pathD} fill="none" />
        </Paper>
        <path d={pathD} fill="none" stroke={darken(P.cream, 0.15)} strokeWidth={3} strokeDasharray="4 16" strokeLinecap="round" />
      </PopUp>
      {/* 路牌 */}
      <PopUp x={200} y={680} w={200} h={200} at={4} order={3}>
        <Sign x={290} y={872} label={SCENE_TEXT.w12Signs[0]} />
      </PopUp>
      <PopUp x={1090} y={470} w={170} h={170} at={6} order={3}>
        <LiftContext.Provider value={1}>
          <g transform={`translate(1170 630) scale(${0.8 + 0.2 * p80}) translate(-1170 -630)`}>
            <Sign x={1170} y={630} label={SCENE_TEXT.w12Signs[1]} s={0.82} />
          </g>
        </LiftContext.Provider>
      </PopUp>
      {/* 山顶小旗 */}
      <PopUp x={1420} y={200} w={200} h={160} at={8} order={3}>
        <g transform={`translate(1470 350) scale(${0.85 + 0.15 * flagPop}) translate(-1470 -350)`}>
          <Paper color={P.ink} z={2.2} filter="paper-fine" grad={0}>
            <rect x={1466} y={230} width={8} height={120} rx={3} />
          </Paper>
          <Paper color={P.vermilion} z={2.4} grad={0.12} filter="paper-fine">
            <path d={`M1474 234 C1510 ${226 + wave * 6} 1540 ${244 - wave * 6} 1578 ${236 + wave * 8} L1578 ${290 + wave * 8} C1540 ${298 - wave * 6} 1510 ${280 + wave * 6} 1474 288 Z`} />
          </Paper>
          <Paper color={BASE.white} z={2.6} filter="fiber" grad={0}>
            <text x={1524} y={274 + wave * 2} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={30}>
              {SCENE_TEXT.w12Signs[2]}
            </text>
          </Paper>
        </g>
      </PopUp>
      {/* 纸人 */}
      <PopUp x={pos.x - 90} y={pos.y - 200} w={180} h={210} at={B.walk - 6} order={2}>
        <PaperFigure x={pos.x} y={pos.y - 2} s={sc} pose={pose} facing={pos.dir as 1 | -1} z={2.6} wind={f * 0.3} />
      </PopUp>
      <Ground y={935} color={P.pine} back={P.sage} at={-3} seed={12} order={0} amp={14} />
    </>
  );
};
