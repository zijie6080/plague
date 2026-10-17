// 19. 愿二十岁的你，比十九岁的你更自由。
// 一本摊开的纸书，书页一张张掀起，变成一只只纸鸟，扑棱着飞向开阔的天空，越飞越高、越飞越远。
import React from "react";
import { BASE } from "../config";
import { clamp, ease, lerp, prog } from "../lib/anim";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { hash } from "../lib/rand";
import { PopUp, RiseGroup, useExit, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, cloudPath } from "./common";

const B = beatsOf("w19");
const BK = { spine: 960, top: 640, bottom: 870, pw: 340 };
const PAGE_COLS = [P.apricot, P.vermilion, P.sakura, P.sage, P.lilac, P.cream, P.apricot];
const LIFT_DUR = 14;

const pagePath = (x0: number, w: number, dir: 1 | -1) => {
  const x1 = x0 + w * dir;
  return `M${x0} ${BK.top + 14} C${x0 + w * 0.3 * dir} ${BK.top - 6} ${x0 + w * 0.7 * dir} ${BK.top + 4} ${x1} ${BK.top} L${x1} ${BK.bottom - 14} C${x0 + w * 0.7 * dir} ${BK.bottom - 18} ${x0 + w * 0.3 * dir} ${BK.bottom - 26} ${x0} ${BK.bottom} Z`;
};

/** 纸鸟：身体 + 两只扇动的翅膀 */
const Bird: React.FC<{ x: number; y: number; s: number; flap: number; col: string; heading: number }> = ({ x, y, s, flap, col, heading }) => {
  const up = Math.sin(flap);
  return (
    <g transform={`translate(${x} ${y}) rotate(${heading}) scale(${s})`}>
      <Paper color={darken(col, 0.12)} z={3} grad={0.08} filter="paper-fine">
        <path d={`M-6 0 L-40 ${-46 * up - 6} L18 -4 Z`} />
      </Paper>
      <Paper color={col} z={3.2} grad={0.08} filter="paper-fine">
        <path d="M-56 4 L8 -10 L60 -2 L74 -16 L70 4 L10 14 Z" />
      </Paper>
      <Paper color={lighten(col, 0.1)} z={3.4} grad={0.06} filter="paper-fine">
        <path d={`M-4 2 L-30 ${52 * up * 0.6 - 40 * Math.max(0, up)} L22 2 Z`} />
      </Paper>
    </g>
  );
};

