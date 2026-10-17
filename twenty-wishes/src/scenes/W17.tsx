// 17. 愿你喜欢的东西，一直喜欢下去。
// 一棵纸树快速经历四季：粉色花开、绿叶、橙红落叶、白雪覆盖。树下的纸人始终坐在那里，手里拿着一台小相机，姿势一直没变。
import React from "react";
import { BASE } from "../config";
import { clamp, pop, prog } from "../lib/anim";
import { PaperFigure, POSE } from "../lib/figure";
import { LiftContext, Paper, darken, lighten, mix } from "../lib/paper";
import { hash } from "../lib/rand";
import { PopUp, useExit, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P } from "./common";

const B = beatsOf("w17");
const TREE = { x: 1040, base: 900, cx: 1040, cy: 520 };
const SEASONS = [B.spring, B.summer, B.autumn, B.winter];
const SKY = [lighten(P.sakura, 0.35), lighten(P.fogBlue, 0.3), lighten(P.apricot, 0.45), lighten(P.fogBlue, 0.5)];

const BLOBS: [number, number, number][] = [
  [-150, 40, 120],
  [-80, -60, 140],
  [40, -100, 150],
  [150, -20, 130],
  [100, 70, 120],
  [-30, 50, 140],
];

const Canopy: React.FC<{ f: number; at: number; out: number; cols: [string, string]; dots?: string; seed: number }> = ({ f, at, out, cols, dots, seed }) => {
  if (f < at - 1) return null;
  const s = pop(f, at, { damping: 12, stiffness: 150 });
  const o = 1 - prog(f, out, out + 6);
  if (o <= 0) return null;
  const sc = (0.55 + 0.45 * clamp(s, 0, 1.08)) * (1 - 0.15 * prog(f, out, out + 6));
  return (
    <LiftContext.Provider value={clamp(s, 0, 1.1)}>
      <g opacity={o} transform={`translate(${TREE.cx} ${TREE.cy}) scale(${sc}) translate(${-TREE.cx} ${-TREE.cy})`}>
        <Paper color={cols[0]} z={2} grad={0.14}>
          {BLOBS.map(([dx, dy, r], i) => (
            <circle key={i} cx={TREE.cx + dx * 1.05} cy={TREE.cy + dy} r={r} />
          ))}
        </Paper>
        <Paper color={cols[1]} z={2.4} grad={0.14}>
          {BLOBS.slice(1, 5).map(([dx, dy, r], i) => (
            <circle key={i} cx={TREE.cx + dx * 0.8 + 10} cy={TREE.cy + dy + 30} r={r * 0.72} />
          ))}
        </Paper>
        {dots && (
          <Paper color={dots} z={2.7} filter="paper-fine" grad={0}>
            {Array.from({ length: 22 }, (_, i) => {
              const a = hash("dot", seed, i) * Math.PI * 2;
              const rr = Math.sqrt(hash("dr", seed, i)) * 200;
              return <circle key={i} cx={TREE.cx + Math.cos(a) * rr * 1.2} cy={TREE.cy - 10 + Math.sin(a) * rr * 0.7} r={7 + hash("ds", seed, i) * 6} />;
            })}
          </Paper>
        )}
      </g>
    </LiftContext.Provider>
  );
};

