// S4 关灯 · 蛋糕 · 20 根蜡烛 · 许愿
import React from "react";
import { config } from "../config";
import { s4, FPS } from "../timeline";
import { cakeBricks, cakeTiers, candles, CAKE_X } from "../lib/layout";
import { At } from "../components/Sticker";
import { PopText } from "../components/PopText";
import { ReviewCard } from "../components/ReviewCard";
import { Flames, FlameState } from "../components/Flames";
import { glide, pop, clamp, lerp } from "../lib/anim";
import { noise1, hash01 } from "../lib/prng";

const ink = config.colors.ink;
const cream = config.colors.cream;

// 熄灭顺序：风从左边吹来
const byX = [...candles].sort((a, b) => a.x - b.x).map((c) => c.i);
export const extinguishFrame = (i: number) => s4.extinguishStart + Math.round(byX.indexOf(i) * s4.extinguishStep);
export const candleRise = (i: number) => s4.candlesStart + byX.indexOf(i) * s4.candleStep;
export const igniteFrame = (i: number) => s4.ignite + Math.floor(hash01(i, 77) * 3);

export function flameIntensity(i: number, frame: number) {
  const on = glide(frame, igniteFrame(i), 140, 11);
  const ex = extinguishFrame(i);
  const off = frame < ex ? 1 : clamp(1 - (frame - ex) / 6);
  return Math.max(0, on * off);
}

const FL = { left: 240, top: 640, width: 600, height: 420 };

const Frosting: React.FC<{ width: number; y: number; scale: number }> = ({ width, y, scale }) => {
  const w = width + 26;
  const n = Math.round(w / 44);
  const seg = w / n;
  let d = `M0 6 `;
  for (let i = 0; i < n; i++) d += `q ${seg / 2} ${i % 3 === 1 ? 34 : 22} ${seg} 0 `;
  d += `V0 H0 Z`;
  return (
    <svg width={w} height={44} viewBox={`0 -4 ${w} 44`} style={{ position: "absolute", left: CAKE_X - w / 2, top: y - 10, transform: `scaleY(${scale})`, transformOrigin: "50% 0", overflow: "visible", zIndex: 3 }}>
      <path d={d} fill="#FFFDF7" stroke={ink} strokeWidth={4} strokeLinejoin="round" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={seg * (i + 0.5)} cy={2} r={4} fill={config.colors.party[i % 6]} />
      ))}
    </svg>
  );
};

