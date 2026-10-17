import React from "react";
import { interpolate } from "remotion";
import { config } from "../config";
import { glide, shake, clamp } from "../lib/anim";

const ink = config.colors.ink;
const C = config.card;

// 橡皮章：双线框 + 油墨不均匀（SVG 噪声做蒙版）
export const Stamp: React.FC<{ text: string; color: string; seed: number; w?: number; h?: number }> = ({
  text,
  color,
  seed,
  w = 300,
  h = 112,
}) => {
  const id = `ink${seed}`;
  const fs = text.length > 4 ? 48 : 56;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id={`${id}f`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.8"
            result="holes"
          />
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed + 7} result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.95" result="blotA" />
          <feComposite in="holes" in2="blotA" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed={seed + 3} result="wob" />
          <feDisplacementMap in="inked" in2="wob" scale="5" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`} fill="none" stroke={color}>
        <rect x={5} y={5} width={w - 10} height={h - 10} rx={14} strokeWidth={7} />
        <rect x={15} y={15} width={w - 30} height={h - 30} rx={8} strokeWidth={2.5} />
        <text
          x={w / 2}
          y={h / 2 + fs * 0.36}
          textAnchor="middle"
          fontFamily={config.fonts.card}
          fontSize={fs}
          fill={color}
          stroke="none"
          letterSpacing={4}
        >
          {text}
        </text>
      </g>
    </svg>
  );
};

// 审片单
export const ReviewCard: React.FC<{
  frame: number;
  no: string;
  verdict: string;
  opinion: string;
  inAt: number;
  stampAt: number;
  opinionAt: number;
  outAt: number;
  pass?: boolean;
  x?: number;
  y?: number;
  rot?: number;
  seed?: number;
  stampRot?: number;
}> = ({ frame, no, verdict, opinion, inAt, stampAt, opinionAt, outAt, pass, x = 740, y = 1350, rot = 3, seed = 1, stampRot = -6 }) => {
  if (frame < inAt - 1) return null;
  const pin = glide(frame, inAt, 150, 13);
  const pout = glide(frame, outAt, 140, 16);
  const dx = (1 - pin) * 820 + pout * 900;
  if (dx > 1100) return null;
  const sh = shake(frame, stampAt, 12, 14);
  const color = pass ? config.colors.stampGreen : config.colors.stampRed;
  const wCard = 560;
  const hCard = 392;

  // 章：从上方砸下 5 帧
  const st = frame - stampAt;
  const stampVisible = st >= -5;
  const drop = clamp((st + 5) / 5);
  const stampScale = st < 0 ? interpolate(drop, [0, 1], [2.1, 1]) : 1 - 0.06 * Math.exp(-st / 2) * Math.sin(st * 1.4 + 1.2);
  const stampOp = st < 0 ? drop * 0.85 : 0.94;

  const opChars = [...opinion];
  return (
    <div
      style={{
        position: "absolute",
        left: x - wCard / 2,
        top: y - hCard / 2,
        width: wCard,
        height: hCard,
        transform: `translate(${dx + sh.x}px, ${sh.y}px) rotate(${rot + sh.r + (1 - pin) * 10}deg)`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: config.colors.paper,
          border: `3px solid ${ink}`,
          borderRadius: 14,
          boxShadow: `6px 6px 0 ${ink}`,
          fontFamily: config.fonts.card,
          color: ink,
          padding: "22px 30px",
          boxSizing: "border-box",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(45,42,50,0.035) 0 1px, transparent 1px 6px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `4px double ${ink}`, paddingBottom: 8 }}>
          <span style={{ fontSize: 44, letterSpacing: 6 }}>{C.title}</span>
          <span style={{ fontSize: 30 }}>
            No.<span style={{ borderBottom: `2px solid ${ink}`, padding: "0 4px" }}>{no}</span>
          </span>
        </div>
        {[
          [C.labelProject, C.project],
          [C.labelVerdict, ""],
          [C.labelOpinion, ""],
        ].map(([label, value], i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-end", height: 86, fontSize: 32 }}>
            <span>{label}</span>
            <span style={{ flex: 1, borderBottom: `2px dashed rgba(45,42,50,0.55)`, marginLeft: 6, paddingBottom: 2, fontSize: 32 }}>
              {value}
            </span>
          </div>
        ))}
        {/* 意见：手写，盖章后一个字一个字写上 */}
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 290,
            fontFamily: config.fonts.body,
            fontSize: 50,
            color,
            transform: "rotate(-3deg)",
            whiteSpace: "nowrap",
          }}
        >
          {opChars.map((c, i) => {
            const t = clamp((frame - opinionAt - i * 3) / 4);
            return (
              <span key={i} style={{ display: "inline-block", opacity: t, transform: `scale(${0.6 + 0.4 * t}) translateY(${(1 - t) * -8}px)` }}>
                {c}
              </span>
            );
          })}
        </div>
      </div>
      {stampVisible && (
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 172,
            transform: `rotate(${stampRot}deg) scale(${stampScale})`,
            transformOrigin: "150px 56px",
            opacity: stampOp,
            mixBlendMode: "multiply",
          }}
        >
          <Stamp text={verdict} color={color} seed={seed} />
        </div>
      )}
    </div>
  );
};
