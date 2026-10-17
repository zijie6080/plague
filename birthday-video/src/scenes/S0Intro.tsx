import React from "react";
import { config } from "../config";
import { s0 } from "../timeline";
import { pop, popOut, glide, lerp } from "../lib/anim";
import { Confetti } from "../components/Confetti";

const ink = config.colors.ink;
const P = config.colors.party;
const BOX_Y = 1010;

// 打字的字：每出现一个字轻轻弹一下
const Typed: React.FC<{ text: string; chars: number[]; frame: number; size: number }> = ({ text, chars, frame, size }) => (
  <>
    {[...text].map((c, i) => {
      if (frame < chars[i]) return null;
      const p = pop(frame, chars[i], 1.3);
      return (
        <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - Math.min(p, 1.2)) * -14}px) scale(${0.5 + 0.5 * p})`, fontSize: size }}>
          {c}
        </span>
      );
    })}
  </>
);

export const S0Intro: React.FC<{ frame: number }> = ({ frame }) => {
  const lines = s0.lines;
  const exploded = frame >= s0.explode;
  // 当前正在输入框里的那一行
  const active = lines.findIndex((l, i) => (l.send < 0 || frame < l.send) && (i === 0 || frame >= lines[i - 1].send));
  const boxIn = pop(frame, 0, 1);
  const preBoom = frame >= s0.explode - 5 && !exploded ? 1 + ((frame - (s0.explode - 5)) / 5) * 0.1 : 1;
  const blink = Math.floor(frame / 9) % 2 === 0;
  const bounce = -Math.abs(Math.sin(frame / 4.2)) * 10;

  // 已发送的气泡：最新的在下面，旧的被顶上去
  const sent = lines.filter((l) => l.send >= 0 && frame >= l.send);
  const bubbleOut = popOut(frame, s0.bubblesOut, 10);

  return (
    <>
      {sent.map((l, idx) => {
        const order = sent.length - 1 - idx; // 0 = 最新
        const p = glide(frame, l.send, 150, 14);
        const laterSend = sent[idx + 1]?.send;
        const push = laterSend ? glide(frame, laterSend, 150, 14) : 0;
        const baseY = lerp(BOX_Y, BOX_Y - 220, p) - push * 170 - Math.max(0, order - 1) * 170;
        const sc = Math.min(1, 0.6 + 0.4 * p) * bubbleOut;
        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: baseY - 60,
              display: "flex",
              justifyContent: "center",
              transform: `scale(${sc}) rotate(${(idx % 2 ? 1 : -1) * 1.2}deg)`,
            }}
          >
            <div
              style={{
                background: idx % 2 ? P[4] : P[2],
                border: `3px solid ${ink}`,
                boxShadow: `5px 5px 0 ${ink}`,
                borderRadius: 34,
                padding: "22px 40px",
                fontFamily: config.fonts.body,
                fontSize: 52,
                color: ink,
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          </div>
        );
      })}
      {!exploded && (
        <div
          style={{
            position: "absolute",
            left: 70,
            width: 940,
            top: BOX_Y - 80,
            height: 160,
            transform: `scale(${boxIn * preBoom})`,
            background: "#FFFFFF",
            border: `4px solid ${ink}`,
            boxShadow: `7px 7px 0 ${ink}`,
            borderRadius: 44,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            padding: "0 30px 0 44px",
          }}
        >
          <div style={{ flex: 1, fontFamily: config.fonts.body, fontSize: 52, color: ink, whiteSpace: "nowrap", display: "flex", alignItems: "center", overflow: "visible" }}>
            {active >= 0 && <Typed text={lines[active].text} chars={lines[active].chars} frame={frame} size={52} />}
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 62,
                marginLeft: 6,
                borderRadius: 3,
                background: P[0],
                opacity: blink ? 1 : 0.15,
                transform: `translateY(${bounce}px)`,
              }}
            />
          </div>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: P[0],
              border: `4px solid ${ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={44} height={44} viewBox="0 0 44 44">
              <path d="M22 36 V9 M10 20 L22 8 L34 20" stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
      {frame >= s0.explode - 1 && (
        <Confetti
          frame={frame}
          bursts={[
            { at: s0.explode, x: 540, y: BOX_Y, n: 170, power: 1700, seed: 3 },
            { at: s0.explode + 2, x: 300, y: BOX_Y + 10, n: 50, power: 1100, seed: 4 },
            { at: s0.explode + 2, x: 800, y: BOX_Y - 10, n: 50, power: 1100, seed: 5 },
          ]}
        />
      )}
      {frame >= s0.explode && frame < s0.explode + 6 && (
        <div
          style={{
            position: "absolute",
            left: 540 - 300,
            top: BOX_Y - 300,
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `${14 * (1 - (frame - s0.explode) / 6)}px solid ${P[2]}`,
            transform: `scale(${0.3 + ((frame - s0.explode) / 6) * 1.2})`,
            boxSizing: "border-box",
          }}
        />
      )}
    </>
  );
};
