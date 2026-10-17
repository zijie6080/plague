// 13. 愿你熬的夜都有回报。
//   夜晚的书桌，台灯亮着，窗外一轮纸月亮。月亮慢慢落下，太阳升起来。桌上的纸稿越堆越高，最后从纸堆里长出一朵纸花。
// 14. ……也愿你少熬一点夜。
//   “咔哒”一下，台灯关了。一床纸被子从上方轻轻盖下来，窗外的月亮回到原处，几个剪纸的「Z」慢慢飘起来。
// 两个愿望共用同一张书桌（第 14 个直接接着第 13 个演，不转场）。
import React from "react";
import { AbsoluteFill } from "remotion";
import { BASE, FONTS } from "../config";
import { bell, clamp, ease, glide, lerp, pop, prog } from "../lib/anim";
import { PaperFigure, POSE, blendPose } from "../lib/figure";
import { LiftContext, Paper, darken, lighten, mix } from "../lib/paper";
import { hash } from "../lib/rand";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, starPath } from "./common";

const B13 = beatsOf("w13");
const B14 = beatsOf("w14");
const WIN = { x: 1240, y: 282, w: 410, h: 330 };
const DESK = { x: 600, y: 690, w: 920 };
const STACK = { cx: 1060, w: 210, sheet: 9 };
const SHEETS = 11;
const LAMP = { x: 1400 };
const DESK_COL = mix(P.apricot, P.ink, 0.55);
const SEAT = { x: 820, hip: 778 };

interface State {
  f: number; // 本场景帧
  moonY: number;
  sunY: number;
  dawn: number;
  sheets: number; // 已落下的纸张数（可带小数，表示正在落）
  flower: number;
  lamp: number; // 1 开 0 关
  click: number;
  blanket: number;
  sleep: number;
  zzz: number; // Z 开始帧（本场景帧），<0 表示没有
}

const state13 = (f: number): State => {
  const moon = ease.inOut(prog(f, B13.moonDown, B13.moonDown + 34));
  const sun = ease.out(prog(f, B13.sunUp, B13.sunUp + 32));
  return {
    f,
    moonY: lerp(388, 720, moon),
    sunY: lerp(720, 420, sun),
    dawn: ease.inOut(prog(f, B13.sunUp - 6, B13.sunUp + 30)),
    sheets: clamp((f - B13.sheet0) / B13.sheetStep + 1, 0, SHEETS),
    flower: f,
    lamp: 1,
    click: 0,
    blanket: 0,
    sleep: 0,
    zzz: -1,
  };
};

const state14 = (f: number): State => {
  const s = state13(1000);
  const back = ease.inOut(prog(f, B14.moonBack, B14.moonBack + 36));
  const flick = f >= B14.lampOff && f < B14.lampOff + 5 ? [0, 1, 0, 0.6, 0][f - B14.lampOff] : f >= B14.lampOff + 5 ? 0 : 1;
  return {
    ...s,
    f,
    moonY: lerp(720, 388, back),
    sunY: lerp(420, 720, ease.inOut(prog(f, B14.moonBack - 6, B14.moonBack + 24))),
    dawn: 1 - ease.inOut(prog(f, B14.moonBack - 6, B14.moonBack + 30)),
    lamp: flick,
    click: bell(f, B14.lampOff - 1, B14.lampOff + 5),
    blanket: f,
    sleep: ease.inOut(prog(f, B14.lampOff + 2, B14.blanket + 6)),
    zzz: B14.zzz,
  };
};

