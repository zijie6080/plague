// 18. 愿你身边一直有人，陪你把想法做成真的。
// 纸人独自扛着一张很大的纸图纸，有点吃力。一个、两个、三个纸人陆续跑过来，各自托起图纸的一角。
// 他们一起把图纸举高，图纸“啪”地立起来，变成一座纸房子。
import React from "react";
import { BASE } from "../config";
import { clamp, ease, lerp, pop, prog } from "../lib/anim";
import { PaperFigure, POSE, blendPose, walkPose } from "../lib/figure";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { RiseGroup, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel } from "./common";

const B = beatsOf("w18");
const GROUND = 885;
const SHEET = { cx: 1000, w: 760, h: 420 };
// 帮手：颜色不同、没有围巾、发型不同
const HELPERS = [
  { at: B.h1, from: 2150, to: 1250, body: P.fogBlue, hair: 1 as const },
  { at: B.h2, from: -250, to: 760, body: P.sage, hair: 2 as const },
  { at: B.h3, from: 2150, to: 1430, body: P.apricot, hair: 1 as const },
];
const MAIN_X = 1010;

export const W18: React.FC = () => {
  const { f } = useScene();
  const joined = HELPERS.filter((h) => f >= h.at + 12).length;
  const struggle = (1 - joined / 3) * (f < B.lift ? 1 : 0);
  const wob = Math.sin(f * 0.35) * 5 * struggle;
  const lift = ease.backOut(prog(f, B.lift, B.lift + 12));
  const stand = pop(f, B.stand, { damping: 11, stiffness: 190, mass: 0.7 });
  const standing = f >= B.stand;
  // 图纸：被扛着时几乎平躺（rotateX 66°），“啪”地立起并落到地上变成房子
  const tilt = standing ? lerp(66, 0, clamp(stand, 0, 1.1)) : 66;
  const carryBottom = 600 - 60 * lift - Math.abs(wob) * 2;
  const bottom = standing ? lerp(carryBottom, GROUND - 6, ease.out(prog(f, B.stand, B.stand + 8))) : carryBottom;
  const houseOn = prog(f, B.stand + 3, B.stand + 9);
  const roof = pop(f, B.stand + 6, { damping: 10, stiffness: 200 });
  const win = pop(f, B.stand + 10, { damping: 10, stiffness: 220 });
  // 人们让开
  const aside = ease.inOut(prog(f, B.stand - 2, B.stand + 10));
  const cheer = clamp(prog(f, B.stand + 10, B.stand + 16));
  const hop = (k: number) => (cheer > 0 ? -16 * Math.abs(Math.sin((f - B.stand - 10) * 0.35 + k)) : 0);
  const carryPose = (k: number) =>
    blendPose(
      { ...POSE.armsUp, armF: [172 + Math.sin(f * 0.3 + k) * 6 * struggle, 10], armB: [164, 12], lean: k === 0 ? wob * 0.8 : 0, legF: [8, 6 + 8 * struggle], legB: [-6, 4] },
      { ...POSE.armsUp, armF: [150, 30], armB: [140, 26] },
      cheer,
    );
  const L = SHEET.cx - SHEET.w / 2;
  const T = bottom - SHEET.h;

  const people = [
    { x: lerp(MAIN_X, 600, aside), body: P.ink, hair: 0 as const, scarf: P.vermilion, k: 0 },
    ...HELPERS.map((h, i) => {
      const run = ease.out(prog(f, h.at, h.at + 12));
      const target = lerp(h.to, h.from < 0 ? 400 : i === 0 ? 1460 : 1640, aside);
      return { x: f < h.at ? -9999 : lerp(h.from, target, run), body: h.body, hair: h.hair, scarf: null, k: i + 1, running: f < h.at + 12, at: h.at };
    }),
  ];

  return (
    <>
      <Panel x={220} y={300} w={1480} h={680} color={P.cream} at={-2} r={44} order={6} />
      <RiseGroup pivot={GROUND} at={0} order={2}>
      {/* 图纸 / 房子 */}
      <div
        style={{
          position: "absolute",
          left: L,
          top: T,
          width: SHEET.w,
          height: SHEET.h,
          transformOrigin: "50% 100%",
          transform: `rotate(${wob * 0.6}deg) rotateX(${tilt}deg)`,
        }}
      >
        <LiftContext.Provider value={1}>
          <svg width={SHEET.w} height={SHEET.h} viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} style={{ position: "absolute", overflow: "visible" }}>
            {/* 图纸 */}
            <g opacity={1 - houseOn}>
              <Paper color={P.fogBlue} z={2.2} grad={0.08}>
                <rect x={0} y={0} width={SHEET.w} height={SHEET.h} rx={6} />
              </Paper>
              <g stroke={lighten(P.fogBlue, 0.6)} strokeWidth={2} opacity={0.6}>
                {Array.from({ length: 16 }, (_, i) => (
                  <path key={`v${i}`} d={`M${20 + i * 48} 10 V${SHEET.h - 10}`} />
                ))}
                {Array.from({ length: 9 }, (_, i) => (
                  <path key={`h${i}`} d={`M10 ${20 + i * 48} H${SHEET.w - 10}`} />
                ))}
              </g>
              <g fill="none" stroke={BASE.white} strokeWidth={6} strokeLinejoin="round" opacity={0.95}>
                <path d={`M190 ${SHEET.h - 50} V180 L380 60 L570 180 V${SHEET.h - 50} Z`} />
                <path d={`M340 ${SHEET.h - 50} V260 H420 V${SHEET.h - 50}`} />
                <rect x={230} y={210} width={70} height={60} />
                <rect x={460} y={210} width={70} height={60} />
              </g>
            </g>
            {/* 房子 */}
            {houseOn > 0 && (
              <g opacity={houseOn}>
                <Paper color={P.cream} z={2.2} grad={0.1}>
                  <rect x={150} y={150} width={460} height={SHEET.h - 150} rx={4} />
                </Paper>
                <Paper color={P.pine} z={2.5} grad={0.12} filter="paper-fine">
                  <path d={`M330 ${SHEET.h} V280 C330 250 430 250 430 280 V${SHEET.h} Z`} />
                </Paper>
                <g transform={`translate(380 160) scale(${clamp(win, 0, 1.1)}) translate(-380 -160)`}>
                  <Paper color={lighten(P.apricot, 0.2)} z={2.6} grad={0.1} filter="paper-fine">
                    <rect x={196} y={200} width={90} height={80} rx={6} />
                    <rect x={474} y={200} width={90} height={80} rx={6} />
                  </Paper>
                  <g stroke={P.cream} strokeWidth={6}>
                    <path d="M241 200 V280 M196 240 H286 M519 200 V280 M474 240 H564" />
                  </g>
                </g>
                <LiftContext.Provider value={clamp(roof, 0, 1.2)}>
                  <g transform={`translate(380 160) scale(${clamp(roof, 0, 1.1)}) translate(-380 -160)`}>
                    <Paper color={P.vermilion} z={2.9} grad={0.14}>
                      <path d="M110 170 L380 -10 L650 170 L620 186 L380 26 L140 186 Z" />
                      <path d="M150 168 L380 14 L610 168 Z" />
                      <rect x={520} y={40} width={44} height={90} />
                    </Paper>
                  </g>
                </LiftContext.Provider>
              </g>
            )}
          </svg>
        </LiftContext.Provider>
      </div>
      {/* 暖窗的光 */}
      {win > 0.05 && (
        <svg width={1920} height={1080} style={{ position: "absolute", mixBlendMode: "screen", opacity: clamp(win) * 0.6 }}>
          <defs>
            <radialGradient id="w18glow" cx={SHEET.cx} cy={GROUND - 170} r={360} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFDCA0" stopOpacity={0.45} />
              <stop offset="1" stopColor="#FFDCA0" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={500} y={400} width={1000} height={560} fill="url(#w18glow)" />
        </svg>
      )}
      {/* 人 */}
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
        {people.map((p) => {
          if (p.x < -500) return null;
          const running = "running" in p && p.running;
          const pose = running ? walkPose((f - (p.at ?? 0)) * 0.9, 1.3) : carryPose(p.k);
          const facing = running && "at" in p ? ((p.x > SHEET.cx ? -1 : 1) as 1 | -1) : 1;
          return (
            <PaperFigure
              key={p.k}
              x={p.x}
              y={GROUND + (cheer > 0 ? hop(p.k) : 0)}
              s={1.12}
              pose={pose}
              facing={facing}
              z={2.6}
              body={p.body}
              hairStyle={p.hair}
              hair={p.k === 0 ? P.ink : darken(p.body, 0.45)}
              scarf={p.scarf}
              wind={f * 0.25}
            />
          );
        })}
      </svg>
      </RiseGroup>
      <Ground y={915} color={P.sage} back={P.sakura} at={-3} seed={18} order={0} amp={14} />
    </>
  );
};

