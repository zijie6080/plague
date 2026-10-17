// 第二十页：深蓝卡纸，空白，只有右上角「20 / 20」。
// 「最后一个，我不替你许了。」→ 纸蜡烛缓缓立起 → 停顿 → 烛芯点亮（Canvas 剪纸火苗）→
// 暖光铺开 → 安静约 4 秒（许愿）→ 吹灭，纸烟升起 → 「生日快乐，子杰。」→ 书合上，封底「20」。
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BASE, FINALE, FONTS, PALETTE, TEXT } from "../config";
import { clamp, ease, lerp, pop, prog } from "../lib/anim";
import { FlameCanvas } from "../lib/canvas";
import { Paper, darken, lighten } from "../lib/paper";
import { fbm1 } from "../lib/rand";
import { NightShade, PopUp, SceneContext, Stage, H, W, useScene } from "../lib/stage";
import { LineText, Stamp } from "../lib/text";
import { beatsOf, sceneById } from "../timeline";
import { BOOK, TableTop } from "./Prologue";

const B = beatsOf("finale");
const K = BOOK.w / W;
const CANDLE = { x: 960, base: 842, w: 66, h: 250 };
const WICK = { x: CANDLE.x, y: CANDLE.base - 22 - CANDLE.h - 22 };

/** 第二十页的纸蜡烛：细高、螺旋纹 */
const TallCandle: React.FC = () => {
  const { x, w, h } = CANDLE;
  const top = CANDLE.base - 22 - h;
  const bot = CANDLE.base - 22;
  const stripes = [0, 1, 2, 3].map((i) => {
    const y = top + 40 + i * 58;
    return `M${x - w / 2} ${y + 20} L${x + w / 2} ${y} L${x + w / 2} ${y + 20} L${x - w / 2} ${y + 40} Z`;
  });
  return (
    <>
      <Paper color={PALETTE.ink} z={1.8} filter="paper-fine" grad={0}>
        <path d={`M${x - 3} ${top + 4} C${x - 4} ${top - 8} ${x - 1} ${top - 16} ${x + 2} ${top - 22} L${x + 4} ${top - 20} C${x + 2} ${top - 12} ${x + 3} ${top - 6} ${x + 3} ${top + 4} Z`} />
      </Paper>
      <Paper color={PALETTE.cream} z={2} grad={0.16}>
        <path d={`M${x - w / 2} ${bot} L${x - w / 2} ${top + 10} C${x - w / 2 + 8} ${top + 2} ${x - 10} ${top - 2} ${x} ${top - 1} C${x + 12} ${top} ${x + w / 2 - 6} ${top + 4} ${x + w / 2} ${top + 12} L${x + w / 2} ${bot} Z`} />
      </Paper>
      <Paper color={PALETTE.vermilion} z={2.2} filter="paper-fine" grad={0.1}>
        <path d={stripes.join(" ")} />
      </Paper>
      {/* 一滴烛泪 */}
      <Paper color={lighten(PALETTE.cream, 0.3)} z={2.3} filter="paper-fine" grad={0.05}>
        <path d={`M${x + 8} ${top + 2} C${x + 22} ${top + 2} ${x + 26} ${top + 10} ${x + 24} ${top + 34} C${x + 23} ${top + 46} ${x + 15} ${top + 46} ${x + 15} ${top + 34} C${x + 15} ${top + 20} ${x + 8} ${top + 14} ${x + 8} ${top + 2} Z`} />
      </Paper>
    </>
  );
};

/** 火苗、光晕的状态 */
const flameState = (f: number) => {
  const ignite = f < B.light ? 0 : pop(f, B.light, { damping: 9, stiffness: 120, mass: 0.6 });
  const out = ease.in(prog(f, B.blow, B.blow + 7));
  const size = clamp(ignite) * (1 - out) + (ignite > 1 ? (ignite - 1) * 0.5 : 0);
  const glowIn = ease.out(prog(f, B.light, B.glow));
  const glowOut = ease.inOut(prog(f, B.smoke, B.glowOut));
  const lean = -0.9 * Math.sin(Math.PI * prog(f, B.blow - 2, B.blow + 7));
  return { size: Math.max(0, size), glow: glowIn * (1 - glowOut), lean };
};

