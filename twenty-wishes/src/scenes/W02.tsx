// 2. 愿你的角色，从第一镜到最后一镜都是同一张脸。
// 一排六张纸卡片背面朝上，从左到右依次翻过来，每张都是同一个纸人头像。最后一张翻开时，六张一起轻轻跳一下。
import React from "react";
import { BASE } from "../config";
import { bell, clamp, pop } from "../lib/anim";
import { PaperHead } from "../lib/figure";
import { Paper, lighten } from "../lib/paper";
import { FlipCard, popAngle, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel, starPath } from "./common";

const B = beatsOf("w02");
const CW = 200;
const CH = 272;
const GAP = 36;
const X0 = (1920 - (6 * CW + 5 * GAP)) / 2;
const Y = 470;

export const W02: React.FC = () => {
  const { f, foldOut } = useScene();
  return (
    <>
      <Panel x={170} y={330} w={1580} h={660} color={P.cream} at={-2} r={40} order={8} />
      {Array.from({ length: 6 }, (_, i) => {
        const x = X0 + i * (CW + GAP);
        const rise = popAngle(f, B.rise + i, foldOut, 6 - i);
        if (rise >= 89.6) return null;
        const at = B.flip + i * B.flipStep;
        const s = pop(f, at, { damping: 12, stiffness: 170, mass: 0.6 });
        const flip = 180 * (1 - s);
        const hop = -26 * bell(f, at - 1, at + B.flipDur) - 34 * bell(f, B.jump + i * 0.8, B.jump + 11 + i * 0.8);
        const lift = clamp(1 - rise / 88) * (1 + 0.6 * bell(f, at, at + B.flipDur));
        const cx = x + CW / 2;
        const cy = Y + CH / 2;
        const front = (
          <>
            <Paper color={BASE.white} z={1.6} grad={0.06}>
              <rect x={x} y={Y} width={CW} height={CH} rx={14} />
            </Paper>
            <Paper color={lighten(P.sakura, 0.15)} z={1.7} filter="paper-fine" grad={0.08}>
              <rect x={x + 14} y={Y + 14} width={CW - 28} height={CH - 28} rx={10} />
            </Paper>
            <PaperHead x={cx} y={cy - 6} s={1.25} z={1.9} />
          </>
        );
        const back = (
          <>
            <Paper color={P.fogBlue} z={1.6} grad={0.1}>
              <rect x={x} y={Y} width={CW} height={CH} rx={14} />
            </Paper>
            <g fill="none" stroke={lighten(P.fogBlue, 0.5)} strokeWidth={3} opacity={0.75} filter="url(#paper-fine)">
              <rect x={x + 14} y={Y + 14} width={CW - 28} height={CH - 28} rx={10} />
              {Array.from({ length: 5 }, (_, k) => (
                <path key={k} d={`M${x + 14} ${Y + 40 + k * 48} L${x + CW - 14} ${Y + 64 + k * 48}`} />
              ))}
            </g>
            <Paper color={P.cream} z={1.8} filter="paper-fine" grad={0}>
              <path d={starPath(cx, cy, 22)} />
            </Paper>
          </>
        );
        return (
          <FlipCard
            key={i}
            x={x}
            y={Y}
            w={CW}
            h={CH}
            origin="50% 100%"
            pre={`translateY(${hop.toFixed(2)}px) rotateX(${rise.toFixed(2)}deg)`}
            flip={flip}
            lift={lift}
            front={front}
            back={back}
          />
        );
      })}
      <Ground y={930} color={P.fogBlue} back={P.sakura} at={-3} seed={2} order={0} amp={16} />
    </>
  );
};

