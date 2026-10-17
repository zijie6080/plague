// 1. 愿你的每条视频，第一次生成就成功。
// 纸场记板“啪”地合上，后面弹出一条胶片纸带，一格格展开（山、海、月亮），最后盖上一枚绿色纸勾。
import React from "react";
import { FONTS } from "../config";
import { clamp, ease, pop, prog, wobble } from "../lib/anim";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { Card3D, PopUp, useExit, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, Panel, checkPath, starPath } from "./common";

const B = beatsOf("w01");
const BOARD = { x: 300, y: 540, w: 400, h: 300 };
const STRIP = { x: 760, y: 470, fw: 270, h: 320 };

const FrameArt: React.FC<{ k: number; x: number; y: number; w: number; h: number }> = ({ k, x, y, w, h }) => {
  const cx = x + w / 2;
  if (k === 0)
    return (
      <>
        <Paper color={lighten(P.fogBlue, 0.35)} z={0.2} grad={0.08} filter="paper-fine">
          <rect x={x} y={y} width={w} height={h} />
        </Paper>
        <Paper color={P.apricot} z={0.5} filter="paper-fine">
          <circle cx={x + w * 0.72} cy={y + h * 0.3} r={22} />
        </Paper>
        <Paper color={P.sage} z={0.7} filter="paper-fine">
          <path d={`M${x} ${y + h} L${x + w * 0.32} ${y + h * 0.38} L${x + w * 0.55} ${y + h * 0.7} L${x + w * 0.74} ${y + h * 0.5} L${x + w} ${y + h * 0.85} L${x + w} ${y + h} Z`} />
        </Paper>
        <Paper color={P.pine} z={0.9} filter="paper-fine">
          <path d={`M${x} ${y + h} L${x} ${y + h * 0.78} C${x + w * 0.3} ${y + h * 0.68} ${x + w * 0.6} ${y + h * 0.9} ${x + w} ${y + h * 0.8} L${x + w} ${y + h} Z`} />
        </Paper>
      </>
    );
  if (k === 1)
    return (
      <>
        <Paper color={lighten(P.sakura, 0.3)} z={0.2} grad={0.08} filter="paper-fine">
          <rect x={x} y={y} width={w} height={h} />
        </Paper>
        <Paper color={P.apricot} z={0.4} filter="paper-fine">
          <circle cx={cx} cy={y + h * 0.56} r={30} />
        </Paper>
        {[0, 1, 2].map((i) => (
          <Paper key={i} color={[P.fogBlue, darken(P.fogBlue, 0.15), P.pine][i]} z={0.6 + i * 0.2} filter="paper-fine">
            <path
              d={`M${x} ${y + h} L${x} ${y + h * (0.58 + i * 0.13)} ${Array.from({ length: 6 }, (_, j) => `Q${x + (j + 0.5) * (w / 6)} ${y + h * (0.52 + i * 0.13)} ${x + (j + 1) * (w / 6)} ${y + h * (0.58 + i * 0.13)}`).join(" ")} L${x + w} ${y + h} Z`}
            />
          </Paper>
        ))}
      </>
    );
  return (
    <>
      <Paper color={lighten("#1E2A44", 0.12)} z={0.2} grad={0.1} filter="paper-fine">
        <rect x={x} y={y} width={w} height={h} />
      </Paper>
      <Paper color={P.cream} z={0.7} filter="paper-fine">
        <path d={`M${cx + 6} ${y + 46} A56 56 0 1 0 ${cx + 6} ${y + 158} A72 72 0 0 1 ${cx + 6} ${y + 46} Z`} />
      </Paper>
      {[
        [x + 40, y + 50, 7],
        [x + w - 50, y + 70, 9],
        [x + w - 80, y + 160, 6],
        [x + 60, y + 170, 5],
      ].map(([sx, sy, r], i) => (
        <Paper key={i} color={P.apricot} z={0.6} filter="paper-fine">
          <path d={starPath(sx, sy, r)} />
        </Paper>
      ))}
    </>
  );
};

