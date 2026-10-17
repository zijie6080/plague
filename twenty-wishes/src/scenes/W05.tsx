// 5. 愿你的代码一次部署成功，永远绿灯。
// 纸红绿灯，红、黄、绿依次亮起。绿灯亮的同时，旁边的纸火箭从发射台升空，拖着纸条尾焰飞出画面。
import React from "react";
import { BASE } from "../config";
import { clamp, ease, pop, prog } from "../lib/anim";
import { Paper, darken, lighten, mix } from "../lib/paper";
import { fbm1 } from "../lib/rand";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel, cloudPath } from "./common";

const B = beatsOf("w05");
const TL = { x: 470, y: 330, w: 180, h: 330 };
const LIGHTS = [
  { c: "#E0563F", at: "red" },
  { c: "#F2C14E", at: "yellow" },
  { c: "#6FBF8E", at: "green" },
] as const;
const RK = { x: 1290, base: 840 };

/** 火箭位置：绿灯后加速升空 */
const rocket = (f: number) => {
  const t = Math.max(0, f - B.launch);
  const shiver = f >= B.launch - 4 && f < B.launch + 4 ? Math.sin(f * 3.1) * 2.5 : 0;
  const dy = 0.62 * t * t + 2 * t;
  const dx = 0.22 * dy;
  const rot = Math.min(12, dy * 0.012) + fbm1(f * 0.2, 4) * 2 * clamp(t / 6);
  return { x: RK.x + dx + shiver, y: RK.base - dy, rot, t };
};