/** 纸烟：几段弯曲的细纸条，各自向上飘散 */
const Smoke: React.FC<{ f: number }> = ({ f }) => {
  const t = f - B.smoke;
  if (t < 0 || t > 80) return null;
  const strips = [
    { dx: 0, delay: 0, ph: 0, w: 5.5, len: 120, speed: 2.1, drift: 0.5, col: "#C9C3D2" },
    { dx: -18, delay: 9, ph: 2.1, w: 4.2, len: 90, speed: 1.8, drift: -0.35, col: "#B5B2C6" },
    { dx: 14, delay: 18, ph: 4.0, w: 3.4, len: 70, speed: 1.6, drift: 0.2, col: "#A9A8BE" },
  ];
  return (
    <g>
      {strips.map((st, i) => {
        const tt = t - st.delay;
        if (tt < 0) return null;
        const o = clamp(tt / 5) * (1 - prog(tt, 22, 52));
        if (o <= 0) return null;
        const grow = Math.min(1, tt / 14);
        const baseY = WICK.y - 6 - tt * st.speed;
        const baseX = WICK.x + st.dx * Math.min(1, tt / 20) + tt * st.drift;
        const pts: string[] = [];
        const n = 12;
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          const yy = baseY - st.len * grow * u;
          const xx = baseX + Math.sin(u * 4.2 + tt * 0.09 + st.ph) * (5 + 16 * u) + fbm1(tt * 0.04 + st.ph, 7) * 14 * u;
          pts.push(`${k ? "L" : "M"}${xx.toFixed(1)} ${yy.toFixed(1)}`);
        }
        return (
          <Paper key={i} color={st.col} z={1.2} line={st.w} filter="paper-line" grad={0} opacity={o}>
            <path d={pts.join(" ")} />
          </Paper>
        );
      })}
    </g>
  );
};

