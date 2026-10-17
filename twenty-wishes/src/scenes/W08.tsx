// 8. 愿每个 deadline，都排在你准备好之后。
// 纸台历哗哗地翻页。纸人在旁边把积木一块块搭好，搭完最后一块，台历上被红圈圈住的日期才慢悠悠地翻到。
import React from "react";
import { BASE, FONTS, SCENE_TEXT } from "../config";
import { bell, clamp, ease, pop, prog } from "../lib/anim";
import { PaperFigure, POSE, blendPose } from "../lib/figure";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel } from "./common";

const B = beatsOf("w08");
const CAL = { x: 380, y: 400, w: 400, h: 440 };
const DATES = [...SCENE_TEXT.w8Dates, SCENE_TEXT.w8Deadline];
// 翻页时刻：前面哗哗快翻，最后一页慢悠悠
const FLIP_AT = [2, 6, 10, 14, 18, 23, 29, 36, B.slowFlip];
const FLIP_DUR = [4, 4, 4, 4, 5, 6, 7, 8, B.circled - B.slowFlip];
const BLOCKS = [
  { x: 1440, w: 150, h: 84, c: P.fogBlue },
  { x: 1446, w: 132, h: 80, c: P.apricot },
  { x: 1438, w: 140, h: 78, c: P.sage },
  { x: 1450, w: 118, h: 76, c: P.lilac },
];
const GROUND = 880;

const Page: React.FC<{ n: string; circled?: number }> = ({ n, circled = 0 }) => (
  <>
    <Paper color={BASE.white} z={1.6} grad={0.05}>
      <rect x={CAL.x} y={CAL.y + 40} width={CAL.w} height={CAL.h - 40} rx={14} />
    </Paper>
    <Paper color={P.vermilion} z={1.7} grad={0.1} filter="paper-fine">
      <rect x={CAL.x} y={CAL.y + 40} width={CAL.w} height={86} rx={14} />
    </Paper>
    <text x={CAL.x + CAL.w / 2} y={CAL.y + 100} textAnchor="middle" fontFamily={`"${FONTS.wish}"`} fontSize={40} letterSpacing={8} fill={BASE.white} filter="url(#fiber)">
      {SCENE_TEXT.w8Month}
    </text>
    <Paper color={P.ink} z={1.8} filter="paper-fine" grad={0}>
      <text x={CAL.x + CAL.w / 2} y={CAL.y + 330} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={170}>
        {n}
      </text>
    </Paper>
    {circled > 0 && (
      <LiftContext.Provider value={clamp(circled)}>
        <g transform={`translate(${CAL.x + CAL.w / 2} ${CAL.y + 270}) scale(${0.6 + 0.4 * circled}) rotate(-8)`} opacity={clamp(circled * 3)}>
          <Paper color={P.vermilion} z={2.2} line={9} filter="paper-line" grad={0}>
            <path d="M-118 -10 C-120 -86 -30 -112 40 -100 C110 -88 132 -30 120 20 C106 80 20 104 -50 92 C-112 82 -128 30 -112 -24 C-100 -60 -60 -82 -20 -86" />
          </Paper>
        </g>
      </LiftContext.Provider>
    )}
  </>
);