export const W05: React.FC = () => {
  const { f } = useScene();
  const on = (i: number) => {
    const a = B[LIGHTS[i].at];
    const next = i < 2 ? B[LIGHTS[i + 1].at] : 1e9;
    return clamp(prog(f, a, a + 2)) * (1 - clamp(prog(f, next, next + 2)));
  };
  const rk = rocket(f);
  const flame = rk.t > 0 ? clamp(rk.t / 4) : f > B.launch - 6 ? 0.25 : 0;
  return (
    <>
      <Panel x={180} y={300} w={1560} h={700} color={lighten(P.fogBlue, 0.15)} at={-2} r={40} order={6} />
      {/* 云 */}
      <PopUp x={760} y={320} w={900} h={260} at={0} order={5}>
        <Paper color={P.cream} z={1} grad={0.06}>
          <path d={cloudPath(900, 470, 1.1)} />
          <path d={cloudPath(1500, 400, 0.8)} />
        </Paper>
      </PopUp>
      {/* 红绿灯 */}
      <PopUp x={TL.x - 30} y={TL.y - 20} w={TL.w + 60} h={600} at={0} order={3}>
        <Paper color={P.ink} z={1.8} grad={0.08}>
          <rect x={TL.x + TL.w / 2 - 14} y={TL.y + TL.h - 10} width={28} height={300} rx={6} />
        </Paper>
        <Paper color={P.ink} z={2} grad={0.12}>
          <rect x={TL.x} y={TL.y} width={TL.w} height={TL.h} rx={36} />
        </Paper>
        {LIGHTS.map((l, i) => {
          const cy = TL.y + 64 + i * 100;
          const k = on(i);
          return (
            <g key={i}>
              {k > 0.01 && (
                <circle cx={TL.x + TL.w / 2} cy={cy} r={86} fill={l.c} opacity={0.35 * k} style={{ filter: "blur(18px)", mixBlendMode: "screen" }} />
              )}
              <Paper color={mix(darken(l.c, 0.55), lighten(l.c, 0.1), k)} z={2.2 + 0.4 * k} grad={0.16} filter="paper-fine">
                <circle cx={TL.x + TL.w / 2} cy={cy} r={38} />
              </Paper>
              <Paper color={darken(P.ink, 0.2)} z={2.5} filter="paper-fine" grad={0}>
                <path d={`M${TL.x + TL.w / 2 - 50} ${cy - 30} C${TL.x + TL.w / 2 - 40} ${cy - 56} ${TL.x + TL.w / 2 + 40} ${cy - 56} ${TL.x + TL.w / 2 + 50} ${cy - 30} L${TL.x + TL.w / 2 + 44} ${cy - 40} C${TL.x + TL.w / 2 + 30} ${cy - 50} ${TL.x + TL.w / 2 - 30} ${cy - 50} ${TL.x + TL.w / 2 - 44} ${cy - 40} Z`} />
              </Paper>
            </g>
          );
        })}
      </PopUp>
      {/* 发射台 */}
      <PopUp x={1140} y={620} w={320} h={300} at={2} order={2}>
        <Paper color={darken(P.ink, 0.05)} z={1.4} filter="paper-fine" line={8} grad={0}>
          <path d="M1190 900 L1190 640 M1190 680 L1240 720 M1190 760 L1240 800 M1190 840 L1240 880 M1240 720 L1190 760 M1240 800 L1190 840" />
        </Paper>
        <Paper color={P.ink} z={1.6} grad={0.1}>
          <rect x={1160} y={RK.base + 4} width={260} height={30} rx={6} />
        </Paper>
      </PopUp>
      {/* 起飞时的烟团 */}
      {f >= B.launch &&
        [0, 1, 2, 3, 4].map((i) => {
          const t = f - B.launch - i * 1.5;
          if (t < 0) return null;
          const s = pop(f, B.launch + i * 1.5, { damping: 14, stiffness: 160 });
          const dir = i % 2 ? 1 : -1;
          const x = RK.x + dir * (40 + i * 26) * ease.out(clamp(t / 20));
          const o = 1 - prog(t, 20, 34);
          return (
            <svg key={i} width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: o }}>
              <Paper color={i % 2 ? P.cream : BASE.white} z={2.6} grad={0.06}>
                <path d={cloudPath(x, RK.base + 10 - i * 6, 0.45 * s + 0.1 * i * s)} />
              </Paper>
            </svg>
          );
        })}
      {/* 火箭 */}
      {rk.y > -500 && (
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
          <g transform={`translate(${rk.x} ${rk.y}) rotate(${rk.rot})`}>
            {/* 纸条尾焰 */}
            {flame > 0 &&
              [P.vermilion, P.apricot, P.cream].map((c, i) => {
                const len = (40 + 150 * flame + Math.min(160, rk.t * 6)) * (1 - i * 0.22);
                const pts: string[] = [];
                for (let k = 0; k <= 8; k++) {
                  const u = k / 8;
                  pts.push(`${k ? "L" : "M"}${((i - 1) * 16 + Math.sin(u * 7 + f * 0.9 + i * 2) * 10 * u).toFixed(1)} ${(4 + u * len).toFixed(1)}`);
                }
                return (
                  <Paper key={i} color={c} z={3.4} line={18 - i * 4} filter="paper-line" grad={0}>
                    <path d={pts.join(" ")} />
                  </Paper>
                );
              })}
            <Paper color={P.vermilion} z={3.6} grad={0.12} filter="paper-fine">
              <path d="M-46 -40 L-82 6 L-82 18 L-44 0 Z M46 -40 L82 6 L82 18 L44 0 Z" />
            </Paper>
            <Paper color={P.cream} z={3.8} grad={0.14}>
              <path d="M-44 0 L-44 -160 C-44 -200 -20 -236 0 -258 C20 -236 44 -200 44 -160 L44 0 Z" />
            </Paper>
            <Paper color={P.vermilion} z={4} grad={0.1} filter="paper-fine">
              <path d="M-36 -196 C-26 -222 -12 -240 0 -258 C12 -240 26 -222 36 -196 Z" />
            </Paper>
            <Paper color={P.ink} z={4} filter="paper-fine" grad={0}>
              <circle cx={0} cy={-128} r={24} />
            </Paper>
            <Paper color={P.fogBlue} z={4.2} filter="paper-fine" grad={0.12}>
              <circle cx={0} cy={-128} r={16} />
            </Paper>
          </g>
        </svg>
      )}
      <Ground y={930} color={P.sage} at={-3} seed={5} order={0} amp={16} />
    </>
  );
};