/** 第二十页的书页内容（1920×1080 坐标） */
const Page20: React.FC<{ f: number; frameAbs: number }> = ({ f }) => {
  const fs = flameState(f);
  const lit = fs.glow;
  const shadowA = 0.25 + 0.45 * lit;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile("tex/paper_night.png")} style={{ position: "absolute", width: W, height: H }} />
      {/* 暖光照亮卡纸纤维：用“被照亮的纸”贴图，按光晕做径向遮罩 */}
      {lit > 0.003 && (
        <Img
          src={staticFile("tex/paper_nightLit.png")}
          style={{
            position: "absolute",
            width: W,
            height: H,
            opacity: lit,
            WebkitMaskImage: `radial-gradient(circle at ${WICK.x}px ${WICK.y - 30}px, rgba(0,0,0,1) 0px, rgba(0,0,0,0.7) ${80 + 180 * lit}px, rgba(0,0,0,0.2) ${240 + 260 * lit}px, rgba(0,0,0,0) ${420 + 380 * lit}px)`,
            maskImage: `radial-gradient(circle at ${WICK.x}px ${WICK.y - 30}px, rgba(0,0,0,1) 0px, rgba(0,0,0,0.7) ${80 + 180 * lit}px, rgba(0,0,0,0.2) ${240 + 260 * lit}px, rgba(0,0,0,0) ${420 + 380 * lit}px)`,
          }}
        />
      )}
      <SceneContext.Provider value={{ f, foldOut: null, night: true }}>
        <NightShade>
          <Stage>
            {/* 蜡烛被照亮时，在纸面上的影子更清楚 */}
            <svg width={W} height={H} style={{ position: "absolute" }}>
              <ellipse cx={CANDLE.x + 26} cy={CANDLE.base + 6} rx={150} ry={22} fill={BASE.shadow} opacity={shadowA * clamp(prog(f, B.candle, B.candleUp))} style={{ filter: "blur(12px)" }} />
            </svg>
            <PopUp x={CANDLE.x - 160} y={CANDLE.base - 330} w={320} h={340} at={B.candle} spring={{ damping: 16, stiffness: 55, mass: 1.1 }}>
              {/* 小烛台 */}
              <Paper color={PALETTE.vermilion} z={1.6} grad={0.14}>
                <path d={`M${CANDLE.x - 118} ${CANDLE.base - 12} C${CANDLE.x - 110} ${CANDLE.base + 4} ${CANDLE.x + 110} ${CANDLE.base + 4} ${CANDLE.x + 118} ${CANDLE.base - 12} L${CANDLE.x + 104} ${CANDLE.base - 26} L${CANDLE.x - 104} ${CANDLE.base - 26} Z`} />
              </Paper>
              <TallCandle />
              {/* 火光照在蜡烛上 */}
              {lit > 0.003 && (
                <g opacity={lit * 0.8} style={{ mixBlendMode: "screen" }}>
                  <defs>
                    <radialGradient id="candleLit" cx={WICK.x} cy={WICK.y} r={230} gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#FFC98A" stopOpacity={0.85} />
                      <stop offset="0.6" stopColor="#FFB878" stopOpacity={0.25} />
                      <stop offset="1" stopColor="#FFB878" stopOpacity={0} />
                    </radialGradient>
                  </defs>
                  <circle cx={WICK.x} cy={WICK.y} r={230} fill="url(#candleLit)" />
                </g>
              )}
            </PopUp>
            <svg width={W} height={H} style={{ position: "absolute", overflow: "visible" }}>
              <Smoke f={f} />
            </svg>
          </Stage>
        </NightShade>
      </SceneContext.Provider>
      {/* 火苗与光晕（Canvas） */}
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        <FlameCanvas f={f} x={WICK.x} y={WICK.y} size={0} glow={fs.glow} />
      </div>
      <FlameCanvas f={f} x={WICK.x} y={WICK.y} size={fs.size} glow={0} lean={fs.lean} />
      {/* 文字 */}
      <LineText text={FINALE.line} f={f} start={B.line} outAt={B.lineOut} outDur={18} y={1080 * 0.12} size={52} step={2.2} charDur={14} color={TEXT.onNight} />
      <LineText text={FINALE.birthday} f={f} start={B.birthday} y={300} size={72} step={3.2} charDur={18} color={TEXT.onNight} spacing={0.16} rise={10} />
      <LineText text={FINALE.signature} f={f} start={B.signature} y={392} size={30} step={0.9} charDur={16} color={lighten(PALETTE.lilac, 0.25)} spacing={0.1} weight={400} rise={6} />
      <Stamp n={20} f={f} at={-2} outAt={9999} night />
    </AbsoluteFill>
  );
};

/** 封底：暖白纸，正中剪着一个小小的「20」 */
const BackCover: React.FC = () => (
  <svg width={BOOK.w} height={BOOK.h} style={{ position: "absolute" }}>
    <defs>
      <clipPath id="backclip">
        <rect width={BOOK.w} height={BOOK.h} rx={12} />
      </clipPath>
    </defs>
    <g clipPath="url(#backclip)">
      <image href={staticFile("tex/paper_warm.png")} x={0} y={0} width={BOOK.w} height={BOOK.h} preserveAspectRatio="xMidYMid slice" />
      <rect width={BOOK.w} height={BOOK.h} fill={lighten(BASE.paper, 0.5)} opacity={0.6} />
    </g>
    <rect x={BOOK.w - 43} y={6} width={3} height={BOOK.h - 12} fill={darken(BASE.paper, 0.2)} opacity={0.5} filter="url(#paper-fine)" />
    {/* 镂空的 20：孔里露出朱红的衬纸，孔的左上内沿有阴影 */}
    <text x={BOOK.w / 2} y={BOOK.h / 2 + 44} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={124} fill={PALETTE.vermilion} filter="url(#cutout)">
      {FINALE.backCover}
    </text>
  </svg>
);