export const W08: React.FC = () => {
  const { f } = useScene();
  // 当前正在翻的是第几页
  let k = 0;
  while (k < FLIP_AT.length && f >= FLIP_AT[k] + FLIP_DUR[k]) k++;
  const flipping = k < FLIP_AT.length && f >= FLIP_AT[k];
  const p = flipping ? prog(f, FLIP_AT[k], FLIP_AT[k] + FLIP_DUR[k]) : 0;
  const ang = 180 * (k === FLIP_AT.length - 1 ? ease.inOut(p) : ease.in(p));
  const top = DATES[Math.min(k, DATES.length - 1)];
  const under = DATES[Math.min(k + 1, DATES.length - 1)];
  const circled = pop(f, B.circled, { damping: 10, stiffness: 180 });
  const done = k >= FLIP_AT.length;

  // 纸人搭积木：每块落下时举手
  const blockAt = (i: number) => B.block0 + i * B.blockStep;
  const reach = Math.max(...[0, 1, 2, 3, 4].map((i) => bell(f, blockAt(i) - 5, blockAt(i) + 3)));
  const cheer = bell(f, B.circled, B.circled + 14);
  const pose = blendPose(blendPose(POSE.stand, { ...POSE.armsUp, armF: [130, 30], armB: [40, 20], lean: 6 }, reach), POSE.armsUp, cheer);

  return (
    <>
      <Panel x={240} y={320} w={1440} h={660} color={P.sakura} at={-2} r={44} order={6} />
      {/* 台历 */}
      <PopUp x={CAL.x - 40} y={CAL.y - 20} w={CAL.w + 80} h={CAL.h + 60} at={0} order={3}>
        <Paper color={P.ink} z={1.2} grad={0.08}>
          <path d={`M${CAL.x + 20} ${CAL.y + CAL.h + 20} L${CAL.x + 60} ${CAL.y + 40} L${CAL.x + CAL.w - 60} ${CAL.y + 40} L${CAL.x + CAL.w - 20} ${CAL.y + CAL.h + 20} Z`} />
        </Paper>
        <Page n={done ? DATES[DATES.length - 1] : under} circled={done || (flipping && k === FLIP_AT.length - 1) ? circled : 0} />
        {!done && (
          <g
            style={{
              transformBox: "view-box",
              transformOrigin: `${CAL.x + CAL.w / 2}px ${CAL.y + 40}px`,
              transform: `scaleY(${Math.cos((ang * Math.PI) / 180).toFixed(4)})`,
            }}
            opacity={ang < 90 ? 1 : 0}
          >
            <Page n={top} />
          </g>
        )}
        {/* 装订圈 */}
        <Paper color={darken(P.ink, 0.1)} z={2.4} filter="paper-fine" line={7} grad={0}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${CAL.x + 60 + i * 56} ${CAL.y + 58} C${CAL.x + 60 + i * 56} ${CAL.y + 20} ${CAL.x + 76 + i * 56} ${CAL.y + 20} ${CAL.x + 76 + i * 56} ${CAL.y + 50}`} fill="none" />
          ))}
        </Paper>
      </PopUp>
      {/* 积木 */}
      {BLOCKS.map((b, i) => {
        const at = blockAt(i);
        if (f < at - 6) return null;
        const s = pop(f, at, { damping: 12, stiffness: 220, mass: 0.6 });
        const yBase = GROUND - BLOCKS.slice(0, i).reduce((a, x) => a + x.h, 0);
        const drop = (1 - s) * -160;
        return (
          <svg key={i} width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: clamp((f - at + 6) / 4) }}>
            <LiftContext.Provider value={1}>
              <g transform={`translate(0 ${drop})`}>
                <Paper color={b.c} z={2.4 + i * 0.3 + (1 - s) * 2} grad={0.16}>
                  <rect x={b.x} y={yBase - b.h} width={b.w} height={b.h} rx={6} />
                </Paper>
                <Paper color={lighten(b.c, 0.4)} z={2.6 + i * 0.3} filter="paper-fine" grad={0}>
                  <circle cx={b.x + b.w / 2} cy={yBase - b.h / 2} r={14} />
                </Paper>
              </g>
            </LiftContext.Provider>
          </svg>
        );
      })}
      {/* 屋顶（最后一块） */}
      {f >= blockAt(4) - 6 &&
        (() => {
          const s = pop(f, blockAt(4), { damping: 12, stiffness: 220, mass: 0.6 });
          const y0 = GROUND - BLOCKS.reduce((a, x) => a + x.h, 0);
          return (
            <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: clamp((f - blockAt(4) + 6) / 4) }}>
              <g transform={`translate(0 ${(1 - s) * -160})`}>
                <Paper color={P.vermilion} z={3.8} grad={0.14}>
                  <path d={`M1424 ${y0} L1509 ${y0 - 90} L1594 ${y0} Z`} />
                </Paper>
              </g>
            </svg>
          );
        })()}
      <PopUp x={1150} y={560} w={260} h={330} at={1} order={1}>
        <PaperFigure x={1300} y={GROUND} s={1.12} pose={pose} z={2.2} wind={f * 0.2} />
      </PopUp>
      <Ground y={905} color={P.fogBlue} back={P.cream} at={-3} seed={8} order={0} amp={14} />
    </>
  );
};
