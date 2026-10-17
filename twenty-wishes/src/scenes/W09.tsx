// 9. 愿你收到想要的那份 offer。
// 纸飞机从远处飞来，落地后展开成信封。朱红火漆印“啵”地弹开，信纸升起，四周飘落彩纸。
// （信纸上不出现任何学校名称或标志）
import React from "react";
import { BASE } from "../config";
import { bell, ease, lerp, pop, prog } from "../lib/anim";
import { ConfettiCanvas } from "../lib/canvas";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel, cloudPath } from "./common";

const B = beatsOf("w09");
const EN = { cx: 960, top: 600, w: 460, h: 270 };

/** 纸飞机沿贝塞尔曲线从远处飞来 */
const plane = (f: number) => {
  const t = ease.inOut(prog(f, B.plane, B.land));
  const p0 = [1640, 360];
  const p1 = [1300, 250];
  const p2 = [700, 520];
  const p3 = [EN.cx, EN.top + 150];
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x, y, ang: ang + 180, s: lerp(0.35, 1.05, t), z: lerp(5, 1.5, t) };
};

export const W09: React.FC = () => {
  const { f } = useScene();
  const pl = plane(f);
  const morph = prog(f, B.land - 2, B.unfold + 2);
  const seal = pop(f, B.seal, { damping: 14, stiffness: 200 });
  const sealT = f >= B.seal ? prog(f, B.seal, B.seal + 16) : 0;
  const flapP = ease.backOut(prog(f, B.flap, B.flap + 9));
  const flapAng = 180 * flapP;
  const letter = ease.out(prog(f, B.letter, B.letter + 18));
  const L = EN.cx - EN.w / 2;
  const R = EN.cx + EN.w / 2;
  const T = EN.top;
  const Bt = EN.top + EN.h;
  const letterY = lerp(T + 40, T - 250, letter);

  return (
    <>
      <Panel x={200} y={300} w={1520} h={680} color={lighten(P.fogBlue, 0.2)} at={-2} r={44} order={6} />
      <PopUp x={300} y={330} w={1300} h={260} at={0} order={5}>
        <Paper color={P.cream} z={1} grad={0.06}>
          <path d={cloudPath(420, 470, 0.8)} />
          <path d={cloudPath(1460, 420, 1)} />
        </Paper>
      </PopUp>
      {/* 纸飞机 */}
      {morph < 1 && (
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: 1 - morph }}>
          <LiftContext.Provider value={1}>
            <g transform={`translate(${pl.x} ${pl.y}) rotate(${(((pl.ang + 540) % 360) - 180) * 0.6}) scale(${pl.s} ${pl.s * (1 - 0.6 * morph)})`}>
              <Paper color={BASE.white} z={pl.z} grad={0.08}>
                <path d="M110 -6 L-120 0 L60 40 Z" />
              </Paper>
              <Paper color={darken(BASE.white, 0.12)} z={pl.z + 0.2} grad={0.06} filter="paper-fine">
                <path d="M110 -6 L-120 0 L40 -40 Z" />
              </Paper>
              <Paper color={lighten(P.fogBlue, 0.3)} z={pl.z + 0.3} grad={0.06} filter="paper-fine">
                <path d="M110 -6 L-120 0 L30 10 Z" />
              </Paper>
            </g>
          </LiftContext.Provider>
        </svg>
      )}
      {/* 信封 */}
      <PopUp x={L - 20} y={T - 300} w={EN.w + 40} h={EN.h + 320} at={B.unfold} order={2} spring={{ damping: 12, stiffness: 200, mass: 0.6 }}>
        {/* 信封内侧（背） */}
        <Paper color={darken(P.cream, 0.08)} z={1.6} grad={0.08}>
          <rect x={L} y={T} width={EN.w} height={EN.h} rx={10} />
        </Paper>
        {/* 打开后的封盖（翻到上面） */}
        {flapAng > 90 && (
          <g style={{ transformBox: "view-box", transformOrigin: `${EN.cx}px ${T}px`, transform: `scaleY(${-Math.cos((flapAng * Math.PI) / 180)})` }}>
            <Paper color={darken(P.cream, 0.04)} z={1.7} grad={0.08} filter="paper-fine">
              <path d={`M${L} ${T} L${R} ${T} L${EN.cx} ${T - 150} Z`} />
            </Paper>
          </g>
        )}
        {/* 信纸 */}
        {letter > 0 && (
          <g>
            <defs>
              <clipPath id="w09pocket">
                <rect x={L - 40} y={-200} width={EN.w + 80} height={T + 130 + 200} />
              </clipPath>
            </defs>
            <g clipPath="url(#w09pocket)">
              <Paper color={BASE.white} z={2} grad={0.04}>
                <rect x={L + 40} y={letterY} width={EN.w - 80} height={300} rx={6} />
              </Paper>
              <g stroke={darken(P.fogBlue, 0.3)} strokeWidth={4} strokeLinecap="round" opacity={0.55} filter="url(#paper-fine)">
                {[0, 1, 2, 3, 4].map((i) => (
                  <path key={i} d={`M${L + 80} ${letterY + 60 + i * 38} L${R - 80 - (i === 4 ? 140 : (i * 37) % 60)} ${letterY + 60 + i * 38}`} />
                ))}
              </g>
              <Paper color={P.vermilion} z={2.2} filter="paper-fine" grad={0.08}>
                <path d={`M${R - 110} ${letterY + 248} c-10 -14 -30 -6 -24 10 c4 10 24 22 24 22 c0 0 20 -12 24 -22 c6 -16 -14 -24 -24 -10 Z`} />
              </Paper>
            </g>
          </g>
        )}
        {/* 信封正面口袋 */}
        <Paper color={P.cream} z={2.4} grad={0.1}>
          <path d={`M${L} ${T + 20} L${EN.cx} ${T + 150} L${R} ${T + 20} L${R} ${Bt} L${L} ${Bt} Z`} />
        </Paper>
        <path d={`M${L + 6} ${Bt - 4} L${EN.cx} ${T + 160} L${R - 6} ${Bt - 4}`} fill="none" stroke={darken(P.cream, 0.15)} strokeWidth={3} filter="url(#paper-fine)" />
        {/* 合着的封盖 */}
        {flapAng <= 90 && (
          <g style={{ transformBox: "view-box", transformOrigin: `${EN.cx}px ${T}px`, transform: `scaleY(${Math.cos((flapAng * Math.PI) / 180).toFixed(4)})` }}>
            <Paper color={lighten(P.cream, 0.15)} z={2.8} grad={0.1}>
              <path d={`M${L} ${T} L${R} ${T} L${EN.cx} ${T + 160} Z`} />
            </Paper>
          </g>
        )}
        {/* 火漆印 */}
        {sealT < 1 && (
          <g
            transform={`translate(${EN.cx + 140 * ease.out(sealT)} ${T + 150 - 180 * Math.sin(Math.PI * sealT * 0.8)}) rotate(${300 * sealT}) scale(${1 + 0.35 * bell(f, B.seal - 3, B.seal + 3)})`}
            opacity={1 - prog(sealT, 0.6, 1)}
          >
            <LiftContext.Provider value={1 + 1.5 * sealT}>
              <Paper color={P.vermilion} z={3 + seal * 2.5 * sealT} grad={0.18} filter="paper-fine">
                <path d={Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  const r = i % 2 ? 30 : 36;
                  return `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
                }).join(" ") + " Z"} />
              </Paper>
              <circle r={17} fill="none" stroke={lighten(P.vermilion, 0.4)} strokeWidth={3} opacity={0.8} />
            </LiftContext.Provider>
          </g>
        )}
        {/* “啵” */}
        {f >= B.seal && f < B.seal + 7 &&
          [0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const r = 50 + (f - B.seal) * 8;
            return <path key={i} d={`M${EN.cx + Math.cos(a) * r} ${T + 150 + Math.sin(a) * r} l${Math.cos(a) * 16} ${Math.sin(a) * 16}`} stroke={P.vermilion} strokeWidth={6} strokeLinecap="round" opacity={1 - (f - B.seal) / 7} />;
          })}
      </PopUp>
      <Ground y={925} color={P.sage} back={P.cream} at={-3} seed={9} order={0} amp={16} />
      <ConfettiCanvas t={f - B.confetti} mode="fall" count={110} seed={9} x={200} width={1520} y={-30} />
    </>
  );
};
