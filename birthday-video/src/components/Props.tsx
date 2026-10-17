import React from "react";
import { config } from "../config";
import { figures, HEAD_ID } from "../lib/layout";
import { blockState } from "../lib/blockState";
import { s2 } from "../timeline";
import { pop, popOut, clamp } from "../lib/anim";

const ink = config.colors.ink;
const P = config.colors.party;

// 小人的头：圆形贴纸，不画脸
export const Head: React.FC<{ frame: number }> = ({ frame }) => {
  const st = blockState(HEAD_ID, frame);
  if (!st.visible || st.s <= 0.001) return null;
  const k = s2.rounds.findIndex((r, i) => frame >= r.assemble && (i === 2 || frame < s2.rounds[i + 1].assemble));
  const fig = figures[Math.max(0, k)];
  const r = 84;
  const sinceCollapse = frame - s2.rounds[Math.max(0, k)].collapse;
  const propIn = pop(frame, s2.rounds[Math.max(0, k)].assemble + 24, 1.2);
  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(${st.x}px, ${st.y}px) rotate(${st.a}rad) scale(${st.s})`,
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -r,
          top: -r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          background: fig.color,
          border: `4px solid ${ink}`,
          boxShadow: `5px 5px 0 ${ink}`,
          boxSizing: "border-box",
        }}
      />
      {/* 脸颊的一点高光，让它像贴纸 */}
      <div style={{ position: "absolute", left: -r * 0.55, top: -r * 0.62, width: r * 0.42, height: r * 0.22, borderRadius: 99, background: "rgba(255,255,255,0.55)", transform: "rotate(-30deg)" }} />
      {fig.kind === "cool" && <Sunglasses scale={propIn} />}
      {fig.kind === "party" && sinceCollapse < 0 && <PartyHat scale={propIn} />}
    </div>
  );
};

const PartyHat: React.FC<{ scale: number }> = ({ scale }) => (
  <svg width={160} height={170} viewBox="0 0 160 170" style={{ position: "absolute", left: -80 + 14, top: -84 - 150, transform: `rotate(12deg) scale(${scale})`, transformOrigin: "80px 165px", overflow: "visible" }}>
    <defs>
      <clipPath id="hatclip">
        <path d="M80 18 L140 160 L20 160 Z" />
      </clipPath>
    </defs>
    <path d="M80 18 L140 160 L20 160 Z" fill={P[0]} stroke={ink} strokeWidth={5} strokeLinejoin="round" />
    <g clipPath="url(#hatclip)">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={-40} y={40 + i * 34} width={240} height={13} fill={P[2]} transform={`rotate(-18 80 ${40 + i * 34})`} />
      ))}
    </g>
    <path d="M80 18 L140 160 L20 160 Z" fill="none" stroke={ink} strokeWidth={5} strokeLinejoin="round" />
    <circle cx={80} cy={16} r={17} fill={P[4]} stroke={ink} strokeWidth={5} />
    <rect x={14} y={152} width={132} height={16} rx={8} fill={P[3]} stroke={ink} strokeWidth={4} />
  </svg>
);

const Sunglasses: React.FC<{ scale: number }> = ({ scale }) => (
  <svg width={190} height={70} viewBox="0 0 190 70" style={{ position: "absolute", left: -95, top: -36, transform: `scale(${scale})`, overflow: "visible" }}>
    <path d="M6 14 H184" stroke={ink} strokeWidth={9} strokeLinecap="round" />
    <path d="M14 12 h70 q2 40 -34 42 q-34 -2 -36 -42z" fill={ink} />
    <path d="M106 12 h70 q-2 40 -36 42 q-34 -2 -34 -42z" fill={ink} />
    <path d="M28 22 l18 0 l-12 14z" fill="rgba(255,255,255,0.65)" />
    <path d="M120 22 l18 0 l-12 14z" fill="rgba(255,255,255,0.65)" />
  </svg>
);

// 第一轮散架时帽子飞走
export const FlyingHat: React.FC<{ frame: number }> = ({ frame }) => {
  const r = s2.rounds[0];
  const t = (frame - r.collapse) / 30;
  if (t < 0 || t > 1.6) return null;
  const fig = figures[0];
  const x = fig.head.x + 14 - t * 260;
  const y = fig.head.y - 160 - t * 520 + t * t * 900;
  return (
    <div style={{ position: "absolute", transform: `translate(${x}px, ${y}px) rotate(${-t * 540}deg)`, zIndex: 21 }}>
      <div style={{ position: "absolute", left: -66, top: 84 - 0 }}>
        <PartyHat scale={1} />
      </div>
    </div>
  );
};

const Star: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? size * 0.42 : size;
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(" ");
  return (
    <svg width={size * 2} height={size * 2} viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`} style={{ position: "absolute", left: -size, top: -size, overflow: "visible" }}>
      <polygon points={pts} fill={color} stroke={ink} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
};

