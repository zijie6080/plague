// 序：暖白纸底上一本合着的纸书，封面是剪纸书名「二十个愿望」和一根小蜡烛。
// 镜头缓慢推近，封面上方依次淡入三行字；封面翻开，镜头推进书页，进入第 1 个愿望。
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { FONTS, PALETTE, PROLOGUE, VIDEO } from "../config";
import { clamp, ease, lerp, pop, prog } from "../lib/anim";
import { LiftContext, Paper, darken, lighten } from "../lib/paper";
import { LineText } from "../lib/text";
import { H, W, useScene } from "../lib/stage";
import { beatsOf, sceneById } from "../timeline";
import { SceneView } from "./registry";
import { starPath } from "./common";

const B = beatsOf("prologue");

// 书在“桌面”上的位置
export const BOOK = { x: 520, y: 400, w: 880, h: 495 };
const K = BOOK.w / W; // 书页相对整屏的缩放

/** 剪纸蜡烛（封面与第二十页共用的造型） */
export const CandleShape: React.FC<{ x: number; y: number; s: number; z?: number; flame?: boolean }> = ({ x, y, s, z = 1.4, flame = true }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {flame && (
      <>
        <Paper color={PALETTE.apricot} z={z + 0.4} filter="paper-fine" grad={0.12}>
          <path d="M0 -150 C10 -132 22 -118 20 -100 C18 -86 8 -80 0 -80 C-8 -80 -18 -86 -20 -100 C-22 -118 -8 -128 0 -150 Z" />
        </Paper>
        <Paper color={PALETTE.cream} z={z + 0.6} filter="paper-fine" grad={0.05}>
          <path d="M0 -122 C6 -112 11 -104 10 -96 C9 -89 4 -86 0 -86 C-4 -86 -9 -89 -10 -96 C-11 -104 -5 -112 0 -122 Z" />
        </Paper>
      </>
    )}
    <Paper color={PALETTE.ink} z={z} filter="paper-fine" grad={0}>
      <rect x={-2.5} y={-84} width={5} height={14} rx={2} />
    </Paper>
    <Paper color={PALETTE.cream} z={z} grad={0.12}>
      <path d="M-26 -72 C-14 -78 14 -78 26 -72 L26 0 L-26 0 Z" />
    </Paper>
    <Paper color={PALETTE.vermilion} z={z + 0.2} filter="paper-fine" grad={0.1}>
      <path d="M-26 -50 L26 -62 L26 -50 L-26 -38 Z M-26 -22 L26 -34 L26 -22 L-26 -10 Z" />
    </Paper>
  </g>
);

const Cover: React.FC<{ f: number }> = ({ f }) => {
  const chars = Array.from(PROLOGUE.coverTitle);
  const title = { x: 360, y: 285, size: 86, gap: 98 };
  const candleLift = pop(f, B.candlePop, { damping: 12, stiffness: 170 });
  return (
    <svg width={BOOK.w} height={BOOK.h} viewBox={`0 0 ${BOOK.w} ${BOOK.h}`} style={{ position: "absolute", overflow: "visible" }}>
      <Paper color={PALETTE.pine} z={0.4} grad={0.12}>
        <rect x={0} y={0} width={BOOK.w} height={BOOK.h} rx={12} />
      </Paper>
      {/* 书脊压痕 */}
      <rect x={34} y={6} width={5} height={BOOK.h - 12} fill={darken(PALETTE.pine, 0.35)} opacity={0.5} filter="url(#paper-fine)" />
      <rect x={40} y={6} width={3} height={BOOK.h - 12} fill={lighten(PALETTE.pine, 0.3)} opacity={0.4} filter="url(#paper-fine)" />
      {/* 内框 */}
      <rect x={70} y={30} width={BOOK.w - 100} height={BOOK.h - 60} rx={8} fill="none" stroke={lighten(PALETTE.cream, 0.1)} strokeWidth={2.5} opacity={0.55} filter="url(#paper-fine)" />
      {chars.map((c, i) => {
        const s = pop(f, B.titlePop + i * B.titleStep, { damping: 12, stiffness: 180 });
        const cx = title.x + (i - (chars.length - 1) / 2) * title.gap;
        return (
          <LiftContext.Provider key={i} value={clamp(s, 0, 1.1)}>
            <g opacity={clamp(s * 3)} transform={`translate(${cx} ${title.y}) scale(${0.86 + 0.14 * s}) translate(${-cx} ${-title.y})`}>
              <Paper color={PALETTE.cream} z={1.6} filter="paper-fine" grad={0.08}>
                <text x={cx} y={title.y} fontSize={title.size} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900}>
                  {c}
                </text>
              </Paper>
            </g>
          </LiftContext.Provider>
        );
      })}
      <LiftContext.Provider value={clamp(candleLift, 0, 1.1)}>
        <g opacity={clamp(candleLift * 3)}>
          <CandleShape x={720} y={360} s={1.0 * (0.85 + 0.15 * candleLift)} z={1.6} />
        </g>
      </LiftContext.Provider>
      {/* 小星点 */}
      {[
        [650, 120, 9],
        [800, 160, 6],
        [612, 210, 5],
      ].map(([x, y, r], i) => (
        <LiftContext.Provider key={i} value={clamp(pop(f, B.candlePop + 4 + i * 3), 0, 1.1)}>
          <Paper color={PALETTE.apricot} z={1} filter="paper-fine" grad={0.05}>
            <path d={starPath(x, y, r)} />
          </Paper>
        </LiftContext.Provider>
      ))}
      <text x={title.x} y={title.y + 72} textAnchor="middle" fontFamily={`"${FONTS.wish}"`} fontSize={26} letterSpacing={6} fill={PALETTE.cream} opacity={0.8 * clamp(prog(f, 40, 60))} filter="url(#fiber)">
        给{VIDEO.name}
      </text>
    </svg>
  );
};