export const W01: React.FC = () => {
  const { f } = useScene();
  const exit = useExit(1);
  // 场记板：张开 → 啪地合上 → 回弹
  const clapP = ease.in(prog(f, B.clap - 6, B.clap));
  const stickRot = -32 * (1 - clapP) + wobble(f, B.clap, 5, 1.6, 0.35);
  const burst = f >= B.clap && f < B.clap + 7 ? 1 - prog(f, B.clap, B.clap + 7) : 0;
  const shake = wobble(f, B.clap, 5, 2.4, 0.4);

  // 绿勾：从高处落下，投影由远而虚变得近而实
  const c = pop(f, B.check, { damping: 12, stiffness: 210, mass: 0.7 });
  const cz = 5.5 - 3.3 * clamp(c);
  const cs = 1.7 - 0.7 * c;

  return (
    <>
      <Panel x={200} y={300} w={1520} h={700} color={P.lilac} at={B.board} r={40} order={5} />
      {/* 胶片：从场记板后面伸出，每格依次展开（绕左边折页） */}
      {[0, 1, 2].map((k) => {
        const at = B.strip + k * B.frameStep;
        const s = pop(f, at, { damping: 13, stiffness: 190, mass: 0.6 });
        const ang = 100 * (1 - s);
        if (f < at) return null;
        const x = STRIP.x + k * STRIP.fw;
        return (
          <Card3D key={k} x={x} y={STRIP.y} w={STRIP.fw} h={STRIP.h} origin="0% 50%" transform={`rotateY(${ang.toFixed(2)}deg)`} lift={clamp(s)} opacity={exit}>
            <Paper color={P.ink} z={1.8} grad={0.1}>
              <rect x={x} y={STRIP.y} width={STRIP.fw + 2} height={STRIP.h} rx={4} />
            </Paper>
            <Paper color={P.cream} z={2} filter="paper-fine" grad={0}>
              {Array.from({ length: 5 }, (_, i) => (
                <React.Fragment key={i}>
                  <rect x={x + 18 + i * 52} y={STRIP.y + 12} width={26} height={18} rx={4} />
                  <rect x={x + 18 + i * 52} y={STRIP.y + STRIP.h - 30} width={26} height={18} rx={4} />
                </React.Fragment>
              ))}
            </Paper>
            <FrameArt k={k} x={x + 22} y={STRIP.y + 48} w={STRIP.fw - 44} h={STRIP.h - 96} />
          </Card3D>
        );
      })}
      {/* 场记板 */}
      <PopUp x={BOARD.x - 20} y={BOARD.y - 120} w={BOARD.w + 60} h={BOARD.h + 140} at={B.board + 2} order={2} extra={`translateY(${shake}px)`}>
        <Paper color={P.ink} z={2} grad={0.12}>
          <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} rx={10} />
        </Paper>
        <Paper color={P.cream} z={2.2} filter="paper-fine" grad={0}>
          <rect x={BOARD.x + 24} y={BOARD.y + 96} width={BOARD.w - 48} height={4} />
          <rect x={BOARD.x + 24} y={BOARD.y + 180} width={BOARD.w - 48} height={4} />
          <rect x={BOARD.x + 200} y={BOARD.y + 100} width={4} height={80} />
        </Paper>
        <g fill={P.cream} fontFamily={`"${FONTS.serif}"`} fontWeight={600} opacity={0.92} filter="url(#fiber)">
          <text x={BOARD.x + 30} y={BOARD.y + 76} fontSize={34} letterSpacing={3}>
            TAKE 1
          </text>
          <text x={BOARD.x + 34} y={BOARD.y + 150} fontSize={26}>
            SCENE
          </text>
          <text x={BOARD.x + 220} y={BOARD.y + 150} fontSize={26}>
            ROLL
          </text>
          <text x={BOARD.x + 34} y={BOARD.y + 250} fontSize={44} fontFamily={`"${FONTS.wish}"`}>
            第一次就过
          </text>
        </g>
        {/* 拍杆：以左端为轴 */}
        <g transform={`rotate(${stickRot.toFixed(2)} ${BOARD.x} ${BOARD.y - 6})`}>
          <Paper color={P.ink} z={2.6} grad={0.1}>
            <rect x={BOARD.x - 4} y={BOARD.y - 62} width={BOARD.w + 8} height={56} rx={6} />
          </Paper>
          <Paper color={P.cream} z={2.8} filter="paper-fine" grad={0}>
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={`M${BOARD.x + 30 + i * 80} ${BOARD.y - 60} l40 0 l-30 52 l-40 0 Z`} />
            ))}
          </Paper>
        </g>
        {burst > 0 && (
          <g opacity={burst}>
            {[-30, 0, 30].map((a, i) => {
              const r0 = 34 + (1 - burst) * 30;
              const rad = ((a - 150) * Math.PI) / 180;
              const ox = BOARD.x + BOARD.w + 20;
              const oy = BOARD.y - 30;
              return (
                <Paper key={i} color={P.vermilion} z={2} filter="paper-fine" grad={0}>
                  <path
                    d={`M${ox - Math.cos(rad) * r0} ${oy + Math.sin(rad) * r0} L${ox - Math.cos(rad) * (r0 + 34)} ${oy + Math.sin(rad) * (r0 + 34)}`}
                    stroke={P.vermilion}
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                </Paper>
              );
            })}
          </g>
        )}
      </PopUp>
      <Ground y={925} color={P.sage} at={B.board - 3} seed={1} order={0} amp={18} />
      {/* 绿色纸勾 */}
      {f >= B.check && (
        <LiftContext.Provider value={1}>
          <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: clamp(c * 4) * exit }}>
            <g transform={`translate(1540 470) scale(${cs.toFixed(4)}) rotate(${(-14 * (1 - c)).toFixed(2)}) translate(-1540 -470)`}>
              <Paper color={P.pine} z={cz} grad={0.14}>
                <path d={checkPath(1540, 470, 1.25)} />
              </Paper>
            </g>
          </svg>
        </LiftContext.Provider>
      )}
    </>
  );
};