// 第三轮：翅膀、头顶烟花、绕身星星
export const WildExtras: React.FC<{ frame: number }> = ({ frame }) => {
  const r = s2.rounds[2];
  const fig = figures[2];
  if (frame < r.assemble + 10 || frame > r.collapse + 40) return null;
  const pin = pop(frame, r.assemble + 22, 1.3);
  const pout = popOut(frame, r.collapse, 7);
  const t = frame - r.assemble;
  const cx = 540;
  const cy = fig.head.y + 230 * fig.k;
  const flap = Math.sin(t / 3.2) * 6;
  const wing = (side: number) => (
    <svg
      width={420}
      height={420}
      viewBox="0 0 420 420"
      style={{
        position: "absolute",
        left: cx + side * 60 - 420,
        top: cy - 70 - 260,
        transform: `scaleX(${-side}) rotate(${flap}deg) scale(${pin * pout})`,
        transformOrigin: "420px 260px",
        overflow: "visible",
        zIndex: 1,
      }}
    >
      <path
        d="M420 260 C 330 80, 160 20, 20 40 C 70 90, 60 120, 30 150 C 110 160, 120 190, 60 230 C 150 240, 170 270, 120 320 C 220 320, 300 330, 420 300 Z"
        fill="#FFFFFF"
        stroke={ink}
        strokeWidth={6}
        strokeLinejoin="round"
      />
    </svg>
  );
  // 头顶烟花：一圈小光线循环炸开
  const bursts = [0, 1, 2].map((i) => {
    const ph = ((t + i * 9) % 26) / 26;
    const bx = fig.head.x + [-70, 0, 80][i];
    const by = fig.head.y - fig.head.r - 70 - [20, 70, 30][i];
    return (
      <svg key={i} width={160} height={160} viewBox="-80 -80 160 160" style={{ position: "absolute", left: bx - 80, top: by - 80, transform: `scale(${pin * pout})`, overflow: "visible", zIndex: 22 }}>
        {Array.from({ length: 10 }, (_, j) => {
          const a = (j / 10) * Math.PI * 2;
          const r0 = 10 + ph * 50;
          const r1 = r0 + 18 * (1 - ph);
          return <line key={j} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={P[(i * 2 + j) % 6]} strokeWidth={7} strokeLinecap="round" opacity={1 - ph * 0.7} />;
        })}
        <circle r={7 * (1 - ph)} fill={P[2]} />
      </svg>
    );
  });
  const stars = Array.from({ length: 6 }, (_, i) => {
    const a = t / 14 + (i / 6) * Math.PI * 2;
    const scatter = frame > r.collapse ? (frame - r.collapse) * 22 : 0;
    const rx = 400 + scatter;
    const ry = 300 + scatter;
    return (
      <div key={i} style={{ position: "absolute", transform: `translate(${cx + Math.cos(a) * rx}px, ${cy - 60 + Math.sin(a) * ry}px) rotate(${t * 6 + i * 40}deg) scale(${pin * pout})`, zIndex: 23 }}>
        <Star size={i % 2 ? 26 : 36} color={P[(i + 2) % 6]} />
      </div>
    );
  });
  return (
    <>
      {wing(-1)}
      {wing(1)}
      {bursts}
      {stars}
    </>
  );
};

export const propsOpacity = (frame: number, at: number) => clamp(1 - (frame - at) / 6);
