// 16. 愿你一直觉得“还不够好”，但偶尔也觉得“已经很好了”。
// 纸人站在画架前，画布上的画被擦掉重画了三次（三层纸片依次替换）。第三次画好后，他往后退了一步，
// 停住，一束暖光落在画上，他轻轻点了点头。
import React from "react";
import { BASE } from "../config";
import { bell, clamp, ease, lerp, pop, prog } from "../lib/anim";
import { PaperFigure, POSE, blendPose, walkPose } from "../lib/figure";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel } from "./common";

const B = beatsOf("w16");
const CV = { x: 860, y: 380, w: 460, h: 340 };
const GROUND = 880;

type Shape = { c: string; d: string; z?: number };

const r = CV;
const ART: Shape[][] = [
  // 第一次：歪歪扭扭
  [
    { c: P.apricot, d: `M${r.x + 330} ${r.y + 70} c40 -10 60 30 40 60 c-20 30 -70 20 -66 -14 c2 -26 10 -40 26 -46 Z` },
    { c: P.sage, d: `M${r.x + 20} ${r.y + 320} C${r.x + 80} ${r.y + 150} ${r.x + 150} ${r.y + 300} ${r.x + 210} ${r.y + 190} C${r.x + 260} ${r.y + 110} ${r.x + 300} ${r.y + 330} ${r.x + 440} ${r.y + 320} Z` },
    { c: P.ink, d: `M${r.x + 120} ${r.y + 300} l8 -110 l10 0 l-2 110 Z` },
    { c: P.pine, d: `M${r.x + 70} ${r.y + 210} L${r.x + 140} ${r.y + 120} L${r.x + 170} ${r.y + 230} Z` },
  ],
  // 第二次：好一点，但颜色太闷、山太尖
  [
    { c: lighten(P.ink, 0.55), d: `M${r.x + 20} ${r.y + 20} h420 v120 h-420 Z` },
    { c: P.vermilion, d: `M${r.x + 230} ${r.y + 120} a70 70 0 1 0 0.1 0 Z` },
    { c: darken(P.fogBlue, 0.35), d: `M${r.x + 20} ${r.y + 320} L${r.x + 120} ${r.y + 110} L${r.x + 200} ${r.y + 320} Z M${r.x + 160} ${r.y + 320} L${r.x + 300} ${r.y + 90} L${r.x + 440} ${r.y + 320} Z` },
  ],
  // 第三次：好了
  [
    { c: lighten(P.sakura, 0.25), d: `M${r.x + 20} ${r.y + 20} h420 v300 h-420 Z` },
    { c: P.apricot, d: `M${r.x + 300} ${r.y + 120} a44 44 0 1 0 0.1 0 Z` },
    { c: P.lilac, d: `M${r.x + 20} ${r.y + 240} C${r.x + 110} ${r.y + 150} ${r.x + 200} ${r.y + 200} ${r.x + 260} ${r.y + 170} C${r.x + 330} ${r.y + 140} ${r.x + 400} ${r.y + 190} ${r.x + 440} ${r.y + 180} L${r.x + 440} ${r.y + 320} L${r.x + 20} ${r.y + 320} Z` },
    { c: P.sage, d: `M${r.x + 20} ${r.y + 280} C${r.x + 120} ${r.y + 220} ${r.x + 240} ${r.y + 270} ${r.x + 330} ${r.y + 240} C${r.x + 380} ${r.y + 224} ${r.x + 420} ${r.y + 240} ${r.x + 440} ${r.y + 236} L${r.x + 440} ${r.y + 320} L${r.x + 20} ${r.y + 320} Z` },
    { c: P.pine, d: `M${r.x + 90} ${r.y + 300} L${r.x + 120} ${r.y + 200} L${r.x + 150} ${r.y + 300} Z M${r.x + 130} ${r.y + 300} L${r.x + 156} ${r.y + 220} L${r.x + 182} ${r.y + 300} Z` },
    { c: P.ink, d: `M${r.x + 340} ${r.y + 80} q8 -8 16 0 q8 -8 16 0 q-8 2 -16 6 q-8 -4 -16 -6 Z` },
  ],
];

