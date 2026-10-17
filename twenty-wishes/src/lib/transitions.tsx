// 四种转场：翻页 / 依次倒下再弹起（在合成器里实现）/ 镜头横移到下一块纸台 / 大纸从上方滑下再掀开
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { clamp, ease, lerp, prog } from "./anim";
import { fbm1 } from "./rand";
import { FONTS, PALETTE } from "../config";
import { lighten } from "./paper";
import { H, W } from "./stage";

const TABLE = staticFile("tex/table.png");
const SHEET = staticFile("tex/sheet.png");

/* ---------------- 翻页 ---------------- */
// 书页绕书脊（画面左边缘）旋转。页面分成内外两段，外段多转一个弯曲角，模拟纸张的弯曲；
// 两段交界处加折痕阴影，下一页上有随角度移动的投影。
export const PageFlip: React.FC<{ p: number; front: React.ReactNode; under: React.ReactNode }> = ({ p, front, under }) => {
  const e = ease.inOut(p);
  const theta = 118 * e;
  const bend = 34 * Math.sin(Math.PI * clamp(p * 1.1));
  const cam = 1 - 0.075 * Math.sin(Math.PI * p);
  const W1 = Math.round(W * 0.6);
  const W2 = W - W1;
  const rad = (d: number) => (d * Math.PI) / 180;
  const d1 = 0.55 * Math.sin(rad(Math.min(90, theta)));
  const d2 = 0.6 * Math.sin(rad(Math.min(90, theta + bend)));
  const edgeX = W1 * Math.cos(rad(theta)) + W2 * Math.cos(rad(theta + bend));
  const castA = 0.42 * Math.sin(rad(Math.min(90, theta))) * (1 - prog(p, 0.75, 1));
  const crease = clamp(bend / 34);

  const face = (offset: number, width: number, dark: number, creaseSide: "right" | "left") => (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: H, overflow: "hidden", backfaceVisibility: "hidden" }}>
      <div style={{ position: "absolute", left: -offset, top: 0, width: W, height: H }}>{front}</div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            creaseSide === "right"
              ? `linear-gradient(90deg, rgba(40,22,12,${dark * 0.6}) 0%, rgba(40,22,12,${dark}) 70%, rgba(30,16,8,${dark + 0.25 * crease}) 100%)`
              : `linear-gradient(90deg, rgba(255,240,220,${0.28 * crease}) 0%, rgba(40,22,12,${dark}) 18%, rgba(40,22,12,${dark * 1.15}) 100%)`,
        }}
      />
    </div>
  );
  const back = (width: number, dark: number) => (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: H, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
      <Img src={SHEET} style={{ width: W, height: H }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(270deg, rgba(40,22,12,${0.35 - dark * 0.3}) 0%, rgba(40,22,12,0.05) 100%)` }} />
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={TABLE} style={{ position: "absolute", width: W, height: H }} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ boxShadow: "0 24px 60px rgba(42,26,18,0.35)" }}>{under}</AbsoluteFill>
        {/* 翻起页面投在下一页上的影子 */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(90deg, rgba(42,24,14,${castA}) ${Math.max(0, edgeX - 30)}px, rgba(42,24,14,${castA * 0.4}) ${Math.max(0, edgeX) + 90}px, rgba(42,24,14,0) ${Math.max(0, edgeX) + 320}px)`,
          }}
        />
        {/* 书脊阴影 */}
        <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(42,24,14,${0.35 * Math.sin(Math.PI * p)}) 0px, rgba(42,24,14,0) 120px)` }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 5200, perspectiveOrigin: "50% 50%" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W1, height: H, transformStyle: "preserve-3d", transformOrigin: "0 50%", transform: `rotateY(${-theta}deg)` }}>
            {face(0, W1, d1, "right")}
            {back(W1, d1)}
            <div style={{ position: "absolute", left: W1, top: 0, width: W2, height: H, transformStyle: "preserve-3d", transformOrigin: "0 50%", transform: `rotateY(${-bend}deg)` }}>
              {face(W1, W2, d2, "left")}
              {back(W2, d2)}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- 镜头横移到相邻的纸台 ---------------- */
export const PanBoards: React.FC<{ p: number; from: React.ReactNode; to: React.ReactNode }> = ({ p, from, to }) => {
  const GAP = 150;
  const e = ease.inOut(p);
  const cam = 1 - 0.13 * Math.sin(Math.PI * p);
  const x = -e * (W + GAP);
  const board = (node: React.ReactNode, left: number) => (
    <div style={{ position: "absolute", left, top: 0, width: W, height: H, boxShadow: "0 26px 60px rgba(42,26,18,0.38), 0 6px 14px rgba(42,26,18,0.25)" }}>{node}</div>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={TABLE} style={{ position: "absolute", width: W, height: H }} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translateX(${x}px)` }}>
          {board(from, 0)}
          {board(to, W + GAP)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- 大纸从上方滑下盖住画面，再掀开 ---------------- */
const deckle = (w: number, h: number, seed: number) => {
  const pts: string[] = [`M-40 -40`, `L${w + 40} -40`, `L${w + 40} ${h}`];
  for (let x = w + 40; x >= -40; x -= 12) {
    const y = h + fbm1(x * 0.02, seed) * 7 + fbm1(x * 0.11, seed + 5) * 2.5;
    pts.push(`L${x} ${y.toFixed(1)}`);
  }
  return pts.join(" ") + " Z";
};

const SHEET_TINTS = [PALETTE.sakura, PALETTE.fogBlue, PALETTE.sage, PALETTE.apricot, PALETTE.lilac];

export const CoverSheet: React.FC<{ p: number; from: React.ReactNode; to: React.ReactNode; seed?: number; label?: string }> = ({ p, from, to, seed = 3, label }) => {
  const tint = SHEET_TINTS[seed % SHEET_TINTS.length];
  const down = ease.out(prog(p, 0, 0.4));
  const peel = ease.inOut(prog(p, 0.5, 1));
  const SH = H + 60;
  const y = lerp(-SH - 60, 0, down);
  const tilt = lerp(-2.2, 0, down);
  const theta = 112 * peel;
  const dark = 0.5 * Math.sin((Math.min(90, theta) * Math.PI) / 180);
  const shadowA = 0.36 * (1 - peel);
  const path = deckle(W, SH, seed);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {p < 0.5 ? from : to}
      {/* 大纸落下时投在画面上的影子 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(42,24,14,0) ${y + SH - 10}px, rgba(42,24,14,${shadowA}) ${y + SH + 4}px, rgba(42,24,14,0) ${y + SH + 110 + 120 * peel}px)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 4200, perspectiveOrigin: "50% 0%" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: y,
            width: W,
            height: SH,
            transformOrigin: "50% 0%",
            transform: `rotate(${tilt}deg) rotateX(${theta}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <svg width={W} height={SH} style={{ position: "absolute", overflow: "visible", backfaceVisibility: "hidden" }}>
            <defs>
              <clipPath id={`deckle-${seed}`}>
                <path d={path} />
              </clipPath>
            </defs>
            <g clipPath={`url(#deckle-${seed})`}>
              <image href={SHEET} x={0} y={-20} width={W} height={SH + 40} preserveAspectRatio="none" />
              <rect x={0} y={0} width={W} height={SH} fill={tint} opacity={0.75} style={{ mixBlendMode: "multiply" }} />
              {label && (
                <text x={W / 2} y={H / 2 + 60} textAnchor="middle" fontFamily={`"${FONTS.serif}"`} fontWeight={900} fontSize={170} fill={lighten(tint, 0.25)} style={{ textShadow: `-2px -2px 0 rgba(255,255,255,0.45), 3px 4px 4px rgba(40,22,12,0.25)` }}>
                  {label}
                </text>
              )}
              <rect x={0} y={0} width={W} height={SH} fill={`rgba(40,22,12,${dark})`} />
              <rect x={0} y={SH - 40} width={W} height={60} fill="rgba(40,22,12,0.06)" />
            </g>
          </svg>
          <div style={{ position: "absolute", inset: 0, transform: "rotateX(180deg)", backfaceVisibility: "hidden", background: `rgba(225,205,180,1)`, clipPath: "inset(0)" }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(0deg, rgba(40,22,12,0.3), rgba(40,22,12,0.05))` }} />
            <div style={{ position: "absolute", inset: 0, background: tint, mixBlendMode: "multiply", opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
