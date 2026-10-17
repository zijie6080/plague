// 10. 愿你的注意力，够分给所有你想做的事。
// 纸人抛接五个纸球（胶片、代码括号、书、手机、星星），五个球绕着他稳稳地转，一个也没掉。
import React from "react";
import { FONTS } from "../config";
import { clamp, ease, lerp, prog } from "../lib/anim";
import { PaperFigure, POSE, blendPose } from "../lib/figure";
import { LiftContext, Paper, lighten } from "../lib/paper";
import { PopUp, useExit, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel, starPath } from "./common";

const B = beatsOf("w10");
const C = { x: 960, y: 560, rx: 340, ry: 215 };
const PERIOD = 54; // 转一圈的帧数
const R = 56;
const BALLS = [
  { c: P.sage, icon: "film" },
  { c: P.fogBlue, icon: "code" },
  { c: P.apricot, icon: "book" },
  { c: P.lilac, icon: "phone" },
  { c: P.vermilion, icon: "star" },
] as const;
const GROUND = 880;

const Icon: React.FC<{ kind: string }> = ({ kind }) => {
  const col = P.cream;
  switch (kind) {
    case "film":
      return (
        <Paper color={col} z={0.3} filter="paper-fine" grad={0}>
          <path d="M-26 -20 h52 v40 h-52 Z M-20 -16 v6 h6 v-6 Z M-6 -16 v6 h6 v-6 Z M8 -16 v6 h6 v-6 Z M-20 10 v6 h6 v-6 Z M-6 10 v6 h6 v-6 Z M8 10 v6 h6 v-6 Z" fillRule="evenodd" />
        </Paper>
      );
    case "code":
      return (
        <Paper color={col} z={0.3} filter="fiber" grad={0}>
          <text x={0} y={13} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={40}>
            {"</>"}
          </text>
        </Paper>
      );
    case "book":
      return (
        <Paper color={col} z={0.3} filter="paper-fine" grad={0}>
          <path d="M-28 -18 C-16 -24 -6 -22 -2 -16 L-2 22 C-8 16 -18 15 -28 20 Z M2 -16 C6 -22 16 -24 28 -18 L28 20 C18 15 8 16 2 22 Z" />
        </Paper>
      );
    case "phone":
      return (
        <Paper color={col} z={0.3} filter="paper-fine" grad={0}>
          <path d="M-16 -28 h32 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-32 a6 6 0 0 1 -6 -6 v-44 a6 6 0 0 1 6 -6 Z M-14 -20 v34 h28 v-34 Z" fillRule="evenodd" />
        </Paper>
      );
    default:
      return (
        <Paper color={col} z={0.3} filter="paper-fine" grad={0}>
          <path d={starPath(0, 2, 28)} />
        </Paper>
      );
  }
};

export const W10: React.FC = () => {
  const { f } = useScene();
  const exit = useExit(1);
  const phase0 = (f / PERIOD) * Math.PI * 2;
  const balls = BALLS.map((b, i) => {
    const appear = B.toss + i * B.tossStep;
    const a = phase0 + (i / BALLS.length) * Math.PI * 2 + Math.PI / 2;
    const ox = C.x + Math.cos(a) * C.rx;
    const oy = C.y + Math.sin(a) * C.ry;
    // 从手里抛出来，飞到轨道上
    const t = ease.out(prog(f, appear, appear + 9));
    const hx = C.x + (i % 2 ? 46 : -46);
    const hy = GROUND - 175;
    const x = lerp(hx, ox, t);
    const y = lerp(hy, oy, t) - 60 * Math.sin(Math.PI * t);
    const depth = Math.sin(a); // >0 在前面
    return { ...b, i, x, y, depth, visible: f >= appear, spin: (a * 180) / Math.PI * 0.25, sc: 0.92 + 0.12 * depth, t };
  });
  // 手臂跟着节奏一上一下
  const k = Math.sin(phase0 * 2.5);
  const juggle = clamp(prog(f, B.toss - 2, B.toss + 4));
  const pose = blendPose(POSE.stand, { armF: [120 + 30 * k, 40], armB: [120 - 30 * k, 40], legF: [4, 0], legB: [-4, 0], lean: 0 }, juggle);
  const bob = -6 * Math.abs(Math.sin(phase0 * 2.5)) * juggle;

  const renderBall = (b: (typeof balls)[number]) =>
    b.visible && (
      <LiftContext.Provider key={b.i} value={1}>
        <g transform={`translate(${b.x} ${b.y}) scale(${b.sc}) rotate(${b.spin})`} opacity={clamp(b.t * 4)}>
          <Paper color={b.c} z={2.6 + b.depth * 0.8} grad={0.18}>
            <circle r={R} />
          </Paper>
          <circle r={R - 9} fill="none" stroke={lighten(b.c, 0.35)} strokeWidth={3} opacity={0.6} />
          <Icon kind={b.icon} />
        </g>
      </LiftContext.Provider>
    );

  return (
    <>
      <Panel x={220} y={300} w={1480} h={680} color={P.cream} at={-2} r={44} order={6} />
      {/* 轨道虚线（剪纸小点） */}
      <PopUp x={C.x - C.rx - 20} y={C.y - C.ry - 20} w={C.rx * 2 + 40} h={C.ry * 2 + 40} at={0} order={4}>
        <g fill={lighten(P.apricot, 0.2)} filter="url(#paper-fine)">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            return <circle key={i} cx={C.x + Math.cos(a) * C.rx} cy={C.y + Math.sin(a) * C.ry} r={4} />;
          })}
        </g>
      </PopUp>
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: exit }}>
        {balls.filter((b) => b.depth <= 0).map(renderBall)}
      </svg>
      <PopUp x={860} y={560} w={200} h={340} at={0} order={2}>
        <PaperFigure x={C.x} y={GROUND + bob} s={1.15} pose={pose} z={2.2} wind={f * 0.25} />
      </PopUp>
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: exit }}>
        {balls.filter((b) => b.depth > 0).map(renderBall)}
      </svg>
      <Ground y={910} color={P.sage} back={P.sakura} at={-3} seed={10} order={0} amp={14} />
    </>
  );
};