/** 秋天的落叶、冬天的雪 */
const Falling: React.FC<{ f: number; at: number; until: number; kind: "leaf" | "snow" }> = ({ f, at, until, kind }) => {
  const t = f - at;
  if (t < 0 || f > until + 30) return null;
  const fade = 1 - prog(f, until, until + 30);
  return (
    <g opacity={fade}>
      {Array.from({ length: kind === "leaf" ? 14 : 34 }, (_, i) => {
        const d = hash(kind, "d", i) * 20;
        const tt = t - d;
        if (tt < 0) return null;
        const x0 = kind === "leaf" ? TREE.cx + (hash(kind, "x", i) - 0.5) * 420 : 260 + hash(kind, "x", i) * 1400;
        const y0 = kind === "leaf" ? TREE.cy + (hash(kind, "y", i) - 0.3) * 160 : 260 + hash(kind, "y", i) * 120;
        const vy = kind === "leaf" ? 3 + hash(kind, "v", i) * 2 : 2 + hash(kind, "v", i) * 2.2;
        const x = x0 + Math.sin(tt * 0.12 + i) * (kind === "leaf" ? 30 : 12) + tt * 0.8;
        const y = y0 + vy * tt;
        if (y > 900) return null;
        if (kind === "snow")
          return <circle key={i} cx={x} cy={y} r={4 + hash("sr", i) * 4} fill={BASE.white} opacity={0.9} />;
        const col = i % 2 ? P.vermilion : P.apricot;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${tt * 8 + i * 40})`}>
            <Paper color={col} z={2.6} filter="paper-fine" grad={0.1}>
              <path d="M0 -12 C10 -6 10 6 0 12 C-10 6 -10 -6 0 -12 Z" />
            </Paper>
          </g>
        );
      })}
    </g>
  );
};

export const W17: React.FC = () => {
  const { f } = useScene();
  const exit = useExit(2);
  // 天空颜色随季节过渡
  let si = 0;
  for (let i = 0; i < 4; i++) if (f >= SEASONS[i]) si = i;
  const prev = SKY[Math.max(0, si - 1)];
  const sky = mix(prev, SKY[si], si === 0 ? 1 : clamp(prog(f, SEASONS[si], SEASONS[si] + 10)));
  const winter = pop(f, B.winter + 4, { damping: 14, stiffness: 160 });
  const autumnGround = pop(f, B.autumn + 6, { damping: 14, stiffness: 160 });

  return (
    <>
      <PopUp x={220} y={290} w={1480} h={690} at={-2} order={8}>
        <Paper color={sky} z={0.6} grad={0.06}>
          <path d="M220 980 L220 540 C220 380 420 300 960 300 C1500 300 1700 380 1700 540 L1700 980 Z" />
        </Paper>
      </PopUp>
      {/* 树干 */}
      <PopUp x={880} y={360} w={320} h={560} at={0} order={4}>
        <Paper color={darken(P.apricot, 0.55)} z={1.8} grad={0.12}>
          <path d={`M${TREE.x - 26} ${TREE.base} C${TREE.x - 20} 760 ${TREE.x - 14} 640 ${TREE.x - 8} 540 L${TREE.x - 90} 440 L${TREE.x - 74} 430 L${TREE.x - 2} 510 L${TREE.x + 4} 400 L${TREE.x + 18} 400 L${TREE.x + 16} 520 L${TREE.x + 90} 450 L${TREE.x + 102} 462 L${TREE.x + 18} 560 C${TREE.x + 20} 660 ${TREE.x + 24} 780 ${TREE.x + 30} ${TREE.base} Z`} />
        </Paper>
        {/* 冬天枝头的雪 */}
        {f >= B.winter && (
          <LiftContext.Provider value={clamp(winter)}>
            <g opacity={clamp(winter * 2)}>
              <Paper color={BASE.white} z={2.1} filter="paper-fine" grad={0.04}>
                <path d={`M${TREE.x - 96} 438 c8 -12 22 -10 26 -4 c-8 4 -18 6 -26 4 Z M${TREE.x + 84} 448 c10 -12 24 -8 26 0 c-10 4 -18 4 -26 0 Z M${TREE.x - 4} 400 c6 -12 22 -12 26 0 c-8 4 -18 4 -26 0 Z`} />
              </Paper>
            </g>
          </LiftContext.Provider>
        )}
      </PopUp>
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: exit }}>
        <Canopy f={f} at={B.spring} out={B.summer} cols={[P.sakura, lighten(P.sakura, 0.25)]} dots={BASE.white} seed={1} />
        <Canopy f={f} at={B.summer} out={B.autumn} cols={[P.sage, P.pine]} seed={2} />
        <Canopy f={f} at={B.autumn} out={B.winter} cols={[P.apricot, P.vermilion]} dots={lighten(P.apricot, 0.4)} seed={3} />
        <Falling f={f} at={B.autumn + 4} until={B.winter + 6} kind="leaf" />
        <Falling f={f} at={B.winter} until={9999} kind="snow" />
      </svg>
      {/* 纸人：一直坐着，手里一台小相机 */}
      <PopUp x={700} y={640} w={280} h={280} at={2} order={2}>
        <PaperFigure
          x={830}
          y={858}
          stand={false}
          s={1.05}
          pose={{ ...POSE.sit, armF: [96, 44], armB: [90, 46], lean: 4 }}
          z={2.4}
          wind={f * 0.12}
          hands={({ front }) => (
            <g>
              <Paper color={P.ink} z={2.9} grad={0.1} filter="paper-fine">
                <rect x={front.x - 8} y={front.y - 26} width={48} height={32} rx={6} />
              </Paper>
              <Paper color={P.fogBlue} z={3} filter="paper-fine" grad={0.1}>
                <circle cx={front.x + 22} cy={front.y - 10} r={10} />
              </Paper>
            </g>
          )}
        />
      </PopUp>
      {/* 地面：秋天铺落叶、冬天盖雪 */}
      <Ground y={905} color={P.sage} back={lighten(P.sage, 0.3)} at={-3} seed={17} order={0} amp={14} />
      {f >= B.autumn + 6 && f < B.winter + 12 && (
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: (1 - prog(f, B.winter + 4, B.winter + 12)) * exit }}>
          <LiftContext.Provider value={clamp(autumnGround)}>
            <g transform={`translate(0 ${(1 - clamp(autumnGround)) * 20})`}>
              <Paper color={P.apricot} z={3.1} grad={0.1}>
                <path d="M-40 1100 L-40 918 C300 900 700 925 1000 910 C1300 896 1700 920 1960 910 L1960 1100 Z" />
              </Paper>
            </g>
          </LiftContext.Provider>
        </svg>
      )}
      {f >= B.winter + 4 && (
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: exit }}>
          <LiftContext.Provider value={clamp(winter)}>
            <g transform={`translate(0 ${(1 - clamp(winter)) * 24})`}>
              <Paper color={BASE.white} z={3.3} grad={0.05}>
                <path d="M-40 1100 L-40 912 C200 890 520 920 820 900 C1120 884 1500 914 1960 900 L1960 1100 Z" />
              </Paper>
            </g>
          </LiftContext.Provider>
        </svg>
      )}
    </>
  );
};