const Flower: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  if (f < at) return null;
  const stem = ease.out(prog(f, at, at + 10));
  const leaf = pop(f, at + 6, { damping: 10, stiffness: 200 });
  const bloom = pop(f, at + 11, { damping: 9, stiffness: 190 });
  const top = y - 130 * stem;
  return (
    <g>
      <Paper color={P.sage} z={2.2} line={7} filter="paper-line" grad={0}>
        <path d={`M${x} ${y} C${x - 8} ${y - 40} ${x + 10} ${y - 80} ${x} ${top}`} />
      </Paper>
      <LiftContext.Provider value={clamp(leaf, 0, 1.2)}>
        <Paper color={P.sage} z={2.3} grad={0.12} filter="paper-fine">
          <path transform={`translate(${x} ${y - 46}) scale(${leaf})`} d="M0 0 C18 -20 44 -20 56 -6 C40 6 18 8 0 0 Z" />
          <path transform={`translate(${x} ${y - 74}) scale(${leaf * 0.85})`} d="M0 0 C-18 -20 -44 -20 -56 -6 C-40 6 -18 8 0 0 Z" />
        </Paper>
      </LiftContext.Provider>
      {bloom > 0.01 && (
        <LiftContext.Provider value={clamp(bloom, 0, 1.2)}>
          <g transform={`translate(${x} ${top}) scale(${bloom}) rotate(${(1 - bloom) * 40})`}>
            <Paper color={P.sakura} z={2.6} grad={0.12} filter="paper-fine">
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx={0} cy={-24} rx={16} ry={26} transform={`rotate(${a})`} />
              ))}
            </Paper>
            <Paper color={P.vermilion} z={2.8} grad={0.1} filter="paper-fine">
              <circle r={12} />
            </Paper>
          </g>
        </LiftContext.Provider>
      )}
    </g>
  );
};