export const S4Cake: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < s4.switchOff || frame > s4.black + 2) return null;
  const time = frame / FPS;
  const lit = candles.map((c) => flameIntensity(c.i, frame));
  const avg = lit.reduce((a, b) => a + b, 0) / lit.length;
  const flick = 0.92 + 0.08 * noise1(time * 7, 3);
  // 关灯后蛋糕只有一点环境光；点燃后被火光照亮
  const bright = 0.42 + 0.58 * avg * flick;
  const fade = clamp(1 - (frame - s4.fadeToBlack) / (s4.black - s4.fadeToBlack));

  const flames: FlameState[] = candles.map((c, k) => {
    const blowLean = clamp((frame - s4.blow) / 10) * 0.9;
    return { x: c.x - FL.left, y: c.top - 6 - FL.top, intensity: lit[k], lean: frame >= s4.blow ? blowLean : 0 };
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {/* 火光照亮周围 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 620px 760px at ${CAKE_X}px 900px, rgba(255,170,90,${0.42 * avg * flick}), rgba(255,140,70,${0.12 * avg * flick}) 55%, rgba(0,0,0,0) 80%)`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, filter: `brightness(${bright}) saturate(${0.7 + 0.3 * bright})` }}>
        {/* 盘子 */}
        <At x={CAKE_X} y={1506} scale={pop(frame, s4.cakeStart, 1)}>
          <div style={{ position: "absolute", left: -470, top: -18, width: 940, height: 36, borderRadius: 18, background: "#E9E4F5", border: `4px solid ${ink}`, boxShadow: `5px 5px 0 ${ink}` }} />
        </At>
        {cakeBricks.map((b, i) => {
          if (frame < b.drop) return null;
          const p = glide(frame, b.drop, 230, 15);
          return (
            <At key={i} x={b.x} y={lerp(b.y - 900, b.y, p)} rot={(1 - clamp(p)) * (hash01(i, 4) - 0.5) * 0.8} z={2}>
              <div
                style={{
                  position: "absolute",
                  left: -b.w / 2,
                  top: -b.h / 2,
                  width: b.w,
                  height: b.h,
                  boxSizing: "border-box",
                  background: b.color,
                  border: `3px solid ${ink}`,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: config.fonts.title,
                  fontSize: b.font,
                  color: ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {b.text}
              </div>
            </At>
          );
        })}
        {cakeTiers.map((t, ti) => {
          const top = t.bottom - t.rows * (t.rowH + 4) + 4;
          const last = Math.max(...cakeBricks.filter((b) => b.tier === ti).map((b) => b.drop));
          if (frame < last + 4) return null;
          return <Frosting key={ti} width={t.width} y={top} scale={pop(frame, last + 4, 1.2)} />;
        })}
        {candles.map((c) => {
          const rise = candleRise(c.i);
          if (frame < rise) return null;
          const g = pop(frame, rise, 1.2);
          const ig = igniteFrame(c.i);
          const u = clamp((frame - ig) / 10);
          const ex = extinguishFrame(c.i);
          const blink = frame < ig ? (Math.floor((frame + c.i * 3) / 10) % 2 === 0 ? 1 : 0.15) : 1 - clamp((frame - ig - 6) / 8);
          return (
            <div key={c.i} style={{ position: "absolute", left: c.x - 10, top: c.top, width: 20, height: c.height, transform: `scaleY(${g})`, transformOrigin: "50% 100%", zIndex: c.back ? 4 : 6 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 7,
                  border: `3px solid ${ink}`,
                  boxSizing: "border-box",
                  background: `repeating-linear-gradient(135deg, ${c.color} 0 12px, #FFFFFF 12px 20px)`,
                }}
              />
              {/* 芯：一个闪烁的文本光标 "|"，点燃时变暖、变圆 */}
              {blink > 0.01 && (
                <div
                  style={{
                    position: "absolute",
                    left: 10 - lerp(3, 7, u),
                    top: -lerp(40, 26, u) - 4,
                    width: lerp(6, 14, u),
                    height: lerp(40, 26, u),
                    borderRadius: lerp(2, 8, u),
                    background: u > 0 ? `rgb(255,${Math.round(lerp(255, 196, u))},${Math.round(lerp(255, 90, u))})` : "#FFFDF5",
                    opacity: blink,
                    boxShadow: u > 0 ? `0 0 ${u * 18}px rgba(255,180,80,0.9)` : "0 0 8px rgba(255,255,255,0.5)",
                  }}
                />
              )}
              {frame >= ig && <div style={{ position: "absolute", left: 8, top: -10, width: 4, height: 10, background: ink, borderRadius: 2 }} />}
              {frame >= ex && <Smoke frame={frame} start={ex} seed={c.i} />}
            </div>
          );
        })}
      </div>
      {frame >= s4.ignite - 1 && frame < s4.extinguishStart + 50 && <Flames flames={flames} time={time} {...FL} />}
      <PopText text={config.s4Age} start={s4.ageLine} frame={frame} y={290} out={s4.ageOut} size={70} step={2} color={cream} />
      <PopText text={config.s4Wish} start={s4.wish} frame={frame} y={290} out={s4.wishOut} size={70} step={4} color={cream} slow />
      <ReviewCard
        frame={frame}
        no={config.s4Pass.no}
        verdict={config.s4Pass.verdict}
        opinion={config.s4Pass.opinion}
        inAt={s4.cardIn}
        stampAt={s4.stamp}
        opinionAt={s4.opinion}
        outAt={s4.cardOut}
        pass
        x={540}
        y={590}
        rot={-2.5}
        seed={41}
        stampRot={5}
      />
    </div>
  );
};

const Smoke: React.FC<{ frame: number; start: number; seed: number }> = ({ frame, start, seed }) => {
  const t = frame - start;
  const L = Math.min(300, t * 10);
  const op = clamp(1 - (t - 20) / 40) * 0.8;
  if (op <= 0 || L < 4) return null;
  const pts: string[] = [];
  for (let y = 0; y <= L; y += 8) {
    const amp = (y / 300) * 22;
    const x = Math.sin(y / 26 - t * 0.22 + seed) * amp + (y / 300) * 18;
    pts.push(`${10 + x},${-10 - y}`);
  }
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <polyline points={pts.join(" ")} fill="none" stroke="rgba(240,240,250,0.9)" strokeWidth={5} strokeLinecap="round" opacity={op} />
      <polyline points={pts.join(" ")} fill="none" stroke="rgba(240,240,250,0.35)" strokeWidth={14} strokeLinecap="round" opacity={op * 0.5} />
    </svg>
  );
};