const LeftPage: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden" }}>
    <Img src={staticFile("tex/sheet.png")} style={{ width: BOOK.w, height: BOOK.h, objectFit: "cover" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(270deg, rgba(42,24,14,0.32) 0, rgba(42,24,14,0) 120px)" }} />
  </div>
);

export const Finale: React.FC = () => {
  const { f } = useScene();
  const fin = sceneById("finale");
  const zo = ease.inOut(prog(f, B.close, B.close + 30));
  const rot = ease.inOut(prog(f, B.close + 12, B.closed));
  const pan = ease.inOut(prog(f, B.close + 18, B.closed + 6));
  const hold = ease.soft(prog(f, B.closed, fin.dur - fin.tIn.dur));

  const s1 = 1 / K;
  const sEnd = 1.0 + 0.03 * hold;
  const s = lerp(s1, sEnd, zo);
  const tx = lerp(-BOOK.x * s1, 0, zo) + BOOK.w * pan * s;
  const ty = lerp(-BOOK.y * s1, 540 - (BOOK.y + BOOK.h / 2), zo);
  const theta = 180 * rot;
  const dark = 0.4 * Math.sin((theta * Math.PI) / 180);
  const shadowA = zo;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        {zo > 0 && <TableTop />}
        {zo > 0 && (
          <>
            {/* 整本书的投影 */}
            <div
              style={{
                position: "absolute",
                left: BOOK.x - BOOK.w * rot + 10,
                top: BOOK.y + 18,
                width: BOOK.w * (2 - rot),
                height: BOOK.h + 6,
                borderRadius: 14,
                background: "rgba(42,24,14,0.4)",
                filter: "blur(16px)",
                opacity: shadowA,
              }}
            />
            {/* 左侧：封面内侧 + 左页 */}
            {[14, 8].map((o, i) => (
              <div key={o} style={{ position: "absolute", left: BOOK.x - BOOK.w - o * 0.3, top: BOOK.y + o, width: BOOK.w, height: BOOK.h, borderRadius: 8, background: i === 0 ? "#2F4D45" : "#EFE3CF" }} />
            ))}
            <div style={{ position: "absolute", left: BOOK.x - BOOK.w, top: BOOK.y, width: BOOK.w, height: BOOK.h }}>
              <LeftPage />
            </div>
            {[14, 8].map((o, i) => (
              <div key={`r${o}`} style={{ position: "absolute", left: BOOK.x + o * 0.3, top: BOOK.y + o, width: BOOK.w, height: BOOK.h, borderRadius: 8, background: i === 0 ? "#D8C6AA" : "#EFE3CF", opacity: 1 - rot }} />
            ))}
          </>
        )}
        {/* 右侧书页（第二十页），合书时绕书脊翻到左边，背面是封底（过 90° 换面并折回角度，避免镜像变换） */}
        <div style={{ position: "absolute", left: BOOK.x, top: BOOK.y, width: BOOK.w, height: BOOK.h, perspective: 4200, perspectiveOrigin: "0 50%" }}>
          {theta <= 90 ? (
            <div style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", transform: `rotateY(${-theta}deg)`, overflow: "hidden", borderRadius: zo > 0 ? 8 : 0 }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `scale(${K})` }}>
                <Page20 f={f} frameAbs={f + fin.action} />
              </div>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(10,8,20,${0.3 * zo + dark}) 0, rgba(10,8,20,${dark}) 140px)` }} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: -BOOK.w, top: 0, width: BOOK.w, height: BOOK.h, transformOrigin: "100% 50%", transform: `rotateY(${180 - theta}deg)` }}>
              <BackCover />
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: `rgba(42,24,14,${Math.max(0, 0.25 - (0.4 - dark))})` }} />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

