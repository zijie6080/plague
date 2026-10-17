// 6. 愿你的项目，再也不卡在 70%。
// 纸进度条走到 70% 卡住，抖两下，然后“嗖”地冲到 100%，炸出一团彩纸屑。上方数字跟着滚动。
import React from "react";
import { FONTS } from "../config";
import { ease, prog, pop, wobble } from "../lib/anim";
import { ConfettiCanvas } from "../lib/canvas";
import { Paper, mix } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel } from "./common";

const B = beatsOf("w06");
const X0 = 380;
const BW = 1160;
const BY = 668;
const BH = 84;

const value = (f: number) => {
  if (f < B.at70) return 70 * ease.out(prog(f, B.fill, B.at70));
  if (f < B.dash) return 70;
  return 70 + 30 * ease.in(prog(f, B.dash, B.full));
};

/** 滚动数字：只画当前与下一位两个字形 */
const Digit: React.FC<{ x: number; y: number; v: number; size: number; color: string }> = ({ x, y, v, size, color }) => {
  const d = Math.floor(v) % 10;
  const frac = v - Math.floor(v);
  const step = size * 1.05;
  const id = `dclip-${Math.round(x)}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x - size * 0.4} y={y - size * 0.95} width={size * 0.8} height={size * 1.18} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <Paper color={color} z={1.6} filter="paper-fine" grad={0.08}>
          <text x={x} y={y - frac * step} fontSize={size} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900}>
            {d}
          </text>
          <text x={x} y={y + step - frac * step} fontSize={size} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900}>
            {(d + 1) % 10}
          </text>
        </Paper>
      </g>
    </g>
  );
};

export const W06: React.FC = () => {
  const { f } = useScene();
  const v = value(f);
  const shake = wobble(f, B.shake1, 9, 2.2, 0.32) + wobble(f, B.shake2, 11, 2.2, 0.32);
  const done = prog(f, B.full, B.full + 6);
  const fillCol = mix(P.apricot, P.sage, done);
  const fw = Math.max(0, (BW - 20) * (v / 100));
  // 进度条纹理条纹：加载时移动，卡住时不动，冲刺时飞快
  const stripeShift = f < B.at70 ? f * 3 : f < B.dash ? B.at70 * 3 : B.at70 * 3 + (f - B.dash) * 26;

  // 数字（个/十/百位）
  const units = v % 10;
  const tens = Math.floor(v / 10) % 10 + Math.max(0, Math.min(1, (v % 10) - 9));
  const hundredOn = prog(v, 99, 100);
  const size = 168;
  const cx = 960 + hundredOn * size * 0.33;
  const numPop = 1 + 0.16 * Math.sin(Math.PI * prog(f, B.full, B.full + 10)) - 0.04 * (1 - pop(f, B.full));
  const dash = prog(f, B.dash, B.full) * (1 - prog(f, B.full + 2, B.full + 10));

  return (
    <>
      <Panel x={250} y={320} w={1420} h={660} color={P.fogBlue} at={0} r={44} order={4} />
      {/* 数字 */}
      <PopUp x={560} y={350} w={800} h={260} at={3} order={2} extra={`translateX(${shake * 0.5}px)`}>
        <g transform={`translate(${cx} 570) scale(${numPop}) translate(${-cx} -570)`}>
          <g opacity={hundredOn}>
            <Digit x={cx - size * 1.32} y={570} v={Math.min(1, Math.max(0, v - 99))} size={size} color={P.ink} />
          </g>
          <Digit x={cx - size * 0.66} y={570} v={hundredOn > 0.5 ? (tens % 10) : tens} size={size} color={P.ink} />
          <Digit x={cx} y={570} v={units} size={size} color={P.ink} />
          <Paper color={P.vermilion} z={1.6} filter="paper-fine" grad={0.08}>
            <text x={cx + size * 0.5} y={570} fontSize={size * 0.62} fontFamily={`"${FONTS.serif}"`} fontWeight={900}>
              %
            </text>
          </Paper>
        </g>
      </PopUp>
      {/* 进度条 */}
      <PopUp x={X0 - 20} y={BY - 20} w={BW + 40} h={BH + 60} at={1} order={1} extra={`translateX(${shake}px) rotate(${shake * 0.08}deg)`}>
        <Paper color={P.cream} z={1.2} grad={0.08}>
          <rect x={X0} y={BY} width={BW} height={BH} rx={BH / 2} />
        </Paper>
        <rect x={X0 + 8} y={BY + 8} width={BW - 16} height={BH - 16} rx={(BH - 16) / 2} fill="#5a3a2a" opacity={0.1} filter="url(#paper-fine)" />
        {fw > 2 && (
          <>
            <defs>
              <clipPath id="w06fill">
                <rect x={X0 + 10} y={BY + 10} width={fw} height={BH - 20} rx={(BH - 20) / 2} />
              </clipPath>
            </defs>
            <Paper color={fillCol} z={2} grad={0.12}>
              <rect x={X0 + 10} y={BY + 10} width={fw} height={BH - 20} rx={(BH - 20) / 2} />
            </Paper>
            <g clipPath="url(#w06fill)" opacity={0.22}>
              {Array.from({ length: 34 }, (_, i) => {
                const sx = X0 - 120 + i * 44 + (stripeShift % 44);
                return <path key={i} d={`M${sx} ${BY + BH} L${sx + 22} ${BY + BH} L${sx + 62} ${BY} L${sx + 40} ${BY} Z`} fill="#fff" />;
              })}
            </g>
          </>
        )}
        {/* 冲刺时的速度线 */}
        {dash > 0.01 &&
          [0, 1, 2].map((k) => (
            <Paper key={k} color={P.cream} z={2.4} filter="paper-fine" grad={0} opacity={dash}>
              <rect x={X0 + fw - 260 - k * 70} y={BY - 34 + k * 64} width={200 - k * 30} height={9} rx={4.5} />
            </Paper>
          ))}
      </PopUp>
      <Ground y={905} color={P.sage} at={0} seed={6} order={0} amp={20} />
      <ConfettiCanvas t={f - B.full} mode="burst" x={X0 + BW - 30} y={BY + 30} count={110} seed={6} power={30} spread={Math.PI * 1.25} angle={-Math.PI / 2 - 0.25} />
    </>
  );
};