const CoverInside: React.FC = () => (
  <svg width={BOOK.w} height={BOOK.h} style={{ position: "absolute" }}>
    <rect width={BOOK.w} height={BOOK.h} rx={12} fill={darken(PALETTE.pine, 0.1)} />
    <rect x={14} y={14} width={BOOK.w - 28} height={BOOK.h - 28} rx={6} fill={PALETTE.sakura} filter="url(#fiber)" />
    {Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => (
        <path key={`${r}-${c}`} d={starPath(60 + c * 70 + (r % 2) * 35, 50 + r * 66, 7)} fill={lighten(PALETTE.sakura, 0.35)} opacity={0.8} />
      )),
    )}
  </svg>
);

/** 桌面：纹理按原尺寸平铺，镜头推近时颗粒不会被放大变糊 */
export const TableTop: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: -W * 2,
      top: -H * 2,
      width: W * 5,
      height: H * 5,
      backgroundImage: `url(${staticFile("tex/table.png")})`,
      backgroundSize: `${W}px ${H}px`,
      backgroundPosition: `${W * 2}px ${H * 2}px`,
    }}
  />
);

export const Prologue: React.FC = () => {
  const { f } = useScene();
  const frame = useCurrentFrame();
  const w01 = sceneById("w01");

  // 镜头：先缓慢推近，再推进书页直至书页铺满画面
  const push = 1 + 0.06 * ease.soft(prog(f, 0, B.pushEnd));
  const c = { x: 960, y: 560 };
  const z = ease.inOut(prog(f, B.zoomStart, sceneById("prologue").dur - 1));
  const s0 = push;
  const tx0 = c.x - c.x * s0;
  const ty0 = c.y - c.y * s0;
  const s1 = 1 / K;
  const tx1 = -BOOK.x * s1;
  const ty1 = -BOOK.y * s1;
  const s = lerp(s0, s1, z);
  const tx = lerp(tx0, tx1, z);
  const ty = lerp(ty0, ty1, z);

  const open = ease.inOut(prog(f, B.coverOpen, B.coverOpen + B.coverOpenDur));
  const theta = 180 * open;
  const coverDark = 0.35 * Math.sin((Math.min(90, theta) * Math.PI) / 180);
  const showPage = f >= B.coverOpen - 1;
  const bookShadowA = 1 - z;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <TableTop />
        {/* 书的投影 */}
        <div
          style={{
            position: "absolute",
            left: BOOK.x + 10,
            top: BOOK.y + 18,
            width: BOOK.w + 6,
            height: BOOK.h + 6,
            borderRadius: 14,
            background: "rgba(42,24,14,0.42)",
            filter: "blur(16px)",
            opacity: bookShadowA,
          }}
        />
        {/* 书页厚度 */}
        {[14, 9, 4].map((o, i) => (
          <div
            key={o}
            style={{
              position: "absolute",
              left: BOOK.x + o * 0.4,
              top: BOOK.y + o,
              width: BOOK.w - o * 0.2,
              height: BOOK.h,
              borderRadius: 8,
              background: i === 0 ? "#D8C6AA" : i === 1 ? "#EFE3CF" : "#F7EEDF",
              boxShadow: "inset 0 -2px 0 rgba(120,90,60,0.25)",
            }}
          />
        ))}
        {/* 书页（第 1 个愿望），翻开封面时出现 */}
        {showPage && (
          <div style={{ position: "absolute", left: BOOK.x, top: BOOK.y, width: W, height: H, transformOrigin: "0 0", transform: `scale(${K})`, overflow: "hidden", borderRadius: 8 / K }}>
            <SceneView id="w01" f={frame - w01.action} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(42,24,14,${0.4 * (1 - z)}) 0, rgba(42,24,14,0) 260px)` }} />
          </div>
        )}
        {/* 封面：绕书脊翻开。过了 90° 换成封面内侧，并放到书脊左边、角度折回（避免镜像变换） */}
        <div style={{ position: "absolute", left: BOOK.x, top: BOOK.y, width: BOOK.w, height: BOOK.h, perspective: 3800, perspectiveOrigin: "0 50%" }}>
          {theta <= 90 ? (
            <div style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", transform: `rotateY(${-theta}deg)` }}>
              <Cover f={f} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: `rgba(30,16,8,${coverDark})` }} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: -BOOK.w, top: 0, width: BOOK.w, height: BOOK.h, transformOrigin: "100% 50%", transform: `rotateY(${180 - theta}deg)` }}>
              <CoverInside />
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: `rgba(30,16,8,${coverDark * 0.8})` }} />
            </div>
          )}
        </div>
      </AbsoluteFill>
      {/* 三行字 */}
      {PROLOGUE.lines.map((t, i) => (
        <LineText
          key={i}
          text={t}
          f={f}
          start={[B.line1, B.line2, B.line3][i]}
          outAt={B.linesOut + i * 2}
          y={176 + i * 72}
          size={46}
          step={1.6}
          charDur={12}
        />
      ))}
    </AbsoluteFill>
  );
};