export const NightDesk: React.FC<{ part: 13 | 14 }> = ({ part }) => {
  const { f } = useScene();
  const st = part === 13 ? state13(f) : state14(f);
  const flowerAt = part === 13 ? B13.flower : -1000;
  const stackTop = DESK.y - Math.floor(st.sheets) * STACK.sheet;
  const write = part === 13 ? Math.sin(f * 0.9) * 8 : 0;
  const sitPose = blendPose(
    { ...POSE.sit, armF: [74 + write, 34], armB: [66, 36], lean: 14 },
    { ...POSE.sit, armF: [96, 96], armB: [92, 92], lean: 34, nod: 30 },
    st.sleep,
  );
  const blanketY = part === 14 ? lerp(-560, 0, glide(f, B14.blanket, 26)) : -1000;
  const breathe = part === 14 ? Math.sin(f * 0.12) * 2 * st.sleep : 0;
  const skyTop = mix("#2E3D63", mix(P.sakura, P.apricot, 0.25), st.dawn);
  const skyBot = mix("#3A4A70", lighten(P.apricot, 0.25), st.dawn);
  const roomDark = (1 - st.lamp) * 0.24;

  return (
    <>
      {/* 墙上的小星星 */}
      <PopUp x={300} y={300} w={800} h={260} at={-6} order={8}>
        <Paper color={mix(BASE.night, P.cream, 0.25)} z={0.6} filter="paper-fine" grad={0}>
          {[
            [360, 360, 10],
            [520, 320, 7],
            [700, 400, 12],
            [880, 330, 8],
            [1040, 380, 6],
          ].map(([x, y, r], i) => (
            <path key={i} d={starPath(x, y, r)} />
          ))}
        </Paper>
      </PopUp>
      {/* 窗 */}
      <PopUp x={WIN.x - 20} y={WIN.y - 20} w={WIN.w + 40} h={WIN.h + 40} at={-4} order={6}>
        <defs>
          <linearGradient id="w13sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBot} />
          </linearGradient>
          <clipPath id="w13win">
            <rect x={WIN.x + 18} y={WIN.y + 18} width={WIN.w - 36} height={WIN.h - 36} />
          </clipPath>
        </defs>
        <rect x={WIN.x + 18} y={WIN.y + 18} width={WIN.w - 36} height={WIN.h - 36} fill="url(#w13sky)" filter="url(#fiber)" />
        <g clipPath="url(#w13win)">
          <g opacity={1 - st.dawn}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={starPath(WIN.x + 40 + hash("ws", i) * (WIN.w - 80), WIN.y + 40 + hash("wsy", i) * 140, 5 + hash("wr", i) * 4)} fill={P.cream} opacity={0.85} />
            ))}
          </g>
          <Paper color={P.apricot} z={0.8} grad={0.14}>
            <circle cx={WIN.x + 150} cy={st.sunY} r={54} />
          </Paper>
          <Paper color={P.cream} z={0.8} grad={0.08}>
            <path d={`M${WIN.x + 300} ${st.moonY - 52} A52 52 0 1 0 ${WIN.x + 300} ${st.moonY + 52} A66 66 0 0 1 ${WIN.x + 300} ${st.moonY - 52} Z`} />
          </Paper>
        </g>
        <Paper color={P.cream} z={1.4} grad={0.1}>
          <path
            d={`M${WIN.x} ${WIN.y} h${WIN.w} v${WIN.h} h${-WIN.w} Z M${WIN.x + 18} ${WIN.y + 18} v${WIN.h - 36} h${WIN.w / 2 - 24} v${-(WIN.h - 36)} Z M${WIN.x + WIN.w / 2 + 6} ${WIN.y + 18} v${WIN.h - 36} h${WIN.w / 2 - 24} v${-(WIN.h - 36)} Z`}
            fillRule="evenodd"
          />
        </Paper>
      </PopUp>
      {/* 书桌 */}
      <PopUp x={DESK.x - 20} y={DESK.y - 10} w={DESK.w + 40} h={300} at={-2} order={4}>
        <Paper color={darken(DESK_COL, 0.15)} z={1.6} grad={0.1}>
          <rect x={DESK.x + 40} y={DESK.y + 20} width={26} height={260} />
          <rect x={DESK.x + DESK.w - 66} y={DESK.y + 20} width={26} height={260} />
        </Paper>
        <Paper color={DESK_COL} z={2} grad={0.14}>
          <rect x={DESK.x} y={DESK.y} width={DESK.w} height={30} rx={6} />
        </Paper>
      </PopUp>
      {/* 小凳 */}
      <PopUp x={740} y={780} w={170} h={180} at={-1} order={3}>
        <Paper color={darken(DESK_COL, 0.05)} z={1.8} grad={0.12}>
          <rect x={760} y={790} width={130} height={20} rx={6} />
          <rect x={772} y={806} width={16} height={150} />
          <rect x={862} y={806} width={16} height={150} />
        </Paper>
      </PopUp>
      {/* 纸稿 */}
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
        {Array.from({ length: Math.ceil(st.sheets) }, (_, i) => {
          const at = part === 13 ? B13.sheet0 + (i - 1) * B13.sheetStep : -100;
          const s = part === 13 && i > 0 ? pop(f, at, { damping: 12, stiffness: 200, mass: 0.5 }) : 1;
          const y = DESK.y - (i + 1) * STACK.sheet - (1 - s) * 80;
          const rot = (hash("sheet", i) - 0.5) * 6 + (1 - s) * 12;
          const dx = (hash("sheetx", i) - 0.5) * 14;
          return (
            <g key={i} transform={`rotate(${rot} ${STACK.cx + dx} ${y})`} opacity={clamp(s * 3)}>
              <Paper color={i % 3 === 1 ? lighten(P.cream, 0.3) : BASE.white} z={2 + i * 0.05} grad={0.04} filter="paper-fine">
                <rect x={STACK.cx - STACK.w / 2 + dx} y={y} width={STACK.w} height={STACK.sheet + 1} rx={2} />
              </Paper>
            </g>
          );
        })}
        <Flower f={part === 13 ? f : 1000} at={flowerAt} x={STACK.cx} y={stackTop + 2} />
      </svg>
      {/* 纸人 */}
      <PopUp x={680} y={520} w={360} h={330} at={0} order={2}>
        <PaperFigure x={SEAT.x} y={SEAT.hip + breathe} stand={false} s={1.15} pose={sitPose} z={2.4} wind={f * 0.1} />
      </PopUp>
      {/* 台灯 */}
      <PopUp x={LAMP.x - 200} y={440} w={300} h={260} at={1} order={1}>
        <g transform={`rotate(${st.click * 5} ${LAMP.x} 680)`}>
          <Paper color={P.fogBlue} z={2.4} grad={0.14}>
            <ellipse cx={LAMP.x} cy={684} rx={56} ry={12} />
          </Paper>
          <Paper color={darken(P.fogBlue, 0.25)} z={2.3} line={10} filter="paper-line" grad={0}>
            <path d={`M${LAMP.x} 680 L${LAMP.x - 20} 560 L${LAMP.x - 110} 520`} fill="none" />
          </Paper>
          <Paper color={P.fogBlue} z={2.6} grad={0.16}>
            <path d={`M${LAMP.x - 92} 480 L${LAMP.x - 150} 470 C${LAMP.x - 190} 490 ${LAMP.x - 214} 540 ${LAMP.x - 214} 560 L${LAMP.x - 106} 580 C${LAMP.x - 92} 556 ${LAMP.x - 84} 520 ${LAMP.x - 92} 480 Z`} />
          </Paper>
          <ellipse cx={LAMP.x - 162} cy={572} rx={52} ry={12} transform={`rotate(10 ${LAMP.x - 162} 572)`} fill={mix(darken(P.fogBlue, 0.4), "#FFF1C8", st.lamp)} />
        </g>
      </PopUp>
      {/* 被子 */}
      {part === 14 && blanketY > -560 && (
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
          <LiftContext.Provider value={1 + clamp(-blanketY / 300)}>
            <g transform={`translate(0 ${blanketY + breathe})`}>
              <Paper color={P.lilac} z={2.9 + clamp(-blanketY / 200) * 2} grad={0.14}>
                <path d="M702 912 C690 820 700 700 760 640 C800 600 880 596 930 640 C962 670 980 700 1010 694 C1030 690 1040 700 1040 712 L1000 740 C980 820 960 880 940 930 Z" />
              </Paper>
              <g fill="none" stroke={lighten(P.lilac, 0.45)} strokeWidth={3} strokeDasharray="9 8" opacity={0.85}>
                <path d="M720 760 C790 740 880 760 960 740" />
                <path d="M712 840 C790 820 880 840 950 820" />
                <path d="M800 640 C796 720 806 820 812 910" />
                <path d="M900 630 C900 720 896 820 890 920" />
              </g>
              <Paper color={P.sakura} z={3} filter="paper-fine" grad={0.1}>
                <path d="M812 760 L896 750 L892 822 L812 830 Z" />
              </Paper>
            </g>
          </LiftContext.Provider>
        </svg>
      )}
      {/* 灯光 */}
      {st.lamp > 0.01 && (
        <svg width={1920} height={1080} style={{ position: "absolute", mixBlendMode: "screen", opacity: st.lamp }}>
          <defs>
            <linearGradient id="w13cone" x1="0" y1="560" x2="0" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFE2A8" stopOpacity={0.55} />
              <stop offset="1" stopColor="#FFD08A" stopOpacity={0.12} />
            </linearGradient>
            <radialGradient id="w13pool" cx={1060} cy={690} r={340} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFD9A0" stopOpacity={0.4} />
              <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
            </radialGradient>
            <filter id="w13blur">
              <feGaussianBlur stdDeviation={8} />
            </filter>
          </defs>
          <polygon points={`${LAMP.x - 210},560 ${LAMP.x - 110},580 1330,700 820,700`} fill="url(#w13cone)" filter="url(#w13blur)" />
          <rect x={600} y={350} width={920} height={600} fill="url(#w13pool)" />
        </svg>
      )}
      {/* Z */}
      {part === 14 &&
        [0, 1, 2, 3, 4].map((k) => {
          const t = f - st.zzz - k * 11;
          if (st.zzz < 0 || t < 0 || t > 46) return null;
          const u = t / 46;
          const x = 900 + u * 120 + Math.sin(t * 0.18 + k) * 14;
          const y = 600 - u * 200;
          const o = clamp(t / 6) * (1 - prog(u, 0.7, 1));
          return (
            <svg key={k} width={1920} height={1080} style={{ position: "absolute", overflow: "visible", opacity: o }}>
              <Paper color={P.cream} z={2.5} filter="paper-fine" grad={0.06}>
                <text x={x} y={y} fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={30 + u * 30} transform={`rotate(${-10 + Math.sin(t * 0.1) * 8} ${x} ${y})`}>
                  Z
                </text>
              </Paper>
            </svg>
          );
        })}
      {roomDark > 0 && <AbsoluteFill style={{ background: `rgba(8,10,25,${roomDark})` }} />}
      <Ground y={940} color={mix(BASE.night, P.ink, 0.55)} back={mix(BASE.night, P.fogBlue, 0.22)} at={-3} seed={13} order={0} amp={12} />
    </>
  );
};

export const W13: React.FC = () => <NightDesk part={13} />;
export const W14: React.FC = () => <NightDesk part={14} />;
