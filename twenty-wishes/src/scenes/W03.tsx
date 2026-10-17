// 3. 愿 AI 生成的人，再也不“有点假”。
// 纸画框里站着纸人。一枚「有点假」的红色纸贴纸飞过来，眼看要贴上，却被一阵风卷走，翻滚着飞出画面。纸人微微点头。
import React from "react";
import { FONTS, SCENE_TEXT } from "../config";
import { bell, clamp, ease, lerp, prog } from "../lib/anim";
import { PaperFigure, POSE } from "../lib/figure";
import { Paper, darken, lighten } from "../lib/paper";
import { PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P } from "./common";

const B = beatsOf("w03");
const FR = { x: 720, y: 330, w: 480, h: 560 };

/** 贴纸的轨迹：飞来 → 悬停逼近 → 被风卷走翻滚出画 */
const sticker = (f: number) => {
  const a = ease.out(prog(f, B.stickerIn, B.stickerNear));
  let x = lerp(2150, 1040, a);
  let y = lerp(300, 560, a) - 60 * Math.sin(Math.PI * a);
  let rot = lerp(24, -8, a);
  let flip = 1;
  // 风来了
  const g = prog(f, B.gust + 2, B.stickerOut);
  if (g > 0) {
    const e = ease.in(g);
    x = lerp(1040, 2300, e) + Math.sin(g * 9) * 40 * (1 - g);
    y = lerp(560, -260, ease.inOut(g)) - 120 * Math.sin(Math.PI * g);
    rot = -8 + 760 * e;
    flip = Math.cos(g * 14);
  }
  // 逼近时的“抖一抖”
  const hover = f > B.stickerNear - 6 && g === 0 ? Math.sin(f * 1.3) * 3 : 0;
  return { x: x + hover, y, rot, flip };
};

/** 风：几条卷起的纸条从左往右扫过 */
const Gust: React.FC<{ f: number }> = ({ f }) => {
  const t = prog(f, B.gust, B.gust + 22);
  if (t <= 0 || t >= 1) return null;
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const x = lerp(-500, 2300, ease.inOut(clamp(t * 1.15 - i * 0.07)));
        const y = 470 + i * 90;
        const len = 380 - i * 60;
        const curl = 40 + i * 8;
        return (
          <Paper key={i} color={i === 1 ? lighten(P.fogBlue, 0.3) : P.cream} z={3} line={10 - i * 2} filter="paper-line" grad={0} opacity={bell(t, 0, 1) * 1.6}>
            <path d={`M${x - len} ${y} C${x - len * 0.6} ${y - 30} ${x - len * 0.3} ${y + 30} ${x} ${y} C${x + curl} ${y - 20} ${x + curl * 0.6} ${y - curl * 1.4} ${x} ${y - curl} C${x - curl * 0.5} ${y - curl * 0.8} ${x - curl * 0.3} ${y - curl * 0.3} ${x + 6} ${y - curl * 0.45}`} />
          </Paper>
        );
      })}
    </g>
  );
};

export const W03: React.FC = () => {
  const { f } = useScene();
  const st = sticker(f);
  const stT = `translate(${st.x} ${st.y}) rotate(${st.rot}) scale(${Math.abs(st.flip) < 0.04 ? 0.04 * Math.sign(st.flip || 1) : st.flip} 1)`;
  const nod = 14 * bell(f, B.nod, B.nod + 9) + 8 * bell(f, B.nod + 9, B.nod + 16);
  const lean = f > B.stickerNear - 8 && f < B.gust + 6 ? -5 * bell(f, B.stickerNear - 8, B.gust + 6) : 0;
  const wind = f * 0.2 + (f > B.gust ? (f - B.gust) * 0.5 : 0);
  return (
    <>
      {/* 背景：墙上的小圆点花纹纸 */}
      <PopUp x={160} y={300} w={1600} h={700} at={-2} order={6}>
        <Paper color={P.sakura} z={0.5} grad={0.06}>
          <rect x={160} y={300} width={1600} height={700} rx={40} />
        </Paper>
        <g fill={lighten(P.sakura, 0.35)} filter="url(#paper-fine)">
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 16 }, (_, c) => <circle key={`${r}-${c}`} cx={220 + c * 100 + (r % 2) * 50} cy={350 + r * 80} r={6} />),
          )}
        </g>
      </PopUp>
      {/* 画框 */}
      <PopUp x={FR.x - 20} y={FR.y - 20} w={FR.w + 40} h={FR.h + 40} at={0} order={3}>
        <Paper color={darken(P.apricot, 0.35)} z={1.8} grad={0.16}>
          <path d={`M${FR.x} ${FR.y} h${FR.w} v${FR.h} h${-FR.w} Z M${FR.x + 40} ${FR.y + 40} v${FR.h - 80} h${FR.w - 80} v${-(FR.h - 80)} Z`} fillRule="evenodd" />
        </Paper>
        <Paper color={lighten(P.fogBlue, 0.25)} z={0.9} grad={0.1}>
          <rect x={FR.x + 40} y={FR.y + 40} width={FR.w - 80} height={FR.h - 80} />
        </Paper>
        <Paper color={P.sage} z={1.1} filter="paper-fine">
          <path d={`M${FR.x + 40} ${FR.y + FR.h - 40} L${FR.x + 40} ${FR.y + FR.h - 120} C${FR.x + 160} ${FR.y + FR.h - 150} ${FR.x + 300} ${FR.y + FR.h - 110} ${FR.x + FR.w - 40} ${FR.y + FR.h - 135} L${FR.x + FR.w - 40} ${FR.y + FR.h - 40} Z`} />
        </Paper>
        <Paper color={P.cream} z={1.9} filter="paper-fine" grad={0.05}>
          <path d={`M${FR.x + 40} ${FR.y + 40} h${FR.w - 80} v8 h${-(FR.w - 80)} Z`} />
        </Paper>
      </PopUp>
      {/* 纸人 */}
      <PopUp x={FR.x + 60} y={FR.y + 80} w={FR.w - 120} h={FR.h - 160} at={4} order={2}>
        <PaperFigure x={FR.x + FR.w / 2} y={FR.y + FR.h - 92} s={1.3} z={1.6} pose={{ ...POSE.stand, nod, lean }} wind={wind} />
      </PopUp>
      <Ground y={935} color={P.pine} back={P.sage} at={-3} seed={3} order={0} amp={14} />
      {/* 贴纸与风 */}
      <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
        <Gust f={f} />
        {f >= B.stickerIn && f < B.stickerOut + 2 && (
          // 翻滚用的负缩放放在滤镜内部（见 figure.tsx 的说明）
          <g>
            <Paper color={P.vermilion} z={4.2} grad={0.14}>
              <g transform={stT}>
                <rect x={-130} y={-52} width={260} height={104} rx={18} />
              </g>
            </Paper>
            <g transform={stT}>
              <rect x={-118} y={-40} width={236} height={80} rx={12} fill="none" stroke={lighten(P.vermilion, 0.5)} strokeWidth={3} strokeDasharray="10 7" />
            </g>
            <Paper color={P.cream} z={4.4} filter="fiber" grad={0}>
              <g transform={stT}>
                <text x={0} y={18} textAnchor="middle" fontFamily={`"${FONTS.wish}"`} fontWeight={500} fontSize={52} letterSpacing={6}>
                  {SCENE_TEXT.w3Sticker}
                </text>
              </g>
            </Paper>
          </g>
        )}
      </svg>
    </>
  );
};
