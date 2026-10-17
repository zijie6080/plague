// 11. 愿你同时开着的那些线，都有收尾的一天。
// 画面上方垂下许多根松散的纸线头。一根接一根，被系成整齐的小蝴蝶结。
import React from "react";
import { clamp, ease, pop, prog } from "../lib/anim";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { hash } from "../lib/rand";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P } from "./common";

const B = beatsOf("w11");
const RAIL = { x0: 250, x1: 1670, y: 262 };
const COLS = [P.vermilion, P.apricot, P.sage, P.fogBlue, P.lilac, P.pine, P.apricot, P.vermilion, P.sage];
const N = COLS.length;

const Bow: React.FC<{ x: number; y: number; c: string; s: number }> = ({ x, y, c, s }) => (
  <LiftContext.Provider value={clamp(s, 0, 1.2)}>
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Paper color={darken(c, 0.12)} z={2.4} grad={0.1} filter="paper-fine">
        <path d="M-6 6 C-14 26 -22 44 -30 60 L-18 62 C-10 46 -4 30 0 12 Z M6 6 C14 26 22 44 30 60 L18 62 C10 46 4 30 0 12 Z" />
      </Paper>
      <Paper color={c} z={2.6} grad={0.14} filter="paper-fine">
        <path d="M0 0 C-14 -30 -52 -34 -54 -6 C-56 20 -20 18 0 0 Z M0 0 C14 -30 52 -34 54 -6 C56 20 20 18 0 0 Z" />
      </Paper>
      <Paper color={lighten(c, 0.2)} z={2.8} grad={0.1} filter="paper-fine">
        <ellipse cx={0} cy={0} rx={11} ry={13} />
      </Paper>
    </g>
  </LiftContext.Provider>
);

export const W11: React.FC = () => {
  const { f } = useScene();
  const threads = Array.from({ length: N }, (_, i) => {
    const x = RAIL.x0 + 90 + i * ((RAIL.x1 - RAIL.x0 - 180) / (N - 1));
    const len = 330 + hash("w11len", i) * 220;
    const at = B.tie0 + i * B.tieStep;
    const tie = ease.inOut(prog(f, at - 4, at + 3));
    const bow = pop(f, at + 1, { damping: 10, stiffness: 240, mass: 0.6 });
    const ph = hash("w11ph", i) * 6.28;
    const amp = 30 * (1 - tie);
    const unroll = ease.out(prog(f, -4 + i * 0.8, 8 + i * 0.8));
    const L = (len - 26 * tie) * Math.max(0.02, unroll);
    const pts: string[] = [];
    const n = 18;
    let ex = x;
    let ey = RAIL.y;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const yy = RAIL.y + u * L;
      // 松散时弯弯曲曲、末端飘；系好后笔直，只剩极轻的摆动
      const sway = Math.sin(u * 7 + f * 0.09 + ph) * amp * u + Math.sin(f * 0.05 + ph) * (6 + 10 * (1 - tie)) * u;
      const xx = x + sway;
      pts.push(`${k ? "L" : "M"}${xx.toFixed(1)} ${yy.toFixed(1)}`);
      ex = xx;
      ey = yy;
    }
    // 散开的线头
    const fray = 1 - tie;
    return { x, c: COLS[i], d: pts.join(" "), ex, ey, fray, bow, at };
  });

  return (
    <>
      {/* 背后的帘子 */}
      <PopUp x={200} y={290} w={1520} h={700} at={-2} order={6}>
        <Paper color={P.sakura} z={0.5} grad={0.06}>
          <path d="M200 990 L200 420 C200 340 260 300 340 300 L1580 300 C1660 300 1720 340 1720 420 L1720 990 Z" />
        </Paper>
      </PopUp>
      {/* 线 */}
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
        {threads.map((t, i) => (
          <g key={i}>
            <Paper color={t.c} z={1.6} line={8} filter="paper-line" grad={0}>
              <path d={t.d} />
            </Paper>
            {t.fray > 0.02 && (
              <g opacity={t.fray}>
                <Paper color={t.c} z={1.6} line={4} filter="paper-line" grad={0}>
                  <path d={`M${t.ex} ${t.ey} l-10 22 M${t.ex} ${t.ey} l9 20 M${t.ex} ${t.ey} l1 24`} />
                </Paper>
              </g>
            )}
            {f >= t.at && <Bow x={t.ex} y={t.ey + 4} c={t.c} s={t.bow} />}
          </g>
        ))}
      </svg>
      {/* 横杆 */}
      <PopUp x={RAIL.x0 - 20} y={RAIL.y - 30} w={RAIL.x1 - RAIL.x0 + 40} h={60} at={0} order={2}>
        <Paper color={P.ink} z={2.2} grad={0.12}>
          <rect x={RAIL.x0} y={RAIL.y - 14} width={RAIL.x1 - RAIL.x0} height={28} rx={14} />
        </Paper>
        <Paper color={P.cream} z={2.4} filter="paper-fine" grad={0}>
          {threads.map((t, i) => (
            <circle key={i} cx={t.x} cy={RAIL.y} r={7} />
          ))}
        </Paper>
      </PopUp>
      <Ground y={940} color={P.lilac} back={P.cream} at={-3} seed={11} order={0} amp={12} />
    </>
  );
};