export const W19: React.FC = () => {
  const { f } = useScene();
  const exit = useExit(1);
  const n = B.pages;
  const far = ease.inOut(prog(f, B.far, B.far + 40));

  const birds = Array.from({ length: n }, (_, i) => {
    const at = B.page0 + i * B.pageStep;
    const born = at + LIFT_DUR - 2;
    const t = f - born;
    const side = i % 2 ? -1 : 1;
    const ex = 960 + side * (200 + hash("bx", i) * 560);
    const ey = 300 + hash("by", i) * 160;
    const sx = BK.spine + BK.pw * 0.5;
    const sy = (BK.top + BK.bottom) / 2 - 40;
    const u = ease.inOut(clamp(t / 56));
    // 二次贝塞尔：先往上冲，再拐向远方
    const cx = lerp(sx, ex, 0.2);
    const cy = sy - 260;
    const x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex + Math.max(0, t - 56) * side * 0.6;
    const y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey - Math.max(0, t - 56) * 0.9;
    const s = lerp(1.35, 0.5, u) * (1 - 0.35 * clamp((t - 56) / 60)) * (1 - 0.3 * far);
    const heading = side * lerp(-8, 6, u);
    return { i, t, x, y, s, flap: f * (0.55 + hash("bf", i) * 0.2) + i, col: PAGE_COLS[i % PAGE_COLS.length], heading };
  });

  return (
    <>
      {/* 天空 */}
      <PopUp x={140} y={280} w={1640} h={700} at={-2} order={8}>
        <defs>
          <linearGradient id="w19sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lighten(P.fogBlue, 0.2)} />
            <stop offset="1" stopColor={lighten(P.sakura, 0.35)} />
          </linearGradient>
        </defs>
        <Paper color={lighten(P.fogBlue, 0.25)} z={0.5} grad={0}>
          <rect x={140} y={280} width={1640} height={700} rx={44} fill="url(#w19sky)" />
        </Paper>
      </PopUp>
      {/* 云：随着鸟飞远缓缓下沉，像镜头在往上抬 */}
      <PopUp x={200} y={300} w={1520} h={500} at={0} order={6} extra={`translateY(${far * 70}px)`}>
        <Paper color={BASE.white} z={1} grad={0.05}>
          <path d={cloudPath(420, 420, 0.9)} />
          <path d={cloudPath(1480, 380, 1.1)} />
          <path d={cloudPath(980, 520, 0.6)} />
        </Paper>
      </PopUp>
      <PopUp x={200} y={500} w={1520} h={400} at={1} order={5} extra={`translateY(${far * 40}px)`}>
        <Paper color={lighten(P.cream, 0.3)} z={1.4} grad={0.05}>
          <path d={cloudPath(300, 720, 1.2)} />
          <path d={cloudPath(1650, 690, 1)} />
        </Paper>
      </PopUp>
      <RiseGroup pivot={BK.bottom} at={0} order={2}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${far * 30}px)` }}>
          {/* 书 */}
          <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
            <Paper color={P.vermilion} z={1.8} grad={0.12}>
              <path d={`M${BK.spine - BK.pw - 18} ${BK.top + 8} L${BK.spine + BK.pw + 18} ${BK.top + 8} L${BK.spine + BK.pw + 18} ${BK.bottom + 14} L${BK.spine} ${BK.bottom + 22} L${BK.spine - BK.pw - 18} ${BK.bottom + 14} Z`} />
            </Paper>
            <Paper color={darken(P.cream, 0.04)} z={2} grad={0.08}>
              <path d={pagePath(BK.spine, BK.pw, -1)} />
              <path d={pagePath(BK.spine, BK.pw, 1)} />
            </Paper>
            <g stroke={darken(P.cream, 0.2)} strokeWidth={3} opacity={0.5}>
              {[0, 1, 2, 3, 4].map((k) => (
                <path key={k} d={`M${BK.spine - BK.pw + 40} ${BK.top + 50 + k * 34} L${BK.spine - 40} ${BK.top + 56 + k * 34}`} />
              ))}
            </g>
            <path d={`M${BK.spine} ${BK.top + 14} L${BK.spine} ${BK.bottom}`} stroke={darken(P.cream, 0.3)} strokeWidth={4} />
          </svg>
          {/* 一张张掀起的书页 */}
          {Array.from({ length: n }, (_, i) => {
            const at = B.page0 + i * B.pageStep;
            const p = prog(f, at, at + LIFT_DUR);
            if (p <= 0 || p >= 1) return null;
            const ang = 92 * ease.in(p);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: BK.spine,
                  top: BK.top - 20,
                  width: BK.pw,
                  height: BK.bottom - BK.top + 40,
                  transformOrigin: "0% 60%",
                  transform: `rotateY(${-ang}deg) rotateZ(${-8 * p}deg)`,
                  opacity: 1 - prog(p, 0.75, 1),
                }}
              >
                <LiftContext.Provider value={1 + p}>
                  <svg width={BK.pw} height={BK.bottom - BK.top + 40} viewBox={`${BK.spine} ${BK.top - 20} ${BK.pw} ${BK.bottom - BK.top + 40}`} style={{ position: "absolute", overflow: "visible" }}>
                    <Paper color={PAGE_COLS[i % PAGE_COLS.length]} z={2.4 + p * 2} grad={0.08}>
                      <path d={pagePath(BK.spine, BK.pw, 1)} />
                    </Paper>
                  </svg>
                </LiftContext.Provider>
              </div>
            );
          })}
        </div>
      </RiseGroup>
      {/* 纸鸟 */}
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: exit }}>
        <LiftContext.Provider value={1.6}>
          {birds.map((b) => b.t >= 0 && <g key={b.i} opacity={clamp(b.t / 4)}><Bird x={b.x} y={b.y} s={b.s} flap={b.flap} col={b.col} heading={b.heading} /></g>)}
        </LiftContext.Provider>
      </svg>
      <Ground y={935} color={P.sage} back={lighten(P.sage, 0.35)} at={-3} seed={19} order={0} amp={12} />
    </>
  );
};