/** 一张画：纸片立起后，色块随画笔依次出现；被擦掉时整张撕下、翻落 */
const Sheet: React.FC<{ f: number; k: number; at: number; erase?: number }> = ({ f, k, at, erase }) => {
  if (f < at) return null;
  const rise = pop(f, at, { damping: 13, stiffness: 180 });
  const e = erase !== undefined ? ease.in(prog(f, erase, erase + 9)) : 0;
  if (e >= 1) return null;
  const shapes = ART[k];
  const per = 14 / shapes.length;
  return (
    <LiftContext.Provider value={clamp(rise) * (1 + 2 * e)}>
      <g
        transform={`translate(${-40 * e} ${380 * e}) rotate(${-26 * e} ${CV.x} ${CV.y + CV.h}) translate(${CV.x + CV.w / 2} ${CV.y + CV.h}) scale(1 ${clamp(rise, 0, 1.1)}) translate(${-(CV.x + CV.w / 2)} ${-(CV.y + CV.h)})`}
        opacity={1 - prog(e, 0.6, 1)}
      >
        <Paper color={BASE.white} z={2 + e * 3} grad={0.05}>
          <rect x={CV.x} y={CV.y} width={CV.w} height={CV.h} rx={4} />
        </Paper>
        {shapes.map((s, i) => {
          const t = at + 4 + i * per;
          const sp = pop(f, t, { damping: 12, stiffness: 240, mass: 0.5 });
          if (f < t) return null;
          const cx = CV.x + CV.w / 2;
          const cy = CV.y + CV.h / 2;
          return (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${clamp(sp, 0, 1.08)}) translate(${-cx} ${-cy})`}>
              <Paper color={s.c} z={2.2 + i * 0.05 + e * 3} filter="paper-fine" grad={0.08}>
                <path d={s.d} />
              </Paper>
            </g>
          );
        })}
      </g>
    </LiftContext.Provider>
  );
};

export const W16: React.FC = () => {
  const { f } = useScene();
  // 画画时手臂来回
  const painting = [
    [B.draw1, B.draw1 + 18],
    [B.draw2, B.draw2 + 16],
    [B.draw3, B.done],
  ].some(([a, b]) => f >= a && f < b);
  const brush = painting ? Math.sin(f * 0.8) * 18 : 0;
  // 后退一步
  const back = ease.inOut(prog(f, B.stepBack, B.stepBack + 10));
  const x = lerp(690, 560, back);
  const walking = f >= B.stepBack && f < B.stepBack + 10;
  const base = walking ? walkPose(-(f - B.stepBack) * 0.6, 0.8) : POSE.stand;
  const paintPose = { ...POSE.stand, armF: [92 + brush, 24 - brush * 0.5] as [number, number], lean: 6 };
  const nod = 16 * bell(f, B.nod, B.nod + 10) + 8 * bell(f, B.nod + 10, B.nod + 17);
  const pose = { ...blendPose(base, paintPose, painting ? 1 : 0), nod };
  const light = ease.out(prog(f, B.light, B.light + 14));

  return (
    <>
      <Panel x={220} y={300} w={1480} h={680} color={P.lilac} at={-2} r={44} order={6} />
      {/* 画架 */}
      <PopUp x={900} y={300} w={380} h={620} at={0} order={4}>
        <Paper color={darken(P.apricot, 0.45)} z={1.6} line={14} filter="paper-line" grad={0}>
          <path d={`M1090 320 L960 ${GROUND + 20} M1090 320 L1220 ${GROUND + 20} M1090 330 L1110 ${GROUND + 20}`} fill="none" />
        </Paper>
        <Paper color={darken(P.apricot, 0.35)} z={1.8} grad={0.1}>
          <rect x={CV.x - 20} y={CV.y + CV.h} width={CV.w + 40} height={20} rx={5} />
        </Paper>
        <Paper color={lighten(P.cream, 0.1)} z={1.8} grad={0.06}>
          <rect x={CV.x - 6} y={CV.y - 6} width={CV.w + 12} height={CV.h + 12} rx={4} />
        </Paper>
      </PopUp>
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
        <Sheet f={f} k={0} at={B.draw1} erase={B.erase1} />
        <Sheet f={f} k={1} at={B.draw2} erase={B.erase2} />
        <Sheet f={f} k={2} at={B.draw3} />
      </svg>
      {/* 暖光落在画上 */}
      {light > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", mixBlendMode: "screen", opacity: light }}>
          <defs>
            <linearGradient id="w16beam" x1="300" y1="250" x2="1090" y2="560" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFE2B0" stopOpacity={0} />
              <stop offset="1" stopColor="#FFDCA0" stopOpacity={0.4} />
            </linearGradient>
            <radialGradient id="w16spot" cx={1090} cy={550} r={330} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFE6B8" stopOpacity={0.5} />
              <stop offset="1" stopColor="#FFE6B8" stopOpacity={0} />
            </radialGradient>
            <filter id="w16blur">
              <feGaussianBlur stdDeviation={14} />
            </filter>
          </defs>
          <polygon points="260,300 470,290 1340,700 820,760" fill="url(#w16beam)" filter="url(#w16blur)" />
          <rect x={700} y={250} width={800} height={620} fill="url(#w16spot)" />
        </svg>
      )}
      {/* 纸人和画笔 */}
      <PopUp x={x - 120} y={560} w={300} h={340} at={1} order={2}>
        <PaperFigure
          x={x}
          y={GROUND}
          s={1.2}
          pose={pose}
          z={2.4}
          wind={f * 0.2}
          hands={({ front }) => (
            <Paper color={P.ink} z={2.8} line={6} filter="paper-line" grad={0}>
              <path d={`M${front.x - 6} ${front.y + 8} L${front.x + 34} ${front.y - 30}`} />
              <path d={`M${front.x + 30} ${front.y - 26} L${front.x + 40} ${front.y - 36}`} stroke={P.vermilion} />
            </Paper>
          )}
        />
      </PopUp>
      <Ground y={915} color={P.sage} back={P.cream} at={-3} seed={16} order={0} amp={14} />
    </>
  );
};
