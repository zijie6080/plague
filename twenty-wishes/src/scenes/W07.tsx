// 7. 愿你的 AI 额度，永远用不完。
// 纸电池的电量一格格往下掉，掉到最后一格时，电池“啪”地翻面，变成一个剪纸的「∞」，轻轻摇晃。
import React from "react";
import { clamp, ease, pop, prog, wobble } from "../lib/anim";
import { Paper, lighten, mix } from "../lib/paper";
import { FlipCard, popAngle, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel } from "./common";

const B = beatsOf("w07");
const BT = { x: 640, y: 450, w: 600, h: 290 };
const CELLS = 5;

/** ∞（伯努利双纽线） */
const infinity = (cx: number, cy: number, a: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    pts.push(`${i ? "L" : "M"}${(cx + (a * Math.cos(t)) / d).toFixed(1)} ${(cy + (a * Math.sin(t) * Math.cos(t)) / d).toFixed(1)}`);
  }
  return pts.join(" ") + " Z";
};

export const W07: React.FC = () => {
  const { f, foldOut } = useScene();
  const dropAt = (k: number) => B.drop0 + k * B.dropStep; // 第 k 个掉落（从右往左）
  const left = CELLS - [0, 1, 2, 3].filter((k) => f >= dropAt(k) + 2).length;
  const fillCol = left >= 4 ? P.sage : left >= 3 ? mix(P.sage, P.apricot, 0.6) : left === 2 ? P.apricot : P.vermilion;
  const blink = f >= B.blink && f < B.flip ? (Math.floor((f - B.blink) / 3) % 2 === 0 ? 1 : 0.35) : 1;

  const s = pop(f, B.flip, { damping: 11, stiffness: 150, mass: 0.7 });
  const flip = 180 * s;
  const hop = -40 * Math.sin(Math.PI * clamp(prog(f, B.flip, B.flip + 12)));
  const sway = f > B.flip + 8 ? 5 * Math.sin((f - B.flip - 8) * 0.16) * Math.exp(-(f - B.flip - 8) * 0.015) + wobble(f, B.flip + 8, 3, 0.8, 0.1) : 0;
  const rise = popAngle(f, 2, foldOut, 1);
  if (rise >= 89.6) return <Ground y={930} color={P.pine} back={P.sage} at={-3} seed={7} order={0} amp={16} />;

  const cellW = (BT.w - 70 - (CELLS - 1) * 14) / CELLS;
  const front = (
    <>
      <Paper color={P.cream} z={1.8} grad={0.08}>
        <rect x={BT.x} y={BT.y} width={BT.w} height={BT.h} rx={40} />
        <rect x={BT.x + BT.w - 6} y={BT.y + BT.h / 2 - 50} width={44} height={100} rx={14} />
      </Paper>
      <rect x={BT.x + 18} y={BT.y + 18} width={BT.w - 36} height={BT.h - 36} rx={26} fill="none" stroke={P.ink} strokeWidth={10} filter="url(#paper-fine)" />
      {Array.from({ length: CELLS }, (_, i) => {
        // 最右边先掉
        const k = CELLS - 1 - i;
        const d = k < 4 ? prog(f, dropAt(k), dropAt(k) + 9) : 0;
        if (d >= 1) return null;
        const cx = BT.x + 35 + i * (cellW + 14);
        const e = ease.in(d);
        const ty = e * 300;
        const rot = e * (k % 2 ? 24 : -18);
        return (
          <g key={i} opacity={(1 - prog(d, 0.6, 1)) * (k === 4 ? blink : 1)} transform={`translate(0 ${ty}) rotate(${rot} ${cx + cellW / 2} ${BT.y + BT.h / 2})`}>
            <Paper color={fillCol} z={2.2 + e * 2} grad={0.14} filter="paper-fine">
              <rect x={cx} y={BT.y + 35} width={cellW} height={BT.h - 70} rx={12} />
            </Paper>
          </g>
        );
      })}
    </>
  );
  const back = (
    <>
      <Paper color={P.cream} z={1.8} grad={0.08}>
        <rect x={BT.x} y={BT.y} width={BT.w} height={BT.h} rx={40} />
      </Paper>
      <Paper color={P.vermilion} z={2.6} line={42} filter="paper-line" grad={0.12}>
        <path d={infinity(BT.x + BT.w / 2, BT.y + BT.h / 2, 210)} />
      </Paper>
      <Paper color={lighten(P.vermilion, 0.45)} z={2.8} line={8} filter="paper-line" grad={0}>
        <path d={infinity(BT.x + BT.w / 2, BT.y + BT.h / 2 - 6, 210)} opacity={0.6} />
      </Paper>
    </>
  );
  return (
    <>
      <Panel x={260} y={320} w={1400} h={660} color={P.lilac} at={-2} r={44} order={4} />
      <FlipCard
        x={BT.x}
        y={BT.y}
        w={BT.w}
        h={BT.h}
        origin="50% 50%"
        pre={`translateY(${hop}px) rotate(${sway}deg) rotateX(${rise}deg)`}
        flip={flip}
        lift={clamp(1 - rise / 88) * (1 + 0.8 * Math.sin(Math.PI * clamp(prog(f, B.flip, B.flip + 12))))}
        front={front}
        back={back}
      />
      <Ground y={930} color={P.pine} back={P.sage} at={-3} seed={7} order={0} amp={16} />
    </>
  );
};
